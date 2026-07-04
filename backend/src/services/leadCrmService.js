const { withTransaction, query } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createSecureToken } = require("../utils/token");
const { consumeQrCredit } = require("./qrCreditService");

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@.]+/g, "");
}

function normalizedDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function boundedLimit(value, fallback = 40, max = 120) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function boundedOffset(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 5000);
}

function moneyNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function suggestedStatus(row = {}) {
  const purchases = Number(row.purchase_count || 0);
  const spent = moneyNumber(row.total_spent);
  const score = Number(row.score_total || 0);
  const last = row.last_interaction_at ? new Date(row.last_interaction_at).getTime() : 0;
  const inactiveDays = last ? (Date.now() - last) / 86400000 : 999;
  if (inactiveDays > 90 && purchases === 0) return "INACTIVE";
  if (spent >= 3000000 || score >= 500 || Number(row.benefits_received || 0) >= 6) return "VIP";
  if (purchases > 1) return "RECURRENT";
  if (purchases === 1) return "BUYER";
  if (Number(row.activation_count || 0) || Number(row.games_played || 0) || score > 0) return "INTERESTED";
  return "NEW";
}

function leadLevel(row = {}) {
  const score = Number(row.score_total || 0);
  const spent = moneyNumber(row.total_spent);
  if (spent >= 3000000 || score >= 500) return "VIP";
  if (spent >= 1000000 || score >= 250) return "Alto valor";
  if (Number(row.purchase_count || 0) || score >= 100) return "Comercial";
  if (Number(row.activation_count || 0) || Number(row.games_played || 0)) return "Engagement";
  return "Nuevo";
}

function carePriority(row = {}) {
  const status = String(row.commercial_status || row.stored_status || "").toUpperCase();
  const score = Number(row.score_total || 0);
  const purchases = Number(row.purchase_count || 0);
  const activeTickets = Number(row.active_tickets || 0);
  const activations = Number(row.activation_count || 0);
  const hasContact = Boolean(row.email || row.phone);
  if (!hasContact) return "LOW";
  if (["FOLLOW_UP", "CONTACTED"].includes(status)) return "HIGH";
  if (activeTickets > 0 && purchases === 0) return "HIGH";
  if (activations > 0 && purchases === 0) return "HIGH";
  if (["VIP", "RECURRENT"].includes(status) || score >= 250 || moneyNumber(row.total_spent) >= 1000000) return "MEDIUM";
  if (["INACTIVE", "LOST"].includes(status)) return "LOW";
  return "MEDIUM";
}

function carePriorityLabel(value) {
  const labels = {
    HIGH: "Atender hoy",
    MEDIUM: "Seguimiento",
    LOW: "Nutrir / limpiar",
  };
  return labels[value] || labels.MEDIUM;
}

function recommendedLeadAction(row = {}) {
  const priority = carePriority(row);
  const channel = row.phone ? "WhatsApp" : row.email ? "email" : "canal pendiente";
  const status = String(row.commercial_status || row.stored_status || "").toUpperCase();
  if (!row.phone && !row.email) return "Completar datos de contacto antes de activar.";
  if (Number(row.active_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) {
    return `Contactar por ${channel}: tiene ticket activo sin redimir.`;
  }
  if (["FOLLOW_UP", "CONTACTED"].includes(status)) {
    return `Cerrar siguiente paso por ${channel} y registrar nota.`;
  }
  if (Number(row.purchase_count || 0) > 0) {
    return `Enviar recompra o atencion VIP por ${channel}.`;
  }
  if (Number(row.activation_count || 0) > 0 || Number(row.games_played || 0) > 0 || Number(row.score_total || 0) > 0) {
    return `Enviar beneficio de conversion por ${channel}.`;
  }
  if (priority === "LOW") return "Nutrir con contenido y validar interes.";
  return `Primer contacto por ${channel} con oferta concreta.`;
}

function insightFor(row = {}, interests = []) {
  const status = suggestedStatus(row);
  const topInterest = interests[0]?.interest_name || row.top_interest || row.favorite_product || row.product_name || "beneficios";
  if (status === "VIP") {
    return `Este lead combina valor comercial alto e interacción relevante. Recomendado enviar atención VIP o beneficio de recompra asociado a ${topInterest}.`;
  }
  if (status === "RECURRENT") {
    return `Este lead ya compró más de una vez. Recomendado activar recompra, referidos o una experiencia premium ligada a ${topInterest}.`;
  }
  if (status === "BUYER") {
    return `Este lead ya compró. Recomendado enviar beneficio de segunda compra y medir redención posterior.`;
  }
  if (status === "INTERESTED") {
    return `Este lead interactuó con activaciones o juegos pero aún no consolida compra. Recomendado enviar una activación de conversión con ticket rastreable.`;
  }
  return "Este lead está en etapa inicial. Recomendado enviar beneficio de bienvenida o activación de primera compra.";
}

function statusLabel(value) {
  const labels = {
    NEW: "Nuevo",
    INTERESTED: "Interesado",
    BUYER: "Comprador",
    RECURRENT: "Recurrente",
    INACTIVE: "Inactivo",
    VIP: "VIP",
    CONTACTED: "Contactado",
    FOLLOW_UP: "Seguimiento",
    CONVERTED: "Convertido",
    LOST: "Perdido",
  };
  return labels[value] || value || "Nuevo";
}

function buildValidatorUrl(token) {
  const target = new URL("/empresa/", env.publicAppUrl || "http://localhost:3000");
  target.searchParams.set("view", "validator");
  target.searchParams.set("token", token);
  return target.toString();
}

function buildActivationUrl(type, token) {
  const base = (env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "");
  const normalized = String(type || "").toUpperCase();
  if (normalized.includes("TRIVIA")) return `${base}/trivia/${encodeURIComponent(token)}`;
  if (normalized.includes("GAME") || normalized.includes("MICRO")) return `${base}/activacion/${encodeURIComponent(token)}`;
  if (normalized.includes("TICKET") || normalized.includes("BENEFIT") || normalized.includes("VIP") || normalized.includes("GIFT")) {
    return buildValidatorUrl(token);
  }
  return `${base}/activacion/${encodeURIComponent(token)}`;
}

const LEAD_ACTIVATION_TYPES_WITH_TICKET = new Set([
  "MICROGAME",
  "TRIVIA",
  "CAMPAIGN_LINK",
  "TICKET",
  "BENEFIT",
  "VIP_ATTENTION",
  "GIFTCARD",
  "DISCOUNT",
  "EVENT_INVITATION",
  "REFERRAL_REWARD",
  "REBUY",
  "BIRTHDAY",
  "FIRST_PURCHASE",
  "INACTIVE_CLIENT",
  "VIP_CLIENT",
]);

function listWhere(filters, params) {
  const clauses = [];
  const search = normalizeSearch(filters.search);
  const phoneSearch = normalizedDigits(filters.search);
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    clauses.push(`(
      search_blob like $${idx}
      or normalized_document like $${idx}
      or normalized_email like $${idx}
      or normalized_affiliate_code like $${idx}
      ${phoneSearch ? `or normalized_phone like $${idx}` : ""}
    )`);
  }
  if (filters.campaign_id) {
    params.push(filters.campaign_id);
    clauses.push(`campaign_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(String(filters.status).toUpperCase());
    clauses.push(`commercial_status = $${params.length}`);
  }
  if (filters.priority) {
    params.push(String(filters.priority).toUpperCase());
    clauses.push(`care_priority = $${params.length}`);
  }
  if (filters.has_purchases === "true") clauses.push("purchase_count > 0");
  if (filters.has_purchases === "false") clauses.push("purchase_count = 0");
  if (filters.is_affiliate === "true") clauses.push("is_affiliate = true");
  if (filters.is_affiliate === "false") clauses.push("is_affiliate = false");
  if (filters.has_gifts === "true") clauses.push("benefits_received > 0");
  if (filters.has_active_tickets === "true") clauses.push("active_tickets > 0");
  if (filters.has_redeemed_tickets === "true") clauses.push("redeemed_tickets > 0");
  if (filters.channel) {
    params.push(`%${normalizeSearch(filters.channel)}%`);
    clauses.push("normalized_channel like $" + params.length);
  }
  if (filters.score_min !== undefined && filters.score_min !== "") {
    params.push(Number(filters.score_min));
    clauses.push(`score_total >= $${params.length}`);
  }
  if (filters.score_max !== undefined && filters.score_max !== "") {
    params.push(Number(filters.score_max));
    clauses.push(`score_total <= $${params.length}`);
  }
  if (filters.created_from) {
    params.push(filters.created_from);
    clauses.push(`created_at >= $${params.length}::timestamptz`);
  }
  if (filters.created_to) {
    params.push(filters.created_to);
    clauses.push(`created_at <= $${params.length}::timestamptz`);
  }
  if (filters.last_interaction_from) {
    params.push(filters.last_interaction_from);
    clauses.push(`last_interaction_at >= $${params.length}::timestamptz`);
  }
  if (filters.last_interaction_to) {
    params.push(filters.last_interaction_to);
    clauses.push(`last_interaction_at <= $${params.length}::timestamptz`);
  }
  return clauses.length ? `where ${clauses.join(" and ")}` : "";
}

async function listLeadCrmRows(businessId, filters = {}) {
  const limit = boundedLimit(filters.limit, 40, 120);
  const offset = boundedOffset(filters.offset);
  const params = [businessId];
  const where = listWhere(filters, params);
  params.push(limit);
  const limitIndex = params.length;
  params.push(offset);
  const offsetIndex = params.length;

  const result = await query(
    `with player_rows as (
       select
         p.id,
         'PLAYER'::text as source_type,
         p.id as lead_id,
         p.name,
         split_part(coalesce(p.name, ''), ' ', 1) as first_name,
         trim(substr(coalesce(p.name, ''), length(split_part(coalesce(p.name, ''), ' ', 1)) + 1)) as last_name,
         p.document_id,
         p.email,
         p.phone,
         p.created_at,
         p.campaign_id,
         c.name as campaign_name,
         coalesce(p.metadata->>'source', p.metadata->>'lead_source', c.type, 'QR / Activacion') as channel,
         coalesce(p.metadata->>'city', '') as city,
         null::text as crm_priority,
         null::text as preferred_channel,
         null::text as preferred_contact_time,
         coalesce(p.metadata->>'commercial_status', '') as stored_status,
         coalesce(s.purchase_count, 0)::int as purchase_count,
         coalesce(s.total_spent, 0)::numeric as total_spent,
         coalesce(s.avg_ticket, 0)::numeric as avg_ticket,
         s.last_purchase_at,
         s.top_product,
         s.top_category,
         coalesce(q.active_tickets, 0)::int as active_tickets,
         coalesce(q.redeemed_tickets, 0)::int as redeemed_tickets,
         coalesce(q.benefits_received, 0)::int as benefits_received,
         coalesce(t.games_played, 0)::int + coalesce(ls.score_events, 0)::int as games_played,
         coalesce(t.score_total, 0)::int + coalesce(ls.score_total, 0)::int as score_total,
         coalesce(t.score_average, 0)::numeric as score_average,
         coalesce(t.best_score, 0)::int as best_score,
         greatest(
           p.created_at,
           coalesce(s.last_purchase_at, p.created_at),
           coalesce(q.last_ticket_at, p.created_at),
           coalesce(t.last_game_at, p.created_at),
           coalesce(a.last_activation_at, p.created_at),
           coalesce(cm.last_communication_at, p.created_at)
         ) as last_interaction_at,
         coalesce(a.activation_count, 0)::int as activation_count,
         af.id as affiliate_id,
         af.qr_token as affiliate_code,
         af.status as affiliate_status,
         (af.id is not null) as is_affiliate,
         li.top_interest
       from players p
       left join campaigns c on c.id = p.campaign_id
       left join lateral (
         select count(*)::int as purchase_count,
                coalesce(sum(bs.sale_amount), 0)::numeric as total_spent,
                coalesce(avg(bs.sale_amount), 0)::numeric as avg_ticket,
                max(bs.created_at) as last_purchase_at,
                (array_agg(bs.product_name order by bs.created_at desc))[1] as top_product,
                (array_agg(coalesce(bs.metadata->>'category', bs.acquisition_channel) order by bs.created_at desc))[1] as top_category
         from business_sales bs
         where bs.business_id = p.business_id
           and (
             (nullif(p.document_id, '') is not null and bs.customer_document_id = p.document_id)
             or (nullif(p.phone, '') is not null and bs.customer_phone = p.phone)
             or (nullif(p.email, '') is not null and lower(bs.customer_email) = lower(p.email))
             or bs.qr_code_id in (select id from qr_codes where player_id = p.id)
           )
       ) s on true
       left join lateral (
         select count(*) filter (where q.status = 'ACTIVE' and (q.expires_at is null or q.expires_at > now()))::int as active_tickets,
                count(*) filter (where q.status = 'REDEEMED' or q.redeemed_at is not null)::int as redeemed_tickets,
                count(*)::int as benefits_received,
                max(q.created_at) as last_ticket_at
         from qr_codes q
         where q.business_id = p.business_id and q.player_id = p.id
       ) q on true
       left join lateral (
         select count(*)::int as games_played,
                coalesce(sum(score), 0)::int as score_total,
                coalesce(avg(score), 0)::numeric as score_average,
                coalesce(max(score), 0)::int as best_score,
                max(created_at) as last_game_at
         from business_trivia_attempts ta
         where ta.business_id = p.business_id
           and (ta.player_id = p.id
             or (nullif(p.document_id, '') is not null and ta.participant_document_id = p.document_id)
             or (nullif(p.phone, '') is not null and ta.participant_phone = p.phone)
             or (nullif(p.email, '') is not null and lower(ta.participant_email) = lower(p.email)))
       ) t on true
       left join lateral (
         select count(*)::int as score_events, coalesce(sum(score), 0)::int as score_total
         from lead_scores sc
         where sc.business_id = p.business_id and sc.lead_id = p.id
       ) ls on true
       left join lateral (
         select count(*)::int as activation_count, max(created_at) as last_activation_at
         from lead_activations la
         where la.business_id = p.business_id and la.lead_id = p.id
       ) a on true
       left join lateral (
         select max(created_at) as last_communication_at
         from lead_communications lc
         where lc.business_id = p.business_id and lc.lead_id = p.id
       ) cm on true
       left join lateral (
         select id, qr_token, status
         from affiliates fa
         where fa.business_id = p.business_id
           and (
             (nullif(p.document_id, '') is not null and fa.document_id = p.document_id)
             or (nullif(p.phone, '') is not null and fa.phone = p.phone)
             or (nullif(p.email, '') is not null and lower(fa.email) = lower(p.email))
           )
         order by created_at desc
         limit 1
       ) af on true
       left join lateral (
         select interest_name as top_interest
         from lead_interests li
         where li.business_id = p.business_id and li.lead_id = p.id
         order by weight desc, updated_at desc
         limit 1
       ) li on true
       where p.business_id = $1
     ),
     manual_rows as (
       select
         ml.id,
         'MANUAL'::text as source_type,
         null::uuid as lead_id,
         ml.name,
         split_part(coalesce(ml.name, ''), ' ', 1) as first_name,
         trim(substr(coalesce(ml.name, ''), length(split_part(coalesce(ml.name, ''), ' ', 1)) + 1)) as last_name,
         null::text as document_id,
         ml.email,
         ml.phone,
         ml.created_at,
         null::uuid as campaign_id,
         null::text as campaign_name,
         coalesce(ml.source, 'Manual') as channel,
         coalesce(ml.metadata->>'city', '') as city,
         ml.priority as crm_priority,
         ml.preferred_channel,
         ml.preferred_contact_time,
         ml.status as stored_status,
         coalesce(s.purchase_count, 0)::int as purchase_count,
         coalesce(s.total_spent, 0)::numeric as total_spent,
         coalesce(s.avg_ticket, 0)::numeric as avg_ticket,
         s.last_purchase_at,
         coalesce(s.top_product, ml.company) as top_product,
         s.top_category,
         0::int as active_tickets,
         0::int as redeemed_tickets,
         0::int as benefits_received,
         0::int as games_played,
         0::int as score_total,
         0::numeric as score_average,
         0::int as best_score,
         greatest(ml.created_at, coalesce(s.last_purchase_at, ml.created_at)) as last_interaction_at,
         0::int as activation_count,
         null::uuid as affiliate_id,
         null::text as affiliate_code,
         null::text as affiliate_status,
         false as is_affiliate,
         ml.interest as top_interest
       from business_manual_leads ml
       left join lateral (
         select count(*)::int as purchase_count,
                coalesce(sum(bs.sale_amount), 0)::numeric as total_spent,
                coalesce(avg(bs.sale_amount), 0)::numeric as avg_ticket,
                max(bs.created_at) as last_purchase_at,
                (array_agg(bs.product_name order by bs.created_at desc))[1] as top_product,
                (array_agg(coalesce(bs.metadata->>'category', bs.acquisition_channel) order by bs.created_at desc))[1] as top_category
         from business_sales bs
         where bs.business_id = ml.business_id
           and ((nullif(ml.phone, '') is not null and bs.customer_phone = ml.phone)
             or (nullif(ml.email, '') is not null and lower(bs.customer_email) = lower(ml.email)))
       ) s on true
       where ml.business_id = $1
     ),
     all_rows as (
       select * from player_rows
       union all
       select * from manual_rows
     ),
     shaped as (
       select *,
         case
           when nullif(stored_status, '') is not null then upper(stored_status)
           when total_spent >= 3000000 or score_total >= 500 or benefits_received >= 6 then 'VIP'
           when purchase_count > 1 then 'RECURRENT'
           when purchase_count = 1 then 'BUYER'
           when activation_count > 0 or games_played > 0 or score_total > 0 then 'INTERESTED'
           when last_interaction_at < now() - interval '90 days' then 'INACTIVE'
           else 'NEW'
         end as commercial_status,
         regexp_replace(lower(coalesce(document_id, '')), '[^a-z0-9]', '', 'g') as normalized_document,
         regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') as normalized_phone,
         lower(coalesce(email, '')) as normalized_email,
         regexp_replace(lower(coalesce(channel, '')), '[^a-z0-9]', '', 'g') as normalized_channel,
         regexp_replace(lower(coalesce(affiliate_code, '')), '[^a-z0-9]', '', 'g') as normalized_affiliate_code,
         regexp_replace(lower(
           coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '') || ' ' ||
           coalesce(document_id, '') || ' ' || coalesce(campaign_name, '') || ' ' ||
           coalesce(channel, '') || ' ' || coalesce(top_interest, '') || ' ' || coalesce(affiliate_code, '')),
           '[^a-z0-9@.]+', '', 'g'
         ) as search_blob
       from all_rows
     ),
     scored as (
       select *,
         (
           case
             when crm_priority = 'HIGH' then 45
             when crm_priority = 'MEDIUM' then 24
             when crm_priority = 'LOW' then 4
             else 12
           end
           + case
               when commercial_status in ('FOLLOW_UP', 'CONTACTED') then 38
               when commercial_status in ('VIP', 'RECURRENT') then 28
               when commercial_status = 'BUYER' then 20
               when commercial_status = 'INTERESTED' then 18
               when commercial_status in ('INACTIVE', 'LOST') then -12
               else 10
             end
           + case when active_tickets > 0 and purchase_count = 0 then 26 else 0 end
           + case when activation_count > 0 and purchase_count = 0 then 18 else 0 end
           + least(18, greatest(0, score_total / 35))
           + case when nullif(phone, '') is not null or nullif(email, '') is not null then 8 else -18 end
           + case when last_interaction_at >= now() - interval '14 days' then 12
                  when last_interaction_at >= now() - interval '45 days' then 6
                  else 0 end
         )::int as attention_score,
         case
           when nullif(phone, '') is null and nullif(email, '') is null then 'LOW'
           when crm_priority = 'HIGH' then 'HIGH'
           when commercial_status in ('FOLLOW_UP', 'CONTACTED') then 'HIGH'
           when active_tickets > 0 and purchase_count = 0 then 'HIGH'
           when activation_count > 0 and purchase_count = 0 then 'HIGH'
           when commercial_status in ('VIP', 'RECURRENT') or total_spent >= 1000000 or score_total >= 250 then 'MEDIUM'
           when commercial_status in ('INACTIVE', 'LOST') then 'LOW'
           else 'MEDIUM'
         end as care_priority
       from shaped
     )
     select *, count(*) over()::int as total_count
     from scored
     ${where}
     order by attention_score desc, last_interaction_at desc nulls last, created_at desc
     limit $${limitIndex} offset $${offsetIndex}`,
    params
  );

  const total = Number(result.rows[0]?.total_count || 0);
  return {
    leads: result.rows.map((row) => ({
      ...row,
      score_total: Number(row.score_total || 0),
      score_average: Number(row.score_average || 0),
      best_score: Number(row.best_score || 0),
      purchase_count: Number(row.purchase_count || 0),
      total_spent: moneyNumber(row.total_spent),
      avg_ticket: moneyNumber(row.avg_ticket),
      commercial_status: row.commercial_status || suggestedStatus(row),
      commercial_status_label: statusLabel(row.commercial_status || suggestedStatus(row)),
      level: leadLevel(row),
      care_priority: row.care_priority || carePriority(row),
      care_priority_label: carePriorityLabel(row.care_priority || carePriority(row)),
      attention_score: Number(row.attention_score || 0),
      recommended_action: recommendedLeadAction(row),
      total_count: undefined,
    })),
    pagination: { total, limit, offset, has_more: offset + result.rows.length < total },
  };
}

async function resolveLead(businessId, leadId, sourceType = "PLAYER", client = { query }) {
  const source = String(sourceType || "PLAYER").toUpperCase();
  if (source === "MANUAL") {
    const result = await client.query(
      `select id, business_id, null::uuid as lead_id, 'MANUAL'::text as source_type,
              name, null::text as document_id, email, phone, company as organization,
              source as channel, source_detail, interest, preferred_channel,
              status as stored_status, priority, notes, metadata, created_at, updated_at
       from business_manual_leads
       where id = $1 and business_id = $2`,
      [leadId, businessId]
    );
    if (!result.rowCount) throw notFound("Lead not found.");
    return result.rows[0];
  }

  const result = await client.query(
    `select p.id, p.business_id, p.id as lead_id, 'PLAYER'::text as source_type,
            p.name, p.document_id, p.email, p.phone, null::text as organization,
            coalesce(p.metadata->>'source', p.metadata->>'lead_source', c.type, 'QR / Activacion') as channel,
            c.name as campaign_name, p.campaign_id, p.metadata, p.created_at, p.created_at as updated_at,
            coalesce(p.metadata->>'commercial_status', '') as stored_status
     from players p
     left join campaigns c on c.id = p.campaign_id
     where p.id = $1 and p.business_id = $2`,
    [leadId, businessId]
  );
  if (!result.rowCount) throw notFound("Lead not found.");
  return result.rows[0];
}

function identityParams(lead) {
  return [
    lead.business_id,
    lead.lead_id || null,
    lead.document_id || null,
    lead.phone || null,
    lead.email || null,
    lead.source_type || "PLAYER",
    lead.id,
  ];
}

async function getLeadCrmDetail(businessId, leadId, sourceType = "PLAYER") {
  const lead = await resolveLead(businessId, leadId, sourceType);
  const params = identityParams(lead);
  const identityOnlyParams = params.slice(0, 5);
  const sourceParams = [lead.business_id, lead.lead_id || null, lead.source_type || "PLAYER", lead.id];
  const contactParams = [lead.business_id, lead.document_id || null, lead.phone || null, lead.email || null];

  const [
    purchases,
    tickets,
    trivia,
    activations,
    communications,
    notes,
    interests,
    affiliates,
    rewardPasses,
    events,
  ] = await Promise.all([
    query(
      `select bs.*, c.name as campaign_name, br.name as branch_name, u.full_name as seller_name,
              bs.customer_document_id as document_value, bs.customer_phone as phone_value, bs.customer_email as email_value
       from business_sales bs
       left join campaigns c on c.id = bs.campaign_id
       left join branches br on br.id = bs.branch_id
       left join app_users u on u.id = bs.seller_user_id
       where bs.business_id = $1 and (
         ($3::text is not null and nullif($3::text, '') is not null and bs.customer_document_id = $3::text)
         or ($4::text is not null and nullif($4::text, '') is not null and bs.customer_phone = $4::text)
         or ($5::text is not null and nullif($5::text, '') is not null and lower(bs.customer_email) = lower($5::text))
         or ($2::uuid is not null and bs.qr_code_id in (select id from qr_codes where player_id = $2))
       )
       order by bs.created_at desc
       limit 100`,
      identityOnlyParams
    ),
    query(
      `select q.*, c.name as campaign_name, r.name as reward_name,
              q.player_id, p.document_id as document_value, p.phone as phone_value, p.email as email_value,
              la.id as lead_activation_id,
              la.name as lead_activation_name,
              la.activation_type as lead_activation_type,
              la.channel as lead_activation_channel,
              ia.id as interactive_activation_id,
              ia.title as interactive_activation_title,
              ia.activation_type as interactive_activation_type,
              qb.name as batch_name,
              qb.channel_use as batch_channel_use,
              coalesce(
                case when la.id is not null then 'Accion CRM' end,
                case when ia.id is not null then 'Activacion interactiva' end,
                case when qb.id is not null then 'Paquete de tickets' end,
                q.metadata->>'origin_label',
                q.metadata->>'source',
                replace(initcap(replace(q.origin_type::text, '_', ' ')), 'Qr', 'QR')
              ) as source_label,
              coalesce(
                la.name,
                ia.title,
                q.metadata->>'package_name',
                q.metadata->>'attribution_subject',
                q.metadata->>'ticket_use_case',
                qb.name,
                c.name,
                r.name,
                q.benefit_value->>'label',
                q.benefit_type::text,
                q.origin_type::text
              ) as source_name,
              coalesce(
                la.description,
                q.metadata->>'message',
                q.metadata->>'conditions',
                q.metadata->>'channel_use',
                qb.channel_use,
                q.metadata->>'activation_type',
                q.metadata->>'crm_activation_type',
                ia.activation_type::text,
                q.origin_type::text
              ) as source_detail,
              coalesce(c.name, q.metadata->>'campaign_name') as source_campaign,
              coalesce(la.channel, qb.channel_use, q.metadata->>'channel_use', q.metadata->>'source') as source_channel,
              (q.status = 'ACTIVE' and q.redeemed_at is null and (q.expires_at is null or q.expires_at > now())) as is_available
       from qr_codes q
       left join players p on p.id = q.player_id
       left join campaigns c on c.id = q.campaign_id
       left join rewards r on r.id = q.reward_id
       left join qr_batches qb on qb.id = q.batch_id and qb.business_id = q.business_id
       left join lead_activations la on la.business_id = q.business_id and la.id = coalesce(
         case
           when q.metadata->>'crm_activation_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (q.metadata->>'crm_activation_id')::uuid
         end,
         case
           when q.metadata->>'lead_activation_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (q.metadata->>'lead_activation_id')::uuid
         end
       )
       left join interactive_activations ia on ia.company_id = q.business_id and ia.id = coalesce(
         case
           when q.metadata->>'activation_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (q.metadata->>'activation_id')::uuid
         end,
         case
           when q.metadata->>'interactive_activation_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (q.metadata->>'interactive_activation_id')::uuid
         end
       )
       where q.business_id = $1 and (
         ($2::uuid is not null and q.player_id = $2)
         or ($3::text is not null and nullif($3::text, '') is not null and p.document_id = $3::text)
         or ($4::text is not null and nullif($4::text, '') is not null and p.phone = $4::text)
         or ($5::text is not null and nullif($5::text, '') is not null and lower(p.email) = lower($5::text))
       )
       order by q.created_at desc
       limit 120`,
      identityOnlyParams
    ),
    query(
      `select ta.*, bt.title as trivia_title, c.name as campaign_name, g.name as game_name,
              ta.player_id, ta.participant_document_id as document_value,
              ta.participant_phone as phone_value, ta.participant_email as email_value
       from business_trivia_attempts ta
       left join business_trivias bt on bt.id = ta.trivia_id
       left join campaigns c on c.id = ta.campaign_id
       left join games g on g.id = (select game_id from players where id = ta.player_id)
       where ta.business_id = $1 and (
         ($2::uuid is not null and ta.player_id = $2)
         or ($3::text is not null and nullif($3::text, '') is not null and ta.participant_document_id = $3::text)
         or ($4::text is not null and nullif($4::text, '') is not null and ta.participant_phone = $4::text)
         or ($5::text is not null and nullif($5::text, '') is not null and lower(ta.participant_email) = lower($5::text))
       )
       order by ta.created_at desc
       limit 120`,
      identityOnlyParams
    ),
    query(
      `select la.*, c.name as campaign_name, al.public_url, al.token, al.status as link_status
       from lead_activations la
       left join campaigns c on c.id = la.campaign_id
       left join activation_links al on al.activation_id = la.id
       where la.business_id = $1
         and (($2::uuid is not null and la.lead_id = $2) or (la.source_type = $3 and la.source_id = $4))
       order by la.created_at desc
       limit 100`,
      sourceParams
    ),
    query(
      `select lc.*, la.name as activation_name, c.name as campaign_name
       from lead_communications lc
       left join lead_activations la on la.id = lc.activation_id
       left join campaigns c on c.id = lc.campaign_id
       where lc.business_id = $1
         and (($2::uuid is not null and lc.lead_id = $2) or (lc.source_type = $3 and lc.source_id = $4))
       order by lc.created_at desc
       limit 100`,
      sourceParams
    ),
    query(
      `select ln.*, u.full_name as author_name
       from lead_notes ln
       left join app_users u on u.id = ln.created_by
       where ln.business_id = $1
         and (($2::uuid is not null and ln.lead_id = $2) or (ln.source_type = $3 and ln.source_id = $4))
       order by ln.created_at desc
       limit 100`,
      sourceParams
    ),
    query(
      `select *
       from lead_interests li
       where li.business_id = $1
         and (($2::uuid is not null and li.lead_id = $2) or (li.source_type = $3 and li.source_id = $4))
       order by weight desc, updated_at desc`,
      sourceParams
    ),
    query(
      `select a.*
       from affiliates a
       where a.business_id = $1 and (
         ($2::text is not null and a.document_id = $2)
         or ($3::text is not null and a.phone = $3)
         or ($4::text is not null and lower(a.email) = lower($4))
       )
       order by a.created_at desc
       limit 5`,
      contactParams
    ),
    query(
      `select rp.*, c.name as campaign_name
       from reward_passes rp
       left join campaigns c on c.id = rp.campaign_id
       where rp.company_id = $1 and (
         ($2::text is not null and (rp.buyer_document = $2 or rp.beneficiary_document = $2))
         or ($3::text is not null and (rp.buyer_phone = $3 or rp.beneficiary_phone = $3))
         or ($4::text is not null and (lower(rp.buyer_email) = lower($4) or lower(rp.beneficiary_email) = lower($4)))
       )
       order by rp.created_at desc
       limit 60`,
      contactParams
    ),
    query(
      `select *
       from lead_events le
       where le.business_id = $1
         and (($2::uuid is not null and le.lead_id = $2) or (le.source_type = $3 and le.source_id = $4))
       order by le.created_at desc
       limit 160`,
      sourceParams
    ),
  ]);

  const purchaseRows = purchases.rows;
  const ticketRows = tickets.rows;
  const gameRows = trivia.rows;
  const activationRows = activations.rows;
  const communicationRows = communications.rows;
  const noteRows = notes.rows;
  const interestRows = interests.rows.length
    ? interests.rows
    : inferInterests(purchaseRows, gameRows, ticketRows, lead);

  const totalSpent = purchaseRows.reduce((sum, item) => sum + moneyNumber(item.sale_amount), 0);
  const purchaseCount = purchaseRows.length;
  const scoreTotal = gameRows.reduce((sum, item) => sum + Number(item.score || 0), 0);
  const scoreAverage = gameRows.length ? scoreTotal / gameRows.length : 0;
  const bestScore = gameRows.reduce((max, item) => Math.max(max, Number(item.score || 0)), 0);
  const activeTickets = ticketRows.filter((item) => item.status === "ACTIVE" && (!item.expires_at || new Date(item.expires_at) > new Date())).length;
  const redeemedTickets = ticketRows.filter((item) => item.status === "REDEEMED" || item.redeemed_at).length;
  const lastPurchase = purchaseRows[0]?.created_at || null;
  const lastGame = gameRows[0]?.created_at || null;
  const lastActivation = activationRows[0]?.created_at || null;
  const lastInteractionAt = [lead.created_at, lastPurchase, lastGame, lastActivation, ticketRows[0]?.created_at, communicationRows[0]?.created_at]
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || lead.created_at;

  const summary = {
    purchase_count: purchaseCount,
    total_spent: totalSpent,
    avg_ticket: purchaseCount ? totalSpent / purchaseCount : 0,
    last_purchase_at: lastPurchase,
    last_redemption_at: ticketRows.find((item) => item.redeemed_at)?.redeemed_at || null,
    last_activation_at: lastActivation,
    games_played: gameRows.length,
    activations_count: activationRows.length,
    benefits_received: ticketRows.length + rewardPasses.rows.length,
    benefits_redeemed: redeemedTickets + rewardPasses.rows.filter((item) => item.status === "REDEEMED" || Number(item.current_balance_cop || 0) < Number(item.initial_value_cop || 0)).length,
    benefits_expired: ticketRows.filter((item) => item.status === "EXPIRED" || (item.expires_at && new Date(item.expires_at) <= new Date())).length,
    score_total: scoreTotal,
    score_average: scoreAverage,
    best_score: bestScore,
    active_tickets: activeTickets,
    redeemed_tickets: redeemedTickets,
    redemption_rate: ticketRows.length ? Math.round((redeemedTickets / ticketRows.length) * 1000) / 10 : 0,
    top_interest: interestRows[0]?.interest_name || null,
    commercial_status: suggestedStatus({ purchase_count: purchaseCount, total_spent: totalSpent, score_total: scoreTotal, activation_count: activationRows.length, games_played: gameRows.length, benefits_received: ticketRows.length, last_interaction_at: lastInteractionAt }),
    last_interaction_at: lastInteractionAt,
  };

  const detailLead = {
    ...lead,
    id: lead.id,
    lead_id: lead.lead_id,
    commercial_status: lead.stored_status || summary.commercial_status,
    commercial_status_label: statusLabel(lead.stored_status || summary.commercial_status),
    level: leadLevel(summary),
    is_affiliate: affiliates.rows.length > 0,
    has_active_benefits: activeTickets > 0 || rewardPasses.rows.some((item) => item.status === "ACTIVE"),
    insight: insightFor(summary, interestRows),
  };

  return {
    lead: detailLead,
    summary,
    purchases: purchaseRows,
    interests: interestRows,
    activations: activationRows,
    games: gameRows,
    benefits: ticketRows,
    reward_passes: rewardPasses.rows,
    affiliate: affiliates.rows[0] || null,
    communications: communicationRows,
    notes: noteRows,
    timeline: buildTimeline({ lead: detailLead, purchases: purchaseRows, tickets: ticketRows, games: gameRows, activations: activationRows, communications: communicationRows, notes: noteRows, events: events.rows }),
  };
}

function inferInterests(purchases = [], games = [], tickets = [], lead = {}) {
  const weights = new Map();
  const add = (name, source, weight = 8) => {
    const clean = String(name || "").trim();
    if (!clean || clean === "-") return;
    const key = clean.toLowerCase();
    const current = weights.get(key) || { interest_name: clean, source, weight: 0 };
    current.weight += weight;
    weights.set(key, current);
  };
  purchases.forEach((item) => {
    add(item.product_name, "purchase", 16);
    add(item.metadata?.category || item.acquisition_channel, "purchase", 10);
  });
  games.forEach((item) => add(item.trivia_title || item.game_name, "trivia", 8));
  tickets.forEach((item) => add(item.reward_name || item.benefit_type, "benefit", 6));
  add(lead.interest, "manual", 14);
  add(lead.channel, "campaign", 4);
  return Array.from(weights.values()).sort((a, b) => b.weight - a.weight).slice(0, 12);
}

function buildTimeline(parts) {
  const rows = [];
  if (parts.lead?.created_at) {
    rows.push({ type: "lead_created", title: "Lead creado", description: parts.lead.name || "Contacto capturado", created_at: parts.lead.created_at });
  }
  parts.purchases.forEach((item) => rows.push({ type: "purchase_registered", title: "Compra registrada", description: `${item.product_name || "Compra"} · ${moneyNumber(item.sale_amount).toLocaleString("es-CO")} ${item.currency || "COP"}`, created_at: item.created_at, metadata: item }));
  parts.tickets.forEach((item) => rows.push({ type: item.redeemed_at ? "ticket_redeemed" : "ticket_issued", title: item.redeemed_at ? "Ticket redimido" : "Ticket emitido", description: item.reward_name || item.benefit_type || item.origin_type, created_at: item.redeemed_at || item.created_at, metadata: item }));
  parts.games.forEach((item) => rows.push({ type: "trivia_completed", title: item.trivia_title || item.game_name || "Juego completado", description: `Score ${Number(item.score || 0)} de ${Number(item.total_questions || item.max_score || 0)}`, created_at: item.created_at, metadata: item }));
  parts.activations.forEach((item) => rows.push({ type: "activation_sent", title: item.name, description: item.description || item.activation_type, created_at: item.created_at, metadata: item }));
  parts.communications.forEach((item) => rows.push({ type: "communication_sent", title: item.subject || item.type, description: `${item.channel} · ${item.status}`, created_at: item.created_at, metadata: item }));
  parts.notes.forEach((item) => rows.push({ type: "note_created", title: "Nota interna", description: item.note, created_at: item.created_at, metadata: item }));
  parts.events.forEach((item) => rows.push({ type: item.event_type, title: item.event_title, description: item.event_description, created_at: item.created_at, metadata: item.metadata }));
  return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 180);
}

async function ensurePlayerForAction(client, businessId, leadId, sourceType) {
  const lead = await resolveLead(businessId, leadId, sourceType, client);
  if (lead.lead_id) return lead;
  const created = await client.query(
    `insert into players (business_id, campaign_id, game_id, name, email, phone, document_id, metadata)
     values ($1, null, null, $2, $3, $4, $5, $6::jsonb)
     returning id, business_id, id as lead_id, 'PLAYER'::text as source_type, name, email, phone, document_id, metadata, created_at`,
    [
      businessId,
      lead.name || "Lead",
      lead.email || null,
      lead.phone || null,
      lead.document_id || null,
      JSON.stringify({
        crm_created_from: lead.source_type,
        crm_source_id: lead.id,
        source: lead.channel || "CRM",
      }),
    ]
  );
  await client.query(
    `insert into lead_events (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
     values ($1, $2, $3, $4, 'lead_created', 'Lead CRM creado', 'Contacto convertido a lead accionable para activaciones.', null, $5::jsonb)`,
    [businessId, created.rows[0].id, lead.source_type, lead.id, JSON.stringify({ original_source_type: lead.source_type, original_source_id: lead.id })]
  );
  return created.rows[0];
}

async function createLeadNote(businessId, user, leadId, sourceType, payload) {
  const lead = await resolveLead(businessId, leadId, sourceType);
  const result = await query(
    `insert into lead_notes
      (business_id, lead_id, source_type, source_id, note, note_type, next_action, reminder_at, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning *`,
    [
      businessId,
      lead.lead_id || null,
      lead.source_type,
      lead.id,
      payload.note,
      payload.note_type || "commercial",
      payload.next_action || null,
      payload.reminder_at || null,
      user.id,
    ]
  );
  await query(
    `insert into lead_events (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
     values ($1, $2, $3, $4, 'note_created', 'Nota interna creada', $5, $6, $7::jsonb)`,
    [businessId, lead.lead_id || null, lead.source_type, lead.id, payload.note.slice(0, 500), user.id, JSON.stringify({ note_id: result.rows[0].id, note_type: payload.note_type || "commercial" })]
  );
  return result.rows[0];
}

async function addLeadInterest(businessId, user, leadId, sourceType, payload) {
  const lead = await resolveLead(businessId, leadId, sourceType);
  const result = await query(
    `insert into lead_interests
      (business_id, lead_id, source_type, source_id, interest_name, source, weight, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (business_id, (coalesce(lead_id, '00000000-0000-0000-0000-000000000000'::uuid)), source_type, (coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)), (lower(interest_name)))
     do update set weight = excluded.weight, source = excluded.source, updated_at = now()
     returning *`,
    [
      businessId,
      lead.lead_id || null,
      lead.source_type,
      lead.id,
      payload.interest_name,
      payload.source || "manual",
      payload.weight || 10,
      user.id,
    ]
  );
  return result.rows[0];
}

async function deleteLeadInterest(businessId, leadId, interestId, sourceType = "PLAYER") {
  const lead = await resolveLead(businessId, leadId, sourceType);
  const result = await query(
    `delete from lead_interests
     where id = $1 and business_id = $2
       and (($3::uuid is not null and lead_id = $3) or (source_type = $4 and source_id = $5))
     returning id`,
    [interestId, businessId, lead.lead_id || null, lead.source_type, lead.id]
  );
  if (!result.rowCount) throw notFound("Interest not found.");
  return { id: interestId };
}

async function deleteLeadContact(businessId, user, leadId, sourceType = "PLAYER") {
  return withTransaction(async (client) => {
    const lead = await resolveLead(businessId, leadId, sourceType, client);
    const source = String(lead.source_type || sourceType || "PLAYER").toUpperCase();
    const playerId = lead.lead_id || (source === "PLAYER" ? lead.id : null);
    const sourceId = lead.id;
    const deleted = {};

    const incrementDeleted = (key, count) => {
      deleted[key] = (deleted[key] || 0) + Number(count || 0);
    };

    const deleteBySource = async (table, sourceLeadId = playerId || null, sourceName = source, sourceRowId = sourceId) => {
      const result = await client.query(
        `delete from ${table}
         where business_id = $1
           and (
             ($2::uuid is not null and lead_id = $2)
             or (source_type = $3 and source_id = $4)
           )`,
        [businessId, sourceLeadId || null, sourceName, sourceRowId]
      );
      incrementDeleted(table, result.rowCount);
    };

    const deleteLeadArtifacts = async (sourceLeadId = playerId || null, sourceName = source, sourceRowId = sourceId) => {
      await deleteBySource("lead_interests", sourceLeadId, sourceName, sourceRowId);
      await deleteBySource("lead_notes", sourceLeadId, sourceName, sourceRowId);
      await deleteBySource("lead_scores", sourceLeadId, sourceName, sourceRowId);
      await deleteBySource("lead_communications", sourceLeadId, sourceName, sourceRowId);

      const activationIds = await client.query(
        `delete from lead_activations
         where business_id = $1
           and (
             ($2::uuid is not null and lead_id = $2)
             or (source_type = $3 and source_id = $4)
           )
         returning id`,
        [businessId, sourceLeadId || null, sourceName, sourceRowId]
      );
      incrementDeleted("lead_activations", activationIds.rowCount);

      const events = await client.query(
        `delete from lead_events
         where business_id = $1
           and (
             ($2::uuid is not null and lead_id = $2)
             or (source_type = $3 and source_id = $4)
           )`,
        [businessId, sourceLeadId || null, sourceName, sourceRowId]
      );
      incrementDeleted("lead_events", events.rowCount);
    };

    const deletePlayer = async (targetPlayerId) => {
      if (!targetPlayerId) return 0;
      await deleteLeadArtifacts(targetPlayerId, "PLAYER", targetPlayerId);

      const playerQrIds = await client.query(
        "select id from qr_codes where business_id = $1 and player_id = $2",
        [businessId, targetPlayerId]
      );
      const qrIds = playerQrIds.rows.map((row) => row.id);

      await client.query(
        "update qr_codes set claimed_by_player_id = null where business_id = $1 and claimed_by_player_id = $2",
        [businessId, targetPlayerId]
      );
      await client.query(
        "update redemptions set player_id = null where business_id = $1 and player_id = $2",
        [businessId, targetPlayerId]
      );
      const attributedSales = await client.query(
        "delete from attributed_sales where business_id = $1 and player_id = $2",
        [businessId, targetPlayerId]
      );
      incrementDeleted("attributed_sales", attributedSales.rowCount);

      if (qrIds.length) {
        const activationLinks = await client.query(
          "delete from activation_links where business_id = $1 and qr_code_id = any($2::uuid[])",
          [businessId, qrIds]
        );
        incrementDeleted("activation_links", activationLinks.rowCount);
        await client.query(
          "update business_sales set qr_code_id = null where business_id = $1 and qr_code_id = any($2::uuid[])",
          [businessId, qrIds]
        );
        await client.query(
          "update validation_logs set qr_code_id = null where business_id = $1 and qr_code_id = any($2::uuid[])",
          [businessId, qrIds]
        );
        await client.query(
          "update qr_event_logs set qr_code_id = null where business_id = $1 and qr_code_id = any($2::uuid[])",
          [businessId, qrIds]
        );
        await client.query(
          "update qr_codes set player_id = null where business_id = $1 and player_id = $2",
          [businessId, targetPlayerId]
        );
        const rewards = await client.query(
          "delete from interactive_activation_rewards where company_id = $1 and qr_code_id = any($2::uuid[])",
          [businessId, qrIds]
        );
        incrementDeleted("interactive_activation_rewards", rewards.rowCount);
      }

      await client.query(
        "update lead_capture_submissions set lead_id = null where business_id = $1 and lead_id = $2",
        [businessId, targetPlayerId]
      );
      await client.query(
        "update digital_asset_downloads set lead_id = null where business_id = $1 and lead_id = $2",
        [businessId, targetPlayerId]
      );

      const player = await client.query(
        "delete from players where id = $1 and business_id = $2 returning id",
        [targetPlayerId, businessId]
      );
      incrementDeleted("players", player.rowCount);
      return player.rowCount;
    };

    await deleteLeadArtifacts(playerId || null, source, sourceId);

    if (source === "MANUAL") {
      const convertedPlayers = await client.query(
        `select id
         from players
         where business_id = $1
           and metadata->>'crm_created_from' = 'MANUAL'
           and metadata->>'crm_source_id' = $2`,
        [businessId, sourceId]
      );
      for (const row of convertedPlayers.rows) {
        await deletePlayer(row.id);
      }
      const manual = await client.query(
        "delete from business_manual_leads where id = $1 and business_id = $2 returning id",
        [sourceId, businessId]
      );
      incrementDeleted("business_manual_leads", manual.rowCount);
      if (!manual.rowCount) throw notFound("Lead not found.");
      return {
        deleted: true,
        lead_id: leadId,
        source_type: source,
        cleanup: deleted,
      };
    }

    if (!playerId) throw notFound("Lead not found.");
    const playerDeleted = await deletePlayer(playerId);
    if (!playerDeleted) throw notFound("Lead not found.");

    await client.query(
      `insert into lead_events
        (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
       values ($1, null, $2, $3, 'lead_deleted', 'Lead eliminado', $4, $5, $6::jsonb)`,
      [
        businessId,
        source,
        sourceId,
        `${lead.name || "Contacto"} fue eliminado del CRM unificado.`,
        user?.id || null,
        JSON.stringify({ deleted_player_id: playerId, cleanup: deleted }),
      ]
    );

    return {
      deleted: true,
      lead_id: leadId,
      source_type: source,
      cleanup: deleted,
    };
  });
}

async function createLeadActivation(businessId, user, leadId, sourceType, payload) {
  return withTransaction(async (client) => {
    const lead = await ensurePlayerForAction(client, businessId, leadId, sourceType);
    if (payload.campaign_id) {
      const campaign = await client.query("select id from campaigns where id = $1 and business_id = $2", [payload.campaign_id, businessId]);
      if (!campaign.rowCount) throw badRequest("La campaña seleccionada no pertenece a este negocio.");
    }
    if (payload.expires_at && new Date(payload.expires_at) <= new Date()) {
      throw badRequest("La fecha de vencimiento debe ser futura.");
    }
    if (String(payload.channel || "").toLowerCase() === "email" && !lead.email) {
      throw badRequest("No se puede enviar correo porque el lead no tiene email valido.");
    }

    const needsTicket = LEAD_ACTIVATION_TYPES_WITH_TICKET.has(payload.activation_type);
    let qr = null;
    let token = createSecureToken();
    let publicUrl = buildActivationUrl(payload.activation_type, token);

    const activation = await client.query(
      `insert into lead_activations
        (business_id, lead_id, source_type, source_id, campaign_id, activation_type, name,
         description, status, benefit_type, benefit_value, channel, expires_at, score_min, metadata, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'CREATED', $9, $10::jsonb, $11, $12, $13, $14::jsonb, $15)
       returning *`,
      [
        businessId,
        lead.lead_id,
        lead.source_type,
        lead.id,
        payload.campaign_id || null,
        payload.activation_type,
        payload.name,
        payload.description || null,
        payload.benefit_type || "CUSTOM",
        JSON.stringify(payload.benefit_value || {}),
        payload.channel || "manual",
        payload.expires_at || null,
        payload.score_min || null,
        JSON.stringify(payload.metadata || {}),
        user.id,
      ]
    );

    if (needsTicket) {
      token = createSecureToken();
      const createdQr = await client.query(
        `insert into qr_codes
          (business_id, campaign_id, game_id, player_id, reward_id, questionnaire_id, token, status,
           metadata, expires_at, origin_type, benefit_type, benefit_value, claim_required)
         values ($1, $2, null, $3, null, null, $4, 'ACTIVE', $5::jsonb, $6, 'MANUAL_BENEFIT', $7, $8::jsonb, false)
         returning *`,
        [
          businessId,
          payload.campaign_id || null,
          lead.lead_id,
          token,
          JSON.stringify({
            crm_activation_id: activation.rows[0].id,
            crm_activation_type: payload.activation_type,
            crm_ticket_source: "lead_activation",
            lead_source_type: lead.source_type,
            lead_source_id: lead.id,
            message: payload.message || null,
            conditions: payload.conditions || null,
            valid_branch: payload.branch_id || null,
            valid_product_category: payload.product_category || null,
          }),
          payload.expires_at || null,
          payload.benefit_type || "CUSTOM",
          JSON.stringify(payload.benefit_value || {}),
        ]
      );
      qr = createdQr.rows[0];
      await consumeQrCredit(client, businessId, qr.id, user.id);
      publicUrl = buildValidatorUrl(token);
      await client.query("update lead_activations set qr_code_id = $1 where id = $2", [qr.id, activation.rows[0].id]);
    }

    const link = await client.query(
      `insert into activation_links
        (business_id, lead_id, activation_id, campaign_id, qr_code_id, type, channel, token, public_url, expires_at, created_by, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       returning *`,
      [
        businessId,
        lead.lead_id,
        activation.rows[0].id,
        payload.campaign_id || null,
        qr?.id || null,
        payload.activation_type,
        payload.channel || "manual",
        token,
        publicUrl,
        payload.expires_at || null,
        user.id,
        JSON.stringify({ lead_name: lead.name || null }),
      ]
    );

    const emailPending = String(payload.channel || "").toLowerCase() === "email";
    const communication = await client.query(
      `insert into lead_communications
        (business_id, lead_id, source_type, source_id, campaign_id, activation_id, ticket_id,
         type, channel, subject, message, status, sent_at, metadata, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
               $12, case when $12 = 'sent' then now() else null end, $13::jsonb, $14)
       returning *`,
      [
        businessId,
        lead.lead_id,
        lead.source_type,
        lead.id,
        payload.campaign_id || null,
        activation.rows[0].id,
        qr?.id || null,
        payload.activation_type,
        payload.channel || "manual",
        payload.subject || payload.name,
        payload.message || "",
        emailPending ? "pending" : "sent",
        JSON.stringify({ public_url: publicUrl, email_pending: emailPending, consent_warning: Boolean(payload.consent_warning) }),
        user.id,
      ]
    );

    await client.query(
      `insert into lead_events
        (business_id, lead_id, source_type, source_id, event_type, event_title, event_description,
         campaign_id, qr_code_id, communication_id, metadata, created_by)
       values ($1, $2, $3, $4, 'activation_sent', $5, $6, $7, $8, $9, $10::jsonb, $11)`,
      [
        businessId,
        lead.lead_id,
        lead.source_type,
        lead.id,
        payload.name,
        payload.description || `Activacion ${payload.activation_type} creada desde Leads CRM.`,
        payload.campaign_id || null,
        qr?.id || null,
        communication.rows[0].id,
        JSON.stringify({ activation_id: activation.rows[0].id, public_url: publicUrl, channel: payload.channel || "manual" }),
        user.id,
      ]
    );

    return {
      activation: { ...activation.rows[0], qr_code_id: qr?.id || activation.rows[0].qr_code_id },
      link: link.rows[0],
      communication: communication.rows[0],
      ticket: qr,
      public_url: publicUrl,
    };
  });
}

module.exports = {
  addLeadInterest,
  createLeadActivation,
  createLeadNote,
  deleteLeadContact,
  deleteLeadInterest,
  getLeadCrmDetail,
  listLeadCrmRows,
};

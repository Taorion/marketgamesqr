const { withTransaction, query } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createSecureToken } = require("../utils/token");
const { consumeQrCredit } = require("./qrCreditService");
const {
  affiliatePointRuleMetadata,
  getAffiliatePointRules,
  referralPointsForAmount,
} = require("./affiliatePointRulesService");
const { syncSaleProductsWithCatalog } = require("./productCatalogService");
const { resolveAcquisitionChannelReference } = require("./acquisitionChannelService");
const { recordLifecycleEvent } = require("./lifecycleAuditService");

const OPERATIONAL_AGENDA_SOURCE_TYPES = new Set(["GENERAL", "CAMPAIGN", "MARKETING", "ACTIVATION_STRATEGY", "BULK_ACTIVATION"]);

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

function salePurchaseContribution(sale = {}) {
  const imported = Number.parseInt(sale.metadata?.imported_purchase_count, 10);
  return sale.metadata?.source_module === "customer_csv_import" && Number.isInteger(imported) && imported > 0
    ? imported
    : 1;
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

function buildClaimUrl(token) {
  const base = (env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/claim/${encodeURIComponent(token)}`;
}

function buildActivationUrl(type, token) {
  const base = (env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "");
  const normalized = String(type || "").toUpperCase();
  if (normalized.includes("TRIVIA")) return `${base}/trivia/${encodeURIComponent(token)}`;
  if (normalized.includes("GAME") || normalized.includes("MICRO")) return `${base}/activacion/${encodeURIComponent(token)}`;
  if (normalized.includes("TICKET") || normalized.includes("BENEFIT") || normalized.includes("VIP") || normalized.includes("GIFT")) {
    return buildClaimUrl(token);
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
  const sourceIds = Array.isArray(filters.source_ids)
    ? filters.source_ids.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  if (filters.source_type) {
    params.push(String(filters.source_type || "").toUpperCase());
    clauses.push(`source_type = $${params.length}`);
  }
  if (sourceIds.length) {
    params.push(sourceIds);
    clauses.push(`id = any($${params.length}::uuid[])`);
  }
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
    clauses.push(`(campaign_id = $${params.length} or associated_campaign_ids @> array[$${params.length}]::uuid[])`);
  }
  if (filters.status) {
    params.push(String(filters.status).toUpperCase());
    clauses.push(`commercial_status = $${params.length}`);
  }
  if (filters.priority) {
    params.push(String(filters.priority).toUpperCase());
    clauses.push(`care_priority = $${params.length}`);
  }
  if (filters.rms_phase) {
    params.push(String(filters.rms_phase || "").trim().toLowerCase());
    clauses.push(`coalesce(rms_phase, 'recoleccion') = $${params.length}`);
  }
  if (filters.interest) {
    params.push(`%${normalizeSearch(filters.interest)}%`);
    clauses.push(`normalized_top_interest like $${params.length}`);
  }
  if (filters.purchased_product) {
    params.push(`%${normalizeSearch(filters.purchased_product)}%`);
    clauses.push(`normalized_purchased_products like $${params.length}`);
  }
  if (filters.city) {
    params.push(`%${normalizeSearch(filters.city)}%`);
    clauses.push(`normalized_city like $${params.length}`);
  }
  if (filters.audience_type === "LEAD") clauses.push("purchase_count = 0");
  if (filters.audience_type === "CLIENT") clauses.push("purchase_count > 0");
  if (filters.has_purchases === "true") clauses.push("purchase_count > 0");
  if (filters.has_purchases === "false") clauses.push("purchase_count = 0");
  if (filters.is_affiliate === "true") clauses.push("is_affiliate = true");
  if (filters.is_affiliate === "false") clauses.push("is_affiliate = false");
  if (filters.has_gifts === "true") clauses.push("benefits_received > 0");
  if (filters.has_active_tickets === "true") clauses.push("active_tickets > 0");
  if (filters.has_expired_tickets === "true") clauses.push("expired_tickets > 0");
  if (filters.has_inactive_tickets === "true") clauses.push("inactive_tickets > 0");
  if (filters.has_redeemed_tickets === "true") clauses.push("redeemed_tickets > 0");
  if (filters.channel) {
    params.push(`%${normalizeSearch(filters.channel)}%`);
    clauses.push(`(normalized_channel like $${params.length} or normalized_associated_channels like $${params.length})`);
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
         coalesce(p.metadata->>'company', '') as company,
         p.created_at,
         coalesce(latest_capture.campaign_id, p.campaign_id) as campaign_id,
         coalesce(latest_capture.campaign_name, c.name) as campaign_name,
         array_remove(array[p.campaign_id, latest_capture.campaign_id], null)::uuid[] as associated_campaign_ids,
         array_remove(array[
           latest_capture.channel,
           ia.title,
           p.metadata->>'preferred_channel',
           p.metadata->>'source',
           p.metadata->>'lead_source',
           c.type
         ], null)::text[] as associated_channels,
         coalesce(
           case when latest_capture.id is not null then 'Descarga de activo digital' end,
           case
             when p.metadata->>'source_key' = 'descarga_activo_digital'
               or (lower(coalesce(p.metadata->>'source', '')) = 'captura_relampago' and nullif(p.metadata->>'asset_title', '') is not null)
             then 'Descarga de activo digital'
           end,
           case when ia.id is not null then 'Activacion interactiva' end,
           p.metadata->>'source',
           p.metadata->>'lead_source',
           c.type,
           'QR / Activacion'
         ) as channel,
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
         s.purchased_products,
         s.top_category,
         coalesce(q.active_tickets, 0)::int as active_tickets,
         coalesce(q.redeemed_tickets, 0)::int as redeemed_tickets,
         coalesce(q.expired_tickets, 0)::int as expired_tickets,
         coalesce(q.inactive_tickets, 0)::int as inactive_tickets,
         coalesce(q.benefits_received, 0)::int as benefits_received,
         q.active_ticket_qr_id,
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
         coalesce(latest_capture.asset_title, li.top_interest) as top_interest,
         coalesce(p.metadata, '{}'::jsonb) || case when latest_capture.id is not null then jsonb_build_object(
           'digital_asset_origin', true,
           'source_key', 'descarga_activo_digital',
           'source_label', 'Descarga de activo digital',
           'asset_id', latest_capture.asset_id,
           'asset_title', latest_capture.asset_title,
           'lead_capture_activation_id', latest_capture.activation_id,
           'lead_capture_name', latest_capture.activation_name,
           'campaign_id', latest_capture.campaign_id,
           'campaign_name', latest_capture.campaign_name
         ) else '{}'::jsonb end
         || case when ia.id is not null then jsonb_build_object(
           'interactive_activation_id', ia.id,
           'interactive_activation_name', ia.title,
           'interactive_activation_type', ia.activation_type,
           'activation_name', ia.title,
           'activation_type', ia.activation_type,
           'source_label', 'Activacion interactiva'
         ) else '{}'::jsonb end as metadata
       from players p
       left join campaigns c on c.id = p.campaign_id
       left join interactive_activations ia on ia.company_id = p.business_id and ia.id = coalesce(
         case
           when p.metadata->>'activation_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (p.metadata->>'activation_id')::uuid
         end,
         case
           when p.metadata->>'interactive_activation_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (p.metadata->>'interactive_activation_id')::uuid
         end
       )
       left join lateral (
         select
           s.id,
           s.activation_id,
           s.asset_id,
           s.campaign_id,
           s.channel,
           s.created_at,
           lca.name as activation_name,
           da.title as asset_title,
           lcc.name as campaign_name
         from lead_capture_submissions s
         left join lead_capture_activations lca on lca.id = s.activation_id
         left join digital_assets da on da.id = s.asset_id
         left join campaigns lcc on lcc.id = s.campaign_id
         where s.business_id = p.business_id and s.lead_id = p.id
         order by s.created_at desc
         limit 1
       ) latest_capture on true
       left join lateral (
         select coalesce(sum(case
                  when bs.metadata->>'source_module' = 'customer_csv_import'
                   and coalesce(bs.metadata->>'imported_purchase_count', '') ~ '^[1-9][0-9]*$'
                  then (bs.metadata->>'imported_purchase_count')::int else 1 end), 0)::int as purchase_count,
                coalesce(sum(bs.sale_amount), 0)::numeric as total_spent,
                coalesce(sum(bs.sale_amount) / nullif(sum(case
                  when bs.metadata->>'source_module' = 'customer_csv_import'
                   and coalesce(bs.metadata->>'imported_purchase_count', '') ~ '^[1-9][0-9]*$'
                  then (bs.metadata->>'imported_purchase_count')::int else 1 end), 0), 0)::numeric as avg_ticket,
                max(bs.created_at) as last_purchase_at,
                (array_agg(bs.product_name order by bs.created_at desc))[1] as top_product,
                string_agg(distinct nullif(btrim(bs.product_name), ''), ' ') as purchased_products,
                (array_agg(coalesce(bs.metadata->>'category', bs.acquisition_channel) order by bs.created_at desc))[1] as top_category
         from business_sales bs
         where bs.business_id = p.business_id
           and (
             (nullif(p.document_id, '') is not null and bs.customer_document_id = p.document_id)
             or (nullif(p.phone, '') is not null and bs.customer_phone = p.phone)
             or (nullif(p.email, '') is not null and lower(bs.customer_email) = lower(p.email))
             or bs.qr_code_id in (select id from qr_codes where player_id = p.id)
             or (bs.metadata->>'crm_lead_id' = p.id::text)
             or (bs.metadata->>'crm_source_type' = 'PLAYER' and bs.metadata->>'crm_source_id' = p.id::text)
           )
       ) s on true
       left join lateral (
         select count(*) filter (where q.status = 'ACTIVE' and q.redeemed_at is null and (q.expires_at is null or q.expires_at > now()))::int as active_tickets,
                count(*) filter (where q.status = 'REDEEMED' or q.redeemed_at is not null)::int as redeemed_tickets,
                count(*) filter (where (q.status = 'EXPIRED' or (q.status = 'ACTIVE' and q.expires_at is not null and q.expires_at <= now())) and q.redeemed_at is null)::int as expired_tickets,
                count(*) filter (where q.redeemed_at is null and q.status <> 'REDEEMED' and not (q.status = 'ACTIVE' and (q.expires_at is null or q.expires_at > now())) and not (q.status = 'EXPIRED' or (q.status = 'ACTIVE' and q.expires_at is not null and q.expires_at <= now())))::int as inactive_tickets,
                count(*)::int as benefits_received,
                (array_agg(q.id order by q.created_at desc) filter (where q.status = 'ACTIVE' and q.redeemed_at is null and (q.expires_at is null or q.expires_at > now())))[1] as active_ticket_qr_id,
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
         and coalesce(p.metadata->>'lifecycle_status', 'ACTIVE') <> 'ARCHIVED'
     ),
     manual_rows as (
       select
         ml.id,
         'MANUAL'::text as source_type,
         null::uuid as lead_id,
         ml.name,
         split_part(coalesce(ml.name, ''), ' ', 1) as first_name,
         trim(substr(coalesce(ml.name, ''), length(split_part(coalesce(ml.name, ''), ' ', 1)) + 1)) as last_name,
         ml.document_id,
         ml.email,
         ml.phone,
         ml.company,
         ml.created_at,
         ca.campaign_id,
         ca.campaign_name,
         coalesce(ca.campaign_ids, '{}'::uuid[]) as associated_campaign_ids,
         coalesce(ca.campaign_channels, array_remove(array[ml.preferred_channel, ml.source], null)::text[], '{}'::text[]) as associated_channels,
         coalesce(ca.campaign_channel, ml.preferred_channel, ml.source, 'Manual') as channel,
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
         s.purchased_products,
         s.top_category,
         coalesce(q.active_tickets, 0)::int as active_tickets,
         coalesce(q.redeemed_tickets, 0)::int as redeemed_tickets,
         coalesce(q.expired_tickets, 0)::int as expired_tickets,
         coalesce(q.inactive_tickets, 0)::int as inactive_tickets,
         coalesce(q.benefits_received, 0)::int as benefits_received,
         q.active_ticket_qr_id,
         0::int as games_played,
         0::int as score_total,
         0::numeric as score_average,
         0::int as best_score,
         greatest(ml.created_at, coalesce(s.last_purchase_at, ml.created_at), coalesce(q.last_ticket_at, ml.created_at)) as last_interaction_at,
         0::int as activation_count,
         null::uuid as affiliate_id,
         null::text as affiliate_code,
         null::text as affiliate_status,
         false as is_affiliate,
         ml.interest as top_interest,
         ml.metadata
           || jsonb_build_object(
                'manual_status', ml.status,
                'manual_priority', ml.priority,
                'manual_notes', ml.notes,
                'manual_company', ml.company,
                'manual_job_title', ml.job_title,
                'manual_importance_reason', ml.importance_reason
              ) as metadata
      from business_manual_leads ml
       left join lateral (
         select
           (array_agg(c.id order by cmc.updated_at desc, cmc.created_at desc))[1] as campaign_id,
           (array_agg(c.name order by cmc.updated_at desc, cmc.created_at desc))[1] as campaign_name,
           (array_agg(coalesce(nullif(cmc.channel, ''), nullif(ml.preferred_channel, ''), nullif(ml.source, '')) order by cmc.updated_at desc, cmc.created_at desc))[1] as campaign_channel,
           coalesce(array_agg(c.id order by cmc.updated_at desc, cmc.created_at desc), '{}'::uuid[]) as campaign_ids,
           coalesce(
             array_remove(array_agg(coalesce(nullif(cmc.channel, ''), nullif(ml.preferred_channel, ''), nullif(ml.source, '')) order by cmc.updated_at desc, cmc.created_at desc), null),
             '{}'::text[]
           ) as campaign_channels
         from campaign_manual_contacts cmc
         join campaigns c on c.id = cmc.campaign_id and c.business_id = cmc.business_id
         where cmc.business_id = ml.business_id
           and cmc.manual_lead_id = ml.id
           and cmc.status = 'ACTIVE'
       ) ca on true
       left join lateral (
         select coalesce(sum(case
                  when bs.metadata->>'source_module' = 'customer_csv_import'
                   and coalesce(bs.metadata->>'imported_purchase_count', '') ~ '^[1-9][0-9]*$'
                  then (bs.metadata->>'imported_purchase_count')::int else 1 end), 0)::int as purchase_count,
                coalesce(sum(bs.sale_amount), 0)::numeric as total_spent,
                coalesce(sum(bs.sale_amount) / nullif(sum(case
                  when bs.metadata->>'source_module' = 'customer_csv_import'
                   and coalesce(bs.metadata->>'imported_purchase_count', '') ~ '^[1-9][0-9]*$'
                  then (bs.metadata->>'imported_purchase_count')::int else 1 end), 0), 0)::numeric as avg_ticket,
                max(bs.created_at) as last_purchase_at,
                (array_agg(bs.product_name order by bs.created_at desc))[1] as top_product,
                string_agg(distinct nullif(btrim(bs.product_name), ''), ' ') as purchased_products,
                (array_agg(coalesce(bs.metadata->>'category', bs.acquisition_channel) order by bs.created_at desc))[1] as top_category
         from business_sales bs
         where bs.business_id = ml.business_id
           and ((nullif(ml.document_id, '') is not null and bs.customer_document_id = ml.document_id)
             or (nullif(ml.phone, '') is not null and regexp_replace(coalesce(bs.customer_phone, ''), '\D', '', 'g') = regexp_replace(ml.phone, '\D', '', 'g'))
             or (nullif(ml.email, '') is not null and lower(bs.customer_email) = lower(ml.email))
             or (bs.metadata->>'crm_source_type' = 'MANUAL' and bs.metadata->>'crm_source_id' = ml.id::text))
       ) s on true
       left join lateral (
         select count(*) filter (where q.status = 'ACTIVE' and q.redeemed_at is null and (q.expires_at is null or q.expires_at > now()))::int as active_tickets,
                count(*) filter (where q.status = 'REDEEMED' or q.redeemed_at is not null)::int as redeemed_tickets,
                count(*) filter (where (q.status = 'EXPIRED' or (q.status = 'ACTIVE' and q.expires_at is not null and q.expires_at <= now())) and q.redeemed_at is null)::int as expired_tickets,
                count(*) filter (where q.redeemed_at is null and q.status <> 'REDEEMED' and not (q.status = 'ACTIVE' and (q.expires_at is null or q.expires_at > now())) and not (q.status = 'EXPIRED' or (q.status = 'ACTIVE' and q.expires_at is not null and q.expires_at <= now())))::int as inactive_tickets,
                count(*)::int as benefits_received,
                (array_agg(q.id order by q.created_at desc) filter (where q.status = 'ACTIVE' and q.redeemed_at is null and (q.expires_at is null or q.expires_at > now())))[1] as active_ticket_qr_id,
                max(q.created_at) as last_ticket_at
         from lead_activations la
         join qr_codes q on q.id = la.qr_code_id and q.business_id = la.business_id
         where la.business_id = ml.business_id
           and la.source_type = 'MANUAL'
           and la.source_id = ml.id
       ) q on true
       where ml.business_id = $1
         and ml.status <> 'ARCHIVED'
     ),
     affiliate_rows as (
       select
         fa.id,
         'AFFILIATE'::text as source_type,
         null::uuid as lead_id,
         fa.full_name as name,
         split_part(coalesce(fa.full_name, ''), ' ', 1) as first_name,
         trim(substr(coalesce(fa.full_name, ''), length(split_part(coalesce(fa.full_name, ''), ' ', 1)) + 1)) as last_name,
         fa.document_id,
         fa.email,
         fa.phone,
         coalesce(fa.card_metadata->>'company', '') as company,
         fa.created_at,
         ca.campaign_id,
         ca.campaign_name,
         case when ca.campaign_id is null then '{}'::uuid[] else array[ca.campaign_id]::uuid[] end as associated_campaign_ids,
         array_remove(array['Afiliados'::text, ca.campaign_name], null)::text[] as associated_channels,
         'Afiliados'::text as channel,
         coalesce(fa.card_metadata->>'city', '') as city,
         null::text as crm_priority,
         'WhatsApp'::text as preferred_channel,
         null::text as preferred_contact_time,
         ''::text as stored_status,
         coalesce(s.purchase_count, 0)::int as purchase_count,
         coalesce(s.total_spent, 0)::numeric as total_spent,
         coalesce(s.avg_ticket, 0)::numeric as avg_ticket,
         s.last_purchase_at,
         coalesce(s.top_product, fa.notes) as top_product,
         s.purchased_products,
         s.top_category,
         coalesce(q.active_tickets, 0)::int as active_tickets,
         coalesce(q.redeemed_tickets, 0)::int as redeemed_tickets,
         coalesce(q.expired_tickets, 0)::int as expired_tickets,
         coalesce(q.inactive_tickets, 0)::int as inactive_tickets,
         coalesce(q.benefits_received, 0)::int as benefits_received,
         q.active_ticket_qr_id,
         0::int as games_played,
         coalesce(fa.points_total, 0)::int as score_total,
         0::numeric as score_average,
         0::int as best_score,
         greatest(
           fa.created_at,
           coalesce(s.last_purchase_at, fa.created_at),
           coalesce(q.last_ticket_at, fa.created_at),
           coalesce(a.last_activation_at, fa.created_at),
           coalesce(l.last_ledger_at, fa.created_at)
         ) as last_interaction_at,
         coalesce(a.activation_count, 0)::int as activation_count,
         fa.id as affiliate_id,
         fa.qr_token as affiliate_code,
         fa.status as affiliate_status,
         true as is_affiliate,
         fa.notes as top_interest,
         fa.card_metadata as metadata
       from affiliates fa
       left join lateral (
         select c.id as campaign_id, c.name as campaign_name
         from campaign_affiliates caf
         join campaigns c on c.id = caf.campaign_id
         where caf.business_id = fa.business_id
           and caf.affiliate_id = fa.id
           and caf.status = 'ACTIVE'
         order by caf.updated_at desc, caf.created_at desc
         limit 1
       ) ca on true
       left join lateral (
         select coalesce(sum(case
                  when bs.metadata->>'source_module' = 'customer_csv_import'
                   and coalesce(bs.metadata->>'imported_purchase_count', '') ~ '^[1-9][0-9]*$'
                  then (bs.metadata->>'imported_purchase_count')::int else 1 end), 0)::int as purchase_count,
                coalesce(sum(bs.sale_amount), 0)::numeric as total_spent,
                coalesce(sum(bs.sale_amount) / nullif(sum(case
                  when bs.metadata->>'source_module' = 'customer_csv_import'
                   and coalesce(bs.metadata->>'imported_purchase_count', '') ~ '^[1-9][0-9]*$'
                  then (bs.metadata->>'imported_purchase_count')::int else 1 end), 0), 0)::numeric as avg_ticket,
                max(bs.created_at) as last_purchase_at,
                (array_agg(bs.product_name order by bs.created_at desc))[1] as top_product,
                string_agg(distinct nullif(btrim(bs.product_name), ''), ' ') as purchased_products,
                (array_agg(coalesce(bs.metadata->>'category', bs.acquisition_channel) order by bs.created_at desc))[1] as top_category
         from business_sales bs
         where bs.business_id = fa.business_id
           and (
             bs.referred_affiliate_id = fa.id
             or (nullif(fa.document_id, '') is not null and bs.customer_document_id = fa.document_id)
             or (nullif(fa.phone, '') is not null and bs.customer_phone = fa.phone)
             or (nullif(fa.email, '') is not null and lower(bs.customer_email) = lower(fa.email))
             or (bs.metadata->>'crm_source_type' = 'AFFILIATE' and bs.metadata->>'crm_source_id' = fa.id::text)
           )
       ) s on true
       left join lateral (
         select count(*) filter (where q.status = 'ACTIVE' and q.redeemed_at is null and (q.expires_at is null or q.expires_at > now()))::int as active_tickets,
                count(*) filter (where q.status = 'REDEEMED' or q.redeemed_at is not null)::int as redeemed_tickets,
                count(*) filter (where (q.status = 'EXPIRED' or (q.status = 'ACTIVE' and q.expires_at is not null and q.expires_at <= now())) and q.redeemed_at is null)::int as expired_tickets,
                count(*) filter (where q.redeemed_at is null and q.status <> 'REDEEMED' and not (q.status = 'ACTIVE' and (q.expires_at is null or q.expires_at > now())) and not (q.status = 'EXPIRED' or (q.status = 'ACTIVE' and q.expires_at is not null and q.expires_at <= now())))::int as inactive_tickets,
                count(*)::int as benefits_received,
                (array_agg(q.id order by q.created_at desc) filter (where q.status = 'ACTIVE' and q.redeemed_at is null and (q.expires_at is null or q.expires_at > now())))[1] as active_ticket_qr_id,
                max(q.created_at) as last_ticket_at
         from qr_codes q
         where q.business_id = fa.business_id and q.affiliate_id = fa.id
       ) q on true
       left join lateral (
         select count(*)::int as activation_count, max(created_at) as last_activation_at
         from lead_activations la
         where la.business_id = fa.business_id and la.source_type = 'AFFILIATE' and la.source_id = fa.id
       ) a on true
       left join lateral (
         select max(created_at) as last_ledger_at
         from affiliate_point_ledger apl
         where apl.business_id = fa.business_id and apl.affiliate_id = fa.id
       ) l on true
       where fa.business_id = $1
         and fa.status <> 'DELETED'
         and not exists (
           select 1
           from players p
           where p.business_id = fa.business_id
             and (
               (nullif(fa.document_id, '') is not null and p.document_id = fa.document_id)
               or (nullif(fa.phone, '') is not null and p.phone = fa.phone)
               or (nullif(fa.email, '') is not null and lower(p.email) = lower(fa.email))
             )
         )
         and not exists (
           select 1
           from business_manual_leads ml
           where ml.business_id = fa.business_id
             and (
               (nullif(fa.phone, '') is not null and ml.phone = fa.phone)
               or (nullif(fa.email, '') is not null and lower(ml.email) = lower(fa.email))
             )
         )
     ),
     all_rows as (
       select * from player_rows
       union all
       select * from manual_rows
       union all
       select * from affiliate_rows
     ),
     deduplicated_rows as (
       select candidate.*
       from all_rows candidate
       where not exists (
         select 1
         from all_rows preferred
         where (preferred.source_type, preferred.id) <> (candidate.source_type, candidate.id)
           and not (
             nullif(regexp_replace(lower(coalesce(preferred.document_id, '')), '[^a-z0-9]', '', 'g'), '') is not null
             and nullif(regexp_replace(lower(coalesce(candidate.document_id, '')), '[^a-z0-9]', '', 'g'), '') is not null
             and regexp_replace(lower(preferred.document_id), '[^a-z0-9]', '', 'g')
               <> regexp_replace(lower(candidate.document_id), '[^a-z0-9]', '', 'g')
           )
           and (
             (
               nullif(regexp_replace(lower(coalesce(preferred.document_id, '')), '[^a-z0-9]', '', 'g'), '') is not null
               and regexp_replace(lower(preferred.document_id), '[^a-z0-9]', '', 'g')
                 = regexp_replace(lower(coalesce(candidate.document_id, '')), '[^a-z0-9]', '', 'g')
             )
             or (
               nullif(lower(btrim(coalesce(preferred.email, ''))), '') is not null
               and lower(btrim(preferred.email)) = lower(btrim(coalesce(candidate.email, '')))
             )
             or (
               nullif(regexp_replace(coalesce(preferred.phone, ''), '[^0-9]', '', 'g'), '') is not null
               and regexp_replace(preferred.phone, '[^0-9]', '', 'g')
                 = regexp_replace(coalesce(candidate.phone, ''), '[^0-9]', '', 'g')
             )
           )
           and (
             case preferred.source_type when 'PLAYER' then 1 when 'AFFILIATE' then 2 else 3 end
               < case candidate.source_type when 'PLAYER' then 1 when 'AFFILIATE' then 2 else 3 end
             or (
               preferred.source_type = candidate.source_type
               and (preferred.created_at, preferred.id) < (candidate.created_at, candidate.id)
             )
           )
       )
     ),
     rms_rows as (
       select ar.*,
              rms.rms_phase,
              rms.updated_at as rms_phase_updated_at,
              rms.last_operation as rms_last_operation
       from deduplicated_rows ar
       left join lateral (
         select rls.rms_phase, rls.updated_at, rls.last_operation
         from rms_lead_state rls
         where rls.business_id = $1
           and rls.source_type = ar.source_type
           and rls.source_id = ar.id
         order by rls.updated_at desc
         limit 1
       ) rms on true
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
         regexp_replace(lower(coalesce(array_to_string(associated_channels, ' '), '')), '[^a-z0-9]', '', 'g') as normalized_associated_channels,
         regexp_replace(lower(coalesce(affiliate_code, '')), '[^a-z0-9]', '', 'g') as normalized_affiliate_code,
         regexp_replace(translate(lower(coalesce(city, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]', '', 'g') as normalized_city,
         regexp_replace(translate(lower(coalesce(top_interest, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]', '', 'g') as normalized_top_interest,
         regexp_replace(translate(lower(coalesce(purchased_products, '') || ' ' || coalesce(top_product, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]', '', 'g') as normalized_purchased_products,
         regexp_replace(translate(lower(
           coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(company, '') || ' ' ||
           coalesce(document_id, '') || ' ' || coalesce(campaign_name, '') || ' ' ||
           coalesce(channel, '') || ' ' || coalesce(top_interest, '') || ' ' || coalesce(top_product, '') || ' ' || coalesce(purchased_products, '') || ' ' || coalesce(affiliate_code, '')), 'áéíóúüñ', 'aeiouun'),
           '[^a-z0-9@.]+', '', 'g'
         ) as search_blob
       from rms_rows
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
      active_tickets: Number(row.active_tickets || 0),
      expired_tickets: Number(row.expired_tickets || 0),
      inactive_tickets: Number(row.inactive_tickets || 0),
      redeemed_tickets: Number(row.redeemed_tickets || 0),
      benefits_received: Number(row.benefits_received || 0),
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
  if (source === "AFFILIATE") {
    const result = await client.query(
      `select fa.id, fa.business_id, null::uuid as lead_id, 'AFFILIATE'::text as source_type,
              fa.full_name as name, fa.document_id, fa.email, fa.phone, null::text as organization,
              'Afiliados'::text as channel, null::text as source_detail, fa.notes as interest,
              'WhatsApp'::text as preferred_channel, ''::text as stored_status, null::text as priority,
              fa.notes, fa.card_metadata as metadata, fa.created_at, fa.updated_at,
              ca.campaign_id, ca.campaign_name,
              fa.id as affiliate_id, fa.qr_token as affiliate_code, fa.status as affiliate_status,
              fa.points_total as affiliate_points_total,
              rms.rms_phase, rms.rms_phase_updated_at, rms.rms_last_operation
       from affiliates fa
       left join lateral (
         select c.id as campaign_id, c.name as campaign_name
         from campaign_affiliates caf
         join campaigns c on c.id = caf.campaign_id
         where caf.business_id = fa.business_id
           and caf.affiliate_id = fa.id
           and caf.status = 'ACTIVE'
         order by caf.updated_at desc, caf.created_at desc
         limit 1
       ) ca on true
       left join lateral (
         select rls.rms_phase, rls.updated_at as rms_phase_updated_at, rls.last_operation as rms_last_operation
         from rms_lead_state rls
         where rls.business_id = fa.business_id
           and rls.source_type = 'AFFILIATE'
           and rls.source_id = fa.id
         order by rls.updated_at desc
         limit 1
       ) rms on true
       where fa.id = $1 and fa.business_id = $2 and fa.status <> 'DELETED'`,
      [leadId, businessId]
    );
    if (!result.rowCount) throw notFound("Lead not found.");
    return result.rows[0];
  }
  if (source === "MANUAL") {
    const result = await client.query(
      `select ml.id, ml.business_id, null::uuid as lead_id, 'MANUAL'::text as source_type,
              ml.name, null::text as document_id, ml.email, ml.phone, ml.company as organization,
              coalesce(ca.campaign_channel, ml.preferred_channel, ml.source) as channel, ml.source_detail, ml.interest, ml.preferred_channel,
              ml.status as stored_status, ml.priority, ml.notes,
              ml.metadata
                || jsonb_build_object(
                     'manual_status', ml.status,
                     'manual_priority', ml.priority,
                     'manual_notes', ml.notes,
                     'manual_company', ml.company,
                     'manual_job_title', ml.job_title,
                     'manual_importance_reason', ml.importance_reason,
                     'associated_campaigns', coalesce(ca.campaigns, '[]'::json)
                   ) as metadata,
              ca.campaign_id,
              ca.campaign_name,
              ml.created_at, ml.updated_at,
              rms.rms_phase, rms.rms_phase_updated_at, rms.rms_last_operation
       from business_manual_leads ml
       left join lateral (
         select
           (array_agg(c.id order by cmc.updated_at desc, cmc.created_at desc))[1] as campaign_id,
           (array_agg(c.name order by cmc.updated_at desc, cmc.created_at desc))[1] as campaign_name,
           (array_agg(coalesce(nullif(cmc.channel, ''), nullif(ml.preferred_channel, ''), nullif(ml.source, '')) order by cmc.updated_at desc, cmc.created_at desc))[1] as campaign_channel,
           json_agg(json_build_object('id', c.id, 'name', c.name, 'channel', cmc.channel, 'acquisition_source', cmc.acquisition_source) order by cmc.updated_at desc, cmc.created_at desc)
             filter (where cmc.id is not null) as campaigns
         from campaign_manual_contacts cmc
         join campaigns c on c.id = cmc.campaign_id and c.business_id = cmc.business_id
         where cmc.business_id = ml.business_id
           and cmc.manual_lead_id = ml.id
           and cmc.status = 'ACTIVE'
       ) ca on true
       left join lateral (
         select rls.rms_phase, rls.updated_at as rms_phase_updated_at, rls.last_operation as rms_last_operation
         from rms_lead_state rls
         where rls.business_id = ml.business_id
           and rls.source_type = 'MANUAL'
           and rls.source_id = ml.id
         order by rls.updated_at desc
         limit 1
       ) rms on true
       where ml.id = $1 and ml.business_id = $2`,
      [leadId, businessId]
    );
    if (!result.rowCount) throw notFound("Lead not found.");
    return result.rows[0];
  }

  const result = await client.query(
    `select p.id, p.business_id, p.id as lead_id, 'PLAYER'::text as source_type,
            p.name, p.document_id, p.email, p.phone, null::text as organization,
            coalesce(
              case when latest_capture.id is not null then 'Descarga de activo digital' end,
              case
                when p.metadata->>'source_key' = 'descarga_activo_digital'
                  or (lower(coalesce(p.metadata->>'source', '')) = 'captura_relampago' and nullif(p.metadata->>'asset_title', '') is not null)
                then 'Descarga de activo digital'
              end,
              p.metadata->>'source',
              p.metadata->>'lead_source',
              c.type,
              'QR / Activacion'
            ) as channel,
            coalesce(
              case when latest_capture.id is not null then concat_ws(' · ',
                case when nullif(latest_capture.asset_title, '') is not null then 'Activo: ' || latest_capture.asset_title end,
                case when nullif(latest_capture.campaign_name, '') is not null then 'Campaña: ' || latest_capture.campaign_name end,
                case when nullif(latest_capture.activation_name, '') is not null then 'Landing: ' || latest_capture.activation_name end
              ) end,
              p.metadata->>'attribution_subject',
              p.metadata->>'source_detail'
            ) as source_detail,
            coalesce(latest_capture.campaign_name, c.name) as campaign_name,
            coalesce(latest_capture.campaign_id, p.campaign_id) as campaign_id,
            coalesce(p.metadata, '{}'::jsonb) || case when latest_capture.id is not null then jsonb_build_object(
              'digital_asset_origin', true,
              'source_key', 'descarga_activo_digital',
              'source_label', 'Descarga de activo digital',
              'asset_id', latest_capture.asset_id,
              'asset_title', latest_capture.asset_title,
              'lead_capture_activation_id', latest_capture.activation_id,
              'lead_capture_name', latest_capture.activation_name,
              'campaign_id', latest_capture.campaign_id,
              'campaign_name', latest_capture.campaign_name
            ) else '{}'::jsonb end as metadata,
            p.created_at, p.created_at as updated_at,
            coalesce(p.metadata->>'commercial_status', '') as stored_status,
            rms.rms_phase, rms.rms_phase_updated_at, rms.rms_last_operation
     from players p
     left join campaigns c on c.id = p.campaign_id
     left join lateral (
       select
         s.id,
         s.activation_id,
         s.asset_id,
         s.campaign_id,
         lca.name as activation_name,
         da.title as asset_title,
         lcc.name as campaign_name
       from lead_capture_submissions s
       left join lead_capture_activations lca on lca.id = s.activation_id
       left join digital_assets da on da.id = s.asset_id
       left join campaigns lcc on lcc.id = s.campaign_id
       where s.business_id = p.business_id and s.lead_id = p.id
       order by s.created_at desc
       limit 1
     ) latest_capture on true
     left join lateral (
       select rls.rms_phase, rls.updated_at as rms_phase_updated_at, rls.last_operation as rms_last_operation
       from rms_lead_state rls
       where rls.business_id = p.business_id
         and rls.source_type = 'PLAYER'
         and rls.source_id = p.id
       order by rls.updated_at desc
       limit 1
     ) rms on true
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
  const affiliateId = lead.source_type === "AFFILIATE" ? lead.id : lead.affiliate_id || null;
  const params = identityParams(lead);
  const identityOnlyParams = params.slice(0, 5);
  const purchaseParams = [
    lead.business_id,
    lead.lead_id || null,
    lead.document_id || null,
    lead.phone || null,
    lead.email || null,
    lead.source_type || "PLAYER",
    lead.id,
    affiliateId,
  ];
  const sourceParams = [lead.business_id, lead.lead_id || null, lead.source_type || "PLAYER", lead.id];
  const contactParams = [lead.business_id, lead.document_id || null, lead.phone || null, lead.email || null];
  const affiliateContactParams = [...contactParams, affiliateId];

  const [
    purchases,
    tickets,
    trivia,
    interactiveParticipations,
    activations,
    communications,
    notes,
    interests,
    affiliates,
    rewardPasses,
    events,
    rmsState,
    rmsEvents,
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
         or (bs.metadata->>'crm_source_type' = $6::text and bs.metadata->>'crm_source_id' = $7::text)
         or ($2::uuid is not null and bs.metadata->>'crm_lead_id' = $2::text)
         or ($8::uuid is not null and bs.referred_affiliate_id = $8)
       )
       order by bs.created_at desc
       limit 100`,
      purchaseParams
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
                case when la.id is not null then 'Acción de seguimiento' end,
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
         or ($6::uuid is not null and q.affiliate_id = $6)
       )
       order by q.created_at desc
       limit 120`,
      [...identityOnlyParams, affiliateId]
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
      `select iap.id,
              iap.activation_id,
              iap.company_id as business_id,
              iap.player_id,
              iap.source_type as participant_source_type,
              iap.source_id as participant_source_id,
              iap.name as participant_name,
              iap.document as document_value,
              iap.phone as phone_value,
              iap.email as email_value,
              iap.metadata as participant_metadata,
              iap.score,
              iap.result_profile,
              iap.status,
              iap.started_at,
              iap.completed_at,
              iap.created_at,
              ia.title as name,
              ia.title as trivia_title,
              ia.title as game_name,
              ia.description,
              ia.activation_type,
              ia.category,
              ia.capture_config,
              ia.campaign_id,
              c.name as campaign_name,
              coalesce(answer_data.answers, '[]'::jsonb) as answers,
              case when iap.status in ('completed', 'rewarded') then true else false end as passed,
              case
                when ia.game_config->>'min_score_for_reward' ~ '^[0-9]+$' then (ia.game_config->>'min_score_for_reward')::int
                else 0
              end as total_questions
       from interactive_activation_participants iap
       join interactive_activations ia on ia.id = iap.activation_id and ia.company_id = iap.company_id
       left join campaigns c on c.id = ia.campaign_id
       left join lateral (
         select jsonb_agg(
           jsonb_build_object(
             'key', coalesce(iaa.answer->>'key', iaa.question_id::text),
             'label', coalesce(iaq.question_text, iaa.answer->>'key', 'Respuesta'),
             'value', iaa.answer->'value',
             'question_type', iaq.question_type,
             'score_delta', iaa.score_delta
           )
           order by coalesce(iaq.order_index, 2147483647), iaa.created_at
         ) as answers
         from interactive_activation_answers iaa
         left join interactive_activation_questions iaq on iaq.id = iaa.question_id
         where iaa.participant_id = iap.id
       ) answer_data on true
       where iap.company_id = $1 and (
         ($2::uuid is not null and iap.player_id = $2)
         or ($3::text is not null and nullif($3::text, '') is not null and iap.document = $3::text)
         or ($4::text is not null and nullif($4::text, '') is not null and iap.phone = $4::text)
         or ($5::text is not null and nullif($5::text, '') is not null and lower(iap.email) = lower($5::text))
         or (iap.source_type = $6 and iap.source_id = $7)
       )
       order by iap.created_at desc
       limit 120`,
      params
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
         or ($5::uuid is not null and a.id = $5)
       )
       order by a.created_at desc
       limit 5`,
      affiliateContactParams
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
    query(
      `select rms_phase, priority, recommended_action, last_operation, last_material_sent,
              revenue_potential, metadata, created_at, updated_at
       from rms_lead_state
       where business_id = $1 and source_type = $2 and source_id = $3
       order by updated_at desc
       limit 1`,
      [lead.business_id, lead.source_type || "PLAYER", lead.id]
    ),
    query(
      `select event_type, event_title, event_description, rms_phase, operation_key,
              material_type, metadata, created_at
       from rms_machine_events
       where business_id = $1
         and (($2::uuid is not null and lead_id = $2) or (source_type = $3 and source_id = $4))
       order by created_at desc
       limit 8`,
      sourceParams
    ),
  ]);

  const purchaseRows = purchases.rows;
  const ticketRows = tickets.rows;
  const interactiveRows = interactiveParticipations.rows;
  const gameRows = [
    ...trivia.rows,
    ...interactiveRows.filter((item) => item.category === "minigame" || item.score !== null),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const activationRows = [
    ...activations.rows,
    ...interactiveRows.map((item) => ({
      ...item,
      status: item.status || "completed",
      source_type: "INTERACTIVE",
      source_id: item.id,
      public_url: null,
      token: null,
      link_status: null,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const communicationRows = communications.rows;
  const noteRows = notes.rows;
  const interestRows = interests.rows.length
    ? interests.rows
    : inferInterests(purchaseRows, gameRows, ticketRows, lead);

  const totalSpent = purchaseRows.reduce((sum, item) => sum + moneyNumber(item.sale_amount), 0);
  const purchaseCount = purchaseRows.reduce((sum, item) => sum + salePurchaseContribution(item), 0);
  const scoreTotal = gameRows.reduce((sum, item) => sum + Number(item.score || 0), 0);
  const scoreAverage = gameRows.length ? scoreTotal / gameRows.length : 0;
  const bestScore = gameRows.reduce((max, item) => Math.max(max, Number(item.score || 0)), 0);
  const activeTickets = ticketRows.filter((item) => item.status === "ACTIVE" && !item.redeemed_at && (!item.expires_at || new Date(item.expires_at) > new Date())).length;
  const redeemedTickets = ticketRows.filter((item) => item.status === "REDEEMED" || item.redeemed_at).length;
  const expiredTickets = ticketRows.filter((item) => !item.redeemed_at && (item.status === "EXPIRED" || (item.status === "ACTIVE" && item.expires_at && new Date(item.expires_at) <= new Date()))).length;
  const inactiveTickets = ticketRows.filter((item) => (
    !(item.status === "ACTIVE" && !item.redeemed_at && (!item.expires_at || new Date(item.expires_at) > new Date()))
    && !(item.status === "REDEEMED" || item.redeemed_at)
    && !(item.status === "EXPIRED" || (item.status === "ACTIVE" && item.expires_at && new Date(item.expires_at) <= new Date()))
  )).length;
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
    benefits_expired: expiredTickets,
    benefits_inactive: inactiveTickets,
    score_total: scoreTotal,
    score_average: scoreAverage,
    best_score: bestScore,
    active_tickets: activeTickets,
    expired_tickets: expiredTickets,
    inactive_tickets: inactiveTickets,
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
    is_affiliate: lead.source_type === "AFFILIATE" || affiliates.rows.length > 0,
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
    whatsapp_history: events.rows
      .filter((item) => String(item.event_type || "").startsWith("whatsapp_"))
      .map((item) => ({
        ...item,
        phone: item.metadata?.phone || null,
        message: item.metadata?.message || null,
        delivery_status: item.metadata?.delivery_status || null,
      })),
    notes: noteRows,
    rms: {
      ...(rmsState.rows[0] || {}),
      events: rmsEvents.rows,
    },
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
        source: lead.channel || "Base de contactos",
      }),
    ]
  );
  await client.query(
    `insert into lead_events (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
     values ($1, $2, $3, $4, 'lead_created', 'Lead creado', 'Contacto convertido a lead accionable para activaciones.', null, $5::jsonb)`,
    [businessId, created.rows[0].id, lead.source_type, lead.id, JSON.stringify({ original_source_type: lead.source_type, original_source_id: lead.id })]
  );
  return created.rows[0];
}

async function createLeadNote(businessId, user, leadId, sourceType, payload) {
  const lead = await resolveLead(businessId, leadId, sourceType);
  const result = await query(
    `insert into lead_notes
      (business_id, lead_id, source_type, source_id, note, note_type, next_action, reminder_at, agenda_priority, progress_percent, checklist, metadata, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13)
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
      payload.agenda_priority || "MEDIUM",
      Number.isFinite(Number(payload.progress_percent)) ? Number(payload.progress_percent) : 0,
      JSON.stringify(Array.isArray(payload.checklist) ? payload.checklist : []),
      JSON.stringify(payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}),
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

/**
 * Registra la entrega manual hacia WhatsApp sin suplantar una confirmación de
 * entrega que solo el proveedor de mensajería podría reportar. El navegador
 * abre wa.me y Qori conserva el contexto exacto que el operador preparó.
 */
async function createLeadWhatsAppContact(businessId, user, leadId, sourceType, payload) {
  const lead = await resolveLead(businessId, leadId, sourceType);
  const phone = normalizedDigits(payload.phone);
  if (phone.length < 7) throw badRequest("El teléfono no tiene un formato válido para WhatsApp.");

  const description = `Mensaje preparado para ${payload.phone}. Qori abrió WhatsApp para envío manual; la entrega no se confirma automáticamente.`;
  const result = await query(
    `insert into lead_events
      (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
     values ($1, $2, $3, $4, 'whatsapp_opened_for_manual_send', 'WhatsApp abierto para envío manual', $5, $6, $7::jsonb)
     returning *`,
    [
      businessId,
      lead.lead_id || null,
      lead.source_type,
      lead.id,
      description,
      user.id,
      JSON.stringify({
        channel: "WHATSAPP",
        delivery_status: "OPENED_FOR_MANUAL_SEND",
        phone,
        message: payload.message,
        consent_confirmed: true,
        source: payload.source || "contact_detail",
      }),
    ]
  );
  return result.rows[0];
}

async function getLeadAgendaItem(businessId, noteId) {
  const result = await query(
    `select
        ln.id,
        ln.business_id,
        ln.lead_id,
        ln.source_type,
        ln.source_id,
        ln.note,
        ln.note_type,
        ln.next_action,
        ln.reminder_at,
        ln.agenda_status,
        ln.agenda_priority,
        ln.progress_percent,
        ln.checklist,
        ln.metadata,
        ln.completed_at,
        ln.created_at,
        ln.updated_at,
        u.full_name as author_name,
        coalesce(
          p.name,
          ml.name,
          fa.full_name,
          nullif(ln.metadata->>'agenda_owner', ''),
          case
            when ln.source_type in ('GENERAL', 'CAMPAIGN', 'MARKETING', 'ACTIVATION_STRATEGY', 'BULK_ACTIVATION')
            then coalesce(ac.name, ln.metadata->>'campaign_name', 'Tarea interna')
          end,
          'Contacto sin nombre'
        ) as lead_name,
        coalesce(p.email, ml.email, fa.email) as lead_email,
        coalesce(p.phone, ml.phone, fa.phone) as lead_phone,
        coalesce(p.document_id, fa.document_id) as lead_document_id,
        coalesce(ml.company, fa.card_metadata->>'company', p.metadata->>'company') as lead_company,
        coalesce(ml.job_title, p.metadata->>'manual_job_title') as lead_job_title,
        coalesce(c.name, ac.name, ln.metadata->>'campaign_name', p.metadata->>'campaign_name', ml.source_detail) as campaign_name
       from lead_notes ln
       left join app_users u on u.id = ln.created_by
       left join players p on p.business_id = ln.business_id
        and (p.id = ln.lead_id or (ln.source_type = 'PLAYER' and p.id = ln.source_id))
       left join business_manual_leads ml on ml.business_id = ln.business_id
        and ln.source_type = 'MANUAL'
        and ml.id = ln.source_id
       left join affiliates fa on fa.business_id = ln.business_id
        and ln.source_type = 'AFFILIATE'
        and fa.id = ln.source_id
       left join campaigns c on c.id = p.campaign_id
       left join campaigns ac on ac.business_id = ln.business_id
        and ln.source_type in ('GENERAL', 'CAMPAIGN', 'MARKETING', 'ACTIVATION_STRATEGY', 'BULK_ACTIVATION')
        and ac.id = ln.source_id
      where ln.business_id = $1
        and ln.id = $2
        and ln.reminder_at is not null`,
    [businessId, noteId]
  );
  if (!result.rowCount) {
    throw notFound("Tarea de agenda no encontrada.");
  }
  return result.rows[0];
}

async function validateAgendaCampaign(businessId, campaignId) {
  if (!campaignId) return null;
  const result = await query(
    "select id, name from campaigns where id = $1 and business_id = $2",
    [campaignId, businessId]
  );
  if (!result.rowCount) {
    throw notFound("Campaña no encontrada.");
  }
  return result.rows[0];
}

async function createOperationalAgendaItem(businessId, user, payload = {}) {
  const sourceType = String(payload.source_type || "MARKETING").toUpperCase();
  const metadata = payload.metadata && typeof payload.metadata === "object" ? { ...payload.metadata } : {};
  const campaignId = payload.source_id || metadata.campaign_id || null;
  const campaign = await validateAgendaCampaign(businessId, campaignId);
  if (campaign) {
    metadata.campaign_id = campaign.id;
    metadata.campaign_name = campaign.name;
  }
  metadata.agenda_scope = metadata.agenda_scope || sourceType;
  const result = await query(
    `insert into lead_notes
      (business_id, lead_id, source_type, source_id, note, note_type, next_action, reminder_at, agenda_priority, progress_percent, checklist, metadata, created_by)
     values ($1, null, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12)
     returning *`,
    [
      businessId,
      sourceType,
      campaign?.id || null,
      payload.note,
      payload.note_type || "follow_up",
      payload.next_action || null,
      payload.reminder_at || null,
      payload.agenda_priority || "MEDIUM",
      Number.isFinite(Number(payload.progress_percent)) ? Number(payload.progress_percent) : 0,
      JSON.stringify(Array.isArray(payload.checklist) ? payload.checklist : []),
      JSON.stringify(metadata),
      user.id,
    ]
  );
  await query(
    `insert into lead_events (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
     values ($1, null, $2, $3, 'agenda_created', 'Tarea operativa creada', $4, $5, $6::jsonb)`,
    [
      businessId,
      sourceType,
      campaign?.id || null,
      payload.next_action || payload.note,
      user.id,
      JSON.stringify({ note_id: result.rows[0].id, agenda_scope: metadata.agenda_scope, campaign_id: campaign?.id || null }),
    ]
  );
  return getLeadAgendaItem(businessId, result.rows[0].id);
}

async function createLeadAgendaItem(businessId, user, payload = {}) {
  const sourceType = String(payload.source_type || "PLAYER").toUpperCase();
  if (OPERATIONAL_AGENDA_SOURCE_TYPES.has(sourceType)) {
    return createOperationalAgendaItem(businessId, user, { ...payload, source_type: sourceType });
  }
  if (!payload.lead_id) {
    const error = new Error("Selecciona un contacto para esta tarea.");
    error.status = 400;
    throw error;
  }
  const note = await createLeadNote(
    businessId,
    user,
    payload.lead_id,
    sourceType,
    {
      note: payload.note,
      note_type: payload.note_type || "follow_up",
      next_action: payload.next_action,
      reminder_at: payload.reminder_at,
      agenda_priority: payload.agenda_priority || "MEDIUM",
      progress_percent: payload.progress_percent || 0,
      checklist: Array.isArray(payload.checklist) ? payload.checklist : [],
      metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    }
  );
  return getLeadAgendaItem(businessId, note.id);
}

function agendaDateRange(params = {}) {
  const now = new Date();
  const from = params.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = params.to ? new Date(params.to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    const error = new Error("Rango de agenda invalido.");
    error.status = 400;
    throw error;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function agendaLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 500;
  return Math.min(parsed, 1000);
}

async function listLeadAgenda(businessId, params = {}) {
  const { from, to } = agendaDateRange(params);
  const status = String(params.status || "OPEN").toUpperCase();
  const allowedStatus = ["OPEN", "DONE", "CANCELLED", "ALL"].includes(status) ? status : "OPEN";
  const result = await query(
    `select
        ln.id,
        ln.business_id,
        ln.lead_id,
        ln.source_type,
        ln.source_id,
        ln.note,
        ln.note_type,
        ln.next_action,
        ln.reminder_at,
        ln.agenda_status,
        ln.agenda_priority,
        ln.progress_percent,
        ln.checklist,
        ln.metadata,
        ln.completed_at,
        ln.created_at,
        ln.updated_at,
        u.full_name as author_name,
        coalesce(
          p.name,
          ml.name,
          fa.full_name,
          nullif(ln.metadata->>'agenda_owner', ''),
          case
            when ln.source_type in ('GENERAL', 'CAMPAIGN', 'MARKETING', 'ACTIVATION_STRATEGY', 'BULK_ACTIVATION')
            then coalesce(ac.name, ln.metadata->>'campaign_name', 'Tarea interna')
          end,
          'Contacto sin nombre'
        ) as lead_name,
        coalesce(p.email, ml.email, fa.email) as lead_email,
        coalesce(p.phone, ml.phone, fa.phone) as lead_phone,
        coalesce(p.document_id, fa.document_id) as lead_document_id,
        coalesce(ml.company, fa.card_metadata->>'company', p.metadata->>'company') as lead_company,
        coalesce(ml.job_title, p.metadata->>'manual_job_title') as lead_job_title,
        coalesce(c.name, ac.name, ln.metadata->>'campaign_name', p.metadata->>'campaign_name', ml.source_detail) as campaign_name
       from lead_notes ln
       left join app_users u on u.id = ln.created_by
       left join players p on p.business_id = ln.business_id
        and (p.id = ln.lead_id or (ln.source_type = 'PLAYER' and p.id = ln.source_id))
       left join business_manual_leads ml on ml.business_id = ln.business_id
        and ln.source_type = 'MANUAL'
        and ml.id = ln.source_id
       left join affiliates fa on fa.business_id = ln.business_id
        and ln.source_type = 'AFFILIATE'
        and fa.id = ln.source_id
       left join campaigns c on c.id = p.campaign_id
       left join campaigns ac on ac.business_id = ln.business_id
        and ln.source_type in ('GENERAL', 'CAMPAIGN', 'MARKETING', 'ACTIVATION_STRATEGY', 'BULK_ACTIVATION')
        and ac.id = ln.source_id
      where ln.business_id = $1
        and ln.reminder_at is not null
        and ln.reminder_at >= $2::timestamptz
        and ln.reminder_at <= $3::timestamptz
        and ($4::text = 'ALL' or ln.agenda_status = $4::text)
      order by ln.reminder_at asc, ln.created_at asc
      limit $5`,
    [businessId, from, to, allowedStatus, agendaLimit(params.limit)]
  );
  return {
    agenda: result.rows,
    range: { from, to },
    status: allowedStatus,
  };
}

async function updateLeadAgendaItem(businessId, user, noteId, payload = {}) {
  const hasNote = Object.prototype.hasOwnProperty.call(payload, "note");
  const hasNoteType = Object.prototype.hasOwnProperty.call(payload, "note_type");
  const hasNextAction = Object.prototype.hasOwnProperty.call(payload, "next_action");
  const hasReminder = Object.prototype.hasOwnProperty.call(payload, "reminder_at");
  const hasStatus = Object.prototype.hasOwnProperty.call(payload, "agenda_status");
  const hasPriority = Object.prototype.hasOwnProperty.call(payload, "agenda_priority");
  const hasProgress = Object.prototype.hasOwnProperty.call(payload, "progress_percent");
  const hasChecklist = Object.prototype.hasOwnProperty.call(payload, "checklist");
  const hasMetadata = Object.prototype.hasOwnProperty.call(payload, "metadata");
  const hasLeadId = Object.prototype.hasOwnProperty.call(payload, "lead_id");
  const hasSourceId = Object.prototype.hasOwnProperty.call(payload, "source_id");
  const hasSourceType = Object.prototype.hasOwnProperty.call(payload, "source_type");
  const hasSourcePatch = hasLeadId || hasSourceId || hasSourceType;
  const nextStatus = hasStatus ? String(payload.agenda_status || "").toUpperCase() : null;
  if (hasStatus && !["OPEN", "DONE", "CANCELLED"].includes(nextStatus)) {
    const error = new Error("Estado de agenda invalido.");
    error.status = 400;
    throw error;
  }
  if (!hasNote && !hasNoteType && !hasNextAction && !hasReminder && !hasStatus && !hasPriority && !hasProgress && !hasChecklist && !hasMetadata && !hasSourcePatch) {
    const error = new Error("No hay cambios para actualizar en la agenda.");
    error.status = 400;
    throw error;
  }
  let sourcePatch = null;
  let metadataPatch = hasMetadata && payload.metadata && typeof payload.metadata === "object" ? { ...payload.metadata } : {};
  if (hasSourcePatch) {
    const sourceType = String(payload.source_type || "PLAYER").toUpperCase();
    if (OPERATIONAL_AGENDA_SOURCE_TYPES.has(sourceType)) {
      const campaignId = payload.source_id || metadataPatch.campaign_id || null;
      const campaign = await validateAgendaCampaign(businessId, campaignId);
      if (campaign) {
        metadataPatch.campaign_id = campaign.id;
        metadataPatch.campaign_name = campaign.name;
      } else {
        metadataPatch.campaign_id = "";
        metadataPatch.campaign_name = "";
      }
      metadataPatch.agenda_scope = metadataPatch.agenda_scope || sourceType;
      sourcePatch = {
        lead_id: null,
        source_type: sourceType,
        source_id: campaign?.id || null,
      };
    } else {
      const targetLeadId = payload.lead_id || payload.source_id || null;
      if (!targetLeadId) {
        const error = new Error("Selecciona un contacto para esta tarea.");
        error.status = 400;
        throw error;
      }
      const lead = await resolveLead(businessId, targetLeadId, sourceType);
      metadataPatch.agenda_scope = "CONTACT";
      sourcePatch = {
        lead_id: lead.lead_id || null,
        source_type: lead.source_type,
        source_id: lead.id,
      };
    }
  }
  const hasMetadataPatch = hasMetadata || hasSourcePatch;
  const result = await query(
    `update lead_notes
        set note = case when $3 then $4 else note end,
            note_type = case when $5 then $6 else note_type end,
            next_action = case when $7 then $8 else next_action end,
            reminder_at = case when $9 then $10::timestamptz else reminder_at end,
            agenda_status = case when $11 then $12 else agenda_status end,
            agenda_priority = case when $14 then $15 else agenda_priority end,
            progress_percent = case when $16 then $17 else progress_percent end,
            checklist = case when $18 then $19::jsonb else checklist end,
            metadata = case when $20 then coalesce(metadata, '{}'::jsonb) || $21::jsonb else metadata end,
            lead_id = case when $22 then $23::uuid else lead_id end,
            source_type = case when $22 then $24 else source_type end,
            source_id = case when $22 then $25::uuid else source_id end,
            completed_at = case
              when $11 and $12 = 'DONE' then coalesce(completed_at, now())
              when $11 and $12 <> 'DONE' then null
              else completed_at
            end,
            completed_by = case
              when $11 and $12 = 'DONE' then $13
              when $11 and $12 <> 'DONE' then null
              else completed_by
            end,
            updated_by = $13,
            updated_at = now()
      where id = $1
        and business_id = $2
        and reminder_at is not null
      returning *`,
    [
      noteId,
      businessId,
      hasNote,
      payload.note || null,
      hasNoteType,
      payload.note_type || null,
      hasNextAction,
      payload.next_action || null,
      hasReminder,
      payload.reminder_at || null,
      hasStatus,
      nextStatus,
      user.id,
      hasPriority,
      payload.agenda_priority || null,
      hasProgress,
      Number.isFinite(Number(payload.progress_percent)) ? Number(payload.progress_percent) : null,
      hasChecklist,
      JSON.stringify(Array.isArray(payload.checklist) ? payload.checklist : []),
      hasMetadataPatch,
      JSON.stringify(metadataPatch),
      hasSourcePatch,
      sourcePatch?.lead_id || null,
      sourcePatch?.source_type || null,
      sourcePatch?.source_id || null,
    ]
  );
  if (!result.rowCount) {
    throw notFound("Tarea de agenda no encontrada.");
  }
  const eventTitle = hasStatus
    ? nextStatus === "DONE"
      ? "Agenda completada"
      : nextStatus === "CANCELLED"
        ? "Agenda cancelada"
        : "Agenda reabierta"
    : "Agenda editada";
  await query(
    `insert into lead_events
      (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
     values ($1, $2, $3, $4, 'agenda_status_updated', $5, $6, $7, $8::jsonb)`,
    [
      businessId,
      result.rows[0].lead_id || null,
      result.rows[0].source_type,
      result.rows[0].source_id,
      eventTitle,
      result.rows[0].next_action || result.rows[0].note,
      user.id,
      JSON.stringify({
        note_id: noteId,
        agenda_status: result.rows[0].agenda_status,
        changed_fields: Object.keys(payload),
      }),
    ]
  );
  return getLeadAgendaItem(businessId, noteId);
}

async function deleteLeadAgendaItem(businessId, user, noteId, payload = {}) {
  const result = await withTransaction(async (client) => {
    const existing = await client.query(
    `select *
       from lead_notes
      where id = $1
        and business_id = $2
        and reminder_at is not null`,
    [noteId, businessId]
  );
    if (!existing.rowCount) throw notFound("Tarea de agenda no encontrada.");
    const item = existing.rows[0];
    if (item.agenda_status === "CANCELLED") return { item, duplicate: true };
    await client.query(
    `insert into lead_events
      (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
     values ($1, $2, $3, $4, 'agenda_cancelled', 'Agenda cancelada', $5, $6, $7::jsonb)`,
      [
      businessId,
      item.lead_id || null,
      item.source_type,
      item.source_id,
      item.next_action || item.note,
      user.id,
        JSON.stringify({ note_id: noteId, agenda_status: item.agenda_status, reminder_at: item.reminder_at, cancellation_reason: payload.reason }),
      ]
    );
    const updated = await client.query(
      `update lead_notes
          set agenda_status = 'CANCELLED', completed_at = now(),
              metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('cancellation_reason', $3, 'cancelled_at', now(), 'cancelled_by', $4::text),
              updated_at = now()
        where id = $1 and business_id = $2
        returning *`,
      [noteId, businessId, payload.reason, user.id]
    );
    await recordLifecycleEvent({
      business_id: businessId, entity_type: "AGENDA_TASK", entity_id: item.id,
      action: "CANCELLED", previous_status: item.agenda_status, next_status: "CANCELLED",
      reason: payload.reason, idempotency_key: payload.idempotency_key || `agenda-cancel:${item.id}`,
      actor_user_id: user.id, metadata: { source_type: item.source_type, source_id: item.source_id, reminder_at: item.reminder_at },
    }, client);
    return { item: updated.rows[0], duplicate: false };
  });
  return { cancelled: true, id: noteId, agenda_item: result.item, duplicate: result.duplicate };
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

async function deleteLeadContact(businessId, user, leadId, sourceType = "PLAYER", payload = {}) {
  // Compatibility endpoint: it is deliberately an archive command, never a physical lead delete.
  return withTransaction(async (client) => {
    const lead = await resolveLead(businessId, leadId, sourceType, client);
    const source = String(lead.source_type || sourceType || "PLAYER").toUpperCase();
    if (source === "AFFILIATE") {
      throw badRequest("Los afiliados se desactivan desde Afiliados; no se archivan como contactos.");
    }
    const entityId = source === "MANUAL" ? lead.id : (lead.lead_id || lead.id);
    const currentStatus = source === "MANUAL" ? lead.stored_status : lead.metadata?.lifecycle_status || "ACTIVE";
    if (String(currentStatus).toUpperCase() === "ARCHIVED") {
      return { archived: true, duplicate: true, lead_id: leadId, source_type: source };
    }
    if (source === "MANUAL") {
      await client.query(
        `update business_manual_leads
            set status = 'ARCHIVED',
                metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
                  'lifecycle_status', 'ARCHIVED', 'archived_at', now(),
                  'archived_by_user_id', $3::text, 'archive_reason', $4::text
                ),
                updated_at = now()
          where id = $1 and business_id = $2`,
        [lead.id, businessId, user.id, payload.reason]
      );
    } else {
      await client.query(
        `update players
            set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
              'lifecycle_status', 'ARCHIVED', 'archived_at', now(),
              'archived_by_user_id', $3::text, 'archive_reason', $4::text
            )
          where id = $1 and business_id = $2`,
        [entityId, businessId, user.id, payload.reason]
      );
    }
    await client.query(
      `insert into lead_events
        (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
       values ($1, $2, $3, $4, 'contact_archived', 'Contacto archivado', $5, $6, $7::jsonb)`,
      [
        businessId, source === "PLAYER" ? entityId : lead.lead_id || null, source, lead.id,
        `${lead.name || "Contacto"} fue archivado; su historial comercial permanece disponible.`, user.id,
        JSON.stringify({ reason: payload.reason, previous_status: currentStatus }),
      ]
    );
    await recordLifecycleEvent({
      business_id: businessId, entity_type: "LEAD_CONTACT", entity_id: entityId,
      action: "ARCHIVED", previous_status: currentStatus, next_status: "ARCHIVED", reason: payload.reason,
      idempotency_key: payload.idempotency_key || `lead-archive:${source}:${entityId}:${currentStatus}`,
      actor_user_id: user.id, metadata: { source_type: source, source_id: lead.id, lead_name: lead.name || null },
    }, client);
    return { archived: true, duplicate: false, lead_id: leadId, source_type: source };
  });

  /* Legacy physical-delete implementation kept below only to minimize the diff during
     this compatible change. It is unreachable and will be removed after legacy callers
     have migrated to the explicit privacy-erasure workflow. */
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

    if (source === "AFFILIATE") {
      const convertedPlayers = await client.query(
        `select id
         from players
         where business_id = $1
           and metadata->>'crm_created_from' = 'AFFILIATE'
           and metadata->>'crm_source_id' = $2`,
        [businessId, sourceId]
      );
      for (const row of convertedPlayers.rows) {
        await deletePlayer(row.id);
      }
      const campaignLinks = await client.query(
        "update campaign_affiliates set status = 'REMOVED', updated_at = now() where business_id = $1 and affiliate_id = $2 and status = 'ACTIVE'",
        [businessId, sourceId]
      );
      incrementDeleted("campaign_affiliates", campaignLinks.rowCount);
      const affiliate = await client.query(
        "update affiliates set status = 'DELETED', updated_at = now() where id = $1 and business_id = $2 returning id",
        [sourceId, businessId]
      );
      incrementDeleted("affiliates", affiliate.rowCount);
      if (!affiliate.rowCount) throw notFound("Lead not found.");
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
        `${lead.name || "Contacto"} fue eliminado de la base unificada.`,
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

async function createLeadPurchase(businessId, user, leadId, sourceType, payload) {
  return withTransaction(async (client) => {
    const lead = await resolveLead(businessId, leadId, sourceType, client);
    const acquisitionChannel = await resolveAcquisitionChannelReference(client, businessId, payload);
    if (payload.campaign_id) {
      const campaign = await client.query("select id from campaigns where id = $1 and business_id = $2", [payload.campaign_id, businessId]);
      if (!campaign.rowCount) throw badRequest("La campana seleccionada no pertenece a este negocio.");
    }
    if (payload.branch_id) {
      const branch = await client.query("select id from branches where id = $1 and business_id = $2", [payload.branch_id, businessId]);
      if (!branch.rowCount) throw badRequest("La sucursal seleccionada no pertenece a este negocio.");
    }

    const amount = moneyNumber(payload.sale_amount);
    if (amount <= 0) throw badRequest("El valor de la compra debe ser mayor a cero.");
    const source = lead.source_type || String(sourceType || "PLAYER").toUpperCase();
    const affiliateResult = await client.query(
      `select id, full_name, points_total
       from affiliates
       where business_id = $1
         and status = 'ACTIVE'
         and (
           ($2::uuid is not null and id = $2)
           or ($3::text is not null and nullif(document_id, '') = $3)
           or ($4::text is not null and nullif(phone, '') = $4)
           or ($5::text is not null and lower(nullif(email, '')) = lower($5))
         )
       order by case when $2::uuid is not null and id = $2 then 0 else 1 end, created_at desc
       limit 1
       for update`,
      [
        businessId,
        source === "AFFILIATE" ? lead.id : lead.affiliate_id || null,
        lead.document_id || null,
        lead.phone || null,
        lead.email || null,
      ]
    );
    let relatedAffiliate = affiliateResult.rows[0] || null;
    const affiliatePointRules = relatedAffiliate ? await getAffiliatePointRules(businessId) : null;
    const referralPoints = affiliatePointRules ? referralPointsForAmount(amount, affiliatePointRules) : 0;
    const saleProducts = [{
      name: payload.product_name || "Compra registrada",
      inventory_product_id: payload.metadata?.inventory_product_id || null,
      category: payload.category || payload.metadata?.category || null,
      quantity: 1,
      unit_price: amount,
      line_total: amount,
      currency: payload.currency || "COP",
    }];
    const catalogSync = await syncSaleProductsWithCatalog(client, businessId, user?.id || null, saleProducts, {
      currency: payload.currency || "COP",
      category: payload.category || payload.metadata?.category || null,
      sourceModule: "lead_purchase",
    });
    const metadata = {
      ...(payload.metadata || {}),
      acquisition_channel: {
        id: acquisitionChannel.acquisition_channel_id,
        name_snapshot: acquisitionChannel.acquisition_channel_name_snapshot,
        slug_snapshot: acquisitionChannel.acquisition_channel_slug_snapshot,
        source: acquisitionChannel.acquisition_channel_source,
      },
      category: payload.category || payload.metadata?.category || null,
      products: catalogSync.products,
      auto_created_products: catalogSync.autoCreatedProducts,
      matched_products: catalogSync.matchedProducts,
      product_catalog_sync: true,
      crm_entry: true,
      crm_source_type: source,
      crm_source_id: lead.id,
      crm_lead_id: lead.lead_id || null,
      related_affiliate_id: relatedAffiliate?.id || null,
      registered_from: "lead_detail",
      ...(affiliatePointRules ? affiliatePointRuleMetadata(affiliatePointRules) : {}),
    };

    const sale = await client.query(
      `insert into business_sales
        (business_id, campaign_id, qr_code_id, customer_name, customer_phone, customer_email,
         customer_document_id, product_name, sale_amount, currency, seller_user_id, branch_id,
         acquisition_source, acquisition_channel, acquisition_channel_id, acquisition_channel_name_snapshot,
         acquisition_channel_slug_snapshot, acquisition_channel_source, referred_affiliate_id,
         referral_points_awarded, notes, created_at, metadata)
       values ($1, $2, null, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
               $18, $19, coalesce($20::timestamptz, now()), $21::jsonb)
       returning *`,
      [
        businessId,
        payload.campaign_id || lead.campaign_id || null,
        payload.customer_name || lead.name || null,
        payload.customer_phone || lead.phone || null,
        payload.customer_email || lead.email || null,
        payload.customer_document_id || lead.document_id || null,
        payload.product_name || "Compra registrada",
        amount,
        payload.currency || "COP",
        user?.id || null,
        payload.branch_id || null,
        payload.acquisition_source || (relatedAffiliate ? "FRIEND_REFERRAL" : "CONTACT_LEAD"),
        acquisitionChannel.acquisition_channel || (relatedAffiliate ? "Afiliados" : lead.channel || null),
        acquisitionChannel.acquisition_channel_id,
        acquisitionChannel.acquisition_channel_name_snapshot || (relatedAffiliate ? "Afiliados" : lead.channel || null),
        acquisitionChannel.acquisition_channel_slug_snapshot,
        acquisitionChannel.acquisition_channel_source || (relatedAffiliate ? "SYSTEM_SPECIAL" : null),
        relatedAffiliate?.id || null,
        referralPoints,
        payload.notes || null,
        payload.created_at || null,
        JSON.stringify(metadata),
      ]
    );

    if (relatedAffiliate && referralPoints > 0) {
      await client.query(
        `insert into affiliate_point_ledger
          (business_id, affiliate_id, created_by_user_id, amount, points_awarded, reason, metadata)
         values ($1, $2, $3, $4, $5, 'REFERRAL_PURCHASE', $6::jsonb)`,
        [
          businessId,
          relatedAffiliate.id,
          user?.id || null,
          amount,
          referralPoints,
          JSON.stringify({
            sale_id: sale.rows[0].id,
            crm_source_type: source,
            crm_source_id: lead.id,
            registered_from: "lead_detail",
            referred_customer: payload.customer_name || lead.name || null,
            ...(affiliatePointRules ? affiliatePointRuleMetadata(affiliatePointRules) : {}),
          }),
        ]
      );
      const updatedAffiliate = await client.query(
        `update affiliates
         set points_total = points_total + $3,
             updated_at = now()
         where id = $1 and business_id = $2
         returning id, full_name, points_total`,
        [relatedAffiliate.id, businessId, referralPoints]
      );
      relatedAffiliate = updatedAffiliate.rows[0] || relatedAffiliate;
    }

    if (source === "MANUAL" && ["", "NEW", "INTERESTED", "CONTACTED", "FOLLOW_UP"].includes(String(lead.stored_status || "").toUpperCase())) {
      await client.query(
        "update business_manual_leads set status = 'CONVERTED', updated_at = now() where id = $1 and business_id = $2",
        [lead.id, businessId]
      );
    }

    if (payload.product_name || payload.category) {
      await client.query(
        `insert into lead_interests
          (business_id, lead_id, source_type, source_id, interest_name, source, weight, created_by)
         values ($1, $2, $3, $4, $5, 'purchase', 24, $6)
         on conflict (business_id, (coalesce(lead_id, '00000000-0000-0000-0000-000000000000'::uuid)), source_type, (coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)), (lower(interest_name)))
         do update set weight = greatest(lead_interests.weight, excluded.weight), source = excluded.source, updated_at = now()`,
        [
          businessId,
          lead.lead_id || null,
          source,
          lead.id,
          payload.product_name || payload.category,
          user?.id || null,
        ]
      );
    }

    await client.query(
      `insert into lead_events
        (business_id, lead_id, source_type, source_id, event_type, event_title, event_description,
         campaign_id, metadata, created_by)
       values ($1, $2, $3, $4, 'purchase_registered', 'Compra registrada', $5, $6, $7::jsonb, $8)`,
      [
        businessId,
        lead.lead_id || null,
        source,
        lead.id,
        `${payload.product_name || "Compra"} por ${amount.toLocaleString("es-CO")} ${payload.currency || "COP"}.`,
        payload.campaign_id || lead.campaign_id || null,
        JSON.stringify({
          sale_id: sale.rows[0].id,
          product_name: payload.product_name || null,
          sale_amount: amount,
          related_affiliate_id: relatedAffiliate?.id || null,
          referral_points_awarded: referralPoints,
        }),
        user?.id || null,
      ]
    );

    return sale.rows[0];
  });
}

async function createLeadActivation(businessId, user, leadId, sourceType, payload) {
  return withTransaction(async (client) => {
    const lead = await ensurePlayerForAction(client, businessId, leadId, sourceType);
    const implicitRmsKey = payload.metadata?.source === "rms_activation_1" && payload.interactive_activation_id
      ? `rms-activation-1:${lead.source_type}:${lead.id}:${payload.interactive_activation_id}`
      : "";
    const idempotencyKey = String(payload.idempotency_key || implicitRmsKey || "").trim() || null;
    if (idempotencyKey) {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`lead-activation:${businessId}:${lead.id}:${idempotencyKey}`]);
      const existing = await client.query(
        `select la.*, al.public_url
           from lead_activations la
           left join activation_links al on al.activation_id = la.id and al.business_id = la.business_id
          where la.business_id = $1 and la.source_type = $2 and la.source_id = $3
            and la.metadata->>'idempotency_key' = $4
          order by la.created_at desc limit 1`,
        [businessId, lead.source_type, lead.id, idempotencyKey]
      );
      if (existing.rowCount) return { activation: existing.rows[0], public_url: existing.rows[0].public_url, reused: true };
    }
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

    let interactiveActivation = null;
    if (payload.interactive_activation_id) {
      const activationResult = await client.query(
        `select ia.id, ia.title, ia.description, ia.activation_type, ia.campaign_id, ia.public_slug, c.status as campaign_status
           from interactive_activations ia
           left join campaigns c on c.id = ia.campaign_id and c.business_id = ia.company_id
          where ia.id = $1 and ia.company_id = $2 and ia.status = 'active'
            and (ia.starts_at is null or ia.starts_at <= now())
            and (ia.ends_at is null or ia.ends_at > now())`,
        [payload.interactive_activation_id, businessId]
      );
      if (!activationResult.rowCount) throw badRequest("La activacion seleccionada no esta activa, vigente o no pertenece a este negocio.");
      interactiveActivation = activationResult.rows[0];
      if (["FINISHED", "ARCHIVED", "CANCELLED"].includes(String(interactiveActivation.campaign_status || "").toUpperCase())) {
        throw badRequest("La campana de esta activacion ya no permite nuevos envios.");
      }
      const rmsConsentAlreadyValidated = payload.metadata?.source === "rms_activation_1";
      if (["whatsapp", "email", "sms"].includes(String(payload.channel || "manual").toLowerCase()) && !payload.contact_consent_confirmed && !rmsConsentAlreadyValidated) {
        throw badRequest("Confirma el consentimiento comercial del lead antes de enviar esta activacion.");
      }
    }

    const needsTicket = LEAD_ACTIVATION_TYPES_WITH_TICKET.has(payload.activation_type) && !interactiveActivation;
    let qr = null;
    let token = createSecureToken();
    let publicUrl = interactiveActivation
      ? `${String(env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "")}/activacion/${encodeURIComponent(interactiveActivation.public_slug)}`
      : buildActivationUrl(payload.activation_type, token);
    const activationName = interactiveActivation?.title || payload.name;
    const activationDescription = interactiveActivation?.description || payload.description || null;
    const campaignId = interactiveActivation?.campaign_id || payload.campaign_id || null;
    const activationMetadata = {
      ...(payload.metadata || {}),
      source_module: payload.source_module || "contacts",
      idempotency_key: idempotencyKey,
      delivery_status: "ASSOCIATED",
      ...(interactiveActivation ? {
        interactive_activation_id: interactiveActivation.id,
        interactive_activation_title: interactiveActivation.title,
        interactive_activation_type: interactiveActivation.activation_type,
        interactive_activation_public_slug: interactiveActivation.public_slug,
      } : {}),
    };

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
        campaignId,
        payload.activation_type,
        activationName,
        activationDescription,
        payload.benefit_type || "CUSTOM",
        JSON.stringify(payload.benefit_value || {}),
        payload.channel || "manual",
        payload.expires_at || null,
        payload.score_min || null,
        JSON.stringify(activationMetadata),
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
          campaignId,
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
      publicUrl = buildClaimUrl(token);
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
        campaignId,
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
        campaignId,
        activation.rows[0].id,
        qr?.id || null,
        payload.activation_type,
        payload.channel || "manual",
        payload.subject || activationName,
        payload.message || "",
        "pending",
        JSON.stringify({ public_url: publicUrl, delivery_status: "ASSOCIATED", consent_confirmed: Boolean(payload.contact_consent_confirmed), source_module: payload.source_module || "contacts" }),
        user.id,
      ]
    );

    await client.query(
      `insert into lead_events
        (business_id, lead_id, source_type, source_id, event_type, event_title, event_description,
         campaign_id, qr_code_id, communication_id, metadata, created_by)
       values ($1, $2, $3, $4, 'activation_associated', $5, $6, $7, $8, $9, $10::jsonb, $11)`,
      [
        businessId,
        lead.lead_id,
        lead.source_type,
        lead.id,
        activationName,
        payload.description || `Activación ${payload.activation_type} creada desde seguimiento.`,
        campaignId,
        qr?.id || null,
        communication.rows[0].id,
        JSON.stringify({ activation_id: activation.rows[0].id, public_url: publicUrl, channel: payload.channel || "manual", delivery_status: "ASSOCIATED", source_module: payload.source_module || "contacts" }),
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

async function markLeadActivationOpened(businessId, user, leadId, sourceType, activationId) {
  return withTransaction(async (client) => {
    const lead = await ensurePlayerForAction(client, businessId, leadId, sourceType);
    const result = await client.query(
      `update lead_activations
          set status = case when status = 'CREATED' then 'OPENED' else status end,
              metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('delivery_status', 'WHATSAPP_OPENED_MANUALLY', 'opened_at', now()::text),
              updated_at = now()
        where id = $1 and business_id = $2 and source_type = $3 and source_id = $4
        returning *`,
      [activationId, businessId, lead.source_type, lead.id]
    );
    if (!result.rowCount) throw notFound("La asociacion de activacion no pertenece a este lead.");
    await client.query(
      `update lead_communications
          set status = 'opened', opened_at = now(), metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('delivery_status', 'WHATSAPP_OPENED_MANUALLY')
        where business_id = $1 and activation_id = $2 and status = 'pending'`,
      [businessId, activationId]
    );
    await client.query(
      `insert into lead_events (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, metadata, created_by)
       values ($1, $2, $3, $4, 'activation_whatsapp_opened', 'WhatsApp abierto para envio manual', 'La activacion quedo asociada; la entrega no se confirma automaticamente.', $5::jsonb, $6)`,
      [businessId, lead.lead_id || null, lead.source_type, lead.id, JSON.stringify({ activation_id: activationId }), user.id]
    );
    return { activation: result.rows[0], delivery_status: "WHATSAPP_OPENED_MANUALLY" };
  });
}

module.exports = {
  addLeadInterest,
  createLeadActivation,
  markLeadActivationOpened,
  createLeadAgendaItem,
  createLeadNote,
  createLeadWhatsAppContact,
  deleteLeadAgendaItem,
  deleteLeadContact,
  deleteLeadInterest,
  getLeadCrmDetail,
  listLeadAgenda,
  listLeadCrmRows,
  updateLeadAgendaItem,
};

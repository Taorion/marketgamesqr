const { query, withTransaction } = require("../config/db");
const { badRequest, notFound } = require("../utils/http");
const { createLeadAgendaItem } = require("./leadCrmService");
const { rankingTransitionAllowed, rewardPositions } = require("./gamificationRankingCore");

const MISSION_TEMPLATES = [
  {
    key: "weekly_trivia",
    name: "Trivia semanal con ranking",
    type: "TRIVIA_WEEKLY",
    description: "Pregunta semanal, puntos por participar y bonus por respuesta correcta. Top 5 gana recompensa.",
    channel: "WhatsApp / QR / landing",
    points_rules: [
      { action_type: "TRIVIA_ANSWER", label: "Responder trivia", points: 10 },
      { action_type: "TRIVIA_CORRECT", label: "Responder correctamente", points: 50 },
      { action_type: "WEEKLY_PARTICIPATION", label: "Participar cada semana", points: 20 },
    ],
    streaks: [{ name: "Experto de marca", action_type: "TRIVIA_CORRECT", frequency: "weekly", target_count: 4, reward: "Reward Pass Premium" }],
    ranking: { ranking_type: "POINTS", top_limit: 5, privacy_mode: "ALIAS" },
    rewards: [
      { position: 1, reward_name: "Reward Pass Premium", reward_type: "REWARD_PASS" },
      { position: "2-3", reward_name: "Ticket especial", reward_type: "TICKET" },
      { position: "4-5", reward_name: "Puntos dobles siguiente campaña", reward_type: "POINTS" },
    ],
  },
  {
    key: "top_clients_week",
    name: "Top clientes de la semana",
    type: "CUSTOMER_RANKING",
    description: "Ranking por valor comprado en el periodo para reconocer y premiar a los clientes más valiosos.",
    channel: "tienda / WhatsApp / mixto",
    points_rules: [
      { action_type: "PURCHASE", label: "Comprar", points: 100 },
      { action_type: "TICKET_REDEEMED", label: "Redimir ticket", points: 80 },
      { action_type: "SURVEY_ANSWER", label: "Responder encuesta", points: 30 },
    ],
    ranking: { ranking_type: "PURCHASES", top_limit: 10, privacy_mode: "ALIAS" },
    rewards: [{ position: "top_3", reward_name: "Beneficio especial", reward_type: "CUSTOM" }],
  },
  {
    key: "rebuy_streak",
    name: "Ranking de recompra",
    type: "REBUY_STREAK",
    description: "Reconoce a quienes vuelven a comprar y convierte la recurrencia en una competencia visible.",
    channel: "postventa / WhatsApp",
    points_rules: [
      { action_type: "PURCHASE", label: "Comprar", points: 100 },
      { action_type: "REBUY", label: "Recomprar", points: 150 },
    ],
    ranking: { ranking_type: "POINTS", top_limit: 10, privacy_mode: "ALIAS" },
    rewards: [{ position: "top_3", reward_name: "Reward Pass especial", reward_type: "REWARD_PASS" }],
  },
  {
    key: "referral_champions",
    name: "Campeones de referidos",
    type: "REFERRAL_RANKING",
    description: "Premia a los contactos que generan nuevas ventas mediante recomendaciones verificadas.",
    channel: "QR de referido / WhatsApp",
    points_rules: [{ action_type: "REFERRAL", label: "Venta por referido", points: 150 }],
    ranking: { ranking_type: "REFERRALS", top_limit: 10, privacy_mode: "ALIAS" },
    rewards: [{ position: "top_3", reward_name: "Beneficio por recomendación", reward_type: "CUSTOM" }],
  },
  {
    key: "participation_challenge",
    name: "Participación destacada",
    type: "PARTICIPATION_RANKING",
    description: "Ordena automáticamente la participación en activaciones y reconoce a los contactos más constantes.",
    channel: "QR / landing / evento",
    points_rules: [{ action_type: "PARTICIPATION", label: "Completar una activación", points: 50 }],
    ranking: { ranking_type: "PARTICIPATION", top_limit: 10, privacy_mode: "ALIAS" },
    rewards: [{ position: "top_3", reward_name: "Reconocimiento especial", reward_type: "CUSTOM" }],
  },
];

function jsonParam(value, fallback) {
  return JSON.stringify(value === undefined || value === null ? fallback : value);
}

function normalizeStatus(value, fallback = "DRAFT") {
  const status = String(value || fallback).toUpperCase();
  return ["DRAFT", "ACTIVE", "PAUSED", "FINISHED", "CLOSED"].includes(status) ? status : fallback;
}

function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

async function assertSeasonCampaign(businessId, campaignId, db = { query }) {
  if (!campaignId) return null;
  const result = await db.query(
    "select id from campaigns where id = $1 and business_id = $2",
    [campaignId, businessId]
  );
  if (!result.rowCount) throw badRequest("La campaña seleccionada no pertenece a este negocio.");
  return result.rows[0];
}

function assertSeasonDates(startDate, endDate) {
  if (!startDate || !endDate) return;
  if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
    throw badRequest("La fecha final del ranking debe ser posterior o igual a la fecha de inicio.");
  }
}

async function listSeasons(businessId, filters = {}) {
  const params = [businessId];
  const clauses = ["s.business_id = $1"];
  if (filters.status) {
    params.push(String(filters.status).toUpperCase());
    clauses.push(`s.status = $${params.length}`);
  }
  const result = await query(
    `select
       s.*,
       c.name as campaign_name,
       coalesce(m.missions_count, 0)::int as missions_count,
       coalesce(p.participants_count, 0)::int as participants_count,
       coalesce(p.points_total, 0)::int as points_total,
       coalesce(bs.purchase_customers_count, 0)::int as purchase_customers_count,
       coalesce(bs.purchases_count, 0)::int as purchases_count,
       coalesce(bs.purchase_amount, 0)::numeric as purchase_amount,
       coalesce(r.pending_rewards, 0)::int as pending_rewards
     from gamification_seasons s
     left join campaigns c on c.id = s.campaign_id
     left join lateral (
       select count(*)::int as missions_count
       from gamification_missions gm
       where gm.business_id = s.business_id and gm.season_id = s.id
     ) m on true
     left join lateral (
       select count(distinct coalesce(gpl.lead_id::text, gpl.contact_id::text, gpl.affiliate_id::text, gpl.source_id::text))::int as participants_count,
              coalesce(sum(gpl.points), 0)::int as points_total
       from gamification_points_ledger gpl
       where gpl.business_id = s.business_id and gpl.season_id = s.id
     ) p on true
     left join lateral (
       select
         count(distinct coalesce(
           nullif(trim(sale.customer_document_id), ''),
           nullif(lower(trim(sale.customer_email)), ''),
           nullif(regexp_replace(coalesce(sale.customer_phone, ''), '[^0-9]', '', 'g'), ''),
           sale.id::text
         ))::int as purchase_customers_count,
         count(*)::int as purchases_count,
         coalesce(sum(sale.sale_amount), 0)::numeric as purchase_amount
       from business_sales sale
       where sale.business_id = s.business_id
         and (s.campaign_id is null or sale.campaign_id = s.campaign_id)
         and (s.start_date is null or (sale.created_at at time zone 'America/Bogota')::date >= s.start_date)
         and (s.end_date is null or (sale.created_at at time zone 'America/Bogota')::date <= s.end_date)
     ) bs on true
     left join lateral (
       select count(*)::int as pending_rewards
       from gamification_rewards gr
       where gr.business_id = s.business_id and gr.season_id = s.id and gr.status = 'PENDING'
     ) r on true
     where ${clauses.join(" and ")}
     order by case s.status when 'ACTIVE' then 0 when 'DRAFT' then 1 when 'PAUSED' then 2 else 3 end,
              coalesce(s.start_date, s.created_at::date) desc`,
    params
  );
  return { seasons: result.rows };
}

async function getSeason(businessId, seasonId) {
  const season = await query(
    `select s.*, c.name as campaign_name
     from gamification_seasons s
     left join campaigns c on c.id = s.campaign_id
     where s.id = $1 and s.business_id = $2`,
    [seasonId, businessId]
  );
  if (!season.rowCount) throw notFound("Ranking no encontrado.");
  const missions = await query(
    "select * from gamification_missions where season_id = $1 and business_id = $2 order by created_at",
    [seasonId, businessId]
  );
  const leaderboard = await leaderboardForSeason(businessId, seasonId);
  const rewards = await pendingRewards(businessId, { season_id: seasonId });
  return {
    season: season.rows[0],
    missions: missions.rows,
    leaderboard: leaderboard.leaderboard,
    rewards: rewards.rewards,
  };
}

async function createSeason(businessId, user, payload = {}) {
  const template = MISSION_TEMPLATES.find((item) => item.key === payload.template_key) || null;
  const name = String(payload.name || template?.name || "").trim();
  if (!name) throw badRequest("Escribe el nombre del ranking.");
  await assertSeasonCampaign(businessId, payload.campaign_id || null);
  assertSeasonDates(payload.start_date, payload.end_date);
  const settings = {
    template_key: template?.key || payload.template_key || "custom",
    points_rules: payload.points_rules || template?.points_rules || [],
    streaks: payload.streaks || template?.streaks || [],
    ranking: payload.ranking || template?.ranking || { ranking_type: "POINTS", top_limit: 10, privacy_mode: "ALIAS" },
    rewards: payload.rewards || template?.rewards || [],
    agenda_tasks: payload.agenda_tasks || [],
    banner_url: payload.banner_url || "",
  };
  return withTransaction(async (client) => {
  const result = await client.query(
    `insert into gamification_seasons
      (business_id, campaign_id, name, description, type, status, start_date, end_date, channel,
       target_segment_json, settings_json, created_by)
     values ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10::jsonb, $11::jsonb, $12)
     returning *`,
    [
      businessId,
      payload.campaign_id || null,
      name,
      payload.description || template?.description || null,
      payload.type || template?.type || "TEMPORADA_MG",
      normalizeStatus(payload.status, "DRAFT"),
      payload.start_date || null,
      payload.end_date || null,
      payload.channel || template?.channel || "mixto",
      jsonParam(payload.target_segment || {}, {}),
      jsonParam(settings, {}),
      user?.id || null,
    ]
  );
  const season = result.rows[0];
  const mission = await createMission(businessId, {
    season_id: season.id,
    name: name,
    description: season.description,
    mission_type: season.type,
    frequency: payload.frequency || (template?.type === "TRIVIA_WEEKLY" ? "weekly" : null),
    starts_at: dateOrNull(payload.start_date),
    ends_at: dateOrNull(payload.end_date),
    status: season.status,
    rules: settings.points_rules,
    reward_config: { rewards: settings.rewards, streaks: settings.streaks, ranking: settings.ranking },
  }, client);
  const board = await createLeaderboard(
    businessId,
    season.id,
    { ...settings.ranking, status: season.status, starts_at: season.start_date, ends_at: season.end_date },
    settings.rewards,
    client
  );
  return { season, mission, leaderboard: board };
  });
}

async function updateSeason(businessId, seasonId, payload = {}) {
  return withTransaction(async (client) => {
    const locked = await client.query(
      "select * from gamification_seasons where id = $1 and business_id = $2 for update",
      [seasonId, businessId]
    );
    if (!locked.rowCount) throw notFound("Ranking no encontrado.");
    const current = locked.rows[0];
    if (Object.prototype.hasOwnProperty.call(payload, "campaign_id")) {
      await assertSeasonCampaign(businessId, payload.campaign_id || null, client);
    }
    const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);
    const startDate = has("start_date") ? payload.start_date : current.start_date;
    const endDate = has("end_date") ? payload.end_date : current.end_date;
    assertSeasonDates(startDate, endDate);
    const settings = {
      ...(current.settings_json || {}),
      ...(payload.settings || {}),
      ...(has("points_rules") ? { points_rules: payload.points_rules || [] } : {}),
      ...(has("streaks") ? { streaks: payload.streaks || [] } : {}),
      ...(has("ranking") ? { ranking: payload.ranking || {} } : {}),
      ...(has("rewards") ? { rewards: payload.rewards || [] } : {}),
      ...(has("agenda_tasks") ? { agenda_tasks: payload.agenda_tasks || [] } : {}),
    };
    const result = await client.query(
      `update gamification_seasons
       set campaign_id = case when $3 then $4::uuid else campaign_id end,
           name = case when $5 then $6 else name end,
           description = case when $7 then $8 else description end,
           type = case when $9 then $10 else type end,
           start_date = case when $11 then $12::date else start_date end,
           end_date = case when $13 then $14::date else end_date end,
           channel = case when $15 then $16 else channel end,
           target_segment_json = case when $17 then $18::jsonb else target_segment_json end,
           settings_json = $19::jsonb,
           updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [seasonId, businessId,
       has("campaign_id"), payload.campaign_id || null,
       has("name"), payload.name || null,
       has("description"), payload.description || null,
       has("type"), payload.type || null,
       has("start_date"), payload.start_date || null,
       has("end_date"), payload.end_date || null,
       has("channel"), payload.channel || null,
       has("target_segment"), jsonParam(payload.target_segment || {}, {}),
       jsonParam(settings, {})]
    );
    const season = result.rows[0];
    await client.query(
      `update gamification_missions
       set name = $3, description = $4, mission_type = $5,
           starts_at = $6::date, ends_at = $7::date,
           rules_json = $8::jsonb,
           reward_config_json = $9::jsonb,
           updated_at = now()
       where business_id = $1 and season_id = $2`,
      [businessId, seasonId, season.name, season.description, season.type,
       season.start_date, season.end_date, jsonParam(settings.points_rules || [], []),
       jsonParam({ rewards: settings.rewards || [], streaks: settings.streaks || [], ranking: settings.ranking || {} }, {})]
    );
    await client.query(
      `update gamification_leaderboards
       set ranking_type = $3, top_limit = $4, privacy_mode = $5,
           reward_rules_json = $6::jsonb, starts_at = $7::date, ends_at = $8::date,
           updated_at = now()
       where business_id = $1 and season_id = $2`,
      [businessId, seasonId, settings.ranking?.ranking_type || "POINTS",
       Math.min(Math.max(Number(settings.ranking?.top_limit || 10), 1), 50),
       settings.ranking?.privacy_mode || "ALIAS", jsonParam(settings.rewards || [], []),
       season.start_date, season.end_date]
    );
    return { season };
  });
}

async function setSeasonStatus(businessId, seasonId, status) {
  const target = normalizeStatus(status, "ACTIVE");
  const result = await withTransaction(async (client) => {
    const locked = await client.query(
      "select * from gamification_seasons where id = $1 and business_id = $2 for update",
      [seasonId, businessId]
    );
    if (!locked.rowCount) throw notFound("Ranking no encontrado.");
    const current = locked.rows[0];
    if (!rankingTransitionAllowed(current.status, target)) {
      throw badRequest(`No puedes cambiar un ranking ${String(current.status).toLowerCase()} a ${target.toLowerCase()}.`);
    }
    const seasonResult = await client.query(
      `update gamification_seasons set status = $3, updated_at = now()
       where id = $1 and business_id = $2 returning *`,
      [seasonId, businessId, target]
    );
    await client.query(
      `update gamification_missions set status = $3, updated_at = now()
       where season_id = $1 and business_id = $2`,
      [seasonId, businessId, target]
    );
    await client.query(
      `update gamification_leaderboards set status = $3, updated_at = now()
       where season_id = $1 and business_id = $2`,
      [seasonId, businessId, target === "CLOSED" ? "CLOSED" : target === "ACTIVE" ? "ACTIVE" : "PAUSED"]
    );
    return { season: seasonResult.rows[0] };
  });
  if (["CLOSED", "FINISHED"].includes(target)) {
    result.rewards = await generateSeasonRewards(businessId, seasonId);
  }
  return result;
}

async function deleteSeason(businessId, seasonId) {
  return withTransaction(async (client) => {
    const locked = await client.query(
      "select id, name, status from gamification_seasons where id = $1 and business_id = $2 for update",
      [seasonId, businessId]
    );
    if (!locked.rowCount) throw notFound("Ranking no encontrado.");
    const season = locked.rows[0];
    if (!["DRAFT", "CLOSED"].includes(season.status)) {
      throw badRequest("Pausa o cierra el ranking antes de eliminarlo.");
    }
    await client.query("delete from gamification_seasons where id = $1 and business_id = $2", [seasonId, businessId]);
    return { deleted: true, season };
  });
}

async function createMission(businessId, payload = {}, db = { query }) {
  const result = await db.query(
    `insert into gamification_missions
      (business_id, season_id, name, description, mission_type, frequency, starts_at, ends_at, status, rules_json, reward_config_json)
     values ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9, $10::jsonb, $11::jsonb)
     returning *`,
    [
      businessId,
      payload.season_id,
      payload.name,
      payload.description || null,
      payload.mission_type || "CUSTOM",
      payload.frequency || null,
      payload.starts_at || null,
      payload.ends_at || null,
      normalizeStatus(payload.status, "DRAFT"),
      jsonParam(payload.rules || {}, {}),
      jsonParam(payload.reward_config || {}, {}),
    ]
  );
  return result.rows[0];
}

async function createLeaderboard(businessId, seasonId, ranking = {}, rewards = [], db = { query }) {
  const result = await db.query(
    `insert into gamification_leaderboards
      (business_id, season_id, name, ranking_type, top_limit, privacy_mode, reward_rules_json, starts_at, ends_at, status)
     values ($1, $2, 'Ranking principal', $3, $4, $5, $6::jsonb, $7::date, $8::date, $9)
     returning *`,
    [
      businessId,
      seasonId,
      ranking.ranking_type || "POINTS",
      Number(ranking.top_limit || 10),
      ranking.privacy_mode || "ALIAS",
      jsonParam(rewards || [], []),
      ranking.starts_at || null,
      ranking.ends_at || null,
      normalizeStatus(ranking.status, "DRAFT"),
    ]
  );
  return result.rows[0];
}

async function awardPoints(businessId, payload = {}) {
  if (!payload.action_type) throw badRequest("Selecciona la accion que suma puntos.");
  const result = await query(
    `insert into gamification_points_ledger
      (business_id, season_id, mission_id, lead_id, contact_id, action_type, points, source_id, source_type, metadata_json)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     returning *`,
    [
      businessId,
      payload.season_id || null,
      payload.mission_id || null,
      payload.lead_id || null,
      payload.contact_id || null,
      payload.action_type,
      Number(payload.points || 0),
      payload.source_id || null,
      payload.source_type || "manual",
      jsonParam(payload.metadata || {}, {}),
    ]
  );
  return { entry: result.rows[0] };
}

async function dashboard(businessId) {
  await finalizeExpiredRankings(businessId);
  const [seasons, metrics, rewards] = await Promise.all([
    listSeasons(businessId, {}),
    query(
    `select
       (select count(*) from gamification_seasons where business_id = $1 and status = 'ACTIVE')::int as active_seasons,
       (select count(distinct coalesce(lead_id::text, contact_id::text, affiliate_id::text, source_id::text)) from gamification_points_ledger where business_id = $1)::int as participants,
       (select coalesce(sum(points), 0)::int from gamification_points_ledger where business_id = $1)::int as points_total,
       (select count(*) from gamification_rewards where business_id = $1 and status = 'PENDING')::int as pending_rewards,
       (select count(*) from gamification_streaks where business_id = $1 and status = 'ACTIVE')::int as active_streaks,
       (select count(*) from qr_codes where business_id = $1 and status = 'REDEEMED')::int as redeemed_tickets,
       (select coalesce(sum(sale_amount), 0)::numeric from business_sales where business_id = $1 and coalesce(sale_status, 'PAID') = 'PAID')::numeric as sales_amount`,
    [businessId]
    ),
    pendingRewards(businessId, {}),
  ]);
  return {
    metrics: metrics.rows[0] || {},
    seasons: seasons.seasons,
    rewards: rewards.rewards,
    templates: MISSION_TEMPLATES,
  };
}

async function leaderboardForSeason(businessId, seasonId) {
  const configResult = await query(
    `select
       s.start_date,
       s.end_date,
       s.campaign_id,
       s.status,
       coalesce(gl.ranking_type, s.settings_json #>> '{ranking,ranking_type}', 'POINTS') as ranking_type,
       least(greatest(coalesce(gl.top_limit, 10), 1), 50)::int as top_limit
     from gamification_seasons s
     left join gamification_leaderboards gl
       on gl.business_id = s.business_id and gl.season_id = s.id
     where s.business_id = $1 and s.id = $2
     order by gl.created_at desc nulls last
     limit 1`,
    [businessId, seasonId]
  );
  if (!configResult.rowCount) throw notFound("Ranking no encontrado.");
  const config = configResult.rows[0];
  if (String(config.ranking_type || "").toUpperCase() === "PURCHASES") {
    const purchases = await query(
      `with normalized_sales as (
         select
           coalesce(
             nullif(trim(bs.customer_document_id), ''),
             nullif(lower(trim(bs.customer_email)), ''),
             nullif(regexp_replace(coalesce(bs.customer_phone, ''), '[^0-9]', '', 'g'), ''),
             bs.id::text
           ) as customer_key,
           nullif(trim(bs.customer_name), '') as customer_name,
           nullif(trim(bs.customer_phone), '') as customer_phone,
           nullif(trim(bs.customer_email), '') as customer_email,
           nullif(trim(bs.customer_document_id), '') as customer_document_id,
           regexp_replace(coalesce(bs.customer_phone, ''), '[^0-9]', '', 'g') as customer_phone_digits,
           bs.sale_amount,
           coalesce(bs.paid_at, bs.created_at) as created_at
         from business_sales bs
         where bs.business_id = $1
           and coalesce(bs.sale_status, 'PAID') = 'PAID'
           and ($3::date is null or (coalesce(bs.paid_at, bs.created_at) at time zone 'America/Bogota')::date >= $3::date)
           and ($4::date is null or (coalesce(bs.paid_at, bs.created_at) at time zone 'America/Bogota')::date <= $4::date)
           and ($5::uuid is null or bs.campaign_id = $5::uuid)
       ), grouped as (
       select
         customer_key,
         coalesce(max(customer_name), 'Cliente sin nombre') as name,
         coalesce(max(customer_phone), '') as phone,
         coalesce(max(customer_email), '') as email,
         coalesce(max(customer_document_id), '') as document_id,
         max(customer_phone_digits) as phone_digits,
         count(*)::int as purchases_count,
         coalesce(sum(sale_amount), 0)::numeric as total_spent,
         coalesce(avg(sale_amount), 0)::numeric as average_ticket,
         max(created_at) as last_activity_at
       from normalized_sales
       group by customer_key
       )
       select
         row_number() over (order by g.total_spent desc, g.purchases_count desc, g.last_activity_at desc)::int as rank,
         g.name, g.phone, g.email, g.document_id, g.purchases_count, g.total_spent, g.average_ticket, g.last_activity_at,
         coalesce(p.id, ml.id) as source_id,
         p.id as lead_id,
         ml.id as contact_id,
         case when p.id is not null then 'PLAYER' when ml.id is not null then 'MANUAL' else null end as source_type,
         'PURCHASES'::text as ranking_type
       from grouped g
       left join lateral (
         select p.id from players p
         where p.business_id = $1 and (
           (g.document_id <> '' and p.document_id = g.document_id)
           or (g.email <> '' and lower(p.email) = lower(g.email))
           or (g.phone_digits <> '' and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = g.phone_digits)
         )
         order by p.created_at desc limit 1
       ) p on true
       left join lateral (
         select ml.id from business_manual_leads ml
         where ml.business_id = $1 and p.id is null and (
           (g.email <> '' and lower(ml.email) = lower(g.email))
           or (g.phone_digits <> '' and regexp_replace(coalesce(ml.phone, ''), '[^0-9]', '', 'g') = g.phone_digits)
         )
         order by ml.created_at desc limit 1
       ) ml on true
       order by total_spent desc, purchases_count desc, last_activity_at desc
       limit $2`,
      [businessId, config.top_limit, config.start_date, config.end_date, config.campaign_id]
    );
    return {
      leaderboard: purchases.rows,
      ranking_type: "PURCHASES",
      start_date: config.start_date,
      end_date: config.end_date,
    };
  }
  const result = await query(
    `select
       coalesce(p.name, ml.name, a.full_name, 'Cliente sin nombre') as name,
       coalesce(p.phone, ml.phone, a.phone, '') as phone,
       coalesce(p.email, ml.email, a.email, '') as email,
       gpl.lead_id,
       gpl.contact_id,
       gpl.affiliate_id,
       coalesce(gpl.lead_id, gpl.contact_id, gpl.affiliate_id) as source_id,
       case when gpl.lead_id is not null then 'PLAYER' when gpl.contact_id is not null then 'MANUAL' when gpl.affiliate_id is not null then 'AFFILIATE' else null end as source_type,
       sum(gpl.points)::int as points,
       count(*)::int as actions_count,
       max(gpl.created_at) as last_activity_at,
       'POINTS'::text as ranking_type
     from gamification_points_ledger gpl
     left join players p on p.id = gpl.lead_id and p.business_id = gpl.business_id
     left join business_manual_leads ml on ml.id = gpl.contact_id and ml.business_id = gpl.business_id
     left join affiliates a on a.id = gpl.affiliate_id and a.business_id = gpl.business_id
     where gpl.business_id = $1 and gpl.season_id = $2
     group by p.name, ml.name, a.full_name, p.phone, ml.phone, a.phone, p.email, ml.email, a.email,
              gpl.lead_id, gpl.contact_id, gpl.affiliate_id
     order by points desc, last_activity_at desc
     limit $3`,
    [businessId, seasonId, config.top_limit]
  );
  return {
    leaderboard: result.rows,
    ranking_type: config.ranking_type || "POINTS",
    start_date: config.start_date,
    end_date: config.end_date,
  };
}

function normalizePurchaseLeaderboardPeriod(period = "week") {
  const value = String(period || "").trim().toLowerCase();
  return ["day", "week", "month", "year"].includes(value) ? value : "week";
}

async function purchaseLeaderboardByPeriod(businessId, filters = {}) {
  const period = normalizePurchaseLeaderboardPeriod(filters.period);
  const limit = Math.min(Math.max(Number(filters.limit || 50) || 50, 1), 100);
  const result = await query(
    `with bounds as (
       select
         case $2
           when 'day' then date_trunc('day', now() at time zone 'America/Bogota')
           when 'week' then date_trunc('week', now() at time zone 'America/Bogota')
           when 'month' then date_trunc('month', now() at time zone 'America/Bogota')
           when 'year' then date_trunc('year', now() at time zone 'America/Bogota')
           else date_trunc('week', now() at time zone 'America/Bogota')
         end as start_at,
         case $2
           when 'day' then date_trunc('day', now() at time zone 'America/Bogota') + interval '1 day'
           when 'week' then date_trunc('week', now() at time zone 'America/Bogota') + interval '1 week'
           when 'month' then date_trunc('month', now() at time zone 'America/Bogota') + interval '1 month'
           when 'year' then date_trunc('year', now() at time zone 'America/Bogota') + interval '1 year'
           else date_trunc('week', now() at time zone 'America/Bogota') + interval '1 week'
         end as end_at
     ),
     normalized_sales as (
       select
         coalesce(
           nullif(trim(bs.customer_document_id), ''),
           nullif(lower(trim(bs.customer_email)), ''),
           nullif(regexp_replace(coalesce(bs.customer_phone, ''), '[^0-9]', '', 'g'), ''),
           bs.id::text
         ) as customer_key,
         nullif(trim(bs.customer_name), '') as customer_name,
         nullif(trim(bs.customer_phone), '') as customer_phone,
         nullif(trim(bs.customer_email), '') as customer_email,
         nullif(trim(bs.customer_document_id), '') as customer_document_id,
         regexp_replace(coalesce(bs.customer_phone, ''), '[^0-9]', '', 'g') as customer_phone_digits,
         bs.product_name,
         bs.sale_amount,
         coalesce(bs.paid_at, bs.created_at) as created_at
       from business_sales bs
       cross join bounds b
       where bs.business_id = $1
         and coalesce(bs.sale_status, 'PAID') = 'PAID'
         and (coalesce(bs.paid_at, bs.created_at) at time zone 'America/Bogota') >= b.start_at
         and (coalesce(bs.paid_at, bs.created_at) at time zone 'America/Bogota') < b.end_at
     ),
     grouped as (
       select
         customer_key,
         coalesce(max(customer_name), 'Cliente sin nombre') as name,
         coalesce(max(customer_phone), '') as phone,
         coalesce(max(customer_email), '') as email,
         coalesce(max(customer_document_id), '') as document_id,
         max(customer_phone_digits) as phone_digits,
         count(*)::int as purchases_count,
         coalesce(sum(sale_amount), 0)::numeric as total_spent,
         coalesce(avg(sale_amount), 0)::numeric as average_ticket,
         max(created_at) as last_activity_at,
         array_remove((array_agg(product_name order by created_at desc))[1:3], null) as recent_products
       from normalized_sales
       group by customer_key
     )
     select
       row_number() over (order by g.total_spent desc, g.purchases_count desc, g.last_activity_at desc)::int as rank,
       g.name,
       g.phone,
       g.email,
       g.document_id,
       g.purchases_count,
       g.total_spent,
       g.average_ticket,
       g.last_activity_at,
       g.recent_products,
       coalesce(p.id, ml.id) as source_id,
       case when p.id is not null then p.id else null end as lead_id,
       case when p.id is not null then 'PLAYER' when ml.id is not null then 'MANUAL' else null end as source_type,
       'PURCHASES'::text as ranking_type,
       (select start_at::date from bounds) as start_date,
       ((select end_at from bounds) - interval '1 day')::date as end_date
     from grouped g
     left join lateral (
       select p.id
       from players p
       where p.business_id = $1
         and (
           (g.document_id <> '' and p.document_id = g.document_id)
           or (g.email <> '' and lower(p.email) = lower(g.email))
           or (g.phone_digits <> '' and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = g.phone_digits)
         )
       order by p.created_at desc
       limit 1
     ) p on true
     left join lateral (
       select ml.id
       from business_manual_leads ml
       where ml.business_id = $1
         and p.id is null
         and (
           (g.email <> '' and lower(ml.email) = lower(g.email))
           or (g.phone_digits <> '' and regexp_replace(coalesce(ml.phone, ''), '[^0-9]', '', 'g') = g.phone_digits)
         )
       order by ml.created_at desc
       limit 1
     ) ml on true
     order by g.total_spent desc, g.purchases_count desc, g.last_activity_at desc
     limit $3`,
    [businessId, period, limit]
  );
  const rows = result.rows || [];
  const summary = rows.reduce((acc, row) => {
    acc.customers_count += 1;
    acc.purchases_count += Number(row.purchases_count || 0);
    acc.total_spent += Number(row.total_spent || 0);
    return acc;
  }, { customers_count: 0, purchases_count: 0, total_spent: 0 });
  summary.average_ticket = summary.purchases_count > 0 ? summary.total_spent / summary.purchases_count : 0;
  summary.top_customer = rows[0]?.name || "";
  return {
    leaderboard: rows,
    period,
    ranking_type: "PURCHASES",
    start_date: rows[0]?.start_date || null,
    end_date: rows[0]?.end_date || null,
    summary,
  };
}

async function generateSeasonRewards(businessId, seasonId) {
  const seasonResult = await query(
    `select id, settings_json from gamification_seasons where business_id = $1 and id = $2`,
    [businessId, seasonId]
  );
  if (!seasonResult.rowCount) throw notFound("Ranking no encontrado.");
  const rules = Array.isArray(seasonResult.rows[0].settings_json?.rewards)
    ? seasonResult.rows[0].settings_json.rewards
    : [];
  if (!rules.length) return [];
  const board = await leaderboardForSeason(businessId, seasonId);
  const rows = board.leaderboard || [];
  const created = [];
  await withTransaction(async (client) => {
    const missionResult = await client.query(
      `select id from gamification_missions where business_id = $1 and season_id = $2 order by created_at limit 1`,
      [businessId, seasonId]
    );
    const missionId = missionResult.rows[0]?.id || null;
    for (const rule of rules) {
      for (const position of rewardPositions(rule, rows.length)) {
        const winner = rows[position - 1];
        if (!winner?.lead_id && !winner?.contact_id && !winner?.affiliate_id) continue;
        const rewardName = String(rule.reward_name || "Reconocimiento del ranking").trim();
        const eventKey = `ranking:${seasonId}:position:${position}:${rewardName.toLowerCase()}`;
        const result = await client.query(
          `insert into gamification_rewards
            (business_id, season_id, mission_id, lead_id, contact_id, affiliate_id, reward_type, reward_name,
             rank_position, event_key, status, metadata_json)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11::jsonb)
           on conflict (business_id, season_id, event_key) where event_key is not null do nothing
           returning *`,
          [businessId, seasonId, missionId, winner.lead_id || null, winner.contact_id || null, winner.affiliate_id || null,
           rule.reward_type || "CUSTOM", rewardName, position, eventKey,
           jsonParam({ ranking_type: board.ranking_type, winner_name: winner.name || "", generated_automatically: true }, {})]
        );
        if (result.rowCount) created.push(result.rows[0]);
      }
    }
  });
  return created;
}

async function finalizeExpiredRankings(businessId) {
  const expired = await query(
    `select id from gamification_seasons
     where business_id = $1 and status = 'ACTIVE'
       and end_date is not null and end_date < (now() at time zone 'America/Bogota')::date
     order by end_date asc`,
    [businessId]
  );
  for (const row of expired.rows) {
    await setSeasonStatus(businessId, row.id, "FINISHED");
  }
  return expired.rows.map((row) => row.id);
}

async function pendingRewards(businessId, filters = {}) {
  const params = [businessId];
  const clauses = ["gr.business_id = $1"];
  if (filters.season_id) {
    params.push(filters.season_id);
    clauses.push(`gr.season_id = $${params.length}`);
  }
  const result = await query(
    `select gr.*, gs.name as season_name,
            coalesce(p.name, ml.name, a.full_name, gr.metadata_json->>'winner_name') as lead_name,
            coalesce(p.phone, ml.phone, a.phone) as lead_phone,
            coalesce(p.email, ml.email, a.email) as lead_email,
            case when p.id is not null then 'PLAYER' when ml.id is not null then 'MANUAL' when a.id is not null then 'AFFILIATE' else null end as source_type,
            coalesce(p.id, ml.id, a.id) as source_id
     from gamification_rewards gr
     join gamification_seasons gs on gs.id = gr.season_id and gs.business_id = gr.business_id
     left join players p on p.id = gr.lead_id and p.business_id = gr.business_id
     left join business_manual_leads ml on ml.id = gr.contact_id and ml.business_id = gr.business_id
     left join affiliates a on a.id = gr.affiliate_id and a.business_id = gr.business_id
     where ${clauses.join(" and ")} and gr.status = 'PENDING'
     order by gr.created_at desc
     limit 100`,
    params
  );
  return { rewards: result.rows };
}

async function createAgendaTasks(businessId, user, payload = {}) {
  const season = payload.season_id ? (await getSeason(businessId, payload.season_id)).season : null;
  const tasks = Array.isArray(payload.tasks) && payload.tasks.length ? payload.tasks : defaultAgendaTasks(season || payload);
  const created = [];
  const existing = [];
  for (const [index, task] of tasks.entries()) {
    const taskKey = `ranking:${season?.id || payload.season_id || payload.campaign_id || "general"}:task:${index + 1}`;
    const duplicate = await query(
      `select id from lead_notes
       where business_id = $1 and metadata->>'ranking_task_key' = $2
       order by created_at desc limit 1`,
      [businessId, taskKey]
    );
    if (duplicate.rowCount) {
      existing.push(duplicate.rows[0]);
      continue;
    }
    try {
    const item = await createLeadAgendaItem(businessId, user, {
      source_type: "MARKETING",
      source_id: season?.campaign_id || payload.campaign_id || null,
      note: task.note || `Misiones Sales Machine: ${task.title || "tarea operativa"}.`,
      note_type: "follow_up",
      next_action: task.title || "Revisar ranking",
      reminder_at: task.reminder_at || task.due_at || new Date(Date.now() + 86400000).toISOString(),
      agenda_priority: task.priority || "MEDIUM",
      progress_percent: 0,
      checklist: task.checklist || [
        { label: "Ejecutar tarea del ranking", done: false },
        { label: "Registrar resultado", done: false },
      ],
      metadata: {
        ...(task.metadata || {}),
        source_module: "gamification_missions",
        mission_id: task.mission_id || null,
        season_id: season?.id || payload.season_id || null,
        reward_id: task.reward_id || null,
        campaign_id: season?.campaign_id || payload.campaign_id || null,
        ranking_task_key: taskKey,
      },
    });
    created.push(item);
    } catch (error) {
      if (error.code !== "23505") throw error;
      const raced = await query(
        `select id from lead_notes where business_id = $1 and metadata->>'ranking_task_key' = $2 limit 1`,
        [businessId, taskKey]
      );
      if (raced.rowCount) existing.push(raced.rows[0]);
    }
  }
  return { tasks: created, existing, created_count: created.length, existing_count: existing.length };
}

function defaultAgendaTasks(source = {}) {
  const base = new Date();
  const plusDays = (days) => new Date(base.getTime() + days * 86400000).toISOString();
  return [
    { title: "Publicar el ranking", note: `Publicar o enviar ${source.name || "el ranking"} a los clientes.`, due_at: plusDays(1), priority: "HIGH" },
    { title: "Revisar ranking y participacion", note: "Revisar participantes, puntos y oportunidades de seguimiento.", due_at: plusDays(3), priority: "MEDIUM" },
    { title: "Contactar ganadores o clientes calientes", note: "Crear seguimiento comercial desde los resultados del ranking.", due_at: plusDays(5), priority: "MEDIUM" },
  ];
}

async function deliverReward(businessId, rewardId) {
  const result = await query(
    `update gamification_rewards
     set status = 'DELIVERED', delivered_at = now(), updated_at = now()
     where id = $1 and business_id = $2 and status = 'PENDING'
     returning *`,
    [rewardId, businessId]
  );
  if (!result.rowCount) {
    const existing = await query(
      "select * from gamification_rewards where id = $1 and business_id = $2",
      [rewardId, businessId]
    );
    if (!existing.rowCount) throw notFound("Premio no encontrado.");
    return { reward: existing.rows[0], already_delivered: existing.rows[0].status === "DELIVERED" };
  }
  return { reward: result.rows[0] };
}

module.exports = {
  MISSION_TEMPLATES,
  awardPoints,
  createAgendaTasks,
  createSeason,
  dashboard,
  deleteSeason,
  deliverReward,
  finalizeExpiredRankings,
  generateSeasonRewards,
  getSeason,
  leaderboardForSeason,
  listSeasons,
  pendingRewards,
  purchaseLeaderboardByPeriod,
  rewardPositions,
  setSeasonStatus,
  updateSeason,
};

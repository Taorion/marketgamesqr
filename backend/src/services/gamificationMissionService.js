const { query } = require("../config/db");
const { badRequest, notFound } = require("../utils/http");
const { createLeadAgendaItem } = require("./leadCrmService");

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
    name: "Racha de recompra",
    type: "REBUY_STREAK",
    description: "Cliente que compra durante varios periodos seguidos desbloquea un premio.",
    channel: "postventa / WhatsApp",
    points_rules: [
      { action_type: "PURCHASE", label: "Comprar", points: 100 },
      { action_type: "REBUY", label: "Recomprar", points: 150 },
    ],
    streaks: [{ name: "Compra 3 meses seguidos", action_type: "REBUY", frequency: "monthly", target_count: 3, reward: "Reward Pass especial" }],
    ranking: { ranking_type: "PURCHASES", top_limit: 10, privacy_mode: "ALIAS" },
    rewards: [{ condition: "3_rebuys", reward_name: "Reward Pass especial", reward_type: "REWARD_PASS" }],
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
       select count(distinct coalesce(gpl.lead_id::text, gpl.contact_id::text, gpl.source_id::text))::int as participants_count,
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
           nullif(lower(trim(sale.customer_name)), ''),
           sale.id::text
         ))::int as purchase_customers_count,
         count(*)::int as purchases_count,
         coalesce(sum(sale.sale_amount), 0)::numeric as purchase_amount
       from business_sales sale
       where sale.business_id = s.business_id
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
  if (!season.rowCount) throw notFound("Dinamica no encontrada.");
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
  if (!name) throw badRequest("Escribe el nombre de la dinamica.");
  const settings = {
    template_key: template?.key || payload.template_key || "custom",
    points_rules: payload.points_rules || template?.points_rules || [],
    streaks: payload.streaks || template?.streaks || [],
    ranking: payload.ranking || template?.ranking || { ranking_type: "POINTS", top_limit: 10, privacy_mode: "ALIAS" },
    rewards: payload.rewards || template?.rewards || [],
    agenda_tasks: payload.agenda_tasks || [],
    banner_url: payload.banner_url || "",
  };
  const result = await query(
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
  });
  const board = await createLeaderboard(businessId, season.id, settings.ranking, settings.rewards);
  return { season, mission, leaderboard: board };
}

async function updateSeason(businessId, seasonId, payload = {}) {
  const existing = await getSeason(businessId, seasonId);
  const currentSettings = existing.season.settings_json || {};
  const settings = {
    ...currentSettings,
    ...(payload.settings || {}),
    ...(payload.points_rules ? { points_rules: payload.points_rules } : {}),
    ...(payload.streaks ? { streaks: payload.streaks } : {}),
    ...(payload.ranking ? { ranking: payload.ranking } : {}),
    ...(payload.rewards ? { rewards: payload.rewards } : {}),
    ...(payload.agenda_tasks ? { agenda_tasks: payload.agenda_tasks } : {}),
  };
  const result = await query(
    `update gamification_seasons
     set campaign_id = coalesce($3, campaign_id),
         name = coalesce($4, name),
         description = coalesce($5, description),
         type = coalesce($6, type),
         status = coalesce($7, status),
         start_date = coalesce($8::date, start_date),
         end_date = coalesce($9::date, end_date),
         channel = coalesce($10, channel),
         target_segment_json = coalesce($11::jsonb, target_segment_json),
         settings_json = $12::jsonb,
         updated_at = now()
     where id = $1 and business_id = $2
     returning *`,
    [
      seasonId,
      businessId,
      payload.campaign_id || null,
      payload.name || null,
      payload.description || null,
      payload.type || null,
      payload.status ? normalizeStatus(payload.status, existing.season.status) : null,
      payload.start_date || null,
      payload.end_date || null,
      payload.channel || null,
      payload.target_segment ? jsonParam(payload.target_segment, {}) : null,
      jsonParam(settings, {}),
    ]
  );
  return { season: result.rows[0] };
}

async function setSeasonStatus(businessId, seasonId, status) {
  const result = await query(
    `update gamification_seasons
     set status = $3, updated_at = now()
     where id = $1 and business_id = $2
     returning *`,
    [seasonId, businessId, normalizeStatus(status, "ACTIVE")]
  );
  if (!result.rowCount) throw notFound("Dinamica no encontrada.");
  return { season: result.rows[0] };
}

async function createMission(businessId, payload = {}) {
  const result = await query(
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

async function createLeaderboard(businessId, seasonId, ranking = {}, rewards = []) {
  const result = await query(
    `insert into gamification_leaderboards
      (business_id, season_id, name, ranking_type, top_limit, privacy_mode, reward_rules_json, starts_at, ends_at, status)
     values ($1, $2, 'Ranking principal', $3, $4, $5, $6::jsonb, null, null, 'ACTIVE')
     returning *`,
    [
      businessId,
      seasonId,
      ranking.ranking_type || "POINTS",
      Number(ranking.top_limit || 10),
      ranking.privacy_mode || "ALIAS",
      jsonParam(rewards || [], []),
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
  const seasons = await listSeasons(businessId, {});
  const metrics = await query(
    `select
       (select count(*) from gamification_seasons where business_id = $1 and status = 'ACTIVE')::int as active_seasons,
       (select count(distinct coalesce(lead_id::text, contact_id::text, source_id::text)) from gamification_points_ledger where business_id = $1)::int as participants,
       (select coalesce(sum(points), 0)::int from gamification_points_ledger where business_id = $1)::int as points_total,
       (select count(*) from gamification_rewards where business_id = $1 and status = 'PENDING')::int as pending_rewards,
       (select count(*) from gamification_streaks where business_id = $1 and status = 'ACTIVE')::int as active_streaks,
       (select count(*) from qr_codes where business_id = $1 and status = 'REDEEMED')::int as redeemed_tickets,
       (select coalesce(sum(sale_amount), 0)::numeric from business_sales where business_id = $1)::numeric as sales_amount`,
    [businessId]
  );
  const rewards = await pendingRewards(businessId, {});
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
       coalesce(gl.ranking_type, s.settings_json #>> '{ranking,ranking_type}', 'POINTS') as ranking_type,
       least(greatest(coalesce(gl.top_limit, 10), 1), 50)::int as top_limit
     from gamification_seasons s
     left join gamification_leaderboards gl
       on gl.business_id = s.business_id and gl.season_id = s.id and gl.status = 'ACTIVE'
     where s.business_id = $1 and s.id = $2
     order by gl.created_at desc nulls last
     limit 1`,
    [businessId, seasonId]
  );
  if (!configResult.rowCount) throw notFound("Dinamica no encontrada.");
  const config = configResult.rows[0];
  if (String(config.ranking_type || "").toUpperCase() === "PURCHASES") {
    const purchases = await query(
      `with normalized_sales as (
         select
           coalesce(
             nullif(trim(bs.customer_document_id), ''),
             nullif(lower(trim(bs.customer_email)), ''),
             nullif(regexp_replace(coalesce(bs.customer_phone, ''), '[^0-9]', '', 'g'), ''),
             nullif(lower(trim(bs.customer_name)), ''),
             bs.id::text
           ) as customer_key,
           nullif(trim(bs.customer_name), '') as customer_name,
           nullif(trim(bs.customer_phone), '') as customer_phone,
           nullif(trim(bs.customer_email), '') as customer_email,
           bs.sale_amount,
           bs.created_at
         from business_sales bs
         where bs.business_id = $1
           and ($3::date is null or (bs.created_at at time zone 'America/Bogota')::date >= $3::date)
           and ($4::date is null or (bs.created_at at time zone 'America/Bogota')::date <= $4::date)
       )
       select
         coalesce(max(customer_name), 'Cliente sin nombre') as name,
         coalesce(max(customer_phone), '') as phone,
         coalesce(max(customer_email), '') as email,
         count(*)::int as purchases_count,
         coalesce(sum(sale_amount), 0)::numeric as total_spent,
         coalesce(avg(sale_amount), 0)::numeric as average_ticket,
         max(created_at) as last_activity_at,
         'PURCHASES'::text as ranking_type
       from normalized_sales
       group by customer_key
       order by total_spent desc, purchases_count desc, last_activity_at desc
       limit $2`,
      [businessId, config.top_limit, config.start_date, config.end_date]
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
       coalesce(p.name, ml.name, 'Cliente sin nombre') as name,
       coalesce(p.phone, ml.phone, '') as phone,
       coalesce(p.email, ml.email, '') as email,
       gpl.lead_id,
       gpl.contact_id,
       sum(gpl.points)::int as points,
       count(*)::int as actions_count,
       max(gpl.created_at) as last_activity_at,
       'POINTS'::text as ranking_type
     from gamification_points_ledger gpl
     left join players p on p.id = gpl.lead_id and p.business_id = gpl.business_id
     left join business_manual_leads ml on ml.id = gpl.contact_id and ml.business_id = gpl.business_id
     where gpl.business_id = $1 and gpl.season_id = $2
     group by p.name, ml.name, p.phone, ml.phone, p.email, ml.email, gpl.lead_id, gpl.contact_id
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

async function pendingRewards(businessId, filters = {}) {
  const params = [businessId];
  const clauses = ["gr.business_id = $1"];
  if (filters.season_id) {
    params.push(filters.season_id);
    clauses.push(`gr.season_id = $${params.length}`);
  }
  const result = await query(
    `select gr.*, gs.name as season_name, p.name as lead_name, p.phone as lead_phone
     from gamification_rewards gr
     join gamification_seasons gs on gs.id = gr.season_id
     left join players p on p.id = gr.lead_id
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
  for (const task of tasks) {
    const item = await createLeadAgendaItem(businessId, user, {
      source_type: "MARKETING",
      source_id: season?.campaign_id || payload.campaign_id || null,
      note: task.note || `Misiones Sales Machine: ${task.title || "tarea operativa"}.`,
      note_type: "follow_up",
      next_action: task.title || "Revisar dinamica gamificada",
      reminder_at: task.reminder_at || task.due_at || new Date(Date.now() + 86400000).toISOString(),
      agenda_priority: task.priority || "MEDIUM",
      progress_percent: 0,
      checklist: task.checklist || [
        { label: "Ejecutar tarea de la dinamica", done: false },
        { label: "Registrar resultado", done: false },
      ],
      metadata: {
        ...(task.metadata || {}),
        source_module: "gamification_missions",
        mission_id: task.mission_id || null,
        season_id: season?.id || payload.season_id || null,
        reward_id: task.reward_id || null,
        campaign_id: season?.campaign_id || payload.campaign_id || null,
      },
    });
    created.push(item);
  }
  return { tasks: created };
}

function defaultAgendaTasks(source = {}) {
  const base = new Date();
  const plusDays = (days) => new Date(base.getTime() + days * 86400000).toISOString();
  return [
    { title: "Publicar primera dinamica", note: `Publicar o enviar ${source.name || "la dinamica"} a los clientes.`, due_at: plusDays(1), priority: "HIGH" },
    { title: "Revisar ranking y participacion", note: "Revisar participantes, puntos y oportunidades de seguimiento.", due_at: plusDays(3), priority: "MEDIUM" },
    { title: "Contactar ganadores o clientes calientes", note: "Crear seguimiento comercial desde resultados de la dinamica.", due_at: plusDays(5), priority: "MEDIUM" },
  ];
}

async function deliverReward(businessId, rewardId) {
  const result = await query(
    `update gamification_rewards
     set status = 'DELIVERED', delivered_at = now(), updated_at = now()
     where id = $1 and business_id = $2
     returning *`,
    [rewardId, businessId]
  );
  if (!result.rowCount) throw notFound("Recompensa no encontrada.");
  return { reward: result.rows[0] };
}

module.exports = {
  MISSION_TEMPLATES,
  awardPoints,
  createAgendaTasks,
  createSeason,
  dashboard,
  deliverReward,
  getSeason,
  leaderboardForSeason,
  listSeasons,
  pendingRewards,
  setSeasonStatus,
  updateSeason,
};

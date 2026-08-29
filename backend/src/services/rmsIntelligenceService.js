const { query, withTransaction } = require("../config/db");
const { badRequest, notFound } = require("../utils/http");
const { createLeadAgendaItem } = require("./leadCrmService");
const { listRmsPersistedCases } = require("./rmsMachineService");
const {
  insightCanCreateAgendaTask,
  normalizeInsightPriority,
  normalizeInsightStatus,
} = require("./rmsIntelligencePolicy");

const SOURCE_TYPES = new Set(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]);

function sourceType(value = "PLAYER") {
  const normalized = String(value || "PLAYER").toUpperCase();
  if (!SOURCE_TYPES.has(normalized)) throw badRequest("El tipo de caso RMS no es válido.");
  return normalized;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function metadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const RMS_PHASE_LABELS = Object.freeze({
  recoleccion: "Recolector",
  alimentacion: "Curaduría",
  curaduria: "Asignación",
  clasificacion: "Activación 1",
  procesamiento: "Evaluación",
  accion_correctiva: "Negociación",
  control_anti_fuga: "Riesgos de fuga",
  cierre: "Ventas atribuidas",
  postventa: "Valorización Clientes",
  inteligencia: "Inteligencia",
  reciclaje: "Reciclaje",
});

function phaseLabel(phase) {
  const key = String(phase || "").trim().toLowerCase();
  return RMS_PHASE_LABELS[key] || key || "Sin etapa";
}

function moneyTotal(rows = [], field) {
  return rows.reduce((sum, row) => sum + Number(row?.[field] || 0), 0);
}

function leadQualityLabel(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return ({ HIGH: "Alta", MEDIUM: "Media", LOW: "Baja", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" })[normalized]
    || String(value || "").trim()
    || "Sin registrar";
}

function intelligenceJourney({ stateMetadata = {}, movements = [], sales = [], postSaleActions = [], tickets = [], rewardPasses = [] }) {
  const phases = [...new Set(movements.map((movement) => movement.to_phase).filter(Boolean))];
  const visited = new Set(phases);
  const negotiated = visited.has("accion_correctiva") || Boolean(stateMetadata.negotiation?.round || stateMetadata.negotiation?.objective);
  const riskReviewed = visited.has("control_anti_fuga") || Boolean(stateMetadata.risk_review);
  const commercialRoute = riskReviewed ? "Venta protegida por Riesgos de fuga" : negotiated ? "Venta negociada" : sales.length ? "Compra directa atribuida" : "Aún sin venta atribuida";
  const quality = leadQualityLabel(stateMetadata.lead_quality_label || stateMetadata.lead_quality || stateMetadata.funnel_quality);
  const salesSummary = sales.map((sale) => {
    const saleMetadata = metadata(sale.metadata);
    const economics = metadata(saleMetadata.economics);
    return {
      id: sale.id,
      product_name: sale.product_name || sale.product_name_snapshot || "Producto sin nombre",
      quantity: Number(sale.quantity || economics.quantity || 1),
      currency: sale.currency || economics.currency || "COP",
      sale_amount: Number(sale.sale_amount || economics.sale_amount || 0),
      unit_cost: Number(sale.unit_cost || economics.unit_cost || 0),
      product_cost_total: Number(sale.product_cost_total || economics.product_cost_total || 0),
      benefit_type: sale.benefit_type || "NONE",
      benefit_cost: Number(sale.benefit_cost || economics.benefit_cost || 0),
      benefit_description: saleMetadata.benefit_description || null,
      acquisition_cost: Number(sale.acquisition_cost || economics.acquisition_cost || 0),
      gross_profit: Number(sale.gross_profit || economics.gross_profit || 0),
      net_profit: Number(sale.net_profit || economics.net_profit || 0),
      roi: sale.roi ?? economics.roi ?? null,
      acquisition_channel: sale.acquisition_channel_name_snapshot || sale.acquisition_channel || saleMetadata.acquisition_channel?.name_snapshot || null,
      payment_method: sale.payment_method || null,
      paid_at: sale.paid_at || sale.created_at || null,
    };
  });
  return {
    quality,
    commercial_route: commercialRoute,
    negotiated,
    risk_reviewed: riskReviewed,
    direct_purchase: Boolean(sales.length) && !negotiated && !riskReviewed,
    phases: phases.map((phase) => ({ key: phase, label: phaseLabel(phase) })),
    skipped_stages: [
      !negotiated ? { key: "accion_correctiva", label: "Negociación" } : null,
      !riskReviewed ? { key: "control_anti_fuga", label: "Riesgos de fuga" } : null,
    ].filter(Boolean),
    economics: {
      revenue: moneyTotal(salesSummary, "sale_amount"),
      product_cost: moneyTotal(salesSummary, "product_cost_total"),
      benefit_cost: moneyTotal(salesSummary, "benefit_cost"),
      acquisition_cost: moneyTotal(salesSummary, "acquisition_cost"),
      gross_profit: moneyTotal(salesSummary, "gross_profit"),
      net_profit: moneyTotal(salesSummary, "net_profit"),
    },
    sales: salesSummary,
    benefits: {
      used_in_sale: salesSummary.filter((sale) => sale.benefit_type !== "NONE" || sale.benefit_cost > 0).map((sale) => ({ type: sale.benefit_type, cost: sale.benefit_cost, description: sale.benefit_description || null })),
      post_sale_actions: postSaleActions.map((action) => ({ type: action.action_type, status: action.status, detail: action.result_note || action.content || null })),
      tickets: tickets.map((ticket) => ({ type: ticket.benefit_type || ticket.origin_type || "Ticket", status: ticket.status, value: ticket.benefit_value || null })),
      reward_passes: rewardPasses.map((pass) => ({ status: pass.status, initial_value_cop: Number(pass.initial_value_cop || 0), current_balance_cop: Number(pass.current_balance_cop || 0) })),
    },
  };
}

function elapsedLabel(milliseconds = 0) {
  const hours = Math.max(0, Math.round(milliseconds / 3600000));
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

function phaseDurations(movements = [], state = null) {
  const ordered = [...movements].sort((left, right) => new Date(left.created_at) - new Date(right.created_at));
  const durations = [];
  let startedAt = state?.created_at ? new Date(state.created_at) : null;
  let phase = ordered[0]?.from_phase || state?.rms_phase || null;
  ordered.forEach((movement) => {
    const endedAt = new Date(movement.created_at);
    const nextPhase = movement.to_phase || phase;
    if (!phase || !startedAt || Number.isNaN(endedAt.getTime()) || nextPhase === phase) return;
    const milliseconds = Math.max(0, endedAt - startedAt);
    durations.push({ phase, phase_label: phaseLabel(phase), started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), milliseconds, label: elapsedLabel(milliseconds) });
    phase = nextPhase;
    startedAt = endedAt;
  });
  if (phase && startedAt) {
    const now = new Date();
    const milliseconds = Math.max(0, now - startedAt);
    durations.push({ phase, phase_label: phaseLabel(phase), started_at: startedAt.toISOString(), ended_at: null, milliseconds, label: elapsedLabel(milliseconds), is_open: true });
  }
  return durations;
}

function meaningfulTimeline(movements = [], events = [], sales = [], postSaleActions = []) {
  const duplicateEventTitles = new Set(["Cliente movido de fase"]);
  return [
    ...movements.map((row) => {
      const fromPhase = row.from_phase || "origen";
      const toPhase = row.to_phase || fromPhase;
      const isUpdate = fromPhase === toPhase;
      return {
        kind: isUpdate ? "update" : "phase",
        at: row.created_at,
        phase: toPhase,
        title: isUpdate ? `Actualización en ${phaseLabel(toPhase)}` : `${phaseLabel(fromPhase)} → ${phaseLabel(toPhase)}`,
        detail: row.reason || (isUpdate ? "Dato operativo actualizado." : "Cambio de estación registrado."),
        evidence_id: row.id,
      };
    }),
    ...events.filter((row) => !duplicateEventTitles.has(String(row.event_title || "").trim())).map((row) => ({ kind: "event", at: row.created_at, phase: row.rms_phase, title: row.event_title, detail: row.event_description || "Hecho RMS registrado", evidence_id: row.id })),
    ...sales.map((sale) => ({ kind: "sale", at: sale.paid_at || sale.created_at, phase: "cierre", title: "Venta atribuida", detail: `${sale.currency || "COP"} ${sale.sale_amount} · ${sale.product_name || "Producto sin nombre"}`, evidence_id: sale.id })),
    ...postSaleActions.map((action) => ({ kind: "post_sale", at: action.updated_at || action.created_at, phase: "postventa", title: `Activación 2 · ${action.action_type}`, detail: `${action.status}${action.result_note ? ` · ${action.result_note}` : ""}`, evidence_id: action.id })),
  ].sort((left, right) => new Date(left.at) - new Date(right.at));
}

function intelligenceDataQualityFlags(movements = [], events = []) {
  const narrative = [...movements.map((row) => row.reason), ...events.map((row) => `${row.event_title || ""} ${row.event_description || ""}`)].join(" ").toLowerCase();
  const flags = [];
  if (narrative.includes("respondió con interés") && narrative.includes("no respondió")) {
    flags.push({ level: "warning", title: "Respuesta de Activación 1 inconsistente", detail: "El historial registra interés y también falta de respuesta. Valida cuál fue la respuesta final antes de reutilizar este caso como aprendizaje." });
  }
  const repeatedUpdates = movements.filter((row) => row.from_phase && row.from_phase === row.to_phase).length;
  if (repeatedUpdates >= 3) {
    flags.push({ level: "info", title: "Varias actualizaciones dentro de una estación", detail: `${repeatedUpdates} actualizaciones se consolidaron en el recorrido. La duración ahora se calcula por permanencia real, no por cada edición.` });
  }
  return flags;
}

function reprocessCount(movements = []) {
  const seen = new Set();
  let currentPhase = null;
  let count = 0;
  movements.forEach((movement) => {
    const nextPhase = movement.to_phase || currentPhase;
    if (!nextPhase || nextPhase === currentPhase) return;
    if (seen.has(nextPhase)) count += 1;
    seen.add(nextPhase);
    currentPhase = nextPhase;
  });
  return count;
}

function caseMissingFields({ profile = {}, state = {}, sales = [], postSaleActions = [] }) {
  const missing = [];
  if (!profile.phone && !profile.email) missing.push("Contacto");
  if (!profile.campaign_id && !profile.campaign_name) missing.push("Campaña u origen");
  if (!profile.product_interest && !state.metadata?.commercial_confirmation?.product_name) missing.push("Producto o interés");
  if (!sales.length) missing.push("Venta atribuida");
  if (sales.length && !postSaleActions.length) missing.push("Resultado de Activación 2");
  return missing;
}

async function learningCase(businessId, params = {}) {
  const type = sourceType(params.source_type);
  const sourceId = String(params.source_id || "").trim();
  if (!sourceId) throw badRequest("Selecciona un caso RMS para revisar su aprendizaje.");
  const [stateResult, movementsResult, eventsResult, analyticalEventsResult, salesResult, postSaleResult, notesResult] = await Promise.all([
    query("select * from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3", [businessId, type, sourceId]),
    query("select * from rms_phase_movements where business_id = $1 and source_type = $2 and source_id = $3 order by created_at asc", [businessId, type, sourceId]),
    query("select * from rms_machine_events where business_id = $1 and source_type = $2 and source_id = $3 order by created_at asc", [businessId, type, sourceId]),
    query("select * from rms_intelligence_case_events where business_id = $1 and source_type = $2 and source_id = $3 order by created_at asc", [businessId, type, sourceId]),
    query("select * from business_sales where business_id = $1 and rms_source_type = $2 and rms_source_id = $3 order by paid_at desc nulls last, created_at desc", [businessId, type, sourceId]),
    query(`select a.*, s.product_name as sale_product_name, s.sale_amount, s.currency
             from rms_post_sale_actions a join business_sales s on s.id = a.sale_id and s.business_id = a.business_id
            where a.business_id = $1 and a.source_type = $2 and a.source_id = $3 order by a.created_at asc`, [businessId, type, sourceId]),
    query("select id, note, note_type, next_action, reminder_at, agenda_status, metadata, created_at from lead_notes where business_id = $1 and source_type = $2 and source_id = $3 order by created_at asc", [businessId, type, sourceId]),
  ]);
  const state = stateResult.rows[0] || null;
  if (!state && !salesResult.rowCount && !eventsResult.rowCount) throw notFound("No encontramos hechos RMS de ese caso para este negocio.");
  const persistedCases = await listRmsPersistedCases(businessId, { limit: 500 });
  const opportunity = persistedCases.find((item) => item.source_type === type && String(item.source_id) === sourceId) || {};
  const stateMetadata = metadata(state?.metadata);
  const sales = salesResult.rows;
  const saleIds = sales.map((sale) => sale.id);
  const [qrResult, rewardPassResult, insightsResult] = await Promise.all([
    saleIds.length ? query("select id, sale_id, status, redeemed_at, expires_at, origin_type, benefit_type, benefit_value, metadata, created_at from qr_codes where business_id = $1 and sale_id = any($2::uuid[]) order by created_at asc", [businessId, saleIds]) : { rows: [] },
    saleIds.length ? query("select id, source_sale_id, status, initial_value_cop, current_balance_cop, expires_at, claimed_at, created_at from reward_passes where company_id = $1 and source_sale_id = any($2::uuid[]) order by created_at asc", [businessId, saleIds]) : { rows: [] },
    query("select id, observation, hypothesis, recommendation, status, priority, expected_metric, review_at, created_at from rms_intelligence_insights where business_id = $1 and source_type = $2 and source_id = $3 order by created_at desc", [businessId, type, sourceId]),
  ]);
  const movements = movementsResult.rows;
  const events = eventsResult.rows;
  const analyticalEvents = analyticalEventsResult.rows;
  const durations = phaseDurations(movements, state);
  const longest = [...durations].sort((left, right) => right.milliseconds - left.milliseconds)[0] || null;
  const journey = intelligenceJourney({
    stateMetadata,
    movements,
    sales,
    postSaleActions: postSaleResult.rows,
    tickets: qrResult.rows,
    rewardPasses: rewardPassResult.rows,
  });
  const timeline = meaningfulTimeline(movements, events, sales, postSaleResult.rows);
  const dataQualityFlags = intelligenceDataQualityFlags(movements, events);
  const profile = {
    source_type: type, source_id: sourceId, lead_id: state?.lead_id || null,
    lead_name: opportunity.name || null,
    campaign_id: sales[0]?.campaign_id || stateMetadata.campaign_id || opportunity.campaign_id || null,
    campaign_name: stateMetadata.campaign_name || opportunity.campaign_name || null,
    channel: stateMetadata.channel || stateMetadata.activation_delivery_channel || opportunity.channel || null,
    seller_user_id: sales[0]?.seller_user_id || opportunity.owner_user_id || null,
    product_interest: stateMetadata.commercial_confirmation?.product_name || stateMetadata.product_interest || opportunity.product_interest || opportunity.top_product || null,
    phone: sales[0]?.customer_phone || opportunity.phone || null, email: sales[0]?.customer_email || opportunity.email || null,
  };
  return {
    case: {
      source_type: type, source_id: sourceId, current_operational_phase: state?.rms_phase || "sin_estado",
      lifecycle_status: state?.lifecycle_status || "ACTIVE", profile,
    },
    facts: { state, movements, events, analytical_events: analyticalEvents, sales, post_sale_actions: postSaleResult.rows, tickets: qrResult.rows, reward_passes: rewardPassResult.rows, agenda_and_notes: notesResult.rows, journey },
    learning: {
      timeline, phase_durations: durations, longest_phase: longest, data_quality_flags: dataQualityFlags,
      reprocess_count: reprocessCount(movements),
      primary_objection: stateMetadata.commercial_confirmation?.objection_type || stateMetadata.negotiation?.objection_type || null,
      loss_or_risk_reason: stateMetadata.risk_review?.reason || stateMetadata.negotiation?.reason || null,
      winning_condition: stateMetadata.commercial_confirmation?.customer_condition || stateMetadata.commercial_confirmation?.note || null,
      attributed_value: sales.reduce((sum, sale) => sum + Number(sale.sale_amount || 0), 0),
      missing_fields: caseMissingFields({ profile, state: { metadata: stateMetadata }, sales, postSaleActions: postSaleResult.rows }),
    },
    insights: insightsResult.rows,
  };
}

async function listIntelligenceCases(businessId, filters = {}) {
  const persistedCases = await listRmsPersistedCases(businessId, { limit: Math.min(Math.max(Number(filters.limit || 240), 1), 500) });
  const lifecycle = String(filters.lifecycle_status || "").toUpperCase();
  const operationalPhase = String(filters.phase || "").trim();
  const cases = persistedCases.filter((item) => (!lifecycle || item.lifecycle_status === lifecycle)
    && (!operationalPhase || item.operational_phase === operationalPhase));
  return { cases, total: cases.length, analytical_only: true };
}

function sampleLabel(count) {
  return count >= 5 ? `Muestra: ${count}` : `Muestra insuficiente (${count})`;
}

async function intelligencePatterns(businessId, filters = {}) {
  const days = Math.min(Math.max(Number(filters.days || 30), 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const filterValues = {
    campaign: String(filters.campaign || "").trim().toLowerCase(),
    channel: String(filters.channel || "").trim().toLowerCase(),
    product: String(filters.product || "").trim().toLowerCase(),
    seller: String(filters.seller || "").trim().toLowerCase(),
    branch: String(filters.branch || "").trim().toLowerCase(),
    source_type: String(filters.source_type || "").trim().toUpperCase(),
  };
  const hasFilters = Object.values(filterValues).some(Boolean);
  const opportunityData = hasFilters ? await listRmsPersistedCases(businessId, { limit: 500 }) : null;
  let scopedSourceIds = hasFilters
    ? (opportunityData || []).filter((item) => {
      const text = (value) => String(value || "").toLowerCase();
      return (!filterValues.campaign || text(item.campaign_name).includes(filterValues.campaign))
        && (!filterValues.channel || text(item.channel).includes(filterValues.channel))
        && (!filterValues.product || `${text(item.product_interest)} ${text(item.top_product)}`.includes(filterValues.product))
        && (!filterValues.seller || `${text(item.owner_name)} ${text(item.owner_user_id)}`.includes(filterValues.seller))
        && (!filterValues.branch || `${text(item.branch_name)} ${text(item.branch_id)}`.includes(filterValues.branch))
        && (!filterValues.source_type || String(item.source_type || "").toUpperCase() === filterValues.source_type);
    }).map((item) => item.source_id).filter(Boolean)
    : null;
  if (hasFilters && (filterValues.seller || filterValues.branch)) {
    const saleScope = await query(
      `select distinct bs.rms_source_id
         from business_sales bs
         left join app_users seller on seller.id = bs.seller_user_id and seller.business_id = bs.business_id
         left join branches branch on branch.id = bs.branch_id and branch.business_id = bs.business_id
        where bs.business_id = $1
          and bs.rms_source_id is not null
          and ($2::text = '' or lower(concat_ws(' ', seller.full_name, seller.email, seller.id::text)) like '%' || $2 || '%')
          and ($3::text = '' or lower(concat_ws(' ', branch.name, branch.id::text)) like '%' || $3 || '%')`,
      [businessId, filterValues.seller, filterValues.branch]
    );
    const saleScopedIds = new Set(saleScope.rows.map((row) => String(row.rms_source_id)));
    scopedSourceIds = scopedSourceIds.filter((sourceId) => saleScopedIds.has(String(sourceId)));
  }
  const sourceFilter = hasFilters ? " and source_id = any($3::uuid[])" : "";
  const salesSourceFilter = hasFilters ? " and bs.rms_source_id = any($3::uuid[])" : "";
  const params = hasFilters ? [businessId, since, scopedSourceIds] : [businessId, since];
  const [phases, objections, sales, postSale, insights] = await Promise.all([
    query(`select to_phase as key, count(*)::int as sample_size, (array_agg(distinct source_type || ':' || source_id::text))[1:12] as case_refs from rms_phase_movements where business_id = $1 and created_at >= $2${sourceFilter} group by to_phase order by sample_size desc`, params),
    query(`select coalesce(nullif(metadata->'commercial_confirmation'->>'objection_type', ''), nullif(metadata->'negotiation'->>'objection_type', ''), 'NO_REGISTRADA') as key, count(*)::int as sample_size, (array_agg(source_type || ':' || source_id::text))[1:12] as case_refs from rms_lead_state where business_id = $1 and updated_at >= $2${sourceFilter} group by 1 order by sample_size desc`, params),
    query(`select coalesce(nullif(c.name, ''), 'Sin campaña') as campaign, coalesce(nullif(bs.product_name, ''), 'Sin producto') as product, count(*)::int as sample_size, coalesce(sum(bs.sale_amount), 0)::numeric as attributed_value, (array_agg(distinct bs.rms_source_type || ':' || bs.rms_source_id::text))[1:12] as case_refs from business_sales bs left join campaigns c on c.id = bs.campaign_id and c.business_id = bs.business_id where bs.business_id = $1 and bs.created_at >= $2 and bs.sale_status = 'PAID' and bs.rms_source_id is not null${salesSourceFilter} group by 1,2 order by attributed_value desc, sample_size desc limit 40`, params),
    query(`select action_type as key, status, count(*)::int as sample_size, (array_agg(distinct source_type || ':' || source_id::text))[1:12] as case_refs from rms_post_sale_actions where business_id = $1 and created_at >= $2${sourceFilter} group by action_type, status order by sample_size desc`, params),
    query("select status, count(*)::int as sample_size from rms_intelligence_insights where business_id = $1 group by status", [businessId]),
  ]);
  return {
    period: { days, since, label: `Últimos ${days} días`, filters: filterValues, scoped_case_count: scopedSourceIds?.length || null },
    caveat: "Son observaciones agrupadas por hechos registrados; no prueban causalidad.",
    bottlenecks: phases.rows.map((row) => ({ ...row, evidence_level: "OBSERVATION", sample_label: sampleLabel(row.sample_size) })),
    objections: objections.rows.map((row) => ({ ...row, evidence_level: "OBSERVATION", sample_label: sampleLabel(row.sample_size) })),
    attributed_sales: sales.rows.map((row) => ({ ...row, evidence_level: "OBSERVATION", sample_label: sampleLabel(row.sample_size) })),
    activation_2: postSale.rows.map((row) => ({ ...row, evidence_level: "OBSERVATION", sample_label: sampleLabel(row.sample_size) })),
    insight_statuses: insights.rows,
  };
}

async function listIntelligenceInsights(businessId, filters = {}) {
  const result = await query(
    `select * from rms_intelligence_insights where business_id = $1
       and ($2::text is null or status = $2)
       order by updated_at desc limit 160`,
    [businessId, filters.status ? String(filters.status).toUpperCase() : null]
  );
  return { insights: result.rows };
}

async function saveIntelligenceInsight(businessId, user, payload = {}) {
  let status;
  let priority;
  try {
    status = normalizeInsightStatus(payload.status);
    priority = normalizeInsightPriority(payload.priority);
  } catch (error) {
    throw badRequest(error.message);
  }
  const idempotencyKey = String(payload.idempotency_key || "").trim();
  if (!idempotencyKey || !String(payload.observation || "").trim() || !String(payload.recommendation || "").trim()) {
    throw badRequest("El insight exige observación y recomendación concreta, además de idempotency_key.");
  }
  const type = payload.source_type ? sourceType(payload.source_type) : null;
  const saved = await withTransaction(async (client) => {
    const existing = await client.query("select * from rms_intelligence_insights where business_id = $1 and idempotency_key = $2 for update", [businessId, idempotencyKey]);
    if (existing.rowCount) return { insight: existing.rows[0], duplicate: true };
    if (payload.source_id) {
      if (!type) throw badRequest("Todo insight de caso debe indicar el tipo RMS de su fuente.");
      const source = await client.query(
        `select 1 from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3
         union all
         select 1 from rms_machine_events where business_id = $1 and source_type = $2 and source_id = $3
         limit 1`,
        [businessId, type, payload.source_id]
      );
      if (!source.rowCount) throw badRequest("El caso que sustenta el insight no pertenece a este negocio o no tiene hechos RMS.");
    }
    if (payload.sale_id) {
      const sale = await client.query("select id from business_sales where business_id = $1 and id = $2", [businessId, payload.sale_id]);
      if (!sale.rowCount) throw badRequest("La venta que sustenta el insight no pertenece a este negocio.");
    }
    const result = await client.query(
      `insert into rms_intelligence_insights
        (business_id, source_type, source_id, lead_id, sale_id, insight_scope, observation, hypothesis, recommendation, evidence_refs, evidence_note, owner_name, priority, status, expected_metric, review_at, idempotency_key, metadata, created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$19)
       on conflict (business_id, idempotency_key) do nothing returning *`,
      [businessId, type, payload.source_id || null, payload.lead_id || null, payload.sale_id || null, payload.insight_scope === "PATTERN" ? "PATTERN" : "CASE", String(payload.observation).trim(), String(payload.hypothesis || "").trim() || null, String(payload.recommendation).trim(), JSON.stringify(asArray(payload.evidence_refs).slice(0, 40)), String(payload.evidence_note || "").trim() || null, String(payload.owner_name || "").trim() || null, priority, status, String(payload.expected_metric || "").trim() || null, payload.review_at || null, idempotencyKey, JSON.stringify(metadata(payload.metadata)), user.id]
    );
    if (!result.rowCount) {
      const duplicate = await client.query("select * from rms_intelligence_insights where business_id = $1 and idempotency_key = $2", [businessId, idempotencyKey]);
      if (duplicate.rowCount) return { insight: duplicate.rows[0], duplicate: true };
      throw badRequest("No pudimos recuperar el aprendizaje idempotente.");
    }
    const insight = result.rows[0];
    await client.query("insert into rms_intelligence_events (business_id, insight_id, event_type, event_description, metadata, created_by) values ($1,$2,'insight_saved',$3,$4::jsonb,$5)", [businessId, insight.id, "Aprendizaje guardado sin ejecutar una acción comercial.", JSON.stringify({ insight_scope: insight.insight_scope, evidence_count: asArray(payload.evidence_refs).length }), user.id]);
    return { insight, duplicate: false };
  });
  return saved;
}

async function createIntelligenceAgendaTask(businessId, user, payload = {}) {
  if (!insightCanCreateAgendaTask(payload)) throw badRequest("Confirma explícitamente antes de crear una tarea desde este aprendizaje.");
  const insight = await query("select * from rms_intelligence_insights where business_id = $1 and id = $2", [businessId, payload.insight_id]);
  if (!insight.rowCount) throw notFound("No encontramos ese insight en este negocio.");
  const row = insight.rows[0];
  if (!row.source_id || !row.source_type) throw badRequest("Este insight agregado no tiene un caso individual para crear una tarea.");
  const task = await createLeadAgendaItem(businessId, user, {
    lead_id: row.lead_id || row.source_id, source_id: row.source_id, source_type: row.source_type,
    note: String(payload.note || row.recommendation).trim(), note_type: "follow_up", next_action: String(payload.title || "Validar experimento RMS").trim(),
    reminder_at: payload.due_at || row.review_at || new Date().toISOString(), agenda_priority: row.priority, progress_percent: 0,
    metadata: { source_module: "rms_intelligence", rms_insight_id: row.id, explicit_operator_confirmation: true },
  });
  await query("insert into rms_intelligence_events (business_id, insight_id, event_type, event_description, metadata, created_by) values ($1,$2,'agenda_task_created',$3,$4::jsonb,$5)", [businessId, row.id, "Tarea creada por confirmación explícita del operador.", JSON.stringify({ agenda_note_id: task.id }), user.id]);
  return { task, insight: row };
}

module.exports = { createIntelligenceAgendaTask, intelligencePatterns, learningCase, listIntelligenceCases, listIntelligenceInsights, saveIntelligenceInsight };

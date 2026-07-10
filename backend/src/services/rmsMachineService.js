const { createLeadAgendaItem, listLeadCrmRows } = require("./leadCrmService");

const STAGES = [
  { key: "ATTENTION_CAPTURED", label: "Atencion capturada" },
  { key: "GAMIFIED_INTERACTION", label: "Interaccion gamificada" },
  { key: "INTENT_DETECTED", label: "Intencion detectada" },
  { key: "LEAD_CAPTURED", label: "Lead capturado" },
  { key: "TICKET_ACTIVE", label: "Ticket activo" },
  { key: "FOLLOW_UP_PENDING", label: "Seguimiento pendiente" },
  { key: "REDEMPTION_PENDING", label: "Redencion pendiente" },
  { key: "REDEEMED", label: "Redimido" },
  { key: "SALE_ATTRIBUTED", label: "Venta atribuida" },
  { key: "REBUY", label: "Recompra" },
  { key: "REFERRAL", label: "Referido" },
  { key: "RECOVERY", label: "Recuperacion" },
];

const STAGE_MAP = STAGES.reduce((acc, item) => ({ ...acc, [item.key]: item }), {});

function daysSince(value) {
  if (!value) return 999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function moneyNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function crmSourceType(row = {}) {
  return String(row.source_type || "PLAYER").toUpperCase();
}

function deriveStage(row = {}) {
  const purchases = Number(row.purchase_count || 0);
  const activeTickets = Number(row.active_tickets || 0);
  const redeemedTickets = Number(row.redeemed_tickets || 0);
  const expiredTickets = Number(row.expired_tickets || 0);
  const score = Number(row.score_total || row.attention_score || 0);
  const interactions = Number(row.activation_count || 0) + Number(row.games_played || 0);
  const staleDays = daysSince(row.last_interaction_at || row.created_at);
  const hasContact = Boolean(row.phone || row.email);

  if ((expiredTickets > 0 && purchases === 0) || staleDays > 45) return "RECOVERY";
  if (purchases > 1) return "REBUY";
  if (purchases > 0) return redeemedTickets > 0 ? "SALE_ATTRIBUTED" : "REBUY";
  if (redeemedTickets > 0) return "REDEEMED";
  if (activeTickets > 0) return "REDEMPTION_PENDING";
  if (hasContact && ["FOLLOW_UP", "CONTACTED"].includes(String(row.commercial_status || row.stored_status || "").toUpperCase())) {
    return "FOLLOW_UP_PENDING";
  }
  if (hasContact && score > 0) return "INTENT_DETECTED";
  if (hasContact) return "LEAD_CAPTURED";
  if (interactions > 0 || score > 0) return "GAMIFIED_INTERACTION";
  return "ATTENTION_CAPTURED";
}

function coverageType(row = {}, stage = deriveStage(row)) {
  if (Number(row.active_tickets || 0) > 0) return "ticket";
  if (Number(row.redeemed_tickets || 0) > 0) return "beneficio_redimido";
  if (Number(row.purchase_count || 0) > 0) return stage === "REBUY" ? "recompra" : "postventa";
  if (row.is_affiliate) return "referido";
  if (Number(row.activation_count || 0) > 0 || Number(row.games_played || 0) > 0) return "dinamica";
  if (stage === "RECOVERY") return "recuperacion";
  return "seguimiento";
}

function riskLabel(score) {
  if (score >= 75) return "Riesgo critico";
  if (score >= 50) return "Riesgo alto";
  if (score >= 25) return "Riesgo medio";
  return "Riesgo bajo";
}

function priorityLabel(score, row = {}) {
  if (moneyNumber(row.total_spent) >= 1000000 || moneyNumber(row.avg_ticket) >= 350000) return "Oportunidad premium";
  if (score >= 90) return "Critica";
  if (score >= 70) return "Alta";
  if (score >= 40) return "Media";
  return "Baja";
}

function priorityClass(score, row = {}) {
  if (moneyNumber(row.total_spent) >= 1000000 || moneyNumber(row.avg_ticket) >= 350000) return "premium";
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function calculateRiskScore(row = {}) {
  const staleDays = daysSince(row.last_interaction_at || row.created_at);
  let score = 0;
  if (!row.phone && !row.email) score += 28;
  if (Number(row.active_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) score += 24;
  if (Number(row.expired_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) score += 32;
  if (staleDays >= 7) score += 16;
  if (staleDays >= 30) score += 24;
  if (String(row.care_priority || "").toUpperCase() === "HIGH") score += 12;
  return Math.min(100, score);
}

function calculatePriorityScore(row = {}) {
  const base = Number(row.attention_score || 0);
  const staleDays = daysSince(row.last_interaction_at || row.created_at);
  let score = base;
  if (Number(row.active_tickets || 0) > 0) score += 24;
  if (Number(row.expired_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) score += 18;
  if (Number(row.activation_count || 0) > 0 || Number(row.games_played || 0) > 0) score += 10;
  if (Number(row.purchase_count || 0) > 0) score += 12;
  if (Number(row.redeemed_tickets || 0) > 0) score += 12;
  if (moneyNumber(row.total_spent) > 0) score += Math.min(24, Math.round(moneyNumber(row.total_spent) / 100000));
  if (staleDays >= 3 && staleDays < 30) score += 8;
  if (staleDays >= 30) score -= 12;
  if (!row.phone && !row.email) score -= 20;
  return Math.max(0, Math.min(120, Math.round(score)));
}

function revenuePotential(row = {}) {
  const avg = moneyNumber(row.avg_ticket);
  const spent = moneyNumber(row.total_spent);
  if (avg > 0) return Math.round(avg);
  if (spent > 0 && Number(row.purchase_count || 0) > 0) return Math.round(spent / Number(row.purchase_count || 1));
  if (Number(row.score_total || 0) >= 250 || Number(row.active_tickets || 0) > 0) return 250000;
  if (Number(row.activation_count || 0) > 0 || Number(row.games_played || 0) > 0) return 150000;
  return 80000;
}

function recommendedActionForStage(row = {}, stage = deriveStage(row)) {
  const channel = row.phone ? "WhatsApp" : row.email ? "email" : "captura de datos";
  const product = firstPresent(row.top_interest, row.top_product, row.top_category, "producto de interes");
  const actions = {
    ATTENTION_CAPTURED: {
      type: "capture_lead",
      title: "Capturar dato minimo",
      description: "Convertir la atencion inicial en contacto trazable antes de que la oportunidad desaparezca.",
      primary_label: "Capturar lead",
    },
    GAMIFIED_INTERACTION: {
      type: "assign_interest",
      title: "Migrar dinamica a producto",
      description: `Preguntar por ${product} y registrar interes comercial.`,
      primary_label: "Asignar producto",
    },
    INTENT_DETECTED: {
      type: "whatsapp",
      title: "Enviar propuesta de siguiente paso",
      description: `Contactar por ${channel} con una oferta concreta asociada a ${product}.`,
      primary_label: row.phone ? "Enviar WhatsApp" : "Crear tarea",
    },
    LEAD_CAPTURED: {
      type: "first_follow_up",
      title: "Crear primer seguimiento",
      description: `Clasificar temperatura y agendar contacto por ${channel}.`,
      primary_label: "Crear tarea",
    },
    TICKET_ACTIVE: {
      type: "ticket_reminder",
      title: "Recordar beneficio activo",
      description: "Usar el vencimiento como motivo de retorno y cierre.",
      primary_label: row.phone ? "Recordar WhatsApp" : "Crear tarea",
    },
    FOLLOW_UP_PENDING: {
      type: "follow_up",
      title: "Ejecutar seguimiento pendiente",
      description: firstPresent(row.recommended_action, "Cerrar el siguiente paso y registrar resultado."),
      primary_label: "Completar seguimiento",
    },
    REDEMPTION_PENDING: {
      type: "redeem_reminder",
      title: "Evitar fuga por no redimir",
      description: "Enviar recordatorio con urgencia y producto asociado.",
      primary_label: row.phone ? "Enviar recordatorio" : "Crear tarea",
    },
    REDEEMED: {
      type: "register_sale",
      title: "Registrar venta o postventa",
      description: "Medir si la redencion produjo compra y activar postventa.",
      primary_label: "Registrar venta",
    },
    SALE_ATTRIBUTED: {
      type: "post_sale",
      title: "Activar postventa",
      description: "Agradecer, validar satisfaccion y preparar recompra o referido.",
      primary_label: "Crear postventa",
    },
    REBUY: {
      type: "rebuy",
      title: "Activar recompra",
      description: `Ofrecer producto complementario o beneficio de regreso ligado a ${product}.`,
      primary_label: row.phone ? "Enviar recompra" : "Crear tarea",
    },
    REFERRAL: {
      type: "referral",
      title: "Pedir referido",
      description: "Convertir cliente satisfecho en canal de adquisicion.",
      primary_label: "Crear referido",
    },
    RECOVERY: {
      type: "recover",
      title: "Reactivar antes de perder",
      description: "Enviar ultimo incentivo o archivar si no responde.",
      primary_label: row.phone ? "Reactivar" : "Crear tarea",
    },
  };
  return actions[stage] || actions.LEAD_CAPTURED;
}

function whyNow(row = {}, stage = deriveStage(row), riskScore = calculateRiskScore(row)) {
  const reasons = [];
  if (Number(row.active_tickets || 0) > 0) reasons.push("tiene beneficio activo sin cierre");
  if (Number(row.expired_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) reasons.push("ya dejo vencer una oportunidad");
  if (Number(row.activation_count || 0) > 0 || Number(row.games_played || 0) > 0) reasons.push("interactuo con dinamicas");
  if (Number(row.purchase_count || 0) > 0) reasons.push("ya compro y puede recomprar");
  if (row.is_affiliate) reasons.push("puede multiplicar referidos");
  if (daysSince(row.last_interaction_at || row.created_at) >= 7) reasons.push("lleva varios dias sin avance");
  if (riskScore >= 50) reasons.push("riesgo de fuga elevado");
  return reasons.length ? reasons.join(", ") : `esta en etapa ${STAGE_MAP[stage]?.label || stage}`;
}

function dailySection(row = {}, stage = deriveStage(row), priorityScore = calculatePriorityScore(row), riskScore = calculateRiskScore(row)) {
  if (Number(row.active_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) return "tickets_to_redeem";
  if (stage === "RECOVERY" || riskScore >= 65) return "recover";
  if (Number(row.purchase_count || 0) > 0 && stage !== "REFERRAL") return "rebuy";
  if (row.is_affiliate || (Number(row.purchase_count || 0) > 0 && Number(row.redeemed_tickets || 0) > 0)) return "referrals";
  if (priorityScore >= 70 || String(row.care_priority || "").toUpperCase() === "HIGH") return "attend_now";
  if (daysSince(row.last_interaction_at || row.created_at) >= 7) return "recover";
  return "attend_now";
}

function opportunityFromRow(row = {}) {
  const stage = deriveStage(row);
  const priorityScore = calculatePriorityScore(row);
  const riskScore = calculateRiskScore(row);
  const action = recommendedActionForStage(row, stage);
  const revenue = revenuePotential(row);
  const section = dailySection(row, stage, priorityScore, riskScore);
  return {
    id: `${crmSourceType(row)}:${row.id}`,
    source_type: crmSourceType(row),
    source_id: row.id,
    lead_id: row.lead_id || row.id,
    name: row.name || "Contacto sin nombre",
    first_name: row.first_name || "",
    phone: row.phone || "",
    email: row.email || "",
    campaign_id: row.campaign_id || null,
    campaign_name: row.campaign_name || "",
    channel: row.channel || "",
    stage,
    stage_label: STAGE_MAP[stage]?.label || stage,
    section,
    coverage_type: coverageType(row, stage),
    priority_score: priorityScore,
    priority_label: priorityLabel(priorityScore, row),
    priority_class: priorityClass(priorityScore, row),
    risk_score: riskScore,
    risk_label: riskLabel(riskScore),
    interest_score: Number(row.score_total || row.attention_score || 0),
    revenue_potential: revenue,
    product_interest: firstPresent(row.top_interest, row.top_product, row.top_category, ""),
    active_tickets: Number(row.active_tickets || 0),
    redeemed_tickets: Number(row.redeemed_tickets || 0),
    expired_tickets: Number(row.expired_tickets || 0),
    purchase_count: Number(row.purchase_count || 0),
    total_spent: moneyNumber(row.total_spent),
    avg_ticket: moneyNumber(row.avg_ticket),
    activation_count: Number(row.activation_count || 0),
    games_played: Number(row.games_played || 0),
    active_ticket_qr_id: row.active_ticket_qr_id || null,
    care_priority: row.care_priority || "",
    care_priority_label: row.care_priority_label || "",
    last_interaction_at: row.last_interaction_at || row.created_at || null,
    days_since_interaction: daysSince(row.last_interaction_at || row.created_at),
    next_action: action,
    next_action_due_at: dueAtForSection(section),
    why_now: whyNow(row, stage, riskScore),
    raw_recommended_action: row.recommended_action || "",
  };
}

function dueAtForSection(section) {
  const now = new Date();
  const hours = {
    attend_now: 4,
    recover: 24,
    tickets_to_redeem: 6,
    rebuy: 48,
    referrals: 72,
  }[section] || 24;
  return new Date(now.getTime() + hours * 3600000).toISOString();
}

function sectionLabels() {
  return {
    attend_now: "Atender ahora",
    recover: "Recuperar antes de perder",
    tickets_to_redeem: "Tickets por redimir",
    rebuy: "Recompra sugerida",
    referrals: "Referidos potenciales",
  };
}

async function listRmsOpportunities(businessId, filters = {}) {
  const limit = Math.min(Number(filters.limit || 120), 120);
  const data = await listLeadCrmRows(businessId, { ...filters, limit, offset: filters.offset || 0 });
  const opportunities = (data.rows || []).map(opportunityFromRow)
    .sort((a, b) => b.priority_score - a.priority_score || b.risk_score - a.risk_score);
  return {
    opportunities,
    pagination: data.pagination || { total: opportunities.length, limit, offset: 0, has_more: false },
    stages: STAGES,
  };
}

async function getDailyQueue(businessId, filters = {}) {
  const { opportunities, pagination, stages } = await listRmsOpportunities(businessId, filters);
  const labels = sectionLabels();
  const sections = Object.keys(labels).map((key) => ({
    key,
    label: labels[key],
    items: opportunities.filter((item) => item.section === key).slice(0, Number(filters.section_limit || 18)),
  }));
  const metrics = rmsMetrics(opportunities);
  return {
    generated_at: new Date().toISOString(),
    sections,
    opportunities,
    metrics,
    stages,
    pagination,
  };
}

function rmsMetrics(opportunities = []) {
  const byStage = STAGES.map((stage) => ({
    ...stage,
    count: opportunities.filter((item) => item.stage === stage.key).length,
  }));
  const totalRevenuePotential = opportunities.reduce((sum, item) => sum + moneyNumber(item.revenue_potential), 0);
  const attentionStarted = opportunities.filter((item) => ["ATTENTION_CAPTURED", "GAMIFIED_INTERACTION", "INTENT_DETECTED", "LEAD_CAPTURED"].includes(item.stage)).length;
  const converted = opportunities.filter((item) => ["SALE_ATTRIBUTED", "REBUY", "REFERRAL"].includes(item.stage)).length;
  return {
    total_opportunities: opportunities.length,
    attend_now: opportunities.filter((item) => item.section === "attend_now").length,
    recover: opportunities.filter((item) => item.section === "recover").length,
    tickets_to_redeem: opportunities.filter((item) => item.section === "tickets_to_redeem").length,
    rebuy: opportunities.filter((item) => item.section === "rebuy").length,
    referrals: opportunities.filter((item) => item.section === "referrals").length,
    total_revenue_potential: totalRevenuePotential,
    high_priority: opportunities.filter((item) => item.priority_score >= 70).length,
    high_risk: opportunities.filter((item) => item.risk_score >= 50).length,
    attention_to_revenue_rate: attentionStarted ? Math.round((converted / attentionStarted) * 1000) / 10 : 0,
    by_stage: byStage,
  };
}

async function createRmsAgendaTask(businessId, user, payload = {}) {
  if (!payload.source_id) {
    const error = new Error("Falta el lead para crear la tarea RMS.");
    error.status = 400;
    throw error;
  }
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const dueAt = payload.due_at || dueAtForSection(payload.section || "attend_now");
  const actionTitle = firstPresent(payload.action_title, payload.next_action, "Accion de conversion RMS");
  const note = firstPresent(
    payload.note,
    `Maquina RMS: ${actionTitle}. Motivo: ${payload.why_now || "oportunidad priorizada por el sistema"}.`
  );
  const metadata = {
    ...(payload.metadata || {}),
    source_module: "rms_machine",
    rms_stage: payload.stage || null,
    rms_section: payload.section || null,
    rms_priority_score: Number(payload.priority_score || 0),
    rms_risk_score: Number(payload.risk_score || 0),
    rms_coverage_type: payload.coverage_type || null,
    rms_revenue_potential: moneyNumber(payload.revenue_potential),
  };
  const item = await createLeadAgendaItem(businessId, user, {
    lead_id: payload.lead_id || null,
    source_id: payload.source_id,
    source_type: sourceType,
    note,
    note_type: "follow_up",
    next_action: actionTitle,
    reminder_at: dueAt,
    agenda_priority: Number(payload.priority_score || 0) >= 85 ? "URGENT" : Number(payload.priority_score || 0) >= 65 ? "HIGH" : "MEDIUM",
    progress_percent: 0,
    checklist: [
      { label: "Contactar cliente", done: false },
      { label: "Registrar resultado", done: false },
      { label: "Mover a siguiente etapa RMS", done: false },
    ],
    metadata,
  });
  return { item };
}

module.exports = {
  STAGES,
  createRmsAgendaTask,
  getDailyQueue,
  listRmsOpportunities,
  rmsMetrics,
};


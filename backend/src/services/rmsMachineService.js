const { query, withTransaction } = require("../config/db");
const { badRequest, notFound } = require("../utils/http");
const { createLeadAgendaItem, listLeadCrmRows } = require("./leadCrmService");

const RMS_PHASES = [
  { key: "recoleccion", label: "Recolector de Oportunidades", short_label: "Recolectar" },
  { key: "alimentacion", label: "Embudo de Entrada", short_label: "Alimentar" },
  { key: "curaduria", label: "Curaduria Comercial", short_label: "Curar" },
  { key: "clasificacion", label: "Clasificador RMS", short_label: "Clasificar" },
  { key: "preprocesamiento", label: "Preprocesador Gamificado", short_label: "Gamificar" },
  { key: "procesamiento", label: "Maquina RMS de Conversion", short_label: "Procesar" },
  { key: "control_anti_fuga", label: "Control Anti-Fuga", short_label: "Controlar" },
  { key: "accion_correctiva", label: "Recuperacion RMS", short_label: "Corregir" },
  { key: "cierre", label: "Cierre Comercial", short_label: "Cerrar" },
  { key: "revenue_generado", label: "Revenue Generado", short_label: "Revenue" },
  { key: "postventa", label: "Postventa Gamificada", short_label: "Postventa" },
  { key: "inteligencia", label: "Inteligencia RMS", short_label: "Optimizar" },
];

const STAGES = RMS_PHASES;
const PHASE_KEYS = new Set(RMS_PHASES.map((phase) => phase.key));

const LEGACY_PHASE_ALIASES = {
  entrada: "alimentacion",
  atencion_inicial: "curaduria",
  interes: "clasificacion",
  activacion: "preprocesamiento",
  decision: "procesamiento",
  convertido: "revenue_generado",
  recompra: "postventa",
  fidelizacion: "inteligencia",
  referido: "inteligencia",
  recuperacion: "accion_correctiva",
};

const INDUSTRIAL_PROCESS = [
  { key: "recoleccion", label: "Recoleccion", phase: "recoleccion", description: "QR, activaciones, formularios, referidos, campanas y contactos existentes." },
  { key: "alimentacion", label: "Alimentacion", phase: "alimentacion", description: "La persona entra oficialmente como materia prima comercial RMS." },
  { key: "curaduria", label: "Curaduria", phase: "curaduria", description: "Se valida dato minimo, origen, interes, campana y calidad del contacto." },
  { key: "clasificacion", label: "Clasificacion", phase: "clasificacion", description: "Se separa por estado comercial, prioridad, ticket, temperatura y posibilidad de avance." },
  { key: "preprocesamiento", label: "Preprocesamiento gamificado", phase: "preprocesamiento", description: "Ticket, beneficio, trivia, ranking o reward pass reducen fuga antes del cierre." },
  { key: "procesamiento", label: "Procesamiento comercial", phase: "procesamiento", description: "Se ejecuta propuesta, catalogo, ticket, cotizacion, factura o tarea de venta." },
  { key: "control", label: "Control anti-fuga", phase: "control_anti_fuga", description: "Se detectan tickets por vencer, clientes sin tarea, redenciones sin venta y fases saturadas." },
  { key: "correccion", label: "Accion correctiva", phase: "accion_correctiva", description: "Reactivar, recordar, reenviar beneficio, llamar, posponer o marcar perdido." },
  { key: "cierre", label: "Cierre comercial", phase: "cierre", description: "Interes, propuesta, beneficio, cobro y pago se ensamblan en venta." },
  { key: "revenue", label: "Revenue generado", phase: "revenue_generado", description: "Venta, redencion, renovacion, recompra, referido o suscripcion medible." },
  { key: "postventa", label: "Postventa", phase: "postventa", description: "Agradecimiento, garantia, ticket proxima compra, encuesta o programa VIP." },
  { key: "retroalimentacion", label: "Retroalimentacion", phase: "inteligencia", description: "El resultado vuelve a la inteligencia RMS para optimizar campanas, ganchos y operaciones." },
];

const PHASE_OPERATIONS = {
  recoleccion: {
    primaryAction: "Capturar materia prima comercial",
    primaryActionKey: "collect_opportunities",
    suggestedMaterialType: "qr_activacion_formulario",
    materialLabel: "QR, activacion, formulario o referido",
    buttonLabel: "Recolectar",
    nextPhase: "alimentacion",
    agendaTaskType: "capture",
    whatsappTemplateKey: "initial_proposal",
  },
  alimentacion: {
    primaryAction: "Introducir lead al embudo RMS",
    primaryActionKey: "feed_machine",
    suggestedMaterialType: "registro_minimo",
    materialLabel: "Nombre, WhatsApp, origen e interes",
    buttonLabel: "Meter a maquina",
    nextPhase: "curaduria",
    agendaTaskType: "intake",
    whatsappTemplateKey: "first_contact",
  },
  curaduria: {
    primaryAction: "Validar dato y limpiar oportunidad",
    primaryActionKey: "curate_lead",
    suggestedMaterialType: "checklist_validacion",
    materialLabel: "Telefono, interes, origen, ticket y campana",
    buttonLabel: "Curar datos",
    nextPhase: "clasificacion",
    agendaTaskType: "validation",
    whatsappTemplateKey: "first_contact",
  },
  clasificacion: {
    primaryAction: "Clasificar estado comercial",
    primaryActionKey: "classify_lead",
    suggestedMaterialType: "score_estado_prioridad",
    materialLabel: "Nuevo, interesado, caliente, comprador o dormido",
    buttonLabel: "Clasificar",
    nextPhase: "preprocesamiento",
    agendaTaskType: "classification",
    whatsappTemplateKey: "send_catalog",
  },
  preprocesamiento: {
    primaryAction: "Activar gancho gamificado anti-fuga",
    primaryActionKey: "gamified_preprocess",
    suggestedMaterialType: "ticket_reward_trivia",
    materialLabel: "Ticket, beneficio, puntos, trivia o reward pass",
    buttonLabel: "Activar gancho",
    nextPhase: "procesamiento",
    agendaTaskType: "ticket_reminder",
    whatsappTemplateKey: "send_ticket",
  },
  procesamiento: {
    primaryAction: "Ejecutar operacion comercial",
    primaryActionKey: "commercial_process",
    suggestedMaterialType: "propuesta_catalogo_cotizacion",
    materialLabel: "Propuesta, catalogo, ticket, cotizacion o factura",
    buttonLabel: "Procesar",
    nextPhase: "control_anti_fuga",
    agendaTaskType: "proposal",
    whatsappTemplateKey: "send_quote",
  },
  control_anti_fuga: {
    primaryAction: "Detectar fuga o atasco",
    primaryActionKey: "quality_control",
    suggestedMaterialType: "alerta_operativa",
    materialLabel: "Ticket por vencer, sin tarea, sin respuesta o fase saturada",
    buttonLabel: "Controlar fuga",
    nextPhase: "accion_correctiva",
    agendaTaskType: "control",
    whatsappTemplateKey: "recovery",
  },
  accion_correctiva: {
    primaryAction: "Corregir, reprocesar o recuperar",
    primaryActionKey: "corrective_action",
    suggestedMaterialType: "recordatorio_ultimo_beneficio",
    materialLabel: "Recordatorio, reenviar ticket, llamada o ultimo beneficio",
    buttonLabel: "Corregir",
    nextPhase: "cierre",
    agendaTaskType: "recovery",
    whatsappTemplateKey: "recovery",
  },
  cierre: {
    primaryAction: "Ensamblar cierre comercial",
    primaryActionKey: "close_sale",
    suggestedMaterialType: "cuenta_cobro_factura_pago",
    materialLabel: "Propuesta, factura, link de pago o cuenta de cobro",
    buttonLabel: "Cerrar",
    nextPhase: "revenue_generado",
    agendaTaskType: "payment",
    whatsappTemplateKey: "send_payment",
  },
  revenue_generado: {
    primaryAction: "Registrar resultado comercial",
    primaryActionKey: "register_revenue",
    suggestedMaterialType: "venta_redencion_renovacion",
    materialLabel: "Venta, redencion, recompra, referido o suscripcion",
    buttonLabel: "Registrar revenue",
    nextPhase: "postventa",
    agendaTaskType: "post_sale",
    whatsappTemplateKey: "post_sale",
  },
  postventa: {
    primaryAction: "Empacar postventa gamificada",
    primaryActionKey: "gamified_postsale",
    suggestedMaterialType: "agradecimiento_ticket_reward",
    materialLabel: "Agradecimiento, garantia, encuesta o ticket proxima compra",
    buttonLabel: "Activar postventa",
    nextPhase: "inteligencia",
    agendaTaskType: "rebuy",
    whatsappTemplateKey: "rebuy",
  },
  inteligencia: {
    primaryAction: "Retroalimentar inteligencia RMS",
    primaryActionKey: "rms_intelligence",
    suggestedMaterialType: "aprendizaje_metricas",
    materialLabel: "Campana, gancho, vendedor, ticket, fuga y recompra",
    buttonLabel: "Optimizar",
    nextPhase: "recoleccion",
    agendaTaskType: "intelligence",
    whatsappTemplateKey: "loyalty",
  },
};

const WHATSAPP_TEMPLATES = {
  initial_proposal: "Hola {{nombre}}, gracias por interactuar con {{negocio}}. Tengo una opcion concreta que puede interesarte. Te envio la informacion?",
  first_contact: "Hola {{nombre}}, soy de {{negocio}}. Vi tu interes y quiero entender que estas buscando para enviarte la mejor opcion.",
  send_catalog: "Hola {{nombre}}, te comparto el catalogo segun lo que viste o te intereso: {{catalogo_link}}. Quieres que te recomiende una opcion?",
  send_ticket: "Hola {{nombre}}, activamos para ti este beneficio por tiempo limitado: {{ticket_link}}.",
  send_quote: "Hola {{nombre}}, te envio la propuesta con condiciones y beneficio disponible: {{propuesta_link}}.",
  send_payment: "Hola {{nombre}}, te comparto la cuenta de cobro / link de pago para finalizar tu compra: {{payment_link}}.",
  post_sale: "Gracias por tu compra, {{nombre}}. Te dejamos este beneficio para tu proxima visita: {{recompra_ticket}}.",
  rebuy: "Hola {{nombre}}, por ser cliente queremos invitarte a volver con este beneficio especial: {{ticket_link}}.",
  loyalty: "Hola {{nombre}}, por tu historial con {{negocio}} activamos una atencion especial para ti: {{reward_pass}}.",
  referral: "Hola {{nombre}}, si conoces a alguien que pueda aprovechar esto, comparte tu enlace y ambos reciben beneficio: {{referido_link}}.",
  recovery: "Hola {{nombre}}, queremos que vuelvas. Activamos este beneficio especial por tiempo limitado: {{ticket_link}}.",
};

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

function normalizePhase(value, fallback = "alimentacion") {
  const phase = String(value || "").trim().toLowerCase();
  if (LEGACY_PHASE_ALIASES[phase]) return LEGACY_PHASE_ALIASES[phase];
  return PHASE_KEYS.has(phase) ? phase : fallback;
}

function phaseLabel(phase) {
  return RMS_PHASES.find((item) => item.key === phase)?.label || phase;
}

function metadataObject(row = {}) {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
}

function sourceTypeLabel(sourceType = "") {
  return {
    PLAYER: "Lead capturado",
    MANUAL: "Ingreso manual",
    BUYER: "Comprador",
    AFFILIATE: "Afiliado / referido",
  }[String(sourceType || "").toUpperCase()] || "Lead";
}

function entryContext(row = {}, sourceType = crmSourceType(row)) {
  const metadata = metadataObject(row);
  const activationName = firstPresent(
    metadata.lead_capture_name,
    metadata.interactive_activation_name,
    metadata.activation_name,
    metadata.activation_title
  );
  const activationType = firstPresent(metadata.interactive_activation_type, metadata.activation_type);
  const campaignName = firstPresent(row.campaign_name, metadata.campaign_name);
  const channel = firstPresent(row.channel, metadata.channel, metadata.preferred_channel, metadata.source);
  const sourceLabel = firstPresent(
    metadata.source_label,
    metadata.lead_source,
    metadata.source,
    sourceTypeLabel(sourceType)
  );
  const sourceDetail = firstPresent(
    metadata.source_detail,
    metadata.attribution_subject,
    metadata.asset_title,
    metadata.form_source_detail,
    row.source_detail,
    row.company
  );
  const interest = firstPresent(
    row.top_interest,
    row.top_product,
    row.top_category,
    metadata.interest,
    metadata.favorite_product,
    metadata.product_interest,
    metadata.manual_importance_reason
  );
  const summary = [
    sourceLabel,
    campaignName ? `Campana: ${campaignName}` : "",
    activationName ? `Activacion: ${activationName}` : "",
    activationType ? `Tipo: ${activationType}` : "",
    channel ? `Canal: ${channel}` : "",
  ].filter(Boolean).join(" / ");
  return {
    source_label: sourceLabel,
    source_detail: sourceDetail,
    campaign_name: campaignName,
    activation_name: activationName,
    activation_type: activationType,
    channel,
    interest,
    summary: summary || sourceTypeLabel(sourceType),
  };
}

function deriveRmsPhase(row = {}) {
  const purchases = Number(row.purchase_count || 0);
  const activeTickets = Number(row.active_tickets || 0);
  const redeemedTickets = Number(row.redeemed_tickets || 0);
  const expiredTickets = Number(row.expired_tickets || 0);
  const score = Number(row.score_total || row.attention_score || 0);
  const interactions = Number(row.activation_count || 0) + Number(row.games_played || 0);
  const staleDays = daysSince(row.last_interaction_at || row.created_at);
  const hasContact = Boolean(row.phone || row.email);
  const status = String(row.commercial_status || row.stored_status || "").toUpperCase();

  if ((expiredTickets > 0 && purchases === 0) || staleDays > 60 || ["INACTIVE", "LOST"].includes(status)) return "accion_correctiva";
  if (activeTickets > 0 && staleDays >= 2 && purchases === 0) return "control_anti_fuga";
  if (purchases >= 3 || redeemedTickets >= 3 || moneyNumber(row.total_spent) >= 3000000 || (row.is_affiliate && purchases > 0)) return "inteligencia";
  if (purchases > 0) return "postventa";
  if (["CONVERTED", "BUYER"].includes(status) || redeemedTickets > 0) return "revenue_generado";
  if (["FOLLOW_UP", "CONTACTED"].includes(status) && hasContact) return "procesamiento";
  if (activeTickets > 0) return "preprocesamiento";
  if (hasContact && (score >= 80 || String(row.care_priority || "").toUpperCase() === "HIGH")) return "clasificacion";
  if (hasContact && interactions > 0) return "curaduria";
  if (hasContact) return "alimentacion";
  if (interactions > 0 || score > 0) return "recoleccion";
  return "recoleccion";
}

function getPhaseRecommendedOperation(rmsPhase, row = {}) {
  const phase = normalizePhase(rmsPhase);
  const config = PHASE_OPERATIONS[phase] || PHASE_OPERATIONS.alimentacion;
  const product = firstPresent(row.top_interest, row.top_product, row.top_category, row.product_interest, "producto de interes");
  const channel = row.phone ? "WhatsApp" : row.email ? "email" : "datos pendientes";
  return {
    phase,
    ...config,
    description: operationDescription(phase, product, channel),
  };
}

function operationDescription(phase, product, channel) {
  const descriptions = {
    recoleccion: "Capturar prospectos desde QR, vitrina, activacion, formulario, referido o cliente dormido.",
    alimentacion: `Introducir el lead al embudo RMS con dato minimo y canal ${channel}.`,
    curaduria: `Validar telefono, interes, origen, campana y calidad antes de operar ${product}.`,
    clasificacion: "Separar por estado comercial, temperatura, ticket, prioridad y posibilidad de avance.",
    preprocesamiento: "Aplicar gancho gamificado anti-fuga antes de que la oportunidad se enfrie.",
    procesamiento: `Ejecutar propuesta, catalogo, ticket, cotizacion o factura relacionada con ${product}.`,
    control_anti_fuga: "Detectar clientes atascados, tickets por vencer, redenciones sin venta o falta de tarea.",
    accion_correctiva: "Crear tarea urgente, recordar, reenviar beneficio, llamar, recuperar o descartar.",
    cierre: "Ensamblar interes, propuesta, beneficio, cuenta de cobro y pago.",
    revenue_generado: "Registrar venta, redencion, renovacion, recompra, referido o suscripcion.",
    postventa: "Enviar agradecimiento, garantia, encuesta, reward pass o ticket de proxima compra.",
    inteligencia: "Medir campana, gancho, vendedor, ticket, fuga, recompra y referidos para optimizar.",
  };
  return descriptions[phase] || descriptions.alimentacion;
}

function coverageType(row = {}, phase = deriveRmsPhase(row)) {
  if (Number(row.active_tickets || 0) > 0) return "ticket_con_vencimiento";
  if (Number(row.redeemed_tickets || 0) > 0) return "beneficio_redimido";
  if (Number(row.purchase_count || 0) > 0) return phase === "postventa" ? "postventa" : "revenue";
  if (row.is_affiliate) return "referido";
  if (Number(row.activation_count || 0) > 0 || Number(row.games_played || 0) > 0) return "gancho_gamificado";
  if (phase === "accion_correctiva") return "recuperacion";
  if (phase === "control_anti_fuga") return "control";
  return "seguimiento";
}

function riskLabel(score) {
  if (score >= 75) return "Fuga critica";
  if (score >= 50) return "Fuga alta";
  if (score >= 25) return "Fuga media";
  return "Fuga baja";
}

function priorityLabel(score, row = {}) {
  if (moneyNumber(row.total_spent) >= 1000000 || moneyNumber(row.avg_ticket) >= 350000) return "Premium";
  if (score >= 90) return "Urgente";
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

function calculateRmsRisk(row = {}) {
  const staleDays = daysSince(row.last_interaction_at || row.created_at);
  let score = 0;
  if (!row.phone && !row.email) score += 28;
  if (Number(row.active_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) score += 22;
  if (Number(row.expired_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) score += 34;
  if (staleDays >= 3) score += 10;
  if (staleDays >= 7) score += 14;
  if (staleDays >= 30) score += 24;
  if (String(row.care_priority || "").toUpperCase() === "HIGH") score += 10;
  return Math.min(100, score);
}

function calculateRmsPriority(row = {}) {
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

function whyNow(row = {}, phase = deriveRmsPhase(row), riskScore = calculateRmsRisk(row)) {
  const reasons = [];
  if (Number(row.active_tickets || 0) > 0) reasons.push("tiene ticket activo sin cierre");
  if (Number(row.expired_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) reasons.push("ya dejo vencer una oportunidad");
  if (Number(row.activation_count || 0) > 0 || Number(row.games_played || 0) > 0) reasons.push("interactuo con un gancho gamificado");
  if (Number(row.purchase_count || 0) > 0) reasons.push("ya compro y puede avanzar a recompra o referido");
  if (row.is_affiliate) reasons.push("puede multiplicar referidos");
  if (daysSince(row.last_interaction_at || row.created_at) >= 7) reasons.push("lleva varios dias sin avance");
  if (riskScore >= 50) reasons.push("riesgo de fuga elevado");
  return reasons.length ? reasons.join(", ") : `esta en estacion ${phaseLabel(phase)}`;
}

function dailySection(row = {}, phase = deriveRmsPhase(row), priorityScore = calculateRmsPriority(row), riskScore = calculateRmsRisk(row)) {
  if (phase === "cierre" || phase === "procesamiento") return "close_revenue";
  if (Number(row.active_tickets || 0) > 0 && Number(row.purchase_count || 0) === 0) return "tickets_to_redeem";
  if (["control_anti_fuga", "accion_correctiva"].includes(phase) || riskScore >= 65) return "recover";
  if (["postventa", "inteligencia"].includes(phase)) return "rebuy";
  if (row.is_affiliate) return "referrals";
  if (priorityScore >= 70 || String(row.care_priority || "").toUpperCase() === "HIGH") return "operate_now";
  return "operate_now";
}

function dueAtForSection(section) {
  const now = new Date();
  const hours = {
    operate_now: 4,
    recover: 24,
    tickets_to_redeem: 6,
    rebuy: 48,
    referrals: 72,
    close_revenue: 3,
  }[section] || 24;
  return new Date(now.getTime() + hours * 3600000).toISOString();
}

function sectionLabels() {
  return {
    operate_now: "Operar ahora",
    close_revenue: "Cierres y cobros",
    tickets_to_redeem: "Tickets por activar",
    rebuy: "Recompra y fidelizacion",
    referrals: "Referidos potenciales",
    recover: "Recuperar antes de perder",
  };
}

function parseOpportunityId(value = "") {
  const [sourceType, sourceId] = String(value || "").split(":");
  if (!sourceType || !sourceId) return null;
  return { source_type: crmSourceType({ source_type: sourceType }), source_id: sourceId };
}

async function stateRowsFor(businessId, rows = []) {
  const ids = rows.map((row) => row.id).filter(Boolean);
  if (!ids.length) return new Map();
  const result = await query(
    `select *
       from rms_lead_state
      where business_id = $1
        and source_id = any($2::uuid[])`,
    [businessId, ids]
  );
  return new Map(result.rows.map((row) => [`${row.source_type}:${row.source_id}`, row]));
}

function opportunityFromRow(row = {}, stateRow = null) {
  const sourceType = crmSourceType(row);
  const autoPhase = deriveRmsPhase(row);
  const stage = stateRow?.rms_phase ? normalizePhase(stateRow.rms_phase, autoPhase) : "recoleccion";
  const priorityScore = calculateRmsPriority(row);
  const riskScore = calculateRmsRisk(row);
  const action = getPhaseRecommendedOperation(stage, row);
  const revenue = moneyNumber(stateRow?.revenue_potential) || revenuePotential(row);
  const section = dailySection(row, stage, priorityScore, riskScore);
  const name = row.name || "Contacto sin nombre";
  const entry = entryContext(row, sourceType);
  return {
    id: `${sourceType}:${row.id}`,
    source_type: sourceType,
    source_id: row.id,
    lead_id: row.lead_id || row.id,
    name,
    first_name: String(name).split(/\s+/)[0] || "",
    created_at: row.created_at || null,
    phone: row.phone || "",
    email: row.email || "",
    campaign_id: row.campaign_id || null,
    campaign_name: entry.campaign_name || row.campaign_name || "",
    channel: entry.channel || row.channel || row.acquisition_channel || "",
    source_label: entry.source_label,
    source_detail: entry.source_detail,
    entry_summary: entry.summary,
    activation_name: entry.activation_name,
    activation_type: entry.activation_type,
    stage,
    stage_label: phaseLabel(stage),
    auto_stage: autoPhase,
    auto_stage_label: phaseLabel(autoPhase),
    section,
    coverage_type: coverageType(row, stage),
    priority_score: priorityScore,
    priority_label: priorityLabel(priorityScore, row),
    priority_class: priorityClass(priorityScore, row),
    risk_score: riskScore,
    risk_label: riskLabel(riskScore),
    interest_score: Number(row.score_total || row.attention_score || 0),
    revenue_potential: revenue,
    product_interest: firstPresent(entry.interest, row.favorite_product, ""),
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
    next_action: {
      type: action.primaryActionKey,
      title: action.primaryAction,
      description: action.description,
      primary_label: action.buttonLabel,
      material_type: action.suggestedMaterialType,
      material_label: action.materialLabel,
      next_phase: action.nextPhase,
      whatsapp_template_key: action.whatsappTemplateKey,
    },
    phase_operation: action,
    next_action_due_at: dueAtForSection(section),
    why_now: !stateRow && stage === "recoleccion"
      ? `entro al Recolector por ${entry.summary}`
      : whyNow(row, stage, riskScore),
    raw_recommended_action: row.recommended_action || "",
    persisted_state_id: stateRow?.id || null,
    last_operation: stateRow?.last_operation || "",
    last_material_sent: stateRow?.last_material_sent || "",
    state_metadata: stateRow?.metadata || {},
  };
}

async function listRmsOpportunities(businessId, filters = {}) {
  const limit = Math.min(Number(filters.limit || 120), 180);
  const data = await listLeadCrmRows(businessId, { ...filters, limit, offset: filters.offset || 0 });
  const stateMap = await stateRowsFor(businessId, data.rows || []);
  const opportunities = (data.rows || []).map((row) => (
    opportunityFromRow(row, stateMap.get(`${crmSourceType(row)}:${row.id}`))
  )).sort((a, b) => b.priority_score - a.priority_score || b.risk_score - a.risk_score);
  return {
    opportunities,
    pagination: data.pagination || { total: opportunities.length, limit, offset: 0, has_more: false },
    stages: RMS_PHASES,
    operations: PHASE_OPERATIONS,
    funnel: buildIntakeFunnel(opportunities),
    process_flow: buildIndustrialProcess(opportunities),
    alerts: rmsAlerts(opportunities),
  };
}

async function getDailyQueue(businessId, filters = {}) {
  const { opportunities, pagination, stages, operations, funnel, process_flow, alerts } = await listRmsOpportunities(businessId, filters);
  const labels = sectionLabels();
  const sections = Object.keys(labels).map((key) => ({
    key,
    label: labels[key],
    items: opportunities.filter((item) => item.section === key).slice(0, Number(filters.section_limit || 18)),
  }));
  const events = await listRmsEvents(businessId, { limit: 12 });
  const metrics = rmsMetrics(opportunities);
  return {
    generated_at: new Date().toISOString(),
    sections,
    opportunities,
    metrics,
    stages,
    operations,
    funnel,
    process_flow,
    alerts,
    events: events.events,
    pagination,
  };
}

function buildIntakeFunnel(opportunities = []) {
  const scans = opportunities.length + opportunities.reduce((sum, item) => sum + Number(item.games_played || 0), 0);
  const interactions = opportunities.filter((item) => item.games_played || item.activation_count || item.coverage_type === "gancho_gamificado").length;
  const captured = opportunities.filter((item) => item.phone || item.email).length;
  const protectedCount = opportunities.filter((item) => item.active_tickets || item.coverage_type !== "seguimiento").length;
  return [
    { key: "sources", label: "Recoleccion", value: Math.max(scans, opportunities.length), meta: "QR, campañas, contactos y activaciones" },
    { key: "captured", label: "Alimentacion", value: captured, meta: "Con dato minimo para entrar a la maquina" },
    { key: "curated", label: "Curaduria", value: opportunities.filter((item) => item.phone || item.email || item.product_interest).length, meta: "Dato, origen e interes revisables" },
    { key: "interactions", label: "Gancho gamificado", value: interactions, meta: "Interacciones, juegos, activaciones o respuestas" },
    { key: "protected", label: "Proteccion anti-fuga", value: protectedCount, meta: "Ticket, beneficio, recompensa o seguimiento" },
    { key: "ready", label: "Oportunidad RMS", value: opportunities.length, meta: "Materia prima lista para estaciones" },
  ];
}

function buildIndustrialProcess(opportunities = []) {
  return INDUSTRIAL_PROCESS.map((step) => {
    const phaseRows = opportunities.filter((item) => item.stage === step.phase);
    const highRisk = phaseRows.filter((item) => item.risk_score >= 50).length;
    return {
      ...step,
      count: phaseRows.length,
      risk_count: highRisk,
      revenue_potential: phaseRows.reduce((sum, item) => sum + moneyNumber(item.revenue_potential), 0),
      operation: getPhaseRecommendedOperation(step.phase),
    };
  });
}

function rmsAlerts(opportunities = []) {
  const alerts = [];
  const noContact = opportunities.filter((item) => !item.phone && !item.email);
  const activeTickets = opportunities.filter((item) => item.active_tickets > 0 && item.purchase_count === 0);
  const highRisk = opportunities.filter((item) => item.risk_score >= 65);
  const closePending = opportunities.filter((item) => ["procesamiento", "cierre"].includes(item.stage));
  if (noContact.length) {
    alerts.push({ key: "missing_data", title: "Fuga detectada", detail: `${noContact.length} oportunidades no tienen dato de contacto completo.`, action: "Completar datos", phase: "curaduria" });
  }
  if (activeTickets.length) {
    alerts.push({ key: "tickets", title: "Tickets por activar", detail: `${activeTickets.length} clientes tienen ticket activo sin venta registrada.`, action: "Recordar ticket", phase: "control_anti_fuga" });
  }
  if (closePending.length) {
    alerts.push({ key: "close", title: "Revenue pendiente", detail: `${closePending.length} clientes estan en procesamiento/cierre.`, action: "Enviar cobro o propuesta", phase: "cierre" });
  }
  if (highRisk.length) {
    alerts.push({ key: "risk", title: "Materia prima atascada", detail: `${highRisk.length} clientes muestran alto riesgo de fuga.`, action: "Crear tareas de recuperacion", phase: "accion_correctiva" });
  }
  if (!opportunities.length) {
    alerts.push({ key: "empty", title: "Materia prima insuficiente", detail: "La maquina no tiene oportunidades para procesar.", action: "Activar recolector masivo", phase: "recoleccion" });
  }
  return alerts;
}

function rmsMetrics(opportunities = []) {
  const byStage = RMS_PHASES.map((stage) => {
    const rows = opportunities.filter((item) => item.stage === stage.key);
    return {
      ...stage,
      count: rows.length,
      risk_count: rows.filter((item) => item.risk_score >= 50).length,
      pending_tasks: rows.filter((item) => !item.last_operation).length,
      revenue_potential: rows.reduce((sum, item) => sum + moneyNumber(item.revenue_potential), 0),
      operation: getPhaseRecommendedOperation(stage.key),
    };
  });
  const totalRevenuePotential = opportunities.reduce((sum, item) => sum + moneyNumber(item.revenue_potential), 0);
  const intake = opportunities.filter((item) => ["recoleccion", "alimentacion", "curaduria", "clasificacion", "preprocesamiento", "procesamiento", "control_anti_fuga", "accion_correctiva", "cierre"].includes(item.stage)).length;
  const converted = opportunities.filter((item) => ["revenue_generado", "postventa", "inteligencia"].includes(item.stage)).length;
  return {
    total_opportunities: opportunities.length,
    operate_now: opportunities.filter((item) => item.section === "operate_now").length,
    attend_now: opportunities.filter((item) => item.section === "operate_now").length,
    recover: opportunities.filter((item) => item.section === "recover").length,
    tickets_to_redeem: opportunities.filter((item) => item.section === "tickets_to_redeem").length,
    close_revenue: opportunities.filter((item) => item.section === "close_revenue").length,
    rebuy: opportunities.filter((item) => item.section === "rebuy").length,
    referrals: opportunities.filter((item) => item.section === "referrals").length,
    total_revenue_potential: totalRevenuePotential,
    high_priority: opportunities.filter((item) => item.priority_score >= 70).length,
    high_risk: opportunities.filter((item) => item.risk_score >= 50).length,
    attention_to_revenue_rate: intake ? Math.round((converted / intake) * 1000) / 10 : 0,
    by_stage: byStage,
  };
}

function fillTemplate(template = "", item = {}, overrides = {}) {
  const values = {
    nombre: item.first_name || item.name || "cliente",
    negocio: overrides.business_name || "nuestro negocio",
    catalogo_link: overrides.catalog_url || "[catalogo]",
    ticket_link: overrides.ticket_url || item.active_ticket_qr_id || "[ticket]",
    propuesta_link: overrides.proposal_url || "[propuesta]",
    payment_link: overrides.payment_url || "[link de pago]",
    recompra_ticket: overrides.rebuy_ticket || "[beneficio de recompra]",
    reward_pass: overrides.reward_pass || "[reward pass]",
    referido_link: overrides.referral_url || "[link de referido]",
  };
  return Object.entries(values).reduce((text, [key, value]) => text.replace(new RegExp(`{{${key}}}`, "g"), value), template);
}

function whatsappUrl(phone, message) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${encodeURIComponent(digits)}?text=${encodeURIComponent(message)}`;
}

async function findOpportunity(businessId, sourceType, sourceId) {
  const data = await listRmsOpportunities(businessId, { limit: 180 });
  const item = data.opportunities.find((opportunity) => (
    opportunity.source_type === sourceType && String(opportunity.source_id) === String(sourceId)
  ));
  if (!item) throw notFound("No se encontro la oportunidad RMS.");
  return item;
}

async function moveRmsLeadPhase(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const sourceId = payload.source_id;
  const toPhase = normalizePhase(payload.to_phase || payload.rms_phase, "");
  if (!sourceId || !toPhase) throw badRequest("Faltan source_id o fase RMS.");
  const current = await query(
    `select * from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, sourceId]
  );
  const fromPhase = current.rows[0]?.rms_phase || null;
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  const result = await withTransaction(async (client) => {
    const state = await client.query(
      `insert into rms_lead_state
        (business_id, source_type, source_id, lead_id, rms_phase, priority, recommended_action, last_operation, last_material_sent, revenue_potential, metadata, created_by, updated_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $12)
       on conflict (business_id, source_type, source_id)
       do update set
        lead_id = excluded.lead_id,
        rms_phase = excluded.rms_phase,
        priority = excluded.priority,
        recommended_action = coalesce(excluded.recommended_action, rms_lead_state.recommended_action),
        last_operation = coalesce(excluded.last_operation, rms_lead_state.last_operation),
        last_material_sent = coalesce(excluded.last_material_sent, rms_lead_state.last_material_sent),
        revenue_potential = greatest(excluded.revenue_potential, rms_lead_state.revenue_potential),
        metadata = rms_lead_state.metadata || excluded.metadata,
        updated_by = excluded.updated_by,
        updated_at = now()
       returning *`,
      [
        businessId,
        sourceType,
        sourceId,
        payload.lead_id || null,
        toPhase,
        payload.priority || "MEDIUM",
        payload.recommended_action || null,
        payload.last_operation || `move_to_${toPhase}`,
        payload.last_material_sent || null,
        moneyNumber(payload.revenue_potential),
        JSON.stringify(metadata),
        user.id,
      ]
    );
    const movement = await client.query(
      `insert into rms_phase_movements
        (business_id, source_type, source_id, lead_id, from_phase, to_phase, moved_by, reason, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       returning *`,
      [businessId, sourceType, sourceId, payload.lead_id || null, fromPhase, toPhase, user.id, payload.reason || null, JSON.stringify(metadata)]
    );
    await client.query(
      `insert into rms_machine_events
        (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, material_type, created_by, metadata)
       values ($1, $2, $3, $4, 'phase_moved', 'Cliente movido de fase', $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        businessId,
        sourceType,
        sourceId,
        payload.lead_id || null,
        `${phaseLabel(fromPhase || "alimentacion")} -> ${phaseLabel(toPhase)}`,
        toPhase,
        payload.last_operation || `move_to_${toPhase}`,
        payload.last_material_sent || null,
        user.id,
        JSON.stringify({ ...metadata, from_phase: fromPhase, to_phase: toPhase, movement_id: movement.rows[0].id }),
      ]
    );
    return { state: state.rows[0], movement: movement.rows[0] };
  });
  return result;
}

async function createRmsAgendaTask(businessId, user, payload = {}) {
  if (!payload.source_id) throw badRequest("Falta el lead para crear la tarea RMS.");
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const phase = normalizePhase(payload.stage || payload.rms_phase, "alimentacion");
  const operation = getPhaseRecommendedOperation(phase);
  const dueAt = payload.due_at || dueAtForSection(payload.section || "operate_now");
  const actionTitle = firstPresent(payload.action_title, payload.next_action, operation.primaryAction, "Accion RMS");
  const note = firstPresent(
    payload.note,
    `Maquina RMS: ${actionTitle}. Motivo: ${payload.why_now || "oportunidad priorizada por la maquina"}.`
  );
  const metadata = {
    ...(payload.metadata || {}),
    source_module: "rms_machine",
    rms_phase: phase,
    rms_stage: phase,
    rms_section: payload.section || null,
    rms_operation_key: payload.operation_key || operation.primaryActionKey,
    rms_material_type: payload.material_type || operation.suggestedMaterialType,
    rms_priority_score: Number(payload.priority_score || 0),
    rms_risk_score: Number(payload.risk_score || 0),
    rms_coverage_type: payload.coverage_type || null,
    rms_revenue_potential: moneyNumber(payload.revenue_potential),
  };
  const item = await createLeadAgendaItem(businessId, user, {
    lead_id: payload.lead_id || payload.source_id,
    source_id: payload.source_id,
    source_type: sourceType,
    note,
    note_type: "follow_up",
    next_action: actionTitle,
    reminder_at: dueAt,
    agenda_priority: Number(payload.priority_score || 0) >= 85 ? "URGENT" : Number(payload.priority_score || 0) >= 65 ? "HIGH" : "MEDIUM",
    progress_percent: 0,
    checklist: [
      { label: operation.buttonLabel || "Ejecutar operacion", done: false },
      { label: "Registrar resultado", done: false },
      { label: "Mover a siguiente fase RMS", done: false },
    ],
    metadata,
  });
  await query(
    `insert into rms_machine_events
      (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, material_type, created_by, metadata)
     values ($1, $2, $3, $4, 'task_created', 'Tarea RMS creada', $5, $6, $7, $8, $9, $10::jsonb)`,
    [
      businessId,
      sourceType,
      payload.source_id,
      payload.lead_id || null,
      actionTitle,
      phase,
      metadata.rms_operation_key,
      metadata.rms_material_type,
      user.id,
      JSON.stringify({ note_id: item.id, ...metadata }),
    ]
  );
  return { item };
}

async function executeRmsAction(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const sourceId = payload.source_id;
  if (!sourceId) throw badRequest("Falta source_id para operar la oportunidad.");
  const item = await findOpportunity(businessId, sourceType, sourceId);
  const phase = normalizePhase(payload.rms_phase || item.stage);
  const operation = getPhaseRecommendedOperation(phase, item);
  const materialType = payload.material_type || operation.suggestedMaterialType;
  const template = WHATSAPP_TEMPLATES[payload.whatsapp_template_key || operation.whatsappTemplateKey] || WHATSAPP_TEMPLATES.initial_proposal;
  const message = fillTemplate(template, item, payload.template_values || {});
  let agenda = null;
  if (payload.create_task !== false) {
    agenda = await createRmsAgendaTask(businessId, user, {
      source_id: sourceId,
      source_type: sourceType,
      lead_id: item.lead_id,
      stage: phase,
      section: item.section,
      action_title: payload.action_title || operation.primaryAction,
      next_action: operation.description,
      due_at: payload.due_at || item.next_action_due_at,
      why_now: item.why_now,
      priority_score: item.priority_score,
      risk_score: item.risk_score,
      coverage_type: item.coverage_type,
      revenue_potential: item.revenue_potential,
      operation_key: payload.operation_key || operation.primaryActionKey,
      material_type: materialType,
      metadata: {
        rms_opportunity_id: item.id,
        campaign_id: item.campaign_id || null,
        product_interest: item.product_interest || null,
      },
    });
  }
  await query(
    `insert into rms_machine_events
      (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, material_type, created_by, metadata)
     values ($1, $2, $3, $4, 'operation_executed', $5, $6, $7, $8, $9, $10, $11::jsonb)`,
    [
      businessId,
      sourceType,
      sourceId,
      item.lead_id || null,
      operation.primaryAction,
      message,
      phase,
      payload.operation_key || operation.primaryActionKey,
      materialType,
      user.id,
      JSON.stringify({ agenda_note_id: agenda?.item?.id || null, whatsapp_template: operation.whatsappTemplateKey }),
    ]
  );
  await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType,
    source_id: sourceId,
    lead_id: item.lead_id,
    to_phase: payload.advance_phase ? operation.nextPhase : phase,
    priority: item.priority_score >= 85 ? "URGENT" : item.priority_score >= 65 ? "HIGH" : "MEDIUM",
    recommended_action: operation.primaryAction,
    last_operation: operation.primaryAction,
    last_material_sent: materialType,
    revenue_potential: item.revenue_potential,
    reason: payload.advance_phase ? "Operacion ejecutada y fase avanzada" : "Operacion ejecutada",
    metadata: { action_payload: payload.operation_key || operation.primaryActionKey },
  });
  return {
    opportunity: item,
    agenda,
    operation,
    whatsapp_message: message,
    whatsapp_url: whatsappUrl(item.phone, message),
  };
}

async function executeRmsBulkAction(businessId, user, payload = {}) {
  const ids = Array.isArray(payload.opportunity_ids) ? payload.opportunity_ids.slice(0, 40) : [];
  if (!ids.length) throw badRequest("Selecciona al menos una oportunidad RMS.");
  const results = [];
  for (const id of ids) {
    const parsed = parseOpportunityId(id);
    if (!parsed) continue;
    try {
      results.push(await executeRmsAction(businessId, user, {
        ...payload,
        source_type: parsed.source_type,
        source_id: parsed.source_id,
      }));
    } catch (error) {
      results.push({ error: error.message, id });
    }
  }
  return { count: results.length, results };
}

async function listRmsEvents(businessId, params = {}) {
  const limit = Math.min(Math.max(Number(params.limit || 30), 1), 100);
  const result = await query(
    `select *
       from rms_machine_events
      where business_id = $1
      order by created_at desc
      limit $2`,
    [businessId, limit]
  );
  return { events: result.rows };
}

module.exports = {
  STAGES,
  RMS_PHASES,
  WHATSAPP_TEMPLATES,
  createRmsAgendaTask,
  executeRmsAction,
  executeRmsBulkAction,
  getDailyQueue,
  getPhaseRecommendedOperation,
  listRmsEvents,
  listRmsOpportunities,
  moveRmsLeadPhase,
  rmsMetrics,
};

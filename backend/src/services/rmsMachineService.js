const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createLeadAgendaItem, createLeadNote, listLeadCrmRows } = require("./leadCrmService");
const { randomBytes } = require("crypto");

const RMS_PHASES = [
  { key: "recoleccion", label: "Leads recolectados", short_label: "Recolectar" },
  { key: "alimentacion", label: "Curaduría", short_label: "Curaduría" },
  { key: "curaduria", label: "Clasificador", short_label: "Clasificador" },
  { key: "clasificacion", label: "Activación 1", short_label: "Activación 1" },
  { key: "preprocesamiento", label: "Control de calidad 1", short_label: "Control calidad 1" },
  { key: "procesamiento", label: "Evaluación", short_label: "Evaluación" },
  { key: "control_anti_fuga", label: "Riesgos de fuga", short_label: "Riesgos de fuga" },
  { key: "accion_correctiva", label: "Negociación", short_label: "Negociación" },
  { key: "cierre", label: "Ventas atribuidas", short_label: "Ventas atribuidas" },
  { key: "revenue_generado", label: "Control de calidad 2", short_label: "Control calidad 2" },
  { key: "postventa", label: "Activación 2", short_label: "Activación 2" },
  { key: "inteligencia", label: "Inteligencia RMS", short_label: "Inteligencia" },
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
  { key: "curaduria", label: "Clasificador", phase: "curaduria", description: "Se asigna producto o servicio interno para contactar al lead con una oferta clara." },
  { key: "clasificacion", label: "Activación 1", phase: "clasificacion", description: "Se define y envía la propuesta: catálogo, productos con precio, beneficio, ticket o activación; queda registrada antes de esperar respuesta." },
  { key: "preprocesamiento", label: "Control de calidad 1", phase: "preprocesamiento", description: "Ticket, beneficio, trivia, ranking o reward pass reducen fuga antes del cierre." },
  { key: "procesamiento", label: "Evaluación", phase: "procesamiento", description: "Se espera y registra la respuesta del lead frente a la propuesta enviada para decidir negociación, corrección o cierre." },
  { key: "control", label: "Riesgos de fuga", phase: "control_anti_fuga", description: "Se detectan tickets por vencer, clientes sin tarea, redenciones sin venta y fases saturadas." },
  { key: "correccion", label: "Negociación", phase: "accion_correctiva", description: "Reactivar, recordar, reenviar beneficio, llamar, posponer o marcar perdido." },
  { key: "cierre", label: "Ventas atribuidas", phase: "cierre", description: "Interes, propuesta, beneficio, cobro y pago se ensamblan en venta." },
  { key: "revenue", label: "Control de calidad 2", phase: "revenue_generado", description: "Venta, redencion, renovacion, recompra, referido o suscripcion medible." },
  { key: "postventa", label: "Postventa", phase: "postventa", description: "Agradecimiento, garantia, ticket proxima compra, encuesta o programa VIP." },
  { key: "optimizar", label: "Inteligencia RMS", phase: "inteligencia", description: "El resultado vuelve a la inteligencia RMS para optimizar campanas, ganchos y operaciones." },
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
    primaryAction: "Clasificar por producto o servicio",
    primaryActionKey: "product_classification",
    suggestedMaterialType: "inventario_productos_servicios",
    materialLabel: "Producto interno, servicio, categoria e interes declarado",
    buttonLabel: "Clasificar producto",
    nextPhase: "clasificacion",
    agendaTaskType: "validation",
    whatsappTemplateKey: "first_contact",
  },
  clasificacion: {
    primaryAction: "Activar propuesta comercial",
    primaryActionKey: "activate_commercial_proposal",
    suggestedMaterialType: "catalogo_productos_beneficio_ticket",
    materialLabel: "Catálogo, productos con precio, beneficio, ticket o activación interactiva",
    buttonLabel: "Activar y enviar a Evaluación",
    nextPhase: "procesamiento",
    agendaTaskType: "activation",
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

function normalizeProductLookup(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function inventoryProductsForBusiness(businessId) {
  const result = await query(
    `select id, name, sku, barcode, category, brand, unit_price, status
     from business_inventory_products
     where business_id = $1 and status <> 'ARCHIVED'
     order by updated_at desc, name asc
     limit 500`,
    [businessId]
  );
  return result.rows;
}

function productClassificationFor(row = {}, stateRow = null, inventoryProducts = []) {
  const metadata = metadataObject(row);
  const stateMetadata = stateRow?.metadata && typeof stateRow.metadata === "object" ? stateRow.metadata : {};
  const manualProductId = stateMetadata.classified_product_id || stateMetadata.product_classification_id || null;
  const manualProductName = stateMetadata.classified_product_name || stateMetadata.product_classification_name || "";
  if (manualProductId || manualProductName) {
    const product = manualProductId ? inventoryProducts.find((item) => String(item.id) === String(manualProductId)) : null;
    return {
      product_id: manualProductId || product?.id || null,
      product_name: manualProductName || product?.name || "",
      product_category: stateMetadata.classified_product_category || product?.category || "",
      source: stateMetadata.classification_source || "manual_curados",
      confidence: Number(stateMetadata.classification_confidence || 1),
      is_manual: true,
    };
  }
  const activationProductId = firstPresent(
    metadata.rms_intake?.product_interest_id,
    metadata.rms_intake?.product_id,
    metadata.activation_form?.product_interest_id,
    metadata.activation_form?.product_id,
    metadata.product_interest_id,
    metadata.inventory_product_id
  );
  if (activationProductId) {
    const product = inventoryProducts.find((item) => String(item.id) === String(activationProductId));
    if (product) {
      return {
        product_id: product.id,
        product_name: product.name,
        product_category: product.category || "",
        source: "auto_activation_product",
        confidence: 1,
        is_manual: false,
      };
    }
  }
  const activationProductName = firstPresent(
    metadata.rms_intake?.product_interest_mode === "PROMOTED_PRODUCT" ? metadata.rms_intake?.product_interest : "",
    metadata.activation_form?.product_interest_mode === "PROMOTED_PRODUCT" ? metadata.activation_form?.product_interest : "",
    metadata.activation_form?.product_name
  );
  if (activationProductName) {
    const product = inventoryProducts.find((item) => normalizeProductLookup(item.name) === normalizeProductLookup(activationProductName));
    return {
      product_id: product?.id || null,
      product_name: product?.name || activationProductName,
      product_category: product?.category || "",
      source: "auto_activation_product",
      confidence: product?.id ? 1 : 0.85,
      is_manual: false,
    };
  }
  const interest = firstPresent(
    row.top_interest,
    row.top_product,
    row.top_category,
    row.product_interest,
    metadata.rms_intake?.product_interest,
    metadata.rms_intake?.interest,
    metadata.interest,
    metadata.favorite_product,
    metadata.product_interest
  );
  const needle = normalizeProductLookup(interest);
  if (!needle) {
    return { product_id: null, product_name: "", product_category: "", source: "missing_interest", confidence: 0, is_manual: false };
  }
  const scored = inventoryProducts
    .map((product) => {
      const candidates = [product.name, product.sku, product.barcode, product.category, product.brand].map(normalizeProductLookup).filter(Boolean);
      let score = 0;
      if (candidates.some((candidate) => candidate === needle)) score = 1;
      else if (candidates.some((candidate) => candidate.includes(needle) || needle.includes(candidate))) score = 0.72;
      return { product, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const match = scored[0];
  if (!match) {
    return { product_id: null, product_name: interest, product_category: "", source: "interest_without_inventory_match", confidence: 0.35, is_manual: false };
  }
  return {
    product_id: match.product.id,
    product_name: match.product.name,
    product_category: match.product.category || "",
    source: "auto_inventory_match",
    confidence: match.score,
    is_manual: false,
  };
}

function activationFormSummary(row = {}) {
  const metadata = metadataObject(row);
  const form = metadata.activation_form && typeof metadata.activation_form === "object" ? metadata.activation_form : {};
  const summary = Array.isArray(form.summary) ? form.summary : [];
  return summary
    .map((item) => ({
      key: String(item.key || "").slice(0, 80),
      label: String(item.label || item.key || "Dato").slice(0, 120),
      value: Array.isArray(item.value) ? item.value.join(", ") : String(item.value ?? ""),
      rms_field: String(item.rms_field || "custom").slice(0, 80),
    }))
    .filter((item) => item.value)
    .slice(0, 8);
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
  if (purchases > 0 || ["CONVERTED", "BUYER"].includes(status)) return "cierre";
  if (redeemedTickets > 0) return "revenue_generado";
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
    curaduria: `Clasificar el lead contra inventario interno segun su interes en ${product}.`,
    clasificacion: "Definir qué se envía: catálogo, productos con precio, beneficio, ticket o activación; documentar la atención y pasar a Evaluación a esperar respuesta.",
    preprocesamiento: "Aplicar gancho gamificado anti-fuga antes de que la oportunidad se enfrie.",
    procesamiento: `Esperar y evaluar la respuesta a la propuesta enviada sobre ${product}; decidir seguimiento, negociación o cierre.`,
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

async function recentStateRowsForBusiness(businessId, limit = 240, phase = "") {
  const normalizedPhase = phase ? normalizePhase(phase, "") : "";
  const params = [businessId, Math.min(Math.max(Number(limit || 240), 1), 500)];
  const phaseClause = normalizedPhase ? "and rms_phase = $3" : "";
  if (normalizedPhase) params.push(normalizedPhase);
  const result = await query(
    `select *
       from rms_lead_state
      where business_id = $1
        ${phaseClause}
      order by updated_at desc
      limit $2`,
    params
  );
  return result.rows || [];
}

async function leadRowsForStateRefs(businessId, refs = [], filters = {}) {
  const byType = refs.reduce((acc, row) => {
    const type = crmSourceType({ source_type: row.source_type });
    if (!acc[type]) acc[type] = [];
    acc[type].push(row.source_id);
    return acc;
  }, {});
  const rows = [];
  for (const [sourceType, ids] of Object.entries(byType)) {
    const data = await listLeadCrmRows(businessId, {
      source_type: sourceType,
      source_ids: ids.slice(0, 120),
      limit: Math.min(ids.length, 120),
      offset: 0,
    });
    rows.push(...(data.leads || data.rows || []));
  }
  return rows;
}

function opportunityFromRow(row = {}, stateRow = null, inventoryProducts = []) {
  const sourceType = crmSourceType(row);
  const autoPhase = deriveRmsPhase(row);
  const stage = stateRow?.rms_phase ? normalizePhase(stateRow.rms_phase, autoPhase) : autoPhase;
  const priorityScore = calculateRmsPriority(row);
  const riskScore = calculateRmsRisk(row);
  const action = getPhaseRecommendedOperation(stage, row);
  const revenue = moneyNumber(stateRow?.revenue_potential) || revenuePotential(row);
  const section = dailySection(row, stage, priorityScore, riskScore);
  const name = row.name || "Contacto sin nombre";
  const entry = entryContext(row, sourceType);
  const productClassification = productClassificationFor(row, stateRow, inventoryProducts);
  const formSummary = activationFormSummary(row);
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
    classified_product_id: productClassification.product_id,
    classified_product_name: productClassification.product_name,
    classified_product_category: productClassification.product_category,
    classification_source: productClassification.source,
    classification_confidence: productClassification.confidence,
    classification_is_manual: productClassification.is_manual,
    capture_summary: formSummary,
    rms_intake: metadataObject(row).rms_intake || {},
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
  const phaseFilter = normalizePhase(filters.rms_phase || filters.phase, "");
  const lite = ["1", "true", true].includes(filters.lite);
  const data = await listLeadCrmRows(businessId, {
    ...filters,
    ...(phaseFilter ? { rms_phase: phaseFilter } : {}),
    limit,
    offset: filters.offset || 0,
  });
  const baseRows = data.leads || data.rows || [];
  const recentStateRows = await recentStateRowsForBusiness(businessId, phaseFilter ? limit : 240, phaseFilter);
  const baseKeys = new Set(baseRows.map((row) => `${crmSourceType(row)}:${row.id}`));
  const missingStateRows = recentStateRows.filter((row) => !baseKeys.has(`${crmSourceType(row)}:${row.source_id}`));
  const extraRows = missingStateRows.length
    ? await leadRowsForStateRefs(businessId, missingStateRows, filters)
    : [];
  const mergedRows = [...baseRows];
  extraRows.forEach((row) => {
    const key = `${crmSourceType(row)}:${row.id}`;
    if (!baseKeys.has(key)) {
      baseKeys.add(key);
      mergedRows.push(row);
    }
  });
  const stateMap = new Map([
    ...recentStateRows.map((row) => [`${crmSourceType(row)}:${row.source_id}`, row]),
    ...Array.from((await stateRowsFor(businessId, mergedRows)).entries()),
  ]);
  const needsInventory = !phaseFilter || ["curaduria", "clasificacion"].includes(phaseFilter);
  const inventoryProducts = needsInventory ? await inventoryProductsForBusiness(businessId) : [];
  const opportunities = mergedRows.map((row) => (
    opportunityFromRow(row, stateMap.get(`${crmSourceType(row)}:${row.id}`), inventoryProducts)
  )).sort((a, b) => b.priority_score - a.priority_score || b.risk_score - a.risk_score);
  return {
    opportunities,
    pagination: data.pagination || { total: opportunities.length, limit, offset: 0, has_more: false },
    stages: RMS_PHASES,
    operations: PHASE_OPERATIONS,
    funnel: lite ? [] : buildIntakeFunnel(opportunities),
    process_flow: lite ? [] : buildIndustrialProcess(opportunities),
    alerts: lite ? [] : rmsAlerts(opportunities),
    scope: phaseFilter ? { mode: "station", phase: phaseFilter, lite } : { mode: "machine", phase: "", lite },
  };
}

async function getDailyQueue(businessId, filters = {}) {
  const { opportunities, pagination, stages, operations, funnel, process_flow, alerts, scope } = await listRmsOpportunities(businessId, filters);
  const lite = ["1", "true", true].includes(filters.lite);
  const labels = sectionLabels();
  const sections = Object.keys(labels).map((key) => ({
    key,
    label: labels[key],
    items: opportunities.filter((item) => item.section === key).slice(0, Number(filters.section_limit || 18)),
  }));
  const events = lite ? { events: [] } : await listRmsEvents(businessId, { limit: 12 });
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
    scope,
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
    { key: "curated", label: "Curados", value: opportunities.filter((item) => item.phone || item.email || item.product_interest).length, meta: "Calidad del embudo y producto interno" },
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
  const existingActivation = current.rows[0]?.metadata?.activation_one || null;
  const requestedActivation = metadata.activation_one || null;
  if (normalizePhase(fromPhase, "") === "clasificacion" && toPhase === "procesamiento" && !existingActivation?.sent_at && !requestedActivation?.sent_at) {
    throw badRequest("Antes de enviar a Evaluación debes registrar la propuesta, los materiales y la atención en Activación 1.");
  }
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

function activationOneMaterialLabels(materials = []) {
  const labels = {
    catalog: "Catálogo",
    products: "Productos con precio",
    benefit: "Beneficio",
    ticket: "Ticket",
    interactive: "Activación interactiva",
    attachments: "Documentos adjuntos",
    payment: "Cobro",
  };
  return [...new Set((Array.isArray(materials) ? materials : []).map((item) => labels[String(item || "").toLowerCase()]).filter(Boolean))];
}

function rmsPublicBaseUrl() {
  return String(env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "");
}

function activationAttachmentUrl(token) {
  return `${rmsPublicBaseUrl()}/api/public/rms-attachments/${encodeURIComponent(token)}`;
}

function activationPayment(payload = {}) {
  const input = payload && typeof payload === "object" ? payload : {};
  const mode = String(input.mode || "NONE").toUpperCase();
  const allowedModes = new Set(["NONE", "PAYMENT_LINK", "INVOICE", "COLLECTION_ACCOUNT", "SIMPLE_COLLECTION"]);
  if (!allowedModes.has(mode)) throw badRequest("El medio de cobro no es válido.");
  const dueDate = input.due_at ? new Date(input.due_at) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) throw badRequest("La fecha límite de cobro no es válida.");
  const payment = {
    mode,
    label: {
      NONE: "Sin cobro en esta oferta",
      PAYMENT_LINK: "Link de cobro",
      INVOICE: "Factura",
      COLLECTION_ACCOUNT: "Cuenta de cobro",
      SIMPLE_COLLECTION: "Cobro simple",
    }[mode],
    url: String(input.url || "").trim().slice(0, 1800),
    instructions: String(input.instructions || "").trim().slice(0, 1800),
    reference: String(input.reference || "").trim().slice(0, 180),
    amount: Number.isFinite(Number(input.amount)) && Number(input.amount) >= 0 ? Number(input.amount) : null,
    currency: String(input.currency || "COP").trim().slice(0, 8) || "COP",
    due_at: dueDate ? dueDate.toISOString() : null,
  };
  if (payment.mode === "PAYMENT_LINK") {
    try {
      const url = new URL(payment.url);
      if (!/^https?:$/.test(url.protocol)) throw new Error("protocol");
    } catch {
      throw badRequest("Agrega un link de cobro válido que comience por http:// o https://.");
    }
  }
  if (payment.mode !== "NONE" && !payment.url && !payment.instructions) {
    throw badRequest("Describe cómo debe pagar el lead o agrega el link de cobro.");
  }
  return payment;
}

function paymentMessageBlock(payment = {}) {
  if (!payment || payment.mode === "NONE") return "";
  const parts = [`Cobro: ${payment.label}.`];
  if (payment.amount !== null) parts.push(`Valor: ${payment.currency} ${payment.amount.toLocaleString("es-CO")}.`);
  if (payment.reference) parts.push(`Referencia: ${payment.reference}.`);
  if (payment.due_at) parts.push(`Vence: ${new Date(payment.due_at).toLocaleString("es-CO")}.`);
  if (payment.url) parts.push(`Pagar aquí: ${payment.url}`);
  if (payment.instructions) parts.push(payment.instructions);
  return parts.join("\n");
}

async function createActivationAttachments(businessId, item, sourceType, sourceId, activationNoteId, assetIds = [], userId = null) {
  const normalizedIds = [...new Set((Array.isArray(assetIds) ? assetIds : []).map((id) => String(id || "").trim()).filter(Boolean))].slice(0, 6);
  if (!normalizedIds.length) return [];
  const assets = await query(
    `select id, title, description, file_name, file_type, file_size
       from digital_assets
      where business_id = $1 and is_active = true and id = any($2::uuid[])`,
    [businessId, normalizedIds]
  );
  if (assets.rowCount !== normalizedIds.length) throw badRequest("Uno o más adjuntos no pertenecen a este negocio o están inactivos.");
  const byId = new Map(assets.rows.map((asset) => [String(asset.id), asset]));
  const created = [];
  for (const assetId of normalizedIds) {
    const asset = byId.get(assetId);
    const publicToken = randomBytes(24).toString("base64url");
    const result = await query(
      `insert into rms_activation_attachments
        (business_id, source_type, source_id, lead_id, activation_note_id, asset_id, public_token, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       returning id, asset_id, public_token, sent_at`,
      [businessId, sourceType, sourceId, item.lead_id || null, activationNoteId, asset.id, publicToken, JSON.stringify({ title: asset.title, file_name: asset.file_name, file_type: asset.file_type, sent_by: userId })]
    );
    created.push({ ...result.rows[0], title: asset.title, description: asset.description, file_name: asset.file_name, file_type: asset.file_type, file_size: asset.file_size, url: activationAttachmentUrl(publicToken) });
  }
  return created;
}

function activationFollowupPlan(item = {}, sentAt = new Date()) {
  const sentTime = new Date(sentAt).getTime();
  const baseTime = Number.isFinite(sentTime) ? sentTime : Date.now();
  const name = item.name || "el lead";
  const product = item.classified_product_name || item.product_interest || item.top_interest || "la propuesta";
  return [
    { sequence: 1, delay_hours: 4, action_title: "Confirmar recepción de propuesta", suggested_message: `Hola ${name}, quería confirmar si pudiste revisar ${product}. Estoy atento para resolver dudas.` },
    { sequence: 2, delay_hours: 24, action_title: "Resolver interés u objeción", suggested_message: `Hola ${name}, ¿qué te pareció la propuesta que te enviamos? Puedo ayudarte con precio, beneficio o disponibilidad.` },
    { sequence: 3, delay_hours: 72, action_title: "Último seguimiento de Activación 1", suggested_message: `Hola ${name}, cierro este seguimiento por ahora. Si quieres retomar ${product}, te acompaño con la mejor opción.` },
  ].map((entry) => ({ ...entry, due_at: new Date(baseTime + entry.delay_hours * 60 * 60 * 1000).toISOString() }));
}

async function scheduleActivationFollowups(businessId, item, sourceType, sourceId, activationNoteId, plan = []) {
  const scheduled = [];
  for (const followup of plan) {
    const result = await query(
      `insert into rms_activation_followups
        (business_id, source_type, source_id, lead_id, activation_note_id, sequence, due_at, action_title, suggested_message, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       on conflict (business_id, source_type, source_id, activation_note_id, sequence)
       do update set due_at = excluded.due_at, action_title = excluded.action_title, suggested_message = excluded.suggested_message, metadata = rms_activation_followups.metadata || excluded.metadata
       returning *`,
      [businessId, sourceType, sourceId, item.lead_id || null, activationNoteId, followup.sequence, followup.due_at, followup.action_title, followup.suggested_message, JSON.stringify({ source_module: "rms_activation_followup", delay_hours: followup.delay_hours })]
    );
    scheduled.push(result.rows[0]);
  }
  return scheduled;
}

async function executeActivationOne(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const sourceId = payload.source_id;
  if (!sourceId) throw badRequest("Falta el lead para ejecutar Activación 1.");
  const item = await findOpportunity(businessId, sourceType, sourceId);
  if (normalizePhase(item.stage) !== "clasificacion") {
    throw badRequest("Este lead debe estar en Activación 1 para enviarlo a Evaluación.");
  }
  const materials = activationOneMaterialLabels(payload.materials);
  if (!materials.length) throw badRequest("Selecciona al menos un material enviado.");
  const proposalSummary = String(payload.proposal_summary || "").trim();
  const attentionNote = String(payload.attention_note || "").trim();
  if (!payload.contact_consent_confirmed) throw badRequest("Confirma que el lead autorizó el canal comercial antes de enviar la propuesta.");
  if (!proposalSummary || !attentionNote) throw badRequest("Describe la propuesta y cómo fue atendido el lead antes de enviarlo a Evaluación.");
  const selectedProducts = (Array.isArray(payload.products) ? payload.products : [])
    .filter((product) => product && String(product.name || "").trim())
    .slice(0, 12)
    .map((product) => ({
      id: product.id || null,
      name: String(product.name).trim().slice(0, 240),
      price: Number.isFinite(Number(product.price)) ? Number(product.price) : null,
      currency: String(product.currency || "COP").slice(0, 8),
    }));
  const channel = String(payload.channel || "WhatsApp").trim().slice(0, 80);
  const catalogUrl = String(payload.catalog_url || "").trim().slice(0, 1200);
  const benefitSummary = String(payload.benefit_summary || "").trim().slice(0, 1200);
  const ticketUrl = String(payload.ticket_url || "").trim().slice(0, 1800);
  if (ticketUrl) {
    try {
      const url = new URL(ticketUrl);
      if (!/^https?:$/.test(url.protocol)) throw new Error("protocol");
    } catch {
      throw badRequest("El link del ticket debe comenzar por http:// o https://.");
    }
  }
  const payment = activationPayment(payload.payment);
  const message = String(payload.message || proposalSummary).trim().slice(0, 5000);
  const productText = selectedProducts.length
    ? selectedProducts.map((product) => `${product.name}${product.price === null ? "" : ` (${product.currency} ${product.price.toLocaleString("es-CO")})`}`).join(", ")
    : "No se detallaron productos";
  const noteText = [
    `Activación 1 enviada por ${channel}.`,
    `Material enviado: ${materials.join(", ")}.`,
    `Propuesta: ${proposalSummary}`,
    `Productos: ${productText}.`,
    catalogUrl ? `Catálogo: ${catalogUrl}.` : "",
    benefitSummary ? `Beneficio o ticket: ${benefitSummary}.` : "",
    ticketUrl ? `Ticket: ${ticketUrl}.` : "",
    paymentMessageBlock(payment),
    `Atención: ${attentionNote}`,
    "El lead pasa a Evaluación para esperar y registrar su respuesta.",
  ].filter(Boolean).join("\n");
  const metadata = {
    source_module: "rms_activation_1",
    rms_phase: "clasificacion",
    sent_at: new Date().toISOString(),
    materials: (Array.isArray(payload.materials) ? payload.materials : []).map((entry) => String(entry || "").toLowerCase()).filter(Boolean),
    material_labels: materials,
    products: selectedProducts,
    catalog_url: catalogUrl || null,
    benefit_summary: benefitSummary || null,
    ticket_url: ticketUrl || null,
    payment,
    proposal_summary: proposalSummary,
    attention_note: attentionNote,
    channel,
    contact_consent_confirmed: true,
    message,
    interactive_activation_id: payload.interactive_activation_id || null,
  };
  const followupPlan = activationFollowupPlan(item, metadata.sent_at);
  metadata.followup_plan = followupPlan.map(({ sequence, due_at, action_title, delay_hours }) => ({ sequence, due_at, action_title, delay_hours }));
  const note = await createLeadNote(businessId, user, sourceId, sourceType, {
    note: noteText,
    note_type: "commercial",
    metadata,
  });
  const attachments = await createActivationAttachments(
    businessId,
    item,
    sourceType,
    sourceId,
    note.id,
    payload.attachment_asset_ids,
    user.id
  );
  const attachmentSummary = attachments.map((attachment) => ({
    id: attachment.id,
    asset_id: attachment.asset_id,
    title: attachment.title,
    file_name: attachment.file_name,
    file_type: attachment.file_type,
    url: attachment.url,
  }));
  const deliveryMessage = [
    message,
    attachments.length ? `Documentos para descargar:\n${attachments.map((attachment) => `• ${attachment.title || attachment.file_name}: ${attachment.url}`).join("\n")}` : "",
    ticketUrl ? `Ticket: ${ticketUrl}` : "",
    paymentMessageBlock(payment),
  ].filter(Boolean).join("\n\n").slice(0, 5000);
  metadata.attachments = attachmentSummary;
  metadata.message = deliveryMessage;
  await query(
    `update lead_notes set metadata = metadata || $2::jsonb where id = $1`,
    [note.id, JSON.stringify({ activation_one: metadata })]
  );
  const followups = await scheduleActivationFollowups(businessId, item, sourceType, sourceId, note.id, followupPlan);
  await query(
    `insert into rms_machine_events
      (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, material_type, created_by, metadata)
     values ($1, $2, $3, $4, 'activation_one_sent', 'Activación 1 enviada', $5, 'clasificacion', 'activate_commercial_proposal', $6, $7, $8::jsonb)`,
    [businessId, sourceType, sourceId, item.lead_id || null, proposalSummary, materials.join(", "), user.id, JSON.stringify({ ...metadata, note_id: note.id, followup_ids: followups.map((followup) => followup.id) })]
  );
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType,
    source_id: sourceId,
    lead_id: item.lead_id,
    to_phase: "procesamiento",
    priority: item.priority_score >= 85 ? "URGENT" : item.priority_score >= 65 ? "HIGH" : "MEDIUM",
    recommended_action: "Esperar respuesta del lead y evaluar la propuesta enviada",
    last_operation: "activation_one_sent",
    last_material_sent: materials.join(", "),
    revenue_potential: item.revenue_potential,
    reason: "Activación 1 enviada; el lead queda en Evaluación esperando respuesta.",
    metadata: { activation_one: { ...metadata, note_id: note.id } },
  });
  return {
    opportunity: item,
    note,
    movement,
    followups,
    materials,
    attachments,
    payment,
    whatsapp_message: deliveryMessage,
    whatsapp_url: whatsappUrl(item.phone, deliveryMessage),
  };
}

const EVALUATION_RESPONSE_LABELS = {
  INTERESTED: "Interesado",
  PRICE_QUESTION: "Pregunta por precio",
  NEEDS_TIME: "Necesita tiempo",
  NOT_INTERESTED: "No interesado",
  NO_RESPONSE: "Sin respuesta",
  MEETING_BOOKED: "Reunión agendada",
};

async function recordRmsEvaluationResponse(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const sourceId = payload.source_id;
  const responseStatus = String(payload.response_status || "").toUpperCase();
  const responseNote = String(payload.response_note || "").trim();
  if (!EVALUATION_RESPONSE_LABELS[responseStatus]) throw badRequest("Selecciona una respuesta válida del lead.");
  if (!responseNote) throw badRequest("Describe la respuesta o el contexto recibido del lead.");
  const item = await findOpportunity(businessId, sourceType, sourceId);
  if (normalizePhase(item.stage) !== "procesamiento") throw badRequest("Este lead debe estar en Evaluación para registrar su respuesta.");
  const response = {
    status: responseStatus,
    label: EVALUATION_RESPONSE_LABELS[responseStatus],
    note: responseNote.slice(0, 3000),
    received_at: new Date().toISOString(),
    recorded_by: user.id,
  };
  const note = await createLeadNote(businessId, user, sourceId, sourceType, {
    note: `Evaluación · respuesta del lead: ${response.label}.\n${response.note}`,
    note_type: "commercial",
    metadata: { source_module: "rms_evaluation", rms_phase: "procesamiento", activation_one_response: response },
  });
  const cancelled = await query(
    `update rms_activation_followups
        set status = case when $4 = 'NO_RESPONSE' then status else 'RESPONDED' end,
            response_status = $4,
            response_note = $5,
            resolved_at = case when $4 = 'NO_RESPONSE' then resolved_at else now() end
      where business_id = $1 and source_type = $2 and source_id = $3
        and status = 'SCHEDULED'
      returning id`,
    [businessId, sourceType, sourceId, responseStatus, response.note]
  );
  await query(
    `update rms_lead_state
        set metadata = metadata || $4::jsonb,
            last_operation = 'evaluation_response_recorded',
            recommended_action = $5,
            updated_by = $6,
            updated_at = now()
      where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, sourceId, JSON.stringify({ activation_one_response: response }), `Evaluar ${response.label.toLowerCase()} y decidir siguiente fase`, user.id]
  );
  await query(
    `insert into rms_machine_events
      (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, material_type, created_by, metadata)
     values ($1, $2, $3, $4, 'evaluation_response_recorded', 'Respuesta del lead registrada', $5, 'procesamiento', 'evaluate_activation_response', 'response', $6, $7::jsonb)`,
    [businessId, sourceType, sourceId, item.lead_id || null, `${response.label}: ${response.note}`, user.id, JSON.stringify({ response, note_id: note.id, cancelled_followups: cancelled.rowCount })]
  );
  return { note, response, cancelled_followups: cancelled.rowCount };
}

async function processDueActivationFollowups(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 100);
  return withTransaction(async (client) => {
    const due = await client.query(
      `select * from rms_activation_followups
        where status = 'SCHEDULED' and due_at <= now()
        order by due_at asc
        limit $1
        for update skip locked`,
      [limit]
    );
    let created = 0;
    let skipped = 0;
    for (const followup of due.rows) {
      const stateResult = await client.query(
        `select rms_phase, metadata from rms_lead_state
          where business_id = $1 and source_type = $2 and source_id = $3
          for update`,
        [followup.business_id, followup.source_type, followup.source_id]
      );
      const state = stateResult.rows[0];
      const response = state?.metadata?.activation_one_response;
      const hasMeaningfulResponse = response?.status && response.status !== "NO_RESPONSE";
      if (!state || state.rms_phase !== "procesamiento" || hasMeaningfulResponse) {
        await client.query(
          `update rms_activation_followups
              set status = $2, resolved_at = now(), response_status = coalesce($3, response_status)
            where id = $1`,
          [followup.id, hasMeaningfulResponse ? "RESPONDED" : "SKIPPED", response?.status || null]
        );
        skipped += 1;
        continue;
      }
      const agenda = await client.query(
        `insert into lead_notes
          (business_id, lead_id, source_type, source_id, note, note_type, next_action, reminder_at, agenda_priority, progress_percent, checklist, metadata, created_by)
         values ($1, $2, $3, $4, $5, 'follow_up', $6, now(), 'HIGH', 0, $7::jsonb, $8::jsonb, null)
         returning id`,
        [
          followup.business_id,
          followup.lead_id || null,
          followup.source_type,
          followup.source_id,
          `Seguimiento inteligente de Activación 1. ${followup.action_title}.\nMensaje sugerido: ${followup.suggested_message || "Revisar propuesta enviada."}`,
          followup.action_title,
          JSON.stringify([{ label: "Revisar respuesta del lead", done: false }, { label: "Contactar por el canal indicado", done: false }, { label: "Registrar resultado en Evaluación", done: false }]),
          JSON.stringify({ source_module: "rms_activation_followup", followup_id: followup.id, activation_note_id: followup.activation_note_id, suggested_message: followup.suggested_message || null }),
        ]
      );
      await client.query(
        `update rms_activation_followups
            set status = 'ACTION_CREATED', agenda_note_id = $2, executed_at = now()
          where id = $1`,
        [followup.id, agenda.rows[0].id]
      );
      await client.query(
        `insert into rms_machine_events
          (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, material_type, metadata)
         values ($1, $2, $3, $4, 'activation_followup_due', 'Seguimiento RMS creado', $5, 'procesamiento', 'activation_followup', 'follow_up', $6::jsonb)`,
        [followup.business_id, followup.source_type, followup.source_id, followup.lead_id || null, followup.action_title, JSON.stringify({ followup_id: followup.id, agenda_note_id: agenda.rows[0].id, sequence: followup.sequence })]
      );
      created += 1;
    }
    return { scanned: due.rowCount, created, skipped };
  });
}

function startActivationFollowupWorker(options = {}) {
  const intervalMs = Math.max(Number(options.interval_ms || 60000), 15000);
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await processDueActivationFollowups();
      if (result.created || result.skipped) console.log("RMS activation followups processed", result);
    } catch (error) {
      console.error("RMS activation followup worker error:", error.message);
    } finally {
      running = false;
    }
  };
  const initial = setTimeout(tick, 15000);
  const interval = setInterval(tick, intervalMs);
  return () => {
    clearTimeout(initial);
    clearInterval(interval);
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

async function downloadActivationAttachment(publicToken) {
  const token = String(publicToken || "").trim();
  if (!token || token.length < 20) throw notFound("Adjunto no encontrado.");
  const result = await query(
    `select aa.id, aa.business_id, aa.lead_id, aa.source_type, aa.source_id,
            da.title, da.file_name, da.file_type, da.file_data_url
       from rms_activation_attachments aa
       join digital_assets da on da.id = aa.asset_id and da.business_id = aa.business_id and da.is_active = true
      where aa.public_token = $1`,
    [token]
  );
  const row = result.rows[0];
  if (!row) throw notFound("Adjunto no encontrado o desactivado.");
  const dataUrl = String(row.file_data_url || "");
  const match = dataUrl.match(/^data:([^;,]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) throw notFound("El archivo adjunto ya no está disponible.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw notFound("El archivo adjunto no es válido.");
  await query(
    `update rms_activation_attachments
        set opened_at = coalesce(opened_at, now()), open_count = open_count + 1
      where id = $1`,
    [row.id]
  );
  await query(
    `insert into lead_events (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, metadata)
     values ($1, $2, $3, $4, 'activation_attachment_opened', 'Adjunto comercial abierto', $5, $6::jsonb)`,
    [row.business_id, row.lead_id || null, row.source_type, row.source_id, `Se abrió el adjunto "${row.title || row.file_name}" enviado desde Activación 1.`, JSON.stringify({ attachment_id: row.id, file_name: row.file_name })]
  );
  return { buffer, file_name: row.file_name || "adjunto", file_type: row.file_type || match[1] };
}

module.exports = {
  STAGES,
  RMS_PHASES,
  WHATSAPP_TEMPLATES,
  createRmsAgendaTask,
  downloadActivationAttachment,
  executeActivationOne,
  executeRmsAction,
  executeRmsBulkAction,
  getDailyQueue,
  getPhaseRecommendedOperation,
  listRmsEvents,
  listRmsOpportunities,
  moveRmsLeadPhase,
  processDueActivationFollowups,
  recordRmsEvaluationResponse,
  rmsMetrics,
  startActivationFollowupWorker,
};

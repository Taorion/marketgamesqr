const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createLeadAgendaItem, createLeadNote, listLeadCrmRows } = require("./leadCrmService");
const { randomBytes } = require("crypto");

// Fuente única de verdad: conserva los IDs y ordena las transiciones comerciales.
const RMS_FLOW_ORDER = [
  { key: "recoleccion", label: "Leads recolectados", short_label: "Recolectar" },
  { key: "alimentacion", label: "Curaduría", short_label: "Curaduría" },
  { key: "curaduria", label: "Clasificador", short_label: "Clasificador" },
  { key: "clasificacion", label: "Activación 1", short_label: "Activación 1" },
  { key: "preprocesamiento", label: "Control de calidad 1", short_label: "Control calidad 1" },
  { key: "procesamiento", label: "Evaluación", short_label: "Evaluación" },
  { key: "accion_correctiva", label: "Negociación", short_label: "Negociación" },
  { key: "control_anti_fuga", label: "Riesgos de fuga", short_label: "Riesgos de fuga" },
  { key: "cierre", label: "Ventas atribuidas", short_label: "Ventas atribuidas" },
  { key: "revenue_generado", label: "Control de calidad 2", short_label: "Control calidad 2" },
  { key: "postventa", label: "Activación 2", short_label: "Activación 2" },
  { key: "inteligencia", label: "Inteligencia RMS", short_label: "Inteligencia" },
];

const RMS_PHASES = RMS_FLOW_ORDER;
const STAGES = RMS_PHASES;
const PHASE_KEYS = new Set(RMS_PHASES.map((phase) => phase.key));
const RMS_FLOW_NEXT_PHASE = Object.freeze({
  recoleccion: "alimentacion", alimentacion: "curaduria", curaduria: "clasificacion",
  clasificacion: "preprocesamiento", preprocesamiento: "procesamiento",
  procesamiento: "accion_correctiva", accion_correctiva: "control_anti_fuga",
  control_anti_fuga: "cierre", cierre: "revenue_generado",
  revenue_generado: "postventa", postventa: "inteligencia", inteligencia: "recoleccion",
});

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
  { key: "clasificacion", label: "Activación 1", phase: "clasificacion", description: "Se prepara el primer contacto, se confirma el envío de una oferta y se programa el seguimiento para medir respuesta." },
  { key: "preprocesamiento", label: "Control de calidad 1", phase: "preprocesamiento", description: "Ticket, beneficio, trivia, ranking o reward pass reducen fuga antes del cierre." },
  { key: "procesamiento", label: "Evaluación", phase: "procesamiento", description: "Se ejecuta propuesta, catalogo, ticket, cotizacion, factura o tarea de venta." },
  { key: "control", label: "Riesgos de fuga", phase: "control_anti_fuga", description: "Se detectan tickets por vencer, clientes sin tarea, redenciones sin venta y fases saturadas." },
  { key: "correccion", label: "Negociación", phase: "accion_correctiva", description: "Reactivar, recordar, reenviar beneficio, llamar, posponer o marcar perdido." },
  { key: "cierre", label: "Ventas atribuidas", phase: "cierre", description: "Interes, propuesta, beneficio, cobro y pago se ensamblan en venta." },
  { key: "revenue", label: "Control de calidad 2", phase: "revenue_generado", description: "Venta, redencion, renovacion, recompra, referido o suscripcion medible." },
  { key: "postventa", label: "Postventa", phase: "postventa", description: "Agradecimiento, garantia, ticket proxima compra, encuesta o programa VIP." },
  { key: "optimizar", label: "Inteligencia RMS", phase: "inteligencia", description: "El resultado vuelve a la inteligencia RMS para optimizar campanas, ganchos y operaciones." },
].sort((left, right) => RMS_FLOW_ORDER.findIndex((phase) => phase.key === left.phase) - RMS_FLOW_ORDER.findIndex((phase) => phase.key === right.phase));

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
    primaryAction: "Activar oferta y primer contacto",
    primaryActionKey: "activate_offer",
    suggestedMaterialType: "oferta_canal_mensaje_seguimiento",
    materialLabel: "Oferta, canal, mensaje, seguimiento y respuesta",
    buttonLabel: "Activar contacto",
    nextPhase: "preprocesamiento",
    agendaTaskType: "activation_follow_up",
    whatsappTemplateKey: "send_catalog",
  },
  preprocesamiento: {
    primaryAction: "Validar claridad antes de Evaluación",
    primaryActionKey: "quality_gate_1",
    suggestedMaterialType: "contacto_propuesta_origen_siguiente_paso",
    materialLabel: "Contacto, consentimiento, propuesta, oferta, origen y siguiente paso",
    buttonLabel: "Revisar calidad 1",
    nextPhase: "procesamiento",
    agendaTaskType: "ticket_reminder",
    whatsappTemplateKey: "send_ticket",
  },
  procesamiento: {
    primaryAction: "Evaluar respuesta y abrir negociación",
    primaryActionKey: "evaluate_commercial_response",
    suggestedMaterialType: "propuesta_catalogo_cotizacion",
    materialLabel: "Propuesta, catalogo, ticket, cotizacion o factura",
    buttonLabel: "Enviar a Negociación",
    nextPhase: "accion_correctiva",
    agendaTaskType: "proposal",
    whatsappTemplateKey: "send_quote",
  },
  control_anti_fuga: {
    primaryAction: "Validar riesgo antes de atribuir venta",
    primaryActionKey: "risk_review",
    suggestedMaterialType: "alerta_operativa",
    materialLabel: "Ticket por vencer, sin tarea, sin respuesta o fase saturada",
    buttonLabel: "Liberar a Ventas atribuidas",
    nextPhase: "cierre",
    agendaTaskType: "control",
    whatsappTemplateKey: "recovery",
  },
  accion_correctiva: {
    primaryAction: "Negociar condición comercial",
    primaryActionKey: "commercial_negotiation",
    suggestedMaterialType: "objecion_contraoferta_condicion",
    materialLabel: "Objeción, propuesta, contraoferta, beneficio o descuento",
    buttonLabel: "Enviar a Riesgos de fuga",
    nextPhase: "control_anti_fuga",
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
    primaryAction: "Validar integridad del revenue y continuidad",
    primaryActionKey: "quality_gate_2",
    suggestedMaterialType: "venta_valor_fuente_evidencia_postventa",
    materialLabel: "Cliente, venta, valor, producto, fuente, evidencia y postventa",
    buttonLabel: "Revisar calidad 2",
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
    curaduria: `Clasificar el lead contra inventario interno segun su interes en ${product}.`,
    clasificacion: "Preparar el primer contacto, confirmar la oferta enviada y agendar el seguimiento para medir respuesta.",
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
  const stage = stateRow?.rms_phase ? normalizePhase(stateRow.rms_phase, autoPhase) : "recoleccion";
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

function assertRmsPhaseTransition(fromPhase, toPhase, payload = {}) {
  const from = normalizePhase(fromPhase, "");
  if (!from || from === toPhase) return;
  if (toPhase === "inteligencia" && String(payload.reason || "").trim()) return;
  const allowed = from === "control_anti_fuga"
    ? ["cierre", "accion_correctiva"]
    : [RMS_FLOW_NEXT_PHASE[from]].filter(Boolean);
  if (!allowed.includes(toPhase)) {
    throw badRequest(`${phaseLabel(from)} solo puede continuar a ${allowed.map(phaseLabel).join(" o ")}.`);
  }
  if (from === "control_anti_fuga" && toPhase === "accion_correctiva") {
    const recovery = payload.metadata?.recovery_decision === "NEGOTIATION";
    if (!recovery || !String(payload.reason || "").trim()) {
      throw badRequest("El regreso a Negociación exige una decisión de recuperación y su razón.");
    }
  }
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
  assertRmsPhaseTransition(fromPhase, toPhase, { ...payload, metadata });
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

async function recordRmsWorkflowEvent(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  await query(
    `insert into rms_machine_events
      (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, created_by, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
    [
      businessId, sourceType, payload.source_id, payload.lead_id || null,
      payload.event_type, payload.event_title, payload.event_description || null,
      payload.rms_phase, payload.operation_key || payload.event_type, user.id,
      JSON.stringify(payload.metadata || {}),
    ]
  );
}

const RMS_EVALUATION_ROUTES = {
  NEGOTIATION: {
    phase: "accion_correctiva",
    label: "Negociación",
    action: "Continuar la conversación y acordar condiciones",
  },
  PAID_SALE: {
    phase: "accion_correctiva",
    label: "Negociación",
    action: "Registrar pago, producto, costos y atribución de la venta",
  },
  MISSING_INFORMATION: {
    phase: "accion_correctiva",
    label: "Negociación",
    action: "Acordar qué información falta y el siguiente compromiso",
  },
  NURTURE: {
    phase: "accion_correctiva",
    label: "Negociación",
    action: "Programar nutrición y seguimiento sin presionar la compra",
  },
  NOT_QUALIFIED: {
    phase: "inteligencia",
    label: "Inteligencia RMS",
    action: "Conservar el aprendizaje y excluir el caso de la presión comercial",
  },
};

const RMS_EVALUATION_DESTINATIONS = {
  NEGOTIATION: RMS_EVALUATION_ROUTES.NEGOTIATION,
};

function rmsEvaluationSummary(response, route) {
  if (route.phase === "cierre") return "El caso fue dirigido a Ventas atribuidas para registrar el pago, producto, costos y atribución.";
  if (route.phase === "accion_correctiva") return "El caso fue dirigido a Negociación para acordar las condiciones y el siguiente compromiso.";
  if (response === "PAID_SALE") return "El cliente confirmó la compra desde Activación 1; falta dejar la venta atribuida.";
  if (response === "NEGOTIATION") return "El cliente tiene intención de compra y requiere acordar condiciones.";
  if (response === "MISSING_INFORMATION") return "El cliente necesita información antes de tomar la decisión.";
  if (response === "NURTURE") return "El cliente no compra ahora; se conserva en una ruta de nutrición y seguimiento.";
  return `El caso no califica por ahora y queda documentado en ${route.label}.`;
}

async function recordRmsEvaluationResponse(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  const response = String(payload.response || "").toUpperCase();
  const destination = String(payload.destination || "").trim().toUpperCase();
  const route = destination ? RMS_EVALUATION_DESTINATIONS[destination] : RMS_EVALUATION_ROUTES[response];
  if (!RMS_EVALUATION_ROUTES[response]) throw badRequest("Selecciona una decisión comercial válida.");
  if (destination && !route) throw badRequest("Selecciona Negociación o Ventas atribuidas como estación de destino.");
  const note = String(payload.note || "").trim()
    || `Resultado de Evaluación: ${response}. Destino elegido: ${route.label}.`;
  const evaluation = {
    response,
    destination: destination || (route.phase === "cierre" ? "ATTRIBUTED_SALES" : route.phase === "accion_correctiva" ? "NEGOTIATION" : null),
    route: route.phase,
    route_label: route.label,
    need: String(payload.need || "").trim() || null,
    desired_outcome: String(payload.desired_outcome || "").trim() || null,
    recommended_product: String(payload.recommended_product || "").trim() || null,
    budget_amount: payload.budget_amount === null || payload.budget_amount === undefined ? null : moneyNumber(payload.budget_amount),
    currency: String(payload.currency || "COP").trim().toUpperCase().slice(0, 8) || "COP",
    decision_maker: String(payload.decision_maker || "").trim() || null,
    urgency: String(payload.urgency || "MEDIUM").toUpperCase(),
    objections: String(payload.objections || "").trim() || null,
    next_action: String(payload.next_action || "").trim() || (response === "PAID_SALE" ? "Confirmar pago y condiciones con el cliente" : null),
    next_action_at: payload.next_action_at || null,
    note,
    evaluated_at: new Date().toISOString(),
    evaluated_by: user.id,
  };
  const historyNote = await createLeadNote(businessId, user, payload.source_id, sourceType, {
    note: `Evaluación · ${route.label}. ${rmsEvaluationSummary(response, route)}`,
    note_type: "commercial",
    metadata: {
      source_module: "rms_evaluation",
      rms_evaluation: evaluation,
    },
  });
  let agenda = null;
  let agendaWarning = null;
  if (evaluation.next_action || evaluation.next_action_at) {
    try {
      agenda = await createRmsAgendaTask(businessId, user, {
        source_id: payload.source_id,
        source_type: sourceType,
        lead_id: item.lead_id || payload.lead_id || null,
        stage: route.phase,
        action_title: evaluation.next_action || route.action,
        note: `Evaluación RMS: ${note}`,
        due_at: evaluation.next_action_at || undefined,
        priority_score: evaluation.urgency === "URGENT" ? 95 : evaluation.urgency === "HIGH" ? 75 : evaluation.urgency === "LOW" ? 35 : 55,
        revenue_potential: evaluation.budget_amount ?? item.revenue_potential,
        metadata: { rms_evaluation_note_id: historyNote.id, rms_evaluation_response: response, rms_evaluation_destination: evaluation.destination },
      });
    } catch (error) {
      agendaWarning = error?.message || "No se pudo crear la tarea automática.";
    }
  }
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType,
    source_id: payload.source_id,
    lead_id: item.lead_id || payload.lead_id || null,
    to_phase: route.phase,
    priority: evaluation.urgency,
    recommended_action: route.action,
    last_operation: route.phase === "accion_correctiva" ? "evaluation_to_negotiation" : `evaluation_${response.toLowerCase()}`,
    last_material_sent: "evaluacion_comercial",
    revenue_potential: evaluation.budget_amount ?? item.revenue_potential,
    reason: rmsEvaluationSummary(response, route),
    metadata: {
      rms_evaluation: evaluation,
      rms_evaluation_note_id: historyNote.id,
      rms_evaluation_agenda_note_id: agenda?.item?.id || null,
      rms_evaluation_agenda_warning: agendaWarning,
      rms_evaluation_destination: evaluation.destination,
    },
  });
  if (response === "PAID_SALE") {
    await recordRmsWorkflowEvent(businessId, user, {
      source_type: sourceType,
      source_id: payload.source_id,
      lead_id: item.lead_id || payload.lead_id || null,
      event_type: "payment_reported",
      event_title: "Pago informado por el cliente",
      event_description: "El pago fue reportado; falta confirmar producto, valor, condición acordada y soporte antes de atribuir la venta.",
      rms_phase: "accion_correctiva",
      metadata: { rms_evaluation: evaluation, movement_id: movement.movement?.id || null },
    });
    await recordRmsWorkflowEvent(businessId, user, {
      source_type: sourceType,
      source_id: payload.source_id,
      lead_id: item.lead_id || payload.lead_id || null,
      event_type: "commercial_confirmation_started",
      event_title: "Confirmación comercial iniciada",
      event_description: "El caso quedó en Negociación para verificar pago, producto, valor, condición y soporte.",
      rms_phase: "accion_correctiva",
      metadata: { rms_evaluation: evaluation, movement_id: movement.movement?.id || null },
    });
  }
  return { evaluation, route, note: historyNote, agenda, agenda_warning: agendaWarning, ...movement };
}

function rmsCommercialConfirmationFromPayload(payload = {}, user = {}) {
  return {
    status: "CONFIRMED",
    product_name: String(payload.product_name || "").trim(),
    amount: moneyNumber(payload.amount),
    currency: String(payload.currency || "COP").trim().toUpperCase().slice(0, 8) || "COP",
    payment_reference: String(payload.payment_reference || "").trim(),
    evidence: String(payload.evidence || "").trim(),
    responsible: String(payload.responsible || user.name || user.email || "").trim() || null,
    confirmed_at: payload.confirmed_at || new Date().toISOString(),
    note: String(payload.note || "").trim() || null,
  };
}

async function recordRmsCommercialConfirmation(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "accion_correctiva") throw badRequest("La confirmación comercial solo se registra desde Negociación.");
  const confirmation = rmsCommercialConfirmationFromPayload(payload, user);
  const missing = [
    !confirmation.product_name && "producto o servicio",
    confirmation.amount <= 0 && "valor acordado",
    !confirmation.payment_reference && "método o referencia de pago",
    !confirmation.evidence && "evidencia o comprobante",
    !confirmation.responsible && "responsable",
  ].filter(Boolean);
  if (missing.length) throw badRequest(`Antes de proteger la venta confirma: ${missing.join(", ")}.`);
  const note = await createLeadNote(businessId, user, payload.source_id, sourceType, {
    note: `Confirmación comercial. ${confirmation.product_name} por ${confirmation.amount} ${confirmation.currency}. ${confirmation.note || "Condición y soporte confirmados."}`,
    note_type: "commercial",
    metadata: { source_module: "rms_commercial_confirmation", commercial_confirmation: confirmation },
  });
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    to_phase: "control_anti_fuga", priority: "HIGH",
    recommended_action: "Validar que el acuerdo no tenga riesgo antes de atribuir la venta",
    last_operation: "commercial_condition_confirmed", last_material_sent: confirmation.product_name,
    revenue_potential: confirmation.amount,
    reason: "Condición comercial confirmada; pasa a validación final anti-fuga.",
    metadata: { commercial_confirmation: confirmation, commercial_confirmation_note_id: note.id },
  });
  await recordRmsWorkflowEvent(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    event_type: "commercial_condition_confirmed", event_title: "Condición comercial confirmada",
    event_description: "Producto, valor, pago y evidencia fueron confirmados antes de la validación anti-fuga.",
    rms_phase: "control_anti_fuga", metadata: { commercial_confirmation: confirmation, movement_id: movement.movement?.id || null },
  });
  return { confirmation, note, ...movement };
}

async function recordRmsRiskReview(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "control_anti_fuga") throw badRequest("La validación final solo se registra desde Riesgos de fuga.");
  const current = await query(
    `select metadata from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, payload.source_id]
  );
  const metadata = current.rows[0]?.metadata || {};
  const confirmation = metadata.commercial_confirmation;
  if (!confirmation?.product_name || Number(confirmation.amount) <= 0 || !confirmation?.evidence) {
    throw badRequest("No se puede liberar la venta: falta una condición comercial confirmada con evidencia.");
  }
  const result = String(payload.result || "").toUpperCase();
  const reason = String(payload.reason || "").trim();
  if (!["CLEARED", "RETURN_TO_NEGOTIATION"].includes(result)) throw badRequest("Selecciona una decisión de validación final válida.");
  if (!reason) throw badRequest(result === "CLEARED" ? "Explica por qué el acuerdo está listo para atribuir." : "Explica qué debe corregirse en la confirmación comercial.");
  const review = { result, reason, reviewed_at: new Date().toISOString(), reviewed_by: user.id, confirmation_snapshot: confirmation };
  const isCleared = result === "CLEARED";
  let agenda = null;
  if (!isCleared) {
    agenda = await createRmsAgendaTask(businessId, user, {
      source_id: payload.source_id, source_type: sourceType, lead_id: item.lead_id || payload.lead_id || null,
      stage: "accion_correctiva", action_title: "Corregir la confirmación comercial antes de atribuir la venta",
      note: `Riesgos de fuga: ${reason}`, due_at: payload.next_action_at || undefined, priority_score: 80,
      revenue_potential: confirmation.amount, metadata: { rms_risk_review: review },
    });
  }
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    to_phase: isCleared ? "cierre" : "accion_correctiva", priority: isCleared ? "HIGH" : "URGENT",
    recommended_action: isCleared ? "Registrar el resultado comercial atribuido" : "Completar confirmación comercial",
    last_operation: isCleared ? "risk_review_passed" : "risk_review_returned_to_negotiation",
    last_material_sent: confirmation.product_name, revenue_potential: confirmation.amount,
    reason, metadata: { risk_review: review, recovery_decision: isCleared ? null : "NEGOTIATION", risk_return_task_id: agenda?.item?.id || null },
  });
  await recordRmsWorkflowEvent(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    event_type: isCleared ? "risk_review_passed" : "risk_review_returned_to_negotiation",
    event_title: isCleared ? "Validación anti-fuga aprobada" : "Caso devuelto a confirmación comercial",
    event_description: reason, rms_phase: isCleared ? "cierre" : "accion_correctiva",
    metadata: { risk_review: review, movement_id: movement.movement?.id || null, task_id: agenda?.item?.id || null },
  });
  return { review, agenda, ...movement };
}

function roundedMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function recordRmsAttributedSale(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "cierre") throw badRequest("La venta solo puede atribuirse después de la validación final anti-fuga.");
  const currentState = await query(
    `select metadata from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, payload.source_id]
  );
  const workflowMetadata = currentState.rows[0]?.metadata || {};
  if (!workflowMetadata.commercial_confirmation?.product_name || workflowMetadata.risk_review?.result !== "CLEARED") {
    throw badRequest("Aún falta confirmar la condición comercial y liberar la validación anti-fuga.");
  }
  const quantity = Math.max(0.01, Number(payload.quantity || 1));
  const saleAmount = roundedMoney(payload.sale_amount);
  const benefitCost = Math.max(0, roundedMoney(payload.benefit_cost));
  const acquisitionCost = Math.max(0, roundedMoney(payload.acquisition_cost));
  const idempotencyKey = String(payload.idempotency_key || "").trim() || null;
  if (saleAmount <= 0) throw badRequest("El valor pagado debe ser mayor a cero.");
  const product = payload.inventory_product_id
    ? await query(
      `select id, name, cost_price from business_inventory_products
       where business_id = $1 and id = $2 and status <> 'ARCHIVED'`,
      [businessId, payload.inventory_product_id]
    )
    : { rows: [] };
  if (payload.inventory_product_id && !product.rows[0]) throw notFound("No encontramos ese producto en el inventario.");
  const productRow = product.rows[0] || null;
  const productName = String(payload.product_name || productRow?.name || "").trim();
  if (!productName) throw badRequest("Indica el producto o servicio vendido.");
  const unitCost = Math.max(0, roundedMoney(payload.unit_cost ?? productRow?.cost_price ?? 0));
  const productCostTotal = roundedMoney(unitCost * quantity);
  const grossProfit = roundedMoney(saleAmount - productCostTotal - benefitCost);
  const netProfit = roundedMoney(grossProfit - acquisitionCost);
  const invested = roundedMoney(productCostTotal + benefitCost + acquisitionCost);
  const roi = invested > 0 ? Math.round((netProfit / invested) * 1000000) / 1000000 : null;
  const paidAt = payload.paid_at || new Date().toISOString();
  const currency = String(payload.currency || "COP").trim().toUpperCase().slice(0, 8) || "COP";
  const economics = { quantity, unit_cost: unitCost, product_cost_total: productCostTotal, benefit_cost: benefitCost, acquisition_cost: acquisitionCost, gross_profit: grossProfit, net_profit: netProfit, roi, currency };
  const metadata = {
    source_module: "rms_machine",
    rms_source_type: sourceType,
    rms_source_id: payload.source_id,
    rms_opportunity_id: item.id,
    benefit_description: String(payload.benefit_description || "").trim() || null,
    economics,
  };
  const result = await withTransaction(async (client) => {
    const sale = await client.query(
      `insert into business_sales
        (business_id, campaign_id, customer_name, customer_phone, customer_email, customer_document_id,
         product_name, sale_amount, currency, seller_user_id, acquisition_source, acquisition_channel, notes,
         metadata, rms_source_type, rms_source_id, inventory_product_id, quantity, unit_cost, product_cost_total,
         benefit_type, benefit_cost, acquisition_cost, gross_profit, net_profit, roi, payment_method, paid_at, sale_status, idempotency_key)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'RMS', 'RMS / Ventas atribuidas', $11,
         $12::jsonb, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 'PAID', $27)
       on conflict (business_id, idempotency_key) where idempotency_key is not null do nothing
       returning *`,
      [businessId, item.campaign_id || null, item.name || null, item.phone || null, item.email || null,
        item.document_id || null, productName, saleAmount, currency, user.id, String(payload.notes || "").trim() || null,
        JSON.stringify(metadata), sourceType, payload.source_id, productRow?.id || null, quantity, unitCost,
        productCostTotal, String(payload.benefit_type || "NONE").toUpperCase(), benefitCost, acquisitionCost,
        grossProfit, netProfit, roi, String(payload.payment_method || "OTHER").toUpperCase(), paidAt, idempotencyKey]
    );
    if (sale.rows[0]) return { sale: sale.rows[0], duplicate: false };
    const existing = await client.query(
      `select * from business_sales where business_id = $1 and idempotency_key = $2 limit 1`,
      [businessId, idempotencyKey]
    );
    return { sale: existing.rows[0], duplicate: true };
  });
  if (result.duplicate) return { sale: result.sale, economics: result.sale?.metadata?.economics || economics, duplicate: true };
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType,
    source_id: payload.source_id,
    lead_id: item.lead_id || payload.lead_id || null,
    to_phase: "revenue_generado",
    priority: "HIGH",
    recommended_action: "Validar calidad de venta atribuida y activar postventa",
    last_operation: "attributed_sale_registered",
    last_material_sent: productName,
    revenue_potential: saleAmount,
    reason: "Venta cobrada y atribuida desde la estación de Ventas atribuidas.",
    metadata: { rms_attributed_sale_id: result.sale.id, rms_sale_recorded_at: new Date().toISOString(), rms_sale_product: productName, rms_sale_amount: saleAmount, rms_sale_economics: economics },
  });
  await recordRmsWorkflowEvent(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    event_type: "sale_attributed", event_title: "Venta atribuida correctamente",
    event_description: "La condición comercial y la validación anti-fuga quedaron trazadas antes del registro final.",
    rms_phase: "revenue_generado", metadata: { sale_id: result.sale.id, movement_id: movement.movement?.id || null },
  });
  return { sale: result.sale, economics, movement, duplicate: false };
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

function activationDeliveryPayment(payload = {}) {
  const input = payload && typeof payload === "object" ? payload : {};
  const mode = String(input.mode || "NONE").toUpperCase();
  const labels = { NONE: "Sin cobro", PAYMENT_LINK: "Link de cobro", INVOICE: "Factura", COLLECTION_ACCOUNT: "Cuenta de cobro", SIMPLE_COLLECTION: "Cobro simple" };
  if (!labels[mode]) throw badRequest("El medio de cobro no es válido.");
  const url = String(input.url || "").trim().slice(0, 1800);
  const instructions = String(input.instructions || "").trim().slice(0, 1800);
  if (mode === "PAYMENT_LINK" && !/^https?:\/\//i.test(url)) throw badRequest("Agrega un link de cobro válido.");
  if (mode !== "NONE" && !url && !instructions) throw badRequest("Agrega el link o las instrucciones de cobro.");
  return { mode, label: labels[mode], url, instructions, reference: String(input.reference || "").trim().slice(0, 180), amount: Number.isFinite(Number(input.amount)) && Number(input.amount) >= 0 ? Number(input.amount) : null, currency: String(input.currency || "COP").trim().slice(0, 8) || "COP" };
}

function activationDeliveryPaymentText(payment) {
  if (!payment || payment.mode === "NONE") return "";
  const modeCopy = {
    PAYMENT_LINK: "Te compartimos una forma rápida y segura de completar el pago.",
    INVOICE: "Te compartimos la factura y los datos para realizar el pago.",
    COLLECTION_ACCOUNT: "Te compartimos la cuenta de cobro y los datos para realizar el pago.",
    SIMPLE_COLLECTION: "Te compartimos los datos para completar tu pago.",
  }[payment.mode] || "Te compartimos los datos para completar tu pago.";
  return [
    modeCopy,
    payment.amount !== null ? `El valor de esta oferta es ${payment.currency} ${payment.amount.toLocaleString("es-CO")}.` : "",
    payment.reference ? `Por favor usa la referencia ${payment.reference}.` : "",
    payment.url ? `Puedes pagar aquí: ${payment.url}` : "",
    payment.instructions ? `Instrucciones de pago: ${payment.instructions}` : "",
  ].filter(Boolean).join("\n");
}

function activationAttachmentUrl(token) {
  return `${String(env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "")}/api/public/rms-attachments/${encodeURIComponent(token)}`;
}

async function recordActivationDelivery(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const sourceId = payload.source_id;
  const item = await findOpportunity(businessId, sourceType, sourceId);
  if (!payload.contact_consent_confirmed) throw badRequest("Confirma la autorización comercial del lead antes de enviar.");
  const assetIds = [...new Set((payload.attachment_asset_ids || []).map(String).filter(Boolean))].slice(0, 6);
  const assets = assetIds.length ? await query(`select id, title, file_name, file_type from digital_assets where business_id = $1 and is_active = true and id = any($2::uuid[])`, [businessId, assetIds]) : { rows: [] };
  if (assets.rows.length !== assetIds.length) throw badRequest("Uno o más adjuntos no pertenecen a este negocio.");
  const payment = activationDeliveryPayment(payload.payment);
  const ticketUrl = String(payload.ticket_url || "").trim().slice(0, 1800);
  if (ticketUrl && !/^https?:\/\//i.test(ticketUrl)) throw badRequest("El link del ticket debe comenzar por http:// o https://.");
  const baseMessage = String(payload.message || "").trim().slice(0, 5000);
  const deliveryState = payload.delivery_state === "SENT" ? "SENT" : "PREPARED";
  const requestedContactAt = payload.contacted_at ? new Date(payload.contacted_at) : new Date();
  if (Number.isNaN(requestedContactAt.getTime())) throw badRequest("La fecha del contacto no es válida.");
  const priorHistory = await query(
    `select count(*) filter (where metadata->'activation_delivery'->>'delivery_state' = 'SENT')::int as sent_count,
            min(nullif(metadata->'activation_delivery'->>'first_contact_at', '')::timestamptz) as first_contact_at
     from lead_notes
     where business_id = $1 and source_type = $2 and source_id = $3
       and metadata->>'source_module' = 'rms_activation_1'`,
    [businessId, sourceType, sourceId]
  );
  const priorState = await query(
    `select metadata from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, sourceId]
  );
  const legacyFirstContact = priorState.rows[0]?.metadata?.activation_first_contact_at
    || priorState.rows[0]?.metadata?.activation_offer_sent_at
    || null;
  const sentBefore = Number(priorHistory.rows[0]?.sent_count || 0) || (legacyFirstContact ? 1 : 0);
  const firstContactAt = priorHistory.rows[0]?.first_contact_at || legacyFirstContact || (deliveryState === "SENT" ? requestedContactAt.toISOString() : null);
  const contactSequence = deliveryState === "SENT" ? sentBefore + 1 : sentBefore;
  const note = await createLeadNote(businessId, user, sourceId, sourceType, {
    note: deliveryState === "SENT"
      ? `Activación 1 · contacto #${contactSequence} enviado por ${String(payload.channel || "WhatsApp")}.`
      : `Activación 1 · mensaje y materiales preparados por ${String(payload.channel || "WhatsApp")}; aún no enviado.`,
    note_type: "commercial",
    metadata: {
      source_module: "rms_activation_1",
      activation_delivery: {
        payment,
        ticket_url: ticketUrl || null,
        channel: payload.channel || "WhatsApp",
        contact_consent_confirmed: true,
        delivery_state: deliveryState,
        contacted_at: deliveryState === "SENT" ? requestedContactAt.toISOString() : null,
        first_contact_at: firstContactAt,
        contact_sequence: contactSequence,
      },
    },
  });
  const attachments = [];
  for (const asset of assets.rows) {
    const token = randomBytes(24).toString("base64url");
    const created = await query(`insert into rms_activation_attachments (business_id, source_type, source_id, lead_id, activation_note_id, asset_id, public_token, metadata) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) returning id, public_token`, [businessId, sourceType, sourceId, item.lead_id || null, note.id, asset.id, token, JSON.stringify({ title: asset.title, file_name: asset.file_name, sent_by: user.id })]);
    attachments.push({ id: created.rows[0].id, asset_id: asset.id, title: asset.title, file_name: asset.file_name, file_type: asset.file_type, url: activationAttachmentUrl(token) });
  }
  const deliveryMessage = [
    baseMessage,
    ticketUrl ? `Tu beneficio está listo para ti. Ábrelo aquí y revisa cómo disfrutarlo: ${ticketUrl}` : "",
    attachments.length ? `También te compartimos los documentos de esta propuesta:\n${attachments.map((asset) => `• ${asset.title || asset.file_name}: ${asset.url}`).join("\n")}` : "",
    activationDeliveryPaymentText(payment),
  ].filter(Boolean).join("\n\n").slice(0, 5000);
  await query(`update lead_notes set metadata = metadata || $2::jsonb where id = $1`, [note.id, JSON.stringify({ activation_delivery: { attachments, payment, ticket_url: ticketUrl || null, message: deliveryMessage, delivery_state: deliveryState, contacted_at: deliveryState === "SENT" ? requestedContactAt.toISOString() : null, first_contact_at: firstContactAt, contact_sequence: contactSequence } })]);
  return { note, attachments, payment, history: { delivery_state: deliveryState, contacted_at: deliveryState === "SENT" ? requestedContactAt.toISOString() : null, first_contact_at: firstContactAt, contact_sequence: contactSequence }, whatsapp_message: deliveryMessage, whatsapp_url: whatsappUrl(item.phone, deliveryMessage) };
}

async function downloadActivationAttachment(publicToken) {
  const result = await query(`select aa.id, aa.business_id, aa.lead_id, aa.source_type, aa.source_id, da.title, da.file_name, da.file_type, da.file_data_url from rms_activation_attachments aa join digital_assets da on da.id = aa.asset_id and da.business_id = aa.business_id and da.is_active = true where aa.public_token = $1`, [String(publicToken || "").trim()]);
  const row = result.rows[0];
  if (!row) throw notFound("Adjunto no encontrado o desactivado.");
  const match = String(row.file_data_url || "").match(/^data:([^;,]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) throw notFound("El archivo adjunto no está disponible.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw notFound("El archivo adjunto no es válido.");
  await query(`update rms_activation_attachments set opened_at = coalesce(opened_at, now()), open_count = open_count + 1 where id = $1`, [row.id]);
  return { buffer, file_name: row.file_name || "adjunto", file_type: row.file_type || match[1] };
}

module.exports = {
  STAGES,
  RMS_PHASES,
  WHATSAPP_TEMPLATES,
  createRmsAgendaTask,
  downloadActivationAttachment,
  executeRmsAction,
  executeRmsBulkAction,
  getDailyQueue,
  getPhaseRecommendedOperation,
  listRmsEvents,
  listRmsOpportunities,
  moveRmsLeadPhase,
  recordActivationDelivery,
  recordRmsAttributedSale,
  recordRmsCommercialConfirmation,
  recordRmsEvaluationResponse,
  recordRmsRiskReview,
  rmsMetrics,
};

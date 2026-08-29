const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, notFound } = require("../utils/http");
const { createLeadAgendaItem, createLeadNote, listLeadCrmRows } = require("./leadCrmService");
const { createPostSaleQr, createRiskRecoveryQr } = require("./strategicQrService");
const { createSecureToken } = require("../utils/token");
const { createRewardPass } = require("./rewardPassService");
const {
  affiliatePointRuleMetadata,
  getAffiliatePointRules,
  referralPointsForAmount,
} = require("./affiliatePointRulesService");
const {
  normalizePostSaleActionType,
  normalizePostSaleStatus,
  requiresContactConsent,
  requiresResultForIntelligence,
} = require("./rmsPostSalePolicy");
const { normalizeIntelligenceLifecycleStatus } = require("./rmsIntelligenceLifecyclePolicy");
const { resolveBusinessSaleSeller } = require("./sellerService");
const { randomBytes } = require("crypto");

// Fuente única de verdad: conserva los IDs y ordena las transiciones comerciales.
const RMS_OPERATIONAL_STAGES = Object.freeze([
  { key: "recoleccion", order: 1, label: "Recolector", short_label: "Recolector" },
  { key: "alimentacion", order: 2, label: "Curaduría", short_label: "Curaduría" },
  { key: "curaduria", order: 3, label: "Asignación", short_label: "Asignación" },
  { key: "clasificacion", order: 4, label: "Activación 1", short_label: "Activación 1" },
  { key: "procesamiento", order: 5, label: "Evaluación", short_label: "Evaluación" },
  { key: "accion_correctiva", order: 6, label: "Negociación", short_label: "Negociación" },
  { key: "control_anti_fuga", order: 7, label: "Riesgos de fuga", short_label: "Riesgos de fuga" },
  { key: "cierre", order: 8, label: "Ventas atribuidas", short_label: "Ventas atribuidas" },
  { key: "postventa", order: 9, label: "Valorización Clientes", short_label: "Valorización" },
  { key: "inteligencia", order: 10, label: "Inteligencia GOS", short_label: "Inteligencia GOS", analytical_only: true },
]);
const RMS_QUALITY_CONTROLS = Object.freeze([
  { key: "preprocesamiento", label: "Control de calidad 1", observes_after: "clasificacion", observes_before: "procesamiento", visual_only: true },
  { key: "revenue_generado", label: "Control de calidad 2", observes_after: "cierre", observes_before: "postventa", visual_only: true },
]);
const RMS_FLOW_ORDER = RMS_OPERATIONAL_STAGES;
const RMS_PHASES = RMS_OPERATIONAL_STAGES;
const STAGES = RMS_OPERATIONAL_STAGES;
const PHASE_KEYS = new Set(RMS_OPERATIONAL_STAGES.filter((stage) => !stage.analytical_only).map((phase) => phase.key));
const RMS_LEGACY_QUALITY_PHASES = new Set(RMS_QUALITY_CONTROLS.map((control) => control.key));
// Reciclaje is an auxiliary destination backed by rms_recycling_cases. Risk
// decisions move there explicitly so the lead leaves Riesgos de fuga.
const RMS_AUXILIARY_PHASES = new Set(["reciclaje"]);
const RMS_FLOW_NEXT_PHASE = Object.freeze({
  recoleccion: "alimentacion", alimentacion: "curaduria", curaduria: "clasificacion",
  clasificacion: "procesamiento",
  procesamiento: "accion_correctiva", accion_correctiva: "control_anti_fuga",
  control_anti_fuga: "cierre", cierre: "postventa",
});

const RMS_TRANSITION_CONTRACT = Object.freeze([
  { from: "recoleccion", decision: "VALID_LEAD", to: "alimentacion" },
  { from: "recoleccion", decision: "DUPLICATE", to: "recoleccion", documentary_only: true },
  { from: "alimentacion", decision: "COMPLETE_OPERATING_DATA", to: "curaduria" },
  { from: "alimentacion", decision: "MISSING_DATA", to: "alimentacion", creates_agenda_task: true },
  { from: "curaduria", decision: "PRODUCT_PRIORITY_AND_NEED", to: "clasificacion" },
  { from: "curaduria", decision: "NOT_FIT", to: "curaduria", lifecycle_status: "LOST_ANALYZED" },
  { from: "clasificacion", decision: "ACTIVATION_DELIVERED", to: "procesamiento" },
  { from: "clasificacion", decision: "MISSING_ACTIVATION_EVIDENCE", to: "clasificacion" },
  { from: "procesamiento", decision: "INTEREST_OR_OBJECTION", to: "accion_correctiva" },
  { from: "procesamiento", decision: "ACTIVATION_OBJECTION_OR_SILENCE", to: "control_anti_fuga" },
  { from: "procesamiento", decision: "ACTIVATION_SALE_REPORTED", to: "cierre" },
  { from: "procesamiento", decision: "RECYCLE", to: "procesamiento", creates_agenda_task: true, transversal_queue: true },
  { from: "procesamiento", decision: "WAITING", to: "procesamiento" },
  { from: "procesamiento", decision: "NEW_ACTIVATION", to: "clasificacion" },
  { from: "accion_correctiva", decision: "COMPLETE_AGREEMENT", to: "cierre" },
  { from: "accion_correctiva", decision: "FRAGILE_AGREEMENT", to: "control_anti_fuga" },
  { from: "accion_correctiva", decision: "WAITING", to: "accion_correctiva" },
  { from: "accion_correctiva", decision: "REPROCESS", to: "procesamiento" },
  { from: "accion_correctiva", decision: "REPROCESS_ACTIVATION", to: "clasificacion" },
  { from: "accion_correctiva", decision: "RECYCLE", to: "accion_correctiva", creates_agenda_task: true },
  { from: "accion_correctiva", decision: "LOST", to: "accion_correctiva", lifecycle_status: "LOST_ANALYZED" },
  { from: "control_anti_fuga", decision: "CLEARED", to: "cierre" },
  { from: "control_anti_fuga", decision: "RECYCLE", to: "reciclaje", creates_agenda_task: true, transversal_queue: true },
  { from: "cierre", decision: "CANONICAL_SALE_RECORDED", to: "postventa" },
  { from: "postventa", decision: "RESULT_RECORDED", to: "postventa", lifecycle_status: "CYCLE_ANALYZED", analytical_only: true },
  { from: "reciclaje", decision: "RECYCLE_REACTIVATE_EVALUATION", to: "procesamiento" },
  { from: "reciclaje", decision: "RECYCLE_REACTIVATE_ACTIVATION", to: "clasificacion" },
  { from: "accion_correctiva", decision: "RECYCLE_REACTIVATE_EVALUATION", to: "procesamiento" },
  { from: "accion_correctiva", decision: "RECYCLE_REACTIVATE_ACTIVATION", to: "clasificacion" },
  { from: "control_anti_fuga", decision: "RECYCLE_REACTIVATE_EVALUATION", to: "procesamiento" },
  { from: "control_anti_fuga", decision: "RECYCLE_REACTIVATE_ACTIVATION", to: "clasificacion" },
]);

// These are server-only capabilities.  The generic phase endpoint must never
// be able to manufacture the commercial evidence that the final stations
// require just by sending metadata in its request body.
const RMS_TRANSITION_AUTHORITY = Object.freeze({
  EVALUATION: Symbol("rms-evaluation"),
  COMMERCIAL_CONFIRMATION: Symbol("rms-commercial-confirmation"),
  NEGOTIATION_RESULT: Symbol("rms-negotiation-result"),
  RISK_REVIEW: Symbol("rms-risk-review"),
  ATTRIBUTED_SALE: Symbol("rms-attributed-sale"),
  POST_SALE_ACTION: Symbol("rms-post-sale-action"),
  RECYCLING: Symbol("rms-recycling"),
});

const RMS_PROTECTED_TRANSITIONS = Object.freeze({
  procesamiento: Object.freeze({
    accion_correctiva: RMS_TRANSITION_AUTHORITY.EVALUATION,
    control_anti_fuga: RMS_TRANSITION_AUTHORITY.EVALUATION,
    cierre: RMS_TRANSITION_AUTHORITY.EVALUATION,
    reciclaje: RMS_TRANSITION_AUTHORITY.EVALUATION,
  }),
  accion_correctiva: Object.freeze({
    procesamiento: [RMS_TRANSITION_AUTHORITY.NEGOTIATION_RESULT, RMS_TRANSITION_AUTHORITY.RECYCLING],
    clasificacion: [RMS_TRANSITION_AUTHORITY.NEGOTIATION_RESULT, RMS_TRANSITION_AUTHORITY.RECYCLING],
    reciclaje: RMS_TRANSITION_AUTHORITY.NEGOTIATION_RESULT,
    control_anti_fuga: RMS_TRANSITION_AUTHORITY.COMMERCIAL_CONFIRMATION,
    cierre: [RMS_TRANSITION_AUTHORITY.COMMERCIAL_CONFIRMATION, RMS_TRANSITION_AUTHORITY.NEGOTIATION_RESULT],
  }),
  control_anti_fuga: Object.freeze({
    cierre: RMS_TRANSITION_AUTHORITY.RISK_REVIEW,
    reciclaje: RMS_TRANSITION_AUTHORITY.RISK_REVIEW,
    procesamiento: RMS_TRANSITION_AUTHORITY.RECYCLING,
    clasificacion: RMS_TRANSITION_AUTHORITY.RECYCLING,
  }),
  reciclaje: Object.freeze({
    procesamiento: RMS_TRANSITION_AUTHORITY.RECYCLING,
    clasificacion: RMS_TRANSITION_AUTHORITY.RECYCLING,
  }),
  cierre: Object.freeze({
    postventa: RMS_TRANSITION_AUTHORITY.ATTRIBUTED_SALE,
  }),
});

const LEGACY_PHASE_ALIASES = {
  entrada: "alimentacion",
  atencion_inicial: "curaduria",
  interes: "clasificacion",
  activacion: "clasificacion",
  decision: "procesamiento",
  convertido: "postventa",
  recompra: "postventa",
  fidelizacion: "postventa",
  referido: "postventa",
  recuperacion: "accion_correctiva",
};

const INDUSTRIAL_PROCESS = [
  { key: "recoleccion", label: "Recolector", phase: "recoleccion", description: "Captura contacto, origen e interés desde QR, activaciones, formularios, referidos o carga manual." },
  { key: "alimentacion", label: "Curaduría", phase: "alimentacion", description: "Define la calidad operativa antes de asignar una oferta al lead." },
  { key: "curaduria", label: "Asignación", phase: "curaduria", description: "Se asignan productos o servicios de interés para contactar al lead con una oferta clara." },
  { key: "clasificacion", label: "Activación 1", phase: "clasificacion", description: "Se prepara el primer contacto, se confirma el envío de una oferta y se programa el seguimiento para medir respuesta." },
  { key: "procesamiento", label: "Evaluación", phase: "procesamiento", description: "Registra la respuesta de Activación 1 y decide si negociar, proteger, atribuir la venta o reciclar." },
  { key: "correccion", label: "Negociación", phase: "accion_correctiva", description: "Conserva la conversación hasta recibir respuesta a material, detalle, cotización o condición." },
  { key: "control", label: "Riesgos de fuga", phase: "control_anti_fuga", description: "Se protege un acuerdo frágil con soporte, responsable y seguimiento verificables." },
  { key: "cierre", label: "Ventas atribuidas", phase: "cierre", description: "Completa producto, cantidad, pago, fuente y evidencia de una compra real." },
  { key: "postventa", label: "Valorización Clientes", phase: "postventa", description: "Valora la relación del cliente con referidos, afiliación, puntos, sellos o recompra sin alterar la venta original." },
  { key: "optimizar", label: "Inteligencia GOS", phase: "inteligencia", description: "El resultado vuelve a Inteligencia GOS para optimizar campanas, ganchos y operaciones." },
].sort((left, right) => RMS_FLOW_ORDER.findIndex((phase) => phase.key === left.phase) - RMS_FLOW_ORDER.findIndex((phase) => phase.key === right.phase));

const PHASE_OPERATIONS = {
  recoleccion: {
    primaryAction: "Capturar un lead con contexto mínimo",
    primaryActionKey: "collect_opportunities",
    suggestedMaterialType: "qr_activacion_formulario",
    materialLabel: "Nombre o contacto, origen e interés inicial",
    buttonLabel: "Enviar a Curaduría",
    nextPhase: "alimentacion",
    agendaTaskType: "capture",
    whatsappTemplateKey: "initial_proposal",
  },
  alimentacion: {
    primaryAction: "Definir la calidad operativa del lead",
    primaryActionKey: "feed_machine",
    suggestedMaterialType: "registro_minimo",
    materialLabel: "Probabilidad, interés, urgencia y esfuerzo comercial",
    buttonLabel: "Enviar a Asignación",
    nextPhase: "curaduria",
    agendaTaskType: "intake",
    whatsappTemplateKey: "first_contact",
  },
  curaduria: {
    primaryAction: "Asignar productos o servicios de interés",
    primaryActionKey: "product_classification",
    suggestedMaterialType: "inventario_productos_servicios",
    materialLabel: "Productos activos, cantidades e interés declarado",
    buttonLabel: "Enviar a Activación 1",
    nextPhase: "clasificacion",
    agendaTaskType: "validation",
    whatsappTemplateKey: "first_contact",
  },
  clasificacion: {
    primaryAction: "Enviar la primera activación y programar seguimiento",
    primaryActionKey: "activate_offer",
    suggestedMaterialType: "oferta_canal_mensaje_seguimiento",
    materialLabel: "Oferta, canal, mensaje, seguimiento y respuesta",
    buttonLabel: "Enviar a Evaluación",
    nextPhase: "procesamiento",
    agendaTaskType: "activation_follow_up",
    whatsappTemplateKey: "send_catalog",
  },
  procesamiento: {
    primaryAction: "Registrar la respuesta y decidir el destino",
    primaryActionKey: "evaluate_commercial_response",
    suggestedMaterialType: "propuesta_catalogo_cotizacion",
    materialLabel: "Respuesta, interés, objeción, venta o motivo de reciclaje",
    buttonLabel: "Registrar decisión",
    nextPhase: "accion_correctiva",
    agendaTaskType: "proposal",
    whatsappTemplateKey: "send_quote",
  },
  control_anti_fuga: {
    primaryAction: "Proteger o liberar un acuerdo frágil",
    primaryActionKey: "risk_review",
    suggestedMaterialType: "alerta_operativa",
    materialLabel: "Ticket por vencer, sin tarea, sin respuesta o fase saturada",
    buttonLabel: "Guardar validación",
    nextPhase: "cierre",
    agendaTaskType: "control",
    whatsappTemplateKey: "recovery",
  },
  accion_correctiva: {
    primaryAction: "Registrar la respuesta de la negociación",
    primaryActionKey: "commercial_negotiation",
    suggestedMaterialType: "objecion_contraoferta_condicion",
    materialLabel: "Canal, material enviado, respuesta y justificación del destino",
    buttonLabel: "Guardar resultado",
    nextPhase: "control_anti_fuga",
    agendaTaskType: "recovery",
    whatsappTemplateKey: "recovery",
  },
  cierre: {
    primaryAction: "Registrar una venta atribuida",
    primaryActionKey: "close_sale",
    suggestedMaterialType: "cuenta_cobro_factura_pago",
    materialLabel: "Producto, cantidad, valor pagado, fuente y evidencia",
    buttonLabel: "Enviar a Valorización Clientes",
    nextPhase: "postventa",
    agendaTaskType: "payment",
    whatsappTemplateKey: "send_payment",
  },
  postventa: {
    primaryAction: "Refinar la relación después de la compra",
    primaryActionKey: "gamified_postsale",
    suggestedMaterialType: "agradecimiento_ticket_reward",
    materialLabel: "Referido, afiliación, puntos, sellos o beneficio de recompra",
    buttonLabel: "Registrar acción postventa",
    // Intelligence receives an analytical event; Postventa remains the lead's
    // physical station until its own continuity work is complete.
    nextPhase: null,
    agendaTaskType: "rebuy",
    whatsappTemplateKey: "rebuy",
  },
  inteligencia: {
    primaryAction: "Leer el recorrido y aprender del resultado",
    primaryActionKey: "rms_intelligence",
    suggestedMaterialType: "aprendizaje_metricas",
    materialLabel: "Campana, gancho, vendedor, ticket, fuga y recompra",
    buttonLabel: "Revisar aprendizaje",
    // This is a read-only analytical workspace, never a restart route.
    nextPhase: null,
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
  // Keep historical control rows readable until the compatible migration moves
  // them. They are never accepted as new transition destinations.
  return PHASE_KEYS.has(phase) || RMS_AUXILIARY_PHASES.has(phase) || RMS_LEGACY_QUALITY_PHASES.has(phase) ? phase : fallback;
}

function phaseLabel(phase) {
  if (phase === "reciclaje") return "Reciclaje comercial";
  return RMS_PHASES.find((item) => item.key === phase)?.label
    || RMS_QUALITY_CONTROLS.find((control) => control.key === phase)?.label
    || phase;
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
    `select id, name, sku, barcode, category, brand, unit_price, cost_price, currency, stock_quantity, status
     from business_inventory_products
     where business_id = $1 and status <> 'ARCHIVED'
     order by updated_at desc, name asc
     limit 500`,
    [businessId]
  );
  return result.rows;
}

async function rmsInventoryProductSnapshot(businessId, inventoryProductId) {
  if (!inventoryProductId) throw badRequest("Selecciona un producto o servicio activo del inventario.");
  const result = await query(
    `select id, name, sku, category, unit_price, cost_price, currency, stock_quantity, status
       from business_inventory_products
      where business_id = $1 and id = $2 and status = 'ACTIVE'
      limit 1`,
    [businessId, inventoryProductId]
  );
  const product = result.rows[0];
  if (!product) throw badRequest("El producto seleccionado no está activo o no pertenece a este negocio.");
  return {
    inventory_product_id: product.id,
    product_name: String(product.name || "").trim(),
    product_name_snapshot: String(product.name || "").trim(),
    product_price_snapshot: moneyNumber(product.unit_price),
    product_currency_snapshot: String(product.currency || "COP").trim().toUpperCase().slice(0, 8) || "COP",
    product_source: "INVENTORY",
    inventory_product: product,
  };
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
  const campaignName = firstPresent(metadata.communication_campaign_name, row.campaign_name, metadata.campaign_name);
  const channel = firstPresent(metadata.acquisition_channel_name_snapshot, row.acquisition_channel_name_snapshot, row.channel, metadata.channel, metadata.preferred_channel, metadata.source);
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
  if (purchases >= 3 || redeemedTickets >= 3 || moneyNumber(row.total_spent) >= 3000000 || (row.is_affiliate && purchases > 0)) return "postventa";
  if (purchases > 0) return "postventa";
  if (["CONVERTED", "BUYER"].includes(status)) return "postventa";
  if (["FOLLOW_UP", "CONTACTED"].includes(status) && hasContact) return "procesamiento";
  // A ticket or activation is evidence for Evaluación, not a quality phase.
  if (activeTickets > 0 || redeemedTickets > 0) return "procesamiento";
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
    procesamiento: `Ejecutar propuesta, catalogo, ticket, cotizacion o factura relacionada con ${product}.`,
    control_anti_fuga: "Detectar clientes atascados, tickets por vencer, redenciones sin venta o falta de tarea.",
    accion_correctiva: "Crear tarea urgente, recordar, reenviar beneficio, llamar, recuperar o descartar.",
    cierre: "Ensamblar interes, propuesta, beneficio, cuenta de cobro y pago.",
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
  const requests = [];
  for (const [sourceType, ids] of Object.entries(byType)) {
    // Las estaciones operativas no pueden perder un cliente solo porque su
    // fila RMS ya no esté dentro de la primera página del CRM. Se resuelven
    // todos los IDs persistidos por bloques compatibles con la consulta CRM.
    for (let offset = 0; offset < ids.length; offset += 120) {
      const sourceIds = ids.slice(offset, offset + 120);
      requests.push(listLeadCrmRows(businessId, {
        ...filters,
        source_type: sourceType,
        source_ids: sourceIds,
        preserve_requested_source_refs: true,
        limit: sourceIds.length,
        offset: 0,
      }));
    }
  }
  const results = await Promise.all(requests);
  return results.flatMap((data) => data.leads || data.rows || []);
}

async function riskLeadRowsForStateRefs(businessId, refs = []) {
  const idsFor = (sourceType) => refs
    .filter((row) => crmSourceType(row) === sourceType)
    .map((row) => row.source_id)
    .filter(Boolean);
  const playerIds = idsFor("PLAYER");
  const manualIds = idsFor("MANUAL");
  const affiliateIds = idsFor("AFFILIATE");
  const empty = { rows: [] };

  // Riesgos opera sobre el estado RMS persistido. No necesita volver a
  // calcular todas las compras, tickets, juegos y comunicaciones del CRM para
  // mostrar identidad, productos, beneficio y destino. Estas lecturas directas
  // evitan los laterales históricos de listLeadCrmRows en la ruta crítica.
  const [players, manuals, affiliates] = await Promise.all([
    playerIds.length ? query(
      `select p.id, 'PLAYER'::text as source_type, p.id as lead_id,
              p.name, p.document_id, p.email, p.phone,
              coalesce(p.metadata->>'company', '') as company,
              p.created_at, p.seller_user_id, seller.full_name as seller_name,
              p.campaign_id, c.name as campaign_name,
              coalesce(p.metadata->>'acquisition_channel_name_snapshot', p.metadata->>'channel', c.type, 'QR / Activacion') as channel,
              coalesce(p.metadata->>'interest', p.metadata->>'favorite_product', p.metadata->>'product_interest', '') as top_interest,
              coalesce(p.metadata->>'commercial_status', '') as stored_status,
              coalesce(p.metadata, '{}'::jsonb) as metadata,
              null::uuid as affiliate_id, false as is_affiliate
         from players p
         left join campaigns c on c.id = p.campaign_id and c.business_id = p.business_id
         left join app_users seller on seller.id = p.seller_user_id and seller.business_id = p.business_id
        where p.business_id = $1 and p.id = any($2::uuid[])
          and coalesce(p.metadata->>'lifecycle_status', 'ACTIVE') <> 'ARCHIVED'`,
      [businessId, playerIds]
    ) : empty,
    manualIds.length ? query(
      `select ml.id, 'MANUAL'::text as source_type, null::uuid as lead_id,
              ml.name, ml.document_id, ml.email, ml.phone, ml.company,
              ml.created_at, ml.seller_user_id, seller.full_name as seller_name,
              null::uuid as campaign_id, null::text as campaign_name,
              coalesce(ml.preferred_channel, ml.source, 'Manual') as channel,
              coalesce(ml.interest, '') as top_interest,
              ml.status as stored_status,
              coalesce(ml.metadata, '{}'::jsonb) as metadata,
              null::uuid as affiliate_id, false as is_affiliate
         from business_manual_leads ml
         left join app_users seller on seller.id = ml.seller_user_id and seller.business_id = ml.business_id
        where ml.business_id = $1 and ml.id = any($2::uuid[])
          and ml.status <> 'ARCHIVED'`,
      [businessId, manualIds]
    ) : empty,
    affiliateIds.length ? query(
      `select fa.id, 'AFFILIATE'::text as source_type, null::uuid as lead_id,
              fa.full_name as name, fa.document_id, fa.email, fa.phone,
              coalesce(fa.card_metadata->>'company', '') as company,
              fa.created_at, fa.seller_user_id, seller.full_name as seller_name,
              null::uuid as campaign_id, null::text as campaign_name,
              'Afiliados'::text as channel,
              coalesce(fa.notes, '') as top_interest,
              fa.status as stored_status,
              coalesce(fa.card_metadata, '{}'::jsonb) as metadata,
              fa.id as affiliate_id, true as is_affiliate
         from affiliates fa
         left join app_users seller on seller.id = fa.seller_user_id and seller.business_id = fa.business_id
        where fa.business_id = $1 and fa.id = any($2::uuid[])
          and fa.status <> 'DELETED'`,
      [businessId, affiliateIds]
    ) : empty,
  ]);
  return [...players.rows, ...manuals.rows, ...affiliates.rows];
}

function rmsContactIdentityKeys(row = {}) {
  const documentValue = String(row.document_id || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const email = String(row.email || "").trim().toLowerCase();
  let phone = String(row.phone || "").replace(/\D/g, "");
  // Qori opera principalmente con números colombianos: +57 310... y
  // 310... representan el mismo contacto, no dos oportunidades distintas.
  if (phone.length === 12 && phone.startsWith("57")) phone = phone.slice(2);
  return [
    documentValue.length >= 5 ? `document:${documentValue}` : "",
    email ? `email:${email}` : "",
    phone.length >= 7 ? `phone:${phone}` : "",
  ].filter(Boolean);
}

function rmsStageRankFor(row = {}, stateMap = new Map()) {
  const sourceType = crmSourceType(row);
  const state = stateMap.get(`${sourceType}:${row.id}`);
  const phase = normalizePhase(state?.rms_phase, deriveRmsPhase(row));
  return RMS_OPERATIONAL_STAGES.find((stage) => stage.key === phase)?.order || 0;
}

function rmsCanonicalContactRow(rows = [], stateMap = new Map()) {
  const sourcePreference = { PLAYER: 3, MANUAL: 2, AFFILIATE: 1 };
  return [...rows].sort((left, right) => {
    const rightStage = rmsStageRankFor(right, stateMap);
    const leftStage = rmsStageRankFor(left, stateMap);
    if (rightStage !== leftStage) return rightStage - leftStage;
    const rightState = stateMap.get(`${crmSourceType(right)}:${right.id}`);
    const leftState = stateMap.get(`${crmSourceType(left)}:${left.id}`);
    const rightUpdated = new Date(rightState?.updated_at || right.last_interaction_at || right.created_at || 0).getTime();
    const leftUpdated = new Date(leftState?.updated_at || left.last_interaction_at || left.created_at || 0).getTime();
    if (rightUpdated !== leftUpdated) return rightUpdated - leftUpdated;
    return (sourcePreference[crmSourceType(right)] || 0) - (sourcePreference[crmSourceType(left)] || 0);
  })[0] || null;
}

function collapseRmsDuplicateContacts(rows = [], stateMap = new Map()) {
  const groups = [];
  for (const row of rows) {
    const identities = rmsContactIdentityKeys(row);
    // Sin un dato de identidad confiable, no se presume que dos personas son la misma.
    if (!identities.length) {
      groups.push({ identities: new Set(), rows: [row] });
      continue;
    }
    const matchingGroups = groups.filter((group) => identities.some((identity) => group.identities.has(identity)));
    if (!matchingGroups.length) {
      groups.push({ identities: new Set(identities), rows: [row] });
      continue;
    }
    const target = matchingGroups[0];
    identities.forEach((identity) => target.identities.add(identity));
    target.rows.push(row);
    matchingGroups.slice(1).forEach((group) => {
      group.identities.forEach((identity) => target.identities.add(identity));
      target.rows.push(...group.rows);
      groups.splice(groups.indexOf(group), 1);
    });
  }
  return groups.map((group) => rmsCanonicalContactRow(group.rows, stateMap)).filter(Boolean);
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
    document_id: row.document_id || "",
    seller_user_id: row.seller_user_id || null,
    seller_name: row.seller_name || "",
    owner_user_id: row.seller_user_id || null,
    owner_name: row.seller_name || "",
    branch_id: row.branch_id || null,
    branch_name: row.branch_name || "",
    affiliate_id: row.affiliate_id || null,
    is_affiliate: Boolean(row.is_affiliate),
    campaign_id: metadataObject(row).communication_campaign_id || metadataObject(row).communication_attribution?.campaign_id || row.campaign_id || null,
    communication_id: metadataObject(row).communication_attribution?.communication_id || null,
    campaign_name: entry.campaign_name || row.campaign_name || "",
    acquisition_channel_id: metadataObject(row).acquisition_channel_id || metadataObject(row).communication_attribution?.channel_id || row.acquisition_channel_id || null,
    acquisition_channel_name_snapshot: metadataObject(row).acquisition_channel_name_snapshot || row.acquisition_channel_name_snapshot || row.acquisition_channel || null,
    acquisition_channel_slug_snapshot: metadataObject(row).acquisition_channel_slug_snapshot || row.acquisition_channel_slug_snapshot || null,
    acquisition_channel_source: metadataObject(row).acquisition_channel_source || row.acquisition_channel_source || null,
    channel: entry.channel || row.acquisition_channel_name_snapshot || row.channel || row.acquisition_channel || "",
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
    lifecycle_status: stateRow?.lifecycle_status || "ACTIVE",
    intelligence_updated_at: stateRow?.intelligence_updated_at || null,
    last_operation: stateRow?.last_operation || "",
    last_material_sent: stateRow?.last_material_sent || "",
    state_metadata: stateRow?.metadata || {},
  };
}

async function acceptedRmsActivationDeliveryMap(businessId) {
  const accepted = await query(
    `select distinct on (r.source_type, r.source_id)
            r.source_type, r.source_id, r.sent_at, r.provider_message_id, r.metadata as recipient_metadata,
            c.id as communication_id, c.activation_id, c.email_body, c.action_url,
            coalesce(a.title, c.title) as activation_title
       from business_communication_recipients r
       join business_communications c on c.id = r.communication_id and c.business_id = r.business_id
       join rms_lead_state s on s.business_id = r.business_id and s.source_type = r.source_type and s.source_id = r.source_id
       left join interactive_activations a on a.id = c.activation_id and a.company_id = c.business_id
      where r.business_id = $1 and r.status = 'SENT' and s.rms_phase = 'clasificacion'
        and c.metadata->>'source_module' = 'rms_activation_1'
      order by r.source_type, r.source_id, r.sent_at desc nulls last`,
    [businessId]
  );
  return new Map(accepted.rows.map((row) => {
    const sentAt = row.sent_at ? new Date(row.sent_at) : new Date();
    const persistedFollowUp = row.recipient_metadata?.rms_activation_follow_up_at;
    const followUpAt = persistedFollowUp || new Date(sentAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
    return [`${crmSourceType(row)}:${row.source_id}`, {
      activation_offer_sent_at: sentAt.toISOString(),
      activation_first_contact_at: sentAt.toISOString(),
      activation_contact_count: 1,
      activation_delivery_channel: "email",
      activation_offer_name: row.activation_title || "Activación enviada",
      activation_offer_note: "Activación masiva aceptada por Resend · Canal: email.",
      activation_message: row.email_body || "",
      activation_ticket_url: row.action_url || null,
      activation_follow_up_at: followUpAt,
      activation_outcome: "PENDING",
      activation_id: row.activation_id || null,
      business_communication_id: row.communication_id,
      resend_message_id: row.provider_message_id || null,
      activation_delivery_source: "resend_bulk_acceptance",
    }];
  }));
}

async function listRmsOpportunities(businessId, filters = {}) {
  const limit = Math.min(Number(filters.limit || 120), 180);
  const phaseFilter = normalizePhase(filters.rms_phase || filters.phase, "");
  const lite = ["1", "true", true].includes(filters.lite);
  // Primero se obtiene la persona completa, sin limitarla a una estación.
  // Así un PLAYER y un MANUAL con el mismo teléfono/correo pueden resolverse
  // como una sola oportunidad antes de decidir en qué estación aparece.
  const crmFilters = { ...filters };
  delete crmFilters.rms_phase;
  delete crmFilters.phase;
  const stationFastPath = lite && Boolean(phaseFilter);
  const inventoryPromise = inventoryProductsForBusiness(businessId);
  const stationStateRows = stationFastPath
    ? await recentStateRowsForBusiness(businessId, limit, phaseFilter)
    : null;
  const data = stationFastPath
    ? {
      leads: phaseFilter === "control_anti_fuga"
        ? await riskLeadRowsForStateRefs(businessId, stationStateRows)
        : await leadRowsForStateRefs(businessId, stationStateRows, crmFilters),
      pagination: { total: stationStateRows.length, limit, offset: 0, has_more: stationStateRows.length >= limit },
    }
    : await listLeadCrmRows(businessId, {
      ...crmFilters,
      limit,
      offset: filters.offset || 0,
    });
  const baseRows = data.leads || data.rows || [];
  // Cuando se abre una estación, su estado RMS es la fuente de verdad. La
  // vista CRM puede estar paginada o fusionar el contacto con otra fuente,
  // pero una venta que pasó a Valorización debe aparecer siempre allí.
  const recentStateRows = stationStateRows || (phaseFilter
    ? await recentStateRowsForBusiness(businessId, 500, phaseFilter)
    : await recentStateRowsForBusiness(businessId, 240));
  const baseKeys = new Set(baseRows.map((row) => `${crmSourceType(row)}:${row.id}`));
  const missingStateRows = stationFastPath ? [] : recentStateRows.filter((row) => !baseKeys.has(`${crmSourceType(row)}:${row.source_id}`));
  const extraRows = missingStateRows.length
    ? await leadRowsForStateRefs(businessId, missingStateRows, crmFilters)
    : [];
  const mergedRows = [...baseRows];
  extraRows.forEach((row) => {
    const key = `${crmSourceType(row)}:${row.id}`;
    if (!baseKeys.has(key)) {
      baseKeys.add(key);
      mergedRows.push(row);
    }
  });
  const stateMap = stationFastPath
    ? new Map(recentStateRows.map((row) => [`${crmSourceType(row)}:${row.source_id}`, row]))
    : new Map([
      ...recentStateRows.map((row) => [`${crmSourceType(row)}:${row.source_id}`, row]),
      ...Array.from((await stateRowsFor(businessId, mergedRows)).entries()),
    ]);
  if (phaseFilter === "clasificacion") {
    const acceptedDeliveries = await acceptedRmsActivationDeliveryMap(businessId);
    acceptedDeliveries.forEach((delivery, key) => {
      const stateRow = stateMap.get(key);
      if (!stateRow || stateRow.metadata?.activation_offer_sent_at) return;
      stateMap.set(key, { ...stateRow, metadata: { ...(stateRow.metadata || {}), ...delivery } });
    });
  }
  const openRecyclingRows = phaseFilter === "accion_correctiva"
    ? await query(
      `select source_type, source_id
         from rms_recycling_cases
        where business_id = $1 and recycle_status in ('SCHEDULED', 'REACTIVATING')`,
      [businessId]
    )
    : { rows: [] };
  const openRecyclingKeys = new Set((openRecyclingRows.rows || []).map((row) => `${crmSourceType(row)}:${row.source_id}`));
  const inventoryProducts = await inventoryPromise;
  const canonicalRows = collapseRmsDuplicateContacts(mergedRows, stateMap);
  const allOpportunities = canonicalRows.map((row) => (
    opportunityFromRow(row, stateMap.get(`${crmSourceType(row)}:${row.id}`), inventoryProducts)
  )).sort((a, b) => b.priority_score - a.priority_score || b.risk_score - a.risk_score);
  // Reciclaje es una salida lateral de Negociación: el estado histórico
  // conserva `accion_correctiva` para auditoría, pero el caso no puede
  // seguir apareciendo como operable en esa estación.
  const isOpenRecycled = (item) => item.state_metadata?.recycling?.status === "RECYCLED"
    || openRecyclingKeys.has(`${item.source_type}:${item.source_id}`);
  const opportunities = phaseFilter
    ? allOpportunities.filter((item) => item.stage === phaseFilter && !(phaseFilter === "accion_correctiva" && isOpenRecycled(item)))
    : allOpportunities;
  return {
    opportunities,
    pagination: {
      ...(data.pagination || {}),
      total: opportunities.length,
      limit,
      offset: Number(filters.offset || 0),
      has_more: false,
    },
    stages: RMS_PHASES,
    quality_controls: RMS_QUALITY_CONTROLS,
    transition_contract: RMS_TRANSITION_CONTRACT,
    operations: PHASE_OPERATIONS,
    funnel: lite ? [] : buildIntakeFunnel(opportunities),
    process_flow: lite ? [] : buildIndustrialProcess(opportunities),
    alerts: lite ? [] : rmsAlerts(opportunities),
    inventory_products: phaseFilter === "control_anti_fuga" ? inventoryProducts : undefined,
    deduplication: { collapsed_contacts: Math.max(0, mergedRows.length - canonicalRows.length) },
    scope: phaseFilter ? { mode: "station", phase: phaseFilter, lite } : { mode: "machine", phase: "", lite },
  };
}

async function getDailyQueue(businessId, filters = {}) {
  const { opportunities, pagination, stages, quality_controls, transition_contract, operations, funnel, process_flow, alerts, scope, inventory_products } = await listRmsOpportunities(businessId, filters);
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
    quality_controls,
    transition_contract,
    operations,
    funnel,
    process_flow,
    alerts,
    events: events.events,
    pagination,
    scope,
    inventory_products,
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
  const intake = opportunities.filter((item) => ["recoleccion", "alimentacion", "curaduria", "clasificacion", "procesamiento", "accion_correctiva", "control_anti_fuga", "cierre"].includes(item.stage)).length;
  const converted = opportunities.filter((item) => item.stage === "postventa").length;
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

function rmsCustomerIdentity(item = {}) {
  const documentId = String(item.document_id || "").trim();
  const email = String(item.email || "").trim().toLowerCase();
  const phone = String(item.phone || "").replace(/\D/g, "");
  return { documentId: documentId || null, email: email || null, phone: phone || null };
}

/**
 * A sale in RMS is the moment a prospect becomes a customer.  Leads imported
 * manually (and other non-player sources) used to remain only as their source
 * record, so they disappeared from the customer contact view.  Keep one
 * canonical player contact for the customer, reusing it by document, email or
 * phone before creating anything new.
 */
async function ensureRmsCustomerContact(client, businessId, user, item, sourceType, sourceId) {
  if (sourceType === "PLAYER") {
    const sourcePlayer = await client.query(
      `select id, name, email, phone, document_id
         from players
        where business_id = $1 and id = $2
        for update`,
      [businessId, sourceId]
    );
    if (sourcePlayer.rowCount) return { customer: sourcePlayer.rows[0], created: false };
  }
  const identity = rmsCustomerIdentity(item);
  const lockKey = [businessId, identity.documentId || identity.email || identity.phone || String(sourceId)].join(":");
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`rms-customer:${lockKey}`]);

  const existing = await client.query(
    `select id, name, email, phone, document_id
       from players
      where business_id = $1
        and (
          ($2::text is not null and nullif(document_id, '') = $2)
          or ($3::text is not null and lower(nullif(email, '')) = $3)
          or ($4::text is not null and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $4)
        )
      order by created_at asc
      limit 1
      for update`,
    [businessId, identity.documentId, identity.email, identity.phone]
  );
  if (existing.rowCount) return { customer: existing.rows[0], created: false };

  const created = await client.query(
    `insert into players (business_id, campaign_id, game_id, name, email, phone, document_id, metadata)
     values ($1, $2, null, $3, $4, $5, $6, $7::jsonb)
     returning id, name, email, phone, document_id`,
    [
      businessId,
      item.campaign_id || null,
      String(item.name || "Cliente sin nombre").trim() || "Cliente sin nombre",
      identity.email || null,
      item.phone || null,
      identity.documentId,
      JSON.stringify({
        crm_created_from: "rms_attributed_sale",
        crm_source_type: sourceType,
        crm_source_id: sourceId,
        source: "Venta atribuida RMS",
        customer_created_at: new Date().toISOString(),
        created_by_user_id: user?.id || null,
      }),
    ]
  );
  return { customer: created.rows[0], created: true };
}

async function resolveRmsRelatedAffiliate(client, businessId, item, sourceType, sourceId, customer = {}) {
  const result = await client.query(
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
      sourceType === "AFFILIATE" ? sourceId : item.affiliate_id || null,
      customer.document_id || item.document_id || null,
      customer.phone || item.phone || null,
      customer.email || item.email || null,
    ]
  );
  return result.rows[0] || null;
}

function assertRmsPhaseTransition(fromPhase, toPhase, payload = {}) {
  const from = normalizePhase(fromPhase, "");
  if (!from || from === toPhase) return;
  if (RMS_LEGACY_QUALITY_PHASES.has(from)) {
    throw badRequest(`${phaseLabel(from)} es un control histórico de consulta. Migra el caso a su estación operativa antes de moverlo.`);
  }
  const allowed = RMS_TRANSITION_CONTRACT
    .filter((transition) => transition.from === from)
    .map((transition) => transition.to);
  if (!allowed.includes(toPhase)) {
    throw badRequest(`${phaseLabel(from)} solo puede continuar a ${allowed.map(phaseLabel).join(" o ")}.`);
  }
  if (from === "control_anti_fuga" && toPhase === "accion_correctiva") {
    const recovery = payload.metadata?.recovery_decision === "NEGOTIATION";
    if (!recovery || !String(payload.reason || "").trim()) {
      throw badRequest("El regreso a Negociación exige una decisión de recuperación y su razón.");
    }
  }
  if (from === "accion_correctiva" && ["procesamiento", "clasificacion", "reciclaje", "cierre"].includes(toPhase)) {
    const allowed = payload.metadata?.negotiation_result === "ACCEPTED" || payload.metadata?.negotiation_result === "REPROCESS" || payload.metadata?.negotiation_result === "RECYCLE" || payload.metadata?.negotiation_result === "LOST" || payload.metadata?.commercial_route === "NEGOTIATION_CLEAN" || payload.metadata?.recycle_result === "REACTIVATED";
    if (!allowed || !String(payload.reason || "").trim()) {
      throw badRequest("La salida de Negociación exige una decisión documentada y su razón.");
    }
  }
  if (from === "reciclaje" && ["procesamiento", "clasificacion"].includes(toPhase)) {
    if (payload.metadata?.recycle_result !== "REACTIVATED" || !String(payload.reason || "").trim()) {
      throw badRequest("La reactivación exige una decisión humana y contexto actualizado.");
    }
  }
}

function assertRmsTransitionAuthority(fromPhase, toPhase, authority = null) {
  const required = RMS_PROTECTED_TRANSITIONS[fromPhase]?.[toPhase];
  if (!required || required === authority || (Array.isArray(required) && required.includes(authority))) return;
  throw badRequest("Esta transicion exige completar la operacion verificada de la estacion actual.");
}

async function moveRmsLeadPhase(businessId, user, payload = {}, authority = null) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const sourceId = payload.source_id;
  const toPhase = normalizePhase(payload.to_phase || payload.rms_phase, "");
  if (!sourceId || !toPhase) throw badRequest("Faltan source_id o fase RMS.");
  if (["preprocesamiento", "revenue_generado", "inteligencia"].includes(toPhase)) {
    throw badRequest("Los controles de calidad e Inteligencia son de consulta; no reciben movimientos RMS.");
  }
  const metadata = payload.metadata && typeof payload.metadata === "object" ? { ...payload.metadata } : {};
  const isClassificationWrite = String(metadata.source_flow || "").startsWith("clasificador_product_classification");
  const selectedClassificationProducts = Array.isArray(metadata.classified_products)
    ? metadata.classified_products
    : (metadata.classified_product_id ? [{ inventory_product_id: metadata.classified_product_id }] : []);
  if (isClassificationWrite && !selectedClassificationProducts.length && metadata.classification_source !== "manual_clear") {
    throw badRequest("La Clasificación requiere un producto o servicio activo del inventario.");
  }
  if (selectedClassificationProducts.length) {
    const snapshots = [];
    const seenProductIds = new Set();
    for (const selectedProduct of selectedClassificationProducts) {
      const inventoryProductId = selectedProduct?.inventory_product_id || selectedProduct?.id || selectedProduct;
      if (!inventoryProductId || seenProductIds.has(String(inventoryProductId))) continue;
      const product = await rmsInventoryProductSnapshot(businessId, inventoryProductId);
      seenProductIds.add(String(product.inventory_product_id));
      snapshots.push({
        inventory_product_id: product.inventory_product_id,
        name: product.product_name_snapshot,
        category: selectedProduct?.category || "",
        unit_price: product.product_price_snapshot,
        currency: product.product_currency_snapshot,
        quantity: Math.max(1, Number(selectedProduct?.quantity || 1)),
        line_total: moneyNumber(product.product_price_snapshot) * Math.max(1, Number(selectedProduct?.quantity || 1)),
      });
    }
    if (isClassificationWrite && !snapshots.length && metadata.classification_source !== "manual_clear") {
      throw badRequest("Selecciona al menos un producto activo del inventario.");
    }
    metadata.classified_products = snapshots;
    const primaryProduct = snapshots[0];
    metadata.classified_product_id = primaryProduct?.inventory_product_id || null;
    metadata.classified_product_name = primaryProduct?.name || null;
    metadata.classified_product_price_snapshot = primaryProduct?.unit_price ?? null;
    metadata.classified_product_currency_snapshot = primaryProduct?.currency || null;
    metadata.classification_source = "manual_inventory";
  }
  const result = await withTransaction(async (client) => {
    // Lock and validate inside the same transaction so a stale browser tab
    // cannot advance a lead after another operator already moved it.
    const current = await client.query(
      `select rms_phase from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3 for update`,
      [businessId, sourceType, sourceId]
    );
    const fromPhase = current.rows[0]?.rms_phase || null;
    assertRmsPhaseTransition(fromPhase, toPhase, { ...payload, metadata });
    assertRmsTransitionAuthority(fromPhase, toPhase, authority);
    const transitionMetadata = {
      ...metadata,
      handoff: {
        ...(metadata.handoff && typeof metadata.handoff === "object" ? metadata.handoff : {}),
        from_phase: fromPhase,
        to_phase: toPhase,
        decision: metadata.decision || payload.last_operation || `move_to_${toPhase}`,
        responsible: user.id,
        reason: String(payload.reason || "").trim() || null,
        evidence: [payload.last_material_sent, metadata.commercial_confirmation?.evidence, metadata.commercial_confirmation?.payment_reference].filter(Boolean),
        next_action: payload.recommended_action || null,
        recorded_at: new Date().toISOString(),
      },
    };
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
        JSON.stringify(transitionMetadata),
        user.id,
      ]
    );
    const movement = await client.query(
      `insert into rms_phase_movements
        (business_id, source_type, source_id, lead_id, from_phase, to_phase, moved_by, reason, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       returning *`,
      [businessId, sourceType, sourceId, payload.lead_id || null, fromPhase, toPhase, user.id, payload.reason || null, JSON.stringify(transitionMetadata)]
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
        JSON.stringify({ ...transitionMetadata, from_phase: fromPhase, to_phase: toPhase, movement_id: movement.rows[0].id }),
      ]
    );
    await client.query(
      `insert into rms_intelligence_case_events
        (business_id, source_type, source_id, lead_id, event_type, operational_phase, lifecycle_status, payload, idempotency_key, created_by)
       values ($1,$2,$3,$4,'phase_moved',$5,$6,$7::jsonb,$8,$9)
       on conflict (business_id, idempotency_key) do nothing`,
      [businessId, sourceType, sourceId, payload.lead_id || null, toPhase,
        state.rows[0].lifecycle_status || "ACTIVE",
        JSON.stringify({ from_phase: fromPhase, to_phase: toPhase, movement_id: movement.rows[0].id, reason: payload.reason || null, handoff: transitionMetadata.handoff }),
        `rms-movement:${movement.rows[0].id}`, user.id]
    );
    return { state: state.rows[0], movement: movement.rows[0] };
  });
  return result;
}

async function recordRmsWorkflowEvent(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const event = await query(
    `insert into rms_machine_events
      (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, created_by, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb) returning id`,
    [
      businessId, sourceType, payload.source_id, payload.lead_id || null,
      payload.event_type, payload.event_title, payload.event_description || null,
      payload.rms_phase, payload.operation_key || payload.event_type, user.id,
      JSON.stringify(payload.metadata || {}),
    ]
  );
  const state = await query(
    `select lifecycle_status from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, payload.source_id]
  );
  await query(
    `insert into rms_intelligence_case_events
      (business_id, source_type, source_id, lead_id, sale_id, event_type, operational_phase, lifecycle_status, payload, idempotency_key, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
     on conflict (business_id, idempotency_key) do nothing`,
    [businessId, sourceType, payload.source_id, payload.lead_id || null, payload.metadata?.sale_id || null,
      payload.event_type, payload.rms_phase || null, state.rows[0]?.lifecycle_status || "ACTIVE",
      JSON.stringify({ event_id: event.rows[0]?.id || null, ...(payload.metadata || {}) }),
      `rms-event:${event.rows[0]?.id || `${sourceType}:${payload.source_id}:${Date.now()}`}`, user.id]
  );
  return event.rows[0] || null;
}

// Intelligence records lifecycle evidence without changing the lead's real
// operating phase. That distinction prevents active cases from being absorbed
// by an analytical screen.
async function markRmsLifecycleStatus(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const sourceId = payload.source_id;
  if (!sourceId) throw badRequest("Falta el caso para actualizar su ciclo analítico.");
  let lifecycleStatus;
  try {
    lifecycleStatus = normalizeIntelligenceLifecycleStatus(payload.lifecycle_status);
  } catch (error) {
    throw badRequest(error.message);
  }
  return withTransaction(async (client) => {
    const current = await client.query(
      `select * from rms_lead_state
        where business_id = $1 and source_type = $2 and source_id = $3 for update`,
      [businessId, sourceType, sourceId]
    );
    if (!current.rowCount) throw notFound("No encontramos el estado RMS de este caso.");
    const operationalPhase = current.rows[0].rms_phase;
    const detail = String(payload.reason || payload.description || "Resultado analítico actualizado.").trim();
    const eventKey = String(payload.idempotency_key || `lifecycle:${sourceType}:${sourceId}:${lifecycleStatus}:${payload.event_type || "updated"}`);
    const duplicate = await client.query(
      `select id from rms_intelligence_case_events where business_id = $1 and idempotency_key = $2 for update`,
      [businessId, eventKey]
    );
    if (duplicate.rowCount) {
      return { state: current.rows[0], operational_phase: operationalPhase, lifecycle_status: current.rows[0].lifecycle_status, duplicate: true };
    }
    const state = await client.query(
      `update rms_lead_state set lifecycle_status = $4, intelligence_updated_at = now(),
          metadata = coalesce(metadata, '{}'::jsonb) || $5::jsonb, updated_by = $6, updated_at = now()
       where business_id = $1 and source_type = $2 and source_id = $3 returning *`,
      [businessId, sourceType, sourceId, lifecycleStatus, JSON.stringify({
        lifecycle_status: lifecycleStatus, lifecycle_reason: detail, lifecycle_updated_at: new Date().toISOString(),
      }), user.id]
    );
    await client.query(
      `insert into rms_machine_events
        (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, created_by, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'intelligence_projection',$9,$10::jsonb)`,
      [businessId, sourceType, sourceId, payload.lead_id || current.rows[0].lead_id || null,
        payload.event_type || "intelligence_lifecycle_updated", payload.event_title || "Ficha de Inteligencia actualizada",
        detail, operationalPhase, user.id,
        JSON.stringify({ lifecycle_status: lifecycleStatus, sale_id: payload.sale_id || null, analytical_only: true })]
    );
    await client.query(
      `insert into rms_intelligence_case_events
        (business_id, source_type, source_id, lead_id, sale_id, event_type, operational_phase, lifecycle_status, payload, idempotency_key, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
       on conflict (business_id, idempotency_key) do nothing`,
      [businessId, sourceType, sourceId, payload.lead_id || current.rows[0].lead_id || null, payload.sale_id || null,
        payload.event_type || "intelligence_lifecycle_updated", operationalPhase, lifecycleStatus,
        JSON.stringify({ reason: detail, ...(payload.metadata || {}) }), eventKey, user.id]
    );
    return { state: state.rows[0], operational_phase: operationalPhase, lifecycle_status: lifecycleStatus };
  });
}

const RMS_EVALUATION_ROUTES = {
  NEGOTIATION: {
    phase: "accion_correctiva",
    label: "Negociación",
    action: "Continuar la conversación y acordar condiciones",
  },
  PAID_SALE: {
    phase: "cierre",
    label: "Ventas atribuidas",
    action: "Completar el registro de la venta, producto, cantidad y pago",
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
  RECYCLE: {
    phase: "procesamiento",
    label: "Reciclaje",
    action: "Conservar el motivo y revisar el lead cuando vuelva a ser viable",
  },
  NO_RESPONSE: {
    phase: "control_anti_fuga",
    label: "Riesgos de fuga",
    action: "Revisar el silencio comercial y definir una recuperación responsable",
  },
  OBJECTION: {
    phase: "control_anti_fuga",
    label: "Riesgos de fuga",
    action: "Proteger el acuerdo y resolver la objeción antes de continuar",
  },
  NOT_QUALIFIED: {
    phase: "control_anti_fuga",
    label: "Riesgos de fuga",
    action: "Documentar la falta de interés y decidir una salida responsable",
  },
};

const RMS_EVALUATION_DESTINATIONS = {
  NEGOTIATION: RMS_EVALUATION_ROUTES.NEGOTIATION,
  RISK_REVIEW: RMS_EVALUATION_ROUTES.OBJECTION,
  ATTRIBUTED_SALE: RMS_EVALUATION_ROUTES.PAID_SALE,
  RECYCLE: RMS_EVALUATION_ROUTES.RECYCLE,
};

function rmsEvaluationSummary(response, route) {
  if (response === "PAID_SALE") return "La venta fue reportada desde Activación 1; falta completar producto, cantidad, pago y evidencia antes de atribuirla.";
  if (response === "NO_RESPONSE") return "El cliente no respondió a Activación 1; el caso pasa a Riesgos de fuga para decidir una recuperación responsable.";
  if (response === "OBJECTION") return "El cliente planteó una objeción; el caso pasa a Riesgos de fuga con el contexto para proteger la oportunidad.";
  if (response === "NOT_QUALIFIED") return "El cliente no muestra interés por ahora; el caso pasa a Riesgos de fuga para documentar la salida o recuperación permitida.";
  if (response === "RECYCLE") return "El lead no es convertible por ahora; queda en Reciclaje con su motivo y fecha de revisión para no insistirle sin contexto.";
  if (route.phase === "accion_correctiva") return "El caso fue dirigido a Negociación para acordar las condiciones y el siguiente compromiso.";
  if (response === "NEGOTIATION") return "El cliente tiene intención de compra y requiere acordar condiciones.";
  if (response === "MISSING_INFORMATION") return "El cliente necesita información antes de tomar la decisión.";
  if (response === "NURTURE") return "El cliente no compra ahora; se conserva en una ruta de nutrición y seguimiento.";
  return `El caso no califica por ahora y queda documentado en ${route.label}.`;
}

async function recordRmsEvaluationResponse(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "procesamiento") throw badRequest("La respuesta solo puede registrarse desde Evaluación.");
  const response = String(payload.response || "").toUpperCase();
  let destination = "";
  const route = RMS_EVALUATION_ROUTES[response];
  if (!RMS_EVALUATION_ROUTES[response]) throw badRequest("Selecciona una decisión comercial válida.");
  destination = route.phase === "cierre" ? "ATTRIBUTED_SALE" : route.phase === "control_anti_fuga" ? "RISK_REVIEW" : route.phase === "reciclaje" ? "RECYCLE" : "NEGOTIATION";
  const recycleAt = payload.recycle_at || payload.next_action_at || null;
  const recycleNote = String(payload.recycle_note || "").trim();
  if (response === "RECYCLE") {
    if (!payload.recycle_reason || !recycleNote) throw badRequest("Para enviar a Reciclaje indica el motivo y explícalo brevemente.");
    if (!recycleAt || new Date(recycleAt).getTime() <= Date.now()) throw badRequest("Indica una fecha futura para revisar el lead reciclado.");
  }
  const note = String(payload.note || "").trim()
    || `Resultado de Evaluación: ${response}. Destino elegido: ${route.label}.`;
  const recommendedProduct = payload.recommended_inventory_product_id
    ? await rmsInventoryProductSnapshot(businessId, payload.recommended_inventory_product_id)
    : null;
  const evaluation = {
    response,
    scenario: ["PAID_SALE", "NEGOTIATION"].includes(response) ? (response === "PAID_SALE" ? "EASY_CLOSE" : "ASSISTED_NEGOTIATION") : response === "RECYCLE" ? "RECYCLE" : "ASSISTED_NEGOTIATION",
    destination: destination || (route.phase === "cierre" ? "ATTRIBUTED_SALES" : route.phase === "accion_correctiva" ? "NEGOTIATION" : route.phase === "reciclaje" ? "RECYCLE" : null),
    route: route.phase,
    route_label: route.label,
    need: String(payload.need || "").trim() || null,
    desired_outcome: String(payload.desired_outcome || "").trim() || null,
    recommended_inventory_product_id: recommendedProduct?.inventory_product_id || null,
    recommended_product: recommendedProduct?.product_name || null,
    recommended_product_snapshot: recommendedProduct ? {
      name: recommendedProduct.product_name_snapshot,
      price: recommendedProduct.product_price_snapshot,
      currency: recommendedProduct.product_currency_snapshot,
      source: recommendedProduct.product_source,
    } : null,
    budget_amount: payload.budget_amount === null || payload.budget_amount === undefined ? null : moneyNumber(payload.budget_amount),
    currency: String(payload.currency || "COP").trim().toUpperCase().slice(0, 8) || "COP",
    decision_maker: String(payload.decision_maker || "").trim() || null,
    urgency: String(payload.urgency || "MEDIUM").toUpperCase(),
    objections: String(payload.objections || "").trim() || null,
    next_action: String(payload.next_action || "").trim() || (response === "PAID_SALE" ? "Confirmar pago y condiciones con el cliente" : response === "RECYCLE" ? "Revisar lead reciclado con el motivo registrado" : null),
    next_action_at: response === "RECYCLE" ? recycleAt : payload.next_action_at || null,
    recycling: response === "RECYCLE" ? { reason: payload.recycle_reason, note: recycleNote, recycle_at: recycleAt, target_phase: "procesamiento" } : null,
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
  const recycling = response === "RECYCLE" ? await scheduleRmsRecyclingCase(businessId, user, {
    source_id: payload.source_id,
    source_type: sourceType,
    lead_id: item.lead_id || payload.lead_id || null,
    recycled_from_phase: "procesamiento",
    recycle_reason: payload.recycle_reason,
    recycle_strategy: "NURTURE",
    recycle_owner: String(user.name || user.email || user.id),
    recycle_at: recycleAt,
    recycle_channel: null,
    recycle_consent: "NOT_REQUIRED",
    recycle_note: recycleNote,
    recycle_target_phase: "procesamiento",
    idempotency_key: payload.idempotency_key ? `evaluation:${payload.idempotency_key}` : null,
    metadata: { rms_evaluation: evaluation, agenda_note_id: agenda?.item?.id || null },
  }) : null;
  if (recycling?.recycling_case?.id && agenda?.item?.id) await query(
    `update rms_recycling_cases set agenda_note_id=$3, updated_at=now() where business_id=$1 and id=$2`,
    [businessId, recycling.recycling_case.id, agenda.item.id]
  );
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
      recycling: recycling ? { status: "RECYCLED", recycling_case_id: recycling.recycling_case?.id || null, reason: payload.recycle_reason, reactivate_at: recycleAt, note: recycleNote } : null,
    },
  }, RMS_TRANSITION_AUTHORITY.EVALUATION);
  if (response === "RECYCLE") {
    await recordRmsWorkflowEvent(businessId, user, {
      source_type: sourceType,
      source_id: payload.source_id,
      lead_id: item.lead_id || payload.lead_id || null,
      event_type: "evaluation_sent_to_recycling",
      event_title: "Lead enviado a Reciclaje desde Evaluación",
      event_description: recycleNote,
      rms_phase: "reciclaje",
      metadata: { rms_evaluation: evaluation, recycling_case_id: recycling?.recycling_case?.id || null, movement_id: movement.movement?.id || null },
    });
    await markRmsLifecycleStatus(businessId, user, {
      source_type: sourceType,
      source_id: payload.source_id,
      lead_id: item.lead_id || payload.lead_id || null,
      lifecycle_status: "RECYCLED",
      event_type: "evaluation_recycled_analyzed",
      event_title: "Reciclaje incorporado a Inteligencia",
      reason: recycleNote,
      idempotency_key: `evaluation-recycle:${payload.idempotency_key || `${sourceType}:${payload.source_id}`}`,
      metadata: { rms_evaluation: evaluation, recycling_case_id: recycling?.recycling_case?.id || null },
    });
  }
  if (response === "NOT_QUALIFIED") {
    await markRmsLifecycleStatus(businessId, user, {
      source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
      lifecycle_status: "LOST_ANALYZED", event_type: "evaluation_loss_analyzed",
      event_title: "Pérdida documentada para Inteligencia", reason: note,
      idempotency_key: `evaluation-loss:${payload.idempotency_key || `${sourceType}:${payload.source_id}`}`,
      metadata: { rms_evaluation: evaluation },
    });
  }
  if (response === "PAID_SALE") {
    await recordRmsWorkflowEvent(businessId, user, {
      source_type: sourceType,
      source_id: payload.source_id,
      lead_id: item.lead_id || payload.lead_id || null,
      event_type: "payment_reported",
      event_title: "Pago informado por el cliente",
      event_description: "La venta fue reportada desde Activación 1; falta completar producto, cantidad, pago y evidencia en Ventas atribuidas.",
      rms_phase: "cierre",
      metadata: { rms_evaluation: evaluation, movement_id: movement.movement?.id || null },
    });
    await recordRmsWorkflowEvent(businessId, user, {
      source_type: sourceType,
      source_id: payload.source_id,
      lead_id: item.lead_id || payload.lead_id || null,
      event_type: "attributed_sale_started",
      event_title: "Registro de venta atribuida iniciado",
      event_description: "El caso quedó listo para completar el registro de venta atribuida.",
      rms_phase: "cierre",
      metadata: { rms_evaluation: evaluation, movement_id: movement.movement?.id || null },
    });
  }
  return { evaluation, route, note: historyNote, agenda, agenda_warning: agendaWarning, recycling, ...movement };
}

function rmsCommercialConfirmationFromPayload(payload = {}, user = {}, product = {}) {
  return {
    status: "CONFIRMED",
    inventory_product_id: product.inventory_product_id || null,
    product_name: product.product_name || "",
    product_name_snapshot: product.product_name_snapshot || product.product_name || "",
    product_price_snapshot: product.product_price_snapshot ?? null,
    product_currency_snapshot: product.product_currency_snapshot || null,
    product_source: product.product_source || "INVENTORY",
    amount: moneyNumber(payload.amount),
    currency: String(payload.currency || "COP").trim().toUpperCase().slice(0, 8) || "COP",
    payment_reference: String(payload.payment_reference || "").trim(),
    evidence: String(payload.evidence || "").trim(),
    responsible: String(payload.responsible || user.name || user.email || "").trim() || null,
    confirmed_at: payload.confirmed_at || new Date().toISOString(),
    note: String(payload.note || "").trim() || null,
    idempotency_key: String(payload.idempotency_key || "").trim() || null,
    sale_context: {
      quantity: Math.max(0.01, Number(payload.sale_quantity || payload.quantity || 1)),
      benefit_type: String(payload.benefit_type || "NONE").trim().toUpperCase(),
      benefit_cost: Math.max(0, moneyNumber(payload.benefit_cost)),
      acquisition_cost: Math.max(0, moneyNumber(payload.acquisition_cost)),
      benefit_description: String(payload.benefit_description || "").trim() || null,
    },
    negotiation: {
      objective: String(payload.objective || "").trim() || null,
      objection_type: String(payload.objection_type || "").trim() || null,
      customer_condition: String(payload.customer_condition || "").trim() || null,
      proposal: String(payload.proposal || "").trim() || null,
      concession: String(payload.concession || "").trim() || null,
      channel: String(payload.channel || "").trim() || null,
      summary: String(payload.summary || "").trim() || null,
      reason: String(payload.reason || "").trim() || null,
      objection_status: String(payload.objection_status || "NOT_APPLICABLE").trim() || "NOT_APPLICABLE",
      objection_resolution: String(payload.objection_resolution || "").trim() || null,
    },
  };
}

async function recordRmsCommercialConfirmation(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const priorState = await query(
    `select metadata from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, payload.source_id]
  );
  const priorMetadata = priorState.rows[0]?.metadata || {};
  const priorConfirmation = priorMetadata.commercial_confirmation || {};
  if (payload.idempotency_key && priorConfirmation.idempotency_key === payload.idempotency_key) {
    return {
      confirmation: priorConfirmation,
      duplicate: true,
      destination: priorMetadata.commercial_route === "NEGOTIATION_CLEAN" ? "cierre" : "control_anti_fuga",
    };
  }
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "accion_correctiva") throw badRequest("La confirmación comercial solo se registra desde Negociación.");
  const product = await rmsInventoryProductSnapshot(businessId, payload.inventory_product_id);
  const confirmation = rmsCommercialConfirmationFromPayload(payload, user, product);
  const commercialRoute = payload.commercial_route === "NEGOTIATION_CLEAN" ? "NEGOTIATION_CLEAN" : "NEEDS_RISK_REVIEW";
  const missing = [
    !confirmation.inventory_product_id && "producto o servicio del inventario",
    confirmation.amount <= 0 && "valor de la venta",
  ].filter(Boolean);
  if (missing.length) throw badRequest(`Antes de continuar confirma: ${missing.join(", ")}.`);
  const confirmationRound = {
    result: "ACCEPTED",
    ...confirmation.negotiation,
    reason: confirmation.negotiation.reason || confirmation.note || "Condición comercial confirmada.",
    recorded_at: confirmation.confirmed_at,
    recorded_by: user.id,
  };
  const negotiationHistory = Array.isArray(priorMetadata.negotiation_history) ? priorMetadata.negotiation_history.slice(-19) : [];
  const note = await createLeadNote(businessId, user, payload.source_id, sourceType, {
    note: `Confirmación comercial. ${confirmation.product_name} por ${confirmation.amount} ${confirmation.currency}. ${confirmation.note || "Condición y soporte confirmados."}`,
    note_type: "commercial",
    metadata: { source_module: "rms_commercial_confirmation", commercial_confirmation: confirmation },
  });
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    to_phase: commercialRoute === "NEGOTIATION_CLEAN" ? "cierre" : "control_anti_fuga", priority: "HIGH",
    recommended_action: commercialRoute === "NEGOTIATION_CLEAN" ? "Registrar venta limpia atribuida" : "Validar que el acuerdo no tenga riesgo antes de atribuir la venta",
    last_operation: commercialRoute === "NEGOTIATION_CLEAN" ? "clean_sale_confirmed" : "agreement_requires_risk_review", last_material_sent: confirmation.product_name,
    revenue_potential: confirmation.amount,
    reason: commercialRoute === "NEGOTIATION_CLEAN" ? "Venta limpia confirmada desde Negociación." : "Condición comercial confirmada; pasa a validación final anti-fuga.",
    metadata: { commercial_confirmation: { ...confirmation, route: commercialRoute }, commercial_confirmation_note_id: note.id, negotiation_current: confirmationRound, negotiation_history: [...negotiationHistory, confirmationRound], negotiation_result: "ACCEPTED", commercial_route: commercialRoute, risk_signals: payload.risk_signals || [] },
  }, RMS_TRANSITION_AUTHORITY.COMMERCIAL_CONFIRMATION);
  await recordRmsWorkflowEvent(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    event_type: commercialRoute === "NEGOTIATION_CLEAN" ? "clean_sale_confirmed" : "agreement_requires_risk_review", event_title: commercialRoute === "NEGOTIATION_CLEAN" ? "Venta limpia confirmada" : "Acuerdo enviado a Riesgos de fuga",
    event_description: commercialRoute === "NEGOTIATION_CLEAN" ? "La evidencia y condición comercial permiten atribuir sin revisión anti-fuga." : "Existen señales que requieren proteger el acuerdo antes de atribuirlo.",
    rms_phase: commercialRoute === "NEGOTIATION_CLEAN" ? "cierre" : "control_anti_fuga", metadata: { commercial_confirmation: confirmation, commercial_route: commercialRoute, negotiation_round: confirmationRound, movement_id: movement.movement?.id || null },
  });
  return { confirmation, note, ...movement };
}

function recyclingDisplayStatus(row = {}, now = Date.now()) {
  if (row.recycle_status === "SCHEDULED" && new Date(row.recycle_at).getTime() < now) return "OVERDUE";
  if (row.recycle_status === "SCHEDULED" && new Date(row.recycle_at).getTime() <= now + 24 * 60 * 60 * 1000) return "DUE";
  return row.recycle_status || "SCHEDULED";
}

async function recordRmsRecyclingEvent(businessId, user, recyclingCase, action, nextStatus, reason, payload = {}, idempotencyKey = null) {
  const existing = idempotencyKey ? await query(
    `select id from rms_recycling_events where business_id = $1 and idempotency_key = $2`,
    [businessId, idempotencyKey]
  ) : null;
  if (existing?.rows[0]) return existing.rows[0];
  const event = await query(
    `insert into rms_recycling_events
      (business_id, recycling_case_id, action, previous_status, next_status, reason, payload, idempotency_key, created_by)
     values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) returning *`,
    [businessId, recyclingCase.id, action, recyclingCase.recycle_status || null, nextStatus, reason || null, JSON.stringify(payload || {}), idempotencyKey, user.id]
  );
  return event.rows[0];
}

async function scheduleRmsRecyclingCase(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const existingByKey = payload.idempotency_key ? await query(
    `select * from rms_recycling_cases where business_id = $1 and idempotency_key = $2`,
    [businessId, payload.idempotency_key]
  ) : null;
  if (existingByKey?.rows[0]) return { recycling_case: existingByKey.rows[0], duplicate: true };
  const current = await query(
    `select * from rms_recycling_cases
      where business_id = $1 and source_type = $2 and source_id = $3
        and recycle_status in ('SCHEDULED','REACTIVATING')
      order by updated_at desc limit 1`,
    [businessId, sourceType, payload.source_id]
  );
  const values = [
    businessId, sourceType, payload.source_id, payload.lead_id || null,
    payload.recycled_from_phase, payload.recycle_reason, payload.recycle_strategy,
    payload.recycle_owner || null, payload.recycle_at, payload.recycle_channel || null,
    payload.recycle_consent || "NOT_REQUIRED", payload.recycle_note, payload.recycle_target_phase,
    payload.idempotency_key || null, JSON.stringify(payload.metadata || {}), user.id,
  ];
  let recyclingCase;
  if (current.rows[0]) {
    const updated = await query(
      `update rms_recycling_cases set recycle_reason=$6, recycle_strategy=$7, recycle_owner=$8, recycle_at=$9,
        recycle_channel=$10, recycle_consent=$11, recycle_note=$12, recycle_target_phase=$13,
        metadata = metadata || $15::jsonb, updated_by=$16, updated_at=now()
       where id=$17 and business_id=$1 returning *`,
      [...values, current.rows[0].id]
    );
    recyclingCase = updated.rows[0];
  } else {
    const inserted = await query(
      `insert into rms_recycling_cases
        (business_id,source_type,source_id,lead_id,recycled_from_phase,recycle_reason,recycle_strategy,recycle_owner,recycle_at,recycle_channel,recycle_consent,recycle_note,recycle_target_phase,idempotency_key,metadata,created_by,updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$16) returning *`,
      values
    );
    recyclingCase = inserted.rows[0];
  }
  await recordRmsRecyclingEvent(businessId, user, recyclingCase, "SCHEDULED", "SCHEDULED", payload.recycle_note, {
    recycled_from_phase: payload.recycled_from_phase,
    recycle_target_phase: payload.recycle_target_phase,
  }, payload.idempotency_key ? `recycling-scheduled:${payload.idempotency_key}` : null);
  return { recycling_case: recyclingCase, duplicate: false };
}

async function listRmsRecyclingCases(businessId, filters = {}) {
  const rows = await query(
    `select r.*, s.rms_phase as current_phase, s.metadata as state_metadata,
            coalesce(owner.full_name, owner.email, nullif(r.recycle_owner, '')) as recycle_owner_name,
            coalesce(creator.full_name, creator.email) as created_by_name,
            coalesce(updater.full_name, updater.email) as updated_by_name
       from rms_recycling_cases r
       left join rms_lead_state s on s.business_id=r.business_id and s.source_type=r.source_type and s.source_id=r.source_id
       left join app_users owner on owner.business_id=r.business_id and owner.id::text=r.recycle_owner
       left join app_users creator on creator.business_id=r.business_id and creator.id=r.created_by
       left join app_users updater on updater.business_id=r.business_id and updater.id=r.updated_by
      where r.business_id=$1 order by r.recycle_at asc`,
    [businessId]
  );
  const opportunities = (await listRmsOpportunities(businessId, { limit: 500 })).opportunities || [];
  const bySource = new Map(opportunities.map((item) => [`${item.source_type}:${item.source_id}`, item]));
  const now = Date.now();
  const allCases = rows.rows.map((row) => {
    const opportunity = bySource.get(`${row.source_type}:${row.source_id}`) || {};
    const display_status = recyclingDisplayStatus(row, now);
    const status = row.recycle_status === "REACTIVATED" && opportunity.stage === "postventa" ? "CONVERTED" : display_status;
    return { ...row, recycle_status: status, opportunity: {
      id: opportunity.id || `${row.source_type}:${row.source_id}`,
      name: opportunity.name || "Contacto histórico",
      phone: opportunity.phone || null, email: opportunity.email || null,
      product_interest: opportunity.product_interest || opportunity.state_metadata?.commercial_confirmation?.product_name || null,
      campaign_name: opportunity.campaign_name || null, last_interaction_at: opportunity.last_interaction_at || null,
      priority: opportunity.priority || null,
    } };
  });
  const caseIds = allCases.map((item) => item.id);
  const eventRows = caseIds.length ? await query(
    `select e.*, coalesce(actor.full_name, actor.email, 'Sistema') as actor_name
       from rms_recycling_events e
       left join app_users actor on actor.business_id=e.business_id and actor.id=e.created_by
      where e.business_id=$1 and e.recycling_case_id = any($2::uuid[])
      order by e.created_at desc`,
    [businessId, caseIds]
  ) : { rows: [] };
  const historyByCase = new Map();
  eventRows.rows.forEach((event) => {
    const history = historyByCase.get(event.recycling_case_id) || [];
    history.push(event);
    historyByCase.set(event.recycling_case_id, history);
  });
  allCases.forEach((item) => { item.history = historyByCase.get(item.id) || []; });
  const cases = allCases.filter((item) => {
    const filter = String(filters.status || "ALL").toUpperCase();
    if (filter !== "ALL" && item.recycle_status !== filter) return false;
    if (filters.owner && item.recycle_owner !== filters.owner) return false;
    if (filters.reason && item.recycle_reason !== filters.reason) return false;
    if (filters.strategy && item.recycle_strategy !== filters.strategy) return false;
    return true;
  });
  const metrics = {
    total: allCases.length,
    open: allCases.filter((item) => ["SCHEDULED", "DUE", "OVERDUE"].includes(item.recycle_status)).length,
    upcoming: allCases.filter((item) => ["SCHEDULED", "DUE"].includes(item.recycle_status)).length,
    due: allCases.filter((item) => item.recycle_status === "DUE").length,
    overdue: allCases.filter((item) => item.recycle_status === "OVERDUE").length,
    reactivated: allCases.filter((item) => item.recycle_status === "REACTIVATED").length,
    converted: allCases.filter((item) => item.recycle_status === "CONVERTED").length,
    lost: allCases.filter((item) => item.recycle_status === "LOST").length,
  };
  const owners = Array.from(new Map(allCases.filter((item) => item.recycle_owner).map((item) => [item.recycle_owner, {
    id: item.recycle_owner,
    name: item.recycle_owner_name || item.recycle_owner,
  }])).values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  return { cases, metrics, owners, filters: { status: String(filters.status || "ALL").toUpperCase() }, generated_at: new Date().toISOString() };
}

async function updateRmsRecyclingCase(businessId, user, payload = {}) {
  const recycle = await query(`select * from rms_recycling_cases where business_id=$1 and id=$2`, [businessId, payload.recycling_case_id]);
  const recyclingCase = recycle.rows[0];
  if (!recyclingCase) throw notFound("No encontramos este reciclaje en tu negocio.");
  const action = String(payload.action || "").toUpperCase();
  const note = String(payload.note || "").trim();
  if (!note) throw badRequest("Explica el contexto o motivo de esta decisión.");
  const operationKey = payload.idempotency_key || null;
  if (operationKey) {
    const duplicate = await query(`select * from rms_recycling_events where business_id=$1 and idempotency_key=$2`, [businessId, operationKey]);
    if (duplicate.rows[0]) return {
      recycling_case: recyclingCase,
      confirmed_destination: recyclingCase.metadata?.reactivation_destination || null,
      duplicate: true,
    };
  }
  if (["RESCHEDULE", "CHANGE_STRATEGY"].includes(action)) {
    if (action === "RESCHEDULE" && !payload.recycle_at) throw badRequest("Indica la nueva fecha de reactivación.");
    if (action === "CHANGE_STRATEGY" && !payload.recycle_strategy) throw badRequest("Selecciona la nueva estrategia.");
    const updated = await query(
      `update rms_recycling_cases set recycle_at=coalesce($3,recycle_at), recycle_owner=coalesce($4,recycle_owner), recycle_channel=coalesce($5,recycle_channel), recycle_strategy=coalesce($6,recycle_strategy), recycle_note=$7, metadata=metadata || jsonb_build_object('last_change_reason',$7,'last_change_at',now()::text), updated_by=$8, updated_at=now() where id=$2 and business_id=$1 returning *`,
      [businessId, recyclingCase.id, payload.recycle_at || null, payload.recycle_owner || null, payload.recycle_channel || null, payload.recycle_strategy || null, note, user.id]
    );
    const next = updated.rows[0];
    if (next.agenda_note_id) await query(`update lead_notes set reminder_at=coalesce($3,reminder_at), next_action=$4, updated_at=now(), metadata=metadata || jsonb_build_object('recycling_change_reason',$5) where business_id=$1 and id=$2`, [businessId, next.agenda_note_id, payload.recycle_at || null, action === "CHANGE_STRATEGY" ? `Reciclaje: ${next.recycle_strategy}` : "Reactivar lead reciclado", note]);
    await recordRmsRecyclingEvent(businessId, user, next, action === "RESCHEDULE" ? "RESCHEDULED" : "STRATEGY_CHANGED", next.recycle_status, note, { recycle_at: next.recycle_at, recycle_strategy: next.recycle_strategy }, operationKey);
    return { recycling_case: next };
  }
  if (["LOST", "CANCEL"].includes(action)) {
    const status = action === "LOST" ? "LOST" : "CANCELLED";
    const updated = await query(`update rms_recycling_cases set recycle_status=$3,recycle_note=$4,updated_by=$5,updated_at=now() where business_id=$1 and id=$2 returning *`, [businessId, recyclingCase.id, status, note, user.id]);
    if (updated.rows[0].agenda_note_id) await query(`update lead_notes set agenda_status='CANCELLED', updated_at=now(), metadata=metadata || jsonb_build_object('rms_recycling_closed_reason',$3) where business_id=$1 and id=$2`, [businessId, updated.rows[0].agenda_note_id, note]);
    await recordRmsRecyclingEvent(businessId, user, updated.rows[0], action, status, note, {}, operationKey);
    await recordRmsWorkflowEvent(businessId, user, { source_type: recyclingCase.source_type, source_id: recyclingCase.source_id, lead_id: recyclingCase.lead_id, event_type: action === "LOST" ? "recycling_lost" : "recycling_cancelled", event_title: action === "LOST" ? "Reciclaje cerrado como pérdida" : "Reciclaje cancelado", event_description: note, rms_phase: recyclingCase.recycled_from_phase, metadata: { recycling_case_id: recyclingCase.id } });
    return { recycling_case: updated.rows[0] };
  }
  if (action !== "REACTIVATE") throw badRequest("Acción de Reciclaje no válida.");
  if (!['SCHEDULED', 'REACTIVATING'].includes(recyclingCase.recycle_status)) throw badRequest("Este reciclaje ya fue cerrado.");
  if (recyclingCase.recycle_channel && recyclingCase.recycle_consent !== "CONFIRMED") throw badRequest("No puedes reactivar por contacto sin consentimiento confirmado.");
  const item = await findOpportunity(businessId, recyclingCase.source_type, recyclingCase.source_id);
  const destination = payload.destination === "clasificacion"
    ? "clasificacion"
    : payload.destination === "procesamiento"
      ? "procesamiento"
      : recyclingCase.recycle_target_phase === "clasificacion"
        ? "clasificacion"
        : "procesamiento";
  const reactivatedAt = new Date().toISOString();
  const movement = await moveRmsLeadPhase(businessId, user, { source_id: recyclingCase.source_id, source_type: recyclingCase.source_type, lead_id: recyclingCase.lead_id || item.lead_id || null, to_phase: destination, priority: "MEDIUM", recommended_action: destination === "clasificacion" ? "Preparar una nueva Activación 1" : "Reevaluar contexto reciclado", last_operation: "recycled_lead_reactivated", reason: note, metadata: { recycle_result: "REACTIVATED", recycling_case_id: recyclingCase.id, negotiation_result: "RECYCLE", recycling: { ...(item.state_metadata?.recycling || {}), status: "REACTIVATED", recycling_case_id: recyclingCase.id, reactivation_destination: destination, reactivation_note: note, reactivated_at: reactivatedAt, reactivated_by: user.id } } }, RMS_TRANSITION_AUTHORITY.RECYCLING);
  const updated = await query(`update rms_recycling_cases set recycle_status='REACTIVATED', recycle_note=$3, updated_by=$4, updated_at=now(), metadata=metadata || jsonb_build_object('reactivated_at',now()::text,'reactivation_destination',$5::text) where business_id=$1 and id=$2 returning *`, [businessId, recyclingCase.id, note, user.id, destination]);
  if (updated.rows[0].agenda_note_id) await query(`update lead_notes set agenda_status='COMPLETED', progress_percent=100, updated_at=now(), metadata=metadata || jsonb_build_object('rms_recycling_reactivated_at',now()::text) where business_id=$1 and id=$2`, [businessId, updated.rows[0].agenda_note_id]);
  await recordRmsRecyclingEvent(businessId, user, updated.rows[0], "REACTIVATED", "REACTIVATED", note, { destination, movement_id: movement.movement?.id || null }, operationKey);
  await recordRmsWorkflowEvent(businessId, user, { source_type: recyclingCase.source_type, source_id: recyclingCase.source_id, lead_id: recyclingCase.lead_id, event_type: "recycled_lead_reactivated", event_title: `Lead reciclado reactivado hacia ${destination === "clasificacion" ? "Activación 1" : "Evaluación"}`, event_description: note, rms_phase: destination, metadata: { recycling_case_id: recyclingCase.id, movement_id: movement.movement?.id || null } });
  const lifecycle = await markRmsLifecycleStatus(businessId, user, {
    source_type: recyclingCase.source_type,
    source_id: recyclingCase.source_id,
    lead_id: recyclingCase.lead_id || item.lead_id || null,
    lifecycle_status: "ACTIVE",
    event_type: "recycled_lead_reactivated_analyzed",
    event_title: "Reciclaje reactivado",
    reason: note,
    idempotency_key: `recycling-reactivated:${recyclingCase.id}`,
    metadata: { recycling_case_id: recyclingCase.id, destination, movement_id: movement.movement?.id || null },
  });
  return { recycling_case: updated.rows[0], movement, lifecycle };
}

function rmsExplicitBenefitCost(value = {}, benefitType = "") {
  const source = value && typeof value === "object" ? value : {};
  const fixedBenefit = String(benefitType || "").toUpperCase() === "FIXED_AMOUNT_DISCOUNT";
  const candidates = [
    source.effective_cost_cop,
    source.cost_cop,
    source.benefit_cost,
    source.cost,
    source.discount_amount,
    ...(fixedBenefit ? [source.amount, source.value] : []),
  ];
  const amount = candidates.map((entry) => Number(entry)).find((entry) => Number.isFinite(entry) && entry >= 0);
  return amount === undefined ? null : Math.round(amount * 100) / 100;
}

async function getRmsUnconvertedLeadCost(businessId, payload = {}, knownItem = null) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const item = knownItem || await findOpportunity(businessId, sourceType, payload.source_id);
  if (Number(item.purchase_count || 0) > 0) {
    return { is_unconverted: false, redeemed_benefits: 0, benefits_with_explicit_cost: 0, totals_by_currency: {}, message: "El lead ya tiene una compra registrada; no se clasifica como costo de no conversi\u00f3n." };
  }
  const result = await query(
    `select distinct q.id, q.benefit_type, q.benefit_value, q.metadata, r.metadata as redemption_metadata
       from qr_codes q
       left join redemptions r on r.qr_code_id = q.id and r.business_id = q.business_id
      where q.business_id = $1
        and (q.redeemed_at is not null or q.status = 'REDEEMED' or r.id is not null)
        and (
          ($2::text = 'PLAYER' and q.player_id = $3::uuid)
          or ($2::text = 'AFFILIATE' and q.affiliate_id = $3::uuid)
          or exists (
            select 1 from lead_activations la
             where la.business_id = q.business_id
               and la.qr_code_id = q.id
               and la.source_type = $2::text
               and la.source_id = $3::uuid
          )
        )`,
    [businessId, sourceType, payload.source_id]
  );
  const totals = {};
  let explicit = 0;
  const benefits = result.rows.map((row) => {
    const cost = [row.redemption_metadata, row.metadata, row.benefit_value]
      .map((value) => rmsExplicitBenefitCost(value, row.benefit_type))
      .find((value) => value !== null);
    const currency = String(row.redemption_metadata?.currency || row.metadata?.currency || row.benefit_value?.currency || "COP").toUpperCase();
    if (cost !== null) {
      totals[currency] = Math.round(((totals[currency] || 0) + cost) * 100) / 100;
      explicit += 1;
    }
    return { qr_code_id: row.id, benefit_type: row.benefit_type, cost, currency };
  });
  return {
    is_unconverted: true,
    redeemed_benefits: benefits.length,
    benefits_with_explicit_cost: explicit,
    benefits_without_recorded_cost: benefits.length - explicit,
    totals_by_currency: totals,
    benefits,
    message: benefits.length
      ? "Solo suma beneficios redimidos con costo o descuento monetario registrado; no infiere el valor de porcentajes, regalos o beneficios sin costo cargado."
      : "No hay beneficios redimidos para este lead sin compra registrada.",
  };
}

async function recordRmsNegotiationResult(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "accion_correctiva") throw badRequest("El resultado solo se registra desde Negociación.");
  const result = String(payload.result || "").toUpperCase();
  if (!["ACCEPTED", "WAITING", "REPROCESS", "NO_RESPONSE", "RECYCLE", "LOST"].includes(result)) throw badRequest("Selecciona un resultado de Negociación válido.");
  const reason = String(payload.reason || payload.summary || "").trim() || "Decisión registrada sin detalle adicional.";
  const nextAt = payload.next_action_at || null;
  if (["WAITING", "NO_RESPONSE", "RECYCLE"].includes(result) && !nextAt) throw badRequest("Programa el próximo contacto o reactivación antes de guardar.");
  if (result === "REPROCESS" && !["procesamiento", "clasificacion"].includes(payload.reprocess_phase)) {
    throw badRequest("El reproceso debe volver explícitamente a Evaluación o Activación 1.");
  }
  if (result === "RECYCLE") {
    if (!payload.recycle_reason || !payload.recycle_strategy || !payload.recycle_consent || !payload.channel) {
      throw badRequest("Para Reciclaje indica motivo, estrategia, canal permitido y consentimiento confirmado.");
    }
    if (new Date(nextAt).getTime() <= Date.now()) {
      throw badRequest("La fecha de reactivación debe estar en el futuro.");
    }
  }
  if (result === "LOST" && !payload.lost_classification) {
    throw badRequest("Clasifica la pérdida antes de cerrar la oportunidad.");
  }
  const nonConversionCost = ["RECYCLE", "LOST"].includes(result)
    ? await getRmsUnconvertedLeadCost(businessId, { source_type: sourceType, source_id: payload.source_id }, item)
    : null;
  const current = await query(`select metadata from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`, [businessId, sourceType, payload.source_id]);
  const priorMetadata = current.rows[0]?.metadata || {};
  const attachmentAssetIds = result === "WAITING"
    ? [...new Set((payload.delivery_attachment_asset_ids || []).map(String).filter(Boolean))].slice(0, 4)
    : [];
  const attachmentAssets = attachmentAssetIds.length
    ? await query(
      `select id, title, file_name, file_type from digital_assets where business_id = $1 and is_active = true and id = any($2::uuid[])`,
      [businessId, attachmentAssetIds]
    )
    : { rows: [] };
  if (attachmentAssets.rows.length !== attachmentAssetIds.length) {
    throw badRequest("Uno o mÃ¡s adjuntos no pertenecen a este negocio o ya no estÃ¡n disponibles.");
  }
  const round = {
    id: payload.idempotency_key || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    result,
    objective: String(payload.objective || "").trim() || null,
    objection_type: String(payload.objection_type || "").trim() || null,
    customer_condition: String(payload.customer_condition || "").trim() || null,
    proposal: String(payload.proposal || "").trim() || null,
    concession: String(payload.concession || "").trim() || null,
    channel: String(payload.channel || "").trim() || null,
    summary: String(payload.summary || "").trim() || null,
    reason,
    next_action_at: nextAt,
    reprocess_phase: payload.reprocess_phase || null,
    recycle: result === "RECYCLE" ? {
      reason: payload.recycle_reason,
      strategy: payload.recycle_strategy,
      responsible: String(payload.recycle_responsible || payload.responsible || user.id).trim(),
      consent: payload.recycle_consent,
      channel: String(payload.channel || "").trim(),
      non_conversion_cost: nonConversionCost,
    } : null,
    lost_classification: result === "LOST" ? payload.lost_classification : null,
    delivery: result === "WAITING" ? {
      material: String(payload.delivery_material || "OTHER").trim() || "OTHER",
      message: String(payload.delivery_message || "").trim() || null,
      link: String(payload.delivery_link || "").trim() || null,
      attachments: [],
    } : null,
    non_conversion_cost: nonConversionCost,
    recorded_at: new Date().toISOString(),
    recorded_by: user.id,
  };
  const history = Array.isArray(priorMetadata.negotiation_history) ? priorMetadata.negotiation_history.slice(-19) : [];
  const priorRound = payload.idempotency_key ? history.find((entry) => entry.id === payload.idempotency_key) : null;
  if (priorRound) return { round: priorRound, duplicate: true };
  if (round.delivery && attachmentAssets.rows.length) {
    const attachmentNote = await createLeadNote(businessId, user, payload.source_id, sourceType, {
      note: `NegociaciÃ³n Â· ${attachmentAssets.rows.length} documento(s) compartido(s) por ${round.channel || "canal comercial"}.`,
      note_type: "commercial",
      metadata: {
        source_module: "rms_negotiation",
        negotiation_delivery: {
          material: round.delivery.material,
          channel: round.channel,
          message: round.delivery.message,
          link: round.delivery.link,
        },
      },
    });
    const attachments = [];
    for (const asset of attachmentAssets.rows) {
      const token = randomBytes(24).toString("base64url");
      const created = await query(
        `insert into rms_negotiation_attachments
          (business_id, source_type, source_id, lead_id, negotiation_note_id, asset_id, public_token, metadata)
         values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
         returning id, public_token`,
        [
          businessId, sourceType, payload.source_id, item.lead_id || payload.lead_id || null,
          attachmentNote.id, asset.id, token,
          JSON.stringify({ title: asset.title, file_name: asset.file_name, sent_by: user.id, negotiation_round_id: round.id }),
        ]
      );
      attachments.push({
        id: created.rows[0].id,
        asset_id: asset.id,
        title: asset.title,
        file_name: asset.file_name,
        file_type: asset.file_type,
        url: negotiationAttachmentUrl(created.rows[0].public_token),
      });
    }
    round.delivery.attachments = attachments;
    round.delivery.message = [
      round.delivery.message,
      round.delivery.link ? `Enlace comercial: ${round.delivery.link}` : "",
      `Documentos de esta propuesta:\n${attachments.map((asset) => `â€¢ ${asset.title || asset.file_name}: ${asset.url}`).join("\n")}`,
    ].filter(Boolean).join("\n\n").slice(0, 5000);
    await query(
      `update lead_notes set metadata = metadata || $2::jsonb where id = $1`,
      [attachmentNote.id, JSON.stringify({ negotiation_delivery: { ...round.delivery } })]
    );
  }
  let cancelledAgendaCount = 0;
  if (result === "LOST") {
    const cancelled = await query(
      `update lead_notes
          set agenda_status = 'CANCELLED', updated_at = now(),
              metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('rms_cancelled_reason', $4, 'rms_cancelled_at', now()::text)
        where business_id = $1 and source_type = $2 and source_id = $3
          and note_type = 'follow_up' and coalesce(agenda_status, 'OPEN') = 'OPEN'`,
      [businessId, sourceType, payload.source_id, reason]
    );
    cancelledAgendaCount = Number(cancelled.rowCount || 0);
  }
  const toPhase = result === "ACCEPTED" ? "cierre" : result === "REPROCESS" ? payload.reprocess_phase : "accion_correctiva";
  let agenda = null;
  if (["WAITING", "NO_RESPONSE", "RECYCLE"].includes(result)) {
    agenda = await createRmsAgendaTask(businessId, user, {
      source_id: payload.source_id, source_type: sourceType, lead_id: item.lead_id || payload.lead_id || null,
      stage: "accion_correctiva", due_at: nextAt, priority_score: result === "NO_RESPONSE" ? 80 : 60,
      action_title: result === "RECYCLE" ? "Reactivar lead reciclado con contexto actualizado" : result === "NO_RESPONSE" ? "Recuperar respuesta y confirmar condición comercial" : "Retomar negociación en la fecha acordada",
      note: `Negociación: ${reason}`, revenue_potential: item.revenue_potential,
      metadata: { negotiation_round: round },
    });
  }
  const recycling = result === "RECYCLE" ? await scheduleRmsRecyclingCase(businessId, user, {
    source_id: payload.source_id, source_type: sourceType, lead_id: item.lead_id || payload.lead_id || null,
    recycled_from_phase: "accion_correctiva", recycle_reason: payload.recycle_reason || reason,
    recycle_strategy: payload.recycle_strategy || "NEW_CONTACT", recycle_owner: String(payload.recycle_responsible || user.id),
    recycle_at: nextAt, recycle_channel: String(payload.channel || "").trim() || null,
    recycle_consent: payload.recycle_consent || "NOT_REQUIRED", recycle_note: reason,
    recycle_target_phase: payload.recycle_target_phase === "clasificacion" ? "clasificacion" : "procesamiento",
    idempotency_key: payload.idempotency_key ? `negotiation:${payload.idempotency_key}` : null,
    metadata: { negotiation_round_id: round.id, agenda_note_id: agenda?.item?.id || null },
  }) : null;
  if (recycling?.recycling_case?.id && agenda?.item?.id) await query(
    `update rms_recycling_cases set agenda_note_id=$3, updated_at=now() where business_id=$1 and id=$2`,
    [businessId, recycling.recycling_case.id, agenda.item.id]
  );
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    to_phase: toPhase, priority: result === "LOST" ? "LOW" : result === "NO_RESPONSE" ? "HIGH" : "MEDIUM",
    recommended_action: result === "ACCEPTED" ? "Registrar la venta atribuida con producto, cantidad y pago" : result === "LOST" ? "Conservar aprendizaje comercial" : result === "REPROCESS" ? "Actualizar propuesta antes de retomar el acuerdo" : "Esperar respuesta y retomar el seguimiento",
    last_operation: `negotiation_${result.toLowerCase()}`, revenue_potential: item.revenue_potential, reason,
    metadata: { negotiation_current: round, negotiation_history: [...history, round], negotiation_result: result, negotiation_task_id: agenda?.item?.id || null, recycling: result === "RECYCLE" ? { status: "RECYCLED", recycling_case_id: recycling?.recycling_case?.id || null, reason: payload.recycle_reason || reason, strategy: payload.recycle_strategy || "NEW_CONTACT", reactivate_at: nextAt, responsible: String(payload.recycle_responsible || user.id), consent: payload.recycle_consent, channel: String(payload.channel || "").trim(), note: reason, non_conversion_cost: nonConversionCost } : null, commercial_status: result === "ACCEPTED" ? "SALE_CONFIRMED" : result === "LOST" ? "LOST" : result === "WAITING" ? "WAITING" : result === "NO_RESPONSE" ? "RECOVERY" : result === "RECYCLE" ? "RECYCLED" : "REPROCESS", lost_classification: result === "LOST" ? payload.lost_classification : null, non_conversion_cost: nonConversionCost, cancelled_agenda_count: cancelledAgendaCount },
  }, RMS_TRANSITION_AUTHORITY.NEGOTIATION_RESULT);
  await recordRmsWorkflowEvent(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    event_type: result === "ACCEPTED" ? "negotiation_sale_confirmed" : "negotiation_round_recorded", event_title: result === "ACCEPTED" ? "Respuesta de compra confirmada" : "Resultado de Negociación registrado", event_description: reason,
    rms_phase: toPhase, metadata: { negotiation_round: round, non_conversion_cost: nonConversionCost, movement_id: movement.movement?.id || null, task_id: agenda?.item?.id || null },
  });
  if (result === "RECYCLE") {
    await recordRmsWorkflowEvent(businessId, user, {
      source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
      event_type: "lead_sent_to_recycling", event_title: "Lead enviado a Reciclaje comercial", event_description: reason,
      rms_phase: "accion_correctiva", metadata: { recycling_case_id: recycling?.recycling_case?.id || null, reactivate_at: nextAt, strategy: payload.recycle_strategy || "NEW_CONTACT", movement_id: movement.movement?.id || null },
    });
    await markRmsLifecycleStatus(businessId, user, {
      source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
      lifecycle_status: "RECYCLED", event_type: "negotiation_recycled_analyzed",
      event_title: "Reciclaje incorporado a Inteligencia", reason,
      idempotency_key: `negotiation-recycle:${round.id}`, metadata: { negotiation_round: round },
    });
  }
  if (result === "LOST") {
    await markRmsLifecycleStatus(businessId, user, {
      source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
      lifecycle_status: "LOST_ANALYZED", event_type: "negotiation_loss_analyzed",
      event_title: "Pérdida de Negociación analizada", reason,
      idempotency_key: `negotiation-loss:${payload.idempotency_key || `${sourceType}:${payload.source_id}`}`,
      metadata: { negotiation_round: round, lost_classification: payload.lost_classification },
    });
  }
  return { round, agenda, recycling_case: recycling?.recycling_case || null, ...movement };
}

function normalizeRiskRecoveryAuthorizations(value = {}) {
  const configured = value && typeof value === "object" ? value : {};
  const benefitIds = new Set();
  return {
    discount: {
      enabled: Boolean(configured.discount?.enabled),
      max_percent: Math.min(100, Math.max(0, Number(configured.discount?.max_percent || 0))),
    },
    two_for_one: {
      enabled: Boolean(configured.two_for_one?.enabled),
      label: String(configured.two_for_one?.label || "").trim(),
    },
    gift: {
      enabled: Boolean(configured.gift?.enabled),
      label: String(configured.gift?.label || "").trim(),
    },
    benefits: Array.isArray(configured.benefits) ? configured.benefits.map((benefit, index) => {
      const baseId = String(benefit?.id || `benefit-${index + 1}`).trim().slice(0, 120);
      let id = baseId;
      let suffix = 2;
      while (benefitIds.has(id)) {
        const duplicateSuffix = `-${suffix++}`;
        id = `${baseId.slice(0, 120 - duplicateSuffix.length)}${duplicateSuffix}`;
      }
      benefitIds.add(id);
      return {
        id,
        enabled: benefit?.enabled !== false,
        type: String(benefit?.type || "OTHER").trim().toUpperCase(),
        label: String(benefit?.label || "").trim(),
        value: Math.max(0, Number(benefit?.value || 0)),
        detail: String(benefit?.detail || "").trim(),
      };
    }).filter((benefit) => benefit.label) : [],
  };
}

async function riskRecoveryAuthorizationsForBusiness(businessId) {
  const result = await query("select settings from businesses where id = $1 and is_active = true", [businessId]);
  return normalizeRiskRecoveryAuthorizations(result.rows[0]?.settings?.rms_risk_recovery_authorizations);
}

function validateRiskRecoveryOffer(payload, authorizations) {
  const recoveryOffer = String(payload.recovery_offer || "NONE").toUpperCase();
  if (!["NONE", "DISCOUNT", "TWO_FOR_ONE", "GIFT", "CUSTOM"].includes(recoveryOffer)) throw badRequest("Selecciona una alternativa de recuperación válida.");
  const discountPercent = Math.min(100, Math.max(0, Number(payload.discount_percent || 0)));
  const recoveryBenefitId = String(payload.recovery_benefit_id || "").trim() || null;
  const customBenefit = recoveryOffer === "CUSTOM"
    ? authorizations.benefits.find((benefit) => benefit.enabled && benefit.id === recoveryBenefitId)
    : null;
  if (recoveryOffer === "CUSTOM" && !customBenefit) throw badRequest("Selecciona un beneficio extraordinario autorizado en Cuenta.");
  const customDiscountPercent = customBenefit?.type === "DISCOUNT"
    ? Math.min(100, Math.max(0, Number(customBenefit.value || 0)))
    : 0;
  if (customBenefit?.type === "DISCOUNT" && (customDiscountPercent <= 0 || Number(customBenefit.value) > 100)) {
    throw badRequest("El beneficio de descuento debe tener un valor entre 0% y 100% en Cuenta.");
  }
  if (recoveryOffer === "DISCOUNT") {
    if (!authorizations.discount.enabled) throw badRequest("Los descuentos extraordinarios no están autorizados en Cuenta.");
    if (discountPercent <= 0 || discountPercent > authorizations.discount.max_percent) throw badRequest(`El descuento debe estar entre 0% y ${authorizations.discount.max_percent}% según la autorización de Cuenta.`);
  }
  if (recoveryOffer === "TWO_FOR_ONE" && !authorizations.two_for_one.enabled) throw badRequest("La alternativa 2x1 no esta autorizada en Cuenta.");
  if (recoveryOffer === "GIFT" && !authorizations.gift.enabled) throw badRequest("El obsequio extraordinario no esta autorizado en Cuenta.");
  const detail = String(payload.recovery_detail || "").trim();
  if (["TWO_FOR_ONE", "GIFT"].includes(recoveryOffer) && !detail) throw badRequest("Describe brevemente la alternativa autorizada que se ofrecerá.");
  const benefitType = recoveryOffer === "DISCOUNT" || customBenefit?.type === "DISCOUNT"
    ? "DISCOUNT"
    : recoveryOffer === "GIFT" || customBenefit?.type === "GIFT"
      ? "GIFT"
      : recoveryOffer === "CUSTOM" && customBenefit?.type === "OTHER"
        ? "OTHER"
        : "BONUS";
  const benefitLabel = customBenefit?.label
    || (recoveryOffer === "DISCOUNT" ? `Descuento extraordinario del ${discountPercent}%`
      : recoveryOffer === "TWO_FOR_ONE" ? (authorizations.two_for_one.label || "Beneficio 2x1")
        : recoveryOffer === "GIFT" ? (authorizations.gift.label || "Obsequio extraordinario")
          : "Beneficio extraordinario");
  return {
    recoveryOffer,
    discountPercent: recoveryOffer === "DISCOUNT" ? discountPercent : customDiscountPercent,
    recoveryBenefitId,
    customBenefit,
    detail,
    benefitType,
    benefitLabel,
  };
}

function rmsPersistedCaseFallbackRow(stateRow = {}) {
  const stateMetadata = metadataObject({ metadata: stateRow.metadata });
  const confirmation = stateMetadata.commercial_confirmation || {};
  return {
    id: stateRow.source_id,
    source_id: stateRow.source_id,
    source_type: stateRow.source_type || "PLAYER",
    lead_id: stateRow.lead_id || null,
    name: firstPresent(stateMetadata.customer_name, stateMetadata.lead_name, confirmation.customer_name, "Caso histórico"),
    phone: firstPresent(stateMetadata.customer_phone, confirmation.customer_phone),
    email: firstPresent(stateMetadata.customer_email, confirmation.customer_email),
    document_id: firstPresent(stateMetadata.customer_document_id, confirmation.customer_document_id),
    product_interest: firstPresent(stateMetadata.rms_sale_product, confirmation.product_name, stateMetadata.product_interest),
    campaign_name: firstPresent(stateMetadata.campaign_name, stateMetadata.communication_campaign_name),
    channel: firstPresent(stateMetadata.channel, stateMetadata.activation_delivery_channel),
    commercial_status: stateRow.lifecycle_status || "ACTIVE",
    created_at: stateRow.created_at || stateRow.updated_at || null,
    last_interaction_at: stateRow.updated_at || stateRow.created_at || null,
    metadata: stateMetadata,
  };
}

async function listRmsPersistedCases(businessId, filters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit || 240), 1), 500);
  const stateRows = await recentStateRowsForBusiness(businessId, limit);
  const sourceRows = await leadRowsForStateRefs(businessId, stateRows);
  const sourceMap = new Map(sourceRows.map((row) => [`${crmSourceType(row)}:${row.id}`, row]));
  return stateRows.map((stateRow) => {
    const key = `${crmSourceType(stateRow)}:${stateRow.source_id}`;
    const sourceRow = sourceMap.get(key) || rmsPersistedCaseFallbackRow(stateRow);
    const opportunity = opportunityFromRow(sourceRow, stateRow, []);
    return {
      ...opportunity,
      operational_phase: stateRow.rms_phase || opportunity.stage || "sin_estado",
      lifecycle_status: stateRow.lifecycle_status || opportunity.lifecycle_status || "ACTIVE",
      intelligence_updated_at: stateRow.intelligence_updated_at || null,
    };
  });
}

function preparedRiskRecoveryOffer(payload, resource = null) {
  const snapshot = resource?.recovery_offer;
  if (!snapshot?.type) return null;
  const requestedType = String(payload.recovery_offer || "NONE").toUpperCase();
  const requestedBenefitId = String(payload.recovery_benefit_id || "").trim() || null;
  const snapshotBenefitId = String(snapshot.benefit_id || "").trim() || null;
  if (String(snapshot.type).toUpperCase() !== requestedType || snapshotBenefitId !== requestedBenefitId) return null;
  const customBenefit = snapshot.custom_benefit && typeof snapshot.custom_benefit === "object"
    ? { ...snapshot.custom_benefit }
    : null;
  const benefitType = requestedType === "DISCOUNT" || customBenefit?.type === "DISCOUNT"
    ? "DISCOUNT"
    : requestedType === "GIFT" || customBenefit?.type === "GIFT"
      ? "GIFT"
      : requestedType === "CUSTOM" && customBenefit?.type === "OTHER"
        ? "OTHER"
        : "BONUS";
  return {
    recoveryOffer: requestedType,
    discountPercent: Math.min(100, Math.max(0, Number(snapshot.discount_percent || 0))),
    recoveryBenefitId: snapshotBenefitId,
    customBenefit,
    detail: String(snapshot.detail || customBenefit?.detail || "").trim(),
    benefitType,
    benefitLabel: String(snapshot.label || customBenefit?.label || "Beneficio extraordinario").trim(),
  };
}

async function prepareRmsRiskRecoveryResource(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "control_anti_fuga") throw badRequest("El activo extraordinario solo se genera desde Riesgos de fuga.");
  const authorizations = await riskRecoveryAuthorizationsForBusiness(businessId);
  const offer = validateRiskRecoveryOffer(payload, authorizations);
  if (offer.recoveryOffer === "NONE") throw badRequest("Selecciona un beneficio extraordinario antes de generar el ticket.");
  const currentState = await query(
    `select metadata from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, payload.source_id]
  );
  const currentMetadata = currentState.rows[0]?.metadata || {};
  const confirmation = currentMetadata.commercial_confirmation || {};
  const requestedProducts = Array.isArray(payload.products) && payload.products.length
    ? payload.products
    : confirmation.inventory_product_id
      ? [{ inventory_product_id: confirmation.inventory_product_id, quantity: confirmation.sale_context?.quantity || 1, benefit_applied: true }]
      : [];
  if (!requestedProducts.length) throw badRequest("Agrega al menos un producto antes de generar el ticket.");
  const repeatedProductIds = requestedProducts.map((product) => String(product.inventory_product_id || "")).filter((id, index, all) => id && all.indexOf(id) !== index);
  if (repeatedProductIds.length) throw badRequest("Cada producto debe aparecer una sola vez. Ajusta la cantidad en su misma fila.");
  const products = await Promise.all(requestedProducts.map(async (product) => {
    const snapshot = await rmsInventoryProductSnapshot(businessId, product.inventory_product_id);
    return {
      inventory_product_id: snapshot.inventory_product_id,
      name: snapshot.product_name_snapshot,
      product_name_snapshot: snapshot.product_name_snapshot,
      product_price_snapshot: snapshot.product_price_snapshot,
      product_currency_snapshot: snapshot.product_currency_snapshot,
      quantity: Math.max(0.01, Number(product.quantity || 1)),
      benefit_applied: Boolean(product.benefit_applied),
    };
  }));
  if (!products.some((product) => product.benefit_applied)) throw badRequest("Marca al menos un producto al que se aplicará el beneficio.");
  const expirationDays = Math.min(90, Math.max(1, Number(payload.expiration_days || 7)));
  const idempotencyKey = String(payload.idempotency_key || "").trim();
  if (!idempotencyKey) throw badRequest("No fue posible identificar esta generación de ticket.");
  const productName = currentMetadata.commercial_confirmation?.product_name || item.product_interest || null;
  const ticket = await createRiskRecoveryQr(businessId, user, {
    source_type: sourceType,
    source_id: payload.source_id,
    lead_id: item.lead_id || payload.lead_id || null,
    product_name: productName,
    expires_mode: "CUSTOM_DATE",
    expires_at: new Date(Date.now() + expirationDays * 86400000).toISOString(),
    idempotency_key: idempotencyKey,
    recovery_offer: offer.recoveryOffer,
    benefit: {
      reward_id: null,
      benefit_type: offer.benefitType,
      benefit_label: offer.benefitLabel,
      benefit_value: {
        discount_percent: offer.discountPercent || offer.customBenefit?.value || 0,
        detail: offer.customBenefit?.detail || offer.detail || null,
        risk_recovery: true,
      },
    },
    metadata: { recovery_benefit_id: offer.recoveryBenefitId, authorization_snapshot: authorizations, products },
  });
  const resource = {
    qr_code_id: ticket.qr_code.id,
    public_ticket_url: ticket.public_ticket_url,
    qr_image_data_url: ticket.qr_image_data_url || null,
    validator_url: ticket.validator_url,
    claim_url: ticket.claim_url,
    filename: ticket.filename,
    benefit: ticket.benefit,
    expires_at: ticket.qr_code.expires_at,
    generated_at: ticket.qr_code.created_at || new Date().toISOString(),
    generated_by: user.id,
    recovery_offer: {
      type: offer.recoveryOffer,
      benefit_id: offer.recoveryBenefitId,
      custom_benefit: offer.customBenefit || null,
      discount_percent: offer.discountPercent,
      detail: offer.detail || offer.customBenefit?.detail || null,
      label: offer.benefitLabel,
    },
    products,
  };
  await query(
    `update rms_lead_state
        set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('risk_recovery_resource', $4::jsonb),
            updated_at = now()
      where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, payload.source_id, JSON.stringify(resource)]
  );
  if (!ticket.duplicate) {
    await recordRmsWorkflowEvent(businessId, user, {
      source_type: sourceType,
      source_id: payload.source_id,
      lead_id: item.lead_id || payload.lead_id || null,
      event_type: "risk_recovery_resource_created",
      event_title: "Ticket extraordinario generado",
      event_description: `${offer.benefitLabel}. El lead permanece en Riesgos de fuga hasta registrar su respuesta.`,
      rms_phase: "control_anti_fuga",
      metadata: { risk_recovery_resource: resource },
    });
  }
  return { resource, ticket, duplicate: ticket.duplicate };
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
  if (metadata.commercial_route === "NEGOTIATION_CLEAN" || confirmation?.route === "NEGOTIATION_CLEAN") {
    throw badRequest("Una venta limpia confirmada no debe volver a Riesgos de fuga; atribúyela desde Ventas atribuidas.");
  }
  const result = String(payload.result || "").toUpperCase();
  const reason = String(payload.reason || "").trim() || "Revisión registrada sin detalle adicional.";
  if (!["CLEARED", "RECYCLE"].includes(result)) throw badRequest("Riesgos de fuga solo puede enviar a Ventas atribuidas o a Reciclaje.");
  if (result === "RECYCLE" && !payload.recycle_reason) throw badRequest("Para Reciclaje indica el motivo principal.");
  const authorizations = await riskRecoveryAuthorizationsForBusiness(businessId);
  // Un ticket ya emitido conserva la autorización exacta con la que nació.
  // Las selecciones nuevas siempre se validan contra la configuración activa.
  const offer = preparedRiskRecoveryOffer(payload, metadata.risk_recovery_resource)
    || validateRiskRecoveryOffer(payload, authorizations);
  const explicitRiskProducts = Array.isArray(payload.products) && payload.products.length > 0;
  const requestedRiskProducts = explicitRiskProducts
    ? payload.products
    : confirmation?.inventory_product_id
      ? [{ inventory_product_id: confirmation.inventory_product_id, quantity: confirmation.sale_context?.quantity || 1, benefit_applied: offer.recoveryOffer !== "NONE" }]
      : [];
  const repeatedRiskProductIds = requestedRiskProducts
    .map((product) => String(product.inventory_product_id || ""))
    .filter((id, index, all) => id && all.indexOf(id) !== index);
  if (repeatedRiskProductIds.length) throw badRequest("Cada producto debe aparecer una sola vez en Riesgos de fuga. Ajusta la cantidad en su misma fila.");
  const riskProducts = await Promise.all(requestedRiskProducts.map(async (product) => {
    const snapshot = await rmsInventoryProductSnapshot(businessId, product.inventory_product_id);
    return {
      inventory_product_id: snapshot.inventory_product_id,
      name: snapshot.product_name_snapshot,
      product_name_snapshot: snapshot.product_name_snapshot,
      product_price_snapshot: snapshot.product_price_snapshot,
      product_currency_snapshot: snapshot.product_currency_snapshot,
      quantity: Math.max(0.01, Number(product.quantity || 1)),
      benefit_applied: offer.recoveryOffer === "NONE" ? false : Boolean(product.benefit_applied),
    };
  }));
  if (result === "CLEARED" && explicitRiskProducts && !riskProducts.length) {
    throw badRequest("Agrega al menos un producto antes de enviar la venta.");
  }
  if (result === "CLEARED" && offer.recoveryOffer !== "NONE" && explicitRiskProducts && !riskProducts.some((product) => product.benefit_applied)) {
    throw badRequest("Marca al menos un producto al que se aplicó el beneficio extraordinario.");
  }
  const nonConversionCost = result === "RECYCLE"
    ? await getRmsUnconvertedLeadCost(businessId, { source_type: sourceType, source_id: payload.source_id }, item)
    : null;
  const review = {
    result, reason, reviewed_at: new Date().toISOString(), reviewed_by: user.id, confirmation_snapshot: confirmation,
    responsible: String(payload.responsible || confirmation?.responsible || user.id || "").trim() || null,
    signals: payload.signals || {}, ticket_action: payload.ticket_action || null,
    recovery_offer: {
      type: offer.recoveryOffer,
      benefit_id: offer.recoveryBenefitId,
      custom_benefit: offer.customBenefit || null,
      discount_percent: offer.discountPercent,
      detail: offer.detail || offer.customBenefit?.detail || null,
      label: offer.benefitLabel,
      authorization_snapshot: authorizations,
    },
    recovery_resource: metadata.risk_recovery_resource || null,
    products: riskProducts,
    recycle: result === "RECYCLE" ? { reason: payload.recycle_reason || reason, reactivate_at: payload.next_action_at || new Date(Date.now() + (30 * 86400000)).toISOString(), strategy: payload.recycle_strategy || "NURTURE", responsible: payload.responsible || confirmation?.responsible || user.id, note: payload.recycle_note || reason, non_conversion_cost: nonConversionCost } : null,
  };
  const riskSaleHandoff = result === "CLEARED" ? {
    from_phase: "control_anti_fuga",
    to_phase: "cierre",
    decision: result,
    reason: review.reason,
    reviewed_at: review.reviewed_at,
    reviewed_by: review.reviewed_by,
    responsible: review.responsible,
    signals: review.signals,
    ticket_action: review.ticket_action,
    recovery_offer: review.recovery_offer,
    recovery_resource: review.recovery_resource,
    products: review.products,
    confirmation_snapshot: review.confirmation_snapshot,
  } : null;
  await recordRmsWorkflowEvent(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    event_type: "risk_review_started", event_title: "Revisión de Riesgos de fuga iniciada",
    event_description: reason, rms_phase: "control_anti_fuga", metadata: { risk_review: review },
  });
  if (item.active_tickets || item.redeemed_tickets || item.expired_tickets) {
    await recordRmsWorkflowEvent(businessId, user, {
      source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
      event_type: "risk_ticket_signal_detected", event_title: "Señal de ticket detectada",
      event_description: item.redeemed_tickets ? "Beneficio redimido sin resultado comercial confirmado." : item.expired_tickets ? "Existe un ticket vencido; no será modificado ni reactivado." : "Existe un ticket activo que requiere revisión contextual.",
      rms_phase: "control_anti_fuga", metadata: { active_tickets: item.active_tickets, redeemed_tickets: item.redeemed_tickets, expired_tickets: item.expired_tickets, ticket_action: payload.ticket_action || "NONE" },
    });
  }
  const isCleared = result === "CLEARED";
  let agenda = null;
  const recycling = result === "RECYCLE" ? await scheduleRmsRecyclingCase(businessId, user, {
    source_id: payload.source_id, source_type: sourceType, lead_id: item.lead_id || payload.lead_id || null,
    recycled_from_phase: "control_anti_fuga", recycle_reason: payload.recycle_reason || reason,
    recycle_strategy: payload.recycle_strategy || "NURTURE", recycle_owner: payload.responsible || confirmation?.responsible || user.id,
    recycle_at: review.recycle.reactivate_at, recycle_channel: null, recycle_consent: "NOT_REQUIRED", recycle_note: payload.recycle_note || reason,
    recycle_target_phase: "procesamiento", idempotency_key: payload.idempotency_key ? `risk:${payload.idempotency_key}` : null,
    metadata: {
      risk_review_at: review.reviewed_at,
      risk_review: review,
      products: review.products,
      recovery_offer: review.recovery_offer,
      source_station: "control_anti_fuga",
    },
  }) : null;
  if (result === "RECYCLE" && !recycling?.recycling_case?.agenda_note_id) {
    agenda = await createRmsAgendaTask(businessId, user, {
      source_id: payload.source_id, source_type: sourceType, lead_id: item.lead_id || payload.lead_id || null,
      stage: "reciclaje", action_title: "Reactivar lead reciclado con contexto actualizado",
      note: `Riesgos de fuga: ${reason}`, due_at: review.recycle.reactivate_at, priority_score: 45,
      revenue_potential: confirmation?.amount || item.revenue_potential, metadata: { rms_risk_review: review },
    });
  }
  if (recycling?.recycling_case?.id && agenda?.item?.id) await query(
    `update rms_recycling_cases set agenda_note_id=$3, updated_at=now() where business_id=$1 and id=$2`,
    [businessId, recycling.recycling_case.id, agenda.item.id]
  );
  // The decision is a real handoff: the lead must leave Riesgos de fuga and
  // become visible only in the destination confirmed by this operation.
  const toPhase = isCleared ? "cierre" : "reciclaje";
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    to_phase: toPhase, priority: isCleared ? "HIGH" : "LOW",
    recommended_action: isCleared ? "Registrar el resultado comercial atribuido" : "Reactivar en la fecha autorizada",
    last_operation: isCleared ? "risk_review_passed" : "lead_sent_to_recycling",
    last_material_sent: confirmation?.product_name || null, revenue_potential: confirmation?.amount || item.revenue_potential,
    reason, metadata: { risk_review: review, risk_sale_handoff: riskSaleHandoff, risk_result: result, recovery_offer: review.recovery_offer, risk_return_task_id: agenda?.item?.id || null, recycling: result === "RECYCLE" ? { ...review.recycle, recycling_case_id: recycling?.recycling_case?.id || null } : null },
  }, RMS_TRANSITION_AUTHORITY.RISK_REVIEW);
  const eventType = isCleared ? "risk_cleared_for_attribution" : "lead_sent_to_recycling";
  await recordRmsWorkflowEvent(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    event_type: eventType,
    event_title: isCleared ? "Recuperación autorizada convertida en venta" : "Lead enviado a Reciclaje comercial",
    event_description: reason, rms_phase: toPhase,
    metadata: { risk_review: review, risk_sale_handoff: riskSaleHandoff, recycling_case_id: recycling?.recycling_case?.id || null, movement_id: movement.movement?.id || null, task_id: agenda?.item?.id || null },
  });
  if (result === "RECYCLE") {
    await markRmsLifecycleStatus(businessId, user, {
      source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
      lifecycle_status: "RECYCLED", event_type: "risk_recycled_analyzed",
      event_title: "Reciclaje desde Riesgos incorporado a Inteligencia", reason,
      idempotency_key: `risk-recycle:${payload.idempotency_key || `${sourceType}:${payload.source_id}:${review.reviewed_at}`}`,
      metadata: { risk_review: review },
    });
  }
  return { review, agenda, recycling_case: recycling?.recycling_case || null, ...movement };
}

async function reactivateRmsRecycledLead(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const openRecycling = await query(
    `select id from rms_recycling_cases where business_id=$1 and source_type=$2 and source_id=$3 and recycle_status in ('SCHEDULED','REACTIVATING') order by updated_at desc limit 1`,
    [businessId, sourceType, payload.source_id]
  );
  if (openRecycling.rows[0]) return updateRmsRecyclingCase(businessId, user, {
    recycling_case_id: openRecycling.rows[0].id,
    action: "REACTIVATE",
    note: payload.note,
    destination: payload.destination,
    idempotency_key: payload.idempotency_key || null,
  });
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "reciclaje") throw badRequest("El lead solo puede reactivarse desde Reciclaje comercial.");
  const note = String(payload.note || "").trim();
  if (!note) throw badRequest("Explica el contexto actualizado antes de reactivar el lead.");
  const destination = payload.destination === "clasificacion" ? "clasificacion" : "procesamiento";
  const destinationLabel = destination === "clasificacion" ? "Activación 1" : "Evaluación";
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    to_phase: destination, priority: "MEDIUM", recommended_action: destination === "clasificacion" ? "Preparar una nueva Activación 1" : "Reevaluar contexto y propuesta antes de contactar",
    last_operation: "recycled_lead_reactivated", reason: note,
    metadata: { recycle_result: "REACTIVATED", recycling: { ...(item.state_metadata?.recycling || {}), status: "REACTIVATED", reactivation_destination: destination, reactivated_at: new Date().toISOString(), reactivated_by: user.id, reactivation_note: note } },
  });
  await recordRmsWorkflowEvent(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    event_type: "recycled_lead_reactivated", event_title: `Lead reciclado reactivado hacia ${destinationLabel}`, event_description: note,
    rms_phase: destination, metadata: { movement_id: movement.movement?.id || null, destination },
  });
  await markRmsLifecycleStatus(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    lifecycle_status: "ACTIVE", event_type: "recycled_lead_reactivated_analyzed",
    event_title: "Reciclaje reactivado", reason: note,
    idempotency_key: `recycle-reactivated:${movement.movement?.id || `${sourceType}:${payload.source_id}:${destination}`}`,
    metadata: { destination },
  });
  return movement;
}

function roundedMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function recordRmsAttributedSale(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "cierre") throw badRequest("La venta solo puede atribuirse desde una compra directa confirmada en Evaluación, una venta limpia o una revisión anti-fuga liberada.");
  const requestedProductLines = Array.isArray(payload.products) && payload.products.length
    ? payload.products
    : payload.inventory_product_id
      ? [{ inventory_product_id: payload.inventory_product_id, quantity: payload.quantity || 1, unit_price: null, unit_cost: payload.unit_cost }]
      : [];
  if (!requestedProductLines.length || requestedProductLines.some((line) => !line.inventory_product_id)) {
    throw badRequest("Agrega al menos un producto real del inventario antes de registrar la venta atribuida.");
  }
  const currentState = await query(
    `select metadata from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`,
    [businessId, sourceType, payload.source_id]
  );
  const workflowMetadata = currentState.rows[0]?.metadata || {};
  const riskReview = workflowMetadata.risk_review || {};
  const riskSaleHandoff = workflowMetadata.risk_sale_handoff || (riskReview.result === "CLEARED" ? {
    from_phase: "control_anti_fuga",
    to_phase: "cierre",
    decision: riskReview.result,
    reason: riskReview.reason || null,
    reviewed_at: riskReview.reviewed_at || null,
    reviewed_by: riskReview.reviewed_by || null,
    responsible: riskReview.responsible || riskReview.confirmation_snapshot?.responsible || null,
    signals: riskReview.signals || {},
    ticket_action: riskReview.ticket_action || null,
    recovery_offer: riskReview.recovery_offer || null,
    recovery_resource: riskReview.recovery_resource || workflowMetadata.risk_recovery_resource || null,
    products: riskReview.products || [],
    confirmation_snapshot: riskReview.confirmation_snapshot || null,
  } : null);
  const riskRecoveryOffer = riskSaleHandoff?.recovery_offer || riskReview.recovery_offer || null;
  const authoritativeRiskProducts = Array.isArray(riskSaleHandoff?.products) && riskSaleHandoff.products.length
    ? riskSaleHandoff.products
    : Array.isArray(riskReview.products) && riskReview.products.length
      ? riskReview.products
      : [];
  const riskProductBenefitScope = new Map(authoritativeRiskProducts.map((product) => [String(product.inventory_product_id || ""), Boolean(product.benefit_applied)]));
  const riskCustomBenefit = riskRecoveryOffer?.custom_benefit || {};
  const riskBenefitDescription = riskRecoveryOffer?.type === "DISCOUNT"
    ? `Descuento extraordinario del ${Number(riskRecoveryOffer.discount_percent || 0)}%`
    : riskRecoveryOffer?.type === "TWO_FOR_ONE"
      ? (riskRecoveryOffer.detail || "Beneficio extraordinario 2x1")
      : riskRecoveryOffer?.type === "GIFT"
        ? (riskRecoveryOffer.detail || "Obsequio extraordinario")
        : riskRecoveryOffer?.type === "CUSTOM"
          ? (riskCustomBenefit.label || riskRecoveryOffer.detail || "Beneficio extraordinario personalizado")
          : null;
  const riskBenefitType = riskRecoveryOffer?.type === "DISCOUNT" || riskCustomBenefit.type === "DISCOUNT"
    ? "DISCOUNT"
    : riskRecoveryOffer?.type === "GIFT" || riskCustomBenefit.type === "GIFT"
      ? "GIFT"
      : riskRecoveryOffer?.type === "CUSTOM" && riskCustomBenefit.type === "OTHER"
        ? "OTHER"
      : ["TWO_FOR_ONE", "CUSTOM"].includes(riskRecoveryOffer?.type)
        ? "BONUS"
        : "NONE";
  const requestedBenefitType = String(payload.benefit_type || "NONE").toUpperCase();
  // A benefit already confirmed in Riesgos is authoritative. A stale or
  // manually changed Sales field must not erase or reclassify that snapshot.
  const effectiveBenefitType = riskBenefitType !== "NONE" ? riskBenefitType : requestedBenefitType;
  const effectiveBenefitDescription = riskBenefitDescription || String(payload.benefit_description || "").trim();
  const appliedRiskBenefit = riskBenefitType !== "NONE" ? {
    source: "RISK_RECOVERY",
    authorization_id: riskRecoveryOffer?.benefit_id || null,
    offer_type: riskRecoveryOffer?.type || null,
    benefit_type: riskBenefitType,
    label: riskRecoveryOffer?.label || riskCustomBenefit.label || riskBenefitDescription,
    configured_value: Number(riskCustomBenefit.value || 0),
    discount_percent: Number(riskRecoveryOffer?.discount_percent || 0),
    detail: riskCustomBenefit.detail || riskRecoveryOffer?.detail || null,
    custom_benefit: riskRecoveryOffer?.custom_benefit || null,
    authorization_snapshot: riskRecoveryOffer?.authorization_snapshot || null,
  } : null;
  const riskTraceNote = riskSaleHandoff
    ? [
        `Riesgos de fuga: ${riskSaleHandoff.reason || "venta liberada"}`,
        riskBenefitDescription ? `Accion de recuperacion: ${riskBenefitDescription}` : null,
        riskSaleHandoff.ticket_action && riskSaleHandoff.ticket_action !== "NONE" ? `Accion de ticket: ${riskSaleHandoff.ticket_action}` : null,
        riskSaleHandoff.responsible ? `Responsable: ${riskSaleHandoff.responsible}` : null,
      ].filter(Boolean).join(" · ")
    : null;
  // Una compra directa registrada en Evaluación puede llegar a Ventas atribuidas
  // sin pasar por Negociación ni Riesgos de fuga. Esas estaciones son rutas de
  // apoyo, no un requisito para cerrar ni para alimentar Inteligencia GOS.
  const directEvaluationSale = workflowMetadata.rms_evaluation?.response === "PAID_SALE";
  const validSaleOrigin = directEvaluationSale
    || workflowMetadata.negotiation_result === "ACCEPTED"
    || workflowMetadata.commercial_route === "NEGOTIATION_CLEAN"
    || (workflowMetadata.commercial_confirmation?.route === "NEGOTIATION_CLEAN")
    || workflowMetadata.risk_review?.result === "CLEARED";
  // `cierre` is already the trusted entry point; legacy origin check kept
  // unreachable for compatibility with old metadata shapes.
  if (false && !validSaleOrigin) {
    throw badRequest("Registra una compra directa en Evaluación, confirma un acuerdo en Negociación o libera una revisión anti-fuga antes de atribuir la venta.");
  }
  const benefitCost = Math.max(0, roundedMoney(payload.benefit_cost));
  const acquisitionCost = Math.max(0, roundedMoney(payload.acquisition_cost));
  const idempotencyKey = String(payload.idempotency_key || "").trim() || null;
  const confirmation = workflowMetadata.commercial_confirmation;
  const negotiatedProduct = confirmation ? {
    inventory_product_id: confirmation.inventory_product_id,
    product_name: confirmation.product_name || null,
    product_price_snapshot: confirmation.product_price_snapshot ?? null,
    product_currency_snapshot: confirmation.product_currency_snapshot || null,
  } : null;
  const requestedMultipleProducts = Array.isArray(payload.products) && payload.products.length > 0;
  const productLines = await Promise.all(requestedProductLines.map(async (line, index) => {
    const snapshot = await rmsInventoryProductSnapshot(businessId, line.inventory_product_id);
    const quantity = Math.max(0.01, Number(line.quantity || 1));
    const originalUnitPrice = Math.max(0, roundedMoney(snapshot.product_price_snapshot));
    const unitCost = Math.max(0, roundedMoney(line.unit_cost ?? snapshot.inventory_product?.cost_price ?? 0));
    return { index, requested: line, snapshot, quantity, originalUnitPrice, unitCost };
  }));
  const productSnapshot = productLines[0].snapshot;
  const productRow = productSnapshot.inventory_product;
  const quantity = roundedMoney(productLines.reduce((sum, line) => sum + line.quantity, 0));
  const productCorrectedAtSale = Boolean(confirmation?.inventory_product_id)
    && !productLines.some((line) => String(line.snapshot.inventory_product_id) === String(confirmation.inventory_product_id));
  const confirmedAmount = Math.max(0, roundedMoney(confirmation?.amount));
  const confirmedQuantity = Math.max(0.01, Number(confirmation?.sale_context?.quantity || 1));
  // El acuerdo heredado tiene una cantidad propia. Al cambiar la cantidad en
  // Ventas atribuidas, se conserva la condición por unidad y se recalcula el
  // total; si el producto fue corregido al cierre, manda el precio real de la
  // nueva referencia en lugar del valor pactado para otro producto.
  const riskDiscountPercent = Math.min(100, Math.max(0, Number(
    riskRecoveryOffer?.discount_percent
      || (riskRecoveryOffer?.type === "CUSTOM" && riskCustomBenefit.type === "DISCOUNT" ? riskCustomBenefit.value : 0)
      || 0
  )));
  const normalizedProducts = productLines.map((line) => {
    const matchesConfirmedProduct = Boolean(confirmation?.inventory_product_id)
      && String(line.snapshot.inventory_product_id) === String(confirmation.inventory_product_id);
    const negotiatedBeforeBenefit = confirmedAmount > 0 && matchesConfirmedProduct
      ? roundedMoney(confirmedAmount / confirmedQuantity)
      : line.originalUnitPrice;
    const explicitUnitPrice = Math.max(0, roundedMoney(line.requested.unit_price));
    const benefitApplied = riskBenefitType !== "NONE"
      && (riskProductBenefitScope.size
        ? riskProductBenefitScope.get(String(line.snapshot.inventory_product_id)) === true
        : true);
    const finalUnitPrice = requestedMultipleProducts && explicitUnitPrice > 0
      ? explicitUnitPrice
      : riskDiscountPercent > 0 && benefitApplied
        ? roundedMoney(negotiatedBeforeBenefit * (1 - (riskDiscountPercent / 100)))
        : negotiatedBeforeBenefit;
    const originalLineTotal = roundedMoney(line.originalUnitPrice * line.quantity);
    const negotiatedLineTotal = roundedMoney(negotiatedBeforeBenefit * line.quantity);
    const lineTotal = roundedMoney(finalUnitPrice * line.quantity);
    const lineProductCostTotal = roundedMoney(line.unitCost * line.quantity);
    return {
      inventory_product_id: line.snapshot.inventory_product_id,
      name: line.snapshot.product_name_snapshot,
      product_name_snapshot: line.snapshot.product_name_snapshot,
      sku: line.snapshot.inventory_product?.sku || null,
      barcode: line.snapshot.inventory_product?.barcode || null,
      quantity: line.quantity,
      unit_price: finalUnitPrice,
      line_total: lineTotal,
      original_unit_price: line.originalUnitPrice,
      original_line_total: originalLineTotal,
      negotiated_unit_price: negotiatedBeforeBenefit,
      negotiated_line_total: negotiatedLineTotal,
      unit_cost: line.unitCost,
      product_cost_total: lineProductCostTotal,
      product_currency_snapshot: line.snapshot.product_currency_snapshot,
      product_source: line.snapshot.product_source,
      benefit_applied: benefitApplied,
      applied_benefit: benefitApplied ? appliedRiskBenefit : null,
    };
  });
  const originalAmount = roundedMoney(normalizedProducts.reduce((sum, line) => sum + line.original_line_total, 0));
  const negotiatedAmount = roundedMoney(normalizedProducts.reduce((sum, line) => sum + line.negotiated_line_total, 0));
  const calculatedSaleAmount = roundedMoney(normalizedProducts.reduce((sum, line) => sum + line.line_total, 0));
  const requestedFinalAmount = Math.max(0, roundedMoney(payload.sale_amount));
  const saleAmount = calculatedSaleAmount > 0 ? calculatedSaleAmount : requestedFinalAmount;
  const originalUnitPrice = Math.max(0, roundedMoney(productSnapshot.product_price_snapshot));
  const negotiatedUnitPrice = quantity > 0 ? roundedMoney(saleAmount / quantity) : 0;
  const discountAmount = roundedMoney(Math.max(0, originalAmount - saleAmount));
  const discountPercent = originalAmount > 0 ? roundedMoney((discountAmount / originalAmount) * 100) : 0;
  if (originalUnitPrice <= 0 || saleAmount <= 0) {
    throw badRequest("El producto confirmado debe tener un precio de venta mayor a cero para calcular el valor pagado.");
  }
  const productCostTotal = roundedMoney(normalizedProducts.reduce((sum, line) => sum + line.product_cost_total, 0));
  const unitCost = quantity > 0 ? roundedMoney(productCostTotal / quantity) : 0;
  const grossProfit = roundedMoney(saleAmount - productCostTotal - benefitCost);
  const netProfit = roundedMoney(grossProfit - acquisitionCost);
  const invested = roundedMoney(productCostTotal + benefitCost + acquisitionCost);
  const roi = invested > 0 ? Math.round((netProfit / invested) * 1000000) / 1000000 : null;
  const paidAt = payload.paid_at || new Date().toISOString();
  const currency = String(payload.currency || "COP").trim().toUpperCase().slice(0, 8) || "COP";
  const productName = normalizedProducts.length === 1
    ? normalizedProducts[0].name
    : `${normalizedProducts.length} productos: ${normalizedProducts.map((line) => `${line.name} x${line.quantity}`).join(" · ")}`.slice(0, 500);
  const economics = { product_count: normalizedProducts.length, quantity, unit_price: negotiatedUnitPrice, original_unit_price: originalUnitPrice, original_amount: originalAmount, negotiated_amount: negotiatedAmount, discount_amount: discountAmount, discount_percent: discountPercent, final_amount: saleAmount, sale_amount: saleAmount, unit_cost: unitCost, product_cost_total: productCostTotal, benefit_cost: benefitCost, acquisition_cost: acquisitionCost, gross_profit: grossProfit, net_profit: netProfit, roi, currency, products: normalizedProducts };
  const metadata = {
    source_module: "rms_machine",
    rms_source_type: sourceType,
    rms_source_id: payload.source_id,
    rms_opportunity_id: item.id,
    communication_id: item.communication_id || null,
    product_snapshot: {
      inventory_product_id: productSnapshot.inventory_product_id,
      product_name_snapshot: productSnapshot.product_name_snapshot,
      product_price_snapshot: productSnapshot.product_price_snapshot,
      product_currency_snapshot: productSnapshot.product_currency_snapshot,
      product_source: productSnapshot.product_source,
    },
    negotiated_product: negotiatedProduct,
    product_corrected_at_sale: productCorrectedAtSale,
    benefit_description: effectiveBenefitDescription || null,
    applied_benefit: appliedRiskBenefit,
    commercial_confirmation_snapshot: workflowMetadata.commercial_confirmation || null,
    risk_review_snapshot: riskReview.result ? riskReview : null,
    risk_sale_handoff: riskSaleHandoff,
    risk_recovery_resource: workflowMetadata.risk_recovery_resource || riskReview.recovery_resource || null,
    products: normalizedProducts,
    product_count: normalizedProducts.length,
    economics,
    pricing_breakdown: {
      original_amount: originalAmount,
      negotiated_amount: negotiatedAmount,
      discount_amount: discountAmount,
      discount_percent: discountPercent,
      final_amount: saleAmount,
      currency,
    },
    acquisition_channel: {
      id: item.acquisition_channel_id || null,
      name_snapshot: item.acquisition_channel_name_snapshot || item.channel || null,
      slug_snapshot: item.acquisition_channel_slug_snapshot || null,
      source: item.acquisition_channel_source || (item.channel ? "MANUAL_UNCONFIGURED" : null),
    },
  };
  const result = await withTransaction(async (client) => {
    const attributedSeller = await resolveBusinessSaleSeller(client, businessId, user, payload.seller_user_id);
    const customerLink = await ensureRmsCustomerContact(client, businessId, user, item, sourceType, payload.source_id);
    const customer = customerLink.customer;
    let relatedAffiliate = await resolveRmsRelatedAffiliate(client, businessId, item, sourceType, payload.source_id, customer);
    const affiliatePointRules = relatedAffiliate ? await getAffiliatePointRules(businessId, client) : null;
    const referralPoints = affiliatePointRules ? referralPointsForAmount(saleAmount, affiliatePointRules) : 0;
    const saleMetadata = {
      ...metadata,
      crm_source_type: "PLAYER",
      crm_source_id: customer.id,
      crm_lead_id: customer.id,
      rms_original_source_type: sourceType,
      rms_original_source_id: payload.source_id,
      customer_contact_id: customer.id,
      customer_contact_created: customerLink.created,
      related_affiliate_id: relatedAffiliate?.id || null,
      ...(affiliatePointRules ? affiliatePointRuleMetadata(affiliatePointRules) : {}),
      responsible_commercial: attributedSeller ? {
        user_id: attributedSeller.id,
        name_snapshot: attributedSeller.full_name,
        email_snapshot: attributedSeller.email,
        role_snapshot: attributedSeller.role,
        seller_code_snapshot: attributedSeller.seller_code || null,
      } : null,
      recorded_by_user_id: user?.id || null,
    };
    const sale = await client.query(
      `insert into business_sales
        (business_id, campaign_id, customer_name, customer_phone, customer_email, customer_document_id,
         product_name, sale_amount, currency, seller_user_id, acquisition_source, acquisition_channel,
         acquisition_channel_id, acquisition_channel_name_snapshot, acquisition_channel_slug_snapshot,
         acquisition_channel_source, notes,
         metadata, rms_source_type, rms_source_id, inventory_product_id, quantity, unit_cost, product_cost_total,
         benefit_type, benefit_cost, acquisition_cost, gross_profit, net_profit, roi, payment_method, paid_at, sale_status, idempotency_key,
         product_name_snapshot, product_price_snapshot, product_currency_snapshot, product_source)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'RMS', $11, $12, $13, $14, $15, $16,
         $17::jsonb, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, 'PAID', $32, $33, $34, $35, $36)
       on conflict (business_id, idempotency_key) where idempotency_key is not null do nothing
       returning *`,
      [businessId, item.campaign_id || null, customer.name || item.name || null, customer.phone || item.phone || null, customer.email || item.email || null,
        customer.document_id || item.document_id || null, productName, saleAmount, currency, attributedSeller?.id || user.id,
        item.acquisition_channel_name_snapshot || item.channel || "RMS / Ventas atribuidas",
        item.acquisition_channel_id || null,
        item.acquisition_channel_name_snapshot || item.channel || null,
        item.acquisition_channel_slug_snapshot || null,
        item.acquisition_channel_source || (item.channel ? "MANUAL_UNCONFIGURED" : null),
        String(payload.notes || "").trim() || riskTraceNote,
        JSON.stringify(saleMetadata), sourceType, payload.source_id, productRow?.id || null, quantity, unitCost,
        productCostTotal, effectiveBenefitType, benefitCost, acquisitionCost,
        grossProfit, netProfit, roi, String(payload.payment_method || "OTHER").toUpperCase(), paidAt, idempotencyKey,
        productSnapshot.product_name_snapshot, productSnapshot.product_price_snapshot, productSnapshot.product_currency_snapshot, productSnapshot.product_source]
    );
    if (sale.rows[0]) {
      let recordedSale = sale.rows[0];
      if (relatedAffiliate && referralPoints > 0) {
        await client.query(
          `insert into affiliate_point_ledger
            (business_id, affiliate_id, created_by_user_id, amount, points_awarded, reason, metadata)
           values ($1, $2, $3, $4, $5, 'REFERRAL_PURCHASE', $6::jsonb)`,
          [
            businessId,
            relatedAffiliate.id,
            user?.id || null,
            saleAmount,
            referralPoints,
            JSON.stringify({
              sale_id: recordedSale.id,
              rms_source_type: sourceType,
              rms_source_id: payload.source_id,
              registered_from: "rms_attributed_sale",
              referred_customer: customer.name || item.name || null,
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
        const updatedSale = await client.query(
          `update business_sales
              set referred_affiliate_id = $3,
                  referral_points_awarded = $4,
                  metadata = coalesce(metadata, '{}'::jsonb) || $5::jsonb
            where business_id = $1 and id = $2
            returning *`,
          [
            businessId,
            recordedSale.id,
            relatedAffiliate.id,
            referralPoints,
            JSON.stringify({ related_affiliate_id: relatedAffiliate.id, referral_points_awarded: referralPoints }),
          ]
        );
        recordedSale = updatedSale.rows[0] || recordedSale;
      }
      await client.query(
        `update players
            set metadata = jsonb_set(
              jsonb_set(coalesce(metadata, '{}'::jsonb), '{commercial_status}', to_jsonb('BUYER'::text), true),
              '{converted_sale_id}', to_jsonb($3::text), true
            )
          where business_id = $1 and id = $2`,
        [businessId, customer.id, sale.rows[0].id]
      );
      if (sourceType === "MANUAL") {
        await client.query(
          `update business_manual_leads
              set status = case when status in ('NEW', 'INTERESTED', 'CONTACTED', 'FOLLOW_UP', '') then 'CONVERTED' else status end,
                  metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb,
                  updated_at = now()
            where id = $1 and business_id = $2`,
          [payload.source_id, businessId, JSON.stringify({
            customer_contact_id: customer.id,
            customer_contact_created: customerLink.created,
            customer_converted_at: new Date().toISOString(),
            attributed_sale_id: sale.rows[0].id,
          })]
        );
      }
      await client.query(
        `insert into lead_events
          (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, metadata, created_by)
         values ($1, $2, 'PLAYER', $2, 'customer_created_from_attributed_sale', $3, $4, $5::jsonb, $6)`,
        [
          businessId,
          customer.id,
          customerLink.created ? "Cliente creado desde venta atribuida" : "Venta atribuida vinculada a cliente existente",
          customerLink.created
            ? "La venta quedó vinculada a un nuevo contacto cliente en Qori."
            : "La venta quedó vinculada al contacto cliente existente en Qori.",
          JSON.stringify({ sale_id: recordedSale.id, original_source_type: sourceType, original_source_id: payload.source_id, related_affiliate_id: relatedAffiliate?.id || null, referral_points_awarded: referralPoints, product_count: normalizedProducts.length, products: normalizedProducts, economics, payment_method: String(payload.payment_method || "OTHER").toUpperCase(), paid_at: paidAt, seller_user_id: attributedSeller?.id || user.id }),
          user.id,
        ]
      );
      return {
        sale: recordedSale,
        duplicate: false,
        customer: { id: customer.id, name: customer.name, created: customerLink.created },
        affiliate: relatedAffiliate ? { id: relatedAffiliate.id, name: relatedAffiliate.full_name, points_awarded: referralPoints, points_total: relatedAffiliate.points_total } : null,
      };
    }
    const existing = await client.query(
      `select * from business_sales where business_id = $1 and idempotency_key = $2 limit 1`,
      [businessId, idempotencyKey]
    );
    let existingSale = existing.rows[0];
    if (existingSale && riskSaleHandoff) {
      const repaired = await client.query(
        `update business_sales
            set metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb,
                notes = coalesce(nullif(notes, ''), $4)
          where business_id = $1 and id = $2
          returning *`,
        [businessId, existingSale.id, JSON.stringify({ risk_review_snapshot: riskReview, risk_sale_handoff: riskSaleHandoff, risk_recovery_resource: workflowMetadata.risk_recovery_resource || riskReview.recovery_resource || null, applied_benefit: appliedRiskBenefit }), riskTraceNote]
      );
      existingSale = repaired.rows[0] || existingSale;
    }
    return { sale: existingSale, duplicate: true, customer: { id: customer.id, name: customer.name, created: customerLink.created }, affiliate: null };
  });
  if (result.duplicate) {
    const duplicateMovement = item.stage === "cierre" ? await moveRmsLeadPhase(businessId, user, {
      source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
      to_phase: "postventa", priority: "HIGH", recommended_action: "Elegir una acción de Valorización Clientes",
      last_operation: "attributed_sale_recovered_from_idempotency", last_material_sent: productName,
      revenue_potential: saleAmount, reason: "Reintento idempotente: la venta canónica ya existía.",
      metadata: { rms_attributed_sale_id: result.sale?.id || null, rms_sale_recorded_at: new Date().toISOString(), rms_sale_product: productName, rms_sale_products: normalizedProducts, rms_sale_amount: saleAmount, rms_sale_economics: economics, risk_review_snapshot: riskReview.result ? riskReview : null, risk_sale_handoff: riskSaleHandoff },
    }, RMS_TRANSITION_AUTHORITY.ATTRIBUTED_SALE) : null;
    return { sale: result.sale, economics: result.sale?.metadata?.economics || economics, movement: duplicateMovement, customer: result.customer, affiliate: result.affiliate || null, duplicate: true };
  }
  const movement = await moveRmsLeadPhase(businessId, user, {
    source_type: sourceType,
    source_id: payload.source_id,
    lead_id: item.lead_id || payload.lead_id || null,
    to_phase: "postventa",
    priority: "HIGH",
    recommended_action: "Elegir una acción de Valorización Clientes",
    last_operation: "attributed_sale_registered",
    last_material_sent: productName,
    revenue_potential: saleAmount,
    reason: "Venta cobrada y atribuida desde la estación de Ventas atribuidas.",
    metadata: { rms_attributed_sale_id: result.sale.id, rms_sale_recorded_at: new Date().toISOString(), rms_sale_product: productName, rms_sale_products: normalizedProducts, rms_sale_amount: saleAmount, rms_sale_economics: economics, risk_review_snapshot: riskReview.result ? riskReview : null, risk_sale_handoff: riskSaleHandoff },
  }, RMS_TRANSITION_AUTHORITY.ATTRIBUTED_SALE);
  let riskRecoveryTicket = null;
  const riskRecovery = riskReview.result === "CLEARED" ? riskRecoveryOffer : null;
  const preparedRiskResource = workflowMetadata.risk_recovery_resource || riskReview.recovery_resource || null;
  if (preparedRiskResource?.qr_code_id) {
    const linked = await query(
      `update qr_codes
          set sale_id = $3::uuid,
              metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
                'attributed_sale_id', $3::uuid::text,
                'risk_recovery_converted_at', now()::text
              )
        where business_id = $1 and id = $2 and sale_id is null
        returning id, token, status, expires_at, benefit_type, benefit_value`,
      [businessId, preparedRiskResource.qr_code_id, result.sale.id]
    );
    riskRecoveryTicket = {
      qr_code: linked.rows[0] || { id: preparedRiskResource.qr_code_id },
      public_ticket_url: preparedRiskResource.public_ticket_url,
      reused_pre_sale_resource: true,
    };
  } else if (riskRecovery && riskRecovery.type && riskRecovery.type !== "NONE") {
    const custom = riskRecovery.custom_benefit || {};
    const ticketType = riskRecovery.type === "DISCOUNT" || custom.type === "DISCOUNT"
      ? "PERCENT_DISCOUNT"
      : riskRecovery.type === "GIFT" || custom.type === "GIFT"
        ? "FREE_GIFT"
        : riskRecovery.type === "TWO_FOR_ONE"
          ? "BUY_X_GET_Y"
          : "CUSTOM";
    riskRecoveryTicket = await createPostSaleQr(businessId, user, {
      campaign_id: item.campaign_id || null,
      existing_sale_id: result.sale.id,
      sale_amount: saleAmount,
      currency,
      customer_name: result.customer?.name || item.name || null,
      customer_phone: item.phone || null,
      customer_email: item.email || null,
      document_id: item.document_id || null,
      product_name: productName,
      benefit: {
        reward_id: null,
        benefit_type: ticketType,
        benefit_label: custom.label || riskRecovery.detail || `Beneficio extraordinario ${riskRecovery.type}`,
        benefit_value: { discount_percent: riskRecovery.discount_percent || custom.value || 0, detail: custom.detail || riskRecovery.detail || null, risk_recovery: true },
      },
      metadata: { qr_creation_context: "rms_risk_recovery", ticket_use_case: "risk_recovery", existing_sale_id: result.sale.id, recovery_benefit_id: riskRecovery.benefit_id || null },
    });
  }
  if (riskRecoveryTicket) {
    const riskTicketSnapshot = {
      qr_code_id: riskRecoveryTicket.qr_code?.id || preparedRiskResource?.qr_code_id || null,
      public_ticket_url: riskRecoveryTicket.public_ticket_url || preparedRiskResource?.public_ticket_url || null,
      reused_pre_sale_resource: Boolean(riskRecoveryTicket.reused_pre_sale_resource),
      recovery_offer: riskRecovery,
    };
    const updatedSale = await query(
      `update business_sales
          set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('risk_recovery_ticket', $3::jsonb)
        where business_id = $1 and id = $2
        returning *`,
      [businessId, result.sale.id, JSON.stringify(riskTicketSnapshot)]
    );
    result.sale = updatedSale.rows[0] || result.sale;
    await query(
      `update rms_lead_state
          set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('risk_recovery_ticket', $4::jsonb),
              updated_at = now()
        where business_id = $1 and source_type = $2 and source_id = $3`,
      [businessId, sourceType, payload.source_id, JSON.stringify(riskTicketSnapshot)]
    );
  }
  await recordRmsWorkflowEvent(businessId, user, {
    source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || payload.lead_id || null,
    event_type: "sale_attributed", event_title: `Venta atribuida con ${normalizedProducts.length} producto(s)`,
    event_description: `${normalizedProducts.map((line) => `${line.name} x${line.quantity} por ${line.line_total} ${currency}`).join(" · ")}. Total pagado: ${saleAmount} ${currency}. La venta pasó a Valorización Clientes y quedó disponible para Inteligencia GOS.`,
    rms_phase: "postventa", metadata: {
      sale_id: result.sale.id,
      movement_id: movement.movement?.id || null,
      product_count: normalizedProducts.length,
      products: normalizedProducts,
      economics,
      payment_method: String(payload.payment_method || "OTHER").toUpperCase(),
      paid_at: paidAt,
      seller_user_id: payload.seller_user_id || user.id,
      recorded_by_user_id: user.id,
      next_operational_station: "postventa",
      quality_control: "revenue_generado_visual",
      intelligence_handoff: {
        status: "READY",
        source: "attributed_sale",
        activation: {
          campaign_id: item.campaign_id || null,
          acquisition_channel_id: item.acquisition_channel_id || null,
          acquisition_channel: item.acquisition_channel_name_snapshot || item.channel || null,
          offer: item.product_interest || null,
        },
        evaluation: workflowMetadata.rms_evaluation || null,
        negotiation: confirmation?.negotiation || workflowMetadata.negotiation_current || null,
        risk_review: riskReview.result ? riskReview : null,
        risk_sale_handoff: riskSaleHandoff,
        risk_recovery_resource: preparedRiskResource,
        risk_recovery_ticket: riskRecoveryTicket ? {
          qr_code_id: riskRecoveryTicket.qr_code?.id || preparedRiskResource?.qr_code_id || null,
          public_ticket_url: riskRecoveryTicket.public_ticket_url || preparedRiskResource?.public_ticket_url || null,
        } : null,
        confirmation: confirmation ? {
          inventory_product_id: confirmation.inventory_product_id,
          product_name: confirmation.product_name,
          quantity: confirmation.sale_context?.quantity || quantity,
          benefit_type: confirmation.sale_context?.benefit_type || "NONE",
          benefit_cost: confirmation.sale_context?.benefit_cost || 0,
          acquisition_cost: confirmation.sale_context?.acquisition_cost || 0,
        } : null,
        sale: {
          product_name: productName,
          product_count: normalizedProducts.length,
          products: normalizedProducts,
          quantity,
          sale_amount: saleAmount,
          currency,
          economics,
          affiliate_id: result.affiliate?.id || null,
          referral_points_awarded: result.affiliate?.points_awarded || 0,
        },
      },
    },
  });
  return { sale: result.sale, economics, movement, customer: result.customer, affiliate: result.affiliate || null, risk_recovery_ticket: riskRecoveryTicket, duplicate: false };
}

async function canonicalAttributedSaleFor(client, businessId, sourceType, sourceId, requestedSaleId = null) {
  const result = await client.query(
    `select *
       from business_sales
      where business_id = $1
        and sale_status = 'PAID'
        and (
          ($4::uuid is not null and id = $4)
          or ($4::uuid is null and rms_source_type = $2 and rms_source_id = $3)
        )
      order by paid_at desc nulls last, created_at desc
      limit 1
      for update`,
    [businessId, sourceType, sourceId, requestedSaleId || null]
  );
  const sale = result.rows[0];
  if (!sale) throw badRequest("Valorización Clientes exige una venta atribuida canónica de este negocio.");
  if (!String(sale.product_name || "").trim() || moneyNumber(sale.sale_amount) <= 0) {
    throw badRequest("La venta atribuida debe tener producto o servicio y un valor mayor a cero.");
  }
  if (requestedSaleId && (sale.rms_source_type !== sourceType || String(sale.rms_source_id) !== String(sourceId))) {
    throw badRequest("La venta indicada no pertenece a la oportunidad RMS de esta estación de Valorización.");
  }
  return sale;
}

async function createPostSaleAgendaInTransaction(client, businessId, user, item, action) {
  const dueAt = action.scheduled_for || new Date().toISOString();
  const title = {
    THANK_YOU: "Preparar agradecimiento postventa",
    WARRANTY: "Confirmar garantía o instrucciones",
    SURVEY: "Solicitar satisfacción postventa",
    REBUY_TICKET: "Compartir ticket de próxima compra",
    REWARD_PASS: "Preparar Reward Pass postventa",
    REFERRAL: "Preparar invitación de referido",
    FOLLOW_UP: "Realizar seguimiento postventa",
    INCIDENT: "Dar seguimiento a incidencia postventa",
  }[action.action_type] || "Registrar resultado de Valorización Clientes";
  const note = await client.query(
    `insert into lead_notes
      (business_id, lead_id, source_type, source_id, note, note_type, next_action, reminder_at, agenda_priority, progress_percent, checklist, metadata, created_by)
     values ($1, $2, $3, $4, $5, 'follow_up', $6, $7, 'MEDIUM', 0, $8::jsonb, $9::jsonb, $10)
     returning id, reminder_at, agenda_status`,
    [
      businessId, item.lead_id || null, item.source_type, item.source_id,
      action.content || title, title, dueAt,
      JSON.stringify([{ label: title, done: false }, { label: "Registrar resultado verificable", done: false }]),
      JSON.stringify({ source_module: "rms_activation_2", rms_post_sale_action_id: action.id, sale_id: action.sale_id, action_type: action.action_type, contact_channel: action.contact_channel || null }),
      user.id,
    ]
  );
  return note.rows[0];
}

async function createReferredOpportunityInTransaction(client, businessId, user, action, referred = {}) {
  const name = String(referred.name || "").trim();
  const email = String(referred.email || "").trim() || null;
  const phone = String(referred.phone || "").trim() || null;
  if (!name && !email && !phone) return null;
  if (!name || (!email && !phone) || !referred.contact_consent_confirmed) {
    throw badRequest("Un referido solo entra a Recolección con nombre, contacto válido y consentimiento confirmado.");
  }
  const lead = await client.query(
    `insert into business_manual_leads
      (business_id, created_by_user_id, name, email, phone, source, source_detail, interest, importance_reason, preferred_channel, status, priority, notes, metadata)
     values ($1, $2, $3, $4, $5, 'Referido postventa', $6, $7, $8, $9, 'NEW', 'MEDIUM', $10, $11::jsonb)
     returning id, name, email, phone`,
    [
      businessId, user.id, name, email, phone,
      `Venta ${String(action.sale_id).slice(0, 8)} · Valorización Clientes`,
      String(referred.interest || "").trim() || null,
      "Referido identificado después de una venta atribuida",
      String(referred.preferred_channel || (phone ? "WhatsApp" : "Email")).trim(),
      String(referred.note || "").trim() || null,
      JSON.stringify({ source_module: "rms_activation_2", referred_from_sale_id: action.sale_id, rms_post_sale_action_id: action.id, contact_consent_confirmed: true }),
    ]
  );
  const contact = lead.rows[0];
  await client.query(
    `insert into rms_lead_state (business_id, source_type, source_id, rms_phase, priority, recommended_action, last_operation, metadata, created_by, updated_by)
     values ($1, 'MANUAL', $2, 'recoleccion', 'MEDIUM', 'Validar la nueva oportunidad referida', 'post_sale_referral_captured', $3::jsonb, $4, $4)
     on conflict (business_id, source_type, source_id) do nothing`,
    [businessId, contact.id, JSON.stringify({ source_module: "rms_activation_2", parent_sale_id: action.sale_id, parent_action_id: action.id }), user.id]
  );
  return contact;
}

async function listRmsPostSaleActions(businessId, filters = {}) {
  const sourceType = filters.source_type ? crmSourceType({ source_type: filters.source_type }) : null;
  const sourceId = filters.source_id || null;
  const saleId = filters.sale_id || null;
  const lite = String(filters.lite || "").toLowerCase() === "1" || String(filters.lite || "").toLowerCase() === "true";
  const requestedLimit = Number(filters.limit || (lite ? 48 : 120));
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : (lite ? 48 : 120), 1), lite ? 80 : 120);
  const values = [businessId];
  const where = ["a.business_id = $1"];
  if (sourceType) {
    values.push(sourceType);
    where.push(`a.source_type = $${values.length}`);
  }
  if (sourceId) {
    values.push(sourceId);
    where.push(`a.source_id = $${values.length}`);
  }
  if (saleId) {
    values.push(saleId);
    where.push(`a.sale_id = $${values.length}`);
  }
  values.push(limit);
  const whereSql = where.join(" and ");
  if (lite) {
    const result = await query(
      `select a.*, s.product_name as sale_product_name, s.sale_amount, s.currency, s.paid_at, '[]'::json as events
         from rms_post_sale_actions a
         join business_sales s on s.id = a.sale_id and s.business_id = a.business_id
        where ${whereSql}
        order by a.updated_at desc
        limit $${values.length}`,
      values
    );
    return { actions: result.rows };
  }
  const result = await query(
    `select a.*, s.product_name as sale_product_name, s.sale_amount, s.currency, s.paid_at,
            coalesce(json_agg(e order by e.created_at desc) filter (where e.id is not null), '[]'::json) as events
       from rms_post_sale_actions a
       join business_sales s on s.id = a.sale_id and s.business_id = a.business_id
       left join lateral (
         select id, event_type, event_description, status, metadata, created_at
           from rms_post_sale_action_events
          where business_id = a.business_id and post_sale_action_id = a.id
          order by created_at desc limit 12
       ) e on true
      where ${whereSql}
      group by a.id, s.id
      order by a.updated_at desc
      limit $${values.length}`,
    values
  );
  return { actions: result.rows };
}

async function ensurePostSaleReferrerAffiliate(businessId, user, sale, item, action) {
  const fullName = String(sale.customer_name || item.name || "").trim();
  const phone = String(sale.customer_phone || item.phone || "").trim() || null;
  const email = String(sale.customer_email || item.email || "").trim() || null;
  const documentId = String(sale.customer_document_id || "").trim() || null;
  if (!fullName || (!phone && !email && !documentId)) {
    throw badRequest("Para activar referidos, la venta debe tener nombre y al menos teléfono, correo o documento del cliente.");
  }
  return withTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`rms-referrer:${businessId}:${sale.id}`]);
    const existing = await client.query(
      `select id, full_name, points_total from affiliates
       where business_id = $1 and status = 'ACTIVE' and (
         ($2::text is not null and nullif(document_id, '') = $2)
         or ($3::text is not null and nullif(phone, '') = $3)
         or ($4::text is not null and lower(nullif(email, '')) = lower($4))
       ) order by created_at desc limit 1 for update`,
      [businessId, documentId, phone, email]
    );
    if (existing.rowCount) return existing.rows[0];
    const created = await client.query(
      `insert into affiliates
        (business_id, created_by_user_id, full_name, document_id, phone, email, qr_token, status, notes, card_metadata)
       values ($1,$2,$3,$4,$5,$6,$7,'ACTIVE',$8,$9::jsonb)
       returning id, full_name, points_total`,
      [
        businessId, user.id, fullName, documentId, phone, email, createSecureToken(),
        "Cliente afiliado automáticamente al activar su enlace de referidos desde Valorización Clientes.",
        JSON.stringify({ source: "rms_post_sale_referral", sale_id: sale.id, post_sale_action_id: action.id }),
      ]
    );
    return created.rows[0];
  });
}

async function recordRmsPostSaleAction(businessId, user, payload = {}) {
  const sourceType = crmSourceType({ source_type: payload.source_type });
  const actionType = normalizePostSaleActionType(payload.action_type);
  const executionMode = String(payload.execution_mode || "TASK").trim().toUpperCase();
  const idempotencyKey = String(payload.idempotency_key || "").trim();
  if (!payload.source_id || !idempotencyKey) throw badRequest("Valorización Clientes exige oportunidad e idempotency_key.");
  if (requiresContactConsent(actionType, executionMode) && (!payload.contact_consent_confirmed || !String(payload.contact_channel || "").trim())) {
    throw badRequest("Para preparar un contacto debes confirmar consentimiento y canal permitido; el sistema no enviará nada automáticamente.");
  }
  if (actionType === "NO_ACTION_NEEDED" && !String(payload.result_note || payload.reason || "").trim()) {
    throw badRequest("Explica por qué no aplica una acción de continuidad.");
  }
  const item = await findOpportunity(businessId, sourceType, payload.source_id);
  if (item.stage !== "postventa") throw badRequest("Valorización Clientes solo opera clientes que ya llegaron a esta estación.");
  const created = await withTransaction(async (client) => {
    const duplicate = await client.query(
      "select * from rms_post_sale_actions where business_id = $1 and idempotency_key = $2 for update",
      [businessId, idempotencyKey]
    );
    if (duplicate.rowCount) return { action: duplicate.rows[0], duplicate: true, agenda: null, referral: null };
    const sale = await canonicalAttributedSaleFor(client, businessId, sourceType, payload.source_id, payload.sale_id || null);
    const status = actionType === "NO_ACTION_NEEDED"
      ? "NOT_APPLICABLE"
      : normalizePostSaleStatus(payload.status, payload.scheduled_for ? "SCHEDULED" : "PLANNED");
    const actionResult = await client.query(
      `insert into rms_post_sale_actions
        (business_id, sale_id, source_type, source_id, lead_id, action_type, status, responsible, contact_channel,
         contact_consent_confirmed, scheduled_for, completed_at, content, result_note, evidence, resource_type,
         resource_id, resource_url, campaign_id, product_name, idempotency_key, metadata, created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb,$23,$23)
       returning *`,
      [
        businessId, sale.id, sourceType, payload.source_id, item.lead_id || payload.lead_id || null, actionType, status,
        String(payload.responsible || "").trim() || null, String(payload.contact_channel || "").trim() || null,
        Boolean(payload.contact_consent_confirmed), payload.scheduled_for || null,
        ["COMPLETED", "NOT_APPLICABLE"].includes(status) ? new Date().toISOString() : null,
        String(payload.content || "").trim() || null, String(payload.result_note || payload.reason || "").trim() || null,
        String(payload.evidence || "").trim() || null, String(payload.resource_type || "").trim() || null,
        payload.resource_id || null, String(payload.resource_url || "").trim() || null,
        payload.campaign_id || sale.campaign_id || item.campaign_id || null, sale.product_name, idempotencyKey,
        JSON.stringify({ source_module: "rms_activation_2", execution_mode: executionMode, sale_currency: sale.currency, sale_amount: sale.sale_amount, ...(payload.metadata || {}) }), user.id,
      ]
    );
    const action = actionResult.rows[0];
    const agenda = actionType === "NO_ACTION_NEEDED" || ["COMPLETED", "NOT_APPLICABLE"].includes(status)
      ? null
      : await createPostSaleAgendaInTransaction(client, businessId, user, item, action);
    const referral = actionType === "REFERRAL"
      ? await createReferredOpportunityInTransaction(client, businessId, user, action, payload.referred_contact || {})
      : null;
    await client.query(
      `insert into rms_post_sale_action_events (business_id, post_sale_action_id, event_type, event_description, status, metadata, created_by)
       values ($1,$2,'post_sale_action_created',$3,$4,$5::jsonb,$6)`,
      [businessId, action.id, "Acción de Valorización registrada sobre la venta original.", status, JSON.stringify({ sale_id: sale.id, agenda_note_id: agenda?.id || null, referral_contact_id: referral?.id || null }), user.id]
    );
    await client.query(
      `insert into rms_machine_events
        (business_id, source_type, source_id, lead_id, event_type, event_title, event_description, rms_phase, operation_key, created_by, metadata)
        values ($1,$2,$3,$4,'post_sale_action_created','Valorización registrada',$5,'postventa','activation_2',$6,$7::jsonb)`,
      [businessId, sourceType, payload.source_id, item.lead_id || null, actionType, user.id, JSON.stringify({ post_sale_action_id: action.id, sale_id: sale.id, status, agenda_note_id: agenda?.id || null, referral_contact_id: referral?.id || null })]
    );
    return { action, sale, duplicate: false, agenda, referral };
  });
  if (created.duplicate) return created;
  let resource = null;
  if (executionMode === "NEW_TICKET") {
    if (!payload.ticket?.benefit?.benefit_type || !payload.ticket?.benefit?.benefit_label) {
      throw badRequest("Selecciona el beneficio del ticket de recompra o referido.");
    }
    const referrerAffiliate = actionType === "REFERRAL"
      ? await ensurePostSaleReferrerAffiliate(businessId, user, created.sale, item, created.action)
      : null;
    resource = await createPostSaleQr(businessId, user, {
      ...(payload.ticket || {}),
      campaign_id: payload.ticket?.campaign_id || created.sale.campaign_id || created.action.campaign_id || null,
      sale_amount: moneyNumber(created.sale.sale_amount), currency: created.sale.currency || "COP",
      customer_name: created.sale.customer_name || item.name, customer_phone: created.sale.customer_phone || item.phone || null,
      customer_email: created.sale.customer_email || item.email || null, document_id: created.sale.customer_document_id || null,
      product_name: created.sale.product_name, existing_sale_id: created.sale.id,
      affiliate_id: referrerAffiliate?.id || null,
      metadata: { ...(payload.ticket?.metadata || {}), qr_creation_context: "rms_activation_2", rms_post_sale_action_id: created.action.id, existing_sale_id: created.sale.id, ticket_use_case: actionType === "REFERRAL" ? "referral" : "rebuy", referral_claim_required: actionType === "REFERRAL", referrer_affiliate_id: referrerAffiliate?.id || null },
    });
    const ticketId = resource?.qr_code?.id || resource?.ticket?.id || null;
    await query(
      `update rms_post_sale_actions set status = 'ISSUED', resource_type = 'QR_TICKET', resource_id = $3, resource_url = $4, updated_by = $5 where business_id = $1 and id = $2`,
      [businessId, created.action.id, ticketId, resource?.public_ticket_url || resource?.public_url || null, user.id]
    );
  } else if (executionMode === "NEW_REWARD_PASS") {
    resource = await createRewardPass(user, {
      ...(payload.reward_pass || {}), campaign_id: payload.reward_pass?.campaign_id || created.sale.campaign_id || created.action.campaign_id || null,
      buyer_name: created.sale.customer_name || item.name, buyer_email: created.sale.customer_email || item.email || null,
      buyer_phone: created.sale.customer_phone || item.phone || null, source_sale_id: created.sale.id, rms_post_sale_action_id: created.action.id,
      internal_notes: [payload.reward_pass?.internal_notes, `Valorización ${created.action.id}; venta original ${created.sale.id}`].filter(Boolean).join("\n"),
    });
    await query(
      `update rms_post_sale_actions set status = 'ISSUED', resource_type = 'REWARD_PASS', resource_id = $3, resource_url = $4, updated_by = $5 where business_id = $1 and id = $2`,
      [businessId, created.action.id, resource?.id || null, resource?.public_url || resource?.public_link || null, user.id]
    );
  }
  if (resource) {
    await query(
      `insert into rms_post_sale_action_events (business_id, post_sale_action_id, event_type, event_description, status, metadata, created_by)
       values ($1,$2,'post_sale_resource_linked',$3,'ISSUED',$4::jsonb,$5)`,
      [businessId, created.action.id, "Recurso de Valorización vinculado a la venta original.", JSON.stringify({ resource_type: executionMode, resource_id: resource?.id || resource?.qr_code?.id || null, sale_id: created.sale.id }), user.id]
    );
  }
  const current = (await listRmsPostSaleActions(businessId, { sale_id: created.sale.id })).actions.find((entry) => entry.id === created.action.id) || created.action;
  let intelligence = null;
  if (payload.send_to_intelligence) {
    if (!requiresResultForIntelligence(current)) throw badRequest("Registra un resultado verificable antes de actualizar Inteligencia.");
    intelligence = await markRmsLifecycleStatus(businessId, user, {
      source_type: sourceType, source_id: payload.source_id, lead_id: item.lead_id || null, sale_id: created.sale.id,
      lifecycle_status: "CYCLE_ANALYZED", event_type: "activation_2_result_analyzed",
      event_title: "Resultado de Valorización incorporado a Inteligencia GOS",
      reason: current.result_note || current.evidence,
      idempotency_key: `post-sale-analysis:${current.id}:${current.status}`,
      metadata: { rms_post_sale_action_id: current.id, sale_id: created.sale.id, activation_2_status: current.status },
    });
  }
  // Keep the former response field for API compatibility. It is always null:
  // Intelligence no longer owns a phase movement.
  return { ...created, action: current, resource, movement: null, intelligence };
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
  if (["preprocesamiento", "revenue_generado"].includes(phase)) {
    throw badRequest("Los controles de calidad solo muestran diagnóstico; no ejecutan acciones ni cambian fases.");
  }
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
  if (payload.advance_phase) {
    throw badRequest("Las transiciones RMS requieren una decisión individual con evidencia; la operación masiva solo puede crear tareas.");
  }
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

function negotiationAttachmentUrl(token) {
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
  const [priorHistory, priorState] = await Promise.all([
    query(
      `select count(*) filter (where metadata->'activation_delivery'->>'delivery_state' = 'SENT')::int as sent_count,
              min(nullif(metadata->'activation_delivery'->>'first_contact_at', '')::timestamptz) as first_contact_at
       from lead_notes
       where business_id = $1 and source_type = $2 and source_id = $3
         and metadata->>'source_module' = 'rms_activation_1'`,
      [businessId, sourceType, sourceId]
    ),
    query(
      `select metadata from rms_lead_state where business_id = $1 and source_type = $2 and source_id = $3`,
      [businessId, sourceType, sourceId]
    ),
  ]);
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
  const result = await query(`
    select 'activation' as attachment_scope, aa.id, aa.business_id, aa.lead_id, aa.source_type, aa.source_id,
           da.title, da.file_name, da.file_type, da.file_data_url
      from rms_activation_attachments aa
      join digital_assets da on da.id = aa.asset_id and da.business_id = aa.business_id and da.is_active = true
     where aa.public_token = $1
    union all
    select 'negotiation' as attachment_scope, na.id, na.business_id, na.lead_id, na.source_type, na.source_id,
           da.title, da.file_name, da.file_type, da.file_data_url
      from rms_negotiation_attachments na
      join digital_assets da on da.id = na.asset_id and da.business_id = na.business_id and da.is_active = true
     where na.public_token = $1
    limit 1`, [String(publicToken || "").trim()]);
  const row = result.rows[0];
  if (!row) throw notFound("Adjunto no encontrado o desactivado.");
  const match = String(row.file_data_url || "").match(/^data:([^;,]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) throw notFound("El archivo adjunto no está disponible.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw notFound("El archivo adjunto no es válido.");
  const table = row.attachment_scope === "negotiation" ? "rms_negotiation_attachments" : "rms_activation_attachments";
  await query(`update ${table} set opened_at = coalesce(opened_at, now()), open_count = open_count + 1 where id = $1`, [row.id]);
  return { buffer, file_name: row.file_name || "adjunto", file_type: row.file_type || match[1] };
}

module.exports = {
  RMS_OPERATIONAL_STAGES,
  RMS_QUALITY_CONTROLS,
  RMS_TRANSITION_CONTRACT,
  STAGES,
  RMS_PHASES,
  WHATSAPP_TEMPLATES,
  createRmsAgendaTask,
  downloadActivationAttachment,
  executeRmsAction,
  executeRmsBulkAction,
  getRmsUnconvertedLeadCost,
  getDailyQueue,
  getPhaseRecommendedOperation,
  listRmsEvents,
  listRmsPostSaleActions,
  listRmsPersistedCases,
  listRmsRecyclingCases,
  listRmsOpportunities,
  moveRmsLeadPhase,
  recordActivationDelivery,
  recordRmsAttributedSale,
  recordRmsCommercialConfirmation,
  recordRmsEvaluationResponse,
  recordRmsNegotiationResult,
  recordRmsRiskReview,
  prepareRmsRiskRecoveryResource,
  recordRmsPostSaleAction,
  reactivateRmsRecycledLead,
  updateRmsRecyclingCase,
  rmsMetrics,
};

const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  createRmsAgendaTask,
  downloadActivationAttachment,
  executeRmsAction,
  executeRmsBulkAction,
  getRmsUnconvertedLeadCost,
  getDailyQueue,
  listRmsEvents,
  listRmsPostSaleActions,
  listRmsRecyclingCases,
  listRmsOpportunities,
  moveRmsLeadPhase,
  recordActivationDelivery,
  recordRmsAttributedSale,
  recordRmsCommercialConfirmation,
  recordRmsEvaluationResponse,
  recordRmsNegotiationResult,
  prepareRmsRiskRecoveryResource,
  recordRmsRiskReview,
  recordRmsPostSaleAction,
  reactivateRmsRecycledLead,
  updateRmsRecyclingCase,
  rmsMetrics,
} = require("../services/rmsMachineService");
const { getRmsActivationEmailSummary, sendRmsActivationBulkEmail } = require("../services/businessCommunicationService");
const { assertFeatureForRequest } = require("../services/subscriptionService");
const {
  createIntelligenceAgendaTask,
  intelligencePatterns,
  learningCase,
  listIntelligenceCases,
  listIntelligenceInsights,
  saveIntelligenceInsight,
} = require("../services/rmsIntelligenceService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

const agendaTaskSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  stage: z.string().trim().max(80).optional().nullable(),
  section: z.string().trim().max(80).optional().nullable(),
  action_title: z.string().trim().min(2).max(500),
  next_action: z.string().trim().max(500).optional().nullable(),
  note: z.string().trim().max(3000).optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
  why_now: z.string().trim().max(1000).optional().nullable(),
  priority_score: z.number().int().min(0).max(140).optional(),
  risk_score: z.number().int().min(0).max(120).optional(),
  coverage_type: z.string().trim().max(80).optional().nullable(),
  revenue_potential: z.number().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const phaseMoveSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  to_phase: z.string().trim().min(2).max(50),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  recommended_action: z.string().trim().max(800).optional().nullable(),
  last_operation: z.string().trim().max(300).optional().nullable(),
  last_material_sent: z.string().trim().max(120).optional().nullable(),
  revenue_potential: z.number().min(0).optional(),
  reason: z.string().trim().max(1000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const actionSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  rms_phase: z.string().trim().max(50).optional().nullable(),
  operation_key: z.string().trim().max(120).optional().nullable(),
  material_type: z.string().trim().max(120).optional().nullable(),
  action_title: z.string().trim().max(500).optional().nullable(),
  whatsapp_template_key: z.string().trim().max(120).optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
  create_task: z.boolean().optional(),
  advance_phase: z.boolean().optional(),
  template_values: z.record(z.string(), z.unknown()).optional().default({}),
});

const activationDeliverySchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  attachment_asset_ids: z.array(z.string().uuid()).max(6).optional().default([]),
  ticket_url: z.string().trim().max(1800).optional().nullable(),
  payment: z.object({ mode: z.enum(["NONE", "PAYMENT_LINK", "INVOICE", "COLLECTION_ACCOUNT", "SIMPLE_COLLECTION"]).default("NONE"), url: z.string().trim().max(1800).optional().nullable(), instructions: z.string().trim().max(1800).optional().nullable(), reference: z.string().trim().max(180).optional().nullable(), amount: z.number().min(0).optional().nullable(), currency: z.string().trim().max(8).optional().nullable() }).optional().default({ mode: "NONE" }),
  message: z.string().trim().max(5000).optional().nullable(),
  channel: z.string().trim().max(80).optional().nullable(),
  delivery_state: z.enum(["PREPARED", "SENT"]).optional().default("PREPARED"),
  contacted_at: z.string().datetime().optional().nullable(),
  contact_consent_confirmed: z.boolean(),
});

const activationBulkEmailSchema = z.object({
  activation_id: z.string().uuid(),
  subject: z.string().trim().min(2).max(220),
  message: z.string().trim().min(2).max(12000),
  action_url: z.string().trim().url().max(1800).optional().nullable(),
  recipients: z.array(z.object({
    source_id: z.string().uuid(),
    source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  })).min(1).max(2000),
  idempotency_key: z.string().trim().min(8).max(180),
  retry_failed_only: z.boolean().optional().default(false),
  communication_id: z.string().uuid().optional().nullable(),
}).superRefine((body, ctx) => {
  if (body.retry_failed_only && !body.communication_id) ctx.addIssue({ code: "custom", path: ["communication_id"], message: "Falta el envío que quieres reintentar." });
});

const evaluationResponseSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  // Los clientes con una pestaña abierta antes de cambiar de ruta pueden enviar
  // un motivo de Reciclaje residual. Fuera de Reciclaje no es un dato operativo
  // y no debe bloquear el envío a Negociación, Riesgos o Ventas atribuidas.
  if (String(value.response || "").trim().toUpperCase() === "RECYCLE") return value;
  const { recycle_reason, recycle_note, recycle_at, ...withoutRecycle } = value;
  return withoutRecycle;
}, z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  response: z.enum(["NEGOTIATION", "PAID_SALE", "MISSING_INFORMATION", "NURTURE", "RECYCLE", "NO_RESPONSE", "OBJECTION", "NOT_QUALIFIED"]),
  destination: z.enum(["NEGOTIATION", "RISK_REVIEW", "ATTRIBUTED_SALE", "RECYCLE"]).optional().nullable(),
  note: z.string().trim().max(3000).optional().nullable(),
  need: z.string().trim().max(1200).optional().nullable(),
  desired_outcome: z.string().trim().max(1200).optional().nullable(),
  recommended_inventory_product_id: z.string().uuid().optional().nullable(),
  recommended_product: z.string().trim().max(500).optional().nullable(),
  budget_amount: z.number().min(0).max(100000000000).optional().nullable(),
  currency: z.string().trim().min(3).max(8).optional().nullable(),
  decision_maker: z.string().trim().max(500).optional().nullable(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  objections: z.string().trim().max(1500).optional().nullable(),
  next_action: z.string().trim().max(700).optional().nullable(),
  next_action_at: z.string().datetime().optional().nullable(),
  recycle_reason: z.enum(["BUDGET", "TIMING", "NO_RESPONSE", "WAITING_DECISION", "NOT_VIABLE_NOW", "OTHER"]).optional().nullable(),
  recycle_note: z.string().trim().max(3000).optional().nullable(),
  recycle_at: z.string().datetime().optional().nullable(),
}));

const attributedSaleProductSchema = z.object({
  inventory_product_id: z.string().uuid(),
  quantity: z.number().positive().max(100000).optional().default(1),
  unit_price: z.number().positive().max(100000000000).optional().nullable(),
  unit_cost: z.number().min(0).max(100000000000).optional().nullable(),
  benefit_applied: z.boolean().optional().default(false),
});

const riskReviewProductSchema = z.object({
  inventory_product_id: z.string().uuid(),
  quantity: z.number().positive().max(100000).optional().default(1),
  benefit_applied: z.boolean().optional().default(false),
});

const attributedSaleSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  seller_user_id: z.string().uuid().optional().nullable(),
  // A stale browser may submit null. Let the service return the actionable domain
  // requirement instead of exposing a raw Zod type error to the operator.
  inventory_product_id: z.string().uuid().optional().nullable(),
  product_name: z.string().trim().max(240).optional().nullable(),
  quantity: z.number().positive().max(100000).optional().default(1),
  products: z.array(attributedSaleProductSchema).min(1).max(50).optional(),
  unit_cost: z.number().min(0).max(100000000000).optional().nullable(),
  sale_amount: z.number().positive().max(100000000000),
  currency: z.string().trim().min(3).max(8).optional().default("COP"),
  benefit_type: z.enum(["NONE", "DISCOUNT", "GIFT", "BONUS", "OTHER"]).optional().default("NONE"),
  benefit_description: z.string().trim().max(1000).optional().nullable(),
  benefit_cost: z.number().min(0).max(100000000000).optional().default(0),
  acquisition_cost: z.number().min(0).max(100000000000).optional().default(0),
  payment_method: z.enum(["CASH", "TRANSFER", "CARD", "PAYMENT_LINK", "OTHER"]).optional().default("OTHER"),
  paid_at: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  idempotency_key: z.string().trim().min(8).max(160).optional().nullable(),
});

const intelligenceCaseQuerySchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
});

const intelligenceCasesQuerySchema = z.object({
  lifecycle_status: z.enum(["ACTIVE", "RECYCLED", "LOST_ANALYZED", "CYCLE_ANALYZED"]).optional(),
  phase: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const intelligenceInsightSchema = z.object({
  source_id: z.string().uuid().optional().nullable(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  sale_id: z.string().uuid().optional().nullable(),
  insight_scope: z.enum(["CASE", "PATTERN"]).optional().default("CASE"),
  observation: z.string().trim().min(2).max(5000),
  hypothesis: z.string().trim().max(5000).optional().nullable(),
  recommendation: z.string().trim().min(2).max(5000),
  evidence_refs: z.array(z.union([z.string().trim().max(240), z.record(z.string(), z.unknown())])).max(40).optional().default([]),
  evidence_note: z.string().trim().max(5000).optional().nullable(),
  owner_name: z.string().trim().max(240).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  status: z.enum(["PENDING", "APPLIED", "DISCARDED", "MEASURING"]).optional().default("PENDING"),
  expected_metric: z.string().trim().max(1000).optional().nullable(),
  review_at: z.string().datetime().optional().nullable(),
  idempotency_key: z.string().trim().min(8).max(240),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const intelligenceAgendaTaskSchema = z.object({
  insight_id: z.string().uuid(),
  confirm: z.literal(true),
  title: z.string().trim().min(2).max(500).optional().nullable(),
  note: z.string().trim().max(3000).optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
});

const postSaleActionSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  sale_id: z.string().uuid().optional().nullable(),
  action_type: z.enum(["THANK_YOU", "WARRANTY", "SURVEY", "REBUY_TICKET", "REWARD_PASS", "REFERRAL", "FOLLOW_UP", "INCIDENT", "NO_ACTION_NEEDED"]),
  status: z.enum(["PLANNED", "SCHEDULED", "ISSUED", "DELIVERED", "CLAIMED", "COMPLETED", "REDEEMED", "EXPIRED", "CANCELLED", "NOT_APPLICABLE", "FAILED"]).optional(),
  execution_mode: z.enum(["TASK", "CONTACT", "EXISTING_RESOURCE", "NEW_TICKET", "NEW_REWARD_PASS"]).optional().default("TASK"),
  responsible: z.string().trim().max(500).optional().nullable(),
  contact_channel: z.string().trim().max(120).optional().nullable(),
  contact_consent_confirmed: z.boolean().optional().default(false),
  scheduled_for: z.string().datetime().optional().nullable(),
  content: z.string().trim().max(5000).optional().nullable(),
  result_note: z.string().trim().max(5000).optional().nullable(),
  reason: z.string().trim().max(3000).optional().nullable(),
  evidence: z.string().trim().max(5000).optional().nullable(),
  resource_type: z.string().trim().max(120).optional().nullable(),
  resource_id: z.string().uuid().optional().nullable(),
  resource_url: z.string().trim().max(1800).optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  ticket: z.record(z.string(), z.unknown()).optional().default({}),
  reward_pass: z.record(z.string(), z.unknown()).optional().default({}),
  referred_contact: z.object({
    name: z.string().trim().max(240).optional().nullable(),
    email: z.string().email().max(240).optional().nullable(),
    phone: z.string().trim().max(80).optional().nullable(),
    interest: z.string().trim().max(500).optional().nullable(),
    preferred_channel: z.string().trim().max(80).optional().nullable(),
    note: z.string().trim().max(1500).optional().nullable(),
    contact_consent_confirmed: z.boolean().optional().default(false),
  }).optional().default({}),
  send_to_intelligence: z.boolean().optional().default(false),
  idempotency_key: z.string().trim().min(8).max(160),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const commercialConfirmationSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  inventory_product_id: z.string().uuid(),
  // The server derives the persisted name and snapshots from inventory.
  product_name: z.string().trim().max(500).optional().nullable(),
  amount: z.number().positive().max(100000000000),
  currency: z.string().trim().min(3).max(8).optional().default("COP"),
  payment_reference: z.string().trim().max(500).optional().nullable(),
  evidence: z.string().trim().max(3000).optional().nullable(),
  responsible: z.string().trim().max(500).optional().nullable(),
  confirmed_at: z.string().datetime().optional().nullable(),
  note: z.string().trim().max(3000).optional().nullable(),
  objective: z.string().trim().max(1200).optional().nullable(),
  objection_type: z.string().trim().max(120).optional().nullable(),
  customer_condition: z.string().trim().max(1800).optional().nullable(),
  proposal: z.string().trim().max(3000).optional().nullable(),
  concession: z.string().trim().max(1800).optional().nullable(),
  channel: z.string().trim().max(120).optional().nullable(),
  summary: z.string().trim().max(5000).optional().nullable(),
  reason: z.string().trim().max(3000).optional().nullable(),
  commercial_route: z.enum(["NEGOTIATION_CLEAN", "NEEDS_RISK_REVIEW"]).optional().default("NEEDS_RISK_REVIEW"),
  risk_signals: z.array(z.union([
    z.string().trim().min(2).max(240),
    z.object({
      code: z.string().trim().min(2).max(120),
      severity: z.enum(["INFO", "ATTENTION", "REQUIRES_RISK"]),
      title: z.string().trim().min(2).max(240),
      source: z.string().trim().max(500),
      impact: z.string().trim().max(800),
      action: z.string().trim().max(800),
      status: z.enum(["OPEN", "RESOLVED", "NOT_APPLICABLE"]).optional().default("OPEN"),
    }),
  ])).max(20).optional().default([]),
  objection_status: z.enum(["PENDING", "RESOLVED", "NEEDS_VALIDATION", "NOT_APPLICABLE"]).optional().default("NOT_APPLICABLE"),
  objection_resolution: z.string().trim().max(3000).optional().nullable(),
  idempotency_key: z.string().trim().min(8).max(160).optional().nullable(),
});

const riskReviewSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  result: z.enum(["CLEARED", "RECYCLE"]),
  reason: z.string().trim().min(4).max(3000),
  next_action_at: z.string().datetime().optional().nullable(),
  recycle_reason: z.enum(["BUDGET", "TIMING", "NO_RESPONSE", "EXPIRED_TICKET", "WAITING_DECISION", "NOT_VIABLE_NOW", "OTHER"]).optional().nullable(),
  recycle_strategy: z.enum(["NEW_CONTACT", "NEW_PROPOSAL", "NEW_ACTIVATION", "PERMITTED_BENEFIT", "NURTURE"]).optional().nullable(),
  recycle_note: z.string().trim().max(3000).optional().nullable(),
  responsible: z.string().trim().max(500).optional().nullable(),
  ticket_action: z.enum(["NONE", "REMIND_ACTIVE", "PREPARE_NEW_ACTIVATION", "CONFIRM_REDEMPTION"]).optional().default("NONE"),
  recovery_offer: z.enum(["NONE", "DISCOUNT", "TWO_FOR_ONE", "GIFT", "CUSTOM"]).optional().default("NONE"),
  recovery_benefit_id: z.string().trim().max(120).optional().nullable(),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  recovery_detail: z.string().trim().max(1000).optional().nullable(),
  products: z.array(riskReviewProductSchema).min(1).max(50).optional(),
  signals: z.record(z.string(), z.unknown()).optional().default({}),
  idempotency_key: z.string().trim().min(8).max(180).optional().nullable(),
});

const riskRecoveryResourceSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  recovery_offer: z.enum(["DISCOUNT", "TWO_FOR_ONE", "GIFT", "CUSTOM"]),
  recovery_benefit_id: z.string().trim().max(120).optional().nullable(),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  recovery_detail: z.string().trim().max(1000).optional().nullable(),
  products: z.array(riskReviewProductSchema).min(1).max(50).optional(),
  expiration_days: z.number().int().min(1).max(90).optional().default(7),
  idempotency_key: z.string().trim().min(8).max(180),
});

const recycleReactivateSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  note: z.string().trim().min(4).max(3000),
  destination: z.enum(["procesamiento", "clasificacion"]).optional().default("procesamiento"),
  idempotency_key: z.string().trim().min(8).max(160).optional().nullable(),
});

const recyclingQueueQuerySchema = z.object({
  status: z.enum(["ALL", "SCHEDULED", "DUE", "OVERDUE", "REACTIVATED", "CONVERTED", "LOST", "CANCELLED"]).optional(),
  owner: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(120).optional(),
  strategy: z.string().trim().max(120).optional(),
});

const recyclingActionSchema = z.object({
  recycling_case_id: z.string().uuid(),
  action: z.enum(["REACTIVATE", "RESCHEDULE", "CHANGE_STRATEGY", "LOST", "CANCEL"]),
  note: z.string().trim().min(4).max(3000),
  recycle_at: z.string().datetime().optional().nullable(),
  recycle_owner: z.string().trim().max(500).optional().nullable(),
  recycle_channel: z.string().trim().max(120).optional().nullable(),
  recycle_strategy: z.enum(["NEW_CONTACT", "NEW_PROPOSAL", "NEW_ACTIVATION", "PERMITTED_BENEFIT", "NURTURE"]).optional().nullable(),
  destination: z.enum(["procesamiento", "clasificacion"]).optional().nullable(),
  idempotency_key: z.string().trim().min(8).max(160).optional().nullable(),
});

const unconvertedCostSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
});

const negotiationResultSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  result: z.enum(["ACCEPTED", "WAITING", "REPROCESS", "NO_RESPONSE", "RECYCLE", "LOST"]),
  objective: z.string().trim().max(1200).optional().nullable(),
  objection_type: z.string().trim().max(120).optional().nullable(),
  customer_condition: z.string().trim().max(1800).optional().nullable(),
  proposal: z.string().trim().max(3000).optional().nullable(),
  concession: z.string().trim().max(1800).optional().nullable(),
  channel: z.string().trim().max(120).optional().nullable(),
  summary: z.string().trim().max(5000).optional().nullable(),
  reason: z.string().trim().min(4).max(3000),
  next_action_at: z.string().datetime().optional().nullable(),
  reprocess_phase: z.enum(["procesamiento", "clasificacion"]).optional().nullable(),
  recycle_reason: z.enum(["BUDGET", "TIMING", "NO_RESPONSE", "EXPIRED_TICKET", "WAITING_DECISION", "NOT_VIABLE_NOW", "OTHER"]).optional().nullable(),
  recycle_strategy: z.enum(["NEW_CONTACT", "NEW_PROPOSAL", "NEW_ACTIVATION", "PERMITTED_BENEFIT", "NURTURE"]).optional().nullable(),
  recycle_consent: z.enum(["CONFIRMED", "NOT_REQUIRED"]).optional().nullable(),
  recycle_responsible: z.string().trim().max(500).optional().nullable(),
  recycle_target_phase: z.enum(["procesamiento", "clasificacion"]).optional().nullable(),
  lost_classification: z.enum(["DEFINITIVE", "NOT_NOW", "NO_BUDGET", "PROLONGED_NO_RESPONSE", "NO_CONSENT", "OTHER"]).optional().nullable(),
  delivery_material: z.enum(["ACTIVATION", "ATTENTION", "FILE", "QUOTE", "OTHER"]).optional().nullable(),
  delivery_message: z.string().trim().max(5000).optional().nullable(),
  delivery_link: z.string().trim().max(3000).optional().nullable(),
  delivery_attachment_asset_ids: z.array(z.string().uuid()).max(4).optional().nullable(),
  idempotency_key: z.string().trim().min(8).max(160).optional().nullable(),
});

const bulkActionSchema = actionSchema.omit({ source_id: true, source_type: true }).extend({
  opportunity_ids: z.array(z.string().trim().min(3).max(120)).min(1).max(40),
});

async function machine(req, res, next) {
  try {
    res.json(await getDailyQueue(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function dailyQueue(req, res, next) {
  try {
    res.json(await getDailyQueue(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function journeys(req, res, next) {
  try {
    res.json(await listRmsOpportunities(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function metrics(req, res, next) {
  try {
    const data = await listRmsOpportunities(businessIdFor(req), req.query);
    res.json({ metrics: rmsMetrics(data.opportunities || []), stages: data.stages || [] });
  } catch (error) {
    next(error);
  }
}

async function createAgendaTask(req, res, next) {
  try {
    const body = validate(agendaTaskSchema, req.body);
    res.status(201).json(await createRmsAgendaTask(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function movePhase(req, res, next) {
  try {
    const body = validate(phaseMoveSchema, req.body);
    res.json(await moveRmsLeadPhase(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function executeAction(req, res, next) {
  try {
    const body = validate(actionSchema, req.body);
    res.status(201).json(await executeRmsAction(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function recordActivationDeliveryAction(req, res, next) {
  try {
    const body = validate(activationDeliverySchema, req.body);
    res.status(201).json(await recordActivationDelivery(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function sendActivationBulkEmail(req, res, next) {
  try {
    const body = validate(activationBulkEmailSchema, req.body);
    res.json(await sendRmsActivationBulkEmail(businessIdFor(req), req.user, body, req.user.email));
  } catch (error) {
    next(error);
  }
}

async function activationEmailSummary(req, res, next) {
  try {
    res.json({ summary: await getRmsActivationEmailSummary(businessIdFor(req)) });
  } catch (error) {
    next(error);
  }
}

async function recordEvaluationResponse(req, res, next) {
  try {
    const body = validate(evaluationResponseSchema, req.body);
    res.json(await recordRmsEvaluationResponse(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function recordAttributedSale(req, res, next) {
  try {
    const body = validate(attributedSaleSchema, req.body);
    res.status(201).json(await recordRmsAttributedSale(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function postSaleActions(req, res, next) {
  try {
    res.json(await listRmsPostSaleActions(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function recordPostSaleAction(req, res, next) {
  try {
    const body = validate(postSaleActionSchema, req.body);
    const businessId = businessIdFor(req);
    const refineryPath = String(body.metadata?.refinery_path || "").toUpperCase();
    if (refineryPath === "REFERRAL" || body.action_type === "REFERRAL") {
      await assertFeatureForRequest(req, businessId, "referrals");
    } else if (refineryPath === "LOYALTY") {
      await assertFeatureForRequest(req, businessId, "affiliates");
    } else if (body.action_type === "REWARD_PASS" || body.execution_mode === "NEW_REWARD_PASS") {
      await assertFeatureForRequest(req, businessId, "gift_cards");
    }
    res.status(201).json(await recordRmsPostSaleAction(businessId, req.user, body));
  } catch (error) {
    next(error);
  }
}

async function unconvertedCost(req, res, next) {
  try {
    const query = validate(unconvertedCostSchema, req.query);
    res.json(await getRmsUnconvertedLeadCost(businessIdFor(req), query));
  } catch (error) {
    next(error);
  }
}

async function recordCommercialConfirmation(req, res, next) {
  try {
    const body = validate(commercialConfirmationSchema, req.body);
    res.json(await recordRmsCommercialConfirmation(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function recordRiskReview(req, res, next) {
  try {
    const body = validate(riskReviewSchema, req.body);
    res.json(await recordRmsRiskReview(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function prepareRiskRecoveryResource(req, res, next) {
  try {
    const body = validate(riskRecoveryResourceSchema, req.body);
    res.status(201).json(await prepareRmsRiskRecoveryResource(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function recordNegotiationResult(req, res, next) {
  try {
    const body = validate(negotiationResultSchema, req.body);
    res.json(await recordRmsNegotiationResult(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function reactivateRecycledLead(req, res, next) {
  try {
    const body = validate(recycleReactivateSchema, req.body);
    res.json(await reactivateRmsRecycledLead(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function publicAttachmentDownload(req, res, next) {
  try {
    const file = await downloadActivationAttachment(req.params.publicToken);
    res.setHeader("Content-Type", file.file_type);
    res.setHeader("Content-Length", file.buffer.length);
    res.setHeader("Content-Disposition", `attachment; filename="${String(file.file_name).replace(/\"/g, "")}"`);
    res.send(file.buffer);
  } catch (error) {
    next(error);
  }
}

async function executeBulkAction(req, res, next) {
  try {
    const body = validate(bulkActionSchema, req.body);
    res.status(201).json(await executeRmsBulkAction(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function events(req, res, next) {
  try {
    res.json(await listRmsEvents(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function recyclingQueue(req, res, next) {
  try {
    const filters = validate(recyclingQueueQuerySchema, req.query);
    res.json(await listRmsRecyclingCases(businessIdFor(req), filters));
  } catch (error) {
    next(error);
  }
}

async function updateRecyclingCase(req, res, next) {
  try {
    const body = validate(recyclingActionSchema, req.body);
    res.json(await updateRmsRecyclingCase(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function intelligenceCase(req, res, next) {
  try {
    res.json(await learningCase(businessIdFor(req), validate(intelligenceCaseQuerySchema, req.query)));
  } catch (error) {
    next(error);
  }
}

async function intelligenceCases(req, res, next) {
  try {
    res.json(await listIntelligenceCases(businessIdFor(req), validate(intelligenceCasesQuerySchema, req.query)));
  } catch (error) {
    next(error);
  }
}

async function intelligencePatternReport(req, res, next) {
  try {
    res.json(await intelligencePatterns(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function intelligenceInsights(req, res, next) {
  try {
    res.json(await listIntelligenceInsights(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function saveInsight(req, res, next) {
  try {
    const body = validate(intelligenceInsightSchema, req.body);
    res.status(201).json(await saveIntelligenceInsight(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function createInsightAgendaTask(req, res, next) {
  try {
    const body = validate(intelligenceAgendaTaskSchema, req.body);
    res.status(201).json(await createIntelligenceAgendaTask(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  activationEmailSummary,
  createAgendaTask,
  dailyQueue,
  events,
  intelligenceCase,
  intelligenceCases,
  intelligenceInsights,
  intelligencePatternReport,
  createInsightAgendaTask,
  executeAction,
  executeBulkAction,
  journeys,
  machine,
  metrics,
  unconvertedCost,
  movePhase,
  publicAttachmentDownload,
  recordActivationDeliveryAction,
  sendActivationBulkEmail,
  recordAttributedSale,
  postSaleActions,
  recordPostSaleAction,
  recordCommercialConfirmation,
  recordEvaluationResponse,
  recordNegotiationResult,
  prepareRiskRecoveryResource,
  recordRiskReview,
  reactivateRecycledLead,
  recyclingQueue,
  saveInsight,
  updateRecyclingCase,
};

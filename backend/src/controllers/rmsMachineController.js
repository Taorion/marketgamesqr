const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  createRmsAgendaTask,
  downloadActivationAttachment,
  executeRmsAction,
  executeRmsBulkAction,
  getDailyQueue,
  listRmsEvents,
  listRmsOpportunities,
  moveRmsLeadPhase,
  recordActivationDelivery,
  recordRmsAttributedSale,
  recordRmsEvaluationResponse,
  rmsMetrics,
} = require("../services/rmsMachineService");

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

const evaluationResponseSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  response: z.enum(["NEGOTIATION", "PAID_SALE", "MISSING_INFORMATION", "NURTURE", "NOT_QUALIFIED"]),
  note: z.string().trim().min(2).max(3000),
  need: z.string().trim().max(1200).optional().nullable(),
  desired_outcome: z.string().trim().max(1200).optional().nullable(),
  recommended_product: z.string().trim().max(500).optional().nullable(),
  budget_amount: z.number().min(0).max(100000000000).optional().nullable(),
  currency: z.string().trim().min(3).max(8).optional().nullable(),
  decision_maker: z.string().trim().max(500).optional().nullable(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  objections: z.string().trim().max(1500).optional().nullable(),
  next_action: z.string().trim().max(700).optional().nullable(),
  next_action_at: z.string().datetime().optional().nullable(),
});

const attributedSaleSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  lead_id: z.string().uuid().optional().nullable(),
  inventory_product_id: z.string().uuid().optional().nullable(),
  product_name: z.string().trim().max(240).optional().nullable(),
  quantity: z.number().positive().max(100000).optional().default(1),
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

module.exports = {
  createAgendaTask,
  dailyQueue,
  events,
  executeAction,
  executeBulkAction,
  journeys,
  machine,
  metrics,
  movePhase,
  publicAttachmentDownload,
  recordActivationDeliveryAction,
  recordAttributedSale,
  recordEvaluationResponse,
};

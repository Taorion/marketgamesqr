const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  createRmsAgendaTask,
  executeActivationOne,
  executeRmsAction,
  executeRmsBulkAction,
  getDailyQueue,
  listRmsEvents,
  listRmsOpportunities,
  moveRmsLeadPhase,
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

const activationOneSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  materials: z.array(z.enum(["catalog", "products", "benefit", "ticket", "interactive"])).min(1).max(5),
  products: z.array(z.object({
    id: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(1).max(240),
    price: z.number().min(0).optional().nullable(),
    currency: z.string().trim().max(8).optional().nullable(),
  })).max(12).optional().default([]),
  catalog_url: z.string().trim().max(1200).optional().nullable(),
  benefit_summary: z.string().trim().max(1200).optional().nullable(),
  proposal_summary: z.string().trim().min(4).max(3000),
  attention_note: z.string().trim().min(4).max(3000),
  channel: z.string().trim().max(80).optional().nullable(),
  message: z.string().trim().max(5000).optional().nullable(),
  interactive_activation_id: z.string().uuid().optional().nullable(),
});

const evaluationResponseSchema = z.object({
  source_id: z.string().uuid(),
  source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER"),
  response_status: z.enum(["INTERESTED", "PRICE_QUESTION", "NEEDS_TIME", "NOT_INTERESTED", "NO_RESPONSE", "MEETING_BOOKED"]),
  response_note: z.string().trim().min(3).max(3000),
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

async function executeActivationOneAction(req, res, next) {
  try {
    const body = validate(activationOneSchema, req.body);
    res.status(201).json(await executeActivationOne(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function recordEvaluationResponse(req, res, next) {
  try {
    const body = validate(evaluationResponseSchema, req.body);
    res.status(201).json(await recordRmsEvaluationResponse(businessIdFor(req), req.user, body));
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
  executeActivationOneAction,
  executeAction,
  executeBulkAction,
  journeys,
  machine,
  metrics,
  movePhase,
  recordEvaluationResponse,
};

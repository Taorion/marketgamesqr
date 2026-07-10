const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  createRmsAgendaTask,
  getDailyQueue,
  listRmsOpportunities,
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

module.exports = {
  createAgendaTask,
  dailyQueue,
  journeys,
  metrics,
};


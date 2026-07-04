const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  addLeadInterest,
  createLeadActivation,
  createLeadNote,
  deleteLeadInterest,
  getLeadCrmDetail,
  listLeadCrmRows,
} = require("../services/leadCrmService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

const sourceTypeSchema = z.enum(["PLAYER", "MANUAL", "BUYER"]).default("PLAYER");

const noteSchema = z.object({
  note: z.string().trim().min(2).max(3000),
  note_type: z.enum(["commercial", "support", "vip", "observation", "follow_up"]).default("commercial"),
  next_action: z.string().trim().max(500).optional().nullable(),
  reminder_at: z.string().datetime().optional().nullable(),
  source_type: sourceTypeSchema.optional(),
});

const interestSchema = z.object({
  interest_name: z.string().trim().min(2).max(120),
  source: z.enum(["manual", "purchase", "game", "trivia", "campaign", "benefit", "system"]).default("manual"),
  weight: z.number().int().min(1).max(100).default(10),
  source_type: sourceTypeSchema.optional(),
});

const activationSchema = z.object({
  source_type: sourceTypeSchema.optional(),
  activation_type: z.enum([
    "MICROGAME",
    "TRIVIA",
    "CAMPAIGN_LINK",
    "TICKET",
    "BENEFIT",
    "VIP_ATTENTION",
    "GIFTCARD",
    "DISCOUNT",
    "EVENT_INVITATION",
    "REFERRAL_REWARD",
    "REBUY",
    "BIRTHDAY",
    "FIRST_PURCHASE",
    "INACTIVE_CLIENT",
    "VIP_CLIENT",
  ]),
  name: z.string().trim().min(2).max(160),
  campaign_id: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(1200).optional().nullable(),
  benefit_type: z.enum([
    "PERCENT_DISCOUNT",
    "FIXED_AMOUNT_DISCOUNT",
    "FREE_GIFT",
    "FREE_SAMPLE",
    "UPGRADE",
    "VIP_ACCESS",
    "RAFFLE_ENTRY",
    "BUY_X_GET_Y",
    "CUSTOM",
  ]).default("CUSTOM"),
  benefit_value: z.record(z.string(), z.unknown()).default({}),
  expires_at: z.string().datetime().optional().nullable(),
  usage_mode: z.enum(["single", "multiple"]).default("single"),
  channel: z.string().trim().max(80).default("manual"),
  subject: z.string().trim().max(180).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  score_min: z.number().int().min(0).optional().nullable(),
  branch_id: z.string().uuid().optional().nullable(),
  product_category: z.string().trim().max(160).optional().nullable(),
  conditions: z.string().trim().max(1200).optional().nullable(),
  consent_warning: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

async function listLeadsCrm(req, res, next) {
  try {
    res.json(await listLeadCrmRows(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function leadDetail(req, res, next) {
  try {
    res.json(await getLeadCrmDetail(
      businessIdFor(req),
      req.params.leadId,
      String(req.query.source_type || "PLAYER").toUpperCase()
    ));
  } catch (error) {
    next(error);
  }
}

async function createNote(req, res, next) {
  try {
    const body = validate(noteSchema, req.body);
    const note = await createLeadNote(
      businessIdFor(req),
      req.user,
      req.params.leadId,
      body.source_type || String(req.query.source_type || "PLAYER").toUpperCase(),
      body
    );
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
}

async function addInterest(req, res, next) {
  try {
    const body = validate(interestSchema, req.body);
    const interest = await addLeadInterest(
      businessIdFor(req),
      req.user,
      req.params.leadId,
      body.source_type || String(req.query.source_type || "PLAYER").toUpperCase(),
      body
    );
    res.status(201).json({ interest });
  } catch (error) {
    next(error);
  }
}

async function removeInterest(req, res, next) {
  try {
    res.json(await deleteLeadInterest(
      businessIdFor(req),
      req.params.leadId,
      req.params.interestId,
      String(req.query.source_type || "PLAYER").toUpperCase()
    ));
  } catch (error) {
    next(error);
  }
}

async function sendActivation(req, res, next) {
  try {
    const body = validate(activationSchema, req.body);
    const result = await createLeadActivation(
      businessIdFor(req),
      req.user,
      req.params.leadId,
      body.source_type || String(req.query.source_type || "PLAYER").toUpperCase(),
      body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addInterest,
  createNote,
  leadDetail,
  listLeadsCrm,
  removeInterest,
  sendActivation,
};

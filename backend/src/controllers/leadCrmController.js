const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  addLeadInterest,
  createLeadActivation,
  createLeadAgendaItem,
  createLeadNote,
  createLeadPurchase,
  deleteLeadAgendaItem,
  deleteLeadContact,
  deleteLeadInterest,
  getLeadCrmDetail,
  listLeadAgenda,
  listLeadCrmRows,
  updateLeadAgendaItem,
} = require("../services/leadCrmService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

const sourceTypeSchema = z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).default("PLAYER");

const noteSchema = z.object({
  note: z.string().trim().min(2).max(3000),
  note_type: z.enum(["commercial", "support", "vip", "observation", "follow_up"]).default("commercial"),
  next_action: z.string().trim().max(500).optional().nullable(),
  reminder_at: z.string().datetime().optional().nullable(),
  agenda_priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  progress_percent: z.number().int().min(0).max(100).optional(),
  checklist: z.array(z.object({
    label: z.string().trim().min(1).max(240),
    done: z.boolean().optional().default(false),
  })).max(20).optional(),
  source_type: sourceTypeSchema.optional(),
});

const agendaCreateSchema = noteSchema.extend({
  lead_id: z.string().uuid(),
});

const agendaUpdateSchema = z.object({
  note: z.string().trim().min(2).max(3000).optional(),
  note_type: z.enum(["commercial", "support", "vip", "observation", "follow_up"]).optional(),
  next_action: z.string().trim().max(500).optional().nullable(),
  reminder_at: z.string().datetime().optional(),
  agenda_status: z.enum(["OPEN", "DONE", "CANCELLED"]).optional(),
  agenda_priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  progress_percent: z.number().int().min(0).max(100).optional(),
  checklist: z.array(z.object({
    label: z.string().trim().min(1).max(240),
    done: z.boolean().optional().default(false),
  })).max(20).optional(),
});

const interestSchema = z.object({
  interest_name: z.string().trim().min(2).max(120),
  source: z.enum(["manual", "purchase", "game", "trivia", "campaign", "benefit", "system"]).default("manual"),
  weight: z.number().int().min(1).max(100).default(10),
  source_type: sourceTypeSchema.optional(),
});

const purchaseSchema = z.object({
  source_type: sourceTypeSchema.optional(),
  product_name: z.string().trim().min(2).max(180),
  sale_amount: z.number().positive(),
  currency: z.string().trim().min(2).max(8).default("COP"),
  category: z.string().trim().max(160).optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  branch_id: z.string().uuid().optional().nullable(),
  acquisition_source: z.string().trim().max(120).optional().nullable(),
  acquisition_channel: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1200).optional().nullable(),
  created_at: z.string().datetime().optional().nullable(),
  customer_name: z.string().trim().max(180).optional().nullable(),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  customer_email: z.string().trim().email().max(180).optional().nullable(),
  customer_document_id: z.string().trim().max(80).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
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

async function agenda(req, res, next) {
  try {
    res.json(await listLeadAgenda(businessIdFor(req), req.query));
  } catch (error) {
    next(error);
  }
}

async function createAgendaItem(req, res, next) {
  try {
    const body = validate(agendaCreateSchema, req.body);
    const item = await createLeadAgendaItem(businessIdFor(req), req.user, body);
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
}

async function updateAgendaItem(req, res, next) {
  try {
    const body = validate(agendaUpdateSchema, req.body);
    res.json({ item: await updateLeadAgendaItem(businessIdFor(req), req.user, req.params.noteId, body) });
  } catch (error) {
    next(error);
  }
}

async function deleteAgendaItem(req, res, next) {
  try {
    res.json(await deleteLeadAgendaItem(businessIdFor(req), req.user, req.params.noteId));
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

async function addPurchase(req, res, next) {
  try {
    const body = validate(purchaseSchema, req.body);
    const sale = await createLeadPurchase(
      businessIdFor(req),
      req.user,
      req.params.leadId,
      body.source_type || String(req.query.source_type || "PLAYER").toUpperCase(),
      body
    );
    res.status(201).json({ sale });
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

async function deleteContact(req, res, next) {
  try {
    res.json(await deleteLeadContact(
      businessIdFor(req),
      req.user,
      req.params.leadId,
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
  addPurchase,
  agenda,
  createAgendaItem,
  createNote,
  deleteAgendaItem,
  deleteContact,
  leadDetail,
  listLeadsCrm,
  removeInterest,
  sendActivation,
  updateAgendaItem,
};

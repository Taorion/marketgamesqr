const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const service = require("../services/businessCommunicationService");

function businessIdFor(req) {
  if (!req.user.business_id) throw forbidden("This user is not assigned to a business.");
  return req.user.business_id;
}

const optionalUrl = z.string().trim().url().optional().nullable().or(z.literal(""));
const communicationBaseSchema = z.object({
  title: z.string().trim().min(3).max(180),
  communication_type: z.enum(["EMAIL", "SOCIAL", "MIXED"]).default("EMAIL"),
  status: z.enum(["DRAFT", "READY", "SENT", "ARCHIVED"]).default("DRAFT"),
  campaign_id: z.string().uuid().optional().nullable(),
  channel_id: z.string().uuid().optional().nullable(),
  activation_id: z.string().uuid().optional().nullable(),
  subject: z.string().trim().max(220).optional().nullable(),
  email_body: z.string().trim().max(12000).optional().nullable(),
  social_copy: z.string().trim().max(5000).optional().nullable(),
  image_url: optionalUrl,
  action_url: optionalUrl,
  audience_filters: z.record(z.string(), z.unknown()).optional().default({}),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});
const communicationSchema = communicationBaseSchema.superRefine((body, ctx) => {
  if (["EMAIL", "MIXED"].includes(body.communication_type) && (!body.subject || !body.email_body)) {
    ctx.addIssue({ code: "custom", path: ["subject"], message: "El email necesita asunto y mensaje." });
  }
  if (["SOCIAL", "MIXED"].includes(body.communication_type) && !body.social_copy) {
    ctx.addIssue({ code: "custom", path: ["social_copy"], message: "La publicación necesita una descripción." });
  }
});
const communicationPatchSchema = communicationBaseSchema.partial().refine((body) => Object.keys(body).length > 0, "No hay cambios para guardar.");
const recipientSchema = z.object({ source_id: z.string().uuid(), source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).optional() });
const sendSchema = z.object({ recipients: z.array(recipientSchema).min(1).max(120), consent_confirmed: z.literal(true) });

async function list(req, res, next) { try { res.json(await service.listBusinessCommunications(businessIdFor(req))); } catch (error) { next(error); } }
async function audience(req, res, next) { try { res.json(await service.listAudience(businessIdFor(req), req.query)); } catch (error) { next(error); } }
async function create(req, res, next) { try { const body = validate(communicationSchema, req.body); res.status(201).json(await service.createBusinessCommunication(businessIdFor(req), req.user.id, body)); } catch (error) { next(error); } }
async function patch(req, res, next) { try { const body = validate(communicationPatchSchema, req.body); res.json(await service.updateBusinessCommunication(businessIdFor(req), req.user.id, req.params.id, body)); } catch (error) { next(error); } }
async function send(req, res, next) { try { const body = validate(sendSchema, req.body); res.json(await service.sendBusinessCommunication(businessIdFor(req), req.user.id, req.params.id, body.recipients, body.consent_confirmed)); } catch (error) { next(error); } }

module.exports = { audience, create, list, patch, send };

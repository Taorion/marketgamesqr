const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const service = require("../services/businessCommunicationService");

function businessIdFor(req) {
  if (!req.user.business_id) throw forbidden("This user is not assigned to a business.");
  return req.user.business_id;
}

const imageDataUrl = z.string().regex(/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i, "La imagen subida no tiene un formato válido.").max(4_200_000, "Cada imagen puede pesar hasta 3 MB.");
const optionalUrl = z.string().trim().url().optional().nullable().or(z.literal(""));
const optionalImageSource = z.union([optionalUrl, imageDataUrl]).optional().nullable();
const mediaAssetSchema = z.object({
  source: z.union([z.string().trim().url(), imageDataUrl]),
  name: z.string().trim().min(1).max(160).optional(),
  type: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]).optional(),
  size: z.number().int().positive().max(3 * 1024 * 1024).optional(),
});
const communicationFieldsSchema = z.object({
  title: z.string().trim().min(3).max(180),
  communication_type: z.enum(["EMAIL", "SOCIAL", "MIXED", "WHATSAPP"]).default("EMAIL"),
  status: z.enum(["DRAFT", "READY", "SENT", "ARCHIVED"]).default("DRAFT"),
  campaign_id: z.string().uuid().optional().nullable(),
  channel_id: z.string().uuid().optional().nullable(),
  branch_id: z.string().uuid().optional().nullable(),
  activation_id: z.string().uuid().optional().nullable(),
  web_showcase_id: z.string().uuid().optional().nullable(),
  web_showcase_product_id: z.string().uuid().optional().nullable(),
  product_promotion: z.object({
    label: z.string().trim().min(2).max(140),
    promotional_price: z.coerce.number().min(0).max(1_000_000_000),
    starts_at: z.string().trim().min(10).max(80),
    ends_at: z.string().trim().min(10).max(80),
  }).optional().nullable(),
  subject: z.string().trim().max(220).optional().nullable(),
  email_body: z.string().trim().max(12000).optional().nullable(),
  whatsapp_body: z.string().trim().max(3000).optional().nullable(),
  social_copy: z.string().trim().max(5000).optional().nullable(),
  image_url: optionalImageSource,
  action_url: optionalUrl,
  audience_filters: z.record(z.string(), z.unknown()).optional().default({}),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

function validateCommunicationMedia(body, ctx) {
  const media = body.metadata?.media_assets;
  if (media === undefined) return;
  const parsed = z.array(mediaAssetSchema).max(3, "Puedes adjuntar hasta 3 imágenes por comunicación.").safeParse(media);
  if (!parsed.success) parsed.error.issues.forEach((issue) => ctx.addIssue({ ...issue, path: ["metadata", "media_assets", ...issue.path] }));
}
const communicationSchema = communicationFieldsSchema.superRefine((body, ctx) => {
  validateCommunicationMedia(body, ctx);
  if (["EMAIL", "MIXED"].includes(body.communication_type) && (!body.subject || !body.email_body)) {
    ctx.addIssue({ code: "custom", path: ["subject"], message: "El email necesita asunto y mensaje." });
  }
  if (["SOCIAL", "MIXED"].includes(body.communication_type) && !body.social_copy) {
    ctx.addIssue({ code: "custom", path: ["social_copy"], message: "La publicación necesita una descripción." });
  }
  if (body.communication_type === "WHATSAPP" && !body.whatsapp_body && !body.metadata?.whatsapp_template?.name) {
    ctx.addIssue({ code: "custom", path: ["metadata", "whatsapp_template"], message: "WhatsApp necesita una plantilla aprobada o un mensaje para el respaldo manual." });
  }
});
const communicationPatchSchema = communicationFieldsSchema.partial().superRefine((body, ctx) => {
  if (Object.keys(body).length === 0) ctx.addIssue({ code: "custom", message: "No hay cambios para guardar." });
  validateCommunicationMedia(body, ctx);
});
const recipientSchema = z.object({ source_id: z.string().uuid(), source_type: z.enum(["PLAYER", "MANUAL", "BUYER", "AFFILIATE"]).optional() });
const sendSchema = z.object({ recipients: z.array(recipientSchema).min(1).max(120), consent_confirmed: z.literal(true) });
const publishSchema = z.object({ external_publication_url: optionalUrl, investment_amount: z.coerce.number().min(0).max(1_000_000_000).default(0) });
const emailConnectionSchema = z.object({
  sender_name: z.string().trim().min(2).max(160),
  sender_email: z.string().trim().email().max(220),
  resend_api_key: z.string().trim().regex(/^re_/, "La clave de Resend debe empezar por re_").min(12).max(500).optional().or(z.literal("")),
  remove_api_key: z.boolean().optional().default(false),
});
const emailConnectionTestSchema = z.object({ recipient_email: z.string().trim().email().max(220) });
const whatsAppConnectionSchema = z.object({
  business_account_id: z.string().trim().regex(/^\d{5,40}$/, "El ID de la cuenta de WhatsApp Business debe contener solo números.").optional().or(z.literal("")),
  phone_number_id: z.string().trim().regex(/^\d{5,40}$/, "El ID del número de teléfono debe contener solo números.").optional().or(z.literal("")),
  access_token: z.string().trim().min(30, "Pega el token de acceso de Meta completo.").max(2000).optional().or(z.literal("")),
  remove_access_token: z.boolean().optional().default(false),
});
const whatsAppTemplateSchema = z.object({
  template_name: z.string().trim().regex(/^[a-z0-9_]+$/, "Usa el nombre técnico de la plantilla de Meta (minúsculas, números y guiones bajos).").min(1).max(512),
  language_code: z.string().trim().regex(/^[a-z]{2,3}(_[A-Z]{2})?$/, "Usa el código de idioma de Meta, por ejemplo es_CO.").max(16).default("es_CO"),
  body_parameters: z.array(z.string().trim().max(1024)).max(20).default([]),
});
const whatsAppConnectionTestSchema = whatsAppTemplateSchema.extend({
  recipient_phone: z.string().trim().min(7).max(40),
  consent_confirmed: z.literal(true),
});

function requireCommunicationConfigurationAccess(req) {
  if (!["BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_Qori"].includes(req.user?.role)) {
    throw forbidden("Solo un owner o manager puede conectar la cuenta de correo de la empresa.");
  }
}

async function list(req, res, next) { try { res.json(await service.listBusinessCommunications(businessIdFor(req))); } catch (error) { next(error); } }
async function audience(req, res, next) { try { res.json(await service.listAudience(businessIdFor(req), req.query)); } catch (error) { next(error); } }
async function create(req, res, next) { try { const body = validate(communicationSchema, req.body); res.status(201).json(await service.createBusinessCommunication(businessIdFor(req), req.user.id, body)); } catch (error) { next(error); } }
async function patch(req, res, next) { try { const body = validate(communicationPatchSchema, req.body); res.json(await service.updateBusinessCommunication(businessIdFor(req), req.user.id, req.params.id, body)); } catch (error) { next(error); } }
async function remove(req, res, next) { try { requireCommunicationConfigurationAccess(req); res.json(await service.deleteBusinessCommunication(businessIdFor(req), req.params.id)); } catch (error) { next(error); } }
async function send(req, res, next) { try { const body = validate(sendSchema, req.body); res.json(await service.sendBusinessCommunication(businessIdFor(req), req.user.id, req.params.id, body.recipients, body.consent_confirmed, req.user.email)); } catch (error) { next(error); } }
async function prepareWhatsApp(req, res, next) { try { const body = validate(sendSchema, req.body); res.json(await service.prepareBusinessCommunicationWhatsApp(businessIdFor(req), req.user.id, req.params.id, body.recipients, body.consent_confirmed)); } catch (error) { next(error); } }
async function whatsappQueue(req, res, next) { try { res.json(await service.listBusinessCommunicationWhatsAppQueue(businessIdFor(req), req.params.id)); } catch (error) { next(error); } }
async function markWhatsAppOpened(req, res, next) { try { const body = validate(recipientSchema, req.body); res.json(await service.markBusinessCommunicationWhatsAppOpened(businessIdFor(req), req.user.id, req.params.id, body)); } catch (error) { next(error); } }
async function publish(req, res, next) { try { const body = validate(publishSchema, req.body); res.json(await service.publishBusinessCommunication(businessIdFor(req), req.user.id, req.params.id, body)); } catch (error) { next(error); } }
async function emailConnection(req, res, next) { try { res.json(await service.getEmailConnectionStatus(businessIdFor(req))); } catch (error) { next(error); } }
async function saveEmailConnection(req, res, next) { try { requireCommunicationConfigurationAccess(req); const body = validate(emailConnectionSchema, req.body); res.json(await service.saveEmailConnection(businessIdFor(req), { ...body, resend_api_key: body.resend_api_key || "" })); } catch (error) { next(error); } }
async function testEmailConnection(req, res, next) { try { requireCommunicationConfigurationAccess(req); const body = validate(emailConnectionTestSchema, req.body); res.json(await service.sendEmailConnectionTest(businessIdFor(req), req.user.email, body.recipient_email)); } catch (error) { next(error); } }
async function whatsAppConnection(req, res, next) { try { res.json(await service.getWhatsAppConnectionStatus(businessIdFor(req))); } catch (error) { next(error); } }
async function saveWhatsAppConnection(req, res, next) { try { requireCommunicationConfigurationAccess(req); const body = validate(whatsAppConnectionSchema, req.body); res.json(await service.saveWhatsAppConnection(businessIdFor(req), body)); } catch (error) { next(error); } }
async function whatsAppTemplates(req, res, next) { try { requireCommunicationConfigurationAccess(req); res.json(await service.listApprovedWhatsAppTemplates(businessIdFor(req))); } catch (error) { next(error); } }
async function testWhatsAppConnection(req, res, next) { try { requireCommunicationConfigurationAccess(req); const body = validate(whatsAppConnectionTestSchema, req.body); res.json(await service.sendWhatsAppConnectionTest(businessIdFor(req), body)); } catch (error) { next(error); } }
async function sendWhatsApp(req, res, next) { try { const body = validate(sendSchema.extend({ template: whatsAppTemplateSchema.optional() }), req.body); res.json(await service.sendBusinessCommunicationWhatsApp(businessIdFor(req), req.user.id, req.params.id, body.recipients, body.consent_confirmed, body.template)); } catch (error) { next(error); } }

module.exports = { audience, create, emailConnection, list, markWhatsAppOpened, patch, prepareWhatsApp, publish, remove, saveEmailConnection, saveWhatsAppConnection, send, sendWhatsApp, testEmailConnection, testWhatsAppConnection, whatsAppConnection, whatsAppTemplates, whatsappQueue };

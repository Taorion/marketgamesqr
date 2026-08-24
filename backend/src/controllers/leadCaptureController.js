const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  createLeadCaptureActivation,
  downloadDigitalAsset,
  getLeadCaptureActivation,
  getPublicLeadCapture,
  listLeadCaptureActivations,
  submissionsToCsv,
  submitPublicLeadCapture,
  updateLeadCaptureContent,
  updateLeadCaptureStatus,
} = require("../services/leadCaptureService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

const formFieldSchema = z.object({
  name: z.string().trim().min(2).max(80),
  label: z.string().trim().min(2).max(120),
  type: z.string().trim().max(40).default("text"),
  visible: z.boolean().default(true),
  required: z.boolean().default(false),
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1200).optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  branch_id: z.string().uuid().optional().nullable(),
  channel: z.string().trim().min(2).max(80).default("tienda_fisica"),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]).default("ACTIVE"),
  starts_at: z.string().datetime().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  public_message: z.object({
    title: z.string().trim().max(180).optional().nullable(),
    subtitle: z.string().trim().max(800).optional().nullable(),
    success_message: z.string().trim().max(300).optional().nullable(),
    details_title: z.string().trim().max(80).optional().nullable(),
    details_description: z.string().trim().max(800).optional().nullable(),
    detail_badges: z.array(z.string().trim().max(80)).max(3).optional(),
  }).optional().default({}),
  form_config: z.object({
    fields: z.array(formFieldSchema).optional(),
    consent_required: z.boolean().optional(),
    consent_text: z.string().trim().max(1000).optional().nullable(),
    privacy_url: z.string().trim().max(300).optional().nullable(),
  }).optional().default({}),
  asset_id: z.string().uuid().optional().nullable(),
  asset: z.object({
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(800).optional().nullable(),
    file_name: z.string().trim().min(2).max(180),
    file_data_url: z.string().min(32),
    cover_image_data_url: z.string().optional().nullable(),
    download_button_text: z.string().trim().max(80).optional().nullable(),
    category: z.string().trim().max(80).optional().nullable(),
  }).optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]),
});

const contentSchema = z.object({
  public_message: z.object({
    title: z.string().trim().max(180).optional().nullable(),
    subtitle: z.string().trim().max(800).optional().nullable(),
    success_message: z.string().trim().max(300).optional().nullable(),
    details_title: z.string().trim().max(80).optional().nullable(),
    details_description: z.string().trim().max(800).optional().nullable(),
    detail_badges: z.array(z.string().trim().max(80)).max(3).optional(),
  }).default({}),
});

const publicSubmissionSchema = z.object({
  form_data: z.record(z.string(), z.unknown()).default({}),
  consent_accepted: z.boolean().default(false),
  acquisition_tracking_token: z.string().uuid().optional().nullable(),
  acquisition_tracking_source: z.string().trim().max(40).optional().nullable(),
});

function reqMeta(req) {
  return {
    ip: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: req.headers["user-agent"] || "",
    acquisitionTrackingToken: req.query.qori_ref || null,
    acquisitionTrackingSource: req.query.qori_source || null,
  };
}

async function create(req, res, next) {
  try {
    const body = validate(createSchema, req.body);
    res.status(201).json(await createLeadCaptureActivation(businessIdFor(req), req.user, body));
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    res.json({ activations: await listLeadCaptureActivations(businessIdFor(req), req.query) });
  } catch (error) {
    next(error);
  }
}

async function detail(req, res, next) {
  try {
    res.json(await getLeadCaptureActivation(businessIdFor(req), req.params.id));
  } catch (error) {
    next(error);
  }
}

async function patchStatus(req, res, next) {
  try {
    const body = validate(statusSchema, req.body);
    res.json({ activation: await updateLeadCaptureStatus(businessIdFor(req), req.params.id, body.status) });
  } catch (error) {
    next(error);
  }
}

async function patchContent(req, res, next) {
  try {
    const body = validate(contentSchema, req.body);
    res.json({ activation: await updateLeadCaptureContent(businessIdFor(req), req.params.id, body) });
  } catch (error) {
    next(error);
  }
}

async function exportCsv(req, res, next) {
  try {
    const data = await getLeadCaptureActivation(businessIdFor(req), req.params.id);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="captura-relampago-${req.params.id}.csv"`);
    res.send(submissionsToCsv(data.leads, data.activation));
  } catch (error) {
    next(error);
  }
}

async function publicGet(req, res, next) {
  try {
    res.json(await getPublicLeadCapture(req.params.token, reqMeta(req)));
  } catch (error) {
    next(error);
  }
}

async function publicSubmit(req, res, next) {
  try {
    const body = validate(publicSubmissionSchema, req.body);
    res.status(201).json(await submitPublicLeadCapture(req.params.token, body, { ...reqMeta(req), acquisitionTrackingToken: body.acquisition_tracking_token || null, acquisitionTrackingSource: body.acquisition_tracking_source || null }));
  } catch (error) {
    next(error);
  }
}

async function publicDownload(req, res, next) {
  try {
    const file = await downloadDigitalAsset(req.params.downloadToken, reqMeta(req));
    res.setHeader("Content-Type", file.file_type);
    res.setHeader("Content-Length", file.buffer.length);
    res.setHeader("Content-Disposition", `attachment; filename="${String(file.file_name || "activo-digital").replace(/"/g, "")}"`);
    res.send(file.buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  detail,
  exportCsv,
  list,
  patchContent,
  patchStatus,
  publicDownload,
  publicGet,
  publicSubmit,
};

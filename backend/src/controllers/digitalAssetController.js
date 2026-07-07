const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  createDigitalAsset,
  listDigitalAssets,
  updateDigitalAsset,
  updateDigitalAssetStatus,
} = require("../services/leadCaptureService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

const assetSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(800).optional().nullable(),
  file_name: z.string().trim().min(2).max(180),
  file_data_url: z.string().min(32),
  cover_image_data_url: z.string().optional().nullable(),
  download_button_text: z.string().trim().max(80).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const updateAssetSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(800).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  download_button_text: z.string().trim().max(80).optional().nullable(),
  file_name: z.string().trim().min(2).max(180).optional(),
  file_data_url: z.string().min(32).optional().nullable(),
  cover_image_data_url: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const statusSchema = z.object({
  is_active: z.boolean(),
});

async function list(req, res, next) {
  try {
    res.json({ assets: await listDigitalAssets(businessIdFor(req), req.query) });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const body = validate(assetSchema, req.body);
    res.status(201).json({ asset: await createDigitalAsset(businessIdFor(req), req.user, body) });
  } catch (error) {
    next(error);
  }
}

async function patch(req, res, next) {
  try {
    const body = validate(updateAssetSchema, req.body);
    res.json({ asset: await updateDigitalAsset(businessIdFor(req), req.params.id, body) });
  } catch (error) {
    next(error);
  }
}

async function patchStatus(req, res, next) {
  try {
    const body = validate(statusSchema, req.body);
    res.json({ asset: await updateDigitalAssetStatus(businessIdFor(req), req.params.id, body.is_active) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
  patch,
  patchStatus,
};

const { z } = require("zod");
const { validate } = require("../utils/validators");
const {
  DEFAULT_TERMS,
  buildRewardPassPdf,
  cancelRewardPass,
  createRewardPass,
  defaultExpiresAt,
  extendRewardPass,
  getPublicRewardPass,
  getRewardPassById,
  getTicketContext,
  listRewardPasses,
  redeemRewardPass,
  rewardPassMetrics,
  validateRewardPassToken,
} = require("../services/rewardPassService");

const optionalString = z.string().trim().max(500).optional().nullable();
const optionalEmail = z.string().trim().email().max(180).optional().nullable();

const createRewardPassSchema = z.object({
  campaign_id: z.string().uuid().optional().nullable(),
  buyer_name: z.string().trim().min(2).max(160),
  buyer_document: optionalString,
  buyer_email: optionalEmail,
  buyer_phone: z.string().trim().max(40).optional().nullable(),
  beneficiary_name: z.string().trim().min(2).max(160),
  beneficiary_document: z.string().trim().min(3).max(80),
  beneficiary_email: optionalEmail,
  beneficiary_phone: z.string().trim().max(40).optional().nullable(),
  initial_value_cop: z.number().positive(),
  issued_at: z.string().datetime().optional().nullable(),
  valid_from: z.string().datetime().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  transferable: z.boolean().default(false),
  partial_redemption_allowed: z.boolean().default(true),
  authorized_branch: z.string().trim().max(180).optional().nullable(),
  terms: z.string().trim().max(6000).optional().nullable(),
  internal_notes: z.string().trim().max(2000).optional().nullable(),
  payment_method_received: z.string().trim().max(120).optional().nullable(),
});

const redeemRewardPassSchema = z.object({
  invoice_number: z.string().trim().min(2).max(120),
  invoice_file_path: z.string().trim().max(500).optional().nullable(),
  purchase_value_cop: z.number().min(0).optional().default(0),
  redeemed_value_cop: z.number().positive(),
  branch: z.string().trim().max(180).optional().nullable(),
  observations: z.string().trim().max(2000).optional().nullable(),
  document_checked: z.string().trim().max(80).optional().nullable(),
  confirm_full_consumption: z.boolean().optional().default(false),
});

const cancelRewardPassSchema = z.object({
  notes: z.string().trim().max(2000).optional().nullable(),
});

const extendRewardPassSchema = z.object({
  expires_at: z.string().datetime(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

function parseBoolean(value) {
  return ["1", "true", "yes", "si"].includes(String(value || "").toLowerCase());
}

async function rewardPassContext(req, res, next) {
  try {
    res.json({
      context: await getTicketContext(req.user),
      default_terms: DEFAULT_TERMS,
      default_expires_at: defaultExpiresAt(),
    });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const filters = {
      status: req.query.status || "",
      search: req.query.search || "",
      pendingBalance: parseBoolean(req.query.pending_balance),
      expired: parseBoolean(req.query.expired),
      partiallyRedeemed: parseBoolean(req.query.partially_redeemed),
    };
    res.json({
      reward_passes: await listRewardPasses(req.user, filters),
      metrics: await rewardPassMetrics(req.user),
      context: await getTicketContext(req.user),
    });
  } catch (error) {
    next(error);
  }
}

async function metrics(req, res, next) {
  try {
    res.json({ metrics: await rewardPassMetrics(req.user) });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const body = validate(createRewardPassSchema, req.body);
    const rewardPass = await createRewardPass(req.user, body);
    res.status(201).json({
      message: "Reward Pass emitido correctamente. Se descontaron los tickets de tu saldo MarketGames.",
      reward_pass: rewardPass,
    });
  } catch (error) {
    next(error);
  }
}

async function get(req, res, next) {
  try {
    res.json({ reward_pass: await getRewardPassById(req.user, req.params.id) });
  } catch (error) {
    next(error);
  }
}

async function cancel(req, res, next) {
  try {
    const body = validate(cancelRewardPassSchema, req.body || {});
    res.json({ reward_pass: await cancelRewardPass(req.user, req.params.id, body.notes || "") });
  } catch (error) {
    next(error);
  }
}

async function extend(req, res, next) {
  try {
    const body = validate(extendRewardPassSchema, req.body || {});
    res.json({ reward_pass: await extendRewardPass(req.user, req.params.id, body.expires_at, body.notes || "") });
  } catch (error) {
    next(error);
  }
}

async function validateToken(req, res, next) {
  try {
    res.json(await validateRewardPassToken(req.user, req.params.token));
  } catch (error) {
    next(error);
  }
}

async function redeemToken(req, res, next) {
  try {
    const body = validate(redeemRewardPassSchema, req.body || {});
    res.json(await redeemRewardPass(req.user, req.params.token, body));
  } catch (error) {
    next(error);
  }
}

async function publicGet(req, res, next) {
  try {
    res.json({ reward_pass: await getPublicRewardPass(req.params.publicCode) });
  } catch (error) {
    next(error);
  }
}

async function downloadPdf(req, res, next) {
  try {
    const rewardPass = await getRewardPassById(req.user, req.params.id);
    const pdf = await buildRewardPassPdf(rewardPass, "card");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${rewardPass.public_code}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}

async function acquisitionReceipt(req, res, next) {
  try {
    const rewardPass = await getRewardPassById(req.user, req.params.id);
    const pdf = await buildRewardPassPdf(rewardPass, "receipt");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="comprobante-${rewardPass.public_code}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  acquisitionReceipt,
  cancel,
  create,
  downloadPdf,
  extend,
  get,
  list,
  metrics,
  publicGet,
  redeemToken,
  rewardPassContext,
  validateToken,
};

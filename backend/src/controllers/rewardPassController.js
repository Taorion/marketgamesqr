const { z } = require("zod");
const { validate } = require("../utils/validators");
const {
  DEFAULT_TERMS,
  buildRewardPassPdf,
  cancelRewardPass,
  claimRewardPass,
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

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

const optionalString = z.preprocess(emptyToNull, z.string().max(500).nullable().optional());
const optionalShortString = z.preprocess(emptyToNull, z.string().max(180).nullable().optional());
const optionalPhone = z.preprocess(emptyToNull, z.string().max(40).nullable().optional());
const optionalEmail = z.preprocess(emptyToNull, z.string().email().max(180).nullable().optional());
const optionalDateTime = z.preprocess(emptyToNull, z.string().datetime().nullable().optional());
const optionalUuid = z.preprocess(emptyToNull, z.string().uuid().nullable().optional());
const moneyValue = z.coerce.number().positive();
const nonNegativeMoneyValue = z.coerce.number().min(0);

const createRewardPassSchema = z.object({
  campaign_id: optionalUuid,
  buyer_name: z.string().trim().min(2).max(160),
  buyer_document: optionalString,
  buyer_email: optionalEmail,
  buyer_phone: optionalPhone,
  beneficiary_name: optionalShortString,
  beneficiary_document: z.preprocess(emptyToNull, z.string().max(80).nullable().optional()),
  beneficiary_email: optionalEmail,
  beneficiary_phone: optionalPhone,
  initial_value_cop: moneyValue,
  issued_at: optionalDateTime,
  valid_from: optionalDateTime,
  expires_at: optionalDateTime,
  transferable: z.boolean().default(false),
  partial_redemption_allowed: z.boolean().default(true),
  authorized_branch: optionalShortString,
  terms: z.preprocess(emptyToNull, z.string().max(8000).nullable().optional()),
  internal_notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional()),
  payment_method_received: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
});

const redeemRewardPassSchema = z.object({
  invoice_number: z.string().trim().min(2).max(120),
  invoice_file_path: optionalString,
  purchase_value_cop: nonNegativeMoneyValue.optional().default(0),
  redeemed_value_cop: moneyValue,
  branch: optionalShortString,
  observations: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional()),
  document_checked: z.preprocess(emptyToNull, z.string().max(80).nullable().optional()),
  confirm_full_consumption: z.boolean().optional().default(false),
});

const cancelRewardPassSchema = z.object({
  notes: z.string().trim().max(2000).optional().nullable(),
});

const extendRewardPassSchema = z.object({
  expires_at: z.string().datetime(),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional()),
});

const claimRewardPassSchema = z.object({
  beneficiary_name: z.string().trim().min(2).max(160),
  beneficiary_document: z.string().trim().min(3).max(80),
  beneficiary_email: optionalEmail,
  beneficiary_phone: optionalPhone,
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
    const payload = { ...(req.body || {}) };
    ["beneficiary_name", "beneficiary_document", "beneficiary_email", "beneficiary_phone"].forEach((field) => {
      if (!emptyToNull(payload[field])) {
        delete payload[field];
      }
    });
    const body = validate(createRewardPassSchema, payload);
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

async function publicClaim(req, res, next) {
  try {
    const body = validate(claimRewardPassSchema, req.body || {});
    res.json({
      message: "Gift Card Digital oficial activada correctamente. Ahora puedes presentar el QR redimible en el negocio emisor.",
      reward_pass: await claimRewardPass(req.params.publicCode, body),
    });
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
  publicClaim,
  redeemToken,
  rewardPassContext,
  validateToken,
};

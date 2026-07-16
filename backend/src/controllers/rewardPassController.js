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
  getPublicRewardPassPdf,
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

const optionalText = (max) => z.union([z.string().trim().max(max), z.null()]).optional().transform(emptyToNull);
const requiredText = (min, max, label) => z.any()
  .optional()
  .transform(emptyToNull)
  .refine((value) => typeof value === "string" && value.length >= min, `${label} es obligatorio.`)
  .refine((value) => value === null || String(value).length <= max, `${label} es demasiado largo.`);

const optionalString = optionalText(500);
const optionalShortString = optionalText(180);
const optionalPhone = optionalText(40);
const optionalEmail = z.union([z.string().trim().email().max(180), z.literal(""), z.null()]).optional().transform(emptyToNull);
const optionalDateTime = z.union([z.string().datetime(), z.literal(""), z.null()]).optional().transform(emptyToNull);
const optionalUuid = z.union([z.string().uuid(), z.literal(""), z.null()]).optional().transform(emptyToNull);
const moneyValue = z.coerce.number().positive();
const nonNegativeMoneyValue = z.coerce.number().min(0);

const createRewardPassSchema = z.object({
  campaign_id: optionalUuid,
  buyer_name: z.string().trim().min(2).max(160),
  buyer_document: optionalString,
  buyer_email: optionalEmail,
  buyer_phone: optionalPhone,
  beneficiary_name: optionalShortString,
  beneficiary_document: optionalText(80),
  beneficiary_email: optionalEmail,
  beneficiary_phone: optionalPhone,
  initial_value_cop: moneyValue,
  issued_at: optionalDateTime,
  valid_from: optionalDateTime,
  expires_at: optionalDateTime,
  transferable: z.boolean().default(false),
  partial_redemption_allowed: z.boolean().default(true),
  authorized_branch: optionalShortString,
  terms: optionalText(8000),
  internal_notes: optionalText(2000),
  payment_method_received: optionalText(120),
});

const redeemRewardPassSchema = z.object({
  invoice_number: z.string().trim().min(2).max(120),
  invoice_file_path: optionalString,
  purchase_value_cop: nonNegativeMoneyValue.optional().default(0),
  redeemed_value_cop: moneyValue,
  branch: optionalShortString,
  observations: optionalText(2000),
  document_checked: optionalText(80),
  confirm_full_consumption: z.boolean().optional().default(false),
});

const cancelRewardPassSchema = z.object({
  notes: z.string().trim().max(2000).optional().nullable(),
});

const extendRewardPassSchema = z.object({
  expires_at: z.string().datetime(),
  notes: optionalText(2000),
});

const claimRewardPassSchema = z.object({
  beneficiary_name: requiredText(2, 160, "El nombre del beneficiario"),
  beneficiary_document: requiredText(3, 80, "El documento del beneficiario"),
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
      message: "Reward Pass emitido correctamente. Se descontaron los tickets de tu saldo Sales Machine.",
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
      message: "Gift Card Digital activada. Ya puedes ver el valor disponible, descargar tu PDF y presentar el QR final en el negocio emisor.",
      reward_pass: await claimRewardPass(req.params.publicCode, body),
    });
  } catch (error) {
    next(error);
  }
}

async function publicDownloadPdf(req, res, next) {
  try {
    const pdf = await getPublicRewardPassPdf(req.params.publicCode);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.publicCode}.pdf"`);
    res.send(pdf);
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
  publicDownloadPdf,
  redeemToken,
  rewardPassContext,
  validateToken,
};

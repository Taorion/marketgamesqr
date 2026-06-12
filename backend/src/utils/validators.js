const { z } = require("zod");
const { badRequest } = require("./http");

function validate(schema, source) {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw badRequest("Invalid request payload.", result.error.flatten());
  }
  return result.data;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const generateQrSchema = z.object({
  business_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
  game_id: z.string().uuid(),
  reward_id: z.string().uuid(),
  player: z.object({
    external_id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    document_id: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).default({}),
  questionnaire: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expires_at: z.string().datetime().optional(),
});

const qrOriginTypes = [
  "CAMPAIGN_GAME",
  "CAMPAIGN_FORM",
  "POST_SALE",
  "PRODUCT_LABEL",
  "BULK_PACKAGE",
  "MANUAL_BENEFIT",
  "LOYALTY",
  "SURPRISE_REWARD",
  "AFFILIATE_REFERRAL",
];

const benefitTypes = [
  "PERCENT_DISCOUNT",
  "FIXED_AMOUNT_DISCOUNT",
  "FREE_GIFT",
  "FREE_SAMPLE",
  "UPGRADE",
  "VIP_ACCESS",
  "RAFFLE_ENTRY",
  "BUY_X_GET_Y",
  "CUSTOM",
];

const expirationPresets = ["7_DAYS", "15_DAYS", "30_DAYS", "CUSTOM_DATE", "NONE"];

const benefitValueSchema = z.record(z.string(), z.unknown()).default({});

const strategicBenefitSchema = z.object({
  reward_id: z.string().uuid().optional().nullable(),
  benefit_type: z.enum(benefitTypes),
  benefit_label: z.string().trim().min(2).max(160),
  benefit_value: benefitValueSchema,
});

const postSaleQrSchema = z.object({
  campaign_id: z.string().uuid().optional().nullable(),
  sale_amount: z.number().min(0),
  currency: z.string().trim().min(3).max(8).default("COP"),
  customer_name: z.string().trim().max(160).optional().nullable(),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  customer_email: z.string().email().max(160).optional().nullable(),
  document_id: z.string().trim().max(40).optional().nullable(),
  product_name: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  branch_id: z.string().uuid().optional().nullable(),
  expires_mode: z.enum(expirationPresets).default("NONE"),
  expires_at: z.string().datetime().optional().nullable(),
  expiration_days: z.number().int().min(1).max(365).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  benefit: strategicBenefitSchema,
});

const qrBatchSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  quantity: z.number().int().min(1).max(5000),
  campaign_id: z.string().uuid().optional().nullable(),
  qr_origin_type: z.enum(qrOriginTypes).refine((value) => value !== "POST_SALE", "POST_SALE is not valid for batches."),
  channel_use: z.enum(["etiqueta", "empaque", "volante", "evento", "producto", "mostrador", "campana-interna", "punto-de-venta"]),
  claim_required: z.boolean().default(true),
  expires_mode: z.enum(expirationPresets).default("NONE"),
  expires_at: z.string().datetime().optional().nullable(),
  expiration_days: z.number().int().min(1).max(365).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  benefit: strategicBenefitSchema,
});

const affiliateReferralQrBatchSchema = z.object({
  affiliate_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  notes: z.string().trim().max(2000).optional().nullable(),
  expires_mode: z.enum(expirationPresets).default("NONE"),
  expires_at: z.string().datetime().optional().nullable(),
  expiration_days: z.number().int().min(1).max(365).optional().nullable(),
  benefit: strategicBenefitSchema.default({
    benefit_type: "CUSTOM",
    benefit_label: "Recomendacion de afiliado",
    benefit_value: {},
  }),
});

const qrClaimSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().email().max(160).optional().nullable(),
  document_id: z.string().trim().max(40).optional().nullable(),
  source: z.string().trim().max(80).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

module.exports = {
  validate,
  loginSchema,
  generateQrSchema,
  qrOriginTypes,
  benefitTypes,
  postSaleQrSchema,
  qrBatchSchema,
  affiliateReferralQrBatchSchema,
  qrClaimSchema,
};

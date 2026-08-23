const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { forbidden, notFound, badRequest } = require("../utils/http");
const { validate } = require("../utils/validators");
const {
  getBusinessSummary,
  getBusinessCampaignMetrics,
  getCampaignMetrics,
  safeRoi,
  canonicalSalesUnionSql,
} = require("../services/metricsService");
const { getCommandCenterAnalytics } = require("../services/commandCenterAnalyticsService");
const {
  assertFeatureForRequest,
  assertLimitForBusiness,
  assertMonthlyUsageLimit,
  getBusinessAccess,
  getBusinessSubscription,
  recordUsage,
} = require("../services/subscriptionService");
const { mapPublicCreditAccount } = require("../services/qrCreditService");
const {
  affiliatePointRuleMetadata,
  getAffiliatePointRules,
  referralPointsForAmount,
  rulesFromSettings,
} = require("../services/affiliatePointRulesService");
const { syncSaleProductsWithCatalog } = require("../services/productCatalogService");
const { getIndividualQrDownload } = require("../services/strategicQrService");
const { getLeadCrmDetail } = require("../services/leadCrmService");
const { assertStorageQuotaForUpload } = require("../services/storageQuotaService");
const { recordLifecycleEvent } = require("../services/lifecycleAuditService");
const { resolveAcquisitionChannelReference } = require("../services/acquisitionChannelService");

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const slugSchema = z.preprocess(
  (value) => slugify(value),
  z.string().min(2).max(120).regex(/^[a-z0-9-]+$/)
);

const acquisitionChannelReferenceSchema = z.object({
  acquisition_channel_id: z.string().uuid().optional().nullable(),
  acquisition_channel: z.string().trim().min(2).max(180).optional().nullable(),
}).superRefine((value, context) => {
  if (!value.acquisition_channel_id && !value.acquisition_channel) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona un canal o escribe uno temporal." });
  }
});

async function resolveCampaignChannelReferences(client, businessId, refs = [], legacyNames = []) {
  const rawRefs = Array.isArray(refs) && refs.length
    ? refs
    : (Array.isArray(legacyNames) ? legacyNames.map((acquisition_channel) => ({ acquisition_channel })) : []);
  const resolved = [];
  for (const raw of rawRefs) {
    const parsed = validate(acquisitionChannelReferenceSchema, raw || {});
    const channel = await resolveAcquisitionChannelReference(client, businessId, parsed);
    resolved.push({
      id: channel.acquisition_channel_id,
      name_snapshot: channel.acquisition_channel_name_snapshot,
      slug_snapshot: channel.acquisition_channel_slug_snapshot,
      source: channel.acquisition_channel_source,
    });
  }
  return resolved;
}

function customerContactIdentity(customer = {}) {
  const documentId = String(customer.customer_document_id || "").trim();
  const email = String(customer.customer_email || "").trim().toLowerCase();
  const phone = String(customer.customer_phone || "").replace(/\D/g, "");
  return { documentId: documentId || null, email: email || null, phone: phone || null };
}

// The sales form may receive a buyer who has never been captured by a campaign.
// Persist a canonical contact in the same transaction as the sale, so the
// contacts list and post-sale flows never lose that new customer.
async function ensureCustomerContactForAcquisitionSale(client, businessId, user, customer = {}) {
  const identity = customerContactIdentity(customer);
  const lockKey = [businessId, identity.documentId || identity.email || identity.phone || String(customer.customer_name || "cliente").trim().toLowerCase()].join(":");
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`customer-acquisition:${lockKey}`]);
  const existing = await client.query(
    `select id, name, email, phone, document_id
       from players
      where business_id = $1
        and (
          ($2::text is not null and nullif(document_id, '') = $2)
          or ($3::text is not null and lower(nullif(email, '')) = $3)
          or ($4::text is not null and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $4)
        )
      order by created_at asc
      limit 1
      for update`,
    [businessId, identity.documentId, identity.email, identity.phone]
  );
  if (existing.rowCount) return { customer: existing.rows[0], created: false };

  const created = await client.query(
    `insert into players (business_id, campaign_id, game_id, name, email, phone, document_id, metadata)
     values ($1, $2, null, $3, $4, $5, $6, $7::jsonb)
     returning id, name, email, phone, document_id`,
    [
      businessId,
      customer.campaign_id || null,
      String(customer.customer_name || "Cliente sin nombre").trim() || "Cliente sin nombre",
      identity.email || null,
      customer.customer_phone || null,
      identity.documentId,
      JSON.stringify({
        source: "Venta registrada en Operar",
        crm_created_from: "customer_acquisition_sale",
        customer_created_at: new Date().toISOString(),
        created_by_user_id: user?.id || null,
      }),
    ]
  );
  return { customer: created.rows[0], created: true };
}

const clientSetupSchema = z.object({
  budget_total: z.number().min(0),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  launch_channels: z.array(z.string().trim().min(2).max(180)).min(1),
  launch_channel_refs: z.array(acquisitionChannelReferenceSchema).min(1).optional(),
  expected_sales_goal: z.number().min(0).optional().nullable(),
  expected_leads_goal: z.number().min(0).optional().nullable(),
  expected_redemptions_goal: z.number().min(0).optional().nullable(),
  client_notes: z.string().trim().max(2000).optional().nullable(),
  objective: z.string().trim().max(500).optional().nullable(),
  additional_budget: z.number().min(0).optional().nullable(),
  campaign_cost_calculator: z.record(z.string(), z.any()).optional().nullable(),
});

const ownerCampaignSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: slugSchema,
  type: z.enum(["GAME", "FORM", "LANDING", "INFLUENCER", "EVENT", "FLYER", "SOCIAL", "MIXED"]).default("FORM"),
  status: z.enum(["DRAFT", "READY_FOR_CLIENT_SETUP", "SCHEDULED", "ACTIVE", "PAUSED", "FINISHED", "ARCHIVED"]).default("DRAFT"),
  objective: z.string().trim().max(500).optional().nullable(),
  strategy_summary: z.string().trim().max(2000).optional().nullable(),
  budget_total: z.number().min(0).default(0),
  expected_sales_goal: z.number().min(0).optional().nullable(),
  expected_leads_goal: z.number().min(0).optional().nullable(),
  expected_redemptions_goal: z.number().min(0).optional().nullable(),
  launch_channels: z.array(z.string().trim().min(2).max(80)).optional(),
  launch_channel_refs: z.array(acquisitionChannelReferenceSchema).optional(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  client_notes: z.string().trim().max(2000).optional().nullable(),
  delivered_assets: z.record(z.string(), z.unknown()).optional(),
  campaign_cost_calculator: z.record(z.string(), z.any()).optional().nullable(),
});

const ownerCampaignPatchSchema = ownerCampaignSchema.partial();

function assertCampaignOperationalReadiness(campaign = {}) {
  const status = String(campaign.status || "DRAFT").toUpperCase();
  if (!["ACTIVE", "SCHEDULED"].includes(status)) return;
  const startsAt = campaign.starts_at ? new Date(campaign.starts_at) : null;
  const endsAt = campaign.ends_at ? new Date(campaign.ends_at) : null;
  if (!String(campaign.objective || "").trim()) {
    throw badRequest("Antes de activar o programar la campaña, define el objetivo comercial.");
  }
  if (!startsAt || Number.isNaN(startsAt.getTime()) || !endsAt || Number.isNaN(endsAt.getTime())) {
    throw badRequest("Antes de activar o programar la campaña, define fecha de inicio y cierre.");
  }
  if (endsAt <= startsAt) {
    throw badRequest("La fecha de cierre debe ser posterior a la fecha de inicio.");
  }
  if (Number(campaign.budget_total || 0) <= 0) {
    throw badRequest("Antes de activar o programar la campaña, registra una inversión mayor que cero.");
  }
  if (!Array.isArray(campaign.launch_channels) || !campaign.launch_channels.length) {
    throw badRequest("Antes de activar o programar la campaña, selecciona al menos un canal.");
  }
}

const salesSnapshotSchema = z.object({
  period_type: z.enum(["BEFORE", "DURING", "AFTER"]),
  start_date: z.string().date(),
  end_date: z.string().date(),
  total_sales_amount: z.number().min(0),
  total_orders: z.number().int().min(0).default(0),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const lifecycleReasonSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
  idempotency_key: z.string().trim().min(8).max(160).optional().nullable(),
});

const businessProfileSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  slogan: z.string().trim().max(180).optional().nullable(),
  contact_name: z.string().trim().max(160).optional().nullable(),
  contact_email: z.string().trim().email().optional().nullable(),
  communication_sender_name: z.string().trim().max(160).optional().nullable(),
  communication_sender_email: z.string().trim().email().max(220).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  website: z.string().trim().max(220).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(220).optional().nullable(),
  affiliate_point_amount_cop: z.number().positive().optional().nullable(),
  affiliate_referral_points_rate: z.number().positive().optional().nullable(),
  affiliate_referral_points_rounding: z.enum(["floor", "ceil"]).optional().nullable(),
  affiliate_referral_registration_points: z.number().int().min(0).max(1000000).optional().nullable(),
  affiliate_referral_purchase_points: z.number().int().min(0).max(1000000).optional().nullable(),
  rms_risk_recovery_authorizations: z.object({
    discount: z.object({
      enabled: z.boolean().optional().default(false),
      max_percent: z.number().min(0).max(100).optional().default(0),
    }).optional().default({}),
    two_for_one: z.object({
      enabled: z.boolean().optional().default(false),
      label: z.string().trim().max(180).optional().nullable(),
    }).optional().default({}),
    gift: z.object({
      enabled: z.boolean().optional().default(false),
      label: z.string().trim().max(180).optional().nullable(),
    }).optional().default({}),
    benefits: z.array(z.object({
      id: z.string().trim().min(1).max(120),
      enabled: z.boolean().optional().default(true),
      type: z.enum(["DISCOUNT", "GIFT", "BONUS", "OTHER"]).default("OTHER"),
      label: z.string().trim().min(1).max(180),
      value: z.number().min(0).max(100000000).optional().default(0),
      detail: z.string().trim().max(500).optional().nullable(),
    })).max(100).optional().default([]),
  }).optional(),
  logo_data_url: z.string().trim().max(2_000_000).optional().nullable(),
  ticket_frame_data_url: z.string().trim().max(2_500_000).optional().nullable(),
});

function boundedLimit(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function wantsTotalCount(req) {
  return ["1", "true", "yes"].includes(String(req.query.includeTotal || "").toLowerCase());
}

const businessUserSchema = z.object({
  full_name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(120),
  role: z.enum(["BUSINESS_OWNER", "BUSINESS_MANAGER", "VALIDATOR"]),
});

const businessUserPatchSchema = z.object({
  is_active: z.boolean(),
});

const acquisitionSourceOptions = [
  "STORE_WALK_IN",
  "FRIEND_REFERRAL",
  "FAIR_EVENT",
  "INTERNET_SEARCH",
  "SOCIAL_MEDIA",
  "PAID_ADS",
  "QR_SCAN",
  "OTHER",
];

const customerAcquisitionSaleSchema = z.object({
  campaign_id: z.string().uuid().optional().nullable(),
  branch_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().trim().max(160).optional().nullable(),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  customer_email: z.string().trim().email().optional().nullable(),
  customer_document_id: z.string().trim().max(80).optional().nullable(),
  product_name: z.string().trim().max(180).optional().nullable(),
  sale_amount: z.number().positive(),
  currency: z.string().trim().max(12).default("COP"),
  acquisition_source: z.enum(acquisitionSourceOptions),
  acquisition_channel_id: z.string().uuid().optional().nullable(),
  acquisition_channel: z.string().trim().max(180).optional().nullable(),
  referred_affiliate_id: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const inventoryTaxClassificationSchema = z.enum(["EXEMPT", "EXCLUDED", "VAT_0", "VAT_5", "VAT_8", "VAT_11", "VAT_19"]);

const inventoryProductSchema = z.object({
  internal_id: z.string().trim().min(2).max(100).optional().nullable(),
  sku: z.string().trim().max(80).optional().nullable(),
  barcode: z.string().trim().max(120).optional().nullable(),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1200).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  category_internal_id: z.string().trim().min(2).max(100).optional().nullable(),
  subcategory: z.string().trim().max(120).optional().nullable(),
  subcategory_id: z.string().uuid().optional().nullable(),
  subcategory_internal_id: z.string().trim().min(2).max(100).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  brand_internal_id: z.string().trim().min(2).max(100).optional().nullable(),
  unit_price: z.number().min(0).default(0),
  price_before_tax: z.number().min(0).optional(),
  tax_classification: inventoryTaxClassificationSchema.default("EXEMPT"),
  tax_base_id: z.string().uuid().optional().nullable(),
  tax_base: z.string().trim().max(120).optional().nullable(),
  healthy_tax_id: z.string().uuid().optional().nullable(),
  healthy_tax: z.string().trim().max(120).optional().nullable(),
  cost_price: z.number().min(0).optional().nullable(),
  currency: z.string().trim().max(12).default("COP"),
  stock_quantity: z.number().min(0).default(0),
  min_stock_quantity: z.number().min(0).default(0),
  unit_label: z.string().trim().max(40).default("unidad"),
  unit_id: z.string().uuid().optional().nullable(),
  unit_internal_id: z.string().trim().min(2).max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const inventoryProductPatchSchema = inventoryProductSchema.partial();

const inventoryProductCsvImportSchema = z.object({
  products: z.array(inventoryProductSchema).min(1).max(500),
});

const inventoryCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  internal_id: z.string().trim().min(2).max(100),
});

const inventorySubcategorySchema = inventoryCategorySchema.extend({
  category_id: z.string().uuid(),
});

const inventoryReferenceSchema = inventoryCategorySchema.extend({
  rate: z.number().min(0).max(1).optional(),
});

const acquisitionChannelSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: slugSchema.optional(),
  channel_type: z.enum(["DIGITAL", "SOCIAL", "MESSAGING", "SEARCH", "WEB", "PHYSICAL", "REFERRAL", "AFFILIATE", "MARKETPLACE", "DIRECT", "OTHER"]).default("DIGITAL"),
  platform: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "TESTING", "ARCHIVED"]).default("ACTIVE"),
  period_budget: z.number().min(0).default(0),
  currency: z.string().trim().max(12).default("COP"),
  cost_model: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(1500).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const acquisitionChannelPatchSchema = acquisitionChannelSchema.partial();

const nullableText = (max) => z.preprocess(
  (value) => {
    const text = String(value ?? "").trim();
    return text ? text : null;
  },
  z.string().max(max).nullable()
);

const nullableDateTime = z.preprocess(
  (value) => {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
  },
  z.string().datetime().nullable()
);

const acquisitionChannelEffortSchema = z.object({
  channel_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(180),
  description: nullableText(1200).optional(),
  objective: nullableText(500).optional(),
  content_type: z.enum(["POST", "REEL", "STORY", "AD", "CAMPAIGN", "WHATSAPP", "EMAIL", "WEB", "LANDING", "EVENT", "INFLUENCER", "OTHER"]).default("POST"),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "FINISHED", "ARCHIVED"]).default("ACTIVE"),
  published_at: nullableDateTime.optional().nullable(),
  starts_at: nullableDateTime.optional().nullable(),
  ends_at: nullableDateTime.optional().nullable(),
  budget_amount: z.number().min(0).default(0),
  currency: z.string().trim().max(12).default("COP"),
  creative_url: nullableText(800).optional(),
  source_url: nullableText(800).optional(),
  notes: nullableText(1600).optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const acquisitionChannelEffortPatchSchema = acquisitionChannelEffortSchema.partial();

const branchSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: slugSchema.optional(),
  branch_type: z.enum(["BRANCH", "CONSIGNMENT"]).default("BRANCH"),
  address: nullableText(220),
  contact_name: nullableText(160),
  contact_phone: nullableText(40),
  notes: nullableText(1000),
  is_active: z.boolean().optional().default(true),
});

const branchPatchSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  slug: slugSchema.optional(),
  branch_type: z.enum(["BRANCH", "CONSIGNMENT"]).optional(),
  address: nullableText(220).optional(),
  contact_name: nullableText(160).optional(),
  contact_phone: nullableText(40).optional(),
  notes: nullableText(1000).optional(),
  is_active: z.boolean().optional(),
});

const competitorProductSchema = z.object({
  competitor_id: z.string().uuid().optional().nullable(),
  competitor_name: z.string().trim().min(2).max(160),
  product_name: z.string().trim().min(2).max(180),
  unit_of_measure: nullableText(40).optional().default("unidad"),
  category: nullableText(120),
  competitor_price: z.number().min(0),
  previous_price: z.number().min(0).optional().nullable(),
  our_price: z.number().min(0).optional().nullable(),
  currency: z.string().trim().max(12).default("COP"),
  channel: nullableText(120),
  source_url: nullableText(500),
  evidence_image_url: nullableText(500),
  observed_at: nullableDateTime.optional().nullable(),
  availability: nullableText(120),
  promotion_label: nullableText(180),
  own_product_name: nullableText(180),
  competitiveness_level: nullableText(80),
  notes: nullableText(1500),
  is_active: z.boolean().optional().default(true),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const competitorProductPatchSchema = competitorProductSchema.partial();

const competitorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  logo_url: nullableText(500),
  image_url: nullableText(500),
  category: nullableText(120),
  business_type: nullableText(120),
  city: nullableText(120),
  address: nullableText(220),
  operation_zone: nullableText(160),
  website: nullableText(500),
  instagram: nullableText(180),
  facebook: nullableText(180),
  tiktok: nullableText(180),
  whatsapp_public: nullableText(80),
  phone: nullableText(80),
  email: z.preprocess(
    (value) => {
      const text = String(value ?? "").trim();
      return text ? text : null;
    },
    z.string().email().max(180).nullable()
  ),
  status: z.enum(["ACTIVE", "INACTIVE", "POTENTIAL", "INDIRECT"]).default("ACTIVE"),
  threat_level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  target_segment: nullableText(220),
  price_range: nullableText(120),
  main_products: nullableText(800),
  main_services: nullableText(800),
  perceived_differential: nullableText(1200),
  value_proposition: nullableText(1200),
  strengths: nullableText(1500),
  weaknesses: nullableText(1500),
  sales_channels: nullableText(800),
  acquisition_channels: nullableText(800),
  digital_presence_level: nullableText(80),
  physical_presence_level: nullableText(80),
  perceived_quality: nullableText(80),
  response_speed: nullableText(80),
  commercial_aggressiveness: nullableText(80),
  competes_price: z.boolean().optional().default(false),
  competes_quality: z.boolean().optional().default(false),
  competes_location: z.boolean().optional().default(false),
  competes_brand: z.boolean().optional().default(false),
  competes_experience: z.boolean().optional().default(false),
  competes_promotions: z.boolean().optional().default(false),
  competes_partnerships: z.boolean().optional().default(false),
  competes_social_media: z.boolean().optional().default(false),
  competes_events: z.boolean().optional().default(false),
  competes_financing: z.boolean().optional().default(false),
  swot_opportunities: nullableText(2000).optional(),
  swot_threats: nullableText(2000).optional(),
  better_than_us: nullableText(1500).optional(),
  we_do_better: nullableText(1500).optional(),
  response_plan: nullableText(2000).optional(),
  recommended_campaign: nullableText(1500).optional(),
  product_to_adjust: nullableText(1000).optional(),
  price_to_review: nullableText(1000).optional(),
  message_to_reinforce: nullableText(1500).optional(),
  notes: nullableText(2000),
  is_active: z.boolean().optional().default(true),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const competitorPatchSchema = competitorSchema.partial();

const competitorFindingSchema = z.object({
  competitor_id: z.string().uuid().optional().nullable(),
  finding_type: z.enum(["PRICE", "PRODUCT", "PROMOTION", "CAMPAIGN", "EVENT", "BENEFIT", "CHANNEL", "SOCIAL", "PARTNERSHIP", "LAUNCH", "MESSAGE", "OTHER"]).default("OTHER"),
  title: z.string().trim().min(2).max(180),
  description: nullableText(2000),
  impact_level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  suggested_action: nullableText(1500),
  detected_at: nullableDateTime.optional().nullable(),
  evidence_url: nullableText(500),
  evidence_image_url: nullableText(500),
  due_at: nullableDateTime.optional().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "ARCHIVED"]).default("OPEN"),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  area_affected: z.enum(["PRICE", "PRODUCT", "CAMPAIGN", "BRAND", "CHANNEL", "EVENT", "SALES", "SERVICE", "EXPERIENCE", "LOYALTY", "PARTNERSHIPS", "REVENUE", "OTHER"]).default("OTHER"),
  responsible_name: nullableText(160),
  source_type: z.enum(["MANUAL", "WEBSITE", "SOCIAL", "SCREENSHOT", "PHOTO", "CUSTOMER", "SELLER", "EVENT", "PHYSICAL_VISIT", "WHATSAPP", "CATALOG", "AD", "EMAIL", "POST", "OTHER"]).default("MANUAL"),
  source_description: nullableText(1000),
  source_checked_at: nullableDateTime.optional().nullable(),
  source_reliability: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  is_threat: z.boolean().optional().default(false),
  is_opportunity: z.boolean().optional().default(false),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const competitorFindingPatchSchema = competitorFindingSchema.partial();

const competitorCampaignSchema = z.object({
  competitor_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(180),
  campaign_type: z.enum(["DISCOUNT", "TWO_FOR_ONE", "EVENT", "RAFFLE", "REFERRALS", "LAUNCH", "SEASONAL", "PARTNERSHIP", "INFLUENCER", "GIFT_CARD", "POST_SALE_BENEFIT", "PROMO_BUNDLE", "PHYSICAL_ACTIVATION", "OTHER"]).default("OTHER"),
  starts_at: nullableDateTime.optional().nullable(),
  ends_at: nullableDateTime.optional().nullable(),
  channel: nullableText(160),
  offer: nullableText(1000),
  benefit: nullableText(1000),
  target_audience: nullableText(800),
  main_message: nullableText(1200),
  evidence_image_url: nullableText(500),
  source_url: nullableText(500),
  source_type: z.enum(["MANUAL", "WEBSITE", "SOCIAL", "SCREENSHOT", "PHOTO", "CUSTOMER", "SELLER", "EVENT", "PHYSICAL_VISIT", "WHATSAPP", "CATALOG", "AD", "EMAIL", "POST", "OTHER"]).default("MANUAL"),
  source_reliability: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  aggressiveness_level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  estimated_impact: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  suggested_action: nullableText(1500),
  status: z.enum(["ACTIVE", "PAUSED", "FINISHED", "ARCHIVED"]).default("ACTIVE"),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const competitorCampaignPatchSchema = competitorCampaignSchema.partial();

const competitorEventSchema = z.object({
  competitor_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(180),
  event_date: nullableDateTime.optional().nullable(),
  place: nullableText(220),
  city: nullableText(120),
  event_type: z.enum(["FAIR", "LAUNCH", "STORE_ACTIVATION", "PRIVATE_EVENT", "PARTNERSHIP", "MALL", "CORPORATE", "EDUCATIONAL", "SEASONAL", "INFLUENCER_MEETUP", "POP_UP", "OTHER"]).default("OTHER"),
  organizer: nullableText(180),
  competitor_participation: nullableText(1000),
  presented_offer: nullableText(1000),
  highlighted_products: nullableText(1000),
  attendee_audience: nullableText(800),
  evidence_url: nullableText(500),
  evidence_image_url: nullableText(500),
  observations: nullableText(1500),
  detected_opportunity: nullableText(1500),
  recommended_action: nullableText(1500),
  source_type: z.enum(["MANUAL", "WEBSITE", "SOCIAL", "SCREENSHOT", "PHOTO", "CUSTOMER", "SELLER", "EVENT", "PHYSICAL_VISIT", "WHATSAPP", "CATALOG", "AD", "EMAIL", "POST", "OTHER"]).default("MANUAL"),
  source_reliability: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  status: z.enum(["ACTIVE", "DONE", "ARCHIVED"]).default("ACTIVE"),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const competitorEventPatchSchema = competitorEventSchema.partial();

const competitorTaskSchema = z.object({
  competitor_id: z.string().uuid().optional().nullable(),
  finding_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(180),
  responsible_name: nullableText(160),
  due_at: nullableDateTime.optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "ARCHIVED"]).default("OPEN"),
  notes: nullableText(1500),
  related_campaign_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const competitorTaskPatchSchema = competitorTaskSchema.partial();

const normalizeManualLeadPriority = (value) => String(value || "MEDIUM").trim().toUpperCase() === "URGENT" ? "HIGH" : value;

const manualLeadSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.preprocess(
    (value) => {
      const text = String(value ?? "").trim();
      return text ? text : null;
    },
    z.string().email().max(180).nullable()
  ),
  phone: nullableText(40),
  document_type: z.enum(["CC", "CE", "TI", "NIT", "PASSPORT", "PEP", "OTHER"]).optional().nullable(),
  document_id: nullableText(80),
  company: nullableText(180),
  job_title: nullableText(160),
  source: z.string().trim().min(2).max(120).default("Manual"),
  source_detail: nullableText(220),
  branch_id: z.string().uuid().optional().nullable(),
  commercial_owner_user_id: z.string().uuid().optional().nullable(),
  acquisition_channel_id: z.string().uuid().optional().nullable(),
  acquisition_channel: nullableText(180),
  interest: nullableText(500),
  importance_reason: nullableText(1000),
  preferred_channel: nullableText(120),
  preferred_contact_time: nullableText(120),
  status: z.enum(["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "LOST"]).default("NEW"),
  priority: z.preprocess(normalizeManualLeadPriority, z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")),
  notes: nullableText(2000),
});

const manualLeadPatchSchema = manualLeadSchema;

const manualLeadCsvRowSchema = manualLeadSchema.partial({
  source: true,
  status: true,
  priority: true,
}).extend({
  name: z.string().trim().min(2).max(160),
  source: z.string().trim().min(2).max(120).default("CSV import"),
  status: z.enum(["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "LOST"]).default("NEW"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

const manualLeadCsvImportSchema = z.object({
  source: z.string().trim().min(2).max(120).default("CSV import"),
  source_detail: nullableText(220),
  contacts: z.array(manualLeadCsvRowSchema).min(1).max(500),
});

const manualContactCampaignSchema = z.object({
  campaign_id: z.string().uuid(),
  channel: nullableText(120),
  acquisition_source: nullableText(120),
  notes: nullableText(1000),
});

const PREPAID_LEAD_SAMPLE_LIMIT = 20;

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

async function commercialOwnerForBusiness(businessId, userId, db = query) {
  if (!userId) return null;
  const result = await db(
    `select id, full_name, email, role
       from app_users
      where id = $1
        and business_id = $2
        and is_active = true
        and role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'VALIDATOR')`,
    [userId, businessId]
  );
  if (!result.rowCount) throw badRequest("El responsable comercial no existe o no está activo en este negocio.");
  return result.rows[0];
}

function requireBusinessOwner(req) {
  if (!["BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"].includes(req.user?.role)) {
    throw forbidden("Tu rol no puede administrar usuarios de este negocio.");
  }
}

async function activeUserCountsForBusiness(businessId) {
  const result = await query(
    `select
       count(*) filter (where role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'VALIDATOR'))::int as users,
       count(*) filter (where role = 'VALIDATOR')::int as validators
     from app_users
     where business_id = $1 and is_active = true`,
    [businessId]
  );
  return result.rows[0] || { users: 0, validators: 0 };
}

async function activeBranchCountForBusiness(businessId) {
  const result = await query(
    "select count(*)::int as total from branches where business_id = $1 and is_active = true",
    [businessId]
  );
  return Number(result.rows[0]?.total || 0);
}

async function uniqueBranchSlug(businessId, baseSlug) {
  const base = slugify(baseSlug) || "branch";
  for (let index = 0; index < 50; index += 1) {
    const candidate = index ? `${base}-${index + 1}` : base;
    const existing = await query(
      "select id from branches where business_id = $1 and slug = $2",
      [businessId, candidate]
    );
    if (!existing.rowCount) return candidate;
  }
  return `${base}-${Date.now()}`;
}

async function requireCampaignForBusiness(campaignId, businessId) {
  const result = await query(
    `select id, business_id, status, starts_at, ends_at, launch_channels, budget_total,
            expected_sales_goal, expected_leads_goal, expected_redemptions_goal,
            objective, client_notes, delivered_assets
     from campaigns
     where id = $1 and business_id = $2`,
    [campaignId, businessId]
  );
  const campaign = result.rows[0];
  if (!campaign) {
    throw notFound("Campaign not found.");
  }
  return campaign;
}

function assertClientSetupEditable(status) {
  if (!["READY_FOR_CLIENT_SETUP", "SCHEDULED"].includes(status)) {
    throw badRequest("This campaign cannot be configured by the client in its current status.");
  }
}

function buildValidatorUrl(token) {
  const target = new URL("/empresa/", env.publicAppUrl || "http://localhost:3000");
  target.searchParams.set("view", "validator");
  target.searchParams.set("token", token);
  return target.toString();
}

async function businessAccess(req, res, next) {
  try {
    res.json({ access: await getBusinessAccess(businessIdFor(req)) });
  } catch (error) {
    next(error);
  }
}

async function ticketBalance(req, res, next) {
  try {
    const result = await query(
      `select a.*,
              coalesce((
                select sum(l.delta_qr)::int
                from business_qr_credit_ledger l
                where l.business_id = a.business_id
                  and l.delta_qr > 0
                  and (
                    lower(coalesce(l.public_label, '')) like '%cortesia%'
                    or lower(coalesce(l.notes, '')) like '%cortesia%'
                  )
              ), 0)::int as qr_courtesy_total
       from business_qr_credit_accounts a
       where a.business_id = $1`,
      [businessIdFor(req)]
    );
    res.json({ ticket_account: mapPublicCreditAccount(result.rows[0]) });
  } catch (error) {
    next(error);
  }
}

async function ticketTransactions(req, res, next) {
  try {
    const result = await query(
      `select id, entry_type, package_size, delta_qr, balance_after, public_label, notes, created_at
       from business_qr_credit_ledger
       where business_id = $1
       order by created_at desc
       limit 80`,
      [businessIdFor(req)]
    );
    res.json({ transactions: result.rows });
  } catch (error) {
    next(error);
  }
}

async function getCampaignCapturedLeadRows(businessId, campaignId, limit = null) {
  const limitClause = limit ? "limit $3" : "";
  const params = limit ? [businessId, campaignId, limit] : [businessId, campaignId];
  const result = await query(
    `select p.id, p.name, p.document_id, p.phone, p.email, p.created_at,
            coalesce(
              case when latest_capture.id is not null then concat_ws(' · ',
                'Descarga de activo digital',
                case when nullif(latest_capture.asset_title, '') is not null then 'Activo: ' || latest_capture.asset_title end
              ) end,
              case
                when p.metadata->>'source_key' = 'descarga_activo_digital'
                  or (lower(coalesce(p.metadata->>'source', '')) = 'captura_relampago' and nullif(p.metadata->>'asset_title', '') is not null)
                then concat_ws(' · ', 'Descarga de activo digital', case when nullif(p.metadata->>'asset_title', '') is not null then 'Activo: ' || (p.metadata->>'asset_title') end)
              end,
              qn.answers->>'source',
              p.metadata->>'source',
              '-'
            ) as lead_source,
            coalesce(qn.answers->>'favorite_product', p.metadata->>'favorite_product', '-') as favorite_product,
            coalesce(qn.answers->>'purchase_intent', p.metadata->>'purchase_intent', '-') as purchase_intent,
            coalesce(qn.answers->>'gift_budget', p.metadata->>'gift_budget', '-') as gift_budget,
            coalesce(qn.answers->>'purchase_window', p.metadata->>'purchase_window', '-') as purchase_window,
            coalesce(qn.answers->>'preferred_channel', p.metadata->>'preferred_channel', '-') as preferred_channel,
            coalesce(qn.answers->>'style_preference', p.metadata->>'style_preference', '-') as style_preference,
            coalesce(qn.answers->>'usage_context', p.metadata->>'usage_context', '-') as usage_context,
            coalesce(qn.answers->>'preferred_contact_time', p.metadata->>'preferred_contact_time', '-') as preferred_contact_time,
            q.id as qr_code_id, q.status as qr_status, q.redeemed_at,
            r.name as reward_name
     from players p
     left join qr_codes q on q.player_id = p.id
     left join lateral (
       select s.id, s.campaign_id, da.title as asset_title
       from lead_capture_submissions s
       left join digital_assets da on da.id = s.asset_id
       where s.business_id = p.business_id
         and s.lead_id = p.id
         and s.campaign_id = $2
       order by s.created_at desc
       limit 1
     ) latest_capture on true
     left join lateral (
       select answers
       from questionnaires
       where player_id = p.id
       order by created_at desc
       limit 1
     ) qn on true
     left join rewards r on r.id = q.reward_id
     where p.business_id = $1 and (p.campaign_id = $2 or latest_capture.id is not null)
     order by p.created_at desc
     ${limitClause}`,
    params
  );
  return result.rows;
}

async function getCampaignManualContactRows(businessId, campaignId, limit = null) {
  const limitClause = limit ? "limit $3" : "";
  const params = limit ? [businessId, campaignId, limit] : [businessId, campaignId];
  const result = await query(
    `select ml.id, 'MANUAL'::text as source_type, ml.name, null::text as document_id, ml.phone, ml.email,
            cmc.created_at,
            coalesce(nullif(cmc.channel, ''), nullif(ml.preferred_channel, ''), nullif(ml.source, ''), 'Directorio') as channel,
            concat_ws(' - ', 'Directorio de contactos', nullif(cmc.channel, ''), nullif(ml.source, ''), nullif(c.name, '')) as lead_source,
            coalesce(nullif(ml.interest, ''), ml.company, '-') as favorite_product,
            coalesce(nullif(ml.importance_reason, ''), nullif(ml.notes, ''), '-') as purchase_intent,
            '-'::text as gift_budget,
            coalesce(nullif(ml.preferred_contact_time, ''), '-') as purchase_window,
            coalesce(nullif(ml.preferred_channel, ''), '-') as preferred_channel,
            '-'::text as style_preference,
            coalesce(nullif(ml.company, ''), '-') as usage_context,
            coalesce(nullif(ml.preferred_contact_time, ''), '-') as preferred_contact_time,
            null::uuid as qr_code_id,
            null::text as qr_status,
            null::timestamptz as redeemed_at,
            'Contacto asociado desde directorio'::text as reward_name
     from campaign_manual_contacts cmc
     join business_manual_leads ml on ml.id = cmc.manual_lead_id and ml.business_id = cmc.business_id
     join campaigns c on c.id = cmc.campaign_id and c.business_id = cmc.business_id
     where cmc.business_id = $1
       and cmc.campaign_id = $2
       and cmc.status = 'ACTIVE'
     order by cmc.created_at desc
     ${limitClause}`,
    params
  );
  return result.rows;
}

async function getCampaignLeadRows(businessId, campaignId, limit = null) {
  const [captured, manualContacts] = await Promise.all([
    getCampaignCapturedLeadRows(businessId, campaignId, limit),
    getCampaignManualContactRows(businessId, campaignId, limit),
  ]);
  const rows = [...captured, ...manualContacts].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return limit ? rows.slice(0, Number(limit)) : rows;
}

function csvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function leadsToCsv(rows) {
  const headers = [
    "nombre",
    "documento",
    "telefono",
    "email",
    "fecha",
    "origen",
    "producto_favorito",
    "intencion_compra",
    "presupuesto",
    "ventana_compra",
    "canal_preferido",
    "estilo",
    "contexto",
    "hora_contacto",
    "estado_qr",
    "redimido_en",
    "beneficio",
  ];
  const lines = rows.map((row) => [
    row.name,
    row.document_id,
    row.phone,
    row.email,
    row.created_at,
    row.lead_source,
    row.favorite_product,
    row.purchase_intent,
    row.gift_budget,
    row.purchase_window,
    row.preferred_channel,
    row.style_preference,
    row.usage_context,
    row.preferred_contact_time,
    row.qr_status,
    row.redeemed_at,
    row.reward_name,
  ].map(csvValue).join(","));
  return [headers.join(","), ...lines].join("\n");
}

function cleanSetting(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function riskRecoveryAuthorizationsFromSettings(settings = {}) {
  const configured = settings?.rms_risk_recovery_authorizations || {};
  return {
    discount: {
      enabled: Boolean(configured.discount?.enabled),
      max_percent: Math.min(100, Math.max(0, Number(configured.discount?.max_percent || 0))),
    },
    two_for_one: {
      enabled: Boolean(configured.two_for_one?.enabled),
      label: cleanSetting(configured.two_for_one?.label),
    },
    gift: {
      enabled: Boolean(configured.gift?.enabled),
      label: cleanSetting(configured.gift?.label),
    },
    benefits: Array.isArray(configured.benefits) ? configured.benefits.map((benefit, index) => ({
      id: cleanSetting(benefit?.id) || `benefit-${index + 1}`,
      enabled: benefit?.enabled !== false,
      type: cleanSetting(benefit?.type).toUpperCase() || "OTHER",
      label: cleanSetting(benefit?.label),
      value: Math.max(0, Number(benefit?.value || 0)),
      detail: cleanSetting(benefit?.detail),
    })).filter((benefit) => benefit.label) : [],
  };
}

function wantsLogoPayload(req) {
  return ["1", "true", "yes"].includes(String(req.query.includeLogo || "").toLowerCase());
}

function businessProfileFromRow(row, user = null, options = {}) {
  const settings = row.settings || {};
  const includeLogo = Boolean(options.includeLogo);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    nit: settings.nit || "",
    slogan: settings.slogan || settings.tagline || "",
    contact_name: settings.contact_name || "",
    contact_email: settings.contact_email || settings.email || "",
    communication_sender_name: settings.communication_sender_name || row.name || "",
    communication_sender_email: settings.communication_sender_email || "",
    phone: settings.phone || "",
    website: settings.website || "",
    city: settings.city || "",
    address: settings.address || "",
    affiliate_points: rulesFromSettings(settings),
    rms_risk_recovery_authorizations: riskRecoveryAuthorizationsFromSettings(settings),
    commercial_deal: settings.commercial_deal || null,
    logo_data_url: includeLogo ? (settings.logo_data_url || "") : "",
    has_logo_data_url: Boolean(row.has_logo_data_url ?? settings.logo_data_url),
    logo_url: settings.logo_url || "",
    ticket_frame_data_url: includeLogo ? (settings.ticket_frame_data_url || "") : "",
    has_ticket_frame_data_url: Boolean(row.has_ticket_frame_data_url ?? settings.ticket_frame_data_url),
    ticket_frame_url: settings.ticket_frame_url || "",
    current_user: user ? {
      id: user.id,
      business_id: user.business_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      branch_id: user.branch_id,
      can_redeem_cross_business: Boolean(user.can_redeem_cross_business),
    } : null,
  };
}

async function getBusinessProfile(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const includeLogo = wantsLogoPayload(req);
    const settingsSelect = includeLogo ? "settings" : "settings - 'logo_data_url' - 'ticket_frame_data_url'";
    const result = await query(
      `select id, name, slug, ${settingsSelect} as settings,
              nullif(settings->>'logo_data_url', '') is not null as has_logo_data_url,
              nullif(settings->>'ticket_frame_data_url', '') is not null as has_ticket_frame_data_url
       from businesses
       where id = $1 and is_active = true`,
      [businessId]
    );
    const business = result.rows[0];
    if (!business) {
      throw notFound("Business not found.");
    }
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    const creditResult = await query(
      "select * from business_qr_credit_accounts where business_id = $1",
      [businessId]
    );
    res.json({
      business: businessProfileFromRow(business, req.user, { includeLogo }),
      subscription: await getBusinessSubscription(businessId),
      credit_account: mapPublicCreditAccount(creditResult.rows[0]),
    });
  } catch (error) {
    next(error);
  }
}

async function commandCenterAnalytics(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const analytics = await getCommandCenterAnalytics(businessId, req.query);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
}

async function businessActivity(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const result = await query(
      `select greatest(
         coalesce((select max(created_at) from qr_codes where business_id = $1), '-infinity'::timestamptz),
         coalesce((select max(created_at) from qr_event_logs where business_id = $1), '-infinity'::timestamptz),
         coalesce((select max(created_at) from validation_logs where business_id = $1), '-infinity'::timestamptz),
         coalesce((select max(claimed_at) from qr_claims where business_id = $1), '-infinity'::timestamptz),
         coalesce((select max(redeemed_at) from redemptions where business_id = $1), '-infinity'::timestamptz),
         coalesce((select max(created_at) from business_sales where business_id = $1), '-infinity'::timestamptz),
         coalesce((select max(updated_at) from campaigns where business_id = $1), '-infinity'::timestamptz)
       ) as last_event_at`,
      [businessId]
    );

    const row = result.rows[0] || {};
    const lastEventAt = row.last_event_at && Number.isFinite(new Date(row.last_event_at).getTime())
      ? new Date(row.last_event_at).toISOString()
      : null;
    res.json({
      activity: {
        business_id: businessId,
        total_events: null,
        last_event_at: lastEventAt,
        event_counts: {},
        version: lastEventAt || "none",
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateBusinessProfile(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(businessProfileSchema, req.body);
    const existing = await query(
      "select id, name, settings from businesses where id = $1 and is_active = true",
      [businessId]
    );
    const current = existing.rows[0];
    if (!current) {
      throw notFound("Business not found.");
    }

    const settingsPatch = {};
    [
      "contact_name",
      "slogan",
      "contact_email",
      "communication_sender_name",
      "communication_sender_email",
      "phone",
      "website",
      "city",
      "address",
      "logo_data_url",
      "ticket_frame_data_url",
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        settingsPatch[key] = cleanSetting(body[key]);
      }
    });
    if (Object.prototype.hasOwnProperty.call(body, "logo_data_url") || Object.prototype.hasOwnProperty.call(body, "ticket_frame_data_url")) {
      const currentMediaBytes = Buffer.byteLength(current.settings?.logo_data_url || "") + Buffer.byteLength(current.settings?.ticket_frame_data_url || "");
      const nextMediaBytes = Buffer.byteLength(Object.prototype.hasOwnProperty.call(body, "logo_data_url") ? (body.logo_data_url || "") : (current.settings?.logo_data_url || ""))
        + Buffer.byteLength(Object.prototype.hasOwnProperty.call(body, "ticket_frame_data_url") ? (body.ticket_frame_data_url || "") : (current.settings?.ticket_frame_data_url || ""));
      await assertStorageQuotaForUpload(businessId, Math.max(0, nextMediaBytes - currentMediaBytes));
    }
    if (
      Object.prototype.hasOwnProperty.call(body, "affiliate_point_amount_cop")
      || Object.prototype.hasOwnProperty.call(body, "affiliate_referral_points_rate")
      || Object.prototype.hasOwnProperty.call(body, "affiliate_referral_points_rounding")
      || Object.prototype.hasOwnProperty.call(body, "affiliate_referral_registration_points")
      || Object.prototype.hasOwnProperty.call(body, "affiliate_referral_purchase_points")
    ) {
      const currentSettings = await query(
        "select settings from businesses where id = $1 and is_active = true",
        [businessId]
      );
      const currentAffiliatePoints = currentSettings.rows[0]?.settings?.affiliate_points || {};
      settingsPatch.affiliate_points = {
        ...currentAffiliatePoints,
        point_amount_cop: Number(body.affiliate_point_amount_cop || currentAffiliatePoints.point_amount_cop || 1000),
        referral_rate: Number(body.affiliate_referral_points_rate || currentAffiliatePoints.referral_rate || 1),
        referral_rounding: body.affiliate_referral_points_rounding || currentAffiliatePoints.referral_rounding || "floor",
        referral_registration_points: Object.prototype.hasOwnProperty.call(body, "affiliate_referral_registration_points")
          ? Number(body.affiliate_referral_registration_points || 0)
          : Number(currentAffiliatePoints.referral_registration_points || 0),
        referral_purchase_points: Object.prototype.hasOwnProperty.call(body, "affiliate_referral_purchase_points")
          ? Number(body.affiliate_referral_purchase_points || 0)
          : Number(currentAffiliatePoints.referral_purchase_points || 0),
      };
    }
    if (Object.prototype.hasOwnProperty.call(body, "rms_risk_recovery_authorizations")) {
      settingsPatch.rms_risk_recovery_authorizations = riskRecoveryAuthorizationsFromSettings({
        rms_risk_recovery_authorizations: body.rms_risk_recovery_authorizations,
      });
    }

    const includeLogo = Object.prototype.hasOwnProperty.call(body, "logo_data_url")
      || Object.prototype.hasOwnProperty.call(body, "ticket_frame_data_url")
      || wantsLogoPayload(req);
    const returningSettings = includeLogo ? "settings" : "settings - 'logo_data_url' - 'ticket_frame_data_url'";
    const result = await query(
      `update businesses
       set name = $2,
           settings = coalesce(settings, '{}'::jsonb) || $3::jsonb,
           updated_at = now()
       where id = $1 and is_active = true
       returning id, name, slug, ${returningSettings} as settings,
                 nullif(settings->>'logo_data_url', '') is not null as has_logo_data_url,
                 nullif(settings->>'ticket_frame_data_url', '') is not null as has_ticket_frame_data_url`,
      [businessId, body.name || current.name, JSON.stringify(settingsPatch)]
    );
    const business = result.rows[0];
    res.json({
      business: businessProfileFromRow(business, req.user, {
        includeLogo,
      }),
    });
  } catch (error) {
    next(error);
  }
}

async function listBusinessUsers(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    requireBusinessOwner(req);
    const result = await query(
      `select id, business_id, email, full_name, role, branch_id,
              can_redeem_cross_business, is_active, deactivated_at, created_at, updated_at
       from app_users
       where business_id = $1
         and role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'VALIDATOR')
       order by
         case role when 'BUSINESS_OWNER' then 0 when 'BUSINESS_MANAGER' then 1 else 2 end,
         created_at asc`,
      [businessId]
    );
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createBusinessUser(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    requireBusinessOwner(req);
    const body = validate(businessUserSchema, req.body);

    const counts = await activeUserCountsForBusiness(businessId);
    await assertLimitForBusiness(businessId, "users", Number(counts.users || 0), "usuarios");
    if (body.role === "VALIDATOR") {
      await assertLimitForBusiness(businessId, "validators", Number(counts.validators || 0), "validadores");
    }

    const existing = await query(
      "select id from app_users where lower(email) = lower($1) limit 1",
      [body.email]
    );
    if (existing.rowCount) {
      throw badRequest("Ya existe un usuario registrado con este correo.");
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const result = await query(
      `insert into app_users (business_id, email, password_hash, full_name, role, can_redeem_cross_business, is_active)
       values ($1, $2, $3, $4, $5::user_role, false, true)
       returning id, business_id, email, full_name, role, branch_id,
                 can_redeem_cross_business, is_active, created_at, updated_at`,
      [businessId, body.email, passwordHash, body.full_name, body.role]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateBusinessUser(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    requireBusinessOwner(req);
    const body = validate(businessUserPatchSchema, req.body);
    if (req.user?.role === "BUSINESS_MANAGER" && body.is_active === false) {
      throw forbidden("Tu rol puede agregar usuarios y operar el portal, pero no desactivar usuarios.");
    }
    if (req.params.userId === req.user.id && body.is_active === false) {
      throw badRequest("No puedes desactivar tu propio usuario activo.");
    }

    if (body.is_active) {
      const target = await query(
        "select id, role, is_active from app_users where id = $1 and business_id = $2",
        [req.params.userId, businessId]
      );
      if (!target.rowCount) {
        throw notFound("Usuario no encontrado para este negocio.");
      }
      if (!target.rows[0].is_active) {
        const counts = await activeUserCountsForBusiness(businessId);
        await assertLimitForBusiness(businessId, "users", Number(counts.users || 0), "usuarios");
        if (target.rows[0].role === "VALIDATOR") {
          await assertLimitForBusiness(businessId, "validators", Number(counts.validators || 0), "validadores");
        }
      }
    }

    const result = await query(
      `update app_users
       set is_active = $3,
           deactivated_at = case when $3 then null else coalesce(deactivated_at, now()) end,
           updated_at = now()
       where id = $1
         and business_id = $2
         and role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'VALIDATOR')
       returning id, business_id, email, full_name, role, branch_id,
                 can_redeem_cross_business, is_active, deactivated_at, created_at, updated_at`,
      [req.params.userId, businessId, body.is_active]
    );
    if (!result.rowCount) {
      throw notFound("Usuario no encontrado para este negocio.");
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function listBranches(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const result = await query(
      `select id, business_id, name, slug, address, is_active, metadata, created_at, updated_at
       from branches
       where business_id = $1
       order by is_active desc, name asc`,
      [businessId]
    );
    res.set("Cache-Control", "private, no-store");
    res.json({ branches: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createBranch(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    requireBusinessOwner(req);
    const body = validate(branchSchema, req.body);
    if (body.is_active !== false) {
      await assertLimitForBusiness(
        businessId,
        "branches",
        await activeBranchCountForBusiness(businessId),
        "sedes o puntos de consignación"
      );
    }
    const slug = await uniqueBranchSlug(businessId, body.slug || body.name);
    const metadata = {
      branch_type: body.branch_type,
      contact_name: body.contact_name || "",
      contact_phone: body.contact_phone || "",
      notes: body.notes || "",
    };
    const result = await query(
      `insert into branches (business_id, name, slug, address, is_active, metadata)
       values ($1, $2, $3, $4, $5, $6::jsonb)
       returning id, business_id, name, slug, address, is_active, metadata, created_at, updated_at`,
      [
        businessId,
        body.name,
        slug,
        body.address || null,
        body.is_active !== false,
        JSON.stringify(metadata),
      ]
    );
    res.status(201).json({ branch: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateBranch(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    requireBusinessOwner(req);
    const body = validate(branchPatchSchema, req.body);
    const existing = await query(
      "select id, is_active, metadata from branches where id = $1 and business_id = $2",
      [req.params.branchId, businessId]
    );
    if (!existing.rowCount) {
      throw notFound("Branch not found.");
    }
    if (body.is_active === true && existing.rows[0].is_active === false) {
      await assertLimitForBusiness(
        businessId,
        "branches",
        await activeBranchCountForBusiness(businessId),
        "sedes o puntos de consignación"
      );
    }
    const slug = body.slug ? await uniqueBranchSlug(businessId, body.slug) : null;
    const metadataPatch = {};
    if (Object.prototype.hasOwnProperty.call(body, "branch_type")) metadataPatch.branch_type = body.branch_type;
    if (Object.prototype.hasOwnProperty.call(body, "contact_name")) metadataPatch.contact_name = body.contact_name || "";
    if (Object.prototype.hasOwnProperty.call(body, "contact_phone")) metadataPatch.contact_phone = body.contact_phone || "";
    if (Object.prototype.hasOwnProperty.call(body, "notes")) metadataPatch.notes = body.notes || "";
    const result = await query(
      `update branches
       set name = coalesce($3, name),
           slug = coalesce($4, slug),
           address = case when $5 then $6 else address end,
           is_active = case when $7 then $8 else is_active end,
           metadata = coalesce(metadata, '{}'::jsonb) || $9::jsonb,
           updated_at = now()
       where id = $1 and business_id = $2
       returning id, business_id, name, slug, address, is_active, metadata, created_at, updated_at`,
      [
        req.params.branchId,
        businessId,
        body.name || null,
        slug,
        Object.prototype.hasOwnProperty.call(body, "address"),
        body.address || null,
        Object.prototype.hasOwnProperty.call(body, "is_active"),
        body.is_active === true,
        JSON.stringify(metadataPatch),
      ]
    );
    res.json({ branch: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function deleteBranch(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    requireBusinessOwner(req);
    const result = await query(
      `update branches
       set is_active = false,
           updated_at = now()
       where id = $1 and business_id = $2
       returning id, business_id, name, slug, address, is_active, metadata, created_at, updated_at`,
      [req.params.branchId, businessId]
    );
    if (!result.rowCount) {
      throw notFound("Branch not found.");
    }
    res.json({ branch: result.rows[0], deleted: false, archived: true });
  } catch (error) {
    next(error);
  }
}

const competitorColumns = [
  "name",
  "logo_url",
  "image_url",
  "category",
  "business_type",
  "city",
  "address",
  "operation_zone",
  "website",
  "instagram",
  "facebook",
  "tiktok",
  "whatsapp_public",
  "phone",
  "email",
  "status",
  "threat_level",
  "target_segment",
  "price_range",
  "main_products",
  "main_services",
  "perceived_differential",
  "value_proposition",
  "strengths",
  "weaknesses",
  "sales_channels",
  "acquisition_channels",
  "digital_presence_level",
  "physical_presence_level",
  "perceived_quality",
  "response_speed",
  "commercial_aggressiveness",
  "competes_price",
  "competes_quality",
  "competes_location",
  "competes_brand",
  "competes_experience",
  "competes_promotions",
  "competes_partnerships",
  "competes_social_media",
  "competes_events",
  "competes_financing",
  "swot_opportunities",
  "swot_threats",
  "better_than_us",
  "we_do_better",
  "response_plan",
  "recommended_campaign",
  "product_to_adjust",
  "price_to_review",
  "message_to_reinforce",
  "notes",
  "is_active",
  "metadata",
];

const competitorCampaignColumns = [
  "competitor_id",
  "name",
  "campaign_type",
  "starts_at",
  "ends_at",
  "channel",
  "offer",
  "benefit",
  "target_audience",
  "main_message",
  "evidence_image_url",
  "source_url",
  "source_type",
  "source_reliability",
  "aggressiveness_level",
  "estimated_impact",
  "suggested_action",
  "status",
  "metadata",
];

const competitorEventColumns = [
  "competitor_id",
  "name",
  "event_date",
  "place",
  "city",
  "event_type",
  "organizer",
  "competitor_participation",
  "presented_offer",
  "highlighted_products",
  "attendee_audience",
  "evidence_url",
  "evidence_image_url",
  "observations",
  "detected_opportunity",
  "recommended_action",
  "source_type",
  "source_reliability",
  "status",
  "metadata",
];

const competitorTaskColumns = [
  "competitor_id",
  "finding_id",
  "title",
  "responsible_name",
  "due_at",
  "priority",
  "status",
  "notes",
  "related_campaign_id",
  "metadata",
];

function radarSearchWhere(search, params, alias = "") {
  const text = String(search || "").trim();
  if (!text) return "";
  params.push(`%${text.toLowerCase()}%`);
  const index = params.length;
  const prefix = alias ? `${alias}.` : "";
  return `and (
    lower(${prefix}name) like $${index}
    or lower(coalesce(${prefix}category, '')) like $${index}
    or lower(coalesce(${prefix}city, '')) like $${index}
    or lower(coalesce(${prefix}operation_zone, '')) like $${index}
    or lower(coalesce(${prefix}target_segment, '')) like $${index}
    or lower(coalesce(${prefix}notes, '')) like $${index}
  )`;
}

async function assertCompetitorBelongsToBusiness(client, businessId, competitorId) {
  if (!competitorId) return null;
  const result = await client.query(
    "select id, name from business_competitors where id = $1 and business_id = $2 and is_active = true",
    [competitorId, businessId]
  );
  if (!result.rowCount) {
    throw badRequest("El competidor seleccionado no pertenece a este negocio o no esta activo.");
  }
  return result.rows[0];
}

async function resolveCompetitorForProduct(client, businessId, payload, userId) {
  if (payload.competitor_id) {
    return assertCompetitorBelongsToBusiness(client, businessId, payload.competitor_id);
  }
  const name = String(payload.competitor_name || "").trim();
  if (!name) return null;
  const existing = await client.query(
    "select id, name from business_competitors where business_id = $1 and lower(name) = lower($2) limit 1",
    [businessId, name]
  );
  if (existing.rowCount) return existing.rows[0];
  const created = await client.query(
    `insert into business_competitors
      (business_id, name, category, status, threat_level, created_by_user_id, metadata)
     values ($1, $2, $3, 'ACTIVE', 'MEDIUM', $4, $5::jsonb)
     returning id, name`,
    [businessId, name, payload.category || null, userId || null, JSON.stringify({ source: "product_price_capture" })]
  );
  return created.rows[0];
}

function competitorPayload(body, userId) {
  const payload = {};
  competitorColumns.forEach((column) => {
    if (column === "metadata") {
      payload.metadata = body.metadata || {};
      return;
    }
    if (Object.prototype.hasOwnProperty.call(body, column)) {
      payload[column] = body[column];
    }
  });
  if (!Object.prototype.hasOwnProperty.call(payload, "is_active")) payload.is_active = true;
  if (!Object.prototype.hasOwnProperty.call(payload, "status")) payload.status = "ACTIVE";
  if (!Object.prototype.hasOwnProperty.call(payload, "threat_level")) payload.threat_level = "MEDIUM";
  if (userId) payload.created_by_user_id = userId;
  return payload;
}

async function listCompetitors(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const limit = boundedLimit(req.query.limit, 300, 800);
    const params = [businessId];
    const searchWhere = radarSearchWhere(req.query.search, params, "c");
    const includeInactive = ["1", "true", "yes"].includes(String(req.query.include_inactive || "").toLowerCase());
    params.push(limit);
    const result = await query(
      `select c.*,
              count(distinct p.id)::int as product_count,
              count(distinct f.id)::int as finding_count,
              max(f.detected_at) as latest_finding_at
       from business_competitors c
       left join business_competitor_products p on p.competitor_id = c.id and p.business_id = c.business_id and p.is_active = true
       left join business_competitor_findings f on f.competitor_id = c.id and f.business_id = c.business_id and f.status <> 'ARCHIVED'
       where c.business_id = $1
         ${includeInactive ? "" : "and c.is_active = true"}
         ${searchWhere}
       group by c.id
       order by case c.threat_level when 'CRITICAL' then 0 when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end,
                c.updated_at desc
       limit $${params.length}`,
      params
    );
    res.json({ competitors: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createCompetitor(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorSchema, req.body);
    const payload = competitorPayload(body, req.user.id);
    const columns = ["business_id", ...Object.keys(payload)];
    const params = [businessId, ...Object.values(payload).map((value, index) => Object.keys(payload)[index] === "metadata" ? JSON.stringify(value || {}) : value)];
    const placeholders = columns.map((column, index) => `$${index + 1}${column === "metadata" ? "::jsonb" : ""}`);
    const result = await query(
      `insert into business_competitors (${columns.join(", ")})
       values (${placeholders.join(", ")})
       returning *`,
      params
    );
    res.status(201).json({ competitor: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateCompetitor(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorPatchSchema, req.body);
    const existing = await query(
      "select * from business_competitors where id = $1 and business_id = $2",
      [req.params.competitorId, businessId]
    );
    if (!existing.rowCount) throw notFound("Competidor no encontrado.");
    const payload = competitorPayload({ ...existing.rows[0], ...body }, null);
    const setClauses = competitorColumns.map((column, index) => (
      `${column} = $${index + 3}${column === "metadata" ? "::jsonb" : ""}`
    ));
    const params = [
      req.params.competitorId,
      businessId,
      ...competitorColumns.map((column) => column === "metadata" ? JSON.stringify(payload.metadata || {}) : payload[column]),
    ];
    const result = await query(
      `update business_competitors
       set ${setClauses.join(", ")},
           updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      params
    );
    res.json({ competitor: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function archiveCompetitor(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const result = await query(
      `update business_competitors
       set is_active = false, status = 'INACTIVE', updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [req.params.competitorId, businessId]
    );
    if (!result.rowCount) throw notFound("Competidor no encontrado.");
    res.json({ competitor: result.rows[0], archived: true });
  } catch (error) {
    next(error);
  }
}

function buildRadarPayload(columns, body, userId) {
  const payload = {};
  columns.forEach((column) => {
    if (column === "metadata") {
      payload.metadata = body.metadata || {};
      return;
    }
    if (Object.prototype.hasOwnProperty.call(body, column)) {
      payload[column] = body[column];
    }
  });
  if (userId) payload.created_by_user_id = userId;
  return payload;
}

function radarSearchFilter(search, params, fields) {
  const text = String(search || "").trim();
  if (!text) return "";
  params.push(`%${text.toLowerCase()}%`);
  const index = params.length;
  return `and (${fields.map((field) => `lower(coalesce(${field}, '')) like $${index}`).join(" or ")})`;
}

async function listCompetitorCampaigns(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const params = [businessId];
    const filters = [];
    if (req.query.competitor_id) {
      params.push(req.query.competitor_id);
      filters.push(`cc.competitor_id = $${params.length}`);
    }
    const includeArchived = ["1", "true", "yes"].includes(String(req.query.include_archived || "").toLowerCase());
    if (!includeArchived) filters.push("cc.status <> 'ARCHIVED'");
    const searchWhere = radarSearchFilter(req.query.search, params, ["cc.name", "cc.channel", "cc.offer", "cc.benefit", "cc.main_message", "c.name"]);
    params.push(boundedLimit(req.query.limit, 300, 800));
    const result = await query(
      `select cc.*, c.name as competitor_name, c.threat_level as competitor_threat_level
       from business_competitor_campaigns cc
       left join business_competitors c on c.id = cc.competitor_id and c.business_id = cc.business_id
       where cc.business_id = $1
         ${filters.length ? `and ${filters.join(" and ")}` : ""}
         ${searchWhere}
       order by coalesce(cc.starts_at, cc.created_at) desc, cc.updated_at desc
       limit $${params.length}`,
      params
    );
    res.json({ campaigns: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createCompetitorCampaign(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorCampaignSchema, req.body);
    const payload = buildRadarPayload(competitorCampaignColumns, body, req.user.id);
    const result = await withTransaction(async (client) => {
      await assertCompetitorBelongsToBusiness(client, businessId, payload.competitor_id);
      const columns = ["business_id", ...Object.keys(payload)];
      const params = [businessId, ...Object.keys(payload).map((column) => column === "metadata" ? JSON.stringify(payload[column] || {}) : payload[column])];
      const placeholders = columns.map((column, index) => `$${index + 1}${column === "metadata" ? "::jsonb" : ""}`);
      return client.query(
        `insert into business_competitor_campaigns (${columns.join(", ")})
         values (${placeholders.join(", ")})
         returning *`,
        params
      );
    });
    res.status(201).json({ campaign: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateCompetitorCampaign(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorCampaignPatchSchema, req.body);
    const existing = await query("select * from business_competitor_campaigns where id = $1 and business_id = $2", [req.params.campaignId, businessId]);
    if (!existing.rowCount) throw notFound("Campaña competitiva no encontrada.");
    const payload = buildRadarPayload(competitorCampaignColumns, { ...existing.rows[0], ...body }, null);
    const setClauses = competitorCampaignColumns.map((column, index) => `${column} = $${index + 3}${column === "metadata" ? "::jsonb" : ""}`);
    const params = [
      req.params.campaignId,
      businessId,
      ...competitorCampaignColumns.map((column) => column === "metadata" ? JSON.stringify(payload.metadata || {}) : payload[column]),
    ];
    const result = await withTransaction(async (client) => {
      await assertCompetitorBelongsToBusiness(client, businessId, payload.competitor_id);
      return client.query(
        `update business_competitor_campaigns
         set ${setClauses.join(", ")}, updated_at = now()
         where id = $1 and business_id = $2
         returning *`,
        params
      );
    });
    res.json({ campaign: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function archiveCompetitorCampaign(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const result = await query(
      `update business_competitor_campaigns
       set status = 'ARCHIVED', updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [req.params.campaignId, businessId]
    );
    if (!result.rowCount) throw notFound("Campaña competitiva no encontrada.");
    res.json({ campaign: result.rows[0], archived: true });
  } catch (error) {
    next(error);
  }
}

async function listCompetitorEvents(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const params = [businessId];
    const filters = [];
    if (req.query.competitor_id) {
      params.push(req.query.competitor_id);
      filters.push(`ce.competitor_id = $${params.length}`);
    }
    const includeArchived = ["1", "true", "yes"].includes(String(req.query.include_archived || "").toLowerCase());
    if (!includeArchived) filters.push("ce.status <> 'ARCHIVED'");
    const searchWhere = radarSearchFilter(req.query.search, params, ["ce.name", "ce.place", "ce.city", "ce.organizer", "ce.presented_offer", "ce.detected_opportunity", "c.name"]);
    params.push(boundedLimit(req.query.limit, 300, 800));
    const result = await query(
      `select ce.*, c.name as competitor_name, c.threat_level as competitor_threat_level
       from business_competitor_events ce
       left join business_competitors c on c.id = ce.competitor_id and c.business_id = ce.business_id
       where ce.business_id = $1
         ${filters.length ? `and ${filters.join(" and ")}` : ""}
         ${searchWhere}
       order by coalesce(ce.event_date, ce.created_at) desc, ce.updated_at desc
       limit $${params.length}`,
      params
    );
    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createCompetitorEvent(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorEventSchema, req.body);
    const payload = buildRadarPayload(competitorEventColumns, body, req.user.id);
    const result = await withTransaction(async (client) => {
      await assertCompetitorBelongsToBusiness(client, businessId, payload.competitor_id);
      const columns = ["business_id", ...Object.keys(payload)];
      const params = [businessId, ...Object.keys(payload).map((column) => column === "metadata" ? JSON.stringify(payload[column] || {}) : payload[column])];
      const placeholders = columns.map((column, index) => `$${index + 1}${column === "metadata" ? "::jsonb" : ""}`);
      return client.query(
        `insert into business_competitor_events (${columns.join(", ")})
         values (${placeholders.join(", ")})
         returning *`,
        params
      );
    });
    res.status(201).json({ event: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateCompetitorEvent(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorEventPatchSchema, req.body);
    const existing = await query("select * from business_competitor_events where id = $1 and business_id = $2", [req.params.eventId, businessId]);
    if (!existing.rowCount) throw notFound("Evento competitivo no encontrado.");
    const payload = buildRadarPayload(competitorEventColumns, { ...existing.rows[0], ...body }, null);
    const setClauses = competitorEventColumns.map((column, index) => `${column} = $${index + 3}${column === "metadata" ? "::jsonb" : ""}`);
    const params = [
      req.params.eventId,
      businessId,
      ...competitorEventColumns.map((column) => column === "metadata" ? JSON.stringify(payload.metadata || {}) : payload[column]),
    ];
    const result = await withTransaction(async (client) => {
      await assertCompetitorBelongsToBusiness(client, businessId, payload.competitor_id);
      return client.query(
        `update business_competitor_events
         set ${setClauses.join(", ")}, updated_at = now()
         where id = $1 and business_id = $2
         returning *`,
        params
      );
    });
    res.json({ event: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function archiveCompetitorEvent(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const result = await query(
      `update business_competitor_events
       set status = 'ARCHIVED', updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [req.params.eventId, businessId]
    );
    if (!result.rowCount) throw notFound("Evento competitivo no encontrado.");
    res.json({ event: result.rows[0], archived: true });
  } catch (error) {
    next(error);
  }
}

async function listCompetitorTasks(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const params = [businessId];
    const filters = [];
    if (req.query.competitor_id) {
      params.push(req.query.competitor_id);
      filters.push(`ct.competitor_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(String(req.query.status).toUpperCase());
      filters.push(`ct.status = $${params.length}`);
    } else {
      filters.push("ct.status <> 'ARCHIVED'");
    }
    params.push(boundedLimit(req.query.limit, 300, 800));
    const result = await query(
      `select ct.*, c.name as competitor_name, f.title as finding_title
       from business_competitor_tasks ct
       left join business_competitors c on c.id = ct.competitor_id and c.business_id = ct.business_id
       left join business_competitor_findings f on f.id = ct.finding_id and f.business_id = ct.business_id
       where ct.business_id = $1
         ${filters.length ? `and ${filters.join(" and ")}` : ""}
       order by ct.due_at asc nulls last, ct.updated_at desc
       limit $${params.length}`,
      params
    );
    res.json({ tasks: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createCompetitorTask(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorTaskSchema, req.body);
    const payload = buildRadarPayload(competitorTaskColumns, body, req.user.id);
    const result = await withTransaction(async (client) => {
      await assertCompetitorBelongsToBusiness(client, businessId, payload.competitor_id);
      const columns = ["business_id", ...Object.keys(payload)];
      const params = [businessId, ...Object.keys(payload).map((column) => column === "metadata" ? JSON.stringify(payload[column] || {}) : payload[column])];
      const placeholders = columns.map((column, index) => `$${index + 1}${column === "metadata" ? "::jsonb" : ""}`);
      return client.query(
        `insert into business_competitor_tasks (${columns.join(", ")})
         values (${placeholders.join(", ")})
         returning *`,
        params
      );
    });
    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateCompetitorTask(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorTaskPatchSchema, req.body);
    const existing = await query("select * from business_competitor_tasks where id = $1 and business_id = $2", [req.params.taskId, businessId]);
    if (!existing.rowCount) throw notFound("Tarea competitiva no encontrada.");
    const payload = buildRadarPayload(competitorTaskColumns, { ...existing.rows[0], ...body }, null);
    const setClauses = competitorTaskColumns.map((column, index) => `${column} = $${index + 3}${column === "metadata" ? "::jsonb" : ""}`);
    const params = [
      req.params.taskId,
      businessId,
      ...competitorTaskColumns.map((column) => column === "metadata" ? JSON.stringify(payload.metadata || {}) : payload[column]),
    ];
    const result = await withTransaction(async (client) => {
      await assertCompetitorBelongsToBusiness(client, businessId, payload.competitor_id);
      return client.query(
        `update business_competitor_tasks
         set ${setClauses.join(", ")}, updated_at = now()
         where id = $1 and business_id = $2
         returning *`,
        params
      );
    });
    res.json({ task: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function archiveCompetitorTask(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const result = await query(
      `update business_competitor_tasks
       set status = 'ARCHIVED', updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [req.params.taskId, businessId]
    );
    if (!result.rowCount) throw notFound("Tarea competitiva no encontrada.");
    res.json({ task: result.rows[0], archived: true });
  } catch (error) {
    next(error);
  }
}

function findingPayload(body, userId) {
  return {
    competitor_id: body.competitor_id || null,
    finding_type: body.finding_type || "OTHER",
    title: body.title,
    description: body.description || null,
    impact_level: body.impact_level || "MEDIUM",
    suggested_action: body.suggested_action || null,
    detected_at: body.detected_at || null,
    evidence_url: body.evidence_url || null,
    evidence_image_url: body.evidence_image_url || null,
    due_at: body.due_at || null,
    status: body.status || "OPEN",
    urgency: body.urgency || "MEDIUM",
    area_affected: body.area_affected || "OTHER",
    responsible_name: body.responsible_name || null,
    source_type: body.source_type || "MANUAL",
    source_description: body.source_description || null,
    source_checked_at: body.source_checked_at || null,
    source_reliability: body.source_reliability || "MEDIUM",
    is_threat: body.is_threat === true,
    is_opportunity: body.is_opportunity === true,
    metadata: body.metadata || {},
    created_by_user_id: userId || null,
  };
}

async function listCompetitorFindings(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const params = [businessId];
    const filters = [];
    if (req.query.competitor_id) {
      params.push(req.query.competitor_id);
      filters.push(`f.competitor_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(String(req.query.status).toUpperCase());
      filters.push(`f.status = $${params.length}`);
    } else {
      filters.push("f.status <> 'ARCHIVED'");
    }
    const search = String(req.query.search || "").trim();
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      filters.push(`(lower(f.title) like $${params.length} or lower(coalesce(f.description, '')) like $${params.length} or lower(coalesce(c.name, '')) like $${params.length})`);
    }
    params.push(boundedLimit(req.query.limit, 300, 800));
    const result = await query(
      `select f.*, c.name as competitor_name, c.threat_level as competitor_threat_level
       from business_competitor_findings f
       left join business_competitors c on c.id = f.competitor_id and c.business_id = f.business_id
       where f.business_id = $1
         ${filters.length ? `and ${filters.join(" and ")}` : ""}
       order by f.detected_at desc, f.updated_at desc
       limit $${params.length}`,
      params
    );
    res.json({ findings: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createCompetitorFinding(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorFindingSchema, req.body);
    const payload = findingPayload(body, req.user.id);
    const result = await withTransaction(async (client) => {
      await assertCompetitorBelongsToBusiness(client, businessId, payload.competitor_id);
      return client.query(
        `insert into business_competitor_findings
          (business_id, competitor_id, finding_type, title, description, impact_level, suggested_action,
           detected_at, evidence_url, evidence_image_url, due_at, status, urgency, area_affected,
           responsible_name, source_type, source_description, source_checked_at, source_reliability,
           is_threat, is_opportunity, metadata, created_by_user_id)
         values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::timestamptz, now()), $9, $10, $11::timestamptz,
                 $12, $13, $14, $15, $16, $17, $18::timestamptz, $19, $20, $21, $22::jsonb, $23)
         returning *`,
        [
          businessId,
          payload.competitor_id,
          payload.finding_type,
          payload.title,
          payload.description,
          payload.impact_level,
          payload.suggested_action,
          payload.detected_at,
          payload.evidence_url,
          payload.evidence_image_url,
          payload.due_at,
          payload.status,
          payload.urgency,
          payload.area_affected,
          payload.responsible_name,
          payload.source_type,
          payload.source_description,
          payload.source_checked_at,
          payload.source_reliability,
          payload.is_threat,
          payload.is_opportunity,
          JSON.stringify(payload.metadata),
          payload.created_by_user_id,
        ]
      );
    });
    res.status(201).json({ finding: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateCompetitorFinding(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorFindingPatchSchema, req.body);
    const existing = await query(
      "select * from business_competitor_findings where id = $1 and business_id = $2",
      [req.params.findingId, businessId]
    );
    if (!existing.rowCount) throw notFound("Hallazgo competitivo no encontrado.");
    const payload = findingPayload({ ...existing.rows[0], ...body }, null);
    const result = await withTransaction(async (client) => {
      await assertCompetitorBelongsToBusiness(client, businessId, payload.competitor_id);
      return client.query(
        `update business_competitor_findings
         set competitor_id = $3,
             finding_type = $4,
             title = $5,
             description = $6,
             impact_level = $7,
             suggested_action = $8,
             detected_at = coalesce($9::timestamptz, detected_at),
             evidence_url = $10,
             evidence_image_url = $11,
             due_at = $12::timestamptz,
             status = $13,
             urgency = $14,
             area_affected = $15,
             responsible_name = $16,
             source_type = $17,
             source_description = $18,
             source_checked_at = $19::timestamptz,
             source_reliability = $20,
             is_threat = $21,
             is_opportunity = $22,
             metadata = $23::jsonb,
             updated_at = now()
         where id = $1 and business_id = $2
         returning *`,
        [
          req.params.findingId,
          businessId,
          payload.competitor_id,
          payload.finding_type,
          payload.title,
          payload.description,
          payload.impact_level,
          payload.suggested_action,
          payload.detected_at,
          payload.evidence_url,
          payload.evidence_image_url,
          payload.due_at,
          payload.status,
          payload.urgency,
          payload.area_affected,
          payload.responsible_name,
          payload.source_type,
          payload.source_description,
          payload.source_checked_at,
          payload.source_reliability,
          payload.is_threat,
          payload.is_opportunity,
          JSON.stringify(payload.metadata),
        ]
      );
    });
    res.json({ finding: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function archiveCompetitorFinding(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const result = await query(
      `update business_competitor_findings
       set status = 'ARCHIVED', updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [req.params.findingId, businessId]
    );
    if (!result.rowCount) throw notFound("Hallazgo competitivo no encontrado.");
    res.json({ finding: result.rows[0], archived: true });
  } catch (error) {
    next(error);
  }
}

function competitorSearchWhere(search, params) {
  const text = String(search || "").trim();
  if (!text) return "";
  params.push(`%${text.toLowerCase()}%`);
  const index = params.length;
  return `and (
    lower(competitor_name) like $${index}
    or lower(product_name) like $${index}
    or lower(coalesce(category, '')) like $${index}
    or lower(coalesce(channel, '')) like $${index}
    or lower(coalesce(notes, '')) like $${index}
  )`;
}

function mapCompetitorProduct(row = {}) {
  const competitorPrice = Number(row.competitor_price || 0);
  const ourPrice = row.our_price === null || row.our_price === undefined ? null : Number(row.our_price || 0);
  const priceGap = ourPrice === null ? null : ourPrice - competitorPrice;
  return {
    ...row,
    competitor_price: competitorPrice,
    our_price: ourPrice,
    price_gap: priceGap,
    price_gap_percent: priceGap === null || competitorPrice <= 0 ? null : Number(((priceGap / competitorPrice) * 100).toFixed(2)),
  };
}

function competitorProductPayload(body, userId) {
  return {
    competitor_id: body.competitor_id || null,
    competitor_name: body.competitor_name,
    product_name: body.product_name,
    unit_of_measure: body.unit_of_measure || "unidad",
    category: body.category || null,
    competitor_price: Number(body.competitor_price || 0),
    previous_price: body.previous_price === null || body.previous_price === undefined ? null : Number(body.previous_price || 0),
    our_price: body.our_price === null || body.our_price === undefined ? null : Number(body.our_price || 0),
    currency: body.currency || "COP",
    channel: body.channel || null,
    source_url: body.source_url || null,
    evidence_image_url: body.evidence_image_url || null,
    observed_at: body.observed_at || null,
    availability: body.availability || null,
    promotion_label: body.promotion_label || null,
    own_product_name: body.own_product_name || null,
    competitiveness_level: body.competitiveness_level || null,
    notes: body.notes || null,
    is_active: body.is_active !== false,
    metadata: body.metadata || {},
    created_by_user_id: userId || null,
  };
}

async function listCompetitorProducts(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const limit = boundedLimit(req.query.limit, 300, 800);
    const params = [businessId];
    const searchWhere = competitorSearchWhere(req.query.search, params);
    const includeInactive = ["1", "true", "yes"].includes(String(req.query.include_inactive || "").toLowerCase());
    params.push(limit);
    const result = await query(
      `select p.*, c.name as linked_competitor_name, c.threat_level as linked_competitor_threat_level
       from business_competitor_products p
       left join business_competitors c on c.id = p.competitor_id and c.business_id = p.business_id
       where p.business_id = $1
         ${includeInactive ? "" : "and p.is_active = true"}
         ${searchWhere}
       order by p.observed_at desc, p.updated_at desc
       limit $${params.length}`,
      params
    );
    res.json({ products: result.rows.map(mapCompetitorProduct) });
  } catch (error) {
    next(error);
  }
}

async function createCompetitorProduct(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorProductSchema, req.body);
    const payload = competitorProductPayload(body, req.user.id);
    const result = await withTransaction(async (client) => {
      const competitor = await resolveCompetitorForProduct(client, businessId, payload, req.user.id);
      return client.query(
        `insert into business_competitor_products
          (business_id, competitor_id, competitor_name, product_name, unit_of_measure, category, competitor_price, previous_price, our_price,
           currency, channel, source_url, evidence_image_url, observed_at, availability, promotion_label,
           own_product_name, competitiveness_level, notes, is_active, metadata, created_by_user_id)
         values ($1, $2, coalesce($3, $4), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                 coalesce($15::timestamptz, now()), $16, $17, $18, $19, $20, $21, $22::jsonb, $23)
         returning *`,
        [
          businessId,
          competitor?.id || null,
          payload.competitor_name,
          competitor?.name || null,
          payload.product_name,
          payload.unit_of_measure,
          payload.category,
          payload.competitor_price,
          payload.previous_price,
          payload.our_price,
          payload.currency,
          payload.channel,
          payload.source_url,
          payload.evidence_image_url,
          payload.observed_at,
          payload.availability,
          payload.promotion_label,
          payload.own_product_name,
          payload.competitiveness_level,
          payload.notes,
          payload.is_active,
          JSON.stringify(payload.metadata),
          payload.created_by_user_id,
        ]
      );
    });
    res.status(201).json({ product: mapCompetitorProduct(result.rows[0]) });
  } catch (error) {
    next(error);
  }
}

async function updateCompetitorProduct(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const body = validate(competitorProductPatchSchema, req.body);
    const existing = await query(
      "select * from business_competitor_products where id = $1 and business_id = $2",
      [req.params.productId, businessId]
    );
    if (!existing.rowCount) throw notFound("Producto de competencia no encontrado.");
    const payload = competitorProductPayload({ ...existing.rows[0], ...body }, req.user.id);
    const result = await withTransaction(async (client) => {
      const competitor = await resolveCompetitorForProduct(client, businessId, payload, req.user.id);
      return client.query(
        `update business_competitor_products
         set competitor_id = $3,
             competitor_name = coalesce($4, $5),
             product_name = $6,
             unit_of_measure = $7,
             category = $8,
             competitor_price = $9,
             previous_price = $10,
             our_price = $11,
             currency = $12,
             channel = $13,
             source_url = $14,
             evidence_image_url = $15,
             observed_at = coalesce($16::timestamptz, observed_at),
             availability = $17,
             promotion_label = $18,
             own_product_name = $19,
             competitiveness_level = $20,
             notes = $21,
             is_active = $22,
             metadata = $23::jsonb,
             updated_at = now()
         where id = $1 and business_id = $2
         returning *`,
        [
          req.params.productId,
          businessId,
          competitor?.id || null,
          payload.competitor_name,
          competitor?.name || null,
          payload.product_name,
          payload.unit_of_measure,
          payload.category,
          payload.competitor_price,
          payload.previous_price,
          payload.our_price,
          payload.currency,
          payload.channel,
          payload.source_url,
          payload.evidence_image_url,
          payload.observed_at,
          payload.availability,
          payload.promotion_label,
          payload.own_product_name,
          payload.competitiveness_level,
          payload.notes,
          payload.is_active,
          JSON.stringify(payload.metadata),
        ]
      );
    });
    res.json({ product: mapCompetitorProduct(result.rows[0]) });
  } catch (error) {
    next(error);
  }
}

async function archiveCompetitorProduct(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_comparison");
    const result = await query(
      `update business_competitor_products
       set is_active = false, updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [req.params.productId, businessId]
    );
    if (!result.rowCount) throw notFound("Producto de competencia no encontrado.");
    res.json({ product: mapCompetitorProduct(result.rows[0]), archived: true });
  } catch (error) {
    next(error);
  }
}

async function createCustomerAcquisitionSale(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "sales_tracker");
    const body = validate(customerAcquisitionSaleSchema, req.body);

    const result = await withTransaction(async (client) => {
      const acquisitionChannel = await resolveAcquisitionChannelReference(client, businessId, body);
      if (body.campaign_id) {
        const campaign = await client.query(
          "select id from campaigns where id = $1 and business_id = $2",
          [body.campaign_id, businessId]
        );
        if (!campaign.rowCount) {
          throw badRequest("La campana atribuida no existe para este negocio.");
        }
      }
      let saleBranchId = body.branch_id || req.user.branch_id || null;
      if (saleBranchId) {
        const branch = await client.query(
          "select id from branches where id = $1 and business_id = $2 and is_active = true",
          [saleBranchId, businessId]
        );
        if (!branch.rowCount) {
          throw badRequest("La sede o punto de consignación seleccionado no pertenece a este negocio o no está activo.");
        }
      }
      const customerLink = await ensureCustomerContactForAcquisitionSale(client, businessId, req.user, body);
      const customerContact = customerLink.customer;

      let referredAffiliate = null;
      const affiliateResult = await client.query(
        `select id, full_name, points_total
           from affiliates
           where business_id = $1
             and status = 'ACTIVE'
             and (
               ($2::uuid is not null and id = $2)
               or ($3::text is not null and nullif(document_id, '') = $3)
               or ($4::text is not null and nullif(phone, '') = $4)
               or ($5::text is not null and lower(nullif(email, '')) = lower($5))
             )
           order by case when $2::uuid is not null and id = $2 then 0 else 1 end, created_at desc
           limit 1
           for update`,
        [
          businessId,
          body.referred_affiliate_id || null,
          body.customer_document_id || null,
          body.customer_phone || null,
          body.customer_email || null,
        ]
      );
      referredAffiliate = affiliateResult.rows[0] || null;
      if (body.referred_affiliate_id && !referredAffiliate) {
        throw badRequest("El afiliado referido no existe o no esta activo para este negocio.");
      }
      const affiliatePointRules = referredAffiliate
        ? await getAffiliatePointRules(businessId, client)
        : null;
      const referralPoints = affiliatePointRules
        ? referralPointsForAmount(body.sale_amount, affiliatePointRules)
        : 0;
      const autoMatchedAffiliate = Boolean(referredAffiliate && !body.referred_affiliate_id);
      const saleProducts = Array.isArray(body.metadata?.products) && body.metadata.products.length
        ? body.metadata.products
        : [{
            name: body.product_name || "Venta registrada",
            quantity: 1,
            unit_price: body.sale_amount,
            line_total: body.sale_amount,
            currency: body.currency || "COP",
          }];
      const catalogSync = await syncSaleProductsWithCatalog(client, businessId, req.user.id, saleProducts, {
        currency: body.currency || "COP",
        sourceModule: body.metadata?.affiliate_purchase ? "affiliate_purchase" : "customer_acquisition_sale",
      });
      const saleMetadata = {
        ...body.metadata,
        acquisition_channel: {
          id: acquisitionChannel.acquisition_channel_id,
          name_snapshot: acquisitionChannel.acquisition_channel_name_snapshot,
          slug_snapshot: acquisitionChannel.acquisition_channel_slug_snapshot,
          source: acquisitionChannel.acquisition_channel_source,
        },
        products: catalogSync.products,
        auto_created_products: catalogSync.autoCreatedProducts,
        matched_products: catalogSync.matchedProducts,
        product_catalog_sync: true,
        capture_source: "customer_acquisition",
        conversion_source: "contact_center_sale",
        affiliate_match_source: autoMatchedAffiliate ? "customer_identity" : body.referred_affiliate_id ? "manual_selection" : null,
        related_affiliate_id: referredAffiliate?.id || null,
        crm_source_type: "PLAYER",
        crm_source_id: customerContact.id,
        crm_lead_id: customerContact.id,
        customer_contact_id: customerContact.id,
        customer_contact_created: customerLink.created,
        ...(affiliatePointRules ? affiliatePointRuleMetadata(affiliatePointRules) : {}),
      };

      const saleResult = await client.query(
        `insert into business_sales
          (business_id, campaign_id, customer_name, customer_phone, customer_email, customer_document_id,
           product_name, sale_amount, currency, seller_user_id, branch_id, acquisition_source,
           acquisition_channel, acquisition_channel_id, acquisition_channel_name_snapshot,
           acquisition_channel_slug_snapshot, acquisition_channel_source, referred_affiliate_id,
           referral_points_awarded, notes, metadata)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         returning *`,
        [
          businessId,
          body.campaign_id || null,
          customerContact.name || body.customer_name || null,
          customerContact.phone || body.customer_phone || null,
          customerContact.email || body.customer_email || null,
          customerContact.document_id || body.customer_document_id || null,
          body.product_name || null,
          body.sale_amount,
          body.currency || "COP",
          req.user.id,
          saleBranchId,
          body.acquisition_source,
          acquisitionChannel.acquisition_channel,
          acquisitionChannel.acquisition_channel_id,
          acquisitionChannel.acquisition_channel_name_snapshot,
          acquisitionChannel.acquisition_channel_slug_snapshot,
          acquisitionChannel.acquisition_channel_source,
          referredAffiliate?.id || null,
          referralPoints,
          body.notes || null,
          saleMetadata,
        ]
      );

      const convertedPlayers = await client.query(
        `update players
         set metadata = jsonb_set(
           jsonb_set(coalesce(metadata, '{}'::jsonb), '{commercial_status}', to_jsonb('BUYER'::text), true),
           '{converted_sale_id}', to_jsonb($3::text), true
         )
         where business_id = $1 and id = $2
         returning id`,
        [businessId, customerContact.id, saleResult.rows[0].id]
      );
      const convertedManual = await client.query(
        `update business_manual_leads
         set status = 'CONVERTED',
             metadata = coalesce(metadata, '{}'::jsonb) || $4::jsonb
         where business_id = $1
           and (
             ($2::text is not null and nullif(phone, '') = $2)
             or ($3::text is not null and lower(nullif(email, '')) = lower($3))
           )
         returning id`,
        [
          businessId,
          body.customer_phone || null,
          body.customer_email || null,
          JSON.stringify({ converted_sale_id: saleResult.rows[0].id, converted_at: new Date().toISOString() }),
        ]
      );

      if (referredAffiliate && referralPoints > 0) {
        await client.query(
          `insert into affiliate_point_ledger
            (business_id, affiliate_id, created_by_user_id, amount, points_awarded, reason, metadata)
           values ($1, $2, $3, $4, $5, 'REFERRAL_PURCHASE', $6)`,
          [
            businessId,
            referredAffiliate.id,
            req.user.id,
            body.sale_amount,
            referralPoints,
            {
              sale_id: saleResult.rows[0].id,
              acquisition_source: body.acquisition_source,
              acquisition_channel: acquisitionChannel.acquisition_channel,
              acquisition_channel_id: acquisitionChannel.acquisition_channel_id,
              referred_customer: body.customer_name || null,
              affiliate_match_source: autoMatchedAffiliate ? "customer_identity" : "manual_selection",
              ...(affiliatePointRules ? affiliatePointRuleMetadata(affiliatePointRules) : {}),
            },
          ]
        );

        const updatedAffiliate = await client.query(
          `update affiliates
           set points_total = points_total + $3,
               updated_at = now()
           where id = $1 and business_id = $2
           returning id, full_name, points_total`,
          [referredAffiliate.id, businessId, referralPoints]
        );
        referredAffiliate = updatedAffiliate.rows[0];
      }

      return {
        sale: saleResult.rows[0],
        customer: { id: customerContact.id, name: customerContact.name, created: customerLink.created },
        conversion: {
          players: convertedPlayers.rowCount,
          manual_leads: convertedManual.rowCount,
        },
        referral: referredAffiliate
          ? {
              affiliate_id: referredAffiliate.id,
              affiliate_name: referredAffiliate.full_name,
              points_awarded: referralPoints,
              points_total: referredAffiliate.points_total,
            }
          : null,
      };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

function channelDateRange(queryParams = {}) {
  const end = queryParams.end_date ? new Date(queryParams.end_date) : new Date();
  if (Number.isNaN(end.getTime())) throw badRequest("Fecha final inválida.");
  end.setHours(23, 59, 59, 999);
  const start = queryParams.start_date ? new Date(queryParams.start_date) : new Date(end);
  if (!queryParams.start_date) start.setDate(start.getDate() - 29);
  if (Number.isNaN(start.getTime())) throw badRequest("Fecha inicial inválida.");
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function channelSlug(value = "") {
  return slugify(value).replace(/-/g, "");
}

function channelMatchKeys(row = {}) {
  return Array.from(new Set([
    channelSlug(row.slug || ""),
    channelSlug(row.name || ""),
    channelSlug(row.platform || ""),
  ].filter(Boolean)));
}

function normalizeChannelRow(row = {}) {
  return {
    ...row,
    period_budget: Number(row.period_budget || 0),
  };
}

function emptyChannelMetrics() {
  return {
    leads: 0,
    qr_generated: 0,
    redemptions: 0,
    sales: 0,
    unique_customers: 0,
    revenue: 0,
  };
}

function channelEfficiencyLabel(metrics = {}) {
  const roi = metrics.roi;
  if (roi === null || roi === undefined) return "Sin inversión cargada";
  if (Number(roi) >= 1) return "Escalar";
  if (Number(roi) >= 0) return "Sano";
  if (Number(metrics.revenue || 0) > 0) return "Optimizar costo";
  return "Sin retorno visible";
}

function decorateChannel(row = {}, metrics = emptyChannelMetrics(), breakdown = []) {
  const investment = Number(row.period_budget || 0);
  const revenue = Number(metrics.revenue || 0);
  const sales = Number(metrics.sales || 0);
  const uniqueCustomers = Number(metrics.unique_customers || 0);
  const leads = Number(metrics.leads || 0);
  const redemptions = Number(metrics.redemptions || 0);
  const qrGenerated = Number(metrics.qr_generated || 0);
  return {
    ...normalizeChannelRow(row),
    metrics: {
      leads,
      qr_generated: qrGenerated,
      redemptions,
      sales,
      revenue,
      investment,
      roi: safeRoi(revenue, investment),
      unique_customers: uniqueCustomers,
      cac: uniqueCustomers > 0 ? Number((investment / uniqueCustomers).toFixed(2)) : null,
      conversion_rate: leads > 0 ? Number(((sales / leads) * 100).toFixed(1)) : 0,
      redemption_rate: qrGenerated > 0 ? Number(((redemptions / qrGenerated) * 100).toFixed(1)) : 0,
      efficiency_label: channelEfficiencyLabel({ revenue, sales, leads, roi: safeRoi(revenue, investment) }),
    },
    campaign_breakdown: breakdown,
  };
}

async function channelCampaignBreakdownRows(businessId, filters = {}) {
  const { start, end } = filters;
  const campaignId = filters.campaign_id || null;
  const result = await query(
    `with sales as (${canonicalSalesUnionSql()}),
     sales_by_campaign_channel as (
       select
         coalesce(nullif(s.acquisition_channel, ''), s.acquisition_source, 'QR_REDEMPTION') as channel,
         s.campaign_id,
         coalesce(c.name, 'Sin campana') as campaign_name,
         count(*)::int as sales,
         coalesce(sum(s.sale_amount), 0)::numeric(14, 2) as revenue
       from sales s
       left join campaigns c on c.id = s.campaign_id and c.business_id = s.business_id
       where s.business_id = $1
         and s.created_at >= $2::timestamptz
         and s.created_at <= $3::timestamptz
         and ($4::uuid is null or s.campaign_id = $4::uuid)
       group by channel, s.campaign_id, c.name
     ),
     campaign_budget as (
       select id, coalesce(budget_total, 0)::numeric(14, 2) as campaign_investment
       from campaigns
       where business_id = $1
     )
     select s.channel,
            s.campaign_id,
            s.campaign_name,
            s.sales,
            s.revenue,
            coalesce(cb.campaign_investment, 0)::numeric(14, 2) as campaign_investment
     from sales_by_campaign_channel s
     left join campaign_budget cb on cb.id = s.campaign_id
     order by s.revenue desc, s.sales desc, s.campaign_name asc`,
    [businessId, start.toISOString(), end.toISOString(), campaignId]
  );
  return result.rows;
}

async function channelActivityRows(businessId, filters = {}) {
  const { start, end } = filters;
  const campaignId = filters.campaign_id || null;
  const result = await query(
    `with activity as (
       select
         coalesce(
           nullif(qn.answers->>'preferred_channel', ''),
           nullif(qn.answers->>'source', ''),
           nullif(p.metadata->>'preferred_channel', ''),
           nullif(p.metadata->>'source', ''),
           'Sin canal'
         ) as channel,
         count(distinct p.id)::int as leads,
         0::int as qr_generated,
         0::int as redemptions,
         0::int as sales,
         0::int as unique_customers,
         0::numeric(14, 2) as revenue
       from players p
       left join lateral (
         select answers
         from questionnaires
         where player_id = p.id and business_id = p.business_id
         order by created_at desc
         limit 1
       ) qn on true
       where p.business_id = $1
         and p.created_at >= $2::timestamptz
         and p.created_at <= $3::timestamptz
         and ($4::uuid is null or p.campaign_id = $4::uuid)
       group by channel

       union all

       select
         coalesce(nullif(ml.preferred_channel, ''), nullif(ml.source, ''), 'Manual') as channel,
         count(distinct ml.id)::int as leads,
         0::int as qr_generated,
         0::int as redemptions,
         0::int as sales,
         0::int as unique_customers,
         0::numeric(14, 2) as revenue
       from business_manual_leads ml
       where ml.business_id = $1
         and ml.created_at >= $2::timestamptz
         and ml.created_at <= $3::timestamptz
         and $4::uuid is null
       group by channel

       union all

       select
         coalesce(nullif(qb.channel_use, ''), nullif(q.metadata->>'channel_use', ''), nullif(q.metadata->>'channel', ''), nullif(q.metadata->>'source', ''), 'QR fisico / impreso') as channel,
         0::int as leads,
         count(distinct q.id)::int as qr_generated,
         0::int as redemptions,
         0::int as sales,
         0::int as unique_customers,
         0::numeric(14, 2) as revenue
       from qr_codes q
       left join qr_batches qb on qb.id = q.batch_id and qb.business_id = q.business_id
       where q.business_id = $1
         and q.created_at >= $2::timestamptz
         and q.created_at <= $3::timestamptz
         and ($4::uuid is null or q.campaign_id = $4::uuid)
       group by channel

       union all

       select
         coalesce(nullif(qb.channel_use, ''), nullif(q.metadata->>'channel_use', ''), nullif(q.metadata->>'channel', ''), nullif(q.metadata->>'source', ''), 'QR redimido') as channel,
         0::int as leads,
         0::int as qr_generated,
         count(distinct rd.id)::int as redemptions,
         0::int as sales,
         0::int as unique_customers,
         0::numeric(14, 2) as revenue
       from redemptions rd
       left join qr_codes q on q.id = rd.qr_code_id
       left join qr_batches qb on qb.id = q.batch_id and qb.business_id = q.business_id
       where rd.business_id = $1
         and rd.redeemed_at >= $2::timestamptz
         and rd.redeemed_at <= $3::timestamptz
         and ($4::uuid is null or rd.campaign_id = $4::uuid)
       group by channel

       union all

       select
         coalesce(nullif(s.acquisition_channel, ''), s.acquisition_source, 'Sin canal') as channel,
         0::int as leads,
         0::int as qr_generated,
         0::int as redemptions,
         count(*)::int as sales,
         count(distinct s.customer_key)::int as unique_customers,
         coalesce(sum(s.sale_amount), 0)::numeric(14, 2) as revenue
       from (${canonicalSalesUnionSql()}) s
       where s.business_id = $1
         and s.created_at >= $2::timestamptz
         and s.created_at <= $3::timestamptz
         and ($4::uuid is null or s.campaign_id = $4::uuid)
       group by channel
     )
     select channel,
            sum(leads)::int as leads,
            sum(qr_generated)::int as qr_generated,
            sum(redemptions)::int as redemptions,
            sum(sales)::int as sales,
            sum(unique_customers)::int as unique_customers,
            coalesce(sum(revenue), 0)::numeric(14, 2) as revenue
     from activity
     where nullif(channel, '') is not null
     group by channel
     order by revenue desc, sales desc, leads desc, channel asc`,
    [businessId, start.toISOString(), end.toISOString(), campaignId]
  );
  return result.rows;
}

async function listAcquisitionChannels(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const { start, end } = channelDateRange(req.query);
    const campaignId = req.query.campaign_id || null;
    const [channelsResult, activityRows, campaignBreakdownRows] = await Promise.all([
      query(
        `select *
         from business_acquisition_channels
         where business_id = $1
           and ($2::boolean = true or status <> 'ARCHIVED')
         order by status asc, updated_at desc, name asc`,
        [businessId, ["1", "true", "yes"].includes(String(req.query.include_archived || "").toLowerCase())]
      ),
      channelActivityRows(businessId, { start, end, campaign_id: campaignId }),
      channelCampaignBreakdownRows(businessId, { start, end, campaign_id: campaignId }),
    ]);

    const metricsBySlug = new Map();
    activityRows.forEach((row) => {
      const slug = channelSlug(row.channel);
      if (!slug) return;
      const current = metricsBySlug.get(slug) || emptyChannelMetrics();
      metricsBySlug.set(slug, {
        leads: current.leads + Number(row.leads || 0),
        qr_generated: current.qr_generated + Number(row.qr_generated || 0),
        redemptions: current.redemptions + Number(row.redemptions || 0),
        sales: current.sales + Number(row.sales || 0),
        unique_customers: current.unique_customers + Number(row.unique_customers || 0),
        revenue: current.revenue + Number(row.revenue || 0),
      });
    });

    const breakdownBySlug = new Map();
    campaignBreakdownRows.forEach((row) => {
      const slug = channelSlug(row.channel);
      if (!slug) return;
      const current = breakdownBySlug.get(slug) || [];
      current.push({
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name || "Sin campana",
        sales: Number(row.sales || 0),
        revenue: Number(row.revenue || 0),
        campaign_investment: Number(row.campaign_investment || 0),
        campaign_roi: safeRoi(row.revenue, row.campaign_investment),
      });
      breakdownBySlug.set(slug, current);
    });

    const readMetricsForChannel = (row = {}) => {
      for (const key of channelMatchKeys(row)) {
        const match = metricsBySlug.get(key);
        if (match) return { key, metrics: match };
      }
      return { key: channelMatchKeys(row)[0] || "", metrics: emptyChannelMetrics() };
    };
    const readBreakdownForChannel = (row = {}) => {
      for (const key of channelMatchKeys(row)) {
        const match = breakdownBySlug.get(key);
        if (match) return { key, rows: match };
      }
      return { key: channelMatchKeys(row)[0] || "", rows: [] };
    };
    const decorateBreakdown = (rows = [], channelInvestment = 0, channelRevenue = 0, channelSales = 0) => rows
      .map((row) => {
        const revenueShare = channelRevenue > 0
          ? Number(row.revenue || 0) / channelRevenue
          : channelSales > 0
            ? Number(row.sales || 0) / channelSales
            : 0;
        const allocatedChannelInvestment = Number((Number(channelInvestment || 0) * revenueShare).toFixed(2));
        return {
          ...row,
          channel_investment_allocated: allocatedChannelInvestment,
          channel_roi: safeRoi(row.revenue, allocatedChannelInvestment),
        };
      })
      .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));

    const directory = channelsResult.rows.map((row) => {
      const { metrics, key } = readMetricsForChannel(row);
      const { rows: breakdownRows } = readBreakdownForChannel(row);
      channelMatchKeys(row).forEach((matchKey) => {
        metricsBySlug.delete(matchKey);
        breakdownBySlug.delete(matchKey);
      });
      if (key) {
        metricsBySlug.delete(key);
        breakdownBySlug.delete(key);
      }
      const decoratedBreakdown = decorateBreakdown(
        breakdownRows,
        Number(row.period_budget || 0),
        Number(metrics.revenue || 0),
        Number(metrics.sales || 0)
      );
      return decorateChannel(row, metrics, decoratedBreakdown);
    });

    const inferred = activityRows
      .filter((row) => metricsBySlug.has(channelSlug(row.channel)))
      .map((row) => ({
        ...decorateChannel({
          id: null,
          business_id: businessId,
          name: row.channel,
          slug: slugify(row.channel) || "sin-canal",
          channel_type: "OTHER",
          platform: row.channel,
          status: "DETECTED",
          period_budget: 0,
          currency: "COP",
          cost_model: null,
          notes: "Canal detectado desde leads, tickets o ventas. Puedes crearlo para asignarle inversión y controlarlo.",
          metadata: { inferred: true },
        }, row, decorateBreakdown(
          breakdownBySlug.get(channelSlug(row.channel)) || [],
          0,
          Number(row.revenue || 0),
          Number(row.sales || 0)
        )),
      }));

    const allRows = [...directory, ...inferred].sort((a, b) => (
      Number(b.metrics?.revenue || 0) - Number(a.metrics?.revenue || 0)
      || Number(b.metrics?.sales || 0) - Number(a.metrics?.sales || 0)
      || String(a.name || "").localeCompare(String(b.name || ""))
    ));
    const totals = allRows.reduce((acc, row) => {
      acc.leads += Number(row.metrics?.leads || 0);
      acc.qr_generated += Number(row.metrics?.qr_generated || 0);
      acc.redemptions += Number(row.metrics?.redemptions || 0);
      acc.sales += Number(row.metrics?.sales || 0);
      acc.unique_customers += Number(row.metrics?.unique_customers || 0);
      acc.revenue += Number(row.metrics?.revenue || 0);
      acc.investment += Number(row.metrics?.investment || 0);
      return acc;
    }, { leads: 0, qr_generated: 0, redemptions: 0, sales: 0, unique_customers: 0, revenue: 0, investment: 0 });

    res.json({
      channels: allRows,
      directory_count: directory.length,
      detected_count: inferred.length,
      totals: {
        ...totals,
        roi: safeRoi(totals.revenue, totals.investment),
        cac: totals.unique_customers > 0 ? Number((totals.investment / totals.unique_customers).toFixed(2)) : null,
      },
      campaign_channel_matrix: allRows.flatMap((channel) => (
        channel.campaign_breakdown || []
      ).map((row) => ({
        channel_id: channel.id,
        channel_name: channel.name,
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        sales: row.sales,
        revenue: row.revenue,
        channel_investment_allocated: row.channel_investment_allocated,
        channel_roi: row.channel_roi,
        campaign_investment: row.campaign_investment,
        campaign_roi: row.campaign_roi,
      }))),
      filters: {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        campaign_id: campaignId,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createAcquisitionChannel(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(acquisitionChannelSchema, req.body);
    const slug = body.slug || slugify(body.name);
    const result = await query(
      `insert into business_acquisition_channels
        (business_id, name, slug, channel_type, platform, status, period_budget, currency, cost_model, notes, metadata, created_by_user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
       returning *`,
      [
        businessId,
        body.name,
        slug,
        body.channel_type,
        body.platform || null,
        body.status || "ACTIVE",
        body.period_budget || 0,
        body.currency || "COP",
        body.cost_model || null,
        body.notes || null,
        JSON.stringify(body.metadata || {}),
        req.user.id,
      ]
    );
    res.status(201).json({ channel: normalizeChannelRow(result.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      next(badRequest("Ya existe un canal con ese nombre o slug para este negocio."));
      return;
    }
    next(error);
  }
}

async function updateAcquisitionChannel(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(acquisitionChannelPatchSchema, req.body);
    const existing = await query(
      "select * from business_acquisition_channels where id = $1 and business_id = $2",
      [req.params.channelId, businessId]
    );
    if (!existing.rowCount) throw notFound("Canal no encontrado.");
    const merged = { ...existing.rows[0], ...body };
    const slug = body.slug ? slugify(body.slug) : body.name ? slugify(body.name) : existing.rows[0].slug;
    const result = await query(
      `update business_acquisition_channels
       set name = $3,
           slug = $4,
           channel_type = $5,
           platform = $6,
           status = $7,
           period_budget = $8,
           currency = $9,
           cost_model = $10,
           notes = $11,
           metadata = $12::jsonb,
           updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [
        req.params.channelId,
        businessId,
        merged.name,
        slug,
        merged.channel_type || "DIGITAL",
        merged.platform || null,
        merged.status || "ACTIVE",
        Number(merged.period_budget || 0),
        merged.currency || "COP",
        merged.cost_model || null,
        merged.notes || null,
        JSON.stringify(merged.metadata || {}),
      ]
    );
    res.json({ channel: normalizeChannelRow(result.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      next(badRequest("Ya existe un canal con ese nombre o slug para este negocio."));
      return;
    }
    next(error);
  }
}

async function archiveAcquisitionChannel(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const result = await query(
      `update business_acquisition_channels
       set status = 'ARCHIVED', updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [req.params.channelId, businessId]
    );
    if (!result.rowCount) throw notFound("Canal no encontrado.");
    res.json({ channel: normalizeChannelRow(result.rows[0]), archived: true });
  } catch (error) {
    next(error);
  }
}

function normalizeChannelEffortRow(row = {}) {
  return {
    ...row,
    budget_amount: Number(row.budget_amount || 0),
    metrics: row.metrics || {
      leads: 0,
      qr_generated: 0,
      redemptions: 0,
      sales: 0,
      revenue: 0,
      investment: Number(row.budget_amount || 0),
      net_revenue: -Number(row.budget_amount || 0),
      roi: safeRoi(0, row.budget_amount),
      conversion_rate: 0,
      rebuy_sales: 0,
      referral_sales: 0,
      unique_customers: 0,
    },
  };
}

function channelEffortDateRange(row = {}) {
  const start = new Date(row.starts_at || row.published_at || row.created_at || Date.now());
  const end = row.ends_at ? new Date(row.ends_at) : new Date();
if (Number.isNaN(start.getTime())) throw badRequest("Fecha inicial del esfuerzo inválida.");
if (Number.isNaN(end.getTime())) throw badRequest("Fecha final del esfuerzo inválida.");
  if (end < start) {
    const sameDayEnd = new Date(start);
    sameDayEnd.setHours(23, 59, 59, 999);
    return { start, end: sameDayEnd };
  }
  return { start, end };
}

function channelEffortSearchTerms(row = {}) {
  return Array.from(new Set([
    row.channel_name,
    row.channel_slug,
    row.channel_platform,
  ].filter(Boolean).map((value) => String(value).trim().toLowerCase())));
}

async function requireAcquisitionChannelForBusiness(channelId, businessId) {
  const result = await query(
    `select *
     from business_acquisition_channels
     where id = $1 and business_id = $2 and status <> 'ARCHIVED'`,
    [channelId, businessId]
  );
  if (!result.rowCount) throw notFound("Canal no encontrado.");
  return result.rows[0];
}

async function assertCampaignForBusinessOrNull(campaignId, businessId) {
  if (!campaignId) return null;
  const result = await query(
    "select id from campaigns where id = $1 and business_id = $2",
    [campaignId, businessId]
  );
  if (!result.rowCount) throw notFound("Campana no encontrada para este negocio.");
  return campaignId;
}

async function salesDetailForChannelEffort(businessId, effort, start, end) {
  const terms = channelEffortSearchTerms(effort);
  if (!terms.length) {
    return { sales: 0, revenue: 0, unique_customers: 0, rebuy_sales: 0, referral_sales: 0 };
  }
  const result = await query(
    `select
       count(*)::int as sales,
       coalesce(sum(bs.sale_amount), 0)::numeric(14, 2) as revenue,
       count(distinct coalesce(nullif(bs.customer_document_id, ''), nullif(bs.customer_phone, ''), nullif(bs.customer_email, ''), bs.id::text))::int as unique_customers,
       count(*) filter (
         where bs.referred_affiliate_id is not null
            or bs.acquisition_source = 'FRIEND_REFERRAL'
            or bs.acquisition_channel ilike '%refer%'
       )::int as referral_sales,
       count(*) filter (
         where exists (
           select 1
           from business_sales previous
           where previous.business_id = bs.business_id
             and previous.created_at < $2::timestamptz
             and (
               (nullif(bs.customer_document_id, '') is not null and previous.customer_document_id = bs.customer_document_id)
               or (nullif(bs.customer_phone, '') is not null and previous.customer_phone = bs.customer_phone)
               or (nullif(bs.customer_email, '') is not null and previous.customer_email = bs.customer_email)
             )
         )
       )::int as rebuy_sales
     from business_sales bs
     where bs.business_id = $1
       and coalesce(bs.sale_status, 'PAID') = 'PAID'
       and bs.created_at >= $2::timestamptz
       and bs.created_at <= $3::timestamptz
       and ($4::uuid is null or bs.campaign_id = $4::uuid)
       and lower(coalesce(nullif(bs.acquisition_channel, ''), bs.acquisition_source, '')) = any($5::text[])`,
    [businessId, start.toISOString(), end.toISOString(), effort.campaign_id || null, terms]
  );
  const row = result.rows[0] || {};
  return {
    sales: Number(row.sales || 0),
    revenue: Number(row.revenue || 0),
    unique_customers: Number(row.unique_customers || 0),
    rebuy_sales: Number(row.rebuy_sales || 0),
    referral_sales: Number(row.referral_sales || 0),
  };
}

async function metricsForCommunicationChannelEffort(businessId, effort, communicationId) {
  const result = await query(
    `with communication_events as (
       select
         count(*) filter (where event_type = 'LEAD_CAPTURED')::int as leads,
         count(*) filter (where event_type = 'ACTIVATION_STARTED')::int as starts,
         count(*) filter (where event_type = 'ACTIVATION_COMPLETED')::int as completions
       from business_communication_events
       where business_id = $1 and communication_id::text = $2
     ), attributed_sales as (
       select bs.*
       from business_sales bs
       left join qr_codes q on q.id = bs.qr_code_id
       where bs.business_id = $1
         and coalesce(bs.sale_status, 'PAID') = 'PAID'
         and (q.metadata->>'communication_id' = $2 or bs.metadata->>'communication_id' = $2)
     )
     select
       coalesce((select leads from communication_events), 0)::int as leads,
       coalesce((select starts from communication_events), 0)::int as qr_generated,
       coalesce((select completions from communication_events), 0)::int as redemptions,
       count(*)::int as sales,
       coalesce(sum(sale_amount), 0)::numeric(14, 2) as revenue,
       count(distinct coalesce(nullif(customer_document_id, ''), nullif(customer_phone, ''), nullif(customer_email, ''), id::text))::int as unique_customers,
       count(*) filter (
         where referred_affiliate_id is not null
            or acquisition_source = 'FRIEND_REFERRAL'
            or acquisition_channel ilike '%refer%'
       )::int as referral_sales,
       count(*) filter (
         where exists (
           select 1
           from business_sales previous
           where previous.business_id = attributed_sales.business_id
             and coalesce(previous.sale_status, 'PAID') = 'PAID'
             and previous.created_at < attributed_sales.created_at
             and (
               (nullif(attributed_sales.customer_document_id, '') is not null and previous.customer_document_id = attributed_sales.customer_document_id)
               or (nullif(attributed_sales.customer_phone, '') is not null and previous.customer_phone = attributed_sales.customer_phone)
               or (nullif(attributed_sales.customer_email, '') is not null and previous.customer_email = attributed_sales.customer_email)
             )
         )
       )::int as rebuy_sales
     from attributed_sales`,
    [businessId, communicationId]
  );
  const row = result.rows[0] || {};
  const investment = Number(effort.budget_amount || 0);
  const sales = Number(row.sales || 0);
  const revenue = Number(row.revenue || 0);
  const leads = Number(row.leads || 0);
  const { start, end } = channelEffortDateRange(effort);
  return {
    leads,
    qr_generated: Number(row.qr_generated || 0),
    redemptions: Number(row.redemptions || 0),
    sales,
    revenue,
    investment,
    cac: Number(row.unique_customers || 0) > 0 ? Number((investment / Number(row.unique_customers)).toFixed(2)) : null,
    net_revenue: Number((revenue - investment).toFixed(2)),
    roi: safeRoi(revenue, investment),
    conversion_rate: leads > 0 ? Number(((sales / leads) * 100).toFixed(1)) : 0,
    rebuy_sales: Number(row.rebuy_sales || 0),
    referral_sales: Number(row.referral_sales || 0),
    unique_customers: Number(row.unique_customers || 0),
    date_window: { start_date: start.toISOString(), end_date: end.toISOString() },
  };
}

async function metricsForChannelEffort(businessId, effort = {}) {
  const communicationId = String(effort?.metadata?.communication_id || "").trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(communicationId)) {
    return metricsForCommunicationChannelEffort(businessId, effort, communicationId);
  }
  const { start, end } = channelEffortDateRange(effort);
  const effortKeys = new Set(channelMatchKeys({
    slug: effort.channel_slug,
    name: effort.channel_name,
    platform: effort.channel_platform,
  }));
  const activityRows = await channelActivityRows(businessId, {
    start,
    end,
    campaign_id: effort.campaign_id || null,
  });
  const activity = activityRows.reduce((acc, row) => {
    if (!effortKeys.has(channelSlug(row.channel))) return acc;
    acc.leads += Number(row.leads || 0);
    acc.qr_generated += Number(row.qr_generated || 0);
    acc.redemptions += Number(row.redemptions || 0);
    acc.sales += Number(row.sales || 0);
    acc.revenue += Number(row.revenue || 0);
    return acc;
  }, emptyChannelMetrics());
  const salesDetail = await salesDetailForChannelEffort(businessId, effort, start, end);
  const sales = Math.max(Number(activity.sales || 0), salesDetail.sales);
  const revenue = Math.max(Number(activity.revenue || 0), salesDetail.revenue);
  const investment = Number(effort.budget_amount || 0);
  return {
    ...activity,
    sales,
    revenue,
    investment,
    cac: salesDetail.unique_customers > 0 ? Number((investment / salesDetail.unique_customers).toFixed(2)) : null,
    net_revenue: Number((revenue - investment).toFixed(2)),
    roi: safeRoi(revenue, investment),
    conversion_rate: Number(activity.leads || 0) > 0 ? Number(((sales / Number(activity.leads || 0)) * 100).toFixed(1)) : 0,
    rebuy_sales: salesDetail.rebuy_sales,
    referral_sales: salesDetail.referral_sales,
    unique_customers: salesDetail.unique_customers,
    date_window: {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    },
  };
}

async function listAcquisitionChannelEfforts(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const channelId = req.query.channel_id || null;
    const campaignId = req.query.campaign_id || null;
    const startDate = req.query.start_date ? new Date(req.query.start_date) : null;
    const endDate = req.query.end_date ? new Date(req.query.end_date) : null;
if (startDate && Number.isNaN(startDate.getTime())) throw badRequest("Fecha inicial inválida.");
if (endDate && Number.isNaN(endDate.getTime())) throw badRequest("Fecha final inválida.");
    if (endDate) endDate.setHours(23, 59, 59, 999);
    const result = await query(
      `select e.*,
              ch.name as channel_name,
              ch.slug as channel_slug,
              ch.platform as channel_platform,
              ch.channel_type,
              c.name as campaign_name
       from business_acquisition_channel_efforts e
       join business_acquisition_channels ch on ch.id = e.channel_id and ch.business_id = e.business_id
       left join campaigns c on c.id = e.campaign_id and c.business_id = e.business_id
       where e.business_id = $1
         and e.status <> 'ARCHIVED'
         and ($2::uuid is null or e.channel_id = $2::uuid)
         and ($3::uuid is null or e.campaign_id = $3::uuid)
         and ($4::timestamptz is null or coalesce(e.ends_at, e.starts_at, e.published_at, e.created_at) >= $4::timestamptz)
         and ($5::timestamptz is null or coalesce(e.starts_at, e.published_at, e.created_at) <= $5::timestamptz)
       order by coalesce(e.starts_at, e.published_at, e.created_at) desc, e.updated_at desc
       limit 200`,
      [
        businessId,
        channelId,
        campaignId,
        startDate ? startDate.toISOString() : null,
        endDate ? endDate.toISOString() : null,
      ]
    );
    const efforts = await Promise.all(result.rows.map(async (row) => normalizeChannelEffortRow({
      ...row,
      metrics: await metricsForChannelEffort(businessId, row),
    })));
    const totals = efforts.reduce((acc, effort) => {
      acc.efforts += 1;
      acc.investment += Number(effort.metrics?.investment || 0);
      acc.leads += Number(effort.metrics?.leads || 0);
      acc.sales += Number(effort.metrics?.sales || 0);
      acc.unique_customers += Number(effort.metrics?.unique_customers || 0);
      acc.revenue += Number(effort.metrics?.revenue || 0);
      acc.rebuy_sales += Number(effort.metrics?.rebuy_sales || 0);
      acc.referral_sales += Number(effort.metrics?.referral_sales || 0);
      return acc;
    }, { efforts: 0, investment: 0, leads: 0, sales: 0, unique_customers: 0, revenue: 0, rebuy_sales: 0, referral_sales: 0 });
    res.json({
      efforts,
      totals: {
        ...totals,
        roi: safeRoi(totals.revenue, totals.investment),
        cac: totals.unique_customers > 0
          ? Number((totals.investment / totals.unique_customers).toFixed(2))
          : null,
        net_revenue: Number((totals.revenue - totals.investment).toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createAcquisitionChannelEffort(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(acquisitionChannelEffortSchema, req.body);
    await requireAcquisitionChannelForBusiness(body.channel_id, businessId);
    await assertCampaignForBusinessOrNull(body.campaign_id, businessId);
    const result = await query(
      `insert into business_acquisition_channel_efforts
        (business_id, channel_id, campaign_id, title, description, objective, content_type, status,
         published_at, starts_at, ends_at, budget_amount, currency, creative_url, source_url, notes, metadata, created_by_user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11::timestamptz,
               $12, $13, $14, $15, $16, $17::jsonb, $18)
       returning *`,
      [
        businessId,
        body.channel_id,
        body.campaign_id || null,
        body.title,
        body.description || null,
        body.objective || null,
        body.content_type || "POST",
        body.status || "ACTIVE",
        body.published_at || null,
        body.starts_at || null,
        body.ends_at || null,
        body.budget_amount || 0,
        body.currency || "COP",
        body.creative_url || null,
        body.source_url || null,
        body.notes || null,
        JSON.stringify(body.metadata || {}),
        req.user.id,
      ]
    );
    res.status(201).json({ effort: normalizeChannelEffortRow(result.rows[0]) });
  } catch (error) {
    next(error);
  }
}

async function updateAcquisitionChannelEffort(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(acquisitionChannelEffortPatchSchema, req.body);
    const existing = await query(
      "select * from business_acquisition_channel_efforts where id = $1 and business_id = $2",
      [req.params.effortId, businessId]
    );
    if (!existing.rowCount) throw notFound("Esfuerzo de canal no encontrado.");
    const merged = { ...existing.rows[0], ...body };
    await requireAcquisitionChannelForBusiness(merged.channel_id, businessId);
    await assertCampaignForBusinessOrNull(merged.campaign_id, businessId);
    const result = await query(
      `update business_acquisition_channel_efforts
       set channel_id = $3,
           campaign_id = $4,
           title = $5,
           description = $6,
           objective = $7,
           content_type = $8,
           status = $9,
           published_at = $10::timestamptz,
           starts_at = $11::timestamptz,
           ends_at = $12::timestamptz,
           budget_amount = $13,
           currency = $14,
           creative_url = $15,
           source_url = $16,
           notes = $17,
           metadata = $18::jsonb,
           updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [
        req.params.effortId,
        businessId,
        merged.channel_id,
        merged.campaign_id || null,
        merged.title,
        merged.description || null,
        merged.objective || null,
        merged.content_type || "POST",
        merged.status || "ACTIVE",
        merged.published_at || null,
        merged.starts_at || null,
        merged.ends_at || null,
        Number(merged.budget_amount || 0),
        merged.currency || "COP",
        merged.creative_url || null,
        merged.source_url || null,
        merged.notes || null,
        JSON.stringify(merged.metadata || {}),
      ]
    );
    res.json({ effort: normalizeChannelEffortRow(result.rows[0]) });
  } catch (error) {
    next(error);
  }
}

async function archiveAcquisitionChannelEffort(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const result = await query(
      `update business_acquisition_channel_efforts
       set status = 'ARCHIVED', updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [req.params.effortId, businessId]
    );
    if (!result.rowCount) throw notFound("Esfuerzo de canal no encontrado.");
    res.json({ effort: normalizeChannelEffortRow(result.rows[0]), archived: true });
  } catch (error) {
    next(error);
  }
}

function cleanSaleProductText(value, max = 180) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

function cleanSaleProductNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function normalizeSaleProductsForInventory(products) {
  if (!Array.isArray(products)) return [];
  return products
    .map((item) => {
      const name = cleanSaleProductText(item?.name || item?.product_name);
      const quantity = Math.max(1, cleanSaleProductNumber(item?.quantity, 1));
      const unitPrice = cleanSaleProductNumber(item?.unit_price);
      const lineTotal = cleanSaleProductNumber(item?.line_total, quantity * unitPrice);
      return {
        name,
        inventory_product_id: item?.inventory_product_id || item?.product_id || null,
        sku: cleanSaleProductText(item?.sku, 80),
        barcode: cleanSaleProductText(item?.barcode, 120),
        category: cleanSaleProductText(item?.category, 120),
        brand: cleanSaleProductText(item?.brand, 120),
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal || quantity * unitPrice,
        currency: cleanSaleProductText(item?.currency, 12),
      };
    })
    .filter((item) => item.name && item.line_total > 0);
}

async function findInventoryProductForSale(client, businessId, item) {
  if (item.inventory_product_id) {
    const result = await client.query(
      `select *
       from business_inventory_products
       where id = $1
         and business_id = $2
         and status <> 'ARCHIVED'
       limit 1`,
      [item.inventory_product_id, businessId]
    );
    if (!result.rowCount) {
      throw badRequest("Uno de los productos seleccionados no existe en productos activos del negocio.");
    }
    return result.rows[0];
  }

  const result = await client.query(
    `select *
     from business_inventory_products
     where business_id = $1
       and status <> 'ARCHIVED'
       and (
         lower(name) = lower($2)
         or ($3::text is not null and nullif(sku, '') = $3)
         or ($4::text is not null and nullif(barcode, '') = $4)
       )
     order by updated_at desc
     limit 1`,
    [businessId, item.name, item.sku, item.barcode]
  );
  return result.rows[0] || null;
}

async function updateInventoryProductFromSale(client, businessId, item, product) {
  const result = await client.query(
    `update business_inventory_products
     set stock_quantity = greatest(0, stock_quantity - $3::numeric),
         unit_price = case
           when coalesce(unit_price, 0) = 0 and $4::numeric > 0 then $4::numeric
           else unit_price
         end,
         updated_at = now()
     where id = $1
       and business_id = $2
       and status <> 'ARCHIVED'
     returning *`,
    [product.id, businessId, item.quantity, item.unit_price]
  );
  if (!result.rowCount) {
    throw badRequest("Uno de los productos seleccionados no existe en productos activos del negocio.");
  }
  return result.rows[0];
}

async function createInventoryProductFromSale(client, businessId, userId, item, options = {}) {
  const result = await client.query(
    `insert into business_inventory_products
      (business_id, internal_id, sku, barcode, name, category, brand, unit_price, price_before_tax,
       tax_classification, currency, stock_quantity, min_stock_quantity, unit_label, status, metadata, created_by_user_id)
     values ($1, concat('AUTO-', replace(gen_random_uuid()::text, '-', '')), $2, $3, $4, $5, $6, $7, $7,
             'EXEMPT', $8, 0, 0, 'unidad', 'ACTIVE', $9::jsonb, $10)
     returning *`,
    [
      businessId,
      item.sku,
      item.barcode,
      item.name,
      item.category || null,
      item.brand || null,
      item.unit_price,
      item.currency || options.currency || "COP",
      JSON.stringify({
        source: "sale_auto_product",
        source_module: options.sourceModule || "sales",
        auto_created_from_sale: true,
        created_from_sale_at: new Date().toISOString(),
        sku_from_sale: item.sku || null,
        barcode_from_sale: item.barcode || null,
      }),
      userId || null,
    ]
  );
  return result.rows[0];
}

function saleProductPayload(item, product, source) {
  return {
    name: product.name,
    inventory_product_id: product.id,
    sku: product.sku || item.sku || null,
    barcode: product.barcode || item.barcode || null,
    quantity: item.quantity,
    unit_price: item.unit_price || Number(product.unit_price || 0),
    line_total: item.line_total,
    source,
  };
}

async function syncSaleProductsWithInventory(client, businessId, userId, products, options = {}) {
  const normalizedProducts = normalizeSaleProductsForInventory(products);
  const syncedProducts = [];
  const autoCreatedProducts = [];
  const matchedProducts = [];

  for (const item of normalizedProducts) {
    const existingProduct = await findInventoryProductForSale(client, businessId, item);
    if (existingProduct) {
      const updatedProduct = await updateInventoryProductFromSale(client, businessId, item, existingProduct);
      syncedProducts.push(saleProductPayload(item, updatedProduct, item.inventory_product_id ? "catalog_selected" : "catalog_matched"));
      matchedProducts.push({ id: updatedProduct.id, name: updatedProduct.name });
      continue;
    }

    const createdProduct = await createInventoryProductFromSale(client, businessId, userId, item, options);
    syncedProducts.push(saleProductPayload(item, createdProduct, "catalog_auto_created"));
    autoCreatedProducts.push({ id: createdProduct.id, name: createdProduct.name });
  }

  return {
    products: syncedProducts,
    autoCreatedProducts,
    matchedProducts,
  };
}

function inventorySearchWhere(search, params) {
  const text = String(search || "").trim();
  if (!text) return "";
  params.push(`%${text.toLowerCase()}%`);
  const index = params.length;
  return `and (
    lower(product.name) like $${index}
    or lower(coalesce(product.internal_id, '')) like $${index}
    or lower(coalesce(product.sku, '')) like $${index}
    or lower(coalesce(product.barcode, '')) like $${index}
    or lower(coalesce(product.category, '')) like $${index}
    or lower(coalesce(product.brand, '')) like $${index}
  )`;
}

function inventoryTaxRate(classification = "EXEMPT") {
  return {
    EXEMPT: 0,
    EXCLUDED: 0,
    VAT_0: 0,
    VAT_5: 0.05,
    VAT_8: 0.08,
    VAT_11: 0.11,
    VAT_19: 0.19,
  }[classification] ?? 0;
}

function inventorySellingPrice(priceBeforeTax, classification = "EXEMPT", healthyTaxRate = 0) {
  const base = Math.max(0, Number(priceBeforeTax || 0));
  const total = base + (base * inventoryTaxRate(classification)) + (base * Math.max(0, Number(healthyTaxRate || 0)));
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

function inventoryEconomics(payload) {
  const base = Math.max(0, Number(payload.price_before_tax || 0));
  const cost = Math.max(0, Number(payload.cost_price || 0));
  const taxBaseAmount = Math.round((base * inventoryTaxRate(payload.tax_classification) + Number.EPSILON) * 100) / 100;
  const healthyTaxAmount = Math.round((base * Math.max(0, Number(payload.healthy_tax_rate || 0)) + Number.EPSILON) * 100) / 100;
  return {
    tax_base_amount: taxBaseAmount,
    healthy_tax_amount: healthyTaxAmount,
    utility_amount: Math.round((base - cost + Number.EPSILON) * 100) / 100,
    margin_percent: base > 0 ? Math.round((((base - cost) / base) * 100 + Number.EPSILON) * 100) / 100 : 0,
  };
}

async function ensureInventoryProductUnique(client, businessId, payload, excludeId = null) {
  if (!payload.internal_id && !payload.sku && !payload.barcode) return;
  const duplicate = await client.query(
    `select id, internal_id, sku, barcode
     from business_inventory_products
     where business_id = $1
       and ($2::uuid is null or id <> $2)
       and (
         ($3::text is not null and lower(nullif(internal_id, '')) = lower($3))
         or ($4::text is not null and nullif(sku, '') = $4)
         or ($5::text is not null and nullif(barcode, '') = $5)
       )
     limit 1`,
    [businessId, excludeId, payload.internal_id || null, payload.sku || null, payload.barcode || null]
  );
  if (duplicate.rowCount) {
    throw badRequest("Ya existe un producto con ese ID interno, SKU o codigo de barras en este negocio.");
  }
}

function mapInventoryPayload(body, userId) {
  const taxClassification = body.tax_classification || "EXEMPT";
  const priceBeforeTax = body.price_before_tax === undefined || body.price_before_tax === null
    ? Number(body.unit_price || 0)
    : Number(body.price_before_tax || 0);
  return {
    internal_id: body.internal_id || null,
    sku: body.sku || null,
    barcode: body.barcode || null,
    name: body.name,
    description: body.description || null,
    category: body.category || null,
    category_id: body.category_id || null,
    category_internal_id: body.category_internal_id || null,
    subcategory: body.subcategory || null,
    subcategory_id: body.subcategory_id || null,
    subcategory_internal_id: body.subcategory_internal_id || null,
    brand: body.brand || null,
    brand_id: body.brand_id || null,
    brand_internal_id: body.brand_internal_id || null,
    price_before_tax: priceBeforeTax,
    tax_classification: taxClassification,
    tax_base_id: body.tax_base_id || null,
    tax_base: body.tax_base || null,
    healthy_tax_id: body.healthy_tax_id || null,
    healthy_tax: body.healthy_tax || null,
    healthy_tax_rate: 0,
    unit_price: inventorySellingPrice(priceBeforeTax, taxClassification, 0),
    cost_price: body.cost_price === null || body.cost_price === undefined ? null : Number(body.cost_price || 0),
    currency: body.currency || "COP",
    stock_quantity: Number(body.stock_quantity || 0),
    min_stock_quantity: Number(body.min_stock_quantity || 0),
    unit_label: body.unit_label || "unidad",
    unit_id: body.unit_id || null,
    unit_internal_id: body.unit_internal_id || null,
    status: body.status || "ACTIVE",
    metadata: body.metadata || {},
    created_by_user_id: userId || null,
  };
}

async function listInventoryProducts(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const limit = boundedLimit(req.query.limit, 200, 500);
    const params = [businessId];
    const searchWhere = inventorySearchWhere(req.query.search, params);
    const includeArchived = String(req.query.include_archived || "") === "true";
    params.push(limit);
    const result = await query(
      `select product.*,
              category.name as category_name,
              category.internal_id as category_internal_id,
              subcategory.name as subcategory_name,
              subcategory.internal_id as subcategory_internal_id,
              brand_reference.name as brand_name,
              unit_reference.name as unit_name,
              tax_base.name as tax_base_name,
              tax_base.rate as tax_base_rate,
              healthy_tax.name as healthy_tax_name,
              healthy_tax.rate as healthy_tax_rate,
              round((coalesce(product.price_before_tax, 0) - coalesce(product.cost_price, 0))::numeric, 2) as utility_amount,
              case when coalesce(product.price_before_tax, 0) > 0 then round((((product.price_before_tax - coalesce(product.cost_price, 0)) / product.price_before_tax) * 100)::numeric, 2) else 0 end as margin_percent,
              (product.stock_quantity <= product.min_stock_quantity) as low_stock,
              exists (
                select 1
                  from business_sales sale
                 where sale.business_id = product.business_id
                   and (
                     sale.inventory_product_id = product.id
                     or exists (
                       select 1
                         from jsonb_array_elements(coalesce(sale.metadata->'products', '[]'::jsonb)) line
                        where line->>'inventory_product_id' = product.id::text
                     )
                   )
              ) as has_sales
       from business_inventory_products product
       left join business_product_categories category on category.id = product.category_id
       left join business_product_subcategories subcategory on subcategory.id = product.subcategory_id
       left join business_product_brands brand_reference on brand_reference.id = product.brand_id
       left join business_product_units unit_reference on unit_reference.id = product.unit_id
       left join business_product_tax_bases tax_base on tax_base.id = product.tax_base_id
       left join business_product_healthy_taxes healthy_tax on healthy_tax.id = product.healthy_tax_id
       where product.business_id = $1
         ${includeArchived ? "" : "and product.status <> 'ARCHIVED'"}
         ${searchWhere}
       order by product.status asc, product.updated_at desc, product.name asc
       limit $${params.length}`,
      params
    );
    res.json({ products: result.rows });
  } catch (error) {
    next(error);
  }
}

async function getInventoryProductInsights(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const productResult = await query(
      `select product.*,
              tax_base.name as tax_base_name,
              tax_base.rate as tax_base_rate,
              healthy_tax.name as healthy_tax_name,
              healthy_tax.rate as healthy_tax_rate
         from business_inventory_products product
         left join business_product_tax_bases tax_base on tax_base.id = product.tax_base_id
         left join business_product_healthy_taxes healthy_tax on healthy_tax.id = product.healthy_tax_id
        where product.id = $1 and product.business_id = $2
        limit 1`,
      [req.params.productId, businessId]
    );
    if (!productResult.rowCount) throw badRequest("Producto de inventario no encontrado.");
    const product = productResult.rows[0];
    const insightResult = await query(
      `with matched_sales as (
         select bs.created_at,
                coalesce(nullif(bs.customer_name, ''), 'Cliente sin identificar') as customer_name,
                bs.customer_phone,
                bs.customer_email,
                coalesce(nullif(bs.customer_document_id, ''), nullif(bs.customer_email, ''), nullif(bs.customer_phone, ''), nullif(bs.customer_name, '')) as customer_key,
                greatest(1, coalesce(nullif(line->>'quantity', '')::numeric, 1)) as quantity,
                coalesce(nullif(line->>'line_total', '')::numeric, nullif(line->>'unit_price', '')::numeric, bs.sale_amount, 0)::numeric as revenue
           from business_sales bs
           cross join lateral jsonb_array_elements(coalesce(bs.metadata->'products', '[]'::jsonb)) as line
          where bs.business_id = $1
            and line->>'inventory_product_id' = $2
         union all
         select bs.created_at,
                coalesce(nullif(bs.customer_name, ''), 'Cliente sin identificar') as customer_name,
                bs.customer_phone,
                bs.customer_email,
                coalesce(nullif(bs.customer_document_id, ''), nullif(bs.customer_email, ''), nullif(bs.customer_phone, ''), nullif(bs.customer_name, '')) as customer_key,
                1::numeric as quantity,
                coalesce(bs.sale_amount, 0)::numeric as revenue
           from business_sales bs
          where bs.business_id = $1
            and lower(coalesce(bs.product_name, '')) = lower($3)
            and not exists (
              select 1
                from jsonb_array_elements(coalesce(bs.metadata->'products', '[]'::jsonb)) as line
               where line->>'inventory_product_id' = $2
            )
       ),
       timeline as (
         select created_at::date as day,
                count(*)::int as sales,
                coalesce(sum(quantity), 0)::numeric as units,
                coalesce(sum(revenue), 0)::numeric as revenue
           from matched_sales
          group by created_at::date
          order by created_at::date asc
       ),
       customers as (
         select customer_name,
                max(customer_phone) as customer_phone,
                max(customer_email) as customer_email,
                count(*)::int as purchases,
                coalesce(sum(quantity), 0)::numeric as units,
                coalesce(sum(revenue), 0)::numeric as revenue,
                max(created_at) as last_purchase
           from matched_sales
          group by customer_name, customer_key
          order by revenue desc, last_purchase desc
          limit 60
       )
       select jsonb_build_object(
                'sales_count', (select count(*)::int from matched_sales),
                'units_sold', (select coalesce(sum(quantity), 0)::numeric from matched_sales),
                'revenue', (select coalesce(sum(revenue), 0)::numeric from matched_sales),
                'customers_count', (select count(distinct nullif(customer_key, ''))::int from matched_sales)
              ) as summary,
              coalesce((select jsonb_agg(to_jsonb(timeline) order by day) from timeline), '[]'::jsonb) as timeline,
              coalesce((select jsonb_agg(to_jsonb(customers)) from customers), '[]'::jsonb) as customers`,
      [businessId, req.params.productId, product.name]
    );
    const insights = insightResult.rows[0] || {};
    res.json({
      product,
      summary: insights.summary || { sales_count: 0, units_sold: 0, revenue: 0, customers_count: 0 },
      timeline: Array.isArray(insights.timeline) ? insights.timeline : [],
      customers: Array.isArray(insights.customers) ? insights.customers : [],
    });
  } catch (error) {
    next(error);
  }
}

async function createInventoryProduct(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const productCount = await query(
      "select count(*)::int as total from business_inventory_products where business_id = $1 and status <> 'ARCHIVED'",
      [businessId]
    );
    await assertLimitForBusiness(
      businessId,
      "gift_inventory_products",
      Number(productCount.rows[0]?.total || 0),
      "productos de inventario"
    );
    const body = validate(inventoryProductSchema, req.body);
    const payload = mapInventoryPayload(body, req.user.id);
    if (!payload.internal_id) throw badRequest("El ID interno del producto es obligatorio.");
    const result = await withTransaction(async (client) => {
      Object.assign(payload, await resolveInventoryTaxonomy(client, businessId, payload));
      await ensureInventoryProductUnique(client, businessId, payload);
      return client.query(
        `insert into business_inventory_products
          (business_id, internal_id, sku, barcode, name, description, category, category_id, subcategory_id, brand, brand_id,
           unit_price, price_before_tax, tax_classification, tax_base_id, healthy_tax_id, cost_price, currency, stock_quantity,
           min_stock_quantity, unit_label, unit_id, status, metadata, created_by_user_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb, $25)
         returning *, (stock_quantity <= min_stock_quantity) as low_stock`,
        [
          businessId,
          payload.internal_id,
          payload.sku,
          payload.barcode,
          payload.name,
          payload.description,
          payload.category,
          payload.category_id,
          payload.subcategory_id,
          payload.brand,
          payload.brand_id,
          payload.unit_price,
          payload.price_before_tax,
          payload.tax_classification,
          payload.tax_base_id,
          payload.healthy_tax_id,
          payload.cost_price,
          payload.currency,
          payload.stock_quantity,
          payload.min_stock_quantity,
          payload.unit_label,
          payload.unit_id,
          payload.status,
          JSON.stringify(payload.metadata),
          payload.created_by_user_id,
        ]
      );
    });
    res.status(201).json({ product: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function importInventoryProductsCsv(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const body = validate(inventoryProductCsvImportSchema, req.body);
    const incoming = body.products.map((product) => mapInventoryPayload(product, req.user.id));
    const missingIds = incoming.filter((product) => !product.internal_id).map((product) => product.name);
    if (missingIds.length) {
      throw badRequest(`Cada fila debe incluir ID de producto. Falta en: ${missingIds.slice(0, 6).join(", ")}${missingIds.length > 6 ? "…" : ""}.`);
    }
    const incomingIds = new Set();
    const repeatedIds = [];
    for (const product of incoming) {
      const key = String(product.internal_id).trim().toLowerCase();
      if (incomingIds.has(key)) repeatedIds.push(product.internal_id);
      incomingIds.add(key);
    }
    if (repeatedIds.length) {
      throw badRequest(`El archivo repite ID de producto: ${[...new Set(repeatedIds)].slice(0, 6).join(", ")}. Corrige el CSV antes de importarlo.`);
    }
    const productCount = await query(
      "select count(*)::int as total from business_inventory_products where business_id = $1 and status <> 'ARCHIVED'",
      [businessId]
    );
    await assertLimitForBusiness(
      businessId,
      "gift_inventory_products",
      Number(productCount.rows[0]?.total || 0) + incoming.length - 1,
      "productos de inventario"
    );
    const result = await withTransaction(async (client) => {
      const existingIds = await client.query(
        `select internal_id
           from business_inventory_products
          where business_id = $1
            and lower(internal_id) = any($2::text[])`,
        [businessId, [...incomingIds]]
      );
      if (existingIds.rowCount) {
        throw badRequest(`No se importó el archivo: estos ID de producto ya existen en Qori: ${existingIds.rows.map((row) => row.internal_id).join(", ")}. Corrige el archivo sin reemplazar productos existentes.`);
      }
      const imported = [];
      const skipped = [];
      const seenCodes = new Set();
      for (const payload of incoming) {
        const codes = [payload.sku && `sku:${payload.sku}`, payload.barcode && `barcode:${payload.barcode}`].filter(Boolean);
        const repeatedInFile = codes.some((code) => seenCodes.has(code));
        if (repeatedInFile) {
          if (body.skip_duplicates) {
            skipped.push({ name: payload.name, reason: "Código repetido dentro del archivo" });
            continue;
          }
          throw badRequest(`El CSV repite SKU o código de barras para ${payload.name}.`);
        }
        codes.forEach((code) => seenCodes.add(code));
        try {
          Object.assign(payload, await resolveInventoryTaxonomy(client, businessId, payload));
          await ensureInventoryProductUnique(client, businessId, payload);
        } catch (error) {
          if (body.skip_duplicates) {
            skipped.push({ name: payload.name, reason: "SKU o código de barras ya existe" });
            continue;
          }
          throw error;
        }
        const inserted = await client.query(
          `insert into business_inventory_products
            (business_id, internal_id, sku, barcode, name, description, category, category_id, subcategory_id, brand, brand_id,
             unit_price, price_before_tax, tax_classification, tax_base_id, healthy_tax_id, cost_price, currency, stock_quantity,
             min_stock_quantity, unit_label, unit_id, status, metadata, created_by_user_id)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb, $25)
           returning *, (stock_quantity <= min_stock_quantity) as low_stock`,
          [
            businessId, payload.internal_id, payload.sku, payload.barcode, payload.name, payload.description,
            payload.category, payload.category_id, payload.subcategory_id, payload.brand, payload.brand_id, payload.unit_price,
            payload.price_before_tax, payload.tax_classification, payload.tax_base_id, payload.healthy_tax_id, payload.cost_price, payload.currency,
            payload.stock_quantity, payload.min_stock_quantity, payload.unit_label, payload.unit_id, payload.status,
            JSON.stringify(payload.metadata), payload.created_by_user_id,
          ]
        );
        imported.push(inserted.rows[0]);
      }
      return { imported, skipped };
    });
    res.status(201).json({
      imported: result.imported.length,
      skipped: result.skipped.length,
      skipped_rows: result.skipped,
      products: result.imported,
    });
  } catch (error) {
    next(error);
  }
}

async function updateInventoryProduct(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const body = validate(inventoryProductPatchSchema, req.body);
    const existing = await query(
      "select * from business_inventory_products where id = $1 and business_id = $2",
      [req.params.productId, businessId]
    );
    if (!existing.rowCount) throw badRequest("Producto de inventario no encontrado.");
    if (existing.rows[0].status === "ARCHIVED" && body.status && body.status !== "ARCHIVED") {
      const productCount = await query(
        "select count(*)::int as total from business_inventory_products where business_id = $1 and status <> 'ARCHIVED'",
        [businessId]
      );
      await assertLimitForBusiness(
        businessId,
        "gift_inventory_products",
        Number(productCount.rows[0]?.total || 0),
        "productos de inventario"
      );
    }
    const payload = mapInventoryPayload({ ...existing.rows[0], ...body }, req.user.id);
    const result = await withTransaction(async (client) => {
      Object.assign(payload, await resolveInventoryTaxonomy(client, businessId, payload));
      await ensureInventoryProductUnique(client, businessId, payload, req.params.productId);
      return client.query(
        `update business_inventory_products
         set internal_id = $3, sku = $4, barcode = $5, name = $6, description = $7, category = $8,
             category_id = $9, subcategory_id = $10, brand = $11, brand_id = $12, unit_price = $13,
             price_before_tax = $14, tax_classification = $15, tax_base_id = $16, healthy_tax_id = $17,
             cost_price = $18, currency = $19, stock_quantity = $20, min_stock_quantity = $21, unit_label = $22,
             unit_id = $23, status = $24, metadata = $25::jsonb, updated_at = now()
         where id = $1 and business_id = $2
         returning *, (stock_quantity <= min_stock_quantity) as low_stock`,
        [
          req.params.productId,
          businessId,
          payload.internal_id,
          payload.sku,
          payload.barcode,
          payload.name,
          payload.description,
          payload.category,
          payload.category_id,
          payload.subcategory_id,
          payload.brand,
          payload.brand_id,
          payload.unit_price,
          payload.price_before_tax,
          payload.tax_classification,
          payload.tax_base_id,
          payload.healthy_tax_id,
          payload.cost_price,
          payload.currency,
          payload.stock_quantity,
          payload.min_stock_quantity,
          payload.unit_label,
          payload.unit_id,
          payload.status,
          JSON.stringify(payload.metadata),
        ]
      );
    });
    res.json({ product: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function archiveInventoryProduct(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const body = validate(lifecycleReasonSchema, req.body || {});
    const result = await withTransaction(async (client) => {
      const existing = await client.query(
        "select id, name, status from business_inventory_products where id = $1 and business_id = $2 for update",
        [req.params.productId, businessId]
      );
      if (!existing.rowCount) throw badRequest("Producto de inventario no encontrado.");
      const product = existing.rows[0];
      const usage = await client.query(
        `select count(*)::int as total
           from business_sales sale
          where sale.business_id = $1
            and (
              sale.inventory_product_id = $2
              or exists (
                select 1
                  from jsonb_array_elements(coalesce(sale.metadata->'products', '[]'::jsonb)) line
                 where line->>'inventory_product_id' = $2::text
              )
            )`,
        [businessId, product.id]
      );
      const salesCount = Number(usage.rows[0]?.total || 0);
      if (salesCount > 0) {
        throw badRequest(`No puedes eliminar este producto porque tiene ${salesCount} venta(s) o movimiento(s) asociado(s). Se conserva para proteger el historial.`);
      }
      await client.query(
        "delete from business_inventory_products where id = $1 and business_id = $2",
        [product.id, businessId]
      );
      await recordLifecycleEvent({
        business_id: businessId, entity_type: "INVENTORY_PRODUCT", entity_id: product.id,
        action: "DELETED", previous_status: product.status, next_status: "DELETED", reason: body.reason,
        idempotency_key: body.idempotency_key || `inventory-delete:${product.id}`,
        actor_user_id: req.user.id, metadata: { product_name: product.name },
      }, client);
      return { product, duplicate: false };
    });
    res.json({ ok: true, product: result.product, deleted: true, duplicate: result.duplicate });
  } catch (error) {
    next(error);
  }
}

async function listCampaigns(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const campaigns = await getBusinessCampaignMetrics(businessId);
    res.json({
      summary: await getBusinessSummary(businessId),
      groups: {
        ready_for_launch: campaigns.filter((campaign) => campaign.status === "READY_FOR_CLIENT_SETUP"),
        scheduled: campaigns.filter((campaign) => campaign.status === "SCHEDULED"),
        active: campaigns.filter((campaign) => campaign.status === "ACTIVE"),
        finished: campaigns.filter((campaign) => ["FINISHED", "ARCHIVED"].includes(campaign.status)),
      },
      campaigns,
    });
  } catch (error) {
    next(error);
  }
}

async function createCampaign(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_reports");
    const body = validate(ownerCampaignSchema, {
      ...req.body,
      slug: req.body.slug || req.body.name,
    });

    const activeCount = await query(
      `select count(*)::int as total
       from campaigns
       where business_id = $1 and status not in ('FINISHED', 'ARCHIVED')`,
      [businessId]
    );
    await assertLimitForBusiness(
      businessId,
      "active_campaigns",
      Number(activeCount.rows[0]?.total || 0),
      "campanas activas"
    );
    const launchChannelRefs = await withTransaction((client) => resolveCampaignChannelReferences(
      client,
      businessId,
      body.launch_channel_refs,
      body.launch_channels || []
    ));
    const launchChannelNames = launchChannelRefs.map((channel) => channel.name_snapshot).filter(Boolean);
    assertCampaignOperationalReadiness({ ...body, launch_channels: launchChannelNames });

    const result = await query(
      `insert into campaigns
        (business_id, name, slug, public_slug, type, objective, strategy_summary, status,
         starts_at, ends_at, budget_total, expected_sales_goal, expected_leads_goal,
         expected_redemptions_goal, launch_channels, client_notes, delivered_assets,
         client_setup_completed_at, activated_at, launch_channel_refs, metadata)
       values ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16::jsonb,
         case when $7 in ('SCHEDULED', 'ACTIVE') then now() else null end,
         case when $7 = 'ACTIVE' then now() else null end,
         $17::jsonb, $18::jsonb)
       returning id`,
      [
        businessId,
        body.name,
        body.slug,
        body.type,
        body.objective || null,
        body.strategy_summary || null,
        body.status,
        body.starts_at || null,
        body.ends_at || null,
        body.budget_total,
        body.expected_sales_goal ?? null,
        body.expected_leads_goal ?? null,
        body.expected_redemptions_goal ?? null,
        JSON.stringify(launchChannelNames),
        body.client_notes || null,
        JSON.stringify(body.delivered_assets || {}),
        JSON.stringify(launchChannelRefs),
        JSON.stringify({
          owner_created: true,
          creation_source: "business_portal",
          campaign_cost_calculator: body.campaign_cost_calculator || {},
          channel_investments: body.campaign_cost_calculator?.channel_investments || [],
        }),
      ]
    );

    res.status(201).json({ campaign: await getCampaignMetrics(result.rows[0].id, businessId) });
  } catch (error) {
    next(error);
  }
}

async function updateCampaign(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "campaign_reports");
    const current = await requireCampaignForBusiness(req.params.id, businessId);
    const body = validate(ownerCampaignPatchSchema, req.body);
    const hasLaunchChannels = Object.prototype.hasOwnProperty.call(body, "launch_channels")
      || Object.prototype.hasOwnProperty.call(body, "launch_channel_refs");
    const launchChannelRefs = hasLaunchChannels
      ? await withTransaction((client) => resolveCampaignChannelReferences(client, businessId, body.launch_channel_refs, body.launch_channels || []))
      : null;
    const launchChannelNames = launchChannelRefs ? launchChannelRefs.map((channel) => channel.name_snapshot).filter(Boolean) : null;
    assertCampaignOperationalReadiness({
      ...current,
      ...body,
      objective: body.objective ?? current.objective,
      starts_at: body.starts_at ?? current.starts_at,
      ends_at: body.ends_at ?? current.ends_at,
      budget_total: body.budget_total ?? current.budget_total,
      launch_channels: launchChannelNames ?? current.launch_channels,
    });
    const deliveredAssets = Object.prototype.hasOwnProperty.call(body, "delivered_assets")
      ? JSON.stringify(body.delivered_assets || {})
      : null;

    const result = await query(
      `update campaigns
       set name = coalesce($3, name),
           slug = coalesce($4, slug),
           public_slug = coalesce($4, public_slug),
           type = coalesce($5, type),
           objective = case when $6::text is null then objective else $6 end,
           strategy_summary = case when $7::text is null then strategy_summary else $7 end,
           status = coalesce($8, status),
           starts_at = case when $9::timestamptz is null then starts_at else $9 end,
           ends_at = case when $10::timestamptz is null then ends_at else $10 end,
           budget_total = coalesce($11, budget_total),
           expected_sales_goal = case when $12::numeric is null then expected_sales_goal else $12 end,
           expected_leads_goal = case when $13::numeric is null then expected_leads_goal else $13 end,
           expected_redemptions_goal = case when $14::numeric is null then expected_redemptions_goal else $14 end,
           launch_channels = case when $15::jsonb is null then launch_channels else $15 end,
           client_notes = case when $16::text is null then client_notes else $16 end,
           delivered_assets = case when $17::jsonb is null then delivered_assets else $17 end,
           metadata = case
             when $18::jsonb is null then metadata
             else jsonb_set(
               jsonb_set(coalesce(metadata, '{}'::jsonb), '{campaign_cost_calculator}', $18::jsonb, true),
               '{channel_investments}',
               coalesce($18::jsonb->'channel_investments', '[]'::jsonb),
               true
             )
           end,
           client_setup_completed_at = case when coalesce($8, status) in ('SCHEDULED', 'ACTIVE') then coalesce(client_setup_completed_at, now()) else client_setup_completed_at end,
           activated_at = case when coalesce($8, status) = 'ACTIVE' then coalesce(activated_at, now()) else activated_at end
       where id = $1 and business_id = $2
       returning id`,
      [
        req.params.id,
        businessId,
        body.name || null,
        body.slug || null,
        body.type || null,
        body.objective ?? null,
        body.strategy_summary ?? null,
        body.status || null,
        body.starts_at || null,
        body.ends_at || null,
        body.budget_total ?? null,
        body.expected_sales_goal ?? null,
        body.expected_leads_goal ?? null,
        body.expected_redemptions_goal ?? null,
        hasLaunchChannels ? JSON.stringify(launchChannelNames || []) : null,
        body.client_notes ?? null,
        deliveredAssets,
        Object.prototype.hasOwnProperty.call(body, "campaign_cost_calculator") ? JSON.stringify(body.campaign_cost_calculator || {}) : null,
      ]
    );

    if (launchChannelRefs) {
      await query(
        "update campaigns set launch_channel_refs = $3::jsonb where id = $1 and business_id = $2",
        [req.params.id, businessId, JSON.stringify(launchChannelRefs)]
      );
    }

    res.json({ campaign: await getCampaignMetrics(result.rows[0].id, businessId) });
  } catch (error) {
    next(error);
  }
}

async function getCampaign(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const campaign = await getCampaignMetrics(req.params.id, businessId);
    if (!campaign) {
      throw notFound("Campaign not found.");
    }
    res.json({ campaign });
  } catch (error) {
    next(error);
  }
}

async function patchClientSetup(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(clientSetupSchema, req.body);
    const current = await requireCampaignForBusiness(req.params.id, businessId);
    assertClientSetupEditable(current.status);

    const launchChannelRefs = await withTransaction((client) => resolveCampaignChannelReferences(
      client,
      businessId,
      body.launch_channel_refs,
      body.launch_channels || []
    ));
    const launchChannelNames = launchChannelRefs.map((channel) => channel.name_snapshot).filter(Boolean);

    if (launchChannelRefs.some((channel) => channel.source === "MANUAL_UNCONFIGURED") && !body.client_notes) {
      throw badRequest("Describe el canal temporal en las observaciones de la campaña.");
    }

    const result = await query(
      `update campaigns
       set budget_total = $3,
           starts_at = $4,
           ends_at = $5,
           launch_channels = $6::jsonb,
           launch_channel_refs = $7::jsonb,
           expected_sales_goal = $8,
           expected_leads_goal = $9,
           expected_redemptions_goal = $10,
           client_notes = $11,
           objective = coalesce($12, objective),
           metadata = jsonb_set(
             jsonb_set(coalesce(metadata, '{}'::jsonb), '{additional_budget}', to_jsonb($13::numeric), true),
             '{campaign_cost_calculator}',
             $14::jsonb,
             true
           ),
           client_setup_completed_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [
        req.params.id,
        businessId,
        body.budget_total,
        body.starts_at,
        body.ends_at,
        JSON.stringify(launchChannelNames),
        JSON.stringify(launchChannelRefs),
        body.expected_sales_goal ?? null,
        body.expected_leads_goal ?? null,
        body.expected_redemptions_goal ?? null,
        body.client_notes ?? null,
        body.objective ?? null,
        body.additional_budget ?? 0,
        JSON.stringify(body.campaign_cost_calculator || {}),
      ]
    );
    res.json({ campaign: await getCampaignMetrics(result.rows[0].id, businessId) });
  } catch (error) {
    next(error);
  }
}

async function confirmLaunch(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const current = await requireCampaignForBusiness(req.params.id, businessId);
    assertClientSetupEditable(current.status);

    const startsAt = new Date(current.starts_at);
    const nextStatus = startsAt <= new Date() ? "ACTIVE" : "SCHEDULED";
    assertCampaignOperationalReadiness({ ...current, status: nextStatus });
    const activatedAt = nextStatus === "ACTIVE" ? new Date().toISOString() : null;
    const result = await query(
      `update campaigns
       set status = $3,
           activated_at = coalesce($4, activated_at),
           client_setup_completed_at = coalesce(client_setup_completed_at, now())
       where id = $1 and business_id = $2
       returning *`,
      [req.params.id, businessId, nextStatus, activatedAt]
    );
    res.json({ campaign: await getCampaignMetrics(result.rows[0].id, businessId) });
  } catch (error) {
    next(error);
  }
}

async function campaignReport(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const campaign = await getCampaignMetrics(req.params.id, businessId);
    if (!campaign) {
      throw notFound("Campaign not found.");
    }

    const [redemptionsByDay, salesByDay, snapshots] = await Promise.all([
      query(
        `select to_char(redeemed_at::date, 'YYYY-MM-DD') as date, count(*)::int as count
         from redemptions
         where campaign_id = $1 and business_id = $2
         group by redeemed_at::date
         order by redeemed_at::date`,
        [req.params.id, businessId]
      ),
      query(
        `select to_char(day::date, 'YYYY-MM-DD') as date,
                count(*)::int as sales,
                coalesce(sum(sale_amount), 0)::numeric(14, 2) as revenue
         from (
           select created_at as day, sale_amount
           from attributed_sales
           where campaign_id = $1 and business_id = $2
           union all
           select created_at as day, sale_amount
           from business_sales
           where campaign_id = $1 and business_id = $2
         ) sales
         group by day::date
         order by day::date`,
        [req.params.id, businessId]
      ),
      query(
        `select period_type, start_date, end_date, total_sales_amount, total_orders, notes, created_at
         from campaign_sales_snapshots
         where campaign_id = $1 and business_id = $2
         order by created_at desc`,
        [req.params.id, businessId]
      ),
    ]);

    res.json({
      campaign,
      redemptions_by_day: redemptionsByDay.rows,
      sales_by_day: salesByDay.rows,
      sales_snapshots: snapshots.rows,
      indirect_metrics: {
        baseline_sales: campaign.baseline_sales,
        campaign_period_sales: campaign.campaign_period_sales,
        after_sales: campaign.after_sales,
        sales_uplift: campaign.sales_uplift,
        estimated_uplift_roi: campaign.estimated_uplift_roi,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function campaignLeads(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "leads_view");
    const limit = boundedLimit(req.query.limit, 150, 500);
    res.json({ leads: await getCampaignLeadRows(businessId, req.params.id, limit) });
  } catch (error) {
    next(error);
  }
}

async function assertManualLeadWriteAccess(businessId) {
  const subscription = await getBusinessSubscription(businessId);
  if (subscription.plan.raw_status !== "ACTIVE") {
    throw forbidden("La suscripcion del negocio no esta activa.");
  }
  if (subscription.plan.category === "subscription" && !subscription.plan.portal_access_allowed) {
    throw forbidden(`La mensualidad vencio y ya pasaron los ${subscription.plan.grace_period_days} dias de gracia. Renueva para recuperar tus leads y el portal.`);
  }
  return subscription;
}

async function upsertManualLeadCollectorState(client, businessId, user, lead, options = {}) {
  const sourceType = ["PLAYER", "MANUAL", "BUYER", "AFFILIATE"].includes(String(lead?.source_type || "").toUpperCase())
    ? String(lead.source_type).toUpperCase()
    : "MANUAL";
  const sourceId = lead?.id;
  if (!sourceId) throw badRequest("No se pudo identificar el contacto para ingresarlo al Recolector.");
  await client.query(
    `insert into rms_lead_state
       (business_id, source_type, source_id, lead_id, rms_phase, priority, recommended_action, last_operation, last_material_sent, revenue_potential, metadata, created_by, updated_by)
     values ($1, $2, $3, $4, 'recoleccion', $5, $6, $7, $8, 0, $9::jsonb, $10, $10)
     on conflict (business_id, source_type, source_id)
     do update set
       lead_id = excluded.lead_id,
       rms_phase = coalesce(rms_lead_state.rms_phase, excluded.rms_phase),
       priority = excluded.priority,
       recommended_action = coalesce(excluded.recommended_action, rms_lead_state.recommended_action),
       last_operation = coalesce(excluded.last_operation, rms_lead_state.last_operation),
       last_material_sent = coalesce(excluded.last_material_sent, rms_lead_state.last_material_sent),
       metadata = coalesce(rms_lead_state.metadata, '{}'::jsonb) || excluded.metadata,
       updated_by = excluded.updated_by,
       updated_at = now()`,
    [
      businessId,
      sourceType,
      sourceId,
      lead.lead_id || sourceId,
      lead.priority || options.priority || "MEDIUM",
      options.recommended_action || "Revisar lead ingresado al Recolector RMS",
      options.last_operation || null,
      options.last_material_sent || lead.source || "manual",
      JSON.stringify({
        source_module: "rms_machine",
        source_flow: options.source_flow || (sourceType === "MANUAL" ? "manual_lead_entry" : "collector_contact_reuse"),
        source_type: sourceType,
        collector_type: options.collector_type || lead.source || "manual",
        customer_source: lead.source || "Manual",
        source_detail: lead.source_detail || null,
      }),
      user.id,
    ]
  );
}

function manualContactIdentity(contact = {}) {
  return {
    email: String(contact.email || "").trim().toLowerCase() || null,
    phone: String(contact.phone || "").replace(/\D/g, "") || null,
    documentId: String(contact.document_id || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "") || null,
  };
}

async function listInventoryCategories(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const result = await query(
      `select category.*,
              count(product.id)::int as products_count
         from business_product_categories category
         left join business_inventory_products product
           on product.business_id = category.business_id
          and product.category_id = category.id
        where category.business_id = $1
        group by category.id
        order by category.name asc`,
      [businessId]
    );
    res.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createInventoryCategory(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const body = validate(inventoryCategorySchema, req.body);
    const result = await query(
      `insert into business_product_categories (business_id, internal_id, name, created_by_user_id)
       values ($1, $2, $3, $4)
       returning *`,
      [businessId, body.internal_id, body.name, req.user.id]
    );
    res.status(201).json({ category: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function listInventorySubcategories(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const categoryId = String(req.query.category_id || "").trim();
    const params = [businessId];
    const categoryWhere = categoryId ? "and subcategory.category_id = $2" : "";
    if (categoryId) params.push(categoryId);
    const result = await query(
      `select subcategory.*, category.name as category_name, category.internal_id as category_internal_id,
              count(product.id)::int as products_count
         from business_product_subcategories subcategory
         join business_product_categories category
           on category.id = subcategory.category_id
          and category.business_id = subcategory.business_id
         left join business_inventory_products product
           on product.business_id = subcategory.business_id
          and product.subcategory_id = subcategory.id
        where subcategory.business_id = $1
          ${categoryWhere}
        group by subcategory.id, category.name, category.internal_id
        order by category.name asc, subcategory.name asc`,
      params
    );
    res.json({ subcategories: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createInventorySubcategory(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const body = validate(inventorySubcategorySchema, req.body);
    const category = await query(
      "select id from business_product_categories where id = $1 and business_id = $2 limit 1",
      [body.category_id, businessId]
    );
    if (!category.rowCount) throw badRequest("Selecciona una categoría creada en este negocio.");
    const result = await query(
      `insert into business_product_subcategories (business_id, category_id, internal_id, name, created_by_user_id)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [businessId, body.category_id, body.internal_id, body.name, req.user.id]
    );
    res.status(201).json({ subcategory: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

const inventoryCatalogDefinitions = Object.freeze({
  brands: { table: "business_product_brands", key: "brand", label: "marca", hasRate: false },
  units: { table: "business_product_units", key: "unit", label: "unidad de medida", hasRate: false },
  "tax-bases": { table: "business_product_tax_bases", key: "tax_base", label: "IVA base", hasRate: true },
  "healthy-taxes": { table: "business_product_healthy_taxes", key: "healthy_tax", label: "impuesto saludable", hasRate: true },
});

async function ensureInventoryCatalogDefaults(client, businessId) {
  await client.query(
    `insert into business_product_units (business_id, internal_id, name)
     select $1, source.internal_id, source.name from (values ('METRO','Metro'),('KG','Kg'),('LITRO','Litro'),('UNIDAD','Unidad')) source(internal_id, name)
     on conflict do nothing`, [businessId]
  );
  await client.query(
    `insert into business_product_tax_bases (business_id, internal_id, name, rate)
     select $1, source.internal_id, source.name, source.rate from (values ('EXENTO_0','Exento/0%',0::numeric),('EXCLUIDO','Excluido',0::numeric),('IVA_5','5%',.05::numeric),('IVA_8','8%',.08::numeric),('IVA_19','19%',.19::numeric)) source(internal_id, name, rate)
     on conflict do nothing`, [businessId]
  );
  await client.query(
    `insert into business_product_healthy_taxes (business_id, internal_id, name, rate)
     select $1, source.internal_id, source.name, source.rate from (values ('NO_APLICA','No Aplica',0::numeric),('IMPUESTO_20','20%',.20::numeric)) source(internal_id, name, rate)
     on conflict do nothing`, [businessId]
  );
}

async function listInventoryCatalog(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const definition = inventoryCatalogDefinitions[req.params.catalog];
    if (!definition) throw badRequest("Catálogo de producto no reconocido.");
    const result = await withTransaction(async (client) => {
      await ensureInventoryCatalogDefaults(client, businessId);
      return client.query(`select id, internal_id, name${definition.hasRate ? ", rate" : ""}, created_at, updated_at from ${definition.table} where business_id = $1 order by name asc`, [businessId]);
    });
    res.json({ [definition.key + "s"]: result.rows });
  } catch (error) { next(error); }
}

async function createInventoryCatalog(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "gift_inventory");
    const definition = inventoryCatalogDefinitions[req.params.catalog];
    if (!definition) throw badRequest("Catálogo de producto no reconocido.");
    const body = validate(inventoryReferenceSchema, req.body);
    if (definition.hasRate && (body.rate === undefined || body.rate === null)) throw badRequest(`Indica el porcentaje de ${definition.label}.`);
    const existing = await query(
      `select name from ${definition.table} where business_id = $1 and lower(internal_id) = lower($2) limit 1`,
      [businessId, body.internal_id]
    );
    if (existing.rowCount) {
      throw badRequest(`El ID interno “${body.internal_id}” ya pertenece a la ${definition.label} “${existing.rows[0].name}”. Usa esa referencia o escribe un ID diferente.`);
    }
    const result = await query(
      `insert into ${definition.table} (business_id, internal_id, name${definition.hasRate ? ", rate" : ""}, created_by_user_id)
       values ($1, $2, $3${definition.hasRate ? ", $4" : ""}, $${definition.hasRate ? 5 : 4}) returning *`,
      definition.hasRate ? [businessId, body.internal_id, body.name, body.rate, req.user.id] : [businessId, body.internal_id, body.name, req.user.id]
    );
    res.status(201).json({ [definition.key]: result.rows[0] });
  } catch (error) {
    if (error?.code === "23505" && /internal_id/i.test(String(error.constraint || ""))) {
      return next(badRequest(`Ese ID interno ya existe para esta ${inventoryCatalogDefinitions[req.params.catalog]?.label || "referencia"}. Escribe uno diferente.`));
    }
    next(error);
  }
}

const inventoryReferenceTables = Object.freeze({
  brand: { table: "business_product_brands", id: "brand_id", name: "brand", internal: "brand_internal_id", hasRate: false },
  unit: { table: "business_product_units", id: "unit_id", name: "unit_label", internal: "unit_internal_id", hasRate: false },
  taxBase: { table: "business_product_tax_bases", id: "tax_base_id", name: "tax_base", internal: "tax_base", hasRate: true },
  healthyTax: { table: "business_product_healthy_taxes", id: "healthy_tax_id", name: "healthy_tax", internal: "healthy_tax", hasRate: true },
});

async function resolveInventoryReference(client, businessId, payload, kind) {
  const config = inventoryReferenceTables[kind];
  const id = payload[config.id] || null;
  const lookup = id ? null : (payload[config.internal] || payload[config.name] || null);
  if (!id && !lookup) return null;
  const result = await client.query(
    `select id, internal_id, name, ${config.hasRate ? "coalesce(rate, 0)::numeric" : "0::numeric"} as rate
       from ${config.table}
      where business_id = $1
        and ($2::uuid is null or id = $2)
        and ($3::text is null or lower(internal_id) = lower($3) or lower(name) = lower($3))
      order by case when id = $2 then 0 when lower(internal_id) = lower($3) then 1 else 2 end
      limit 1`,
    [businessId, id, lookup]
  );
  if (!result.rowCount) throw badRequest(`La referencia de ${kind === "taxBase" ? "IVA base" : kind === "healthyTax" ? "impuesto saludable" : kind === "unit" ? "unidad de medida" : "marca"} no existe en este negocio.`);
  return result.rows[0];
}

async function resolveInventoryTaxonomy(client, businessId, payload, options = {}) {
  let categoryId = payload.category_id || null;
  if (!categoryId && payload.category_internal_id) {
    const categoryByInternalId = await client.query(
      `select id, name, internal_id
         from business_product_categories
        where business_id = $1
          and (
            lower(internal_id) = lower($2)
            or lower(name) = lower($2)
            or id::text = $2
          )
        order by case
          when lower(internal_id) = lower($2) then 0
          when id::text = $2 then 1
          else 2
        end
        limit 1`,
      [businessId, payload.category_internal_id]
    );
    categoryId = categoryByInternalId.rows[0]?.id || null;
  }
  if (!categoryId && payload.category) {
    const categoryByName = await client.query(
      `select id, name, internal_id
         from business_product_categories
        where business_id = $1 and lower(name) = lower($2)
        limit 1`,
      [businessId, payload.category]
    );
    categoryId = categoryByName.rows[0]?.id || null;
  }
  if (!categoryId && options.categoryRequired !== false) {
    throw badRequest("Selecciona una categoría creada para este producto.");
  }

  let category = null;
  if (categoryId) {
    const categoryResult = await client.query(
      "select id, name, internal_id from business_product_categories where id = $1 and business_id = $2 limit 1",
      [categoryId, businessId]
    );
    category = categoryResult.rows[0] || null;
    if (!category) throw badRequest("La categoría seleccionada no pertenece a este negocio.");
  }

  let subcategoryId = payload.subcategory_id || null;
  if (!subcategoryId && payload.subcategory_internal_id) {
    const subcategoryByInternalId = await client.query(
      `select id, category_id, name, internal_id
         from business_product_subcategories
        where business_id = $1
          and (
            lower(internal_id) = lower($2)
            or lower(name) = lower($2)
            or id::text = $2
          )
        order by case
          when lower(internal_id) = lower($2) then 0
          when id::text = $2 then 1
          else 2
        end
        limit 1`,
      [businessId, payload.subcategory_internal_id]
    );
    subcategoryId = subcategoryByInternalId.rows[0]?.id || null;
  }
  if (!subcategoryId && payload.subcategory) {
    const subcategoryByName = await client.query(
      `select id, category_id, name, internal_id
         from business_product_subcategories
        where business_id = $1
          and lower(name) = lower($2)
          ${category?.id ? "and category_id = $3" : ""}
        limit 1`,
      category?.id ? [businessId, payload.subcategory, category.id] : [businessId, payload.subcategory]
    );
    subcategoryId = subcategoryByName.rows[0]?.id || null;
  }
  let subcategory = null;
  if (subcategoryId) {
    const subcategoryResult = await client.query(
      `select id, category_id, name, internal_id
         from business_product_subcategories
        where id = $1 and business_id = $2
        limit 1`,
      [subcategoryId, businessId]
    );
    subcategory = subcategoryResult.rows[0] || null;
    if (!subcategory) throw badRequest("La subcategoría seleccionada no pertenece a este negocio.");
    if (!category || String(subcategory.category_id) !== String(category.id)) {
      throw badRequest("La subcategoría debe pertenecer a la categoría elegida.");
    }
  }
  const [brand, unit, taxBase, healthyTax] = await Promise.all([
    resolveInventoryReference(client, businessId, payload, "brand"),
    resolveInventoryReference(client, businessId, payload, "unit"),
    resolveInventoryReference(client, businessId, payload, "taxBase"),
    resolveInventoryReference(client, businessId, payload, "healthyTax"),
  ]);
  const taxClassificationByRate = taxBase
    ? (Number(taxBase.rate || 0) === 0 ? (String(taxBase.name).toLowerCase().includes("excl") ? "EXCLUDED" : "EXEMPT") : `VAT_${Math.round(Number(taxBase.rate) * 100)}`)
    : payload.tax_classification;
  const resolved = {
    category_id: category?.id || null,
    category: category?.name || payload.category || null,
    subcategory_id: subcategory?.id || null,
    brand_id: brand?.id || null,
    brand: brand?.name || payload.brand || null,
    unit_id: unit?.id || null,
    unit_label: unit?.name || payload.unit_label || "Unidad",
    tax_base_id: taxBase?.id || null,
    tax_classification: taxClassificationByRate || "EXEMPT",
    healthy_tax_id: healthyTax?.id || null,
    healthy_tax_rate: Number(healthyTax?.rate || 0),
  };
  resolved.unit_price = inventorySellingPrice(payload.price_before_tax, resolved.tax_classification, resolved.healthy_tax_rate);
  return resolved;
}

async function findExistingBusinessContact(client, businessId, contact = {}) {
  const identity = manualContactIdentity(contact);
  if (!identity.email && !identity.phone && !identity.documentId) return null;
  const result = await client.query(
    `select *
       from (
         select p.id, p.id as lead_id, 'PLAYER'::text as source_type, p.name, p.email, p.phone, p.document_id, null::text as document_type, p.created_at, 1 as source_rank
           from players p
          where p.business_id = $1
            and (($2::text is not null and lower(nullif(p.email, '')) = $2)
              or ($3::text is not null and regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g') = $3)
              or ($4::text is not null and regexp_replace(lower(coalesce(p.document_id, '')), '[^a-z0-9]', '', 'g') = $4))
         union all
         select ml.id, null::uuid as lead_id, 'MANUAL'::text as source_type, ml.name, ml.email, ml.phone, ml.document_id, ml.document_type, ml.created_at, 2 as source_rank
           from business_manual_leads ml
          where ml.business_id = $1
            and (($2::text is not null and lower(nullif(ml.email, '')) = $2)
              or ($3::text is not null and regexp_replace(coalesce(ml.phone, ''), '\\D', '', 'g') = $3)
              or ($4::text is not null and regexp_replace(lower(coalesce(ml.document_id, '')), '[^a-z0-9]', '', 'g') = $4))
         union all
         select af.id, null::uuid as lead_id, 'AFFILIATE'::text as source_type, af.full_name as name, af.email, af.phone, af.document_id, null::text as document_type, af.created_at, 3 as source_rank
           from affiliates af
          where af.business_id = $1 and af.status <> 'DELETED'
            and (($2::text is not null and lower(nullif(af.email, '')) = $2)
              or ($3::text is not null and regexp_replace(coalesce(af.phone, ''), '\\D', '', 'g') = $3)
              or ($4::text is not null and regexp_replace(lower(coalesce(af.document_id, '')), '[^a-z0-9]', '', 'g') = $4))
       ) contacts
      order by source_rank asc, created_at asc
      limit 1`,
    [businessId, identity.email, identity.phone, identity.documentId]
  );
  return result.rows[0] || null;
}

async function recordExistingContactIntake(client, businessId, user, contact, metadata = {}) {
  await client.query(
    `insert into lead_events
      (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
     values ($1, $2, $3, $4, 'contact_intake_reused', 'Contacto ya existente', $5, $6, $7::jsonb)`,
    [
      businessId,
      contact.source_type === "PLAYER" ? contact.id : null,
      contact.source_type,
      contact.id,
      "Se registró un nuevo intento de ingreso sin crear una ficha duplicada.",
      user?.id || null,
      JSON.stringify(metadata),
    ]
  );
}

async function attachManualIdentityToExistingContact(client, businessId, contact, identity = {}) {
  if (!identity.document_id || String(contact.document_id || "").trim()) return;
  if (contact.source_type === "MANUAL") {
    await client.query(
      `update business_manual_leads
          set document_type = $3, document_id = $4
        where business_id = $1 and id = $2 and nullif(document_id, '') is null`,
      [businessId, contact.id, identity.document_type || null, identity.document_id]
    );
    return;
  }
  if (contact.source_type === "PLAYER") {
    await client.query(
      `update players set document_id = $3
        where business_id = $1 and id = $2 and nullif(document_id, '') is null`,
      [businessId, contact.id, identity.document_id]
    );
    return;
  }
  if (contact.source_type === "AFFILIATE") {
    await client.query(
      `update affiliates set document_id = $3
        where business_id = $1 and id = $2 and nullif(document_id, '') is null`,
      [businessId, contact.id, identity.document_id]
    );
  }
}

async function createManualLead(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertManualLeadWriteAccess(businessId);
    const body = validate(manualLeadSchema, req.body);
    if (!body.email && !body.phone) {
      throw badRequest("Agrega al menos telefono o correo para poder contactar el prospecto.");
    }
    if (body.source === "Maquina RMS" && (!body.document_type || !body.document_id)) {
      throw badRequest("Selecciona el tipo y escribe el nÃºmero de documento antes de ingresar el lead al Recolector RMS.");
    }
    const lead = await withTransaction(async (client) => {
      const acquisitionChannel = await resolveAcquisitionChannelReference(client, businessId, body);
      let branchId = body.branch_id || null;
      if (branchId) {
        const branch = await client.query(
          "select id from branches where id = $1 and business_id = $2 and is_active = true",
          [branchId, businessId]
        );
        if (!branch.rowCount) throw badRequest("La sede seleccionada no existe o no está activa para este negocio.");
      }
      const commercialOwner = await commercialOwnerForBusiness(
        businessId,
        body.commercial_owner_user_id,
        (...args) => client.query(...args)
      );
      const existing = await findExistingBusinessContact(client, businessId, body);
      if (existing) {
        const incomingIdentity = manualContactIdentity(body);
        const existingIdentity = manualContactIdentity(existing);
        if (incomingIdentity.documentId && existingIdentity.documentId && incomingIdentity.documentId !== existingIdentity.documentId) {
          throw badRequest("El correo o teléfono ya pertenece a un contacto con otro documento. Revisa los datos antes de crear el lead.");
        }
        await attachManualIdentityToExistingContact(client, businessId, existing, body);
        await recordExistingContactIntake(client, businessId, req.user, existing, {
          source: "manual_portal_entry",
          attempted_name: body.name || null,
          interest: body.interest || null,
          source_detail: body.source_detail || null,
          document_type: body.document_type || null,
          document_id: body.document_id || null,
        });
        await upsertManualLeadCollectorState(client, businessId, req.user, existing, {
          source_flow: "collector_existing_contact",
          recommended_action: body.preferred_channel ? `Contactar por ${body.preferred_channel}` : "Revisar contacto ingresado al Recolector RMS",
          last_material_sent: body.source || "Manual",
          priority: body.priority || "MEDIUM",
        });
        return { lead: existing, existed: true };
      }
      const result = await client.query(
        `insert into business_manual_leads
           (business_id, created_by_user_id, name, email, phone, document_type, document_id, company, job_title, source, source_detail,
            branch_id, acquisition_channel_id, acquisition_channel_name_snapshot, acquisition_channel_slug_snapshot,
            acquisition_channel_source, interest, importance_reason, preferred_channel, preferred_contact_time,
            status, priority, notes, metadata)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb)
         returning *`,
        [
          businessId,
          req.user.id,
          body.name,
          body.email,
          body.phone,
          body.document_type || null,
          body.document_id || null,
          body.company,
          body.job_title,
          body.source || "Manual",
          body.source_detail,
          branchId,
          acquisitionChannel.acquisition_channel_id,
          acquisitionChannel.acquisition_channel_name_snapshot,
          acquisitionChannel.acquisition_channel_slug_snapshot,
          acquisitionChannel.acquisition_channel_source,
          body.interest,
          body.importance_reason,
          body.preferred_channel,
          body.preferred_contact_time,
          body.status,
          body.priority,
          body.notes,
          JSON.stringify({
            source: "manual_portal_entry",
            branch_id: branchId,
            acquisition_channel: {
              id: acquisitionChannel.acquisition_channel_id,
              name_snapshot: acquisitionChannel.acquisition_channel_name_snapshot,
              slug_snapshot: acquisitionChannel.acquisition_channel_slug_snapshot,
              source: acquisitionChannel.acquisition_channel_source,
            },
            created_by_email: req.user.email || null,
            commercial_owner_user_id: commercialOwner?.id || null,
            commercial_owner_name: commercialOwner?.full_name || null,
            commercial_owner_email: commercialOwner?.email || null,
            manual_job_title: body.job_title || null,
            manual_importance_reason: body.importance_reason || null,
            identity_document: body.document_id ? {
              type: body.document_type || null,
              value: body.document_id,
            } : null,
          }),
        ]
      );
      await upsertManualLeadCollectorState(client, businessId, req.user, result.rows[0], {
        source_flow: "manual_portal_entry",
        recommended_action: body.preferred_channel ? `Contactar por ${body.preferred_channel}` : "Revisar lead ingresado al Recolector RMS",
        last_material_sent: body.source || "Manual",
      });
      return { lead: result.rows[0], existed: false };
    });
    res.status(lead.existed ? 200 : 201).json({ lead: lead.lead, existed: lead.existed });
  } catch (error) {
    next(error);
  }
}

async function importManualLeadsCsv(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertManualLeadWriteAccess(businessId);
    const body = validate(manualLeadCsvImportSchema, req.body);
    const rows = body.contacts.map((contact, index) => ({
      ...contact,
      source: contact.source || body.source || "CSV import",
      source_detail: contact.source_detail || body.source_detail,
      status: contact.status || "NEW",
      priority: contact.priority || "MEDIUM",
      csv_row: index + 2,
    }));
    const invalidRows = rows
      .filter((row) => !row.email && !row.phone && !row.document_id)
      .map((row) => row.csv_row);
    if (invalidRows.length) {
      throw badRequest(`Filas sin teléfono, correo ni documento: ${invalidRows.slice(0, 20).join(", ")}.`);
    }

    const inserted = await withTransaction(async (client) => {
      const created = [];
      const existing = [];
      for (const row of rows) {
        const matchedContact = await findExistingBusinessContact(client, businessId, row);
        if (matchedContact) {
          const incomingIdentity = manualContactIdentity(row);
          const existingIdentity = manualContactIdentity(matchedContact);
          if (incomingIdentity.documentId && existingIdentity.documentId && incomingIdentity.documentId !== existingIdentity.documentId) {
            throw badRequest(`Fila ${row.csv_row}: el correo o teléfono pertenece a un contacto con otro documento. Corrige la identidad antes de importar.`);
          }
          await attachManualIdentityToExistingContact(client, businessId, matchedContact, row);
          await recordExistingContactIntake(client, businessId, req.user, matchedContact, {
            source: "manual_csv_import",
            csv_row: row.csv_row,
            attempted_name: row.name || null,
            interest: row.interest || null,
            document_type: row.document_type || null,
            document_id: row.document_id || null,
          });
          existing.push({ ...matchedContact, csv_row: row.csv_row });
          continue;
        }
        const result = await client.query(
          `insert into business_manual_leads
             (business_id, created_by_user_id, name, email, phone, document_type, document_id, company, job_title, source, source_detail,
              interest, importance_reason, preferred_channel, preferred_contact_time, status, priority, notes, metadata)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb)
           returning id, name, email, phone, document_type, document_id, source, source_detail, status, priority, created_at`,
          [
            businessId,
            req.user.id,
            row.name,
            row.email || null,
            row.phone || null,
            row.document_type || null,
            row.document_id || null,
            row.company || null,
            row.job_title || null,
            row.source,
            row.source_detail || null,
            row.interest || null,
            row.importance_reason || null,
            row.preferred_channel || null,
            row.preferred_contact_time || null,
            row.status,
            row.priority,
            row.notes || null,
            JSON.stringify({
              source: "manual_csv_import",
              created_by_email: req.user.email || null,
              csv_row: row.csv_row,
              csv_import_source: body.source || "CSV import",
              csv_source_detail: body.source_detail || null,
              manual_job_title: row.job_title || null,
              manual_importance_reason: row.importance_reason || null,
              identity_document: row.document_id ? {
                type: row.document_type || null,
                value: row.document_id,
              } : null,
            }),
          ]
        );
        await upsertManualLeadCollectorState(client, businessId, req.user, result.rows[0], {
          source_flow: "manual_csv_import",
          recommended_action: row.preferred_channel ? `Contactar por ${row.preferred_channel}` : "Clasificar lead importado al Recolector RMS",
          last_material_sent: row.source,
          collector_type: "csv_import",
        });
        created.push(result.rows[0]);
      }
      return { created, existing };
    });

    res.status(201).json({
      imported: inserted.created.length,
      existing: inserted.existing.length,
      contacts: inserted.created,
      existing_contacts: inserted.existing,
    });
  } catch (error) {
    next(error);
  }
}

async function listManualLeads(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await getBusinessSubscription(businessId);
    if (subscription.plan.raw_status !== "ACTIVE") {
      throw forbidden("La suscripcion del negocio no esta activa.");
    }
    const limit = boundedLimit(req.query.limit, 500, 1000);
    const result = await query(
      `select ml.*,
              coalesce(ca.campaigns, '[]'::json) as campaigns
         from business_manual_leads
         ml
         left join lateral (
           select json_agg(
             json_build_object(
               'id', c.id,
               'name', c.name,
               'channel', cmc.channel,
               'acquisition_source', cmc.acquisition_source,
               'status', cmc.status,
               'assigned_at', cmc.created_at
             )
             order by cmc.updated_at desc, cmc.created_at desc
           ) filter (where cmc.id is not null) as campaigns
           from campaign_manual_contacts cmc
           join campaigns c on c.id = cmc.campaign_id and c.business_id = cmc.business_id
           where cmc.business_id = ml.business_id
             and cmc.manual_lead_id = ml.id
             and cmc.status = 'ACTIVE'
         ) ca on true
        where ml.business_id = $1
        order by ml.updated_at desc, ml.created_at desc
        limit $2`,
      [businessId, limit]
    );
    res.json({ contacts: result.rows });
  } catch (error) {
    next(error);
  }
}

async function updateManualLead(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await getBusinessSubscription(businessId);
    if (subscription.plan.raw_status !== "ACTIVE") {
      throw forbidden("La suscripcion del negocio no esta activa.");
    }
    if (subscription.plan.category === "subscription" && !subscription.plan.portal_access_allowed) {
      throw forbidden(`La mensualidad vencio y ya pasaron los ${subscription.plan.grace_period_days} dias de gracia. Renueva para actualizar tus prospectos.`);
    }

    const body = validate(manualLeadPatchSchema, req.body);
    if (!body.email && !body.phone) {
      throw badRequest("Agrega al menos telefono o correo para poder contactar el prospecto.");
    }

    const commercialOwner = await commercialOwnerForBusiness(businessId, body.commercial_owner_user_id);
    const result = await query(
      `update business_manual_leads
          set name = $3,
              email = $4,
              phone = $5,
              company = $6,
              job_title = $7,
              source = $8,
              source_detail = $9,
              interest = $10,
              importance_reason = $11,
              preferred_channel = $12,
              preferred_contact_time = $13,
              status = $14,
              priority = $15,
              notes = $16,
              document_type = $18,
              document_id = $19,
              metadata = coalesce(metadata, '{}'::jsonb)
                || jsonb_build_object(
                     'manual_job_title', $7::text,
                     'manual_importance_reason', $11::text,
                     'manual_company', $6::text,
                     'manual_status', $14::text,
                     'manual_priority', $15::text,
                     'manual_notes', $16::text,
                     'updated_by_email', $17::text,
                     'document_type', $18::text,
                     'document_id', $19::text,
                     'commercial_owner_user_id', $20::text,
                     'commercial_owner_name', $21::text,
                     'commercial_owner_email', $22::text
                   ),
              updated_at = now()
        where id = $1
          and business_id = $2
        returning *`,
      [
        req.params.manualLeadId,
        businessId,
        body.name,
        body.email,
        body.phone,
        body.company,
        body.job_title,
        body.source || "Manual",
        body.source_detail,
        body.interest,
        body.importance_reason,
        body.preferred_channel,
        body.preferred_contact_time,
        body.status,
        body.priority,
        body.notes,
        req.user.email || null,
        body.document_type || null,
        body.document_id || null,
        commercialOwner?.id || null,
        commercialOwner?.full_name || null,
        commercialOwner?.email || null,
      ]
    );

    if (!result.rowCount) {
      throw notFound("Prospecto manual no encontrado.");
    }
    res.json({ lead: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function assignManualLeadToCampaign(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await getBusinessSubscription(businessId);
    if (subscription.plan.raw_status !== "ACTIVE") {
      throw forbidden("La suscripcion del negocio no esta activa.");
    }
    if (subscription.plan.category === "subscription" && !subscription.plan.portal_access_allowed) {
      throw forbidden(`La mensualidad vencio y ya pasaron los ${subscription.plan.grace_period_days} dias de gracia. Renueva para asociar contactos a campañas.`);
    }

    const body = validate(manualContactCampaignSchema, req.body);
    const result = await withTransaction(async (client) => {
      const manualLead = await client.query(
        "select id, name from business_manual_leads where id = $1 and business_id = $2",
        [req.params.manualLeadId, businessId]
      );
      if (!manualLead.rowCount) throw notFound("Contacto del directorio no encontrado.");

      const campaign = await client.query(
        "select id, name from campaigns where id = $1 and business_id = $2",
        [body.campaign_id, businessId]
      );
      if (!campaign.rowCount) throw notFound("Campaña no encontrada para este negocio.");

      const assignment = await client.query(
        `insert into campaign_manual_contacts
          (business_id, campaign_id, manual_lead_id, assigned_by_user_id, status, channel, acquisition_source, notes, metadata)
         values ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8::jsonb)
         on conflict (business_id, campaign_id, manual_lead_id)
         do update set status = 'ACTIVE',
                       channel = coalesce(excluded.channel, campaign_manual_contacts.channel),
                       acquisition_source = coalesce(excluded.acquisition_source, campaign_manual_contacts.acquisition_source),
                       notes = coalesce(excluded.notes, campaign_manual_contacts.notes),
                       metadata = campaign_manual_contacts.metadata || excluded.metadata,
                       assigned_by_user_id = excluded.assigned_by_user_id,
                       updated_at = now()
         returning *`,
        [
          businessId,
          body.campaign_id,
          req.params.manualLeadId,
          req.user.id,
          body.channel || null,
          body.acquisition_source || null,
          body.notes || null,
          JSON.stringify({
            source: "manual_contact_campaign_assignment",
            channel: body.channel || null,
            acquisition_source: body.acquisition_source || null,
            assigned_by_email: req.user.email || null,
          }),
        ]
      );

      await client.query(
        `update business_manual_leads
            set metadata = coalesce(metadata, '{}'::jsonb)
              || jsonb_build_object(
                   'last_associated_campaign_id', $3::text,
                   'last_associated_campaign_name', $4::text,
                   'last_associated_channel', $5::text,
                   'last_campaign_assignment_at', now()::text
                 ),
                updated_at = now()
          where id = $1 and business_id = $2`,
        [req.params.manualLeadId, businessId, campaign.rows[0].id, campaign.rows[0].name, body.channel || null]
      );

      return {
        assignment: assignment.rows[0],
        campaign: campaign.rows[0],
        contact: manualLead.rows[0],
      };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function removeManualLeadFromCampaign(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const result = await query(
      `update campaign_manual_contacts
          set status = 'ARCHIVED',
              updated_at = now()
        where business_id = $1
          and manual_lead_id = $2
          and campaign_id = $3
          and status = 'ACTIVE'
        returning *`,
      [businessId, req.params.manualLeadId, req.params.campaignId]
    );
    if (!result.rowCount) throw notFound("Asociación de contacto y campaña no encontrada.");
    res.json({ assignment: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function createManualLeadFromExistingLead(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await getBusinessSubscription(businessId);
    if (subscription.plan.raw_status !== "ACTIVE") {
      throw forbidden("La suscripcion del negocio no esta activa.");
    }
    if (subscription.plan.category === "subscription" && !subscription.plan.portal_access_allowed) {
      throw forbidden(`La mensualidad vencio y ya pasaron los ${subscription.plan.grace_period_days} dias de gracia. Renueva para agregar contactos al directorio.`);
    }

    const sourceType = String(req.body?.source_type || req.query.source_type || "PLAYER").toUpperCase();
    if (sourceType === "MANUAL") {
      throw badRequest("Este contacto ya pertenece al directorio interno.");
    }

    const detail = await getLeadCrmDetail(businessId, req.params.leadId, sourceType);
    const lead = detail.lead || {};
    const summary = detail.summary || {};
    if (!lead.email && !lead.phone) {
      throw badRequest("Este lead no tiene telefono ni correo para guardarlo como contacto.");
    }

    const existing = await query(
      `select *
         from business_manual_leads
        where business_id = $1
          and (
            ($2::text is not null and lower(email) = lower($2::text))
            or ($3::text is not null and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = regexp_replace($3::text, '\\D', '', 'g'))
          )
        order by updated_at desc
        limit 1`,
      [businessId, lead.email || null, lead.phone || null]
    );
    if (existing.rowCount) {
      await withTransaction(async (client) => {
        await upsertManualLeadCollectorState(client, businessId, req.user, existing.rows[0], {
          source_flow: "lead_promoted_existing_contact",
          recommended_action: "Revisar contacto existente en el Recolector RMS",
          last_material_sent: existing.rows[0].source || sourceType,
          collector_type: "existing_contact",
        });
      });
      return res.status(200).json({ lead: existing.rows[0], existed: true });
    }

    const sourceLabel = lead.channel || lead.source_type || "Lead externo";
    const sourceDetail = [
      lead.source_detail,
      lead.campaign_name ? `Campaña: ${lead.campaign_name}` : "",
      sourceType ? `Origen CRM: ${sourceType}` : "",
    ].filter(Boolean).join(" | ").slice(0, 220) || "Agregado desde directorio unificado.";
    const status = Number(summary.purchase_count || 0) > 0 ? "CONVERTED" : "NEW";
    const priority = Number(summary.active_tickets || 0) > 0 || Number(summary.score_total || 0) >= 50 ? "HIGH" : "MEDIUM";
    const importanceReason = req.body?.importance_reason
      || (Number(summary.purchase_count || 0) > 0
        ? "Lead con compra registrada; conservar para seguimiento comercial."
        : "Lead agregado desde otra fuente para seguimiento interno.");

    const createdLead = await withTransaction(async (client) => {
      const result = await client.query(
        `insert into business_manual_leads
           (business_id, created_by_user_id, name, email, phone, company, job_title, source, source_detail,
            interest, importance_reason, preferred_channel, preferred_contact_time, status, priority, notes, metadata)
         values ($1, $2, $3, $4, $5, $6, null, $7, $8, $9, $10, $11, null, $12, $13, $14, $15::jsonb)
         returning *`,
        [
          businessId,
          req.user.id,
          lead.name || "Contacto agregado",
          lead.email || null,
          lead.phone || null,
          lead.organization || lead.metadata?.manual_company || null,
          sourceLabel,
          sourceDetail,
          summary.top_interest || lead.interest || lead.metadata?.asset_title || null,
          importanceReason,
          lead.preferred_channel || "WhatsApp/email",
          status,
          priority,
          req.body?.notes || `Agregado al directorio interno desde ${sourceLabel}.`,
          JSON.stringify({
            source: "lead_promoted_to_manual_contact",
            created_by_email: req.user.email || null,
            original_source_type: sourceType,
            original_source_id: lead.id,
            original_lead_id: lead.lead_id || null,
            original_campaign_id: lead.campaign_id || null,
            original_campaign_name: lead.campaign_name || null,
            manual_importance_reason: importanceReason,
            manual_status: status,
            manual_priority: priority,
            manual_company: lead.organization || null,
          }),
        ]
      );
      await upsertManualLeadCollectorState(client, businessId, req.user, result.rows[0], {
        source_flow: "lead_promoted_to_manual_contact",
        recommended_action: lead.preferred_channel ? `Contactar por ${lead.preferred_channel}` : "Revisar lead guardado en el Recolector RMS",
        last_material_sent: sourceLabel,
        collector_type: "promoted_lead",
      });
      return result.rows[0];
    });
    res.status(201).json({ lead: createdLead, existed: false });
  } catch (error) {
    next(error);
  }
}

function normalizeContactTicketFilter(value) {
  const filter = String(value || "all").toLowerCase();
  return ["all", "active", "redeemed"].includes(filter) ? filter : "all";
}

function ticketUrlForRow(row) {
  const isExpired = row.expires_at && new Date(row.expires_at) <= new Date();
  return row.qr_token && row.qr_status === "ACTIVE" && !row.redeemed_at && !isExpired
    ? buildValidatorUrl(row.qr_token)
    : "";
}

function whatsappReminderForRow(row) {
  const ticketUrl = ticketUrlForRow(row);
  if (!ticketUrl) return "";
  const name = row.name ? ` ${row.name}` : "";
  return `Hola${name}, tienes un beneficio activo pendiente por redimir. Presenta este ticket en el punto fisico: ${ticketUrl}`;
}

function contactFeedToCsv(rows) {
  const headers = [
    "tipo",
    "nombre",
    "documento",
    "telefono",
    "email",
    "campana",
    "origen",
    "asunto",
    "estado_qr",
    "ultima_redencion",
    "valor_compra",
    "producto",
    "cargo",
    "importancia",
    "canal_preferido",
    "hora_contacto",
    "qr_code_id",
    "ticket_url",
    "mensaje_whatsapp",
    "vence_en",
    "temperatura",
    "recomendacion",
    "fecha",
  ];
  const lines = rows.map((row) => [
    row.stage,
    row.name,
    row.document_id,
    row.phone,
    row.email,
    row.campaign_name,
    row.attribution_source,
    row.attribution_subject,
    row.qr_status,
    row.redeemed_at,
    row.sale_amount,
    row.product_name,
    row.metadata?.manual_job_title || "",
    row.metadata?.manual_importance_reason || "",
    row.preferred_channel,
    row.preferred_contact_time,
    row.qr_code_id,
    ticketUrlForRow(row),
    whatsappReminderForRow(row),
    row.expires_at,
    row.lead_temperature,
    row.recommended_action,
    row.created_at,
  ].map(csvValue).join(","));
  return [headers.join(","), ...lines].join("\n");
}

function mapContactFeedRows(rows) {
  return rows.map((row) => {
    const hasSale = Number(row.sale_amount || 0) > 0;
    const hotSignals = ["hoy", "esta-semana", "regalo-padre", "compra-propia"];
    const signalText = [
      row.purchase_window,
      row.purchase_intent,
      row.qr_status,
      row.stage,
    ].filter(Boolean).join(" ").toLowerCase();
    const manualStatus = String(row.metadata?.manual_status || "").toUpperCase();
    const manualPriority = String(row.metadata?.manual_priority || "").toUpperCase();
    const isManual = row.stage === "MANUAL";
    const isAffiliate = row.stage === "AFFILIATE";
    const channel = row.preferred_channel || row.attribution_source || "WhatsApp/email";
    let leadTemperature = "nurture";
    if (isAffiliate) {
      leadTemperature = hasSale ? "buyer" : "warm";
    } else if (isManual) {
      if (manualStatus === "CONVERTED") leadTemperature = "buyer";
      else if (manualStatus === "FOLLOW_UP" || manualPriority === "HIGH") leadTemperature = "hot";
      else if (manualStatus === "CONTACTED") leadTemperature = "warm";
    } else if (hasSale || row.qr_status === "REDEEMED") {
      leadTemperature = "buyer";
    } else if (hotSignals.some((signal) => signalText.includes(signal))) {
      leadTemperature = "hot";
    } else if (row.qr_status === "ACTIVE") {
      leadTemperature = "warm";
    }

    let recommendedAction = `Nutrir con email/remarketing y nuevo incentivo asociado a ${row.attribution_subject || "la campana"}.`;
    if (isAffiliate && hasSale) {
      recommendedAction = "Registrar recompra o beneficio VIP; es afiliado activo con compra atribuida.";
    } else if (isAffiliate) {
      recommendedAction = `Contactar por ${channel}; afiliado listo para campana, compra atribuida o referidos.`;
    } else if (isManual && manualStatus === "LOST") {
      recommendedAction = "Dejar en nutricion o archivar si no hay respuesta.";
    } else if (isManual && manualStatus === "CONVERTED") {
      recommendedAction = "Registrar la venta o pasar a postventa/fidelizacion.";
    } else if (isManual && manualStatus === "CONTACTED") {
      recommendedAction = `Dar continuidad por ${channel} con siguiente paso claro.`;
    } else if (isManual && (manualStatus === "FOLLOW_UP" || manualPriority === "HIGH")) {
      recommendedAction = `Contactar hoy por ${channel}; viene de registro manual y requiere seguimiento.`;
    } else if (isManual) {
      recommendedAction = `Primer contacto por ${channel}; validar interes y agendar siguiente accion.`;
    } else if (leadTemperature === "buyer") {
      recommendedAction = "Enviar postventa, recompra o fidelizacion.";
    } else if (leadTemperature === "hot") {
      recommendedAction = `Contactar hoy por ${channel} con oferta concreta.`;
    } else if (leadTemperature === "warm") {
      recommendedAction = `Hacer seguimiento por ${channel} y reforzar beneficio antes de vencer.`;
    }
    return {
      ...row,
      sale_amount: row.sale_amount === null ? null : Number(row.sale_amount || 0),
      lead_temperature: leadTemperature,
      recommended_action: recommendedAction,
    };
  });
}

async function getContactFeedRows(businessId, retentionDays, limit = 1000, ticketFilter = "all") {
  const normalizedFilter = normalizeContactTicketFilter(ticketFilter);
  const params = [businessId, retentionDays, normalizedFilter];
  const limitClause = limit ? `limit $${params.length + 1}` : "";
  if (limit) params.push(limit);
  const result = await query(
    `with lead_rows as (
       select
         p.id::text as id,
         'LEAD' as stage,
         p.name,
         p.document_id,
         p.phone,
         p.email,
         p.created_at,
         coalesce(latest_capture.campaign_id, c.id) as campaign_id,
         coalesce(latest_capture.campaign_name, c.name) as campaign_name,
         coalesce(
           case when latest_capture.id is not null then 'Descarga de activo digital' end,
           case
             when p.metadata->>'source_key' = 'descarga_activo_digital'
               or (lower(coalesce(p.metadata->>'source', '')) = 'captura_relampago' and nullif(p.metadata->>'asset_title', '') is not null)
             then 'Descarga de activo digital'
           end,
           qn.answers->>'source',
           q.metadata->>'attribution_source',
           nullif(p.metadata->>'source', ''),
           case when ia.id is not null then 'interactive_activation' end,
           q.metadata->>'channel_use',
           'Sin origen'
         ) as attribution_source,
         coalesce(
           case when latest_capture.id is not null then concat_ws(' · ',
             case when nullif(latest_capture.asset_title, '') is not null then 'Activo: ' || latest_capture.asset_title end,
             case when nullif(latest_capture.campaign_name, '') is not null then 'Campaña: ' || latest_capture.campaign_name end,
             case when nullif(latest_capture.activation_name, '') is not null then 'Landing: ' || latest_capture.activation_name end
           ) end,
           qn.answers->>'campaign_label',
           q.metadata->>'attribution_subject',
           q.metadata->>'package_name',
           ia.title,
           c.name,
           'Sin asunto'
         ) as attribution_subject,
         q.id as qr_code_id,
         q.token as qr_token,
         q.status::text as qr_status,
         q.origin_type,
         q.created_at as qr_created_at,
         q.expires_at,
         q.claimed_at,
         q.redeemed_at,
         q.affiliate_id,
         a.full_name as affiliate_name,
         qn.answers->>'favorite_product' as favorite_product,
         qn.answers->>'purchase_intent' as purchase_intent,
         qn.answers->>'gift_budget' as gift_budget,
         qn.answers->>'purchase_window' as purchase_window,
         qn.answers->>'preferred_channel' as preferred_channel,
         qn.answers->>'preferred_contact_time' as preferred_contact_time,
         s.sale_amount,
         s.currency,
         s.product_name,
         s.created_at as sale_created_at,
         coalesce(p.metadata, '{}'::jsonb) || case when latest_capture.id is not null then jsonb_build_object(
           'digital_asset_origin', true,
           'source_key', 'descarga_activo_digital',
           'source_label', 'Descarga de activo digital',
           'asset_id', latest_capture.asset_id,
           'asset_title', latest_capture.asset_title,
           'lead_capture_activation_id', latest_capture.activation_id,
           'lead_capture_name', latest_capture.activation_name,
           'campaign_id', latest_capture.campaign_id,
           'campaign_name', latest_capture.campaign_name
         ) else '{}'::jsonb end as metadata
       from players p
       left join campaigns c on c.id = p.campaign_id
       left join lateral (
         select
           s.id,
           s.activation_id,
           s.asset_id,
           s.campaign_id,
           s.channel,
           s.created_at,
           lca.name as activation_name,
           da.title as asset_title,
           lcc.name as campaign_name
         from lead_capture_submissions s
         left join lead_capture_activations lca on lca.id = s.activation_id
         left join digital_assets da on da.id = s.asset_id
         left join campaigns lcc on lcc.id = s.campaign_id
         where s.business_id = p.business_id and s.lead_id = p.id
         order by s.created_at desc
         limit 1
       ) latest_capture on true
       left join lateral (
         select *
         from qr_codes
         where player_id = p.id
         order by created_at desc
         limit 1
       ) q on true
       left join affiliates a on a.id = q.affiliate_id
       left join interactive_activations ia on ia.company_id = p.business_id and ia.id = coalesce(
         case
           when p.metadata->>'activation_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (p.metadata->>'activation_id')::uuid
         end,
         case
           when q.metadata->>'activation_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (q.metadata->>'activation_id')::uuid
         end
       )
       left join lateral (
         select answers
         from questionnaires
         where player_id = p.id
         order by created_at desc
         limit 1
       ) qn on true
       left join lateral (
         select sale_amount, currency, product_name, created_at
         from business_sales
         where business_id = p.business_id
           and (
             nullif(customer_document_id, '') = nullif(p.document_id, '')
             or nullif(customer_phone, '') = nullif(p.phone, '')
             or nullif(customer_email, '') = nullif(p.email, '')
           )
         order by created_at desc
         limit 1
       ) s on true
       where p.business_id = $1
         and ($2::int is null or p.created_at >= now() - ($2::int * interval '1 day'))
     ),
     buyer_rows as (
       select
         bs.id::text as id,
         'BUYER' as stage,
         bs.customer_name as name,
         bs.customer_document_id as document_id,
         bs.customer_phone as phone,
         bs.customer_email as email,
         bs.created_at,
         bs.campaign_id,
         c.name as campaign_name,
         coalesce(bs.acquisition_source, bs.metadata->>'attribution_source', 'Venta registrada') as attribution_source,
         coalesce(nullif(bs.acquisition_channel, ''), bs.metadata->>'attribution_subject', bs.product_name, 'Comprador') as attribution_subject,
         bs.qr_code_id,
         q.token as qr_token,
         q.status::text as qr_status,
         q.origin_type,
         q.created_at as qr_created_at,
         q.expires_at,
         q.claimed_at,
         q.redeemed_at,
         bs.referred_affiliate_id as affiliate_id,
         a.full_name as affiliate_name,
         null as favorite_product,
         null as purchase_intent,
         null as gift_budget,
         null as purchase_window,
         coalesce(bs.acquisition_channel, bs.acquisition_source) as preferred_channel,
         null as preferred_contact_time,
         bs.sale_amount,
         bs.currency,
         bs.product_name,
         bs.created_at as sale_created_at,
         bs.metadata
       from business_sales bs
       left join campaigns c on c.id = bs.campaign_id
       left join qr_codes q on q.id = bs.qr_code_id
       left join affiliates a on a.id = bs.referred_affiliate_id
       where bs.business_id = $1
         and ($2::int is null or bs.created_at >= now() - ($2::int * interval '1 day'))
     ),
     manual_rows as (
       select
         ml.id::text as id,
         'MANUAL' as stage,
         ml.name,
         null::text as document_id,
         ml.phone,
         ml.email,
         ml.created_at,
         null::uuid as campaign_id,
         null::text as campaign_name,
         coalesce(nullif(ml.source, ''), 'Manual') as attribution_source,
         coalesce(nullif(ml.source_detail, ''), nullif(ml.company, ''), 'Prospecto manual') as attribution_subject,
         null::uuid as qr_code_id,
         null::text as qr_token,
         null::text as qr_status,
         null::qr_origin_type as origin_type,
         null::timestamptz as qr_created_at,
         null::timestamptz as expires_at,
         null::timestamptz as claimed_at,
         null::timestamptz as redeemed_at,
         null::uuid as affiliate_id,
         null::text as affiliate_name,
         null::text as favorite_product,
         ml.interest as purchase_intent,
         null::text as gift_budget,
         case
           when ml.priority = 'HIGH' or ml.status = 'FOLLOW_UP' then 'esta-semana'
           else null::text
         end as purchase_window,
         ml.preferred_channel,
         ml.preferred_contact_time,
         null::numeric as sale_amount,
         null::text as currency,
         ml.company as product_name,
         null::timestamptz as sale_created_at,
         ml.metadata
           || jsonb_build_object(
                'manual_status', ml.status,
                'manual_priority', ml.priority,
                'manual_notes', ml.notes,
                'manual_company', ml.company,
                'manual_job_title', ml.job_title,
                'manual_importance_reason', ml.importance_reason
              ) as metadata
       from business_manual_leads ml
       where ml.business_id = $1
         and ($2::int is null or ml.created_at >= now() - ($2::int * interval '1 day'))
     ),
     affiliate_rows as (
       select
         fa.id::text as id,
         'AFFILIATE' as stage,
         fa.full_name as name,
         fa.document_id,
         fa.phone,
         fa.email,
         fa.created_at,
         ca.campaign_id,
         ca.campaign_name,
         'Afiliados' as attribution_source,
         coalesce(nullif(ca.campaign_name, ''), nullif(fa.notes, ''), 'Afiliado') as attribution_subject,
         q.id as qr_code_id,
         q.token as qr_token,
         q.status::text as qr_status,
         q.origin_type,
         q.created_at as qr_created_at,
         q.expires_at,
         q.claimed_at,
         q.redeemed_at,
         fa.id as affiliate_id,
         fa.full_name as affiliate_name,
         null::text as favorite_product,
         fa.notes as purchase_intent,
         null::text as gift_budget,
         null::text as purchase_window,
         'WhatsApp' as preferred_channel,
         null::text as preferred_contact_time,
         s.sale_amount,
         s.currency,
         s.product_name,
         s.created_at as sale_created_at,
         fa.card_metadata
           || jsonb_build_object(
                'affiliate_status', fa.status,
                'affiliate_points_total', fa.points_total,
                'affiliate_qr_token', fa.qr_token
              ) as metadata
       from affiliates fa
       left join lateral (
         select c.id as campaign_id, c.name as campaign_name
         from campaign_affiliates caf
         join campaigns c on c.id = caf.campaign_id
         where caf.business_id = fa.business_id
           and caf.affiliate_id = fa.id
           and caf.status = 'ACTIVE'
         order by caf.updated_at desc, caf.created_at desc
         limit 1
       ) ca on true
       left join lateral (
         select *
         from qr_codes
         where business_id = fa.business_id and affiliate_id = fa.id
         order by created_at desc
         limit 1
       ) q on true
       left join lateral (
         select sale_amount, currency, product_name, created_at
         from business_sales
         where business_id = fa.business_id
           and (
             referred_affiliate_id = fa.id
             or (nullif(fa.document_id, '') is not null and customer_document_id = fa.document_id)
             or (nullif(fa.phone, '') is not null and customer_phone = fa.phone)
             or (nullif(fa.email, '') is not null and lower(customer_email) = lower(fa.email))
           )
         order by created_at desc
         limit 1
       ) s on true
       where fa.business_id = $1
         and fa.status <> 'DELETED'
         and ($2::int is null or fa.created_at >= now() - ($2::int * interval '1 day'))
     )
     select *
     from (
       select * from lead_rows
       union all
       select * from buyer_rows
       union all
       select * from manual_rows
       union all
       select * from affiliate_rows
     ) contact_rows
     where $3::text = 'all'
       or ($3::text = 'active' and qr_status = 'ACTIVE' and redeemed_at is null and (expires_at is null or expires_at > now()))
       or ($3::text = 'redeemed' and (qr_status = 'REDEEMED' or redeemed_at is not null))
     order by created_at desc
     ${limitClause}`,
    params
  );
  return mapContactFeedRows(result.rows);
}

async function countContactFeedRows(businessId, retentionDays) {
  const result = await query(
    `select (
       (select count(*)::int
        from players p
        where p.business_id = $1
          and ($2::int is null or p.created_at >= now() - ($2::int * interval '1 day')))
       +
       (select count(*)::int
        from business_sales bs
        where bs.business_id = $1
          and ($2::int is null or bs.created_at >= now() - ($2::int * interval '1 day')))
       +
       (select count(*)::int
        from business_manual_leads ml
        where ml.business_id = $1
          and ($2::int is null or ml.created_at >= now() - ($2::int * interval '1 day')))
       +
       (select count(*)::int
        from affiliates fa
        where fa.business_id = $1
          and fa.status <> 'DELETED'
          and ($2::int is null or fa.created_at >= now() - ($2::int * interval '1 day')))
     )::int as total`,
    [businessId, retentionDays]
  );
  return Number(result.rows[0]?.total || 0);
}

async function contactFeed(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await getBusinessSubscription(businessId);
    if (subscription.plan.raw_status !== "ACTIVE") {
      throw forbidden("La suscripcion del negocio no esta activa.");
    }
    if (subscription.plan.category === "subscription" && !subscription.plan.portal_access_allowed) {
      throw forbidden(`La mensualidad vencio y ya pasaron los ${subscription.plan.grace_period_days} dias de gracia. Renueva para recuperar tus leads y el portal.`);
    }
    const isPrepaid = subscription.plan.category === "prepaid";
    const planRetentionDays = subscription.plan.limits.history_days ?? null;
    const retentionDays = isPrepaid ? null : planRetentionDays;
    const planRowLimit = subscription.plan.limits.lead_view_rows ?? null;
    const limit = isPrepaid
      ? PREPAID_LEAD_SAMPLE_LIMIT
      : Math.min(
          boundedLimit(req.query.limit, 120, 1000),
          planRowLimit === null ? 1000 : Math.max(1, Number(planRowLimit || 120))
        );
    const contacts = await getContactFeedRows(businessId, retentionDays, limit);
    const shouldCountTotal = isPrepaid || wantsTotalCount(req) || (planRowLimit !== null && contacts.length >= limit);
    const totalContacts = shouldCountTotal ? await countContactFeedRows(businessId, retentionDays) : null;
    const totalAvailable = totalContacts === null ? null : totalContacts;
    const limitedByPlan = planRowLimit !== null && contacts.length >= limit;
    const hiddenByPlan = limitedByPlan && totalAvailable !== null
      ? Number(totalAvailable || 0) > contacts.length
      : limitedByPlan;
    res.json({
      retention: {
        plan_code: subscription.plan.code,
        history_days: isPrepaid ? null : retentionDays,
        label: isPrepaid ? `Muestra de ${PREPAID_LEAD_SAMPLE_LIMIT} leads` : (retentionDays === null ? "Ilimitado" : `${retentionDays} dias`),
        row_limit: isPrepaid ? PREPAID_LEAD_SAMPLE_LIMIT : planRowLimit,
      },
      lead_gate: isPrepaid
        ? {
            locked: true,
            sample_limit: PREPAID_LEAD_SAMPLE_LIMIT,
            total_available: totalAvailable,
            hidden_count: Math.max(0, Number(totalAvailable || 0) - contacts.length),
            upgrade_url: "/paquetes/?mode=portal&plan=STARTER",
            title: "Ya tienes leads reales. Ahora necesitas el portal.",
            message: `El acceso legacy solo muestra ${PREPAID_LEAD_SAMPLE_LIMIT} contactos de muestra. Compra T200 para activar Portal Base o sube a Growth/Premium para ver mas historial, exportar y medir revenue.`,
          }
        : {
            locked: hiddenByPlan,
            sample_limit: planRowLimit,
            total_available: totalAvailable,
            hidden_count: totalAvailable === null ? null : Math.max(0, Number(totalAvailable || 0) - contacts.length),
            upgrade_url: "/paquetes/?mode=portal",
            title: "Tu plan muestra una parte del historial",
            message: "El portal conserva el dato segun tu plan. Sube de plan para ver mas contactos, exportar mas filas y analizar mas historial.",
          },
      contacts,
    });
  } catch (error) {
    next(error);
  }
}

async function exportContactFeed(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await getBusinessSubscription(businessId);
    if (subscription.plan.raw_status !== "ACTIVE") {
      throw forbidden("La suscripcion del negocio no esta activa.");
    }
    const retentionDays = null;
    const ticketFilter = normalizeContactTicketFilter(req.query.ticket_filter || req.query.status);
    const rows = await getContactFeedRows(businessId, retentionDays, null, ticketFilter);
    await assertMonthlyUsageLimit(
      businessId,
      "lead_export",
      subscription.plan.limits.lead_exports_month,
      1,
      "exportaciones de leads",
      { plan: subscription.plan, limit_key: "lead_exports_month" }
    );
    await assertMonthlyUsageLimit(
      businessId,
      "lead_export_row",
      subscription.plan.limits.lead_export_rows_month,
      rows.length,
      "filas exportadas",
      { plan: subscription.plan, limit_key: "lead_export_rows_month" }
    );
    await recordUsage({
      business_id: businessId,
      user_id: req.user.id,
      event_type: "lead_export",
      quantity: 1,
      metadata: { source: "contact_feed", rows: rows.length, ticket_filter: ticketFilter },
    });
    await recordUsage({
      business_id: businessId,
      user_id: req.user.id,
      event_type: "lead_export_row",
      quantity: rows.length,
      metadata: { source: "contact_feed", ticket_filter: ticketFilter },
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="contactos-leads-${ticketFilter}-${businessId}.csv"`);
    res.send(contactFeedToCsv(rows));
  } catch (error) {
    next(error);
  }
}

async function exportCampaignLeads(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await getBusinessSubscription(businessId);
    const rows = await getCampaignLeadRows(businessId, req.params.id);
    await assertMonthlyUsageLimit(
      businessId,
      "lead_export",
      subscription.plan.limits.lead_exports_month,
      1,
      "exportaciones de leads",
      { plan: subscription.plan, limit_key: "lead_exports_month" }
    );
    await assertMonthlyUsageLimit(
      businessId,
      "lead_export_row",
      subscription.plan.limits.lead_export_rows_month,
      rows.length,
      "filas exportadas",
      { plan: subscription.plan, limit_key: "lead_export_rows_month" }
    );
    await recordUsage({
      business_id: businessId,
      user_id: req.user.id,
      event_type: "lead_export",
      quantity: 1,
      metadata: { campaign_id: req.params.id, rows: rows.length },
    });
    await recordUsage({
      business_id: businessId,
      user_id: req.user.id,
      event_type: "lead_export_row",
      quantity: rows.length,
      metadata: { campaign_id: req.params.id },
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="leads-${req.params.id}.csv"`);
    res.send(leadsToCsv(rows));
  } catch (error) {
    next(error);
  }
}

async function downloadActiveLeadQr(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await requireCampaignForBusiness(req.params.id, businessId);

    const result = await query(
      `select q.id, q.token, q.status, q.expires_at, p.name as player_name
       from qr_codes q
       join players p on p.id = q.player_id
       where q.id = $1 and q.campaign_id = $2 and q.business_id = $3
       limit 1`,
      [req.params.qrId, req.params.id, businessId]
    );

    const qr = result.rows[0];
    if (!qr) {
      throw notFound("Active QR not found for this campaign.");
    }

    const isExpired = qr.expires_at && new Date(qr.expires_at) <= new Date();
    if (qr.status !== "ACTIVE" || isExpired) {
      if (isExpired && qr.status === "ACTIVE") {
        await query("update qr_codes set status = 'EXPIRED' where id = $1 and status = 'ACTIVE'", [qr.id]);
      }
      throw badRequest("This lead does not have an active QR available for download.");
    }

    const safeName = (qr.player_name || "cliente")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "cliente";
    const ticket = await getIndividualQrDownload(businessId, qr.id, { publicClaimUrl: true });

    res.json({
      ...ticket,
      qr_code_id: qr.id,
      status: qr.status,
      expires_at: qr.expires_at,
      player_name: qr.player_name,
      public_ticket_url: ticket.claim_url,
      share_url: ticket.claim_url,
      filename: `ticket-${safeName}-${String(qr.id).slice(0, 8)}.${ticket.filename?.endsWith(".svg") ? "svg" : "png"}`,
    });
  } catch (error) {
    next(error);
  }
}

async function downloadLeadQrById(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const result = await query(
      `select q.id, q.token, q.status, q.expires_at, p.name as player_name, p.phone as player_phone
       from qr_codes q
       left join players p on p.id = q.player_id
       where q.id = $1 and q.business_id = $2
       limit 1`,
      [req.params.qrId, businessId]
    );

    const qr = result.rows[0];
    if (!qr) {
      throw notFound("Ticket activo no encontrado para este negocio.");
    }

    const isExpired = qr.expires_at && new Date(qr.expires_at) <= new Date();
    if (qr.status !== "ACTIVE" || isExpired) {
      if (isExpired && qr.status === "ACTIVE") {
        await query("update qr_codes set status = 'EXPIRED' where id = $1 and status = 'ACTIVE'", [qr.id]);
      }
      throw badRequest("Este contacto no tiene un ticket activo disponible para descargar.");
    }

    const safeName = (qr.player_name || "cliente")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "cliente";
    const ticket = await getIndividualQrDownload(businessId, qr.id, { publicClaimUrl: true });

    res.json({
      ...ticket,
      qr_code_id: qr.id,
      status: qr.status,
      expires_at: qr.expires_at,
      player_name: qr.player_name,
      player_phone: qr.player_phone,
      public_ticket_url: ticket.claim_url,
      share_url: ticket.claim_url,
      filename: `ticket-${safeName}-${String(qr.id).slice(0, 8)}.${ticket.filename?.endsWith(".svg") ? "svg" : "png"}`,
    });
  } catch (error) {
    next(error);
  }
}

async function campaignRedemptions(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const limit = boundedLimit(req.query.limit, 150, 500);
    const result = await query(
      `select rd.*, p.name as player_name, p.document_id, p.phone, rw.name as reward_name,
              u.full_name as validator_name, br.name as branch_name,
              s.sale_amount, s.currency, s.payment_method, s.product_or_service, s.sale_type, s.notes
       from redemptions rd
       join players p on p.id = rd.player_id
       join rewards rw on rw.id = rd.reward_id
       left join app_users u on u.id = rd.redeemed_by_user_id
       left join branches br on br.id = rd.branch_id
       left join attributed_sales s on s.redemption_id = rd.id
       where rd.business_id = $1 and rd.campaign_id = $2
       order by rd.redeemed_at desc
       limit $3`,
      [businessId, req.params.id, limit]
    );
    res.json({ redemptions: result.rows });
  } catch (error) {
    next(error);
  }
}

async function canonicalAttributedSalesForBusiness(businessId, campaignId, limit) {
  const result = await query(
      `select *
       from (
         select
           s.id,
           s.business_id,
           s.campaign_id,
           s.qr_code_id,
           s.redemption_id,
           s.player_id,
           s.sale_amount,
           s.currency,
           s.sale_confirmed_by_user_id,
           s.branch_id,
           s.payment_method,
           s.product_or_service,
           s.notes,
           'PAID'::text as sale_status,
           null::jsonb as metadata,
           null::uuid as referred_affiliate_id,
           0::int as referral_points_awarded,
           s.created_at,
           'REDEMPTION'::text as sale_source,
           p.name as player_name,
           p.document_id,
           p.phone,
           p.email,
           br.name as branch_name,
           u.full_name as confirmed_by,
           null::text as affiliate_name
         from attributed_sales s
         left join players p on p.id = s.player_id
         left join branches br on br.id = s.branch_id
         left join app_users u on u.id = s.sale_confirmed_by_user_id
         where s.business_id = $1 and ($2::uuid is null or s.campaign_id = $2)

         union all

         select
           bs.id,
           bs.business_id,
           bs.campaign_id,
           bs.qr_code_id,
           null::uuid as redemption_id,
           null::uuid as player_id,
           bs.sale_amount,
           bs.currency,
           bs.seller_user_id as sale_confirmed_by_user_id,
           bs.branch_id,
           bs.acquisition_source as payment_method,
           bs.product_name as product_or_service,
           bs.notes,
           coalesce(bs.sale_status, 'PAID') as sale_status,
           bs.metadata,
           bs.referred_affiliate_id,
           bs.referral_points_awarded,
           bs.created_at,
           'CONTACT_CENTER'::text as sale_source,
           bs.customer_name as player_name,
           bs.customer_document_id as document_id,
           bs.customer_phone as phone,
           bs.customer_email as email,
           br.name as branch_name,
           u.full_name as confirmed_by,
           a.full_name as affiliate_name
         from business_sales bs
         left join branches br on br.id = bs.branch_id
         left join app_users u on u.id = bs.seller_user_id
         left join affiliates a on a.id = bs.referred_affiliate_id
         where bs.business_id = $1 and ($2::uuid is null or bs.campaign_id = $2)
       ) sales
       order by created_at desc
       limit $3`,
      [businessId, campaignId || null, limit]
  );
  return result.rows;
}

async function attributedSales(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const limit = boundedLimit(req.query.limit, 300, 500);
    const sales = await canonicalAttributedSalesForBusiness(businessId, null, limit);
    res.json({ sales });
  } catch (error) {
    next(error);
  }
}

async function voidAttributedSale(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "sales_tracker");
    const body = validate(lifecycleReasonSchema, req.body || {});
    const result = await withTransaction(async (client) => {
      const existing = await client.query(
        `select id, sale_status, sale_amount, currency, product_name, metadata
           from business_sales
          where id = $1 and business_id = $2
          for update`,
        [req.params.saleId, businessId]
      );
      if (!existing.rowCount) throw notFound("Venta atribuida no encontrada.");
      const sale = existing.rows[0];
      if (sale.sale_status === "VOIDED") return { sale, duplicate: true };
      const updated = await client.query(
        `update business_sales
            set sale_status = 'VOIDED',
                metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
                  'voided_at', now(),
                  'voided_by_user_id', $3::text,
                  'void_reason', $4::text,
                  'original_sale_amount', sale_amount,
                  'original_currency', currency
                )
          where id = $1 and business_id = $2
          returning *`,
        [sale.id, businessId, req.user.id, body.reason]
      );
      await recordLifecycleEvent({
        business_id: businessId,
        entity_type: "ATTRIBUTED_SALE",
        entity_id: sale.id,
        action: "VOIDED",
        previous_status: sale.sale_status || "PAID",
        next_status: "VOIDED",
        reason: body.reason,
        idempotency_key: body.idempotency_key || `sale-void:${sale.id}:${sale.sale_status || "PAID"}`,
        actor_user_id: req.user.id,
        metadata: {
          product_name: sale.product_name,
          original_sale_amount: sale.sale_amount,
          original_currency: sale.currency,
        },
      }, client);
      return { sale: updated.rows[0], duplicate: false };
    });
    res.json({ ok: true, sale: result.sale, voided: true, duplicate: result.duplicate });
  } catch (error) {
    next(error);
  }
}

async function campaignSales(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const limit = boundedLimit(req.query.limit, 150, 500);
    const sales = await canonicalAttributedSalesForBusiness(businessId, req.params.id, limit);
    res.json({ sales });
  } catch (error) {
    next(error);
  }
}

async function createSalesSnapshot(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await assertFeatureForRequest(req, businessId, "sales_tracker");
    await requireCampaignForBusiness(req.params.id, businessId);
    const body = validate(salesSnapshotSchema, req.body);
    if (new Date(body.end_date) < new Date(body.start_date)) {
      throw badRequest("end_date cannot be earlier than start_date.");
    }

    const result = await query(
      `insert into campaign_sales_snapshots
        (business_id, campaign_id, period_type, start_date, end_date, total_sales_amount, total_orders, notes, created_by_user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        businessId,
        req.params.id,
        body.period_type,
        body.start_date,
        body.end_date,
        body.total_sales_amount,
        body.total_orders,
        body.notes || null,
        req.user.id,
      ]
    );

    const campaign = await getCampaignMetrics(req.params.id, businessId);
    res.status(201).json({
      snapshot: result.rows[0],
      indirect_metrics: {
        baseline_sales: campaign.baseline_sales,
        campaign_period_sales: campaign.campaign_period_sales,
        after_sales: campaign.after_sales,
        sales_uplift: campaign.sales_uplift,
        estimated_uplift_roi: campaign.estimated_uplift_roi,
        direct_roi: safeRoi(campaign.attributed_revenue, campaign.budget_total),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateSalesSnapshot(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    await requireCampaignForBusiness(req.params.id, businessId);
    const body = validate(salesSnapshotSchema, req.body);
    if (new Date(body.end_date) < new Date(body.start_date)) {
      throw badRequest("end_date cannot be earlier than start_date.");
    }

    const result = await query(
      `update campaign_sales_snapshots
       set period_type = $4,
           start_date = $5,
           end_date = $6,
           total_sales_amount = $7,
           total_orders = $8,
           notes = $9
       where id = $1 and campaign_id = $2 and business_id = $3
       returning *`,
      [
        req.params.snapshotId,
        req.params.id,
        businessId,
        body.period_type,
        body.start_date,
        body.end_date,
        body.total_sales_amount,
        body.total_orders,
        body.notes || null,
      ]
    );

    if (!result.rowCount) {
      throw notFound("Sales snapshot not found.");
    }

    const campaign = await getCampaignMetrics(req.params.id, businessId);
    res.json({
      snapshot: result.rows[0],
      indirect_metrics: {
        baseline_sales: campaign.baseline_sales,
        campaign_period_sales: campaign.campaign_period_sales,
        after_sales: campaign.after_sales,
        sales_uplift: campaign.sales_uplift,
        estimated_uplift_roi: campaign.estimated_uplift_roi,
        direct_roi: safeRoi(campaign.attributed_revenue, campaign.budget_total),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  businessAccess,
  ticketBalance,
  ticketTransactions,
  getBusinessProfile,
  commandCenterAnalytics,
  businessActivity,
  updateBusinessProfile,
  listBusinessUsers,
  createBusinessUser,
  updateBusinessUser,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  listCompetitors,
  createCompetitor,
  updateCompetitor,
  archiveCompetitor,
  listCompetitorCampaigns,
  createCompetitorCampaign,
  updateCompetitorCampaign,
  archiveCompetitorCampaign,
  listCompetitorEvents,
  createCompetitorEvent,
  updateCompetitorEvent,
  archiveCompetitorEvent,
  listCompetitorFindings,
  createCompetitorFinding,
  updateCompetitorFinding,
  archiveCompetitorFinding,
  listCompetitorTasks,
  createCompetitorTask,
  updateCompetitorTask,
  archiveCompetitorTask,
  listCompetitorProducts,
  createCompetitorProduct,
  updateCompetitorProduct,
  archiveCompetitorProduct,
  listAcquisitionChannels,
  createAcquisitionChannel,
  updateAcquisitionChannel,
  archiveAcquisitionChannel,
  listAcquisitionChannelEfforts,
  createAcquisitionChannelEffort,
  updateAcquisitionChannelEffort,
  archiveAcquisitionChannelEffort,
  createCustomerAcquisitionSale,
  archiveInventoryProduct,
  listInventoryCategories,
  createInventoryCategory,
  listInventorySubcategories,
  createInventorySubcategory,
  listInventoryCatalog,
  createInventoryCatalog,
  createInventoryProduct,
  importInventoryProductsCsv,
  getInventoryProductInsights,
  listInventoryProducts,
  updateInventoryProduct,
  listCampaigns,
  createCampaign,
  updateCampaign,
  getCampaign,
  patchClientSetup,
  confirmLaunch,
  campaignReport,
  campaignLeads,
  listManualLeads,
  createManualLead,
  importManualLeadsCsv,
  updateManualLead,
  assignManualLeadToCampaign,
  removeManualLeadFromCampaign,
  createManualLeadFromExistingLead,
  contactFeed,
  exportContactFeed,
  exportCampaignLeads,
  downloadActiveLeadQr,
  downloadLeadQrById,
  campaignRedemptions,
  attributedSales,
  voidAttributedSale,
  campaignSales,
  createSalesSnapshot,
  updateSalesSnapshot,
};

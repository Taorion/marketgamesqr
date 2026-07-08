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
const { getIndividualQrDownload } = require("../services/strategicQrService");

const launchChannelOptions = [
  "Instagram",
  "Facebook",
  "TikTok",
  "Volantes",
  "Influencer",
  "Evento fisico",
  "WhatsApp",
  "Punto de venta",
  "Otro",
];

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

const clientSetupSchema = z.object({
  budget_total: z.number().min(0),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  launch_channels: z.array(z.enum(launchChannelOptions)).min(1),
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
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  client_notes: z.string().trim().max(2000).optional().nullable(),
  delivered_assets: z.record(z.string(), z.unknown()).optional(),
});

const ownerCampaignPatchSchema = ownerCampaignSchema.partial();

const salesSnapshotSchema = z.object({
  period_type: z.enum(["BEFORE", "DURING", "AFTER"]),
  start_date: z.string().date(),
  end_date: z.string().date(),
  total_sales_amount: z.number().min(0),
  total_orders: z.number().int().min(0).default(0),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const businessProfileSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  slogan: z.string().trim().max(180).optional().nullable(),
  contact_name: z.string().trim().max(160).optional().nullable(),
  contact_email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  website: z.string().trim().max(220).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(220).optional().nullable(),
  affiliate_point_amount_cop: z.number().positive().optional().nullable(),
  affiliate_referral_points_rate: z.number().positive().optional().nullable(),
  affiliate_referral_points_rounding: z.enum(["floor", "ceil"]).optional().nullable(),
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
  customer_name: z.string().trim().max(160).optional().nullable(),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  customer_email: z.string().trim().email().optional().nullable(),
  customer_document_id: z.string().trim().max(80).optional().nullable(),
  product_name: z.string().trim().max(180).optional().nullable(),
  sale_amount: z.number().positive(),
  currency: z.string().trim().max(12).default("COP"),
  acquisition_source: z.enum(acquisitionSourceOptions),
  acquisition_channel: z.string().trim().max(180).optional().nullable(),
  referred_affiliate_id: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const inventoryProductSchema = z.object({
  sku: z.string().trim().max(80).optional().nullable(),
  barcode: z.string().trim().max(120).optional().nullable(),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1200).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  unit_price: z.number().min(0).default(0),
  cost_price: z.number().min(0).optional().nullable(),
  currency: z.string().trim().max(12).default("COP"),
  stock_quantity: z.number().min(0).default(0),
  min_stock_quantity: z.number().min(0).default(0),
  unit_label: z.string().trim().max(40).default("unidad"),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const inventoryProductPatchSchema = inventoryProductSchema.partial();

const nullableText = (max) => z.preprocess(
  (value) => {
    const text = String(value ?? "").trim();
    return text ? text : null;
  },
  z.string().max(max).nullable()
);

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
  company: nullableText(180),
  job_title: nullableText(160),
  source: z.string().trim().min(2).max(120).default("Manual"),
  source_detail: nullableText(220),
  interest: nullableText(500),
  importance_reason: nullableText(1000),
  preferred_channel: nullableText(120),
  preferred_contact_time: nullableText(120),
  status: z.enum(["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "LOST"]).default("NEW"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  notes: nullableText(2000),
});

const manualLeadPatchSchema = manualLeadSchema;

const PREPAID_LEAD_SAMPLE_LIMIT = 20;

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
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
      "select * from business_qr_credit_accounts where business_id = $1",
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

async function getCampaignLeadRows(businessId, campaignId, limit = null) {
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
    phone: settings.phone || "",
    website: settings.website || "",
    city: settings.city || "",
    address: settings.address || "",
    affiliate_points: rulesFromSettings(settings),
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
    res.set("Cache-Control", includeLogo ? "private, max-age=300" : "private, max-age=30");
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
      "select id, name from businesses where id = $1 and is_active = true",
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
    if (
      Object.prototype.hasOwnProperty.call(body, "affiliate_point_amount_cop")
      || Object.prototype.hasOwnProperty.call(body, "affiliate_referral_points_rate")
      || Object.prototype.hasOwnProperty.call(body, "affiliate_referral_points_rounding")
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
      };
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
              can_redeem_cross_business, is_active, created_at, updated_at
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
           updated_at = now()
       where id = $1
         and business_id = $2
         and role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'VALIDATOR')
       returning id, business_id, email, full_name, role, branch_id,
                 can_redeem_cross_business, is_active, created_at, updated_at`,
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

async function createCustomerAcquisitionSale(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(customerAcquisitionSaleSchema, req.body);

    const result = await withTransaction(async (client) => {
      if (body.campaign_id) {
        const campaign = await client.query(
          "select id from campaigns where id = $1 and business_id = $2",
          [body.campaign_id, businessId]
        );
        if (!campaign.rowCount) {
          throw badRequest("La campana atribuida no existe para este negocio.");
        }
      }

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

      const saleResult = await client.query(
        `insert into business_sales
          (business_id, campaign_id, customer_name, customer_phone, customer_email, customer_document_id,
           product_name, sale_amount, currency, seller_user_id, branch_id, acquisition_source,
           acquisition_channel, referred_affiliate_id, referral_points_awarded, notes, metadata)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         returning *`,
        [
          businessId,
          body.campaign_id || null,
          body.customer_name || null,
          body.customer_phone || null,
          body.customer_email || null,
          body.customer_document_id || null,
          body.product_name || null,
          body.sale_amount,
          body.currency || "COP",
          req.user.id,
          req.user.branch_id || null,
          body.acquisition_source,
          body.acquisition_channel || null,
          referredAffiliate?.id || null,
          referralPoints,
          body.notes || null,
          {
            ...body.metadata,
            capture_source: "customer_acquisition",
            conversion_source: "contact_center_sale",
            affiliate_match_source: autoMatchedAffiliate ? "customer_identity" : body.referred_affiliate_id ? "manual_selection" : null,
            related_affiliate_id: referredAffiliate?.id || null,
            ...(affiliatePointRules ? affiliatePointRuleMetadata(affiliatePointRules) : {}),
          },
        ]
      );

      const inventoryItems = saleInventoryItems(body.metadata?.products);
      for (const item of inventoryItems) {
        const updatedInventory = await client.query(
          `update business_inventory_products
           set stock_quantity = greatest(0, stock_quantity - $3::numeric),
               updated_at = now()
           where id = $1
             and business_id = $2
             and status <> 'ARCHIVED'
           returning id`,
          [item.inventory_product_id, businessId, item.quantity]
        );
        if (!updatedInventory.rowCount) {
          throw badRequest("Uno de los productos seleccionados no existe en el inventario activo del negocio.");
        }
      }

      const matchParams = [
        businessId,
        body.customer_document_id || null,
        body.customer_phone || null,
        body.customer_email || null,
      ];
      const convertedPlayers = await client.query(
        `update players
         set metadata = jsonb_set(
           jsonb_set(coalesce(metadata, '{}'::jsonb), '{commercial_status}', to_jsonb('BUYER'::text), true),
           '{converted_sale_id}', to_jsonb($5::text), true
         )
         where business_id = $1
           and (
             ($2::text is not null and nullif(document_id, '') = $2)
             or ($3::text is not null and nullif(phone, '') = $3)
             or ($4::text is not null and lower(nullif(email, '')) = lower($4))
           )
         returning id`,
        [...matchParams, saleResult.rows[0].id]
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
              acquisition_channel: body.acquisition_channel || null,
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

function saleInventoryItems(products) {
  if (!Array.isArray(products)) return [];
  return products
    .map((item) => ({
      inventory_product_id: item?.inventory_product_id || item?.product_id || null,
      quantity: Math.max(1, Number(item?.quantity || 1)),
    }))
    .filter((item) => item.inventory_product_id && Number.isFinite(item.quantity) && item.quantity > 0);
}

function inventorySearchWhere(search, params) {
  const text = String(search || "").trim();
  if (!text) return "";
  params.push(`%${text.toLowerCase()}%`);
  const index = params.length;
  return `and (
    lower(name) like $${index}
    or lower(coalesce(sku, '')) like $${index}
    or lower(coalesce(barcode, '')) like $${index}
    or lower(coalesce(category, '')) like $${index}
    or lower(coalesce(brand, '')) like $${index}
  )`;
}

async function ensureInventoryProductUnique(client, businessId, payload, excludeId = null) {
  if (!payload.sku && !payload.barcode) return;
  const duplicate = await client.query(
    `select id, sku, barcode
     from business_inventory_products
     where business_id = $1
       and ($2::uuid is null or id <> $2)
       and (
         ($3::text is not null and nullif(sku, '') = $3)
         or ($4::text is not null and nullif(barcode, '') = $4)
       )
     limit 1`,
    [businessId, excludeId, payload.sku || null, payload.barcode || null]
  );
  if (duplicate.rowCount) {
    throw badRequest("Ya existe un producto con ese SKU o codigo de barras en este negocio.");
  }
}

function mapInventoryPayload(body, userId) {
  return {
    sku: body.sku || null,
    barcode: body.barcode || null,
    name: body.name,
    description: body.description || null,
    category: body.category || null,
    brand: body.brand || null,
    unit_price: Number(body.unit_price || 0),
    cost_price: body.cost_price === null || body.cost_price === undefined ? null : Number(body.cost_price || 0),
    currency: body.currency || "COP",
    stock_quantity: Number(body.stock_quantity || 0),
    min_stock_quantity: Number(body.min_stock_quantity || 0),
    unit_label: body.unit_label || "unidad",
    status: body.status || "ACTIVE",
    metadata: body.metadata || {},
    created_by_user_id: userId || null,
  };
}

async function listInventoryProducts(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const limit = boundedLimit(req.query.limit, 200, 500);
    const params = [businessId];
    const searchWhere = inventorySearchWhere(req.query.search, params);
    const includeArchived = String(req.query.include_archived || "") === "true";
    params.push(limit);
    const result = await query(
      `select *,
              (stock_quantity <= min_stock_quantity) as low_stock
       from business_inventory_products
       where business_id = $1
         ${includeArchived ? "" : "and status <> 'ARCHIVED'"}
         ${searchWhere}
       order by status asc, updated_at desc, name asc
       limit $${params.length}`,
      params
    );
    res.json({ products: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createInventoryProduct(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(inventoryProductSchema, req.body);
    const payload = mapInventoryPayload(body, req.user.id);
    const result = await withTransaction(async (client) => {
      await ensureInventoryProductUnique(client, businessId, payload);
      return client.query(
        `insert into business_inventory_products
          (business_id, sku, barcode, name, description, category, brand, unit_price, cost_price,
           currency, stock_quantity, min_stock_quantity, unit_label, status, metadata, created_by_user_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16)
         returning *, (stock_quantity <= min_stock_quantity) as low_stock`,
        [
          businessId,
          payload.sku,
          payload.barcode,
          payload.name,
          payload.description,
          payload.category,
          payload.brand,
          payload.unit_price,
          payload.cost_price,
          payload.currency,
          payload.stock_quantity,
          payload.min_stock_quantity,
          payload.unit_label,
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

async function updateInventoryProduct(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(inventoryProductPatchSchema, req.body);
    const existing = await query(
      "select * from business_inventory_products where id = $1 and business_id = $2",
      [req.params.productId, businessId]
    );
    if (!existing.rowCount) throw badRequest("Producto de inventario no encontrado.");
    const payload = mapInventoryPayload({ ...existing.rows[0], ...body }, req.user.id);
    const result = await withTransaction(async (client) => {
      await ensureInventoryProductUnique(client, businessId, payload, req.params.productId);
      return client.query(
        `update business_inventory_products
         set sku = $3, barcode = $4, name = $5, description = $6, category = $7, brand = $8,
             unit_price = $9, cost_price = $10, currency = $11, stock_quantity = $12,
             min_stock_quantity = $13, unit_label = $14, status = $15,
             metadata = $16::jsonb, updated_at = now()
         where id = $1 and business_id = $2
         returning *, (stock_quantity <= min_stock_quantity) as low_stock`,
        [
          req.params.productId,
          businessId,
          payload.sku,
          payload.barcode,
          payload.name,
          payload.description,
          payload.category,
          payload.brand,
          payload.unit_price,
          payload.cost_price,
          payload.currency,
          payload.stock_quantity,
          payload.min_stock_quantity,
          payload.unit_label,
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
    const result = await query(
      `update business_inventory_products
       set status = 'ARCHIVED', updated_at = now()
       where id = $1 and business_id = $2
       returning id`,
      [req.params.productId, businessId]
    );
    if (!result.rowCount) throw badRequest("Producto de inventario no encontrado.");
    res.json({ ok: true, id: req.params.productId });
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

    const result = await query(
      `insert into campaigns
        (business_id, name, slug, public_slug, type, objective, strategy_summary, status,
         starts_at, ends_at, budget_total, expected_sales_goal, expected_leads_goal,
         expected_redemptions_goal, launch_channels, client_notes, delivered_assets,
         client_setup_completed_at, activated_at, metadata)
       values ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16::jsonb,
         case when $7 in ('SCHEDULED', 'ACTIVE') then now() else null end,
         case when $7 = 'ACTIVE' then now() else null end,
         $17::jsonb)
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
        JSON.stringify(body.launch_channels || []),
        body.client_notes || null,
        JSON.stringify(body.delivered_assets || {}),
        {
          owner_created: true,
          creation_source: "business_portal",
        },
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
    await requireCampaignForBusiness(req.params.id, businessId);
    const body = validate(ownerCampaignPatchSchema, req.body);
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
        Object.prototype.hasOwnProperty.call(body, "launch_channels") ? JSON.stringify(body.launch_channels || []) : null,
        body.client_notes ?? null,
        deliveredAssets,
      ]
    );

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

    if (body.launch_channels.includes("Otro") && !body.client_notes) {
      throw badRequest("client_notes is required when launch_channels includes 'Otro'.");
    }

    const result = await query(
      `update campaigns
       set budget_total = $3,
           starts_at = $4,
           ends_at = $5,
           launch_channels = $6::jsonb,
           expected_sales_goal = $7,
           expected_leads_goal = $8,
           expected_redemptions_goal = $9,
           client_notes = $10,
           objective = coalesce($11, objective),
           metadata = jsonb_set(
             jsonb_set(coalesce(metadata, '{}'::jsonb), '{additional_budget}', to_jsonb($12::numeric), true),
             '{campaign_cost_calculator}',
             $13::jsonb,
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
        JSON.stringify(body.launch_channels),
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

    if (!current.budget_total || !current.starts_at || !current.ends_at || !Array.isArray(current.launch_channels) || !current.launch_channels.length) {
      throw badRequest("The campaign still needs budget, dates, and launch channels before launch confirmation.");
    }

    const startsAt = new Date(current.starts_at);
    const nextStatus = startsAt <= new Date() ? "ACTIVE" : "SCHEDULED";
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

async function createManualLead(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await getBusinessSubscription(businessId);
    if (subscription.plan.raw_status !== "ACTIVE") {
      throw forbidden("La suscripcion del negocio no esta activa.");
    }
    if (subscription.plan.category === "subscription" && !subscription.plan.portal_access_allowed) {
      throw forbidden(`La mensualidad vencio y ya pasaron los ${subscription.plan.grace_period_days} dias de gracia. Renueva para recuperar tus leads y el portal.`);
    }
    const body = validate(manualLeadSchema, req.body);
    if (!body.email && !body.phone) {
      throw badRequest("Agrega al menos telefono o correo para poder contactar el prospecto.");
    }
    const result = await query(
      `insert into business_manual_leads
         (business_id, created_by_user_id, name, email, phone, company, job_title, source, source_detail,
          interest, importance_reason, preferred_channel, preferred_contact_time, status, priority, notes, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)
       returning *`,
      [
        businessId,
        req.user.id,
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
        JSON.stringify({
          source: "manual_portal_entry",
          created_by_email: req.user.email || null,
          manual_job_title: body.job_title || null,
          manual_importance_reason: body.importance_reason || null,
        }),
      ]
    );
    res.status(201).json({ lead: result.rows[0] });
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
              metadata = coalesce(metadata, '{}'::jsonb)
                || jsonb_build_object(
                     'manual_job_title', $7::text,
                     'manual_importance_reason', $11::text,
                     'manual_company', $6::text,
                     'manual_status', $14::text,
                     'manual_priority', $15::text,
                     'manual_notes', $16::text,
                     'updated_by_email', $17::text
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
       left join interactive_activations ia on ia.id = coalesce(
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
    const rows = await getCampaignLeadRows(businessId, req.params.id);
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

async function campaignSales(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const limit = boundedLimit(req.query.limit, 150, 500);
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
         where s.business_id = $1 and s.campaign_id = $2

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
         where bs.business_id = $1 and bs.campaign_id = $2
       ) sales
       order by created_at desc
       limit $3`,
      [businessId, req.params.id, limit]
    );
    res.json({ sales: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createSalesSnapshot(req, res, next) {
  try {
    const businessId = businessIdFor(req);
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
  createCustomerAcquisitionSale,
  archiveInventoryProduct,
  createInventoryProduct,
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
  createManualLead,
  updateManualLead,
  contactFeed,
  exportContactFeed,
  exportCampaignLeads,
  downloadActiveLeadQr,
  downloadLeadQrById,
  campaignRedemptions,
  campaignSales,
  createSalesSnapshot,
  updateSalesSnapshot,
};

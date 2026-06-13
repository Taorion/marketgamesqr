const QRCode = require("qrcode");
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
  assertMonthlyUsageLimit,
  getBusinessSubscription,
  recordUsage,
} = require("../services/subscriptionService");
const { mapPublicCreditAccount } = require("../services/qrCreditService");

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
});

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
  logo_data_url: z.string().trim().max(2_000_000).optional().nullable(),
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

const AFFILIATE_POINTS_PER_PESO = 1000;
const REFERRAL_POINTS_RATE = 0.2;

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

function referralPointsForSaleAmount(amount) {
  const basePoints = Number(amount || 0) / AFFILIATE_POINTS_PER_PESO;
  return Math.max(0, Math.ceil(basePoints * REFERRAL_POINTS_RATE));
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
  const base = env.publicValidatorUrl.replace(/\/$/, "");
  return `${base}/?token=${encodeURIComponent(token)}`;
}

async function getCampaignLeadRows(businessId, campaignId) {
  const result = await query(
    `select p.id, p.name, p.document_id, p.phone, p.email, p.created_at,
            coalesce(qn.answers->>'source', p.metadata->>'source', '-') as lead_source,
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
       select answers
       from questionnaires
       where player_id = p.id
       order by created_at desc
       limit 1
     ) qn on true
     left join rewards r on r.id = q.reward_id
     where p.business_id = $1 and p.campaign_id = $2
     order by p.created_at desc`,
    [businessId, campaignId]
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
    logo_data_url: includeLogo ? (settings.logo_data_url || "") : "",
    has_logo_data_url: Boolean(row.has_logo_data_url ?? settings.logo_data_url),
    logo_url: settings.logo_url || "",
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
    const settingsSelect = includeLogo ? "settings" : "settings - 'logo_data_url'";
    const result = await query(
      `select id, name, slug, ${settingsSelect} as settings,
              nullif(settings->>'logo_data_url', '') is not null as has_logo_data_url
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
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        settingsPatch[key] = cleanSetting(body[key]);
      }
    });

    const includeLogo = Object.prototype.hasOwnProperty.call(body, "logo_data_url") || wantsLogoPayload(req);
    const returningSettings = includeLogo ? "settings" : "settings - 'logo_data_url'";
    const result = await query(
      `update businesses
       set name = $2,
           settings = coalesce(settings, '{}'::jsonb) || $3::jsonb,
           updated_at = now()
       where id = $1 and is_active = true
       returning id, name, slug, ${returningSettings} as settings,
                 nullif(settings->>'logo_data_url', '') is not null as has_logo_data_url`,
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

async function createCustomerAcquisitionSale(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(customerAcquisitionSaleSchema, req.body);
    const referralPoints = body.referred_affiliate_id
      ? referralPointsForSaleAmount(body.sale_amount)
      : 0;

    const result = await withTransaction(async (client) => {
      let referredAffiliate = null;
      if (body.referred_affiliate_id) {
        const affiliateResult = await client.query(
          `select id, full_name, points_total
           from affiliates
           where id = $1 and business_id = $2 and status = 'ACTIVE'
           for update`,
          [body.referred_affiliate_id, businessId]
        );
        referredAffiliate = affiliateResult.rows[0];
        if (!referredAffiliate) {
          throw badRequest("El afiliado referido no existe o no esta activo para este negocio.");
        }
      }

      const saleResult = await client.query(
        `insert into business_sales
          (business_id, customer_name, customer_phone, customer_email, customer_document_id,
           product_name, sale_amount, currency, seller_user_id, branch_id, acquisition_source,
           acquisition_channel, referred_affiliate_id, referral_points_awarded, notes, metadata)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         returning *`,
        [
          businessId,
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
          body.referred_affiliate_id || null,
          referralPoints,
          body.notes || null,
          {
            ...body.metadata,
            capture_source: "customer_acquisition",
            referral_points_rate: body.referred_affiliate_id ? REFERRAL_POINTS_RATE : 0,
            points_base_amount: AFFILIATE_POINTS_PER_PESO,
          },
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
           metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{additional_budget}', to_jsonb($12::numeric), true),
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
        `select to_char(created_at::date, 'YYYY-MM-DD') as date,
                count(*)::int as sales,
                coalesce(sum(sale_amount), 0)::numeric(14, 2) as revenue
         from attributed_sales
         where campaign_id = $1 and business_id = $2
         group by created_at::date
         order by created_at::date`,
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
    res.json({ leads: await getCampaignLeadRows(businessId, req.params.id) });
  } catch (error) {
    next(error);
  }
}

async function exportCampaignLeads(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await assertFeatureForRequest(req, businessId, "leads_export");
    const rows = await getCampaignLeadRows(businessId, req.params.id);
    await assertMonthlyUsageLimit(
      businessId,
      "lead_export",
      subscription.plan.limits.lead_exports_month,
      1,
      "exportaciones de leads"
    );
    await assertMonthlyUsageLimit(
      businessId,
      "lead_export_row",
      subscription.plan.limits.lead_export_rows_month,
      rows.length,
      "filas exportadas"
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

    const validatorUrl = buildValidatorUrl(qr.token);
    const safeName = (qr.player_name || "cliente")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "cliente";

    res.json({
      qr_code_id: qr.id,
      status: qr.status,
      expires_at: qr.expires_at,
      player_name: qr.player_name,
      validator_url: validatorUrl,
      filename: `qr-${safeName}-${String(qr.id).slice(0, 8)}.png`,
      qr_image_data_url: await QRCode.toDataURL(validatorUrl),
    });
  } catch (error) {
    next(error);
  }
}

async function campaignRedemptions(req, res, next) {
  try {
    const businessId = businessIdFor(req);
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
       order by rd.redeemed_at desc`,
      [businessId, req.params.id]
    );
    res.json({ redemptions: result.rows });
  } catch (error) {
    next(error);
  }
}

async function campaignSales(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const result = await query(
      `select s.*, p.name as player_name, p.document_id, p.phone, br.name as branch_name,
              u.full_name as confirmed_by
       from attributed_sales s
       left join players p on p.id = s.player_id
       left join branches br on br.id = s.branch_id
       left join app_users u on u.id = s.sale_confirmed_by_user_id
       where s.business_id = $1 and s.campaign_id = $2
       order by s.created_at desc`,
      [businessId, req.params.id]
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
  getBusinessProfile,
  commandCenterAnalytics,
  updateBusinessProfile,
  createCustomerAcquisitionSale,
  listCampaigns,
  getCampaign,
  patchClientSetup,
  confirmLaunch,
  campaignReport,
  campaignLeads,
  exportCampaignLeads,
  downloadActiveLeadQr,
  campaignRedemptions,
  campaignSales,
  createSalesSnapshot,
  updateSalesSnapshot,
};

const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { query, withTransaction } = require("../config/db");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { validate } = require("../utils/validators");
const { resolveAcquisitionChannelReference } = require("../services/acquisitionChannelService");
const { getBusinessSummary, getBusinessCampaignMetrics, getCampaignMetrics } = require("../services/metricsService");
const {
  QR_PACKAGES,
  INTERNAL_UNIT_PRICE_COP,
  addQrCredits,
  mapCreditAccount,
  trafficLabel,
} = require("../services/qrCreditService");
const {
  listPlans,
  normalizePlanCode,
  setBusinessSubscription,
  getBusinessSubscription,
  assertLimitForBusiness,
} = require("../services/subscriptionService");

const campaignTypeEnum = z.enum(["GAME", "FORM", "LANDING", "INFLUENCER", "EVENT", "FLYER", "SOCIAL", "MIXED"]);
const campaignStatusEnum = z.enum(["DRAFT", "READY_FOR_CLIENT_SETUP", "SCHEDULED", "ACTIVE", "PAUSED", "FINISHED", "ARCHIVED"]);

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

const businessSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: slugSchema,
  owner_email: z.string().email().optional(),
  owner_password: z.string().min(8).optional(),
  owner_name: z.string().trim().min(2).optional(),
  package_size: z.number().int().optional().nullable(),
  internal_unit_price_cop: z.number().int().positive().optional(),
  public_label: z.string().trim().max(120).optional().nullable(),
  package_notes: z.string().trim().max(1000).optional().nullable(),
  plan_code: z.string().trim().max(40).optional(),
  subscription_status: z.string().trim().max(40).optional(),
});

const subscriptionPatchSchema = z.object({
  plan_code: z.string().trim().min(2).max(40),
  subscription_status: z.string().trim().max(40).optional(),
  subscription_current_period_ends_at: z.string().datetime().optional().nullable(),
  is_active: z.boolean().optional(),
  activate_business_users: z.boolean().optional(),
});

const campaignSchema = z.object({
  business_id: z.string().uuid(),
  game_id: z.string().uuid().optional().nullable(),
  reward_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(160),
  slug: slugSchema,
  type: campaignTypeEnum.default("FORM"),
  objective: z.string().trim().max(500).optional().nullable(),
  strategy_summary: z.string().trim().max(2000).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  budget_total: z.number().min(0).default(0),
  expected_sales_goal: z.number().min(0).optional().nullable(),
  expected_leads_goal: z.number().min(0).optional().nullable(),
  expected_redemptions_goal: z.number().min(0).optional().nullable(),
  launch_channels: z.array(z.string().trim().min(2).max(80)).optional(),
  launch_channel_refs: z.array(z.object({
    acquisition_channel_id: z.string().uuid().optional().nullable(),
    acquisition_channel: z.string().trim().min(2).max(180).optional().nullable(),
  })).optional(),
  client_notes: z.string().trim().max(2000).optional().nullable(),
  activated_at: z.string().datetime().optional().nullable(),
  client_setup_completed_at: z.string().datetime().optional().nullable(),
  delivered_assets: z.record(z.string(), z.unknown()).optional(),
  status: campaignStatusEnum.default("DRAFT"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const patchCampaignSchema = campaignSchema.partial().omit({ business_id: true });

async function resolveAdminCampaignChannelRefs(client, businessId, refs, legacyNames) {
  const input = Array.isArray(refs) && refs.length
    ? refs
    : (legacyNames || []).map((acquisition_channel) => ({ acquisition_channel }));
  return Promise.all(input.map(async (item) => {
    const channel = await resolveAcquisitionChannelReference(client, businessId, item);
    return { id: channel.acquisition_channel_id, name_snapshot: channel.acquisition_channel_name_snapshot, slug_snapshot: channel.acquisition_channel_slug_snapshot, source: channel.acquisition_channel_source };
  }));
}

const creditPackageSchema = z.object({
  package_size: z.number().int(),
  internal_unit_price_cop: z.number().int().positive().optional(),
  public_label: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const adminUserSchema = z.object({
  business_id: z.string().uuid().optional().nullable(),
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().trim().min(2).max(160),
  role: z.enum(["ADMIN_MARKET_GAMES", "BUSINESS_OWNER", "BUSINESS_MANAGER", "VALIDATOR"]),
  can_redeem_cross_business: z.boolean().optional(),
});

const patchAdminUserSchema = z.object({
  business_id: z.string().uuid().optional().nullable(),
  password: z.string().min(8).optional(),
  full_name: z.string().trim().min(2).max(160).optional(),
  role: z.enum(["ADMIN_MARKET_GAMES", "BUSINESS_OWNER", "BUSINESS_MANAGER", "VALIDATOR"]).optional(),
  can_redeem_cross_business: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const agreementClientSchema = z.object({
  business_name: z.string().trim().min(2).max(160),
  slug: slugSchema.optional(),
  owner_name: z.string().trim().min(2).max(160),
  owner_email: z.string().email(),
  owner_password: z.string().min(8),
  owner_document: z.string().trim().min(4).max(40).optional().nullable(),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  plan_code: z.enum(["STARTER", "GROWTH", "PRO", "GLOBAL"]).default("GROWTH"),
  free_months: z.number().int().min(0).max(60).default(0),
  initial_tickets: z.number().int().min(0).max(100000).default(0),
  lifetime_access: z.boolean().default(false),
  monthly_payment_required: z.boolean().default(true),
  agreement_notes: z.string().trim().max(1200).optional().nullable(),
});

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + Number(months || 0));
  return next;
}

function normalizeDeliveredAssets(value) {
  const deliveredAssets = value && typeof value === "object" ? { ...value } : {};
  const checklist = deliveredAssets.checklist && typeof deliveredAssets.checklist === "object"
    ? deliveredAssets.checklist
    : {};

  deliveredAssets.checklist = {
    brief_ready: Boolean(checklist.brief_ready),
    copies_ready: Boolean(checklist.copies_ready),
    creatives_ready: Boolean(checklist.creatives_ready),
    links_ready: Boolean(checklist.links_ready),
    qa_ready: Boolean(checklist.qa_ready),
    client_shared: Boolean(checklist.client_shared),
  };

  return deliveredAssets;
}

function isChecklistReady(deliveredAssets) {
  const checklist = normalizeDeliveredAssets(deliveredAssets).checklist;
  return Object.values(checklist).every(Boolean);
}

function requireMarketAdmin(user) {
  if (!["ADMIN_MARKET_GAMES", "ADMIN"].includes(user.role)) {
    throw forbidden("Only Sales Machine admins can perform this action.");
  }
}

async function createBusiness(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const body = validate(businessSchema, req.body);

    const result = await withTransaction(async (client) => {
      const business = await client.query(
        `insert into businesses (name, slug, plan_code, subscription_status, subscription_started_at)
         values ($1, $2, $3, $4, now())
         returning *`,
        [
          body.name,
          body.slug,
          normalizePlanCode(body.plan_code || (body.package_size ? "PREPAID_QR" : "STARTER")),
          body.subscription_status || "ACTIVE",
        ]
      );

      let owner = null;
      if (body.owner_email && body.owner_password) {
        const hash = await bcrypt.hash(body.owner_password, 12);
        const ownerResult = await client.query(
          `insert into app_users (business_id, email, password_hash, full_name, role)
           values ($1, $2, $3, $4, 'BUSINESS_OWNER')
           returning id, business_id, email, full_name, role`,
          [business.rows[0].id, body.owner_email, hash, body.owner_name || "Business Owner"]
        );
        owner = ownerResult.rows[0];
      }

      let credit_account = null;
      if (body.package_size) {
        credit_account = mapCreditAccount(await addQrCredits(client, {
          business_id: business.rows[0].id,
          package_size: body.package_size,
          internal_unit_price_cop: body.internal_unit_price_cop || INTERNAL_UNIT_PRICE_COP,
          public_label: body.public_label || trafficLabel(body.package_size),
          notes: body.package_notes || "Paquete inicial al crear cliente.",
          created_by_user_id: req.user.id,
        }));
      }

      return { business: business.rows[0], owner, credit_account };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function ensureBaseBusinessRecords(client, businessId, businessName) {
  const baseSlug = slugify(businessName) || "cliente";
  const branch = await client.query(
    `insert into branches (business_id, name, slug, address, is_active)
     values ($1, 'Sede principal', 'sede-principal', $2, true)
     on conflict (business_id, slug) do update
     set name = excluded.name,
         address = excluded.address,
         is_active = true,
         updated_at = now()
     returning id, name`,
    [businessId, businessName]
  );

  const game = await client.query(
    `insert into games (business_id, name, slug, metadata, is_active)
     values ($1, $2, $3, $4::jsonb, true)
     on conflict (business_id, slug) do update
     set name = excluded.name,
         metadata = excluded.metadata,
         is_active = true,
         updated_at = now()
     returning id, name`,
    [
      businessId,
      `Motor Comercial ${businessName}`,
      `${baseSlug}-rms`,
      JSON.stringify({ type: "agreement_client", source: "admin_agreement_provisioning" }),
    ]
  );

  const reward = await client.query(
    `insert into rewards (business_id, name, description, display_in_validator, metadata, is_active)
     values ($1, $2, $3, $4, $5::jsonb, true)
     on conflict (business_id, name) do update
     set description = excluded.description,
         display_in_validator = excluded.display_in_validator,
         metadata = excluded.metadata,
         is_active = true,
         updated_at = now()
     returning id, name`,
    [
      businessId,
      `Beneficio ${businessName}`,
      `Beneficio configurable para operaciones RMS de ${businessName}.`,
      `Validar beneficio ${businessName}.`,
      JSON.stringify({ agreement_default: true }),
    ]
  );

  return {
    branch: branch.rows[0],
    game: game.rows[0],
    reward: reward.rows[0],
  };
}

async function assignInitialAgreementTickets(client, businessId, quantity, userId, notes) {
  const amount = Number(quantity || 0);
  if (!amount) {
    const existing = await client.query(
      "select * from business_qr_credit_accounts where business_id = $1",
      [businessId]
    );
    return existing.rows[0] || null;
  }

  const existing = await client.query(
    "select * from business_qr_credit_accounts where business_id = $1 for update",
    [businessId]
  );
  const currentBalance = Number(existing.rows[0]?.qr_balance || 0);
  const currentUsed = Number(existing.rows[0]?.qr_used_total || 0);
  const nextBalance = currentBalance + amount;
  const nextPurchased = Number(existing.rows[0]?.qr_purchased_total || 0) + amount;
  const label = `${amount.toLocaleString("es-CO")} tickets iniciales por convenio`;

  const account = await client.query(
    `insert into business_qr_credit_accounts
      (business_id, current_package_size, qr_balance, qr_purchased_total,
       public_label, internal_unit_price_cop, last_purchase_at)
     values ($1, $2, $3, $4, $5, 0, now())
     on conflict (business_id) do update
     set current_package_size = $2,
         qr_balance = $3,
         qr_purchased_total = $4,
         public_label = $5,
         internal_unit_price_cop = 0,
         last_purchase_at = now(),
         updated_at = now()
     returning *`,
    [businessId, amount, nextBalance, Math.max(nextPurchased, currentUsed + nextBalance), label]
  );

  await client.query(
    `insert into business_qr_credit_ledger
      (business_id, account_id, entry_type, package_size, delta_qr, balance_after,
       internal_unit_price_cop, internal_total_cop, public_label, notes, created_by_user_id)
     values ($1, $2, 'MANUAL_ADJUSTMENT', $3, $4, $5, 0, 0, $6, $7, $8)`,
    [
      businessId,
      account.rows[0].id,
      amount,
      amount,
      account.rows[0].qr_balance,
      label,
      notes || "Tickets iniciales asignados por convenio comercial.",
      userId,
    ]
  );

  return account.rows[0];
}

async function createAgreementClient(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const body = validate(agreementClientSchema, {
      ...req.body,
      slug: req.body.slug || req.body.business_name,
    });
    const planCode = normalizePlanCode(body.plan_code || "GROWTH");
    const lifetimeAccess = Boolean(body.lifetime_access);
    const monthlyPaymentRequired = lifetimeAccess ? false : Boolean(body.monthly_payment_required);
    const freeMonths = Number(body.free_months || 0);
    const now = new Date();
    const currentPeriodEndsAt = lifetimeAccess || !monthlyPaymentRequired
      ? null
      : addMonths(now, freeMonths).toISOString();

    const result = await withTransaction(async (client) => {
      const [existingSlug, existingUser] = await Promise.all([
        client.query("select id, name from businesses where slug = $1", [body.slug]),
        client.query("select id, email, business_id from app_users where lower(email) = lower($1)", [body.owner_email]),
      ]);
      if (existingSlug.rowCount) {
        throw badRequest(`Ya existe un cliente con slug ${body.slug}.`);
      }
      if (existingUser.rowCount) {
        throw badRequest(`Ya existe un usuario con el correo ${body.owner_email}.`);
      }

      const settings = {
        nit: body.owner_document || null,
        contact_name: body.owner_name,
        contact_email: body.owner_email,
        phone: body.contact_phone || null,
        city: body.city || null,
        account_document_type: body.owner_document ? "CEDULA" : null,
        account_document_id: body.owner_document || null,
        signup_type: "admin_agreement_client",
        manual_provisioning: true,
        commercial_deal: {
          deal_type: lifetimeAccess ? "lifetime" : monthlyPaymentRequired ? "free_months" : "no_monthly_payment",
          free_months: freeMonths,
          initial_tickets: Number(body.initial_tickets || 0),
          monthly_payment_required: monthlyPaymentRequired,
          lifetime_access: lifetimeAccess,
          notes: body.agreement_notes || null,
          created_by_user_id: req.user.id,
          created_at: now.toISOString(),
        },
        subscription: {
          plan_code: planCode,
          status: "ACTIVE",
          billing_cycle: lifetimeAccess ? "lifetime" : monthlyPaymentRequired ? "monthly_after_grace" : "no_monthly_payment",
          monthly_payment_required: monthlyPaymentRequired,
          lifetime_access: lifetimeAccess,
          free_months: freeMonths,
          current_period_ends_at: currentPeriodEndsAt,
          notes: body.agreement_notes || null,
        },
        access: {
          plan_type: "premium_monthly",
          portal_status: "ACTIVE",
          lifetime_access: lifetimeAccess,
          source: "admin_agreement_provisioning",
          provisioned_at: now.toISOString(),
        },
      };

      const business = await client.query(
        `insert into businesses
          (name, slug, settings, plan_code, plan_type, portal_status,
           portal_activated_at, subscription_status, subscription_started_at,
           subscription_current_period_ends_at, subscription_auto_renew_enabled,
           subscription_auto_renew_status, is_active)
         values ($1, $2, $3::jsonb, $4, 'premium_monthly', 'ACTIVE',
           now(), 'ACTIVE', now(), $5, false, 'DISABLED', true)
         returning *`,
        [body.business_name, body.slug, JSON.stringify(settings), planCode, currentPeriodEndsAt]
      );

      const passwordHash = await bcrypt.hash(body.owner_password, 12);
      const owner = await client.query(
        `insert into app_users (business_id, email, password_hash, full_name, role, is_active)
         values ($1, lower($2), $3, $4, 'BUSINESS_OWNER', true)
         returning id, business_id, email, full_name, role, is_active`,
        [business.rows[0].id, body.owner_email, passwordHash, body.owner_name]
      );

      const base = await ensureBaseBusinessRecords(client, business.rows[0].id, body.business_name);
      const creditAccount = await assignInitialAgreementTickets(
        client,
        business.rows[0].id,
        body.initial_tickets,
        req.user.id,
        body.agreement_notes || "Tickets iniciales asignados al crear cliente con convenio."
      );

      return {
        business: business.rows[0],
        owner: owner.rows[0],
        base,
        credit_account: mapCreditAccount(creditAccount),
      };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function addBusinessCredits(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const body = validate(creditPackageSchema, req.body);
    const business = await query("select id from businesses where id = $1", [req.params.id]);
    if (!business.rowCount) {
      throw notFound("Business not found.");
    }

    const account = await withTransaction((client) => addQrCredits(client, {
      business_id: req.params.id,
      package_size: body.package_size,
      internal_unit_price_cop: body.internal_unit_price_cop || INTERNAL_UNIT_PRICE_COP,
      public_label: body.public_label || trafficLabel(body.package_size),
      notes: body.notes || "Recarga de paquete QR.",
      created_by_user_id: req.user.id,
    }));

    res.status(201).json({ credit_account: mapCreditAccount(account) });
  } catch (error) {
    next(error);
  }
}

async function businessCredits(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const [business, account, ledger] = await Promise.all([
      query("select id, name, slug from businesses where id = $1", [req.params.id]),
      query("select * from business_qr_credit_accounts where business_id = $1", [req.params.id]),
      query(
        `select l.*, u.full_name as created_by_name
         from business_qr_credit_ledger l
         left join app_users u on u.id = l.created_by_user_id
         where l.business_id = $1
         order by l.created_at desc
         limit 80`,
        [req.params.id]
      ),
    ]);
    if (!business.rowCount) {
      throw notFound("Business not found.");
    }

    res.json({
      business: business.rows[0],
      packages: QR_PACKAGES,
      internal_unit_price_cop: INTERNAL_UNIT_PRICE_COP,
      credit_account: mapCreditAccount(account.rows[0]),
      ledger: ledger.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const body = validate(adminUserSchema, req.body);

    if (body.role === "ADMIN_MARKET_GAMES" && body.business_id) {
      throw badRequest("Un empleado interno no debe quedar amarrado a un cliente.");
    }
    if (["BUSINESS_OWNER", "BUSINESS_MANAGER", "VALIDATOR"].includes(body.role) && !body.business_id) {
      throw badRequest("Selecciona un cliente para usuarios owner, manager o validador.");
    }

    if (body.business_id) {
      const business = await query("select id from businesses where id = $1", [body.business_id]);
      if (!business.rowCount) {
        throw notFound("Business not found.");
      }
      const usersCount = await query(
        `select
           count(*) filter (where role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'BUSINESS_SELLER', 'VALIDATOR'))::int as users,
           count(*) filter (where role = 'VALIDATOR')::int as validators
         from app_users
         where business_id = $1 and is_active = true`,
        [body.business_id]
      );
      await assertLimitForBusiness(
        body.business_id,
        "users",
        Number(usersCount.rows[0]?.users || 0),
        "usuarios"
      );
      if (body.role === "VALIDATOR") {
        await assertLimitForBusiness(
          body.business_id,
          "validators",
          Number(usersCount.rows[0]?.validators || 0),
          "validadores"
        );
      }
    }

    const hash = await bcrypt.hash(body.password, 12);
    const result = await query(
      `insert into app_users (business_id, email, password_hash, full_name, role, can_redeem_cross_business)
       values ($1, $2, $3, $4, $5, $6)
       returning id, business_id, email, full_name, role, can_redeem_cross_business, is_active, created_at`,
      [
        body.role === "ADMIN_MARKET_GAMES" ? null : body.business_id,
        body.email,
        hash,
        body.full_name,
        body.role,
        body.role === "VALIDATOR" ? Boolean(body.can_redeem_cross_business) : false,
      ]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function patchUser(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const body = validate(patchAdminUserSchema, req.body);
    const existing = await query("select * from app_users where id = $1", [req.params.id]);
    if (!existing.rowCount) {
      throw notFound("User not found.");
    }

    const current = existing.rows[0];
    const hasLaunchChannels = body.launch_channels !== undefined || body.launch_channel_refs !== undefined;
    const launchChannelRefs = hasLaunchChannels
      ? await withTransaction((client) => resolveAdminCampaignChannelRefs(client, current.business_id, body.launch_channel_refs, body.launch_channels || []))
      : null;
    const nextRole = body.role || current.role;
    const nextBusinessId = nextRole === "ADMIN_MARKET_GAMES" ? null : (body.business_id === undefined ? current.business_id : body.business_id);
    const nextActive = body.is_active === undefined ? current.is_active : body.is_active;

    if (nextRole === "ADMIN_MARKET_GAMES" && nextBusinessId) {
      throw badRequest("Un empleado interno no debe quedar amarrado a un cliente.");
    }
    if (["BUSINESS_OWNER", "BUSINESS_MANAGER", "VALIDATOR"].includes(nextRole) && !nextBusinessId) {
      throw badRequest("Selecciona un cliente para usuarios owner, manager o validador.");
    }

    if (["ADMIN", "ADMIN_MARKET_GAMES"].includes(current.role) && (nextRole !== current.role || nextActive === false)) {
      const adminCount = await query(
        `select count(*)::int as total
         from app_users
         where role in ('ADMIN', 'ADMIN_MARKET_GAMES')
           and is_active = true
           and id <> $1`,
        [current.id]
      );
      if (!Number(adminCount.rows[0]?.total || 0)) {
        throw badRequest("No puedes desactivar o degradar la ultima cuenta admin activa.");
      }
    }

    let passwordHash = current.password_hash;
    if (body.password) {
      passwordHash = await bcrypt.hash(body.password, 12);
    }

    const result = await query(
      `update app_users
       set business_id = $2,
           password_hash = $3,
           full_name = $4,
           role = $5,
           can_redeem_cross_business = $6,
           is_active = $7,
           updated_at = now()
       where id = $1
       returning id, business_id, email, full_name, role, can_redeem_cross_business, is_active, created_at, updated_at`,
      [
        current.id,
        nextBusinessId,
        passwordHash,
        body.full_name || current.full_name,
        nextRole,
        nextRole === "VALIDATOR" ? (body.can_redeem_cross_business === undefined ? current.can_redeem_cross_business : body.can_redeem_cross_business) : false,
        nextActive,
      ]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const result = await query(
      `select u.id, u.business_id, b.name as business_name, u.email, u.full_name, u.role,
              u.can_redeem_cross_business, u.is_active, u.created_at
       from app_users u
       left join businesses b on b.id = u.business_id
       order by u.created_at desc
       limit 120`
    );
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createCampaign(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const body = validate(campaignSchema, {
      ...req.body,
      slug: req.body.slug || req.body.name,
    });
    if (!["FINISHED", "ARCHIVED"].includes(body.status)) {
      const activeCount = await query(
        `select count(*)::int as total
         from campaigns
         where business_id = $1
           and status not in ('FINISHED', 'ARCHIVED')`,
        [body.business_id]
      );
      await assertLimitForBusiness(
        body.business_id,
        "active_campaigns",
        Number(activeCount.rows[0]?.total || 0),
        "campanas activas"
      );
    }
    const deliveredAssets = normalizeDeliveredAssets(body.delivered_assets);
    const channelRefs = await withTransaction((client) => resolveAdminCampaignChannelRefs(client, body.business_id, body.launch_channel_refs, body.launch_channels));
    const channelNames = channelRefs.map((channel) => channel.name_snapshot).filter(Boolean);
    const result = await query(
      `insert into campaigns
        (business_id, game_id, reward_id, name, slug, public_slug, type, objective, strategy_summary,
         starts_at, ends_at, budget_total, expected_sales_goal, expected_leads_goal, expected_redemptions_goal,
         launch_channels, client_notes, activated_at, client_setup_completed_at, delivered_assets,
         status, created_by_admin_id, launch_channel_refs, metadata)
       values ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, $17, $18, $19::jsonb, $20, $21, $22::jsonb, $23::jsonb)
       returning *`,
      [
        body.business_id,
        body.game_id || null,
        body.reward_id || null,
        body.name,
        body.slug,
        body.type,
        body.objective || null,
        body.strategy_summary || null,
        body.starts_at || null,
        body.ends_at || null,
        body.budget_total,
        body.expected_sales_goal || null,
        body.expected_leads_goal || null,
        body.expected_redemptions_goal || null,
        JSON.stringify(channelNames),
        body.client_notes || null,
        body.activated_at || null,
        body.client_setup_completed_at || null,
        JSON.stringify(deliveredAssets),
        body.status,
        req.user.id,
        JSON.stringify(channelRefs),
        JSON.stringify(body.metadata || {}),
      ]
    );
    res.status(201).json({ campaign: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function patchCampaign(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const body = validate(patchCampaignSchema, req.body);
    const existing = await query("select * from campaigns where id = $1", [req.params.id]);
    if (!existing.rowCount) {
      throw notFound("Campaign not found.");
    }
    const current = existing.rows[0];
    const nextValues = {
      game_id: body.game_id === undefined ? current.game_id : body.game_id,
      reward_id: body.reward_id === undefined ? current.reward_id : body.reward_id,
      name: body.name ?? current.name,
      slug: body.slug ?? current.slug ?? current.public_slug,
      type: body.type ?? current.type,
      objective: body.objective === undefined ? current.objective : body.objective,
      strategy_summary: body.strategy_summary === undefined ? current.strategy_summary : body.strategy_summary,
      starts_at: body.starts_at === undefined ? current.starts_at : body.starts_at,
      ends_at: body.ends_at === undefined ? current.ends_at : body.ends_at,
      budget_total: body.budget_total === undefined ? current.budget_total : body.budget_total,
      expected_sales_goal: body.expected_sales_goal === undefined ? current.expected_sales_goal : body.expected_sales_goal,
      expected_leads_goal: body.expected_leads_goal === undefined ? current.expected_leads_goal : body.expected_leads_goal,
      expected_redemptions_goal: body.expected_redemptions_goal === undefined ? current.expected_redemptions_goal : body.expected_redemptions_goal,
      launch_channels: launchChannelRefs ? launchChannelRefs.map((channel) => channel.name_snapshot).filter(Boolean) : (current.launch_channels || []),
      client_notes: body.client_notes === undefined ? current.client_notes : body.client_notes,
      activated_at: body.activated_at === undefined ? current.activated_at : body.activated_at,
      client_setup_completed_at: body.client_setup_completed_at === undefined ? current.client_setup_completed_at : body.client_setup_completed_at,
      delivered_assets: body.delivered_assets === undefined
        ? normalizeDeliveredAssets(current.delivered_assets)
        : normalizeDeliveredAssets(body.delivered_assets),
      status: body.status ?? current.status,
      metadata: body.metadata === undefined ? (current.metadata || {}) : body.metadata,
    };
    const result = await query(
      `update campaigns
       set game_id = $2, reward_id = $3, name = $4, slug = $5, public_slug = $5, type = $6,
           objective = $7, strategy_summary = $8, starts_at = $9, ends_at = $10,
           budget_total = $11, expected_sales_goal = $12, expected_leads_goal = $13,
           expected_redemptions_goal = $14, launch_channels = $15::jsonb, client_notes = $16,
           activated_at = $17, client_setup_completed_at = $18, delivered_assets = $19::jsonb,
           status = $20, metadata = $21::jsonb
       where id = $1
       returning *`,
      [
        req.params.id,
        nextValues.game_id,
        nextValues.reward_id,
        nextValues.name,
        nextValues.slug,
        nextValues.type,
        nextValues.objective,
        nextValues.strategy_summary,
        nextValues.starts_at,
        nextValues.ends_at,
        nextValues.budget_total,
        nextValues.expected_sales_goal,
        nextValues.expected_leads_goal,
        nextValues.expected_redemptions_goal,
        JSON.stringify(nextValues.launch_channels || []),
        nextValues.client_notes,
        nextValues.activated_at,
        nextValues.client_setup_completed_at,
        JSON.stringify(nextValues.delivered_assets || {}),
        nextValues.status,
        JSON.stringify(nextValues.metadata || {}),
      ]
    );
    if (launchChannelRefs) {
      await query("update campaigns set launch_channel_refs = $2::jsonb where id = $1", [req.params.id, JSON.stringify(launchChannelRefs)]);
    }
    res.json({ campaign: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function listCampaigns(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const params = [];
    const where = [];
    if (req.query.business_id) {
      params.push(req.query.business_id);
      where.push(`c.business_id = $${params.length}`);
    }
    const result = await query(
      `select c.*, b.name as business_name, b.slug as business_slug,
              qa.qr_balance, qa.qr_purchased_total, qa.qr_used_total
       from campaigns c
       join businesses b on b.id = c.business_id
       left join business_qr_credit_accounts qa on qa.business_id = b.id
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by c.created_at desc`,
      params
    );
    res.json({ campaigns: result.rows });
  } catch (error) {
    next(error);
  }
}

async function listBusinesses(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const result = await query(
      `select
         b.id,
         b.name,
         b.slug,
         b.plan_code,
         b.subscription_status,
         b.subscription_started_at,
         b.subscription_current_period_ends_at,
         b.is_active,
         b.created_at,
         qa.current_package_size,
         qa.qr_balance,
         qa.qr_purchased_total,
         qa.qr_used_total,
         qa.internal_unit_price_cop,
         qa.public_label,
         qa.last_purchase_at,
         count(distinct u.id) filter (where u.role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'BUSINESS_SELLER', 'VALIDATOR'))::int as users_count,
         count(distinct u.id) filter (where u.role = 'VALIDATOR')::int as validators_count,
         count(distinct c.id)::int as campaigns_count,
         count(distinct c.id) filter (where c.status = 'READY_FOR_CLIENT_SETUP')::int as ready_campaigns_count,
         count(distinct c.id) filter (where c.status = 'ACTIVE')::int as active_campaigns_count
       from businesses b
       left join campaigns c on c.business_id = b.id
       left join app_users u on u.business_id = b.id
       left join business_qr_credit_accounts qa on qa.business_id = b.id
       group by b.id
       , qa.current_package_size, qa.qr_balance, qa.qr_purchased_total, qa.qr_used_total, qa.internal_unit_price_cop, qa.public_label, qa.last_purchase_at
       order by b.created_at desc`
    );
    res.json({ businesses: result.rows });
  } catch (error) {
    next(error);
  }
}

async function listSubscriptionPlans(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    res.json({ plans: listPlans() });
  } catch (error) {
    next(error);
  }
}

async function updateBusinessSubscription(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const body = validate(subscriptionPatchSchema, req.body);
    const subscription = await setBusinessSubscription(req.params.id, body);
    if (body.is_active !== undefined) {
      await query(
        `update businesses
         set is_active = $2,
             updated_at = now()
         where id = $1`,
        [req.params.id, body.is_active]
      );
    }
    if (body.activate_business_users) {
      await query(
        `update app_users
         set is_active = true,
             updated_at = now()
         where business_id = $1
           and role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'BUSINESS_SELLER', 'VALIDATOR')`,
        [req.params.id]
      );
    }
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
}

async function businessSummary(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const business = await query("select id, name, slug from businesses where id = $1", [req.params.id]);
    if (!business.rowCount) {
      throw badRequest("Business not found.");
    }
    res.json({
      business: business.rows[0],
      subscription: await getBusinessSubscription(req.params.id),
      summary: await getBusinessSummary(req.params.id),
      campaigns: await getBusinessCampaignMetrics(req.params.id),
      credit_account: mapCreditAccount((await query("select * from business_qr_credit_accounts where business_id = $1", [req.params.id])).rows[0]),
    });
  } catch (error) {
    next(error);
  }
}

async function markCampaignReady(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const existing = await query("select id, status, delivered_assets from campaigns where id = $1", [req.params.id]);
    if (!existing.rowCount) {
      throw notFound("Campaign not found.");
    }
    if (!isChecklistReady(existing.rows[0].delivered_assets)) {
      throw badRequest("Complete the internal delivery checklist before marking the campaign ready for the client.");
    }

    const result = await query(
      `update campaigns
       set status = 'READY_FOR_CLIENT_SETUP'
       where id = $1
       returning *`,
      [req.params.id]
    );
    res.json({ campaign: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function campaignReport(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const campaign = await getCampaignMetrics(req.params.id, null);
    if (!campaign) {
      throw notFound("Campaign not found.");
    }

    const business = await query("select id, name, slug from businesses where id = $1", [campaign.business_id]);
    const [redemptionsByDay, salesByDay, snapshots] = await Promise.all([
      query(
        `select to_char(redeemed_at::date, 'YYYY-MM-DD') as date, count(*)::int as count
         from redemptions
         where campaign_id = $1
         group by redeemed_at::date
         order by redeemed_at::date`,
        [req.params.id]
      ),
      query(
        `select to_char(created_at::date, 'YYYY-MM-DD') as date,
                count(*)::int as sales,
                coalesce(sum(sale_amount), 0)::numeric(14, 2) as revenue
         from attributed_sales
         where campaign_id = $1
         group by created_at::date
         order by created_at::date`,
        [req.params.id]
      ),
      query(
        `select period_type, start_date, end_date, total_sales_amount, total_orders, notes, created_at
         from campaign_sales_snapshots
         where campaign_id = $1
         order by created_at desc`,
        [req.params.id]
      ),
    ]);

    res.json({
      campaign,
      business: business.rows[0] || null,
      summary: await getBusinessSummary(campaign.business_id),
      campaigns: await getBusinessCampaignMetrics(campaign.business_id),
      redemptions_by_day: redemptionsByDay.rows,
      sales_by_day: salesByDay.rows,
      sales_snapshots: snapshots.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBusiness,
  createAgreementClient,
  createCampaign,
  patchCampaign,
  markCampaignReady,
  listBusinesses,
  listSubscriptionPlans,
  updateBusinessSubscription,
  listCampaigns,
  businessSummary,
  campaignReport,
  addBusinessCredits,
  businessCredits,
  createUser,
  patchUser,
  listUsers,
};

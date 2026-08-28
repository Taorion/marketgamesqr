const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { query, withTransaction } = require("../config/db");
const { badRequest, notFound, forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const { canAccessBusiness } = require("../middleware/auth");
const { PLAN_CODES, listPlans, normalizePlanCode } = require("../services/subscriptionService");
const {
  createPortalSignupCheckout,
} = require("../services/mercadoPagoService");
const { createSignupAttribution } = require("../services/sellerService");

const packageRequestPatchSchema = z.object({
  payment_confirmed: z.boolean().optional(),
  service_assigned: z.boolean().optional(),
  assigned_business_id: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(1200).optional().nullable(),
});

const publicSignupBaseSchema = z.object({
  contact_name: z.string().trim().min(2).max(160),
  company_name: z.string().trim().min(2).max(180).optional().nullable(),
  nit: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(7).max(40),
  website: z.string().trim().max(220).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(220).optional().nullable(),
  password: z.string().min(8).max(120),
  password_confirm: z.string().min(8).max(120),
  terms_accepted: z.boolean().refine((value) => value === true, "Debes aceptar los terminos y condiciones."),
  privacy_accepted: z.boolean().refine((value) => value === true, "Debes aceptar la politica de privacidad."),
  legal_version: z.string().trim().max(40).default("2026-06-16"),
  sales_advisor_code: z.string().trim().max(40).optional().nullable(),
}).refine((body) => body.password === body.password_confirm, {
  message: "La confirmacion de clave no coincide.",
  path: ["password_confirm"],
});

const portalSignupSchema = publicSignupBaseSchema.extend({
  plan_code: z.string().trim().min(2).max(40),
  billing_cycle: z.literal("monthly").default("monthly"),
});

function requireMarketAdmin(user) {
  if (!["ADMIN_MARKET_GAMES", "ADMIN"].includes(user.role)) {
    throw forbidden("Only Sales Machine admins can perform this action.");
  }
}

function slugify(value) {
  return String(value || "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "cliente";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDocument(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function assertUniqueSignupIdentity(client, body) {
  const email = normalizeEmail(body.email);
  const documentId = normalizeDocument(body.nit);
  if (!email || !documentId) {
    throw badRequest("Email y documento de facturacion son obligatorios.");
  }

  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`signup-email:${email}`]);
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`signup-document:${documentId}`]);

  const existingUser = await client.query(
    `select id, is_active
     from app_users
     where lower(email) = $1
     limit 1`,
    [email]
  );
  if (existingUser.rowCount) {
    throw badRequest("Ya existe un usuario registrado con este correo electronico. Inicia sesion o usa otro correo.");
  }

  const existingBusiness = await client.query(
    `select id, name
     from businesses
     where regexp_replace(lower(coalesce(settings->>'nit', '')), '[^a-z0-9]', '', 'g') = $1
     limit 1`,
    [documentId]
  );
  if (existingBusiness.rowCount) {
    throw badRequest("Ya existe una empresa registrada con este documento o NIT. Inicia sesion o contacta soporte para recuperar el acceso.");
  }
}

async function uniqueBusinessSlug(client, baseValue) {
  const base = slugify(baseValue);
  for (let index = 0; index < 8; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const candidate = `${base}${suffix}`;
    const existing = await client.query("select id from businesses where slug = $1", [candidate]);
    if (!existing.rowCount) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function signupSettings(body, type) {
  return {
    nit: body.nit,
    contact_name: body.contact_name,
    contact_email: body.email,
    phone: body.phone,
    website: body.website || "",
    city: body.city || "",
    address: body.address || "",
    signup_type: type,
    billing_cycle: body.billing_cycle || "monthly",
    account_document_type: body.company_name ? "NIT" : "CEDULA",
    legal_acceptance: {
      terms_accepted: body.terms_accepted,
      privacy_accepted: body.privacy_accepted,
      legal_version: body.legal_version || "2026-06-16",
      accepted_at: new Date().toISOString(),
    },
  };
}

function publicSignupResponse({ business, user, order = null, plan = null }) {
  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      plan_code: business.plan_code,
      subscription_status: business.subscription_status,
      is_active: business.is_active,
    },
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
    },
    order,
    plan,
  };
}

async function listPackageOffers(_req, res, next) {
  try {
    res.json({
      packages: [],
      ticket_purchase_policy: {
        public_sales_enabled: false,
        message: "Para recargar tickets, inicia sesion y elige el paquete desde tu cuenta.",
      },
      pricing: {
        display_currency: "COP",
        payment_currency: "COP",
      },
    });
  } catch (error) {
    next(error);
  }
}

async function listPublicSubscriptionPlans(_req, res, next) {
  try {
    const plans = listPlans();
    const publicPlanCodes = [PLAN_CODES.STARTER, PLAN_CODES.GROWTH, PLAN_CODES.PRO];
    res.json({
      prepaid_plan: null,
      portal_base_plan: null,
      plans: plans.filter((plan) => publicPlanCodes.includes(plan.code) && plan.public_signup_available !== false && !plan.testing_plan),
      base_access_packages: [],
      legacy_prepaid_reference: [],
      subscriber_packages: [],
      ticket_purchase_policy: {
        public_sales_enabled: false,
        message: "Para recargar tickets, inicia sesion y elige el paquete desde tu cuenta.",
      },
      pricing: {
        display_currency: "COP",
        payment_currency: "COP",
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createPackageRequest(req, res, next) {
  try {
    throw badRequest("La compra publica de tickets esta deshabilitada. Primero activa un plan mensual y luego recarga tickets dentro del portal.");
  } catch (error) {
    next(error);
  }
}

async function createPrepaidSignup(req, res, next) {
  try {
    throw badRequest("La activacion publica por tickets esta deshabilitada. Elige un plan mensual para activar Qori.");
  } catch (error) {
    next(error);
  }
}

async function createPortalSignup(req, res, next) {
  try {
    const body = validate(portalSignupSchema, req.body);
    const planCode = normalizePlanCode(body.plan_code);
    const plan = listPlans().find((item) => item.code === planCode && item.category === "subscription" && item.monthly_price_cop && item.public_signup_available !== false);
    if (!plan) {
      throw badRequest("Selecciona un plan mensual valido para el portal.");
    }

    const result = await withTransaction(async (client) => {
      await assertUniqueSignupIdentity(client, body);

      const companyName = body.company_name || body.contact_name;
      const slug = await uniqueBusinessSlug(client, companyName);
      const passwordHash = await bcrypt.hash(body.password, 12);
      const businessResult = await client.query(
        `insert into businesses (name, slug, settings, plan_code, subscription_status, is_active)
         values ($1, $2, $3::jsonb, $4, 'PENDING_PAYMENT', false)
         returning *`,
        [companyName, slug, JSON.stringify(signupSettings(body, "portal_subscription")), plan.code]
      );
      const business = businessResult.rows[0];
      const userResult = await client.query(
        `insert into app_users (business_id, email, password_hash, full_name, role, is_active)
         values ($1, $2, $3, $4, 'BUSINESS_OWNER', false)
         returning id, business_id, email, full_name, role, is_active`,
        [business.id, body.email, passwordHash, body.contact_name]
      );

      const user = userResult.rows[0];
      const order = await createPortalSignupCheckout(client, {
        business_id: business.id,
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        plan_code: plan.code,
        billing_cycle: body.billing_cycle,
        sales_advisor_code: body.sales_advisor_code || null,
      });

      await createSignupAttribution(client, {
        purchase_order_id: order.id,
        client_business_id: business.id,
        sales_advisor_code: body.sales_advisor_code || null,
        plan_code: plan.code,
        billing_cycle: body.billing_cycle,
        expected_revenue_cop: order.price_cop,
      });

      return { business, user, plan, order };
    });

    res.status(201).json(publicSignupResponse(result));
  } catch (error) {
    next(error);
  }
}

async function listPackageRequests(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const result = await query(
      `select r.*, b.name as assigned_business_name, u.full_name as assigned_by_name
       from package_sales_requests r
       left join businesses b on b.id = r.assigned_business_id
       left join app_users u on u.id = r.assigned_by_user_id
       order by r.created_at desc
       limit 120`
    );
    res.json({ requests: result.rows });
  } catch (error) {
    next(error);
  }
}

async function patchPackageRequest(req, res, next) {
  try {
    requireMarketAdmin(req.user);
    const body = validate(packageRequestPatchSchema, req.body);
    const existing = await query("select * from package_sales_requests where id = $1", [req.params.id]);
    if (!existing.rowCount) {
      throw notFound("Solicitud de paquete no encontrada.");
    }

    if (body.assigned_business_id) {
      const business = await query("select id from businesses where id = $1", [body.assigned_business_id]);
      if (!business.rowCount || !canAccessBusiness(req.user, body.assigned_business_id)) {
        throw badRequest("Cliente asignado no valido.");
      }
    }

    const current = existing.rows[0];
    const nextServiceAssigned = body.service_assigned === undefined
      ? current.service_assigned
      : body.service_assigned;
    const assignedAt = nextServiceAssigned && !current.assigned_at ? new Date().toISOString() : current.assigned_at;

    const result = await query(
      `update package_sales_requests
       set payment_confirmed = $2,
           service_assigned = $3,
           assigned_business_id = $4,
           assigned_by_user_id = case when $3 then $5 else assigned_by_user_id end,
           assigned_at = $6,
           notes = $7,
           updated_at = now()
       where id = $1
       returning *`,
      [
        req.params.id,
        body.payment_confirmed === undefined ? current.payment_confirmed : body.payment_confirmed,
        nextServiceAssigned,
        body.assigned_business_id === undefined ? current.assigned_business_id : body.assigned_business_id,
        req.user.id,
        assignedAt,
        body.notes === undefined ? current.notes : body.notes,
      ]
    );

    res.json({ request: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPackageOffers,
  listPublicSubscriptionPlans,
  createPackageRequest,
  createPrepaidSignup,
  createPortalSignup,
  listPackageRequests,
  patchPackageRequest,
};

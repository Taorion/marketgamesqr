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
const { advisorById, assignPaidSignup } = require("../services/commercialAdvisorService");

const packageRequestPatchSchema = z.object({
  payment_confirmed: z.boolean().optional(),
  service_assigned: z.boolean().optional(),
  assigned_business_id: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(1200).optional().nullable(),
});

const {publicSignupBaseSchema,assertUniqueSignupIdentity,uniqueBusinessSlug,signupSettings}=require("../services/signupIdentityService");

const portalSignupSchema = publicSignupBaseSchema.extend({
  plan_code: z.string().trim().min(2).max(40),
  billing_cycle: z.literal("monthly").default("monthly"),
});

function requireMarketAdmin(user) {
  if (!["ADMIN_MARKET_GAMES", "ADMIN", "QORI_SUPERADMIN"].includes(user.role)) {
    throw forbidden("Only Sales Machine admins can perform this action.");
  }
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
    const publicPlanCodes = [PLAN_CODES.DESPEGA, PLAN_CODES.STARTER, PLAN_CODES.GROWTH, PLAN_CODES.PRO];
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
    if (body.sales_advisor_code && body.commercial_advisor_id) throw badRequest("Selecciona un solo asesor para la inscripción.");
    const planCode = normalizePlanCode(body.plan_code);
    const plan = listPlans().find((item) => item.code === planCode && item.category === "subscription" && item.monthly_price_cop && item.public_signup_available !== false);
    if (!plan) {
      throw badRequest("Selecciona un plan mensual valido para el portal.");
    }

    const result = await withTransaction(async (client) => {
      const commercialAdvisor = body.commercial_advisor_id ? await advisorById(body.commercial_advisor_id, client) : null;
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

      if (commercialAdvisor) await assignPaidSignup(client, commercialAdvisor, business.id, order.id);
      else await createSignupAttribution(client, {
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

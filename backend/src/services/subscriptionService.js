const { query } = require("../config/db");
const { forbidden, badRequest, notFound } = require("../utils/http");
const { canAccessBusiness } = require("../middleware/auth");

const PLAN_CODES = {
  PREPAID_QR: "PREPAID_QR",
  STARTER: "STARTER",
  GROWTH: "GROWTH",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
};

const unlimited = null;

const PLAN_PRICING_NOTES = {
  STARTER: {
    comparable_prepaid_package: "QR500",
    prepaid_reference_cop: 615400,
    portal_access_fee_cop: 84000,
    pricing_note: "Precio mensual armado sobre el paquete prepago x500, con una prima moderada por portal, dashboard, usuarios y exportacion controlada.",
  },
  GROWTH: {
    comparable_prepaid_package: "QR2000",
    prepaid_reference_cop: 1800000,
    portal_access_fee_cop: 199000,
    pricing_note: "Precio mensual armado sobre el paquete prepago x2000, con prima por analitica completa, afiliados, sucursales y mas exportaciones.",
  },
  PRO: {
    comparable_prepaid_package: "QR5000",
    prepaid_reference_cop: 3073900,
    portal_access_fee_cop: 426100,
    pricing_note: "Precio mensual armado sobre el paquete prepago x5000 y un bloque adicional de 1000 QR, con prima por API, multiusuario y limites altos.",
  },
};

const PLAN_CATALOG = {
  [PLAN_CODES.PREPAID_QR]: {
    code: PLAN_CODES.PREPAID_QR,
    name: "QR Prepago",
    category: "prepaid",
    monthly_price_cop: null,
    price_label: "Compra por paquete",
    billing_period: "prepaid",
    portal_value_cop: 0,
    best_for: "Negocios que solo necesitan validar beneficios QR en tienda.",
    access_summary: "Acceso al QR Validator y a recargas prepago. Sin portal de analitica.",
    pricing_note: "Compra QR por demanda. No incluye portal, dashboard, campanas, afiliados ni descarga de leads.",
    included: [
      "QR Validator para escanear y redimir beneficios",
      "Compra de paquetes QR prepago",
      "Generador simple y paquetes descargables de QR",
      "Un usuario propietario y un validador",
    ],
    not_included: [
      "Portal de dashboard y analitica",
      "Gestion avanzada de campanas",
      "Exportacion de leads",
      "Afiliados, sedes multiples, API y marca blanca",
    ],
    qr_monthly_included: 0,
    features: {
      qr_validator: true,
      qr_prepaid_purchase: true,
      qr_simple_generator: true,
      qr_batch_generator: true,
      template_games: true,
      portal_access: false,
      dashboard_basic: false,
      dashboard_full: false,
      leads_view: false,
      leads_export: false,
      campaign_reports: false,
      affiliates: false,
      multi_branch: false,
      automations: false,
      api_access: false,
      white_label: false,
    },
    limits: {
      users: 1,
      validators: 1,
      branches: 1,
      active_campaigns: 1,
      monthly_qr_included: 0,
      lead_export_rows_month: 0,
      lead_exports_month: 0,
      affiliates: 0,
      history_days: 7,
    },
  },
  [PLAN_CODES.STARTER]: {
    code: PLAN_CODES.STARTER,
    name: "Portal Starter",
    category: "subscription",
    monthly_price_cop: 699400,
    price_label: "$699.400 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.STARTER.portal_access_fee_cop,
    comparable_prepaid_package: PLAN_PRICING_NOTES.STARTER.comparable_prepaid_package,
    prepaid_reference_cop: PLAN_PRICING_NOTES.STARTER.prepaid_reference_cop,
    best_for: "Primer portal para negocios que ya quieren ver leads y resultados.",
    access_summary: "Portal basico con dashboard, campanas sencillas, leads y reportes.",
    pricing_note: PLAN_PRICING_NOTES.STARTER.pricing_note,
    included: [
      "Todo lo del QR Validator prepago",
      "Portal con dashboard basico",
      "Hasta 2 campanas activas",
      "Vista de leads y 1 exportacion mensual",
      "500 QR incluidos cada mes",
    ],
    not_included: [
      "Afiliados y fidelizacion",
      "Multiples sedes",
      "Automatizaciones, API y marca blanca",
    ],
    qr_monthly_included: 500,
    features: {
      qr_validator: true,
      qr_prepaid_purchase: true,
      qr_simple_generator: true,
      qr_batch_generator: true,
      template_games: true,
      portal_access: true,
      dashboard_basic: true,
      dashboard_full: false,
      leads_view: true,
      leads_export: true,
      campaign_reports: true,
      affiliates: false,
      multi_branch: false,
      automations: false,
      api_access: false,
      white_label: false,
    },
    limits: {
      users: 2,
      validators: 1,
      branches: 1,
      active_campaigns: 2,
      monthly_qr_included: 500,
      lead_export_rows_month: 500,
      lead_exports_month: 1,
      affiliates: 0,
      history_days: 30,
    },
  },
  [PLAN_CODES.GROWTH]: {
    code: PLAN_CODES.GROWTH,
    name: "Portal Growth",
    category: "subscription",
    monthly_price_cop: 1999000,
    price_label: "$1.999.000 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.GROWTH.portal_access_fee_cop,
    comparable_prepaid_package: PLAN_PRICING_NOTES.GROWTH.comparable_prepaid_package,
    prepaid_reference_cop: PLAN_PRICING_NOTES.GROWTH.prepaid_reference_cop,
    best_for: "Negocios con campanas recurrentes, fidelizacion y equipo comercial.",
    access_summary: "Portal completo para operar campanas, sedes, afiliados y reportes.",
    pricing_note: PLAN_PRICING_NOTES.GROWTH.pricing_note,
    included: [
      "Dashboard completo y reportes de campana",
      "2.000 QR incluidos cada mes",
      "Afiliados y carnet QR permanente",
      "Hasta 2 sedes y 6 usuarios",
      "10 exportaciones de leads al mes",
      "Automatizaciones operativas",
    ],
    not_included: [
      "API avanzada",
      "Marca blanca completa",
    ],
    qr_monthly_included: 2000,
    features: {
      qr_validator: true,
      qr_prepaid_purchase: true,
      qr_simple_generator: true,
      qr_batch_generator: true,
      template_games: true,
      portal_access: true,
      dashboard_basic: true,
      dashboard_full: true,
      leads_view: true,
      leads_export: true,
      campaign_reports: true,
      affiliates: true,
      multi_branch: true,
      automations: true,
      api_access: false,
      white_label: false,
    },
    limits: {
      users: 6,
      validators: 4,
      branches: 2,
      active_campaigns: 8,
      monthly_qr_included: 2000,
      lead_export_rows_month: 10000,
      lead_exports_month: 10,
      affiliates: 1000,
      history_days: 365,
    },
  },
  [PLAN_CODES.PRO]: {
    code: PLAN_CODES.PRO,
    name: "Portal Pro Full",
    category: "subscription",
    monthly_price_cop: 3500000,
    price_label: "$3.500.000 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.PRO.portal_access_fee_cop,
    comparable_prepaid_package: PLAN_PRICING_NOTES.PRO.comparable_prepaid_package,
    prepaid_reference_cop: PLAN_PRICING_NOTES.PRO.prepaid_reference_cop,
    best_for: "Empresas que quieren todos los beneficios del portal Market Games.",
    access_summary: "Acceso full: dashboard, campanas, leads, afiliados, sedes, API y marca blanca.",
    pricing_note: PLAN_PRICING_NOTES.PRO.pricing_note,
    included: [
      "Todo lo incluido en Growth",
      "6.000 QR incluidos cada mes",
      "Hasta 20 usuarios y 10 sedes",
      "Exportaciones ilimitadas",
      "API para integraciones",
      "Marca blanca operativa",
    ],
    not_included: [],
    qr_monthly_included: 6000,
    features: {
      qr_validator: true,
      qr_prepaid_purchase: true,
      qr_simple_generator: true,
      qr_batch_generator: true,
      template_games: true,
      portal_access: true,
      dashboard_basic: true,
      dashboard_full: true,
      leads_view: true,
      leads_export: true,
      campaign_reports: true,
      affiliates: true,
      multi_branch: true,
      automations: true,
      api_access: true,
      white_label: true,
    },
    limits: {
      users: 20,
      validators: 12,
      branches: 10,
      active_campaigns: 25,
      monthly_qr_included: 6000,
      lead_export_rows_month: 100000,
      lead_exports_month: unlimited,
      affiliates: 10000,
      history_days: 730,
    },
  },
  [PLAN_CODES.ENTERPRISE]: {
    code: PLAN_CODES.ENTERPRISE,
    name: "Enterprise",
    category: "subscription",
    monthly_price_cop: null,
    price_label: "Cotizacion",
    billing_period: "custom",
    portal_value_cop: null,
    pricing_note: "Plan a medida para volumen alto, marca blanca, API y operacion con multiples sedes o franquicias.",
    qr_monthly_included: unlimited,
    features: {
      qr_validator: true,
      qr_prepaid_purchase: true,
      qr_simple_generator: true,
      qr_batch_generator: true,
      template_games: true,
      portal_access: true,
      dashboard_basic: true,
      dashboard_full: true,
      leads_view: true,
      leads_export: true,
      campaign_reports: true,
      affiliates: true,
      multi_branch: true,
      automations: true,
      api_access: true,
      white_label: true,
    },
    limits: {
      users: unlimited,
      validators: unlimited,
      branches: unlimited,
      active_campaigns: unlimited,
      monthly_qr_included: unlimited,
      lead_export_rows_month: unlimited,
      lead_exports_month: unlimited,
      affiliates: unlimited,
      history_days: unlimited,
    },
  },
};

function normalizePlanCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return PLAN_CATALOG[code] ? code : PLAN_CODES.PREPAID_QR;
}

function planFromBusiness(row = {}) {
  const settingsPlan = row.settings?.subscription?.plan_code || row.settings?.plan_code;
  const code = normalizePlanCode(row.plan_code || settingsPlan);
  const plan = PLAN_CATALOG[code];
  return {
    ...plan,
    status: row.subscription_status || row.settings?.subscription?.status || "ACTIVE",
    started_at: row.subscription_started_at || row.settings?.subscription?.started_at || null,
    current_period_ends_at: row.subscription_current_period_ends_at || row.settings?.subscription?.current_period_ends_at || null,
  };
}

function listPlans() {
  return Object.values(PLAN_CATALOG);
}

async function getBusinessSubscription(businessId) {
  const result = await query(
    `select id, name, slug, settings, plan_code, subscription_status,
            subscription_started_at, subscription_current_period_ends_at
     from businesses
     where id = $1 and is_active = true`,
    [businessId]
  );
  const business = result.rows[0];
  if (!business) {
    throw notFound("Business not found.");
  }
  return {
    business_id: business.id,
    business_name: business.name,
    plan: planFromBusiness(business),
  };
}

async function setBusinessSubscription(businessId, payload) {
  const planCode = normalizePlanCode(payload.plan_code);
  const status = payload.subscription_status || "ACTIVE";
  const result = await query(
    `update businesses
     set plan_code = $2,
         subscription_status = $3,
         subscription_started_at = coalesce(subscription_started_at, now()),
         subscription_current_period_ends_at = $4,
         settings = jsonb_set(
           jsonb_set(coalesce(settings, '{}'::jsonb), '{subscription,plan_code}', to_jsonb($2::text), true),
           '{subscription,status}', to_jsonb($3::text), true
         ),
         updated_at = now()
     where id = $1 and is_active = true
     returning id, name, slug, settings, plan_code, subscription_status,
               subscription_started_at, subscription_current_period_ends_at`,
    [
      businessId,
      planCode,
      status,
      payload.subscription_current_period_ends_at || null,
    ]
  );
  if (!result.rowCount) {
    throw notFound("Business not found.");
  }
  return {
    business_id: result.rows[0].id,
    business_name: result.rows[0].name,
    plan: planFromBusiness(result.rows[0]),
  };
}

async function assertBusinessFeature(user, businessId, feature) {
  if (!canAccessBusiness(user, businessId)) {
    throw forbidden("No puedes acceder a este negocio.");
  }
  if (["ADMIN", "ADMIN_MARKET_GAMES"].includes(user.role)) {
    return getBusinessSubscription(businessId);
  }
  const subscription = await getBusinessSubscription(businessId);
  if (subscription.plan.status !== "ACTIVE") {
    throw forbidden("La suscripcion del negocio no esta activa.");
  }
  if (!subscription.plan.features[feature]) {
    throw forbidden(`Tu plan no incluye: ${feature}.`);
  }
  return subscription;
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

async function monthlyUsage(businessId, eventType) {
  const { start, end } = currentMonthRange();
  const result = await query(
    `select coalesce(sum(quantity), 0)::int as total
     from subscription_usage_events
     where business_id = $1
       and event_type = $2
       and created_at >= $3
       and created_at < $4`,
    [businessId, eventType, start.toISOString(), end.toISOString()]
  );
  return Number(result.rows[0]?.total || 0);
}

async function recordUsage({ business_id, user_id = null, event_type, quantity = 1, metadata = {} }) {
  await query(
    `insert into subscription_usage_events (business_id, user_id, event_type, quantity, metadata)
     values ($1, $2, $3, $4, $5)`,
    [business_id, user_id, event_type, quantity, metadata]
  );
}

function assertLimitValue(limit, current, label) {
  if (limit === null || limit === undefined) {
    return;
  }
  if (Number(current) >= Number(limit)) {
    throw forbidden(`Limite alcanzado para ${label}.`);
  }
}

async function assertMonthlyUsageLimit(businessId, eventType, limit, nextQuantity, label) {
  if (limit === null || limit === undefined) {
    return;
  }
  const used = await monthlyUsage(businessId, eventType);
  if (used + Number(nextQuantity || 1) > Number(limit)) {
    throw forbidden(`Limite mensual alcanzado para ${label}.`);
  }
}

async function assertFeatureForRequest(req, businessId, feature) {
  return assertBusinessFeature(req.user, businessId, feature);
}

async function assertPortalAccess(req) {
  if (!req.user.business_id) {
    throw forbidden("Este usuario no tiene negocio asignado.");
  }
  return assertFeatureForRequest(req, req.user.business_id, "portal_access");
}

async function assertLimitForBusiness(businessId, limitKey, current, label) {
  const subscription = await getBusinessSubscription(businessId);
  assertLimitValue(subscription.plan.limits[limitKey], current, label);
  return subscription;
}

function publicSubscription(subscription) {
  return {
    business_id: subscription.business_id,
    business_name: subscription.business_name,
    plan: subscription.plan,
  };
}

module.exports = {
  PLAN_CODES,
  PLAN_CATALOG,
  listPlans,
  normalizePlanCode,
  planFromBusiness,
  getBusinessSubscription,
  setBusinessSubscription,
  assertBusinessFeature,
  assertFeatureForRequest,
  assertPortalAccess,
  assertLimitForBusiness,
  assertLimitValue,
  assertMonthlyUsageLimit,
  monthlyUsage,
  recordUsage,
  publicSubscription,
};

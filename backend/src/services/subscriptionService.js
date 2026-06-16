const { query } = require("../config/db");
const { env } = require("../config/env");
const { forbidden, badRequest, notFound } = require("../utils/http");
const { canAccessBusiness } = require("../middleware/auth");

const PLAN_CODES = {
  PREPAID_QR: "PREPAID_QR",
  STARTER: "STARTER",
  GROWTH: "GROWTH",
  PRO: "PRO",
  GLOBAL: "GLOBAL",
};

const unlimited = null;
const SUBSCRIPTION_GRACE_DAYS = 15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const USD_TO_COP_REFERENCE = Number(env.usdToCopRate || 4000);
const STARTER_PORTAL_USD = 80;
function roundCop(value) {
  return Math.round(Number(value || 0) / 1000) * 1000;
}

const STARTER_PORTAL_COP = roundCop(STARTER_PORTAL_USD * USD_TO_COP_REFERENCE);
const GROWTH_PORTAL_COP = STARTER_PORTAL_COP * 3;
const PRO_PORTAL_COP = GROWTH_PORTAL_COP * 3;

const PLAN_PRICING_NOTES = {
  STARTER: {
    recommended_start_package: "QR500",
    portal_access_fee_cop: STARTER_PORTAL_COP,
    pricing_note: "Starter cobra solo el uso mensual del portal. Los tickets se compran aparte; si el negocio necesita mas volumen, el ahorro fuerte aparece con paquetes superiores exclusivos para suscriptores.",
  },
  GROWTH: {
    recommended_start_package: "QR1000",
    portal_access_fee_cop: GROWTH_PORTAL_COP,
    pricing_note: "Growth cuesta tres veces Starter y desbloquea operacion real de crecimiento: afiliados hasta 10, mas usuarios, ventas atribuidas, reportes y automatizaciones basicas.",
  },
  PRO: {
    recommended_start_package: "QR2000",
    portal_access_fee_cop: PRO_PORTAL_COP,
    pricing_note: "Pro cuesta tres veces Growth y desbloquea todo el poder del portal: equipos, sedes, API, automatizaciones, reportes ejecutivos, exportaciones y afiliados a escala.",
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
    best_for: "Negocios que solo necesitan validar beneficios QR en tienda con paquetes pequenos.",
    access_summary: "Acceso al QR Validator y solo dos recargas prepago: 50 o 200 tickets. Para comprar mas volumen debe pasar al portal mensual.",
    pricing_note: "Compra QR por demanda solo en paquetes de 50 o 200. No incluye portal, dashboard, campanas, afiliados ni descarga de leads.",
    included: [
      "QR Validator para escanear y redimir beneficios",
      "Compra de paquetes QR prepago x50 o x200",
      "Generador simple y paquetes descargables de QR",
      "Un usuario propietario y un validador",
    ],
    not_included: [
      "Portal de dashboard y analitica",
      "Gestion avanzada de campanas",
      "Exportacion de leads",
      "Afiliados, sedes multiples, API y marca blanca",
      "Paquetes superiores a 200 tickets",
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
    name: "Starter RMS",
    category: "subscription",
    monthly_price_cop: STARTER_PORTAL_COP,
    monthly_price_usd: STARTER_PORTAL_USD,
    usd_to_cop_rate: USD_TO_COP_REFERENCE,
    display_currency: "USD",
    payment_currency: "COP",
    price_label: "USD 80 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.STARTER.portal_access_fee_cop,
    recommended_start_package: PLAN_PRICING_NOTES.STARTER.recommended_start_package,
    best_for: "Negocios que quieren dejar el validador solo y empezar a ver leads, campanas y trazabilidad basica.",
    access_summary: "Portal basico sin tickets incluidos: muestra valor, ordena leads y empuja a Growth para afiliados, automatizaciones y mas control.",
    pricing_note: PLAN_PRICING_NOTES.STARTER.pricing_note,
    included: [
      "Portal RMS basico",
      "Dashboard inicial de QR y leads",
      "Hasta 1 campana activa",
      "Vista de leads sin exportacion masiva",
      "Compra de paquetes QR superiores como suscriptor",
      "Historial de contactos por 30 dias",
    ],
    not_included: [
      "Afiliados y referidos medibles",
      "Exportaciones amplias de leads",
      "Automatizaciones y revenue avanzado",
      "Sedes multiples, API y marca blanca",
    ],
    qr_monthly_included: 0,
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
      leads_export: false,
      campaign_reports: false,
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
      active_campaigns: 1,
      monthly_qr_included: 0,
      lead_export_rows_month: 0,
      lead_exports_month: 0,
      affiliates: 0,
      history_days: 30,
    },
  },
  [PLAN_CODES.GROWTH]: {
    code: PLAN_CODES.GROWTH,
    name: "Growth RMS",
    category: "subscription",
    monthly_price_cop: GROWTH_PORTAL_COP,
    monthly_price_usd: STARTER_PORTAL_USD * 3,
    usd_to_cop_rate: USD_TO_COP_REFERENCE,
    display_currency: "USD",
    payment_currency: "COP",
    price_label: "USD 240 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.GROWTH.portal_access_fee_cop,
    recommended_start_package: PLAN_PRICING_NOTES.GROWTH.recommended_start_package,
    best_for: "Pymes que ya capturan leads y necesitan referidos, ventas atribuidas y seguimiento comercial.",
    access_summary: "Plan intermedio con hasta 10 afiliados, exportaciones controladas, revenue y herramientas que antojan pasar a Pro.",
    pricing_note: PLAN_PRICING_NOTES.GROWTH.pricing_note,
    included: [
      "Todo lo incluido en Starter",
      "RMS Command Center operativo",
      "Hasta 10 afiliados con carnet QR permanente",
      "QR de recomendacion de afiliados con trazabilidad",
      "Sales Tracker con medios de llegada y revenue real",
      "Hasta 2 sedes y 6 usuarios",
      "5 exportaciones de leads al mes",
      "MG Revenue Score y Focus Mode basico",
      "Automatizaciones operativas basicas",
    ],
    not_included: [
      "Afiliados masivos y equipos grandes",
      "API avanzada",
      "Reportes ejecutivos comparativos",
      "Marca blanca completa",
    ],
    qr_monthly_included: 0,
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
      monthly_qr_included: 0,
      lead_export_rows_month: 5000,
      lead_exports_month: 5,
      affiliates: 10,
      history_days: 365,
    },
  },
  [PLAN_CODES.PRO]: {
    code: PLAN_CODES.PRO,
    name: "Pro RMS",
    category: "subscription",
    monthly_price_cop: PRO_PORTAL_COP,
    monthly_price_usd: STARTER_PORTAL_USD * 9,
    usd_to_cop_rate: USD_TO_COP_REFERENCE,
    display_currency: "USD",
    payment_currency: "COP",
    price_label: "USD 720 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.PRO.portal_access_fee_cop,
    recommended_start_package: PLAN_PRICING_NOTES.PRO.recommended_start_package,
    best_for: "Empresas con sedes, equipo comercial, volumen de campanas, referidos e integraciones.",
    access_summary: "Desbloquea todo el poder del portal: equipos, sedes, API, reportes ejecutivos, afiliados masivos y automatizaciones avanzadas.",
    pricing_note: PLAN_PRICING_NOTES.PRO.pricing_note,
    included: [
      "Todo lo incluido en Growth",
      "Hasta 1.000 afiliados con carnet QR permanente",
      "Hasta 20 usuarios y 10 sedes",
      "Exportaciones ilimitadas",
      "Reportes comparativos antes/durante/despues",
      "Segmentacion operativa por campana, canal y sucursal",
      "API para integraciones",
      "Modo presentacion ejecutivo y Data Explorer completo",
      "Branding avanzado en piezas QR y reportes",
    ],
    not_included: [],
    qr_monthly_included: 0,
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
      white_label: false,
      advanced_branding: true,
    },
    limits: {
      users: 20,
      validators: 12,
      branches: 10,
      active_campaigns: 25,
      monthly_qr_included: 0,
      lead_export_rows_month: 100000,
      lead_exports_month: unlimited,
      affiliates: 1000,
      history_days: 730,
    },
  },
  [PLAN_CODES.GLOBAL]: {
    code: PLAN_CODES.GLOBAL,
    name: "MarketGamesQR Global",
    category: "subscription",
    monthly_price_cop: null,
    price_label: "Por cotizacion",
    billing_period: "custom",
    portal_value_cop: null,
    best_for: "Marcas, franquicias, grupos empresariales y operaciones que requieren RMS brandeable, alto volumen y acompanamiento a medida.",
    access_summary: "Plan Global por cotizacion: portal brandeable, volumen superior, afiliados por escala, sedes, integraciones y soporte estrategico.",
    pricing_note: "Plan superior por cotizacion. Se estructura segun volumen de tickets, sedes, usuarios, afiliados, marca, integraciones, soporte, SLA y nivel de acompanamiento.",
    included: [
      "Todo lo incluido en Pro",
      "Paquetes de tickets y volumen por cotizacion",
      "Afiliados por volumen superior a 1.000",
      "Portal brandeable con identidad visual del cliente",
      "Dominio o subdominio personalizado segun alcance",
      "Reportes ejecutivos y tableros por marca, sede, canal y campana",
      "API e integraciones priorizadas con CRM, POS, ecommerce o BI",
      "Onboarding, configuracion y acompanamiento estrategico",
      "SLA, soporte prioritario y gobierno de datos",
      "Roadmap de funcionalidades a medida segun operacion",
    ],
    not_included: [],
    qr_monthly_included: 0,
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
      branded_portal: true,
      custom_domain: true,
      executive_reports: true,
      dedicated_support: true,
    },
    limits: {
      users: unlimited,
      validators: unlimited,
      branches: unlimited,
      active_campaigns: unlimited,
      monthly_qr_included: 0,
      lead_export_rows_month: unlimited,
      lead_exports_month: unlimited,
      affiliates: unlimited,
      history_days: unlimited,
    },
  },
};

function normalizePlanCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (code === "ENTERPRISE") return PLAN_CODES.GLOBAL;
  return PLAN_CATALOG[code] ? code : PLAN_CODES.PREPAID_QR;
}

function dateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
  return new Date(date.getTime() + Number(days || 0) * MS_PER_DAY);
}

function daysUntil(date, now = new Date()) {
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / MS_PER_DAY);
}

function subscriptionLifecycle(row = {}, plan = PLAN_CATALOG[PLAN_CODES.PREPAID_QR]) {
  const now = new Date();
  const rawStatus = row.subscription_status || row.settings?.subscription?.status || "ACTIVE";
  const periodEnd = dateOrNull(row.subscription_current_period_ends_at || row.settings?.subscription?.current_period_ends_at);
  const graceEndsAt = periodEnd ? addDays(periodEnd, SUBSCRIPTION_GRACE_DAYS) : null;
  const autoRenew = {
    enabled: Boolean(row.subscription_auto_renew_enabled),
    status: row.subscription_auto_renew_status || row.settings?.subscription?.auto_renew_status || "DISABLED",
    mercado_pago_preapproval_id: row.mercado_pago_preapproval_id || null,
    checkout_url: row.subscription_auto_renew_checkout_url || null,
    authorized_at: row.subscription_auto_renew_authorized_at || null,
    cancelled_at: row.subscription_auto_renew_cancelled_at || null,
  };

  if (plan.category !== "subscription") {
    return {
      raw_status: rawStatus,
      access_status: "PREPAID",
      access_allowed: Boolean(plan.features?.qr_validator),
      portal_access_allowed: false,
      is_subscription: false,
      official_payment_due_at: null,
      grace_period_days: 0,
      grace_period_ends_at: null,
      days_until_due: null,
      days_overdue: 0,
      days_until_lock: null,
      auto_renew: autoRenew,
    };
  }

  const manuallyInactive = rawStatus !== "ACTIVE";
  let accessStatus = manuallyInactive ? rawStatus : "ACTIVE";
  let portalAccessAllowed = !manuallyInactive;
  let daysOverdue = 0;
  let daysUntilLock = null;

  if (!manuallyInactive && periodEnd) {
    if (now > graceEndsAt) {
      accessStatus = "LOCKED";
      portalAccessAllowed = false;
      daysOverdue = Math.max(0, Math.ceil((now.getTime() - periodEnd.getTime()) / MS_PER_DAY));
      daysUntilLock = 0;
    } else if (now > periodEnd) {
      accessStatus = "GRACE";
      portalAccessAllowed = true;
      daysOverdue = Math.max(1, Math.ceil((now.getTime() - periodEnd.getTime()) / MS_PER_DAY));
      daysUntilLock = Math.max(0, daysUntil(graceEndsAt, now));
    } else {
      daysUntilLock = daysUntil(graceEndsAt, now);
    }
  }

  return {
    raw_status: rawStatus,
    access_status: accessStatus,
    access_allowed: portalAccessAllowed,
    portal_access_allowed: portalAccessAllowed,
    is_subscription: true,
    official_payment_due_at: periodEnd ? periodEnd.toISOString() : null,
    grace_period_days: SUBSCRIPTION_GRACE_DAYS,
    grace_period_ends_at: graceEndsAt ? graceEndsAt.toISOString() : null,
    days_until_due: periodEnd ? Math.max(0, daysUntil(periodEnd, now)) : null,
    days_overdue: daysOverdue,
    days_until_lock: daysUntilLock,
    auto_renew: autoRenew,
  };
}

function planFromBusiness(row = {}) {
  const settingsPlan = row.settings?.subscription?.plan_code || row.settings?.plan_code;
  const code = normalizePlanCode(row.plan_code || settingsPlan);
  const plan = PLAN_CATALOG[code];
  const lifecycle = subscriptionLifecycle(row, plan);
  return {
    ...plan,
    status: row.subscription_status || row.settings?.subscription?.status || "ACTIVE",
    raw_status: lifecycle.raw_status,
    access_status: lifecycle.access_status,
    access_allowed: lifecycle.access_allowed,
    portal_access_allowed: lifecycle.portal_access_allowed,
    started_at: row.subscription_started_at || row.settings?.subscription?.started_at || null,
    current_period_ends_at: row.subscription_current_period_ends_at || row.settings?.subscription?.current_period_ends_at || null,
    official_payment_due_at: lifecycle.official_payment_due_at,
    grace_period_days: lifecycle.grace_period_days,
    grace_period_ends_at: lifecycle.grace_period_ends_at,
    days_until_due: lifecycle.days_until_due,
    days_overdue: lifecycle.days_overdue,
    days_until_lock: lifecycle.days_until_lock,
    auto_renew: lifecycle.auto_renew,
  };
}

function listPlans() {
  return Object.values(PLAN_CATALOG);
}

async function getBusinessSubscription(businessId) {
  const result = await query(
    `select id, name, slug, settings, plan_code, subscription_status,
            subscription_started_at, subscription_current_period_ends_at,
            subscription_auto_renew_enabled, subscription_auto_renew_status,
            mercado_pago_preapproval_id, subscription_auto_renew_checkout_url,
            subscription_auto_renew_authorized_at, subscription_auto_renew_cancelled_at
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
               subscription_started_at, subscription_current_period_ends_at,
               subscription_auto_renew_enabled, subscription_auto_renew_status,
               mercado_pago_preapproval_id, subscription_auto_renew_checkout_url,
               subscription_auto_renew_authorized_at, subscription_auto_renew_cancelled_at`,
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
  if (subscription.plan.raw_status !== "ACTIVE") {
    throw forbidden("La suscripcion del negocio no esta activa.");
  }
  if (!subscription.plan.portal_access_allowed) {
    throw forbidden(`La mensualidad vencio y ya pasaron los ${SUBSCRIPTION_GRACE_DAYS} dias de gracia. Renueva para recuperar el acceso al portal; tus datos se conservan.`);
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
  SUBSCRIPTION_GRACE_DAYS,
  listPlans,
  normalizePlanCode,
  planFromBusiness,
  subscriptionLifecycle,
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

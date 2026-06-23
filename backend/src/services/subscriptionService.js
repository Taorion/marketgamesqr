const { query } = require("../config/db");
const { forbidden, badRequest, notFound } = require("../utils/http");
const { canAccessBusiness } = require("../middleware/auth");

const PLAN_CODES = {
  TICKET_BASE: "TICKET_BASE",
  GROWTH_TEMPORAL: "GROWTH_TEMPORAL",
  PREPAID_QR: "PREPAID_QR",
  STARTER: "STARTER",
  GROWTH: "GROWTH",
  PRO: "PRO",
  GLOBAL: "GLOBAL",
  DEMO_AUTO_3D: "DEMO_AUTO_3D",
};

const unlimited = null;
const SUBSCRIPTION_GRACE_DAYS = 15;
const BASE_PORTAL_MIN_TICKETS = 200;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STARTED_PORTAL_COP = 262500;
const MEDIUM_PORTAL_COP = 1312500;
const PREMIUM_PORTAL_COP = 5250000;
const ANNUAL_BENEFIT_RATE = 0.3;
function roundCop(value) {
  return Math.round(Number(value || 0) / 1000) * 1000;
}

function annualCop(monthlyCop) {
  return roundCop(Number(monthlyCop || 0) * 12 * (1 - ANNUAL_BENEFIT_RATE));
}

const PLAN_PRICING_NOTES = {
  STARTER: {
    recommended_start_package: "QR200",
    portal_access_fee_cop: STARTED_PORTAL_COP,
    pricing_note: "Growth mensual desbloquea mas operacion continua sobre el Portal Base: mas historial, mas exportaciones y herramientas de expansion sin cambiar el saldo de tickets.",
  },
  GROWTH: {
    recommended_start_package: "QR600",
    portal_access_fee_cop: MEDIUM_PORTAL_COP,
    pricing_note: "Premium mensual desbloquea afiliados, referidos, mas activaciones, sedes, usuarios, revenue avanzado y capacidad comercial continua.",
  },
  PRO: {
    recommended_start_package: "QR2000",
    portal_access_fee_cop: PREMIUM_PORTAL_COP,
    pricing_note: "Premium esta pensado para operacion avanzada del portal: T2000 recomendado como saldo inicial, cuatro activaciones mensuales, mas sedes, mas usuarios, Focus Mode, Data Explorer y branding completo.",
  },
};

const PLAN_CATALOG = {
  [PLAN_CODES.TICKET_BASE]: {
    code: PLAN_CODES.TICKET_BASE,
    name: "Portal Base",
    category: "ticket_base",
    monthly_price_cop: null,
    price_label: "Tickets desde T50; Portal desde T200",
    billing_period: "ticket_access",
    portal_value_cop: 0,
    recommended_start_package: "QR200",
    best_for: "Negocios que quieren activar su Portal RMS comprando capacidad operativa, sin mensualidad inicial.",
    access_summary: "Compra tickets desde T50 como saldo operativo. Desde T200 activas dashboard base, QR preventa/postventa, validador, leads, redenciones y Sales Tracker basico.",
    pricing_note: "No pagas mensualidad por mirar un dashboard. Tus tickets son saldo operativo para generar QR, campanas, leads, redenciones y ventas medibles.",
    included: [
      "Portal RMS Base sin mensualidad desde T200",
      "Dashboard base de campana y revenue atribuido",
      "1 campana activa",
      "QR preventa y postventa usando saldo de tickets",
      "Validador integrado dentro del portal",
      "Leads visibles por 30 dias",
      "10 exportaciones de leads al mes",
      "Sales Tracker basico",
      "1 sede y 2 usuarios",
    ],
    not_included: [
      "Afiliados y referidos",
      "Mas de 1 campana activa",
      "Historial de leads mayor a 30 dias",
      "Exportaciones superiores a 10 al mes",
      "Focus Mode, Data Explorer y automatizaciones avanzadas",
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
      leads_export: true,
      campaign_reports: false,
      affiliates: false,
      referrals: false,
      multi_branch: false,
      automations: false,
      api_access: false,
      white_label: false,
      advanced_branding: false,
      campaign_comparison: false,
      focus_mode: false,
      data_explorer: false,
      advanced_reports: false,
      post_sale_automation: false,
    },
    limits: {
      users: 2,
      validators: 1,
      branches: 1,
      active_campaigns: 1,
      monthly_qr_included: 0,
      lead_view_rows: 1000,
      lead_export_rows_month: 10000,
      lead_exports_month: 10,
      metric_exports_month: 0,
      affiliates: 0,
      history_days: 30,
    },
  },
  [PLAN_CODES.GROWTH_TEMPORAL]: {
    code: PLAN_CODES.GROWTH_TEMPORAL,
    name: "Growth Temporal",
    category: "growth_temporal",
    monthly_price_cop: null,
    price_label: "Incluido 3 meses con campana gamificada",
    billing_period: "temporary",
    portal_value_cop: 0,
    recommended_start_package: "QR200",
    best_for: "Negocios que compran T200 o mas y activan una campana gamificada disenada por MarketGamesQR.",
    access_summary: "Prueba Growth durante 3 meses con dashboard completo, embudo, mas historial y mas capacidad operativa. Al vencer vuelve a Portal Base.",
    pricing_note: "Growth temporal no borra datos al vencer; conserva tickets restantes y restringe funciones premium si no hay suscripcion.",
    included: [
      "Todo lo incluido en Portal Base",
      "Dashboard completo temporal",
      "Lectura de embudo y revenue avanzada",
      "Hasta 2 campanas activas",
      "Historial extendido durante 3 meses",
      "20 exportaciones de leads al mes",
      "2 sedes y 4 usuarios",
      "Campana gamificada con reto, score o test",
    ],
    not_included: [
      "Afiliados y referidos continuos",
      "API avanzada",
      "Marca blanca completa",
      "Soporte Global por cotizacion",
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
      affiliates: false,
      referrals: false,
      multi_branch: true,
      automations: false,
      api_access: false,
      white_label: false,
      advanced_branding: false,
      campaign_comparison: true,
      focus_mode: true,
      data_explorer: true,
      advanced_reports: true,
      post_sale_automation: false,
    },
    limits: {
      users: 4,
      validators: 4,
      branches: 2,
      active_campaigns: 2,
      monthly_qr_included: 0,
      lead_export_rows_month: 25000,
      lead_exports_month: 20,
      metric_exports_month: 10,
      affiliates: 0,
      history_days: 90,
    },
  },
  [PLAN_CODES.PREPAID_QR]: {
    code: PLAN_CODES.PREPAID_QR,
    name: "Acceso Legacy",
    category: "prepaid",
    monthly_price_cop: null,
    price_label: "Solo compatibilidad",
    billing_period: "prepaid",
    portal_value_cop: 0,
    best_for: "Clientes legacy que entraron antes del modelo Portal Base por tickets.",
    access_summary: "Acceso heredado mantenido por compatibilidad. Compra T200 o superior para activar Portal Base sin mensualidad.",
    pricing_note: "Plan legacy mantenido por compatibilidad. No se vende como producto separado.",
    included: [
      "Modulo de validacion QR para escanear y redimir beneficios",
      "Compatibilidad con paquetes legacy",
      "Generador simple y paquetes descargables",
      "Visualizacion de los ultimos 50 leads",
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
      lead_view_rows: 50,
      lead_export_rows_month: 0,
      lead_exports_month: 0,
      affiliates: 0,
      history_days: 7,
    },
  },
  [PLAN_CODES.STARTER]: {
    code: PLAN_CODES.STARTER,
    name: "Growth Mensual",
    category: "subscription",
    monthly_price_cop: STARTED_PORTAL_COP,
    annual_price_cop: annualCop(STARTED_PORTAL_COP),
    annual_benefit_percent: 30,
    display_currency: "COP",
    payment_currency: "COP",
    price_label: "COP 262.500 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.STARTER.portal_access_fee_cop,
    recommended_start_package: PLAN_PRICING_NOTES.STARTER.recommended_start_package,
    best_for: "Negocios que ya activaron Portal Base y quieren mas historial, mas exportaciones y una operacion RMS mas ordenada.",
    access_summary: "Plan mensual de expansion inicial: conserva el modelo de tickets como saldo operativo y agrega mas capacidad al portal.",
    pricing_note: PLAN_PRICING_NOTES.STARTER.pricing_note,
    included: [
      "Todo lo incluido en Portal Base",
      "Dashboard ampliado",
      "Analitica de redencion y revenue basico",
      "1 tipo de activacion mensual",
      "Visualizacion ampliada de leads",
      "Mas exportaciones mensuales",
      "Retencion extendida frente al Portal Base",
      "Los tickets quedan como saldo y no vencen con la mensualidad",
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
      referrals: false,
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
      lead_view_rows: 2500,
      lead_export_rows_month: 25000,
      lead_exports_month: 20,
      affiliates: 0,
      history_days: 90,
    },
  },
  [PLAN_CODES.DEMO_AUTO_3D]: {
    code: PLAN_CODES.DEMO_AUTO_3D,
    name: "Demo renovacion 3 dias",
    category: "subscription",
    monthly_price_cop: 1700,
    display_currency: "COP",
    payment_currency: "COP",
    price_label: "COP 1.700 / cada 3 dias",
    billing_period: "3_days",
    billing_frequency: 3,
    billing_frequency_type: "days",
    billing_label: "cada 3 dias",
    testing_plan: true,
    public_signup_available: false,
    portal_value_cop: 1700,
    recommended_start_package: "QR200",
    best_for: "Pruebas controladas de suscripcion automatica de bajo valor.",
    access_summary: "Plan interno de prueba para validar autorizacion de tarjeta, webhook de preapproval y cobros recurrentes cada 3 dias.",
    pricing_note: "Plan demo interno: COP 1.700 por ciclo de 3 dias. No usar como plan comercial.",
    included: [
      "Prueba de cobro automatico con Mercado Pago",
      "Renovacion recurrente cada 3 dias",
      "Valor bajo para validar tarjeta, autorizacion y webhook",
      "Acceso operativo del portal para ambiente de prueba",
    ],
    not_included: [
      "Plan comercial publico",
      "Beneficios de precio o capacidad productiva",
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
      referrals: false,
      multi_branch: false,
      automations: false,
      api_access: false,
      white_label: false,
      demo_billing: true,
    },
    limits: {
      users: 2,
      validators: 1,
      branches: 1,
      active_campaigns: 1,
      monthly_qr_included: 0,
      lead_view_rows: 2500,
      lead_export_rows_month: 25000,
      lead_exports_month: 20,
      affiliates: 0,
      history_days: 90,
    },
  },
  [PLAN_CODES.GROWTH]: {
    code: PLAN_CODES.GROWTH,
    name: "Premium",
    category: "subscription",
    monthly_price_cop: MEDIUM_PORTAL_COP,
    annual_price_cop: annualCop(MEDIUM_PORTAL_COP),
    annual_benefit_percent: 30,
    display_currency: "COP",
    payment_currency: "COP",
    price_label: "COP 1.312.500 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.GROWTH.portal_access_fee_cop,
    recommended_start_package: PLAN_PRICING_NOTES.GROWTH.recommended_start_package,
    best_for: "Empresas que necesitan afiliados, referidos, sedes, varias activaciones y analitica RMS avanzada.",
    access_summary: "Premium mensual con Command Center completo, dos activaciones, afiliados, referidos, sales tracker, sedes, usuarios y reportes avanzados.",
    pricing_note: PLAN_PRICING_NOTES.GROWTH.pricing_note,
    included: [
      "Todo lo incluido en Started",
      "Ingreso RMS y Command Center completo",
      "2 tipos de activacion mensual",
      "Visualizacion de todos los leads",
      "5 exportaciones de leads al mes",
      "5 exportaciones de metricas al mes",
      "400 afiliaciones de clientes para redimir puntos",
      "400 afiliados que puedan referir",
      "Sales Tracker",
      "2 sedes y 4 usuarios",
      "Branding de tickets",
      "Los tickets quedan como saldo y no vencen con la mensualidad",
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
      referrals: true,
      multi_branch: true,
      automations: true,
      api_access: false,
      white_label: false,
    },
    limits: {
      users: 4,
      validators: 4,
      branches: 2,
      active_campaigns: 2,
      monthly_qr_included: 0,
      lead_export_rows_month: 5000,
      lead_exports_month: 5,
      metric_exports_month: 5,
      affiliates: 400,
      history_days: 365,
    },
  },
  [PLAN_CODES.PRO]: {
    code: PLAN_CODES.PRO,
    name: "Premium Legacy",
    category: "subscription",
    monthly_price_cop: PREMIUM_PORTAL_COP,
    annual_price_cop: annualCop(PREMIUM_PORTAL_COP),
    annual_benefit_percent: 30,
    display_currency: "COP",
    payment_currency: "COP",
    price_label: "COP 5.250.000 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.PRO.portal_access_fee_cop,
    recommended_start_package: PLAN_PRICING_NOTES.PRO.recommended_start_package,
    best_for: "Empresas con mayor volumen, equipo comercial, varias sedes, referidos y necesidad de analitica profunda.",
    access_summary: "Plan premium con cuatro activaciones mensuales, 1.000 afiliaciones, 1.000 referidos, cinco sedes, diez usuarios, Focus Mode, Data Explorer y branding de reportes.",
    pricing_note: PLAN_PRICING_NOTES.PRO.pricing_note,
    included: [
      "Todo lo incluido en Medium",
      "4 tipos de activacion mensual",
      "Visualizacion de todos los leads",
      "10 exportaciones de leads al mes",
      "10 exportaciones de metricas al mes",
      "1.000 afiliaciones de clientes para redimir puntos",
      "1.000 afiliados que puedan referir",
      "Sales Tracker",
      "5 sedes y 10 usuarios",
      "Focus Mode con insights",
      "Data Explorer completo",
      "Branding de tickets y reportes",
      "Los tickets quedan como saldo y no vencen con la mensualidad",
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
      referrals: true,
      multi_branch: true,
      automations: true,
      api_access: true,
      white_label: false,
      advanced_branding: true,
    },
    limits: {
      users: 10,
      validators: 10,
      branches: 5,
      active_campaigns: 4,
      monthly_qr_included: 0,
      lead_export_rows_month: 100000,
      lead_exports_month: 10,
      metric_exports_month: 10,
      affiliates: 1000,
      history_days: 730,
    },
  },
  [PLAN_CODES.GLOBAL]: {
    code: PLAN_CODES.GLOBAL,
    name: "Global",
    category: "subscription",
    monthly_price_cop: null,
    price_label: "Por cotizacion",
    billing_period: "custom",
    portal_value_cop: null,
    best_for: "Marcas, franquicias, grupos empresariales y operaciones que requieren RMS brandeable, alto volumen y acompanamiento a medida.",
    access_summary: "Plan Global por cotizacion: portal brandeable, volumen superior, afiliados por escala, sedes, integraciones, APIs y soporte estrategico.",
    pricing_note: "Plan superior por cotizacion. Se estructura segun volumen de tickets, sedes, usuarios, afiliados, marca, integraciones, soporte, SLA y nivel de acompanamiento.",
    included: [
      "Todo lo incluido en Premium",
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
      referrals: true,
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

function isGrowthTemporalActive(row = {}, now = new Date()) {
  const planType = row.plan_type || row.settings?.access?.plan_type;
  const expiresAt = dateOrNull(row.growth_expires_at || row.settings?.access?.growth_expires_at);
  return planType === "growth_temporal" && expiresAt && expiresAt > now;
}

function effectivePlanCode(row = {}) {
  const now = new Date();
  const planType = row.plan_type || row.settings?.access?.plan_type;
  if (isGrowthTemporalActive(row, now)) {
    return PLAN_CODES.GROWTH_TEMPORAL;
  }
  if (planType === "ticket_base" || planType === "growth_temporal") {
    return PLAN_CODES.TICKET_BASE;
  }
  if (planType === "premium_monthly") {
    return normalizePlanCode(row.plan_code || row.settings?.subscription?.plan_code || PLAN_CODES.STARTER);
  }
  const settingsPlan = row.settings?.subscription?.plan_code || row.settings?.plan_code;
  return normalizePlanCode(row.plan_code || settingsPlan);
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
    const portalAccessAllowed = ["ticket_base", "growth_temporal"].includes(plan.category)
      ? (row.portal_status || row.subscription_status || "ACTIVE") === "ACTIVE"
      : false;
    return {
      raw_status: rawStatus,
      access_status: plan.category === "prepaid" ? "PREPAID" : (portalAccessAllowed ? "ACTIVE" : "LOCKED"),
      access_allowed: plan.category === "prepaid" ? Boolean(plan.features?.qr_validator) : portalAccessAllowed,
      portal_access_allowed: portalAccessAllowed,
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
  const code = effectivePlanCode(row);
  const plan = PLAN_CATALOG[code];
  const lifecycle = subscriptionLifecycle(row, plan);
  const growthExpiresAt = row.growth_expires_at || row.settings?.access?.growth_expires_at || null;
  const growthStartedAt = row.growth_started_at || row.settings?.access?.growth_started_at || null;
  return {
    ...plan,
    plan_type: row.plan_type || row.settings?.access?.plan_type || (plan.category === "prepaid" ? "legacy_prepaid" : plan.category),
    portal_status: row.portal_status || row.settings?.access?.portal_status || null,
    status: row.subscription_status || row.settings?.subscription?.status || "ACTIVE",
    raw_status: lifecycle.raw_status,
    access_status: lifecycle.access_status,
    access_allowed: lifecycle.access_allowed,
    portal_access_allowed: lifecycle.portal_access_allowed,
    started_at: row.subscription_started_at || row.settings?.subscription?.started_at || null,
    current_period_ends_at: row.subscription_current_period_ends_at || row.settings?.subscription?.current_period_ends_at || null,
    growth_started_at: growthStartedAt,
    growth_expires_at: growthExpiresAt,
    growth_source: row.growth_source || row.settings?.access?.growth_source || null,
    days_until_growth_expiration: growthExpiresAt ? Math.max(0, daysUntil(dateOrNull(growthExpiresAt))) : null,
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
    `select id, name, slug, settings, plan_code, plan_type, portal_status,
            portal_activated_at, growth_started_at, growth_expires_at, growth_source,
            subscription_status,
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
         plan_type = case when $2 in ('STARTER', 'GROWTH', 'PRO', 'GLOBAL') then 'premium_monthly' else plan_type end,
         portal_status = 'ACTIVE',
         subscription_status = $3,
         subscription_started_at = coalesce(subscription_started_at, now()),
         subscription_current_period_ends_at = $4,
         settings = jsonb_set(
           jsonb_set(coalesce(settings, '{}'::jsonb), '{subscription,plan_code}', to_jsonb($2::text), true),
           '{subscription,status}', to_jsonb($3::text), true
         ),
         updated_at = now()
     where id = $1 and is_active = true
     returning id, name, slug, settings, plan_code, plan_type, portal_status,
               portal_activated_at, growth_started_at, growth_expires_at, growth_source,
               subscription_status,
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

function featurePrompts(plan = {}) {
  return {
    portal_locked: {
      title: "Activa tu Portal RMS",
      message: "Compra tickets desde T50. Desde T200 activas tu Portal RMS sin mensualidad.",
      cta: "Ver paquetes",
      url: "/paquetes/?mode=base",
    },
    tickets_empty: {
      title: "Tickets insuficientes",
      message: "No tienes tickets suficientes para esta accion. Compra tickets para seguir generando QR y campanas medibles.",
      cta: "Comprar tickets",
      url: "/paquetes/",
    },
    affiliates: {
      title: "Afiliados y referidos son Premium",
      message: "Activa afiliados y referidos para medir voz a voz con ventas reales.",
      cta: "Ver Premium",
      url: "/paquetes/?mode=portal&plan=GROWTH",
    },
    active_campaigns: {
      title: "Mas campanas simultaneas",
      message: `Tu ${plan.name || "portal"} incluye ${plan.limits?.active_campaigns || 1} campana activa. Para crear mas campanas simultaneas, activa Growth o Premium.`,
      cta: "Ver planes",
      url: "/paquetes/?mode=portal",
    },
    lead_retention: {
      title: "Historial extendido",
      message: "Tus leads de mas de 30 dias estan protegidos en Growth/Premium. Activa un plan para consultar historial extendido.",
      cta: "Desbloquear historial",
      url: "/paquetes/?mode=portal&plan=STARTER",
    },
    exports: {
      title: "Exportaciones agotadas",
      message: "Ya usaste el limite de exportaciones de este mes. Desbloquea mas exportaciones con Growth o Premium.",
      cta: "Ver planes",
      url: "/paquetes/?mode=portal",
    },
    branches: {
      title: "Sedes adicionales",
      message: "Desbloquea sedes para comparar rendimiento por punto de venta.",
      cta: "Ver Premium",
      url: "/paquetes/?mode=portal&plan=GROWTH",
    },
    advanced_analytics: {
      title: "Analisis avanzado",
      message: "Desbloquea analisis avanzado para explorar cada dato, comparar campanas y entender mejor tu revenue.",
      cta: "Ver Premium",
      url: "/paquetes/?mode=portal&plan=GROWTH",
    },
    gamified_campaign: {
      title: "Campana gamificada",
      message: "Activa una campana gamificada y prueba Growth durante 3 meses.",
      cta: "Activar campana gamificada",
      url: "/paquetes/?service=gamified-campaign",
    },
  };
}

async function getBusinessAccess(businessId) {
  const subscription = await getBusinessSubscription(businessId);
  const plan = subscription.plan;
  const [account, activeCampaigns, users, branches, leadExports] = await Promise.all([
    query("select * from business_qr_credit_accounts where business_id = $1", [businessId]),
    query("select count(*)::int as total from campaigns where business_id = $1 and status = 'ACTIVE'", [businessId]),
    query("select count(*)::int as total from app_users where business_id = $1 and is_active = true", [businessId]),
    query("select count(*)::int as total from branches where business_id = $1 and is_active = true", [businessId]),
    monthlyUsage(businessId, "lead_export"),
  ]);
  const ticketAccount = account.rows[0] || {};
  const ticketBalance = Number(ticketAccount.qr_balance || 0);
  const activeCampaignLimit = plan.limits?.active_campaigns ?? null;
  const userLimit = plan.limits?.users ?? null;
  const branchLimit = plan.limits?.branches ?? null;
  const exportLimitMonthly = plan.limits?.lead_exports_month ?? null;
  const leadRetentionDays = plan.limits?.history_days ?? null;
  const features = plan.features || {};
  const growthExpiresAt = dateOrNull(plan.growth_expires_at);

  return {
    business_id: businessId,
    business_name: subscription.business_name,
    planCode: plan.code,
    planType: plan.plan_type,
    planName: plan.name,
    portalStatus: plan.portal_access_allowed ? "ACTIVE" : "LOCKED",
    ticketBalance,
    ticketAccount: account.rows[0] || null,
    activeCampaignLimit,
    activeCampaignCount: Number(activeCampaigns.rows[0]?.total || 0),
    userLimit,
    userCount: Number(users.rows[0]?.total || 0),
    branchLimit,
    branchCount: Number(branches.rows[0]?.total || 0),
    exportLimitMonthly,
    exportCountMonth: Number(leadExports || 0),
    leadRetentionDays,
    canUseAffiliates: Boolean(features.affiliates),
    canUseReferrals: Boolean(features.referrals || features.affiliates),
    canUseAdvancedReports: Boolean(features.advanced_reports || features.campaign_reports),
    canUseCampaignComparison: Boolean(features.campaign_comparison || features.dashboard_full),
    canUseFocusMode: Boolean(features.focus_mode || features.dashboard_full),
    canUseDataExplorer: Boolean(features.data_explorer || features.dashboard_full),
    canUseAutomation: Boolean(features.automations),
    canUseBranding: Boolean(features.advanced_branding || features.white_label),
    canUsePostSaleAutomation: Boolean(features.post_sale_automation || features.automations),
    canUseValidator: Boolean(features.qr_validator),
    canGeneratePreSaleQR: Boolean(features.qr_batch_generator || features.qr_simple_generator),
    canGeneratePostSaleQR: Boolean(features.qr_simple_generator),
    growthStartedAt: plan.growth_started_at || null,
    growthExpiresAt: plan.growth_expires_at || null,
    daysUntilGrowthExpiration: growthExpiresAt ? Math.max(0, daysUntil(growthExpiresAt)) : null,
    prompts: featurePrompts(plan),
    subscription,
  };
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
  BASE_PORTAL_MIN_TICKETS,
  SUBSCRIPTION_GRACE_DAYS,
  getBusinessAccess,
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

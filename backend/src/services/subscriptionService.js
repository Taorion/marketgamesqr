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
const PUBLIC_UPGRADE_ORDER = [PLAN_CODES.STARTER, PLAN_CODES.GROWTH, PLAN_CODES.PRO, PLAN_CODES.GLOBAL];
const BASE_PORTAL_MIN_TICKETS = 200;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STARTED_PORTAL_COP = 1000000;
const MEDIUM_PORTAL_COP = 2500000;
const PREMIUM_PORTAL_COP = 4500000;
const ANNUAL_BENEFIT_RATE = 0.3;
const STARTER_INTERACTIVE_ACTIVATION_TYPES = ["TRIVIA_QUIZ", "OPEN_QUESTION"];
const MEDIUM_INTERACTIVE_ACTIVATION_TYPES = [
  "TRIVIA_QUIZ",
  "OPEN_QUESTION",
  "FLEX_SURVEY",
  "QUICK_VOTE",
  "QUICK_DIAGNOSTIC",
  "BENEFIT_SELECTOR",
  "SPIN_DISCOVER",
  "SCRATCH_WIN",
  "TAP_REVEAL",
  "CHOOSE_DOOR",
  "DISCOUNT_THERMOMETER",
  "LUCK_METER",
  "REWARD_TRAFFIC_LIGHT",
  "HIDDEN_CODE",
  "SPACE_SHOOTER",
  "BREAKOUT",
  "SNAKE",
  "CATCH_PRIZE",
  "MEMORY_PAIRS",
  "FAST_TAP",
  "MINI_MAZE",
  "WHACK_A_MOLE",
  "DODGE_RUNNER",
  "BALLOON_POP",
  "ROULETTE_SPIN",
  "TOUCH_CATCH",
  "TRUE_FALSE",
  "ORDER_OPTIONS",
  "CONNECTORS",
  "BATTLESHIP_COORDS",
  "STORE_CHECKIN",
  "CHECKOUT_REWARD",
  "TOUCH_SATISFACTION",
  "PREFERENCE_WALL",
  "NEXT_PURCHASE_PICKER",
  "INVOICE_UNLOCK",
  "PURCHASE_AMOUNT_ACTIVATION",
  "PURCHASED_PRODUCT_ACTIVATION",
  "TIME_BASED_ACTIVATION",
  "BRANCH_BASED_ACTIVATION",
  "REFERRAL_CHALLENGE",
  "RECOMMENDATION_CHAIN",
  "GROUP_BENEFIT",
  "DOUBLE_PASS",
  "BRAND_ALLIANCE",
  "WAITLIST",
  "PRESALE_BENEFIT",
];
function roundCop(value) {
  return Math.round(Number(value || 0) / 1000) * 1000;
}

function annualCop(monthlyCop) {
  return roundCop(Number(monthlyCop || 0) * 12 * (1 - ANNUAL_BENEFIT_RATE));
}

const PLAN_PRICING_NOTES = {
  STARTER: {
    recommended_start_package: null,
    portal_access_fee_cop: STARTED_PORTAL_COP,
    pricing_note: "Started activa el acceso mensual al portal para operar campanas, leads, agenda y beneficios desde una cuenta privada.",
  },
  GROWTH: {
    recommended_start_package: null,
    portal_access_fee_cop: MEDIUM_PORTAL_COP,
    pricing_note: "Medium amplia la operacion comercial con mas campanas, contactos, medicion y asistencia de lanzamiento.",
  },
  PRO: {
    recommended_start_package: null,
    portal_access_fee_cop: PREMIUM_PORTAL_COP,
    pricing_note: "Premium habilita todo el portal MarketGamesQR sin limites de uso ni cantidad en las capacidades operativas.",
  },
};

const PLAN_CATALOG = {
  [PLAN_CODES.TICKET_BASE]: {
    code: PLAN_CODES.TICKET_BASE,
    name: "Portal Base por Tickets",
    category: "ticket_base",
    monthly_price_cop: null,
    price_label: "Tickets desde T50; Portal desde T200",
    billing_period: "ticket_access",
    portal_value_cop: 0,
    recommended_start_package: "QR200",
    best_for: "Negocios que quieren probar el circuito completo QR -> lead -> redencion -> venta sin pagar mensualidad inicial.",
    access_summary: "Desde T200 activas una muestra operativa del Portal RMS: QR con tickets, una campana, validador, leads recientes, Sales Tracker basico y senales de lo que desbloquea Growth.",
    pricing_note: "Portal Base prueba valor, no reemplaza la operacion mensual. Cuando necesites mas historial, mas campanas, exportaciones o referidos, el siguiente paso natural es Growth.",
    included: [
      "Portal RMS Base sin mensualidad desde T200",
      "QR preventa, postventa y beneficios usando saldo de tickets",
      "1 campana activa como muestra comercial",
      "Activaciones interactivas basicas con QR unico por beneficio",
      "Validador integrado para redimir en punto fisico",
      "Leads recientes visibles por 30 dias",
      "2 exportaciones de muestra al mes",
      "Sales Tracker basico para asociar redencion con venta",
      "1 sede, 2 usuarios y 1 validador",
      "Vista teaser de Growth con modulos bloqueados y llamadas a upgrade",
    ],
    not_included: [
      "Mas de 1 campana activa",
      "Historial mayor a 30 dias",
      "Exportacion amplia de bases",
      "Afiliados y referidos operativos",
      "Command Center completo, Focus Mode y Data Explorer",
      "Automatizaciones, sedes multiples, API y marca blanca",
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
      lead_view_rows: 120,
      lead_export_rows_month: 500,
      lead_exports_month: 2,
      metric_exports_month: 0,
      affiliates: 0,
      history_days: 30,
      activation_types_month: 1,
      active_interactive_activations: 1,
      allowed_interactive_activation_types: STARTER_INTERACTIVE_ACTIVATION_TYPES,
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
    name: "Started",
    category: "subscription",
    monthly_price_cop: STARTED_PORTAL_COP,
    annual_price_cop: annualCop(STARTED_PORTAL_COP),
    annual_benefit_percent: 30,
    display_currency: "COP",
    payment_currency: "COP",
    price_label: "COP 1.000.000 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.STARTER.portal_access_fee_cop,
    recommended_start_package: PLAN_PRICING_NOTES.STARTER.recommended_start_package,
    best_for: "Negocios que quieren empezar a capturar leads, crear campanas y validar beneficios desde un portal comercial gamificado.",
    access_summary: "Plan de entrada para negocios que quieren empezar a capturar leads, crear campanas y validar beneficios desde un portal comercial gamificado.",
    pricing_note: PLAN_PRICING_NOTES.STARTER.pricing_note,
    included: [
      "Acceso al portal",
      "Graficas de redencion",
      "Visualizacion de ultimos 50 leads",
      "2 exportaciones mensuales",
      "Validador de tickets",
      "Creacion de campanas",
      "Ver capacidad completa",
      "1 campana activa en linea",
      "1 sede",
      "1 usuario",
      "Gaming center: trivia y pregunta abierta sin historial de tickets",
      "Agenda para programar tareas",
      "10 tickets de cortesia en primera suscripcion",
    ],
    not_included: [
      "Gaming center con historial de tickets",
      "Branding en ticket",
      "Gift cards",
      "Afiliados ilimitados + Carnet digital",
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
      campaign_reports: true,
      affiliates: false,
      referrals: false,
      multi_branch: false,
      automations: false,
      api_access: false,
      white_label: false,
      campaign_comparison: false,
      focus_mode: false,
      data_explorer: false,
      advanced_reports: false,
      post_sale_automation: false,
      agenda: true,
      sales_tracker: false,
      ticket_branding: false,
      gift_cards: false,
      journey: false,
      predictive_analytics: false,
    },
    limits: {
      users: 1,
      validators: 1,
      branches: 1,
      active_campaigns: 1,
      monthly_qr_included: 0,
      welcome_courtesy_tickets: 10,
      lead_view_rows: 50,
      lead_export_rows_month: 50,
      lead_exports_month: 2,
      metric_exports_month: 0,
      affiliates: 0,
      history_days: 30,
      activation_types_month: 1,
      active_interactive_activations: 1,
      allowed_interactive_activation_types: STARTER_INTERACTIVE_ACTIVATION_TYPES,
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
    name: "Medium",
    category: "subscription",
    monthly_price_cop: MEDIUM_PORTAL_COP,
    annual_price_cop: annualCop(MEDIUM_PORTAL_COP),
    annual_benefit_percent: 30,
    display_currency: "COP",
    payment_currency: "COP",
    price_label: "COP 2.500.000 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.GROWTH.portal_access_fee_cop,
    recommended_start_package: PLAN_PRICING_NOTES.GROWTH.recommended_start_package,
    recommended: true,
    best_for: "Negocios que quieren operar varias campanas, organizar contactos, medir resultados y activar seguimiento comercial con mas estructura.",
    access_summary: "Plan para negocios que quieren operar varias campanas, organizar contactos, medir resultados y activar seguimiento comercial con mas estructura.",
    pricing_note: PLAN_PRICING_NOTES.GROWTH.pricing_note,
    included: [
      "Acceso al portal",
      "Graficas de redencion",
      "Visualizacion de ultimos 100 leads",
      "10 exportaciones mensuales",
      "Validador de tickets",
      "Creacion de campanas",
      "Ver capacidad completa",
      "3 campanas activas en linea",
      "2 sedes",
      "2 usuarios",
      "Gaming center con historial de tickets",
      "Calculadora de campanas",
      "Dashboard completo",
      "Programa de fidelizacion hasta 50 contactos",
      "Branding en ticket",
      "Gift cards: 10 unidades al mes",
      "Directorio de contactos",
      "Inventario de obsequios hasta 4 productos diferentes",
      "Sales tracker",
      "Asistencia de marketing al lanzamiento de MarketGamesQR",
      "Agenda para programar tareas",
      "10 afiliados",
      "10 tickets de cortesia en primera suscripcion",
    ],
    not_included: [
      "Campanas ilimitadas",
      "Afiliados con carnet digital",
      "Programa de premios",
      "Analitica predictiva",
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
      automations: false,
      api_access: false,
      white_label: false,
      advanced_branding: false,
      campaign_comparison: true,
      focus_mode: false,
      data_explorer: false,
      advanced_reports: false,
      post_sale_automation: false,
      executive_reports_preview: false,
      agenda: true,
      sales_tracker: true,
      ticket_branding: true,
      gift_cards: true,
      contact_directory: true,
      gift_inventory: true,
      journey: false,
      predictive_analytics: false,
    },
    limits: {
      users: 2,
      validators: 2,
      branches: 2,
      active_campaigns: 3,
      monthly_qr_included: 0,
      welcome_courtesy_tickets: 10,
      lead_view_rows: 100,
      lead_export_rows_month: 100,
      lead_exports_month: 10,
      metric_exports_month: 10,
      affiliates: 10,
      loyalty_contacts: 50,
      gift_cards_month: 10,
      gift_inventory_products: 4,
      history_days: 365,
      activation_types_month: 5,
      active_interactive_activations: 3,
      executive_reports_month: 0,
      allowed_interactive_activation_types: MEDIUM_INTERACTIVE_ACTIVATION_TYPES,
    },
  },
  [PLAN_CODES.PRO]: {
    code: PLAN_CODES.PRO,
    name: "Premium",
    category: "subscription",
    monthly_price_cop: PREMIUM_PORTAL_COP,
    annual_price_cop: annualCop(PREMIUM_PORTAL_COP),
    annual_benefit_percent: 30,
    display_currency: "COP",
    payment_currency: "COP",
    price_label: "COP 4.500.000 / mes",
    billing_period: "monthly",
    portal_value_cop: PLAN_PRICING_NOTES.PRO.portal_access_fee_cop,
    recommended_start_package: PLAN_PRICING_NOTES.PRO.recommended_start_package,
    best_for: "Marcas que quieren usar todo MarketGamesQR sin limites de uso ni cantidad en campanas, sedes, usuarios, contactos, activaciones, agenda, afiliados y analitica.",
    access_summary: "Plan para marcas que quieren todo el portal habilitado, sin limites de uso ni cantidad en las capacidades operativas.",
    pricing_note: PLAN_PRICING_NOTES.PRO.pricing_note,
    included: [
      "Acceso al portal",
      "Graficas de redencion",
      "Visualizacion ilimitada de leads",
      "Exportaciones ilimitadas",
      "Validador de tickets",
      "Creacion de campanas en linea ilimitadas",
      "Sedes ilimitadas",
      "Usuarios ilimitados",
      "Gaming center con historial de tickets",
      "Acceso a todas las activaciones disponibles",
      "Calculadora de campanas",
      "Dashboard completo con insights",
      "Programa de fidelizacion ilimitado",
      "Branding en ticket",
      "Gift cards ilimitadas",
      "Directorio de contactos",
      "Inventario de obsequios con productos ilimitados",
      "Sales tracker",
      "Asistencia de marketing al lanzamiento de MarketGamesQR 2 veces al mes",
      "Tareas + Customer Journey",
      "Contactos con tickets pendientes por redimir",
      "Afiliados ilimitados + Carnet digital",
      "Programa de premios",
      "Analitica de prediccion de redencion de campanas",
      "10 tickets de cortesia en primera suscripcion",
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
      advanced_branding: true,
      campaign_comparison: true,
      focus_mode: true,
      data_explorer: true,
      advanced_reports: true,
      post_sale_automation: true,
      executive_reports: true,
      dedicated_support: true,
      agenda: true,
      sales_tracker: true,
      ticket_branding: true,
      gift_cards: true,
      contact_directory: true,
      gift_inventory: true,
      journey: true,
      digital_affiliate_card: true,
      prize_program: true,
      predictive_analytics: true,
    },
    limits: {
      users: unlimited,
      validators: unlimited,
      branches: unlimited,
      active_campaigns: unlimited,
      monthly_qr_included: 0,
      welcome_courtesy_tickets: 10,
      lead_view_rows: unlimited,
      lead_export_rows_month: unlimited,
      lead_exports_month: unlimited,
      metric_exports_month: unlimited,
      affiliates: unlimited,
      loyalty_contacts: unlimited,
      gift_cards_month: unlimited,
      gift_inventory_products: unlimited,
      history_days: unlimited,
      activation_types_month: unlimited,
      active_interactive_activations: unlimited,
      executive_reports_month: unlimited,
      allowed_interactive_activation_types: unlimited,
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
      allowed_interactive_activation_types: unlimited,
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

function internalUnlimitedPlan(row = {}, plan = PLAN_CATALOG[PLAN_CODES.PREPAID_QR]) {
  const isInternalAccount = Boolean(row.settings?.internal_account || row.settings?.access?.source === "internal_seed");
  if (!isInternalAccount) return plan;
  return {
    ...plan,
    name: plan.code === PLAN_CODES.PRO ? "Enterprise Operado Interno" : plan.name,
    access_summary: "Cuenta interna MarketGames QR con acceso completo para operar clientes propios sin bloqueos de plan.",
    limits: {
      ...(plan.limits || {}),
      users: unlimited,
      validators: unlimited,
      branches: unlimited,
      active_campaigns: unlimited,
      lead_view_rows: unlimited,
      lead_export_rows_month: unlimited,
      lead_exports_month: unlimited,
      metric_exports_month: unlimited,
      affiliates: unlimited,
      history_days: unlimited,
      activation_types_month: unlimited,
      active_interactive_activations: unlimited,
      executive_reports_month: unlimited,
      allowed_interactive_activation_types: unlimited,
    },
  };
}

function planFromBusiness(row = {}) {
  const code = effectivePlanCode(row);
  const plan = internalUnlimitedPlan(row, PLAN_CATALOG[code]);
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
    lifetime_access: Boolean(row.settings?.subscription?.lifetime_access || row.settings?.access?.lifetime_access),
    monthly_payment_required: row.settings?.subscription?.monthly_payment_required !== false,
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

function upgradeOrderIndex(planCode) {
  const index = PUBLIC_UPGRADE_ORDER.indexOf(normalizePlanCode(planCode));
  return index >= 0 ? index : -1;
}

function suggestedPlanForFeature(currentPlan = {}, feature = "") {
  const start = Math.max(0, upgradeOrderIndex(currentPlan.code) + 1);
  return PUBLIC_UPGRADE_ORDER.slice(start).find((code) => PLAN_CATALOG[code]?.features?.[feature]) || PLAN_CODES.GLOBAL;
}

function suggestedPlanForLimit(currentPlan = {}, limitKey = "", current = 0) {
  const start = Math.max(0, upgradeOrderIndex(currentPlan.code) + 1);
  return PUBLIC_UPGRADE_ORDER.slice(start).find((code) => {
    const value = PLAN_CATALOG[code]?.limits?.[limitKey];
    return value === null || value === undefined || Number(value) >= Number(current || 0);
  }) || PLAN_CODES.GLOBAL;
}

function interactiveActivationTypeAllowed(plan = {}, activationType = "") {
  const allowedTypes = plan.limits?.allowed_interactive_activation_types;
  if (allowedTypes === null || allowedTypes === undefined) return true;
  return Array.isArray(allowedTypes) && allowedTypes.includes(activationType);
}

function suggestedPlanForInteractiveActivation(currentPlan = {}, activationType = "") {
  const start = Math.max(0, upgradeOrderIndex(currentPlan.code) + 1);
  return PUBLIC_UPGRADE_ORDER.slice(start).find((code) => interactiveActivationTypeAllowed(PLAN_CATALOG[code], activationType)) || PLAN_CODES.GLOBAL;
}

function planGateDetails(plan = {}, payload = {}) {
  return {
    plan_gate: {
      reason: payload.reason || "plan_gate",
      current_plan_code: plan.code || null,
      current_plan_name: plan.name || null,
      suggested_plan_code: payload.suggested_plan_code || null,
      feature: payload.feature || null,
      limit_key: payload.limit_key || null,
      label: payload.label || null,
      current: payload.current ?? null,
      limit: payload.limit ?? null,
    },
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
    throw forbidden(
      "La suscripcion del negocio no esta activa.",
      planGateDetails(subscription.plan, {
        reason: "subscription_inactive",
        feature: "portal_access",
        label: "portal",
        suggested_plan_code: PLAN_CODES.STARTER,
      })
    );
  }
  if (!subscription.plan.portal_access_allowed) {
    throw forbidden(
      `La mensualidad vencio y ya pasaron los ${SUBSCRIPTION_GRACE_DAYS} dias de gracia. Renueva para recuperar el acceso al portal; tus datos se conservan.`,
      planGateDetails(subscription.plan, {
        reason: "portal_locked",
        feature: "portal_access",
        label: "portal",
        suggested_plan_code: subscription.plan.code || PLAN_CODES.STARTER,
      })
    );
  }
  if (!subscription.plan.features[feature]) {
    throw forbidden(
      `Tu plan no incluye: ${feature}.`,
      planGateDetails(subscription.plan, {
        reason: "feature_locked",
        feature,
        label: feature,
        suggested_plan_code: suggestedPlanForFeature(subscription.plan, feature),
      })
    );
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

async function assertMonthlyUsageLimit(businessId, eventType, limit, nextQuantity, label, options = {}) {
  if (limit === null || limit === undefined) {
    return;
  }
  const used = await monthlyUsage(businessId, eventType);
  if (used + Number(nextQuantity || 1) > Number(limit)) {
    const projected = used + Number(nextQuantity || 1);
    throw forbidden(
      `Limite mensual alcanzado para ${label}.`,
      planGateDetails(options.plan || {}, {
        reason: "monthly_limit_reached",
        limit_key: options.limit_key || eventType,
        label,
        current: used,
        limit,
        suggested_plan_code: suggestedPlanForLimit(options.plan || {}, options.limit_key || eventType, projected),
      })
    );
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
  const limit = subscription.plan.limits[limitKey];
  if (limit !== null && limit !== undefined && Number(current) >= Number(limit)) {
    throw forbidden(
      `Limite alcanzado para ${label}.`,
      planGateDetails(subscription.plan, {
        reason: "limit_reached",
        limit_key: limitKey,
        label,
        current,
        limit,
        suggested_plan_code: suggestedPlanForLimit(subscription.plan, limitKey, Number(current) + 1),
      })
    );
  }
  return subscription;
}

async function assertInteractiveActivationTypeForBusiness(businessId, activationType) {
  const subscription = await getBusinessSubscription(businessId);
  if (!interactiveActivationTypeAllowed(subscription.plan, activationType)) {
    throw forbidden(
      "Tu plan actual no incluye este tipo de activacion.",
      planGateDetails(subscription.plan, {
        reason: "activation_type_locked",
        feature: "qr_batch_generator",
        limit_key: "allowed_interactive_activation_types",
        label: "activaciones de Gaming Center",
        current: activationType,
        suggested_plan_code: suggestedPlanForInteractiveActivation(subscription.plan, activationType),
      })
    );
  }
  return subscription;
}

function featurePrompts(plan = {}) {
  const isEnterpriseOrGlobal = ["PRO", "GLOBAL"].includes(plan.code);
  return {
    portal_locked: {
      title: "Activa tu Portal RMS",
      message: "Activa un plan mensual para usar MarketGamesQR desde el portal privado de tu negocio.",
      cta: "Ver planes",
      url: "/paquetes/",
    },
    tickets_empty: {
      title: "Tickets insuficientes",
      message: "No tienes tickets suficientes para esta accion. Recarga tickets desde tu cuenta del portal si tu suscripcion esta activa.",
      cta: "Ir al portal",
      url: "/empresa/",
    },
    affiliates: {
      title: "Afiliados y referidos por plan",
      message: isEnterpriseOrGlobal
        ? "Tu plan ya incluye afiliados y referidos a escala. Usa el limite disponible para operar voz a voz medible."
        : plan.features?.affiliates
        ? `Tu ${plan.name || "plan"} incluye afiliados limitados. Premium desbloquea afiliados ilimitados y carnet digital.`
        : "Medium incluye 10 afiliados; Premium desbloquea afiliados ilimitados y carnet digital.",
      cta: "Ver Premium",
      url: "/paquetes/?plan=PRO",
    },
    active_campaigns: {
      title: "Mas campanas simultaneas",
      message: isEnterpriseOrGlobal
        ? `Tu ${plan.name || "portal"} incluye ${plan.limits?.active_campaigns || "campanas por cotizacion"} campana(s) activa(s).`
        : `Tu ${plan.name || "portal"} incluye ${plan.limits?.active_campaigns || 1} campana(s) activa(s). Para operar mas acciones en paralelo, sube al siguiente plan.`,
      cta: "Ver planes",
      url: "/paquetes/",
    },
    lead_retention: {
      title: "Historial extendido",
      message: "Tu plan muestra una ventana limitada. Growth y Premium desbloquean mas historial para recuperar clientes y comparar campanas.",
      cta: "Desbloquear historial",
      url: "/paquetes/?plan=STARTER",
    },
    exports: {
      title: "Exportaciones agotadas",
      message: "Ya usaste el limite de exportaciones de este mes. El siguiente plan aumenta exportaciones, filas y profundidad del historial.",
      cta: "Ver planes",
      url: "/paquetes/",
    },
    branches: {
      title: "Sedes adicionales",
      message: "Tu plan actual limita las sedes. Premium y Enterprise permiten comparar rendimiento por punto fisico.",
      cta: "Ver Premium",
      url: "/paquetes/?plan=GROWTH",
    },
    advanced_analytics: {
      title: "Analisis avanzado",
      message: "Ya tienes senales basicas. Premium desbloquea Command Center completo, Focus Mode y Data Explorer.",
      cta: "Ver Premium",
      url: "/paquetes/?plan=GROWTH",
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
    canUseAdvancedReports: Boolean(features.advanced_reports),
    canUseCampaignComparison: Boolean(features.campaign_comparison),
    canUseFocusMode: Boolean(features.focus_mode),
    canUseDataExplorer: Boolean(features.data_explorer),
    canUseAutomation: Boolean(features.automations),
    canUseBranding: Boolean(features.advanced_branding || features.ticket_branding || features.white_label),
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
  assertInteractiveActivationTypeForBusiness,
  assertPortalAccess,
  assertLimitForBusiness,
  assertLimitValue,
  assertMonthlyUsageLimit,
  monthlyUsage,
  recordUsage,
  publicSubscription,
};

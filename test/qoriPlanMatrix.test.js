const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const { listPlans } = require("../backend/src/services/subscriptionService");

const plans = new Map(listPlans().map((plan) => [plan.code, plan]));

test("la matriz canonica aplica los tickets iniciales y limites de Planes.csv", () => {
  const expected = {
    DESPEGA: { welcome_courtesy_tickets: 25, contacts: 0, products: 0, acquisition_channels: 0, showcases: 0, redemptions: 0, storage_bytes: 0, affiliates: 0, sellers: 0 },
    STARTER: { welcome_courtesy_tickets: 50, contacts: 100, products: 20, acquisition_channels: 2, showcases: 1, redemptions: 100, storage_bytes: 1024 ** 3, affiliates: 10, sellers: 0 },
    GROWTH: { welcome_courtesy_tickets: 100, contacts: 1000, products: 50, acquisition_channels: 5, showcases: 5, redemptions: 1000, storage_bytes: 5 * 1024 ** 3, affiliates: 50, sellers: 0 },
    PRO: { welcome_courtesy_tickets: 200, contacts: 5000, products: 300, acquisition_channels: 10, showcases: 15, redemptions: 5000, storage_bytes: 15 * 1024 ** 3, affiliates: 100, sellers: 10 },
  };

  for (const [code, limits] of Object.entries(expected)) {
    const plan = plans.get(code);
    assert.ok(plan, `falta el plan ${code}`);
    assert.equal(plan.limits.welcome_courtesy_tickets, limits.welcome_courtesy_tickets);
    assert.equal(plan.limits.contacts, limits.contacts);
    assert.equal(plan.limits.gift_inventory_products, limits.products);
    assert.equal(plan.limits.acquisition_channels, limits.acquisition_channels);
    assert.equal(plan.limits.showcases, limits.showcases);
    assert.equal(plan.limits.redemptions, limits.redemptions);
    assert.equal(plan.limits.storage_bytes, limits.storage_bytes);
    assert.equal(plan.limits.affiliates, limits.affiliates);
    assert.equal(plan.limits.sellers, limits.sellers);
  }

  assert.equal(plans.get("GROWTH").limits.communication_emails_month, 3000);
  assert.equal(plans.get("GROWTH").limits.communication_emails_day, 100);
  assert.equal(plans.get("PRO").limits.communication_emails_month, 50000);
  assert.equal(plans.get("PRO").limits.communication_emails_day, null);
  assert.equal(plans.get("STARTER").limits.gift_cards_month, 10);
  assert.equal(plans.get("GROWTH").limits.gift_cards_month, 25);
  assert.equal(plans.get("PRO").limits.gift_cards_month, 250);
  assert.equal(plans.get("GROWTH").limits.users, 2);
  assert.equal(plans.get("PRO").limits.users, 5);
  assert.equal(plans.get("PRO").limits.branches, 3);
});

test("cada modulo se abre desde el plan indicado por la matriz", () => {
  const featureAt = (feature) => ["DESPEGA", "STARTER", "GROWTH", "PRO"].filter((code) => plans.get(code).features[feature]);

  assert.deepEqual(featureAt("interactive_activations"), ["DESPEGA", "STARTER", "GROWTH", "PRO"]);
  assert.deepEqual(featureAt("qr_validator"), ["DESPEGA", "STARTER", "GROWTH", "PRO"]);
  for (const feature of ["revenue_center", "rms_core", "redemptions", "brand_assets", "products", "contact_directory", "acquisition_channels", "recycling", "showcase", "sales_tracker", "gift_cards", "affiliates"]) {
    assert.deepEqual(featureAt(feature), ["STARTER", "GROWTH", "PRO"], feature);
  }
  for (const feature of ["rms_intelligence", "email_marketing", "rms_quality_control", "campaigns", "communications", "agenda", "team_management"]) {
    assert.deepEqual(featureAt(feature), ["GROWTH", "PRO"], feature);
  }
  for (const feature of ["competitive_radar", "ranking", "customer_valuation", "sellers", "multi_branch"]) {
    assert.deepEqual(featureAt(feature), ["PRO"], feature);
  }
});

test("Activar Qori publica el comparativo completo y los cuatro saldos iniciales", () => {
  const html = read("paquetes/index.html");
  const app = read("paquetes/js/app.js");
  for (const label of ["Cuenta y perfil", "Atracción interactiva", "Centro de Revenue", "Recolector", "Quality Control 2", "Valorización de clientes", "Radar competitivo", "Afiliados"]) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /Tickets iniciales<\/th><td>25<\/td><td>50<\/td><td>100<\/td><td>200<\/td>/);
  assert.match(html, /qori-plan-matrix-v3-20260928/);
  assert.match(app, /25 tickets iniciales/);
  assert.match(app, /50 tickets iniciales/);
  assert.match(app, /100 tickets iniciales/);
  assert.match(app, /200 tickets iniciales/);
});

test("las restricciones se aplican en API, portal y altas con cupo", () => {
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  const portal = read("empresa/js/app.js");
  const catalogs = read("backend/src/controllers/smartCatalogController.js");
  const communications = read("backend/src/services/businessCommunicationService.js");
  const payments = read("backend/src/services/mercadoPagoService.js");

  assert.match(routes, /router\.use\("\/campaigns", requireCampaigns\)/);
  assert.match(routes, /router\.use\("\/inventory", requireProducts\)/);
  assert.match(routes, /router\.use\(\["\/channels"[\s\S]*requireAcquisitionChannels\)/);
  assert.match(routes, /router\.use\("\/branches", requireBranches\)/);
  assert.match(portal, /dashboard: "revenue_center"/);
  assert.match(portal, /"rms-machine": "rms_core"/);
  assert.match(portal, /function portalDefaultViewForPlan\(\)/);
  assert.match(catalogs, /assertLimitForBusiness\(businessId, "showcases"/);
  assert.match(communications, /assertMonthlyUsageLimit[\s\S]*communication_emails_month/);
  assert.match(communications, /assertDailyUsageLimit[\s\S]*communication_emails_day/);
  assert.match(payments, /welcomeTickets[\s\S]*quantity: welcomeTickets/);
});

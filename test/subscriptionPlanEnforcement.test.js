const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const { listPlans } = require("../backend/src/services/subscriptionService");

function publicPlan(code) {
  return listPlans().find((plan) => plan.code === code);
}

test("el catalogo canonico gobierna precio, capacidad y oferta publica", () => {
  const starter = publicPlan("STARTER");
  const growth = publicPlan("GROWTH");
  const pro = publicPlan("PRO");
  const fallback = read("paquetes/js/app.js");
  const packagesHtml = read("paquetes/index.html");

  assert.equal(starter.monthly_price_cop, 229000);
  assert.equal(growth.monthly_price_cop, 899000);
  assert.equal(pro.monthly_price_cop, 1990000);
  assert.equal(growth.limits.branches, 2);
  assert.equal(pro.limits.branches, null);
  assert.equal(pro.limits.users, null);
  assert.match(fallback, /code: "PRO"[\s\S]+monthly_price_cop: 1990000/);
  assert.match(fallback, /2 sedes \/ 2 usuarios/);
  assert.match(fallback, /Sedes y usuarios ilimitados/);
  assert.match(packagesHtml, /"highPrice": "1990000"/);
  assert.match(packagesHtml, /\$1\.990\.000/);
  assert.doesNotMatch(`${fallback}\n${packagesHtml}`, /1899000|1\.899\.000/);
});

test("el pago aprobado solo activa el mismo plan canonico de la orden", () => {
  const service = read("backend/src/services/mercadoPagoService.js");
  assert.match(service, /const planCode = signup\.plan_code \|\| order\.package_code/);
  assert.match(service, /item\.code === planCode[\s\S]+item\.category === "subscription"/);
  assert.match(service, /order\.package_code !== planCode/);
  assert.match(service, /La orden aprobada no coincide con un plan canonico activable/);
});

test("las rutas operativas quedan detras de suscripcion y features reales", () => {
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  assert.ok(routes.indexOf("router.use(requirePortalAccess);") < routes.indexOf('router.get("/contacts/feed"'));
  assert.match(routes, /contacts\/manual", requireContactDirectory/);
  assert.match(routes, /contacts\/feed\/export\.csv", requireLeadExport/);
  assert.match(routes, /rms-machine\/journeys", requireJourney/);
  assert.match(routes, /rms-machine\/intelligence\/patterns", requirePredictiveAnalytics/);
  assert.match(routes, /rms-machine\/post-sale-actions", shortBusinessCache, rmsPostSaleActions/);
});

test("Escala puede emitir Gift Cards con limite mensual canonico", () => {
  const routes = read("backend/src/routes/rewardPassRoutes.js");
  const service = read("backend/src/services/rewardPassService.js");
  const portal = read("empresa/js/app.js");
  assert.match(routes, /requireBusinessFeature\("gift_cards"\)/);
  assert.doesNotMatch(routes, /requireBusinessFeature\("prize_program"\)/);
  assert.match(service, /subscription\.plan\.limits\?\.gift_cards_month/);
  assert.match(service, /date_trunc\('month', now\(\)\)/);
  assert.match(portal, /"reward-passes": "gift_cards"/);
});

test("Escala separa el cupo de fidelizacion del cupo de afiliados", () => {
  const controller = read("backend/src/controllers/affiliateController.js");
  const rmsController = read("backend/src/controllers/rmsMachineController.js");
  const portal = read("empresa/js/app.js");
  assert.match(controller, /body\.card_metadata\?\.source === "rms_activation_2"/);
  assert.match(controller, /isLoyaltyContact \? "loyalty_contacts" : "affiliates"/);
  assert.match(controller, /card_metadata->>'source'/);
  assert.match(rmsController, /refineryPath === "LOYALTY"[\s\S]+"affiliates"/);
  assert.match(rmsController, /body\.action_type === "REFERRAL"[\s\S]+"referrals"/);
  assert.match(portal, /requiredFeature = draft\.refinery_path === "REFERRAL"[\s\S]+"affiliates"/);
});

test("las activaciones respetan tipo, cupo mensual y cupo activo", () => {
  const routes = read("backend/src/routes/interactiveActivationRoutes.js");
  const controller = read("backend/src/controllers/interactiveActivationController.js");
  assert.match(routes, /router\.use\(requirePortalAccess\)/);
  assert.match(routes, /requireBusinessFeature\("qr_batch_generator"\)/);
  assert.match(controller, /assertInteractiveActivationTypeForBusiness/);
  assert.match(controller, /activation_types_month/);
  assert.match(controller, /active_interactive_activations/);
  assert.match(controller, /interactive_activation_created/);
});

test("Crece recibe dashboard basico sin datos reservados al dashboard completo", () => {
  const controller = read("backend/src/controllers/dashboardController.js");
  assert.match(controller, /hasFullDashboard = Boolean\(subscription\.plan\.features\?\.dashboard_full\)/);
  assert.match(controller, /dashboard_level: hasFullDashboard \? "full" : "basic"/);
  assert.match(controller, /campaign_performance: hasFullDashboard \? campaignPerformance\.rows : \[\]/);
  assert.match(controller, /answers: hasFullDashboard \? answerRows\.slice\(0, 100\) : \[\]/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Despega is a public monthly subscription backed by Mercado Pago", () => {
  const subscriptions = read("backend/src/services/subscriptionService.js");
  const controller = read("backend/src/controllers/packageSalesController.js");
  const page = read("paquetes/js/app.js");
  const html = read("paquetes/index.html");

  assert.match(subscriptions, /DESPEGA:\s*"DESPEGA"/);
  assert.match(subscriptions, /\[PLAN_CODES\.DESPEGA\]:\s*\{[\s\S]*category:\s*"subscription"[\s\S]*monthly_price_cop:\s*DESPEGA_PORTAL_COP/);
  assert.doesNotMatch(subscriptions, /annual_price_cop|annual_benefit_percent|ANNUAL_BENEFIT_RATE|annualCop/);
  assert.match(controller, /publicPlanCodes = \[PLAN_CODES\.DESPEGA, PLAN_CODES\.STARTER/);
  assert.doesNotMatch(page, /async function submitEntryRequest/);
  assert.doesNotMatch(page, /window\.location\.href = `https:\/\/wa\.me/);
  assert.match(page, /fetchJson\("\/api\/public\/signup\/portal"/);
  assert.match(page, /window\.location\.href = checkoutUrl/);
  assert.match(html, /qori-planes-mensuales-v2-20260928/);
});

test("all public plan checkouts are monthly-only", () => {
  const controller = read("backend/src/controllers/packageSalesController.js");
  const payments = read("backend/src/services/mercadoPagoService.js");
  const page = read("paquetes/js/app.js");

  assert.match(controller, /billing_cycle:\s*z\.literal\("monthly"\)/);
  assert.match(page, /billing_cycle:\s*"monthly"/);
  assert.doesNotMatch(page, /annual_price_cop/);
  assert.match(payments, /payload\.billing_cycle && payload\.billing_cycle !== "monthly"/);
  assert.match(payments, /const billingCycle = "monthly"/);
  assert.match(payments, /const subscriptionType = "portal_monthly_subscription"/);
  assert.match(payments, /const recurringFrequency = planBillingFrequency\(plan\)/);
});

test("Despega participates in the public upgrade and activation contracts", () => {
  const subscriptions = read("backend/src/services/subscriptionService.js");
  assert.match(subscriptions, /PUBLIC_UPGRADE_ORDER = \[PLAN_CODES\.DESPEGA, PLAN_CODES\.STARTER/);
  assert.match(subscriptions, /\('DESPEGA', 'STARTER', 'GROWTH', 'PRO', 'GLOBAL'\)/);
  assert.match(subscriptions, /welcome_courtesy_tickets:\s*10/);
});

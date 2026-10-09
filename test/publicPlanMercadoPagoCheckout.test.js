const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const { env } = require("../backend/src/config/env");
const { createPortalSignupCheckout } = require("../backend/src/services/mercadoPagoService");

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
  assert.match(html, /qori-plan-matrix-v1-20260928/);
  assert.match(html, /Tarjetas, saldo Mercado Pago y PSE/);
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
  assert.match(payments, /activation_flow:\s*"checkout_preference"/);
  assert.match(payments, /requires_card_enrollment:\s*false/);
});

test("public plan checkout uses Checkout Pro without excluding PSE", () => {
  const payments = read("backend/src/services/mercadoPagoService.js");
  const preferenceFactory = payments.match(/async function createPublicPlanPaymentPreference[\s\S]*?\r?\n}\r?\n/)[0];

  assert.match(payments, /createPublicPlanPaymentPreference/);
  assert.match(payments, /checkout_mode:\s*"public_plan_initial_payment"/);
  assert.doesNotMatch(preferenceFactory, /payer(_email)?:/);
  assert.doesNotMatch(preferenceFactory, /\/preapproval/);
  assert.doesNotMatch(payments, /excluded_payment_types:[\s\S]*?bank_transfer/);
  assert.doesNotMatch(payments, /excluded_payment_methods:[\s\S]*?\{ id: "pse" \}/);
});

for (const [planCode, priceCop] of [["DESPEGA", 75000], ["STARTER", 229000], ["GROWTH", 999000], ["PRO", 1999000]]) {
test(`${planCode} sends the canonical COP price to Checkout Pro with PSE available`, async () => {
  const originalFetch = global.fetch;
  const originalAccessToken = env.mercadoPagoAccessToken;
  const originalWebhookSecret = env.mercadoPagoWebhookSecret;
  const requests = [];
  const order = {
    id: "order-1",
    business_id: "business-1",
    created_by_user_id: "user-1",
    package_code: planCode,
    package_size: 0,
    package_title: `${planCode} - suscripcion mensualidad`,
    price_cop: priceCop,
    currency: "COP",
    status: "PENDING",
    external_reference: "signup-1",
    metadata: { source: "public_portal_signup" },
  };
  const client = {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      if (/insert into qr_credit_purchase_orders/.test(sql)) {
        assert.equal(params[2], planCode);
        assert.equal(params[5], priceCop);
        assert.equal(JSON.parse(params[6]).signup.plan_price_cop, priceCop);
        return { rows: [order] };
      }
      return {
        rows: [{
          ...order,
          mercado_pago_preference_id: params[1],
          checkout_url: params[2],
          sandbox_checkout_url: params[3],
          payment_payload: params[4],
          metadata: {
            ...order.metadata,
            signup: { activation_flow: "checkout_preference", requires_card_enrollment: false },
          },
        }],
      };
    },
  };

  env.mercadoPagoAccessToken = "test-token";
  env.mercadoPagoWebhookSecret = "test-webhook-secret";
  global.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return {
      ok: true,
      async json() {
        return { id: "preference-1", init_point: "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=preference-1" };
      },
    };
  };

  try {
    const result = await createPortalSignupCheckout(client, {
      business_id: "business-1",
      user_id: "user-1",
      email: "buyer@example.com",
      full_name: "Buyer",
      plan_code: planCode,
      billing_cycle: "monthly",
    });

    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /\/checkout\/preferences$/);
    assert.equal("payer" in requests[0].body, false);
    assert.equal(requests[0].body.currency_id, undefined);
    assert.equal(requests[0].body.items[0].currency_id, "COP");
    assert.equal(requests[0].body.items[0].unit_price, priceCop);
    assert.equal(requests[0].body.items[0].quantity, 1);
    assert.equal(result.price_cop, priceCop);
    assert.equal(requests[0].body.external_reference, "signup-1");
    assert.deepEqual(requests[0].body.payment_methods.excluded_payment_methods, [{ id: "efecty" }]);
    assert.deepEqual(requests[0].body.payment_methods.excluded_payment_types, [{ id: "ticket" }, { id: "atm" }]);
    assert.equal(result.checkout_url, "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=preference-1");
  } finally {
    global.fetch = originalFetch;
    env.mercadoPagoAccessToken = originalAccessToken;
    env.mercadoPagoWebhookSecret = originalWebhookSecret;
  }
});
}

test("Despega participates in the public upgrade and activation contracts", () => {
  const subscriptions = read("backend/src/services/subscriptionService.js");
  assert.match(subscriptions, /PUBLIC_UPGRADE_ORDER = \[PLAN_CODES\.DESPEGA, PLAN_CODES\.STARTER/);
  assert.match(subscriptions, /\('DESPEGA', 'STARTER', 'GROWTH', 'PRO', 'GLOBAL'\)/);
  assert.match(subscriptions, /PLAN_CODES\.DESPEGA[\s\S]*welcome_courtesy_tickets:\s*25/);
  assert.match(subscriptions, /PLAN_CODES\.STARTER[\s\S]*welcome_courtesy_tickets:\s*50/);
  assert.match(subscriptions, /PLAN_CODES\.GROWTH[\s\S]*welcome_courtesy_tickets:\s*100/);
  assert.match(subscriptions, /PLAN_CODES\.PRO[\s\S]*welcome_courtesy_tickets:\s*200/);
});

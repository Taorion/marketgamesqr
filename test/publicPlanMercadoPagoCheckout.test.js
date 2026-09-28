const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const { env } = require("../backend/src/config/env");
const { __testing, createPortalSignupCheckout } = require("../backend/src/services/mercadoPagoService");

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

test("public plan checkout falls back only for Mercado Pago payer-site mismatches", () => {
  const payments = read("backend/src/services/mercadoPagoService.js");

  assert.equal(__testing.isPayerSiteMismatchError(new Error("Payer is associated with a different site")), true);
  assert.equal(__testing.isPayerSiteMismatchError({
    message: "Mercado Pago rechazo la operacion.",
    details: { cause: [{ description: "Payer is associated with a different site" }] },
  }), true);
  assert.equal(__testing.isPayerSiteMismatchError(new Error("Invalid transaction amount")), false);
  assert.match(payments, /createPublicPlanPaymentPreference/);
  assert.match(payments, /checkout_mode:\s*"payer_site_fallback"/);
  assert.match(payments, /if \(!isPayerSiteMismatchError\(error\)\) throw error/);
  assert.doesNotMatch(
    payments.match(/async function createPublicPlanPaymentPreference[\s\S]*?\r?\n}\r?\n/)[0],
    /payer(_email)?:/
  );
});

test("Despega returns a usable Checkout Pro URL when the payer belongs to another site", async () => {
  const originalFetch = global.fetch;
  const originalAccessToken = env.mercadoPagoAccessToken;
  const originalWebhookSecret = env.mercadoPagoWebhookSecret;
  const requests = [];
  const order = {
    id: "order-1",
    business_id: "business-1",
    created_by_user_id: "user-1",
    package_code: "DESPEGA",
    package_size: 0,
    package_title: "Despega - suscripcion mensualidad",
    price_cop: 75000,
    currency: "COP",
    status: "PENDING",
    external_reference: "signup-1",
    metadata: { source: "public_portal_signup" },
  };
  const client = {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      if (/insert into qr_credit_purchase_orders/.test(sql)) return { rows: [order] };
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
    if (requests.length === 1) {
      return {
        ok: false,
        async json() { return { message: "Payer is associated with a different site" }; },
      };
    }
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
      plan_code: "DESPEGA",
      billing_cycle: "monthly",
    });

    assert.equal(requests.length, 2);
    assert.match(requests[0].url, /\/preapproval$/);
    assert.equal(requests[0].body.payer_email, "buyer@example.com");
    assert.match(requests[1].url, /\/checkout\/preferences$/);
    assert.equal("payer" in requests[1].body, false);
    assert.equal(requests[1].body.currency_id, undefined);
    assert.equal(requests[1].body.items[0].currency_id, "COP");
    assert.equal(requests[1].body.external_reference, "signup-1");
    assert.equal(client.calls[1].params[5], true);
    assert.equal(result.checkout_url, "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=preference-1");
  } finally {
    global.fetch = originalFetch;
    env.mercadoPagoAccessToken = originalAccessToken;
    env.mercadoPagoWebhookSecret = originalWebhookSecret;
  }
});

test("Despega participates in the public upgrade and activation contracts", () => {
  const subscriptions = read("backend/src/services/subscriptionService.js");
  assert.match(subscriptions, /PUBLIC_UPGRADE_ORDER = \[PLAN_CODES\.DESPEGA, PLAN_CODES\.STARTER/);
  assert.match(subscriptions, /\('DESPEGA', 'STARTER', 'GROWTH', 'PRO', 'GLOBAL'\)/);
  assert.match(subscriptions, /welcome_courtesy_tickets:\s*10/);
});

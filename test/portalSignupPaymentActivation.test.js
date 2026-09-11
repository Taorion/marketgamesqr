const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const { __testing } = require("../backend/src/services/mercadoPagoService");
const { env } = require("../backend/src/config/env");

test("valida la firma oficial del webhook y rechaza alteraciones", () => {
  const previousSecret = env.mercadoPagoWebhookSecret;
  env.mercadoPagoWebhookSecret = "webhook-test-secret";
  try {
    const dataId = "123456789";
    const requestId = "request-test-id";
    const ts = "1742505638683";
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hash = crypto.createHmac("sha256", env.mercadoPagoWebhookSecret).update(manifest).digest("hex");
    const request = {
      headers: { "x-signature": `ts=${ts},v1=${hash}`, "x-request-id": requestId },
      query: { "data.id": dataId },
      body: {},
    };
    assert.doesNotThrow(() => __testing.verifyWebhookSignature(request));
    assert.throws(() => __testing.verifyWebhookSignature({ ...request, query: { "data.id": "altered" } }), /invalida/);
  } finally {
    env.mercadoPagoWebhookSecret = previousSecret;
  }
});

test("normaliza los tópicos actuales y heredados de Suscripciones", () => {
  assert.equal(__testing.normalizeMercadoPagoWebhookTopic("subscription_preapproval"), "subscription_preapproval");
  assert.equal(__testing.normalizeMercadoPagoWebhookTopic("preapproval"), "subscription_preapproval");
  assert.equal(__testing.normalizeMercadoPagoWebhookTopic("subscription_authorized_payment"), "subscription_authorized_payment");
  assert.equal(__testing.normalizeMercadoPagoWebhookTopic("payment"), "payment");
  assert.equal(__testing.normalizeMercadoPagoWebhookTopic("payments"), "payment");
});

test("solo una factura con pago aprobado entrega un payment id activable", () => {
  assert.equal(__testing.approvedPaymentIdFromAuthorizedInvoice({ payment: { id: 101, status: "approved" } }), "101");
  assert.equal(__testing.approvedPaymentIdFromAuthorizedInvoice({ payment: { id: 102, status: "pending" } }), null);
  assert.equal(__testing.approvedPaymentIdFromAuthorizedInvoice({ payment: { id: 103, status: "rejected" } }), null);
  assert.equal(__testing.approvedPaymentIdFromAuthorizedInvoice({ payment: { status: "approved" } }), null);
});

test("un pago aprobado debe cubrir el total y conservar la moneda de la orden", () => {
  const order = { price_cop: 75000, currency: "COP" };
  assert.doesNotThrow(() => __testing.validateApprovedPayment(order, { transaction_amount: 75000, currency_id: "COP" }));
  assert.throws(() => __testing.validateApprovedPayment(order, { transaction_amount: 74999, currency_id: "COP" }), /no cubre/);
  assert.throws(() => __testing.validateApprovedPayment(order, { transaction_amount: 75000, currency_id: "USD" }), /moneda/);
});

test("la ampliación de almacenamiento también exige pago completo en COP", () => {
  const storage = read("backend/src/services/storageQuotaService.js");
  assert.match(storage, /transaction_amount[\s\S]+price_cop/);
  assert.match(storage, /payment\.currency_id[\s\S]+!== "COP"/);
});

test("autorizar la tarjeta no activa por sí sola el portal", () => {
  const service = read("backend/src/services/mercadoPagoService.js");
  const start = service.indexOf("async function processPreapprovalWebhook");
  const end = service.indexOf("function normalizeMercadoPagoWebhookTopic", start);
  const preapprovalFlow = service.slice(start, end);

  assert.match(preapprovalFlow, /subscription_auto_renew_enabled/);
  assert.doesNotMatch(preapprovalFlow, /finalizeApprovedPortalSubscription/);
});

test("el pago aprobado conserva importe completo, activación e idempotencia", () => {
  const service = read("backend/src/services/mercadoPagoService.js");
  const controller = read("backend/src/controllers/packageSalesController.js");

  assert.match(controller, /'PENDING_PAYMENT', false/);
  assert.match(controller, /'BUSINESS_OWNER', false/);
  assert.match(service, /amount < Number\(order\.price_cop\)/);
  assert.match(service, /if \(order\.credited_at\)[\s\S]+duplicate: true/);
  assert.match(service, /set is_active = true,[\s\S]+portal_status = 'ACTIVE',[\s\S]+subscription_status = 'ACTIVE'/);
  assert.match(service, /update app_users[\s\S]+set is_active = true/);
});

test("el webhook de factura consulta el pago completo antes de acreditar", () => {
  const service = read("backend/src/services/mercadoPagoService.js");
  assert.match(service, /subscription_authorized_payment[\s\S]+\/authorized_payments\/\$\{encodeURIComponent\(resourceId\)\}/);
  assert.match(service, /paymentId = approvedPaymentIdFromAuthorizedInvoice\(authorizedInvoice\)/);
  assert.match(service, /\/v1\/payments\/\$\{encodeURIComponent\(paymentId\)\}/);
  assert.match(service, /payment\.external_reference \|\| authorizedInvoice\?\.external_reference/);
  assert.match(service, /mercado_pago_preference_id = \$2/);
});

test("cada nuevo cobro recurrente crea un período y cada reintento queda idempotente", () => {
  const service = read("backend/src/services/mercadoPagoService.js");
  assert.match(service, /isRecurringSubscription = \[[\s\S]+portal_monthly_subscription[\s\S]+portal_annual_subscription[\s\S]+portal_monthly_subscription_auto_renewal/);
  assert.match(service, /where mercado_pago_payment_id = \$1[\s\S]+duplicate: true/);
  assert.match(service, /source: "mercado_pago_auto_renewal_payment"/);
  assert.match(service, /\["REJECTED", "CANCELLED"\]\.includes\(status\)[\s\S]+reversed: true/);
  assert.match(service, /\["refunded", "charged_back"\]/);
});

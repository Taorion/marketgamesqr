const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("recargas usa intención idempotente y conserva fallos recuperables", () => {
  const service = read("backend/src/services/mercadoPagoService.js");
  const migration = read("database/migrations/20260827152855_account_recharge_checkout_integrity.sql");
  assert.match(service, /on conflict \(business_id, checkout_key\).*do nothing/s);
  assert.match(service, /set status = 'ERROR', checkout_error = \$2/);
  assert.match(service, /checkout_url \|\| existing\.sandbox_checkout_url/);
  assert.match(migration, /unique index.*business_checkout_key/is);
  assert.match(migration, /where checkout_key is not null/i);
});

test("contratos de pago aceptan UUID y protegen lectura financiera", () => {
  const controller = read("backend/src/controllers/paymentController.js");
  const routes = read("backend/src/routes/paymentRoutes.js");
  assert.match(controller, /idempotency_key: z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(routes, /get\("\/qr-credits\/offers", authRequired, requireBillingAdmin/);
  assert.match(routes, /get\("\/qr-credits\/orders", authRequired, requireBillingAdmin/);
});

test("historial muestra el valor persistido y permite retomar pendientes", () => {
  const app = read("empresa/js/app.js");
  assert.match(app, /copMoney\(order\.price_cop\)/);
  assert.doesNotMatch(app, /packagePriceLabel\(\(state\.qrPackageOffers \|\| \[\]\)\.find/);
  assert.match(app, /data-resume-checkout/);
  assert.match(app, /refreshAccountPaymentReturn/);
  assert.match(app, /urlParams\.delete\(key\)/);
});

test("interfaz premium incluye selector visual, resumen y móvil sin tabla horizontal", () => {
  const html = read("empresa/index.html");
  const css = read("empresa/css/account-premium.css");
  assert.match(html, /id="qrCreditPackageGrid"/);
  assert.match(html, /id="accountRechargeBalance"/);
  assert.match(html, /Pago único · sin recarga automática/);
  assert.match(css, /\.qr-credit-package-option\.is-selected/);
  assert.match(css, /\.account-orders-table\s*\{[^}]*display: block/is);
  assert.match(html, /account-recharge-center-v378-20260827/);
});

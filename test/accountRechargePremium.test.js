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

test("schema existente agrega columnas de checkout antes de crear sus índices", () => {
  const schema = read("database/schema.sql");
  const addColumnsAt = schema.indexOf("alter table qr_credit_purchase_orders\n  add column if not exists checkout_key text");
  const checkoutIndexAt = schema.indexOf("create unique index if not exists ux_qr_credit_purchase_orders_business_checkout_key");

  assert.ok(addColumnsAt >= 0, "el bootstrap debe actualizar tablas existentes");
  assert.ok(checkoutIndexAt > addColumnsAt, "checkout_key debe existir antes de crear el índice");
  assert.match(schema, /add column if not exists checkout_error text/);
  assert.match(schema, /add column if not exists checkout_expires_at timestamptz/);
});

test("historial muestra el valor persistido y permite retomar pendientes", () => {
  const app = read("empresa/js/app.js");
  assert.match(app, /copMoney\(order\.price_cop\)/);
  assert.doesNotMatch(app, /packagePriceLabel\(\(state\.qrPackageOffers \|\| \[\]\)\.find/);
  assert.match(app, /data-resume-checkout/);
  assert.match(app, /refreshAccountPaymentReturn/);
  assert.match(app, /urlParams\.delete\(key\)/);
});

test("la tienda renderiza paquetes sin depender de variables de la ruta de pago", () => {
  const app = read("empresa/js/app.js");
  const shopStart = app.indexOf("function renderQrCreditShop()");
  const shopEnd = app.indexOf("function paymentStatusLabel", shopStart);
  const shop = app.slice(shopStart, shopEnd);
  const routeStart = app.indexOf("function applyInitialRouteParams()");
  const routeEnd = app.indexOf("function openGamingCenterEntry", routeStart);
  const route = app.slice(routeStart, routeEnd);

  assert.match(shop, /qrCreditPackageGrid\.innerHTML = offers\.length/);
  assert.doesNotMatch(shop, /paymentResult|urlParams/);
  assert.match(route, /const paymentResult = urlParams\.get\("payment"\)/);
  assert.match(route, /if \(paymentResult && canManageBusinessBilling\(\)\)/);
});

test("interfaz premium incluye selector visual, resumen y móvil sin tabla horizontal", () => {
  const html = read("empresa/index.html");
  const css = read("empresa/css/account-premium.css");
  assert.match(html, /id="qrCreditPackageGrid"/);
  assert.match(html, /id="accountRechargeBalance"/);
  assert.match(html, /Pago único · sin recarga automática/);
  assert.match(css, /\.qr-credit-package-option\.is-selected/);
  assert.match(css, /\.account-orders-table\s*\{[^}]*display: block/is);
  assert.match(html, /plan-change-v381-20260827/);
  assert.match(html, /account-plan-change-v12-20260827/);
  assert.match(css, /Account v9 · Recharge alignment system/);
  assert.match(css, /Account v10 · definitive Qori workspace composition/);
  assert.match(css, /#accountSectionBilling \.account-billing-panel > :is\(\.solid-button, \.ghost-button\)[\s\S]+width: 100% !important/);
  assert.match(css, /\.qr-credit-checkout-bar[\s\S]+grid-template-columns: minmax\(0, 1fr\) minmax\(250px, 320px\)/);
});

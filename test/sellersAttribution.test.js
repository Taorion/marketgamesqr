const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const { __testing } = require("../backend/src/services/sellerService");
const { businessSellerSelfServiceAllowed } = require("../backend/src/middleware/auth");

test("normaliza codigos estables y estados de atribucion sin inventar aprobaciones", () => {
  assert.equal(__testing.normalizeSellerCode(" Qori Ána 001 "), "QORI-ANA-001");
  assert.equal(__testing.signupAttributionStatus("approved"), "APPROVED");
  assert.equal(__testing.signupAttributionStatus("rejected"), "FAILED");
  assert.equal(__testing.signupAttributionStatus("refunded"), "REFUNDED");
  assert.equal(__testing.signupAttributionStatus("in_process"), "PENDING");
});

test("la migracion crea rol, entidades tenant-scoped, llaves compuestas y auditoria append-only", () => {
  const migration = read("database/migrations/20260828003115_qori_sellers_attribution.sql");
  assert.match(migration, /add value if not exists 'BUSINESS_SELLER'/);
  assert.match(migration, /create table if not exists business_seller_profiles/);
  assert.match(migration, /create table if not exists business_seller_goals/);
  assert.match(migration, /create table if not exists portal_signup_sales_attributions/);
  assert.match(migration, /foreign key \(business_id, user_id\) references app_users \(business_id, id\)/);
  assert.match(migration, /foreign key \(client_business_id, purchase_order_id\) references qr_credit_purchase_orders \(business_id, id\)/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /portal signup attribution events are append-only/);
  assert.match(migration, /business_sales add column if not exists created_by_user_id/);
});

test("el buscador publico no enumera todo ni expone PII", () => {
  const service = read("backend/src/services/sellerService.js");
  const publicStart = service.indexOf("async function publicSalesAdvisors");
  const publicEnd = service.indexOf("async function resolveQoriAdvisor", publicStart);
  const publicFlow = service.slice(publicStart, publicEnd);
  const routes = read("backend/src/routes/packageSalesRoutes.js");
  assert.match(publicFlow, /term\.length < 2/);
  assert.match(publicFlow, /searchableCharacters\(term\) < 2/);
  assert.match(publicFlow, /escapeLikePattern\(term\)/);
  assert.match(service, /settings->>'internal_account' = 'true'/);
  assert.match(publicFlow, /p\.status = 'ACTIVE'/);
  assert.match(publicFlow, /u\.is_active = true/);
  assert.match(publicFlow, /limit 8/);
  assert.doesNotMatch(publicFlow, /email|phone|password_hash|administrative_notes|commercial_settings/);
  assert.match(routes, /sales-advisors", rateLimit\(\{ keyPrefix: "public-sales-advisors"/);
});

test("Activa Qori vuelve a validar asesor y crea SELF o SELLER pendiente en la transaccion", () => {
  const controller = read("backend/src/controllers/packageSalesController.js");
  const service = read("backend/src/services/sellerService.js");
  assert.match(controller, /sales_advisor_code/);
  assert.match(controller, /await createSignupAttribution\(client/);
  assert.match(service, /if \(!code\) return \{ internalBusiness:[\s\S]+source: "SELF"/);
  assert.match(service, /p\.business_id = \$1 and p\.seller_code = \$2[\s\S]+p\.status = 'ACTIVE'/);
  assert.match(service, /attribution_source,[\s\S]+expected_revenue_cop/);
  assert.match(service, /status text not null default 'PENDING'|portal_signup_sales_attributions/);
});

test("Mercado Pago aprueba plan y atribucion una sola vez dentro del flujo canonico", () => {
  const mercadoPago = read("backend/src/services/mercadoPagoService.js");
  const sellerService = read("backend/src/services/sellerService.js");
  assert.match(mercadoPago, /finalizeApprovedPortalSubscription[\s\S]+approveSignupAttribution\(client/);
  assert.match(mercadoPago, /const planCode = signup\.plan_code \|\| order\.package_code/);
  assert.match(mercadoPago, /syncSignupAttributionStatus\(client, payableOrder\.id, status, payment\.id\)/);
  assert.match(sellerService, /where purchase_order_id = \$1 and status not in \('APPROVED','REFUNDED','CANCELLED'\)/);
  assert.match(sellerService, /where qori_business_id=\$1[\s\S]+status='APPROVED'/);
});

test("BUSINESS_SELLER queda limitado por backend a autoservicio propio", () => {
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  const auth = read("backend/src/middleware/auth.js");
  const service = read("backend/src/services/sellerService.js");
  assert.ok(routes.indexOf('router.get("/sellers/me"') < routes.indexOf("router.use(blockBusinessSeller)"));
  assert.ok(routes.indexOf("router.use(blockBusinessSeller)") < routes.indexOf('router.get("/access"'));
  assert.match(routes, /sellers\/me", sellerModuleAccess, requireRoles\("BUSINESS_SELLER"\)/);
  assert.match(auth, /req\.user\?\.role === "BUSINESS_SELLER"/);
  assert.match(service, /actor\.role === SELLER_ROLE && actor\.id !== sellerId/);
  assert.match(service, /u\.id = \$1 and u\.business_id = \$2 and u\.role = 'BUSINESS_SELLER'/);
  assert.equal(businessSellerSelfServiceAllowed({ method: "GET", originalUrl: "/api/business/sellers/me?start_date=2026-08-01" }), true);
  assert.equal(businessSellerSelfServiceAllowed({ method: "POST", originalUrl: "/api/auth/password/change" }), true);
  assert.equal(businessSellerSelfServiceAllowed({ method: "GET", originalUrl: "/api/business/campaigns" }), false);
  assert.equal(businessSellerSelfServiceAllowed({ method: "GET", originalUrl: "/api/businesses/00000000-0000-0000-0000-000000000000/redemptions" }), false);
});

test("las ventas normales conservan business_sales, vendedor, idempotencia y catalogo", () => {
  const service = read("backend/src/services/sellerService.js");
  assert.match(service, /syncSaleProductsWithCatalog\(client,businessId,actor\.id,products/);
  assert.match(service, /insert into business_sales/);
  assert.match(service, /seller_user_id,branch_id/);
  assert.match(service, /idempotency_key/);
  assert.match(service, /created_by_user_id/);
  assert.match(service, /responsible_commercial/);
});

test("ventas, leads, afiliados y RMS permiten escoger el vendedor real", () => {
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  const portal = read("backend/src/controllers/businessPortalController.js");
  const leadController = read("backend/src/controllers/leadCrmController.js");
  const rmsController = read("backend/src/controllers/rmsMachineController.js");
  assert.match(html, /id="customerAcquisitionSellerInput"[\s\S]+id="affiliatePurchaseSellerInput"/);
  assert.match(app, /leadPurchaseSellerInput[\s\S]+data-rms-sale-seller/);
  assert.match(app, /seller_user_id: customerAcquisitionSellerInput[\s\S]+seller_user_id: affiliatePurchaseSellerInput/);
  assert.match(portal, /seller_user_id: z\.string\(\)\.uuid/);
  assert.match(leadController, /purchaseSchema[\s\S]+seller_user_id: z\.string\(\)\.uuid/);
  assert.match(rmsController, /attributedSaleSchema[\s\S]+seller_user_id: z\.string\(\)\.uuid/);
});

test("el portal separa Vendedores de Cuenta y Admin y ofrece estados accesibles", () => {
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  const css = read("empresa/css/sellers-premium.css");
  const packages = read("paquetes/index.html");
  assert.match(html, /data-sidebar-section="gos"[\s\S]+data-view="sellers"/);
  assert.ok(html.indexOf('data-view="sellers"') < html.indexOf('data-sidebar-section="admin"'));
  assert.match(html, /role="tablist"/);
  assert.match(html, /id="sellersDataState" role="status" aria-live="polite"/);
  assert.match(app, /if \(isBusinessSeller\(\) && view !== "sellers"\)/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(html, /id="sellerAttributionCommand"/);
  assert.match(html, /id="sellerTabSummary"[\s\S]+aria-controls="sellerDetailBody"/);
  assert.match(app, /loadSellerAttributions/);
  assert.match(app, /handleSellerModalKeys/);
  assert.match(app, /data-add-sale-product/);
  assert.match(html, /qori-sellers-modal-fit-v5-20260828/);
  assert.match(css, /qoriSellerHeroA#qoriSellerHeroB#qoriSellerHeroC#qoriSellerHeroD#qoriSellerHeroE/);
  assert.match(css, /sellers-hero-actions[\s\S]+color:#fff!important/);
  assert.match(css, /sellers-hero[\s\S]+\.sellers-eyebrow,h2,p,\.sellers-data-state\)\{color:#fff!important/);
  assert.match(css, /qoriSellerModalA#qoriSellerModalB#qoriSellerModalC#qoriSellerModalD#qoriSellerModalE/);
  assert.match(css, /grid-template-rows:auto auto minmax\(0,1fr\) auto!important/);
  assert.match(css, /seller-editor-form\{display:grid!important;grid-template-rows:minmax\(0,1fr\) auto auto!important/);
  assert.match(css, /#sellerEditorFields\{min-width:0;min-height:0;[\s\S]+overflow:auto/);
  assert.match(css, /height:100dvh/);
  assert.match(app, /modal\.dataset\.sellerEditorMode = mode/);
  assert.match(app, /body\.scrollTop = 0/);
  assert.match(packages, /¿Quién te dio a conocer Qori\?/);
  assert.match(packages, /role="combobox"[\s\S]+aria-controls="salesAdvisorResults"/);
});

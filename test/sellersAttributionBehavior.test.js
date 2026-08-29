const assert = require("node:assert/strict");
const test = require("node:test");

const dbPath = require.resolve("../backend/src/config/db");
const sellerServicePath = require.resolve("../backend/src/services/sellerService");
const calls = [];
let responses = [];

async function query(sql, params = []) {
  calls.push({ sql, params });
  const next = responses.shift();
  if (!next) throw new Error(`Unexpected query: ${sql}`);
  return typeof next === "function" ? next(sql, params) : next;
}

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { query, withTransaction: async (handler) => handler({ query }) },
  children: [],
  paths: [],
};
delete require.cache[sellerServicePath];
const sellerService = require(sellerServicePath);
const { __testing: controllerSchemas } = require("../backend/src/controllers/sellerController");

test.beforeEach(() => {
  calls.length = 0;
  responses = [];
});

test("el buscador publico rechaza comodines puros antes de consultar PostgreSQL", async () => {
  assert.deepEqual(await sellerService.publicSalesAdvisors("%%__"), []);
  assert.equal(calls.length, 0);
});

test("el buscador publico escapa comodines y devuelve solo el contrato seguro", async () => {
  responses = [
    { rows: [{ id: "qori-business", name: "Qori", slug: "marketgames-qr", settings: { internal_account: true } }], rowCount: 1 },
    { rows: [{ full_name: "Ana Qori", seller_code: "QORI-ANA-001" }], rowCount: 1 },
  ];
  const result = await sellerService.publicSalesAdvisors("Ana_%");
  assert.deepEqual(result, [{ name: "Ana Qori", code: "QORI-ANA-001", label: "Ana Qori · QORI-ANA-001" }]);
  assert.equal(calls[1].params[1], "%Ana\\_\\%%");
  assert.match(calls[1].sql, /escape '\\'/i);
  assert.doesNotMatch(JSON.stringify(result), /email|phone|password|administrative/i);
});

test("las metas se prorratean por los dias realmente incluidos en el periodo", () => {
  const contribution = sellerService.__testing.proratedGoalForRange(
    { period_start: "2026-08-01", period_end: "2026-08-31", target_revenue: 3100000, target_sales: 31, target_new_customers: 10 },
    { startDate: "2026-08-01", endDate: "2026-08-10" }
  );
  assert.equal(contribution.overlap_days, 10);
  assert.equal(contribution.total_days, 31);
  assert.equal(contribution.target_revenue, 1000000);
  assert.equal(contribution.target_sales, 10);
});

test("la bandeja Qori lista SELF y pendientes sin exponer payloads de pago", async () => {
  responses = [
    { rows: [{ id: "qori-business", name: "Qori", slug: "marketgames-qr", settings: { internal_account: true } }], rowCount: 1 },
    { rows: [{ id: "attr-1", status: "APPROVED", attribution_source: "SELF", plan_code: "CRECE", client_business_name: "Cliente", filtered_total: 1 }], rowCount: 1 },
    { rows: [{ total: 1, payment_pending: 0, approved: 1, needs_assignment: 1, exceptions: 0 }], rowCount: 1 },
  ];
  const data = await sellerService.listSignupAttributions("qori-business", { id: "owner", role: "BUSINESS_OWNER" }, { start_date: "2026-08-01", end_date: "2026-08-31" });
  assert.equal(data.attributions[0].attribution_source, "SELF");
  assert.equal(data.summary.needs_assignment, 1);
  assert.match(calls[1].sql, /a\.qori_business_id=\$1/);
  assert.doesNotMatch(calls[1].sql, /payment_payload|checkout_url|password_hash/i);
});

test("la escritura rechaza ventas sin cliente y estados contradictorios", () => {
  const sale = controllerSchemas.sellerSaleSchema.safeParse({
    product_name: "Plan",
    sale_amount: 100000,
    idempotency_key: "seller-test-001",
  });
  assert.equal(sale.success, false);
  assert.match(JSON.stringify(sale.error.issues), /identifique al cliente/);
  const seller = controllerSchemas.sellerPatchSchema.safeParse({ status: "INACTIVE", is_active: true });
  assert.equal(seller.success, false);
  assert.match(JSON.stringify(seller.error.issues), /deben coincidir/);
});

test("los filtros rechazan UUID manipulados antes de llegar a PostgreSQL", () => {
  assert.equal(controllerSchemas.sellerFiltersSchema.safeParse({ seller_id: "otro-tenant" }).success, false);
  assert.equal(controllerSchemas.sellerFiltersSchema.safeParse({ branch_id: "../../../admin" }).success, false);
});

test("la meta de ventas no conserva el tope artificial de un millón", () => {
  const parsed = controllerSchemas.goalSchema.safeParse({
    period_start: "2026-08-01",
    period_end: "2026-08-31",
    target_revenue: 0,
    target_sales: 5000000,
    target_new_customers: 0,
  });
  assert.equal(parsed.success, true);
  const migration = require("node:fs").readFileSync("database/migrations/20260829123000_seller_goal_sales_unbounded.sql", "utf8");
  assert.match(migration, /alter column target_sales type numeric/);
});

test("la atribucion manual valida vendedor activo, tenant y permiso del actor", async () => {
  responses = [{ rows: [{ id: "seller-1", full_name: "Ana", role: "BUSINESS_SELLER", seller_code: "ANA-01" }], rowCount: 1 }];
  const seller = await sellerService.resolveBusinessSaleSeller(
    { query },
    "business-1",
    { id: "owner-1", role: "BUSINESS_OWNER" },
    "seller-1"
  );
  assert.equal(seller.id, "seller-1");
  assert.deepEqual(calls[0].params, ["seller-1", "business-1"]);
  assert.match(calls[0].sql, /u\.business_id = \$2[\s\S]+u\.is_active = true/);
  await assert.rejects(
    sellerService.resolveBusinessSaleSeller({ query }, "business-1", { id: "validator-1", role: "VALIDATOR" }, "seller-2"),
    /no puede atribuir una venta a otro integrante/i
  );
  assert.equal(calls.length, 1);
});

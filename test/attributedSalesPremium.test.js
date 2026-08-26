const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  canonicalAttributedSalesSql,
  decodeSalesCursor,
  encodeSalesCursor,
  listAttributedSales,
} = require("../backend/src/services/attributedSalesService");

const controller = fs.readFileSync("backend/src/controllers/businessPortalController.js", "utf8");
const routes = fs.readFileSync("backend/src/routes/businessPortalRoutes.js", "utf8");
const portal = fs.readFileSync("empresa/index.html", "utf8");
const app = fs.readFileSync("empresa/js/app.js", "utf8");
const premiumCss = fs.readFileSync("empresa/css/attributed-sales-premium.css", "utf8");
const rmsMigration = fs.readFileSync("database/migrations/202608030001_rms_evaluation_attributed_sales.sql", "utf8");

test("canonical ledger removes QR mirrors and preserves real attribution fields", () => {
  const sql = canonicalAttributedSalesSql();
  assert.match(sql, /not exists[\s\S]*mirror\.qr_code_id = bs\.qr_code_id/i);
  assert.match(sql, /c\.name as campaign_name/i);
  assert.match(sql, /bs\.payment_method/i);
  assert.match(sql, /acquisition_channel_name_snapshot/i);
  assert.match(sql, /u\.business_id = s\.business_id/i);
  assert.match(sql, /u\.business_id = bs\.business_id/i);
});

test("keyset pagination returns stable cursors and global filtered summary", async () => {
  const rows = [
    { id: "00000000-0000-4000-8000-000000000003", created_at: "2026-08-26T12:00:00.000Z" },
    { id: "00000000-0000-4000-8000-000000000002", created_at: "2026-08-26T11:00:00.000Z" },
    { id: "00000000-0000-4000-8000-000000000001", created_at: "2026-08-26T10:00:00.000Z" },
  ].map((row) => ({
    ...row,
    sale_amount: "25000.00",
    total_records: 12,
    paid_count: 10,
    voided_count: 2,
    unique_customers: 8,
    attributed_revenue: "250000.00",
    average_ticket: "25000.00",
    customer_key: "private-key",
  }));
  const result = await listAttributedSales({
    businessId: "00000000-0000-4000-8000-000000000099",
    limit: 2,
    dbQuery: async () => ({ rows }),
  });
  assert.equal(result.sales.length, 2);
  assert.equal(result.summary.attributed_revenue, 250000);
  assert.equal(result.pagination.has_more, true);
  assert.equal(result.sales[0].customer_key, undefined);
  assert.deepEqual(decodeSalesCursor(result.pagination.next_cursor), {
    created_at: "2026-08-26T11:00:00.000Z",
    id: "00000000-0000-4000-8000-000000000002",
  });
  assert.equal(decodeSalesCursor(encodeSalesCursor(rows[0])).id, rows[0].id);
});

test("manual sale retries are idempotent before any customer, product or points side effect", () => {
  assert.match(controller, /idempotency_key: z\.string\(\)\.trim\(\)\.min\(8\).*\.optional\(\)/);
  assert.match(controller, /body\.idempotency_key \|\| `server:\$\{randomUUID\(\)\}`/);
  assert.match(controller, /pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
  assert.match(controller, /business_id = \$1 and idempotency_key = \$2/);
  assert.match(controller, /res\.status\(result\.duplicate \? 200 : 201\)/);
  assert.match(app, /idempotency_key: customerSaleIdempotencyKey\(\)/);
  assert.match(portal, /id="customerAcquisitionPaymentMethodInput"/);
  assert.match(controller, /payment_method: z\.string\(\)\.trim\(\)\.max\(80\)/);
  assert.match(rmsMigration, /unique index[\s\S]*business_sales[\s\S]*idempotency_key/i);
});

test("premium sales command exposes server filters, pagination and canonical CSV", () => {
  assert.match(portal, /attributed-sales-premium\.css\?v=attributed-sales-command-v364/);
  assert.match(portal, /id="salesAnalysisStatusInput"/);
  assert.match(portal, /id="salesAnalysisSourceInput"/);
  assert.match(portal, /id="salesLoadMoreButton"/);
  assert.match(app, /salesAnalysisQueryParams\(\)/);
  assert.match(app, /attributedSalesSummary/);
  assert.match(app, /salesMoney\(summary\.average_ticket/);
  assert.match(app, /function ensureSalesAnalysisStyles\(\) \{[\s\S]*?return;[\s\S]*?legacy runtime styles retained/);
  assert.match(routes, /sales\/attributed\/export\.csv/);
  assert.match(controller, /X-Export-Truncated/);
  assert.match(premiumCss, /@media \(max-width: 430px\)/);
  assert.match(premiumCss, /data-sales-kpi="revenue"/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("product creation is written atomically to the tenant lifecycle ledger", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const catalog = read("backend/src/services/productCatalogService.js");
  const lifecycle = read("backend/src/services/lifecycleAuditService.js");
  assert.match(lifecycle, /"CREATED"/);
  assert.match(lifecycle, /idempotency_key: `inventory-created:\$\{product\.id\}`/);
  assert.match(lifecycle, /initial_stock_quantity/);
  assert.match(controller, /source: "MANUAL_FORM"/);
  assert.match(controller, /source: "CSV_IMPORT"/);
  assert.match(catalog, /source: "SALE_AUTO_CREATE"/);
  assert.match(controller, /recordInventoryProductCreated\([\s\S]*?\}, client\)/);
  assert.match(catalog, /recordInventoryProductCreated\([\s\S]*?\}, client\)/);
});

test("product insights expose tenant-scoped history and the portal renders it", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const app = read("empresa/js/app.js");
  const html = read("empresa/index.html");
  assert.match(controller, /from business_lifecycle_events event[\s\S]*event\.business_id = \$1[\s\S]*event\.entity_type = 'INVENTORY_PRODUCT'[\s\S]*event\.entity_id = \$2/);
  assert.match(controller, /history: historyResult\.rows/);
  assert.match(app, /Historial del inventario/);
  assert.match(app, /Producto cargado al inventario/);
  assert.match(app, /Carga manual/);
  assert.match(app, /Importación CSV/);
  assert.match(html, /inventory-product-history-v509-20260927/);
});

test("migration allows CREATED and backfills existing products without inventing initial stock", () => {
  const migration = read("database/migrations/20260927235900_inventory_product_created_history.sql");
  assert.match(migration, /check \(action in \('CREATED'/);
  assert.match(migration, /from business_inventory_products product/);
  assert.match(migration, /'initial_stock_quantity', null/);
  assert.match(migration, /'initial_stock_known', false/);
  assert.match(migration, /on conflict \(business_id, idempotency_key\)/);
});

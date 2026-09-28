const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { syncSaleProductsWithCatalog } = require("../backend/src/services/productCatalogService");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("selling 2 units atomically changes stock from 12 to 10 and records the movement", async () => {
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (/select \*[\s\S]*from business_inventory_products/.test(sql)) {
        return {
          rowCount: 1,
          rows: [{
            id: "11111111-1111-4111-8111-111111111111",
            business_id: "22222222-2222-4222-8222-222222222222",
            name: "Biología",
            stock_quantity: "12",
            unit_price: "10000",
            unit_label: "onzas",
            status: "ACTIVE",
          }],
        };
      }
      if (/update business_inventory_products/.test(sql)) {
        return {
          rowCount: 1,
          rows: [{
            id: "11111111-1111-4111-8111-111111111111",
            name: "Biología",
            stock_quantity: "10",
            unit_price: "10000",
            unit_label: "onzas",
            status: "ACTIVE",
          }],
        };
      }
      if (/insert into business_lifecycle_events/.test(sql)) {
        return { rowCount: 1, rows: [{ id: "movement-1" }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const result = await syncSaleProductsWithCatalog(
    client,
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    [{
      inventory_product_id: "11111111-1111-4111-8111-111111111111",
      name: "Biología",
      quantity: 2,
      unit_price: 10000,
      line_total: 20000,
    }],
    {
      sourceModule: "qr_validator",
      inventoryMovementKey: "validator-qr:qr-1",
      saleReference: "validator-qr-sale:qr-1",
      qrCodeId: "qr-1",
      createMissingProducts: false,
    }
  );

  const stockUpdate = calls.find((call) => /update business_inventory_products/.test(call.sql));
  const movement = calls.find((call) => /insert into business_lifecycle_events/.test(call.sql));
  assert.equal(stockUpdate.values[2], 2);
  assert.equal(result.products[0].stock_quantity_after_sale, 10);
  assert.equal(movement.values[3], "STOCK_SOLD");
  assert.equal(movement.values[8], "inventory-sale:validator-qr:qr-1:11111111-1111-4111-8111-111111111111");
  const movementMetadata = JSON.parse(movement.values[10]);
  assert.equal(movementMetadata.quantity_sold, 2);
  assert.equal(movementMetadata.stock_before_sale, 12);
  assert.equal(movementMetadata.stock_after_sale, 10);
  assert.equal(movementMetadata.source, "QR_VALIDATOR");
});

test("benefit checkout synchronizes inventory before persisting its sales", () => {
  const service = read("backend/src/services/qrService.js");
  const purchaseFlow = service.slice(service.indexOf('if (checkout.mode === "PURCHASE")'), service.indexOf("await client.query(\n      `update qr_codes", service.indexOf('if (checkout.mode === "PURCHASE")')));
  assert.match(purchaseFlow, /syncSaleProductsWithCatalog/);
  assert.ok(purchaseFlow.indexOf("syncSaleProductsWithCatalog") < purchaseFlow.indexOf("insert into attributed_sales"));
  assert.match(purchaseFlow, /inventoryMovementKey: `validator-qr:\$\{qr\.id\}`/);
  assert.match(service, /products: checkout\.line_items/);
});

test("migration repairs historical validator purchases and product history renders sold stock", () => {
  const migration = read("database/migrations/202609280001_inventory_sale_movements.sql");
  const lifecycle = read("backend/src/services/lifecycleAuditService.js");
  const app = read("empresa/js/app.js");
  const html = read("empresa/index.html");
  assert.match(migration, /'STOCK_SOLD'/);
  assert.match(migration, /sale\.metadata->>'source_module' = 'qr_validator'/);
  assert.match(migration, /stock_quantity = greatest\(0, product\.stock_quantity - movement\.quantity_sold\)/);
  assert.match(migration, /jsonb_set\(metadata, '\{products\}'/);
  assert.match(lifecycle, /recordInventoryProductSold/);
  assert.match(app, /Venta descontada del inventario/);
  assert.match(app, /await loadInventoryProducts\(\{ force: true, quiet: true \}\)/);
  assert.match(app, /inventory\/products\?limit=500&include_archived=true[\s\S]*noClientCache: Boolean\(options\.force\)/);
  assert.match(app, /inventory\/products\/\$\{productId\}\/insights[\s\S]*noClientCache: true/);
  assert.match(html, /validator-inventory-sale-v513-20260928/g);
});

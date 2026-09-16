const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const controller = fs.readFileSync(path.join(root, "backend", "src", "controllers", "businessPortalController.js"), "utf8");
const schema = fs.readFileSync(path.join(root, "database", "schema.sql"), "utf8");
const migration = fs.readFileSync(path.join(root, "database", "migrations", "202609160001_inventory_custom_tax_classification.sql"), "utf8");

test("la clasificación histórica admite una referencia fiscal personalizada", () => {
  assert.match(controller, /inventoryTaxClassificationSchema = z\.enum\(\[[^\]]*"CUSTOM"/);
  assert.match(controller, /configuredTaxCode[\s\S]*?: "CUSTOM"/);
  assert.match(schema, /business_inventory_products_tax_classification_check[\s\S]*?'CUSTOM'/);
});

test("el precio usa las tasas reales de IVA base e impuesto saludable", () => {
  assert.match(controller, /function inventorySellingPrice\(priceBeforeTax, classification = "EXEMPT", healthyTaxRate = 0, taxBaseRate = null\)/);
  assert.match(controller, /configuredTaxRate = taxBase \? Number\(taxBase\.rate \|\| 0\) : null/);
  assert.match(controller, /base \+ \(base \* resolvedTaxBaseRate\) \+ \(base \* Math\.max\(0, Number\(healthyTaxRate \|\| 0\)\)\)/);
  assert.match(controller, /inventorySellingPrice\(payload\.price_before_tax, resolved\.tax_classification, resolved\.healthy_tax_rate, resolved\.tax_base_rate\)/);
});

test("la migración reemplaza y valida la restricción de forma idempotente", () => {
  assert.match(migration, /drop constraint if exists business_inventory_products_tax_classification_check/);
  assert.match(migration, /add constraint business_inventory_products_tax_classification_check[\s\S]*?'CUSTOM'[\s\S]*?not valid/);
  assert.match(migration, /validate constraint business_inventory_products_tax_classification_check/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("inventory persists a dedicated positive redemption points cost on create and edit", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  assert.match(controller, /redemption_points_cost: z\.number\(\)\.int\(\)\.min\(1\)/);
  assert.match(controller, /redemption_points_cost: Number\(body\.redemption_points_cost \|\| 0\)/);
  assert.match(controller, /insert into business_inventory_products[\s\S]*redemption_points_cost/);
  assert.match(controller, /redemption_points_cost = \$14/);
});

test("inventory form and CSV keep COP price separate from redemption points", () => {
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  assert.match(html, /id="inventoryRedemptionPointsCostInput"[^>]*min="1"[^>]*step="1"[^>]*required/);
  assert.match(app, /redemption_points_cost: Number\(inventoryRedemptionPointsCostInput\?\.value \|\| 0\)/);
  assert.match(app, /costo_redencion_puntos/);
  assert.match(app, /Redención: \$\{escapeHtml\(Number\(product\.redemption_points_cost/);
});

test("schema migration preserves existing products as unconfigured instead of deriving points from COP", () => {
  const schema = read("database/schema.sql");
  const migration = read("database/migrations/20260927225021_affiliate_redemption_cost_points.sql");
  for (const sql of [schema, migration]) {
    assert.match(sql, /redemption_points_cost integer not null default 0/);
    assert.match(sql, /redemption_points_cost >= 0/);
  }
  assert.doesNotMatch(migration, /unit_price\s*\//);
});

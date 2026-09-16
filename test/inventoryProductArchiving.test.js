const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const routes = fs.readFileSync(path.join(root, "backend", "src", "routes", "businessPortalRoutes.js"), "utf8");
const controller = fs.readFileSync(path.join(root, "backend", "src", "controllers", "businessPortalController.js"), "utf8");

test("Productos carga los archivados sin ofrecerlos en nuevas ventas", () => {
  assert.match(app, /inventory\/products\?limit=500&include_archived=true/);
  assert.match(app, /function activeInventoryProducts\(\)[\s\S]*?status !== "ARCHIVED"/);
  assert.match(app, /mode === "archived" && status === "ARCHIVED"/);
  assert.match(app, /mode === "all" && status !== "ARCHIVED"/);
});

test("la tabla separa Archivar de Eliminar", () => {
  assert.match(app, /data-inventory-archive=/);
  assert.match(app, /data-inventory-delete=/);
  assert.match(app, /archiveInventoryProduct\(button\.dataset\.inventoryArchive\)/);
  assert.match(app, /deleteInventoryProduct\(button\.dataset\.inventoryDelete\)/);
  assert.match(app, /Puedes archivarlo para conservar el historial/);
});

test("archivar conserva el producto y registra su ciclo de vida", () => {
  assert.match(routes, /post\("\/inventory\/products\/:productId\/archive", archiveInventoryProduct\)/);
  assert.match(routes, /delete\("\/inventory\/products\/:productId", deleteInventoryProduct\)/);
  assert.match(controller, /set status = 'ARCHIVED', updated_at = now\(\)/);
  assert.match(controller, /action: "ARCHIVED", previous_status: product\.status, next_status: "ARCHIVED"/);
  assert.match(controller, /async function deleteInventoryProduct/);
});

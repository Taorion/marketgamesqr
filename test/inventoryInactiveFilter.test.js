const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");

test("Productos ofrece el filtro de productos inactivos", () => {
  assert.match(html, /id="inventoryQuickFilter"[^>]*>[\s\S]*?<option value="inactive">Inactivos<\/option>/);
  assert.match(html, /inventory-inactive-filter=v505-20260916/g);
});

test("el filtro inactivos selecciona solo productos con estado INACTIVE", () => {
  assert.match(app, /mode === "inactive" && status === "INACTIVE"/);
  assert.match(app, /mode === "all" && status !== "ARCHIVED"/);
  assert.match(app, /mode === "archived" && status === "ARCHIVED"/);
});

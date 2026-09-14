const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const routes = fs.readFileSync(path.join(root, "backend", "src", "routes", "smartCatalogRoutes.js"), "utf8");
const controller = fs.readFileSync(path.join(root, "backend", "src", "controllers", "smartCatalogController.js"), "utf8");
const service = fs.readFileSync(path.join(root, "backend", "src", "services", "smartCatalogService.js"), "utf8");

test("cada vitrina y producto muestra una accion de eliminar", () => {
  assert.match(app, /data-smart-catalog-delete=/);
  assert.match(app, /data-smart-product-delete=/);
  assert.match(app, /async function archiveSmartCatalog\(catalogId\)/);
  assert.match(app, /async function deleteSmartCatalogProduct\(productId\)/);
  assert.match(app, /deleteButton\.dataset\.smartCatalogDelete/);
  assert.match(app, /deleteButton\.dataset\.smartProductDelete/);
  assert.match(html, /catalog-delete-actions=v489-20260914/g);
});

test("las eliminaciones usan rutas protegidas y conservan historial", () => {
  assert.match(routes, /router\.delete\("\/:catalogId", businessArchive\)/);
  assert.match(routes, /router\.delete\("\/:catalogId\/products\/:productId", productsDelete\)/);
  assert.match(controller, /businessIdFor\(req\).*req\.params\.catalogId/s);
  assert.match(service, /set status = 'ARCHIVED'.*business_id = \$2/s);
  assert.match(service, /metadata = jsonb_set[\s\S]+\{archived\}[\s\S]+'true'::jsonb/);
  assert.match(service, /coalesce\(p\.metadata->>'archived', 'false'\) <> 'true'/);
});

test("la interfaz confirma antes de retirar datos visibles", () => {
  assert.ok(app.includes('¿Eliminar "${label}"? Se retirará del portal y de su enlace público. Los interesados y el historial comercial se conservarán.'));
  assert.ok(app.includes('¿Eliminar "${label}" de la vitrina? Dejará de mostrarse y no podrá seleccionarse en nuevas compras. El historial anterior se conservará.'));
  assert.match(app, /method: "DELETE"/g);
});

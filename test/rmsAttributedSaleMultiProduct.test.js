const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("empresa/js/app.js", "utf8");
const html = fs.readFileSync("empresa/index.html", "utf8");
const css = fs.readFileSync("empresa/css/portal-clean-v39.css", "utf8");
const controller = fs.readFileSync("backend/src/controllers/rmsMachineController.js", "utf8");
const service = fs.readFileSync("backend/src/services/rmsMachineService.js", "utf8");
const leadService = fs.readFileSync("backend/src/services/leadCrmService.js", "utf8");

test("la estación RMS permite varias líneas de producto en una sola venta", () => {
  assert.match(app, /data-rms-sale-products=/);
  assert.match(app, /data-rms-sale-add-product=/);
  assert.match(app, /Agregar otro producto/);
  assert.match(app, /data-rms-sale-product-line/);
  assert.match(app, /data-rms-sale-remove-product/);
  assert.match(app, /products,\s*inventory_product_id: primaryProduct/);
  assert.match(app, /body: JSON\.stringify\(\{ source_id: item\.source_id[\s\S]+\.\.\.draft/);
});

test("el cálculo del carrito suma productos, unidades, revenue y costo", () => {
  const source = app.slice(app.indexOf("function rmsAttributedSaleCartTotals"), app.indexOf("function rmsSaleProductLineMarkup"));
  const totals = Function(`${source}; return rmsAttributedSaleCartTotals;`)();
  assert.deepEqual(totals([
    { inventory_product_id: "p1", quantity: 2, unit_price: 15000, unit_cost: 7000 },
    { inventory_product_id: "p2", quantity: 1, unit_price: 42000, unit_cost: 19000 },
  ]), { product_count: 2, quantity: 3, sale_amount: 72000, product_cost_total: 33000 });
});

test("el endpoint valida hasta 50 productos y conserva compatibilidad", () => {
  assert.match(controller, /const attributedSaleProductSchema = z\.object/);
  assert.match(controller, /products: z\.array\(attributedSaleProductSchema\)\.min\(1\)\.max\(50\)\.optional\(\)/);
  assert.match(controller, /inventory_product_id: z\.string\(\)\.uuid\(\)\.optional\(\)\.nullable\(\)/);
  assert.match(service, /const requestedProductLines = Array\.isArray\(payload\.products\)/);
  assert.match(service, /payload\.inventory_product_id[\s\S]+unit_cost: payload\.unit_cost/);
});

test("la venta persiste el desglose y sus economías en el ledger canónico", () => {
  assert.match(service, /const normalizedProducts = productLines\.map/);
  assert.match(service, /products: normalizedProducts/);
  assert.match(service, /product_count: normalizedProducts\.length/);
  assert.match(service, /economics = \{ product_count: normalizedProducts\.length[\s\S]+products: normalizedProducts \}/);
  assert.match(service, /insert into business_sales/);
  assert.match(service, /where business_id = \$1 and idempotency_key = \$2/);
  assert.match(service, /rms_sale_products: normalizedProducts/);
});

test("el historial del lead muestra responsable, hasta 80 movimientos y productos", () => {
  assert.match(leadService, /actor\.full_name as actor_name/);
  assert.match(leadService, /actor\.business_id = rme\.business_id/);
  assert.match(leadService, /limit 80/);
  assert.match(app, /function rmsCaptureHistoryProductsMarkup/);
  assert.match(app, /Historial operativo detallado/);
  assert.match(app, /event\.actor_name \|\| "Sistema Qori"/);
  assert.match(app, /Cantidad \$\{quantity\} · Unitario/);
});

test("los activos versionados y el responsive móvil incluyen la mejora", () => {
  assert.match(app, /rms-sale-multiproduct-history-v397-20260829/);
  assert.match(html, /rms-sale=multiproduct-history-v397-20260829/);
  assert.match(html, /rms-sale-multiproduct-history-v397/);
  assert.match(css, /rms-sale-multiproduct-history-v397-20260829/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]+\.rms-sale-product-line \{ grid-template-columns: minmax\(0, 1fr\)/);
});

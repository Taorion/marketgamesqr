const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("product QR generation and validation are authenticated and tenant scoped", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  assert.match(routes, /router\.get\("\/inventory\/product-qr\/:productId", getInventoryProductQr\)/);
  assert.match(routes, /router\.get\("\/inventory\/product-qr\/:productId\/validate", validateInventoryProductQr\)/);
  assert.match(controller, /product\.id = \$1[\s\S]*product\.business_id = \$2[\s\S]*product\.status <> 'ARCHIVED'/);
  assert.match(controller, /product_qr=\$\{encodeURIComponent\(productId\)\}/);
  assert.match(controller, /QRCode\.toDataURL\(validatorUrl/);
});

test("inventory exposes printable and downloadable product QR actions", () => {
  const app = read("empresa/js/app.js");
  const qrUi = read("empresa/js/inventory-product-qr.js");
  assert.match(app, /data-inventory-qr=/);
  assert.match(qrUi, /data-download-inventory-qr/);
  assert.match(qrUi, /data-print-inventory-qr/);
  assert.match(app, /if \(isNewProduct\) await openInventoryProductQr\(saved\.id\)/);
  assert.match(qrUi, /Escanea en el Validador Qori para registrar la venta/);
});

test("validator recognizes a product QR and registers a canonical inventory-linked sale", () => {
  const app = read("empresa/js/app.js");
  assert.match(app, /function extractInventoryProductQrId\(rawValue\)/);
  assert.match(app, /kind === "inventory_product"/);
  assert.match(app, /inventory\/product-qr\/\$\{encodeURIComponent\(productId\)\}\/validate/);
  assert.match(app, /mergeValidatorScannedProduct\(state\.validatorPurchaseItems, scannedProduct/);
  assert.match(app, /api\("\/api\/business\/customer-acquisition-sales"/);
  assert.match(app, /sale_entry: "validator_product_qr"/);
  assert.match(app, /acquisition_source: "QR_SCAN"/);
});

test("product QR exposes and preserves inventory before the sale deduction", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const app = read("empresa/js/app.js");
  const html = read("empresa/index.html");
  assert.match(controller, /inventory_before_sale:\s*\{[\s\S]*stock_quantity: Number\(product\.stock_quantity \|\| 0\)/);
  assert.match(app, /stock_quantity_before_sale: data\.inventory_before_sale\?\.stock_quantity/);
  assert.match(app, /Inventario actual antes de esta venta:/);
  assert.match(app, /Inventario antes de la venta:/);
  assert.match(html, /validator-inventory-before-sale-v511-20260928/g);
});

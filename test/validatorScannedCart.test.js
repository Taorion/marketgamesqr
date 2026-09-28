const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa/js/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa/index.html"), "utf8");

function loadMergeHelper() {
  const start = app.indexOf("function mergeValidatorScannedProduct");
  const end = app.indexOf("function validatorOpenCartSnapshot", start);
  assert.ok(start >= 0 && end > start, "Debe existir el acumulador puro de productos escaneados");
  const context = {};
  vm.runInNewContext(`${app.slice(start, end)}; this.merge = mergeValidatorScannedProduct;`, context);
  return context.merge;
}

test("cada QR de un producto distinto agrega una linea sin reemplazar la anterior", () => {
  const merge = loadMergeHelper();
  const create = (seed) => ({ id: `line-${seed.inventory_product_id}`, ...seed });
  let result = merge([], { id: "product-a", name: "Cafe", unit_price: 12000, stock_quantity: 7, unit_label: "unidades" }, create);
  result = merge(result.items, { id: "product-b", name: "Torta", unit_price: 8000 }, create);
  assert.equal(result.items.length, 2);
  assert.deepEqual(Array.from(result.items, (item) => item.inventory_product_id), ["product-a", "product-b"]);
  assert.equal(result.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0), 20000);
  assert.equal(result.items[0].stock_quantity_before_sale, 7);
});

test("escanear nuevamente el mismo producto suma cantidad", () => {
  const merge = loadMergeHelper();
  const create = (seed) => ({ id: "line-a", ...seed });
  let result = merge([], { id: "product-a", name: "Cafe", unit_price: 12000 }, create);
  result = merge(result.items, { id: "product-a", name: "Cafe", unit_price: 12000 }, create);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].quantity, 2);
});

test("el escaneo de un beneficio conserva la canasta y fuerza modo compra", () => {
  const validationStart = app.indexOf("async function validateValidatorToken");
  const validationEnd = app.indexOf("async function redeemValidatorToken", validationStart);
  const flow = app.slice(validationStart, validationEnd);
  assert.match(flow, /const openCart = validatorOpenCartSnapshot\(\)/);
  assert.match(flow, /state\.validatorPurchaseItems = openCart\.purchaseItems\.map/);
  assert.match(flow, /data\.benefit_application\?\.purchase_required \|\| openCart \? "PURCHASE" : "STANDALONE"/);
  assert.match(flow, /mergeValidatorScannedProduct\(state\.validatorPurchaseItems, scannedProduct/);
  assert.match(html, /validator-inventory-before-sale-v511-20260928/g);
});

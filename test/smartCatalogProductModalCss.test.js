const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "smart-catalog-product-modal.css"), "utf8");

test("el CSS dedicado del modal de producto carga al final", () => {
  const readable = html.indexOf("portal-readable-density.css");
  const modal = html.indexOf("smart-catalog-product-modal.css?v=smart-catalog-product-modal-v1-20260914");
  assert.ok(readable >= 0);
  assert.ok(modal > readable);
});

test("el formulario movido a body recupera rejilla y desplazamiento interno", () => {
  assert.match(css, /body > #smartCatalogProductModal \.smart-catalog-form[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /body > #smartCatalogProductModal \.smart-catalog-form[\s\S]*?overflow-y:\s*auto !important/);
  assert.match(css, /grid-template-rows:\s*max-content minmax\(0, 1fr\) !important/);
  assert.match(css, /border-radius:\s*0 !important/);
});

test("a 390 por 844 el modal ocupa el viewport y mantiene acciones alcanzables", () => {
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*?width:\s*100vw !important[\s\S]*?height:\s*100dvh !important/);
  assert.match(css, /button\[type="submit"\][\s\S]*?width:\s*100% !important/);
});

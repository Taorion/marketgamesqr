const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const controller = fs.readFileSync(path.join(root, "backend", "src", "controllers", "businessPortalController.js"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");

test("el catálogo devuelve el plural correcto para impuestos saludables", () => {
  assert.match(
    controller,
    /"healthy-taxes":\s*\{[^}]*key:\s*"healthy_tax"[^}]*responseKey:\s*"healthy_taxes"/
  );
  assert.match(controller, /res\.json\(\{ \[definition\.responseKey\]: result\.rows \}\)/);
  assert.doesNotMatch(controller, /definition\.key \+ "s"/);
});

test("Nuevo producto consume el mismo contrato y despliega las referencias creadas", () => {
  assert.match(app, /apiSafe\("\/api\/business\/inventory\/catalog\/healthy-taxes"/);
  assert.match(app, /healthyTaxesData\.healthy_taxes/);
  assert.match(app, /inventoryHealthyTaxInput\.innerHTML = selectOptions\(state\.inventoryHealthyTaxes/);
});

test("crear un impuesto saludable lo agrega al estado y vuelve a renderizar los selectores", () => {
  assert.match(app, /catalog === "healthy-taxes" \? "inventoryHealthyTaxes"/);
  assert.match(app, /catalog === "healthy-taxes" \? "healthy_tax"/);
  assert.match(app, /state\[key\] = \[\.\.\.\(state\[key\] \|\| \[\]\), data\[resultKey\]\]/);
  assert.match(app, /renderInventoryTaxonomyOptions\(\)/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const portalHtml = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const portalApp = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");

test("Qori portal consistently uses the official fabrica de ingresos brand promise", () => {
  assert.match(portalHtml, /Qori \| Tu fábrica de ingresos/);
  assert.match(portalHtml, /Entra a tu fábrica de ingresos/);
  assert.match(portalHtml, /<p>Tu fábrica de ingresos<\/p>/);
  assert.match(portalApp, /Fábrica de ingresos lista/);
  assert.doesNotMatch(`${portalHtml}\n${portalApp}`, /m[aá]quina de ventas/i);
});

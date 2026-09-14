const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");

test("Vitrina web no muestra ni conecta la acción Usar plantilla", () => {
  assert.doesNotMatch(html, /id="smartCatalogSeedDoctorAngieButton"/);
  assert.doesNotMatch(app, /smartCatalogSeedDoctorAngieButton/);
});

test("las acciones principales de Vitrina web permanecen disponibles", () => {
  assert.match(html, /id="smartCatalogCreateButton"/);
  assert.match(html, /id="smartCatalogRefreshButton"/);
});

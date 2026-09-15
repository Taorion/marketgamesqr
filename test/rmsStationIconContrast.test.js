const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "rms-station-icon-contrast.css"), "utf8");

test("la capa de contraste se carga al final de los estilos del portal", () => {
  const previousLayer = html.indexOf("account-company-brand.css");
  const iconLayer = html.indexOf("rms-station-icon-contrast.css?v=rms-station-icon-contrast-v1-20260914");
  assert.ok(previousLayer >= 0);
  assert.ok(iconLayer > previousLayer);
});

test("los iconos de identidad de todas las vistas de estación son blancos", () => {
  for (const selector of [
    ".rms-stage-slider-title > .material-symbols-outlined",
    ".rms-station-entry-main > .material-symbols-outlined",
    ".rms-station-primary-brief > .material-symbols-outlined",
    ".rms-stage-quick-item > .material-symbols-outlined:not(.rms-stage-quick-arrow)",
    ".rms-lean-station-title > .rms-lean-station-symbol",
  ]) {
    assert.ok(css.includes(selector), `Falta proteger ${selector}`);
  }
  assert.match(css, /color: #ffffff !important;[\s\S]*?-webkit-text-fill-color: #ffffff !important/);
  assert.match(css, /background: linear-gradient\(145deg, #0341b3, #087d9a\) !important/);
});

test("el icono reportado travel_explore sigue viniendo del modelo real de estaciones", () => {
  assert.match(app, /key: "recoleccion",[\s\S]*?icon: "travel_explore"/);
  assert.match(app, /rms-station-primary-brief[\s\S]*?<span class="material-symbols-outlined" aria-hidden="true">\$\{escapeHtml\(visual\.icon\)\}<\/span>/);
});

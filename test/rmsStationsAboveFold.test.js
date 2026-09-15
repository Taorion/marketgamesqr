const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "rms-stations-above-fold.css"), "utf8");

test("la capa de prioridad visual RMS carga despues de las correcciones previas", () => {
  const iconLayer = html.indexOf("rms-station-icon-contrast.css");
  const foldLayer = html.indexOf("rms-stations-above-fold.css?v=rms-stations-above-fold-v1-20260914");
  assert.ok(iconLayer >= 0);
  assert.ok(foldLayer > iconLayer);
});

test("las estaciones aparecen antes de las herramientas sin perderlas", () => {
  assert.match(css, /\.rms-factory-console > \.rms-stage-slider-shell \{[\s\S]*?order: 1 !important/);
  assert.match(css, /\.rms-factory-console > \.rms-board-tools \{[\s\S]*?order: 3 !important/);
  assert.match(css, /\.rms-factory-console > \.rms-station-workspace \{[\s\S]*?order: 2 !important/);
  assert.match(css, /\.rms-factory-console > \.rms-quality-control-access \{[\s\S]*?order: 4 !important/);
  assert.match(html, /<section class="rms-board-tools"/);
});

test("la cabecera de estaciones se compacta para 1200 por 700 y movil", () => {
  assert.match(css, /gap: 12px !important;[\s\S]*?padding: 10px 12px 16px !important/);
  assert.match(css, /\.rms-stage-slider-head \{[\s\S]*?min-height: 48px !important;[\s\S]*?padding: 0 0 6px !important/);
  assert.match(css, /@media \(max-width: 1280px\), \(max-height: 760px\)/);
  assert.match(css, /@media \(max-width: 580px\)/);
});

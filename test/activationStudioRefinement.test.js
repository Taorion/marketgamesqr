const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "activation-studio-refinement.css"), "utf8");

test("la mejora de Activation Studio carga como ultima capa", () => {
  const priorLayer = html.indexOf("rms-stations-above-fold.css");
  const activationLayer = html.indexOf("activation-studio-refinement.css?v=activation-studio-refinement-v1-20260914");
  assert.ok(priorLayer >= 0);
  assert.ok(activationLayer > priorLayer);
});

test("la portada, operacion, flujo y KPI tienen una densidad operativa coherente", () => {
  assert.match(css, /\.activation-premium-head \{[\s\S]*?min-height: 176px !important;[\s\S]*?border-radius: 18px !important/);
  assert.match(css, /\.activation-premium-command \{[\s\S]*?padding: 14px 16px !important/);
  assert.match(css, /\.activation-premium-flow \{[\s\S]*?padding: 12px 14px !important/);
  assert.match(css, /\.activation-premium-kpi \{[\s\S]*?min-height: 82px !important/);
});

test("biblioteca y controles conservan jerarquia y respuesta movil", () => {
  assert.match(css, /\.gaming-activation-list-card > \.table-card-head \{[\s\S]*?min-height: 82px !important/);
  assert.match(css, /\.gaming-published-toolbar \{[\s\S]*?padding: 11px 16px !important/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 460px\)/);
  assert.match(css, /#strategicQrKpiGrid\.activation-premium-kpi-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
});

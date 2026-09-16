const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "empresa", "css", "contacts-premium-v333.css"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");

test("las metricas del directorio tienen un encabezado aislado y sin superposiciones", () => {
  assert.match(css, /Contactos v508: metricas del directorio sin textos superpuestos/);
  assert.match(css, /#leadFeedKpiGrid > \.collapsible-kpi-panel > summary \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(360px, auto\) !important/);
  assert.match(css, /#leadFeedKpiGrid \.collapsible-kpi-title > :is\(strong, small\) \{[\s\S]*overflow-wrap: anywhere !important;[\s\S]*white-space: normal !important/);
  assert.match(css, /#leadFeedKpiGrid \.collapsible-kpi-summary > span \{[\s\S]*position: static !important;[\s\S]*white-space: normal !important/);
  assert.match(css, /#leadFeedKpiGrid \.collapsible-kpi-title > \.material-symbols-outlined \{[\s\S]*overflow: hidden !important;[\s\S]*font-size: 0 !important/);
});

test("las nueve tarjetas KPI distribuyen y envuelven su contenido", () => {
  assert.match(css, /#leadFeedKpiGrid \.collapsible-kpi-grid \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /#leadFeedKpiGrid \.collapsible-kpi-grid > \.kpi-card \{[\s\S]*grid-template-rows: auto auto 1fr !important/);
  assert.match(css, /#leadFeedKpiGrid \.collapsible-kpi-grid > \.kpi-card > \* \{[\s\S]*overflow-wrap: anywhere !important;[\s\S]*white-space: normal !important/);
});

test("en movil el resumen y las tarjetas usan una sola columna", () => {
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*#leadFeedKpiGrid \.collapsible-kpi-summary,[\s\S]*#leadFeedKpiGrid \.collapsible-kpi-grid \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(html, /directory-metrics-layout=v508-20260916/);
});

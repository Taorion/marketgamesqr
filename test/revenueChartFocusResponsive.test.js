const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "revenue-chart-focus-responsive.css"), "utf8");

test("la capa responsive del detalle de Revenue carga al final", () => {
  const responsiveIndex = html.indexOf("revenue-chart-focus-responsive.css");
  assert.ok(responsiveIndex > html.indexOf("mobile-shell-guard.css"));
  assert.ok(responsiveIndex > html.indexOf("portal-compact-1200x700.css"));
  assert.ok(responsiveIndex > html.indexOf("portal-readable-density.css"));
  assert.ok(responsiveIndex > html.indexOf("rms-new-lead-modal.css"));
});

test("a 1200 por 700 la grafica deja de imponer una altura que corta el detalle", () => {
  assert.match(css, /@media \(max-width: 1360px\), \(max-height: 760px\)/);
  assert.match(css, /grid-template-rows: minmax\(230px, 1fr\) auto minmax\(96px, \.38fr\)/);
  assert.match(css, /\.chart-focus-stage canvas \{[\s\S]*?min-height: 230px;[\s\S]*?height: 100%/);
});

test("en movil restaura el grid, scroll interno y cierre visible", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.chart-focus-overlay[\s\S]*?display: grid !important;[\s\S]*?height: 100dvh !important/);
  assert.match(css, /\.chart-focus-layout \{[\s\S]*?overflow-y: auto/);
  assert.match(css, /button\[data-focus-close\][\s\S]*?position: absolute/);
  assert.match(css, /\.data-explanation-panel,[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});

test("las tablas anchas usan todo el ancho y un solo scroll desde 1200", () => {
  assert.match(css, /@media \(max-width: 1200px\)/);
  assert.match(css, /\.chart-focus-stage:has\(> \.command-table-wrap\) \{[\s\S]*?overflow: hidden/);
  assert.match(css, /\.chart-focus-stage > \.command-table-wrap \{[\s\S]*?overflow: auto !important/);
  assert.match(css, /\.command-table:has\(th:nth-child\(10\)\) \{[\s\S]*?min-width: 1380px !important;[\s\S]*?overflow: visible !important/);
  assert.match(css, /\.command-table :is\(th, td\):first-child \{[\s\S]*?position: sticky !important;[\s\S]*?left: 0 !important/);
  assert.match(css, /@media \(max-width: 1200px\) \{[\s\S]*?\.chart-focus-stage:has\(> \.command-table-wrap\) \{[\s\S]*?height: clamp\(320px, 54vh, 480px\)/);
  assert.match(html, /revenue-chart-focus-responsive-v2-20260914/);
});

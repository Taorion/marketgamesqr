const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "rms-station-tables.css"), "utf8");

test("la capa de tablas RMS carga al final y solo afecta las estaciones", () => {
  const layerIndex = html.indexOf("rms-station-tables.css");
  assert.ok(layerIndex > html.indexOf("portal-readable-density.css"));
  assert.ok(layerIndex > html.indexOf("revenue-chart-focus-responsive.css"));
  assert.match(css, /#rmsStationWorkspace/);
  assert.doesNotMatch(css, /\.portal-shell\s+\.table-wrap\s*\{/);
  assert.equal((html.match(/rms-station-tables=v493-20260914/g) || []).length, 2);
});

test("escritorio conserva encabezado y acciones al desplazar datos", () => {
  assert.match(css, /max-height: clamp\(340px, 56dvh, 640px\)/);
  assert.match(css, /thead th \{[\s\S]*?position: sticky !important;[\s\S]*?background: #082f49 !important/);
  assert.match(css, /thead th:last-child \{[\s\S]*?right: 0 !important/);
  assert.match(css, /tbody td:last-child \{[\s\S]*?position: sticky !important;[\s\S]*?right: 0 !important/);
  assert.match(css, /text-overflow: clip !important;[\s\S]*?white-space: normal !important/);
});

test("movil convierte cada fila en una ficha legible", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /tbody tr \{[\s\S]*?display: grid !important;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(css, /tbody td::before \{[\s\S]*?content: attr\(data-label\) !important/);
  assert.match(css, /tbody td > \* \{[\s\S]*?grid-column: 2 !important/);
  assert.match(app, /<td data-label="Lead">/);
  assert.match(app, /<td data-label="Origen">/);
  assert.match(app, /<td data-label="Interés">/);
  assert.match(app, /<td data-label="Acciones" class="rms-lean-actions-cell">/);
});

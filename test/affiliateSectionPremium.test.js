const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "affiliates-section-premium.css"), "utf8");

test("la capa premium de Afiliados carga al final del portal", () => {
  const marker = "affiliates-section-premium.css?v=affiliates-section-premium-v2-20260914";
  assert.ok(html.includes(marker));
  assert.ok(html.indexOf(marker) > html.indexOf("rms-station-tables.css"));
});

test("la jerarquia visual usa la paleta Qori sin tarjetas sobredimensionadas", () => {
  assert.match(css, /--affiliate-navy: #031e50;/);
  assert.match(css, /--affiliate-blue: #0759d6;/);
  assert.match(css, /--affiliate-cyan: #00bfe5;/);
  assert.match(css, /> \.view-head \{[\s\S]*?linear-gradient\(118deg, var\(--affiliate-navy\), #0759d6/);
  assert.match(css, /:is\(\.affiliate-command-card,[\s\S]*?border-radius: 10px !important;[\s\S]*?box-shadow: var\(--affiliate-shadow\) !important/);
});

test("el centro de afiliados se adapta a escritorio compacto y movil", () => {
  assert.match(css, /@media \(max-width: 1280px\)[\s\S]*?\.affiliate-dashboard-grid \{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.affiliate-command-strip \{[\s\S]*?minmax\(0, 1\.45fr\) minmax\(240px, \.8fr\)/);
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?:is\(\.affiliate-command-strip, \.affiliate-finder-grid\)[\s\S]*?minmax\(0, 1fr\)/);
  assert.match(css, /\.affiliate-quick-nav \{[\s\S]*?overflow-x: auto !important/);
});

test("el directorio neutraliza recortes y mantiene acciones legibles", () => {
  assert.match(css, /#affiliateListPanel table \{[\s\S]*?min-width: 900px !important;[\s\S]*?overflow: visible !important/);
  assert.match(css, /#affiliateTable \.affiliate-table-main strong,[\s\S]*?text-overflow: clip !important;[\s\S]*?white-space: normal !important/);
  assert.match(css, /#affiliateTable \.affiliate-row-actions \{[\s\S]*?grid-template-columns: 1fr 1fr 1\.12fr !important/);
  assert.match(css, /\[data-affiliate-delete\][\s\S]*?color: #a33a3a !important/);
});

test("la tabla conserva nombre y encabezado al desplazarse en escritorio", () => {
  assert.match(css, /#affiliateListPanel th \{[\s\S]*?position: sticky !important;[\s\S]*?top: 0 !important/);
  assert.match(css, /#affiliateListPanel :is\(th, td\):first-child \{[\s\S]*?position: sticky !important;[\s\S]*?left: 0 !important/);
  assert.match(css, /#affiliateListPanel :is\(th, td\):last-child \{[\s\S]*?position: static !important/);
  assert.match(css, /#affiliateListPanel > \.table-wrap \{[\s\S]*?overflow: auto !important/);
});

test("en movil cada afiliado se convierte en una ficha sin scroll lateral", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /#affiliateListPanel table,[\s\S]*?#affiliateListPanel tbody \{[\s\S]*?display: block !important;[\s\S]*?min-width: 0 !important/);
  assert.match(css, /#affiliateTable tr \{[\s\S]*?display: grid !important/);
  assert.match(css, /#affiliateTable td \{[\s\S]*?inline-size: 100% !important;[\s\S]*?max-width: 100% !important/);
  assert.match(css, /#affiliateTable td:first-child \{[\s\S]*?position: static !important;[\s\S]*?left: auto !important/);
  assert.match(css, /td:nth-child\(2\)::before \{ content: "Contacto" !important; \}/);
  assert.match(css, /#affiliateTable \.affiliate-row-actions \{[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
});

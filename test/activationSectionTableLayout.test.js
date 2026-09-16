const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "empresa", "css", "activations-premium.css"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");

test("la seccion de Activaciones usa un lienzo centrado y espaciado consistente", () => {
  assert.match(css, /Activation table layout v507: final cascade guard/);
  assert.match(css, /ticket-center-panel\[data-ticket-panel="trivia"\] > \.charts-grid[\s\S]*max-width: 1360px !important; margin-inline: auto !important/);
  assert.match(css, /gaming-activation-list-card \{[\s\S]*max-width: 1360px !important; margin: 0 auto 32px !important/);
  assert.match(css, /gaming-activation-list-card \.table-wrap \{[\s\S]*width: calc\(100% - 48px\) !important[\s\S]*margin: 20px auto 24px !important/);
  assert.match(css, /body:not\(#qoriActivationTableA[\s\S]*\.gaming-published-toolbar \{[\s\S]*grid-template-columns: minmax\(0,1fr\) !important/);
  assert.match(css, /body:not\(#qoriActivationTableA[\s\S]*\.gaming-published-status-pills \{[\s\S]*grid-template-columns: repeat\(4,minmax\(112px,1fr\)\) !important/);
});

test("las cinco columnas actuales quedan alineadas sin reutilizar anchos legacy", () => {
  assert.match(html, /<th class="bulk-table-select">[\s\S]*?<th>Activaci.n<\/th>[\s\S]*?<th>Estado<\/th>[\s\S]*?<th>Resultado<\/th>[\s\S]*?<th aria-label="Acciones">Operaci.n<\/th>/);
  assert.match(css, /th:first-child,[\s\S]*td:first-child \{ width: 52px !important/);
  assert.match(css, /th:nth-child\(2\),[\s\S]*td:nth-child\(2\) \{ width: 36% !important/);
  assert.match(css, /th:nth-child\(3\),[\s\S]*td:nth-child\(3\) \{ width: 15% !important; text-align: center !important/);
  assert.match(css, /th:nth-child\(4\),[\s\S]*td:nth-child\(4\) \{ width: 25% !important; text-align: center !important/);
  assert.match(css, /th:last-child,[\s\S]*td:last-child \{[\s\S]*width: 190px !important[\s\S]*text-align: center !important/);
});

test("la vista movil conserva tarjetas sin desborde horizontal", () => {
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*table-wrap \{[\s\S]*width: calc\(100% - 24px\) !important[\s\S]*margin: 14px auto 20px !important/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*:is\(table,tbody,tr,td\)[\s\S]*display: block !important/);
  assert.match(html, /activation-table-layout=v507-20260916/);
});

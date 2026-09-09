const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("la barra de activaciones publicadas reserva una fila para cada bloque", () => {
  const css = read("empresa/css/portal-clean-v39.css");
  const finalLayer = css.slice(css.indexOf("Activaciones publicadas v465"));

  assert.match(finalLayer, /\.gaming-published-toolbar \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(finalLayer, /\.gaming-published-toolbar-main \{[\s\S]*minmax\(220px, 1fr\)[\s\S]*minmax\(160px, 220px\)[\s\S]*max-content/);
  assert.match(finalLayer, /\.gaming-published-toolbar-main > \* \{[\s\S]*min-width: 0/);
  assert.match(finalLayer, /\.gaming-published-toolbar-main > strong \{[\s\S]*white-space: normal/);
});

test("buscador, selector y estados se adaptan a baja resolución", () => {
  const html = read("empresa/index.html");
  const css = read("empresa/css/portal-clean-v39.css");
  const finalLayer = css.slice(css.indexOf("Activaciones publicadas v465"));

  assert.match(finalLayer, /gaming-published-status-pills \{[\s\S]*repeat\(auto-fit, minmax\(112px, 1fr\)\)/);
  assert.match(finalLayer, /@media \(max-width: 620px\)[\s\S]*gaming-published-toolbar-main[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(finalLayer, /@media \(max-width: 620px\)[\s\S]*gaming-published-status-pills[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(finalLayer, /@media \(max-width: 360px\)[\s\S]*gaming-published-status-pills[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(finalLayer, /gaming-published-status-pills button \{[\s\S]*white-space: normal[\s\S]*overflow-wrap: anywhere/);
  assert.match(html, /published-toolbar-v465-20260909/);
});

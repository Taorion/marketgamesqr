const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const player = fs.readFileSync(path.join(root, "activacion", "activation.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "empresa", "css", "styles.css"), "utf8");

test("Conectores usa un editor visual de parejas y no una sintaxis de texto", () => {
  assert.match(app, /type:\s*"connector_pairs"/);
  assert.match(app, /data-connector-left/);
  assert.match(app, /data-connector-right/);
  assert.match(app, /data-connector-pair-add/);
  assert.match(app, /data-connector-pair-remove/);
  assert.doesNotMatch(app, /function parseConnectorPairs/);
  assert.doesNotMatch(app, /formato: izquierda = derecha/);
});

test("Conectores persiste pares estructurados y valida relaciones completas y unicas", () => {
  assert.match(app, /config\.pairs = connectorPairDrafts\(\)/);
  assert.match(app, /key:\s*index,\s*\n\s*left:/);
  assert.match(app, /const incomplete = pairs\.find\(\(pair\) => !pair\.left \|\| !pair\.right\)/);
  assert.match(app, /new Set\(normalizedLeft\)\.size !== pairs\.length/);
  assert.match(app, /new Set\(normalizedRight\)\.size !== pairs\.length/);
  assert.match(app, /\.slice\(0, 8\)/);
});

test("El juego publico mezcla el lado derecho y conserva la clave de cada pareja", () => {
  assert.match(player, /function connectorPairsFromConfig/);
  assert.match(player, /function shuffledConnectorOptions/);
  assert.match(player, /item\.key === index/);
  assert.match(player, /options\.push\(options\.shift\(\)\)/);
  assert.match(player, /selected\.key === right\.key/);
  assert.match(player, /createConnectorBoard\(pairs, width, height\)/);
});

test("El editor de Conectores tiene una disposicion movil sin desbordamiento horizontal", () => {
  assert.match(styles, /\.connector-pair-row\s*\{/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /grid-template-columns:\s*30px minmax\(0, 1fr\) 40px/);
});

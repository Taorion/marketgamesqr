const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "empresa/css/portal-compact-1200x700.css"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa/index.html"), "utf8");

test("el buscador de productos reserva espacio para la lupa", () => {
  assert.match(css, /data-current-view="validator"[^\{]+\.validator-product-search-control input\s*\{[^}]*padding:\s*7px 12px 7px 42px\s*!important/s);
  assert.match(css, /\.validator-product-search-control > \.material-symbols-outlined\s*\{[^}]*left:\s*12px\s*!important[^}]*width:\s*18px\s*!important/s);
  assert.match(css, /text-overflow:\s*ellipsis\s*!important/);
});

test("la correccion se sirve desde la ultima hoja compacta", () => {
  assert.match(html, /portal-compact-1200x700\.css\?v=portal-compact-v3-validator-search-20260928/);
  assert.ok(
    html.lastIndexOf("portal-compact-1200x700.css") > html.lastIndexOf("portal-clean-v39.css"),
    "La excepcion debe cargar despues de las reglas generales del Validador"
  );
});

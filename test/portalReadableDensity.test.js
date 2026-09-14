const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "portal-readable-density.css"), "utf8");

test("la capa legible se carga después de la compactación", () => {
  const compact = html.indexOf("portal-compact-1200x700.css");
  const readable = html.indexOf("portal-readable-density.css?v=portal-readable-v1-20260914");
  assert.ok(compact >= 0);
  assert.ok(readable > compact);
});

test("el menú recupera ancho, altura, descripciones y desplazamiento", () => {
  assert.match(css, /--qori-readable-sidebar:\s*244px/);
  assert.match(css, /\.sidebar-nav[\s\S]*?overflow-y:\s*auto !important/);
  assert.match(css, /\.nav-item strong[\s\S]*?font-size:\s*\.82rem !important[\s\S]*?line-height:\s*1\.3 !important/);
  assert.match(css, /\.nav-item small[\s\S]*?display:\s*block !important/);
  assert.match(css, /\.nav-item small[\s\S]*?font-size:\s*\.72rem !important/);
  assert.match(css, /nav-item, \.sidebar-primary-nav-item\)[\s\S]*?min-height:\s*42px !important/);
});

test("textos, controles y tablas dejan de recortarse", () => {
  assert.match(css, /font-size:\s*14px !important/);
  assert.match(css, /table td :is\(strong, small\)[\s\S]*?overflow:\s*visible !important[\s\S]*?white-space:\s*normal !important/);
  assert.match(css, /table :is\(th, td\)[\s\S]*?line-height:\s*1\.45 !important/);
  assert.match(css, /min-height:\s*40px !important/);
});

test("la salida móvil conserva el lienzo completo y un menú cómodo", () => {
  assert.match(css, /@media \(max-width: 960px\)[\s\S]*?\.app-main,[\s\S]*?width:\s*100% !important/);
  assert.match(css, /\.sidebar[\s\S]*?width:\s*min\(88vw, 300px\) !important/);
});

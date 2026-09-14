const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "competition-workflow-contrast.css"), "utf8");

test("la capa de contraste del Radar se carga al final del portal", () => {
  const menuLayer = html.indexOf("portal-menu-toggle.css");
  const radarLayer = html.indexOf("competition-workflow-contrast.css?v=competition-workflow-contrast-v1-20260914");
  assert.ok(menuLayer >= 0);
  assert.ok(radarLayer > menuLayer);
});

test("el flujo usa una superficie clara con textos oscuros explícitos", () => {
  assert.match(css, /\.competition-radar-workflow \{[\s\S]*?color: #123f63 !important;[\s\S]*?background: linear-gradient/);
  assert.match(css, /\.competition-radar-workflow-copy > strong \{[\s\S]*?color: #123f63 !important;[\s\S]*?-webkit-text-fill-color: #123f63 !important/);
  assert.match(css, /\.competition-radar-workflow-copy \.mono-label \{[\s\S]*?color: #087493 !important/);
});

test("cada paso conserva contraste en título y descripción", () => {
  assert.match(css, /\.competition-radar-steps strong \{[\s\S]*?color: #17496b !important/);
  assert.match(css, /\.competition-radar-steps small \{[\s\S]*?color: #526f86 !important;[\s\S]*?opacity: 1 !important/);
  assert.match(css, /\.competition-radar-steps li > span \{[\s\S]*?background: #087d9a !important/);
});

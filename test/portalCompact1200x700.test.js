const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "portal-compact-1200x700.css"), "utf8");

test("la capa compacta se carga de ultima en el portal", () => {
  const premiumIndex = html.indexOf("affiliates-modal-premium.css");
  const compactIndex = html.indexOf("portal-compact-1200x700.css?v=portal-compact-v1-20260914");

  assert.ok(premiumIndex >= 0);
  assert.ok(compactIndex > premiumIndex);
});

test("el escritorio usa el espacio disponible en 1200 por 700", () => {
  assert.match(css, /--qori-compact-sidebar:\s*188px/);
  assert.match(css, /--qori-compact-topbar:\s*50px/);
  assert.match(css, /#workspace \.app-main[\s\S]*?padding:\s*calc\(var\(--qori-compact-topbar\) \+ 12px\) 16px 20px !important/);
  assert.match(css, /#workspace \.topbar[\s\S]*?height:\s*var\(--qori-compact-topbar\) !important/);
  assert.match(css, /#workspace \.view-section\.active[\s\S]*?max-width:\s*none !important/);
});

test("las mascaras redondeadas no pueden recortar contenido autenticado", () => {
  assert.match(css, /#workspace,\s*[\s\S]*?#workspace \*\s*\{[\s\S]*?border-radius:\s*0 !important/);
  assert.match(css, /\.surface-card,[\s\S]*?\.subscription-banner[\s\S]*?::before,[\s\S]*?content:\s*none !important/);
  assert.match(css, /\.data-table-card, \.table-card, \.lead-directory-card, \.contact-center-shell\)[\s\S]*?overflow:\s*visible !important/);
});

test("la compactacion conserva una salida movil sin ancho fijo", () => {
  assert.match(css, /@media \(max-width: 960px\)[\s\S]*?#workspace \.app-main[\s\S]*?width:\s*100% !important/);
  assert.match(css, /#loginPanel \.login-experience[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?#loginPanel\.login-screen[\s\S]*?padding:\s*0 !important/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "empresa", "css", "reward-pass-modal-layout.css"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");

test("Emitir Reward Pass usa una sola zona de scroll sin cruces", () => {
  assert.match(css, /#rewardPassCreateModal\.modal-shell:not\(\.hidden\)[\s\S]*?overflow: hidden !important/);
  assert.match(css, /reward-pass-create-modal-card[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\)/);
  assert.match(css, /reward-pass-layout[\s\S]*?overflow-y: auto !important/);
  assert.match(css, /modal-head[\s\S]*?height: auto !important[\s\S]*?overflow: visible !important/);
});

test("el modal móvil ocupa 390x844 sin desborde horizontal y mantiene acciones alcanzables", () => {
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?width: 100vw !important[\s\S]*?height: 100dvh !important/);
  assert.match(css, /reward-pass-form[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(css, /modal-button-row[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important/);
});

test("el portal carga la capa final de layout con cachebuster", () => {
  assert.match(html, /reward-pass-modal-layout\.css\?v=reward-pass-modal-layout-v1-20260916/);
});

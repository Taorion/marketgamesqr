const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "empresa", "css", "reward-pass-premium-v342.css"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");

test("el texto informativo del hero Reward Pass permanece blanco", () => {
  assert.match(css, /reward-pass-premium-hero-copy \.reward-pass-premium-eyebrow[\s\S]*?reward-pass-premium-signal span[\s\S]*?color: #ffffff !important/);
});

test("el portal invalida la caché del CSS de contraste", () => {
  assert.match(html, /reward-pass-premium-v342\.css\?v=[^"\n]*header-contrast=v501-20260916/);
});

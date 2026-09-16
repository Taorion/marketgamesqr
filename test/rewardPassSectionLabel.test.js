const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");

test("la secciÃ³n Reward Pass se presenta como Tarjeta regalo", () => {
  assert.match(html, /data-view="reward-passes"[\s\S]*?<strong>Tarjeta regalo<\/strong>/);
  assert.match(html, /data-portal-shortcut="reward-passes">Tarjeta regalo<\/button>/);
  assert.match(html, /reward-pass-premium-hero[\s\S]*?<h2>Tarjeta regalo<\/h2>/);
  assert.match(app, /view: "reward-passes", label: "Tarjeta regalo"/);
  assert.match(html, /reward-pass-section-label=v503-20260916/);
  assert.doesNotMatch(html, /<h2>Reward Pass<\/h2>/);
});

test("el identificador interno permanece estable", () => {
  assert.match(html, /data-view="reward-passes"/);
  assert.match(app, /view: "reward-passes"/);
});

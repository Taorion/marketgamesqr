const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");

test("Activaciones no expone controles ni solicitudes de eliminación", () => {
  assert.doesNotMatch(app, /data-activation-bulk-delete/);
  assert.doesNotMatch(app, /data-delete-activation/);
  assert.doesNotMatch(app, /deleteInteractiveActivationsBulk/);
  assert.doesNotMatch(app, /deleteInteractiveActivation\(/);
  assert.doesNotMatch(app, /interactive-activations\/\$\{encodeURIComponent\(id\)\}`,[\s\S]{0,100}method: "DELETE"/);
});

test("la alternativa segura permite anular y protege el historial", () => {
  assert.match(app, /data-activation-bulk-status="archived"[\s\S]*?>Anular<\/button>/);
  assert.match(app, /Sus enlaces quedar\\u00e1n inactivos y el historial permanecer\\u00e1 protegido/);
  assert.match(app, /method: "PATCH", headers: authHeaders\(\), body: JSON\.stringify\(\{ status \}\)/);
  assert.match(app, /empresa-20260909-activation-deletion-guard-v466/);
  assert.match(html, /activation-deletion-guard=v466-20260909/g);
});

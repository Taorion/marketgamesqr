const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("el directorio no ofrece el alta manual de contactos retirada", () => {
  const html = read("empresa", "index.html");
  const app = read("empresa", "js", "app.js");
  const premium = read("empresa", "js", "contacts-premium-v333.js");

  assert.doesNotMatch(html, /id="manualLeadCard"|id="manualLeadForm"/);
  assert.doesNotMatch(premium, /contactDirectoryAddLeadButton|>Agregar contacto</);
  assert.doesNotMatch(app, /primaryAction: "manual-lead"|action === "manual-lead"/);
  assert.match(app, /manualLeadEditForm/);
  assert.match(premium, /customerCsvImportOpenButton/);
});

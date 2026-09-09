const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Captura Relámpago no se presenta dentro de Activaciones", () => {
  const html = read("empresa/index.html");
  const styles = read("empresa/css/styles.css");

  assert.match(html, /lead-capture-card contact-captures-only" data-contact-captures-only/);
  assert.match(html, /id="leadCaptureTable"[\s\S]*?<\/table>[\s\S]*?<\/article>/);
  assert.match(styles, /body\[data-current-view="strategic-qr"\] \[data-contact-captures-only\][\s\S]*?display: none !important/);
  assert.match(html, /activation-capture-cleanup=v464-20260909/);
});

test("las capturas existentes se conservan en Contactos y no se elimina su contrato", () => {
  const portal = read("empresa/js/app.js");

  assert.match(portal, /appendIfFound\(capturesPanel, leadCaptureForm\?\.closest\("article"\)\)/);
  assert.match(portal, /appendIfFound\(capturesPanel, leadCaptureTable\?\.closest\("article"\)\)/);
  assert.match(portal, /loadLeadCaptureActivations/);
});

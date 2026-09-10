const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Captura Relámpago no se presenta dentro de Activaciones", () => {
  const html = read("empresa/index.html");
  const activationStart = html.indexOf('<section class="view-section" data-view="strategic-qr">');
  const contactsStart = html.indexOf('<section class="view-section" data-view="leads"');
  const activationsHtml = html.slice(activationStart, contactsStart);

  assert.ok(activationStart >= 0 && contactsStart > activationStart);
  assert.doesNotMatch(activationsHtml, /Captura Relámpago de Lead/);
  assert.doesNotMatch(activationsHtml, /Capturas Relámpago lanzadas/);
  assert.doesNotMatch(activationsHtml, /id="leadCaptureForm"|id="leadCaptureTable"/);
  assert.doesNotMatch(html, /data-contact-captures-only|contact-captures-only/);
  assert.match(html, /activation-capture-cleanup=v465-20260910/);
});

test("las capturas existentes se conservan en Contactos y no se elimina su contrato", () => {
  const html = read("empresa/index.html");
  const portal = read("empresa/js/app.js");
  const contactsStart = html.indexOf('<section class="view-section" data-view="leads"');
  const contactsHtml = html.slice(contactsStart);

  assert.match(contactsHtml, /id="contactPanelCaptures"[\s\S]*?id="leadCaptureForm"[\s\S]*?id="leadCaptureTable"/);
  assert.match(portal, /appendIfFound\(capturesPanel, leadCaptureForm\?\.closest\("article"\)\)/);
  assert.match(portal, /appendIfFound\(capturesPanel, leadCaptureTable\?\.closest\("article"\)\)/);
  assert.match(portal, /loadLeadCaptureActivations/);
});

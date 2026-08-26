const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const app = read("empresa/js/app.js");
const communications = read("empresa/js/communications.js");
const bulkActivation = read("empresa/js/rms-activation-bulk-email.js");
const controller = read("backend/src/controllers/businessCommunicationController.js");
const service = read("backend/src/services/businessCommunicationService.js");
const html = read("empresa/index.html");

test("Qori skips the provider choice when the tenant email connection is ready", () => {
  const start = app.indexOf("async function portalEmailDeliveryRoute");
  const end = app.indexOf("function openExternalEmailDraft", start);
  const route = app.slice(start, end);
  assert.match(route, /loadCommunicationEmailConnection\(\{ force:/);
  assert.match(route, /if \(connection\?\.ready\) return "qori"/);
  assert.match(route, /askPortalEmailRoute/);
});

test("the unconfigured choice offers an external provider or Resend in Qori", () => {
  assert.match(html, /Abrir proveedor externo/);
  assert.match(html, /Outlook/);
  assert.match(html, /Enviar desde Qori/);
  assert.match(html, /conecta Resend/);
});

test("communications and RMS bulk email consult the shared routing rule", () => {
  assert.match(communications, /window\.portalEmailDeliveryRoute\(\)/);
  assert.match(communications, /window\.openExternalEmailDraft/);
  assert.match(bulkActivation, /window\.portalEmailDeliveryRoute\(\)/);
  assert.match(bulkActivation, /ENVÍO DIRECTO DESDE QORI/);
});

test("registered MANUAL contacts remain canonical and ad hoc addresses use DIRECT_EMAIL", () => {
  assert.match(controller, /source_type: z\.enum\(\["PLAYER", "MANUAL", "BUYER", "AFFILIATE"\]\)/);
  assert.match(controller, /source_type: z\.literal\("DIRECT_EMAIL"\)/);
  assert.match(service, /recipient\.source_type === "DIRECT_EMAIL"/);
  assert.match(service, /source_type: "DIRECT_EMAIL"/);
});

test("station email actions route through Qori when configured", () => {
  assert.match(app, /async function openRmsActivationMessage/);
  assert.match(app, /async function emailRmsPostSaleAsset/);
  assert.match(app, /async function emailRmsRiskRecoveryResource/);
  assert.match(app, /source_module: "rms_negotiation"/);
  assert.match(app, /sendPortalEmailFromQori/);
});

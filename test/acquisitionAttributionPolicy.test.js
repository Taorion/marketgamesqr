const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("database/migrations/202608240001_acquisition_effort_attribution.sql", "utf8");
const portalController = fs.readFileSync("backend/src/controllers/businessPortalController.js", "utf8");
const interactiveService = fs.readFileSync("backend/src/services/interactiveActivationService.js", "utf8");
const leadService = fs.readFileSync("backend/src/services/leadCaptureService.js", "utf8");
const qrService = fs.readFileSync("backend/src/services/qrService.js", "utf8");
const portalHtml = fs.readFileSync("empresa/index.html", "utf8");
const portalApp = fs.readFileSync("empresa/js/app.js", "utf8");

test("an active source can belong to only one tenant-scoped acquisition effort", () => {
  assert.match(migration, /unique index[\s\S]*business_id, interactive_activation_id/i);
  assert.match(migration, /unique index[\s\S]*business_id, lead_capture_activation_id/i);
  assert.match(migration, /where interactive_activation_id is not null and status <> 'ARCHIVED'/i);
  assert.match(portalController, /assertEffortAttributionTargets/);
  assert.match(portalController, /company_id = \$2/);
  assert.match(portalController, /business_id = \$2/);
});

test("tracked links propagate attribution through interactive QR redemption", () => {
  assert.match(interactiveService, /e\.tracking_token=\$3::uuid/);
  assert.match(interactiveService, /acquisition_effort_id/);
  assert.match(interactiveService, /REWARD_ISSUED: "QR_GENERATED"/);
  assert.match(qrService, /business_acquisition_events/);
  assert.match(qrService, /'REDEMPTION'/);
});

test("lead capture tracking covers views, leads and actual downloads", () => {
  assert.match(leadService, /recordLeadAcquisitionEvent[\s\S]*"VIEW"/);
  assert.match(leadService, /recordLeadAcquisitionEvent[\s\S]*"LEAD"/);
  assert.match(leadService, /recordLeadAcquisitionEvent[\s\S]*"DOWNLOAD"/);
  assert.match(fs.readFileSync("captura/app.js", "utf8"), /acquisition_tracking_token/);
});

test("portal exposes exclusive source linking and a responsive attribution funnel", () => {
  assert.match(portalHtml, /channelEffortAttributionSourceInput/);
  assert.match(portalHtml, /acquisitionAttributionBoard/);
  assert.match(portalApp, /Atribución exacta/);
  assert.match(portalApp, /Copiar enlace medible/);
  assert.match(portalApp, /Beneficios QR/);
});

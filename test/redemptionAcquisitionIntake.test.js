const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const activationUi = read("activacion/activation.js");
const activationService = read("backend/src/services/interactiveActivationService.js");
const rewardPassService = read("backend/src/services/rewardPassService.js");
const qrService = read("backend/src/services/qrService.js");
const intakeService = read("backend/src/services/redemptionLeadIntakeService.js");
const portalHtml = read("empresa/index.html");
const portalApp = read("empresa/js/app.js");
const portalController = read("backend/src/controllers/businessPortalController.js");

test("el beneficiario recibe un link público copiable y nunca un acceso directo al validador", () => {
  assert.match(activationService, /buildBenefitUrl\(token\)/);
  assert.match(activationService, /benefit_url: buildBenefitUrl/);
  assert.match(activationUi, /Copiar link del beneficio/);
  assert.match(activationUi, /data-copy-benefit-link/);
  assert.doesNotMatch(activationUi, />Abrir ticket<\/a>/);
});

test("Reward Pass y QR ingresan contactos tenant-safe a agenda y Recolector", () => {
  assert.match(rewardPassService, /ensureRewardPassContact/);
  assert.match(rewardPassService, /registerRedemptionIntake/);
  assert.match(qrService, /resolveQrContact/);
  assert.match(qrService, /registerRedemptionIntake/);
  assert.match(intakeService, /insert into rms_lead_state/);
  assert.match(intakeService, /'recoleccion'/);
  assert.match(intakeService, /insert into lead_notes/);
  assert.match(intakeService, /metadata->>'dedupe_key'/);
  assert.match(intakeService, /p\.business_id=\$1/);
  assert.match(intakeService, /m\.business_id=\$1/);
  assert.match(intakeService, /a\.business_id=\$1/);
});

test("la atracción selecciona activaciones activas y las métricas se derivan de su uso real", () => {
  assert.match(portalHtml, /Activación creativa enlazada/);
  assert.match(portalHtml, /<select id="channelEffortCreativeInput"/);
  assert.match(portalApp, /\["ACTIVE", "PUBLISHED", "LIVE"\]\.includes\(status\)/);
  assert.match(portalApp, /item\.public_url \|\| item\.share_url \|\| item\.claim_url/);
  assert.match(portalController, /interactive_activation_participants/);
  assert.match(portalController, /lead_capture_submissions/);
  assert.match(portalController, /interactive_activation_asset_downloads/);
  assert.match(portalController, /left join redemptions/);
});

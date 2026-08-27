const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa/js/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa/index.html"), "utf8");
const service = fs.readFileSync(path.join(root, "backend/src/services/rmsMachineService.js"), "utf8");

test("Riesgos permite registrar una respuesta sin ticket", () => {
  assert.match(app, /requestedPhase === "deliver" && !hasResource/);
  assert.match(app, /Registrar respuesta sin ticket/);
  assert.match(app, /step\("result", "3", "Responder", "Venta o Reciclaje"\)/);
});

test("la concesión se elige una vez y Responder la presenta como dato fijo", () => {
  const activeSync = app.slice(app.indexOf("syncRmsRiskRecoveryPhases = function syncRmsRiskRecoveryPhasesUnified"), app.indexOf("activateRmsRiskTab = function activateRmsRiskTabUnified"));
  const fixedOffer = app.slice(app.indexOf("const rmsRiskValidationStationCardMarkupFixedOfferBase"), app.indexOf("// La imagen ya está visible en el ticket"));
  assert.doesNotMatch(activeSync, /data-rms-risk-outcome-offer|data-rms-risk-outcome-discount-percent|data-rms-risk-outcome-detail/);
  assert.match(activeSync, /data-rms-risk-recovery-offer/);
  assert.match(fixedOffer, /data-rms-risk-selected-offer/);
  assert.match(fixedOffer, /data-rms-risk-fixed-offer-label/);
  assert.match(fixedOffer, /Sin concesión extraordinaria/);
  assert.match(html, /portal-clean-v39\.css\?v=[^"]*risk-fixed-concession-v385/);
});

test("Sin concesión deshabilita ticket y dirige a Responder con Venta lograda", () => {
  const ui = app.slice(app.indexOf("function rmsRiskOutcomeOfferUi"), app.indexOf("function setRmsRiskRecoveryPhase"));
  const phasedMarkup = app.slice(app.indexOf("rmsRiskOperatingFlowMarkup = function rmsRiskOperatingFlowMarkupUnified"), app.indexOf("syncRmsRiskRecoveryPhases = function syncRmsRiskRecoveryPhasesUnified"));
  assert.match(ui, /expiration\.disabled = isNone/);
  assert.match(ui, /detailWrap\.hidden = !needsDetail && !isNone/);
  assert.match(ui, /detailInput\.disabled = !needsDetail/);
  assert.match(ui, /generate\.disabled = isNone/);
  assert.match(ui, /activateRmsRiskTab\(card\.parentElement \|\| document, id, "sale"\)/);
  assert.match(ui, /setRmsRiskRecoveryPhase\(card, id, "result"\)/);
  assert.doesNotMatch(phasedMarkup, /Descuento aplicado|data-rms-risk-discount-percent/);
});

test("el descuento del beneficio se deriva de la autorización y no de un campo manual", () => {
  const selection = app.slice(app.indexOf("function rmsRiskSelectedOffer"), app.indexOf("async function generateRmsRiskRecoveryResource"));
  const activeSave = app.slice(app.indexOf("saveRmsRiskDecision = async function saveRmsRiskDecisionUnified"), app.indexOf("// El activo se ve dentro de la estación"));
  assert.match(selection, /value === "DISCOUNT" \? permissions\.discount\.max_percent/);
  assert.doesNotMatch(selection, /data-rms-risk-discount-percent/);
  assert.match(activeSave, /selectedBenefit\?\.type === "DISCOUNT" \? selectedBenefit\.value : 0/);
});

test("Ventas se abre sin una recarga RMS duplicada", () => {
  const activeSave = app.slice(app.indexOf("saveRmsRiskDecision = async function saveRmsRiskDecisionUnified"), app.indexOf("// El activo se ve dentro de la estación"));
  assert.doesNotMatch(activeSave, /await loadRmsMachineData/);
  assert.match(activeSave, /openRmsStation\("cierre"/);
  assert.match(activeSave, /item\.stage = result === "RECYCLE" \? "control_anti_fuga" : "cierre"/);
});

test("el backend conserva las dos salidas canónicas y tenant scoping", () => {
  assert.match(service, /findOpportunity\(businessId, sourceType, payload\.source_id\)/);
  assert.match(service, /const toPhase = isCleared \? "cierre" : "control_anti_fuga"/);
  assert.match(service, /RMS_TRANSITION_AUTHORITY\.RISK_REVIEW/);
});

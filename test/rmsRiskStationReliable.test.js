const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa/js/app.js"), "utf8");
const service = fs.readFileSync(path.join(root, "backend/src/services/rmsMachineService.js"), "utf8");

test("Riesgos permite registrar una respuesta sin ticket", () => {
  assert.match(app, /requestedPhase === "deliver" && !hasResource/);
  assert.match(app, /Registrar respuesta sin ticket/);
  assert.match(app, /step\("result", "3", "Responder", "Venta o Reciclaje"\)/);
});

test("el guardado usa los campos de resultado montados en la fase Responder", () => {
  assert.match(app, /data-rms-risk-outcome-offer/);
  assert.match(app, /data-rms-risk-outcome-discount-percent/);
  assert.match(app, /data-rms-risk-outcome-detail/);
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

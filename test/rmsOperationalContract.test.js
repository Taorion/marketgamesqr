const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const service = fs.readFileSync("backend/src/services/rmsMachineService.js", "utf8");
const app = fs.readFileSync("empresa/js/app.js", "utf8");

test("RMS publishes ten operational stations and keeps quality controls outside rms_phase", () => {
  const operationalBlock = service.slice(service.indexOf("const RMS_OPERATIONAL_STAGES"), service.indexOf("const RMS_QUALITY_CONTROLS"));
  assert.match(operationalBlock, /key: "inteligencia", order: 10/);
  assert.doesNotMatch(operationalBlock, /preprocesamiento|revenue_generado/);
  assert.match(service, /const RMS_QUALITY_CONTROLS = Object\.freeze/);
  assert.match(service, /if \(\["preprocesamiento", "revenue_generado", "inteligencia"\]\.includes\(toPhase\)\)/);
});

test("the server transition contract allows a clean negotiation agreement and a fragile agreement", () => {
  assert.match(service, /\{ from: "accion_correctiva", decision: "COMPLETE_AGREEMENT", to: "cierre" \}/);
  assert.match(service, /\{ from: "accion_correctiva", decision: "FRAGILE_AGREEMENT", to: "control_anti_fuga" \}/);
  assert.match(service, /RMS_TRANSITION_CONTRACT\s*\.filter\(\(transition\) => transition\.from === from\)/);
});

test("loss, recycling and intelligence keep distinct lifecycle meanings", () => {
  const negotiationStart = service.indexOf("async function recordRmsNegotiationResult");
  const riskStart = service.indexOf("async function recordRmsRiskReview", negotiationStart);
  const negotiation = service.slice(negotiationStart, riskStart);
  assert.match(negotiation, /lifecycle_status: "LOST_ANALYZED"/);
  assert.equal((negotiation.match(/lifecycle_status: "RECYCLED"/g) || []).length, 1);
  assert.ok(negotiation.indexOf('if (result === "RECYCLE")') < negotiation.indexOf('lifecycle_status: "RECYCLED"'));
  assert.match(negotiation, /if \(result === "RECYCLE"\)[\s\S]*lifecycle_status: "RECYCLED"/);
  assert.match(app, /Inteligencia recibe el evento analítico, pero no es la ubicación física/);
});

test("the operator UI keeps the ten-stage order and states handoff requirements per lead", () => {
  const flowStart = app.indexOf("const RMS_FLOW_ORDER");
  const flowEnd = app.indexOf("const RMS_FLOW_INDEX", flowStart);
  const flow = app.slice(flowStart, flowEnd);
  assert.doesNotMatch(flow, /preprocesamiento|revenue_generado/);
  assert.match(flow, /"postventa", "inteligencia"/);
  assert.match(app, /rms-station-lead-guidance/);
  assert.match(app, /<b>Ahora:<\/b>/);
  assert.match(app, /<b>Al confirmar:<\/b>/);
});

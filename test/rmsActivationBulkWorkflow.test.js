const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "empresa/js/app.js"), "utf8");

test("Activación 1 dispatches every prepared lead from one operator action", () => {
  const start = app.indexOf("async function dispatchNextRmsBulkActivation()");
  const end = app.indexOf("function rmsActivationDraftFromDom", start);
  const dispatch = app.slice(start, end);
  assert.match(app, /Abrir, enviar y registrar todos/);
  assert.doesNotMatch(app, /Abrir y registrar siguiente/);
  assert.match(dispatch, /const pending = Array\.isArray\(queue\?\.pending\) \? \[\.\.\.queue\.pending\] : \[\]/);
  assert.match(dispatch, /const opened = \[\]/);
  assert.match(dispatch, /await openRmsActivationMessage/);
  assert.match(dispatch, /runBulkRequests\(opened/);
  assert.match(dispatch, /skipRefresh: true/);
  assert.match(dispatch, /await refreshRmsOpenStation\("clasificacion"\)/);
});

test("Activación 1 can select and move ready leads to Evaluación in bulk", () => {
  assert.match(app, /data-rms-select-activation-evaluation/);
  assert.match(app, /data-rms-send-selected-activation-evaluation/);
  assert.match(app, /async function moveSelectedRmsActivationsToEvaluation\(\)/);
  assert.match(app, /const readyRows = selectedRows\.filter\(\(item\) => rmsActivationReadyForEvaluation\(item\)\)/);
  assert.match(app, /runBulkRequests\(readyRows/);
  assert.match(app, /body: JSON\.stringify\(rmsActivationEvaluationMovePayload\(item\)\)/);
  assert.match(app, /openRmsStation\("procesamiento", \{ source: "activation-bulk-evaluation" \}\)/);
});

test("Activación 1 exposes the shared collapsible station summary with activation columns", () => {
  assert.match(app, /RMS_COMMERCIAL_SUMMARY_PHASES = new Set\(\["curaduria", "clasificacion"/);
  assert.match(app, /clasificacion: "Activación 1"/);
  assert.match(app, /aria-label="Resumen de Activación 1"/);
  assert.match(app, /<th>Lead<\/th><th>Oferta<\/th><th>Canal y envío<\/th><th>Respuesta y seguimiento<\/th><th>Estado<\/th>/);
  assert.match(app, /state\.rmsStationSummaryOpen = !state\.rmsStationSummaryOpen/);
});

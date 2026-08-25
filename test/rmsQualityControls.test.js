const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const service = fs.readFileSync("backend/src/services/rmsMachineService.js", "utf8");
const app = fs.readFileSync("empresa/js/app.js", "utf8");
const catalog = fs.readFileSync("backend/src/services/smartCatalogService.js", "utf8");
const routes = fs.readFileSync("backend/src/routes/businessPortalRoutes.js", "utf8");
const migration = fs.readFileSync("database/migrations/202608050001_rms_post_sale_actions.sql", "utf8");

test("quality controls are visual metadata, not machine operations or destinations", () => {
  const operationStart = service.indexOf("const PHASE_OPERATIONS");
  const operationEnd = service.indexOf("const WHATSAPP_TEMPLATES", operationStart);
  const operations = service.slice(operationStart, operationEnd);
  assert.doesNotMatch(operations, /preprocesamiento|revenue_generado|quality_gate_1|quality_gate_2/);
  assert.match(service, /RMS_QUALITY_CONTROLS = Object\.freeze/);
  assert.match(service, /visual_only: true/);
  assert.match(service, /\["preprocesamiento", "revenue_generado", "inteligencia"\]\.includes\(toPhase\)/);
  assert.doesNotMatch(routes, /rms-machine\/quality(?:-|\/)[^\n]*post/i);
});

test("quality dashboard derives criteria and only offers navigation to the responsible station", () => {
  assert.match(app, /function rmsQualityAuditForItem/);
  assert.match(app, /Panel auxiliar de solo lectura/);
  assert.match(app, /data-rms-quality-navigate/);
  assert.match(app, /openRmsStation\(control\.dataset\.rmsQualityNavigate/);
  assert.doesNotMatch(app, /data-rms-quality-(?:approve|return|save-review|move)/);
  assert.match(app, /Venta canónica/);
  assert.match(app, /Continuidad definida/);
  const storyStart = app.indexOf("const RMS_INDUSTRIAL_STATIONS");
  const storyEnd = app.indexOf("function rmsStationEmptyMarkup", storyStart);
  if (storyStart >= 0 && storyEnd > storyStart) {
    const story = app.slice(storyStart, storyEnd);
    assert.doesNotMatch(story, /title: "Estación \d+ · Control de calidad/);
  }
});

test("catalog sale synchronization lands in Postventa, never the historical quality phase", () => {
  assert.doesNotMatch(catalog, /"revenue_generado"/);
  assert.match(catalog, /syncIntentWithRms\([\s\S]*"postventa"/);
  assert.match(catalog, /Venta canónica registrada desde Catalogos Qori/);
});

test("the existing compatibility migration records an audited route out of legacy quality phases", () => {
  assert.match(migration, /rms_phase = 'revenue_generado'/);
  assert.match(migration, /'postventa'/);
  assert.match(migration, /'cierre'/);
  assert.match(migration, /rms_phase = 'preprocesamiento'/);
  assert.match(migration, /'procesamiento'/);
  assert.match(migration, /'clasificacion'/);
  assert.match(migration, /rms_phase_movements/);
  assert.match(migration, /rms_machine_events/);
});

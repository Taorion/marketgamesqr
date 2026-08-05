const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const service = fs.readFileSync("backend/src/services/rmsMachineService.js", "utf8");
const controller = fs.readFileSync("backend/src/controllers/rmsMachineController.js", "utf8");
const routes = fs.readFileSync("backend/src/routes/businessPortalRoutes.js", "utf8");
const app = fs.readFileSync("empresa/js/app.js", "utf8");
const markup = fs.readFileSync("empresa/index.html", "utf8");
const migration = fs.readFileSync("database/migrations/202608050006_rms_recycling_queue.sql", "utf8");

test("Reciclaje is a transversal queue and does not add an RMS station", () => {
  assert.match(service, /decision: "RECYCLE", to: "accion_correctiva"/);
  assert.match(service, /decision: "RECYCLE", to: "control_anti_fuga"/);
  assert.match(migration, /create table if not exists rms_recycling_cases/);
  assert.match(migration, /recycle_target_phase text not null check \(recycle_target_phase in \('procesamiento', 'clasificacion'\)\)/);
  assert.match(migration, /rms_recycling_cases_open_context_idx/);
});

test("the recycling API is tenant scoped and actions are idempotent", () => {
  assert.match(service, /where r\.business_id=\$1/);
  assert.match(service, /where business_id=\$1 and id=\$2/);
  assert.match(service, /rms_recycling_events where business_id=\$1 and idempotency_key=\$2/);
  assert.match(routes, /router\.get\("\/rms-machine\/recycling"/);
  assert.match(routes, /router\.post\("\/rms-machine\/recycling\/action"/);
  assert.match(controller, /recyclingActionSchema/);
});

test("Optimiza exposes operational recycling with real endpoint actions", () => {
  assert.match(markup, /data-view="recycling"/);
  assert.match(markup, /Reciclaje/);
  assert.match(app, /\/api\/business\/rms-machine\/recycling\?status=/);
  assert.match(app, /\/api\/business\/rms-machine\/recycling\/action/);
  assert.match(app, /data-recycling-action="REACTIVATE"/);
  assert.match(app, /data-recycling-action="RESCHEDULE"/);
  assert.match(app, /data-recycling-action="CHANGE_STRATEGY"/);
  assert.match(app, /data-recycling-action="LOST"/);
  assert.match(app, /data-recycling-action="CANCEL"/);
});

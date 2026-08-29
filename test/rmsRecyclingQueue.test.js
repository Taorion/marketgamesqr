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
  assert.match(service, /from: "procesamiento", decision: "RECYCLE", to: "procesamiento"[^\n]+transversal_queue: true/);
  assert.match(service, /from: "accion_correctiva", decision: "RECYCLE", to: "accion_correctiva"/);
  assert.match(service, /from: "control_anti_fuga", decision: "RECYCLE", to: "reciclaje"[^\n]+transversal_queue: true/);
  assert.match(service, /const RMS_AUXILIARY_PHASES = new Set\(\["reciclaje"\]\)/);
  assert.match(service, /const toPhase = isCleared \? "cierre" : "reciclaje"/);
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

test("Reciclaje premium keeps global metrics, product context and detailed history", () => {
  assert.match(service, /const allCases = rows\.rows\.map/);
  assert.match(service, /rms_recycling_events e/);
  assert.match(service, /actor_name/);
  assert.match(service, /allCases\.filter\(\(item\) => item\.recycle_status === "OVERDUE"\)/);
  assert.match(service, /risk_review: review/);
  assert.match(service, /products: review\.products/);
  assert.match(app, /recycling-premium-command-v402-20260829/);
  assert.match(app, /function recyclingHistoryMarkup/);
  assert.match(app, /function recyclingProducts/);
  assert.match(app, /recyclingStrategyOptions\(item\.recycle_strategy\)/);
  assert.match(markup, /recycling=premium-command-v402-20260829/);
});

test("Reciclaje confirms canonical destination and uses a stable retry key", () => {
  const executor = app.slice(app.indexOf("async function executeRecyclingAction"), app.indexOf("bindRecyclingActions = function bindPremiumRecyclingActions"));
  assert.match(executor, /result\?\.movement\?\.state\?\.rms_phase/);
  assert.match(executor, /if \(confirmed !== destination\)/);
  assert.match(executor, /idempotency_key: recyclingActionKey\(row, action\)/);
  assert.match(executor, /result\?\.confirmed_destination/);
  assert.doesNotMatch(executor, /Date\.now/);
  assert.match(controller, /destination: z\.enum\(\["procesamiento", "clasificacion"\]\)/);
  assert.match(service, /confirmed_destination: recyclingCase\.metadata\?\.reactivation_destination/);
});

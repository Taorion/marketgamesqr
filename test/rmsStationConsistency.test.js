const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("empresa/js/app.js", "utf8");
const markup = fs.readFileSync("empresa/index.html", "utf8");
const css = fs.readFileSync("empresa/css/portal-clean-v39.css", "utf8");
const businessPortalController = fs.readFileSync("backend/src/controllers/businessPortalController.js", "utf8");
const loader = app.slice(
  app.indexOf("async function loadRmsMachineData"),
  app.indexOf("async function refreshRmsOpenStation")
);
const bulkMove = app.slice(
  app.indexOf("async function moveSelectedRmsPhase"),
  app.indexOf("function rmsPriorityCode")
);
const singleMove = app.slice(
  app.indexOf("async function moveRmsOpportunityToPhase"),
  app.indexOf("function ensureRmsLeadInspectorModal")
);

test("station responses cannot be replaced by stale global or older scoped loads", () => {
  assert.match(app, /rmsMachineLatestRequestByScope: new Map\(\)/);
  assert.match(loader, /latestByScope\.set\(scopeKey, requestSeq\)/);
  assert.match(loader, /if \(latestByScope\.get\(scopeKey\) !== requestSeq\) return data/);
  assert.match(loader, /if \(!stationPhase && state\.rmsStationScreenOpen\) return data/);
  assert.match(loader, /station:\$\{stationPhase\}:\$\{stationOffset\}:\$\{search\}:\$\{priority\}/);
});

test("station reads bypass stale client and server cache", () => {
  assert.match(loader, /if \(options\.fresh \|\| stationPhase\) params\.set\("fresh", "1"\)/);
  assert.match(loader, /noClientCache: Boolean\(options\.fresh \|\| stationPhase\)/);
});

test("bulk handoffs run concurrently and reload the exact destination station", () => {
  assert.match(bulkMove, /runBulkRequests\(moveRequests,[\s\S]*?\{ concurrency: 4 \}\)/);
  assert.doesNotMatch(bulkMove, /for \(const id of ids\)[\s\S]*?await api\("\/api\/business\/rms-machine\/lead\/phase"/);
  assert.match(bulkMove, /stationPhase: state\.rmsStationScreenOpen && movedCount > 0 \? toPhase : ""/);
  assert.match(bulkMove, /fresh: true/);
});

test("single handoffs switch scope before fetching the destination", () => {
  const phaseAssignment = singleMove.indexOf("state.rmsStationPhase = toPhase");
  const destinationLoad = singleMove.indexOf("await loadRmsMachineData");
  assert.ok(phaseAssignment >= 0 && destinationLoad > phaseAssignment);
  assert.match(singleMove, /stationPhase: state\.rmsStationScreenOpen \? toPhase : ""/);
  assert.match(singleMove, /fresh: true/);
  assert.match(markup, /rms-sync=consistent-v429-20260902/g);
});

test("an opening station shows only a definitive loading state before final rows", () => {
  const stationRenderer = app.slice(
    app.indexOf("function renderRmsStationLoadState"),
    app.indexOf("function rmsVisibleOpportunities")
  );
  assert.match(app, /rmsStationSyncError: ""/);
  assert.match(stationRenderer, /if \(state\.rmsStationSyncing \|\| state\.rmsStationSyncError\)/);
  assert.match(stationRenderer, /Actualizando estación…/);
  assert.match(stationRenderer, /No pudimos actualizar la estación/);
  assert.doesNotMatch(stationRenderer, /datos definitivos|datos provisionales|información real y actualizada/);
  assert.doesNotMatch(app, /Puedes revisar la pantalla mientras traemos los datos más recientes/);
  assert.doesNotMatch(app, /quedó operativa con datos locales/);
  assert.match(css, /Estaciones Qori v430: no mostrar filas provisionales/);
  assert.match(markup, /rms-loading=definitive-v430-20260902/g);
  assert.match(markup, /rms-loading-copy=v432-20260902/g);
  assert.match(markup, /rms-definitive-loading-v430/);
});

test("the whole portal detects fresh activity without a page reload", () => {
  const activityPolling = app.slice(
    app.indexOf("function startActivityPolling"),
    app.indexOf("async function loadPrepaidValidatorWorkspace")
  );
  assert.match(app, /const ACTIVITY_POLL_INTERVAL_MS = 15000/);
  assert.doesNotMatch(app, /ACTIVITY_POLLING_VIEWS/);
  assert.match(activityPolling, /clearApiResponseCache\(\)/);
  assert.match(activityPolling, /await refreshActivePortalView\(\)/);
  assert.match(app, /scheduleActivePortalRefresh\(\)/);
  assert.match(app, /API_CLIENT_CACHE_TTL_MS = 30000/);
  assert.match(markup, /live-refresh=v431-20260902/g);
});

test("RMS and Recycling changes participate in the live activity version", () => {
  assert.match(businessPortalController, /max\(updated_at\) from rms_lead_state where business_id = \$1/);
  assert.match(businessPortalController, /max\(created_at\) from rms_phase_movements where business_id = \$1/);
  assert.match(businessPortalController, /max\(updated_at\) from rms_recycling_cases where business_id = \$1/);
  assert.match(businessPortalController, /max\(created_at\) from rms_recycling_events where business_id = \$1/);
  assert.match(businessPortalController, /Cache-Control", "no-store, no-cache/);
  assert.match(app, /rms-machine\/recycling\?status=\$\{encodeURIComponent\(status\)\}`,[\s\S]*?noClientCache: true/);
});

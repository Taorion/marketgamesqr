const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("empresa/js/app.js", "utf8");
const markup = fs.readFileSync("empresa/index.html", "utf8");
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

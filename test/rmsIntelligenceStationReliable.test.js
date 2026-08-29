const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("empresa/js/app.js", "utf8");
const html = fs.readFileSync("empresa/index.html", "utf8");
const intelligence = fs.readFileSync("backend/src/services/rmsIntelligenceService.js", "utf8");
const machine = fs.readFileSync("backend/src/services/rmsMachineService.js", "utf8");

test("Inteligencia reads tenant-scoped persisted RMS cases instead of a synthetic operational phase", () => {
  assert.match(machine, /async function listRmsPersistedCases\(businessId, filters = \{\}\)/);
  assert.match(machine, /recentStateRowsForBusiness\(businessId, limit\)/);
  assert.match(machine, /leadRowsForStateRefs\(businessId, stateRows\)/);
  assert.match(intelligence, /listRmsPersistedCases/);
  assert.doesNotMatch(intelligence, /listRmsOpportunities/);
  assert.match(intelligence, /limit: 500/);
});

test("the GOS station reports loading and API failures instead of converting them into false empty states", () => {
  assert.match(app, /rmsIntelligenceRequestSeq/);
  assert.match(app, /rmsIntelligenceError/);
  assert.match(app, /data-rms-intelligence-retry/);
  assert.match(app, /api\("\/api\/business\/rms-machine\/intelligence\/cases\?limit=500"/);
  assert.doesNotMatch(app, /apiSafe\("\/api\/business\/rms-machine\/intelligence\/cases/);
});

test("the station presents analytical cases rather than an operational pending queue", () => {
  assert.match(app, /lectura analítica, no una cola operativa/);
  assert.match(app, /function rmsStationVisibleCount/);
  assert.match(app, /return state\.rmsIntelligenceLoaded \? "Sin casos registrados" : "Memoria analítica"/);
  assert.match(app, /data-rms-intelligence-view="recycling" data-rms-intelligence-recycling-view/);
  assert.match(app, /gos-intelligence-reliable-v389-20260828/);
  assert.match(html, /intelligence=gos-reliable-v389-20260828/);
});

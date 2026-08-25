const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const serviceSource = fs.readFileSync("backend/src/services/rmsMachineService.js", "utf8");
const portalMarkup = fs.readFileSync("empresa/index.html", "utf8");
const portalSource = fs.readFileSync("empresa/js/app.js", "utf8");
const bulkStart = portalSource.indexOf("async function executeRmsBulkOperation()");
const bulkEnd = portalSource.indexOf("async function moveSelectedRmsPhase", bulkStart);
const bulkFunction = bulkStart >= 0 && bulkEnd > bulkStart ? portalSource.slice(bulkStart, bulkEnd) : "";

test("RMS rejects bulk phase advancement and only exposes bulk task creation", () => {
  assert.match(serviceSource, /if \(payload\.advance_phase\) \{\s*throw badRequest\(/);
  assert.doesNotMatch(portalMarkup, /id="rmsBulkPhaseInput"/);
  assert.doesNotMatch(portalMarkup, /id="rmsBulkExecuteButton"/);
  assert.doesNotMatch(portalSource, /rmsBulkExecuteButton\?\.addEventListener/);
  assert.doesNotMatch(bulkFunction, /advance_phase/);
});

test("RMS bulk feedback reports partial failures instead of a false global success", () => {
  assert.match(portalSource, /const failures = \(result\?\.results \|\| \[\]\)\.filter\(\(entry\) => entry\?\.error\)/);
  assert.match(portalSource, /Las decisiones de fase se confirman caso por caso/);
});

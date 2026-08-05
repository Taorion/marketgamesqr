const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("empresa/js/app.js", "utf8");

test("Optimiza exposes recycled and discarded cases as analytical read-only evidence", () => {
  assert.match(app, /function rmsIntelligenceRecyclingMarkup/);
  assert.match(app, /item\.lifecycle_status === "RECYCLED"/);
  assert.match(app, /item\.lifecycle_status === "LOST_ANALYZED"/);
  assert.match(app, /Reciclaje conserva su cola operativa/);
  assert.match(app, /no contacta, no mueve ni reactiva leads/);
  assert.match(app, /data-rms-intelligence-recycling-case/);
});

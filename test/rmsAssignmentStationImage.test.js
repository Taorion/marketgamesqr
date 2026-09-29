const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");

const app = fs.readFileSync("empresa/js/app.js", "utf8");
const markup = fs.readFileSync("empresa/index.html", "utf8");
const assignmentImagePath = "empresa/img/qori-station-03-asignacion.png";
const assignmentImage = fs.readFileSync(assignmentImagePath);

test("Asignacion uses the approved station 03 image", () => {
  const stationMetadata = app.slice(
    app.indexOf("function rmsStationVisualMeta"),
    app.indexOf("function ensureRmsStationUxStyles")
  );

  assert.match(
    stationMetadata,
    /curaduria:[\s\S]*?image: "\/empresa\/img\/qori-station-03-asignacion\.png\?v=assignment-image-v517-20260929"/
  );
  assert.doesNotMatch(stationMetadata, /qori-station-03-clasificador\.jpg/);
  assert.equal((markup.match(/assignment-station-image-v517-20260929/g) || []).length, 2);
  assert.doesNotMatch(
    app,
    /rms-station-entry-card\[data-rms-phase="curaduria"\][^\n]+clip-path: inset\(/
  );
  assert.equal(
    crypto.createHash("sha256").update(assignmentImage).digest("hex"),
    "70cbddee042698d12f44473540d0aebd8ffb49224e6f54ccacecfc70c0844e7a"
  );
});

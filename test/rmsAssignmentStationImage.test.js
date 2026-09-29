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
    /curaduria:[\s\S]*?image: "\/empresa\/img\/qori-station-03-asignacion\.png\?v=assignment-image-v514-20260928"/
  );
  assert.doesNotMatch(stationMetadata, /qori-station-03-clasificador\.jpg/);
  assert.equal((markup.match(/assignment-station-image-v515-20260929/g) || []).length, 2);
  assert.match(
    app,
    /rms-station-entry-card\[data-rms-phase="curaduria"\][^\n]+clip-path: inset\(2\.7% 3\.2% 2\.6% 3\.2% round 7% \/ 4\.8%\) !important;/
  );
  assert.equal(
    crypto.createHash("sha256").update(assignmentImage).digest("hex"),
    "196c14c08a63b918588cdf479a2bf50e1d7d0257daf23b44b5df95cb00339efe"
  );
});

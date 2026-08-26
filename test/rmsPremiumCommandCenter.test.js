const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const markup = fs.readFileSync("empresa/index.html", "utf8");
const app = fs.readFileSync("empresa/js/app.js", "utf8");
const css = fs.readFileSync("empresa/css/portal-clean-v39.css", "utf8");

test("RMS premium command center exposes truthful live operational context", () => {
  assert.match(markup, /<h2 id="rmsStationsTitle">Máquina RMS<\/h2>/);
  assert.match(markup, /id="rmsMachineLiveStatus"/);
  assert.match(markup, /id="rmsMachineActiveStations"/);
  assert.match(markup, /Diez estaciones operativas convierten señales en ventas; dos controles observan la calidad sin mover leads/);
  assert.match(app, /activeStationCount = stages\.filter/);
  assert.match(app, /priorityCount\.toLocaleString\("es-CO"\)/);
});

test("every lean station shows its receive decide deliver contract", () => {
  const leanRenderer = app.slice(app.indexOf("function renderRmsStationLeanOnly"), app.indexOf("function renderRmsStationOnly"));
  assert.match(leanRenderer, /rmsStationHandoffMarkup\(stage, nextPhase\)/);
  assert.match(app, /const RMS_STATION_HANDOFFS = Object\.freeze/);
});

test("RMS premium styles are scoped, responsive and reduced-motion aware", () => {
  assert.match(css, /RMS Premium Command Center v360/);
  assert.match(css, /body\[data-current-view="rms-machine"\]/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.rms-machine-live-rail/);
  assert.match(css, /\.rms-station-handoff/);
});

test("RMS no longer exposes internal version copy or opens Reciclaje as an operational station", () => {
  assert.doesNotMatch(app, /Qori v137 modo anti-bloqueo/);
  assert.match(app, /RECYCLE: "procesamiento"/);
  assert.match(app, /if \(draft\.destination === "RECYCLE"\) \{\s*setView\("recycling"\)/);
  assert.match(app, /item\.stage = result === "RECYCLE" \? "control_anti_fuga" : "cierre"/);
});

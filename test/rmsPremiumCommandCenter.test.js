const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const markup = fs.readFileSync("empresa/index.html", "utf8");
const app = fs.readFileSync("empresa/js/app.js", "utf8");
const css = fs.readFileSync("empresa/css/portal-clean-v39.css", "utf8");
const legacyCss = fs.readFileSync("empresa/css/styles.css", "utf8");

test("GOS premium command center exposes truthful live operational context", () => {
  assert.match(markup, /<h2 id="rmsStationsTitle">Máquina GOS<\/h2>/);
  assert.match(markup, /id="rmsMachineLiveStatus"/);
  assert.match(markup, /id="rmsMachineActiveStations"/);
  assert.match(markup, /Diez estaciones operativas convierten señales en ventas; dos controles observan la calidad sin mover leads/);
  assert.match(app, /activeStationCount = stages\.filter/);
  assert.match(app, /priorityCount\.toLocaleString\("es-CO"\)/);
});

test("GOS is the only visible machine brand while RMS contracts remain internal", () => {
  assert.doesNotMatch(markup, /\bRMS\b/);
  assert.match(markup, /<strong>Máquina GOS<\/strong>/);
  assert.match(markup, /Tutorial guiado GOS/);
  assert.match(app, /const PORTAL_VISIBLE_SYSTEM_NAME = "GOS"/);
  assert.match(app, /const PORTAL_VISIBLE_SYSTEM_PATTERN = \/\\bRMS\\b\/gi/);
  assert.match(app, /function installPortalVisibleSystemBrand\(\)/);
  assert.doesNotMatch(legacyCss, /content:\s*"[^"]*\bRMS\b/);
  assert.match(app, /\/api\/business\/rms-machine/);
  assert.match(app, /const RMS_STATION_HANDOFFS = Object\.freeze/);
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

test("GOS live status cards use clear light surfaces and dark readable type", () => {
  assert.match(markup, /gos-status-contrast-v363-20260826/);
  assert.match(css, /\.rms-machine-live-rail > div \{[\s\S]*?background: #f8fbff !important/);
  assert.match(css, /\.rms-machine-live-rail span \{[\s\S]*?color: #40546d !important;[\s\S]*?font-size: \.66rem !important/);
  assert.match(css, /\.rms-machine-live-rail strong \{[\s\S]*?color: #071f3f !important;[\s\S]*?font-size: \.84rem !important/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.rms-machine-live-rail span \{[\s\S]*?font-size: \.6rem !important/);
});

test("the station slider is the first RMS workspace and remains above the fold", () => {
  const factoryStart = markup.indexOf('<section class="surface-card rms-journey-shell rms-factory-console">');
  const sliderStart = markup.indexOf('<section class="rms-stage-slider-shell"', factoryStart);
  const workspaceStart = markup.indexOf('<section class="rms-station-workspace"', factoryStart);
  assert.ok(factoryStart >= 0 && sliderStart > factoryStart);
  assert.ok(sliderStart < workspaceStart, "the station slider must precede the station workspace");
  assert.match(markup, /rms-above-fold-v361-gos-status-contrast-v363-20260826/);
  assert.match(css, /RMS above-the-fold command screen v361/);
  assert.match(css, /height: clamp\(300px, 38vh, 370px\) !important/);
  assert.match(css, /order: -10 !important/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*height: 360px !important/);
});

test("RMS no longer exposes internal version copy or opens Reciclaje as an operational station", () => {
  assert.doesNotMatch(app, /Qori v137 modo anti-bloqueo/);
  assert.match(app, /RECYCLE: "procesamiento"/);
  assert.match(app, /if \(draft\.destination === "RECYCLE"\) \{\s*setView\("recycling"\)/);
  assert.match(app, /destination !== built\.destination/);
  assert.match(app, /item\.stage = destination/);
});

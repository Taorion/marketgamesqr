const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("empresa/js/app.js", "utf8");
const css = fs.readFileSync("empresa/css/portal-clean-v39.css", "utf8");
const markup = fs.readFileSync("empresa/index.html", "utf8");

const summary = app.slice(
  app.indexOf("function rmsStationRichSummaryMarkup"),
  app.indexOf("function rmsStationInputOutputMarkup")
);

test("every operating station has a rich summary contract", () => {
  const handoffs = app.slice(
    app.indexOf("const RMS_STATION_HANDOFFS"),
    app.indexOf("function rmsStationHandoffMarkup")
  );
  [
    "recoleccion",
    "alimentacion",
    "curaduria",
    "clasificacion",
    "procesamiento",
    "accion_correctiva",
    "control_anti_fuga",
    "cierre",
    "postventa",
    "inteligencia",
  ].forEach((phase) => assert.match(handoffs, new RegExp(`${phase}: \\{ receives:`)));
});

test("station mode restores objective metrics flow context and checklist", () => {
  assert.match(summary, /Resumen operativo de la estación/);
  assert.match(summary, /rms-station-rich-summary-metrics/);
  assert.match(summary, />Recibe</);
  assert.match(summary, />Decide</);
  assert.match(summary, />Entrega</);
  assert.match(summary, /Información de entrada/);
  assert.match(summary, /Resultado esperado/);
  assert.match(summary, /Qué debes confirmar/);
  assert.match(summary, /visual\.checklist/);
  assert.match(app, /rmsStationRichSummaryMarkup\(stage, stationSummaryRows, nextPhase/);
});

test("rich station summary is responsive and cache-busted", () => {
  assert.match(css, /v470: restore the complete operational summary/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.rms-station-rich-summary-flow[\s\S]*?grid-template-columns: 1fr/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*?\.rms-station-rich-summary/);
  assert.match(css, /html\[data-theme="dark"\][\s\S]*?\.rms-station-rich-summary/);
  assert.equal((markup.match(/station-summary=rich-v470-20260910/g) || []).length, 2);
  assert.equal((markup.match(/station-summary-rich-v470-20260910/g) || []).length, 1);
  assert.match(app, /empresa-20260910-rms-rich-station-summary-v470/);
});

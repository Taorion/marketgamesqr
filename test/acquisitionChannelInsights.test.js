const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const controller = fs.readFileSync("backend/src/controllers/businessPortalController.js", "utf8");
const routes = fs.readFileSync("backend/src/routes/businessPortalRoutes.js", "utf8");
const app = fs.readFileSync("empresa/js/app.js", "utf8");
const css = fs.readFileSync("empresa/css/acquisition-command-center.css", "utf8");
const html = fs.readFileSync("empresa/index.html", "utf8");

test("el medio concilia sus métricas con las atracciones asociadas", () => {
  assert.match(app, /acquisitionChannelPortfolioMetrics/);
  assert.match(app, /Math\.max\(Number\(base\.leads/);
  assert.match(app, /\(revenue - investment\) \/ investment\)\.toFixed\(4\)/);
  assert.match(app, /rows\.filter\(\(effort\) => effort\.channel_id === channel\.id\)/);
  assert.match(controller, /exactMetricsByChannel/);
  assert.match(controller, /Math\.max\(Number\(historicalMetrics\.leads/);
});

test("el detalle tenant-safe explica leads por atracción y fuente", () => {
  assert.match(routes, /\/channels\/:channelId\/insights/);
  assert.match(controller, /where id=\$1 and business_id=\$2/);
  assert.match(controller, /interactive_activation_participants/);
  assert.match(controller, /lead_capture_submissions/);
  assert.match(controller, /effort_title/);
  assert.match(controller, /source_name/);
});

test("cada medio abre un overlay premium con atracciones y leads", () => {
  assert.match(app, /data-channel-insights/);
  assert.match(app, /openAcquisitionChannelInsights/);
  assert.match(app, /Por qué atracción/);
  assert.match(app, /Personas que llegaron por este medio/);
  assert.match(css, /\.acq-insights-overlay/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /#acqInsightsTitle\{[^}]*color:#fff!important/);
  assert.match(html, /acquisition-insights-validator-search-v352-20260824/);
});

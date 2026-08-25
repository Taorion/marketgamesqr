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
  assert.match(routes, /\/channel-efforts\/:effortId\/insights/);
  assert.match(controller, /where id=\$1 and business_id=\$2/);
  assert.match(controller, /interactive_activation_participants/);
  assert.match(controller, /lead_capture_submissions/);
  assert.match(controller, /effort_title/);
  assert.match(controller, /source_name/);
});

test("la atraccion atribuye ventas QR y conversiones posteriores del lead sin duplicar", () => {
  assert.match(controller, /async function acquisitionEffortSales/);
  assert.match(controller, /from attributed_sales sale/);
  assert.match(controller, /not exists \(select 1 from attributed_sales legacy/);
  assert.match(controller, /sale\.metadata->>'crm_lead_id'/);
  assert.match(controller, /LEAD_CONVERSION/);
  assert.match(controller, /total_revenue/);
});

test("una atraccion activa exige fuente y conserva siempre su pertenencia al medio", () => {
  assert.match(controller, /Una atraccion activa debe tener una fuente medible exclusiva/);
  assert.match(app, /syncChannelEffortCreativeAttribution/);
  assert.match(app, /Sin una activaci.n o activo enlazado no es posible atribuir personas ni ventas/);
  assert.match(app, /asignada a/);
});

test("cada medio abre un overlay premium con atracciones y leads", () => {
  assert.match(app, /data-channel-insights/);
  assert.match(app, /openAcquisitionChannelInsights/);
  assert.match(app, /Por qué atracción/);
  assert.match(app, /Personas que llegaron por este medio/);
  assert.match(app, /openAcquisitionEffortInsights/);
  assert.match(app, /Ventas atribuidas a esta atracci.n/);
  assert.match(app, /data-effort-insights/);
  assert.match(css, /\.acq-insights-overlay/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /#acqInsightsTitle\{[^}]*color:#fff!important/);
  assert.match(html, /acquisition-lead-sales-trace-v353-20260824/);
});

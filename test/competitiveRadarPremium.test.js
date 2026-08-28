const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("el Radar exige un competidor real y no inventa relaciones por texto", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  assert.match(controller, /const competitorProductSchema = z\.object\(\{[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.match(controller, /const competitorFindingSchema = z\.object\(\{[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.match(controller, /const competitorCampaignSchema = z\.object\(\{[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.match(controller, /const competitorEventSchema = z\.object\(\{[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.match(controller, /const competitorTaskSchema = z\.object\(\{[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.doesNotMatch(controller, /resolveCompetitorForProduct/);
  assert.match(controller, /Ya existe un competidor con ese nombre en este negocio/);
});

test("el resumen se calcula en servidor sin depender de listas truncadas", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  const app = read("empresa/js/app.js");
  assert.match(controller, /async function competitiveRadarSummary/);
  assert.match(controller, /open_tasks/);
  assert.match(controller, /overdue_tasks/);
  assert.match(routes, /competitive-radar\/summary/);
  assert.match(app, /path: "\/api\/business\/competitive-radar\/summary"/);
  assert.match(app, /Promise\.allSettled/);
  assert.match(app, /competitionLoadFailures/);
});

test("las acciones validan pertenencia empresarial y tienen interfaz completa", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  assert.match(controller, /assertTaskReferencesBelongToBusiness/);
  assert.match(controller, /finding\.rows\[0\]\.competitor_id.*payload\.competitor_id/s);
  assert.match(html, /id="competitionPanelTasks"/);
  assert.match(html, /id="competitorTaskCompetitorInput" required/);
  assert.match(html, /id="competitorTaskTable"/);
  assert.match(app, /async function submitCompetitorTask/);
  assert.match(app, /async function completeCompetitorTask/);
  assert.match(app, /async function archiveCompetitorTask/);
});

test("la migraciÃ³n protege claves forÃ¡neas por empresa e indexa el flujo", () => {
  const migration = read("database/migrations/202608280001_competitive_radar_premium.sql");
  assert.match(migration, /foreign key \(business_id, competitor_id\) references business_competitors\(business_id, id\) on delete restrict/g);
  assert.match(migration, /foreign key \(business_id, finding_id\) references business_competitor_findings\(business_id, id\) on delete restrict/);
  assert.match(migration, /foreign key \(business_id, related_campaign_id\) references campaigns\(business_id, id\) on delete restrict/);
  assert.match(migration, /idx_business_competitor_tasks_business_competitor_status/);
  assert.match(migration, /set is_active = false, status = 'INACTIVE'/);
});

test("la experiencia conserva pestaÃ±a, informa fallos y es accesible", () => {
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  const styles = read("empresa/css/competition-premium.css");
  assert.match(html, /competition-premium\.css\?v=competition-command-v1-20260828/);
  assert.match(html, /class="[^"]*competition-navigation[^"]*" role="tablist"/);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(app, /setCompetitionTab\(state\.competitionTab \|\| "competitors"\)/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /aria-selected/);
  assert.match(styles, /competition-command-v1-20260828/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

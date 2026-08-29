const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("el Radar exige producto central y proveedor reales sin inventar relaciones por texto", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  assert.match(controller, /const competitiveProductSchema = z\.object\(\{[\s\S]*?name: z\.string\(\)\.trim\(\)\.min\(2\)/);
  assert.match(controller, /const competitorProductSchema = z\.object\(\{[\s\S]*?competitive_product_id: z\.string\(\)\.uuid\(\)[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.match(controller, /const competitorFindingSchema = z\.object\(\{[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.match(controller, /const competitorCampaignSchema = z\.object\(\{[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.match(controller, /const competitorEventSchema = z\.object\(\{[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.match(controller, /const competitorTaskSchema = z\.object\(\{[\s\S]*?competitor_id: z\.string\(\)\.uuid\(\)/);
  assert.doesNotMatch(controller, /resolveCompetitorForProduct/);
  assert.match(controller, /assertCompetitiveProductBelongsToBusiness/);
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
  assert.match(app, /path: "\/api\/business\/competitive-products\?limit=800"/);
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
  assert.match(html, /competition-premium\.css\?v=competition-intelligence-studio-v3-20260828/);
  assert.match(html, /class="[^"]*competition-navigation[^"]*" role="tablist"/);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /id="newRadarProductButton"/);
  assert.match(html, /id="competitionCompetitiveProductSelect" required/);
  assert.match(html, /id="competitionComparisonProductSelect"/);
  assert.match(app, /setCompetitionTab\(state\.competitionTab \|\| "products"\)/);
  assert.match(app, /function renderRadarProductCatalog/);
  assert.match(app, /competitive_product_id: competitionCompetitiveProductSelect/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /aria-selected/);
  assert.match(styles, /competition-intelligence-v2-20260828/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("la migracion producto-centrica conserva el historico y asegura relaciones tenant-safe", () => {
  const migration = read("database/migrations/20260828163000_competitive_radar_product_center.sql");
  assert.match(migration, /create table if not exists business_competitive_products/);
  assert.match(migration, /add column if not exists competitive_product_id uuid/);
  assert.match(migration, /foreign key \(business_id, competitive_product_id\)/);
  assert.match(migration, /references business_competitive_products\(business_id, id\)/);
  assert.match(migration, /idx_business_competitor_products_product_provider/);
});

test("la inteligencia del Radar compara precios normalizados sin reescribir observaciones historicas", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const migration = read("database/migrations/20260828213435_radar_product_intelligence.sql");
  assert.match(migration, /comparison_quantity numeric\(14,4\) not null default 1/);
  assert.match(migration, /check \(comparison_quantity > 0\)/);
  assert.match(controller, /normalized_competitor_price/);
  assert.match(controller, /competitor_price\s*\/\s*nullif\([a-z]+\.comparison_quantity, 0\)/);
  assert.match(controller, /current_own_price/);
  assert.doesNotMatch(controller, /update business_competitor_products[\s\S]{0,500}our_price = \$1[\s\S]{0,500}competitive_product_id/i);
  assert.match(controller, /join business_competitors c[\s\S]*?c\.is_active = true/);
});

test("campanas eventos hallazgos y acciones quedan atribuidos al producto analizado", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const migration = read("database/migrations/20260828213435_radar_product_intelligence.sql");
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  for (const table of ["business_competitor_campaigns", "business_competitor_events", "business_competitor_findings", "business_competitor_tasks"]) {
    assert.match(migration, new RegExp(`alter table ${table}\\s+add column if not exists competitive_product_id uuid`, "i"));
  }
  assert.match(controller, /assertOptionalCompetitiveProductBelongsToBusiness/);
  for (const id of ["competitorCampaignProductInput", "competitorEventProductInput", "findingProductInput", "competitorTaskProductInput"]) {
    assert.match(html, new RegExp(`id="${id}" required`));
  }
  assert.match(app, /requireSelectedRadarProduct/);
  assert.match(app, /competitive_product_id: competitorCampaignProductInput/);
  assert.match(app, /competitive_product_id: competitorEventProductInput/);
  assert.match(app, /competitive_product_id: findingProductInput/);
  assert.match(app, /competitive_product_id: competitorTaskProductInput/);
});

test("el estudio premium incluye taxonomia reutilizable y tres visualizaciones accesibles", () => {
  const migration = read("database/migrations/20260828213435_radar_product_intelligence.sql");
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  const styles = read("empresa/css/competition-premium.css");
  assert.match(migration, /category_id uuid/);
  assert.match(migration, /subcategory_id uuid/);
  assert.match(html, /id="radarTaxonomyButton"/);
  assert.match(html, /id="radarProductCategoryInput"/);
  assert.match(html, /id="radarPricePositionChart"/);
  assert.match(html, /id="radarPriceTrendChart"/);
  assert.match(html, /id="radarMarketActivityChart"/);
  assert.match(app, /function renderRadarProductIntelligence/);
  assert.match(app, /function renderRadarPriceTrendChart/);
  assert.match(app, /function renderRadarMarketActivityChart/);
  assert.match(styles, /\.radar-product-intelligence/);
  assert.match(styles, /\.radar-line-chart/);
  assert.match(styles, /@media \(max-width: 430px\)/);
});

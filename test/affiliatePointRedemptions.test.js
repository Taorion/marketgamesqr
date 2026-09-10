const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("affiliate redemption API is tenant scoped, atomic and idempotent", () => {
  const service = read("backend/src/services/affiliateService.js");
  const controller = read("backend/src/controllers/affiliateController.js");
  const routes = read("backend/src/routes/affiliateRoutes.js");

  assert.match(routes, /affiliates\/:affiliateId\/redemptions/);
  assert.match(controller, /idempotency_key: z\.string\(\)\.trim\(\)\.min\(8\)/);
  assert.match(service, /where business_id = \$1 and id = \$2 and status <> 'DELETED'[\s\S]*for update/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /points_total = points_total - \$3/);
  assert.match(service, /points_total >= \$3/);
  assert.match(service, /points_awarded, reason, metadata\)[\s\S]*-points/);
  assert.match(service, /affiliate_point_redemptions[\s\S]*idempotency_key/);
});

test("automatic redemption recalculates product or reward cost on the server", () => {
  const service = read("backend/src/services/affiliateService.js");
  assert.match(service, /from business_inventory_products[\s\S]*business_id = \$1 and id = \$2/);
  assert.match(service, /affiliatePointsForAmount\(product\.unit_price, pointRules\)/);
  assert.match(service, /from affiliate_reward_rules[\s\S]*required_points/);
  assert.match(service, /Saldo insuficiente/);
});

test("affiliate UI supports catalog and manual redemption with an immediate balance preview", () => {
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");

  assert.match(html, /id="affiliateRedemptionItemInput"/);
  assert.match(html, /id="affiliateRedemptionPointsInput"/);
  assert.match(html, /id="affiliateRedemptionReasonInput"/);
  assert.match(html, /id="affiliateRedeemPointsButton"/);
  assert.match(app, /function renderAffiliateRedemptionControls\(\)/);
  assert.match(app, /Saldo final:/);
  assert.match(app, /payload\.inventory_product_id = selection\.id/);
  assert.match(app, /else payload\.points = points/);
  assert.match(app, /affiliateRedemptionIdempotencyKey/);
});

test("redemption persistence keeps a dedicated audit record linked to the ledger", () => {
  const schema = read("database/schema.sql");
  const migration = read("database/migrations/202609100001_affiliate_point_redemptions.sql");
  for (const sql of [schema, migration]) {
    assert.match(sql, /create table if not exists affiliate_point_redemptions/);
    assert.match(sql, /ledger_id uuid not null unique references affiliate_point_ledger/);
    assert.match(sql, /points_redeemed integer not null check \(points_redeemed > 0\)/);
    assert.match(sql, /unique \(business_id, idempotency_key\)/);
  }
});

test("affiliate detail separates lifetime earned and redeemed totals with breakdowns", () => {
  const service = read("backend/src/services/affiliateService.js");
  const controller = read("backend/src/controllers/affiliateController.js");
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");

  assert.match(service, /async function getAffiliatePointHistorySummary/);
  assert.match(service, /sum\(case when points_awarded > 0 then points_awarded else 0 end\)/);
  assert.match(service, /sum\(case when points_awarded < 0 then abs\(points_awarded\) else 0 end\)/);
  assert.match(service, /where business_id = \$1[\s\S]*affiliate_id = \$2[\s\S]*group by 1, 2/);
  assert.match(controller, /res\.json\(\{ affiliate, ledger, point_summary, reward_unlocks \}\)/);
  assert.match(html, /id="affiliatePointsHistorySummary"/);
  assert.match(app, /Total ganado/);
  assert.match(app, /Total redimido/);
  assert.match(app, /C[óÃ³]mo gan[óÃ³] sus puntos/);
  assert.match(app, /Historial de puntos redimidos/);
  assert.match(app, /state\.selectedAffiliatePointSummary = detail\.point_summary/);
});

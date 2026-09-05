const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const { rankingTransitionAllowed, rewardPositions } = require("../backend/src/services/gamificationRankingCore");

test("reward rules resolve exact, ranged and top positions", () => {
  assert.deepEqual(rewardPositions({ position: 1 }, 5), [1]);
  assert.deepEqual(rewardPositions({ position: "2-3" }, 5), [2, 3]);
  assert.deepEqual(rewardPositions({ position: "top_3" }, 2), [1, 2]);
  assert.deepEqual(rewardPositions({ condition: "3_rebuys" }, 10), []);
});

test("ranking lifecycle only allows explicit safe transitions", () => {
  assert.equal(rankingTransitionAllowed("DRAFT", "ACTIVE"), true);
  assert.equal(rankingTransitionAllowed("ACTIVE", "PAUSED"), true);
  assert.equal(rankingTransitionAllowed("PAUSED", "ACTIVE"), true);
  assert.equal(rankingTransitionAllowed("ACTIVE", "CLOSED"), true);
  assert.equal(rankingTransitionAllowed("CLOSED", "ACTIVE"), false);
  assert.equal(rankingTransitionAllowed("DRAFT", "FINISHED"), false);
});

test("database automation covers every canonical ranking event idempotently", () => {
  const migration = read("database/migrations/20260905122242_ranking_premium_automation.sql");
  assert.match(migration, /uq_gamification_points_event/);
  assert.match(migration, /on conflict \(business_id, season_id, event_key\).*do nothing/is);
  assert.match(migration, /trg_qori_ranking_business_sale/);
  assert.match(migration, /trg_qori_ranking_trivia_attempt/);
  assert.match(migration, /trg_qori_ranking_participation/);
  assert.match(migration, /trg_qori_ranking_qr_redemption/);
  assert.match(migration, /coalesce\(new\.sale_status, 'PAID'\) <> 'PAID'/);
  assert.match(migration, /delete from gamification_points_ledger[\s\S]*action_type in \('PURCHASE', 'REBUY', 'REFERRAL'\)/);
  assert.match(migration, /new\.referred_affiliate_id,[\s\S]*'REFERRAL'/);
  for (const action of ["PURCHASE", "REBUY", "REFERRAL", "TRIVIA_ANSWER", "TRIVIA_CORRECT", "PARTICIPATION", "TICKET_REDEEMED"]) {
    assert.match(migration, new RegExp(`'${action}'`));
  }
});

test("service keeps ranking, mission and leaderboard consistent", () => {
  const service = read("backend/src/services/gamificationMissionService.js");
  assert.match(service, /return withTransaction\(async \(client\) => \{/);
  assert.match(service, /update gamification_missions/);
  assert.match(service, /update gamification_leaderboards/);
  assert.match(service, /sale\.campaign_id = s\.campaign_id/);
  assert.match(service, /generateSeasonRewards/);
  assert.match(service, /ranking_task_key/);
});

test("ranking mutations are role protected", () => {
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  assert.match(routes, /const requireRankingManager = requireRoles\("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"\)/);
  assert.match(routes, /router\.post\("\/gamification\/seasons", requireRankingManager/);
  assert.match(routes, /router\.delete\("\/gamification\/seasons\/:id", requireRankingManager/);
  assert.match(routes, /router\.post\("\/gamification\/rewards\/:id\/deliver", requireRankingManager/);
});

test("premium ranking UI exposes complete desktop and mobile workflows", () => {
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  const css = read("empresa/css/ranking-premium.css");
  assert.match(html, /<strong>Ranking<\/strong>/);
  assert.match(html, /id="missionsCreateButton"/);
  assert.match(html, /id="missionSeasonIdInput"/);
  assert.match(html, /id="missionsBackToGlobalButton"/);
  assert.match(app, /openMissionEditor/);
  assert.match(app, /deleteMissionSeason/);
  assert.match(app, /missionMutationBusy/);
  assert.match(app, /formatDateOnly\(season\.start_date\)/);
  assert.match(app, /\[\$\{rule\.action_type\}\]/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /width: calc\(100vw - 16px\)/);
  assert.match(css, /mission-season-operations-grid > \.span-2/);
});

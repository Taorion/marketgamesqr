const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const app = fs.readFileSync("empresa/js/app.js", "utf8");
const controller = fs.readFileSync("backend/src/controllers/interactiveActivationController.js", "utf8");
const service = fs.readFileSync("backend/src/services/interactiveActivationService.js", "utf8");

function appFunctionSource(name, nextName) {
  const start = app.indexOf(`function ${name}`);
  const end = app.indexOf(`function ${nextName}`, start);
  assert.ok(start >= 0 && end > start, `Unable to extract ${name}`);
  return app.slice(start, end);
}

test("campaign activation lookup uses the persisted campaign id and authenticated tenant", () => {
  assert.match(controller, /campaign_id: z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(controller, /listInteractiveActivations\(businessIdFor\(req\)/);
  assert.match(service, /where company_id = \$1[\s\S]*campaign_id = \$5::uuid/);
  assert.match(service, /c\.business_id = a\.company_id/);
  assert.match(service, /br\.business_id = a\.company_id/);
});

test("campaign workspace clears stale relations and requests the selected campaign id", () => {
  assert.match(app, /state\.campaignRelatedActivationsCampaignId = campaignId;[\s\S]*state\.campaignRelatedActivationsLoading = true;[\s\S]*state\.campaignRelatedActivations = \[\];/);
  assert.match(app, /interactive-activations\?campaign_id=\$\{encodeURIComponent\(campaignId\)\}/);
  assert.match(app, /String\(activation\.campaign_id \|\| ""\) === normalizedCampaignId/);
});

test("campaign switching returns one, many or zero relations without carrying stale rows", () => {
  const context = {
    state: {
      campaignRelatedActivationsCampaignId: "campaign-a",
      campaignRelatedActivations: [
        { id: "activation-a", campaign_id: "campaign-a", created_at: "2026-08-01" },
      ],
      campaignPremiumActivations: [
        { id: "activation-a", campaign_id: "campaign-a", created_at: "2026-08-01" },
        { id: "activation-b1", campaign_id: "campaign-b", created_at: "2026-08-02" },
        { id: "activation-b2", campaign_id: "campaign-b", created_at: "2026-08-03" },
      ],
    },
  };
  vm.runInNewContext(`${appFunctionSource("campaignConnectedActivationRows", "campaignConnectedExperiencesMarkup")}; this.rowsFor = campaignConnectedActivationRows;`, context);

  assert.deepEqual(Array.from(context.rowsFor("campaign-a"), (row) => row.id), ["activation-a"]);
  context.state.campaignRelatedActivationsCampaignId = "campaign-b";
  context.state.campaignRelatedActivations = [
    { id: "activation-b1", campaign_id: "campaign-b", created_at: "2026-08-02" },
    { id: "activation-b2", campaign_id: "campaign-b", created_at: "2026-08-03" },
  ];
  assert.deepEqual(Array.from(context.rowsFor("campaign-b"), (row) => row.id), ["activation-b2", "activation-b1"]);
  context.state.campaignRelatedActivationsCampaignId = "campaign-c";
  context.state.campaignRelatedActivations = [];
  assert.deepEqual(Array.from(context.rowsFor("campaign-c"), (row) => row.id), []);
});

test("Conectar experiencia renders every linked activation and the exact empty state", () => {
  assert.match(app, /data-campaign-connected-experiences/);
  assert.match(app, /<span class="mono-label">Conectar experiencia<\/span>/);
  assert.match(app, /activations\.map\(campaignRelatedActivationCard\)\.join\(""\)/);
  assert.match(app, /<div class="campaign-related-empty">Sin Activaciones<\/div>/);
  assert.doesNotMatch(app, /activations\.slice\(0, 8\)\.map\(campaignRelatedActivationCard\)/);
});

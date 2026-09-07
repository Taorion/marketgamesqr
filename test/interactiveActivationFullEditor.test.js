const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const appSource = read("empresa", "js", "app.js");
const htmlSource = read("empresa", "index.html");
const cssSource = read("empresa", "css", "styles.css");
const serviceSource = read("backend", "src", "services", "interactiveActivationService.js");
const validatorSource = read("backend", "src", "utils", "validators.js");
const migrationSource = read("database", "migrations", "202609070001_interactive_activation_acquisition_channel.sql");

test("activation creation and editing use the canonical acquisition channel id", () => {
  assert.match(htmlSource, /id="triviaAcquisitionChannelInput"/);
  assert.match(appSource, /acquisition_channel_id: triviaAcquisitionChannelInput\?\.value \|\| null/);
  assert.match(appSource, /id="activationEditAcquisitionChannelInput"/);
  assert.match(appSource, /payload\.acquisition_channel_id = acquisitionChannelId/);
  assert.match(validatorSource, /acquisition_channel_id: z\.string\(\)\.uuid\(\)\.optional\(\)\.nullable\(\)/);
});

test("the backend validates tenant ownership and persists acquisition attribution", () => {
  assert.match(serviceSource, /from business_acquisition_channels where id = \$1 and business_id = \$2/);
  assert.match(serviceSource, /left join business_acquisition_channels ac on ac\.id = a\.acquisition_channel_id and ac\.business_id = a\.company_id/);
  assert.match(serviceSource, /acquisition_channel_source: metadata\.acquisition_channel_source \|\| \(activation\.acquisition_channel_id \? "ACTIVATION" : null\)/);
  assert.match(migrationSource, /add column if not exists acquisition_channel_id uuid references business_acquisition_channels\(id\) on delete set null/);
});

test("the editor exposes the operational configuration and protects historic associations", () => {
  for (const id of [
    "activationEditCampaignInput",
    "activationEditAcquisitionChannelInput",
    "activationEditBranchInput",
    "activationEditStartsAtInput",
    "activationEditEndsAtInput",
    "activationEditSellerInput",
    "activationEditMaxParticipantsInput",
    "activationEditMaxRewardsInput",
    "activationEditRewardCostInput",
    "activationEditRewardTypeInput",
    "activationEditRewardLabelInput",
    "activationEditRewardValueInput",
    "activationEditRewardConditionsInput",
    "activationEditCooldownInput",
    "activationEditWinnerPolicyInput",
    "activationEditInviteInput",
    "activationEditTermsInput",
  ]) assert.match(appSource, new RegExp(`id="${id}"`));
  assert.match(appSource, /Medio actual:/);
  assert.match(appSource, /Campaña actual:/);
  assert.match(appSource, /Sede actual:/);
});

test("the full editor remains contained and actionable on mobile", () => {
  assert.match(cssSource, /activation-full-editor-v437-20260907/);
  assert.match(cssSource, /#activationEditModal \.activation-edit-form[\s\S]*overflow-y: auto !important/);
  assert.match(cssSource, /@media \(max-width: 640px\)[\s\S]*max-height: 100dvh !important/);
  assert.match(cssSource, /#activationEditModal \.modal-button-row[\s\S]*position: sticky !important/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const portalSource = read("empresa", "js", "app.js");
const publicSource = read("activacion", "activation.js");
const publicHtml = read("activacion", "index.html");
const serviceSource = read("backend", "src", "services", "interactiveActivationService.js");

test("digital fulfillment removes stale ecommerce code and redemption URL data", () => {
  const helper = portalSource.slice(
    portalSource.indexOf("function withBenefitFulfillment"),
    portalSource.indexOf("function benefitFulfillmentObject")
  );
  assert.match(helper, /delete nextValue\.ecommerce_code/);
  assert.match(helper, /delete nextValue\.ecommerce_url/);
  assert.match(helper, /if \(fulfillment\.mode === "DIGITAL_ASSET"\) nextValue\.digital_asset_id = fulfillment\.asset_id/);
});

test("digital result renders only the secure asset download action", () => {
  const digitalBranch = publicSource.slice(
    publicSource.indexOf("data.rewarded && isDigitalAssetReward"),
    publicSource.indexOf(": data.rewarded && isEcommerceReward")
  );
  assert.match(digitalBranch, /Descargar activo/);
  assert.doesNotMatch(digitalBranch, /data-copy-benefit-link|Copiar link|Codigo|Código|QR/);
  assert.match(publicSource, /else if \(data\.rewarded && !isDigitalAssetReward\)/);
  assert.match(publicHtml, /digital-download-only=v441-20260907/);
});

test("QR ticket rewards can copy their benefit link without restoring share actions", () => {
  assert.match(publicSource, /const benefitUrl = !isDigitalAssetReward \? String\(data\.benefit_url \|\| ""\) : ""/);
  assert.match(publicSource, /data-copy-benefit-link/);
  assert.match(publicSource, /Copiar link del beneficio/);
  assert.doesNotMatch(publicSource, /shareRewardQrButton|shareRewardQr|Compartir QR/);
  assert.match(publicHtml, /participant-actions=v442-20260907/);
  assert.match(publicHtml, /ticket-benefit-link=v448-20260907/);
});

test("backend issues a digital reward without creating a QR or redemption response", () => {
  const generator = serviceSource.slice(
    serviceSource.indexOf("async function generateInteractiveDigitalAssetReward"),
    serviceSource.indexOf("async function generateInteractiveRewardQr")
  );
  assert.match(generator, /qr_code_id, qr_token, public_code/);
  assert.match(generator, /values \(\$1, \$2, \$3, null/);
  assert.match(generator, /'digital_asset_delivered'/);
  assert.doesNotMatch(generator, /insert into qr_codes|buildValidatorUrl|buildBenefitUrl|QR_CREATED/);

  const completion = serviceSource.slice(
    serviceSource.indexOf("async function completeInteractiveParticipant"),
    serviceSource.indexOf("async function existingRewardResponseForIdentity")
  );
  assert.match(completion, /fulfillment\.mode === "DIGITAL_ASSET"[\s\S]*generateInteractiveDigitalAssetReward/);
  assert.match(completion, /\.\.\.\(fulfillment\.mode === "DIGITAL_ASSET" \? \{\} : \{/);
});

test("recovery returns the existing download without exposing QR or redemption links", () => {
  const recovery = serviceSource.slice(
    serviceSource.indexOf("async function existingRewardResponseForIdentity"),
    serviceSource.indexOf("async function lockActivationBySlug")
  );
  assert.match(recovery, /if \(fulfillment\.mode === "DIGITAL_ASSET"\)/);
  const digitalRecovery = recovery.slice(recovery.indexOf("if (fulfillment.mode === \"DIGITAL_ASSET\")"), recovery.indexOf("const validatorUrl"));
  assert.match(digitalRecovery, /digital_asset: digitalAsset/);
  assert.doesNotMatch(digitalRecovery, /validator_url|benefit_url|qr_image_data_url|qr_code:/);
});

test("digital deliveries are not reported as generated QR codes", () => {
  assert.match(serviceSource, /count\(distinct q\.id\)::int as qr_generated/);
  assert.match(serviceSource, /digital_asset_delivered: participantsHistory\.filter/);
});

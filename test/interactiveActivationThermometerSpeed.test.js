const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const portalHtml = read("empresa", "index.html");
const portalSource = read("empresa", "js", "app.js");
const publicSource = read("activacion", "activation.js");
const service = require("../backend/src/services/interactiveActivationService");

test("the business chooses a friendly thermometer difficulty", () => {
  assert.match(portalHtml, /id="thermometerSpeedInput"/);
  assert.match(portalHtml, /Lenta · más fácil/);
  assert.match(portalHtml, /Rápida · difícil/);
  assert.match(portalHtml, /Muy rápida · experta/);
  assert.match(portalSource, /function collectThermometerSpeed\(\)/);
});

test("thermometer speed is persisted in interaction config", () => {
  assert.match(portalSource, /thermometer_speed: collectThermometerSpeed\(\)/);
  assert.match(portalSource, /speed_percent_per_second: Number\(activationPayload\.thermometer_speed \|\| 90\)/);
});

test("public thermometer uses time-based configured movement and stops its animation", () => {
  assert.match(publicSource, /interaction_config\?\.speed_percent_per_second \|\| 90/);
  assert.match(publicSource, /position \+= direction \* speed \* elapsedSeconds/);
  assert.match(publicSource, /window\.requestAnimationFrame\(movePointer\)/);
  assert.match(publicSource, /window\.cancelAnimationFrame\(animationFrame\)/);
  assert.doesNotMatch(publicSource.slice(publicSource.indexOf("function renderThermometer"), publicSource.indexOf("function renderMinigame")), /setInterval/);
});

test("thermometer clearly blocks digital assets and ecommerce in the creation window", () => {
  assert.match(portalHtml, /id="thermometerFulfillmentNotice"[\s\S]*exclusivamente un ticket QR/);
  assert.match(portalHtml, /El Termómetro genera exclusivamente un ticket QR con el descuento obtenido/);
  assert.match(portalSource, /function syncThermometerFulfillmentRestriction/);
  assert.match(portalSource, /option\.disabled = restricted && option\.value !== "PHYSICAL_QR"/);
  assert.match(portalSource, /if \(restricted\) triviaBenefitFulfillmentModeInput\.value = "PHYSICAL_QR"/);
});

test("backend always converts thermometer rewards into physical discount tickets", () => {
  const result = service.thermometerTicketRewardValue({
    percent: 25,
    digital_asset_id: "asset-1",
    ecommerce_code: "CODE25",
    fulfillment: { mode: "DIGITAL_ASSET", asset_id: "asset-1" },
  });
  assert.equal(result.percent, 25);
  assert.equal(result.fulfillment.mode, "PHYSICAL_QR");
  assert.equal(result.redemption_channel, "physical_store");
  assert.equal(result.digital_asset_id, undefined);
  assert.equal(result.ecommerce_code, undefined);
});

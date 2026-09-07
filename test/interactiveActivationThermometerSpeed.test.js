const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const portalHtml = read("empresa", "index.html");
const portalSource = read("empresa", "js", "app.js");
const publicSource = read("activacion", "activation.js");

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

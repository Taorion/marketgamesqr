const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Runner se configura como canasta de frutas y conserva compatibilidad", () => {
  const portal = read("empresa/js/app.js");
  const player = read("activacion/activation.js");
  assert.match(portal, /DODGE_RUNNER:\s*\{[\s\S]*bad_fruit_rate[\s\S]*fruit_spawn_ms[\s\S]*fruit_fall_speed[\s\S]*basket_speed[\s\S]*basket_width/);
  assert.match(read("backend/src/services/interactiveActivationService.js"), /DODGE_RUNNER", label: "Runner · Canasta de frutas"/);
  assert.match(portal, /Puntos por fruta fresca/);
  assert.match(portal, /Vidas ante frutas dañadas/);
  assert.match(player, /fruit_spawn_ms \?\? runtime\.config\.runner_spawn_ms/);
  assert.match(player, /fruit_fall_speed \?\? config\.runner_item_speed/);
  assert.match(player, /bad_fruit_rate \?\? config\.bad_item_rate/);
});

test("la canasta se mueve exclusivamente de izquierda a derecha", () => {
  const player = read("activacion/activation.js");
  const start = player.indexOf("function startDodgeRunner");
  const end = player.indexOf("function createFallingFruit", start);
  const runner = player.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(runner, /basket\.targetX/);
  assert.match(runner, /runtime\.keys\.left/);
  assert.match(runner, /runtime\.keys\.right/);
  assert.doesNotMatch(runner, /runtime\.keys\.(up|down)/);
  assert.doesNotMatch(runner, /basket\.y\s*[+\-]=/);
  assert.match(player, /fruit-basket-controls[\s\S]*data-game-control="left"[\s\S]*data-game-control="right"/);
});

test("solo recoger una fruta dañada quita vidas", () => {
  const player = read("activacion/activation.js");
  const start = player.indexOf("function startDodgeRunner");
  const end = player.indexOf("function createFallingFruit", start);
  const runner = player.slice(start, end);
  assert.match(runner, /if \(caught\) \{[\s\S]*if \(fruit\.good\)[\s\S]*runtime\.addScore\(runtime\.points\)[\s\S]*else \{[\s\S]*runtime\.setLives\(runtime\.lives - 1\)/);
  assert.match(runner, /else if \(fruit\.y - fruit\.r > height\) \{\s*if \(fruit\.good\) missedGood \+= 1;\s*fruits\.splice/);
  assert.match(runner, /good_fruits_caught:[\s\S]*bad_fruits_caught:[\s\S]*good_fruits_missed:/);
});

test("Runner tiene identidad visual de cosecha, vista previa y móvil", () => {
  const player = read("activacion/activation.js");
  const styles = read("activacion/styles.css");
  const publicHtml = read("activacion/index.html");
  const portalHtml = read("empresa/index.html");
  const portal = read("empresa/js/app.js");
  assert.match(player, /drawFruitBasketPreview/);
  assert.match(player, /drawFruitOrchard/);
  assert.match(player, /drawFruitBasket/);
  assert.match(player, /fruit-basket-legend/);
  assert.match(styles, /\.fruit-basket-panel/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.fruit-basket-panel \.game-hud \{ grid-template-columns: repeat\(2/);
  assert.match(publicHtml, /runner-basket=v462-20260909/g);
  assert.match(portalHtml, /runner-basket=v462-20260909/g);
  assert.match(portal, /empresa-20260909-activation-status-filters-v467/);
});

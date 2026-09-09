const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Golpea el topo ofrece una configuración comercial clara y persistible", () => {
  const portal = read("empresa/js/app.js");
  assert.match(portal, /WHACK_A_MOLE:\s*\{[\s\S]*board_layout[\s\S]*whack_difficulty[\s\S]*golden_target_rate[\s\S]*combo_bonus/);
  assert.match(portal, /6 huecos · fácil/);
  assert.match(portal, /9 huecos · recomendado/);
  assert.match(portal, /12 huecos · experto/);
  assert.match(portal, /config\.hole_rows = boundedInteger\(rows, 3, 2, 4\)/);
  assert.match(portal, /trampas y topos dorados no puede superar el 60%/);
  assert.match(portal, /whackMode \? "Puntos por topo"/);
  assert.match(portal, /minigameFireIntervalInput\?\.closest\("label"\)\?\.classList\.toggle\("hidden", whackMode \|\| basketMode\)/);
});

test("la experiencia pública usa tablero táctil dedicado y castigos justos", () => {
  const player = read("activacion/activation.js");
  assert.match(player, /whackMode \? "whack-a-mole-panel"/);
  assert.match(player, /Topo dorado: puntos extra/);
  assert.match(player, /whackMode \? "hidden"/);
  assert.match(player, /if \(whackMode\) drawWhackPreview/);
  assert.match(player, /runtime\.addScore\(-Math\.ceil\(runtime\.penalty \/ 2\)\)/);
  assert.match(player, /const targetY = targetHole\.y \+ 13 - visible \* \(targetHole\.r \+ 30\)/);
  assert.match(player, /const hitTarget = visible >= 0\.3/);
  assert.doesNotMatch(player, /if \(hitIndex < 0\) \{\s*runtime\.damage\(1\)/);
  assert.match(player, /target\.kind === "trap"[\s\S]*runtime\.damage\(1\)/);
  assert.match(player, /best_combo:[\s\S]*accuracy_percent:/);
});

test("el juego incorpora rachas, topo dorado, ritmo progresivo y feedback visual", () => {
  const player = read("activacion/activation.js");
  assert.match(player, /target\.kind === "gold" \? 2 : 1/);
  assert.match(player, /Math\.min\(combo - 1, 8\) \* comboBonus/);
  assert.match(player, /const ramp = 1 \+ Math\.min\(0\.42/);
  assert.match(player, /drawWhackMole\(/);
  assert.match(player, /drawWhackTrap\(/);
  assert.match(player, /drawWhackHammer\(/);
  assert.match(player, /drawWhackParticles\(/);
});

test("el tablero premium es responsive y sus assets salen versionados juntos", () => {
  const styles = read("activacion/styles.css");
  const publicHtml = read("activacion/index.html");
  const portalHtml = read("empresa/index.html");
  const portal = read("empresa/js/app.js");
  assert.match(styles, /\.whack-a-mole-panel \.game-hud \{[\s\S]*grid-template-columns: repeat\(4/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.whack-a-mole-panel \.game-hud \{ grid-template-columns: repeat\(2/);
  assert.match(publicHtml, /whack-a-mole=v461-20260909/g);
  assert.match(portalHtml, /whack-a-mole=v461-20260909/g);
  assert.match(portal, /empresa-20260909-runner-fruit-basket-v462/);
});

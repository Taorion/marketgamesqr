const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const serviceSource = fs.readFileSync(path.join(root, "backend", "src", "services", "interactiveActivationService.js"), "utf8");
const { ACTIVATION_CATALOG, listActivationCatalog } = require("../backend/src/services/interactiveActivationService");

const retainedApiTypes = [
  "QORI_CHASE",
  "QORI_SUMMIT",
  "TRIVIA_QUIZ",
  "OPEN_QUESTION",
  "SPIN_DISCOVER",
  "DISCOUNT_THERMOMETER",
  "QUICK_VOTE",
  "SEALED_LETTER",
  "PRIVATE_INVITATION",
  "SCRATCH_WIN",
  "SPACE_SHOOTER",
  "BREAKOUT",
  "SNAKE",
  "MEMORY_PAIRS",
  "WHACK_A_MOLE",
  "ROULETTE_SPIN",
  "ORDER_OPTIONS",
  "CONNECTORS",
  "BATTLESHIP_COORDS",
  "DODGE_RUNNER",
].sort();

const retainedPortalTypes = [
  "QORI_CHASE",
  "QORI_SUMMIT",
  "TRIVIA",
  "OPEN_QUESTION",
  "SPIN_DISCOVER",
  "THERMOMETER",
  "PRODUCT_VOTE",
  "SEALED_LETTER",
  "PRIVATE_INVITATION",
  "SCRATCH_DIGITAL",
  "SPACE_SHOOTER",
  "BREAKOUT",
  "SNAKE",
  "MEMORY_PAIRS",
  "WHACK_A_MOLE",
  "ROULETTE_SPIN",
  "ORDER_OPTIONS",
  "CONNECTORS",
  "BATTLESHIP_COORDS",
  "DODGE_RUNNER",
].sort();

test("el catálogo API publica las 20 activaciones, incluido Policías y Ladrones", () => {
  assert.deepEqual(ACTIVATION_CATALOG.map((item) => item.type).sort(), retainedApiTypes);
  assert.deepEqual(listActivationCatalog().items.map((item) => item.type).sort(), retainedApiTypes);
});

test("el selector del portal muestra las mismas 20 activaciones", () => {
  const picker = html.match(/<div class="full activation-type-picker"[\s\S]*?<input id="activationTypeInput"/)?.[0] || "";
  const types = Array.from(picker.matchAll(/data-activation-type="([A-Z_]+)"/g), (match) => match[1]).sort();
  assert.deepEqual(types, retainedPortalTypes);
});

test("los tipos retirados conservan lectura histórica pero no admiten nuevas creaciones", () => {
  assert.match(serviceSource, /const ALL_ACTIVATION_CATALOG = \[/);
  assert.match(serviceSource, /!RETAINED_ACTIVATION_TYPES\.has\(body\.activation_type\)/);
  assert.doesNotMatch(ACTIVATION_CATALOG.map((item) => item.type).join(" "), /FLEX_SURVEY|MINI_MAZE|TRUE_FALSE/);
});

test("las recetas rápidas solo seleccionan activaciones retenidas", () => {
  const recipes = app.match(/function applyGamingActivationRecipe[\s\S]*?const recipe = recipes\[recipeKey\]/)?.[0] || "";
  assert.match(recipes, /leads: \{ type: "OPEN_QUESTION"/);
  assert.match(recipes, /launch: \{ type: "PRIVATE_INVITATION"/);
  assert.doesNotMatch(recipes, /type: "SURVEY"|type: "WAITLIST"/);
});

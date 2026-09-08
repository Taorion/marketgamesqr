const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const serviceSource = fs.readFileSync(path.join(root, "backend", "src", "services", "interactiveActivationService.js"), "utf8");
const { ACTIVATION_CATALOG, listActivationCatalog } = require("../backend/src/services/interactiveActivationService");

const retainedApiTypes = [
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

test("el catálogo API publica únicamente las 18 activaciones definidas por Qori", () => {
  assert.deepEqual(ACTIVATION_CATALOG.map((item) => item.type).sort(), retainedApiTypes);
  assert.deepEqual(listActivationCatalog().items.map((item) => item.type).sort(), retainedApiTypes);
});

test("el selector del portal muestra únicamente las mismas 18 activaciones", () => {
  const picker = html.match(/<div class="full activation-type-picker"[\s\S]*?<input id="activationTypeInput"/)?.[0] || "";
  const types = Array.from(picker.matchAll(/data-activation-type="([A-Z_]+)"/g), (match) => match[1]).sort();
  assert.deepEqual(types, retainedPortalTypes);
});

test("los tipos retirados conservan lectura histórica pero no admiten nuevas creaciones", () => {
  assert.match(serviceSource, /const ALL_ACTIVATION_CATALOG = \[/);
  assert.match(serviceSource, /!RETAINED_ACTIVATION_TYPES\.has\(body\.activation_type\)/);
  assert.doesNotMatch(ACTIVATION_CATALOG.map((item) => item.type).join(" "), /FLEX_SURVEY|MINI_MAZE|TRUE_FALSE/);
});

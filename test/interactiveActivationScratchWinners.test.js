const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const service = require("../backend/src/services/interactiveActivationService");

const choices = [
  {
    value: "A",
    label: "20% de descuento",
    reward_label: "20% de descuento",
    reward_type: "PERCENT_DISCOUNT",
    reward_value: { percent: 20, is_winner: true },
    is_winner: true,
  },
  {
    value: "B",
    label: "No ganaste esta vez",
    reveal_label: "No ganaste esta vez",
    reward_value: { is_winner: false },
    is_winner: false,
  },
];

test("scratch choices can explicitly be winning or non-winning", () => {
  assert.equal(service.scratchChoiceOutcome(choices, "scratch-0").is_winner, true);
  assert.equal(service.scratchChoiceOutcome(choices, "scratch-1").is_winner, false);
  assert.equal(service.scratchChoiceOutcome(choices, "scratch-1").reveal_label, "No ganaste esta vez");
});

test("a losing scratch choice returns no reward while a winner keeps its benefit", () => {
  assert.equal(service.rewardFromScratchChoice(choices, "scratch-1"), null);
  const winner = service.rewardFromScratchChoice(choices, "scratch-0");
  assert.equal(winner.reward_label, "20% de descuento");
  assert.equal(winner.reward_value.percent, 20);
});

test("legacy scratch choices remain winners when the new flag is absent", () => {
  const outcome = service.scratchChoiceOutcome([{ value: "A", reward_label: "Regalo" }], "scratch-0");
  assert.equal(outcome.is_winner, true);
  assert.equal(service.rewardFromScratchChoice([{ value: "A", reward_label: "Regalo" }], "scratch-0").reward_label, "Regalo");
});

test("the portal offers winner selection on create and edit without JSON", () => {
  const html = read("empresa", "index.html");
  const portal = read("empresa", "js", "app.js");
  const runtime = read("activacion", "activation.js");
  const backend = read("backend", "src", "services", "interactiveActivationService.js");
  assert.match(html, /data-scratch-winner="A"/);
  assert.match(html, /No ganadora: no genera QR/);
  assert.match(portal, /data-edit-scratch-winner/);
  assert.match(portal, /Marca al menos una casilla ganadora/);
  assert.match(runtime, /Ver mi resultado/);
  assert.match(runtime, /Resultado del Raspa digital/);
  assert.match(backend, /scratch_result:[\s\S]*is_winner:[\s\S]*label:/);
  assert.doesNotMatch(runtime, /Generar mi QR para verlo/);
});

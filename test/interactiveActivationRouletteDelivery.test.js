const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const service = require("../backend/src/services/interactiveActivationService");

const choices = [
  {
    value: "ROULETTE_1",
    reward_label: "20% de descuento",
    reward_type: "PERCENT_DISCOUNT",
    delivery_mode: "physical",
    is_winner: true,
    reward_value: { percent: 20, is_winner: true, fulfillment: { mode: "PHYSICAL_QR" } },
  },
  {
    value: "ROULETTE_2",
    reward_label: "Guía premium",
    delivery_mode: "digital",
    is_winner: true,
    reward_value: { is_winner: true, fulfillment: { mode: "DIGITAL_ASSET", asset_id: "asset-roulette" } },
  },
  {
    value: "ROULETTE_3",
    reward_label: "Sigue participando",
    delivery_mode: "none",
    is_winner: false,
    reward_value: { is_winner: false },
  },
];

test("cada segmento de ruleta resuelve ticket, activo digital o ningún premio", () => {
  const ticket = service.rewardFromRouletteChoice(choices, "ROULETTE_1");
  assert.equal(ticket.reward_value.fulfillment.mode, "PHYSICAL_QR");
  assert.equal(ticket.reward_value.percent, 20);

  const digital = service.rewardFromRouletteChoice(choices, "ROULETTE_2");
  assert.equal(digital.reward_value.fulfillment.mode, "DIGITAL_ASSET");
  assert.equal(digital.reward_value.fulfillment.asset_id, "asset-roulette");

  assert.equal(service.rewardFromRouletteChoice(choices, "ROULETTE_3"), null);
  assert.equal(service.rouletteChoiceOutcome(choices, "ROULETTE_3").reveal_label, "Sigue participando");
});

test("el servidor rechaza segmentos desconocidos y conserva compatibilidad con ruletas anteriores", () => {
  const legacy = service.rewardFromRouletteChoice([{ value: "ROULETTE_1", reward_label: "Regalo" }], "ROULETTE_1");
  assert.equal(legacy.reward_value.fulfillment.mode, "PHYSICAL_QR");
  assert.throws(() => service.rewardFromRouletteChoice(choices, "ROULETTE_99"), /segmento valido/);
});

test("el creador expone las tres entregas y exige el activo del segmento digital", () => {
  const html = read("empresa", "index.html");
  const portal = read("empresa", "js", "app.js");
  assert.match(html, /data-roulette-delivery="1"/);
  assert.match(html, /Ganador: ticket QR/);
  assert.match(html, /Ganador: activo digital/);
  assert.match(html, /No ganador: no entrega premio/);
  assert.match(html, /data-roulette-asset="1"/);
  assert.match(portal, /function syncRouletteDeliveryFields/);
  assert.match(portal, /delivery_mode: delivery/);
  assert.match(portal, /Selecciona el activo digital del segmento/);
  assert.match(portal, /empresa-20260909-activation-status-filters-v467/);
});

test("la ruleta informa el resultado y espera antes de entregar", () => {
  const player = read("activacion", "activation.js");
  const publicHtml = read("activacion", "index.html");
  assert.match(player, /landed\.delivery_mode !== "none"/);
  assert.match(player, /Preparando tu descarga/);
  assert.match(player, /Generando tu ticket/);
  assert.match(player, /no genera ticket ni descarga/);
  assert.match(player, /}, 1200\);/);
  assert.match(publicHtml, /roulette-delivery=v458-20260909/);
});

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
    label: "A",
    reward_label: "20% de descuento",
    reward_type: "PERCENT_DISCOUNT",
    delivery_mode: "physical",
    is_winner: true,
    reward_value: {
      percent: 20,
      is_winner: true,
      fulfillment: { mode: "PHYSICAL_QR", channel: "physical_store" },
    },
  },
  {
    value: "B",
    label: "B",
    reward_label: "Guia descargable",
    reward_type: "CUSTOM",
    delivery_mode: "digital",
    is_winner: true,
    reward_value: {
      is_winner: true,
      fulfillment: { mode: "DIGITAL_ASSET", asset_id: "asset-123", asset_title: "Guia Qori" },
    },
  },
  {
    value: "C",
    label: "C",
    reward_label: "Sigue participando",
    delivery_mode: "none",
    is_winner: false,
    reward_value: { is_winner: false },
  },
];

test("each Gira y descubre card resolves its own ticket, digital asset, or no reward", () => {
  const ticket = service.rewardFromSpinDiscoverChoice(choices, "A");
  assert.equal(ticket.reward_value.fulfillment.mode, "PHYSICAL_QR");
  assert.equal(ticket.reward_value.percent, 20);

  const digital = service.rewardFromSpinDiscoverChoice(choices, "B");
  assert.equal(digital.reward_value.fulfillment.mode, "DIGITAL_ASSET");
  assert.equal(digital.reward_value.fulfillment.asset_id, "asset-123");

  assert.equal(service.rewardFromSpinDiscoverChoice(choices, "C"), null);
  assert.equal(service.spinDiscoverChoiceOutcome(choices, "C").reveal_label, "Sigue participando");
});

test("legacy cards remain ticket winners while unknown cards are rejected", () => {
  const legacy = service.rewardFromSpinDiscoverChoice([{ value: "A", reward_label: "Regalo" }], "A");
  assert.equal(legacy.reward_value.fulfillment.mode, "PHYSICAL_QR");
  assert.throws(() => service.rewardFromSpinDiscoverChoice(choices, "desconocida"), /carta valida/);
});

test("the create and edit interfaces expose all three persisted delivery modes", () => {
  const html = read("empresa", "index.html");
  const portal = read("empresa", "js", "app.js");
  const player = read("activacion", "activation.js");

  assert.match(html, /data-spin-delivery="A"/);
  assert.match(html, /Entrega ticket QR/);
  assert.match(html, /Entrega activo digital/);
  assert.match(html, /No entrega premio/);
  assert.match(html, /data-spin-asset="A"/);
  assert.match(portal, /data-edit-spin-delivery/);
  assert.match(portal, /delivery_mode: delivery/);
  assert.match(portal, /Selecciona el activo digital de la card/);
  assert.match(player, /data-has-reward/);
  assert.match(player, /sin generar ticket ni descarga/);
});

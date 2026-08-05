const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizePostSaleActionType,
  normalizePostSaleStatus,
  requiresContactConsent,
  requiresResultForIntelligence,
} = require("../backend/src/services/rmsPostSalePolicy");

test("Activación 2 accepts its canonical action and status contract", () => {
  assert.equal(normalizePostSaleActionType("REBUY_TICKET"), "REBUY_TICKET");
  assert.equal(normalizePostSaleStatus("redeemed"), "REDEEMED");
  assert.throws(() => normalizePostSaleActionType("CREATE_SALE"), /no es válida/);
  assert.throws(() => normalizePostSaleStatus("SOLD"), /no es válido/);
});

test("contact actions need confirmed consent only when a contact is requested", () => {
  assert.equal(requiresContactConsent("THANK_YOU", "CONTACT"), true);
  assert.equal(requiresContactConsent("FOLLOW_UP", "TASK"), false);
  assert.equal(requiresContactConsent("REBUY_TICKET", "CONTACT"), false);
});

test("Intelligence is explicit and requires a registrable result", () => {
  assert.equal(requiresResultForIntelligence({ action_type: "SURVEY", status: "COMPLETED", result_note: "Cliente respondió" }), true);
  assert.equal(requiresResultForIntelligence({ action_type: "SURVEY", status: "PLANNED", result_note: "Pendiente" }), false);
  assert.equal(requiresResultForIntelligence({ action_type: "NO_ACTION_NEEDED", status: "NOT_APPLICABLE", result_note: "Garantía no aplica" }), true);
});

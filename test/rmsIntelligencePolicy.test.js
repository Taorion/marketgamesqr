const test = require("node:test");
const assert = require("node:assert/strict");
const {
  insightCanCreateAgendaTask,
  intelligenceCreatesCommercialResource,
  normalizeInsightPriority,
  normalizeInsightStatus,
} = require("../backend/src/services/rmsIntelligencePolicy");

test("Inteligencia accepts only its explicit recommendation contract", () => {
  assert.equal(normalizeInsightStatus("measuring"), "MEASURING");
  assert.equal(normalizeInsightPriority("high"), "HIGH");
  assert.throws(() => normalizeInsightStatus("EXECUTED"), /no es válido/);
  assert.throws(() => normalizeInsightPriority("NOW"), /no es válida/);
});

test("an insight cannot create a sales, lead or campaign resource by itself", () => {
  assert.equal(intelligenceCreatesCommercialResource(), false);
  assert.equal(insightCanCreateAgendaTask({ insight_id: "case-1", confirm: false }), false);
  assert.equal(insightCanCreateAgendaTask({ insight_id: "case-1", confirm: true }), true);
});

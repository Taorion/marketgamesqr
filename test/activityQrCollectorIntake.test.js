const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const { registerActivityQrInCollector } = require("../backend/src/services/rmsCollectorIntakeService");

function fakeClient(stateRowCount = 1) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("insert into rms_lead_state")) return { rowCount: stateRowCount, rows: stateRowCount ? [{ id: "state-1" }] : [] };
      return { rowCount: 1, rows: [{ id: "row-1" }] };
    },
  };
}

test("a generated activity QR persists its source in Recolector with activity association", async () => {
  const client = fakeClient();
  const result = await registerActivityQrInCollector(client, {
    business_id: "business-1",
    source_type: "PLAYER",
    source_id: "player-1",
    player_id: "player-1",
    qr_code_id: "qr-1",
    campaign_id: "campaign-1",
    activation_id: "activation-1",
    activation_type: "SEALED_LETTER",
    activation_name: "Carta para clientes VIP",
    participant_id: "participant-1",
  });

  assert.equal(result.phase, "recoleccion");
  assert.equal(result.inserted, true);
  assert.equal(result.source_type, "PLAYER");
  assert.equal(client.calls.length, 3);
  assert.match(client.calls[0].sql, /insert into rms_lead_state/);
  assert.match(client.calls[0].sql, /'recoleccion'/);
  assert.match(client.calls[0].sql, /on conflict .* do nothing/);
  assert.match(client.calls[1].sql, /insert into rms_phase_movements/);
  assert.match(client.calls[2].sql, /insert into rms_machine_events/);
  assert.equal(JSON.parse(client.calls[0].params[4]).activation_type, "SEALED_LETTER");
});

test("manual and affiliate contacts use their canonical source instead of inventing players", async () => {
  for (const sourceType of ["MANUAL", "AFFILIATE"]) {
    const client = fakeClient();
    const result = await registerActivityQrInCollector(client, {
      business_id: "business-1",
      source_type: sourceType,
      source_id: `${sourceType.toLowerCase()}-1`,
      qr_code_id: `qr-${sourceType}`,
      activation_type: "PRIVATE_INVITATION",
    });
    assert.equal(result.source_type, sourceType);
    assert.equal(client.calls[0].params[1], sourceType);
    assert.equal(client.calls[0].params[2], `${sourceType.toLowerCase()}-1`);
  }
});

test("an already advanced lead is never reset to Recolector", async () => {
  const client = fakeClient(0);
  const result = await registerActivityQrInCollector(client, {
    business_id: "business-1",
    source_type: "PLAYER",
    source_id: "player-1",
    qr_code_id: "qr-2",
    activation_type: "TRIVIA_QUIZ",
  });
  assert.equal(result.inserted, false);
  assert.equal(client.calls.length, 2);
  assert.doesNotMatch(client.calls[1].sql, /rms_phase_movements/);
  assert.match(client.calls[1].sql, /rms_machine_events/);
});

test("all interactive activity types use the shared QR-to-Recolector integration", () => {
  const service = fs.readFileSync("backend/src/services/interactiveActivationService.js", "utf8");
  const catalog = service.slice(service.indexOf("const ACTIVATION_CATALOG"), service.indexOf("const CATALOG_BY_TYPE"));
  const activityTypes = [...catalog.matchAll(/\{ type: "([A-Z0-9_]+)"/g)].map((match) => match[1]);
  const generator = service.slice(service.indexOf("async function generateInteractiveRewardQr"), service.indexOf("async function interactiveActivationMetrics"));
  assert.ok(activityTypes.length >= 50, `expected the complete activity catalog, found ${activityTypes.length}`);
  assert.ok(activityTypes.includes("TRIVIA_QUIZ"));
  assert.ok(activityTypes.includes("SEALED_LETTER"));
  assert.match(generator, /await registerActivityQrInCollector\(client, \{/);
  assert.match(generator, /source_type: participant\.source_type/);
  assert.match(generator, /activation_type: activation\.activation_type/);
  assert.match(generator, /qr_code_id: qr\.id/);
});

test("legacy Trivia and the production migration cover new and existing QR leads", () => {
  const trivia = fs.readFileSync("backend/src/services/triviaService.js", "utf8");
  const migration = fs.readFileSync("database/migrations/202609050001_activity_qr_collector_intake.sql", "utf8");
  assert.match(trivia, /await registerActivityQrInCollector\(client, \{/);
  assert.match(trivia, /activation_id: trivia\.id/);
  assert.match(migration, /from interactive_activation_rewards iar/);
  assert.match(migration, /insert into rms_lead_state/);
  assert.match(migration, /on conflict \(business_id, source_type, source_id\) do nothing/);
  assert.match(migration, /insert into rms_phase_movements/);
});

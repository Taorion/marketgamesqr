const test = require("node:test"), assert = require("node:assert/strict");
process.env.DATABASE_URL = "postgresql://invalid:invalid@127.0.0.1:1/summit_unit_no_database";
process.env.DB_SSL = "false";
const { completeInteractiveParticipant } = require("../backend/src/services/interactiveActivationService");
const policy = require("../backend/src/services/summitGamePolicy");
const { play } = require("./helpers/summitBot");

function fixture() {
  const activation = { id: "a-one", company_id: "business-one", public_slug: "cumbre-one", status: "active", category: "minigame", activation_type: policy.TYPE, reward_mode: "fixed",
    game_config: { floors: 8, duration_seconds: 45 }, capture_config: { collect_participant_data: false },
    reward_config: { reward_type: "FREE_GIFT", reward_label: "Café de cortesía", reward_value: { label: "Café de cortesía" } }, max_rewards: 1 };
  const participant = { id: "p-one", activation_id: activation.id, company_id: activation.company_id, status: "started", game_session_token: "session-test",
    game_session_started_at: new Date(Date.now() - 90000), metadata: { summit_signature: policy.signature(activation) } };
  const calls = [];
  const client = { async query(sql, params) {
    calls.push({ sql, params });
    if (sql.includes('from qori_summit_members')) return { rows: [], rowCount: 0 };
    if (sql.includes("for update of a")) return { rows: [activation], rowCount: 1 };
    if (sql.includes("select * from interactive_activation_participants")) return { rows: params[0] === participant.id && params[1] === participant.activation_id ? [participant] : [], rowCount: 1 };
    if (sql.includes("from interactive_activation_questions")) return { rows: [], rowCount: 0 };
    if (sql.includes("update interactive_activation_participants")) return { rows: [], rowCount: 1 };
    if (sql.includes("select count(*)::int as total from interactive_activation_rewards")) return { rows: [{ total: 1 }], rowCount: 1 };
    throw new Error("Unexpected SQL in isolated test: " + sql.slice(0, 100));
  }};
  const body = { participant_id: participant.id, game_session_token: participant.game_session_token, summit_trace: [[0, 2700]], score: 9999, result_profile: "ganador", metadata: { summit_won: true } };
  return { activation, participant, calls, client, body };
}
test("completion service persists a losing attempt and never issues or charges a reward", async () => {
  const f = fixture();
  const result = await completeInteractiveParticipant(f.activation.public_slug, f.body, { client: f.client });
  assert.equal(result.rewarded, false); assert.equal(result.participant.score, 0);
  assert.match(result.message, /cofre/);
  assert.equal(f.calls.some(c => /insert into qr_codes|interactive_activation_rewards|credit/i.test(c.sql)), false);
  const saved = f.calls.find(c => c.sql.includes("update interactive_activation_participants"));
  assert.equal(JSON.parse(saved.params[4]).summit_result.won, false);
});
test("a verified victory still honors the existing prize availability limit", async () => {
  const f = fixture(); f.body.summit_trace = play(f.activation.game_config).trace;
  await assert.rejects(completeInteractiveParticipant(f.activation.public_slug, f.body, { client: f.client }), /todos los beneficios/);
  assert.ok(f.calls.some(c => c.sql.includes("select count(*)::int as total from interactive_activation_rewards")));
  assert.equal(f.calls.some(c => c.sql.includes("insert into qr_codes")), false);
});
test("a participant from another activation cannot claim this summit reward", async () => {
  const f = fixture(); f.participant.activation_id = "another-activation";
  await assert.rejects(completeInteractiveParticipant(f.activation.public_slug, f.body, { client: f.client }), /no encontrada/);
  assert.equal(f.calls.some(c => c.sql.includes("update interactive_activation_participants")), false);
});

test('a multiplayer participant cannot claim the prize through solo completion', async () => {
  const f = fixture(), original = f.client.query;
  f.client.query = async (sql,params) => sql.includes('from qori_summit_members') ? {rows:[{room_id:'family-room'}],rowCount:1} : original(sql,params);
  f.body.summit_trace = play(f.activation.game_config).trace;
  // Even injecting the room in the HTTP body grants no authority.
  f.body.summitRace = {roomId:'family-room',seed:f.participant.game_session_token};
  await assert.rejects(completeInteractiveParticipant(f.activation.public_slug,f.body,{client:f.client}),/dentro de la sala/);
  assert.equal(f.calls.some(c => c.sql.includes('update interactive_activation_participants')),false);
});

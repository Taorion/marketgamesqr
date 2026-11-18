const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../activacion/cumbre-core");
const policy = require("../backend/src/services/summitGamePolicy");

const { play } = require("./helpers/summitBot");

test("all mountain heights and difficulties have a reachable summit", () => {
  for (const floors of [8, 12, 16]) for (const summit_difficulty of ["easy", "normal", "hard"]) for (const seed of ["left", "right"]) {
    const config = { floors, summit_difficulty, duration_seconds: 90, lives: 5 };
    const { state, trace } = play(config, seed);
    assert.equal(state.won, true, JSON.stringify({ floors, summit_difficulty, seed, reached: state.highest, lives: state.lives }));
    const result = core.replay(config, seed, trace);
    assert.equal(result.won, true);
    assert.equal(result.floor, floors);
    assert.ok(result.frames <= 90 * 60);
  }
});

test("standing still times out without a reward; jumping below summit cannot win", () => {
  const result = core.replay({ duration_seconds: 45 }, "idle", [[0, 45 * 60]]);
  assert.equal(result.won, false); assert.equal(result.floor, 0); assert.equal(result.reason, "timeout");
  const s = core.create(); for (let i = 0; i < 90; i++) core.step(s, i === 0 ? 4 : 0);
  assert.equal(s.won, false); assert.ok(s.highest <= 1);
});

test("falling removes a life and returns to the checkpoint, exhausting lives loses", () => {
  const s = core.create({ lives: 2 });
  s.player.x = 0; s.player.y = s.platforms[0].y + 80;
  core.step(s, 0); assert.equal(s.lives, 1); assert.equal(s.player.ground, 0);
  s.hitUntil = 0; s.player.y += 80; core.step(s, 0);
  assert.equal(s.done, true); assert.equal(s.won, false);
});

test("replay rejects missing, incomplete, malformed and oversized input", () => {
  for (const trace of [undefined, [], [[16, 60]], [[0, -1]], [[0, 1.5]], [[0, 10801]], [[0, 2]], [[NaN, 10]]]) assert.throws(() => core.replay({}, "seed", trace));
  const { trace } = play(); assert.throws(() => core.replay({}, "session-test", [...trace, [0, 1]]));
});

test("server verifies the path and ignores a claimed score or victory", () => {
  const a = { activation_type: policy.TYPE, game_config: { duration_seconds: 45 }, reward_config: { reward_label: "Café de cortesía" } };
  const now = Date.now(), p = { game_session_token: "session-test", game_session_started_at: new Date(now - 45000), metadata: { summit_signature: policy.signature(a) } };
  const loss = policy.verify(a, p, { game_session_token: p.game_session_token, summit_trace: [[0, 2700]], score: 999999, summit_won: true }, now);
  assert.equal(loss.won, false);
  const { trace } = play(a.game_config);
  assert.equal(policy.verify(a, p, { game_session_token: p.game_session_token, summit_trace: trace }, now).won, true);
});

test("server rejects another session, repeat claims, changed prizes and instant replays", () => {
  const a = { game_config: {}, reward_config: { reward_label: "Café" } }, now = Date.now();
  const { trace } = play();
  const p = { game_session_token: "session-test", game_session_started_at: new Date(now - 90000), metadata: { summit_signature: policy.signature(a) } };
  const body = { game_session_token: p.game_session_token, summit_trace: trace };
  assert.throws(() => policy.verify(a, p, { ...body, game_session_token: "other" }, now), /Sesión/);
  assert.throws(() => policy.verify(a, { ...p, completed_at: new Date() }, body, now), /finalizó/);
  assert.throws(() => policy.verify({ ...a, reward_config: { reward_label: "Otro premio" } }, p, body, now), /cambió/);
  assert.throws(() => policy.verify(a, { ...p, game_session_started_at: new Date(now) }, body, now), /tiempo/);
});

test("configuration enforces fixed reward and bounds; no score rewards", () => {
  const body = { activation_type: policy.TYPE, category: "touch", reward_mode: "by_score", score_rewards: [{ min_score: 0 }], game_config: { floors: 100, lives: 100, duration_seconds: -1 }, reward_config: { reward_label: "Un postre" } };
  policy.prepare(body);
  assert.equal(body.reward_mode, "fixed"); assert.equal(body.category, "minigame"); assert.deepEqual(body.score_rewards, []);
  assert.equal(body.game_config.floors, 16); assert.equal(body.game_config.lives, 5); assert.equal(body.game_config.duration_seconds, 45);
  assert.throws(() => policy.prepare({ activation_type: policy.TYPE, reward_config: { reward_label: " " } }), /premio fijo/);
});

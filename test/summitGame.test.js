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
  s.player.x = 12; s.player.y = s.camera + core.HEIGHT + 41;
  core.step(s, 0); assert.equal(s.lives, 1); assert.equal(s.player.ground, 0);
  s.player.y = s.camera + core.HEIGHT + 41; core.step(s, 0);
  assert.equal(s.done, true); assert.equal(s.won, false);
});

function land(s, index) {
  const floor=s.platforms[index];
  Object.assign(s.player,{x:core.platformX(floor,s.tick)+25,y:floor.y-.1,vy:1,ground:-1});
  s.camera=floor.y-350;s.enemies.forEach(enemy=>{enemy.alive=false;});
  core.step(s);assert.equal(s.player.ground,index);
}
test('a fall costs one life only after the entire sprite leaves its own screen',()=>{
  const s=core.create({lives:3});land(s,6);
  const checkpoint=s.checkpoint;
  Object.assign(s.player,{x:12,y:s.camera+core.HEIGHT+39,vy:0,ground:-1});
  core.step(s);assert.equal(s.lives,3,'the hat is still visible');
  s.player.y=s.camera+core.HEIGHT+40;s.player.vy=0;
  core.step(s);assert.equal(s.lives,2);assert.equal(s.player.ground,checkpoint);
  assert.ok(s.player.y-s.camera<=380&&s.player.y-s.camera>=40,'respawn must be fully visible');
  for(let i=0;i<20;i++)core.step(s);
  assert.equal(s.lives,2,'one fall cannot consume multiple lives');
});
test('a fragile platform is skipped and a moving stable checkpoint uses its current position',()=>{
  const s=core.create({lives:3});land(s,4);land(s,5);
  assert.equal(s.checkpoint,4);assert.equal(s.highest,5);
  s.camera=s.platforms[7].y-300;
  Object.assign(s.player,{x:12,y:s.camera+core.HEIGHT+41,vy:0,ground:-1});
  core.step(s);
  assert.equal(s.lives,2);assert.equal(s.player.ground,4);
  assert.equal(s.player.x,core.platformX(s.platforms[4],s.tick)+25);
  assert.ok(s.player.y-s.camera<=380,'camera must return to a checkpoint below the old view');
});
test('the checkpoint follows the last stable landing, not the highest score or an invisible platform',()=>{
  const s=core.create({lives:3});land(s,6);land(s,3);
  assert.equal(s.highest,6);assert.equal(s.checkpoint,3);
  s.camera=s.platforms[2].y-core.HEIGHT-50;
  Object.assign(s.player,{x:s.platforms[2].x+25,y:s.platforms[2].y-1,vy:5,ground:-1});
  core.step(s);assert.equal(s.lives,2);assert.equal(s.player.ground,3);assert.equal(s.checkpoint,3);
});
test('multiplayer fall detection uses each player camera independently',()=>{
  const a=core.create(),b=core.create();
  for(const s of [a,b]){land(s,4);Object.assign(s.player,{x:12,y:s.platforms[4].y+10,vy:1,ground:-1});}
  a.camera=a.player.y-420;b.camera=b.player.y-600;
  core.step(a);core.step(b);
  assert.equal(a.lives,3);assert.equal(b.lives,2);assert.equal(b.player.ground,4);
});

test('the server reconstructs off-screen falls and respawns from the input trace',()=>{
  const config={floors:8,lives:3,duration_seconds:45},seed='fall-replay',s=core.create(config,seed),trace=[];
  while(!s.done){
    core.step(s,1);
    const last=trace.at(-1);if(last)last[1]++;else trace.push([1,1]);
  }
  const replay=core.replay(config,seed,trace);
  assert.equal(s.reason,'lives');assert.equal(replay.lives,0);assert.equal(replay.won,false);assert.equal(replay.frames,s.tick);
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

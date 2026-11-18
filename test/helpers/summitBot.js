const core = require("../../activacion/cumbre-core");
function play(config = {}, seed = "session-test") {
  const state = core.create(config, seed), trace = [];
  while (!state.done) {
    const p = state.player, target = state.platforms[Math.min(state.cfg.floors, state.highest + 1)];
    const x = state.highest === state.cfg.floors ? 180 : core.platformX(target, state.tick) + target.w / 2;
    let mask = 8 | (p.x < x - 3 ? 2 : p.x > x + 3 ? 1 : 0);
    if (p.ground >= 0 && p.ground < state.cfg.floors) mask |= 4;
    core.step(state, mask);
    const last = trace[trace.length - 1]; if (last && last[0] === mask) last[1]++; else trace.push([mask, 1]);
  }
  return { state, trace };
}
module.exports = { play };

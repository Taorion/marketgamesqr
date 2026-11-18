/* Deterministic 60 Hz simulation shared by the player and reward verification. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.QoriSummitCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = 3, WIDTH = 360, HEIGHT = 480, GAP = 88, PLAYER_HEIGHT = 40;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const integer = (n, fallback, a, b) => Number.isFinite(Number(n)) ? clamp(Math.round(Number(n)), a, b) : fallback;
  function normalize(config = {}) {
    return { version: VERSION, floors: integer(config.floors, 12, 8, 16),
      duration_seconds: integer(config.duration_seconds, 90, 45, 180),
      lives: integer(config.lives, 3, 1, 5),
      summit_difficulty: ["easy", "normal", "hard"].includes(config.summit_difficulty) ? config.summit_difficulty : "normal" };
  }
  function hash(seed) {
    let n = 2166136261;
    for (const c of String(seed)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return n >>> 0;
  }
  function platformX(platform, tick) {
    if (!platform.moving) return platform.x;
    const phase = (tick + platform.phase) % 240;
    return platform.x + (phase < 120 ? phase : 240 - phase) / 4 - 15;
  }
  function create(config = {}, seed = "qori") {
    const cfg = normalize(config), base = cfg.floors * GAP + 420;
    const seedValue = hash(seed), platforms = [];
    for (let i = 0; i <= cfg.floors; i++) {
      const width = i === 0 ? 320 : i === cfg.floors ? 156 : cfg.summit_difficulty === "hard" ? 114 : 140;
      const x = i === 0 ? 20 : i === cfg.floors ? 102 : i % 2 ? 36 : 184;
      platforms.push({ i, x, y: base - i * GAP, w: width, moving: i > 3 && i % 4 === 0 && i < cfg.floors,
        phase: seedValue % 240, fragile: i > 2 && i % 5 === 0 && i < cfg.floors, touched: -1, brokenUntil: 0 });
    }
    const enemies = platforms.filter(p => p.i > 1 && p.i % 3 === 0 && p.i < cfg.floors)
      .map(p => ({ floor: p.i, x: p.x + 55, dir: seedValue % 2 ? 1 : -1, alive: true }));
    const blocks = platforms.filter(p => p.i > 1 && p.i % 4 === 2 && p.i < cfg.floors)
      .map(p => ({ floor: p.i, x: p.x + p.w / 2, alive: true }));
    return { cfg, platforms, enemies, blocks, tick: 0, player: { x: 86, y: base, vy: 0, face: 1, ground: 0, pushX: 0 },
      highest: 0, checkpoint: 0, lives: cfg.lives, hitUntil: 0, hammerUntil: 0, hammerReady: 0, charge: 0,
      impacts: [], stunUntil: 0, rivalHitUntil: 0,
      previous: 0, coyote: 6, jumpBuffer: 0, done: false, won: false, reason: "", breaks: 0, camera: base - 420 };
  }
  function damage(s, falling = false) {
    if (s.done || (!falling && s.tick < s.hitUntil)) return;
    s.lives--;
    if (s.lives <= 0) { s.done = true; s.reason = "lives"; return; }
    const floor = s.platforms[s.checkpoint], x = platformX(floor, s.tick);
    floor.brokenUntil = 0; floor.touched = -1;
    Object.assign(s.player, { x: x + 25, y: floor.y, vy: 0, ground: floor.i, pushX: 0 });
    s.camera = Math.max(s.camera, floor.y - (HEIGHT - 100));
    s.jumpBuffer = 0; s.coyote = 6;
    s.stunUntil = 0;
    s.hitUntil = s.tick + 120;
  }
  function step(s, input = 0) {
    if (s.done) return s;
    s.tick++;
    const p = s.player, oldY = p.y;
    // Only the server creates impacts. Client prediction and prize replay consume
    // the same persisted events; an HTTP input body cannot supply this list.
    for (const impact of s.impacts) if (impact.tick === s.tick && s.tick >= s.hitUntil && s.tick >= s.rivalHitUntil) {
      p.pushX = impact.direction * 7.5; p.vy = -3.2; p.ground = -1;
      s.stunUntil = s.tick + 12; s.rivalHitUntil = s.tick + 45;
      s.jumpBuffer = 0; s.coyote = 0;
    }
    const stunned = s.tick < s.stunUntil;
    if (stunned) input = 0;
    if ((input & 4) && !(s.previous & 4)) s.jumpBuffer = 7;
    else s.jumpBuffer = Math.max(0, s.jumpBuffer - 1);
    if ((input & 8) && s.tick >= s.hammerReady) {
      s.hammerUntil = s.tick + 18; s.hammerReady = s.tick + 22;
    }
    s.coyote = p.ground >= 0 ? 7 : Math.max(0, s.coyote - 1);
    if (p.ground >= 0) {
      const ground = s.platforms[p.ground];
      p.x += platformX(ground, s.tick) - platformX(ground, s.tick - 1);
    }
    if (s.jumpBuffer && s.coyote) {
      const boost = s.charge >= 3 && Boolean(input & 8);
      p.vy = boost ? -12.5 : -9.7;
      if (boost) s.charge = 0;
      p.ground = -1; s.coyote = 0; s.jumpBuffer = 0;
    }
    const direction = (input & 2 ? 1 : 0) - (input & 1 ? 1 : 0);
    if (direction) p.face = direction;
    p.x = clamp(p.x + direction * 3.15 + p.pushX, 12, WIDTH - 12);
    p.pushX = Math.abs(p.pushX) < .1 ? 0 : p.pushX * .88;
    p.vy = Math.min(10, p.vy + 0.34); p.y += p.vy; p.ground = -1;
    // Check before landing: an invisible lower platform must not rescue the fall
    // or replace the last stable checkpoint. This camera belongs to this player.
    if (p.y - PLAYER_HEIGHT > s.camera + HEIGHT) {
      damage(s, true);
      s.previous = input;
      if (!s.done && s.tick >= s.cfg.duration_seconds * 60) { s.done = true; s.reason = "timeout"; }
      return s;
    }
    for (const floor of s.platforms) {
      const x = platformX(floor, s.tick);
      if (floor.fragile && floor.touched >= 0 && s.tick - floor.touched > 58) {
        floor.brokenUntil = s.tick + 140; floor.touched = -1;
      }
      if (s.tick < floor.brokenUntil) continue;
      if (p.vy >= 0 && oldY <= floor.y + 0.1 && p.y >= floor.y && p.x + 8 > x && p.x - 8 < x + floor.w) {
        p.y = floor.y; p.vy = 0; p.ground = floor.i;
        s.highest = Math.max(s.highest, floor.i);
        if (!floor.fragile && floor.y <= s.camera + HEIGHT) s.checkpoint = floor.i;
        if (floor.fragile && floor.touched < 0) floor.touched = s.tick;
        break;
      }
    }
    const hammer = s.tick < s.hammerUntil;
    const hits = (x, y) => Math.abs(p.x + p.face * 19 - x) < 37 && Math.abs(p.y - 16 - y) < 31;
    for (const block of s.blocks) {
      if (!block.alive) continue;
      const floor = s.platforms[block.floor];
      if (hammer && hits(block.x, floor.y - 12)) {
        block.alive = false; s.charge = Math.min(3, s.charge + 1); s.breaks++; continue;
      }
      if (Math.abs(p.x - block.x) < 20 && p.y > floor.y - 24 && p.y < floor.y + 3) p.x = block.x + (p.x < block.x ? -20 : 20);
    }
    for (const enemy of s.enemies) {
      if (!enemy.alive) continue;
      const floor = s.platforms[enemy.floor], x = platformX(floor, s.tick);
      enemy.x += enemy.dir * (s.cfg.summit_difficulty === "easy" ? 0.55 : s.cfg.summit_difficulty === "hard" ? 1.25 : 0.85);
      if (enemy.x < x + 16 || enemy.x > x + floor.w - 16) { enemy.dir *= -1; enemy.x = clamp(enemy.x, x + 16, x + floor.w - 16); }
      if (hammer && hits(enemy.x, floor.y - 12)) { enemy.alive = false; s.charge = Math.min(3, s.charge + 1); s.breaks++; }
      else if (Math.abs(p.x - enemy.x) < 20 && Math.abs(p.y - floor.y) < 23) damage(s);
    }
    if (!s.done && p.ground === s.cfg.floors && Math.abs(p.x - 180) < 28) { s.done = true; s.won = true; s.reason = "summit"; }
    if (!s.done && s.tick >= s.cfg.duration_seconds * 60) { s.done = true; s.reason = "timeout"; }
    s.camera = Math.min(s.camera, p.y - 300);
    s.previous = input;
    return s;
  }
  function replay(config, seed, trace, impacts = []) {
    if (!Array.isArray(trace) || !trace.length || trace.length > 10800) throw new Error("Recorrido de Cumbre inválido.");
    const s = create(config, seed); s.impacts = structuredClone(impacts); let frames = 0;
    for (const run of trace) {
      if (!Array.isArray(run) || run.length !== 2 || !Number.isInteger(run[0]) || run[0] < 0 || run[0] > 15 || !Number.isInteger(run[1]) || run[1] < 1) throw new Error("Controles de Cumbre inválidos.");
      frames += run[1];
      if (frames > s.cfg.duration_seconds * 60 || s.done) throw new Error("Recorrido de Cumbre fuera de límite.");
      for (let i = 0; i < run[1]; i++) {
        if (s.done) throw new Error("La partida ya había terminado.");
        step(s, run[0]);
      }
    }
    if (!s.done) throw new Error("El recorrido de Cumbre está incompleto.");
    return { won: s.won, floor: s.highest, frames, lives: s.lives, reason: s.reason, duration_ms: Math.round(frames * 1000 / 60) };
  }
  return { VERSION, WIDTH, HEIGHT, GAP, normalize, create, step, replay, platformX };
});

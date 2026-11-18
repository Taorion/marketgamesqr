const core = require('../../../activacion/cumbre-core');
const { badRequest } = require('../utils/http');
const combat = require('./summitCombatRules');

// Only controls are accepted. Positions, scores and finish flags are derived here.
function advance(room, member, packet, now = Date.now(), members = [member], events = []) {
  const state = member.state;
  if (room.status !== 'racing' || state.done) return false;
  const elapsed = now - new Date(room.starts_at).getTime();
  if (elapsed < 0) throw badRequest('Espera la cuenta regresiva.');
  if (!Number.isInteger(packet.from) || packet.from < 0) throw badRequest('Secuencia inválida.');
  if (packet.from < state.tick) return false; // Retry after a lost response: never replay twice.
  if (packet.from !== state.tick) throw badRequest('Sincroniza la partida antes de continuar.');
  if (!Array.isArray(packet.runs) || packet.runs.length > 600) throw badRequest('Controles inválidos.');
  let count = 0;
  for (const run of packet.runs) {
    if (!Array.isArray(run) || run.length !== 2 || !Number.isInteger(run[0]) || run[0] < 0 || run[0] > 15 || !Number.isInteger(run[1]) || run[1] < 1) throw badRequest('Controles inválidos.');
    count += run[1];
  }
  if (count > 600 || state.tick + count > Math.floor(elapsed * 60 / 1000) + 6 || state.tick + count > state.cfg.duration_seconds * 60) throw badRequest('El recorrido supera el tiempo de la carrera.');
  // Validate the entire packet before changing the persisted simulation.
  const next = structuredClone(state);
  member.state = next;
  const accepted = [];
  for (const [mask, frames] of packet.runs) for (let i = 0; i < frames; i++) {
    if (next.done) break;
    core.step(next, mask);
    const tail=accepted.at(-1);if(tail?.[0]===mask)tail[1]++;else accepted.push([mask,1]);
    combat.resolve(room,member,members,now,events);
  }
  for (const [mask, frames] of accepted) {
    const tail = member.trace.at(-1);
    if (tail?.[0] === mask) tail[1] += frames; else member.trace.push([mask, frames]);
  }
  member.state = next;
  return next.done && next.won;
}

function snapshot(room, members, ownId, now = Date.now()) {
  const own = members.find(m => m.participant_id === ownId);
  return {
    code: room.code, status: room.status, host_id: room.host_id, winner_id: room.winner_id,
    starts_at: room.starts_at, server_now: new Date(now).toISOString(), expires_at: room.expires_at,
    config: room.config, prize: room.prize, seed: room.seed,
    members: members.map(m => ({ id: m.participant_id, alias: m.alias, ready: m.ready,
      floor: m.state.highest, x: m.state.player.x, y: m.state.player.y,
      tick: m.state.tick, face: m.state.player.face, lives: m.state.lives,
      stunned: m.state.tick < m.state.stunUntil,
      done: m.state.done, connected: now - new Date(m.updated_at).getTime() < 8000 })),
    own: own ? { id: ownId, state: own.state, result: own.result || null } : null,
  };
}
module.exports = { advance, snapshot };

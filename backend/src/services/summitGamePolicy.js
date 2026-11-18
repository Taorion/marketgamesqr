const crypto = require("node:crypto");
const core = require("../../../activacion/cumbre-core");
const { badRequest } = require("../utils/http");
const TYPE = "QORI_SUMMIT";
function signature(activation) {
  return crypto.createHash("sha256").update(JSON.stringify({
    version: core.VERSION, config: core.normalize(activation.game_config), reward: activation.reward_config,
  })).digest("hex");
}
function prepare(body) {
  if (body.activation_type !== TYPE) return;
  if (body.reward_config && !String(body.reward_config.reward_label || "").trim()) throw badRequest("Define el premio fijo de la cima.");
  body.category = "minigame";
  body.reward_mode = "fixed";
  body.score_rewards = [];
  if (body.game_config) body.game_config = { ...core.normalize(body.game_config), min_duration_ms: 0, max_score: 16, game_type: TYPE };
}
function verify(activation, participant, body, now = Date.now(), race) {
  if (!participant.game_session_token || participant.game_session_token !== body.game_session_token) throw badRequest("Sesión de Cumbre inválida.");
  if (participant.game_session_completed_at || participant.completed_at) throw badRequest("Esta partida de Cumbre ya finalizó.");
  if (participant.metadata?.summit_signature !== signature(activation)) throw badRequest("El premio o la montaña cambió. Inicia una nueva participación.");
  let result;
  try { result = core.replay(activation.game_config, race?.seed || participant.game_session_token, body.summit_trace); }
  catch (error) { throw badRequest(error.message); }
  const elapsed = now - new Date(race?.startsAt || participant.game_session_started_at || participant.started_at).getTime();
  if (!Number.isFinite(elapsed) || elapsed < result.duration_ms - 1500 || elapsed > 30 * 60 * 1000) throw badRequest("El tiempo de esta sesión de Cumbre no es válido.");
  return result;
}
module.exports = { TYPE, signature, prepare, verify };

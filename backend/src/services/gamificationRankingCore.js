function rewardPositions(rule = {}, leaderboardSize = 0) {
  const size = Math.max(0, Number(leaderboardSize) || 0);
  const raw = String(rule.position ?? rule.condition ?? "").trim().toLowerCase();
  const single = Number(raw);
  if (Number.isInteger(single) && single > 0) return single <= size ? [single] : [];
  const range = raw.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const from = Math.max(1, Number(range[1]));
    const to = Math.min(size, Number(range[2]));
    return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
  }
  const top = raw.match(/^top[_\s-]?(\d+)$/);
  if (top) {
    return Array.from({ length: Math.min(size, Math.max(0, Number(top[1]))) }, (_, index) => index + 1);
  }
  return [];
}

function rankingTransitionAllowed(current, target) {
  const transitions = {
    DRAFT: ["ACTIVE", "CLOSED"],
    ACTIVE: ["PAUSED", "CLOSED", "FINISHED"],
    PAUSED: ["ACTIVE", "CLOSED"],
    FINISHED: ["CLOSED"],
    CLOSED: [],
  };
  const from = String(current || "").toUpperCase();
  const to = String(target || "").toUpperCase();
  return from === to || (transitions[from] || []).includes(to);
}

const RANKING_ACTION_TYPES = Object.freeze({
  REFERRALS: ["REFERRAL"],
  REDEMPTIONS: ["REDEMPTION", "TICKET_REDEEMED"],
  PARTICIPATION: ["PARTICIPATION", "WEEKLY_PARTICIPATION"],
});

function rankingActionTypes(rankingType) {
  return RANKING_ACTION_TYPES[String(rankingType || "POINTS").toUpperCase()] || [];
}

function rankingMetricLabel(rankingType) {
  return {
    POINTS: "Puntos",
    PURCHASES: "Valor comprado",
    REFERRALS: "Referidos",
    REDEMPTIONS: "Redenciones",
    PARTICIPATION: "Participaciones",
  }[String(rankingType || "POINTS").toUpperCase()] || "Puntos";
}

function aliasLeaderboardName(name, rank = 0) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return `Participante ${Number(rank || 0) + 1}`;
  if (parts.length === 1) return `${parts[0]} ${String(Number(rank || 0) + 1).padStart(2, "0")}`;
  return `${parts[0]} ${parts.at(-1).slice(0, 1).toUpperCase()}.`;
}

module.exports = {
  aliasLeaderboardName,
  rankingActionTypes,
  rankingMetricLabel,
  rankingTransitionAllowed,
  rewardPositions,
};

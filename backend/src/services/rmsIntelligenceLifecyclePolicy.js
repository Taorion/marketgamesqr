const INTELLIGENCE_LIFECYCLE_STATUSES = Object.freeze([
  "ACTIVE", "RECYCLED", "LOST_ANALYZED", "CYCLE_ANALYZED",
]);

function normalizeIntelligenceLifecycleStatus(value, fallback = "ACTIVE") {
  const status = String(value || fallback).trim().toUpperCase();
  if (!INTELLIGENCE_LIFECYCLE_STATUSES.includes(status)) {
    const error = new Error("El estado de ciclo analítico no es válido.");
    error.status = 400;
    throw error;
  }
  return status;
}

function intelligenceCanChangeOperationalPhase() {
  return false;
}

function lifecyclePreservesOperationalPhase(before, after) {
  return String(before || "") === String(after || "");
}

module.exports = {
  INTELLIGENCE_LIFECYCLE_STATUSES,
  intelligenceCanChangeOperationalPhase,
  lifecyclePreservesOperationalPhase,
  normalizeIntelligenceLifecycleStatus,
};

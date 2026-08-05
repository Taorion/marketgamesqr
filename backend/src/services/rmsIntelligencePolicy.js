const INSIGHT_STATUSES = Object.freeze(["PENDING", "APPLIED", "DISCARDED", "MEASURING"]);
const INSIGHT_PRIORITIES = Object.freeze(["LOW", "MEDIUM", "HIGH", "URGENT"]);

function normalizeInsightStatus(value = "PENDING") {
  const status = String(value || "PENDING").trim().toUpperCase();
  if (!INSIGHT_STATUSES.includes(status)) {
    const error = new Error("El estado de aprendizaje no es válido.");
    error.status = 400;
    throw error;
  }
  return status;
}

function normalizeInsightPriority(value = "MEDIUM") {
  const priority = String(value || "MEDIUM").trim().toUpperCase();
  if (!INSIGHT_PRIORITIES.includes(priority)) {
    const error = new Error("La prioridad de aprendizaje no es válida.");
    error.status = 400;
    throw error;
  }
  return priority;
}

function insightCanCreateAgendaTask(payload = {}) {
  return payload.confirm === true && Boolean(String(payload.insight_id || "").trim());
}

function intelligenceCreatesCommercialResource() {
  return false;
}

module.exports = {
  INSIGHT_PRIORITIES,
  INSIGHT_STATUSES,
  insightCanCreateAgendaTask,
  intelligenceCreatesCommercialResource,
  normalizeInsightPriority,
  normalizeInsightStatus,
};

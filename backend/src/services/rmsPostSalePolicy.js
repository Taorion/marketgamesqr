const POST_SALE_ACTION_TYPES = Object.freeze([
  "THANK_YOU", "WARRANTY", "SURVEY", "REBUY_TICKET", "REWARD_PASS",
  "REFERRAL", "FOLLOW_UP", "INCIDENT", "NO_ACTION_NEEDED",
]);

const POST_SALE_ACTION_STATUSES = Object.freeze([
  "PLANNED", "SCHEDULED", "ISSUED", "DELIVERED", "CLAIMED", "COMPLETED",
  "REDEEMED", "EXPIRED", "CANCELLED", "NOT_APPLICABLE", "FAILED",
]);

const CONTACT_ACTIONS = new Set([
  "THANK_YOU", "WARRANTY", "SURVEY", "REFERRAL", "FOLLOW_UP",
]);

const RESOURCE_ACTIONS = new Set(["REBUY_TICKET", "REWARD_PASS", "REFERRAL"]);

function normalizePostSaleActionType(value) {
  const type = String(value || "").trim().toUpperCase();
  if (!POST_SALE_ACTION_TYPES.includes(type)) {
    const error = new Error("La acción de Activación 2 no es válida.");
    error.status = 400;
    throw error;
  }
  return type;
}

function normalizePostSaleStatus(value, fallback = "PLANNED") {
  const status = String(value || fallback).trim().toUpperCase();
  if (!POST_SALE_ACTION_STATUSES.includes(status)) {
    const error = new Error("El estado de Activación 2 no es válido.");
    error.status = 400;
    throw error;
  }
  return status;
}

function requiresContactConsent(actionType, executionMode = "TASK") {
  return CONTACT_ACTIONS.has(actionType) && String(executionMode || "TASK").toUpperCase() === "CONTACT";
}

function requiresResultForIntelligence(action) {
  const status = String(action?.status || "").toUpperCase();
  const result = String(action?.result_note || action?.evidence || "").trim();
  return action?.action_type === "NO_ACTION_NEEDED" ? Boolean(result) : ["ISSUED", "DELIVERED", "CLAIMED", "COMPLETED", "REDEEMED", "EXPIRED", "CANCELLED"].includes(status) && Boolean(result);
}

module.exports = {
  CONTACT_ACTIONS,
  POST_SALE_ACTION_STATUSES,
  POST_SALE_ACTION_TYPES,
  RESOURCE_ACTIONS,
  normalizePostSaleActionType,
  normalizePostSaleStatus,
  requiresContactConsent,
  requiresResultForIntelligence,
};

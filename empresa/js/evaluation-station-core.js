(function initRmsEvaluationStationCore(globalScope) {
  "use strict";

  const ROUTES = Object.freeze({
    NEGOTIATION: Object.freeze({ destination: "NEGOTIATION", phase: "accion_correctiva", label: "Negociación", tone: "agreement", icon: "handshake" }),
    PAID_SALE: Object.freeze({ destination: "ATTRIBUTED_SALE", phase: "cierre", label: "Ventas atribuidas", tone: "sale", icon: "sale" }),
    MISSING_INFORMATION: Object.freeze({ destination: "NEGOTIATION", phase: "accion_correctiva", label: "Negociación", tone: "agreement", icon: "handshake" }),
    NURTURE: Object.freeze({ destination: "NEGOTIATION", phase: "accion_correctiva", label: "Negociación", tone: "agreement", icon: "handshake" }),
    RECYCLE: Object.freeze({ destination: "RECYCLE", phase: "procesamiento", label: "Reciclaje", tone: "recycle", icon: "recycle" }),
    NOT_QUALIFIED: Object.freeze({ destination: "RISK_REVIEW", phase: "control_anti_fuga", label: "Riesgos de fuga", tone: "risk", icon: "shield" }),
    NO_RESPONSE: Object.freeze({ destination: "RISK_REVIEW", phase: "control_anti_fuga", label: "Riesgos de fuga", tone: "risk", icon: "shield" }),
    OBJECTION: Object.freeze({ destination: "RISK_REVIEW", phase: "control_anti_fuga", label: "Riesgos de fuga", tone: "risk", icon: "shield" }),
  });

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function routeForResponse(response = "") {
    return ROUTES[text(response).toUpperCase()] || null;
  }

  function createIdempotencyKey(sourceType = "PLAYER", sourceId = "") {
    const randomPart = globalScope.crypto?.randomUUID?.()
      || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    return `evaluation:${text(sourceType).toUpperCase() || "PLAYER"}:${text(sourceId)}:${randomPart}`;
  }

  function canonicalSubmission(input = {}) {
    const response = text(input.response).toUpperCase();
    const route = routeForResponse(response);
    if (!route) return { valid: false, error: "Selecciona lo que ocurrió en el contacto." };
    if (response === "RECYCLE") {
      if (!text(input.recycle_reason) || !text(input.recycle_note) || !text(input.recycle_at)) {
        return { valid: false, error: "Para enviar a Reciclaje registra el motivo, la explicación y la fecha de revisión." };
      }
      if (new Date(input.recycle_at).getTime() <= Date.now()) {
        return { valid: false, error: "La fecha de revisión debe estar en el futuro." };
      }
    }
    const idempotencyKey = text(input.idempotency_key)
      || createIdempotencyKey(input.source_type, input.source_id);
    return {
      valid: true,
      route,
      payload: {
        ...input,
        response,
        destination: route.destination,
        idempotency_key: idempotencyKey,
      },
    };
  }

  function confirmedPhase(response = {}, fallbackResponse = "") {
    return text(response?.state?.rms_phase
      || response?.movement?.to_phase
      || response?.route?.phase
      || routeForResponse(fallbackResponse)?.phase);
  }

  const api = Object.freeze({ ROUTES, routeForResponse, createIdempotencyKey, canonicalSubmission, confirmedPhase });
  globalScope.RmsEvaluationStationCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

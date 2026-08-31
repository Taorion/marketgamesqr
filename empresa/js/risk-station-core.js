(function initRmsRiskStationCore(globalScope) {
  "use strict";

  const DESTINATIONS = Object.freeze({ CLEARED: "cierre", RECYCLE: "reciclaje" });
  const VALID_RESULTS = new Set(Object.keys(DESTINATIONS));

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeAuthorizations(raw = {}) {
    const source = raw && typeof raw === "object" ? raw : {};
    const benefits = Array.isArray(source.benefits) ? source.benefits : [];
    return {
      discount: {
        enabled: Boolean(source.discount?.enabled),
        max_percent: Math.min(100, Math.max(0, number(source.discount?.max_percent))),
      },
      two_for_one: {
        enabled: Boolean(source.two_for_one?.enabled),
        label: text(source.two_for_one?.label),
      },
      gift: {
        enabled: Boolean(source.gift?.enabled),
        label: text(source.gift?.label),
      },
      benefits: benefits.map((benefit, index) => ({
        id: text(benefit?.id) || `benefit-${index + 1}`,
        enabled: benefit?.enabled !== false,
        type: text(benefit?.type).toUpperCase() || "OTHER",
        label: text(benefit?.label),
        value: Math.max(0, number(benefit?.value)),
        detail: text(benefit?.detail),
      })).filter((benefit) => benefit.label),
    };
  }

  function offerFromValue(value, authorizations, detail = "") {
    const normalized = normalizeAuthorizations(authorizations);
    const selected = text(value).toUpperCase();
    if (!selected) return { valid: false, error: "Selecciona una alternativa o elige Sin concesión extraordinaria." };
    if (selected === "NONE") return {
      valid: true,
      value: "NONE",
      type: "NONE",
      benefit_id: null,
      discount_percent: 0,
      detail: null,
      label: "Sin concesión extraordinaria",
    };
    if (selected === "DISCOUNT") {
      if (!normalized.discount.enabled || normalized.discount.max_percent <= 0) return { valid: false, error: "El descuento no está autorizado en Cuenta." };
      return {
        valid: true,
        value: selected,
        type: selected,
        benefit_id: null,
        discount_percent: normalized.discount.max_percent,
        detail: null,
        label: `Descuento autorizado del ${normalized.discount.max_percent}%`,
      };
    }
    if (selected === "TWO_FOR_ONE" || selected === "GIFT") {
      const authorization = selected === "TWO_FOR_ONE" ? normalized.two_for_one : normalized.gift;
      if (!authorization.enabled) return { valid: false, error: "La alternativa elegida no está autorizada en Cuenta." };
      if (!text(detail)) return { valid: false, error: "Describe exactamente la alternativa autorizada." };
      return {
        valid: true,
        value: selected,
        type: selected,
        benefit_id: null,
        discount_percent: 0,
        detail: text(detail),
        label: authorization.label || (selected === "TWO_FOR_ONE" ? "Beneficio 2x1" : "Obsequio extraordinario"),
      };
    }
    if (selected.startsWith("BENEFIT:")) {
      const benefitId = text(value).slice(8);
      const benefit = normalized.benefits.find((entry) => entry.enabled && entry.id === benefitId);
      if (!benefit) return { valid: false, error: "Ese beneficio ya no está autorizado en Cuenta." };
      return {
        valid: true,
        value: text(value),
        type: "CUSTOM",
        benefit_id: benefit.id,
        discount_percent: benefit.type === "DISCOUNT" ? benefit.value : 0,
        detail: benefit.detail || null,
        label: benefit.label,
      };
    }
    return { valid: false, error: "La alternativa seleccionada no es válida." };
  }

  function normalizeProducts(products = [], appliesBenefit = false) {
    const seen = new Set();
    const normalized = [];
    for (const line of Array.isArray(products) ? products : []) {
      const id = text(line?.inventory_product_id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      normalized.push({
        inventory_product_id: id,
        quantity: Math.max(0.01, number(line?.quantity, 1)),
        benefit_applied: appliesBenefit && Boolean(line?.benefit_applied),
      });
    }
    return normalized;
  }

  function offerFromSnapshot(snapshot = {}) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const type = text(source.type).toUpperCase();
    if (!["DISCOUNT", "TWO_FOR_ONE", "GIFT", "CUSTOM"].includes(type)) {
      return { valid: false, error: "El ticket existente no conserva una concesión válida." };
    }
    return {
      valid: true,
      value: source.benefit_id ? `BENEFIT:${source.benefit_id}` : type,
      type,
      benefit_id: text(source.benefit_id) || null,
      discount_percent: Math.min(100, Math.max(0, number(source.discount_percent))),
      detail: text(source.detail || source.custom_benefit?.detail) || null,
      label: text(source.label || source.custom_benefit?.label) || "Beneficio extraordinario",
    };
  }

  function buildReview(input = {}) {
    const result = text(input.result).toUpperCase();
    if (!VALID_RESULTS.has(result)) return { valid: false, error: "Selecciona Venta lograda o Enviar a Reciclaje." };
    const isSale = result === "CLEARED";
    const recycleReason = text(input.recycle_reason).toUpperCase();
    if (!isSale && !recycleReason) return { valid: false, error: "Selecciona el motivo principal de Reciclaje." };
    const offer = isSale
      ? input.offer_snapshot
        ? offerFromSnapshot(input.offer_snapshot)
        : offerFromValue(input.offer_value, input.authorizations, input.offer_detail)
      : { valid: true, type: "NONE", benefit_id: null, discount_percent: 0, detail: null, label: "Sin concesión extraordinaria" };
    if (!offer.valid) return offer;
    const products = isSale ? normalizeProducts(input.products, offer.type !== "NONE") : [];
    if (isSale && !products.length) return { valid: false, error: "Selecciona al menos un producto real para la venta." };
    if (isSale && offer.type !== "NONE" && !products.some((product) => product.benefit_applied)) {
      return { valid: false, error: "Indica al menos un producto al que se aplicó el beneficio." };
    }
    const typedReason = text(input.reason);
    const fallbackReason = isSale
      ? offer.type === "NONE" ? "Venta confirmada sin concesión extraordinaria." : `Venta recuperada con ${offer.label}.`
      : `Caso enviado a Reciclaje: ${text(input.recycle_reason_label) || recycleReason}.`;
    const reason = (typedReason
      ? isSale
        ? typedReason.length >= 4 ? typedReason : `${fallbackReason} Contexto: ${typedReason}`
        : `${fallbackReason} Contexto: ${typedReason}`
      : fallbackReason).slice(0, 3000);
    return {
      valid: true,
      destination: DESTINATIONS[result],
      payload: {
        source_id: input.source_id,
        source_type: input.source_type || "PLAYER",
        lead_id: input.lead_id || null,
        result,
        reason,
        recovery_offer: isSale ? offer.type : "NONE",
        recovery_benefit_id: isSale ? offer.benefit_id : null,
        discount_percent: isSale ? offer.discount_percent : 0,
        recovery_detail: isSale ? offer.detail : null,
        ...(isSale ? { products } : {}),
        recycle_reason: isSale ? null : recycleReason,
        recycle_strategy: isSale ? null : (input.recycle_strategy || "NURTURE"),
        recycle_note: isSale ? null : reason,
        next_action_at: isSale ? null : (input.next_action_at || null),
        responsible: input.responsible || null,
        idempotency_key: text(input.idempotency_key),
      },
    };
  }

  function confirmedDestination(response = {}) {
    return text(response?.state?.rms_phase || response?.movement?.to_phase || response?.route?.phase);
  }

  const api = Object.freeze({
    DESTINATIONS,
    normalizeAuthorizations,
    offerFromValue,
    normalizeProducts,
    offerFromSnapshot,
    buildReview,
    confirmedDestination,
  });

  globalScope.RmsRiskStationCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

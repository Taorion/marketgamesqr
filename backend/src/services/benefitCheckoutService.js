const { badRequest } = require("../utils/http");

const PURCHASE_BENEFIT_TYPES = new Set([
  "PERCENT_DISCOUNT",
  "FIXED_AMOUNT_DISCOUNT",
  "BUY_X_GET_Y",
]);

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const firstNumber = (...values) => {
  for (const value of values) {
    if (value == null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
};

function nestedBenefitValue(value = {}) {
  return value?.value && typeof value.value === "object" ? value.value : {};
}

function benefitProductScope(value = {}) {
  return value.product_scope || nestedBenefitValue(value).product_scope || null;
}

function percentageFromLabel(value = "") {
  const match = String(value || "").match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return 0;
  const number = Number(match[1].replace(",", "."));
  return Number.isFinite(number) && number > 0 && number <= 100 ? number : 0;
}

function normalizeBenefitDefinition(benefitType, benefitValue = {}, label = "Beneficio") {
  const configuredType = String(benefitType || "CUSTOM").toUpperCase();
  const nested = nestedBenefitValue(benefitValue);
  const scope = benefitProductScope(benefitValue);
  const explicitRequired = benefitValue.purchase_required ?? benefitValue.requires_purchase
    ?? nested.purchase_required ?? nested.requires_purchase;
  const minimumPurchase = Math.max(0, firstNumber(
    benefitValue.minimum_purchase,
    benefitValue.minimum_purchase_amount,
    benefitValue.min_purchase,
    nested.minimum_purchase,
    nested.minimum_purchase_amount,
    nested.min_purchase
  ));
  const storedPercent = firstNumber(
    benefitValue.percent,
    benefitValue.discount_percent,
    benefitValue.selected_discount,
    nested.percent,
    nested.discount_percent,
    nested.selected_discount
  );
  const scratchPercent = (benefitValue.scratch_slot || nested.scratch_slot)
    ? percentageFromLabel(benefitValue.label || nested.label || label)
    : 0;
  const percent = Math.min(100, Math.max(0, scratchPercent || storedPercent));
  const fixedAmount = Math.max(0, firstNumber(
    benefitValue.amount,
    benefitValue.discount_amount,
    benefitValue.fixed_amount,
    benefitValue.value_cop,
    nested.amount,
    nested.discount_amount,
    nested.fixed_amount,
    nested.value_cop
  ));
  const type = configuredType === "CUSTOM" && percent > 0
    ? "PERCENT_DISCOUNT"
    : configuredType === "CUSTOM" && fixedAmount > 0
      ? "FIXED_AMOUNT_DISCOUNT"
      : configuredType === "CUSTOM" && scope?.mode === "gift_product"
        ? "FREE_GIFT"
        : configuredType;
  const purchaseRequired = explicitRequired == null
    ? PURCHASE_BENEFIT_TYPES.has(type) || scope?.mode === "applies_to_product" || minimumPurchase > 0
    : Boolean(explicitRequired);
  const maxDiscount = Math.max(0, firstNumber(benefitValue.max_discount, nested.max_discount));

  return {
    type,
    label: String(benefitValue.label || nested.label || label || "Beneficio"),
    purchase_required: purchaseRequired,
    standalone_allowed: !purchaseRequired,
    minimum_purchase: minimumPurchase,
    percent,
    fixed_amount: fixedAmount,
    max_discount: maxDiscount || null,
    product_scope: scope,
    buy_quantity: Math.max(1, Math.trunc(firstNumber(benefitValue.buy_quantity, benefitValue.buy_x, nested.buy_quantity, nested.buy_x) || 1)),
    get_quantity: Math.max(1, Math.trunc(firstNumber(benefitValue.get_quantity, benefitValue.get_y, nested.get_quantity, nested.get_y) || 1)),
    raw: benefitValue || {},
  };
}

function normalizeLineItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 50).map((item, index) => {
    const quantity = Math.max(0, firstNumber(item.quantity, 1));
    const unitPrice = Math.max(0, firstNumber(item.unit_price, item.unitPrice));
    return {
      name: String(item.name || item.product_name || `Producto ${index + 1}`).trim().slice(0, 200),
      quantity,
      unit_price: roundMoney(unitPrice),
      line_total: roundMoney(quantity * unitPrice),
      inventory_product_id: item.inventory_product_id || null,
    };
  }).filter((item) => item.quantity > 0 && item.name);
}

function normalizedText(value) {
  return String(value || "").trim().toLocaleLowerCase("es-CO");
}

function eligibleItems(items, scope) {
  if (!scope?.product_name && !scope?.inventory_product_id) return items;
  return items.filter((item) => (
    (scope.inventory_product_id && item.inventory_product_id === scope.inventory_product_id)
    || (scope.product_name && normalizedText(item.name) === normalizedText(scope.product_name))
  ));
}

function describeBenefitApplication(benefitType, benefitValue, label) {
  const definition = normalizeBenefitDefinition(benefitType, benefitValue, label);
  return {
    type: definition.type,
    label: definition.label,
    purchase_required: definition.purchase_required,
    standalone_allowed: definition.standalone_allowed,
    minimum_purchase: definition.minimum_purchase,
    percent: definition.percent,
    fixed_amount: definition.fixed_amount,
    max_discount: definition.max_discount,
    product_scope: definition.product_scope,
    buy_quantity: definition.buy_quantity,
    get_quantity: definition.get_quantity,
  };
}

function calculateBenefitCheckout({ benefitType, benefitValue, label, mode, purchase = {} }) {
  const definition = normalizeBenefitDefinition(benefitType, benefitValue, label);
  const applicationMode = String(mode || (definition.purchase_required ? "PURCHASE" : "STANDALONE")).toUpperCase();
  if (!['PURCHASE', 'STANDALONE'].includes(applicationMode)) {
    throw badRequest("Selecciona si el beneficio se entrega solo o se aplica a una compra.");
  }
  if (applicationMode === "STANDALONE") {
    if (!definition.standalone_allowed) {
      throw badRequest("Este beneficio solo puede redimirse al registrar una compra.");
    }
    return {
      mode: applicationMode,
      purchase_required: definition.purchase_required,
      subtotal: 0,
      eligible_subtotal: 0,
      discount_amount: 0,
      final_total: 0,
      line_items: [],
      gifts: ["FREE_GIFT", "FREE_SAMPLE"].includes(definition.type)
        ? [definition.product_scope?.product_name || definition.label]
        : [],
      benefit: describeBenefitApplication(benefitType, benefitValue, label),
      summary: `${definition.label} entregado sin compra asociada.`,
    };
  }

  const lineItems = normalizeLineItems(purchase.line_items);
  const itemSubtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.line_total, 0));
  const declaredSubtotal = roundMoney(Math.max(0, firstNumber(purchase.subtotal, purchase.purchase_subtotal)));
  const subtotal = lineItems.length ? itemSubtotal : declaredSubtotal;
  if (subtotal <= 0) throw badRequest("Registra una compra con subtotal mayor a 0.");
  if (definition.minimum_purchase > subtotal) {
    throw badRequest(`Este beneficio exige una compra minima de ${definition.minimum_purchase.toLocaleString("es-CO")} COP.`);
  }

  const scopedItems = eligibleItems(lineItems, definition.product_scope);
  if (definition.product_scope?.mode === "applies_to_product" && !scopedItems.length) {
    throw badRequest(`Agrega ${definition.product_scope.product_name || "el producto elegible"} para aplicar este beneficio.`);
  }
  const eligibleSubtotal = roundMoney(scopedItems.length
    ? scopedItems.reduce((sum, item) => sum + item.line_total, 0)
    : subtotal);
  let discountAmount = 0;
  const gifts = [];

  if (definition.type === "PERCENT_DISCOUNT") {
    if (definition.percent <= 0) throw badRequest("El ticket no tiene un porcentaje de descuento valido.");
    discountAmount = eligibleSubtotal * definition.percent / 100;
  } else if (definition.type === "FIXED_AMOUNT_DISCOUNT") {
    if (definition.fixed_amount <= 0) throw badRequest("El ticket no tiene un valor de descuento valido.");
    discountAmount = Math.min(eligibleSubtotal, definition.fixed_amount);
  } else if (["FREE_GIFT", "FREE_SAMPLE"].includes(definition.type)) {
    gifts.push(definition.product_scope?.product_name || definition.label);
  } else if (definition.type === "BUY_X_GET_Y") {
    if (!lineItems.length) throw badRequest("El beneficio 2x1 o compra X lleva Y requiere productos detallados.");
    const target = scopedItems[0] || lineItems[0];
    const bundle = definition.buy_quantity + definition.get_quantity;
    const freeUnits = Math.floor(target.quantity / bundle) * definition.get_quantity;
    if (freeUnits <= 0) throw badRequest(`Agrega al menos ${bundle} unidades de ${target.name} para aplicar el beneficio.`);
    discountAmount = freeUnits * target.unit_price;
    gifts.push(`${freeUnits} unidad${freeUnits === 1 ? "" : "es"} sin costo de ${target.name}`);
  }

  if (definition.max_discount) discountAmount = Math.min(discountAmount, definition.max_discount);
  discountAmount = roundMoney(Math.min(subtotal, Math.max(0, discountAmount)));
  const finalTotal = roundMoney(subtotal - discountAmount);
  const summary = discountAmount > 0
    ? `${definition.label}: descuento automatico de ${discountAmount.toLocaleString("es-CO")} COP.`
    : gifts.length
      ? `${definition.label}: ${gifts.join(", ")}.`
      : `${definition.label} aplicado a la compra sin modificar el total monetario.`;

  return {
    mode: applicationMode,
    purchase_required: definition.purchase_required,
    subtotal,
    eligible_subtotal: eligibleSubtotal,
    discount_amount: discountAmount,
    final_total: finalTotal,
    line_items: lineItems,
    gifts,
    benefit: describeBenefitApplication(benefitType, benefitValue, label),
    summary,
  };
}

module.exports = {
  calculateBenefitCheckout,
  describeBenefitApplication,
  normalizeBenefitDefinition,
  normalizeLineItems,
};

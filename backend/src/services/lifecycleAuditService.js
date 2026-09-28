const { query } = require("../config/db");

const LIFECYCLE_ACTIONS = new Set([
  "CREATED", "STOCK_SOLD", "ARCHIVED", "RESTORED", "CANCELLED", "VOIDED", "DISABLED", "DELETED", "EVIDENCE_INVALIDATED",
]);

function lifecycleEventPayload(payload = {}) {
  const action = String(payload.action || "").trim().toUpperCase();
  if (!LIFECYCLE_ACTIONS.has(action)) throw new Error("Acción de ciclo de vida no permitida.");
  return {
    business_id: payload.business_id,
    entity_type: String(payload.entity_type || "").trim().toUpperCase(),
    entity_id: payload.entity_id,
    action,
    previous_status: payload.previous_status ? String(payload.previous_status).trim().toUpperCase() : null,
    next_status: payload.next_status ? String(payload.next_status).trim().toUpperCase() : null,
    reason: String(payload.reason || "").trim() || null,
    dependency_summary: payload.dependency_summary || {},
    idempotency_key: String(payload.idempotency_key || "").trim() || null,
    actor_user_id: payload.actor_user_id || null,
    metadata: payload.metadata || {},
  };
}

async function recordLifecycleEvent(payload, client = null) {
  const event = lifecycleEventPayload(payload);
  const executor = client || { query };
  const result = await executor.query(
    `insert into business_lifecycle_events
      (business_id, entity_type, entity_id, action, previous_status, next_status, reason,
       dependency_summary, idempotency_key, actor_user_id, metadata)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb)
     on conflict (business_id, idempotency_key) where idempotency_key is not null
     do nothing
     returning *`,
    [
      event.business_id, event.entity_type, event.entity_id, event.action, event.previous_status,
      event.next_status, event.reason, JSON.stringify(event.dependency_summary), event.idempotency_key,
      event.actor_user_id, JSON.stringify(event.metadata),
    ]
  );
  return result.rows[0] || null;
}

async function recordInventoryProductCreated({ businessId, product, actorUserId, source, metadata = {} }, client = null) {
  if (!product?.id) throw new Error("El producto es obligatorio para registrar su creacion.");
  return recordLifecycleEvent({
    business_id: businessId,
    entity_type: "INVENTORY_PRODUCT",
    entity_id: product.id,
    action: "CREATED",
    previous_status: null,
    next_status: product.status || "ACTIVE",
    idempotency_key: `inventory-created:${product.id}`,
    actor_user_id: actorUserId || null,
    metadata: {
      product_name: product.name || null,
      internal_id: product.internal_id || null,
      sku: product.sku || null,
      barcode: product.barcode || null,
      initial_stock_quantity: Number(product.stock_quantity || 0),
      unit_label: product.unit_label || "unidad",
      unit_price: Number(product.unit_price || 0),
      redemption_points_cost: Number(product.redemption_points_cost || 0),
      source: String(source || "MANUAL_FORM").trim().toUpperCase(),
      ...metadata,
    },
  }, client);
}

async function recordInventoryProductSold({
  businessId,
  product,
  quantity,
  stockBefore,
  stockAfter,
  actorUserId,
  idempotencyKey,
  source,
  metadata = {},
}, client = null) {
  if (!product?.id) throw new Error("El producto es obligatorio para registrar la salida de inventario.");
  return recordLifecycleEvent({
    business_id: businessId,
    entity_type: "INVENTORY_PRODUCT",
    entity_id: product.id,
    action: "STOCK_SOLD",
    previous_status: product.status || "ACTIVE",
    next_status: product.status || "ACTIVE",
    reason: `Venta registrada: salida de ${Number(quantity || 0)} ${product.unit_label || "unidad(es)"}.`,
    idempotency_key: idempotencyKey || null,
    actor_user_id: actorUserId || null,
    metadata: {
      product_name: product.name || null,
      quantity_sold: Number(quantity || 0),
      stock_before_sale: Number(stockBefore || 0),
      stock_after_sale: Number(stockAfter || 0),
      unit_label: product.unit_label || "unidad",
      source: String(source || "SALE").trim().toUpperCase(),
      ...metadata,
    },
  }, client);
}

module.exports = {
  lifecycleEventPayload,
  recordLifecycleEvent,
  recordInventoryProductCreated,
  recordInventoryProductSold,
};

const { query } = require("../config/db");
const { forbidden, badRequest } = require("../utils/http");
const { getBusinessSubscription } = require("./subscriptionService");

const GIB = 1024 * 1024 * 1024;
const DEFAULT_STORAGE_BYTES = GIB;

const STORAGE_ADDON_CATALOG = Object.freeze([
  { code: "STORAGE_10_GB", name: "10 GB adicionales", storage_bytes: 10 * GIB, price_cop: 99000 },
  { code: "STORAGE_50_GB", name: "50 GB adicionales", storage_bytes: 50 * GIB, price_cop: 399000 },
]);

function storageAddonOffer(code) {
  return STORAGE_ADDON_CATALOG.find((item) => item.code === String(code || "").trim()) || null;
}

function storageLimitForPlan(plan = {}) {
  const configured = plan.limits?.storage_bytes;
  return configured === null ? null : Number(configured || DEFAULT_STORAGE_BYTES);
}

async function getStorageSummary(businessId) {
  const [subscription, usageResult, addonsResult] = await Promise.all([
    getBusinessSubscription(businessId),
    query(
      `select (
          coalesce((select sum(octet_length(file_data_url) + coalesce(octet_length(cover_image_data_url), 0)) from digital_assets where business_id = $1), 0)
          + coalesce((select octet_length(settings->>'logo_data_url') + coalesce(octet_length(settings->>'ticket_frame_data_url'), 0) from businesses where id = $1), 0)
        )::bigint as used_bytes,
        (select count(*)::int from digital_assets where business_id = $1) as assets_count`,
      [businessId]
    ),
    query(
      `select coalesce(sum(storage_bytes), 0)::bigint as addon_bytes,
              count(*) filter (where status = 'APPROVED')::int as addons_count
       from business_storage_addon_orders
       where business_id = $1 and status = 'APPROVED'`,
      [businessId]
    ),
  ]);
  const includedBytes = storageLimitForPlan(subscription.plan || {});
  const usedBytes = Number(usageResult.rows[0]?.used_bytes || 0);
  const addonBytes = Number(addonsResult.rows[0]?.addon_bytes || 0);
  const limitBytes = includedBytes === null ? null : includedBytes + addonBytes;
  const remainingBytes = limitBytes === null ? null : Math.max(0, limitBytes - usedBytes);
  const usedPercent = limitBytes ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  return {
    plan_code: subscription.plan?.code || null,
    plan_name: subscription.plan?.name || "Plan Qori",
    used_bytes: usedBytes,
    included_bytes: includedBytes,
    addon_bytes: addonBytes,
    limit_bytes: limitBytes,
    remaining_bytes: remainingBytes,
    used_percent: Number(usedPercent.toFixed(2)),
    status: limitBytes !== null && usedBytes >= limitBytes ? "FULL" : usedPercent >= 90 ? "CRITICAL" : usedPercent >= 80 ? "WARNING" : "OK",
    assets_count: Number(usageResult.rows[0]?.assets_count || 0),
    addons_count: Number(addonsResult.rows[0]?.addons_count || 0),
    addons: STORAGE_ADDON_CATALOG,
  };
}

async function assertStorageQuotaForUpload(businessId, additionalBytes) {
  const requestedBytes = Math.max(0, Number(additionalBytes || 0));
  if (!requestedBytes) return getStorageSummary(businessId);
  const summary = await getStorageSummary(businessId);
  if (summary.limit_bytes !== null && summary.used_bytes + requestedBytes > summary.limit_bytes) {
    throw forbidden(
      "No hay almacenamiento disponible para este archivo. Libera espacio o compra una ampliacion.",
      { storage_quota: { ...summary, requested_bytes: requestedBytes } }
    );
  }
  return summary;
}

async function approveStorageAddonOrder(client, order, payment) {
  if (order.status === "APPROVED") return order;
  if (Number(payment.transaction_amount || 0) < Number(order.price_cop || 0)) {
    throw badRequest("El pago aprobado no coincide con el valor de la ampliacion de almacenamiento.");
  }
  const result = await client.query(
    `update business_storage_addon_orders
     set status = 'APPROVED', mercado_pago_payment_id = $2, payment_payload = $3::jsonb,
         approved_at = now(), updated_at = now()
     where id = $1
     returning *`,
    [order.id, String(payment.id), JSON.stringify(payment)]
  );
  return result.rows[0];
}

module.exports = {
  STORAGE_ADDON_CATALOG,
  storageAddonOffer,
  getStorageSummary,
  assertStorageQuotaForUpload,
  approveStorageAddonOrder,
};

const { badRequest } = require("../utils/http");

const QR_PACKAGES = [100, 300, 500, 800, 1000, 1500, 2000, 5000, 10000];
const INTERNAL_UNIT_PRICE_COP = 1000;

function assertValidPackage(packageSize) {
  if (!QR_PACKAGES.includes(Number(packageSize))) {
    throw badRequest(`Paquete QR invalido. Usa uno de: ${QR_PACKAGES.join(", ")}.`);
  }
}

function trafficLabel(quantity) {
  return `${Number(quantity || 0).toLocaleString("es-CO")} creditos de trafico`;
}

async function ensureCreditAccount(client, businessId) {
  const existing = await client.query(
    "select * from business_qr_credit_accounts where business_id = $1 for update",
    [businessId]
  );
  if (existing.rowCount) {
    return existing.rows[0];
  }

  const created = await client.query(
    `insert into business_qr_credit_accounts (business_id)
     values ($1)
     returning *`,
    [businessId]
  );
  return created.rows[0];
}

async function getSubscriptionQuota(client, businessId) {
  const business = await client.query(
    `select plan_code, subscription_status
     from businesses
     where id = $1 and is_active = true`,
    [businessId]
  );
  const code = String(business.rows[0]?.plan_code || "PREPAID_QR").toUpperCase();
  const status = business.rows[0]?.subscription_status || "ACTIVE";
  const quotas = {
    STARTER: 500,
    GROWTH: 2000,
    PRO: 6000,
    ENTERPRISE: null,
  };
  if (status !== "ACTIVE" || !Object.prototype.hasOwnProperty.call(quotas, code)) {
    return { included: 0, used: 0, remaining: 0, plan_code: code };
  }
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const usage = await client.query(
    `select coalesce(sum(quantity), 0)::int as total
     from subscription_usage_events
     where business_id = $1
       and event_type = 'qr_generated'
       and created_at >= $2
       and created_at < $3`,
    [businessId, start.toISOString(), end.toISOString()]
  );
  const used = Number(usage.rows[0]?.total || 0);
  const included = quotas[code];
  return {
    included,
    used,
    remaining: included === null ? null : Math.max(0, included - used),
    plan_code: code,
  };
}

async function addQrCredits(client, payload) {
  const packageSize = Number(payload.package_size);
  assertValidPackage(packageSize);

  const account = await ensureCreditAccount(client, payload.business_id);
  const nextBalance = Number(account.qr_balance || 0) + packageSize;
  const nextPurchased = Number(account.qr_purchased_total || 0) + packageSize;
  const publicLabel = payload.public_label || trafficLabel(packageSize);
  const internalUnitPrice = Number(payload.internal_unit_price_cop || INTERNAL_UNIT_PRICE_COP);
  const internalTotal = packageSize * internalUnitPrice;

  const updated = await client.query(
    `update business_qr_credit_accounts
     set current_package_size = $2,
         qr_balance = $3,
         qr_purchased_total = $4,
         public_label = $5,
         internal_unit_price_cop = $6,
         last_purchase_at = now(),
         updated_at = now()
     where business_id = $1
     returning *`,
    [
      payload.business_id,
      packageSize,
      nextBalance,
      nextPurchased,
      publicLabel,
      internalUnitPrice,
    ]
  );

  await client.query(
    `insert into business_qr_credit_ledger
      (business_id, account_id, entry_type, package_size, delta_qr, balance_after,
       internal_unit_price_cop, internal_total_cop, public_label, notes, created_by_user_id)
     values ($1, $2, 'PACKAGE_PURCHASE', $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      payload.business_id,
      account.id,
      packageSize,
      packageSize,
      nextBalance,
      internalUnitPrice,
      internalTotal,
      publicLabel,
      payload.notes || null,
      payload.created_by_user_id || null,
    ]
  );

  return updated.rows[0];
}

async function consumeQrCredits(client, businessId, quantity, qrCodeId = null, userId = null, notes = null) {
  const amount = Number(quantity || 0);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw badRequest("La cantidad de creditos QR a consumir debe ser mayor a 0.");
  }

  const accountResult = await client.query(
    "select * from business_qr_credit_accounts where business_id = $1 for update",
    [businessId]
  );

  if (!accountResult.rowCount) {
    return null;
  }

  const account = accountResult.rows[0];
  if (Number(account.qr_balance || 0) < amount) {
    const quota = await getSubscriptionQuota(client, businessId);
    if (quota.remaining === null || amount <= Number(quota.remaining || 0)) {
      const updated = await client.query(
        `update business_qr_credit_accounts
         set qr_used_total = $2,
             updated_at = now()
         where business_id = $1
         returning *`,
        [businessId, Number(account.qr_used_total || 0) + amount]
      );

      await client.query(
        `insert into business_qr_credit_ledger
          (business_id, account_id, entry_type, delta_qr, balance_after, qr_code_id,
           public_label, notes, created_by_user_id)
         values ($1, $2, 'SUBSCRIPTION_INCLUDED', $3, $4, $5, $6, $7, $8)`,
        [
          businessId,
          account.id,
          -amount,
          Number(account.qr_balance || 0),
          qrCodeId,
          trafficLabel(amount),
          notes || `${amount} credito${amount === 1 ? "" : "s"} de trafico consumido${amount === 1 ? "" : "s"} desde cuota ${quota.plan_code}.`,
          userId,
        ]
      );

      return updated.rows[0];
    }
    throw badRequest("Trafico agotado. Solicita una recarga o upgrade para seguir generando QR.");
  }

  const nextBalance = Number(account.qr_balance) - amount;
  const nextUsed = Number(account.qr_used_total || 0) + amount;
  const updated = await client.query(
    `update business_qr_credit_accounts
     set qr_balance = $2,
         qr_used_total = $3,
         updated_at = now()
     where business_id = $1
     returning *`,
    [businessId, nextBalance, nextUsed]
  );

  await client.query(
     `insert into business_qr_credit_ledger
      (business_id, account_id, entry_type, delta_qr, balance_after, qr_code_id,
       public_label, notes, created_by_user_id)
     values ($1, $2, 'QR_CONSUMED', $3, $4, $5, $6, $7, $8)`,
    [
      businessId,
      account.id,
      -amount,
      nextBalance,
      qrCodeId,
      trafficLabel(amount),
      notes || `${amount} credito${amount === 1 ? "" : "s"} de trafico consumido${amount === 1 ? "" : "s"}.`,
      userId,
    ]
  );

  return updated.rows[0];
}

async function consumeQrCredit(client, businessId, qrCodeId, userId = null) {
  return consumeQrCredits(client, businessId, 1, qrCodeId, userId, "QR generado por experiencia publica o portal.");
}

function mapCreditAccount(row) {
  if (!row) {
    return null;
  }
  const purchased = Number(row.qr_purchased_total || 0);
  const used = Number(row.qr_used_total || 0);
  const balance = Number(row.qr_balance || 0);
  const usedRate = purchased ? Number(((used / purchased) * 100).toFixed(1)) : 0;
  return {
    id: row.id,
    business_id: row.business_id,
    current_package_size: Number(row.current_package_size || 0),
    qr_balance: balance,
    qr_purchased_total: purchased,
    qr_used_total: used,
    public_label: row.public_label || trafficLabel(balance),
    internal_unit_price_cop: Number(row.internal_unit_price_cop || INTERNAL_UNIT_PRICE_COP),
    internal_balance_value_cop: balance * Number(row.internal_unit_price_cop || INTERNAL_UNIT_PRICE_COP),
    internal_used_value_cop: used * Number(row.internal_unit_price_cop || INTERNAL_UNIT_PRICE_COP),
    internal_purchased_value_cop: purchased * Number(row.internal_unit_price_cop || INTERNAL_UNIT_PRICE_COP),
    used_rate: usedRate,
    low_balance: balance > 0 && balance <= Math.max(10, Math.ceil(Number(row.current_package_size || 0) * 0.1)),
    exhausted: balance <= 0,
    last_purchase_at: row.last_purchase_at,
    updated_at: row.updated_at,
  };
}

function mapPublicCreditAccount(row) {
  const account = mapCreditAccount(row);
  if (!account) {
    return null;
  }
  return {
    id: account.id,
    business_id: account.business_id,
    current_package_size: account.current_package_size,
    qr_balance: account.qr_balance,
    qr_purchased_total: account.qr_purchased_total,
    qr_used_total: account.qr_used_total,
    public_label: account.public_label,
    used_rate: account.used_rate,
    low_balance: account.low_balance,
    exhausted: account.exhausted,
    last_purchase_at: account.last_purchase_at,
    updated_at: account.updated_at,
  };
}

module.exports = {
  QR_PACKAGES,
  INTERNAL_UNIT_PRICE_COP,
  addQrCredits,
  consumeQrCredit,
  consumeQrCredits,
  ensureCreditAccount,
  mapCreditAccount,
  mapPublicCreditAccount,
  trafficLabel,
};

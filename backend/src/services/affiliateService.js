const QRCode = require("qrcode");
const { query, withTransaction } = require("../config/db");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { createSecureToken } = require("../utils/token");
const { canAccessBusiness } = require("../middleware/auth");

const POINTS_PER_PESO = 1000;

function ensureBusinessAccess(user, businessId) {
  if (!canAccessBusiness(user, businessId)) {
    throw forbidden("You cannot access this business.");
  }
}

async function businessNameFor(businessId) {
  const result = await query("select id, name from businesses where id = $1", [businessId]);
  return result.rows[0] || null;
}

async function attachQrDataUrl(affiliate) {
  return {
    ...affiliate,
    qr_data_url: await QRCode.toDataURL(String(affiliate.qr_token || ""), {
      margin: 2,
      width: 720,
      errorCorrectionLevel: "Q",
    }),
  };
}

async function listAffiliates(businessId, user) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `select
       a.*,
       b.name as business_name,
       u.full_name as created_by_name,
       coalesce((select sum(l.points_awarded)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as ledger_points,
       coalesce((select count(*)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as point_events,
       coalesce((select sum(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as purchase_total,
       coalesce((select avg(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as average_purchase,
       (select max(l.created_at) from affiliate_point_ledger l where l.affiliate_id = a.id) as last_purchase_at
     from affiliates a
     join businesses b on b.id = a.business_id
     left join app_users u on u.id = a.created_by_user_id
     where a.business_id = $1
     order by a.created_at desc`,
    [businessId]
  );

  const affiliates = await Promise.all(result.rows.map(attachQrDataUrl));
  return affiliates;
}

async function createAffiliate(businessId, user, body) {
  ensureBusinessAccess(user, businessId);
  const business = await businessNameFor(businessId);
  if (!business) {
    throw notFound("Business not found.");
  }

  const qrToken = createSecureToken();
  const result = await query(
    `insert into affiliates
      (business_id, created_by_user_id, full_name, document_id, phone, email, photo_data_url, qr_token, status, notes, card_metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9, $10)
     returning *`,
    [
      businessId,
      user.id,
      body.full_name,
      body.document_id || null,
      body.phone || null,
      body.email || null,
      body.photo_data_url || null,
      qrToken,
      body.notes || null,
      body.card_metadata || {},
    ]
  );

  const affiliate = await attachQrDataUrl({
    ...result.rows[0],
    business_name: business.name,
    created_by_name: user.full_name || user.email || null,
    ledger_points: 0,
    point_events: 0,
  });

  return affiliate;
}

async function getAffiliate(businessId, affiliateId, user) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `select
       a.*,
       b.name as business_name,
       u.full_name as created_by_name,
       coalesce((select sum(l.points_awarded)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as ledger_points,
       coalesce((select count(*)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as point_events,
       coalesce((select sum(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as purchase_total,
       coalesce((select avg(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as average_purchase,
       (select max(l.created_at) from affiliate_point_ledger l where l.affiliate_id = a.id) as last_purchase_at
     from affiliates a
     join businesses b on b.id = a.business_id
     left join app_users u on u.id = a.created_by_user_id
     where a.business_id = $1 and a.id = $2`,
    [businessId, affiliateId]
  );

  const affiliate = result.rows[0];
  if (!affiliate) {
    throw notFound("Affiliate not found.");
  }
  return attachQrDataUrl(affiliate);
}

async function awardAffiliatePoints(businessId, affiliateId, user, body) {
  ensureBusinessAccess(user, businessId);
  const amount = Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw badRequest("El monto debe ser mayor a 0.");
  }

  const points = Math.floor(amount / POINTS_PER_PESO);
  if (points < 1) {
    return {
      awarded: 0,
      message: "El monto no genera puntos porque es menor a 1000 pesos.",
      affiliate: await getAffiliate(businessId, affiliateId, user),
    };
  }

  const updatedAffiliate = await withTransaction(async (client) => {
    const result = await client.query(
      `select *
       from affiliates
       where business_id = $1 and id = $2
       for update`,
      [businessId, affiliateId]
    );
    const row = result.rows[0];
    if (!row) {
      throw notFound("Affiliate not found.");
    }

    await client.query(
      `insert into affiliate_point_ledger
        (business_id, affiliate_id, created_by_user_id, amount, points_awarded, reason, metadata)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        businessId,
        affiliateId,
        user.id,
        amount,
        points,
        body.reason || "PURCHASE",
        body.metadata || {},
      ]
    );

    const updated = await client.query(
      `update affiliates
       set points_total = points_total + $3
       where id = $1 and business_id = $2
       returning *`,
      [affiliateId, businessId, points]
    );

    return updated.rows[0];
  });

  const affiliate = await getAffiliate(businessId, updatedAffiliate.id, user);

  return {
    awarded: points,
    amount,
    affiliate,
  };
}

async function listAffiliateLedger(businessId, affiliateId, user) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `select
       l.id,
       l.amount,
       l.points_awarded,
       l.reason,
       l.metadata,
       l.created_at,
       u.full_name as created_by_name
     from affiliate_point_ledger l
     left join app_users u on u.id = l.created_by_user_id
     where l.business_id = $1 and l.affiliate_id = $2
     order by l.created_at desc
     limit 200`,
    [businessId, affiliateId]
  );
  return result.rows;
}

async function deleteAffiliate(businessId, affiliateId, user) {
  ensureBusinessAccess(user, businessId);
  const result = await query(
    `delete from affiliates
     where business_id = $1 and id = $2
     returning id, full_name`,
    [businessId, affiliateId]
  );
  const affiliate = result.rows[0];
  if (!affiliate) {
    throw notFound("Affiliate not found.");
  }
  return affiliate;
}

module.exports = {
  createAffiliate,
  deleteAffiliate,
  getAffiliate,
  listAffiliates,
  listAffiliateLedger,
  awardAffiliatePoints,
};

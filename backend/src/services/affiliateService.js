const QRCode = require("qrcode");
const { query, withTransaction } = require("../config/db");
const { env } = require("../config/env");
const { badRequest, forbidden, notFound } = require("../utils/http");
const { createSecureToken } = require("../utils/token");
const { canAccessBusiness } = require("../middleware/auth");
const {
  affiliatePointRuleMetadata,
  affiliatePointsForAmount,
  getAffiliatePointRules,
} = require("./affiliatePointRulesService");

const BUSINESS_CARD_SETTINGS_SQL = `
  jsonb_strip_nulls(jsonb_build_object(
    'slogan', b.settings->>'slogan',
    'tagline', b.settings->>'tagline',
    'contact_name', b.settings->>'contact_name',
    'email', b.settings->>'email',
    'contact_email', b.settings->>'contact_email',
    'phone', b.settings->>'phone',
    'website', b.settings->>'website',
    'city', b.settings->>'city',
    'address', b.settings->>'address',
    'brand_primary', b.settings->>'brand_primary',
    'brand_secondary', b.settings->>'brand_secondary',
    'logo_url', b.settings->>'logo_url'
  ))
`;

function ensureBusinessAccess(user, businessId) {
  if (!canAccessBusiness(user, businessId)) {
    throw forbidden("You cannot access this business.");
  }
}

async function businessNameFor(businessId) {
  const result = await query(
    `select id, name, ${BUSINESS_CARD_SETTINGS_SQL} as settings
     from businesses b
     where id = $1`,
    [businessId]
  );
  return result.rows[0] || null;
}

function affiliateDigitalCardUrl(token) {
  const base = String(env.publicAppUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/carnet-afiliado/${encodeURIComponent(token || "")}`;
}

async function attachQrDataUrl(affiliate) {
  const digitalCardUrl = affiliateDigitalCardUrl(affiliate.qr_token || "");
  return {
    ...affiliate,
    digital_card_url: digitalCardUrl,
    qr_data_url: await QRCode.toDataURL(digitalCardUrl, {
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
       ${BUSINESS_CARD_SETTINGS_SQL} as business_settings,
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
    business_settings: business.settings || {},
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
       ${BUSINESS_CARD_SETTINGS_SQL} as business_settings,
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

async function getPublicAffiliateCard(token) {
  const value = String(token || "").trim();
  if (!value) {
    throw notFound("Affiliate card not found.");
  }
  const result = await query(
    `select
       a.id,
       a.business_id,
       a.full_name,
       a.document_id,
       a.phone,
       a.email,
       a.photo_data_url,
       a.qr_token,
       a.status,
       a.created_at,
       a.updated_at,
       b.name as business_name,
       ${BUSINESS_CARD_SETTINGS_SQL} as business_settings,
       coalesce((select sum(l.points_awarded)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as ledger_points,
       coalesce((select count(*)::int from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as point_events,
       coalesce((select sum(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as purchase_total,
       coalesce((select avg(l.amount)::numeric from affiliate_point_ledger l where l.affiliate_id = a.id), 0) as average_purchase,
       (select max(l.created_at) from affiliate_point_ledger l where l.affiliate_id = a.id) as last_purchase_at
     from affiliates a
     join businesses b on b.id = a.business_id
     where a.qr_token = $1
       and a.status <> 'DELETED'
     limit 1`,
    [value]
  );
  const affiliate = result.rows[0];
  if (!affiliate) {
    throw notFound("Affiliate card not found.");
  }
  const ledger = await query(
    `select id, points_awarded, reason, created_at
     from affiliate_point_ledger
     where affiliate_id = $1
     order by created_at desc
     limit 20`,
    [affiliate.id]
  );
  return {
    affiliate: await attachQrDataUrl(affiliate),
    ledger: ledger.rows,
  };
}

async function awardAffiliatePoints(businessId, affiliateId, user, body) {
  ensureBusinessAccess(user, businessId);
  const amount = Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw badRequest("El monto debe ser mayor a 0.");
  }

  const pointRules = await getAffiliatePointRules(businessId);
  const points = affiliatePointsForAmount(amount, pointRules);
  if (points < 1) {
    return {
      awarded: 0,
      message: `El monto no genera puntos porque es menor a ${pointRules.point_amount_cop.toLocaleString("es-CO")} pesos.`,
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
        {
          ...(body.metadata || {}),
          ...affiliatePointRuleMetadata(pointRules),
        },
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

async function assertCampaignOwnership(businessId, campaignId) {
  const result = await query(
    "select id, name from campaigns where id = $1 and business_id = $2",
    [campaignId, businessId]
  );
  const campaign = result.rows[0];
  if (!campaign) throw notFound("Campaign not found.");
  return campaign;
}

async function listCampaignAffiliates(businessId, campaignId, user) {
  ensureBusinessAccess(user, businessId);
  await assertCampaignOwnership(businessId, campaignId);
  const result = await query(
    `select
       ca.*,
       a.full_name,
       a.document_id,
       a.phone,
       a.email,
       a.qr_token,
       a.status as affiliate_status,
       u.full_name as assigned_by_name,
       coalesce(q.generated_count, 0)::int as referral_tickets_generated,
       coalesce(q.redeemed_count, 0)::int as referral_tickets_redeemed,
       coalesce(s.sales_count, 0)::int as referral_sales_count,
       coalesce(s.revenue, 0)::numeric as referral_revenue,
       coalesce(s.points_awarded, 0)::int as referral_points_awarded,
       coalesce(l.ledger_points, 0)::int as ledger_points
     from campaign_affiliates ca
     join affiliates a on a.id = ca.affiliate_id and a.business_id = ca.business_id
     left join app_users u on u.id = ca.assigned_by_user_id
     left join lateral (
       select count(*)::int as generated_count,
              count(*) filter (where q.status = 'REDEEMED' or q.redeemed_at is not null)::int as redeemed_count
       from qr_codes q
       where q.business_id = ca.business_id
         and q.campaign_id = ca.campaign_id
         and q.affiliate_id = ca.affiliate_id
     ) q on true
     left join lateral (
       select count(*)::int as sales_count,
              coalesce(sum(bs.sale_amount), 0)::numeric as revenue,
              coalesce(sum(bs.referral_points_awarded), 0)::int as points_awarded
       from business_sales bs
       left join qr_codes qrs on qrs.id = bs.qr_code_id
       where bs.business_id = ca.business_id
         and coalesce(bs.campaign_id, qrs.campaign_id) = ca.campaign_id
         and coalesce(bs.referred_affiliate_id, qrs.affiliate_id) = ca.affiliate_id
     ) s on true
     left join lateral (
       select coalesce(sum(points_awarded), 0)::int as ledger_points
       from affiliate_point_ledger l
       where l.business_id = ca.business_id and l.affiliate_id = ca.affiliate_id
     ) l on true
     where ca.business_id = $1 and ca.campaign_id = $2
     order by ca.created_at desc`,
    [businessId, campaignId]
  );
  return result.rows;
}

async function assignAffiliateToCampaign(businessId, campaignId, affiliateId, user, body = {}) {
  ensureBusinessAccess(user, businessId);
  await assertCampaignOwnership(businessId, campaignId);
  const affiliate = await query(
    "select id from affiliates where id = $1 and business_id = $2 and status <> 'DELETED'",
    [affiliateId, businessId]
  );
  if (!affiliate.rowCount) throw notFound("Affiliate not found.");
  const result = await query(
    `insert into campaign_affiliates
      (business_id, campaign_id, affiliate_id, assigned_by_user_id, role, status, notes, metadata)
     values ($1, $2, $3, $4, $5, 'ACTIVE', $6, $7::jsonb)
     on conflict (business_id, campaign_id, affiliate_id)
     do update set status = 'ACTIVE',
                   role = excluded.role,
                   notes = excluded.notes,
                   assigned_by_user_id = excluded.assigned_by_user_id,
                   metadata = campaign_affiliates.metadata || excluded.metadata,
                   updated_at = now()
     returning *`,
    [
      businessId,
      campaignId,
      affiliateId,
      user?.id || null,
      body.role || "REFERER",
      body.notes || null,
      JSON.stringify(body.metadata || {}),
    ]
  );
  return result.rows[0];
}

async function removeAffiliateFromCampaign(businessId, campaignId, affiliateId, user) {
  ensureBusinessAccess(user, businessId);
  await assertCampaignOwnership(businessId, campaignId);
  const result = await query(
    `delete from campaign_affiliates
     where business_id = $1 and campaign_id = $2 and affiliate_id = $3
     returning id`,
    [businessId, campaignId, affiliateId]
  );
  if (!result.rowCount) throw notFound("Campaign affiliate not found.");
  return { removed: true, affiliate_id: affiliateId, campaign_id: campaignId };
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
  assignAffiliateToCampaign,
  affiliateDigitalCardUrl,
  createAffiliate,
  deleteAffiliate,
  getAffiliate,
  getPublicAffiliateCard,
  listCampaignAffiliates,
  listAffiliates,
  listAffiliateLedger,
  removeAffiliateFromCampaign,
  awardAffiliatePoints,
};

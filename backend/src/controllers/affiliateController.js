const { z } = require("zod");
const {
  createAffiliate,
  deleteAffiliate,
  getAffiliate,
  listAffiliates,
  listAffiliateLedger,
  awardAffiliatePoints,
} = require("../services/affiliateService");
const { validate } = require("../utils/validators");
const { query } = require("../config/db");
const {
  assertFeatureForRequest,
  assertLimitForBusiness,
} = require("../services/subscriptionService");

const createAffiliateSchema = z.object({
  full_name: z.string().trim().min(2).max(140),
  document_id: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  photo_data_url: z.string().trim().min(20).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  card_metadata: z.record(z.any()).optional().nullable(),
});

const awardPointsSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().trim().max(80).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

async function listBusinessAffiliates(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const affiliates = await listAffiliates(req.params.id, req.user);
    res.json({ affiliates });
  } catch (error) {
    next(error);
  }
}

async function createBusinessAffiliate(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const count = await query(
      "select count(*)::int as total from affiliates where business_id = $1 and status <> 'DELETED'",
      [req.params.id]
    );
    await assertLimitForBusiness(req.params.id, "affiliates", Number(count.rows[0]?.total || 0), "afiliados");
    const body = validate(createAffiliateSchema, req.body);
    const affiliate = await createAffiliate(req.params.id, req.user, body);
    res.status(201).json({ affiliate });
  } catch (error) {
    next(error);
  }
}

async function getBusinessAffiliate(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const affiliate = await getAffiliate(req.params.id, req.params.affiliateId, req.user);
    const ledger = await listAffiliateLedger(req.params.id, req.params.affiliateId, req.user);
    res.json({ affiliate, ledger });
  } catch (error) {
    next(error);
  }
}

async function awardBusinessAffiliatePoints(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const body = validate(awardPointsSchema, req.body);
    const result = await awardAffiliatePoints(req.params.id, req.params.affiliateId, req.user, body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteBusinessAffiliate(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const affiliate = await deleteAffiliate(req.params.id, req.params.affiliateId, req.user);
    res.json({ ok: true, affiliate });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listBusinessAffiliates,
  createBusinessAffiliate,
  getBusinessAffiliate,
  awardBusinessAffiliatePoints,
  deleteBusinessAffiliate,
};

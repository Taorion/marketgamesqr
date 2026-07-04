const { z } = require("zod");
const {
  assignAffiliateToCampaign,
  createAffiliate,
  deleteAffiliate,
  getAffiliate,
  listAffiliates,
  listCampaignAffiliates,
  listAffiliateLedger,
  awardAffiliatePoints,
  getPublicAffiliateCard,
  removeAffiliateFromCampaign,
} = require("../services/affiliateService");
const { validate } = require("../utils/validators");
const { query } = require("../config/db");
const { getAffiliatePointRules } = require("../services/affiliatePointRulesService");
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

const campaignAffiliateSchema = z.object({
  affiliate_id: z.string().uuid(),
  role: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

async function listBusinessAffiliates(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const [affiliates, point_rules] = await Promise.all([
      listAffiliates(req.params.id, req.user),
      getAffiliatePointRules(req.params.id),
    ]);
    res.json({ affiliates, point_rules });
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

async function listBusinessCampaignAffiliates(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const affiliates = await listCampaignAffiliates(req.params.id, req.params.campaignId, req.user);
    res.json({ affiliates });
  } catch (error) {
    next(error);
  }
}

async function assignBusinessCampaignAffiliate(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const body = validate(campaignAffiliateSchema, req.body);
    const assignment = await assignAffiliateToCampaign(req.params.id, req.params.campaignId, body.affiliate_id, req.user, body);
    const affiliates = await listCampaignAffiliates(req.params.id, req.params.campaignId, req.user);
    res.status(201).json({ assignment, affiliates });
  } catch (error) {
    next(error);
  }
}

async function removeBusinessCampaignAffiliate(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const result = await removeAffiliateFromCampaign(req.params.id, req.params.campaignId, req.params.affiliateId, req.user);
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

async function getPublicAffiliateDigitalCard(req, res, next) {
  try {
    const result = await getPublicAffiliateCard(req.params.token);
    res.json({
      ok: true,
      ...result,
      server_time: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  assignBusinessCampaignAffiliate,
  listBusinessAffiliates,
  listBusinessCampaignAffiliates,
  createBusinessAffiliate,
  getBusinessAffiliate,
  awardBusinessAffiliatePoints,
  deleteBusinessAffiliate,
  removeBusinessCampaignAffiliate,
  getPublicAffiliateDigitalCard,
};

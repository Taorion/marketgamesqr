const { z } = require("zod");
const {
  assignAffiliateToCampaign,
  archiveAffiliateRewardRule,
  createAffiliate,
  createAffiliateRewardRule,
  createAffiliateRewardTicket,
  deleteAffiliate,
  getAffiliate,
  listAffiliates,
  listAffiliateRewardRules,
  listAffiliateRewardUnlocks,
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
  amount: z.number().positive().optional(),
  points_awarded: z.number().int().positive().optional(),
  reason: z.string().trim().max(80).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
}).refine((body) => body.amount || body.points_awarded, {
  message: "Debes enviar un monto o puntos manuales.",
});

const campaignAffiliateSchema = z.object({
  affiliate_id: z.string().uuid(),
  role: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

const affiliateRewardRuleSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(800).optional().nullable(),
  required_points: z.number().int().positive(),
  benefit_type: z.enum([
    "PERCENT_DISCOUNT",
    "FIXED_AMOUNT_DISCOUNT",
    "FREE_GIFT",
    "FREE_SAMPLE",
    "UPGRADE",
    "VIP_ACCESS",
    "RAFFLE_ENTRY",
    "BUY_X_GET_Y",
    "CUSTOM",
  ]).default("CUSTOM"),
  benefit_label: z.string().trim().min(2).max(180),
  benefit_value: z.record(z.any()).optional().default({}),
  campaign_id: z.string().uuid().optional().nullable(),
  reward_id: z.string().uuid().optional().nullable(),
  expiration_days: z.number().int().positive().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

const affiliateRewardTicketSchema = z.object({
  reward_rule_id: z.string().uuid(),
});

async function listBusinessAffiliates(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const [affiliates, point_rules, reward_rules] = await Promise.all([
      listAffiliates(req.params.id, req.user),
      getAffiliatePointRules(req.params.id),
      listAffiliateRewardRules(req.params.id, req.user),
    ]);
    res.json({ affiliates, point_rules, reward_rules });
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
    const [affiliate, ledger, reward_unlocks] = await Promise.all([
      getAffiliate(req.params.id, req.params.affiliateId, req.user),
      listAffiliateLedger(req.params.id, req.params.affiliateId, req.user),
      listAffiliateRewardUnlocks(req.params.id, req.params.affiliateId, req.user),
    ]);
    res.json({ affiliate, ledger, reward_unlocks });
  } catch (error) {
    next(error);
  }
}

async function listBusinessAffiliateRewardRules(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const reward_rules = await listAffiliateRewardRules(req.params.id, req.user, {
      includeArchived: String(req.query.include_archived || "") === "true",
    });
    res.json({ reward_rules });
  } catch (error) {
    next(error);
  }
}

async function createBusinessAffiliateRewardRule(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const body = validate(affiliateRewardRuleSchema, req.body);
    const reward_rule = await createAffiliateRewardRule(req.params.id, req.user, body);
    res.status(201).json({ reward_rule });
  } catch (error) {
    next(error);
  }
}

async function archiveBusinessAffiliateRewardRule(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const reward_rule = await archiveAffiliateRewardRule(req.params.id, req.params.ruleId, req.user);
    res.json({ reward_rule });
  } catch (error) {
    next(error);
  }
}

async function createBusinessAffiliateRewardTicket(req, res, next) {
  try {
    await assertFeatureForRequest(req, req.params.id, "affiliates");
    const body = validate(affiliateRewardTicketSchema, req.body);
    const result = await createAffiliateRewardTicket(req.params.id, req.params.affiliateId, req.user, body);
    res.status(result.existing ? 200 : 201).json(result);
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
  archiveBusinessAffiliateRewardRule,
  createBusinessAffiliateRewardRule,
  createBusinessAffiliateRewardTicket,
  listBusinessAffiliates,
  listBusinessAffiliateRewardRules,
  listBusinessCampaignAffiliates,
  createBusinessAffiliate,
  getBusinessAffiliate,
  awardBusinessAffiliatePoints,
  deleteBusinessAffiliate,
  removeBusinessCampaignAffiliate,
  getPublicAffiliateDigitalCard,
};

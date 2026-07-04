const express = require("express");
const { authRequired } = require("../middleware/auth");
const {
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
} = require("../controllers/affiliateController");

const router = express.Router();

router.use(authRequired);
router.get("/businesses/:id/affiliates", listBusinessAffiliates);
router.post("/businesses/:id/affiliates", createBusinessAffiliate);
router.get("/businesses/:id/affiliate-rewards", listBusinessAffiliateRewardRules);
router.post("/businesses/:id/affiliate-rewards", createBusinessAffiliateRewardRule);
router.delete("/businesses/:id/affiliate-rewards/:ruleId", archiveBusinessAffiliateRewardRule);
router.get("/businesses/:id/campaigns/:campaignId/affiliates", listBusinessCampaignAffiliates);
router.post("/businesses/:id/campaigns/:campaignId/affiliates", assignBusinessCampaignAffiliate);
router.delete("/businesses/:id/campaigns/:campaignId/affiliates/:affiliateId", removeBusinessCampaignAffiliate);
router.get("/businesses/:id/affiliates/:affiliateId", getBusinessAffiliate);
router.post("/businesses/:id/affiliates/:affiliateId/points", awardBusinessAffiliatePoints);
router.post("/businesses/:id/affiliates/:affiliateId/reward-tickets", createBusinessAffiliateRewardTicket);
router.delete("/businesses/:id/affiliates/:affiliateId", deleteBusinessAffiliate);

module.exports = router;

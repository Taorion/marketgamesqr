const express = require("express");
const {
  listCampaigns,
  createCampaign,
  listRewards,
  listLeads,
  listAnswers,
} = require("../controllers/portalController");
const { authRequired } = require("../middleware/auth");
const { requireBusinessFeature } = require("../middleware/subscription");

const router = express.Router();

router.use(authRequired);
router.use("/businesses/:id", requireBusinessFeature("portal_access", (req) => req.params.id));
router.get("/businesses/:id/campaigns", listCampaigns);
router.post("/businesses/:id/campaigns", createCampaign);
router.get("/businesses/:id/rewards", listRewards);
router.get("/businesses/:id/leads", requireBusinessFeature("leads_view", (req) => req.params.id), listLeads);
router.get("/businesses/:id/answers", requireBusinessFeature("leads_view", (req) => req.params.id), listAnswers);

module.exports = router;

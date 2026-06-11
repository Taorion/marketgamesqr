const express = require("express");
const { authRequired } = require("../middleware/auth");
const {
  listBusinessAffiliates,
  createBusinessAffiliate,
  getBusinessAffiliate,
  awardBusinessAffiliatePoints,
  deleteBusinessAffiliate,
} = require("../controllers/affiliateController");

const router = express.Router();

router.use(authRequired);
router.get("/businesses/:id/affiliates", listBusinessAffiliates);
router.post("/businesses/:id/affiliates", createBusinessAffiliate);
router.get("/businesses/:id/affiliates/:affiliateId", getBusinessAffiliate);
router.post("/businesses/:id/affiliates/:affiliateId/points", awardBusinessAffiliatePoints);
router.delete("/businesses/:id/affiliates/:affiliateId", deleteBusinessAffiliate);

module.exports = router;

const express = require("express");
const {
  createMotoRewardQr,
  createDemoQr,
  createProductPreferenceQr,
  createPublicCampaignLeadQr,
} = require("../controllers/publicGameController");

const router = express.Router();

router.post("/moto-pescuezo/qr", createMotoRewardQr);
router.post("/demo/:type/qr", createDemoQr);
router.post("/product-preferences/qr", createProductPreferenceQr);
router.post("/campaigns/:businessSlug/:campaignSlug/lead-qr", createPublicCampaignLeadQr);

module.exports = router;

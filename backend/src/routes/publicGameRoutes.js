const express = require("express");
const {
  createMotoRewardQr,
  createDemoQr,
  createProductPreferenceQr,
  createPublicCampaignLeadQr,
} = require("../controllers/publicGameController");
const {
  publicGetTrivia,
  publicSubmitTrivia,
} = require("../controllers/triviaController");

const router = express.Router();

router.post("/moto-pescuezo/qr", createMotoRewardQr);
router.post("/demo/:type/qr", createDemoQr);
router.post("/product-preferences/qr", createProductPreferenceQr);
router.post("/campaigns/:businessSlug/:campaignSlug/lead-qr", createPublicCampaignLeadQr);
router.get("/trivias/:slug", publicGetTrivia);
router.post("/trivias/:slug/attempts", publicSubmitTrivia);

module.exports = router;

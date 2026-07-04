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
const {
  publicComplete: publicCompleteInteractiveActivation,
  publicGet: publicGetInteractiveActivation,
  publicStart: publicStartInteractiveActivation,
} = require("../controllers/interactiveActivationController");
const {
  publicDownload: publicDownloadLeadCapture,
  publicGet: publicGetLeadCapture,
  publicSubmit: publicSubmitLeadCapture,
} = require("../controllers/leadCaptureController");

const router = express.Router();

router.post("/moto-pescuezo/qr", createMotoRewardQr);
router.post("/demo/:type/qr", createDemoQr);
router.post("/product-preferences/qr", createProductPreferenceQr);
router.post("/campaigns/:businessSlug/:campaignSlug/lead-qr", createPublicCampaignLeadQr);
router.get("/trivias/:slug", publicGetTrivia);
router.post("/trivias/:slug/attempts", publicSubmitTrivia);
router.get("/activations/:slug", publicGetInteractiveActivation);
router.post("/activations/:slug/participants", publicStartInteractiveActivation);
router.post("/activations/:slug/complete", publicCompleteInteractiveActivation);
router.get("/lead-captures/:token", publicGetLeadCapture);
router.post("/lead-captures/:token/submissions", publicSubmitLeadCapture);
router.get("/lead-captures/download/:downloadToken", publicDownloadLeadCapture);

module.exports = router;

const express = require("express");
const { cacheBusinessResponse } = require("../middleware/businessResponseCache");
const { rateLimit } = require("../middleware/rateLimit");
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

const publicReadLimit = rateLimit({ keyPrefix: "public-game-read", max: 240, windowMs: 15 * 60_000 });
const publicActionLimit = rateLimit({ keyPrefix: "public-game-action", max: 60, windowMs: 15 * 60_000 });
const publicDownloadLimit = rateLimit({ keyPrefix: "public-game-download", max: 30, windowMs: 15 * 60_000 });
const publicReadCache = cacheBusinessResponse({
  keyPrefix: "public-game",
  ttlMs: 120_000,
  maxBytes: 512 * 1024,
  businessIdFromReq: () => "public",
});

router.post("/moto-pescuezo/qr", publicActionLimit, createMotoRewardQr);
router.post("/demo/:type/qr", publicActionLimit, createDemoQr);
router.post("/product-preferences/qr", publicActionLimit, createProductPreferenceQr);
router.post("/campaigns/:businessSlug/:campaignSlug/lead-qr", publicActionLimit, createPublicCampaignLeadQr);
router.get("/trivias/:slug", publicReadLimit, publicReadCache, publicGetTrivia);
router.post("/trivias/:slug/attempts", publicActionLimit, publicSubmitTrivia);
router.get("/activations/:slug", publicReadLimit, publicReadCache, publicGetInteractiveActivation);
router.post("/activations/:slug/participants", publicActionLimit, publicStartInteractiveActivation);
router.post("/activations/:slug/complete", publicActionLimit, publicCompleteInteractiveActivation);
router.get("/lead-captures/:token", publicReadLimit, publicReadCache, publicGetLeadCapture);
router.post("/lead-captures/:token/submissions", publicActionLimit, publicSubmitLeadCapture);
router.get("/lead-captures/download/:downloadToken", publicDownloadLimit, publicDownloadLeadCapture);

module.exports = router;

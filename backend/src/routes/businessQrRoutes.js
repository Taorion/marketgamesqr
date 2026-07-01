const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  createTrivia,
  listTrivias,
} = require("../controllers/triviaController");
const {
  createPostSale,
  createBatch,
  createAffiliateReferralBatch,
  listBatches,
  batchDetail,
  qrHistory,
  qrMetrics,
  downloadQr,
  downloadBatchCsv,
  downloadBatch,
} = require("../controllers/businessQrController");

const router = express.Router();

router.use(authRequired);
router.use(requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"));

router.post("/generic-ticket", createPostSale);
router.post("/post-sale", createPostSale);
router.post("/trivias", createTrivia);
router.get("/trivias", listTrivias);
router.post("/batches", createBatch);
router.post("/affiliates/referral-batches", createAffiliateReferralBatch);
router.get("/batches", listBatches);
router.get("/batches/:id", batchDetail);
router.get("/batches/:id/download.csv", downloadBatchCsv);
router.get("/batches/:id/download", downloadBatch);
router.get("/history", qrHistory);
router.get("/metrics", qrMetrics);
router.get("/:id/download", downloadQr);

module.exports = router;

const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  cacheBusinessResponse,
  invalidateBusinessResponseCache,
} = require("../middleware/businessResponseCache");
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
  deleteBatch,
  deleteQr,
  qrMetrics,
  downloadQr,
  downloadBatchCsv,
  downloadBatch,
} = require("../controllers/businessQrController");

const router = express.Router();

router.use(authRequired);
router.use(requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"));
router.use(invalidateBusinessResponseCache());

const qrReadCache = cacheBusinessResponse({ keyPrefix: "business-qr", ttlMs: 180_000 });

router.post("/generic-ticket", createPostSale);
router.post("/post-sale", createPostSale);
router.post("/trivias", createTrivia);
router.get("/trivias", qrReadCache, listTrivias);
router.post("/batches", createBatch);
router.post("/affiliates/referral-batches", createAffiliateReferralBatch);
router.get("/batches", qrReadCache, listBatches);
router.get("/batches/:id", qrReadCache, batchDetail);
router.get("/batches/:id/download.csv", downloadBatchCsv);
router.get("/batches/:id/download", downloadBatch);
router.delete("/batches/:id", deleteBatch);
router.get("/history", qrReadCache, qrHistory);
router.delete("/history/:id", deleteQr);
router.get("/metrics", qrReadCache, qrMetrics);
router.get("/:id/download", downloadQr);

module.exports = router;

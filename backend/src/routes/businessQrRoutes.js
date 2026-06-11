const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  createPostSale,
  createBatch,
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
router.use(requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"));

router.post("/post-sale", createPostSale);
router.post("/batches", createBatch);
router.get("/batches", listBatches);
router.get("/batches/:id", batchDetail);
router.get("/batches/:id/download.csv", downloadBatchCsv);
router.get("/batches/:id/download", downloadBatch);
router.get("/history", qrHistory);
router.get("/metrics", qrMetrics);
router.get("/:id/download", downloadQr);

module.exports = router;

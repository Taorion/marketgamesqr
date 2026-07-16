const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  cacheBusinessResponse,
  invalidateBusinessResponseCache,
} = require("../middleware/businessResponseCache");
const {
  create,
  detail,
  exportCsv,
  list,
  patchContent,
  patchStatus,
} = require("../controllers/leadCaptureController");

const router = express.Router();

router.use(authRequired);
router.use(requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"));
router.use(invalidateBusinessResponseCache());

const leadCaptureCache = cacheBusinessResponse({ keyPrefix: "lead-captures", ttlMs: 180_000 });

router.get("/", leadCaptureCache, list);
router.post("/", create);
router.get("/:id", leadCaptureCache, detail);
router.patch("/:id/content", patchContent);
router.patch("/:id/status", patchStatus);
router.get("/:id/export.csv", exportCsv);

module.exports = router;

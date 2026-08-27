const express = require("express");
const { authRequired } = require("../middleware/auth");
const {
  cacheBusinessResponse,
  invalidateBusinessResponseCache,
} = require("../middleware/businessResponseCache");
const { requirePortalAccess, requireBusinessFeature } = require("../middleware/subscription");
const {
  acquisitionReceipt,
  cancel,
  create,
  downloadPdf,
  extend,
  get,
  list,
  metrics,
  redeemToken,
  rewardPassContext,
  validateToken,
} = require("../controllers/rewardPassController");

const router = express.Router();
const requireGiftCards = requireBusinessFeature("gift_cards");

router.use(authRequired);
router.use(invalidateBusinessResponseCache());

const rewardPassCache = cacheBusinessResponse({ keyPrefix: "reward-passes", ttlMs: 180_000 });

router.get("/context", requirePortalAccess, requireGiftCards, rewardPassCache, rewardPassContext);
router.get("/", requirePortalAccess, requireGiftCards, rewardPassCache, list);
router.get("/metrics", requirePortalAccess, requireGiftCards, rewardPassCache, metrics);
router.post("/", requirePortalAccess, requireGiftCards, create);
router.get("/validator/:token", validateToken);
router.post("/validator/:token/redeem", redeemToken);
router.get("/:id", requirePortalAccess, requireGiftCards, rewardPassCache, get);
router.get("/:id/pdf", requirePortalAccess, requireGiftCards, downloadPdf);
router.get("/:id/acquisition-receipt.pdf", requirePortalAccess, requireGiftCards, acquisitionReceipt);
router.post("/:id/cancel", requirePortalAccess, requireGiftCards, cancel);
router.post("/:id/extend", requirePortalAccess, requireGiftCards, extend);

module.exports = router;

const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requirePortalAccess } = require("../middleware/subscription");
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

router.use(authRequired);
router.get("/context", rewardPassContext);
router.get("/", requirePortalAccess, list);
router.get("/metrics", requirePortalAccess, metrics);
router.post("/", requirePortalAccess, create);
router.get("/validator/:token", validateToken);
router.post("/validator/:token/redeem", redeemToken);
router.get("/:id", requirePortalAccess, get);
router.get("/:id/pdf", requirePortalAccess, downloadPdf);
router.get("/:id/acquisition-receipt.pdf", requirePortalAccess, acquisitionReceipt);
router.post("/:id/cancel", requirePortalAccess, cancel);
router.post("/:id/extend", requirePortalAccess, extend);

module.exports = router;

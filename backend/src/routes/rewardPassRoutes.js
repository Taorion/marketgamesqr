const express = require("express");
const { authRequired } = require("../middleware/auth");
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
const requirePrizeProgram = requireBusinessFeature("prize_program");

router.use(authRequired);
router.get("/context", requirePrizeProgram, rewardPassContext);
router.get("/", requirePortalAccess, requirePrizeProgram, list);
router.get("/metrics", requirePortalAccess, requirePrizeProgram, metrics);
router.post("/", requirePortalAccess, requirePrizeProgram, create);
router.get("/validator/:token", validateToken);
router.post("/validator/:token/redeem", redeemToken);
router.get("/:id", requirePortalAccess, requirePrizeProgram, get);
router.get("/:id/pdf", requirePortalAccess, requirePrizeProgram, downloadPdf);
router.get("/:id/acquisition-receipt.pdf", requirePortalAccess, requirePrizeProgram, acquisitionReceipt);
router.post("/:id/cancel", requirePortalAccess, requirePrizeProgram, cancel);
router.post("/:id/extend", requirePortalAccess, requirePrizeProgram, extend);

module.exports = router;

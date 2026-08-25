const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  cacheBusinessResponse,
  invalidateBusinessResponseCache,
} = require("../middleware/businessResponseCache");
const {
  catalog,
  create,
  list,
  participants,
  remove,
  recycle,
  report,
  rewards,
  update,
} = require("../controllers/interactiveActivationController");

const router = express.Router();

router.use(authRequired);
router.use(requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"));
router.use(invalidateBusinessResponseCache());

const activationCache = cacheBusinessResponse({ keyPrefix: "interactive-activations", ttlMs: 180_000 });

router.get("/catalog", activationCache, catalog);
router.post("/", create);
router.get("/", activationCache, list);
router.patch("/:id", update);
router.delete("/:id", remove);
router.post("/:id/recycle", recycle);
router.get("/:id/participants", activationCache, participants);
router.get("/:id/rewards", activationCache, rewards);
// The operator history must reflect public participation immediately; do not
// serve a cached snapshot after a lead completes an activation.
router.get("/:id/report", report);

module.exports = router;

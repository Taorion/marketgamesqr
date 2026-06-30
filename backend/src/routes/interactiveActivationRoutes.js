const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
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

router.get("/catalog", catalog);
router.post("/", create);
router.get("/", list);
router.patch("/:id", update);
router.delete("/:id", remove);
router.post("/:id/recycle", recycle);
router.get("/:id/participants", participants);
router.get("/:id/rewards", rewards);
router.get("/:id/report", report);

module.exports = router;

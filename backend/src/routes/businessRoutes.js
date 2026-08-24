const express = require("express");
const { businessRedemptions, validatorHistory } = require("../controllers/businessController");
const { authRequired, requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/:id/redemptions", authRequired, businessRedemptions);
router.get(
  "/:id/validator-history",
  authRequired,
  requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "VALIDATOR", "ADMIN", "ADMIN_MARKET_GAMES", "ADMIN_Qori"),
  validatorHistory
);

module.exports = router;

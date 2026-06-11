const express = require("express");
const { businessDashboard } = require("../controllers/dashboardController");
const { authRequired } = require("../middleware/auth");
const { requireBusinessFeature } = require("../middleware/subscription");

const router = express.Router();

router.get(
  "/businesses/:id",
  authRequired,
  requireBusinessFeature("portal_access", (req) => req.params.id),
  businessDashboard
);

module.exports = router;

const express = require("express");
const { businessDashboard } = require("../controllers/dashboardController");
const { authRequired } = require("../middleware/auth");
const { cacheBusinessResponse } = require("../middleware/businessResponseCache");
const { requireBusinessFeature } = require("../middleware/subscription");

const router = express.Router();

router.get(
  "/businesses/:id",
  authRequired,
  requireBusinessFeature("portal_access", (req) => req.params.id),
  cacheBusinessResponse({
    keyPrefix: "dashboard",
    ttlMs: 300_000,
    maxBytes: 1024 * 1024,
    businessIdFromReq: (req) => req.params.id,
  }),
  businessDashboard
);

module.exports = router;

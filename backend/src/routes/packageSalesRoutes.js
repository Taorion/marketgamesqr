const express = require("express");
const {
  listPackageOffers,
  listPublicSubscriptionPlans,
  createPackageRequest,
  createPrepaidSignup,
  createPortalSignup,
} = require("../controllers/packageSalesController");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/packages", listPackageOffers);
router.get("/subscription-plans", listPublicSubscriptionPlans);
router.post("/packages/requests", rateLimit({ keyPrefix: "package-request", max: 10, windowMs: 15 * 60_000 }), createPackageRequest);
router.post("/signup/prepaid", rateLimit({ keyPrefix: "signup-prepaid", max: 6, windowMs: 15 * 60_000 }), createPrepaidSignup);
router.post("/signup/portal", rateLimit({ keyPrefix: "signup-portal", max: 6, windowMs: 15 * 60_000 }), createPortalSignup);

module.exports = router;

const express = require("express");
const {
  listPackageOffers,
  listPublicSubscriptionPlans,
  createPackageRequest,
  createPrepaidSignup,
  createPortalSignup,
} = require("../controllers/packageSalesController");
const { rateLimit, emailRateLimit } = require("../middleware/rateLimit");
const { listPublicSalesAdvisors } = require("../controllers/sellerController");

const router = express.Router();

router.get("/packages", listPackageOffers);
router.get("/subscription-plans", listPublicSubscriptionPlans);
router.get("/commercial-advisors/:id", rateLimit({ keyPrefix: "public-commercial-advisors", max: 30, windowMs: 15 * 60_000 }), async (req,res,next) => {
  try { res.set("Cache-Control","no-store").json({advisor:await require("../services/commercialAdvisorService").advisorById(req.params.id)}); } catch(error) { next(error); }
});
router.get("/sales-advisors", rateLimit({ keyPrefix: "public-sales-advisors", max: 30, windowMs: 15 * 60_000 }), listPublicSalesAdvisors);
router.post("/packages/requests", rateLimit({ keyPrefix: "package-request", max: 10, windowMs: 15 * 60_000 }), createPackageRequest);
router.post("/signup/ticket-base", rateLimit({ keyPrefix: "signup-ticket-base", max: 6, windowMs: 15 * 60_000 }), createPrepaidSignup);
router.post("/signup/prepaid", rateLimit({ keyPrefix: "signup-prepaid", max: 6, windowMs: 15 * 60_000 }), createPrepaidSignup);
router.post("/signup/portal", rateLimit({ keyPrefix: "signup-portal", max: 6, windowMs: 15 * 60_000 }), createPortalSignup);
router.post('/signup/portal/recover',rateLimit({keyPrefix:'signup-portal-recover',max:6,windowMs:15*60_000}),emailRateLimit({keyPrefix:'signup-recover-email',max:8,windowMs:15*60_000}),async(req,res,next)=>{
  res.set('Cache-Control','private, no-store');
  try{res.json(await require('../services/signupRecoveryService').recover(req.body));}catch(error){next(error);}
});

module.exports = router;

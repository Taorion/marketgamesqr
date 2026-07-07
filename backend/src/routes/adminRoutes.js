const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth");
const {
  createBusiness,
  createAgreementClient,
  createCampaign,
  patchCampaign,
  markCampaignReady,
  listBusinesses,
  listSubscriptionPlans,
  updateBusinessSubscription,
  listCampaigns,
  businessSummary,
  campaignReport,
  addBusinessCredits,
  businessCredits,
  createUser,
  patchUser,
  listUsers,
} = require("../controllers/adminController");
const {
  listPackageRequests,
  patchPackageRequest,
} = require("../controllers/packageSalesController");

const router = express.Router();

router.use(authRequired);
router.use(requireRoles("ADMIN", "ADMIN_MARKET_GAMES"));
router.get("/subscription-plans", listSubscriptionPlans);
router.get("/businesses", listBusinesses);
router.post("/businesses", createBusiness);
router.post("/agreement-clients", createAgreementClient);
router.patch("/businesses/:id/subscription", updateBusinessSubscription);
router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:id", patchUser);
router.get("/package-requests", listPackageRequests);
router.patch("/package-requests/:id", patchPackageRequest);
router.get("/businesses/:id/credits", businessCredits);
router.post("/businesses/:id/credits", addBusinessCredits);
router.post("/campaigns", createCampaign);
router.patch("/campaigns/:id", patchCampaign);
router.post("/campaigns/:id/mark-ready", markCampaignReady);
router.get("/campaigns", listCampaigns);
router.get("/campaigns/:id/report", campaignReport);
router.get("/businesses/:id/summary", businessSummary);

module.exports = router;

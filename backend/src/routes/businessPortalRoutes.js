const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requirePortalAccess } = require("../middleware/subscription");
const {
  getBusinessProfile,
  updateBusinessProfile,
  listCampaigns,
  getCampaign,
  patchClientSetup,
  confirmLaunch,
  campaignReport,
  campaignLeads,
  exportCampaignLeads,
  downloadActiveLeadQr,
  campaignRedemptions,
  campaignSales,
  createSalesSnapshot,
  updateSalesSnapshot,
} = require("../controllers/businessPortalController");

const router = express.Router();

router.use(authRequired);
router.use(requirePortalAccess);
router.get("/profile", getBusinessProfile);
router.patch("/profile", updateBusinessProfile);
router.get("/campaigns", listCampaigns);
router.get("/campaigns/:id", getCampaign);
router.patch("/campaigns/:id/client-setup", patchClientSetup);
router.post("/campaigns/:id/confirm-launch", confirmLaunch);
router.get("/campaigns/:id/report", campaignReport);
router.get("/campaigns/:id/leads", campaignLeads);
router.get("/campaigns/:id/leads/export.csv", exportCampaignLeads);
router.get("/campaigns/:id/leads/:qrId/active-qr", downloadActiveLeadQr);
router.get("/campaigns/:id/redemptions", campaignRedemptions);
router.get("/campaigns/:id/sales", campaignSales);
router.post("/campaigns/:id/sales-snapshot", createSalesSnapshot);
router.patch("/campaigns/:id/sales-snapshots/:snapshotId", updateSalesSnapshot);

module.exports = router;

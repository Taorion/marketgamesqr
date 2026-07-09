const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requirePortalAccess } = require("../middleware/subscription");
const {
  businessAccess,
  ticketBalance,
  ticketTransactions,
  getBusinessProfile,
  commandCenterAnalytics,
  businessActivity,
  updateBusinessProfile,
  listBusinessUsers,
  createBusinessUser,
  updateBusinessUser,
  createCustomerAcquisitionSale,
  archiveInventoryProduct,
  createInventoryProduct,
  listInventoryProducts,
  updateInventoryProduct,
  listCampaigns,
  createCampaign,
  updateCampaign,
  getCampaign,
  patchClientSetup,
  confirmLaunch,
  campaignReport,
  campaignLeads,
  listManualLeads,
  createManualLead,
  createManualLeadFromExistingLead,
  updateManualLead,
  contactFeed,
  exportContactFeed,
  exportCampaignLeads,
  downloadActiveLeadQr,
  downloadLeadQrById,
  campaignRedemptions,
  campaignSales,
  createSalesSnapshot,
  updateSalesSnapshot,
} = require("../controllers/businessPortalController");
const {
  addInterest,
  addPurchase,
  agenda,
  createAgendaItem,
  createNote,
  deleteAgendaItem,
  deleteContact,
  leadDetail,
  listLeadsCrm,
  removeInterest,
  sendActivation,
  updateAgendaItem,
} = require("../controllers/leadCrmController");

const router = express.Router();

router.use(authRequired);

router.get("/access", businessAccess);
router.get("/tickets/balance", ticketBalance);
router.get("/tickets/transactions", ticketTransactions);
router.get("/profile", getBusinessProfile);
router.patch("/profile", updateBusinessProfile);
router.get("/users", listBusinessUsers);
router.post("/users", createBusinessUser);
router.patch("/users/:userId", updateBusinessUser);
router.get("/contacts/feed", contactFeed);
router.get("/contacts/manual", listManualLeads);
router.post("/contacts/manual", createManualLead);
router.post("/contacts/manual/from-lead/:leadId", createManualLeadFromExistingLead);
router.patch("/contacts/manual/:manualLeadId", updateManualLead);
router.get("/contacts/feed/export.csv", exportContactFeed);
router.get("/contacts/feed/:qrId/active-qr", downloadLeadQrById);
router.get("/leads/crm", listLeadsCrm);
router.get("/leads/agenda", agenda);
router.post("/leads/agenda", createAgendaItem);
router.patch("/leads/agenda/:noteId", updateAgendaItem);
router.delete("/leads/agenda/:noteId", deleteAgendaItem);
router.get("/leads/:leadId", leadDetail);
router.delete("/leads/:leadId", deleteContact);
router.post("/leads/:leadId/notes", createNote);
router.post("/leads/:leadId/interests", addInterest);
router.delete("/leads/:leadId/interests/:interestId", removeInterest);
router.post("/leads/:leadId/purchases", addPurchase);
router.post("/leads/:leadId/activations", sendActivation);

router.use(requirePortalAccess);
router.get("/activity", businessActivity);
router.get("/analytics/command-center", commandCenterAnalytics);
router.post("/customer-acquisition-sales", createCustomerAcquisitionSale);
router.get("/inventory/products", listInventoryProducts);
router.post("/inventory/products", createInventoryProduct);
router.patch("/inventory/products/:productId", updateInventoryProduct);
router.delete("/inventory/products/:productId", archiveInventoryProduct);
router.get("/campaigns", listCampaigns);
router.post("/campaigns", createCampaign);
router.get("/campaigns/:id", getCampaign);
router.patch("/campaigns/:id", updateCampaign);
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

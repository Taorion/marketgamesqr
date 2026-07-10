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
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  listCompetitors,
  createCompetitor,
  updateCompetitor,
  archiveCompetitor,
  listCompetitorCampaigns,
  createCompetitorCampaign,
  updateCompetitorCampaign,
  archiveCompetitorCampaign,
  listCompetitorEvents,
  createCompetitorEvent,
  updateCompetitorEvent,
  archiveCompetitorEvent,
  listCompetitorFindings,
  createCompetitorFinding,
  updateCompetitorFinding,
  archiveCompetitorFinding,
  listCompetitorTasks,
  createCompetitorTask,
  updateCompetitorTask,
  archiveCompetitorTask,
  listCompetitorProducts,
  createCompetitorProduct,
  updateCompetitorProduct,
  archiveCompetitorProduct,
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
  assignManualLeadToCampaign,
  removeManualLeadFromCampaign,
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
const {
  createAgendaTask: createRmsAgendaTask,
  dailyQueue: rmsDailyQueue,
  journeys: rmsJourneys,
  metrics: rmsMetrics,
} = require("../controllers/rmsMachineController");

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
router.post("/contacts/manual/:manualLeadId/campaigns", assignManualLeadToCampaign);
router.delete("/contacts/manual/:manualLeadId/campaigns/:campaignId", removeManualLeadFromCampaign);
router.patch("/contacts/manual/:manualLeadId", updateManualLead);
router.get("/contacts/feed/export.csv", exportContactFeed);
router.get("/contacts/feed/:qrId/active-qr", downloadLeadQrById);
router.get("/leads/crm", listLeadsCrm);
router.get("/leads/agenda", agenda);
router.post("/leads/agenda", createAgendaItem);
router.patch("/leads/agenda/:noteId", updateAgendaItem);
router.delete("/leads/agenda/:noteId", deleteAgendaItem);
router.get("/rms-machine/daily-queue", rmsDailyQueue);
router.get("/rms-machine/journeys", rmsJourneys);
router.get("/rms-machine/metrics", rmsMetrics);
router.post("/rms-machine/actions/create-task", createRmsAgendaTask);
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
router.get("/branches", listBranches);
router.post("/branches", createBranch);
router.patch("/branches/:branchId", updateBranch);
router.delete("/branches/:branchId", deleteBranch);
router.get("/competitors", listCompetitors);
router.post("/competitors", createCompetitor);
router.patch("/competitors/:competitorId", updateCompetitor);
router.delete("/competitors/:competitorId", archiveCompetitor);
router.get("/competitor-campaigns", listCompetitorCampaigns);
router.post("/competitor-campaigns", createCompetitorCampaign);
router.patch("/competitor-campaigns/:campaignId", updateCompetitorCampaign);
router.delete("/competitor-campaigns/:campaignId", archiveCompetitorCampaign);
router.get("/competitor-events", listCompetitorEvents);
router.post("/competitor-events", createCompetitorEvent);
router.patch("/competitor-events/:eventId", updateCompetitorEvent);
router.delete("/competitor-events/:eventId", archiveCompetitorEvent);
router.get("/competitor-findings", listCompetitorFindings);
router.post("/competitor-findings", createCompetitorFinding);
router.patch("/competitor-findings/:findingId", updateCompetitorFinding);
router.delete("/competitor-findings/:findingId", archiveCompetitorFinding);
router.get("/competitor-tasks", listCompetitorTasks);
router.post("/competitor-tasks", createCompetitorTask);
router.patch("/competitor-tasks/:taskId", updateCompetitorTask);
router.delete("/competitor-tasks/:taskId", archiveCompetitorTask);
router.get("/competitor-products", listCompetitorProducts);
router.post("/competitor-products", createCompetitorProduct);
router.patch("/competitor-products/:productId", updateCompetitorProduct);
router.delete("/competitor-products/:productId", archiveCompetitorProduct);
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

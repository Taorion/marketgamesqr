const express = require("express");
const { downloadSalesImportTemplate, previewSalesImport, importSales } = require("../controllers/salesBulkImportController");
const { authRequired, requireRoles, blockBusinessSeller } = require("../middleware/auth");
const {
  cacheBusinessResponse,
  invalidateBusinessResponseCache,
} = require("../middleware/businessResponseCache");
const { requirePortalAccess, requireBusinessFeature } = require("../middleware/subscription");
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
  competitiveRadarSummary,
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
  listAcquisitionChannels,
  getAcquisitionChannelInsights,
  getAcquisitionChannelEffortInsights,
  createAcquisitionChannel,
  updateAcquisitionChannel,
  archiveAcquisitionChannel,
  listAcquisitionChannelEfforts,
  createAcquisitionChannelEffort,
  updateAcquisitionChannelEffort,
  archiveAcquisitionChannelEffort,
  createCustomerAcquisitionSale,
  archiveInventoryProduct,
  listInventoryCategories,
  createInventoryCategory,
  listInventorySubcategories,
  createInventorySubcategory,
  listInventoryCatalog,
  createInventoryCatalog,
  createInventoryProduct,
  importInventoryProductsCsv,
  getInventoryProductInsights,
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
  importManualLeadsCsv,
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
  attributedSales,
  exportAttributedSales,
  voidAttributedSale,
  campaignSales,
  createSalesSnapshot,
  updateSalesSnapshot,
} = require("../controllers/businessPortalController");
const {
  addInterest,
  addPurchase,
  assignSellerResponsibility,
  agenda,
  createAgendaItem,
  createNote,
  deleteAgendaItem,
  deleteContact,
  downloadCustomerCsvErrors,
  downloadCustomerCsvTemplate,
  importCustomersCsv,
  leadDetail,
  listLeadsCrm,
  markActivationOpened,
  registerLeadWhatsAppContact,
  removeInterest,
  sendActivation,
  previewCustomerCsvImport,
  updateAgendaItem,
} = require("../controllers/leadCrmController");
const {
  activationEmailSummary: rmsActivationEmailSummary,
  createAgendaTask: createRmsAgendaTask,
  dailyQueue: rmsDailyQueue,
  events: rmsEvents,
  intelligenceCase: rmsIntelligenceCase,
  intelligenceCases: rmsIntelligenceCases,
  intelligenceInsights: rmsIntelligenceInsights,
  intelligencePatternReport: rmsIntelligencePatternReport,
  createInsightAgendaTask: rmsCreateInsightAgendaTask,
  executeAction: executeRmsAction,
  executeBulkAction: executeRmsBulkAction,
  journeys: rmsJourneys,
  machine: rmsMachine,
  metrics: rmsMetrics,
  unconvertedCost: rmsUnconvertedCost,
  movePhase: moveRmsPhase,
  recordActivationDeliveryAction,
  sendActivationBulkEmail: sendRmsActivationBulkEmail,
  recordAttributedSale: rmsRecordAttributedSale,
  recordCommercialConfirmation,
  recordEvaluationResponse: rmsRecordEvaluationResponse,
  recordNegotiationResult,
  prepareRiskRecoveryResource,
  recordRiskReview,
  postSaleActions: rmsPostSaleActions,
  recordPostSaleAction: rmsRecordPostSaleAction,
  reactivateRecycledLead,
  recyclingQueue,
  saveInsight: rmsSaveInsight,
  updateRecyclingCase,
} = require("../controllers/rmsMachineController");
const {
  activate: activateGamificationSeason,
  agendaTasks: createGamificationAgendaTasks,
  award: awardGamificationPoints,
  close: closeGamificationSeason,
  create: createGamificationSeason,
  deliver: deliverGamificationReward,
  detail: gamificationSeasonDetail,
  getDashboard: gamificationDashboard,
  leaderboard: gamificationLeaderboard,
  patch: updateGamificationSeason,
  pause: pauseGamificationSeason,
  purchaseLeaderboard: gamificationPurchaseLeaderboard,
  rewardsPending: gamificationRewardsPending,
  seasons: gamificationSeasons,
} = require("../controllers/gamificationMissionController");
const {
  audience: communicationAudience,
  create: createCommunication,
  detail: communicationDetail,
  remove: deleteCommunication,
  emailConnection: communicationEmailConnection,
  list: listCommunications,
  markWhatsAppOpened: markCommunicationWhatsAppOpened,
  patch: patchCommunication,
  prepareWhatsApp: prepareCommunicationWhatsApp,
  publish: publishCommunication,
  saveEmailConnection: saveCommunicationEmailConnection,
  saveWhatsAppConnection: saveCommunicationWhatsAppConnection,
  send: sendCommunication,
  sendWhatsApp: sendCommunicationWhatsApp,
  testEmailConnection: testCommunicationEmailConnection,
  testWhatsAppConnection: testCommunicationWhatsAppConnection,
  whatsAppConnection: communicationWhatsAppConnection,
  whatsAppTemplates: communicationWhatsAppTemplates,
  whatsappQueue: communicationWhatsAppQueue,
} = require("../controllers/businessCommunicationController");
const { storageSummary } = require("../controllers/storageQuotaController");
const {
  listSellers,
  getSeller,
  getSellerSelf,
  listSignupAttributionsHandler,
  createSellerHandler,
  patchSeller,
  patchSellerSelf,
  putSellerGoal,
  postSellerSale,
  patchSignupAttribution,
  sellerModuleAccess,
} = require("../controllers/sellerController");

const router = express.Router();

router.use(authRequired);
router.use(invalidateBusinessResponseCache());

const shortBusinessCache = cacheBusinessResponse({ keyPrefix: "business-short", ttlMs: 90_000 });
const standardBusinessCache = cacheBusinessResponse({ keyPrefix: "business-standard", ttlMs: 180_000 });
const heavyBusinessCache = cacheBusinessResponse({ keyPrefix: "business-heavy", ttlMs: 300_000, maxBytes: 1024 * 1024 });
const requireContactDirectory = requireBusinessFeature("contact_directory");
const requireJourney = requireBusinessFeature("journey");
const requirePredictiveAnalytics = requireBusinessFeature("predictive_analytics");
const requireLeadExport = requireBusinessFeature("leads_export");

router.get("/sellers/me", sellerModuleAccess, requireRoles("BUSINESS_SELLER"), getSellerSelf);
router.patch("/sellers/me/profile", sellerModuleAccess, requireRoles("BUSINESS_SELLER"), patchSellerSelf);
router.get("/sellers", sellerModuleAccess, requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"), listSellers);
router.post("/sellers", sellerModuleAccess, requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"), createSellerHandler);
router.get("/sellers/attributions", sellerModuleAccess, requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"), listSignupAttributionsHandler);
router.get("/sellers/:sellerId", sellerModuleAccess, requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"), getSeller);
router.patch("/sellers/:sellerId", sellerModuleAccess, requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"), patchSeller);
router.put("/sellers/:sellerId/goals", sellerModuleAccess, requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"), putSellerGoal);
router.post("/sellers/:sellerId/sales", sellerModuleAccess, requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"), postSellerSale);
router.patch("/sellers/attributions/:attributionId", sellerModuleAccess, requireRoles("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"), patchSignupAttribution);

// BUSINESS_SELLER is a deliberately narrow role. Every existing business route
// remains unreachable even if a caller bypasses the frontend navigation.
router.use(blockBusinessSeller);

router.get("/access", businessAccess);
router.get("/storage/summary", storageSummary);
router.get("/tickets/balance", ticketBalance);
router.get("/tickets/transactions", ticketTransactions);
router.get("/profile", getBusinessProfile);
router.patch("/profile", requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"), updateBusinessProfile);
router.get("/users", listBusinessUsers);
router.post("/users", createBusinessUser);
router.patch("/users/:userId", updateBusinessUser);
router.use(requirePortalAccess);
router.get("/contacts/feed", standardBusinessCache, contactFeed);
router.get("/contacts/manual", requireContactDirectory, standardBusinessCache, listManualLeads);
router.post("/contacts/manual", requireContactDirectory, createManualLead);
router.post("/contacts/manual/import-csv", requireContactDirectory, importManualLeadsCsv);
router.get("/contacts/customers/import-template.csv", requireContactDirectory, downloadCustomerCsvTemplate);
router.post("/contacts/customers/import-csv/preview", requireContactDirectory, previewCustomerCsvImport);
router.post("/contacts/customers/import-csv", requireContactDirectory, importCustomersCsv);
router.get("/contacts/customers/imports/:batchId/errors.csv", requireContactDirectory, downloadCustomerCsvErrors);
router.post("/contacts/manual/from-lead/:leadId", requireContactDirectory, createManualLeadFromExistingLead);
router.post("/contacts/manual/:manualLeadId/campaigns", requireContactDirectory, assignManualLeadToCampaign);
router.delete("/contacts/manual/:manualLeadId/campaigns/:campaignId", requireContactDirectory, removeManualLeadFromCampaign);
router.patch("/contacts/manual/:manualLeadId", requireContactDirectory, updateManualLead);
router.get("/contacts/feed/export.csv", requireLeadExport, exportContactFeed);
router.get("/contacts/feed/:qrId/active-qr", downloadLeadQrById);
router.get("/leads/crm", standardBusinessCache, listLeadsCrm);
router.patch("/leads/:leadId/seller-responsibility", requireContactDirectory, assignSellerResponsibility);
router.get("/leads/agenda", shortBusinessCache, agenda);
router.post("/leads/agenda", createAgendaItem);
router.patch("/leads/agenda/:noteId", updateAgendaItem);
router.delete("/leads/agenda/:noteId", deleteAgendaItem);
router.get("/rms-machine", standardBusinessCache, rmsMachine);
router.get("/rms-machine/daily-queue", standardBusinessCache, rmsDailyQueue);
router.get("/rms-machine/journeys", requireJourney, standardBusinessCache, rmsJourneys);
router.get("/rms-machine/metrics", standardBusinessCache, rmsMetrics);
router.get("/rms-machine/unconverted-cost", rmsUnconvertedCost);
router.get("/rms-machine/events", shortBusinessCache, rmsEvents);
router.get("/rms-machine/intelligence/case", requirePredictiveAnalytics, shortBusinessCache, rmsIntelligenceCase);
router.get("/rms-machine/intelligence/cases", requirePredictiveAnalytics, shortBusinessCache, rmsIntelligenceCases);
router.get("/rms-machine/intelligence/patterns", requirePredictiveAnalytics, standardBusinessCache, rmsIntelligencePatternReport);
router.get("/rms-machine/intelligence/insights", requirePredictiveAnalytics, shortBusinessCache, rmsIntelligenceInsights);
router.post("/rms-machine/intelligence/insights", requirePredictiveAnalytics, rmsSaveInsight);
router.post("/rms-machine/intelligence/agenda-task", requirePredictiveAnalytics, rmsCreateInsightAgendaTask);
router.post("/rms-machine/actions/create-task", createRmsAgendaTask);
router.post("/rms-machine/action", executeRmsAction);
router.post("/rms-machine/activation-delivery", recordActivationDeliveryAction);
router.get("/rms-machine/activation-email/summary", rmsActivationEmailSummary);
router.post("/rms-machine/activation-email/bulk-send", sendRmsActivationBulkEmail);
router.post("/rms-machine/evaluation-response", rmsRecordEvaluationResponse);
router.post("/rms-machine/commercial-confirmation", recordCommercialConfirmation);
router.post("/rms-machine/negotiation-result", recordNegotiationResult);
router.post("/rms-machine/risk-recovery-resource", prepareRiskRecoveryResource);
router.post("/rms-machine/risk-review", recordRiskReview);
router.get("/rms-machine/post-sale-actions", shortBusinessCache, rmsPostSaleActions);
router.post("/rms-machine/post-sale-actions", rmsRecordPostSaleAction);
router.get("/rms-machine/recycling", shortBusinessCache, recyclingQueue);
router.post("/rms-machine/recycling/action", updateRecyclingCase);
router.post("/rms-machine/recycling/reactivate", reactivateRecycledLead);
router.post("/rms-machine/attributed-sales", rmsRecordAttributedSale);
router.post("/rms-machine/bulk-action", executeRmsBulkAction);
router.patch("/rms-machine/lead/phase", moveRmsPhase);
router.get("/gamification/dashboard", standardBusinessCache, gamificationDashboard);
router.get("/gamification/seasons", standardBusinessCache, gamificationSeasons);
router.post("/gamification/seasons", createGamificationSeason);
router.get("/gamification/seasons/:id", shortBusinessCache, gamificationSeasonDetail);
router.patch("/gamification/seasons/:id", updateGamificationSeason);
router.post("/gamification/seasons/:id/activate", activateGamificationSeason);
router.post("/gamification/seasons/:id/pause", pauseGamificationSeason);
router.post("/gamification/seasons/:id/close", closeGamificationSeason);
router.post("/gamification/points/award", awardGamificationPoints);
router.get("/gamification/purchase-leaderboard", shortBusinessCache, gamificationPurchaseLeaderboard);
router.get("/gamification/leaderboards/:seasonId", shortBusinessCache, gamificationLeaderboard);
router.get("/gamification/rewards/pending", shortBusinessCache, gamificationRewardsPending);
router.post("/gamification/rewards/:id/deliver", deliverGamificationReward);
router.post("/gamification/agenda/create-tasks", createGamificationAgendaTasks);
router.get("/leads/:leadId", leadDetail);
router.delete("/leads/:leadId", deleteContact);
router.post("/leads/:leadId/notes", createNote);
router.post("/leads/:leadId/interests", addInterest);
router.delete("/leads/:leadId/interests/:interestId", removeInterest);
router.post("/leads/:leadId/purchases", addPurchase);
router.post("/leads/:leadId/activations", sendActivation);
router.post("/leads/:leadId/activations/:activationId/opened", markActivationOpened);
router.post("/leads/:leadId/whatsapp", registerLeadWhatsAppContact);

router.use("/communications", requireRoles("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"));
router.get("/communications/email-connection", communicationEmailConnection);
router.patch("/communications/email-connection", saveCommunicationEmailConnection);
router.post("/communications/email-connection/test", testCommunicationEmailConnection);
router.get("/communications/whatsapp-connection", communicationWhatsAppConnection);
router.patch("/communications/whatsapp-connection", saveCommunicationWhatsAppConnection);
router.get("/communications/whatsapp-connection/templates", communicationWhatsAppTemplates);
router.post("/communications/whatsapp-connection/test", testCommunicationWhatsAppConnection);
router.get("/communications/audience", shortBusinessCache, communicationAudience);
router.get("/communications", standardBusinessCache, listCommunications);
router.get("/communications/:id", communicationDetail);
router.post("/communications", createCommunication);
router.patch("/communications/:id", patchCommunication);
router.delete("/communications/:id", deleteCommunication);
router.post("/communications/:id/publish", publishCommunication);
router.post("/communications/:id/send", sendCommunication);
router.post("/communications/:id/whatsapp/prepare", prepareCommunicationWhatsApp);
router.post("/communications/:id/whatsapp/send", sendCommunicationWhatsApp);
router.get("/communications/:id/whatsapp/queue", communicationWhatsAppQueue);
router.post("/communications/:id/whatsapp/opened", markCommunicationWhatsAppOpened);
router.get("/activity", businessActivity);
router.get("/analytics/command-center", heavyBusinessCache, commandCenterAnalytics);
router.get("/branches", listBranches);
router.post("/branches", createBranch);
router.patch("/branches/:branchId", updateBranch);
router.delete("/branches/:branchId", deleteBranch);
router.get("/competitors", standardBusinessCache, listCompetitors);
router.get("/competitive-radar/summary", standardBusinessCache, competitiveRadarSummary);
router.post("/competitors", createCompetitor);
router.patch("/competitors/:competitorId", updateCompetitor);
router.delete("/competitors/:competitorId", archiveCompetitor);
router.get("/competitor-campaigns", standardBusinessCache, listCompetitorCampaigns);
router.post("/competitor-campaigns", createCompetitorCampaign);
router.patch("/competitor-campaigns/:campaignId", updateCompetitorCampaign);
router.delete("/competitor-campaigns/:campaignId", archiveCompetitorCampaign);
router.get("/competitor-events", standardBusinessCache, listCompetitorEvents);
router.post("/competitor-events", createCompetitorEvent);
router.patch("/competitor-events/:eventId", updateCompetitorEvent);
router.delete("/competitor-events/:eventId", archiveCompetitorEvent);
router.get("/competitor-findings", standardBusinessCache, listCompetitorFindings);
router.post("/competitor-findings", createCompetitorFinding);
router.patch("/competitor-findings/:findingId", updateCompetitorFinding);
router.delete("/competitor-findings/:findingId", archiveCompetitorFinding);
router.get("/competitor-tasks", standardBusinessCache, listCompetitorTasks);
router.post("/competitor-tasks", createCompetitorTask);
router.patch("/competitor-tasks/:taskId", updateCompetitorTask);
router.delete("/competitor-tasks/:taskId", archiveCompetitorTask);
router.get("/competitor-products", standardBusinessCache, listCompetitorProducts);
router.post("/competitor-products", createCompetitorProduct);
router.patch("/competitor-products/:productId", updateCompetitorProduct);
router.delete("/competitor-products/:productId", archiveCompetitorProduct);
router.get("/channels", standardBusinessCache, listAcquisitionChannels);
router.post("/channels", createAcquisitionChannel);
router.get("/channels/:channelId/insights", standardBusinessCache, getAcquisitionChannelInsights);
router.get("/channel-efforts", standardBusinessCache, listAcquisitionChannelEfforts);
router.post("/channel-efforts", createAcquisitionChannelEffort);
router.get("/channel-efforts/:effortId/insights", standardBusinessCache, getAcquisitionChannelEffortInsights);
router.patch("/channel-efforts/:effortId", updateAcquisitionChannelEffort);
router.delete("/channel-efforts/:effortId", archiveAcquisitionChannelEffort);
router.patch("/channels/:channelId", updateAcquisitionChannel);
router.delete("/channels/:channelId", archiveAcquisitionChannel);
router.post("/customer-acquisition-sales", createCustomerAcquisitionSale);
router.get("/inventory/categories", standardBusinessCache, listInventoryCategories);
router.post("/inventory/categories", createInventoryCategory);
router.get("/inventory/subcategories", standardBusinessCache, listInventorySubcategories);
router.post("/inventory/subcategories", createInventorySubcategory);
// Express 5 / path-to-regexp no longer accepts the legacy inline regexp in a
// parameter. The controller keeps the allow-list, so this broad route remains
// protected while letting the server start on the current runtime.
router.get("/inventory/catalog/:catalog", standardBusinessCache, listInventoryCatalog);
router.post("/inventory/catalog/:catalog", createInventoryCatalog);
router.get("/inventory/products", standardBusinessCache, listInventoryProducts);
router.post("/inventory/products", createInventoryProduct);
router.post("/inventory/products/import-csv", importInventoryProductsCsv);
router.get("/inventory/products/:productId/insights", shortBusinessCache, getInventoryProductInsights);
router.patch("/inventory/products/:productId", updateInventoryProduct);
router.delete("/inventory/products/:productId", archiveInventoryProduct);
router.get("/campaigns", standardBusinessCache, listCampaigns);
router.post("/campaigns", createCampaign);
router.get("/campaigns/:id", shortBusinessCache, getCampaign);
router.patch("/campaigns/:id", updateCampaign);
router.patch("/campaigns/:id/client-setup", patchClientSetup);
router.post("/campaigns/:id/confirm-launch", confirmLaunch);
router.get("/campaigns/:id/report", standardBusinessCache, campaignReport);
router.get("/campaigns/:id/leads", standardBusinessCache, campaignLeads);
router.get("/campaigns/:id/leads/export.csv", exportCampaignLeads);
router.get("/campaigns/:id/leads/:qrId/active-qr", downloadActiveLeadQr);
router.get("/campaigns/:id/redemptions", standardBusinessCache, campaignRedemptions);
router.get("/sales/attributed", attributedSales);
router.get("/sales/attributed/export.csv", exportAttributedSales);
router.get("/sales/import-template.csv", downloadSalesImportTemplate);
router.post("/sales/import/preview", previewSalesImport);
router.post("/sales/import", importSales);
router.post("/sales/:saleId/void", voidAttributedSale);
router.get("/campaigns/:id/sales", standardBusinessCache, campaignSales);
router.post("/campaigns/:id/sales-snapshot", createSalesSnapshot);
router.patch("/campaigns/:id/sales-snapshots/:snapshotId", updateSalesSnapshot);

module.exports = router;

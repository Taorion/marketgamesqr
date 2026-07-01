const SESSION_KEY = "qr_business_portal_session_v1";
const loginPanel = document.getElementById("loginPanel");
const VALIDATOR_SESSION_KEY = "universal_qr_validator_session_v1";
const APP_VERSION = "empresa-20260629-affiliate-finder-v1";
const APP_VERSION_KEY = "qr_business_portal_app_version";
const APP_UPDATE_NOTICE_KEY = "qr_business_portal_update_notice";
const workspace = document.getElementById("workspace");
const sidebar = document.querySelector(".sidebar");
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const passwordResetRequestForm = document.getElementById("passwordResetRequestForm");
const passwordResetEmailInput = document.getElementById("passwordResetEmailInput");
const passwordResetForm = document.getElementById("passwordResetForm");
const passwordResetNewInput = document.getElementById("passwordResetNewInput");
const passwordResetConfirmInput = document.getElementById("passwordResetConfirmInput");
const passwordResetMessage = document.getElementById("passwordResetMessage");
const passwordRevealButtons = Array.from(document.querySelectorAll("[data-password-toggle]"));
const actionFeedback = document.getElementById("actionFeedback");
const subscriptionBanner = document.getElementById("subscriptionBanner");
const subscriptionPlanName = document.getElementById("subscriptionPlanName");
const subscriptionPlanSummary = document.getElementById("subscriptionPlanSummary");
const subscriptionLimits = document.getElementById("subscriptionLimits");
const gamingCenterCoreButton = document.getElementById("gamingCenterCoreButton");
const busyOverlay = document.getElementById("busyOverlay");
const busyOverlayTitle = document.getElementById("busyOverlayTitle");
const busyOverlayMessage = document.getElementById("busyOverlayMessage");
const menuToggleButton = document.getElementById("menuToggleButton");
const searchInput = document.getElementById("searchInput");
const refreshButton = document.getElementById("refreshButton");
const notificationsButton = document.getElementById("notificationsButton");
const settingsButton = document.getElementById("settingsButton");
const themeSwitch = document.getElementById("themeSwitch");
const themeSwitchLabel = document.getElementById("themeSwitchLabel");
const logoutButton = document.getElementById("logoutButton");
const profileName = document.getElementById("profileName");
const profileAvatar = document.getElementById("profileAvatar");
const THEME_KEY = "marketgames_portal_theme";
const businessKpiGrid = document.getElementById("businessKpiGrid");
const campaignKpiGrid = document.getElementById("campaignKpiGrid");
const salesKpiGrid = document.getElementById("salesKpiGrid");
const branchKpiGrid = document.getElementById("branchKpiGrid");
const adminKpiGrid = document.getElementById("adminKpiGrid");
const recentRedemptionsTable = document.getElementById("recentRedemptionsTable");
const recentLeadsTable = document.getElementById("recentLeadsTable");
const branchPerformanceTable = document.getElementById("branchPerformanceTable");
const commandCenterRoot = document.getElementById("commandCenterRoot");
const leadFeedKpiGrid = document.getElementById("leadFeedKpiGrid");
const leadFeedRetention = document.getElementById("leadFeedRetention");
const leadFeedTable = document.getElementById("leadFeedTable");
const leadExportScopeInput = document.getElementById("leadExportScopeInput");
const campaignList = document.getElementById("campaignList");
const campaignStatusFilter = document.getElementById("campaignStatusFilter");
const campaignBreadcrumb = document.getElementById("campaignBreadcrumb");
const campaignHeroTitle = document.getElementById("campaignHeroTitle");
const campaignHeroSubtitle = document.getElementById("campaignHeroSubtitle");
const campaignStateGrid = document.getElementById("campaignStateGrid");
const campaignInsightText = document.getElementById("campaignInsightText");
const campaignObjectiveValue = document.getElementById("campaignObjectiveValue");
const campaignDurationValue = document.getElementById("campaignDurationValue");
const campaignStatusValue = document.getElementById("campaignStatusValue");
const campaignBudgetValue = document.getElementById("campaignBudgetValue");
const campaignBudgetMeta = document.getElementById("campaignBudgetMeta");
const campaignBudgetBar = document.getElementById("campaignBudgetBar");
const campaignRoiValue = document.getElementById("campaignRoiValue");
const campaignRoiDelta = document.getElementById("campaignRoiDelta");
const launchSetupTitle = document.getElementById("launchSetupTitle");
const launchSetupStatus = document.getElementById("launchSetupStatus");
const launchSetupCopy = document.getElementById("launchSetupCopy");
const launchSetupForm = document.getElementById("launchSetupForm");
const launchBudgetInput = document.getElementById("launchBudgetInput");
const launchAdditionalBudgetInput = document.getElementById("launchAdditionalBudgetInput");
const launchStartsAtInput = document.getElementById("launchStartsAtInput");
const launchEndsAtInput = document.getElementById("launchEndsAtInput");
const launchObjectiveInput = document.getElementById("launchObjectiveInput");
const launchChannelGrid = document.getElementById("launchChannelGrid");
const launchLeadsGoalInput = document.getElementById("launchLeadsGoalInput");
const launchRedemptionsGoalInput = document.getElementById("launchRedemptionsGoalInput");
const launchSalesGoalInput = document.getElementById("launchSalesGoalInput");
const launchClientNotesInput = document.getElementById("launchClientNotesInput");
const launchSetupMessage = document.getElementById("launchSetupMessage");
const confirmLaunchButton = document.getElementById("confirmLaunchButton");
const campaignAssetsGrid = document.getElementById("campaignAssetsGrid");
const campaignSnapshotsTable = document.getElementById("campaignSnapshotsTable");
const saveSnapshotButton = document.getElementById("saveSnapshotButton");
const campaignSnapshotChart = document.getElementById("campaignSnapshotChart");
const funnelStack = document.getElementById("funnelStack");
const campaignLeadsTable = document.getElementById("campaignLeadsTable");
const campaignRedemptionsTable = document.getElementById("campaignRedemptionsTable");
const campaignSalesTable = document.getElementById("campaignSalesTable");
const affiliateCreateForm = document.getElementById("affiliateCreateForm");
const affiliateFullNameInput = document.getElementById("affiliateFullNameInput");
const affiliateDocumentInput = document.getElementById("affiliateDocumentInput");
const affiliatePhoneInput = document.getElementById("affiliatePhoneInput");
const affiliateEmailInput = document.getElementById("affiliateEmailInput");
const affiliatePhotoInput = document.getElementById("affiliatePhotoInput");
const affiliateNotesInput = document.getElementById("affiliateNotesInput");
const affiliateCreateMessage = document.getElementById("affiliateCreateMessage");
const affiliateFinderInput = document.getElementById("affiliateFinderInput");
const affiliateFinderSearchButton = document.getElementById("affiliateFinderSearchButton");
const affiliateFinderScanButton = document.getElementById("affiliateFinderScanButton");
const affiliateFinderStopScanButton = document.getElementById("affiliateFinderStopScanButton");
const affiliateFinderStatus = document.getElementById("affiliateFinderStatus");
const affiliateFinderScanner = document.getElementById("affiliateFinderScanner");
const affiliateFinderVideo = document.getElementById("affiliateFinderVideo");
const affiliateFinderMessage = document.getElementById("affiliateFinderMessage");
const affiliateFinderResults = document.getElementById("affiliateFinderResults");
const businessLogoTitle = document.getElementById("businessLogoTitle");
const businessLogoPreview = document.getElementById("businessLogoPreview");
const businessLogoInput = document.getElementById("businessLogoInput");
const businessLogoUploadButton = document.getElementById("businessLogoUploadButton");
const businessLogoRemoveButton = document.getElementById("businessLogoRemoveButton");
const businessLogoMessage = document.getElementById("businessLogoMessage");
const accountBusinessName = document.getElementById("accountBusinessName");
const accountBusinessNit = document.getElementById("accountBusinessNit");
const accountBusinessSlug = document.getElementById("accountBusinessSlug");
const accountBusinessContact = document.getElementById("accountBusinessContact");
const accountBusinessPhone = document.getElementById("accountBusinessPhone");
const accountUserName = document.getElementById("accountUserName");
const accountUserEmail = document.getElementById("accountUserEmail");
const accountUserRole = document.getElementById("accountUserRole");
const accountUserBusiness = document.getElementById("accountUserBusiness");
const accountUserId = document.getElementById("accountUserId");
const accountPlanName = document.getElementById("accountPlanName");
const accountType = document.getElementById("accountType");
const accountPlanStatus = document.getElementById("accountPlanStatus");
const accountQrAvailable = document.getElementById("accountQrAvailable");
const accountQrUsed = document.getElementById("accountQrUsed");
const accountCommercialDealCard = document.getElementById("accountCommercialDealCard");
const accountCommercialDealTitle = document.getElementById("accountCommercialDealTitle");
const accountCommercialDealStatus = document.getElementById("accountCommercialDealStatus");
const accountCommercialDealSummary = document.getElementById("accountCommercialDealSummary");
const accountCommercialDealGrid = document.getElementById("accountCommercialDealGrid");
const accountProfileForm = document.getElementById("accountProfileForm");
const accountNameInput = document.getElementById("accountNameInput");
const accountSloganInput = document.getElementById("accountSloganInput");
const accountNitInput = document.getElementById("accountNitInput");
const accountContactInput = document.getElementById("accountContactInput");
const accountEmailInput = document.getElementById("accountEmailInput");
const accountPhoneInput = document.getElementById("accountPhoneInput");
const accountWebsiteInput = document.getElementById("accountWebsiteInput");
const accountCityInput = document.getElementById("accountCityInput");
const accountAddressInput = document.getElementById("accountAddressInput");
const accountProfileMessage = document.getElementById("accountProfileMessage");
const accountProfileSaveButton = document.getElementById("accountProfileSaveButton");
const accountLogoPreview = document.getElementById("accountLogoPreview");
const accountLogoTitle = document.getElementById("accountLogoTitle");
const accountTicketFramePreview = document.getElementById("accountTicketFramePreview");
const accountTicketFrameTitle = document.getElementById("accountTicketFrameTitle");
const accountTicketFrameInput = document.getElementById("accountTicketFrameInput");
const accountTicketFrameUploadButton = document.getElementById("accountTicketFrameUploadButton");
const accountTicketFrameRemoveButton = document.getElementById("accountTicketFrameRemoveButton");
const accountTicketFrameMessage = document.getElementById("accountTicketFrameMessage");
const accountPasswordForm = document.getElementById("accountPasswordForm");
const accountCurrentPasswordInput = document.getElementById("accountCurrentPasswordInput");
const accountNewPasswordInput = document.getElementById("accountNewPasswordInput");
const accountNewPasswordConfirmInput = document.getElementById("accountNewPasswordConfirmInput");
const accountPasswordMessage = document.getElementById("accountPasswordMessage");
const accountPasswordSaveButton = document.getElementById("accountPasswordSaveButton");
const accountUserForm = document.getElementById("accountUserForm");
const accountUserFullNameInput = document.getElementById("accountUserFullNameInput");
const accountUserEmailInput = document.getElementById("accountUserEmailInput");
const accountUserRoleInput = document.getElementById("accountUserRoleInput");
const accountUserPasswordInput = document.getElementById("accountUserPasswordInput");
const accountUserCreateMessage = document.getElementById("accountUserCreateMessage");
const accountUserCreateButton = document.getElementById("accountUserCreateButton");
const accountUsersTable = document.getElementById("accountUsersTable");
const refreshAccountUsersButton = document.getElementById("refreshAccountUsersButton");
const resetAffiliateFormButton = document.getElementById("resetAffiliateFormButton");
const affiliateCardTitle = document.getElementById("affiliateCardTitle");
const affiliateCardPreviewWrap = document.getElementById("affiliateCardPreviewWrap");
const affiliateCardPreview = document.getElementById("affiliateCardPreview");
const affiliateCardMeta = document.getElementById("affiliateCardMeta");
const affiliateSelectedSummary = document.getElementById("affiliateSelectedSummary");
const affiliatePurchaseAmountInput = document.getElementById("affiliatePurchaseAmountInput");
const affiliateAddPointsButton = document.getElementById("affiliateAddPointsButton");
const downloadAffiliateCardButton = document.getElementById("downloadAffiliateCardButton");
const affiliateReferralQrQuantityInput = document.getElementById("affiliateReferralQrQuantityInput");
const affiliateReferralQrCampaignInput = document.getElementById("affiliateReferralQrCampaignInput");
const affiliateReferralQrBenefitInput = document.getElementById("affiliateReferralQrBenefitInput");
const affiliateReferralQrNotesInput = document.getElementById("affiliateReferralQrNotesInput");
const affiliateGenerateReferralQrButton = document.getElementById("affiliateGenerateReferralQrButton");
const affiliateReferralQrMessage = document.getElementById("affiliateReferralQrMessage");
const affiliateReferralQrResult = document.getElementById("affiliateReferralQrResult");
const affiliateReferralQrSelectedMeta = document.getElementById("affiliateReferralQrSelectedMeta");
const refreshAffiliatesButton = document.getElementById("refreshAffiliatesButton");
const affiliateTable = document.getElementById("affiliateTable");
const affiliateLedgerTable = document.getElementById("affiliateLedgerTable");
const affiliateLedgerTitle = document.getElementById("affiliateLedgerTitle");
const refreshRewardPassesButton = document.getElementById("refreshRewardPassesButton");
const rewardPassKpiGrid = document.getElementById("rewardPassKpiGrid");
const rewardPassTicketContext = document.getElementById("rewardPassTicketContext");
const rewardPassCreateForm = document.getElementById("rewardPassCreateForm");
const rewardPassValueInput = document.getElementById("rewardPassValueInput");
const rewardPassCampaignInput = document.getElementById("rewardPassCampaignInput");
const rewardPassBuyerNameInput = document.getElementById("rewardPassBuyerNameInput");
const rewardPassBuyerDocumentInput = document.getElementById("rewardPassBuyerDocumentInput");
const rewardPassBuyerPhoneInput = document.getElementById("rewardPassBuyerPhoneInput");
const rewardPassBuyerEmailInput = document.getElementById("rewardPassBuyerEmailInput");
const rewardPassBeneficiaryNameInput = document.getElementById("rewardPassBeneficiaryNameInput");
const rewardPassBeneficiaryDocumentInput = document.getElementById("rewardPassBeneficiaryDocumentInput");
const rewardPassBeneficiaryPhoneInput = document.getElementById("rewardPassBeneficiaryPhoneInput");
const rewardPassBeneficiaryEmailInput = document.getElementById("rewardPassBeneficiaryEmailInput");
const rewardPassIssuedAtInput = document.getElementById("rewardPassIssuedAtInput");
const rewardPassExpiresAtInput = document.getElementById("rewardPassExpiresAtInput");
const rewardPassBranchInput = document.getElementById("rewardPassBranchInput");
const rewardPassPaymentMethodInput = document.getElementById("rewardPassPaymentMethodInput");
const rewardPassPartialInput = document.getElementById("rewardPassPartialInput");
const rewardPassTransferableInput = document.getElementById("rewardPassTransferableInput");
const rewardPassTermsInput = document.getElementById("rewardPassTermsInput");
const rewardPassNotesInput = document.getElementById("rewardPassNotesInput");
const rewardPassCreateMessage = document.getElementById("rewardPassCreateMessage");
const rewardPassCreateButton = document.getElementById("rewardPassCreateButton");
const rewardPassPreviewTitle = document.getElementById("rewardPassPreviewTitle");
const rewardPassPreviewValue = document.getElementById("rewardPassPreviewValue");
const rewardPassPreviewBeneficiary = document.getElementById("rewardPassPreviewBeneficiary");
const rewardPassPreviewMeta = document.getElementById("rewardPassPreviewMeta");
const rewardPassCardPreview = document.getElementById("rewardPassCardPreview");
const rewardPassDownloadImageButton = document.getElementById("rewardPassDownloadImageButton");
const rewardPassDownloadPdfButton = document.getElementById("rewardPassDownloadPdfButton");
const rewardPassReceiptButton = document.getElementById("rewardPassReceiptButton");
const rewardPassStatusFilter = document.getElementById("rewardPassStatusFilter");
const rewardPassTable = document.getElementById("rewardPassTable");
const rewardPassDetailTitle = document.getElementById("rewardPassDetailTitle");
const rewardPassDetailGrid = document.getElementById("rewardPassDetailGrid");
const rewardPassRedemptionTable = document.getElementById("rewardPassRedemptionTable");
const rewardPassTicketLedgerTable = document.getElementById("rewardPassTicketLedgerTable");
const affiliateStatTotal = document.getElementById("affiliateStatTotal");
const affiliateStatActive = document.getElementById("affiliateStatActive");
const affiliateStatPoints = document.getElementById("affiliateStatPoints");
const affiliateStatEvents = document.getElementById("affiliateStatEvents");
const affiliateStatPurchaseTotal = document.getElementById("affiliateStatPurchaseTotal");
const affiliateStatAveragePurchase = document.getElementById("affiliateStatAveragePurchase");
const affiliateStatLastPurchase = document.getElementById("affiliateStatLastPurchase");
const affiliateStatTopAffiliate = document.getElementById("affiliateStatTopAffiliate");
const branchTable = document.getElementById("branchTable");
const redemptionInsightTitle = document.getElementById("redemptionInsightTitle");
const adminPanelMessage = document.getElementById("adminPanelMessage");
const adminCampaignTable = document.getElementById("adminCampaignTable");
const refreshAdminWorkspaceButton = document.getElementById("refreshAdminWorkspaceButton");
const newAdminCampaignButton = document.getElementById("newAdminCampaignButton");
const adminEditorTitle = document.getElementById("adminEditorTitle");
const adminEditorStatus = document.getElementById("adminEditorStatus");
const adminCampaignForm = document.getElementById("adminCampaignForm");
const adminCampaignNameInput = document.getElementById("adminCampaignNameInput");
const adminCampaignSlugInput = document.getElementById("adminCampaignSlugInput");
const adminCampaignTypeInput = document.getElementById("adminCampaignTypeInput");
const adminCampaignStatusInput = document.getElementById("adminCampaignStatusInput");
const adminCampaignObjectiveInput = document.getElementById("adminCampaignObjectiveInput");
const adminCampaignStrategyInput = document.getElementById("adminCampaignStrategyInput");
const adminCampaignBudgetInput = document.getElementById("adminCampaignBudgetInput");
const adminCampaignSalesGoalInput = document.getElementById("adminCampaignSalesGoalInput");
const adminCampaignLandingUrlInput = document.getElementById("adminCampaignLandingUrlInput");
const adminCampaignValidatorUrlInput = document.getElementById("adminCampaignValidatorUrlInput");
const adminCampaignGameUrlInput = document.getElementById("adminCampaignGameUrlInput");
const adminCampaignPrimaryLinkInput = document.getElementById("adminCampaignPrimaryLinkInput");
const adminCampaignQrLandingUrlInput = document.getElementById("adminCampaignQrLandingUrlInput");
const adminCampaignAssetNotesInput = document.getElementById("adminCampaignAssetNotesInput");
const adminCampaignMessage = document.getElementById("adminCampaignMessage");
const adminMarkReadyButton = document.getElementById("adminMarkReadyButton");
const adminReportKpiGrid = document.getElementById("adminReportKpiGrid");
const adminReportCampaignTable = document.getElementById("adminReportCampaignTable");
const exportCampaignReportButton = document.getElementById("exportCampaignReportButton");
const markReadyCampaignButton = document.getElementById("markReadyCampaignButton");
const exportLeadsButton = document.getElementById("exportLeadsButton");
const exportRedemptionsButton = document.getElementById("exportRedemptionsButton");
const exportSalesButton = document.getElementById("exportSalesButton");
const requestCampaignButton = document.getElementById("requestCampaignButton");
const editCampaignButton = document.getElementById("editCampaignButton");
const redemptionInsightButton = document.getElementById("redemptionInsightButton");
const rangeButton = document.getElementById("rangeButton");
const refreshValidatorHistoryButton = document.getElementById("refreshValidatorHistoryButton");
const validatorCameraStatus = document.getElementById("validatorCameraStatus");
const validatorScannerHint = document.getElementById("validatorScannerHint");
const validatorScannerVideo = document.getElementById("validatorScannerVideo");
const startValidatorScannerButton = document.getElementById("startValidatorScannerButton");
const stopValidatorScannerButton = document.getElementById("stopValidatorScannerButton");
const validatorQrTokenInput = document.getElementById("validatorQrTokenInput");
const validateValidatorManualButton = document.getElementById("validateValidatorManualButton");
const validatorManualStatus = document.getElementById("validatorManualStatus");
const validatorResultTitle = document.getElementById("validatorResultTitle");
const validatorResultChip = document.getElementById("validatorResultChip");
const validatorResultMessage = document.getElementById("validatorResultMessage");
const validatorBusinessValue = document.getElementById("validatorBusinessValue");
const validatorCampaignValue = document.getElementById("validatorCampaignValue");
const validatorGameValue = document.getElementById("validatorGameValue");
const validatorRewardValue = document.getElementById("validatorRewardValue");
const validatorPlayerValue = document.getElementById("validatorPlayerValue");
const validatorDocumentValue = document.getElementById("validatorDocumentValue");
const validatorContactValue = document.getElementById("validatorContactValue");
const validatorExpiresValue = document.getElementById("validatorExpiresValue");
const validatorRedeemButton = document.getElementById("validatorRedeemButton");
const validatorSaleForm = document.getElementById("validatorSaleForm");
const validatorHadSaleInput = document.getElementById("validatorHadSaleInput");
const validatorSaleAmountInput = document.getElementById("validatorSaleAmountInput");
const validatorRewardPassInvoiceInput = document.getElementById("validatorRewardPassInvoiceInput");
const validatorRewardPassRedeemInput = document.getElementById("validatorRewardPassRedeemInput");
const validatorRewardPassBranchInput = document.getElementById("validatorRewardPassBranchInput");
const validatorRewardPassDocumentInput = document.getElementById("validatorRewardPassDocumentInput");
const validatorRewardPassBalancePanel = document.getElementById("validatorRewardPassBalancePanel");
const validatorRewardPassAvailableValue = document.getElementById("validatorRewardPassAvailableValue");
const validatorRewardPassCoverageValue = document.getElementById("validatorRewardPassCoverageValue");
const validatorRewardPassRemainingValue = document.getElementById("validatorRewardPassRemainingValue");
const validatorRewardPassOverageValue = document.getElementById("validatorRewardPassOverageValue");
const validatorRewardPassBalanceMessage = document.getElementById("validatorRewardPassBalanceMessage");
const validatorPaymentMethodInput = document.getElementById("validatorPaymentMethodInput");
const validatorProductServiceInput = document.getElementById("validatorProductServiceInput");
const validatorSaleNotesInput = document.getElementById("validatorSaleNotesInput");
const validatorSaleStatus = document.getElementById("validatorSaleStatus");
const validatorHistoryTable = document.getElementById("validatorHistoryTable");
const strategicQrKpiGrid = document.getElementById("strategicQrKpiGrid");
const ticketCenterTabs = Array.from(document.querySelectorAll("[data-ticket-tab]"));
const ticketCenterPanels = Array.from(document.querySelectorAll("[data-ticket-panel]"));
const ticketFlowKpiGrid = document.getElementById("ticketFlowKpiGrid");
const ticketPhysicalFlowTrack = document.getElementById("ticketPhysicalFlowTrack");
const ticketPhysicalFlowTable = document.getElementById("ticketPhysicalFlowTable");
const ticketLoopKpiGrid = document.getElementById("ticketLoopKpiGrid");
const ticketLoopBoard = document.getElementById("ticketLoopBoard");
const ticketRevenueTable = document.getElementById("ticketRevenueTable");
const ticketChannelTable = document.getElementById("ticketChannelTable");
const ticketBranchTable = document.getElementById("ticketBranchTable");
const ticketSellerTable = document.getElementById("ticketSellerTable");
const ticketShieldKpiGrid = document.getElementById("ticketShieldKpiGrid");
const ticketShieldBoard = document.getElementById("ticketShieldBoard");
const nextTicketBoard = document.getElementById("nextTicketBoard");
const qrWorkflowContext = document.getElementById("qrWorkflowContext");
const qrWorkflowCampaignButton = document.getElementById("qrWorkflowCampaignButton");
const postSaleQrForm = document.getElementById("postSaleQrForm");
const postSaleCampaignInput = document.getElementById("postSaleCampaignInput");
const postSaleCampaignHelp = document.getElementById("postSaleCampaignHelp");
const postSaleAttributionSourceInput = document.getElementById("postSaleAttributionSourceInput");
const postSaleAttributionSubjectInput = document.getElementById("postSaleAttributionSubjectInput");
const postSaleAmountInput = document.getElementById("postSaleAmountInput");
const postSaleCurrencyInput = document.getElementById("postSaleCurrencyInput");
const postSaleProductInput = document.getElementById("postSaleProductInput");
const postSaleCustomerInput = document.getElementById("postSaleCustomerInput");
const postSaleDocumentInput = document.getElementById("postSaleDocumentInput");
const postSalePhoneInput = document.getElementById("postSalePhoneInput");
const postSaleEmailInput = document.getElementById("postSaleEmailInput");
const postSaleBenefitLabelInput = document.getElementById("postSaleBenefitLabelInput");
const postSaleBenefitTypeInput = document.getElementById("postSaleBenefitTypeInput");
const postSaleBenefitValueInput = document.getElementById("postSaleBenefitValueInput");
const postSaleExpiresModeInput = document.getElementById("postSaleExpiresModeInput");
const postSaleExpiresAtInput = document.getElementById("postSaleExpiresAtInput");
const postSaleNotesInput = document.getElementById("postSaleNotesInput");
const postSaleQrMessage = document.getElementById("postSaleQrMessage");
const postSaleQrResult = document.getElementById("postSaleQrResult");
const triviaLauncherForm = document.getElementById("triviaLauncherForm");
const activationTypeInput = document.getElementById("activationTypeInput");
const activationTypePicker = document.getElementById("activationTypePicker");
const triviaCampaignInput = document.getElementById("triviaCampaignInput");
const triviaCampaignHelp = document.getElementById("triviaCampaignHelp");
const triviaTitleInput = document.getElementById("triviaTitleInput");
const triviaDescriptionInput = document.getElementById("triviaDescriptionInput");
const triviaMaxWinnersInput = document.getElementById("triviaMaxWinnersInput");
const triviaBenefitLabelInput = document.getElementById("triviaBenefitLabelInput");
const triviaBenefitTypeInput = document.getElementById("triviaBenefitTypeInput");
const triviaBenefitValueInput = document.getElementById("triviaBenefitValueInput");
const triviaExpiresModeInput = document.getElementById("triviaExpiresModeInput");
const triviaExpiresAtInput = document.getElementById("triviaExpiresAtInput");
const triviaQuestionCountInput = document.getElementById("triviaQuestionCountInput");
const triviaBuilderHint = document.getElementById("triviaBuilderHint");
const triviaQuestionBuilder = document.getElementById("triviaQuestionBuilder");
const openQuestionInput = document.getElementById("openQuestionInput");
const openQuestionPlaceholderInput = document.getElementById("openQuestionPlaceholderInput");
const thermometerDiscountsInput = document.getElementById("thermometerDiscountsInput");
const minigameDurationInput = document.getElementById("minigameDurationInput");
const minigameMinScoreInput = document.getElementById("minigameMinScoreInput");
const minigameMaxScoreInput = document.getElementById("minigameMaxScoreInput");
const minigamePointsInput = document.getElementById("minigamePointsInput");
const minigamePenaltyInput = document.getElementById("minigamePenaltyInput");
const minigameLivesInput = document.getElementById("minigameLivesInput");
const minigameFireIntervalInput = document.getElementById("minigameFireIntervalInput");
const minigameParticipantCooldownInput = document.getElementById("minigameParticipantCooldownInput");
const minigameWinnerPolicyInput = document.getElementById("minigameWinnerPolicyInput");
const triviaLauncherMessage = document.getElementById("triviaLauncherMessage");
const triviaLauncherResult = document.getElementById("triviaLauncherResult");
const triviaLauncherTable = document.getElementById("triviaLauncherTable");
const productVoteImages = {};
const customerAcquisitionForm = document.getElementById("customerAcquisitionForm");
const customerAcquisitionAmountInput = document.getElementById("customerAcquisitionAmountInput");
const customerAcquisitionCurrencyInput = document.getElementById("customerAcquisitionCurrencyInput");
const customerAcquisitionProductInput = document.getElementById("customerAcquisitionProductInput");
const customerAcquisitionNameInput = document.getElementById("customerAcquisitionNameInput");
const customerAcquisitionDocumentInput = document.getElementById("customerAcquisitionDocumentInput");
const customerAcquisitionPhoneInput = document.getElementById("customerAcquisitionPhoneInput");
const customerAcquisitionEmailInput = document.getElementById("customerAcquisitionEmailInput");
const customerAcquisitionSourceInput = document.getElementById("customerAcquisitionSourceInput");
const customerAcquisitionChannelInput = document.getElementById("customerAcquisitionChannelInput");
const customerAcquisitionAffiliateInput = document.getElementById("customerAcquisitionAffiliateInput");
const customerAcquisitionNotesInput = document.getElementById("customerAcquisitionNotesInput");
const customerAcquisitionMessage = document.getElementById("customerAcquisitionMessage");
const qrBatchForm = document.getElementById("qrBatchForm");
const qrBatchCampaignInput = document.getElementById("qrBatchCampaignInput");
const qrBatchCampaignHelp = document.getElementById("qrBatchCampaignHelp");
const qrBatchAttributionSourceInput = document.getElementById("qrBatchAttributionSourceInput");
const qrBatchAttributionSubjectInput = document.getElementById("qrBatchAttributionSubjectInput");
const qrBatchNameInput = document.getElementById("qrBatchNameInput");
const qrBatchQuantityInput = document.getElementById("qrBatchQuantityInput");
const qrBatchChannelInput = document.getElementById("qrBatchChannelInput");
const qrBatchOriginTypeInput = document.getElementById("qrBatchOriginTypeInput");
const qrBatchBenefitLabelInput = document.getElementById("qrBatchBenefitLabelInput");
const qrBatchBenefitTypeInput = document.getElementById("qrBatchBenefitTypeInput");
const qrBatchBenefitValueInput = document.getElementById("qrBatchBenefitValueInput");
const qrBatchClaimRequiredInput = document.getElementById("qrBatchClaimRequiredInput");
const qrBatchExpiresModeInput = document.getElementById("qrBatchExpiresModeInput");
const qrBatchExpiresAtInput = document.getElementById("qrBatchExpiresAtInput");
const qrBatchNotesInput = document.getElementById("qrBatchNotesInput");
const qrBatchMessage = document.getElementById("qrBatchMessage");
const qrBatchProgress = document.getElementById("qrBatchProgress");
const qrBatchProgressEyebrow = document.getElementById("qrBatchProgressEyebrow");
const qrBatchProgressTitle = document.getElementById("qrBatchProgressTitle");
const qrBatchProgressPercent = document.getElementById("qrBatchProgressPercent");
const qrBatchProgressFill = document.getElementById("qrBatchProgressFill");
const qrBatchProgressMessage = document.getElementById("qrBatchProgressMessage");
const qrBatchResult = document.getElementById("qrBatchResult");
const qrBatchTable = document.getElementById("qrBatchTable");
const strategicQrHistoryTable = document.getElementById("strategicQrHistoryTable");
const qrCreditCheckoutForm = document.getElementById("qrCreditCheckoutForm");
const qrCreditPackageSelect = document.getElementById("qrCreditPackageSelect");
const qrCreditCheckoutButton = document.getElementById("qrCreditCheckoutButton");
const qrCreditCheckoutStatus = document.getElementById("qrCreditCheckoutStatus");
const qrCreditCheckoutMessage = document.getElementById("qrCreditCheckoutMessage");
const qrCreditOrdersTable = document.getElementById("qrCreditOrdersTable");
const subscriptionPricingNote = document.getElementById("subscriptionPricingNote");
const subscriptionPlansGrid = document.getElementById("subscriptionPlansGrid");
const accountBillingStatus = document.getElementById("accountBillingStatus");
const accountOpenQrShopButton = document.getElementById("accountOpenQrShopButton");
const subscriptionRenewalForm = document.getElementById("subscriptionRenewalForm");
const subscriptionRenewalPlanSelect = document.getElementById("subscriptionRenewalPlanSelect");
const subscriptionRenewalButton = document.getElementById("subscriptionRenewalButton");
const subscriptionAutoRenewButton = document.getElementById("subscriptionAutoRenewButton");
const subscriptionAutoRenewStatus = document.getElementById("subscriptionAutoRenewStatus");
const subscriptionAutoRenewClarity = document.getElementById("subscriptionAutoRenewClarity");
const subscriptionRenewalMessage = document.getElementById("subscriptionRenewalMessage");
const subscriptionTiming = document.getElementById("subscriptionTiming");
const navButtons = Array.from(document.querySelectorAll(".nav-item"));
const viewSections = Array.from(document.querySelectorAll(".view-section"));
const segmentTabs = Array.from(document.querySelectorAll(".segment-tab"));
const businessTrendChart = document.getElementById("businessTrendChart");
const cacTrendChart = document.getElementById("cacTrendChart");
const hourlyOperationsChart = document.getElementById("hourlyOperationsChart");
const weekdayPerformanceChart = document.getElementById("weekdayPerformanceChart");
const qrStatusChart = document.getElementById("qrStatusChart");
const campaignPerformanceChart = document.getElementById("campaignPerformanceChart");
const rewardMixChart = document.getElementById("rewardMixChart");
const paymentMethodChart = document.getElementById("paymentMethodChart");
const campaignTimelineChart = document.getElementById("campaignTimelineChart");
const geoBranchBoard = document.getElementById("geoBranchBoard");
const dashboardInsightTitle = document.getElementById("dashboardInsightTitle");
const dashboardInsightButton = document.getElementById("dashboardInsightButton");
const dashboardNarrativeTitle = document.getElementById("dashboardNarrativeTitle");
const dashboardNarrativeText = document.getElementById("dashboardNarrativeText");
const dashboardFunnelHelp = document.getElementById("dashboardFunnelHelp");
const dashboardHealthText = document.getElementById("dashboardHealthText");
const campaignAnalysisTitle = document.getElementById("campaignAnalysisTitle");
const campaignAnalysisText = document.getElementById("campaignAnalysisText");
const campaignEconomicsText = document.getElementById("campaignEconomicsText");
const campaignActionText = document.getElementById("campaignActionText");
const campaignModal = document.getElementById("campaignModal");
const campaignModalMode = document.getElementById("campaignModalMode");
const campaignModalTitle = document.getElementById("campaignModalTitle");
const campaignModalForm = document.getElementById("campaignModalForm");
const closeCampaignModalButton = document.getElementById("closeCampaignModalButton");
const cancelCampaignModalButton = document.getElementById("cancelCampaignModalButton");
const campaignModalMessage = document.getElementById("campaignModalMessage");
const campaignFormName = document.getElementById("campaignFormName");
const campaignFormSlug = document.getElementById("campaignFormSlug");
const campaignFormType = document.getElementById("campaignFormType");
const campaignFormStatus = document.getElementById("campaignFormStatus");
const campaignFormObjective = document.getElementById("campaignFormObjective");
const campaignFormStrategy = document.getElementById("campaignFormStrategy");
const campaignFormBudget = document.getElementById("campaignFormBudget");
const campaignFormGoal = document.getElementById("campaignFormGoal");
const campaignFormLeadsGoal = document.getElementById("campaignFormLeadsGoal");
const campaignFormRedemptionsGoal = document.getElementById("campaignFormRedemptionsGoal");
const campaignFormStartsAt = document.getElementById("campaignFormStartsAt");
const campaignFormEndsAt = document.getElementById("campaignFormEndsAt");
const campaignFormLaunchChannels = document.getElementById("campaignFormLaunchChannels");
const campaignFormClientNotes = document.getElementById("campaignFormClientNotes");
const campaignFormLandingUrl = document.getElementById("campaignFormLandingUrl");
const campaignFormValidatorUrl = document.getElementById("campaignFormValidatorUrl");
const campaignFormGameUrl = document.getElementById("campaignFormGameUrl");
const campaignFormPrimaryLink = document.getElementById("campaignFormPrimaryLink");
const campaignFormQrLandingUrl = document.getElementById("campaignFormQrLandingUrl");
const campaignFormAssetNotes = document.getElementById("campaignFormAssetNotes");
const snapshotModal = document.getElementById("snapshotModal");
const closeSnapshotModalButton = document.getElementById("closeSnapshotModalButton");
const cancelSnapshotModalButton = document.getElementById("cancelSnapshotModalButton");
const snapshotModalForm = document.getElementById("snapshotModalForm");
const snapshotPeriodTypeInput = document.getElementById("snapshotPeriodTypeInput");
const snapshotSalesAmountInput = document.getElementById("snapshotSalesAmountInput");
const snapshotStartDateInput = document.getElementById("snapshotStartDateInput");
const snapshotEndDateInput = document.getElementById("snapshotEndDateInput");
const snapshotOrdersInput = document.getElementById("snapshotOrdersInput");
const snapshotNotesInput = document.getElementById("snapshotNotesInput");
const snapshotModalMessage = document.getElementById("snapshotModalMessage");
const routeParams = new URLSearchParams(window.location.search);
const LIGHT_MODE_KEY = "marketgames_portal_light_mode";
const routeLightMode = ["1", "true", "yes"].includes(String(routeParams.get("lite") || "").toLowerCase());
const routeDisableLightMode = ["0", "false", "no", "off"].includes(String(routeParams.get("lite") || "").toLowerCase());
if (routeLightMode) {
  try {
    window.localStorage.setItem(LIGHT_MODE_KEY, "1");
  } catch {
    // Ignore storage failures; the query param still activates light mode for this load.
  }
} else if (routeDisableLightMode) {
  try {
    window.localStorage.removeItem(LIGHT_MODE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
const lightTestMode = routeLightMode || (() => {
  if (routeDisableLightMode) return false;
  try {
    return window.localStorage.getItem(LIGHT_MODE_KEY) === "1";
  } catch {
    return false;
  }
})();

let session = loadSession();
let state = {
  currentView: "dashboard",
  ticketCenterTab: "center",
  filter: "",
  dashboard: null,
  activityVersion: "",
  activityPollingTimer: 0,
  activityRefreshInFlight: false,
  commandCenter: null,
  commandCenterFilters: {
    range: "30d",
    startDate: "",
    endDate: "",
    campaignId: "",
    channel: "",
    branchId: "",
    qrStatus: "",
    qrType: "",
    sellerId: "",
    affiliateId: "",
    comparePrevious: true,
    matrixMetric: "revenue",
    tableSearch: "",
    tableSort: "revenue",
    expandedCampaignId: "",
  },
  chartFocus: {
    open: false,
    chartId: "",
    tab: "summary",
    context: {},
    presentation: false,
    savedScrollY: 0,
    deepLinkHandled: false,
    sourceRect: null,
    originLabel: "",
    journeyMode: false,
    journeyStep: 0,
    direction: 0,
  },
  summary: null,
  businessProfile: null,
  subscription: null,
  access: null,
  businessUsers: [],
  campaignGroups: null,
  campaigns: [],
  adminCampaigns: [],
  affiliates: [],
  rewardPasses: [],
  rewardPassMetrics: null,
  rewardPassContext: null,
  selectedRewardPassId: null,
  selectedRewardPass: null,
  selectedCampaignId: null,
  selectedCampaign: null,
  selectedReport: null,
  selectedLeads: [],
  contactFeed: [],
  contactFeedRetention: null,
  contactFeedGate: null,
  contactFeedLoaded: false,
  selectedRedemptions: [],
  selectedSales: [],
  selectedAffiliateId: null,
  selectedAffiliate: null,
  selectedAffiliateLedger: [],
  affiliateScannerStream: null,
  affiliateScannerLoopHandle: 0,
  affiliateScannerCanvas: document.createElement("canvas"),
  affiliateScannerContext: null,
  affiliateScannerLastValue: "",
  affiliateScannerLastAt: 0,
  campaignModalMode: "edit",
  campaignModalInitialSnapshot: null,
  rangeDays: 30,
  validatorDetector: null,
  validatorStream: null,
  validatorScanLoopHandle: 0,
  validatorScanning: false,
  validatorScannerMode: "none",
  validatorScanCanvas: document.createElement("canvas"),
  validatorScanContext: null,
  validatorLastToken: "",
  validatorLastValidation: null,
  validatorLastRedemption: null,
  validatorLastScanValue: "",
  validatorLastScanAt: 0,
  snapshotEditingId: null,
  adminSelectedCampaignId: null,
  adminSelectedCampaign: null,
  adminSelectedReport: null,
  strategicQrMetrics: null,
  qrCreditAccount: null,
  qrPackageOffers: [],
  subscriptionPlans: [],
  prepaidReference: [],
  pricing: {
    display_currency: "COP",
    payment_currency: "COP",
  },
  qrCreditOrders: [],
  strategicQrBatches: [],
  strategicQrHistory: [],
  triviaLaunchers: [],
  affiliatesLoaded: false,
  strategicQrLoaded: false,
  ticketCenterLoadedAt: {},
  ticketCenterLoading: false,
  strategicQrRecentBatchId: null,
  qrBatchProgressTimer: null,
  feedbackTimer: 0,
  busyDepth: 0,
  loadedBusinessId: null,
  workspaceLoadSeq: 0,
};

const TICKET_CENTER_CACHE_TTL_MS = 60 * 1000;
const TICKET_CENTER_GROUPS = ["core", "metrics", "batches", "history", "activations", "affiliates"];
const TICKET_CENTER_TAB_GROUPS = {
  center: ["core", "metrics", "batches", "history"],
  trivia: ["activations"],
  flow: ["metrics", "batches", "history"],
  loop: ["metrics", "batches", "history"],
  revenue: ["metrics", "batches", "history"],
  channels: ["metrics", "batches", "history"],
  branches: ["metrics", "batches", "history"],
  sellers: ["metrics", "batches", "history"],
  shield: ["metrics", "batches", "history"],
  next: ["metrics", "batches", "history"],
};

function mergeBusinessProfile(nextProfile) {
  if (!nextProfile) {
    return state.businessProfile || null;
  }
  const existingLogo = state.businessProfile?.logo_data_url
    || session?.user?.business?.logo_data_url
    || session?.user?.business?.settings?.logo_data_url
    || "";
  const existingTicketFrame = state.businessProfile?.ticket_frame_data_url
    || session?.user?.business?.ticket_frame_data_url
    || session?.user?.business?.settings?.ticket_frame_data_url
    || "";
  const merged = {
    ...(state.businessProfile || {}),
    ...nextProfile,
  };
  if (!merged.logo_data_url && existingLogo && merged.has_logo_data_url !== false) {
    merged.logo_data_url = existingLogo;
  }
  if (!merged.ticket_frame_data_url && existingTicketFrame && merged.has_ticket_frame_data_url !== false) {
    merged.ticket_frame_data_url = existingTicketFrame;
  }
  state.businessProfile = merged;
  if (session?.user?.business) {
    session.user.business = {
      ...session.user.business,
      name: merged.name || session.user.business.name,
      logo_data_url: merged.logo_data_url || "",
      ticket_frame_data_url: merged.ticket_frame_data_url || "",
      settings: {
        ...(session.user.business.settings || {}),
        logo_data_url: merged.logo_data_url || "",
        ticket_frame_data_url: merged.ticket_frame_data_url || "",
      },
    };
  }
  return merged;
}

const chartTooltip = document.createElement("div");
chartTooltip.className = "chart-tooltip hidden";
document.body.appendChild(chartTooltip);

const chartFocusRoot = document.createElement("div");
chartFocusRoot.className = "chart-focus-root hidden";
chartFocusRoot.setAttribute("aria-live", "polite");
document.body.appendChild(chartFocusRoot);

const chartHoverRegistry = new WeakMap();

const ACQUISITION_SOURCE_LABELS = {
  STORE_WALK_IN: "Vio el almacen",
  FRIEND_REFERRAL: "Recomendacion",
  FAIR_EVENT: "Feria o evento",
  INTERNET_SEARCH: "Internet / buscador",
  SOCIAL_MEDIA: "Redes sociales",
  PAID_ADS: "Pauta digital",
  QR_SCAN: "Ticket / pieza impresa",
  OTHER: "Otro",
};

const COMMAND_CENTER_RANGE_LABELS = {
  today: "Hoy",
  "7d": "7 dias",
  "30d": "30 dias",
  current_month: "Mes actual",
  previous_month: "Mes anterior",
  custom: "Personalizado",
};

const MOTION_TOKENS = {
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.55,
    focus: 0.65,
  },
  ease: {
    premiumOut: [0.16, 1, 0.3, 1],
    premiumInOut: [0.65, 0, 0.35, 1],
  },
  spring: {
    soft: { type: "spring", stiffness: 180, damping: 26, mass: 0.9 },
    focus: { type: "spring", stiffness: 120, damping: 24, mass: 1 },
  },
};

const DATA_DICTIONARY = {
  lead: { name: "Lead", description: "Persona capturada por una campana, ticket, formulario o canal comercial.", formula: "Conteo de registros de clientes potenciales asociados al negocio.", example: "Un cliente deja nombre y telefono despues de escanear un ticket.", decision: "Si suben los leads pero no las ventas, refuerza seguimiento y oferta." },
  qr_generated: { name: "Ticket generado", description: "Codigo creado para activar, reclamar, redimir o rastrear una estrategia RMS.", formula: "Conteo de tickets creados en el periodo filtrado.", example: "50 tickets impresos para una feria o volante.", decision: "Si hay muchos tickets sin redimir, crea urgencia o mejora el beneficio." },
  active_qr: { name: "Ticket activo", description: "Ticket disponible para uso, reclamo o redencion.", formula: "Ticket con estado activo y vigencia util.", example: "Beneficios listos para validar en tienda.", decision: "Activa recordatorios si se acumulan Ticket activos sin redencion." },
  redeemed_qr: { name: "Ticket redimido", description: "Ticket usado por un cliente y validado por el negocio.", formula: "Conteo de redenciones confirmadas.", example: "Cliente llega a tienda y valida su beneficio.", decision: "Cruza redenciones con ventas para medir revenue real." },
  expired_qr: { name: "Ticket vencido", description: "Ticket que ya no puede usarse por fecha o estado.", formula: "Conteo de tickets con estado vencido o fecha expirada.", example: "Beneficio no reclamado antes del limite.", decision: "Reduce vigencia o envia recordatorios antes del vencimiento." },
  redemption_rate: { name: "Tasa de redencion", description: "Mide cuantos tickets generados terminaron siendo usados.", formula: "Tickets redimidos / tickets generados.", example: "20 redenciones sobre 100 tickets = 20%.", decision: "Si es baja, revisa beneficio, urgencia, canal y entrenamiento del equipo." },
  conversion_rate: { name: "Tasa de conversion", description: "Mide cuantas oportunidades terminaron en venta registrada.", formula: "Ventas registradas / leads o redenciones, segun el contexto.", example: "10 ventas sobre 100 leads = 10%.", decision: "Si baja, revisa cierre comercial, oferta y seguimiento." },
  revenue: { name: "Revenue atribuido", description: "Ingreso registrado y conectado a campanas, tickets, canales o ventas RMS.", formula: "Suma de ventas atribuidas al periodo y filtros activos.", example: "$2.500.000 vendidos por una campana de Instagram.", decision: "Escala lo que produce revenue, no solo lo que produce trafico." },
  avg_ticket: { name: "Ticket promedio", description: "Valor promedio de compra por venta registrada.", formula: "Revenue atribuido / ventas registradas.", example: "$1.000.000 / 5 ventas = $200.000.", decision: "Canales de menor volumen pueden valer mas si traen ticket alto." },
  cac: { name: "CAC", description: "Costo estimado de adquirir una venta o cliente.", formula: "Inversion atribuida / ventas registradas.", example: "$300.000 de pauta / 10 ventas = $30.000 por venta.", decision: "Si el CAC supera el margen, optimiza canal, incentivo o segmentacion." },
  roi: { name: "ROI", description: "Retorno estimado de la inversion de marketing.", formula: "(Revenue - inversion) / inversion.", example: "$1.200.000 de revenue con $300.000 de inversion = 3x.", decision: "Repite y escala campanas con ROI positivo y datos confiables." },
  channel: { name: "Canal de llegada", description: "Origen por donde el cliente llego o compro.", formula: "Clasificacion de leads, tickets, redenciones o ventas por fuente.", example: "Instagram, referidos, vitrina, feria o ticket fisico.", decision: "Compara canales por revenue, no solo por volumen." },
  affiliate: { name: "Afiliado", description: "Persona que recomienda y genera compras medibles con tickets o referidos.", formula: "Afiliados activos y ventas asociadas a su recomendacion.", example: "Un cliente compra por ticket de un afiliado.", decision: "Premia afiliados con alto ticket y entregales mas tickets." },
  branch: { name: "Sucursal", description: "Punto fisico o sede donde se redime, vende o atiende.", formula: "Agrupacion de redenciones y ventas por branch_id.", example: "Sucursal Norte convierte mejor que Centro.", decision: "Replica practicas de la sede lider y capacita sedes rezagadas." },
  campaign: { name: "Campana", description: "Estrategia comercial o promocional conectada a tickets, leads y revenue.", formula: "Datos agrupados por campaign_id.", example: "Feria Junio, Lanzamiento postventa o pauta Instagram.", decision: "Escala campanas con conversion y revenue; optimiza las de solo leads." },
  mg_score: { name: "MG Revenue Score", description: "Score de salud comercial que resume redencion, conversion, revenue, referidos, sucursales y calidad de datos.", formula: "Promedio ponderado de dimensiones RMS normalizadas de 0 a 100.", example: "82/100 indica buena salud con oportunidades puntuales.", decision: "Usa las dimensiones bajas para priorizar la siguiente mejora." },
};

const CHART_FOCUS_REGISTRY = {
  "executive-summary": { title: "Modo ejecutivo RMS", subtitle: "Resumen para socios y decisiones rapidas", chartType: "summary", primaryMetric: "revenue", description: "Resume revenue, canal ganador, campana ganadora, sucursal lider y riesgo principal.", calculation: "Combina KPIs y rankings del periodo filtrado.", businessMeaning: "Permite explicar en una reunion que estrategia trajo ventas reales.", recommendedActions: ["Presenta este resumen en comite comercial.", "Abre el detalle del canal o campana ganadora.", "Convierte el riesgo principal en tarea operativa."], supportedDrilldowns: ["campaign", "channel", "branch"], relatedMetrics: ["revenue", "conversion_rate", "avg_ticket"], dataDictionaryKeys: ["revenue", "channel", "campaign", "branch"] },
  "rms-funnel": { title: "Funnel RMS", subtitle: "De campana a revenue", chartType: "funnel", primaryMetric: "conversion_rate", description: "Muestra como avanzan las personas desde la campana hasta la venta.", calculation: "Cuenta etapas del flujo: leads, tickets generados, reclamados, redimidos, ventas y revenue.", businessMeaning: "Permite detectar donde se pierde valor comercial.", recommendedActions: ["Si hay muchos leads y pocos tickets, revisa captura.", "Si hay muchos tickets y pocas redenciones, crea urgencia.", "Si hay redenciones sin venta, revisa oferta o cierre en tienda."], supportedDrilldowns: ["stage", "campaign", "channel", "branch"], relatedMetrics: ["lead", "qr_generated", "redeemed_qr", "revenue"], dataDictionaryKeys: ["lead", "qr_generated", "redemption_rate", "conversion_rate", "revenue"] },
  "revenue-score": { title: "MG Revenue Score", subtitle: "Salud comercial del RMS", chartType: "radar", primaryMetric: "mg_score", description: "Evalua dimensiones comerciales clave en una escala de 0 a 100.", calculation: "Promedia dimensiones normalizadas de captacion, redencion, conversion, revenue, fidelizacion, referidos, sucursales y calidad de datos.", businessMeaning: "Convierte muchos indicadores en una lectura ejecutiva accionable.", recommendedActions: ["Ataca primero la dimension con menor score.", "Usa el radar para explicar fortalezas y riesgos.", "Compara contra el periodo anterior despues de cada ajuste."], supportedDrilldowns: ["dimension"], relatedMetrics: ["mg_score", "redemption_rate", "conversion_rate", "revenue"], dataDictionaryKeys: ["mg_score", "redemption_rate", "conversion_rate", "revenue"] },
  timeline: { title: "Linea temporal multiserie", subtitle: "Leads, tickets, redenciones, ventas y revenue por fecha", chartType: "line", primaryMetric: "revenue", description: "Muestra la evolucion del ciclo RMS en el tiempo.", calculation: "Agrupa eventos por dia dentro del periodo filtrado.", businessMeaning: "Ayuda a detectar dias fuertes, caidas y anomalias.", recommendedActions: ["Investiga picos y caidas.", "Replica los dias con mayor conversion.", "Cruza con activaciones comerciales o eventos."], supportedDrilldowns: ["date", "metric"], relatedMetrics: ["lead", "qr_generated", "redeemed_qr", "revenue"], dataDictionaryKeys: ["lead", "qr_generated", "redeemed_qr", "revenue"] },
  heatmap: { title: "Heatmap horario", subtitle: "Redenciones por dia y hora", chartType: "heatmap", primaryMetric: "redemptions", description: "Muestra cuando se concentran las redenciones.", calculation: "Cuenta redenciones por dia de semana y hora.", businessMeaning: "Sirve para reforzar equipo, horarios y activaciones.", recommendedActions: ["Refuerza vendedores en horas calientes.", "Activa recordatorios antes de los mejores bloques.", "Compara sucursales si una hora convierte mejor."], supportedDrilldowns: ["weekday", "hour"], relatedMetrics: ["redeemed_qr", "branch", "conversion_rate"], dataDictionaryKeys: ["redeemed_qr", "branch", "conversion_rate"] },
  matrix: { title: "Matriz campana vs canal", subtitle: "Cruce exacto entre estrategia y fuente", chartType: "matrix", primaryMetric: "revenue", description: "Cruza campanas con canales para encontrar combinaciones rentables.", calculation: "Agrupa leads, tickets, redenciones, ventas y revenue por campana y canal.", businessMeaning: "Identifica que combinacion merece repetirse, optimizarse o pausarse.", recommendedActions: ["Escala celdas con revenue alto.", "Optimiza celdas con leads pero baja venta.", "Investiga celdas vacias con gasto o esfuerzo comercial."], supportedDrilldowns: ["campaign", "channel", "metric"], relatedMetrics: ["campaign", "channel", "revenue", "conversion_rate"], dataDictionaryKeys: ["campaign", "channel", "revenue", "conversion_rate"] },
  treemap: { title: "Treemap de revenue por canal", subtitle: "Canales que aportan ingreso real", chartType: "treemap", primaryMetric: "revenue", description: "Dimensiona los canales segun el revenue atribuido.", calculation: "Suma ventas registradas por canal de llegada.", businessMeaning: "Diferencia canales de ruido contra canales que compran.", recommendedActions: ["Escala el canal con mejor revenue y conversion.", "No descartes canales chicos si tienen ticket alto.", "Completa origen de ventas para mejorar la lectura."], supportedDrilldowns: ["channel"], relatedMetrics: ["channel", "revenue", "avg_ticket", "roi"], dataDictionaryKeys: ["channel", "revenue", "avg_ticket", "roi"] },
  "campaign-comparison": { title: "Campanas comparadas", subtitle: "Leads, tickets, redenciones, ventas y revenue", chartType: "bar", primaryMetric: "revenue", description: "Compara campanas por impacto comercial.", calculation: "Agrupa metricas RMS por campana y las ordena por desempeno.", businessMeaning: "Permite decidir que campana repetir, escalar, optimizar o pausar.", recommendedActions: ["Abre la campana ganadora y replica su canal.", "Optimiza campanas con leads sin ventas.", "Pausa campanas sin revenue ni conversion."], supportedDrilldowns: ["campaign"], relatedMetrics: ["campaign", "lead", "redeemed_qr", "revenue"], dataDictionaryKeys: ["campaign", "lead", "redeemed_qr", "revenue", "roi"] },
  sankey: { title: "Sankey RMS", subtitle: "Flujo de atribucion", chartType: "sankey", primaryMetric: "revenue", description: "Conecta canal, campana, ticket/redencion, venta y revenue.", calculation: "Construye enlaces agregados desde origen hasta venta registrada.", businessMeaning: "Explica como se mueve el valor dentro del RMS.", recommendedActions: ["Haz foco en enlaces con mayor salida a ventas.", "Investiga nodos con mucho volumen y baja continuidad.", "Aplica filtro global sobre el nodo mas rentable."], supportedDrilldowns: ["node", "channel", "campaign"], relatedMetrics: ["channel", "campaign", "revenue"], dataDictionaryKeys: ["channel", "campaign", "redeemed_qr", "revenue"] },
  "affiliate-network": { title: "Red de afiliados y referidos", subtitle: "Voz a voz medible", chartType: "network", primaryMetric: "revenue", description: "Muestra afiliados como nodos conectados al negocio.", calculation: "Agrupa actividad, puntos, compras y revenue por afiliado.", businessMeaning: "Detecta quienes recomiendan clientes que compran.", recommendedActions: ["Premia afiliados con alto revenue.", "Genera mas tickets para afiliados activos.", "Reactiva afiliados sin ultima actividad."], supportedDrilldowns: ["affiliate"], relatedMetrics: ["affiliate", "revenue", "avg_ticket"], dataDictionaryKeys: ["affiliate", "revenue", "avg_ticket"] },
  "branch-ranking": { title: "Ranking de sucursales", subtitle: "Redenciones, ventas, revenue y conversion", chartType: "ranking", primaryMetric: "revenue", description: "Compara sedes por ejecucion comercial.", calculation: "Agrupa redenciones y ventas por sucursal.", businessMeaning: "Muestra que sede convierte mejor y donde hay oportunidad operativa.", recommendedActions: ["Replica practicas de la sucursal lider.", "Capacita sedes con redenciones sin ventas.", "Filtra por sucursal para ver detalles."], supportedDrilldowns: ["branch"], relatedMetrics: ["branch", "redeemed_qr", "revenue", "conversion_rate"], dataDictionaryKeys: ["branch", "redeemed_qr", "revenue", "conversion_rate"] },
  "qr-status": { title: "Estados de tickets", subtitle: "Activos, redimidos, vencidos y reclamados", chartType: "donut", primaryMetric: "qr_generated", description: "Muestra la salud operativa del inventario de tickets.", calculation: "Cuenta tickets agrupados por estado.", businessMeaning: "Ayuda a detectar oportunidad perdida o beneficios no usados.", recommendedActions: ["Si hay muchos vencidos, mejora recordatorios.", "Si hay muchos activos, crea urgencia.", "Si hay pocos redimidos, revisa beneficio y canal."], supportedDrilldowns: ["status"], relatedMetrics: ["qr_generated", "active_qr", "redeemed_qr", "expired_qr"], dataDictionaryKeys: ["qr_generated", "active_qr", "redeemed_qr", "expired_qr"] },
  scatter: { title: "Scatter de campanas", subtitle: "Inversion o tickets vs revenue", chartType: "scatter", primaryMetric: "roi", description: "Ubica campanas segun esfuerzo y resultado.", calculation: "Eje X usa inversion o tickets generados; eje Y usa revenue o ventas; tamano usa leads.", businessMeaning: "Encuentra campanas sanas, costosas o escalables.", recommendedActions: ["Escala puntos con alto revenue y bajo esfuerzo.", "Optimiza puntos con muchos leads y poco revenue.", "Investiga campanas sin datos completos."], supportedDrilldowns: ["campaign"], relatedMetrics: ["campaign", "qr_generated", "revenue", "roi"], dataDictionaryKeys: ["campaign", "qr_generated", "revenue", "roi"] },
  waterfall: { title: "Waterfall de revenue", subtitle: "Composicion del ingreso", chartType: "waterfall", primaryMetric: "revenue", description: "Muestra como se compone el revenue total por canales principales.", calculation: "Parte de revenue total y desglosa contribuciones por canal.", businessMeaning: "Explica de donde viene el dinero de forma ejecutiva.", recommendedActions: ["Prioriza los canales con mayor contribucion.", "Completa ventas sin origen.", "Compara canales con ticket alto."], supportedDrilldowns: ["channel"], relatedMetrics: ["revenue", "channel", "avg_ticket"], dataDictionaryKeys: ["revenue", "channel", "avg_ticket"] },
  cohorts: { title: "Cohort postventa", subtitle: "Recompra y ticket postventa", chartType: "cohort", primaryMetric: "retention", description: "Mide si las ventas generan nuevas visitas o recompras.", calculation: "Agrupa compras por cohorte y cuenta ticket postventa generados y redimidos.", businessMeaning: "Indica si el RMS crea fidelizacion despues de la primera compra.", recommendedActions: ["Crea ticket postventa para compradores recientes.", "Escala beneficios que traen recompra.", "Mide cohortes por mes para ver retencion."], supportedDrilldowns: ["cohort"], relatedMetrics: ["revenue", "redeemed_qr", "avg_ticket"], dataDictionaryKeys: ["revenue", "redeemed_qr", "avg_ticket"] },
  "power-table": { title: "Tabla PowerBI-style", subtitle: "Drill-down por campana", chartType: "table", primaryMetric: "revenue", description: "Tabla ejecutiva para ordenar, buscar y abrir detalle por campana.", calculation: "Une KPIs de campana con canal dominante, CAC, ROI, conversion y decision sugerida.", businessMeaning: "Convierte la data en una lista de prioridades comerciales.", recommendedActions: ["Ordena por revenue para repetir.", "Ordena por conversion para escalar.", "Ordena por ROI para optimizar inversion."], supportedDrilldowns: ["campaign", "channel"], relatedMetrics: ["campaign", "revenue", "roi", "conversion_rate"], dataDictionaryKeys: ["campaign", "channel", "revenue", "cac", "roi", "conversion_rate"] },
};

function commandCenterDateRange(range = state.commandCenterFilters.range) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (range === "today") {
    return { startDate: now.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) };
  }
  if (range === "7d") {
    start.setDate(now.getDate() - 6);
  } else if (range === "current_month") {
    start.setDate(1);
  } else if (range === "previous_month") {
    start.setMonth(now.getMonth() - 1, 1);
    end.setDate(0);
  } else if (range === "custom") {
    return {
      startDate: state.commandCenterFilters.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      endDate: state.commandCenterFilters.endDate || now.toISOString().slice(0, 10),
    };
  } else {
    start.setDate(now.getDate() - 29);
  }
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

function commandCenterQueryString() {
  const params = new URLSearchParams();
  const dates = commandCenterDateRange();
  params.set("startDate", dates.startDate);
  params.set("endDate", dates.endDate);
  [
    "campaignId",
    "channel",
    "branchId",
    "qrStatus",
    "qrType",
    "sellerId",
    "affiliateId",
  ].forEach((key) => {
    if (state.commandCenterFilters[key]) params.set(key, state.commandCenterFilters[key]);
  });
  params.set("comparePrevious", String(Boolean(state.commandCenterFilters.comparePrevious)));
  return params.toString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeJwtPayload(token) {
  try {
    const payload = String(token || "").split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function sessionExpiresAt(value) {
  const explicit = value?.session?.expires_at || value?.expires_at;
  if (explicit) return new Date(explicit).getTime();
  const decoded = decodeJwtPayload(value?.token);
  return decoded?.exp ? decoded.exp * 1000 : 0;
}

function isSessionExpired(value, skewMs = 30_000) {
  const expiresAt = sessionExpiresAt(value);
  return Boolean(expiresAt && Date.now() + skewMs >= expiresAt);
}

function normalizeSession(value) {
  if (!value?.token || !value?.user) return null;
  const decoded = decodeJwtPayload(value.token);
  const expiresAt = value.session?.expires_at
    || (decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null);
  return {
    ...value,
    session: {
      token_type: "Bearer",
      ...(value.session || {}),
      expires_at: expiresAt,
    },
    saved_at: value.saved_at || new Date().toISOString(),
  };
}

function loadSession() {
  try {
    const rawSession = localStorage.getItem(SESSION_KEY);
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    if (rawSession && storedVersion !== APP_VERSION) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(VALIDATOR_SESSION_KEY);
      localStorage.setItem(APP_UPDATE_NOTICE_KEY, "Actualizamos el portal. Por seguridad cerramos tu sesion anterior; inicia sesion de nuevo para cargar la version vigente.");
      localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
      return null;
    }
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    const parsed = normalizeSession(JSON.parse(rawSession));
    if (parsed && isSessionExpired(parsed, 0)) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(VALIDATOR_SESSION_KEY);
      localStorage.setItem(APP_UPDATE_NOTICE_KEY, "Tu sesion expiro. Inicia sesion de nuevo para continuar.");
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveSession(value) {
  const nextSession = normalizeSession(value);
  const identityChanged = !session
    || session.user?.id !== nextSession?.user?.id
    || session.user?.business_id !== nextSession?.user?.business_id;
  if (identityChanged) {
    resetBusinessScopedState({ session: nextSession });
  }
  session = nextSession;
  localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
  localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
}

function saveValidatorSession(value) {
  localStorage.setItem(VALIDATOR_SESSION_KEY, JSON.stringify(normalizeSession(value)));
}

function clearSession() {
  stopActivityPolling();
  resetBusinessScopedState({ session: null });
  session = null;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(VALIDATOR_SESSION_KEY);
}

function consumeAppUpdateNotice() {
  try {
    const notice = localStorage.getItem(APP_UPDATE_NOTICE_KEY) || "";
    if (notice) localStorage.removeItem(APP_UPDATE_NOTICE_KEY);
    return notice;
  } catch {
    return "";
  }
}

function forceLoginAfterSessionIssue(message) {
  clearSession();
  try {
    localStorage.setItem(APP_UPDATE_NOTICE_KEY, message || "Tu sesion debe actualizarse. Inicia sesion de nuevo.");
  } catch {
    // The login panel still renders even if storage is unavailable.
  }
  renderShell();
}

function assertActiveSession() {
  if (!session?.token) {
    throw new Error("Debes iniciar sesion.");
  }
  if (isSessionExpired(session)) {
    forceLoginAfterSessionIssue("Tu sesion expiro. Inicia sesion de nuevo para continuar.");
    throw new Error("Sesion expirada.");
  }
}

function isAdmin() {
  return ["ADMIN", "ADMIN_MARKET_GAMES"].includes(session?.user?.role);
}

function hideFeedback() {
  window.clearTimeout(state.feedbackTimer);
  actionFeedback.classList.add("hidden");
  actionFeedback.className = "action-feedback hidden";
  actionFeedback.innerHTML = "";
}

function syncPasswordRevealButton(button, input) {
  const isVisible = input.type === "text";
  const icon = button.querySelector(".material-symbols-outlined");
  button.setAttribute("aria-pressed", String(isVisible));
  button.setAttribute("aria-label", isVisible ? "Ocultar password" : "Mostrar password");
  button.title = isVisible ? "Ocultar password" : "Mostrar password";
  if (icon) icon.textContent = isVisible ? "visibility_off" : "visibility";
}

function togglePasswordVisibility(button) {
  const inputId = button.dataset.passwordToggle;
  const input = inputId ? document.getElementById(inputId) : null;
  if (!input) return;

  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;
  input.type = input.type === "password" ? "text" : "password";
  syncPasswordRevealButton(button, input);
  input.focus({ preventScroll: true });
  if (Number.isInteger(selectionStart) && Number.isInteger(selectionEnd)) {
    input.setSelectionRange(selectionStart, selectionEnd);
  }
}

function setupPasswordRevealButtons() {
  passwordRevealButtons.forEach((button) => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;
    syncPasswordRevealButton(button, input);
    button.addEventListener("click", () => togglePasswordVisibility(button));
  });
}

function readPreferredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyPortalTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  if (themeSwitch) themeSwitch.checked = nextTheme === "light";
  if (themeSwitchLabel) themeSwitchLabel.textContent = nextTheme === "light" ? "Claro" : "Oscuro";
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", nextTheme === "light" ? "#f7faf9" : "#073b4c");
  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch {
    // Preference persistence is optional; the UI can still switch for this session.
  }
}

function togglePortalTheme() {
  applyPortalTheme(themeSwitch?.checked ? "light" : "dark");
  showFeedback(`Perfil ${themeSwitch?.checked ? "claro" : "oscuro"} activado.`, "info");
}

function showFeedback(message, kind = "success", options = {}) {
  window.clearTimeout(state.feedbackTimer);
  const title = options.title || (
    kind === "error"
      ? "No se pudo completar"
      : kind === "loading"
        ? "Procesando"
        : kind === "info"
          ? "Informacion"
          : "Listo"
  );
  actionFeedback.className = `action-feedback ${kind}`;
  actionFeedback.innerHTML = `
    <div>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
  actionFeedback.classList.remove("hidden");
  if (options.timeout !== 0) {
    state.feedbackTimer = window.setTimeout(hideFeedback, options.timeout || (kind === "error" ? 7200 : 4200));
  }
}

function showBusyOverlay(title, message) {
  state.busyDepth += 1;
  busyOverlayTitle.textContent = title || "Procesando";
  busyOverlayMessage.textContent = message || "Estamos sincronizando la informacion.";
  busyOverlay.classList.remove("hidden");
}

function hideBusyOverlay(force = false) {
  state.busyDepth = force ? 0 : Math.max(0, state.busyDepth - 1);
  if (!state.busyDepth) {
    busyOverlay.classList.add("hidden");
  }
}

function setButtonLoading(button, isLoading, label) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.dataset.originalText || button.textContent;
    button.textContent = label || button.dataset.originalText;
    button.disabled = true;
    button.classList.add("button-loading");
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
  button.classList.remove("button-loading");
  delete button.dataset.originalText;
}

function setInlineMessage(element, message, kind = "info") {
  if (!element) return;
  element.textContent = message || "";
  element.dataset.kind = kind;
  if (message && element.id === "triviaLauncherMessage" && kind === "error") {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function renderSkeletonCards(container, count = 4) {
  if (!container) return;
  container.innerHTML = Array.from({ length: count }, () => '<article class="skeleton-card"></article>').join("");
}

function clearCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width || canvas.clientWidth || 1, canvas.height || canvas.clientHeight || 1);
}

function clearBusinessWorkspaceUi() {
  renderSkeletonCards(businessKpiGrid, 6);
  if (commandCenterRoot) {
    commandCenterRoot.innerHTML = `
      <article class="command-center-loading surface-card">
        <span class="busy-spinner" aria-hidden="true"></span>
        <div>
          <strong>Cargando RMS Command Center</strong>
          <p>Sincronizando datos de la empresa activa.</p>
        </div>
      </article>
    `;
  }
  [
    businessTrendChart,
    cacTrendChart,
    hourlyOperationsChart,
    weekdayPerformanceChart,
    qrStatusChart,
    campaignPerformanceChart,
    rewardMixChart,
    paymentMethodChart,
    campaignTimelineChart,
    campaignSnapshotChart,
  ].forEach(clearCanvas);

  const loadingRows = [
    [recentRedemptionsTable, 4, "Cargando redenciones de la empresa activa..."],
    [recentLeadsTable, 4, "Cargando leads de la empresa activa..."],
    [branchPerformanceTable, 5, "Cargando actividad por sucursal..."],
    [campaignLeadsTable, 9, "Cargando leads..."],
    [campaignRedemptionsTable, 6, "Cargando redenciones..."],
    [campaignSalesTable, 8, "Cargando ventas..."],
    [branchTable, 4, "Cargando sucursales..."],
    [qrBatchTable, 5, "Abre Gaming Center para cargar paquetes recientes."],
    [strategicQrHistoryTable, 5, "Abre Gaming Center para cargar historial reciente."],
    [qrCreditOrdersTable, 4, "Cargando compras recientes..."],
    [affiliateTable, 9, "Cargando afiliados..."],
    [affiliateLedgerTable, 5, "Sin afiliado seleccionado."],
    [rewardPassTable, 8, "Cargando Reward Pass..."],
    [rewardPassRedemptionTable, 9, "Cargando historial..."],
    [rewardPassTicketLedgerTable, 5, "Cargando movimientos..."],
  ];
  loadingRows.forEach(([element, colspan, message]) => {
    if (element) element.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
  });

  if (campaignList) campaignList.innerHTML = '<article class="campaign-item"><p>Cargando campanas de la empresa activa...</p></article>';
  if (leadFeedTable) leadFeedTable.innerHTML = '<tr><td colspan="9">Cargando contactos...</td></tr>';
  if (strategicQrKpiGrid) {
    strategicQrKpiGrid.innerHTML = '<article class="surface-card kpi-card"><span class="mono-label">Gaming Center</span><strong class="kpi-value">Cargando</strong><p class="kpi-meta">Preparando datos de la empresa activa.</p></article>';
  }
}

function resetBusinessScopedState(options = {}) {
  const keepView = options.keepView === true;
  const targetSession = Object.prototype.hasOwnProperty.call(options, "session")
    ? options.session || {}
    : session || {};
  stopActivityPolling();
  clearQrBatchProgressTimer();
  state.dashboard = null;
  state.activityVersion = "";
  state.activityRefreshInFlight = false;
  state.commandCenter = null;
  state.summary = null;
  state.businessProfile = null;
  state.subscription = targetSession.user?.subscription || null;
  state.access = null;
  state.businessUsers = [];
  state.campaignGroups = null;
  state.campaigns = [];
  state.adminCampaigns = [];
  state.affiliates = [];
  state.rewardPasses = [];
  state.rewardPassMetrics = null;
  state.rewardPassContext = null;
  state.selectedRewardPassId = null;
  state.selectedRewardPass = null;
  state.selectedCampaignId = null;
  state.selectedCampaign = null;
  state.selectedReport = null;
  state.selectedLeads = [];
  state.contactFeed = [];
  state.contactFeedRetention = null;
  state.contactFeedGate = null;
  state.contactFeedLoaded = false;
  state.selectedRedemptions = [];
  state.selectedSales = [];
  state.selectedAffiliateId = null;
  state.selectedAffiliate = null;
  state.selectedAffiliateLedger = [];
  state.strategicQrMetrics = null;
  state.qrCreditAccount = null;
  state.qrCreditOrders = [];
  state.strategicQrBatches = [];
  state.strategicQrHistory = [];
  state.triviaLaunchers = [];
  state.affiliatesLoaded = false;
  state.strategicQrLoaded = false;
  state.ticketCenterLoadedAt = {};
  state.ticketCenterLoading = false;
  state.strategicQrRecentBatchId = null;
  state.loadedBusinessId = targetSession.user?.business_id || null;
  state.workspaceLoadSeq += 1;
  if (!keepView) {
    state.currentView = "dashboard";
  }
  clearBusinessWorkspaceUi();
}

function clearQrBatchProgressTimer() {
  if (state.qrBatchProgressTimer) {
    window.clearInterval(state.qrBatchProgressTimer);
    state.qrBatchProgressTimer = null;
  }
}

function setQrBatchProgress(progress, options = {}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress || 0)));
  qrBatchProgress.classList.remove("hidden");
  qrBatchProgressEyebrow.textContent = options.eyebrow || "Motor de tickets";
  qrBatchProgressTitle.textContent = options.title || "Procesando lote";
  qrBatchProgressPercent.textContent = `${safeProgress}%`;
  qrBatchProgressFill.style.width = `${safeProgress}%`;
  qrBatchProgressMessage.textContent = options.message || "Preparando paquete solicitado por el negocio.";
}

function resetQrBatchProgress() {
  clearQrBatchProgressTimer();
  qrBatchProgress.classList.add("hidden");
  qrBatchProgressFill.style.width = "0%";
  qrBatchProgressPercent.textContent = "0%";
  qrBatchProgressTitle.textContent = "Preparando paquete";
  qrBatchProgressEyebrow.textContent = "Motor de tickets";
  qrBatchProgressMessage.textContent = "Configura el lote y empieza la generacion.";
}

function startQrBatchProgress(quantity) {
  clearQrBatchProgressTimer();
  const total = Math.max(1, Number(quantity || 0));
  let progress = 6;
  const speed = total > 1000 ? 1 : total > 300 ? 2 : 3;
  setQrBatchProgress(progress, {
    eyebrow: "Solicitud recibida",
    title: "Creando paquete de tickets",
    message: `Reservando ${total.toLocaleString("es-CO")} tickets para este negocio y preparando el registro del lote.`,
  });
  state.qrBatchProgressTimer = window.setInterval(() => {
    progress = Math.min(92, progress + speed);
    const stageMessage = progress < 28
      ? "Validando configuracion del beneficio y preparando el lote."
      : progress < 52
        ? "Generando tokens unicos y asociandolos al paquete."
        : progress < 76
          ? "Registrando el inventario de tickets en el portal del negocio."
          : "Cerrando el paquete y dejando la descarga lista.";
    setQrBatchProgress(progress, {
      eyebrow: progress < 52 ? "Generando inventario" : "Sincronizando portal",
      title: "Creando paquete de tickets",
      message: stageMessage,
    });
    if (progress >= 92) {
      clearQrBatchProgressTimer();
    }
  }, 180);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const rawText = await response.text().catch(() => "");
  const data = rawText ? (() => {
    try {
      return JSON.parse(rawText);
    } catch {
      return {};
    }
  })() : {};
  if (!response.ok) {
    if (response.status === 401) {
      forceLoginAfterSessionIssue(data.error?.message || "Tu sesion expiro o el portal fue actualizado. Inicia sesion de nuevo para continuar.");
    }
    throw new Error(apiErrorMessage(data, response, rawText));
  }
  return data;
}

function apiErrorMessage(data, response, rawText = "") {
  const baseMessage = data.error?.message || httpErrorMessage(response, rawText);
  const fieldErrors = data.error?.details?.fieldErrors || {};
  const firstField = Object.keys(fieldErrors)[0];
  const firstMessage = firstField ? fieldErrors[firstField]?.[0] : "";
  if (firstField && firstMessage) {
    return `${baseMessage} ${firstField}: ${firstMessage}`;
  }
  const formErrors = data.error?.details?.formErrors || [];
  if (formErrors.length) {
    return `${baseMessage} ${formErrors[0]}`;
  }
  return baseMessage;
}

function httpErrorMessage(response, rawText = "") {
  if (response.status === 413) {
    return "El archivo es demasiado grande. Sube un logo mas liviano.";
  }

  const text = rawText
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.includes("Cannot PATCH /api/business/profile")) {
    return "El servidor activo aun no tiene habilitada la ruta para guardar el logo. Reinicia el backend y vuelve a subirlo.";
  }

  if (text.includes("Cannot ") && text.includes("/api/")) {
    return "El servidor activo no reconoce esta solicitud. Reinicia el backend y vuelve a intentarlo.";
  }

  return text.slice(0, 180) || `No se pudo completar la solicitud (${response.status}).`;
}

async function apiSafe(path, options = {}, fallback = null) {
  try {
    return await api(path, options);
  } catch (error) {
    return fallback;
  }
}

async function loadAffiliatesData() {
  if (!session?.user?.business_id || !hasPlanFeature("affiliates")) {
    state.affiliatesLoaded = true;
    state.affiliates = [];
    return;
  }
  showFeedback("Cargando afiliados.", "loading", { title: "Sincronizando", timeout: 0 });
  const data = await apiSafe(`/api/portal/businesses/${session.user.business_id}/affiliates`, { headers: authHeaders() }, { affiliates: [] });
  state.affiliates = data.affiliates || [];
  state.affiliatesLoaded = true;
  hideFeedback();
}

async function loadContactFeedData(options = {}) {
  if (!session?.user?.business_id) {
    state.contactFeedLoaded = true;
    state.contactFeed = [];
    return;
  }
  if (state.contactFeedLoaded && !options.force) return;
  if (!options.quiet) {
    showFeedback("Cargando leads visibles bajo demanda.", "loading", { title: "Leads", timeout: 0 });
  }
  const data = await apiSafe("/api/business/contacts/feed?limit=120", { headers: authHeaders() }, { contacts: [], retention: null, lead_gate: null });
  state.contactFeed = data.contacts || [];
  state.contactFeedRetention = data.retention || null;
  state.contactFeedGate = data.lead_gate || null;
  state.contactFeedLoaded = true;
  if (!options.quiet) hideFeedback();
}

function isTicketCenterGroupFresh(group, ttl = TICKET_CENTER_CACHE_TTL_MS) {
  const loadedAt = Number(state.ticketCenterLoadedAt?.[group] || 0);
  return loadedAt && Date.now() - loadedAt < ttl;
}

function markTicketCenterDataStale(groups = TICKET_CENTER_GROUPS) {
  const nextGroups = Array.isArray(groups) ? groups : [groups];
  state.ticketCenterLoadedAt = { ...(state.ticketCenterLoadedAt || {}) };
  nextGroups.forEach((group) => {
    delete state.ticketCenterLoadedAt[group];
  });
  state.strategicQrLoaded = false;
}

function ticketCenterGroupsForTab(tab = state.ticketCenterTab) {
  return TICKET_CENTER_TAB_GROUPS[tab] || TICKET_CENTER_TAB_GROUPS.center;
}

function setTicketCenterLoadingRows(groups = []) {
  if (groups.includes("batches") && qrBatchTable && !(state.strategicQrBatches || []).length) {
    qrBatchTable.innerHTML = '<tr><td colspan="5">Cargando paquetes recientes...</td></tr>';
  }
  if (groups.includes("history") && strategicQrHistoryTable && !(state.strategicQrHistory || []).length) {
    strategicQrHistoryTable.innerHTML = '<tr><td colspan="5">Cargando historial reciente...</td></tr>';
  }
  if (groups.includes("core") && qrCreditOrdersTable && !(state.qrCreditOrders || []).length) {
    qrCreditOrdersTable.innerHTML = '<tr><td colspan="4">Cargando compras recientes...</td></tr>';
  }
}

async function loadStrategicQrData(options = {}) {
  if (!session?.user?.business_id) {
    state.strategicQrLoaded = true;
    return;
  }
  const requestedGroups = [...new Set(options.groups || TICKET_CENTER_GROUPS)];
  const groupsToLoad = requestedGroups.filter((group) => options.force || !isTicketCenterGroupFresh(group));
  if (!groupsToLoad.length) {
    state.strategicQrLoaded = true;
    return;
  }

  const quiet = options.quiet === true;
  state.ticketCenterLoading = true;
  setTicketCenterLoadingRows(groupsToLoad);
  if (!quiet) {
    showFeedback(
      lightTestMode ? "Cargando solo los datos necesarios para probar." : "Cargando datos visibles de Gaming Center.",
      "loading",
      { title: lightTestMode ? "Prueba ligera" : "Sincronizando Gaming Center", timeout: 0 }
    );
  }

  const loaders = groupsToLoad.map(async (group) => {
    if (group === "metrics") {
      const data = lightTestMode
        ? { totals: {}, benefits: [], redemptions_by_seller: [] }
        : await apiSafe("/api/business/qr/metrics", { headers: authHeaders() }, { totals: {}, benefits: [], redemptions_by_seller: [] });
      state.strategicQrMetrics = data || null;
    }
    if (group === "core") {
      const [packageData, creditData, creditOrdersData] = await Promise.all([
        apiSafe("/api/public/packages", {}, { packages: [] }),
        apiSafe("/api/qr/credits/me", { headers: authHeaders() }, { credit_account: state.qrCreditAccount || null }),
        lightTestMode ? Promise.resolve({ orders: [] }) : apiSafe("/api/payments/qr-credits/orders?limit=20", { headers: authHeaders() }, { orders: [] }),
      ]);
      state.qrPackageOffers = packageData.packages || [];
      state.pricing = packageData.pricing || state.pricing;
      state.qrCreditAccount = creditData.credit_account || state.qrCreditAccount || null;
      state.qrCreditOrders = creditOrdersData.orders || [];
    }
    if (group === "batches") {
      const data = lightTestMode
        ? { batches: [] }
        : await apiSafe("/api/business/qr/batches?limit=80", { headers: authHeaders() }, { batches: [] });
      state.strategicQrBatches = data.batches || [];
    }
    if (group === "history") {
      const data = lightTestMode
        ? { history: [] }
        : await apiSafe("/api/business/qr/history?limit=120", { headers: authHeaders() }, { history: [] });
      state.strategicQrHistory = data.history || [];
    }
    if (group === "activations") {
      const data = await apiSafe("/api/business/interactive-activations?limit=120", { headers: authHeaders() }, { activations: [], trivias: [] });
      state.triviaLaunchers = data.activations || data.trivias || [];
    }
    if (group === "affiliates") {
      const data = !lightTestMode && hasPlanFeature("affiliates")
        ? await apiSafe(`/api/portal/businesses/${session.user.business_id}/affiliates`, { headers: authHeaders() }, { affiliates: [] })
        : { affiliates: [] };
      state.affiliates = data.affiliates || [];
      state.affiliatesLoaded = true;
    }
    state.ticketCenterLoadedAt = {
      ...(state.ticketCenterLoadedAt || {}),
      [group]: Date.now(),
    };
  });

  await Promise.all(loaders);
  state.strategicQrLoaded = true;
  state.ticketCenterLoading = false;
  if (!quiet) hideFeedback();
}

async function loadTicketCenterForCurrentTab(options = {}) {
  await loadStrategicQrData({
    groups: ticketCenterGroupsForTab(state.ticketCenterTab),
    ...options,
  });
  if (state.currentView === "strategic-qr") {
    renderStrategicQrView();
  }
}

function authHeaders() {
  assertActiveSession();
  return {
    Authorization: `Bearer ${session.token}`,
  };
}

async function refreshSessionIdentity() {
  assertActiveSession();
  const data = await api("/api/auth/me", { headers: authHeaders() });
  const nextSession = {
    ...session,
    user: {
      ...(session.user || {}),
      ...(data.user || {}),
    },
  };
  saveSession(nextSession);
  return session;
}

function toNumber(value) {
  return Number(value || 0);
}

function acquisitionSourceLabel(value) {
  return ACQUISITION_SOURCE_LABELS[value] || value || "Sin medio";
}

function money(value) {
  if (value === null || value === undefined) return "-";
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

function copMoney(value) {
  if (value === null || value === undefined) return "-";
  return `COP ${Number(value || 0).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  })}`;
}

function packagePriceLabel(offer) {
  if (!offer) return "-";
  if (Number.isFinite(Number(offer.price_cop))) {
    return copMoney(offer.price_cop);
  }
  return offer.price_label || "-";
}

function planMonthlyLabel(plan) {
  if (!plan?.monthly_price_cop) return plan?.price_label || "Cotizacion";
  return `${copMoney(plan.monthly_price_cop)} / ${plan.billing_label || "mes"}`;
}

function addPlanBillingPeriod(date, plan) {
  const next = new Date(date.getTime());
  const frequency = Number(plan?.billing_frequency || 1);
  if (plan?.billing_frequency_type === "days") {
    next.setDate(next.getDate() + frequency);
    return next;
  }
  next.setMonth(next.getMonth() + frequency);
  return next;
}

function autoRenewFirstChargeDate(plan, hasFutureRenewalDate, renewalDate) {
  if (plan?.testing_plan && plan.billing_frequency_type === "days") {
    return addPlanBillingPeriod(new Date(), plan);
  }
  if (hasFutureRenewalDate) {
    return renewalDate;
  }
  return null;
}

function ratioLabel(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(2)}x`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CO", {
    dateStyle: "medium",
  });
}

function subscriptionAccessLabel(plan = {}) {
  const status = plan.access_status || plan.status || "-";
  const labels = {
    ACTIVE: "Activa",
    GRACE: "En gracia",
    LOCKED: "Bloqueada",
    PREPAID: "Legacy",
    CANCELLED: "Cancelada",
    PAUSED: "Pausada",
  };
  return labels[status] || status;
}

function subscriptionTimingText(plan = {}) {
  if (plan.category !== "subscription") {
    return "Portal Base: no tiene fecha mensual de renovacion.";
  }
  if (plan.lifetime_access || plan.monthly_payment_required === false) {
    return "Plan vitalicio activo: no requiere pago mensual ni fecha de renovacion.";
  }
  if (!plan.official_payment_due_at) {
    return "Mensualidad activa sin fecha oficial de renovacion configurada.";
  }
  const dueDate = formatDateOnly(plan.official_payment_due_at);
  const graceDate = formatDateOnly(plan.grace_period_ends_at);
  if (plan.access_status === "LOCKED") {
    return `Acceso al portal bloqueado. La fecha oficial de pago fue ${dueDate}; la gracia termino el ${graceDate}. Tus datos siguen guardados.`;
  }
  if (plan.access_status === "GRACE") {
    return `Pago vencido el ${dueDate}. Quedan ${formatLimitValue(plan.days_until_lock)} dia(s) de gracia antes del bloqueo del portal.`;
  }
  if (plan.days_until_due === 0) {
    return `La mensualidad vence hoy (${dueDate}). Despues tienes ${formatLimitValue(plan.grace_period_days)} dias de gracia.`;
  }
  return `Renovacion oficial: ${dueDate}. Quedan ${formatLimitValue(plan.days_until_due)} dia(s) para pagar; gracia hasta ${graceDate}.`;
}

function formatDateTimeLocal(value) {
  if (!value) return null;
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function parseJsonObject(value) {
  const raw = String(value || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { value: raw };
  } catch {
    return { value: raw };
  }
}

function formatDateShort(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

function formatInputDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function selectedCheckedValues(container) {
  return Array.from(container.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
}

function setCheckedValues(container, values = []) {
  const selected = new Set(Array.isArray(values) ? values : []);
  Array.from(container.querySelectorAll("input[type='checkbox']")).forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function statusLabel(status) {
  const labels = {
    DRAFT: "Borrador interno",
    READY_FOR_CLIENT_SETUP: "Listo para configurar",
    SCHEDULED: "Programada",
    ACTIVE: "Activa",
    PAUSED: "Pausada",
    FINISHED: "Finalizada",
    ARCHIVED: "Archivada",
  };
  return labels[status] || status || "-";
}

function prettyLeadValue(value, fallback = "-") {
  if (!value || value === "-") return fallback;
  return String(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function leadInterestSummary(lead) {
  const parts = [
    lead.favorite_product ? `Busca ${prettyLeadValue(lead.favorite_product)}` : null,
    lead.purchase_intent ? prettyLeadValue(lead.purchase_intent) : null,
    lead.gift_budget && lead.gift_budget !== "-" ? `Presupuesto ${prettyLeadValue(lead.gift_budget)}` : null,
    lead.purchase_window && lead.purchase_window !== "-" ? `Compra ${prettyLeadValue(lead.purchase_window)}` : null,
    lead.style_preference && lead.style_preference !== "-" ? `Estilo ${prettyLeadValue(lead.style_preference)}` : null,
    lead.usage_context && lead.usage_context !== "-" ? `Uso ${prettyLeadValue(lead.usage_context)}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : "Sin intereses declarados";
}

function leadActionRecommendation(lead) {
  const intent = lead.purchase_intent || "";
  const windowValue = lead.purchase_window || "";
  const channel = prettyLeadValue(lead.preferred_channel, "Canal sin definir");
  const contactTime = lead.preferred_contact_time && lead.preferred_contact_time !== "-"
    ? ` en la ${prettyLeadValue(lead.preferred_contact_time).toLowerCase()}`
    : "";
  if (windowValue === "hoy") {
    return `Contacto inmediato por ${channel}${contactTime}. Lead caliente.`;
  }
  if (windowValue === "esta-semana") {
    return `Seguimiento esta semana por ${channel}${contactTime} con oferta concreta.`;
  }
  if (intent === "regalo-padre") {
    return `Mostrar opciones de regalo y combos por ${channel}${contactTime}.`;
  }
  if (windowValue === "solo-explorando") {
    return `Nutrir por ${channel}${contactTime} y reimpactar con contenido.`;
  }
  return `Seguimiento comercial por ${channel}${contactTime} segun interes principal.`;
}

function launchChannelsLabel(channels) {
  return Array.isArray(channels) && channels.length ? channels.join(", ") : "Sin canales cargados";
}

function safeRate(numerator, denominator) {
  const total = toNumber(denominator);
  if (!total) return 0;
  return Number(((toNumber(numerator) / total) * 100).toFixed(1));
}

function initials(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MG";
}

function filterRows(rows, keys) {
  const term = state.filter.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((row) =>
    keys.some((key) => String(row?.[key] ?? "").toLowerCase().includes(term))
  );
}

function filterByDate(rows, keys = ["created_at", "redeemed_at", "starts_at", "ends_at"]) {
  if (!state.rangeDays) return rows;
  const cutoff = Date.now() - state.rangeDays * 24 * 60 * 60 * 1000;
  return rows.filter((row) =>
    keys.some((key) => {
      if (!row?.[key]) return false;
      const value = new Date(row[key]).getTime();
      return Number.isFinite(value) && value >= cutoff;
    })
  );
}

function withFilters(rows, keys, dateKeys) {
  return filterRows(filterByDate(rows, dateKeys), keys);
}

function currentCampaignRows() {
  const filtered = filterRows(state.campaigns, ["name", "type", "objective", "status"]);
  if (campaignStatusFilter.value === "ALL") {
    return filtered;
  }
  return filtered.filter((campaign) => campaign.status === campaignStatusFilter.value);
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function syncCampaignSlugFromName({ force = false } = {}) {
  if (!campaignFormSlug || !campaignFormName) return;
  const currentSlug = slugify(campaignFormSlug.value);
  const shouldReplace = force || !currentSlug || currentSlug === slugify(campaignFormSlug.dataset.generatedFrom || "");
  if (!shouldReplace) {
    campaignFormSlug.value = currentSlug;
    return;
  }
  const nextSlug = slugify(campaignFormName.value);
  campaignFormSlug.value = nextSlug;
  campaignFormSlug.dataset.generatedFrom = campaignFormName.value;
}

const viewFeatureMap = {
  dashboard: "portal_access",
  account: null,
  campaigns: "portal_access",
  leads: "leads_view",
  affiliates: "affiliates",
  "reward-passes": "portal_access",
  redemptions: "portal_access",
  sales: "portal_access",
  "strategic-qr": "qr_batch_generator",
  validator: "qr_validator",
  branches: "multi_branch",
  admin: "admin_workspace",
};

function planFeatures() {
  return state.subscription?.plan?.features || {};
}

function planLimits() {
  return state.subscription?.plan?.limits || {};
}

function hasPlanFeature(feature) {
  if (!feature) return true;
  if (feature === "admin_workspace") return isAdmin();
  if (isAdmin()) return true;
  if (feature === "leads_view" && isPrepaidValidatorOnly()) return true;
  const plan = currentPlan();
  if (plan.category === "subscription" && plan.portal_access_allowed === false) {
    return false;
  }
  return Boolean(planFeatures()[feature]);
}

function currentPlan() {
  return state.subscription?.plan || session?.user?.subscription?.plan || {};
}

function isPrepaidValidatorOnly() {
  const plan = currentPlan();
  const features = plan.features || {};
  return plan.category === "prepaid" && features.qr_validator && !features.portal_access;
}

function loginRedirectForSession(value) {
  const plan = value?.user?.subscription?.plan || {};
  const features = plan.features || {};
  if (plan.category === "prepaid" && features.qr_validator && !features.portal_access) {
    return "";
  }
  return "";
}

function formatLimitValue(value) {
  return value === null || value === undefined ? "Ilimitado" : Number(value).toLocaleString("es-CO");
}

function renderSubscriptionBanner() {
  if (!subscriptionBanner) return;
  const plan = state.subscription?.plan;
  if (!plan) {
    subscriptionPlanName.textContent = "Plan no cargado";
    subscriptionPlanSummary.textContent = "Sin informacion de permisos.";
    subscriptionLimits.innerHTML = "";
    if (subscriptionTiming) subscriptionTiming.textContent = "Sin fecha de renovacion cargada.";
    return;
  }
  const limits = planLimits();
  const access = state.access || {};
  subscriptionPlanName.textContent = plan.name || plan.code || "Plan";
  subscriptionPlanSummary.textContent = plan.category === "ticket_base"
    ? `Portal Base activo sin mensualidad. Saldo operativo: ${formatNumber(access.ticketBalance || state.qrCreditAccount?.qr_balance || 0)} tickets.`
    : plan.category === "growth_temporal"
      ? `Growth temporal activo${access.daysUntilGrowthExpiration !== null && access.daysUntilGrowthExpiration !== undefined ? `: ${access.daysUntilGrowthExpiration} dias restantes` : ""}. Conservas tus tickets al volver a Base.`
      : plan.category === "prepaid"
        ? "Acceso legacy: compra T200 para activar Portal Base con dashboard, validador interno y Sales Tracker."
        : `${subscriptionAccessLabel(plan)}: upgrade mensual activo. Los tickets se compran y consumen como saldo operativo.`;
  if (subscriptionTiming) {
    subscriptionTiming.textContent = subscriptionTimingText(plan);
  }
  subscriptionBanner.dataset.accessStatus = plan.access_status || plan.status || "ACTIVE";
  subscriptionLimits.innerHTML = [
    ["Estado", subscriptionAccessLabel(plan)],
    ["Saldo tickets", access.ticketBalance ?? state.qrCreditAccount?.qr_balance ?? 0],
    ["Usuarios", limits.users],
    ["Sedes", limits.branches],
    ["Campanas", limits.active_campaigns],
    ["Exportaciones", limits.lead_exports_month],
    ["Afiliados", limits.affiliates],
  ].map(([label, value]) => `<span class="subscription-limit-chip">${label}: ${formatLimitValue(value)}</span>`).join("");
}

function planBenefitList(plan) {
  if (Array.isArray(plan?.included) && plan.included.length) {
    return plan.included.slice(0, plan.code === "GLOBAL" ? 8 : 7);
  }
  const limits = plan.limits || {};
  const features = plan.features || {};
  const benefits = [
    plan.code === "GLOBAL" ? "Tickets por cotizacion segun volumen" : "Tickets por recarga separada",
    `${formatLimitValue(limits.users)} usuarios y ${formatLimitValue(limits.branches)} sede(s)`,
    `${formatLimitValue(limits.active_campaigns)} campanas activas`,
  ];
  if (features.leads_export) {
    benefits.push(`${formatLimitValue(limits.lead_exports_month)} exportaciones de leads/mes`);
  }
  if (features.affiliates) {
    benefits.push(`Afiliados incluidos hasta ${formatLimitValue(limits.affiliates)}`);
  }
  if (features.api_access) {
    benefits.push("API para integraciones y operacion avanzada");
  }
  if (features.branded_portal) {
    benefits.push("Portal brandeable y dominio/subdominio a medida");
  }
  if (features.dedicated_support) {
    benefits.push("Soporte prioritario y acompanamiento estrategico");
  }
  return benefits.slice(0, plan.code === "GLOBAL" ? 8 : 6);
}

function renderSubscriptionPricing() {
  if (!subscriptionPlansGrid) return;
  const displayOrder = ["TICKET_BASE", "STARTER", "GROWTH", "PRO", "GLOBAL"];
  const plans = (state.subscriptionPlans || [])
    .filter((plan) => displayOrder.includes(plan.code) && !plan.testing_plan && plan.public_signup_available !== false)
    .sort((a, b) => displayOrder.indexOf(a.code) - displayOrder.indexOf(b.code));
  const currentCode = state.subscription?.plan?.code;
  if (!plans.length) {
    subscriptionPlansGrid.innerHTML = '<p class="table-secondary">No se pudieron cargar los planes del portal.</p>';
    return;
  }
  if (subscriptionPricingNote) {
    subscriptionPricingNote.textContent = "Cada plan muestra una parte del siguiente: Base prueba valor con tickets, Growth activa operacion mensual, Premium desbloquea RMS completo y Enterprise escala sedes, API y soporte.";
  }
  subscriptionPlansGrid.innerHTML = plans.map((plan) => {
    const ticketPolicy = plan.code === "GLOBAL" ? "tickets por cotizacion" : "tickets por recarga";
    const recommendedPackage = plan.recommended_start_package || "QR200";
    const portalValue = plan.monthly_price_cop ? planMonthlyLabel(plan) : plan.price_label || "Incluido";
    const monthlyPrice = plan.monthly_price_cop ? planMonthlyLabel(plan) : (plan.price_label || "Cotizacion");
    const isCurrent = plan.code === currentCode;
    return `
      <article class="portal-plan-card ${isCurrent ? "is-current" : ""}">
        <div class="portal-plan-head">
          <div>
            <span class="mono-label">${escapeHtml(plan.code)}</span>
            <h4>${escapeHtml(plan.name)}</h4>
          </div>
          ${isCurrent ? '<span class="status-chip ok">Plan actual</span>' : '<span class="status-chip pending">Disponible</span>'}
        </div>
        <div class="portal-plan-price">
          <strong>${escapeHtml(monthlyPrice)}</strong>
          <span>${plan.monthly_price_cop ? "Pago mensual del portal" : "Cotizacion personalizada"}; ${escapeHtml(ticketPolicy)}</span>
        </div>
        <div class="portal-plan-economics">
          Valor portal: ${escapeHtml(portalValue)}. Paquete sugerido para iniciar: ${escapeHtml(recommendedPackage)}.
        </div>
        <ul class="portal-plan-benefits">
          ${planBenefitList(plan).map((benefit) => `
            <li><span class="material-symbols-outlined">check_circle</span><span>${escapeHtml(benefit)}</span></li>
          `).join("")}
        </ul>
        <p class="portal-plan-note">${escapeHtml(plan.pricing_note || "")}</p>
      </article>
    `;
  }).join("");
  renderSubscriptionRenewal();
}

function renderSubscriptionRenewal() {
  if (!subscriptionRenewalPlanSelect || !subscriptionRenewalButton) return;
  const plan = state.subscription?.plan || {};
  const plans = (state.subscriptionPlans || []).filter((item) => item.category === "subscription" && item.monthly_price_cop && !item.testing_plan && item.public_signup_available !== false);
  const hasMonthlyPlan = ["subscription", "ticket_base", "growth_temporal"].includes(plan.category);
  const autoRenew = plan.auto_renew || {};
  const dueAt = plan.official_payment_due_at || plan.current_period_ends_at;
  const renewalDate = dueAt ? new Date(dueAt) : null;
  const hasFutureRenewalDate = renewalDate && !Number.isNaN(renewalDate.getTime()) && renewalDate > new Date();
  const selectedPlanCode = subscriptionRenewalPlanSelect.value || plan.code;

  subscriptionRenewalPlanSelect.innerHTML = plans.length
    ? plans.map((item) => `
      <option value="${escapeHtml(item.code)}" ${item.code === selectedPlanCode ? "selected" : ""}>
        ${escapeHtml(item.name)} · ${planMonthlyLabel(item)}
      </option>
    `).join("")
    : '<option value="">No hay planes disponibles</option>';

  const selectedRenewalPlan = plans.find((item) => item.code === subscriptionRenewalPlanSelect.value) || plans[0] || null;
  const isTestingRenewalPlan = Boolean(selectedRenewalPlan?.testing_plan);
  const firstChargeDate = selectedRenewalPlan
    ? autoRenewFirstChargeDate(selectedRenewalPlan, hasFutureRenewalDate, renewalDate)
    : null;
  const firstChargeLabel = firstChargeDate ? formatDateOnly(firstChargeDate) : "proxima renovacion";
  const selectedPlanChargeLabel = selectedRenewalPlan?.monthly_price_cop ? copMoney(selectedRenewalPlan.monthly_price_cop) : "el valor del plan";

  subscriptionRenewalButton.disabled = !hasMonthlyPlan || !plans.length;
  if (subscriptionAutoRenewButton) {
    subscriptionAutoRenewButton.disabled = !plans.length || autoRenew.enabled || (!isTestingRenewalPlan && (plan.category !== "subscription" || !hasFutureRenewalDate));
    subscriptionAutoRenewButton.textContent = autoRenew.enabled ? "Cobro automatico activo" : "Inscribir tarjeta para cobro automatico";
  }
  if (subscriptionAutoRenewClarity) {
    subscriptionAutoRenewClarity.innerHTML = `
      <div>
        <span>Hoy</span>
        <strong>No se cobra el plan</strong>
        <small>Solo se autoriza la tarjeta.</small>
      </div>
      <div>
        <span>Validacion Mercado Pago</span>
        <strong>$1.600 temporal</strong>
        <small>Mercado Pago lo devuelve enseguida si el banco aprueba.</small>
      </div>
      <div>
        <span>Cuotas</span>
        <strong>Continua en un pago</strong>
        <small>Si Mercado Pago no muestra cuotas, no bloquea la autorizacion recurrente.</small>
      </div>
      <div>
        <span>Primer cobro real</span>
        <strong>${escapeHtml(firstChargeLabel)}</strong>
        <small>${escapeHtml(selectedPlanChargeLabel)} ${escapeHtml(selectedRenewalPlan?.billing_label || "mensual")}.</small>
      </div>
    `;
  }
  if (subscriptionAutoRenewStatus) {
    const autoRenewLabel = autoRenew.enabled
      ? "Cobro automatico autorizado en Mercado Pago."
      : autoRenew.status && autoRenew.status !== "DISABLED"
        ? `Cobro automatico pendiente/estado: ${autoRenew.status}.`
        : isTestingRenewalPlan
          ? `Plan demo: Mercado Pago puede hacer una validacion temporal de $1.600; el cobro real sera ${selectedPlanChargeLabel} ${selectedRenewalPlan?.billing_label || "mensual"}.`
        : plan.category === "subscription" && !hasFutureRenewalDate
          ? "Define una fecha de renovacion futura antes de inscribir la tarjeta."
        : "Cobro automatico no configurado. Puedes inscribir tarjeta sin recobrar la mensualidad vigente.";
    subscriptionAutoRenewStatus.textContent = autoRenewLabel;
  }
  if (accountBillingStatus) {
    accountBillingStatus.textContent = hasMonthlyPlan ? subscriptionAccessLabel(plan) : "Portal no activado";
    const className = plan.access_status === "LOCKED" ? "danger" : plan.access_status === "GRACE" ? "pending" : hasMonthlyPlan ? "ok" : "pending";
    accountBillingStatus.className = `status-chip ${className}`;
  }
  if (subscriptionRenewalMessage) {
    if (hasMonthlyPlan) {
      const autoRenewGuidance = isTestingRenewalPlan
        ? "En Mercado Pago veras una validacion temporal de $1.600. No es el cobro del plan; el primer cobro real queda programado para la fecha indicada."
        : plan.category === "subscription" && !hasFutureRenewalDate
        ? "Para inscribir tarjeta sin cobro inmediato, primero debe existir una fecha futura de renovacion."
        : "Inscribir tarjeta solo crea la autorizacion; el primer cobro queda programado para la siguiente fecha de renovacion.";
      setInlineMessage(subscriptionRenewalMessage, `${subscriptionTimingText(plan)} Renovar manualmente abre un pago nuevo. ${autoRenewGuidance}`, "info");
    } else {
      setInlineMessage(subscriptionRenewalMessage, "Compra T200 para activar Portal Base o elige un upgrade mensual cuando necesites mas herramientas.", "info");
    }
  }
}

function accountValue(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function setAccountText(element, value, fallback = "-") {
  if (element) element.textContent = accountValue(value, fallback);
}

function renderCommercialDeal() {
  const deal = state.businessProfile?.commercial_deal;
  if (!accountCommercialDealCard) return;
  if (!deal) {
    accountCommercialDealCard.classList.add("hidden");
    return;
  }

  accountCommercialDealCard.classList.remove("hidden");
  if (accountCommercialDealTitle) {
    accountCommercialDealTitle.textContent = deal.title || "Trato registrado";
  }
  if (accountCommercialDealStatus) {
    accountCommercialDealStatus.textContent = deal.status || "Activo";
  }
  if (accountCommercialDealSummary) {
    accountCommercialDealSummary.textContent = deal.summary || "";
  }
  if (accountCommercialDealGrid) {
    const items = [
      ["Premium sin costo", deal.free_period_label],
      ["Primer cobro", deal.first_payment_due_at ? formatDateOnly(deal.first_payment_due_at) : deal.first_payment_label],
      ["Primer ano", deal.first_year_price_label],
      ["Desde segundo ano", deal.second_year_price_label],
      ["Tickets incluidos", deal.initial_tickets_label],
      ["Registrado", deal.recorded_at ? formatDateOnly(deal.recorded_at) : ""],
    ].filter(([, value]) => value);
    accountCommercialDealGrid.innerHTML = items.map(([label, value]) => `
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join("");
  }
}

function isBusinessOwnerUser() {
  return ["BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"].includes(session?.user?.role);
}

function canDeactivateBusinessUsers() {
  return ["BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"].includes(session?.user?.role);
}

function canManageCampaigns() {
  return isAdmin() || (Boolean(session?.user?.business_id) && hasPlanFeature("campaign_reports"));
}

function accountRoleLabel(role) {
  if (role === "BUSINESS_OWNER") return "Owner";
  if (role === "BUSINESS_MANAGER") return "Manager operativo";
  if (role === "VALIDATOR") return "Validador";
  return role || "-";
}

function renderBusinessUsers() {
  if (!accountUsersTable) return;
  const canManage = isBusinessOwnerUser();
  const canDeactivate = canDeactivateBusinessUsers();
  const users = state.businessUsers || [];
  if (accountUserForm) {
    accountUserForm.classList.toggle("hidden", !canManage);
  }
  if (refreshAccountUsersButton) {
    refreshAccountUsersButton.disabled = !session?.user?.business_id;
  }
  accountUsersTable.innerHTML = users.map((user) => {
    const isSelf = user.id === session?.user?.id;
    const active = Boolean(user.is_active);
    return `
      <tr>
        <td>${escapeHtml(user.full_name || "-")}${isSelf ? '<br><span class="table-secondary">Sesion actual</span>' : ""}</td>
        <td>${escapeHtml(user.email || "-")}</td>
        <td>${escapeHtml(accountRoleLabel(user.role))}</td>
        <td><span class="status-chip ${active ? "ok" : "danger"}">${active ? "Activo" : "Inactivo"}</span></td>
        <td>${escapeHtml(formatDate(user.created_at))}</td>
        <td>
          <button class="ghost-button" type="button" data-account-user-toggle="${escapeHtml(user.id)}" data-active="${active ? "0" : "1"}" ${!canManage || !canDeactivate || isSelf ? "disabled" : ""}>
            ${active ? "Desactivar" : "Activar"}
          </button>
        </td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="6">No hay usuarios cargados para este negocio.</td></tr>';
}

function renderAccountView() {
  const business = state.businessProfile || {};
  const user = business.current_user || session?.user || {};
  const subscription = state.subscription || {};
  const plan = subscription.plan || {};
  const credit = state.qrCreditAccount || {};
  const qrBalance = Number(credit.qr_balance || 0);
  const availableQr = qrBalance.toLocaleString("es-CO");

  setAccountText(accountBusinessName, business.name);
  setAccountText(accountBusinessNit, business.nit);
  setAccountText(accountBusinessSlug, business.slug);
  setAccountText(accountBusinessContact, business.contact_name || business.contact_email);
  setAccountText(accountBusinessPhone, business.phone);
  setAccountText(accountUserName, user.full_name);
  setAccountText(accountUserEmail, user.email);
  setAccountText(accountUserRole, user.role);
  setAccountText(accountUserBusiness, business.name || user.business_id);
  setAccountText(accountUserId, user.id);
  setAccountText(accountPlanName, plan.name || plan.code);
  setAccountText(accountType, plan.category === "ticket_base" ? "Portal Base" : plan.category === "growth_temporal" ? "Growth temporal" : (plan.billing_period === "monthly" ? "Suscripcion mensual" : plan.category));
  setAccountText(accountPlanStatus, subscriptionAccessLabel(plan));
  setAccountText(accountQrAvailable, availableQr, "0");
  setAccountText(accountQrUsed, Number(credit.qr_used_total || subscription.usage?.monthly_qr?.used || 0).toLocaleString("es-CO"), "0");
  renderCommercialDeal();
  renderBusinessUsers();
  renderSubscriptionRenewal();

  if (accountNameInput) accountNameInput.value = business.name || "";
  if (accountSloganInput) accountSloganInput.value = business.slogan || business.settings?.slogan || business.settings?.tagline || "";
  if (accountNitInput) accountNitInput.value = business.nit || "";
  if (accountContactInput) accountContactInput.value = business.contact_name || "";
  if (accountEmailInput) accountEmailInput.value = business.contact_email || "";
  if (accountPhoneInput) accountPhoneInput.value = business.phone || "";
  if (accountWebsiteInput) accountWebsiteInput.value = business.website || "";
  if (accountCityInput) accountCityInput.value = business.city || "";
  if (accountAddressInput) accountAddressInput.value = business.address || "";

  const logo = business.logo_data_url || "";
  if (accountLogoPreview) {
    accountLogoPreview.innerHTML = logo
      ? `<img src="${escapeHtml(logo)}" alt="Logo del negocio">`
      : '<span class="material-symbols-outlined">storefront</span>';
  }
  if (accountLogoTitle) {
    accountLogoTitle.textContent = logo ? "Logo cargado" : "Sin logo cargado";
  }

  const ticketFrame = business.ticket_frame_data_url || business.settings?.ticket_frame_data_url || "";
  if (accountTicketFramePreview) {
    accountTicketFramePreview.innerHTML = ticketFrame
      ? `<img src="${escapeHtml(ticketFrame)}" alt="Marco de tickets QR">`
      : '<span class="material-symbols-outlined">crop_free</span>';
  }
  if (accountTicketFrameTitle) {
    accountTicketFrameTitle.textContent = ticketFrame ? "Marco cargado" : "Sin marco cargado";
  }
  if (accountTicketFrameRemoveButton) {
    accountTicketFrameRemoveButton.disabled = !ticketFrame;
  }
}

function applyPlanNavigation() {
  navButtons.forEach((button) => {
    const feature = viewFeatureMap[button.dataset.view];
    const adminOnly = button.dataset.view === "admin";
    button.classList.toggle("hidden", adminOnly && !isAdmin());
    const locked = !hasPlanFeature(feature);
    button.classList.toggle("plan-locked", locked);
    button.disabled = locked;
    if (locked) {
      button.title = "Tu plan actual no incluye este modulo.";
    } else {
      button.removeAttribute("title");
    }
  });
  requestCampaignButton?.classList.toggle("hidden", !hasPlanFeature("portal_access"));
}

function viewNeedsCampaignData(view) {
  return ["campaigns", "leads", "redemptions", "sales", "branches"].includes(view);
}

function setSelectedCampaignFromList(campaignId) {
  state.selectedCampaignId = campaignId || null;
  state.selectedCampaign = (state.campaigns || []).find((item) => item.id === campaignId) || null;
  state.selectedReport = null;
  state.selectedLeads = [];
  state.selectedRedemptions = [];
  state.selectedSales = [];
}

async function ensureSelectedCampaignLoaded(options = {}) {
  if (!state.selectedCampaignId) return;
  if (state.selectedReport && !options.force) return;
  await selectCampaign(state.selectedCampaignId);
}

function setView(view) {
  if (view === "admin" && !isAdmin()) {
    const fallbackView = state.selectedCampaign ? "campaigns" : "dashboard";
    showFeedback("Ese modulo es interno de Market Games. La gestion de tus campanas esta en el portal del negocio.", "info", { title: "Modulo interno" });
    if (view !== fallbackView) setView(fallbackView);
    return;
  }
  if (!hasPlanFeature(viewFeatureMap[view])) {
    showFeedback("Tu plan actual no incluye este modulo. Puedes solicitar un upgrade para activarlo.", "info", { title: "Modulo bloqueado" });
    return;
  }
  if (state.currentView === "validator" && view !== "validator") {
    stopValidatorScanner();
  }
  if (state.currentView === "affiliates" && view !== "affiliates") {
    stopAffiliateFinderScanner();
  }
  state.currentView = view;
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  viewSections.forEach((section) => {
    section.classList.toggle("active", section.dataset.view === view);
  });
  workspace?.classList.remove("sidebar-open");

  segmentTabs.forEach((tab, index) => {
    const active = (view === "redemptions" && index === 0) || (view === "sales" && index === 1);
    tab.classList.toggle("active", active);
  });

  if (view === "dashboard" && state.dashboard) renderDashboard();
  if (view === "account") renderAccountView();
  if (view === "campaigns" && state.selectedCampaign) renderCampaignView();
  if (viewNeedsCampaignData(view) && state.selectedCampaignId && !state.selectedReport) {
    ensureSelectedCampaignLoaded({ quiet: true }).catch((error) => {
      showFeedback(error.message, "error", { title: "No se pudo cargar la campana" });
    });
  }
  if (view === "leads") {
    if (!state.contactFeedLoaded) {
      loadContactFeedData({ quiet: true }).then(renderLeadsView);
    }
    renderLeadsView();
  }
  if (view === "affiliates") {
    if (!state.affiliatesLoaded) {
      loadAffiliatesData().then(renderAffiliatesView);
    } else {
      renderAffiliatesView();
    }
  }
  if (view === "redemptions") renderRedemptionsView();
  if (view === "sales") {
    if (!state.affiliatesLoaded) {
      loadAffiliatesData().then(renderSalesView);
    } else {
      renderSalesView();
    }
  }
  if (view === "strategic-qr") {
    renderStrategicQrView();
    loadTicketCenterForCurrentTab({ quiet: !state.strategicQrLoaded }).catch((error) => {
      showFeedback(error.message, "error", { title: "No se pudo cargar Gaming Center" });
    });
  }
  if (view === "validator") renderValidatorView();
  if (view === "reward-passes") renderRewardPassesView();
  if (view === "branches") renderBranchesView();
  if (view === "admin") renderAdminView();
}

function togglePortalMenu() {
  if (!workspace) return;
  if (window.matchMedia("(max-width: 960px)").matches) {
    workspace.classList.toggle("sidebar-open");
    return;
  }
  workspace.classList.toggle("sidebar-collapsed");
}

function closePortalMenu() {
  workspace?.classList.remove("sidebar-open");
}

function renderShell() {
  const logged = Boolean(session?.token);
  loginPanel.classList.toggle("hidden", logged);
  workspace.classList.toggle("hidden", !logged);
  if (!logged) {
    const updateNotice = consumeAppUpdateNotice();
    if (updateNotice) {
      setInlineMessage(loginError, updateNotice, "info");
      showFeedback(updateNotice, "info", { title: "Portal actualizado", timeout: 9000 });
    }
    return;
  }

  if (isSessionExpired(session)) {
    forceLoginAfterSessionIssue("Tu sesion expiro. Inicia sesion de nuevo para continuar.");
    return;
  }

  refreshSessionIdentity()
    .then(() => {
      const redirectTo = loginRedirectForSession(session);
      if (redirectTo) {
        saveValidatorSession(session);
        window.location.assign(redirectTo);
        return;
      }

      profileName.textContent = session.user.full_name || session.user.email || "Business User";
      profileAvatar.textContent = initials(session.user.full_name || session.user.email || "MG");
      requestCampaignButton.textContent = isAdmin()
        ? (session.user.business_id ? "New Campaign" : "Admin Campaigns")
        : "Nueva campana";
      return loadWorkspace().then(applyInitialRouteParams);
    })
    .catch((error) => {
      if (session?.token) {
        showFeedback(error.message || "No se pudo validar la sesion.", "error");
      }
    });
}

function applyInitialRouteParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const requestedView = urlParams.get("view");
  const urlToken = urlParams.get("token");
  if (requestedView && viewFeatureMap[requestedView] !== undefined) {
    setView(requestedView);
  }
  if (urlToken) {
    setView("validator");
    validatorQrTokenInput.value = urlToken;
    validateValidatorToken(urlToken);
  }
}

function openGamingCenterEntry() {
  if (session?.token) {
    setView("strategic-qr");
    closePortalMenu();
    showFeedback("Gaming Center abierto. Crea marketing gamificado con juegos, tickets QR, premios y beneficios medibles.", "success", { title: "Marketing gamificado" });
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("view", "strategic-qr");
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  setInlineMessage(loginError, "Inicia sesion y abriremos Gaming Center como primera pantalla del portal.", "info");
  emailInput.focus();
}

async function login(event) {
  event.preventDefault();
  loginError.textContent = "";
  hideFeedback();
  const submitButton = loginForm.querySelector("button[type='submit']");
  setButtonLoading(submitButton, true, "Entrando...");
  setInlineMessage(loginError, "Validando credenciales...", "info");
  showFeedback("Validando credenciales y preparando el portal.", "loading", { title: "Iniciando sesion", timeout: 0 });
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value,
      }),
    });
    saveSession(data);
    const redirectTo = loginRedirectForSession(data);
    if (redirectTo) {
      saveValidatorSession(data);
      setInlineMessage(loginError, "Acceso legacy detectado. Abriendo modulo Validador...", "success");
      showFeedback("Tu acceso usa el modulo Validador. Compra T200 para activar Portal Base.", "success", { title: "Acceso legacy", timeout: 0 });
      window.location.assign(redirectTo);
      return;
    }
    setInlineMessage(loginError, "Credenciales correctas. Cargando portal...", "success");
    showFeedback("Sesion validada. Cargando informacion del negocio.", "loading", { title: "Acceso concedido", timeout: 0 });
    renderShell();
  } catch (error) {
    setInlineMessage(loginError, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo entrar" });
  } finally {
    setButtonLoading(submitButton, false);
  }
}

async function submitPasswordResetRequest(event) {
  event.preventDefault();
  setInlineMessage(passwordResetMessage, "Preparando recuperacion...", "info");
  try {
    const email = passwordResetEmailInput.value.trim() || emailInput.value.trim();
    if (!email) {
      throw new Error("Escribe el correo de acceso.");
    }
    const data = await api("/api/auth/password/request-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    const devUrl = data.reset_url ? ` En desarrollo: ${data.reset_url}` : "";
    setInlineMessage(passwordResetMessage, `${data.message || "Revisa tu correo."}${devUrl}`, "success");
  } catch (error) {
    setInlineMessage(passwordResetMessage, error.message || "No se pudo solicitar recuperacion.", "error");
  }
}

async function submitPasswordReset(event) {
  event.preventDefault();
  const resetToken = new URLSearchParams(window.location.search).get("reset_token");
  if (!resetToken) {
    setInlineMessage(passwordResetMessage, "Token de recuperacion no encontrado.", "error");
    return;
  }
  if (passwordResetNewInput.value !== passwordResetConfirmInput.value) {
    setInlineMessage(passwordResetMessage, "La confirmacion de password no coincide.", "error");
    return;
  }
  setInlineMessage(passwordResetMessage, "Actualizando password...", "info");
  try {
    const data = await api("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({
        token: resetToken,
        password: passwordResetNewInput.value,
        password_confirm: passwordResetConfirmInput.value,
      }),
    });
    setInlineMessage(passwordResetMessage, data.message || "Password actualizado.", "success");
    passwordResetForm.reset();
    passwordResetForm.classList.add("hidden");
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (error) {
    setInlineMessage(passwordResetMessage, error.message || "No se pudo actualizar el password.", "error");
  }
}

function initPasswordResetFromUrl() {
  const resetToken = new URLSearchParams(window.location.search).get("reset_token");
  if (!resetToken || !passwordResetForm) return;
  passwordResetForm.classList.remove("hidden");
  setInlineMessage(passwordResetMessage, "Escribe y confirma tu nuevo password.", "info");
}

function activeCampaignsForAssociation() {
  return (state.campaigns || []).filter((campaign) => !["ARCHIVED", "FINISHED"].includes(campaign.status));
}

function campaignById(campaignId) {
  return (state.campaigns || []).find((campaign) => campaign.id === campaignId) || null;
}

function campaignAssociationOptions(selectedValue = "", options = {}) {
  const campaigns = activeCampaignsForAssociation();
  const allowNoCampaign = options.allowNoCampaign !== false;
  const shouldForceCampaign = allowNoCampaign && campaigns.length > 0 && !isPrepaidValidatorOnly();
  const defaultLabel = !campaigns.length
    ? "Crea una campana antes de asociar tickets"
    : shouldForceCampaign || !allowNoCampaign
      ? "Selecciona campana / activacion"
      : "Sin campana: activacion por tickets";
  const defaultOption = `<option value="" ${shouldForceCampaign || !allowNoCampaign ? "disabled" : ""}>${defaultLabel}</option>`;
  return [
    defaultOption,
    ...campaigns.map((campaign) => `
      <option value="${escapeHtml(campaign.id)}" ${campaign.id === selectedValue ? "selected" : ""}>
        ${escapeHtml(campaign.name)} (${escapeHtml(campaign.status || "-")})
      </option>
    `),
  ].join("");
}

function campaignPublicLeadQrPath(campaign) {
  const businessSlug = state.businessProfile?.slug || session.user?.business?.slug || "";
  const campaignSlug = campaign?.public_slug || campaign?.slug || "";
  if (!businessSlug || !campaignSlug) return "";
  return `/api/public/campaigns/${encodeURIComponent(businessSlug)}/${encodeURIComponent(campaignSlug)}/lead-qr`;
}

function campaignPublicLeadQrUrl(campaign) {
  const path = campaignPublicLeadQrPath(campaign);
  return path ? `${window.location.origin}${path}` : "";
}

function renderCampaignAssociationInputs() {
  const selectedCampaignId = state.selectedCampaignId || "";
  const campaigns = activeCampaignsForAssociation();
  const selectedCampaign = campaignById(selectedCampaignId) || campaigns[0] || null;
  [
    [postSaleCampaignInput, true],
    [qrBatchCampaignInput, true],
    [triviaCampaignInput, true],
    [affiliateReferralQrCampaignInput, false],
  ].forEach(([input, allowNoCampaign]) => {
    if (!input) return;
    const currentValue = input.value || selectedCampaignId || selectedCampaign?.id || "";
    input.innerHTML = campaignAssociationOptions(currentValue, { allowNoCampaign });
    if (currentValue && Array.from(input.options).some((option) => option.value === currentValue)) {
      input.value = currentValue;
    } else if (selectedCampaign?.id && Array.from(input.options).some((option) => option.value === selectedCampaign.id)) {
      input.value = selectedCampaign.id;
    }
    input.required = allowNoCampaign && campaigns.length > 0 && !isPrepaidValidatorOnly();
  });

  const campaignName = selectedCampaign?.name || "";
  const associationCopy = campaigns.length
    ? `Campana sugerida: ${campaignName}. Todo Ticket generado con esa seleccion alimenta sus leads, redenciones, ventas y ROI.`
    : "No hay campanas activas o listas. Crea una campana para que los tickets entren a un reporte medible.";
  if (qrWorkflowContext) qrWorkflowContext.textContent = associationCopy;
  if (postSaleCampaignHelp) postSaleCampaignHelp.textContent = campaigns.length
    ? "Este ticket se guardara dentro de la campana seleccionada y aparecera en su reporte."
    : "Sin campana, el ticket queda como actividad general del negocio.";
  if (qrBatchCampaignHelp) qrBatchCampaignHelp.textContent = campaigns.length
    ? "El lote completo descontara tickets y cada ticket quedara asociado a la campana seleccionada."
    : "Primero crea una campana para medir el lote por activacion.";
  if (triviaCampaignHelp) triviaCampaignHelp.textContent = campaigns.length
    ? "La activacion emitira tickets segun la dinamica y los asociara a la campana seleccionada."
    : "Primero crea una campana para medir la activacion por leads, tickets y redenciones.";
}

function requireCampaignAssociation(input, messageElement, actionLabel) {
  const campaigns = activeCampaignsForAssociation();
  if (!input || input.value || !campaigns.length || isPrepaidValidatorOnly()) {
    return true;
  }
  const message = `Selecciona la campana o activacion antes de ${actionLabel}. Asi los tickets no quedan sueltos fuera del reporte.`;
  setInlineMessage(messageElement, message, "error");
  showFeedback(message, "error", { title: "Falta asociar campana" });
  input.focus();
  return false;
}

async function loadLockedSubscriptionWorkspace(errorMessage = "") {
  stopActivityPolling();
  const [subscriptionPlansData, businessUsersData] = await Promise.all([
    apiSafe("/api/public/subscription-plans", {}, { plans: [], prepaid_reference: [] }),
    apiSafe("/api/business/users", { headers: authHeaders() }, { users: [] }),
  ]);
  state.subscription = session.user?.subscription || state.subscription;
  state.subscriptionPlans = subscriptionPlansData.plans || [];
  state.prepaidReference = subscriptionPlansData.prepaid_reference || [];
  state.pricing = subscriptionPlansData.pricing || state.pricing;
  state.businessUsers = businessUsersData.users || [];
  state.dashboard = null;
  state.commandCenter = null;
  state.summary = null;
  state.campaigns = [];
  state.campaignGroups = null;
  state.contactFeed = [];
  state.contactFeedRetention = null;
  state.contactFeedGate = null;
  state.qrCreditAccount = null;
  state.businessProfile = {
    id: session.user?.business_id,
    name: state.subscription?.business_name || session.user?.business_id || "Negocio",
    current_user: session.user,
  };

  renderSubscriptionBanner();
  renderSubscriptionPricing();
  renderAccountView();
  applyPlanNavigation();
  renderNoCampaignState();
  setView("account");
  showFeedback(
    errorMessage || "La mensualidad supero la gracia de 15 dias. Renueva para recuperar el portal; tus datos siguen guardados.",
    "error",
    { title: "Portal bloqueado" }
  );
}

async function loadWorkspace() {
  if (state.loadedBusinessId && state.loadedBusinessId !== session?.user?.business_id) {
    resetBusinessScopedState({ session, keepView: false });
  }
  const loadSeq = ++state.workspaceLoadSeq;
  const loadBusinessId = session?.user?.business_id || null;
  state.subscription = session.user?.subscription || state.subscription;
  if (isPrepaidValidatorOnly()) {
    await loadPrepaidValidatorWorkspace();
    return;
  }

  showFeedback(
    lightTestMode ? "Modo prueba ligero activo. Evitando cargas pesadas de Supabase." : "Actualizando dashboard, tickets, campanas e historial.",
    "loading",
    { title: lightTestMode ? "Prueba ligera" : "Sincronizando portal", timeout: 0 }
  );
  showBusyOverlay(
    lightTestMode ? "Prueba ligera" : "Sincronizando portal",
    lightTestMode ? "Cargando solo lo necesario para probar activaciones y tickets." : "Cargando metricas, cartera de tickets y ultimos movimientos."
  );
  refreshButton.disabled = true;
  if (!session?.user?.business_id) {
    if (isAdmin()) {
      try {
        const adminCampaignData = await api("/api/admin/campaigns", { headers: authHeaders() });
        if (loadSeq !== state.workspaceLoadSeq || (session?.user?.business_id || null) !== loadBusinessId) return;
        state.dashboard = null;
        state.summary = null;
        state.campaigns = [];
        state.adminCampaigns = adminCampaignData.campaigns || [];
        state.selectedCampaignId = null;
        state.selectedCampaign = null;
        state.selectedReport = null;
        state.selectedLeads = [];
        state.contactFeed = [];
        state.contactFeedRetention = null;
        state.contactFeedGate = null;
        state.selectedRedemptions = [];
        state.selectedSales = [];
        state.loadedBusinessId = null;
        renderNoCampaignState();
        setView("admin");
        showFeedback("Vista admin global cargada. Selecciona una campana o negocio para continuar.", "success", { title: "Sesion lista" });
      } catch (error) {
        showFeedback(error.message, "error");
      } finally {
        if (loadSeq === state.workspaceLoadSeq) {
          refreshButton.disabled = false;
          hideBusyOverlay();
        }
      }
      return;
    }

    businessKpiGrid.innerHTML = '<article class="surface-card">Este usuario no tiene negocio asignado.</article>';
    showFeedback("Este usuario no tiene un negocio asignado.", "error");
    refreshButton.disabled = false;
    hideBusyOverlay();
    return;
  }

  if (!lightTestMode) {
    renderSkeletonCards(businessKpiGrid, 6);
    strategicQrKpiGrid.innerHTML = '<article class="surface-card kpi-card"><span class="mono-label">Gaming Center</span><strong class="kpi-value">Bajo demanda</strong><p class="kpi-meta">Las metricas de activaciones y tickets se cargan al abrir esta seccion para reducir egresos.</p></article>';
    recentRedemptionsTable.innerHTML = '<tr><td colspan="5">Cargando redenciones recientes...</td></tr>';
    recentLeadsTable.innerHTML = '<tr><td colspan="5">Cargando leads recientes...</td></tr>';
    qrBatchTable.innerHTML = '<tr><td colspan="5">Abre Gaming Center para cargar paquetes recientes.</td></tr>';
    strategicQrHistoryTable.innerHTML = '<tr><td colspan="5">Abre Gaming Center para cargar historial reciente.</td></tr>';
  }

  const needsLogoPayload = !lightTestMode && (!(state.businessProfile?.logo_data_url
    || session?.user?.business?.logo_data_url
    || session?.user?.business?.settings?.logo_data_url)
    || !(state.businessProfile?.ticket_frame_data_url
      || session?.user?.business?.ticket_frame_data_url
      || session?.user?.business?.settings?.ticket_frame_data_url));
  const profileEndpoint = `/api/business/profile${needsLogoPayload ? "?includeLogo=1" : ""}`;
  const shouldLoadDashboardData = !lightTestMode && (state.currentView === "dashboard" || !state.dashboard);
  const requests = [
    apiSafe("/api/business/access", { headers: authHeaders() }, { access: null }),
    shouldLoadDashboardData ? api(`/api/dashboard/businesses/${session.user.business_id}`, { headers: authHeaders() }) : Promise.resolve(state.dashboard || {}),
    shouldLoadDashboardData ? apiSafe(`/api/business/analytics/command-center?${commandCenterQueryString()}`, { headers: authHeaders() }, null) : Promise.resolve(state.commandCenter || null),
    api("/api/business/campaigns", { headers: authHeaders() }),
    apiSafe(profileEndpoint, { headers: authHeaders() }, { business: null }),
    apiSafe("/api/qr/credits/me", { headers: authHeaders() }, { credit_account: null }),
    apiSafe("/api/public/subscription-plans", {}, { plans: [], prepaid_reference: [] }),
    Promise.resolve({ contacts: state.contactFeed || [], retention: state.contactFeedRetention || null, lead_gate: state.contactFeedGate || null }),
    lightTestMode ? Promise.resolve({ users: [] }) : apiSafe("/api/business/users", { headers: authHeaders() }, { users: [] }),
    lightTestMode ? Promise.resolve({ activity: null }) : apiSafe("/api/business/activity", { headers: authHeaders() }, { activity: null }),
  ];

  if (isAdmin()) {
    requests.push(api("/api/admin/campaigns", { headers: authHeaders() }));
  }

  try {
    const [accessData, dashboardData, commandCenterData, campaignData, businessProfileData, creditData, subscriptionPlansData, contactFeedData, businessUsersData, activityData, adminCampaignData] = await Promise.all(requests);
    if (loadSeq !== state.workspaceLoadSeq || session?.user?.business_id !== loadBusinessId) return;
    state.access = accessData.access || null;
    state.dashboard = dashboardData;
    state.commandCenter = commandCenterData;
    state.activityVersion = activityData.activity?.version || state.activityVersion || "";
    state.summary = campaignData.summary || null;
    mergeBusinessProfile(businessProfileData.business || null);
    state.subscription = businessProfileData.subscription || dashboardData.subscription || session.user?.subscription || null;
    state.campaignGroups = campaignData.groups || null;
    state.campaigns = campaignData.campaigns || [];
    state.qrCreditAccount = accessData.access?.ticketAccount || creditData.credit_account || businessProfileData.credit_account || null;
    state.subscriptionPlans = subscriptionPlansData.plans || [];
    state.prepaidReference = subscriptionPlansData.prepaid_reference || [];
    state.pricing = subscriptionPlansData.pricing || state.pricing;
    state.contactFeed = contactFeedData.contacts || [];
    state.contactFeedRetention = contactFeedData.retention || null;
    state.contactFeedGate = contactFeedData.lead_gate || null;
    state.contactFeedLoaded = false;
    state.businessUsers = businessUsersData.users || [];
    state.loadedBusinessId = session.user.business_id || null;
    state.affiliates = [];
    state.strategicQrMetrics = null;
    state.qrPackageOffers = [];
    state.qrCreditOrders = [];
    state.strategicQrBatches = [];
    state.strategicQrHistory = [];
    state.triviaLaunchers = [];
    state.affiliatesLoaded = false;
    state.strategicQrLoaded = false;
    state.ticketCenterLoadedAt = {};
    state.adminCampaigns = adminCampaignData?.campaigns || [];
    renderSubscriptionBanner();
    applyPlanNavigation();

    renderAccountView();
    if (lightTestMode) {
      businessKpiGrid.innerHTML = '<article class="surface-card">Modo prueba ligero activo. Se omitieron dashboard, analytics y feed para reducir egress de Supabase.</article>';
    } else if (state.dashboard) {
      renderDashboard();
    }
    renderBusinessLogoPanel();
    renderCampaignStateGrid();
    renderCampaignList();
    renderCampaignAssociationInputs();
    if (isAdmin()) renderAdminView();

    const selectedCampaignId = state.campaigns.some((item) => item.id === state.selectedCampaignId)
      ? state.selectedCampaignId
      : state.campaigns[0]?.id || null;

    if (selectedCampaignId && !lightTestMode) {
      setSelectedCampaignFromList(selectedCampaignId);
      renderCampaignList();
      renderCampaignAssociationInputs();
      if (viewNeedsCampaignData(state.currentView)) {
        await selectCampaign(selectedCampaignId);
      }
    } else {
      renderNoCampaignState();
    }
    if (!lightTestMode) startActivityPolling();
    if (lightTestMode) {
      await loadStrategicQrData({ groups: ["core", "activations"], force: true });
      renderStrategicQrView();
      setView("strategic-qr");
    }
    showFeedback(
      lightTestMode ? "Modo ligero listo. Prueba activaciones sin cargar dashboard pesado." : "Datos actualizados. Ya puedes revisar saldos, tickets y ventas.",
      "success",
      { title: lightTestMode ? "Prueba ligera" : "Portal actualizado" }
    );
  } catch (error) {
    if (loadSeq !== state.workspaceLoadSeq || (session?.user?.business_id || null) !== loadBusinessId) return;
    if (
      currentPlan().access_status === "LOCKED"
      || currentPlan().portal_access_allowed === false
      || /mensualidad vencio|15 dias de gracia|portal bloqueado/i.test(error.message || "")
    ) {
      await loadLockedSubscriptionWorkspace(error.message);
      return;
    }
    showFeedback(error.message, "error");
  } finally {
    if (loadSeq === state.workspaceLoadSeq) {
      refreshButton.disabled = false;
      hideBusyOverlay();
    }
  }
}

function stopActivityPolling() {
  if (state.activityPollingTimer) {
    window.clearInterval(state.activityPollingTimer);
    state.activityPollingTimer = 0;
  }
}

function startActivityPolling() {
  stopActivityPolling();
  if (lightTestMode) return;
  if (!session?.user?.business_id || isPrepaidValidatorOnly()) return;
  state.activityPollingTimer = window.setInterval(checkBusinessActivity, 30000);
}

async function checkBusinessActivity() {
  if (lightTestMode) return;
  if (document.hidden) return;
  if (!session?.user?.business_id || state.activityRefreshInFlight) return;
  const pollSeq = state.workspaceLoadSeq;
  const pollBusinessId = session.user.business_id;
  try {
    const data = await apiSafe("/api/business/activity", { headers: authHeaders() }, { activity: null });
    if (pollSeq !== state.workspaceLoadSeq || session?.user?.business_id !== pollBusinessId) return;
    const nextVersion = data.activity?.version || "";
    if (!nextVersion || nextVersion === state.activityVersion) return;
    state.activityVersion = nextVersion;
    await refreshLiveBusinessData();
  } catch (error) {
    console.warn("Activity polling failed:", error.message);
  }
}

async function refreshLiveBusinessData() {
  if (lightTestMode) return;
  if (!session?.user?.business_id || state.activityRefreshInFlight) return;
  const refreshSeq = state.workspaceLoadSeq;
  const refreshBusinessId = session.user.business_id;
  state.activityRefreshInFlight = true;
  try {
    const shouldRefreshDashboard = state.currentView === "dashboard";
    const shouldRefreshContacts = state.currentView === "leads" || state.contactFeedLoaded;
    const [dashboardData, commandCenterData, campaignData, contactFeedData, activityData] = await Promise.all([
      shouldRefreshDashboard ? api(`/api/dashboard/businesses/${session.user.business_id}`, { headers: authHeaders() }) : Promise.resolve(state.dashboard),
      shouldRefreshDashboard ? apiSafe(`/api/business/analytics/command-center?${commandCenterQueryString()}`, { headers: authHeaders() }, state.commandCenter) : Promise.resolve(state.commandCenter),
      api("/api/business/campaigns", { headers: authHeaders() }),
      shouldRefreshContacts
        ? apiSafe("/api/business/contacts/feed?limit=120", { headers: authHeaders() }, { contacts: state.contactFeed || [], retention: state.contactFeedRetention })
        : Promise.resolve({ contacts: state.contactFeed || [], retention: state.contactFeedRetention, lead_gate: state.contactFeedGate }),
      apiSafe("/api/business/activity", { headers: authHeaders() }, { activity: null }),
    ]);
    if (refreshSeq !== state.workspaceLoadSeq || session?.user?.business_id !== refreshBusinessId) return;

    state.dashboard = dashboardData;
    state.commandCenter = commandCenterData;
    state.summary = campaignData.summary || null;
    state.campaignGroups = campaignData.groups || null;
    state.campaigns = campaignData.campaigns || [];
    state.contactFeed = contactFeedData.contacts || [];
    state.contactFeedRetention = contactFeedData.retention || null;
    state.contactFeedGate = contactFeedData.lead_gate || null;
    state.contactFeedLoaded = shouldRefreshContacts ? true : state.contactFeedLoaded;
    state.activityVersion = activityData.activity?.version || state.activityVersion;

    if (shouldRefreshDashboard) renderDashboard();
    renderCampaignStateGrid();
    renderCampaignList();
    renderCampaignAssociationInputs();
    if (state.currentView === "leads") renderLeadsView();
    if (shouldRefreshDashboard) renderCommandCenter();

    if (state.selectedCampaignId && state.campaigns.some((item) => item.id === state.selectedCampaignId) && viewNeedsCampaignData(state.currentView)) {
      await selectCampaign(state.selectedCampaignId);
    }
    if (state.strategicQrLoaded || state.currentView === "strategic-qr") {
      markTicketCenterDataStale(["metrics", "batches", "history", "activations"]);
      if (state.currentView === "strategic-qr") {
        await loadTicketCenterForCurrentTab({ quiet: true });
      }
    }
    showFeedback("Graficas actualizadas con la ultima actividad de tickets.", "success", { title: "Datos en vivo", timeout: 2500 });
  } catch (error) {
    console.warn("Live refresh failed:", error.message);
  } finally {
    state.activityRefreshInFlight = false;
  }
}

async function loadPrepaidValidatorWorkspace() {
  const loadSeq = ++state.workspaceLoadSeq;
  const loadBusinessId = session?.user?.business_id || null;
  showFeedback("Cargando saldo de tickets y herramientas del portal.", "loading", { title: "Portal por tickets", timeout: 0 });
  showBusyOverlay("Portal por tickets", "Preparando saldo operativo, paquetes y muestra comercial de leads.");
  refreshButton.disabled = true;

  state.dashboard = null;
  state.summary = null;
  state.campaigns = [];
  state.campaignGroups = null;
  state.affiliates = [];
  state.contactFeed = [];
  state.contactFeedRetention = null;
  state.contactFeedGate = null;
  state.strategicQrMetrics = null;
  state.strategicQrBatches = [];
  state.strategicQrHistory = [];
  state.triviaLaunchers = [];
  state.adminCampaigns = [];
  state.businessProfile = {
    id: session.user.business_id,
    name: state.subscription?.business_name || session.user.business_id,
    current_user: session.user,
  };

  try {
    const needsLogoPayload = !(state.businessProfile?.logo_data_url
      || session?.user?.business?.logo_data_url
      || session?.user?.business?.settings?.logo_data_url)
      || !(state.businessProfile?.ticket_frame_data_url
        || session?.user?.business?.ticket_frame_data_url
        || session?.user?.business?.settings?.ticket_frame_data_url);
    const profileEndpoint = `/api/business/profile${needsLogoPayload ? "?includeLogo=1" : ""}`;
    const [accessData, creditData, packageData, subscriptionPlansData, creditOrdersData, businessProfileData, contactFeedData, businessUsersData] = await Promise.all([
      apiSafe("/api/business/access", { headers: authHeaders() }, { access: null }),
      apiSafe("/api/qr/credits/me", { headers: authHeaders() }, { credit_account: null }),
      apiSafe("/api/public/packages", {}, { packages: [] }),
      apiSafe("/api/public/subscription-plans", {}, { plans: [], prepaid_reference: [] }),
      apiSafe("/api/payments/qr-credits/orders?limit=20", { headers: authHeaders() }, { orders: [] }),
      apiSafe(profileEndpoint, { headers: authHeaders() }, { business: null, subscription: session.user?.subscription || null }),
      apiSafe("/api/business/contacts/feed?limit=40", { headers: authHeaders() }, { contacts: [], retention: null, lead_gate: null }),
      apiSafe("/api/business/users", { headers: authHeaders() }, { users: [] }),
    ]);
    if (loadSeq !== state.workspaceLoadSeq || session?.user?.business_id !== loadBusinessId) return;

    mergeBusinessProfile(businessProfileData.business || null);
    state.access = accessData.access || state.access || null;
    state.subscription = businessProfileData.subscription || session.user?.subscription || state.subscription;
    state.qrCreditAccount = accessData.access?.ticketAccount || creditData.credit_account || null;
    state.qrPackageOffers = packageData.packages || [];
    state.subscriptionPlans = subscriptionPlansData.plans || [];
    state.prepaidReference = subscriptionPlansData.prepaid_reference || packageData.packages || [];
    state.pricing = subscriptionPlansData.pricing || packageData.pricing || state.pricing;
    state.qrCreditOrders = creditOrdersData.orders || [];
    state.contactFeed = contactFeedData.contacts || [];
    state.contactFeedRetention = contactFeedData.retention || null;
    state.contactFeedGate = contactFeedData.lead_gate || null;
    state.contactFeedLoaded = true;
    state.businessUsers = businessUsersData.users || [];
    state.loadedBusinessId = session.user.business_id || null;

    renderSubscriptionBanner();
    applyPlanNavigation();
    renderAccountView();
    renderCampaignAssociationInputs();
    renderStrategicQrView();
    renderValidatorHistory([]);
    setView("strategic-qr");
    showFeedback("Crea tickets individuales o paquetes con tu saldo operativo. Portal Base muestra el historial permitido y Growth/Premium desbloquea mas profundidad.", "success", { title: "Herramientas listas" });
  } catch (error) {
    if (loadSeq !== state.workspaceLoadSeq || session?.user?.business_id !== loadBusinessId) return;
    showFeedback(error.message, "error", { title: "No se pudo cargar el validador" });
  } finally {
    if (loadSeq === state.workspaceLoadSeq) {
      refreshButton.disabled = false;
      hideBusyOverlay();
    }
  }
}

function commandValue(value, format = "number") {
  if (format === "money") return money(value);
  if (format === "percent") return `${toNumber(value).toFixed(1)}%`;
  if (format === "ratio") return ratioLabel(value);
  if (format === "text") return value || "-";
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("es-CO") : escapeHtml(value || "-");
}

function commandMetricSparkline(key) {
  const rows = state.commandCenter?.timeline || [];
  const map = {
    revenue: "revenue",
    sales: "sales",
    leads: "leads",
    qr: "qr_generated",
    active_qr: "qr_generated",
    redeemed_qr: "redemptions",
    expired_qr: "qr_generated",
    redemption_rate: "redemptions",
    conversion_rate: "sales",
    avg_ticket: "revenue",
    cac: "sales",
    roi: "revenue",
    affiliates: "sales",
    referrals: "sales",
  };
  const field = map[key] || "revenue";
  const values = rows.slice(-10).map((row) => toNumber(row[field]));
  const max = Math.max(1, ...values);
  return `<span class="command-sparkline" aria-hidden="true">${
    values.map((value) => `<i style="height:${Math.max(12, Math.round((value / max) * 100))}%"></i>`).join("")
  }</span>`;
}

function commandOptions(options = [], selected = "", allLabel = "Todos") {
  return [
    `<option value="">${escapeHtml(allLabel)}</option>`,
    ...options.map((item) => {
      const value = item.id || item.value;
      const label = item.name || item.label || item.value;
      return `<option value="${escapeHtml(value)}" ${String(selected) === String(value) ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }),
  ].join("");
}

function commandEmpty(title = "Aun no hay datos suficientes.", action = "Activa campanas, registra ventas o genera tickets para alimentar esta grafica.") {
  return `
    <div class="analytics-empty-state">
      <span class="material-symbols-outlined">query_stats</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(action)}</p>
    </div>`;
}

async function loadCommandCenterData({ quiet = false } = {}) {
  if (!session?.user?.business_id) return;
  if (!quiet) {
    commandCenterRoot?.classList.add("is-loading");
  } else {
    commandCenterRoot?.classList.add("is-recalculating");
  }
  try {
    state.commandCenter = await api(`/api/business/analytics/command-center?${commandCenterQueryString()}`, { headers: authHeaders() });
    renderCommandCenter();
    if (state.chartFocus.open) renderChartFocusMode();
  } catch (error) {
    if (commandCenterRoot) {
      commandCenterRoot.innerHTML = commandEmpty("No se pudo cargar RMS Command Center.", error.message || "Reintenta la sincronizacion del portal.");
    }
  } finally {
    commandCenterRoot?.classList.remove("is-loading");
    commandCenterRoot?.classList.remove("is-recalculating");
  }
}

function renderCommandCenterFilters(data) {
  const options = data.options || {};
  const filters = state.commandCenterFilters;
  const dates = commandCenterDateRange();
  return `
    <form class="command-filters" id="commandCenterFilters">
      <label>
        <span>Rango</span>
        <select data-command-filter="range">
          ${Object.entries(COMMAND_CENTER_RANGE_LABELS).map(([value, label]) => `<option value="${value}" ${filters.range === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <label class="${filters.range === "custom" ? "" : "is-filter-hidden"}">
        <span>Inicio</span>
        <input data-command-filter="startDate" type="date" value="${escapeHtml(dates.startDate)}">
      </label>
      <label class="${filters.range === "custom" ? "" : "is-filter-hidden"}">
        <span>Fin</span>
        <input data-command-filter="endDate" type="date" value="${escapeHtml(dates.endDate)}">
      </label>
      <label><span>Campana</span><select data-command-filter="campaignId">${commandOptions(options.campaigns, filters.campaignId, "Todas")}</select></label>
      <label><span>Canal</span><select data-command-filter="channel">${commandOptions(options.channels, filters.channel, "Todos")}</select></label>
      <label><span>Sucursal</span><select data-command-filter="branchId">${commandOptions(options.branches, filters.branchId, "Todas")}</select></label>
      <label><span>Estado del ticket</span><select data-command-filter="qrStatus">${commandOptions(options.qr_statuses, filters.qrStatus, "Todos")}</select></label>
      <label><span>Tipo de ticket</span><select data-command-filter="qrType">${commandOptions(options.qr_types, filters.qrType, "Todos")}</select></label>
      <label><span>Vendedor / validador</span><select data-command-filter="sellerId">${commandOptions(options.sellers, filters.sellerId, "Todos")}</select></label>
      <label><span>Afiliado</span><select data-command-filter="affiliateId">${commandOptions(options.affiliates, filters.affiliateId, "Todos")}</select></label>
      <label class="command-toggle">
        <input data-command-filter="comparePrevious" type="checkbox" ${filters.comparePrevious ? "checked" : ""}>
        <span>Comparar periodo anterior</span>
      </label>
      <button class="ghost-button" data-command-reset type="button">Limpiar</button>
      <small class="command-recalc-status"><span class="material-symbols-outlined">sync</span>Recalculando lectura RMS...</small>
    </form>`;
}

function renderCommandCenterKpis(data) {
  const items = data.kpis || [];
  return `
    <section class="command-kpi-grid" aria-label="KPIs ejecutivos RMS">
      ${items.map((item) => `
        <article class="command-kpi-card is-${escapeHtml(item.state)}" title="${escapeHtml(item.help)}" data-command-focus="kpi:${escapeHtml(item.key)}" tabindex="0" role="button">
          <div class="command-kpi-top">
            <span class="material-symbols-outlined">${escapeHtml(item.icon || "analytics")}</span>
            <small>${item.change > 0 ? "+" : ""}${toNumber(item.change).toFixed(1)}%</small>
          </div>
          <strong>${commandValue(item.value, item.format)}</strong>
          <p>${escapeHtml(item.label)}</p>
          ${commandMetricSparkline(item.key)}
          <small class="command-focus-hint">Haz clic para entender este KPI</small>
        </article>
      `).join("")}
    </section>`;
}

function renderFunnelChart(stages = []) {
  const max = Math.max(1, ...stages.map((stage) => toNumber(stage.value)));
  if (!stages.some((stage) => toNumber(stage.value) > 0)) return commandEmpty();
  return `
    <div class="command-funnel">
      ${stages.map((stage) => {
        const width = Math.max(8, Math.round((toNumber(stage.value) / max) * 100));
        return `
          <div class="command-funnel-row" data-command-focus="rms-funnel" data-focus-stage="${escapeHtml(stage.key || stage.label)}" tabindex="0" role="button">
            <div>
              <strong>${escapeHtml(stage.label)}</strong>
              <span>${stage.conversion_from_previous}% conversion · fuga ${commandValue(stage.loss_from_previous, stage.format)}</span>
            </div>
            <div class="command-funnel-track"><i style="width:${width}%"></i></div>
            <b>${commandValue(stage.value, stage.format)}</b>
          </div>`;
      }).join("")}
    </div>`;
}

function renderHeatmapChart(rows = []) {
  const weekdays = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  const max = Math.max(1, ...rows.map((row) => toNumber(row.value)));
  const bucket = new Map(rows.map((row) => [`${row.dow}-${row.hour}`, row.value]));
  if (!rows.length || !rows.some((row) => toNumber(row.value) > 0)) return commandEmpty("Aun no hay redenciones por hora.", "Cuando el equipo redima tickets, veras los mejores dias y horas.");
  return `
    <div class="command-heatmap" role="img" aria-label="Mapa de calor de redenciones por dia y hora">
      <span></span>${Array.from({ length: 24 }, (_, hour) => `<b>${hour}</b>`).join("")}
      ${weekdays.map((label, dow) => `
        <strong>${label}</strong>
        ${Array.from({ length: 24 }, (_, hour) => {
          const value = toNumber(bucket.get(`${dow}-${hour}`));
          const alpha = value ? Math.max(0.16, value / max) : 0.04;
          return `<i title="${label} ${hour}:00 · ${value} redenciones" style="--heat:${alpha}" data-command-focus="heatmap" data-focus-dow="${dow}" data-focus-hour="${hour}" tabindex="0" role="button"></i>`;
        }).join("")}
      `).join("")}
    </div>`;
}

function renderMatrixChart(rows = []) {
  const metric = state.commandCenterFilters.matrixMetric || "revenue";
  const metricLabels = {
    leads: "Leads",
    qr_generated: "Tickets",
    redemptions: "Redenciones",
    sales: "Ventas",
    revenue: "Revenue",
    conversion_rate: "Conversion",
  };
  if (!rows.length || !rows.some((row) => toNumber(row[metric] || row.revenue || row.sales || row.leads || row.redemptions) > 0)) return commandEmpty("La matriz aun no tiene cruces medibles.", "Registra leads, tickets, redenciones o ventas con canal para saber que campana funciona en cada medio.");
  const campaigns = Array.from(new Set(rows.map((row) => row.campaign_name))).slice(0, 8);
  const channels = Array.from(new Set(rows.map((row) => row.channel))).slice(0, 7);
  const max = Math.max(1, ...rows.map((row) => toNumber(row[metric])));
  return `
    <div class="command-panel-tools" aria-label="Selector de metrica de matriz">
      ${Object.entries(metricLabels).map(([value, label]) => `
        <button class="${metric === value ? "active" : ""}" data-command-matrix-metric="${value}" type="button">${label}</button>
      `).join("")}
    </div>
    <div class="command-matrix-wrap">
      <table class="command-matrix">
        <thead><tr><th>Campana / Canal</th>${channels.map((channel) => `<th>${escapeHtml(channel)}</th>`).join("")}</tr></thead>
        <tbody>
          ${campaigns.map((campaign) => `
            <tr>
              <th>${escapeHtml(campaign)}</th>
              ${channels.map((channel) => {
                const row = rows.find((item) => item.campaign_name === campaign && item.channel === channel) || {};
                const value = toNumber(row[metric]);
                const label = metric === "revenue" ? money(value) : metric === "conversion_rate" ? `${value}%` : value.toLocaleString("es-CO");
                return `<td style="--intensity:${value / max}" title="${escapeHtml(campaign)} / ${escapeHtml(channel)} · ${escapeHtml(metricLabels[metric])}: ${escapeHtml(label)}" data-command-focus="matrix" data-focus-campaign="${escapeHtml(campaign)}" data-focus-channel="${escapeHtml(channel)}" tabindex="0" role="button">${value ? escapeHtml(label) : "-"}</td>`;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderTreemapChart(rows = []) {
  const total = rows.reduce((sum, row) => sum + toNumber(row.revenue), 0);
  if (!total) return commandEmpty("Sin revenue por canal todavia.", "Registra ventas con origen para construir el treemap.");
  return `
    <div class="command-treemap">
      ${rows.slice(0, 9).map((row, index) => {
        const share = Math.max(12, Math.round((toNumber(row.revenue) / total) * 100));
        const span = Math.max(2, Math.min(6, Math.ceil(share / 18)));
        return `<article style="--share:${share}; --span:${span}; --tone:${index}" data-command-focus="treemap" data-focus-channel="${escapeHtml(row.label)}" tabindex="0" role="button">
          <strong>${escapeHtml(row.label)}</strong>
          <span>${money(row.revenue)}</span>
          <small>${row.sales} ventas · ${Math.round((toNumber(row.revenue) / total) * 100)}%</small>
        </article>`;
      }).join("")}
    </div>`;
}

function renderSankeyChart(data = {}) {
  const nodes = data.nodes || [];
  const links = data.links || [];
  if (!nodes.length || !links.length) return commandEmpty("No hay flujo de atribucion suficiente.", "Cuando haya canales, campanas y ventas, se dibujara el flujo RMS.");
  const max = Math.max(1, ...links.map((link) => toNumber(link.value)));
  const left = nodes.slice(0, Math.ceil(nodes.length / 2));
  const right = nodes.slice(Math.ceil(nodes.length / 2));
  const point = (name, side) => {
    const list = side === "left" ? left : right;
    const index = Math.max(0, list.findIndex((node) => node.name === name));
    const y = 34 + index * (210 / Math.max(1, list.length - 1 || 1));
    return { x: side === "left" ? 70 : 520, y };
  };
  return `
    <svg class="command-sankey" viewBox="0 0 600 280" role="img" aria-label="Flujo de atribucion RMS">
      ${links.slice(0, 14).map((link) => {
        const sourceSide = left.some((node) => node.name === link.source) ? "left" : "right";
        const targetSide = sourceSide === "left" ? "right" : "left";
        const a = point(link.source, sourceSide);
        const b = point(link.target, targetSide);
        const width = 1 + (toNumber(link.value) / max) * 10;
        return `<path d="M ${a.x} ${a.y} C 245 ${a.y}, 345 ${b.y}, ${b.x} ${b.y}" stroke-width="${width}" />`;
      }).join("")}
      ${left.map((node, index) => `<g><circle cx="70" cy="${34 + index * (210 / Math.max(1, left.length - 1 || 1))}" r="8"/><text x="86" y="${39 + index * (210 / Math.max(1, left.length - 1 || 1))}">${escapeHtml(node.name).slice(0, 22)}</text></g>`).join("")}
      ${right.map((node, index) => `<g><circle cx="520" cy="${34 + index * (210 / Math.max(1, right.length - 1 || 1))}" r="8"/><text x="332" y="${39 + index * (210 / Math.max(1, right.length - 1 || 1))}">${escapeHtml(node.name).slice(0, 22)}</text></g>`).join("")}
    </svg>`;
}

function renderAffiliateNetwork(data = {}) {
  const nodes = data.nodes || [];
  if (!nodes.length) return commandEmpty("Aun no hay red de afiliados.", "Crea afiliados y tickets de recomendacion para ver el grafo.");
  const max = Math.max(1, ...nodes.map((node) => toNumber(node.revenue)));
  const centerX = 300;
  const centerY = 170;
  return `
    <svg class="command-network" viewBox="0 0 600 340" role="img" aria-label="Red de afiliados y referidos">
      <circle class="center-node" cx="${centerX}" cy="${centerY}" r="34"></circle>
      <text x="${centerX}" y="${centerY + 5}" text-anchor="middle">MG</text>
      ${nodes.slice(0, 14).map((node, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length);
        const radius = 110 + ((index % 3) * 24);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const size = 9 + (toNumber(node.revenue) / max) * 22;
        return `
          <line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}"></line>
          <circle cx="${x}" cy="${y}" r="${size}"></circle>
          <text x="${x}" y="${y + size + 16}" text-anchor="middle">${escapeHtml(node.name || "Afiliado").slice(0, 14)}</text>`;
      }).join("")}
    </svg>`;
}

function renderDecisionMap(map = {}) {
  const config = [
    ["repeat", "Repetir", "Alto ROI y conversion"],
    ["optimize", "Optimizar", "Muchos leads, baja venta"],
    ["pause", "Pausar", "Costo alto, bajo revenue"],
    ["scale", "Escalar", "Buen ticket con bajo volumen"],
    ["investigate", "Investigar", "Datos incompletos o atipicos"],
  ];
  return `
    <div class="decision-map">
      ${config.map(([key, title, help]) => `
        <article>
          <strong>${title}</strong>
          <span>${help}</span>
          <div>${(map[key] || []).slice(0, 5).map((item) => `<i>${escapeHtml(item)}</i>`).join("") || "<em>Sin elementos</em>"}</div>
        </article>
      `).join("")}
    </div>`;
}

function renderCohortChart(rows = []) {
  if (!rows.length) return commandEmpty("Sin cohortes postventa.", "Registra ventas y genera ticket postventa para medir recompra.");
  const max = Math.max(1, ...rows.map((row) => toNumber(row.post_sale_qr)));
  return `
    <div class="cohort-grid">
      ${rows.map((row) => `
        <article>
          <strong>${formatDateShort(row.cohort)}</strong>
          <span>${row.purchases} compras · ${money(row.revenue)}</span>
          <div><i style="width:${Math.max(6, (toNumber(row.post_sale_qr) / max) * 100)}%"></i></div>
          <small>${row.post_sale_redeemed}/${row.post_sale_qr} ticket postventa redimidos · ${row.retention_rate}%</small>
        </article>
      `).join("")}
    </div>`;
}

function renderPowerTable(rows = []) {
  if (!rows.length) return commandEmpty("Sin campanas para tabla avanzada.", "Crea campanas y registra ventas para activar drill-down.");
  const search = (state.commandCenterFilters.tableSearch || "").trim().toLowerCase();
  const sortKey = state.commandCenterFilters.tableSort || "revenue";
  const sortedRows = rows
    .filter((row) => !search || [row.campaign_name, row.top_channel, row.health_state].some((value) => String(value || "").toLowerCase().includes(search)))
    .sort((a, b) => toNumber(b[sortKey]) - toNumber(a[sortKey]));
  return `
    <div class="command-table-toolbar">
      <label>
        <span>Buscar</span>
        <input data-command-table-search type="search" value="${escapeHtml(state.commandCenterFilters.tableSearch || "")}" placeholder="Campana, canal o estado">
      </label>
      <label>
        <span>Ordenar por</span>
        <select data-command-table-sort>
          ${[
            ["revenue", "Revenue"],
            ["conversion_rate", "Conversion"],
            ["redemption_rate", "Redencion"],
            ["sales", "Ventas"],
            ["leads", "Leads"],
            ["roi", "ROI"],
          ].map(([value, label]) => `<option value="${value}" ${sortKey === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="table-wrap command-table-wrap">
      <table class="command-table">
        <thead>
          <tr>
            <th>Campana</th><th>Canal</th><th>Leads</th><th>Tickets</th><th>Redenciones</th><th>Ventas</th><th>Revenue</th><th>CAC</th><th>ROI</th><th>Conversion</th><th>Salud</th><th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          ${sortedRows.map((row) => {
            const health = row.roi > 0.25 || row.conversion_rate > 15 ? "Sana" : row.leads > 10 && row.sales < 2 ? "Optimizar" : "Observar";
            const isExpanded = state.commandCenterFilters.expandedCampaignId === row.id;
            return `
              <tr class="${isExpanded ? "is-expanded" : ""}">
                <td><strong>${escapeHtml(row.campaign_name)}</strong><small>${escapeHtml(row.campaign_status || "Campana")}</small></td>
                <td>${escapeHtml(row.top_channel || "Sin canal")}</td>
                <td>${row.leads}</td>
                <td>${row.qr_generated}</td>
                <td>${row.redemptions}</td>
                <td>${row.sales}</td>
                <td>${money(row.revenue)}</td>
                <td>${money(row.cac)}</td>
                <td>${ratioLabel(row.roi)}</td>
                <td>${row.conversion_rate}%</td>
                <td><span class="status-chip ${health === "Sana" ? "ok" : health === "Optimizar" ? "pending" : "danger"}">${health}</span></td>
                <td><button class="ghost-button command-row-button" data-command-expand-row="${escapeHtml(row.id)}" type="button">${isExpanded ? "Cerrar" : "Ver"}</button></td>
              </tr>
              ${isExpanded ? `
                <tr class="command-detail-row">
                  <td colspan="12">
                    <div class="command-detail-grid">
                      <article><span>Redencion</span><strong>${row.redemption_rate}%</strong><small>Tickets redimidos sobre Tickets generados.</small></article>
                      <article><span>Ticket promedio</span><strong>${money(row.avg_ticket)}</strong><small>Revenue por venta registrada.</small></article>
                      <article><span>Canal dominante</span><strong>${escapeHtml(row.top_channel || "Sin datos")}</strong><small>Origen con mayor revenue o ventas.</small></article>
                      <article><span>Decision sugerida</span><strong>${escapeHtml(row.decision_hint || "Investigar")}</strong><small>${escapeHtml(row.decision_reason || "Completa datos de canal y ventas para cerrar lectura.")}</small></article>
                    </div>
                  </td>
                </tr>` : ""}`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderRevenueStories(stories = []) {
  return `
    <section class="revenue-stories-grid">
      ${(stories.length ? stories : [{ priority: "opportunity", title: "Activa tus historias de revenue", metric: "El RMS necesita ventas, tickets y canales para narrar decisiones.", action: "Registra la proxima venta con origen y sucursal." }]).map((story) => `
        <article class="revenue-story is-${escapeHtml(story.priority)}">
          <span class="material-symbols-outlined">${story.priority === "risk" ? "warning" : story.priority === "win" ? "trophy" : "auto_graph"}</span>
          <div>
            <strong>${escapeHtml(story.title)}</strong>
            <p>${escapeHtml(story.metric || story.explanation || "")}</p>
            <small>${escapeHtml(story.action || "")}</small>
          </div>
        </article>
      `).join("")}
    </section>`;
}

function renderSuggestedDecisions(insights = []) {
  const rows = insights.length ? insights : [{
    priority: "opportunity",
    title: "Completa el ciclo RMS",
    explanation: "El sistema necesita campañas, tickets, redenciones y ventas para priorizar decisiones.",
    action: "Registra ventas con canal, sucursal y vendedor para activar recomendaciones mas precisas.",
  }];
  return `
    <div class="suggested-decisions">
      ${rows.slice(0, 5).map((item) => `
        <article class="suggested-decision is-${escapeHtml(item.priority)}">
          <span class="material-symbols-outlined">${item.priority === "risk" ? "priority_high" : item.priority === "alert" ? "report" : item.priority === "win" ? "verified" : "lightbulb"}</span>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.explanation || item.metric || "")}</p>
            <small>${escapeHtml(item.action || "")}</small>
          </div>
        </article>
      `).join("")}
    </div>`;
}

function feedToneIcon(priority) {
  if (priority === "risk") return "warning";
  if (priority === "alert") return "report";
  if (priority === "win") return "verified";
  return "tips_and_updates";
}

function renderGuidedRevenueFeed(data = {}) {
  const executive = data.executive_summary || {};
  const totals = data.totals || {};
  const score = data.revenue_score || {};
  const funnel = Array.isArray(data.funnel) ? data.funnel : [];
  const insights = Array.isArray(data.insights) ? data.insights : [];
  const campaigns = Array.isArray(data.power_table) ? data.power_table : [];
  const branches = Array.isArray(data.branch_performance) ? data.branch_performance : [];
  const topCampaign = campaigns[0] || {};
  const topBranch = branches[0] || {};
  const leakStage = funnel.slice(1).sort((a, b) => toNumber(b.loss_from_previous) - toNumber(a.loss_from_previous))[0] || null;
  const scoreValue = toNumber(score.score);
  const scoreLabel = score.status || (scoreValue >= 75 ? "Excelente" : scoreValue >= 55 ? "Bueno" : scoreValue >= 35 ? "En observacion" : "Critico");
  const scoreAction = (score.recommendations || [])[0] || "Registra ventas con canal, sucursal y origen para mejorar la lectura del RMS.";

  const feedItems = [
    {
      priority: scoreValue >= 70 ? "win" : scoreValue >= 45 ? "alert" : "risk",
      eyebrow: "Lectura inicial",
      title: `MG Revenue Score: ${scoreValue}/100`,
      metric: scoreLabel,
      what: "Es la salud comercial del negocio en el periodo filtrado. Combina redencion, conversion, revenue, afiliados, sucursales y calidad de datos.",
      signal: `El sistema interpreta el negocio como: ${scoreLabel}.`,
      action: scoreAction,
    },
    {
      priority: toNumber(executive.revenue || totals.revenue) > 0 ? "win" : "opportunity",
      eyebrow: "Revenue real",
      title: "Cuanto dinero se puede atribuir",
      metric: money(executive.revenue || totals.revenue || 0),
      what: "Revenue atribuido es la venta registrada que el RMS puede conectar con una campana, canal, ticket, afiliado o sucursal.",
      signal: `Canal ganador: ${executive.winning_channel || "Sin datos"} · Campana ganadora: ${executive.winning_campaign || "Sin datos"}.`,
      action: executive.recommended_action || "Registra cada venta con origen para que el sistema sepa que estrategia repetir.",
    },
    {
      priority: leakStage && toNumber(leakStage.loss_from_previous) > 0 ? "alert" : "opportunity",
      eyebrow: "Embudo RMS",
      title: leakStage ? `Fuga principal: ${leakStage.label}` : "Embudo listo para lectura",
      metric: leakStage ? commandValue(leakStage.loss_from_previous, leakStage.format) : `${toNumber(totals.redemptions)} redenciones`,
      what: "El embudo muestra como una persona avanza desde campana hasta venta. Cada salto mide donde se gana o pierde valor.",
      signal: leakStage ? `Conversion desde la etapa anterior: ${leakStage.conversion_from_previous}%.` : "Aun no hay una fuga dominante en el periodo.",
      action: leakStage ? "Revisa beneficio, urgencia, recordatorio o cierre comercial en esta etapa." : "Mantén ventas y redenciones bien registradas para detectar fugas reales.",
    },
    {
      priority: topCampaign.revenue > 0 || topCampaign.sales > 0 ? "win" : "opportunity",
      eyebrow: "Campana",
      title: topCampaign.campaign_name || "Campana pendiente de destacar",
      metric: topCampaign.campaign_name ? `${money(topCampaign.revenue || 0)} · ${toNumber(topCampaign.sales)} ventas` : "Sin datos suficientes",
      what: "Una campana sana no solo trae leads: tambien produce redenciones, ventas y revenue medible.",
      signal: topCampaign.campaign_name ? `Decision sugerida: ${topCampaign.decision_hint || "Investigar"}.` : "Crea o activa campanas con tickets y registra el canal de llegada.",
      action: topCampaign.decision_reason || "Usa la tabla PowerBI-style para abrir el detalle de cada campana.",
    },
    {
      priority: topBranch.revenue > 0 || topBranch.sales > 0 ? "win" : "opportunity",
      eyebrow: "Sucursal",
      title: topBranch.branch_name || executive.leading_branch || "Sucursal sin lider",
      metric: topBranch.branch_name ? `${money(topBranch.revenue || 0)} · ${toNumber(topBranch.redemptions)} redenciones` : "Sin datos suficientes",
      what: "La sucursal lider muestra donde la operacion esta cerrando mejor el ciclo ticket -> visita -> venta.",
      signal: topBranch.branch_name ? "Compara esta sede contra las demas para replicar horarios, guion o incentivo." : "Asocia redenciones y ventas a una sucursal para activar rankings utiles.",
      action: "Si una sede convierte mejor, documenta que hizo distinto y pruebalo en las sedes con menor conversion.",
    },
    ...insights.slice(0, 4).map((item) => ({
      priority: item.priority || "opportunity",
      eyebrow: "Insight automatico",
      title: item.title || "Decision RMS",
      metric: item.metric || item.explanation || "Senal detectada",
      what: "Este insight sale de reglas del RMS que cruzan leads, tickets, redenciones, ventas, canales y revenue.",
      signal: item.explanation || item.metric || "El sistema encontro una senal relevante en el periodo.",
      action: item.action || "Revisa el detalle antes de invertir mas presupuesto.",
    })),
  ].slice(0, 9);

  return `
    <section class="command-feed-panel">
      <div class="command-feed-head">
        <div>
          <span class="mono-label">RMS Live Feed</span>
          <h3>Lectura guiada del negocio</h3>
          <p>Un feed didactico que explica que estas viendo, por que importa y cual es la siguiente decision comercial.</p>
        </div>
        <div class="command-feed-guide" aria-label="Como leer el feed RMS">
          <span><strong>1</strong> Lee la senal</span>
          <span><strong>2</strong> Entiende el impacto</span>
          <span><strong>3</strong> Ejecuta la accion</span>
        </div>
      </div>

      <div class="command-feed-glossary" aria-label="Diccionario rapido RMS">
        ${[
          ["Lead", "Persona capturada por campana o ticket."],
          ["Ticket reclamado", "Cliente tomo el beneficio, aun no necesariamente compro."],
          ["Ticket redimido", "Beneficio usado en tienda o punto de venta."],
          ["Venta atribuida", "Compra conectada con canal, campana o ticket."],
          ["ROI", "Retorno estimado frente a inversion registrada."],
        ].map(([term, definition]) => `<span title="${escapeHtml(definition)}"><strong>${term}</strong>${definition}</span>`).join("")}
      </div>

      <div class="command-feed-stream">
        ${feedItems.map((item, index) => `
          <article class="command-feed-item is-${escapeHtml(item.priority)}">
            <div class="command-feed-rail">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <i></i>
            </div>
            <div class="command-feed-card">
              <div class="command-feed-card-head">
                <span class="material-symbols-outlined">${feedToneIcon(item.priority)}</span>
                <div>
                  <small>${escapeHtml(item.eyebrow)}</small>
                  <h4>${escapeHtml(item.title)}</h4>
                </div>
                <strong>${escapeHtml(item.metric)}</strong>
              </div>
              <div class="command-feed-explain-grid">
                <section>
                  <span>Que es</span>
                  <p>${escapeHtml(item.what)}</p>
                </section>
                <section>
                  <span>Que indica</span>
                  <p>${escapeHtml(item.signal)}</p>
                </section>
                <section>
                  <span>Que hacer</span>
                  <p>${escapeHtml(item.action)}</p>
                </section>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    </section>`;
}

function renderCommandCenter() {
  const data = state.commandCenter;
  if (!commandCenterRoot) return;
  if (!data) {
    commandCenterRoot.innerHTML = commandEmpty("RMS Command Center sin datos cargados.", "Sincroniza el portal para cargar analytics avanzados.");
    return;
  }

  const executive = data.executive_summary || {};
  const score = data.revenue_score || { score: 0, status: "Sin datos", dimensions: [], recommendations: [] };
  commandCenterRoot.innerHTML = `
    <div class="command-center">
      <section class="command-hero">
        <div>
          <span class="mono-label">Market Games RMS</span>
          <h2>Centro de comando de revenue marketing</h2>
          <p>Lectura ejecutiva de campanas, canales, tickets, redenciones, ventas, afiliados, sucursales y revenue real.</p>
          <div class="command-hero-actions">
            <button class="solid-button" data-command-scroll="detail" type="button">Ver detalle</button>
            <button class="ghost-button" data-command-export type="button">Exportar CSV</button>
          </div>
        </div>
        <aside class="executive-summary-card">
          <span>Modo ejecutivo</span>
          <strong>${money(executive.revenue)}</strong>
          <p>Canal: ${escapeHtml(executive.winning_channel)} · Campana: ${escapeHtml(executive.winning_campaign)}</p>
          <dl>
            <div><dt>Sucursal lider</dt><dd>${escapeHtml(executive.leading_branch)}</dd></div>
            <div><dt>Afiliado destacado</dt><dd>${escapeHtml(executive.top_affiliate)}</dd></div>
            <div><dt>Riesgo</dt><dd>${escapeHtml(executive.main_risk)}</dd></div>
            <div><dt>Accion</dt><dd>${escapeHtml(executive.recommended_action)}</dd></div>
          </dl>
        </aside>
      </section>

      ${renderCommandCenterFilters(data)}
      ${renderCommandCenterKpis(data)}
      ${renderGuidedRevenueFeed(data)}

      <section class="command-main-grid">
        <article class="command-panel revenue-score-panel" data-command-focus="revenue-score" tabindex="0" role="button">
          <div class="command-panel-head">
            <div><span class="mono-label">MG Revenue Score</span><h3>${score.score}/100 · ${escapeHtml(score.status)}</h3></div>
            ${commandPanelActions("revenue-score")}
            <span class="score-orbit">${score.score}</span>
          </div>
          <canvas id="commandRadarChart" width="680" height="360"></canvas>
          <ul>${(score.recommendations || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
        <article class="command-panel" data-command-focus="rms-funnel" tabindex="0" role="button">
          <div class="command-panel-head"><div><span class="mono-label">Funnel RMS</span><h3>De campana a revenue</h3><p>Que significa: muestra donde se fuga valor. Decision: optimiza la etapa con mayor perdida.</p></div>${commandPanelActions("rms-funnel")}</div>
          ${renderFunnelChart(data.funnel || [])}
        </article>
      </section>

      <section class="command-panel">
        <div class="command-panel-head"><div><span class="mono-label">Historias de Revenue</span><h3>Infografias dinamicas para decidir</h3></div></div>
        ${renderRevenueStories(data.revenue_stories)}
      </section>

      <section class="command-panel">
        <div class="command-panel-head"><div><span class="mono-label">Decisiones sugeridas</span><h3>Insights automaticos del RMS</h3><p>Reglas de negocio que conectan interes, redencion, venta, afiliados y revenue.</p></div></div>
        ${renderSuggestedDecisions(data.insights)}
      </section>

      <section class="command-chart-grid" id="commandCenterDetail">
        <article class="command-panel" data-command-focus="timeline" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Linea temporal multiserie</span><h3>Leads, tickets, redenciones, ventas y revenue</h3><p>Decision: detecta dias de activacion y caidas de conversion.</p></div>${commandPanelActions("timeline")}</div><canvas id="commandTimelineChart" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="heatmap" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Heatmap horario</span><h3>Redenciones por dia y hora</h3><p>Decision: refuerza vendedores en franjas calientes.</p></div>${commandPanelActions("heatmap")}</div>${renderHeatmapChart(data.heatmap)}</article>
        <article class="command-panel command-wide" data-command-focus="matrix" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Matrix chart</span><h3>Campana vs canal</h3><p>Decision: encuentra el cruce exacto que produce ventas o revenue.</p></div>${commandPanelActions("matrix")}</div>${renderMatrixChart(data.campaign_channel_matrix)}</article>
        <article class="command-panel" data-command-focus="treemap" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Treemap revenue</span><h3>Revenue por canal</h3></div>${commandPanelActions("treemap")}</div>${renderTreemapChart(data.revenue_treemap)}</article>
        <article class="command-panel" data-command-focus="campaign-comparison" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Campanas comparadas</span><h3>Leads, tickets, redenciones, ventas y revenue</h3></div>${commandPanelActions("campaign-comparison")}</div><canvas id="commandCampaignBars" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="sankey" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Sankey RMS</span><h3>Flujo de atribucion</h3></div>${commandPanelActions("sankey")}</div>${renderSankeyChart(data.attribution_sankey)}</article>
        <article class="command-panel" data-command-focus="affiliate-network" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Afiliados y referidos</span><h3>Network graph</h3></div>${commandPanelActions("affiliate-network")}</div>${renderAffiliateNetwork(data.affiliate_network)}</article>
        <article class="command-panel" data-command-focus="branch-ranking" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Sucursales</span><h3>Ranking combinado</h3></div>${commandPanelActions("branch-ranking")}</div><canvas id="commandBranchRanking" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="qr-status" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Estado de tickets</span><h3>Activos, redimidos, vencidos y reclamados</h3></div>${commandPanelActions("qr-status")}</div><canvas id="commandQrDonut" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="scatter" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Scatter campañas</span><h3>Inversion / tickets vs revenue</h3></div>${commandPanelActions("scatter")}</div><canvas id="commandScatter" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="waterfall" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Waterfall revenue</span><h3>Composicion del revenue</h3></div>${commandPanelActions("waterfall")}</div><canvas id="commandWaterfall" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="cohorts" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Cohort postventa</span><h3>Recompra y ticket postventa</h3></div>${commandPanelActions("cohorts")}</div>${renderCohortChart(data.cohorts)}</article>
      </section>

      <section class="command-panel">
        <div class="command-panel-head"><div><span class="mono-label">RMS Mapa de Decisiones</span><h3>Repetir, optimizar, pausar, escalar e investigar</h3></div></div>
        ${renderDecisionMap(data.decision_map)}
      </section>

      <section class="command-panel" data-command-focus="power-table" tabindex="0" role="button">
        <div class="command-panel-head"><div><span class="mono-label">Tabla PowerBI-style</span><h3>Drill-down por campana</h3><p>Ordena visualmente por revenue, conversion y salud comercial.</p></div>${commandPanelActions("power-table")}</div>
        ${renderPowerTable(data.power_table)}
      </section>
    </div>`;

  bindCommandCenterEvents();
  drawCommandCenterCharts(data);
  const focusParam = new URLSearchParams(window.location.search).get("focus");
  if (focusParam && !state.chartFocus.deepLinkHandled && CHART_FOCUS_REGISTRY[focusParam]) {
    state.chartFocus.deepLinkHandled = true;
    openChartFocusMode(focusParam);
  }
}

function bindCommandCenterEvents() {
  commandCenterRoot?.querySelectorAll("[data-command-focus]").forEach((element) => {
    const open = () => {
      const context = chartFocusContextFromElement(element);
      openChartFocusMode(element.dataset.commandFocus, context, element);
    };
    element.addEventListener("click", (event) => {
      if (event.target.closest("button, select, input, textarea") && event.target !== element) return;
      open();
    });
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
  const form = document.getElementById("commandCenterFilters");
  form?.querySelectorAll("[data-command-filter]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const key = event.target.dataset.commandFilter;
      state.commandCenterFilters[key] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      if (key === "range") {
        const dates = commandCenterDateRange(event.target.value);
        state.commandCenterFilters.startDate = dates.startDate;
        state.commandCenterFilters.endDate = dates.endDate;
      }
      loadCommandCenterData({ quiet: true });
    });
  });
  commandCenterRoot?.querySelector("[data-command-reset]")?.addEventListener("click", () => {
    state.commandCenterFilters = {
      range: "30d",
      startDate: "",
      endDate: "",
      campaignId: "",
      channel: "",
      branchId: "",
      qrStatus: "",
      qrType: "",
      sellerId: "",
      affiliateId: "",
      comparePrevious: true,
      matrixMetric: "revenue",
      tableSearch: "",
      tableSort: "revenue",
      expandedCampaignId: "",
    };
    loadCommandCenterData({ quiet: true });
  });
  commandCenterRoot?.querySelectorAll("[data-command-matrix-metric]").forEach((button) => {
    button.addEventListener("click", () => {
      state.commandCenterFilters.matrixMetric = button.dataset.commandMatrixMetric || "revenue";
      renderCommandCenter();
    });
  });
  commandCenterRoot?.querySelector("[data-command-table-search]")?.addEventListener("input", (event) => {
    state.commandCenterFilters.tableSearch = event.target.value || "";
    renderCommandCenter();
  });
  commandCenterRoot?.querySelector("[data-command-table-sort]")?.addEventListener("change", (event) => {
    state.commandCenterFilters.tableSort = event.target.value || "revenue";
    renderCommandCenter();
  });
  commandCenterRoot?.querySelectorAll("[data-command-expand-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.commandExpandRow || "";
      state.commandCenterFilters.expandedCampaignId = state.commandCenterFilters.expandedCampaignId === id ? "" : id;
      renderCommandCenter();
    });
  });
  commandCenterRoot?.querySelector("[data-command-scroll]")?.addEventListener("click", () => {
    document.getElementById("commandCenterDetail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  commandCenterRoot?.querySelector("[data-command-export]")?.addEventListener("click", exportCommandCenterCsv);
}

function exportCommandCenterCsv() {
  const rows = state.commandCenter?.power_table || [];
  downloadCsv("rms-command-center", [
    ["Campana", "Leads", "Tickets", "Redenciones", "Ventas", "Revenue", "CAC", "ROI", "Conversion"],
    ...rows.map((row) => [
      row.campaign_name,
      row.leads,
      row.qr_generated,
      row.redemptions,
      row.sales,
      row.revenue,
      row.cac,
      row.roi,
      row.conversion_rate,
    ]),
  ]);
}

function commandFocusButton(chartId, label = "Analizar") {
  return `<button class="command-focus-button" type="button" data-command-focus="${escapeHtml(chartId)}" aria-label="Abrir ${escapeHtml(label)} en RMS Data Explorer">
    <span class="material-symbols-outlined">open_in_full</span>${escapeHtml(label)}
  </button>`;
}

function commandChartHelpButton(chartId) {
  const meta = chartFocusMeta(chartId);
  const copy = [
    `Como leer: ${meta.description}`,
    `Como se calcula: ${meta.calculation}`,
    `Decision: ${meta.businessMeaning}`,
    "Tip: haz clic en la grafica o en Analizar para ver el detalle.",
  ].join(" ");
  return `
    <button class="command-chart-help-button" type="button" aria-label="${escapeHtml(copy)}" title="${escapeHtml(copy)}">
      <span class="material-symbols-outlined">help</span>
      <span class="command-help-popover">
        <strong>${escapeHtml(meta.title)}</strong>
        <em>Como leer</em>
        <small>${escapeHtml(meta.description)}</small>
        <em>Decision</em>
        <small>${escapeHtml(meta.businessMeaning)}</small>
      </span>
    </button>`;
}

function commandPanelActions(chartId) {
  return `<div class="command-panel-actions">${commandChartHelpButton(chartId)}${commandFocusButton(chartId)}</div>`;
}

function chartFocusMeta(chartId) {
  if (chartId?.startsWith("kpi:")) {
    const key = chartId.split(":")[1] || "";
    const kpi = (state.commandCenter?.kpis || []).find((item) => item.key === key) || {};
    const dictionaryKey = key === "qr_redeemed" ? "redeemed_qr" : key;
    return {
      title: kpi.label || "KPI RMS",
      subtitle: "Indicador ejecutivo del periodo",
      chartType: "kpi",
      primaryMetric: dictionaryKey,
      description: kpi.help || "Este KPI resume una senal clave del negocio.",
      calculation: DATA_DICTIONARY[dictionaryKey]?.formula || "Se calcula desde los datos filtrados del RMS.",
      businessMeaning: DATA_DICTIONARY[dictionaryKey]?.decision || "Ayuda a decidir que estrategia repetir, optimizar o investigar.",
      recommendedActions: [DATA_DICTIONARY[dictionaryKey]?.decision || "Abre el desglose y compara contra el periodo anterior.", "Revisa los filtros activos para entender el contexto.", "Usa la tabla de campanas para llegar al detalle operativo."],
      supportedDrilldowns: ["campaign", "channel", "branch"],
      relatedMetrics: [dictionaryKey, "revenue", "conversion_rate"],
      dataDictionaryKeys: [dictionaryKey, "revenue", "conversion_rate"],
    };
  }
  return CHART_FOCUS_REGISTRY[chartId] || CHART_FOCUS_REGISTRY["executive-summary"];
}

function reducedMotionSafe() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function chartFocusContextFromElement(element) {
  return {
    stage: element.dataset.focusStage || "",
    dow: element.dataset.focusDow || "",
    hour: element.dataset.focusHour || "",
    campaign: element.dataset.focusCampaign || "",
    channel: element.dataset.focusChannel || "",
  };
}

function captureDataTravelOrigin(element) {
  if (!element || reducedMotionSafe()) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function dataTravelGhostStyle(rect) {
  if (!rect) return "";
  const targetX = window.innerWidth / 2 - (rect.left + rect.width / 2);
  const targetY = Math.max(180, window.innerHeight * 0.38) - (rect.top + rect.height / 2);
  const scaleX = Math.min(3.8, Math.max(1.08, (window.innerWidth * 0.62) / Math.max(rect.width, 1)));
  const scaleY = Math.min(3.2, Math.max(1.08, (window.innerHeight * 0.34) / Math.max(rect.height, 1)));
  return `style="--travel-left:${rect.left}px; --travel-top:${rect.top}px; --travel-width:${rect.width}px; --travel-height:${rect.height}px; --travel-x:${Math.round(targetX)}px; --travel-y:${Math.round(targetY)}px; --travel-scale-x:${scaleX.toFixed(3)}; --travel-scale-y:${scaleY.toFixed(3)};"`;
}

function chartFocusOriginLabel(chartId, context = {}) {
  const meta = chartFocusMeta(chartId);
  if (context.stage) return `Etapa: ${context.stage}`;
  if (context.channel && context.campaign) return `${context.campaign} / ${context.channel}`;
  if (context.channel) return `Canal: ${context.channel}`;
  if (context.campaign) return `Campana: ${context.campaign}`;
  if (context.dow || context.hour) return `Bloque horario: ${context.dow || "-"} ${context.hour || "0"}:00`;
  return meta.title;
}

function activeDataPath(chartId, context = {}) {
  const meta = chartFocusMeta(chartId);
  const path = ["Command Center", meta.title];
  if (context.stage) path.push(context.stage);
  if (context.campaign) path.push(context.campaign);
  if (context.channel) path.push(context.channel);
  if (context.dow || context.hour) path.push(`${context.dow || "Dia"} ${context.hour || "0"}:00`);
  if ((state.chartFocus.tab || "summary") !== "summary") path.push(state.chartFocus.tab);
  return path;
}

function renderMetricTravelBreadcrumb(chartId, context = {}) {
  const path = activeDataPath(chartId, context);
  return `
    <nav class="metric-travel-breadcrumb" aria-label="Ruta de exploracion">
      ${path.map((item, index) => `
        <button type="button" data-data-path-index="${index}" ${index === path.length - 1 ? "aria-current=\"page\"" : ""}>
          ${escapeHtml(item)}
        </button>
      `).join("<span>/</span>")}
    </nav>`;
}

function renderDataTravelOverlay(chartId, context = {}) {
  const rect = state.chartFocus.sourceRect;
  const label = state.chartFocus.originLabel || chartFocusOriginLabel(chartId, context);
  if (!rect) return "";
  return `
    <div class="data-travel-origin" ${dataTravelGhostStyle(rect)} aria-hidden="true">
      <span>${escapeHtml(label)}</span>
    </div>
    <div class="data-path-connector" aria-hidden="true"></div>`;
}

function renderDataPathMap(chartId, context = {}) {
  const path = activeDataPath(chartId, context);
  return `
    <div class="data-path-map" aria-label="Mapa de analisis">
      <span class="material-symbols-outlined">route</span>
      ${path.map((item, index) => `
        <button type="button" data-data-path-index="${index}" class="${index === path.length - 1 ? "active" : ""}">
          ${escapeHtml(item)}
        </button>
      `).join("<i></i>")}
    </div>`;
}

function dataJourneySteps(chartId, context = {}) {
  const data = state.commandCenter || {};
  if (chartId === "rms-funnel") {
    return (data.funnel || []).map((stage, index, list) => ({
      label: stage.label || stage.key || `Etapa ${index + 1}`,
      value: stage.value || 0,
      detail: index === 0
        ? "Todo empieza con la captacion. Aqui se ve el tamano de la oportunidad."
        : `Desde aqui se compara contra ${list[index - 1]?.label || "la etapa anterior"} para encontrar fuga o avance.`,
    }));
  }
  if (chartId === "treemap") {
    return (data.revenue_treemap || []).slice(0, 5).map((row) => ({
      label: row.label || "Canal",
      value: money(row.value || row.revenue || 0),
      detail: "Este canal muestra cuanto revenue atribuido aporta frente al resto del mix comercial.",
    }));
  }
  if (chartId === "timeline") {
    return (data.timeline || []).slice(-5).map((row) => ({
      label: row.date || "Fecha",
      value: money(row.revenue || 0),
      detail: "Este punto ayuda a explicar que paso ese dia entre leads, redenciones, ventas y revenue.",
    }));
  }
  if (chartId === "sankey") {
    return [
      { label: "Canal", value: "Origen", detail: "El revenue empieza en la fuente que atrajo al cliente." },
      { label: "Campana", value: "Estrategia", detail: "La campana convierte la atencion en una accion medible." },
      { label: "Ticket / Redencion", value: "Activacion", detail: "El ticket conecta la promesa con una visita o validacion real." },
      { label: "Venta", value: "Cierre", detail: "La venta confirma que el flujo produjo resultado comercial." },
      { label: "Revenue", value: "Dinero", detail: "Este es el valor atribuido que el RMS puede explicar." },
    ];
  }
  const meta = chartFocusMeta(chartId);
  return [
    { label: meta.title, value: focusPrimaryMetric(chartId, context).value, detail: meta.description },
    { label: "Desglose", value: "Explorar", detail: meta.businessMeaning },
    { label: "Decision", value: "Accion", detail: meta.recommendedActions[0] || "Revisa el detalle y aplica filtros." },
  ];
}

function renderDataJourneyMode(chartId, context = {}) {
  if (!state.chartFocus.journeyMode) return "";
  const steps = dataJourneySteps(chartId, context);
  if (!steps.length) return "";
  const stepIndex = Math.min(Math.max(state.chartFocus.journeyStep || 0, 0), steps.length - 1);
  const step = steps[stepIndex];
  return `
    <aside class="data-journey-mode" aria-live="polite">
      <div>
        <span class="mono-label">Explorar como historia</span>
        <h3>${escapeHtml(step.label)}</h3>
        <strong>${escapeHtml(String(step.value ?? ""))}</strong>
        <p>${escapeHtml(step.detail)}</p>
      </div>
      <div class="data-journey-controls">
        <button type="button" data-journey-prev ${stepIndex === 0 ? "disabled" : ""}><span class="material-symbols-outlined">chevron_left</span>Anterior</button>
        <small>${stepIndex + 1} / ${steps.length}</small>
        <button type="button" data-journey-next ${stepIndex === steps.length - 1 ? "disabled" : ""}>Siguiente<span class="material-symbols-outlined">chevron_right</span></button>
        <button type="button" data-journey-exit><span class="material-symbols-outlined">close</span>Salir</button>
      </div>
    </aside>`;
}

function renderDataPointFocus(chartId, context = {}) {
  const label = chartFocusOriginLabel(chartId, context);
  const metric = focusPrimaryMetric(chartId, context);
  return `
    <section class="data-point-focus">
      <span class="mono-label">Dato activo</span>
      <h3>${escapeHtml(label)}</h3>
      <p>La vista esta enfocada en este punto. Puedes ver el desglose, llevarlo a filtro global o regresar al mapa general.</p>
      <div><strong>${escapeHtml(metric.value)}</strong><small>${escapeHtml(metric.label)}</small></div>
      <button type="button" data-focus-tab-shortcut="records">
        <span class="material-symbols-outlined">table_rows</span>Ver registros detras del dato
      </button>
    </section>`;
}

function focusChartSequence() {
  return ["executive-summary", "rms-funnel", "revenue-score", "timeline", "heatmap", "matrix", "treemap", "campaign-comparison", "sankey", "affiliate-network", "branch-ranking", "qr-status", "scatter", "waterfall", "cohorts", "power-table"];
}

function moveChartFocus(direction) {
  const sequence = focusChartSequence();
  const current = sequence.includes(state.chartFocus.chartId) ? state.chartFocus.chartId : "executive-summary";
  const nextIndex = (sequence.indexOf(current) + direction + sequence.length) % sequence.length;
  state.chartFocus.chartId = sequence[nextIndex];
  state.chartFocus.context = {};
  state.chartFocus.tab = "summary";
  state.chartFocus.direction = direction;
  state.chartFocus.sourceRect = null;
  state.chartFocus.originLabel = chartFocusMeta(sequence[nextIndex]).title;
  state.chartFocus.journeyStep = 0;
  renderChartFocusMode();
}

function commandFilterLabel(key, value) {
  const data = state.commandCenter || {};
  const options = data.options || {};
  const optionMaps = {
    campaignId: options.campaigns?.map((item) => ({ value: item.id, label: item.name })),
    branchId: options.branches?.map((item) => ({ value: item.id, label: item.name })),
    affiliateId: options.affiliates?.map((item) => ({ value: item.id, label: item.name })),
    sellerId: options.sellers?.map((item) => ({ value: item.id, label: item.name })),
    channel: options.channels,
    qrType: options.qr_types,
    qrStatus: options.qr_statuses,
  };
  const match = optionMaps[key]?.find((item) => String(item.value) === String(value));
  return match?.label || value;
}

function activeCommandFilterChips(extra = {}) {
  const filters = { ...state.commandCenterFilters, ...extra };
  const dates = commandCenterDateRange();
  const chips = [{ key: "range", label: "Periodo", value: COMMAND_CENTER_RANGE_LABELS[filters.range] || `${dates.startDate} - ${dates.endDate}` }];
  [
    ["campaignId", "Campana"],
    ["channel", "Canal"],
    ["branchId", "Sucursal"],
    ["qrStatus", "Estado del ticket"],
    ["qrType", "Tipo de ticket"],
    ["sellerId", "Vendedor"],
    ["affiliateId", "Afiliado"],
  ].forEach(([key, label]) => {
    if (filters[key]) chips.push({ key, label, value: commandFilterLabel(key, filters[key]) });
  });
  if (filters.comparePrevious) chips.push({ key: "comparePrevious", label: "Comparacion", value: "Periodo anterior" });
  return chips;
}

function renderActiveFiltersBar(chips = activeCommandFilterChips()) {
  return `
    <div class="active-filters-bar" aria-label="Filtros activos">
      <span class="material-symbols-outlined">filter_alt</span>
      ${chips.map((chip) => `
        <button type="button" data-focus-remove-filter="${escapeHtml(chip.key)}">
          <b>${escapeHtml(chip.label)}:</b> ${escapeHtml(chip.value)}
          <span class="material-symbols-outlined">close</span>
        </button>
      `).join("")}
    </div>`;
}

function openChartFocusMode(chartId, context = {}, sourceElement = null) {
  if (!chartId) return;
  state.chartFocus = {
    ...state.chartFocus,
    open: true,
    chartId,
    context,
    tab: context.tab || "summary",
    presentation: Boolean(context.presentation),
    savedScrollY: window.scrollY || state.chartFocus.savedScrollY || 0,
    sourceRect: captureDataTravelOrigin(sourceElement),
    originLabel: chartFocusOriginLabel(chartId, context),
    journeyMode: false,
    journeyStep: 0,
    direction: 0,
  };
  renderChartFocusMode();
}

function closeChartFocusMode() {
  if (!state.chartFocus.open) return;
  const y = state.chartFocus.savedScrollY || 0;
  const overlay = chartFocusRoot.querySelector(".chart-focus-overlay");
  const finish = () => {
    state.chartFocus.open = false;
    state.chartFocus.presentation = false;
    state.chartFocus.sourceRect = null;
    state.chartFocus.originLabel = "";
    state.chartFocus.journeyMode = false;
    state.chartFocus.journeyStep = 0;
    chartFocusRoot.classList.add("hidden");
    chartFocusRoot.innerHTML = "";
    document.body.classList.remove("chart-focus-open");
    window.scrollTo({ top: y, behavior: "auto" });
  };
  if (overlay && !reducedMotionSafe()) {
    overlay.classList.add("is-closing");
    window.setTimeout(finish, MOTION_TOKENS.duration.normal * 1000);
    return;
  }
  finish();
}

function chartFocusRecords(chartId, context = {}) {
  const data = state.commandCenter || {};
  const metric = state.commandCenterFilters.matrixMetric || "revenue";
  if (chartId === "rms-funnel") {
    return {
      columns: ["Etapa", "Valor", "Conversion anterior", "Fuga"],
      rows: (data.funnel || []).map((row) => [row.label, commandValue(row.value, row.format), `${row.conversion_from_previous || 0}%`, commandValue(row.loss_from_previous || 0, row.format)]),
    };
  }
  if (chartId === "heatmap") {
    const weekdays = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    return {
      columns: ["Dia", "Hora", "Redenciones"],
      rows: (data.heatmap || []).sort((a, b) => toNumber(b.value) - toNumber(a.value)).slice(0, 20).map((row) => [weekdays[row.dow] || row.dow, `${row.hour}:00`, row.value]),
    };
  }
  if (chartId === "matrix") {
    return {
      columns: ["Campana", "Canal", "Leads", "Tickets", "Redenciones", "Ventas", "Revenue"],
      rows: (data.campaign_channel_matrix || [])
        .filter((row) => !context.campaign || row.campaign_name === context.campaign)
        .filter((row) => !context.channel || row.channel === context.channel)
        .sort((a, b) => toNumber(b[metric]) - toNumber(a[metric]))
        .slice(0, 25)
        .map((row) => [row.campaign_name, row.channel, row.leads, row.qr_generated, row.redemptions, row.sales, money(row.revenue)]),
    };
  }
  if (chartId === "treemap" || chartId === "waterfall") {
    return {
      columns: ["Canal", "Leads", "Ventas", "Revenue", "Conversion"],
      rows: (data.revenue_treemap || []).map((row) => [row.label, row.leads, row.sales, money(row.revenue), `${row.conversion_rate || 0}%`]),
    };
  }
  if (chartId === "affiliate-network") {
    return {
      columns: ["Afiliado", "Ventas", "Revenue", "Puntos", "Ultima actividad"],
      rows: (data.affiliate_network?.nodes || []).map((row) => [row.full_name || row.name, row.sales || 0, money(row.revenue || 0), row.points_total || 0, row.last_activity_at ? formatDateShort(row.last_activity_at) : "-"]),
    };
  }
  if (chartId === "branch-ranking") {
    return {
      columns: ["Sucursal", "Redenciones", "Ventas", "Revenue", "Conversion"],
      rows: (data.branch_performance || []).map((row) => [row.branch_name || "Sin sucursal", row.redemptions, row.sales, money(row.revenue), `${row.conversion_rate || 0}%`]),
    };
  }
  if (chartId === "qr-status") {
    return {
      columns: ["Estado", "Tickets", "Lectura"],
      rows: (data.qr_status || []).map((row) => [row.label, row.value, row.label === "REDEEMED" ? "Valor capturado" : row.label === "EXPIRED" ? "Oportunidad perdida" : "Seguimiento requerido"]),
    };
  }
  if (chartId === "timeline") {
    return {
      columns: ["Fecha", "Leads", "Tickets", "Redenciones", "Ventas", "Revenue"],
      rows: (data.timeline || []).slice(-30).map((row) => [formatDateShort(row.date), row.leads, row.qr_generated, row.redemptions, row.sales, money(row.revenue)]),
    };
  }
  if (chartId === "cohorts") {
    return {
      columns: ["Cohorte", "Compras", "ticket postventa", "Redimidos", "Retencion"],
      rows: (data.cohorts || []).map((row) => [row.cohort, row.purchases, row.post_sale_qr, row.post_sale_redeemed, `${row.retention_rate || 0}%`]),
    };
  }
  return {
    columns: ["Campana", "Canal", "Leads", "Tickets", "Redenciones", "Ventas", "Revenue", "Decision"],
    rows: (data.power_table || []).slice(0, 25).map((row) => [row.campaign_name, row.top_channel || "-", row.leads, row.qr_generated, row.redemptions, row.sales, money(row.revenue), row.decision_hint || "Investigar"]),
  };
}

function focusPrimaryMetric(chartId, context = {}) {
  const data = state.commandCenter || {};
  const meta = chartFocusMeta(chartId);
  if (chartId?.startsWith("kpi:")) {
    const kpi = (data.kpis || []).find((item) => item.key === chartId.split(":")[1]);
    return { label: kpi?.label || meta.title, value: kpi?.value || "-", hint: kpi?.help || meta.businessMeaning };
  }
  if (chartId === "revenue-score") return { label: "MG Revenue Score", value: `${data.revenue_score?.score || 0}/100`, hint: data.revenue_score?.status || "Sin datos" };
  if (chartId === "rms-funnel") {
    const last = (data.funnel || []).slice(-1)[0];
    return { label: last?.label || "Revenue", value: commandValue(last?.value || 0, last?.format || "money"), hint: "Resultado final del embudo RMS." };
  }
  if (chartId === "heatmap") {
    const hot = [...(data.heatmap || [])].sort((a, b) => toNumber(b.value) - toNumber(a.value))[0];
    return { label: "Bloque mas activo", value: hot ? `${hot.value} redenciones` : "Sin datos", hint: hot ? `Dia ${hot.dow}, ${hot.hour}:00` : "Aun no hay redenciones horarias." };
  }
  return { label: meta.primaryMetric === "revenue" ? "Revenue atribuido" : meta.title, value: money(data.totals?.revenue || 0), hint: meta.businessMeaning };
}

function focusNarrative(chartId, context = {}) {
  const data = state.commandCenter || {};
  const metric = focusPrimaryMetric(chartId, context);
  const topCampaign = data.power_table?.[0];
  const topChannel = data.revenue_treemap?.[0];
  if (chartId === "rms-funnel") {
    const stages = data.funnel || [];
    const worst = stages.slice(1).sort((a, b) => toNumber(b.loss_from_previous) - toNumber(a.loss_from_previous))[0];
    return `Durante el periodo filtrado, el RMS llega hasta ${metric.value}. La mayor fuga visible esta en ${worst?.label || "una etapa pendiente"}, con ${commandValue(worst?.loss_from_previous || 0, worst?.format)} de diferencia frente a la etapa anterior. Recomendacion: enfoca seguimiento, urgencia o cierre comercial en esa etapa.`;
  }
  if (chartId === "treemap") {
    return `${topChannel?.label || "El canal principal"} concentra ${money(topChannel?.revenue || 0)} en revenue. Si este canal tambien convierte bien, conviene escalarlo; si solo trae volumen, revisa ticket y calidad del cierre.`;
  }
  if (chartId === "power-table" || chartId === "campaign-comparison" || chartId === "scatter") {
    return `${topCampaign?.campaign_name || "La campana principal"} lidera la lectura con ${money(topCampaign?.revenue || 0)}. Su decision sugerida es ${topCampaign?.decision_hint || "Investigar"} porque ${topCampaign?.decision_reason || "faltan datos completos de conversion y revenue"}.`;
  }
  return `${metric.label}: ${metric.value}. Este dato importa porque conecta actividad de marketing con comportamiento comercial real. Usa el desglose y los registros agregados para decidir si repetir, optimizar, pausar, escalar o investigar.`;
}

function focusInsightList(chartId) {
  const data = state.commandCenter || {};
  const base = (data.insights || []).slice(0, 3).map((item) => item.explanation || item.title).filter(Boolean);
  const meta = chartFocusMeta(chartId);
  return base.length ? base : meta.recommendedActions;
}

function renderFocusVisualization(chartId, context = {}) {
  const data = state.commandCenter || {};
  if (chartId === "rms-funnel") return renderFunnelChart(data.funnel || []);
  if (chartId === "heatmap") return renderHeatmapChart(data.heatmap || []);
  if (chartId === "matrix") return renderMatrixChart(data.campaign_channel_matrix || []);
  if (chartId === "treemap") return renderTreemapChart(data.revenue_treemap || []);
  if (chartId === "sankey") return renderSankeyChart(data.attribution_sankey || {});
  if (chartId === "affiliate-network") return renderAffiliateNetwork(data.affiliate_network || {});
  if (chartId === "cohorts") return renderCohortChart(data.cohorts || []);
  if (chartId === "power-table") return renderPowerTable(data.power_table || []);
  if (["timeline", "campaign-comparison", "branch-ranking", "qr-status", "scatter", "waterfall", "revenue-score"].includes(chartId)) {
    return `<canvas id="chartFocusCanvas" width="1200" height="560"></canvas>`;
  }
  const metric = focusPrimaryMetric(chartId, context);
  return `
    <div class="focus-kpi-hero">
      <span class="mono-label">${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
      <p>${escapeHtml(metric.hint)}</p>
    </div>`;
}

function renderRecordsTable(records) {
  if (!records.rows.length) {
    return commandEmpty("Aun no hay registros suficientes.", "Activa campanas, registra ventas o valida tickets para alimentar este detalle.");
  }
  return `
    <div class="drilldown-table-wrap">
      <table class="drilldown-table">
        <thead><tr>${records.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}</tr></thead>
        <tbody>
          ${records.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell ?? "-")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderDataDictionaryTooltip(keys = []) {
  return `
    <div class="data-dictionary-grid">
      ${keys.map((key) => {
        const item = DATA_DICTIONARY[key];
        if (!item) return "";
        return `
          <article class="dictionary-card">
            <h4>${escapeHtml(item.name)}</h4>
            <p>${escapeHtml(item.description)}</p>
            <dl>
              <dt>Formula</dt><dd>${escapeHtml(item.formula)}</dd>
              <dt>Ejemplo</dt><dd>${escapeHtml(item.example)}</dd>
              <dt>Decision</dt><dd>${escapeHtml(item.decision)}</dd>
            </dl>
          </article>`;
      }).join("")}
    </div>`;
}

function renderFocusTabContent(chartId, context = {}) {
  const meta = chartFocusMeta(chartId);
  const tab = state.chartFocus.tab || "summary";
  const records = chartFocusRecords(chartId, context);
  const metric = focusPrimaryMetric(chartId, context);
  if (tab === "records") return renderRecordsTable(records);
  if (tab === "comparison") {
    const current = toNumber(state.commandCenter?.totals?.revenue);
    const previous = toNumber(state.commandCenter?.previous_totals?.revenue);
    const diff = current - previous;
    return `
      <div class="comparison-panel">
        <article><span>Actual</span><strong>${money(current)}</strong></article>
        <article><span>Anterior</span><strong>${money(previous)}</strong></article>
        <article><span>Diferencia</span><strong>${money(diff)}</strong><small>${safeRate(diff, previous || current || 1)}%</small></article>
        <p>${diff >= 0 ? "El periodo actual supera al anterior. Revisa que canal o campana explica el crecimiento." : "El periodo actual esta por debajo del anterior. Investiga caidas por canal, horario o sucursal."}</p>
      </div>`;
  }
  if (tab === "insights") {
    return `<div class="focus-insight-list">${focusInsightList(chartId).map((item) => `<article><span class="material-symbols-outlined">auto_awesome</span><p>${escapeHtml(item)}</p></article>`).join("")}</div>`;
  }
  if (tab === "actions") {
    return `<div class="decision-recommendation-panel">${meta.recommendedActions.map((item) => `<button type="button" data-focus-action><span class="material-symbols-outlined">task_alt</span>${escapeHtml(item)}</button>`).join("")}</div>`;
  }
  if (tab === "definitions") return renderDataDictionaryTooltip(meta.dataDictionaryKeys || []);
  if (tab === "breakdown") {
    return `
      <div class="related-metrics-strip">
        ${(meta.relatedMetrics || []).map((key) => {
          const item = DATA_DICTIONARY[key];
          return `<article><span>${escapeHtml(item?.name || key)}</span><strong>${escapeHtml(item?.formula || "Metrica relacionada")}</strong></article>`;
        }).join("")}
      </div>
      ${renderRecordsTable(records)}`;
  }
  return `
    <div class="data-explanation-panel">
      <article><span>Que significa</span><p>${escapeHtml(meta.description)}</p></article>
      <article><span>Como se calcula</span><p>${escapeHtml(meta.calculation)}</p></article>
      <article><span>Por que importa</span><p>${escapeHtml(meta.businessMeaning)}</p></article>
      <article><span>Que mirar</span><p>${escapeHtml(metric.hint || "Busca cambios bruscos, concentraciones y combinaciones con bajo rendimiento.")}</p></article>
      <article><span>Que hacer</span><p>${escapeHtml(meta.recommendedActions[0] || "Investiga el desglose y aplica un filtro global.")}</p></article>
    </div>`;
}

function drawChartFocusCanvas(chartId) {
  const canvas = document.getElementById("chartFocusCanvas");
  if (!canvas) return;
  const data = state.commandCenter || {};
  if (chartId === "revenue-score") drawRadarChart(canvas, data.revenue_score?.dimensions || []);
  if (chartId === "timeline") drawMultiLineChart(canvas, data.timeline || [], [
    { key: "leads", label: "Leads", color: "#7cfbff" },
    { key: "qr_generated", label: "Tickets", color: "#6ffbbe" },
    { key: "redemptions", label: "Redenciones", color: "#c084fc" },
    { key: "sales", label: "Ventas", color: "#facc15" },
    { key: "revenue", label: "Revenue", color: "#38bdf8", scale: "money" },
  ]);
  if (chartId === "campaign-comparison") drawGroupedBars(canvas, data.campaign_comparison || [], [
    { key: "leads", label: "Leads", color: "#7cfbff" },
    { key: "redemptions", label: "Redenciones", color: "#6ffbbe" },
    { key: "sales", label: "Ventas", color: "#facc15" },
  ]);
  if (chartId === "branch-ranking") drawHorizontalBars(canvas, (data.branch_performance || []).map((row) => ({ label: row.branch_name || "Sin sucursal", value: row.revenue || row.sales || row.redemptions, valueLabel: money(row.revenue || 0), meta: `${row.sales || 0} ventas · ${row.redemptions || 0} redenciones` })), "#6ffbbe");
  if (chartId === "qr-status") drawDonutChart(canvas, data.qr_status || [], ["#6ffbbe", "#38bdf8", "#facc15", "#fb7185", "#c084fc"]);
  if (chartId === "scatter") drawScatterPlot(canvas, data.campaign_scatter || []);
  if (chartId === "waterfall") drawWaterfallChart(canvas, data.revenue_waterfall || []);
}

function renderFocusContextActions(context = {}) {
  const actions = [];
  if (context.channel) actions.push(`<button type="button" data-focus-apply-filter="channel" data-focus-filter-value="${escapeHtml(context.channel)}"><span class="material-symbols-outlined">filter_alt</span>Aplicar canal: ${escapeHtml(context.channel)}</button>`);
  if (context.campaign) {
    const campaign = (state.commandCenter?.options?.campaigns || []).find((item) => item.name === context.campaign);
    if (campaign?.id) actions.push(`<button type="button" data-focus-apply-filter="campaignId" data-focus-filter-value="${escapeHtml(campaign.id)}"><span class="material-symbols-outlined">filter_alt</span>Aplicar campana: ${escapeHtml(context.campaign)}</button>`);
  }
  if (!actions.length) {
    actions.push(`<button type="button" data-focus-tab-shortcut="breakdown"><span class="material-symbols-outlined">account_tree</span>Ver desglose</button>`);
  }
  return `<div class="focus-context-actions">${actions.join("")}</div>`;
}

function renderChartFocusMode() {
  if (!state.chartFocus.open) return;
  const { chartId, context, presentation } = state.chartFocus;
  const direction = state.chartFocus.direction;
  const meta = chartFocusMeta(chartId);
  const metric = focusPrimaryMetric(chartId, context);
  const tabs = [
    ["summary", "Resumen"],
    ["breakdown", "Desglose"],
    ["records", "Registros"],
    ["comparison", "Comparacion"],
    ["insights", "Insights"],
    ["actions", "Acciones"],
    ["definitions", "Definiciones"],
  ];
  document.body.classList.add("chart-focus-open");
  chartFocusRoot.classList.remove("hidden");
  chartFocusRoot.innerHTML = `
    <section class="chart-focus-overlay ${presentation ? "is-presentation" : ""} ${direction ? "is-side-travel" : ""}" role="dialog" aria-modal="true" aria-labelledby="chartFocusTitle">
      ${renderDataTravelOverlay(chartId, context)}
      <header class="chart-focus-header">
        <div>
          ${renderMetricTravelBreadcrumb(chartId, context)}
          <h2 id="chartFocusTitle">${escapeHtml(meta.title)}</h2>
          <p>${escapeHtml(meta.subtitle)}</p>
        </div>
        <div class="chart-focus-metric"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong></div>
        <div class="chart-focus-actions">
          <button type="button" data-focus-prev><span class="material-symbols-outlined">arrow_back</span>Anterior</button>
          <button type="button" data-focus-next>Siguiente<span class="material-symbols-outlined">arrow_forward</span></button>
          <button type="button" data-focus-journey><span class="material-symbols-outlined">route</span>${state.chartFocus.journeyMode ? "Salir historia" : "Explorar historia"}</button>
          <button type="button" data-focus-presentation><span class="material-symbols-outlined">present_to_all</span>Presentar</button>
          <button type="button" data-focus-copy><span class="material-symbols-outlined">link</span>Copiar</button>
          <button type="button" data-focus-export><span class="material-symbols-outlined">download</span>Exportar</button>
          <button type="button" data-focus-close aria-label="Cerrar RMS Data Explorer"><span class="material-symbols-outlined">close</span></button>
        </div>
      </header>
      ${renderActiveFiltersBar()}
      ${renderDataPathMap(chartId, context)}
      <main class="chart-focus-layout">
        <section class="chart-focus-main">
          <div class="chart-focus-stage data-travel-scene">
            <div class="chart-stage-help"><span class="material-symbols-outlined">touch_app</span>Haz clic en una barra, etapa, celda o canal para viajar al detalle de ese dato.</div>
            ${renderFocusVisualization(chartId, context)}
            ${renderDataJourneyMode(chartId, context)}
          </div>
          <div class="chart-focus-tabs" role="tablist">
            ${tabs.map(([id, label]) => `<button type="button" class="${state.chartFocus.tab === id ? "active" : ""}" data-focus-tab="${id}">${label}</button>`).join("")}
          </div>
          <div class="chart-focus-tab-panel">${renderFocusTabContent(chartId, context)}</div>
        </section>
        <aside class="chart-focus-sidebar">
          <section>
            <span class="mono-label">Entiende este dato</span>
            <h3>${escapeHtml(meta.primaryMetric || meta.chartType)}</h3>
            <p>${escapeHtml(meta.description)}</p>
          </section>
          <section>
            <span class="mono-label">Historia de este dato</span>
            <p>${escapeHtml(focusNarrative(chartId, context))}</p>
          </section>
          ${renderDataPointFocus(chartId, context)}
          <section>
            <span class="mono-label">Decision recomendada</span>
            <ul>${meta.recommendedActions.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </section>
          <section>
            <span class="mono-label">Drill-down disponible</span>
            <div class="focus-chip-row">${(meta.supportedDrilldowns || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
          </section>
          <section>
            <span class="mono-label">Cross-filtering</span>
            ${renderFocusContextActions(context)}
          </section>
        </aside>
      </main>
    </section>`;
  bindChartFocusEvents();
  drawChartFocusCanvas(chartId);
  state.chartFocus.direction = 0;
}

function bindChartFocusEvents() {
  chartFocusRoot.querySelector(".chart-focus-overlay")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  chartFocusRoot.querySelector("[data-focus-close]")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeChartFocusMode();
  });
  chartFocusRoot.querySelector("[data-focus-prev]")?.addEventListener("click", (event) => {
    event.stopPropagation();
    moveChartFocus(-1);
  });
  chartFocusRoot.querySelector("[data-focus-next]")?.addEventListener("click", (event) => {
    event.stopPropagation();
    moveChartFocus(1);
  });
  chartFocusRoot.querySelector("[data-focus-journey]")?.addEventListener("click", () => {
    state.chartFocus.journeyMode = !state.chartFocus.journeyMode;
    state.chartFocus.journeyStep = 0;
    renderChartFocusMode();
  });
  chartFocusRoot.querySelector("[data-focus-copy]")?.addEventListener("click", () => {
    const url = `${window.location.origin}${window.location.pathname}?focus=${encodeURIComponent(state.chartFocus.chartId)}`;
    navigator.clipboard?.writeText(url);
    showFeedback("Enlace interno del RMS Data Explorer copiado.", "success");
  });
  chartFocusRoot.querySelector("[data-focus-export]")?.addEventListener("click", () => {
    const records = chartFocusRecords(state.chartFocus.chartId, state.chartFocus.context);
    downloadCsv(`rms-data-explorer-${state.chartFocus.chartId}`, [records.columns, ...records.rows]);
  });
  chartFocusRoot.querySelector("[data-focus-presentation]")?.addEventListener("click", () => {
    state.chartFocus.presentation = !state.chartFocus.presentation;
    renderChartFocusMode();
  });
  chartFocusRoot.querySelectorAll("[data-focus-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chartFocus.tab = button.dataset.focusTab || "summary";
      state.chartFocus.direction = 0;
      renderChartFocusMode();
    });
  });
  chartFocusRoot.querySelectorAll("[data-focus-remove-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.focusRemoveFilter;
      if (key && key !== "range" && key !== "comparePrevious") {
        state.commandCenterFilters[key] = "";
        loadCommandCenterData({ quiet: true });
      }
    });
  });
  chartFocusRoot.querySelectorAll("[data-focus-apply-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.focusApplyFilter;
      if (!key) return;
      state.commandCenterFilters[key] = button.dataset.focusFilterValue || "";
      loadCommandCenterData({ quiet: true });
      showFeedback("Filtro aplicado al RMS Command Center.", "success");
    });
  });
  chartFocusRoot.querySelectorAll("[data-focus-tab-shortcut]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chartFocus.tab = button.dataset.focusTabShortcut || "breakdown";
      state.chartFocus.direction = 0;
      renderChartFocusMode();
    });
  });
  chartFocusRoot.querySelectorAll("[data-journey-prev]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chartFocus.journeyStep = Math.max(0, (state.chartFocus.journeyStep || 0) - 1);
      renderChartFocusMode();
    });
  });
  chartFocusRoot.querySelectorAll("[data-journey-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const steps = dataJourneySteps(state.chartFocus.chartId, state.chartFocus.context);
      state.chartFocus.journeyStep = Math.min(Math.max(steps.length - 1, 0), (state.chartFocus.journeyStep || 0) + 1);
      renderChartFocusMode();
    });
  });
  chartFocusRoot.querySelectorAll("[data-journey-exit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chartFocus.journeyMode = false;
      state.chartFocus.journeyStep = 0;
      renderChartFocusMode();
    });
  });
  chartFocusRoot.querySelectorAll("[data-data-path-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.dataPathIndex || 0);
      if (index <= 1) {
        state.chartFocus.context = {};
        state.chartFocus.tab = "summary";
        state.chartFocus.journeyStep = 0;
        renderChartFocusMode();
      } else if (index === activeDataPath(state.chartFocus.chartId, state.chartFocus.context).length - 1) {
        state.chartFocus.tab = "summary";
        renderChartFocusMode();
      }
    });
  });
  chartFocusRoot.querySelectorAll(".chart-focus-stage [data-command-focus]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (event.target.closest("button, select, input, textarea") && event.target !== element) return;
      event.stopPropagation();
      const nextChartId = element.dataset.commandFocus || state.chartFocus.chartId;
      const nextContext = chartFocusContextFromElement(element);
      if (nextChartId === state.chartFocus.chartId && JSON.stringify(nextContext) === JSON.stringify(state.chartFocus.context || {})) {
        return;
      }
      state.chartFocus.chartId = nextChartId;
      state.chartFocus.context = nextContext;
      state.chartFocus.tab = "summary";
      state.chartFocus.sourceRect = captureDataTravelOrigin(element);
      state.chartFocus.originLabel = chartFocusOriginLabel(nextChartId, state.chartFocus.context);
      state.chartFocus.journeyStep = 0;
      state.chartFocus.direction = 0;
      renderChartFocusMode();
    });
  });
}

function drawCommandCenterCharts(data) {
  drawRadarChart(document.getElementById("commandRadarChart"), data.revenue_score?.dimensions || []);
  drawMultiLineChart(document.getElementById("commandTimelineChart"), data.timeline || [], [
    { key: "leads", label: "Leads", color: "#7cfbff" },
    { key: "qr_generated", label: "Tickets", color: "#6ffbbe" },
    { key: "redemptions", label: "Redenciones", color: "#c084fc" },
    { key: "sales", label: "Ventas", color: "#facc15" },
    { key: "revenue", label: "Revenue", color: "#38bdf8", scale: "money" },
  ]);
  drawGroupedBars(document.getElementById("commandCampaignBars"), (data.campaign_comparison || []).slice(0, 8).map((row) => ({
    label: row.campaign_name.slice(0, 12),
    leads: row.leads,
    qr: row.qr_generated,
    redemptions: row.redemptions,
    sales: row.sales,
    revenue: Math.round(toNumber(row.revenue) / 100000),
  })), [
    { key: "leads", label: "Leads", color: "#7cfbff" },
    { key: "qr", label: "Tickets", color: "#6ffbbe" },
    { key: "redemptions", label: "Redenciones", color: "#c084fc" },
    { key: "sales", label: "Ventas", color: "#facc15" },
    { key: "revenue", label: "Revenue x100k", color: "#38bdf8" },
  ]);
  drawGroupedBars(document.getElementById("commandBranchRanking"), (data.branch_performance || []).slice(0, 8).map((row) => ({
    label: row.branch_name.slice(0, 12),
    redemptions: row.redemptions,
    sales: row.sales,
    revenue: Math.round(toNumber(row.revenue) / 100000),
  })), [
    { key: "redemptions", label: "Redenciones", color: "#7cfbff" },
    { key: "sales", label: "Ventas", color: "#6ffbbe" },
    { key: "revenue", label: "Revenue x100k", color: "#facc15" },
  ]);
  drawDonutChart(document.getElementById("commandQrDonut"), data.qr_status || [], ["#6ffbbe", "#38bdf8", "#facc15", "#fb7185", "#c084fc"]);
  drawScatterPlot(document.getElementById("commandScatter"), data.campaign_scatter || []);
  drawWaterfallChart(document.getElementById("commandWaterfall"), data.revenue_waterfall || []);
}

function renderDashboard() {
  renderCommandCenter();
  const summary = state.summary || {};
  const dashboard = state.dashboard || {};
  const recentRedemptions = withFilters(
    dashboard.recent_redemptions || [],
    ["player_name", "reward_name", "validator"],
    ["redeemed_at"]
  );
  const recentPlayers = withFilters(
    dashboard.recent_players || [],
    ["name", "email", "phone", "document_id"],
    ["created_at"]
  );
  const branchPerformance = filterRows(dashboard.branch_performance || [], ["branch_name", "address"]);
  const paymentMethods = filterRows(dashboard.payment_methods || [], ["payment_method"]);
  const acquisitionSources = filterRows(dashboard.acquisition_sources || [], ["acquisition_source", "acquisition_channel"]);
  const campaignPerformance = filterRows(dashboard.campaign_performance || [], ["campaign_name"]);
  const originPerformance = filterRows(dashboard.origin_performance || [], ["origin_type"]);
  const rewardPerformance = filterRows(dashboard.rewards || [], ["name"]);
  const qrStatus = dashboard.qr_status || [];
  const topHour = [...(dashboard.time_stats?.redemptions_by_hour || [])].sort((a, b) => toNumber(b.count) - toNumber(a.count))[0];
  const topBranch = [...branchPerformance].sort((a, b) => toNumber(b.revenue) - toNumber(a.revenue))[0];
  const observedSalesCount = toNumber(summary.observed_sales_count || summary.direct_sales_count);
  const observedRevenue = toNumber(summary.observed_revenue || summary.attributed_revenue);
  const avgTicket = observedSalesCount ? observedRevenue / observedSalesCount : 0;
  const topAcquisitionSource = [...acquisitionSources].sort((a, b) => toNumber(b.revenue) - toNumber(a.revenue))[0];
  const roiLabel = ratioLabel(summary.observed_roi ?? summary.estimated_roi);
  const strategicClaimRate = dashboard.derived?.strategic_claim_rate || summary.strategic_claim_rate || 0;
  const strategicRedemptionRate = dashboard.derived?.strategic_redemption_rate || summary.strategic_redemption_rate || 0;
  const postSaleRedemptionRate = dashboard.derived?.post_sale_redemption_rate || summary.post_sale_redemption_rate || 0;
  const items = [
    ["Listas para lanzar", summary.ready_for_client_setup, `${summary.scheduled_campaigns || 0} programadas`, "", "Campanas que ya estan estructuradas y pendientes de configuracion final o fecha de arranque."],
    ["Campanas activas", summary.active_campaigns, `${state.campaigns.length || 0} registradas`, "", "Campanas actualmente en ejecucion y generando interacciones medibles."],
    ["Leads capturados", summary.total_leads, `${summary.redemption_rate || 0}% termina redimiendo`, "", "Personas identificadas que dejaron datos validos en formularios, juegos o landings."],
    ["Tickets generados", summary.total_qr_generated, `${dashboard.summary?.active_qr || 0} siguen activos`, "", "Beneficios emitidos. Ayuda a medir activacion real despues del lead."],
    ["Tickets redimidos", summary.total_qr_redeemed, `${summary.redemption_rate || 0}% del total emitido`, "", "Personas que si llegaron a tienda o punto de redencion y usaron el incentivo."],
    ["ticket postventa", summary.post_sale_generated || 0, `${postSaleRedemptionRate}% redimido`, "", "Ticket creados desde una venta real para incentivar recompra o postventa."],
    ["Paquetes de tickets", summary.strategic_batches || 0, `${summary.strategic_generated || 0} codigos estrategicos`, "", "Lotes de tickets precreados para etiquetas, empaques, volantes o fidelizacion."],
    ["tickets estrategicos", summary.strategic_generated || 0, `${strategicClaimRate}% activado`, "", "Tickets no nacidos de juego o formulario publico, sino de estrategias internas del negocio."],
    ["Claims estrategicos", summary.strategic_claimed_or_active || 0, `${strategicRedemptionRate}% redimido`, "", "Clientes que escanearon un ticket precreado, dejaron datos y activaron el beneficio."],
    ["Ventas reales", observedSalesCount, `${money(observedRevenue)} registrado`, "", "Compras reales registradas por caja, ticket postventa o captura manual del medio de llegada."],
    ["Revenue observado", money(observedRevenue), `${money(avgTicket)} ticket promedio`, "", "Dinero real asociado a clientes capturados por los distintos medios de llegada."],
    ["Referidos afiliados", summary.referral_sales_count || 0, `${summary.referral_points_awarded || 0} puntos entregados`, "", "Ventas en las que un afiliado recomendo al cliente y recibio puntos."],
    ["Inversion total", money(summary.total_investment), `${money(summary.cost_per_lead)} por lead`, "", "Suma total invertida en pauta, creativos y activacion para este periodo de analisis."],
    ["Costo por lead", money(summary.cost_per_lead), `${money(summary.cost_per_observed_customer || summary.cost_per_acquired_customer)} por venta`, "", "Cuanto costo captar cada lead, antes de saber si compro o no."],
    ["Costo por venta", money(summary.cost_per_observed_customer || summary.cost_per_acquired_customer), `vs. ticket medio ${money(avgTicket)}`, "", "Cuanto costo traer una venta real observada. Debe compararse contra ticket promedio y margen."],
    ["ROI estimado", roiLabel, "Retorno sobre ventas reales", "highlight", "Relacion entre ventas observadas e inversion. Un valor mayor a 1x ya recupera la inversion; por encima de eso empieza a devolver ganancia comercial."],
  ];

  businessKpiGrid.innerHTML = items.map(([label, value, meta, tone, help]) => `
    <article class="kpi-card ${tone}" title="${escapeHtml(help || "")}">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value ?? 0)}</strong>
      <div class="kpi-meta">${escapeHtml(meta || "")}</div>
    </article>
  `).join("");

  dashboardNarrativeTitle.textContent = topAcquisitionSource
    ? `${acquisitionSourceLabel(topAcquisitionSource.acquisition_source)} lidera la llegada comercial.`
    : topBranch?.branch_name
      ? `${topBranch.branch_name} lidera la operacion del periodo.`
    : "Esperando datos del negocio.";
  dashboardNarrativeText.textContent = topAcquisitionSource
    ? `${acquisitionSourceLabel(topAcquisitionSource.acquisition_source)}${topAcquisitionSource.acquisition_channel ? ` / ${topAcquisitionSource.acquisition_channel}` : ""} trae ${toNumber(topAcquisitionSource.count)} ventas reales y ${money(topAcquisitionSource.revenue)}. El portal combina esta captura con tickets para medir ventas, no solo likes o comentarios.`
    : topBranch?.branch_name
      ? `La sucursal ${topBranch.branch_name} concentra ${money(topBranch.revenue)} en revenue atribuido y ${topBranch.redemptions} redenciones. Ademas, el negocio ya suma ${summary.post_sale_generated || 0} ticket postventa y ${summary.strategic_generated || 0} tickets estrategicos fuera del flujo publico.`
    : "Cuando haya actividad, aqui veras el principal movimiento del periodo sin tener que interpretar todas las tablas.";
  dashboardFunnelHelp.textContent = `Hoy el embudo combina ${summary.total_leads || 0} leads publicos con ${summary.strategic_claimed_or_active || 0} activaciones estrategicas; de ahi salen ${summary.total_qr_generated || 0} tickets emitidos y ${observedSalesCount} ventas reales observadas.`;
  dashboardHealthText.textContent = roiLabel === "-"
    ? "Aun no hay ventas suficientes para evaluar ROI, CPL y CAC con criterio comercial."
    : `El ROI actual es ${roiLabel}, el costo por venta esta en ${money(summary.cost_per_observed_customer || summary.cost_per_acquired_customer)} y el ticket promedio ronda ${money(avgTicket)}. En tickets estrategicos, postventa redime ${postSaleRedemptionRate}% y los claims convierten ${strategicRedemptionRate}% a redencion.`;
  cacTrendNote.textContent = avgTicket
    ? `Benchmark visual: CAC sano cuando queda claramente por debajo del ticket promedio de ${money(avgTicket)}.`
    : "Benchmark visual: compara el CAC contra el ticket promedio y el ROI de cada campana.";

  recentRedemptionsTable.innerHTML = recentRedemptions.map((item) => `
    <tr>
      <td>${escapeHtml(item.player_name || "-")}</td>
      <td>${escapeHtml(item.reward_name || "-")}</td>
      <td>${escapeHtml(formatDate(item.redeemed_at))}</td>
      <td>${escapeHtml(item.validator || "-")}</td>
    </tr>
  `).join("") || '<tr><td colspan="4">Sin redenciones.</td></tr>';

  recentLeadsTable.innerHTML = recentPlayers.map((item) => `
    <tr>
      <td>${escapeHtml(item.name || "-")}</td>
      <td>${escapeHtml(item.email || "-")}</td>
      <td>${escapeHtml(item.phone || "-")}</td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
    </tr>
  `).join("") || '<tr><td colspan="4">Sin leads.</td></tr>';

  drawDualLineChart(
    businessTrendChart,
    dashboard.time_stats?.leads_by_day || [],
    dashboard.time_stats?.redemptions_by_day || [],
    "count",
    ["Leads", "Redenciones"],
    [NEON_CHART.cyan, NEON_CHART.magenta]
  );

  drawSimpleLineChart(
    cacTrendChart,
    filterRows(state.campaigns, ["name", "type", "objective", "status"]).map((campaign) => ({
      label: campaign.name,
      value: campaign.cost_per_lead === null ? 0 : toNumber(campaign.cost_per_lead),
    })),
    NEON_CHART.yellow,
    "Costo por lead"
  );

  drawTripleLineChart(
    hourlyOperationsChart,
    dashboard.time_stats?.qr_by_hour || [],
    (dashboard.time_stats?.claims_by_hour || []).some((row) => toNumber(row.count) > 0)
      ? dashboard.time_stats?.claims_by_hour || []
      : dashboard.time_stats?.validations_by_hour || [],
    dashboard.time_stats?.redemptions_by_hour || [],
    "count",
    (dashboard.time_stats?.claims_by_hour || []).some((row) => toNumber(row.count) > 0)
      ? ["Tickets", "Claims", "Redenciones"]
      : ["Tickets", "Validaciones", "Redenciones"],
    [NEON_CHART.cyan, NEON_CHART.yellow, NEON_CHART.magenta],
    (row) => `${String(row.hour).padStart(2, "0")}:00`
  );

  drawGroupedBars(
    weekdayPerformanceChart,
    (dashboard.time_stats?.qr_by_weekday || []).map((row, index) => ({
      label: row.label || ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"][index],
      qr: toNumber(row.count),
      redemptions: toNumber(dashboard.time_stats?.redemptions_by_weekday?.[index]?.count),
    })),
    [
      { key: "qr", color: NEON_CHART.cyan, label: "Tickets generados" },
      { key: "redemptions", color: NEON_CHART.green, label: "Redenciones" },
    ]
  );

  drawDonutChart(
    qrStatusChart,
    qrStatus.map((row) => ({ label: row.status, value: toNumber(row.count) })),
    [NEON_CHART.cyan, NEON_CHART.green, NEON_CHART.yellow, NEON_CHART.magenta]
  );

  drawHorizontalBars(
    campaignPerformanceChart,
    (originPerformance.length ? originPerformance : campaignPerformance).map((row) => ({
      label: row.origin_type || row.campaign_name,
      value: toNumber(row.qr_generated),
      valueLabel: `${toNumber(row.qr_generated)} tickets`,
      meta: row.origin_type
        ? `${toNumber(row.claims)} claims | ${toNumber(row.redemptions)} redenciones`
        : `${toNumber(row.redemptions)} redenciones`,
    })),
    NEON_CHART.cyan
  );

  drawHorizontalBars(
    rewardMixChart,
    rewardPerformance.map((row) => ({
      label: row.name,
      value: toNumber(row.redeemed),
      valueLabel: `${toNumber(row.redeemed)} redenciones`,
      meta: `${toNumber(row.generated)} tickets`,
    })),
    NEON_CHART.green
  );

  drawHorizontalBars(
    paymentMethodChart,
    (acquisitionSources.length ? acquisitionSources : paymentMethods).map((row) => ({
      label: acquisitionSources.length
        ? `${acquisitionSourceLabel(row.acquisition_source)}${row.acquisition_channel && row.acquisition_channel !== "Sin canal especifico" ? ` / ${row.acquisition_channel}` : ""}`
        : row.payment_method,
      value: toNumber(row.revenue),
      valueLabel: money(row.revenue),
      meta: `${toNumber(row.count)} ventas${toNumber(row.referral_points_awarded) ? ` | ${toNumber(row.referral_points_awarded)} pts referidos` : ""}`,
    })),
    NEON_CHART.magenta
  );

  geoBranchBoard.innerHTML = branchPerformance.slice(0, 6).map((row) => `
    <article class="geo-branch-card">
      <span class="mono-label">Sucursal</span>
      <strong>${escapeHtml(row.branch_name || "Sin sucursal")}</strong>
      <p>${escapeHtml(row.address || "Sin direccion")}</p>
      <div class="geo-metric"><span>Redenciones</span><span>${escapeHtml(row.redemptions)}</span></div>
      <div class="geo-metric"><span>Ventas</span><span>${escapeHtml(row.sales)}</span></div>
      <div class="geo-metric"><span>Revenue</span><span>${escapeHtml(money(row.revenue))}</span></div>
    </article>
  `).join("") || '<article class="geo-branch-card"><strong>Sin datos</strong><p>No hay actividad por sucursal todavia.</p></article>';

  branchPerformanceTable.innerHTML = branchPerformance.map((row) => `
    <tr>
      <td>${escapeHtml(row.branch_name || "Sin sucursal")}</td>
      <td>${escapeHtml(row.address || "-")}</td>
      <td>${escapeHtml(row.redemptions)}</td>
      <td>${escapeHtml(row.sales)}</td>
      <td>${escapeHtml(money(row.revenue))}</td>
    </tr>
  `).join("") || '<tr><td colspan="5">Sin actividad por sucursal.</td></tr>';

  dashboardInsightTitle.textContent = topHour?.count
    ? `El pico de redenciones ocurre a las ${String(topHour.hour).padStart(2, "0")}:00. ${topAcquisitionSource ? `${acquisitionSourceLabel(topAcquisitionSource.acquisition_source)} lidera ventas reales con ${money(topAcquisitionSource.revenue)}.` : `${topBranch?.branch_name || "La sucursal principal"} lidera el revenue del periodo.`} Los tickets estrategicos ya aportan ${summary.strategic_claimed_or_active || 0} activaciones al embudo.`
    : "Aun no hay suficiente actividad para construir un insight horario.";
}

function renderCampaignList() {
  const campaigns = currentCampaignRows();
  if (!campaigns.length) {
    campaignList.innerHTML = '<article class="campaign-item"><p>Sin campanas para este filtro.</p></article>';
    return;
  }

  campaignList.innerHTML = campaigns.map((campaign) => `
    <article class="campaign-item ${campaign.id === state.selectedCampaignId ? "active" : ""}" data-campaign-id="${escapeHtml(campaign.id)}">
      <h3>${escapeHtml(campaign.name)}</h3>
      <p>${escapeHtml(campaign.objective || "Sin objetivo cargado.")}</p>
      <div class="campaign-item-row"><span>Captura de tickets</span><strong>${campaignPublicLeadQrPath(campaign) ? "Disponible" : "Pendiente"}</strong></div>
      <div class="campaign-item-row"><span>Estado</span><strong>${escapeHtml(statusLabel(campaign.status))}</strong></div>
      <div class="campaign-item-row"><span>Tipo</span><strong>${escapeHtml(campaign.type || "-")}</strong></div>
      <div class="campaign-item-row"><span>Canales</span><strong>${escapeHtml(Array.isArray(campaign.launch_channels) ? campaign.launch_channels.length : 0)}</strong></div>
      <div class="campaign-item-row"><span>Leads</span><strong>${toNumber(campaign.total_leads)}</strong></div>
      <div class="campaign-item-row"><span>Redenciones</span><strong>${toNumber(campaign.total_qr_redeemed)}</strong></div>
    </article>
  `).join("");

  campaignList.querySelectorAll("[data-campaign-id]").forEach((item) => {
    item.addEventListener("click", () => selectCampaign(item.dataset.campaignId));
  });
}

function renderCampaignStateGrid() {
  const groups = state.campaignGroups || {};
  const items = [
    ["Listas para lanzamiento", groups.ready_for_launch?.length || 0, "READY_FOR_CLIENT_SETUP"],
    ["Programadas", groups.scheduled?.length || 0, "SCHEDULED"],
    ["Activas", groups.active?.length || 0, "ACTIVE"],
    ["Finalizadas", groups.finished?.length || 0, "FINISHED / ARCHIVED"],
  ];

  campaignStateGrid.innerHTML = items.map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");
}

function renderSnapshotComparisonChart(snapshots) {
  drawHorizontalBars(
    campaignSnapshotChart,
    snapshots.map((item) => ({
      label: item.period_type,
      value: toNumber(item.total_sales_amount),
      valueLabel: money(item.total_sales_amount),
      meta: money(item.total_sales_amount),
    })),
    NEON_CHART.cyan
  );
}

function hydrateAdminForm(campaign = null) {
  adminEditorTitle.textContent = campaign ? campaign.name : "Campana interna";
  adminEditorStatus.textContent = campaign ? statusLabel(campaign.status) : "Nueva";
  adminCampaignMessage.textContent = "";
  adminMarkReadyButton.disabled = !campaign || campaign.status !== "DRAFT";
  adminCampaignNameInput.value = campaign?.name || "";
  adminCampaignSlugInput.value = campaign?.slug || campaign?.public_slug || "";
  adminCampaignTypeInput.value = campaign?.type || "FORM";
  adminCampaignStatusInput.value = campaign?.status || "DRAFT";
  adminCampaignObjectiveInput.value = campaign?.objective || "";
  adminCampaignStrategyInput.value = campaign?.strategy_summary || "";
  adminCampaignBudgetInput.value = campaign?.budget_total || 0;
  adminCampaignSalesGoalInput.value = campaign?.expected_sales_goal || 0;
  adminCampaignLandingUrlInput.value = campaign?.delivered_assets?.landing_url || "";
  adminCampaignValidatorUrlInput.value = campaign?.delivered_assets?.validator_url || "";
  adminCampaignGameUrlInput.value = campaign?.delivered_assets?.game_url || "";
  adminCampaignPrimaryLinkInput.value = campaign?.delivered_assets?.primary_link || "";
  adminCampaignQrLandingUrlInput.value = campaign?.delivered_assets?.qr_landing_url || "";
  adminCampaignAssetNotesInput.value = campaign?.delivered_assets?.creative_notes || "";
}

async function loadAdminCampaignWorkspace(campaignId) {
  if (!isAdmin() || !campaignId) return;
  state.adminSelectedCampaignId = campaignId;
  const report = await api(`/api/admin/campaigns/${campaignId}/report`, { headers: authHeaders() });
  state.adminSelectedCampaign = report.campaign;
  state.adminSelectedReport = report;
  hydrateAdminForm(report.campaign);
  adminReportKpiGrid.innerHTML = [
    ["Cliente", report.business?.name || "-", report.business?.slug || "-"],
    ["Leads", report.summary?.total_leads || 0, `${report.summary?.active_campaigns || 0} activas`],
    ["Revenue", money(report.summary?.attributed_revenue), `${report.summary?.direct_sales_count || 0} ventas directas`],
  ].map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");
  adminReportCampaignTable.innerHTML = (report.campaigns || []).map((campaign) => `
    <tr>
      <td>${escapeHtml(campaign.name || "-")}</td>
      <td>${escapeHtml(statusLabel(campaign.status))}</td>
      <td>${escapeHtml(campaign.total_leads)}</td>
      <td>${escapeHtml(campaign.total_qr_generated)}</td>
      <td>${escapeHtml(campaign.total_qr_redeemed)}</td>
      <td>${escapeHtml(money(campaign.attributed_revenue))}</td>
    </tr>
  `).join("") || '<tr><td colspan="6">Sin campanas para este cliente.</td></tr>';
}

async function selectCampaign(campaignId) {
  state.selectedCampaignId = campaignId;
  renderCampaignList();
  renderCampaignAssociationInputs();

  try {
    const [campaignData, reportData, leadsData, redemptionsData, salesData] = await Promise.all([
      api(`/api/business/campaigns/${campaignId}`, { headers: authHeaders() }),
      api(`/api/business/campaigns/${campaignId}/report`, { headers: authHeaders() }),
      api(`/api/business/campaigns/${campaignId}/leads?limit=150`, { headers: authHeaders() }),
      api(`/api/business/campaigns/${campaignId}/redemptions?limit=150`, { headers: authHeaders() }),
      api(`/api/business/campaigns/${campaignId}/sales?limit=150`, { headers: authHeaders() }),
    ]);

    state.selectedCampaign = campaignData.campaign || null;
    state.selectedReport = reportData || null;
    state.selectedLeads = leadsData.leads || [];
    state.selectedRedemptions = redemptionsData.redemptions || [];
    state.selectedSales = salesData.sales || [];

    renderCampaignView();
    renderCampaignAssociationInputs();
    renderLeadsView();
    renderRedemptionsView();
    renderSalesView();
    renderBranchesView();
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

function buildInsight(campaign) {
  const leads = toNumber(campaign.total_leads);
  const generated = toNumber(campaign.total_qr_generated);
  const redeemed = toNumber(campaign.total_qr_redeemed);
  const sales = toNumber(campaign.direct_sales_count || campaign.attributed_sales_count);
  const roi = ratioLabel(campaign.estimated_roi);
  const cac = money(campaign.cost_per_acquired_customer);
  return `${campaign.name} registra ${leads} leads, ${generated} tickets emitidos y ${redeemed} redenciones. El cierre comercial reporta ${sales} compras atribuidas, ROI actual de ${roi}, CAC de ${cac} y distribucion en ${launchChannelsLabel(campaign.launch_channels)}.`;
}

function formatCampaignDuration(campaign) {
  if (!campaign.starts_at && !campaign.ends_at) return "Sin fechas";
  const start = campaign.starts_at ? formatDateShort(campaign.starts_at) : "Inicio abierto";
  const end = campaign.ends_at ? formatDateShort(campaign.ends_at) : "Sin cierre";
  return `${start} - ${end}`;
}

function renderCampaignView() {
  const campaign = state.selectedCampaign;
  if (!campaign) {
    renderNoCampaignState();
    return;
  }

  campaignBreadcrumb.textContent = campaign.name;
  campaignHeroTitle.textContent = `Campana: ${campaign.name}`;
  campaignHeroSubtitle.textContent = campaign.strategy_summary || "Campana lista para medicion operativa y comercial.";
  campaignInsightText.textContent = buildInsight(campaign);
  campaignObjectiveValue.textContent = campaign.objective || "Sin objetivo definido";
  campaignDurationValue.textContent = formatCampaignDuration(campaign);
  campaignStatusValue.textContent = statusLabel(campaign.status);
  campaignBudgetValue.textContent = money(campaign.attributed_revenue);
  campaignBudgetMeta.textContent = `${money(campaign.budget_total)} invertidos | ${launchChannelsLabel(campaign.launch_channels)}`;
  campaignBudgetBar.style.width = `${Math.min(100, safeRate(campaign.attributed_revenue, campaign.budget_total || 1))}%`;
  campaignRoiValue.textContent = ratioLabel(campaign.estimated_roi);
  campaignRoiDelta.textContent = `${campaign.redemption_rate || 0}% redencion`;

  const setupEditable = ["READY_FOR_CLIENT_SETUP", "SCHEDULED"].includes(campaign.status) && !isAdmin();
  const setupReady = campaign.status === "READY_FOR_CLIENT_SETUP";
  editCampaignButton.classList.toggle("hidden", !canManageCampaigns());
  markReadyCampaignButton.classList.toggle("hidden", !(isAdmin() && campaign.status === "DRAFT"));
  launchSetupTitle.textContent = setupReady ? "Preparar lanzamiento" : "Configuracion del cliente";
  launchSetupStatus.textContent = statusLabel(campaign.status);
  launchSetupCopy.textContent = setupReady
    ? "Completa inversion, fechas, metas y canales reales antes de activar la campana."
    : setupEditable
      ? "Puedes ajustar datos de lanzamiento antes de la fecha programada."
      : "La estructura estrategica sigue bloqueada. Solo se muestran los datos operativos del cliente.";
  launchBudgetInput.value = campaign.budget_total || 0;
  launchAdditionalBudgetInput.value = campaign.metadata?.additional_budget || 0;
  launchStartsAtInput.value = formatInputDateTime(campaign.starts_at);
  launchEndsAtInput.value = formatInputDateTime(campaign.ends_at);
  launchObjectiveInput.value = campaign.objective || "";
  launchLeadsGoalInput.value = campaign.expected_leads_goal || "";
  launchRedemptionsGoalInput.value = campaign.expected_redemptions_goal || "";
  launchSalesGoalInput.value = campaign.expected_sales_goal || "";
  launchClientNotesInput.value = campaign.client_notes || "";
  Array.from(launchChannelGrid.querySelectorAll("input[type='checkbox']")).forEach((input) => {
    input.checked = Array.isArray(campaign.launch_channels) && campaign.launch_channels.includes(input.value);
    input.disabled = !setupEditable;
  });
  [
    launchBudgetInput,
    launchAdditionalBudgetInput,
    launchStartsAtInput,
    launchEndsAtInput,
    launchObjectiveInput,
    launchLeadsGoalInput,
    launchRedemptionsGoalInput,
    launchSalesGoalInput,
    launchClientNotesInput,
  ].forEach((field) => {
    field.disabled = !setupEditable;
  });
  confirmLaunchButton.disabled = !setupEditable;
  launchSetupMessage.textContent = "";

  const deliveredAssets = campaign.delivered_assets || {};
  const publicLeadQrUrl = campaignPublicLeadQrUrl(campaign);
  const assetEntries = [
    ...(publicLeadQrUrl ? [["captura_qr_publica", publicLeadQrUrl]] : []),
    ...Object.entries(deliveredAssets).filter(([, value]) => value && (!Array.isArray(value) || value.length)),
  ];
  campaignAssetsGrid.innerHTML = assetEntries.length
    ? assetEntries.map(([key, value]) => `
        <article class="asset-card">
          <span class="mono-label">${escapeHtml(key.replaceAll("_", " "))}</span>
          ${Array.isArray(value)
            ? value.map((item) => `<a href="${escapeHtml(item)}" target="_blank" rel="noreferrer">${escapeHtml(item)}</a>`).join("")
            : String(value).startsWith("http")
              ? `<a href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(value)}</a>`
              : `<strong>${escapeHtml(value)}</strong>`}
        </article>
      `).join("")
    : '<article class="asset-card"><strong>Sin assets cargados</strong><span>Market Games aun no ha publicado enlaces o materiales para esta campana.</span></article>';

  const snapshots = state.selectedReport?.sales_snapshots || [];
  campaignSnapshotsTable.innerHTML = snapshots.map((item) => `
    <tr>
      <td>${escapeHtml(item.period_type)}</td>
      <td>${escapeHtml(item.start_date)}</td>
      <td>${escapeHtml(item.end_date)}</td>
      <td>${escapeHtml(money(item.total_sales_amount))}</td>
      <td>${escapeHtml(item.total_orders)}</td>
      <td>${escapeHtml(item.notes || "-")}</td>
      <td><button class="ghost-button" type="button" data-snapshot-id="${escapeHtml(item.id)}">Editar</button></td>
    </tr>
  `).join("") || '<tr><td colspan="7">Sin snapshots cargados.</td></tr>';
  renderSnapshotComparisonChart(snapshots);
  campaignSnapshotsTable.querySelectorAll("[data-snapshot-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const snapshot = snapshots.find((item) => item.id === button.dataset.snapshotId);
      if (!snapshot) return;
      state.snapshotEditingId = snapshot.id;
      snapshotPeriodTypeInput.value = snapshot.period_type;
      snapshotSalesAmountInput.value = snapshot.total_sales_amount;
      snapshotStartDateInput.value = snapshot.start_date;
      snapshotEndDateInput.value = snapshot.end_date;
      snapshotOrdersInput.value = snapshot.total_orders;
      snapshotNotesInput.value = snapshot.notes || "";
      openSnapshotModal();
    });
  });
  saveSnapshotButton.classList.toggle("hidden", false);

  const items = [
    ["Total leads", campaign.total_leads, `${campaign.expected_leads_goal || 0} meta`, "", "Volumen total de personas identificadas que dejaron datos dentro de esta campana."],
    ["tickets emitidos", campaign.total_qr_generated, `${safeRate(campaign.total_qr_generated, campaign.total_leads)}% de los leads activaron ticket`, "", "Mide que tan bien el lead avanza hasta reclamar el beneficio."],
    ["Redenciones", campaign.total_qr_redeemed, `${campaign.expected_redemptions_goal || 0} meta`, campaign.redemption_rate < 10 ? "negative" : "", "Mide la llegada real a tienda o al punto de entrega del incentivo."],
    ["Tasa de redencion", `${campaign.redemption_rate || 0}%`, `${toNumber(campaign.direct_sales_count || campaign.attributed_sales_count)} compras atribuidas`, "", "Porcentaje de tickets emitidos que realmente fueron usados."],
    ["Clientes adquiridos", campaign.direct_sales_count || campaign.attributed_sales_count, `${money(campaign.cost_per_acquired_customer)} CAC`, "", "Clientes con compra atribuida a la campana. Es la base para leer CAC y ROI."],
  ];

  campaignKpiGrid.innerHTML = items.map(([label, value, meta, tone, help]) => `
    <article class="kpi-card" title="${escapeHtml(help || "")}">
      <span class="mono-label">${escapeHtml(label)}</span>
      <div class="kpi-meta ${tone}">${escapeHtml(meta)}</div>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");

  const avgTicket = toNumber(campaign.direct_sales_count || campaign.attributed_sales_count)
    ? toNumber(campaign.attributed_revenue) / toNumber(campaign.direct_sales_count || campaign.attributed_sales_count)
    : 0;
  campaignAnalysisTitle.textContent = campaign.estimated_roi === null
    ? "La campana aun no tiene suficiente cierre comercial."
    : `${campaign.name} ya muestra una lectura comercial clara.`;
  campaignAnalysisText.textContent = `Con ${campaign.total_leads} leads, ${campaign.total_qr_redeemed} redenciones y ${toNumber(campaign.direct_sales_count || campaign.attributed_sales_count)} compras, la campana convierte interes digital en visitas y ventas medibles.`;
  campaignEconomicsText.textContent = `ROI actual: ${ratioLabel(campaign.estimated_roi)}. CAC: ${money(campaign.cost_per_acquired_customer)}. Ticket promedio atribuido: ${money(avgTicket)}. La relacion mejora cuando CAC se mantiene bastante por debajo del ticket.`;
  campaignActionText.textContent = campaign.redemption_rate < 30
    ? "La mayor oportunidad esta en el paso ticket -> redencion. Conviene revisar incentivo, urgencia y seguimiento en tienda."
    : campaign.cost_per_acquired_customer > avgTicket * 0.6 && avgTicket > 0
      ? "La campana vende, pero el CAC esta pesado frente al ticket. Conviene optimizar pauta o subir ticket promedio."
      : "La campana esta sana. El siguiente paso es escalar el canal con mejor redencion y mantener disciplina de registro en caja.";

  renderFunnel(campaign);
  drawGroupedBars(
    campaignTimelineChart,
    buildTimelineSeries(),
    [
      { key: "leads", color: NEON_CHART.cyan, label: "Leads" },
      { key: "sales", color: NEON_CHART.yellow, label: "Ventas" },
    ]
  );
}

function renderFunnel(campaign) {
  const leads = toNumber(campaign.total_leads);
  const qr = toNumber(campaign.total_qr_generated);
  const redemptions = toNumber(campaign.total_qr_redeemed);
  const sales = toNumber(campaign.attributed_sales_count);
  const participantBase = Math.max(leads, qr, redemptions, sales, 1);
  const items = [
    ["Participantes", participantBase, 100, NEON_CHART.cyan],
    ["Leads", leads, safeRate(leads, participantBase), NEON_CHART.aqua],
    ["Escaneos de tickets", qr, safeRate(qr, participantBase), NEON_CHART.green],
    ["Redenciones", redemptions, safeRate(redemptions, participantBase), NEON_CHART.yellow],
    ["Clientes", sales, safeRate(sales, participantBase), NEON_CHART.magenta],
  ];

  funnelStack.innerHTML = items.map(([label, value, rate, color]) => `
    <div class="funnel-row">
      <div class="funnel-bar" style="background:${color}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
      <span class="funnel-rate">${escapeHtml(Number(rate).toFixed(1))}%</span>
    </div>
  `).join("");
}

function buildTimelineSeries() {
  const leads = state.selectedLeads || [];
  const sales = state.selectedReport?.sales_by_day || [];
  const leadBuckets = {};
  leads.forEach((lead) => {
    if (!lead.created_at) return;
    const date = new Date(lead.created_at).toISOString().slice(0, 10);
    leadBuckets[date] = (leadBuckets[date] || 0) + 1;
  });

  const dates = Array.from(new Set([
    ...Object.keys(leadBuckets),
    ...sales.map((item) => item.date),
  ])).sort();

  return dates.map((date) => ({
    label: formatDateShort(date),
    leads: leadBuckets[date] || 0,
    sales: toNumber(sales.find((item) => item.date === date)?.sales),
  }));
}

function renderLeadsView() {
  const feedRows = filterRows(state.contactFeed || [], [
    "name",
    "document_id",
    "phone",
    "email",
    "campaign_name",
    "attribution_source",
    "attribution_subject",
    "lead_temperature",
    "recommended_action",
  ]);
  const buyers = feedRows.filter((item) => item.lead_temperature === "buyer").length;
  const hot = feedRows.filter((item) => item.lead_temperature === "hot").length;
  const exportable = feedRows.filter((item) => item.email || item.phone).length;
  const topSource = Object.entries(feedRows.reduce((acc, item) => {
    const key = item.attribution_source || "Sin origen";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0];

  if (leadFeedKpiGrid) {
    leadFeedKpiGrid.innerHTML = [
      ["Contactos retenidos", feedRows.length, state.contactFeedRetention?.label || "Segun plan"],
      ["Compradores", buyers, "Con venta registrada"],
      ["Leads calientes", hot, "Prioridad comercial"],
      ["Exportables", exportable, "Email o telefono"],
      ["Origen lider", topSource?.[0] || "-", topSource ? `${topSource[1]} contactos` : "Sin datos"],
    ].map(([label, value, meta]) => `
      <article class="kpi-card">
        <span class="mono-label">${escapeHtml(label)}</span>
        <strong>${escapeHtml(value ?? 0)}</strong>
        <div class="kpi-meta">${escapeHtml(meta || "")}</div>
      </article>
    `).join("");
  }
  if (leadFeedRetention) {
    leadFeedRetention.textContent = `Retencion ${state.contactFeedRetention?.label || "segun plan"}`;
  }
  if (leadFeedTable) {
    leadFeedTable.innerHTML = feedRows.map((item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.name || "Sin nombre")}</strong>
          <br><span class="table-secondary">${escapeHtml(item.phone || item.email || item.document_id || "Sin contacto")}</span>
        </td>
        <td>${escapeHtml(item.attribution_source || "-")}</td>
        <td>
          ${escapeHtml(item.campaign_name || "Sin campana")}
          <br><span class="table-secondary">${escapeHtml(item.attribution_subject || "-")}</span>
        </td>
        <td>
          <span class="status-chip ${item.lead_temperature === "buyer" ? "ok" : item.lead_temperature === "hot" ? "warning" : "pending"}">${escapeHtml(item.lead_temperature || "-")}</span>
          <br><span class="table-secondary">${escapeHtml(item.qr_status || item.stage || "-")}</span>
        </td>
        <td>${item.sale_amount ? money(item.sale_amount) : "-"}</td>
        <td>${escapeHtml(item.recommended_action || "-")}</td>
      </tr>
    `).join("") || '<tr><td colspan="6">Sin contactos dentro de la retencion de tu plan.</td></tr>';
  }

  const rows = filterRows(state.selectedLeads || [], ["name", "document_id", "phone", "email", "qr_status", "reward_name", "lead_source"]);
  campaignLeadsTable.innerHTML = rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.name || "-")}</td>
      <td>${escapeHtml(item.lead_source || "-")}</td>
      <td>${escapeHtml(leadInterestSummary(item))}</td>
      <td>${escapeHtml(leadActionRecommendation(item))}</td>
      <td>${escapeHtml(item.document_id || "-")}</td>
      <td>${escapeHtml(item.phone || item.email || "-")}</td>
      <td>${escapeHtml(item.qr_status || "-")}</td>
      <td>${escapeHtml(item.reward_name || "-")}</td>
      <td>${item.qr_code_id ? `<button class="ghost-button" type="button" data-download-lead-qr="${escapeHtml(item.qr_code_id)}">Ticket</button>` : "-"}</td>
    </tr>
  `).join("") || '<tr><td colspan="9">Sin leads para esta campana.</td></tr>';
  campaignLeadsTable.querySelectorAll("[data-download-lead-qr]").forEach((button) => {
    button.addEventListener("click", () => downloadActiveLeadQr(button.dataset.downloadLeadQr));
  });
}

function renderRedemptionsView() {
  const rows = filterRows(state.selectedRedemptions || [], ["player_name", "reward_name", "branch_name", "validator_name"]);
  campaignRedemptionsTable.innerHTML = rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.player_name || "-")}</td>
      <td>${escapeHtml(item.reward_name || "-")}</td>
      <td>${escapeHtml(formatDate(item.redeemed_at))}</td>
      <td>${escapeHtml(item.branch_name || "-")}</td>
      <td>${escapeHtml(item.validator_name || "-")}</td>
      <td><span class="status-chip ${item.sale_amount ? "ok" : "pending"}">${item.sale_amount ? "Completado" : "Pendiente"}</span></td>
    </tr>
  `).join("") || '<tr><td colspan="6">Sin redenciones para esta campana.</td></tr>';

  const rewardCounts = rows.reduce((acc, item) => {
    const key = item.reward_name || "Beneficio";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topReward = Object.entries(rewardCounts).sort((a, b) => b[1] - a[1])[0];
  redemptionInsightTitle.textContent = topReward
    ? `${topReward[0]} lidera con ${topReward[1]} redenciones registradas.`
    : "Sin datos suficientes";
}

function renderSalesView() {
  const campaign = state.selectedCampaign || {};
  const sales = filterRows(state.selectedSales || [], ["player_name", "document_id", "phone", "payment_method", "product_or_service", "branch_name"]);
  const totalRevenue = sales.reduce((sum, item) => sum + toNumber(item.sale_amount), 0);
  const avgTicket = sales.length ? totalRevenue / sales.length : 0;
  const items = [
    ["Ventas atribuidas", sales.length, money(totalRevenue)],
    ["Ticket promedio", money(avgTicket), "Promedio por venta"],
    ["Meta comercial", money(campaign.expected_sales_goal), `${safeRate(totalRevenue, campaign.expected_sales_goal || 1)}% cumplido`],
  ];

  salesKpiGrid.innerHTML = items.map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");
  renderCustomerAcquisitionAffiliateOptions();

  campaignSalesTable.innerHTML = sales.map((item) => `
    <tr>
      <td>${escapeHtml(item.player_name || "-")}</td>
      <td>${escapeHtml(item.document_id || "-")}</td>
      <td>${escapeHtml(item.phone || "-")}</td>
      <td>${escapeHtml(money(item.sale_amount))}</td>
      <td>${escapeHtml(item.payment_method || "-")}</td>
      <td>${escapeHtml(item.product_or_service || "-")}</td>
      <td>${escapeHtml(item.branch_name || "-")}</td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
    </tr>
  `).join("") || '<tr><td colspan="8">Sin ventas para esta campana.</td></tr>';
}

function renderBranchesView() {
  const summary = new Map();
  (state.selectedRedemptions || []).forEach((item) => {
    const key = item.branch_name || "Sin sucursal";
    if (!summary.has(key)) summary.set(key, { branch: key, redemptions: 0, sales: 0, revenue: 0 });
    summary.get(key).redemptions += 1;
  });
  (state.selectedSales || []).forEach((item) => {
    const key = item.branch_name || "Sin sucursal";
    if (!summary.has(key)) summary.set(key, { branch: key, redemptions: 0, sales: 0, revenue: 0 });
    summary.get(key).sales += 1;
    summary.get(key).revenue += toNumber(item.sale_amount);
  });

  const rows = Array.from(summary.values()).sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const topBranch = rows[0]?.branch || "Sin datos";
  branchKpiGrid.innerHTML = [
    ["Sucursales activas", rows.length, topBranch],
    ["Redenciones", state.selectedRedemptions.length, `${rows.length ? Math.round(state.selectedRedemptions.length / rows.length) : 0} promedio/sucursal`],
    ["Ingresos", money(totalRevenue), `${state.selectedSales.length} ventas`],
  ].map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");

  branchTable.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.branch)}</td>
      <td>${escapeHtml(row.redemptions)}</td>
      <td>${escapeHtml(row.sales)}</td>
      <td>${escapeHtml(money(row.revenue))}</td>
    </tr>
  `).join("") || '<tr><td colspan="4">Sin datos por sucursal.</td></tr>';
}

function renderAdminView() {
  if (!isAdmin()) {
    adminKpiGrid.innerHTML = "";
    adminPanelMessage.textContent = "Tu rol actual es de negocio. La gestion global sigue disponible solo para admins en `/admin`.";
    return;
  }

  adminKpiGrid.innerHTML = [
    ["Campanas globales", state.adminCampaigns.length, "Todas las empresas"],
    ["Campanas del negocio", state.campaigns.length, session.user.business_id || "-"],
    ["Rol actual", session.user.role, "Acceso a crear y editar campanas"],
  ].map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");

  adminPanelMessage.textContent = "Este usuario puede crear y editar campanas desde el modal del portal y tambien operar `/admin`.";
}

function validatorCanUseBarcodeDetector() {
  return "BarcodeDetector" in window;
}

function validatorCanUseJsQr() {
  return typeof window.jsQR === "function";
}

function validatorCanUseCameraScanner() {
  return window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia) && (validatorCanUseBarcodeDetector() || validatorCanUseJsQr());
}

function currentRewardPassValidation() {
  return state.validatorLastValidation?.kind === "reward_pass"
    ? state.validatorLastValidation.reward_pass
    : null;
}

function rewardPassBalancePreview(syncRedeemInput = false) {
  const pass = currentRewardPassValidation();
  const invoiceValue = Math.max(0, Number(validatorSaleAmountInput?.value || 0));
  const available = Math.max(0, Number(pass?.current_balance_cop || 0));
  const coverage = invoiceValue > 0 ? Math.min(invoiceValue, available) : 0;
  const remaining = Math.max(available - coverage, 0);
  const overage = Math.max(invoiceValue - available, 0);
  const partialAllowed = pass?.partial_redemption_allowed !== false;

  if (syncRedeemInput && validatorRewardPassRedeemInput) {
    validatorRewardPassRedeemInput.value = coverage || "";
  }
  if (validatorRewardPassAvailableValue) validatorRewardPassAvailableValue.textContent = money(available);
  if (validatorRewardPassCoverageValue) validatorRewardPassCoverageValue.textContent = money(coverage);
  if (validatorRewardPassRemainingValue) validatorRewardPassRemainingValue.textContent = money(remaining);
  if (validatorRewardPassOverageValue) validatorRewardPassOverageValue.textContent = money(overage);
  if (validatorRewardPassBalancePanel) {
    validatorRewardPassBalancePanel.dataset.state = overage > 0 ? "overage" : remaining > 0 ? "remaining" : coverage > 0 ? "exact" : "idle";
  }
  if (validatorRewardPassBalanceMessage) {
    if (!pass) {
      validatorRewardPassBalanceMessage.textContent = "Escanea un Reward Pass y registra el total de la factura para calcular saldo o excedente.";
    } else if (!invoiceValue) {
      validatorRewardPassBalanceMessage.textContent = "Ingresa el total de la factura electronica para calcular cuanto cubre el Reward Pass.";
    } else if (!partialAllowed && remaining > 0) {
      validatorRewardPassBalanceMessage.textContent = "Este Reward Pass esta configurado de un solo uso. La factura no consume todo el saldo; confirma condiciones aceptadas antes de redimir.";
    } else if (overage > 0) {
      validatorRewardPassBalanceMessage.textContent = `El Reward Pass cubre ${money(coverage)} y el cliente debe pagar la diferencia de ${money(overage)} en la factura.`;
    } else if (remaining > 0) {
      validatorRewardPassBalanceMessage.textContent = `La factura consume ${money(coverage)} y queda un saldo disponible de ${money(remaining)}.`;
    } else {
      validatorRewardPassBalanceMessage.textContent = "La factura consume exactamente el saldo disponible del Reward Pass.";
    }
  }
  return { available, coverage, invoiceValue, overage, partialAllowed, remaining };
}

async function validatorCameraDiagnostic() {
  const parts = [];
  parts.push(window.isSecureContext ? "contexto seguro ok" : "contexto no seguro");
  parts.push(navigator.mediaDevices?.getUserMedia ? "getUserMedia ok" : "getUserMedia no disponible");
  parts.push(validatorCanUseBarcodeDetector() ? "BarcodeDetector ok" : "BarcodeDetector no");
  parts.push(validatorCanUseJsQr() ? "modo compatible ok" : "modo compatible no");

  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: "camera" });
      parts.push(`permiso camara: ${permission.state}`);
    } else {
      parts.push("permiso camara: sin API");
    }
  } catch {
    parts.push("permiso camara: no consultable");
  }

  return parts.join(" | ");
}

function setValidatorResult(mode, title, message, data = null) {
  validatorResultTitle.textContent = title;
  validatorResultMessage.textContent = message;
  validatorResultChip.className = `result-chip ${mode}`;
  validatorResultChip.textContent = mode === "ok" ? "Valido" : mode === "danger" ? "Rechazado" : "Pendiente";

  validatorBusinessValue.textContent = data?.business?.name || "-";
  validatorCampaignValue.textContent = data?.campaign?.name || data?.batch?.name || "-";
  validatorGameValue.textContent = data?.game?.name || data?.qr_code?.origin_type || "-";
  validatorRewardValue.textContent = data?.reward?.display || data?.reward?.name || data?.reward?.benefit_value?.label || "-";
  validatorPlayerValue.textContent = data?.player?.name || "-";
  validatorDocumentValue.textContent = data?.player?.document_id || "-";
  validatorContactValue.textContent = [
    data?.player?.email,
    data?.player?.phone,
    data?.reward_pass ? `Saldo: ${money(data.reward_pass.current_balance_cop)}` : "",
    data?.sale?.product_name ? `Venta: ${data.sale.product_name}` : "",
    data?.affiliate?.name ? `Recomendado por: ${data.affiliate.name}` : "",
  ].filter(Boolean).join(" | ") || "-";
  validatorExpiresValue.textContent = formatDate(data?.qr_code?.expires_at);
  validatorRedeemButton.disabled = !data?.allowed;
  if (data?.kind === "reward_pass") {
    if (validatorRewardPassRedeemInput) validatorRewardPassRedeemInput.value = "";
    if (validatorRewardPassDocumentInput) validatorRewardPassDocumentInput.value = data.reward_pass?.beneficiary_document || "";
    if (validatorSaleAmountInput) validatorSaleAmountInput.value = "";
    rewardPassBalancePreview(true);
  } else {
    rewardPassBalancePreview(false);
  }
}

function resetValidatorSaleForm() {
  validatorHadSaleInput.checked = true;
  validatorSaleAmountInput.value = "";
  if (validatorRewardPassInvoiceInput) validatorRewardPassInvoiceInput.value = "";
  if (validatorRewardPassRedeemInput) validatorRewardPassRedeemInput.value = "";
  if (validatorRewardPassBranchInput) validatorRewardPassBranchInput.value = "";
  if (validatorRewardPassDocumentInput) validatorRewardPassDocumentInput.value = "";
  validatorPaymentMethodInput.value = "";
  validatorProductServiceInput.value = "";
  validatorSaleNotesInput.value = "";
  validatorSaleStatus.textContent = "";
  rewardPassBalancePreview(false);
}

function extractValidatorToken(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.searchParams.get("token") || url.pathname.split("/").filter(Boolean).pop() || value;
  } catch {
    return value;
  }
}

function renderValidatorHistory(redemptions) {
  if (!redemptions.length) {
    validatorHistoryTable.innerHTML = '<tr><td colspan="5">No hay redenciones cargadas.</td></tr>';
    return;
  }

  const rows = filterRows(filterByDate(redemptions, ["redeemed_at"]), [
    "reward_name",
    "player_name",
    "player_email",
    "player_phone",
    "redeemed_by",
  ]);
  validatorHistoryTable.innerHTML = rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.reward_name || "Beneficio")}</td>
      <td>${escapeHtml(item.player_name || item.player_email || "-")}</td>
      <td>${escapeHtml(item.player_phone || "-")}</td>
      <td>${escapeHtml(formatDate(item.redeemed_at))}</td>
      <td>${escapeHtml(item.redeemed_by || "-")}</td>
    </tr>
  `).join("") || '<tr><td colspan="5">No hay redenciones para este rango.</td></tr>';
}

async function loadValidatorHistory() {
  if (!session?.token) return;

  const businessId = session.user?.business_id;
  if (!businessId) {
    validatorHistoryTable.innerHTML = '<tr><td colspan="5">El admin global puede validar cualquier ticket, pero este historial requiere un negocio asignado.</td></tr>';
    return;
  }

  try {
    const data = await api(`/api/businesses/${businessId}/redemptions`, {
      method: "GET",
      headers: authHeaders(),
    });
    renderValidatorHistory(data.redemptions || []);
  } catch (error) {
    validatorHistoryTable.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function renderValidatorView() {
  if (!window.isSecureContext) {
    validatorCameraStatus.textContent = "Origen inseguro";
    validatorScannerHint.textContent = `La camara solo funciona en HTTPS o localhost. ${await validatorCameraDiagnostic()}. Usa el ingreso manual.`;
  } else if (!validatorCanUseCameraScanner()) {
    validatorCameraStatus.textContent = "Sin soporte";
    validatorScannerHint.textContent = `La camara no esta disponible en este navegador. ${await validatorCameraDiagnostic()}. Usa el ingreso manual.`;
  } else if (!validatorCanUseBarcodeDetector() && validatorCanUseJsQr()) {
    validatorCameraStatus.textContent = "Modo compatible";
    validatorScannerHint.textContent = `Tu navegador no tiene BarcodeDetector, pero si puede usar la camara cuando el sitio se abre en HTTPS o localhost. ${await validatorCameraDiagnostic()}.`;
  } else {
    validatorCameraStatus.textContent = "Lista";
    validatorScannerHint.textContent = `Escaner listo. ${await validatorCameraDiagnostic()}.`;
  }

  if (!state.validatorLastValidation) {
    setValidatorResult("neutral", "Sin validacion", "Escanea o pega un ticket para consultar la base de datos.");
  }

  loadValidatorHistory();
}

function strategicMetricCard(label, value, accent = "default") {
  return `
    <article class="surface-card kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong class="kpi-value ${accent}">${escapeHtml(value)}</strong>
    </article>
  `;
}

function strategicBatchStatusClass(status) {
  return ["ACTIVE", "REDEEMED"].includes(String(status || "").toUpperCase()) ? "ok" : "pending";
}

function setTicketCenterTab(tab) {
  const nextTab = tab || "center";
  state.ticketCenterTab = nextTab;
  ticketCenterTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.ticketTab === nextTab);
  });
  ticketCenterPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.ticketPanel === nextTab);
  });
  if (state.currentView === "strategic-qr") {
    renderTicketCenterModules();
    loadTicketCenterForCurrentTab({ quiet: true }).catch((error) => {
      showFeedback(error.message, "error", { title: "No se pudo cargar Gaming Center" });
    });
  }
}

function ticketChannelLabel(value) {
  const key = String(value || "").trim();
  const labels = {
    etiqueta: "Etiqueta",
    empaque: "Empaque",
    volante: "Volante",
    evento: "Evento",
    feria: "Feria",
    influencer: "Influencer",
    whatsapp: "WhatsApp",
    "redes-sociales": "Redes sociales",
    pauta: "Pauta",
    alianza: "Alianza",
    referido: "Referido",
    mostrador: "Mostrador",
    "punto-de-venta": "Punto de venta",
    STORE_WALK_IN: "Vitrina / llegada directa",
    FRIEND_REFERRAL: "Referido",
    FAIR_EVENT: "Feria o evento",
    INTERNET_SEARCH: "Internet / buscador",
    SOCIAL_MEDIA: "Redes sociales",
    PAID_ADS: "Pauta",
    QR_SCAN: "Ticket / pieza impresa",
    OTHER: "Otro",
  };
  return labels[key] || key || "Sin canal";
}

function ticketCenterStats() {
  const metrics = state.strategicQrMetrics?.totals || {};
  const batches = state.strategicQrBatches || [];
  const history = state.strategicQrHistory || [];
  const redemptions = state.selectedRedemptions || [];
  const sales = state.selectedSales || [];
  const batchIssued = batches.reduce((sum, item) => sum + toNumber(item.quantity || item.generated_count), 0);
  const historyIssued = history.length;
  const postSaleGenerated = toNumber(metrics.post_sale_generated || 0);
  const ticketsIssued = Math.max(
    batchIssued + postSaleGenerated,
    historyIssued,
    toNumber(metrics.strategic_generated || metrics.total_generated || metrics.qr_generated || 0)
  );
  const activeTickets = history.filter((item) => ["ACTIVE", "UNCLAIMED", "CLAIMED"].includes(String(item.status || "").toUpperCase())).length
    + batches.reduce((sum, item) => sum + toNumber(item.active_count) + toNumber(item.unclaimed_count), 0);
  const redeemedTickets = Math.max(
    redemptions.length,
    toNumber(metrics.post_sale_redeemed || 0) + toNumber(metrics.strategic_redeemed || 0),
    history.filter((item) => String(item.status || "").toUpperCase() === "REDEEMED").length
  );
  const revenue = sales.reduce((sum, item) => sum + toNumber(item.sale_amount || item.amount || item.total), 0);
  const salesWithTicket = sales.length;
  const averageTicket = salesWithTicket ? revenue / salesWithTicket : 0;
  const missingSales = redemptions.filter((item) => !toNumber(item.sale_amount)).length;
  const expiredTickets = toNumber(metrics.expired_without_redeem || 0)
    + history.filter((item) => ["EXPIRED", "VOID", "CANCELLED"].includes(String(item.status || "").toUpperCase())).length;
  const repeatedIds = new Map();
  redemptions.forEach((item) => {
    const key = item.document_id || item.phone || item.player_name;
    if (!key) return;
    repeatedIds.set(key, (repeatedIds.get(key) || 0) + 1);
  });
  const repeatRisk = Array.from(repeatedIds.values()).filter((count) => count > 1).length;
  const postSaleRedeemed = toNumber(metrics.post_sale_redeemed || 0);
  const loopRate = postSaleGenerated ? (postSaleRedeemed / postSaleGenerated) * 100 : 0;
  return {
    metrics,
    batches,
    history,
    redemptions,
    sales,
    ticketsIssued,
    activeTickets,
    redeemedTickets,
    revenue,
    salesWithTicket,
    averageTicket,
    missingSales,
    expiredTickets,
    repeatRisk,
    postSaleGenerated,
    postSaleRedeemed,
    loopRate,
  };
}

function renderTicketMetricGrid(target, items) {
  if (!target) return;
  target.innerHTML = items.map(([label, value, meta, accent]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong class="kpi-value ${escapeHtml(accent || "")}">${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta || "")}</div>
    </article>
  `).join("");
}

function renderTicketPhysicalFlow(stats) {
  renderTicketMetricGrid(ticketFlowKpiGrid, [
    ["Tickets emitidos", stats.ticketsIssued.toLocaleString("es-CO"), "Inventario fisico/digital en circulacion", "highlight"],
    ["Llegadas medidas", stats.redeemedTickets.toLocaleString("es-CO"), "Redenciones o validaciones en tienda"],
    ["Ventas con ticket", stats.salesWithTicket.toLocaleString("es-CO"), money(stats.revenue)],
    ["Ticket promedio", money(stats.averageTicket), "Venta promedio registrada"],
  ]);

  const flow = [
    ["Atraccion", "El cliente recibe ticket en volante, empaque, feria, vitrina o referido.", stats.ticketsIssued],
    ["Llegada", "El ticket aparece fisicamente en tienda o caja.", stats.activeTickets + stats.redeemedTickets],
    ["Redencion", "El vendedor valida identidad, beneficio y estado.", stats.redeemedTickets],
    ["Venta", "La caja registra valor, producto, sede y contexto.", stats.salesWithTicket],
    ["Salida", "El cliente recibe proximo ticket para volver o recomendar.", stats.postSaleGenerated],
  ];

  if (ticketPhysicalFlowTrack) {
    ticketPhysicalFlowTrack.innerHTML = flow.map(([title, copy, value], index) => `
      <article>
        <span>${index + 1}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(copy)}</p>
        <b>${escapeHtml(Number(value || 0).toLocaleString("es-CO"))}</b>
      </article>
    `).join("");
  }

  if (ticketPhysicalFlowTable) {
    ticketPhysicalFlowTable.innerHTML = flow.map(([title, signal, value]) => `
      <tr>
        <td>${escapeHtml(title)}</td>
        <td>${escapeHtml(signal)}</td>
        <td>${escapeHtml(Number(value || 0).toLocaleString("es-CO"))}</td>
        <td>${escapeHtml(value ? "Hay senal operativa para medir y comparar." : "Activa esta etapa para cerrar el ciclo fisico.")}</td>
      </tr>
    `).join("");
  }
}

function renderTicketLoop(stats) {
  renderTicketMetricGrid(ticketLoopKpiGrid, [
    ["Tickets de salida", stats.postSaleGenerated.toLocaleString("es-CO"), "Postventa emitida despues de compra", "highlight"],
    ["Vueltas medidas", stats.postSaleRedeemed.toLocaleString("es-CO"), "Tickets postventa redimidos"],
    ["Loop rate", `${stats.loopRate.toFixed(1)}%`, "Recompra medida"],
    ["Afiliados activos", (state.affiliates || []).length.toLocaleString("es-CO"), "Clientes con ticket permanente"],
  ]);
  if (!ticketLoopBoard) return;
  const cards = [
    ["Llegar con ticket", "Toda campana fisica debe entregar una razon verificable para entrar a tienda.", "Generar paquetes"],
    ["Comprar con ticket", "Caja o vendedor asocia la venta al ticket, canal, beneficio y sucursal.", "Registrar venta"],
    ["Salir con ticket", "Cada compra debe terminar con un nuevo ticket de recompra, referido o afiliado.", "Crear postventa"],
  ];
  ticketLoopBoard.innerHTML = cards.map(([title, copy, action], index) => `
    <article class="surface-card ticket-action-card">
      <span class="ticket-action-number">${index + 1}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(copy)}</p>
      <button class="ghost-button" data-ticket-open-view="${index === 1 ? "sales" : "strategic-qr"}" type="button">${escapeHtml(action)}</button>
    </article>
  `).join("");
}

function renderTicketRevenue(stats) {
  if (!ticketRevenueTable) return;
  const rows = [
    {
      type: "Ticket postventa",
      issued: stats.postSaleGenerated,
      redeemed: stats.postSaleRedeemed,
      sales: stats.salesWithTicket,
      revenue: stats.revenue,
      reading: stats.postSaleGenerated ? "Mide si cada compra esta creando la proxima visita." : "Aun falta convertir ventas en tickets de salida.",
    },
    {
      type: "Paquetes fisicos",
      issued: stats.batches.reduce((sum, item) => sum + toNumber(item.quantity || item.generated_count), 0),
      redeemed: stats.batches.reduce((sum, item) => sum + toNumber(item.redeemed_count), 0),
      sales: stats.sales.filter((item) => item.acquisition_source === "QR_SCAN").length,
      revenue: stats.sales.filter((item) => item.acquisition_source === "QR_SCAN").reduce((sum, item) => sum + toNumber(item.sale_amount), 0),
      reading: "Compara empaque, volante, feria, vitrina y mostrador por revenue real.",
    },
    {
      type: "Referidos / afiliados",
      issued: (state.affiliates || []).length,
      redeemed: stats.sales.filter((item) => item.referred_affiliate_id || item.affiliate_id).length,
      sales: stats.sales.filter((item) => item.referred_affiliate_id || item.affiliate_id).length,
      revenue: stats.sales.filter((item) => item.referred_affiliate_id || item.affiliate_id).reduce((sum, item) => sum + toNumber(item.sale_amount), 0),
      reading: "Premia solo recomendaciones que terminan en compra registrada.",
    },
  ];
  ticketRevenueTable.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.type)}</td>
      <td>${escapeHtml(Number(row.issued || 0).toLocaleString("es-CO"))}</td>
      <td>${escapeHtml(Number(row.redeemed || 0).toLocaleString("es-CO"))}</td>
      <td>${escapeHtml(Number(row.sales || 0).toLocaleString("es-CO"))}</td>
      <td>${escapeHtml(money(row.revenue || 0))}</td>
      <td>${escapeHtml(row.reading)}</td>
    </tr>
  `).join("");
}

function renderTicketChannels(stats) {
  if (!ticketChannelTable) return;
  const channelMap = new Map();
  const ensure = (key) => {
    const label = ticketChannelLabel(key);
    if (!channelMap.has(label)) channelMap.set(label, { channel: label, tickets: 0, redemptions: 0, sales: 0, revenue: 0 });
    return channelMap.get(label);
  };
  stats.batches.forEach((item) => {
    const row = ensure(item.channel_use || item.qr_origin_type);
    row.tickets += toNumber(item.quantity || item.generated_count);
    row.redemptions += toNumber(item.redeemed_count);
  });
  stats.sales.forEach((item) => {
    const row = ensure(item.acquisition_source || item.payment_method || item.branch_name);
    row.sales += 1;
    row.revenue += toNumber(item.sale_amount);
  });
  const rows = Array.from(channelMap.values()).sort((a, b) => b.revenue - a.revenue || b.tickets - a.tickets);
  ticketChannelTable.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.channel)}</td>
        <td>${escapeHtml(row.tickets.toLocaleString("es-CO"))}</td>
        <td>${escapeHtml(row.redemptions.toLocaleString("es-CO"))}</td>
        <td>${escapeHtml(row.sales.toLocaleString("es-CO"))}</td>
        <td>${escapeHtml(money(row.revenue))}</td>
        <td>${escapeHtml(row.revenue ? "Escalar con mas tickets y mismo beneficio." : "Medir venta en caja para saber si este canal paga.")}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="6">Crea paquetes de tickets o registra ventas con medio de llegada.</td></tr>';
}

function renderTicketBranches(stats) {
  if (!ticketBranchTable) return;
  const summary = new Map();
  stats.redemptions.forEach((item) => {
    const key = item.branch_name || "Sin sucursal";
    if (!summary.has(key)) summary.set(key, { branch: key, redemptions: 0, sales: 0, revenue: 0 });
    summary.get(key).redemptions += 1;
  });
  stats.sales.forEach((item) => {
    const key = item.branch_name || "Sin sucursal";
    if (!summary.has(key)) summary.set(key, { branch: key, redemptions: 0, sales: 0, revenue: 0 });
    summary.get(key).sales += 1;
    summary.get(key).revenue += toNumber(item.sale_amount);
  });
  const rows = Array.from(summary.values()).sort((a, b) => b.revenue - a.revenue || b.redemptions - a.redemptions);
  ticketBranchTable.innerHTML = rows.length
    ? rows.map((row, index) => `
      <tr>
        <td>${escapeHtml(row.branch)}</td>
        <td>${escapeHtml(row.redemptions)}</td>
        <td>${escapeHtml(row.sales)}</td>
        <td>${escapeHtml(money(row.revenue))}</td>
        <td>${escapeHtml(index === 0 && row.revenue ? "Sucursal lider: replicar guion, horario y beneficio." : row.redemptions && !row.sales ? "Tiene llegada fisica, falta registrar venta." : "Mantener medicion por sede.")}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">Asocia redenciones y ventas a una sucursal para comparar tiendas.</td></tr>';
}

function renderTicketSellers(stats) {
  if (!ticketSellerTable) return;
  const sellerMap = new Map();
  const ensure = (key) => {
    const seller = key || "Sin vendedor";
    if (!sellerMap.has(seller)) sellerMap.set(seller, { seller, validations: 0, sales: 0, revenue: 0 });
    return sellerMap.get(seller);
  };
  stats.redemptions.forEach((item) => {
    ensure(item.validator_name || item.created_by_name).validations += 1;
  });
  stats.sales.forEach((item) => {
    const row = ensure(item.validator_name || item.seller_name || item.created_by_name);
    row.sales += 1;
    row.revenue += toNumber(item.sale_amount);
  });
  const rows = Array.from(sellerMap.values()).sort((a, b) => b.revenue - a.revenue || b.validations - a.validations);
  ticketSellerTable.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.seller)}</td>
        <td>${escapeHtml(row.validations)}</td>
        <td>${escapeHtml(row.sales)}</td>
        <td>${escapeHtml(money(row.revenue))}</td>
        <td>${escapeHtml(row.validations && !row.sales ? "Entrenar cierre y registro de venta." : "Usar como referencia operativa.")}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">Cuando el equipo valide tickets, aqui se medira quien convierte mejor.</td></tr>';
}

function renderTicketShield(stats) {
  renderTicketMetricGrid(ticketShieldKpiGrid, [
    ["Doble uso bloqueado", stats.redemptions.filter((item) => String(item.qr_status || item.status || "").toUpperCase() === "REDEEMED").length.toLocaleString("es-CO"), "Tickets ya consumidos"],
    ["Vencidos sin redimir", stats.expiredTickets.toLocaleString("es-CO"), "Beneficios que perdieron vigencia", stats.expiredTickets ? "warning" : ""],
    ["Redenciones sin venta", stats.missingSales.toLocaleString("es-CO"), "Falta cierre comercial", stats.missingSales ? "warning" : ""],
    ["Riesgo repetidos", stats.repeatRisk.toLocaleString("es-CO"), "Documento/telefono repetido", stats.repeatRisk ? "warning" : ""],
  ]);
  if (!ticketShieldBoard) return;
  const cards = [
    ["Ticket vencido", stats.expiredTickets, "Reducir vigencia o activar recordatorio antes de vencer."],
    ["Redimido sin venta", stats.missingSales, "Obligar registro de resultado comercial despues de redimir."],
    ["Identidad repetida", stats.repeatRisk, "Revisar reglas por cedula, telefono y beneficio."],
  ];
  ticketShieldBoard.innerHTML = cards.map(([title, value, copy]) => `
    <article class="surface-card ticket-action-card ${value ? "ticket-risk-card" : ""}">
      <span class="material-symbols-outlined">${value ? "warning" : "verified_user"}</span>
      <h3>${escapeHtml(title)}</h3>
      <strong>${escapeHtml(Number(value || 0).toLocaleString("es-CO"))}</strong>
      <p>${escapeHtml(copy)}</p>
    </article>
  `).join("");
}

function renderNextTicketEngine(stats) {
  if (!nextTicketBoard) return;
  const lowLoop = stats.postSaleGenerated === 0 || stats.loopRate < 15;
  const missingSale = stats.missingSales > 0;
  const bestChannel = stats.batches
    .map((item) => ({ label: ticketChannelLabel(item.channel_use || item.qr_origin_type), value: toNumber(item.redeemed_count) }))
    .sort((a, b) => b.value - a.value)[0];
  const cards = [
    {
      title: lowLoop ? "Emitir ticket postventa" : "Subir ticket postventa",
      copy: lowLoop
        ? "Cada compra debe cerrar con un ticket de regreso. Empieza con 7 o 15 dias de vigencia."
        : `El loop ya mide ${stats.loopRate.toFixed(1)}%. Prueba beneficios por ticket promedio.`,
      action: "Generar postventa",
      view: "strategic-qr",
      icon: "sync",
    },
    {
      title: missingSale ? "Cerrar redenciones sin venta" : "Mantener venta atribuida",
      copy: missingSale
        ? `${stats.missingSales} redenciones no tienen venta. Pide a caja registrar resultado antes de terminar.`
        : "Las redenciones estan conectadas a resultado comercial.",
      action: "Ir a ventas",
      view: "sales",
      icon: "payments",
    },
    {
      title: bestChannel?.value ? `Duplicar ${bestChannel.label}` : "Probar canal fisico",
      copy: bestChannel?.value
        ? "Ese canal ya produjo redenciones. Crea otro lote con mejor beneficio o vencimiento mas corto."
        : "Crea lotes para volante, empaque, feria, mostrador o referido y mide cual trae tienda.",
      action: "Crear paquete",
      view: "strategic-qr",
      icon: "auto_awesome",
    },
  ];
  nextTicketBoard.innerHTML = cards.map((card) => `
    <article class="surface-card ticket-action-card next-ticket-card">
      <span class="material-symbols-outlined">${escapeHtml(card.icon)}</span>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.copy)}</p>
      <button class="solid-button" data-ticket-open-view="${escapeHtml(card.view)}" type="button">${escapeHtml(card.action)}</button>
    </article>
  `).join("");
}

function renderTicketCenterModules() {
  const stats = ticketCenterStats();
  renderTicketPhysicalFlow(stats);
  renderTicketLoop(stats);
  renderTicketRevenue(stats);
  renderTicketChannels(stats);
  renderTicketBranches(stats);
  renderTicketSellers(stats);
  renderTicketShield(stats);
  renderNextTicketEngine(stats);
}

function renderQrBatchResultCard(batch, options = {}) {
  if (!batch) {
    qrBatchResult.classList.add("hidden");
    qrBatchResult.innerHTML = "";
    return;
  }

  const quantity = Number(batch.quantity || batch.generated_count || 0);
  const createdAt = formatDate(batch.created_at);
  const activeCount = Number(batch.active_count || 0);
  const unclaimedCount = Number(batch.unclaimed_count || 0);
  const redeemedCount = Number(batch.redeemed_count || 0);
  const expiresAt = batch.expires_at ? formatDate(batch.expires_at) : "Sin expiracion";

  qrBatchResult.classList.remove("hidden");
  qrBatchResult.className = "surface-card qr-batch-result-card";
  qrBatchResult.innerHTML = `
    <div class="qr-batch-result-head">
      <div>
        <span class="mono-label">${escapeHtml(options.eyebrow || "Paquete registrado")}</span>
        <h4>${escapeHtml(batch.name || "Paquete de tickets")}</h4>
      </div>
      <span class="status-chip ${strategicBatchStatusClass(batch.status)}">${escapeHtml(batch.status || "ACTIVE")}</span>
    </div>
    <div class="qr-batch-result-grid">
      <article class="qr-batch-stat">
        <span class="mono-label">Ticket creados</span>
        <strong>${escapeHtml(quantity)}</strong>
        <span class="table-secondary">Inventario ya guardado en el portal</span>
      </article>
      <article class="qr-batch-stat">
        <span class="mono-label">Disponibles</span>
        <strong>${escapeHtml(activeCount + unclaimedCount)}</strong>
        <span class="table-secondary">${escapeHtml(unclaimedCount)} por reclamar y ${escapeHtml(activeCount)} activos</span>
      </article>
      <article class="qr-batch-stat">
        <span class="mono-label">Redimidos</span>
        <strong>${escapeHtml(redeemedCount)}</strong>
        <span class="table-secondary">Vence: ${escapeHtml(expiresAt)}</span>
      </article>
    </div>
    <div class="qr-batch-result-meta">
      <span class="table-secondary">Creado ${escapeHtml(createdAt)}${batch.channel_use ? ` | Canal ${escapeHtml(batch.channel_use)}` : ""}</span>
      <span class="table-secondary">${escapeHtml(batch.qr_origin_type || "-")} | ${escapeHtml(batch.benefit_value?.label || batch.benefit_type || "Beneficio")}</span>
    </div>
    <div class="qr-batch-result-actions">
      <div class="inline-selects">
        <select id="${escapeHtml(options.selectPrefix || "qrBatch")}FormatSelect">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="html">HTML imprimible</option>
          <option value="zip">ZIP con PNG</option>
          <option value="pdf">PDF etiquetas</option>
        </select>
        <select id="${escapeHtml(options.selectPrefix || "qrBatch")}TemplateSelect">
          <option value="sticker">Sticker</option>
          <option value="shelf">Shelf</option>
          <option value="card">Card</option>
        </select>
        <select id="${escapeHtml(options.selectPrefix || "qrBatch")}PaperSelect">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
      </div>
      <div class="inline-selects">
        <button class="solid-button" type="button" id="${escapeHtml(options.selectPrefix || "qrBatch")}DownloadButton">Descargar paquete</button>
        <button class="ghost-button" type="button" id="${escapeHtml(options.selectPrefix || "qrBatch")}FirstQrButton">Descargar primer PNG</button>
      </div>
    </div>
  `;

  document.getElementById(`${options.selectPrefix || "qrBatch"}DownloadButton`)?.addEventListener("click", () => {
    const prefix = options.selectPrefix || "qrBatch";
    const format = document.getElementById(`${prefix}FormatSelect`)?.value || "csv";
    const template = document.getElementById(`${prefix}TemplateSelect`)?.value || "sticker";
    const paper = document.getElementById(`${prefix}PaperSelect`)?.value || "a4";
    downloadBatchByFormat(batch.id, format, template, paper);
  });

  document.getElementById(`${options.selectPrefix || "qrBatch"}FirstQrButton`)?.addEventListener("click", () => {
    if (options.firstQrId) {
      downloadStrategicQr(options.firstQrId);
    }
  });
}

function renderCustomerAcquisitionAffiliateOptions() {
  if (!customerAcquisitionAffiliateInput) return;
  const affiliates = (state.affiliates || []).filter((affiliate) => affiliate.status !== "INACTIVE");
  customerAcquisitionAffiliateInput.innerHTML = [
    '<option value="">Sin afiliado referido</option>',
    ...affiliates.map((affiliate) => `
      <option value="${escapeHtml(affiliate.id)}">${escapeHtml(affiliate.full_name || "Afiliado")} (${escapeHtml(affiliate.document_id || affiliate.phone || "sin documento")})</option>
    `),
  ].join("");
}

function renderStrategicQrView() {
  renderCampaignAssociationInputs();
  const metrics = state.strategicQrMetrics?.totals || {};
  const credits = state.qrCreditAccount || null;
  const creditBalance = credits ? String(Number(credits.qr_balance || 0).toLocaleString("es-CO")) : "-";
  const creditUsed = credits ? String(Number(credits.qr_used_total || 0).toLocaleString("es-CO")) : "-";
  const creditPurchased = credits ? Number(credits.qr_purchased_total || 0).toLocaleString("es-CO") : "sin cartera configurada";
  const creditTone = credits?.exhausted ? "danger" : credits?.low_balance ? "warning" : "highlight";
  strategicQrKpiGrid.innerHTML = [
    strategicMetricCard("Tickets", creditBalance, creditTone),
    strategicMetricCard("Tickets usados", creditUsed, "default"),
    strategicMetricCard("Uso cartera", credits ? `${Number(credits.used_rate || 0).toFixed(1)}%` : "-", credits?.low_balance ? "warning" : "default"),
    strategicMetricCard("ticket postventa", String(metrics.post_sale_generated || 0)),
    strategicMetricCard("Redimidos postventa", String(metrics.post_sale_redeemed || 0)),
    strategicMetricCard("Tasa recompra", `${Number((metrics.repurchase_rate || 0) * 100).toFixed(1)}%`),
    strategicMetricCard("Tickets activacion", String(metrics.trivia_generated || 0), "highlight"),
    strategicMetricCard("Paquetes", String(metrics.qr_batches_generated || 0)),
    strategicMetricCard("ticket etiqueta reclamados", String(metrics.label_qr_claimed_or_active || 0)),
    strategicMetricCard("Vencidos", String(metrics.expired_without_redeem || 0), "warning"),
  ].join("");
  if (credits) {
    strategicQrKpiGrid.insertAdjacentHTML(
      "beforeend",
      `<article class="kpi-card" title="Tickets comprados y consumidos">
        <span class="mono-label">Cartera de tickets</span>
        <strong>${escapeHtml(creditBalance)}</strong>
        <p class="kpi-meta">${escapeHtml(creditUsed)} usados de ${escapeHtml(creditPurchased)} comprados</p>
      </article>`
    );
  }
  renderQrCreditShop();
  renderSubscriptionPricing();
  updateTriviaQuestionVisibility();
  renderTriviaLaunchers();
  renderCustomerAcquisitionAffiliateOptions();

  qrBatchTable.innerHTML = (state.strategicQrBatches || []).length
    ? state.strategicQrBatches.map((item) => `
      <tr class="${item.id === state.strategicQrRecentBatchId ? "recent-row" : ""}">
        <td>
          ${escapeHtml(item.name)}
          <br><span class="table-secondary">Creado ${escapeHtml(formatDate(item.created_at))} | ${escapeHtml(item.channel_use || "sin canal")}</span>
        </td>
        <td>
          ${escapeHtml(item.qr_origin_type)}
          <br><span class="table-secondary">${escapeHtml(item.benefit_value?.label || item.benefit_type || "Beneficio")}</span>
        </td>
        <td>
          ${escapeHtml(item.quantity)}
          <br><span class="table-secondary">${escapeHtml(item.generated_count || item.quantity || 0)} registrados</span>
        </td>
        <td>
          <span class="status-chip ${strategicBatchStatusClass(item.status)}">${escapeHtml(item.status)}</span>
          <br><span class="table-secondary">${escapeHtml(item.unclaimed_count || 0)} por reclamar | ${escapeHtml(item.active_count || 0)} activos</span>
        </td>
        <td>
          <select data-batch-format="${escapeHtml(item.id)}">
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="html">HTML imprimible</option>
            <option value="zip">ZIP con PNG</option>
            <option value="pdf">PDF etiquetas</option>
          </select>
          <select data-batch-template="${escapeHtml(item.id)}">
            <option value="sticker">Sticker</option>
            <option value="shelf">Shelf</option>
            <option value="card">Card</option>
          </select>
          <select data-batch-paper="${escapeHtml(item.id)}">
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
          <button class="ghost-button" type="button" data-download-batch="${escapeHtml(item.id)}">Descargar</button>
          <button class="ghost-button" type="button" data-open-batch="${escapeHtml(item.id)}">Detalle</button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">No hay paquetes creados.</td></tr>';

  strategicQrHistoryTable.innerHTML = (state.strategicQrHistory || []).length
    ? state.strategicQrHistory.map((item) => `
      <tr>
        <td>${escapeHtml(item.origin_type)}</td>
        <td>${escapeHtml(item.benefit_value?.label || item.benefit_type || "-")}</td>
        <td>${escapeHtml(item.status)}</td>
        <td>${escapeHtml(item.player_name || "-")}</td>
        <td>
          ${escapeHtml(formatDate(item.created_at))}
          <button class="ghost-button" type="button" data-download-strategic-qr="${escapeHtml(item.id)}">PNG</button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">No hay tickets estrategicos generados.</td></tr>';

  strategicQrHistoryTable.querySelectorAll("[data-download-strategic-qr]").forEach((button) => {
    button.addEventListener("click", () => downloadStrategicQr(button.dataset.downloadStrategicQr));
  });
  qrBatchTable.querySelectorAll("[data-download-batch]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.downloadBatch;
      const format = qrBatchTable.querySelector(`[data-batch-format="${id}"]`)?.value || "csv";
      const template = qrBatchTable.querySelector(`[data-batch-template="${id}"]`)?.value || "sticker";
      const paper = qrBatchTable.querySelector(`[data-batch-paper="${id}"]`)?.value || "a4";
      downloadBatchByFormat(id, format, template, paper);
    });
  });
  qrBatchTable.querySelectorAll("[data-open-batch]").forEach((button) => {
    button.addEventListener("click", () => inspectQrBatch(button.dataset.openBatch));
  });
  renderTicketCenterModules();
}

function renderQrCreditShop() {
  const offers = (state.qrPackageOffers || []).filter((offer) => offer.subscriber_allowed || offer.base_access_allowed);
  qrCreditPackageSelect.innerHTML = offers.length
    ? offers.map((offer) => `
      <option value="${escapeHtml(offer.code)}">
        ${escapeHtml(offer.title)} · ${Number(offer.package_size || 0).toLocaleString("es-CO")} tickets · ${packagePriceLabel(offer)} · capacidad premium
      </option>
    `).join("")
    : '<option value="">No hay paquetes disponibles</option>';
  qrCreditCheckoutButton.disabled = !offers.length;

  const latest = (state.qrCreditOrders || [])[0];
  qrCreditCheckoutStatus.textContent = latest ? paymentStatusLabel(latest.status) : "Sin compras recientes";
  qrCreditCheckoutStatus.className = `status-chip ${latest?.status === "APPROVED" ? "ok" : latest?.status === "PENDING" ? "pending" : latest ? "danger" : "pending"}`;
  if (qrCreditCheckoutMessage) {
    const account = state.qrCreditAccount || {};
    const balance = Number(account.qr_balance || 0).toLocaleString("es-CO");
    const rechargeCopy = "Puedes recargar desde T50. T200 o superior activa Portal Base para cuentas nuevas.";
    setInlineMessage(qrCreditCheckoutMessage, `Saldo actual: ${balance} tickets. ${rechargeCopy}`, "info");
  }

  qrCreditOrdersTable.innerHTML = (state.qrCreditOrders || []).length
    ? state.qrCreditOrders.map((order) => `
      <tr>
        <td>${escapeHtml(formatDate(order.created_at))}</td>
        <td>${escapeHtml(order.package_title)}<br><small>${Number(order.package_size || 0).toLocaleString("es-CO")} tickets</small></td>
        <td>${escapeHtml(packagePriceLabel((state.qrPackageOffers || []).find((offer) => offer.code === order.package_code)))}</td>
        <td><span class="status-chip ${order.status === "APPROVED" ? "ok" : order.status === "PENDING" ? "pending" : "danger"}">${escapeHtml(paymentStatusLabel(order.status))}</span></td>
      </tr>
    `).join("")
    : '<tr><td colspan="4">Aun no hay compras de recarga.</td></tr>';
}

function paymentStatusLabel(status) {
  return {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
    CANCELLED: "Cancelado",
    EXPIRED: "Expirado",
    ERROR: "Error",
  }[status] || "Pendiente";
}

async function submitQrCreditCheckout(event) {
  event.preventDefault();
  const packageCode = qrCreditPackageSelect.value;
  if (!packageCode) {
    setInlineMessage(qrCreditCheckoutMessage, "Selecciona un paquete para continuar.", "error");
    return;
  }

  setButtonLoading(qrCreditCheckoutButton, true, "Abriendo checkout...");
  setInlineMessage(qrCreditCheckoutMessage, "Creando checkout seguro en Mercado Pago...", "info");
  showFeedback("Creando preferencia de pago. En segundos se abrira Mercado Pago.", "loading", { title: "Preparando pago", timeout: 0 });
  try {
    const data = await api("/api/payments/qr-credits/checkout", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ package_code: packageCode }),
    });
    const checkoutUrl = data.order?.checkout_url || data.order?.sandbox_checkout_url;
    if (!checkoutUrl) {
      throw new Error("Mercado Pago no devolvio un link de checkout.");
    }
    setInlineMessage(qrCreditCheckoutMessage, "Checkout creado. Redirigiendo a Mercado Pago...", "success");
    showFeedback("Checkout creado. Al aprobarse el pago, el saldo de tickets se recargara automaticamente.", "success", { title: "Pago listo" });
    window.location.href = checkoutUrl;
  } catch (error) {
    setInlineMessage(qrCreditCheckoutMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo abrir el checkout" });
    setButtonLoading(qrCreditCheckoutButton, false);
  }
}

function openQrCreditShopFromAccount() {
  setView("strategic-qr");
  setTicketCenterTab("center");
  window.setTimeout(() => {
    document.querySelector(".qr-credit-shop-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

async function submitSubscriptionRenewal(event) {
  event.preventDefault();
  const planCode = subscriptionRenewalPlanSelect?.value;
  if (!planCode) {
    setInlineMessage(subscriptionRenewalMessage, "Selecciona un plan mensual para renovar.", "error");
    return;
  }

  setButtonLoading(subscriptionRenewalButton, true, "Abriendo pago...");
  setInlineMessage(subscriptionRenewalMessage, "Creando checkout seguro de mensualidad...", "info");
  showFeedback("Preparando pago de renovacion mensual en Mercado Pago.", "loading", { title: "Renovando plan", timeout: 0 });
  try {
    const data = await api("/api/payments/subscriptions/checkout", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ plan_code: planCode }),
    });
    const checkoutUrl = data.order?.checkout_url || data.order?.sandbox_checkout_url;
    if (!checkoutUrl) {
      throw new Error("Mercado Pago no devolvio un link de checkout.");
    }
    setInlineMessage(subscriptionRenewalMessage, "Checkout creado. Redirigiendo a Mercado Pago...", "success");
    showFeedback("Al aprobarse el pago, la mensualidad se renovara automaticamente.", "success", { title: "Pago listo" });
    window.location.href = checkoutUrl;
  } catch (error) {
    setInlineMessage(subscriptionRenewalMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo renovar" });
    setButtonLoading(subscriptionRenewalButton, false);
  }
}

async function submitSubscriptionAutoRenewal() {
  const planCode = subscriptionRenewalPlanSelect?.value;
  if (!planCode) {
    setInlineMessage(subscriptionRenewalMessage, "Selecciona un plan mensual para activar cobro automatico.", "error");
    return;
  }

  setButtonLoading(subscriptionAutoRenewButton, true, "Abriendo autorizacion...");
  setInlineMessage(subscriptionRenewalMessage, "Te llevaremos a Mercado Pago para inscribir la tarjeta. Puede aparecer una validacion temporal; el plan se cobra desde la fecha programada.", "info");
  showFeedback("Preparando inscripcion de tarjeta para cobros futuros. El plan no se cobra hoy.", "loading", { title: "Cobro automatico", timeout: 0 });
  try {
    const data = await api("/api/payments/subscriptions/auto-renewal", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ plan_code: planCode }),
    });
    const checkoutUrl = data.auto_renewal?.checkout_url
      || data.auto_renewal?.sandbox_checkout_url
      || data.order?.checkout_url
      || data.order?.sandbox_checkout_url;
    if (!checkoutUrl) {
      throw new Error("Mercado Pago no devolvio un link para autorizar el cobro automatico.");
    }
    const firstCharge = data.auto_renewal?.first_charge_at ? formatDateOnly(data.auto_renewal.first_charge_at) : "la proxima renovacion";
    setInlineMessage(subscriptionRenewalMessage, `Autorizacion creada. Mercado Pago puede validar la tarjeta temporalmente. Primer cobro real programado para ${firstCharge}.`, "success");
    showFeedback(`Inscribe la tarjeta en Mercado Pago. Primer cobro real: ${firstCharge}.`, "success", { title: "Autorizacion lista" });
    window.location.href = checkoutUrl;
  } catch (error) {
    setInlineMessage(subscriptionRenewalMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo activar cobro automatico" });
    setButtonLoading(subscriptionAutoRenewButton, false);
  }
}

async function submitCustomerAcquisitionSale(event) {
  event.preventDefault();
  const submitButton = customerAcquisitionForm.querySelector("button[type='submit']");
  setButtonLoading(submitButton, true, "Registrando...");
  setInlineMessage(customerAcquisitionMessage, "Registrando venta real y medio de llegada...", "info");
  try {
    const data = await api("/api/business/customer-acquisition-sales", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        sale_amount: Number(customerAcquisitionAmountInput.value || 0),
        currency: customerAcquisitionCurrencyInput.value.trim() || "COP",
        product_name: customerAcquisitionProductInput.value.trim() || null,
        customer_name: customerAcquisitionNameInput.value.trim() || null,
        customer_document_id: customerAcquisitionDocumentInput.value.trim() || null,
        customer_phone: customerAcquisitionPhoneInput.value.trim() || null,
        customer_email: customerAcquisitionEmailInput.value.trim() || null,
        acquisition_source: customerAcquisitionSourceInput.value,
        acquisition_channel: customerAcquisitionChannelInput.value.trim() || null,
        referred_affiliate_id: customerAcquisitionAffiliateInput.value || null,
        notes: customerAcquisitionNotesInput.value.trim() || null,
      }),
    });
    const awarded = Number(data.referral?.points_awarded || 0);
    const message = awarded
      ? `Venta registrada. ${data.referral.affiliate_name} recibio ${awarded} puntos por recomendacion.`
      : "Venta registrada con su medio de llegada.";
    setInlineMessage(customerAcquisitionMessage, message, "success");
    customerAcquisitionForm.reset();
    customerAcquisitionCurrencyInput.value = "COP";
    await refreshLiveBusinessData();
    setView("sales");
    showFeedback(message, "success", { title: "Venta registrada" });
  } catch (error) {
    setInlineMessage(customerAcquisitionMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo registrar" });
  } finally {
    setButtonLoading(submitButton, false);
  }
}

function updateTriviaQuestionVisibility() {
  const count = Math.max(1, Math.min(5, Number(triviaQuestionCountInput?.value || 1)));
  if (triviaQuestionCountInput) triviaQuestionCountInput.value = String(count);
  let completed = 0;
  triviaQuestionBuilder?.querySelectorAll("[data-trivia-question]").forEach((card) => {
    const index = Number(card.dataset.triviaQuestion || 0);
    const active = index <= count;
    const question = card.querySelector('[data-trivia-field="question"]')?.value.trim() || "";
    const options = ["A", "B", "C", "D"].map((key) => card.querySelector(`[data-trivia-option="${key}"]`)?.value.trim() || "");
    const ready = active && question.length >= 4 && options.every(Boolean);
    const status = card.querySelector("[data-trivia-card-status]");
    card.classList.toggle("hidden", !active);
    card.classList.toggle("is-complete", ready);
    if (status) status.textContent = ready ? "Lista" : "Incompleta";
    if (ready) completed += 1;
    card.querySelectorAll("input, select").forEach((field) => {
      field.required = active;
    });
  });
  if (triviaBuilderHint) {
    triviaBuilderHint.textContent = `${completed} de ${count} preguntas listas. El ganador debe acertar todas.`;
  }
}

function activationTypeLabel(type) {
  return {
    TRIVIA: "Trivia",
    TRIVIA_QUIZ: "Trivia",
    OPEN_QUESTION: "Pregunta abierta",
    SURVEY: "Encuesta",
    FLEX_SURVEY: "Encuesta",
    SPIN_DISCOVER: "Gira y descubre",
    THERMOMETER: "Termometro",
    DISCOUNT_THERMOMETER: "Termometro",
    PRODUCT_VOTE: "Votacion de producto",
    QUICK_VOTE: "Votacion de producto",
    STYLE_SELECTOR: "Selector de estilo",
    GIFT_CURATOR: "Curador de regalo",
    NEED_DIAGNOSTIC: "Diagnostico de necesidad",
    PREMIUM_NEED_DIAGNOSTIC: "Diagnostico de necesidad",
    WAITLIST: "Lista de espera",
    REWARD_RESERVATION: "Reserva con Reward Pass",
    EXPERIENCE_RESERVATION: "Reserva de experiencia",
    SEALED_LETTER: "Carta sellada",
    PRIVATE_INVITATION: "Invitacion privada",
    SCRATCH_DIGITAL: "Raspa digital",
    SCRATCH_WIN: "Raspa digital",
    TAP_REVEAL: "Toca y revela",
    SPACE_SHOOTER: "Marcianitos",
    BREAKOUT: "Breakout",
    SNAKE: "Culebrita",
    CATCH_PRIZE: "Atrapa el premio",
    MEMORY_PAIRS: "Memoria de pares",
    FAST_TAP: "Tap rapido",
    MINI_MAZE: "Mini laberinto",
  }[type] || "Activacion";
}

function interactiveTypeForLegacyType(type) {
  return {
    TRIVIA: "TRIVIA_QUIZ",
    OPEN_QUESTION: "OPEN_QUESTION",
    SURVEY: "FLEX_SURVEY",
    SPIN_DISCOVER: "SPIN_DISCOVER",
    THERMOMETER: "DISCOUNT_THERMOMETER",
    PRODUCT_VOTE: "QUICK_VOTE",
    STYLE_SELECTOR: "STYLE_PROFILE",
    GIFT_CURATOR: "GIFT_CURATOR",
    NEED_DIAGNOSTIC: "PREMIUM_NEED_DIAGNOSTIC",
    WAITLIST: "WAITLIST",
    REWARD_RESERVATION: "EXPERIENCE_RESERVATION",
    SEALED_LETTER: "SEALED_LETTER",
    PRIVATE_INVITATION: "PRIVATE_INVITATION",
    SCRATCH_DIGITAL: "SCRATCH_WIN",
    TAP_REVEAL: "TAP_REVEAL",
  }[type] || type;
}

function interactiveCategoryForType(type) {
  return {
    TRIVIA: "commercial",
    OPEN_QUESTION: "commercial",
    SURVEY: "survey",
    SPIN_DISCOVER: "touch",
    THERMOMETER: "touch",
    PRODUCT_VOTE: "commercial",
    STYLE_SELECTOR: "premium",
    GIFT_CURATOR: "premium",
    NEED_DIAGNOSTIC: "premium",
    WAITLIST: "intent",
    REWARD_RESERVATION: "premium",
    SEALED_LETTER: "premium",
    PRIVATE_INVITATION: "premium",
    SCRATCH_DIGITAL: "touch",
    TAP_REVEAL: "touch",
    SPACE_SHOOTER: "minigame",
    BREAKOUT: "minigame",
    SNAKE: "minigame",
    CATCH_PRIZE: "minigame",
    MEMORY_PAIRS: "minigame",
    FAST_TAP: "minigame",
    MINI_MAZE: "minigame",
  }[type] || "commercial";
}

function currentActivationType() {
  return activationTypeInput?.value || "TRIVIA";
}

function setActivationType(type) {
  const nextType = type || "TRIVIA";
  if (activationTypeInput) activationTypeInput.value = nextType;
  activationTypePicker?.querySelectorAll("[data-activation-type]").forEach((button) => {
    const active = button.dataset.activationType === nextType;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  document.querySelectorAll("[data-activation-config]").forEach((panel) => {
    const configs = String(panel.dataset.activationConfig || "").split(/\s+/).filter(Boolean);
    const active = configs.includes(nextType);
    panel.classList.toggle("hidden", !active);
    panel.classList.toggle("active", active);
  });
  if (nextType === "TRIVIA") {
    if (triviaQuestionCountInput) {
      triviaQuestionCountInput.disabled = false;
      triviaQuestionCountInput.required = true;
    }
    updateTriviaQuestionVisibility();
  } else {
    if (triviaQuestionCountInput) {
      triviaQuestionCountInput.required = false;
      triviaQuestionCountInput.disabled = true;
    }
    triviaQuestionBuilder?.querySelectorAll("input, select").forEach((field) => {
      field.required = false;
    });
  }
  updateActivationQuestionCountControls();
  if (triviaBuilderHint) {
    triviaBuilderHint.textContent = nextType === "TRIVIA"
      ? triviaBuilderHint.textContent
      : `${activationTypeLabel(nextType)} activa. El participante recibe QR al completar la dinamica.`;
  }
  if (triviaLauncherMessage && nextType !== "TRIVIA") {
    setInlineMessage(triviaLauncherMessage, `${activationTypeLabel(nextType)} seleccionado. Configura los campos y lanza la landing cuando este lista.`, "info");
  } else if (triviaLauncherMessage) {
    setInlineMessage(triviaLauncherMessage, "Trivia seleccionada. Completa las preguntas y define el beneficio antes de lanzar.", "info");
  }
}

function collectTriviaQuestions() {
  const count = Math.max(1, Math.min(5, Number(triviaQuestionCountInput?.value || 1)));
  return Array.from(triviaQuestionBuilder?.querySelectorAll("[data-trivia-question]") || [])
    .filter((card) => Number(card.dataset.triviaQuestion || 0) <= count)
    .map((card) => ({
      question: card.querySelector('[data-trivia-field="question"]')?.value.trim() || "",
      options: {
        A: card.querySelector('[data-trivia-option="A"]')?.value.trim() || "",
        B: card.querySelector('[data-trivia-option="B"]')?.value.trim() || "",
        C: card.querySelector('[data-trivia-option="C"]')?.value.trim() || "",
        D: card.querySelector('[data-trivia-option="D"]')?.value.trim() || "",
      },
      correct_answer: card.querySelector('[data-trivia-field="correct"]')?.value || "A",
    }));
}

function splitOptionList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function collectSurveyQuestions() {
  const count = getActivationQuestionCount("SURVEY", 1);
  return Array.from(document.querySelectorAll("[data-survey-question]"))
    .filter((card) => Number(card.dataset.surveyQuestion || 0) <= count)
    .map((card, index) => {
      const question = card.querySelector('[data-survey-field="question"]')?.value.trim() || "";
      const type = card.querySelector('[data-survey-field="type"]')?.value || "SINGLE_CHOICE";
      const options = splitOptionList(card.querySelector('[data-survey-field="options"]')?.value);
      return {
        id: `s${index + 1}`,
        question,
        type,
        options,
        required: true,
      };
    })
    .filter((item) => item.question);
}

function updateSurveyQuestionEditors() {
  const count = getActivationQuestionCount("SURVEY", 1);
  document.querySelectorAll("[data-survey-question]").forEach((card) => {
    const index = Number(card.dataset.surveyQuestion || 0);
    const active = index <= count;
    const type = card.querySelector('[data-survey-field="type"]')?.value || "SINGLE_CHOICE";
    const optionsField = card.querySelector(".survey-options-field");
    card.classList.toggle("hidden", !active);
    card.querySelectorAll("input, select, textarea").forEach((field) => {
      field.disabled = !active;
    });
    optionsField?.classList.toggle("hidden", !["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(type));
  });
}

function getActivationQuestionCount(type, fallback = 1) {
  const input = document.querySelector(`[data-question-count-for="${type}"]`);
  if (!input) return fallback;
  const min = Number(input.min || 1);
  const max = Number(input.max || 5);
  const value = Math.max(min, Math.min(max, Number(input.value || fallback)));
  input.value = String(value);
  return value;
}

function updateActivationQuestionCountControls() {
  const openQuestionCount = getActivationQuestionCount("OPEN_QUESTION", 1);
  document.querySelectorAll("[data-open-question]").forEach((input) => {
    const active = Number(input.dataset.openQuestion || 0) <= openQuestionCount;
    const row = input.closest("label") || input;
    row.classList.toggle("hidden", !active);
    input.disabled = !active;
  });
  updateSurveyQuestionEditors();
  document.querySelectorAll("[data-flat-form]").forEach((panel) => {
    const type = panel.dataset.flatForm;
    const questions = Array.from(panel.querySelectorAll("[data-flat-question]"));
    const count = getActivationQuestionCount(type, questions.length || 1);
    questions.forEach((input, index) => {
      const active = index < count;
      const row = input.closest("label") || input;
      row.classList.toggle("hidden", !active);
      input.disabled = !active;
    });
  });
}

function collectOpenQuestions() {
  const count = getActivationQuestionCount("OPEN_QUESTION", 1);
  return Array.from(document.querySelectorAll("[data-open-question]"))
    .filter((input) => Number(input.dataset.openQuestion || 0) <= count && !input.disabled)
    .map((input, index) => ({
      id: `open_question_${index + 1}`,
      question_text: input.value.trim(),
      question_type: "OPEN",
      options: [],
      required: true,
      scoring_rules: null,
    }))
    .filter((question) => question.question_text);
}

function collectRevealCards() {
  return Array.from(document.querySelectorAll("[data-reveal-card]"))
    .map((input) => ({
      label: input.dataset.revealCard || "Card",
      benefit_label: input.value.trim(),
      benefit_type: triviaBenefitTypeInput?.value || "CUSTOM",
      benefit_value: parseJsonObject(triviaBenefitValueInput?.value || "{}"),
    }))
    .filter((item) => item.benefit_label);
}

function collectThermometerDiscounts() {
  return splitOptionList(thermometerDiscountsInput?.value)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 100);
}

function collectFlatChoiceOptions(type) {
  return Array.from(document.querySelectorAll(`[data-flat-choice="${type}"] [data-flat-option]`))
    .map((input) => {
      const key = input.dataset.flatOption || input.value.trim();
      const imageDataUrl = type === "PRODUCT_VOTE"
        ? (input.dataset.imageDataUrl || productVoteImages[key] || "")
        : "";
      return {
        value: key,
        label: input.value.trim(),
        image_data_url: imageDataUrl || null,
        reward_type: triviaBenefitTypeInput.value,
        reward_label: triviaBenefitLabelInput.value.trim(),
        reward_value: parseJsonObject(triviaBenefitValueInput.value),
      };
    })
    .filter((item) => item.label);
}

function syncProductVoteImagePreview(key, dataUrl = "") {
  const preview = document.querySelector(`[data-product-vote-preview="${key}"]`);
  if (!preview) return;
  preview.src = dataUrl || "";
  preview.classList.toggle("hidden", !dataUrl);
}

async function handleProductVoteImageFile(key, file) {
  if (!key || !file) return;
  try {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type || "")) {
      throw new Error("Usa una imagen PNG, JPG o WebP.");
    }
    const dataUrl = await normalizeAffiliatePhotoDataUrl(file, {
      maxWidth: 720,
      maxHeight: 540,
      quality: 0.78,
      mimeType: "image/webp",
    });
    if (!dataUrl) throw new Error("No se pudo procesar la imagen.");
    productVoteImages[key] = dataUrl;
    const optionInput = document.querySelector(`[data-flat-choice="PRODUCT_VOTE"] [data-flat-option="${key}"]`);
    if (optionInput) optionInput.dataset.imageDataUrl = dataUrl;
    syncProductVoteImagePreview(key, dataUrl);
    showFeedback("Imagen de opcion cargada.", "success", { title: "Votacion de producto" });
  } catch (error) {
    showFeedback(error.message || "No se pudo cargar la imagen.", "error");
  } finally {
    const fileInput = document.querySelector(`[data-flat-option-image="${key}"]`);
    if (fileInput) fileInput.value = "";
  }
}

function collectFlatFormQuestions(type) {
  const count = getActivationQuestionCount(type, 5);
  return Array.from(document.querySelectorAll(`[data-flat-form="${type}"] [data-flat-question]`))
    .filter((input, index) => index < count && !input.disabled)
    .map((input, index) => ({
      id: input.dataset.flatQuestion || `q${index + 1}`,
      question_text: input.value.trim(),
      question_type: input.dataset.flatQuestionType || "OPEN",
      options: defaultOptionsForFlatQuestion(input.dataset.flatQuestion || "", input.dataset.flatQuestionType || "OPEN"),
      required: true,
      order_index: index,
    }))
    .filter((question) => question.question_text);
}

function defaultOptionsForFlatQuestion(key, type) {
  if (!["SINGLE_CHOICE", "PRODUCT_CATEGORY"].includes(type)) return [];
  const presets = {
    recipient: ["Pareja", "Familiar", "Amigo", "Cliente"],
    occasion: ["Cumpleanos", "Aniversario", "Agradecimiento", "Sorpresa"],
    budget: ["Bajo", "Medio", "Premium"],
    style: ["Clasico", "Moderno", "Artesanal", "Lujo"],
    urgency: ["Hoy", "Esta semana", "Este mes"],
    purchase_window: ["Lanzamiento", "Esta semana", "Este mes"],
  };
  return presets[key] || ["Opcion A", "Opcion B", "Opcion C"];
}

function isFlatChoiceActivation(type) {
  return ["PRODUCT_VOTE", "STYLE_SELECTOR", "SCRATCH_DIGITAL", "TAP_REVEAL"].includes(type);
}

function isFlatFormActivation(type) {
  return ["GIFT_CURATOR", "NEED_DIAGNOSTIC", "WAITLIST", "REWARD_RESERVATION"].includes(type);
}

function isFixedPremiumActivation(type) {
  return ["SEALED_LETTER", "PRIVATE_INVITATION"].includes(type);
}

function isMinigameActivation(type) {
  return ["SPACE_SHOOTER", "BREAKOUT", "SNAKE", "CATCH_PRIZE", "MEMORY_PAIRS", "FAST_TAP", "MINI_MAZE"].includes(type);
}

function minigameInstructionForType(type) {
  return {
    SPACE_SHOOTER: "Arrastra el dedo a izquierda o derecha. La nave no salta al touch, se mueve lateralmente, recibe dano y dispara con cadencia controlada.",
    BREAKOUT: "Rompe tantos bloques como puedas antes de que termine el tiempo.",
    SNAKE: "Captura elementos, evita errores y supera el score minimo.",
    CATCH_PRIZE: "Mueve la canasta, arma combos, atrapa bonus especiales y evita bombas. Hay iman, escudo, tiempo extra y dificultad progresiva.",
    MEMORY_PAIRS: "Encuentra pares y gana puntos por rapidez.",
    FAST_TAP: "Toca los objetivos correctos tan rapido como puedas.",
    MINI_MAZE: "Avanza hacia la meta sin tocar zonas de penalizacion.",
  }[type] || "Completa la partida y supera el score minimo para recibir QR.";
}

function activationParticipantLockFromForm() {
  const cooldownDays = Math.max(0, Math.min(365, Number(minigameParticipantCooldownInput?.value || 7)));
  const winnerPolicy = minigameWinnerPolicyInput?.value || "block_previous_winners";
  return {
    scope: "activation",
    cooldown_days: cooldownDays,
    winner_policy: winnerPolicy,
    label: `${cooldownDays} dias de espera entre intentos`,
  };
}

function validateActivationParticipantLock() {
  const cooldownDays = Number(minigameParticipantCooldownInput?.value || 0);
  const winnerPolicy = minigameWinnerPolicyInput?.value || "block_previous_winners";
  if (!Number.isFinite(cooldownDays) || cooldownDays < 0 || cooldownDays > 365) {
    setInlineMessage(triviaLauncherMessage, "Configura los dias de espera entre 0 y 365.", "error");
    minigameParticipantCooldownInput?.focus();
    return false;
  }
  if (!["block_previous_winners", "allow_after_cooldown"].includes(winnerPolicy)) {
    setInlineMessage(triviaLauncherMessage, "Selecciona que pasa si el beneficiario ya gano.", "error");
    minigameWinnerPolicyInput?.focus();
    return false;
  }
  return true;
}

function buildInteractiveActivationPayload(type, activationPayload) {
  const benefit = {
    reward_type: triviaBenefitTypeInput.value,
    reward_label: triviaBenefitLabelInput.value.trim(),
    reward_value: parseJsonObject(triviaBenefitValueInput.value),
  };
  const base = {
    campaign_id: triviaCampaignInput.value || null,
    title: triviaTitleInput.value.trim(),
    description: triviaDescriptionInput.value.trim() || null,
    max_rewards: triviaMaxWinnersInput.value ? Number(triviaMaxWinnersInput.value) : null,
    ends_at: triviaExpiresAtInput.value ? new Date(triviaExpiresAtInput.value).toISOString() : null,
    activation_type: interactiveTypeForLegacyType(type),
    category: interactiveCategoryForType(type),
    reward_ticket_cost: 1,
    reward_config: benefit,
    capture_config: {
      required_fields: ["name", "phone", "email", "document"],
      optional_fields: [],
      participant_lock: activationParticipantLockFromForm(),
    },
    visual_config: {
      source: "ticket_center_activation_builder",
    },
    benefit: {
      benefit_type: triviaBenefitTypeInput.value,
      benefit_label: triviaBenefitLabelInput.value.trim(),
      benefit_value: parseJsonObject(triviaBenefitValueInput.value),
    },
  };

  if (type === "TRIVIA") {
    const questions = (activationPayload.questions || []).map((question, index) => ({
      id: `q${index + 1}`,
      question_text: question.question,
      question_type: "SINGLE_CHOICE",
      options: Object.entries(question.options || {}).map(([value, label]) => ({ value, label })),
      required: true,
      order_index: index,
      scoring_rules: {
        correct_answer: question.correct_answer,
        points: 1,
      },
    }));
    return {
      ...base,
      reward_mode: "by_score",
      questions,
      interaction_config: {},
      score_rewards: [{
        min_score: questions.length,
        max_score: null,
        reward_type: benefit.reward_type,
        reward_label: benefit.reward_label,
        reward_value: benefit.reward_value,
      }],
      game_config: {
        min_score_for_reward: questions.length,
      },
    };
  }

  if (type === "OPEN_QUESTION") {
    const openQuestions = collectOpenQuestions();
    return {
      ...base,
      reward_mode: "fixed",
      questions: openQuestions.length ? openQuestions : [{
        id: "open_question_1",
        question_text: activationPayload.open_question?.question || "Pregunta abierta",
        question_type: "OPEN",
        options: [],
        required: true,
        scoring_rules: null,
      }],
      interaction_config: {
        placeholder: activationPayload.open_question?.placeholder || null,
      },
    };
  }

  if (type === "SURVEY") {
    return {
      ...base,
      reward_mode: "fixed",
      questions: (activationPayload.survey_questions || []).map((question, index) => ({
        id: question.id || `s${index + 1}`,
        question_text: question.question,
        question_type: question.type === "SCALE" ? "SCALE_1_5" : question.type,
        options: question.options || [],
        required: question.required !== false,
        order_index: index,
      })),
    };
  }

  if (type === "SPIN_DISCOVER") {
    const choices = (activationPayload.reveal_cards || []).map((card) => ({
      value: card.label,
      label: card.label,
      reward_type: card.benefit_type || benefit.reward_type,
      reward_label: card.benefit_label,
      reward_value: card.benefit_value || benefit.reward_value,
    }));
    return {
      ...base,
      reward_mode: "by_choice",
      reward_config: {
        ...benefit,
        choices,
      },
      interaction_config: {
        mode: "cards",
      },
    };
  }

  if (type === "THERMOMETER") {
    const discounts = activationPayload.thermometer_discounts || [];
    const step = discounts.length > 1 ? 100 / (discounts.length - 1) : 100;
    return {
      ...base,
      reward_mode: "by_position",
      interaction_config: {
        mode: "moving_indicator",
        orientation: "horizontal",
      },
      touch_zones: discounts.map((discount, index) => ({
        label: `${discount}%`,
        position_percent: Number((index * step).toFixed(2)),
        reward_type: "discount_percentage",
        reward_label: `${discount}% de descuento`,
        reward_value: { percent: discount },
      })),
    };
  }

  if (isFlatChoiceActivation(type)) {
    const choices = collectFlatChoiceOptions(type);
    return {
      ...base,
      reward_mode: "by_choice",
      reward_config: {
        ...benefit,
        choices,
      },
      interaction_config: {
        mode: type === "SCRATCH_DIGITAL" ? "scratch" : "choice",
      },
    };
  }

  if (isFlatFormActivation(type)) {
    return {
      ...base,
      reward_mode: "fixed",
      questions: collectFlatFormQuestions(type),
      interaction_config: {
        template: type,
      },
    };
  }

  if (isFixedPremiumActivation(type)) {
    const message = type === "SEALED_LETTER"
      ? document.getElementById("sealedLetterMessageInput")?.value.trim()
      : document.getElementById("privateInvitationMessageInput")?.value.trim();
    return {
      ...base,
      reward_mode: "fixed",
      visual_config: {
        ...base.visual_config,
        premium_template: type,
        message: message || null,
      },
      interaction_config: {
        template: type,
      },
    };
  }

  if (isMinigameActivation(type)) {
    const durationSeconds = Math.max(10, Math.min(180, Number(minigameDurationInput?.value || 30)));
    const minScore = Math.max(1, Number(minigameMinScoreInput?.value || 100));
    const maxScore = Math.max(minScore, Number(minigameMaxScoreInput?.value || 2500));
    const pointsPerTarget = Math.max(1, Number(minigamePointsInput?.value || 50));
    const penalty = Math.max(0, Number(minigamePenaltyInput?.value || 10));
    const lives = Math.max(1, Math.min(10, Number(minigameLivesInput?.value || 3)));
    const fireIntervalMs = Math.max(250, Math.min(1200, Number(minigameFireIntervalInput?.value || 480)));
    return {
      ...base,
      category: "minigame",
      reward_mode: "by_score",
      capture_config: {
        ...base.capture_config,
        required_fields: ["name", "phone", "email", "document"],
        optional_fields: [],
      },
      score_rewards: [{
        min_score: minScore,
        max_score: null,
        reward_type: benefit.reward_type,
        reward_label: benefit.reward_label,
        reward_value: benefit.reward_value,
      }],
      game_config: {
        game_type: type,
        duration_seconds: durationSeconds,
        min_duration_ms: 3000,
        max_duration_ms: (durationSeconds + 10) * 1000,
        max_score: maxScore,
        points_per_target: pointsPerTarget,
        penalty,
        lives,
        fire_interval_ms: fireIntervalMs,
        instruction: minigameInstructionForType(type),
      },
      interaction_config: {
        minigame: type,
        commercial_goal: "redemption_in_store",
      },
      visual_config: {
        ...base.visual_config,
        minigame_skin: type,
      },
    };
  }

  return {
    ...base,
    reward_mode: "fixed",
  };
}

function updateTriviaExpiryMode() {
  if (!triviaExpiresModeInput || !triviaExpiresAtInput) return;
  const custom = triviaExpiresModeInput.value === "CUSTOM_DATE";
  triviaExpiresAtInput.disabled = !custom;
  triviaExpiresAtInput.required = custom;
  if (!custom) triviaExpiresAtInput.value = "";
}

function validateTriviaLauncherForm() {
  updateTriviaExpiryMode();
  const type = currentActivationType();
  if (!validateActivationParticipantLock()) return null;
  if (type === "TRIVIA") {
    updateTriviaQuestionVisibility();
  }
  if (type === "OPEN_QUESTION") {
    const openQuestions = collectOpenQuestions();
    const expectedOpenQuestions = getActivationQuestionCount("OPEN_QUESTION", 1);
    if (openQuestions.length < expectedOpenQuestions) {
      setInlineMessage(triviaLauncherMessage, `Completa las ${expectedOpenQuestions} preguntas abiertas activas.`, "error");
      openQuestionInput?.focus();
      return null;
    }
    return { open_questions: openQuestions, open_question: { question: openQuestions[0]?.question_text || "", placeholder: openQuestionPlaceholderInput?.value.trim() || null } };
  }
  if (type === "SURVEY") {
    const surveyQuestions = collectSurveyQuestions();
    const expectedSurveyQuestions = getActivationQuestionCount("SURVEY", 1);
    const invalidSurvey = surveyQuestions.find((question) => ["SINGLE_CHOICE", "MULTIPLE_CHOICE"].includes(question.type) && question.options.length < 2);
    if (surveyQuestions.length < expectedSurveyQuestions || invalidSurvey) {
      setInlineMessage(triviaLauncherMessage, `Completa las ${expectedSurveyQuestions} preguntas activas de la encuesta. Las preguntas de opcion necesitan minimo 2 opciones.`, "error");
      return null;
    }
    return { survey_questions: surveyQuestions };
  }
  if (type === "SPIN_DISCOVER") {
    const revealCards = collectRevealCards();
    if (revealCards.length < 2) {
      setInlineMessage(triviaLauncherMessage, "Configura al menos dos cards de beneficio para gira y descubre.", "error");
      return null;
    }
    return { reveal_cards: revealCards, spin_rewards: revealCards };
  }
  if (type === "THERMOMETER") {
    const thermometerDiscounts = collectThermometerDiscounts();
    if (thermometerDiscounts.length < 3) {
      setInlineMessage(triviaLauncherMessage, "Configura al menos tres descuentos validos para el termometro.", "error");
      thermometerDiscountsInput?.focus();
      return null;
    }
    return { thermometer_discounts: thermometerDiscounts };
  }
  if (isFlatChoiceActivation(type)) {
    const choices = collectFlatChoiceOptions(type);
    if (choices.length < 2) {
      setInlineMessage(triviaLauncherMessage, "Configura al menos dos opciones para esta activacion.", "error");
      return null;
    }
    return { choices };
  }
  if (isFlatFormActivation(type)) {
    const questions = collectFlatFormQuestions(type);
    const expectedQuestions = getActivationQuestionCount(type, 1);
    if (questions.length < expectedQuestions) {
      setInlineMessage(triviaLauncherMessage, `Completa las ${expectedQuestions} preguntas activas para esta activacion.`, "error");
      return null;
    }
    return { questions };
  }
  if (isFixedPremiumActivation(type)) {
    return { message: true };
  }
  if (isMinigameActivation(type)) {
    const durationSeconds = Number(minigameDurationInput?.value || 30);
    const minScore = Number(minigameMinScoreInput?.value || 100);
    const maxScore = Number(minigameMaxScoreInput?.value || 2500);
    const lives = Number(minigameLivesInput?.value || 3);
    const fireIntervalMs = Number(minigameFireIntervalInput?.value || 480);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 10 || durationSeconds > 180) {
      setInlineMessage(triviaLauncherMessage, "Configura una duracion de minijuego entre 10 y 180 segundos.", "error");
      minigameDurationInput?.focus();
      return null;
    }
    if (!Number.isFinite(minScore) || minScore < 1 || !Number.isFinite(maxScore) || maxScore < minScore) {
      setInlineMessage(triviaLauncherMessage, "Configura un score minimo valido y un maximo antiabuso mayor o igual.", "error");
      minigameMinScoreInput?.focus();
      return null;
    }
    if (!Number.isFinite(lives) || lives < 1 || lives > 10) {
      setInlineMessage(triviaLauncherMessage, "Configura vidas de nave entre 1 y 10.", "error");
      minigameLivesInput?.focus();
      return null;
    }
    if (!Number.isFinite(fireIntervalMs) || fireIntervalMs < 250 || fireIntervalMs > 1200) {
      setInlineMessage(triviaLauncherMessage, "Configura la cadencia de disparo entre 250 y 1200 ms.", "error");
      minigameFireIntervalInput?.focus();
      return null;
    }
    return { minigame: true };
  }
  const questions = collectTriviaQuestions();
  const invalidQuestionIndex = questions.findIndex((question) => (
    question.question.length < 4 || ["A", "B", "C", "D"].some((key) => !question.options[key])
  ));
  if (invalidQuestionIndex >= 0) {
    const card = Array.from(triviaQuestionBuilder?.querySelectorAll("[data-trivia-question]") || [])
      .find((item) => Number(item.dataset.triviaQuestion || 0) === invalidQuestionIndex + 1);
    setInlineMessage(triviaLauncherMessage, `Completa la pregunta ${invalidQuestionIndex + 1} y sus cuatro opciones.`, "error");
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    card?.querySelector("input")?.focus();
    return null;
  }
  if (triviaExpiresModeInput?.value === "CUSTOM_DATE" && !triviaExpiresAtInput?.value) {
    setInlineMessage(triviaLauncherMessage, "Selecciona la fecha personalizada de expiracion.", "error");
    triviaExpiresAtInput?.focus();
    return null;
  }
  return { questions };
}

function renderTriviaLaunchers() {
  if (!triviaLauncherTable) return;
  triviaLauncherTable.innerHTML = (state.triviaLaunchers || []).length
    ? state.triviaLaunchers.map((item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.title)}</strong><br>
          <span class="table-secondary">${escapeHtml(activationTypeLabel(item.activation_type))} · ${escapeHtml(item.campaign_name || "Sin campana")} · Creada ${escapeHtml(formatDate(item.created_at))}</span>
          <span class="table-secondary">${escapeHtml(activationParticipantPolicyLabel(item))}</span>
        </td>
        <td>
          <span class="status-chip ${activationStatusClass(item.status)}">${escapeHtml(activationStatusLabel(item.status))}</span>
          <br><span class="table-secondary">${item.ends_at ? `Vence ${escapeHtml(formatDate(item.ends_at))}` : "Sin vencimiento"}</span>
        </td>
        <td>
          <strong>${escapeHtml(item.attempts_count || 0)}</strong> intentos<br>
          <span class="table-secondary">${escapeHtml(item.winners_count || 0)} QR generados${item.max_winners ? ` / cupo ${escapeHtml(item.max_winners)}` : ""}</span>
        </td>
        <td>
          <a class="table-link" href="${escapeHtml(item.public_url)}" target="_blank" rel="noopener">${escapeHtml(item.public_slug || item.public_url)}</a>
          <div class="activation-row-actions">
            <button class="ghost-button" type="button" data-copy-trivia-link="${escapeHtml(item.public_url)}">Copiar</button>
            <a class="ghost-button" href="${escapeHtml(item.public_url)}" target="_blank" rel="noopener">Abrir</a>
          </div>
        </td>
        <td>
          <div class="activation-row-actions">
            <button class="ghost-button" type="button" data-edit-activation="${escapeHtml(item.id)}">Editar</button>
            <button class="ghost-button" type="button" data-activation-data="${escapeHtml(item.id)}">Datos</button>
            ${item.status === "active"
              ? `<button class="ghost-button" type="button" data-activation-status="${escapeHtml(item.id)}" data-next-status="paused">Pausar</button>`
              : `<button class="ghost-button" type="button" data-activation-status="${escapeHtml(item.id)}" data-next-status="active">Activar</button>`}
            <button class="ghost-button" type="button" data-recycle-activation="${escapeHtml(item.id)}">Reciclar</button>
            <button class="ghost-button danger-button" type="button" data-activation-status="${escapeHtml(item.id)}" data-next-status="archived">Anular</button>
            <button class="ghost-button danger-button" type="button" data-delete-activation="${escapeHtml(item.id)}">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">Sin activaciones lanzadas todavia.</td></tr>';

  triviaLauncherTable.querySelectorAll("[data-copy-trivia-link]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(button.dataset.copyTriviaLink || "");
      showFeedback("Link publico de activacion copiado.");
    });
  });
  triviaLauncherTable.querySelectorAll("[data-activation-status]").forEach((button) => {
    button.addEventListener("click", () => updateActivationStatus(button.dataset.activationStatus, button.dataset.nextStatus));
  });
  triviaLauncherTable.querySelectorAll("[data-edit-activation]").forEach((button) => {
    button.addEventListener("click", () => editInteractiveActivation(button.dataset.editActivation));
  });
  triviaLauncherTable.querySelectorAll("[data-activation-data]").forEach((button) => {
    button.addEventListener("click", () => showInteractiveActivationData(button.dataset.activationData));
  });
  triviaLauncherTable.querySelectorAll("[data-recycle-activation]").forEach((button) => {
    button.addEventListener("click", () => recycleInteractiveActivation(button.dataset.recycleActivation));
  });
  triviaLauncherTable.querySelectorAll("[data-delete-activation]").forEach((button) => {
    button.addEventListener("click", () => deleteInteractiveActivation(button.dataset.deleteActivation));
  });
}

async function showInteractiveActivationData(id) {
  const activation = activationById(id);
  if (!activation) return;
  const summary = [
    `Titulo: ${activation.title}`,
    `Tipo: ${activationTypeLabel(activation.activation_type)}`,
    `Estado: ${activationStatusLabel(activation.status)}`,
    `Campana: ${activation.campaign_name || "Sin campana"}`,
    `Intentos: ${activation.attempts_count || 0}`,
    `QR generados: ${activation.winners_count || 0}${activation.max_winners ? ` / ${activation.max_winners}` : ""}`,
    `Vence: ${activation.ends_at ? formatDate(activation.ends_at) : "Sin vencimiento"}`,
    `Link: ${activation.public_url}`,
  ].join("\n");
  try {
    await navigator.clipboard?.writeText(summary);
    showFeedback("Datos de la activacion copiados al portapapeles.", "success", { title: "Ficha copiada" });
  } catch {
    window.alert(summary);
  }
}

function activationStatusLabel(status) {
  return {
    draft: "Borrador",
    active: "Activa",
    paused: "Pausada",
    closed: "Cerrada",
    archived: "Anulada",
  }[status] || status || "-";
}

function activationStatusClass(status) {
  return {
    draft: "pending",
    active: "ok",
    paused: "pending",
    closed: "danger",
    archived: "danger",
  }[status] || "pending";
}

function activationById(id) {
  return (state.triviaLaunchers || []).find((item) => String(item.id) === String(id));
}

function activationParticipantPolicyLabel(activation) {
  const lock = activation?.capture_config?.participant_lock || {};
  const days = Number(lock.cooldown_days ?? 7);
  const winnerText = lock.winner_policy === "allow_after_cooldown"
    ? "ganadores pueden volver tras la espera"
    : "ganadores bloqueados";
  return `${Number.isFinite(days) ? days : 7} dias entre intentos · ${winnerText}`;
}

async function patchInteractiveActivation(id, payload, successMessage) {
  const data = await api(`/api/business/interactive-activations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const activation = data.activation;
  state.triviaLaunchers = payload.status === "archived"
    ? (state.triviaLaunchers || []).filter((item) => String(item.id) !== String(id))
    : (state.triviaLaunchers || []).map((item) => String(item.id) === String(id) ? { ...item, ...activation } : item);
  renderTriviaLaunchers();
  if (successMessage) showFeedback(successMessage, "success", { title: "Activacion actualizada" });
  return activation;
}

async function deleteInteractiveActivation(id) {
  const activation = activationById(id);
  if (!activation) return;
  const hasHistory = Number(activation.attempts_count || 0) > 0 || Number(activation.winners_count || 0) > 0;
  const copy = hasHistory
    ? `Esta activacion ya tiene historial. Se retirara de la lista y quedara archivada para no romper tickets/redenciones. Deseas continuar?`
    : `Vas a eliminar definitivamente "${activation.title}". Esta accion no se puede deshacer. Deseas continuar?`;
  if (!window.confirm(copy)) return;
  try {
    const data = await api(`/api/business/interactive-activations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    state.triviaLaunchers = (state.triviaLaunchers || []).filter((item) => String(item.id) !== String(id));
    renderTriviaLaunchers();
    showFeedback(data.message || "Activacion eliminada.", "success", { title: data.deleted ? "Eliminada" : "Archivada" });
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo eliminar" });
  }
}

async function updateActivationStatus(id, status) {
  const activation = activationById(id);
  if (!activation || !status) return;
  if (status === "archived" && !window.confirm(`Vas a anular "${activation.title}". El link quedara inactivo y no recibira nuevas participaciones. Deseas continuar?`)) {
    return;
  }
  try {
    await patchInteractiveActivation(id, { status }, `Estado cambiado a ${activationStatusLabel(status)}.`);
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo actualizar" });
  }
}

async function editInteractiveActivation(id) {
  const activation = activationById(id);
  if (!activation) return;
  const title = window.prompt("Titulo de la activacion", activation.title || "");
  if (title === null) return;
  const description = window.prompt("Descripcion para la landing", activation.description || "");
  if (description === null) return;
  const maxRewardsText = window.prompt("Cupo maximo de QR/beneficios. Deja vacio para sin limite.", activation.max_rewards || "");
  if (maxRewardsText === null) return;
  const maxRewards = String(maxRewardsText).trim() ? Number(maxRewardsText) : null;
  if (maxRewards !== null && (!Number.isFinite(maxRewards) || maxRewards < 1)) {
    showFeedback("El cupo maximo debe ser un numero mayor a cero o quedar vacio.", "error", { title: "Dato invalido" });
    return;
  }
  const currentLock = activation.capture_config?.participant_lock || {};
  const cooldownText = window.prompt("Dias de espera entre intentos para este beneficiario.", currentLock.cooldown_days ?? 7);
  if (cooldownText === null) return;
  const cooldownDays = Number(cooldownText);
  if (!Number.isFinite(cooldownDays) || cooldownDays < 0 || cooldownDays > 365) {
    showFeedback("Los dias de espera deben estar entre 0 y 365.", "error", { title: "Dato invalido" });
    return;
  }
  const currentWinnerPolicy = currentLock.winner_policy || "block_previous_winners";
  const winnerPolicy = window.prompt(
    "Si ya gano beneficio escribe: block_previous_winners o allow_after_cooldown.",
    currentWinnerPolicy
  );
  if (winnerPolicy === null) return;
  if (!["block_previous_winners", "allow_after_cooldown"].includes(winnerPolicy)) {
    showFeedback("Politica invalida. Usa block_previous_winners o allow_after_cooldown.", "error", { title: "Dato invalido" });
    return;
  }
  try {
    await patchInteractiveActivation(id, {
      title: title.trim(),
      description: description.trim() || null,
      max_rewards: maxRewards,
      capture_config: {
        ...(activation.capture_config || {}),
        required_fields: ["name", "phone", "email", "document"],
        optional_fields: [],
        participant_lock: {
          scope: currentLock.scope === "company" ? "company" : "activation",
          cooldown_days: cooldownDays,
          winner_policy: winnerPolicy,
          label: `${cooldownDays} dias de espera entre intentos`,
        },
      },
    }, "Datos basicos actualizados.");
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo editar" });
  }
}

async function recycleInteractiveActivation(id) {
  const activation = activationById(id);
  if (!activation) return;
  if (!window.confirm(`Crear una copia borrador de "${activation.title}" con sus preguntas, reglas y configuracion?`)) return;
  try {
    const data = await api(`/api/business/interactive-activations/${encodeURIComponent(id)}/recycle`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    state.triviaLaunchers = [data.activation, ...(state.triviaLaunchers || [])];
    renderTriviaLaunchers();
    showFeedback("Activacion reciclada como borrador. Puedes editarla y activarla cuando este lista.", "success", { title: "Copia creada" });
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo reciclar" });
  }
}

async function submitTriviaLauncher(event) {
  event.preventDefault();
  if (!requireCampaignAssociation(triviaCampaignInput, triviaLauncherMessage, "lanzar una activacion")) {
    return;
  }
  if (!triviaLauncherForm.reportValidity()) {
    setInlineMessage(triviaLauncherMessage, "Revisa los campos marcados antes de lanzar la activacion.", "error");
    return;
  }
  const activationPayload = validateTriviaLauncherForm();
  if (!activationPayload) return;
  const type = currentActivationType();
  const submitButton = triviaLauncherForm.querySelector("button[type='submit']");
  setButtonLoading(submitButton, true, "Lanzando...");
  setInlineMessage(triviaLauncherMessage, `Creando landing publica de ${activationTypeLabel(type).toLowerCase()}.`, "info");
  try {
    const data = await api("/api/business/interactive-activations", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(buildInteractiveActivationPayload(type, activationPayload)),
    });

    const activation = data.activation || data.trivia;
    state.triviaLaunchers = [activation, ...(state.triviaLaunchers || []).filter((item) => item.id !== activation.id)];
    renderTriviaLaunchers();
    triviaLauncherResult.classList.remove("hidden");
    triviaLauncherResult.innerHTML = `
      <strong>Activacion lanzada</strong>
      <p class="table-secondary">Comparte este link con clientes. Primero dejan sus datos, luego completan la dinamica y el sistema emite el ticket segun la regla configurada.</p>
      <p><a href="${escapeHtml(activation.public_url)}" target="_blank" rel="noopener">${escapeHtml(activation.public_url)}</a></p>
      <button class="ghost-button" type="button" id="copyTriviaLauncherResultButton">Copiar link</button>
    `;
    document.getElementById("copyTriviaLauncherResultButton")?.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(activation.public_url);
      showFeedback("Link de activacion copiado.");
    });
    setInlineMessage(triviaLauncherMessage, "Activacion lista para compartir.", "success");
    showFeedback("Activacion lanzada. El link publico ya esta listo.", "success", { title: "Constructor de activaciones" });
    markTicketCenterDataStale(["activations", "metrics"]);
    await loadStrategicQrData({ groups: ["activations", "metrics"], force: true, quiet: true });
    renderStrategicQrView();
  } catch (error) {
    setInlineMessage(triviaLauncherMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo lanzar la activacion" });
  } finally {
    setButtonLoading(submitButton, false);
  }
}

async function submitPostSaleQr(event) {
  event.preventDefault();
  if (!requireCampaignAssociation(postSaleCampaignInput, postSaleQrMessage, "generar un ticket postventa")) {
    return;
  }
  const submitButton = postSaleQrForm.querySelector("button[type='submit']");
  setButtonLoading(submitButton, true, "Generando...");
  setInlineMessage(postSaleQrMessage, "Generando ticket postventa y descontando 1 ticket...", "info");
  showFeedback("Creando token unico, registrando venta y preparando el ticket.", "loading", { title: "Generando ticket postventa", timeout: 0 });
  showBusyOverlay("Generando ticket postventa", "Registrando venta, creando ticket y actualizando saldo.");
  try {
    const attributionSource = postSaleAttributionSourceInput?.value.trim() || "post-sale";
    const attributionSubject = postSaleAttributionSubjectInput?.value.trim() || postSaleProductInput.value.trim() || null;
    const data = await api("/api/business/qr/post-sale", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        campaign_id: postSaleCampaignInput.value || null,
        sale_amount: Number(postSaleAmountInput.value || 0),
        currency: postSaleCurrencyInput.value.trim() || "COP",
        customer_name: postSaleCustomerInput.value.trim() || null,
        document_id: postSaleDocumentInput.value.trim() || null,
        customer_phone: postSalePhoneInput.value.trim() || null,
        customer_email: postSaleEmailInput.value.trim() || null,
        product_name: postSaleProductInput.value.trim() || null,
        notes: postSaleNotesInput.value.trim() || null,
        metadata: {
          attribution_source: attributionSource,
          attribution_subject: attributionSubject,
          campaign_id: postSaleCampaignInput.value || null,
          qr_creation_context: "business_owner_post_sale",
        },
        expires_mode: postSaleExpiresModeInput.value,
        expires_at: postSaleExpiresAtInput.value ? new Date(postSaleExpiresAtInput.value).toISOString() : null,
        benefit: {
          benefit_type: postSaleBenefitTypeInput.value,
          benefit_label: postSaleBenefitLabelInput.value.trim(),
          benefit_value: parseJsonObject(postSaleBenefitValueInput.value),
        },
      }),
    });
    const browserTicketDataUrl = await ticketImageDataUrlForBrowser(data.qr_image_data_url);
    const ticketFilename = filenameForDataUrl(data.filename || `post-sale-${data.qr_code.id}.png`, browserTicketDataUrl);
    const ticketDownloadUrl = URL.createObjectURL(dataUrlToBlob(browserTicketDataUrl));
    state.qrCreditAccount = data.credit_account || state.qrCreditAccount;
    markTicketCenterDataStale(["core", "metrics", "history"]);
    await loadStrategicQrData({ groups: ["core", "metrics", "history"], force: true, quiet: true });
    setView("strategic-qr");
    setInlineMessage(postSaleQrMessage, "Ticket generado. El ticket fue descontado y la descarga esta lista.", "success");
    postSaleQrResult.classList.remove("hidden");
    postSaleQrResult.innerHTML = `
      <p><strong>Estado:</strong> ${escapeHtml(data.qr_code.status)}</p>
      <p><strong>Link:</strong> <a href="${escapeHtml(data.validator_url)}" target="_blank" rel="noopener">Abrir ticket</a></p>
      <img src="${escapeHtml(browserTicketDataUrl)}" alt="Ticket generado" style="max-width:220px;width:100%;border-radius:18px;">
      <p><a class="solid-button" id="downloadPostSaleQrButton" href="${escapeHtml(ticketDownloadUrl)}" download="${escapeHtml(ticketFilename)}">Descargar ticket</a></p>
    `;
    document.getElementById("downloadPostSaleQrButton")?.addEventListener("click", () => {
      window.setTimeout(() => URL.revokeObjectURL(ticketDownloadUrl), 30000);
    });
    showFeedback("Ticket postventa listo. Descargalo o abre el link para validar.", "success", { title: "Ticket generado" });
  } catch (error) {
    setInlineMessage(postSaleQrMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo generar el ticket" });
  } finally {
    setButtonLoading(submitButton, false);
    hideBusyOverlay();
  }
}

async function submitQrBatch(event) {
  event.preventDefault();
  if (!requireCampaignAssociation(qrBatchCampaignInput, qrBatchMessage, "generar un paquete de tickets")) {
    return;
  }
  const requestedQuantity = Number(qrBatchQuantityInput.value || 0);
  const submitButton = qrBatchForm.querySelector("button[type='submit']");
  setButtonLoading(submitButton, true, "Generando paquete...");
  setInlineMessage(qrBatchMessage, `Generando paquete y reservando ${requestedQuantity.toLocaleString("es-CO")} tickets...`, "info");
  showFeedback(`Preparando ${requestedQuantity.toLocaleString("es-CO")} tickets. Mantente en esta pantalla hasta que termine.`, "loading", { title: "Generando paquete", timeout: 0 });
  qrBatchResult.classList.add("hidden");
  qrBatchResult.innerHTML = "";
  startQrBatchProgress(requestedQuantity);
  try {
    const attributionSource = qrBatchAttributionSourceInput?.value.trim() || qrBatchChannelInput.value;
    const attributionSubject = qrBatchAttributionSubjectInput?.value.trim() || qrBatchNameInput.value.trim();
    const data = await api("/api/business/qr/batches", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        campaign_id: qrBatchCampaignInput.value || null,
        name: qrBatchNameInput.value.trim(),
        quantity: Number(qrBatchQuantityInput.value || 0),
        channel_use: qrBatchChannelInput.value,
        qr_origin_type: qrBatchOriginTypeInput.value,
        claim_required: true,
        expires_mode: qrBatchExpiresModeInput.value,
        expires_at: qrBatchExpiresAtInput.value ? new Date(qrBatchExpiresAtInput.value).toISOString() : null,
        notes: qrBatchNotesInput.value.trim() || null,
        metadata: {
          attribution_source: attributionSource,
          attribution_subject: attributionSubject,
          campaign_id: qrBatchCampaignInput.value || null,
          qr_creation_context: "business_owner_batch",
        },
        benefit: {
          benefit_type: qrBatchBenefitTypeInput.value,
          benefit_label: qrBatchBenefitLabelInput.value.trim(),
          benefit_value: parseJsonObject(qrBatchBenefitValueInput.value),
        },
      }),
    });
    setQrBatchProgress(96, {
      eyebrow: "Paquete creado",
      title: data.batch.name || "Paquete de tickets",
      message: `Se generaron ${Number(data.batch.quantity || requestedQuantity).toLocaleString("es-CO")} tickets y el inventario ya quedo registrado. Iniciando descarga automatica del ZIP.`,
    });
    await downloadBatchByFormat(data.batch.id, "zip", "sticker", "a4", { silentSuccess: true });
    setQrBatchProgress(100, {
      eyebrow: "Paquete listo",
      title: data.batch.name || "Paquete de tickets",
      message: `Se generaron ${Number(data.batch.quantity || requestedQuantity).toLocaleString("es-CO")} tickets, quedaron registrados en el portal y la descarga del ZIP ya fue iniciada.`,
    });
    setInlineMessage(qrBatchMessage, "Paquete generado, registrado y descargando ZIP.", "success");
    state.strategicQrRecentBatchId = data.batch.id;
    renderQrBatchResultCard(
      {
        ...data.batch,
        generated_count: data.batch.quantity,
        unclaimed_count: data.qr_codes?.filter((item) => item.status === "UNCLAIMED").length || 0,
        active_count: data.qr_codes?.filter((item) => item.status === "ACTIVE").length || 0,
        redeemed_count: 0,
      },
      {
        eyebrow: "Paquete creado",
        selectPrefix: "newBatch",
        firstQrId: data.qr_codes?.[0]?.id || null,
      }
    );
    state.qrCreditAccount = data.credit_account || state.qrCreditAccount;
    markTicketCenterDataStale(["core", "metrics", "batches", "history"]);
    await loadStrategicQrData({ groups: ["core", "metrics", "batches", "history"], force: true, quiet: true });
    setView("strategic-qr");
    qrBatchForm.reset();
    qrBatchQuantityInput.value = "50";
    qrBatchClaimRequiredInput.value = "true";
    qrBatchExpiresModeInput.value = "NONE";
    renderCampaignAssociationInputs();
    showFeedback("Paquete creado. La descarga del ZIP fue iniciada y los tickets quedaron actualizados.", "success", { title: "Paquete de tickets listo" });
  } catch (error) {
    clearQrBatchProgressTimer();
    setQrBatchProgress(100, {
      eyebrow: "Error en lote",
      title: "No se pudo crear el paquete",
      message: error.message,
    });
    setInlineMessage(qrBatchMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo crear el paquete" });
  } finally {
    setButtonLoading(submitButton, false);
  }
}

async function downloadStrategicQr(qrId) {
  if (!qrId) return;
  try {
    const data = await api(`/api/business/qr/${encodeURIComponent(qrId)}/download`, {
      headers: authHeaders(),
    });
    downloadDataUrl(data.filename || `strategic-qr-${qrId}.png`, data.qr_image_data_url);
    showFeedback("Ticket descargado correctamente.");
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function inspectQrBatch(batchId) {
  if (!batchId) return;
  try {
    const data = await api(`/api/business/qr/batches/${encodeURIComponent(batchId)}`, {
      headers: authHeaders(),
    });
    const first = data.qr_codes?.[0] || null;
    renderQrBatchResultCard(
      {
        ...data.batch,
        generated_count: data.qr_codes?.length || 0,
        unclaimed_count: data.qr_codes?.filter((item) => item.status === "UNCLAIMED").length || 0,
        active_count: data.qr_codes?.filter((item) => item.status === "ACTIVE").length || 0,
        redeemed_count: data.qr_codes?.filter((item) => item.status === "REDEEMED").length || 0,
      },
      {
        eyebrow: "Paquete registrado",
        selectPrefix: "inspectBatch",
        firstQrId: first?.id || null,
      }
    );
    state.strategicQrRecentBatchId = batchId;
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function downloadBatchByFormat(batchId, format, template = "sticker", paper = "a4", options = {}) {
  try {
    const formatLabel = batchFormatLabel(format);
    if (!options.silentSuccess) {
      showFeedback(`Preparando ${formatLabel} del paquete de tickets...`);
    }
    const response = await fetch(`/api/business/qr/batches/${encodeURIComponent(batchId)}/download?format=${encodeURIComponent(format)}&template=${encodeURIComponent(template)}&paper=${encodeURIComponent(paper)}`, {
      headers: authHeaders(),
    });
    if (!response.ok) {
      let message = "No se pudo descargar el paquete.";
      try {
        const data = await response.json();
        message = data.error?.message || message;
      } catch {}
      throw new Error(message);
    }

    const blob = await response.blob();
    const serverFilename = filenameFromDisposition(
      response.headers.get("content-disposition"),
      `qr-batch-${batchId}.${format === "json" ? "json" : format === "zip" ? "zip" : format === "pdf" ? "pdf" : format === "html" ? "html" : "csv"}`
    );
    const blobSizeMb = blob.size ? (blob.size / (1024 * 1024)).toFixed(2) : "0.00";

    if (format === "html") {
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      if (!options.silentSuccess) {
        showFeedback(`Vista imprimible abierta correctamente.`);
      }
      return;
    }

    if (!options.silentSuccess) {
      showFeedback(`Descargando ${formatLabel}: ${serverFilename} (${blobSizeMb} MB)...`);
    }
    if (String(format).toLowerCase() === "zip") {
      setZipDownloadGuidance(serverFilename, "starting");
    }
    triggerBlobDownload(blob, serverFilename);
    if (!options.silentSuccess) {
      showFeedback(`${formatLabel} listo: ${serverFilename}. Si no lo ves, revisa la carpeta de descargas del navegador.`);
    }
    if (String(format).toLowerCase() === "zip") {
      setZipDownloadGuidance(serverFilename, "ready");
    }
  } catch (error) {
    showFeedback(`No se pudo descargar el ${batchFormatLabel(format)}. ${error.message}`, "error");
    throw error;
  }
}

async function validateValidatorToken(rawValue) {
  const token = extractValidatorToken(rawValue);
  setInlineMessage(validatorManualStatus, "", "info");
  if (!token) {
    setValidatorResult("danger", "Ticket vacio", "Pega un token o URL valido.");
    setInlineMessage(validatorManualStatus, "Pega un token o URL valido.", "error");
    return;
  }

  state.validatorLastToken = token;
  setValidatorResult("neutral", "Consultando", "Validando token contra la base de datos...");
  setButtonLoading(validateValidatorManualButton, true, "Validando...");
  setInlineMessage(validatorManualStatus, "Consultando estado, negocio y beneficio del ticket...", "info");
  showFeedback("Validando ticket contra la base de datos.", "loading", { title: "Validando ticket", timeout: 0 });

  try {
    const isRewardPass = token.startsWith("rp_");
    const data = await api(isRewardPass
      ? `/api/business/reward-passes/validator/${encodeURIComponent(token)}`
      : `/api/qr/validate/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: authHeaders(),
    });
    state.validatorLastValidation = data;
    state.validatorLastRedemption = null;
    if (data.allowed) {
      setValidatorResult("ok", data.kind === "reward_pass" ? "Reward Pass valido" : "Ticket valido", data.message, data);
      setInlineMessage(validatorManualStatus, data.kind === "reward_pass" ? "Reward Pass valido. Confirma cedula, factura y valor a redimir." : "Ticket valido. Puedes redimir el beneficio.", "success");
      showFeedback(data.kind === "reward_pass" ? "Reward Pass valido. Confirma documento antes de registrar redencion." : "Ticket valido. Revisa los datos y redime cuando el cliente confirme.", "success", { title: "Ticket aprobado" });
    } else {
      setValidatorResult("danger", data.status || "Ticket rechazado", data.message, data);
      setInlineMessage(validatorManualStatus, data.message || "Este ticket no puede redimirse.", "error");
      showFeedback(data.message || "Este ticket no puede redimirse.", "error", { title: "Ticket rechazado" });
    }
  } catch (error) {
    state.validatorLastValidation = null;
    state.validatorLastRedemption = null;
    setValidatorResult("danger", "Validacion fallida", error.message);
    setInlineMessage(validatorManualStatus, error.message, "error");
    showFeedback(error.message, "error", { title: "Validacion fallida" });
  } finally {
    setButtonLoading(validateValidatorManualButton, false);
  }
}

async function redeemValidatorToken() {
  if (!state.validatorLastToken || !state.validatorLastValidation?.allowed) {
    return;
  }

  validatorRedeemButton.disabled = true;
  setButtonLoading(validatorRedeemButton, true, "Redimiendo...");
  showFeedback("Registrando redencion y bloqueando el ticket para evitar doble uso.", "loading", { title: "Redimiendo beneficio", timeout: 0 });
  try {
    const isRewardPass = state.validatorLastValidation?.kind === "reward_pass";
    const rewardPassPreview = isRewardPass ? rewardPassBalancePreview(true) : null;
    if (isRewardPass) {
      const invoiceNumber = validatorRewardPassInvoiceInput?.value.trim() || "";
      if (invoiceNumber.length < 2) {
        validatorRewardPassInvoiceInput?.focus();
        throw new Error("Ingresa el numero de factura electronica antes de redimir el Reward Pass.");
      }
      if (!rewardPassPreview.invoiceValue) {
        throw new Error("Ingresa el total de la factura electronica para calcular el saldo.");
      }
      if (!rewardPassPreview.coverage) {
        throw new Error("No hay saldo disponible para cubrir esta factura.");
      }
      if (!rewardPassPreview.partialAllowed && rewardPassPreview.remaining > 0) {
        const acceptsSingleUse = window.confirm("Este Reward Pass es de un solo uso y la factura no consume todo el saldo. Confirma que el consumidor conoce y acepta las condiciones antes de registrar la redencion.");
        if (!acceptsSingleUse) {
          throw new Error("Redencion cancelada. Ajusta la factura o confirma las condiciones con el consumidor.");
        }
      }
    }
    const data = await api(isRewardPass
      ? `/api/business/reward-passes/validator/${encodeURIComponent(state.validatorLastToken)}/redeem`
      : `/api/qr/redeem/${encodeURIComponent(state.validatorLastToken)}`, {
      method: "POST",
      headers: authHeaders(),
      body: isRewardPass ? JSON.stringify({
        invoice_number: validatorRewardPassInvoiceInput?.value.trim(),
        purchase_value_cop: rewardPassPreview.invoiceValue,
        redeemed_value_cop: rewardPassPreview.coverage,
        branch: validatorRewardPassBranchInput?.value.trim() || null,
        observations: validatorSaleNotesInput?.value.trim() || null,
        document_checked: validatorRewardPassDocumentInput?.value.trim() || null,
        confirm_full_consumption: !rewardPassPreview.partialAllowed && rewardPassPreview.remaining > 0,
      }) : undefined,
    });
    state.validatorLastRedemption = data.redemption;
    state.validatorLastValidation = {
      ...state.validatorLastValidation,
      allowed: false,
    };
    setValidatorResult("ok", "Redencion completada", data.message, {
      ...state.validatorLastValidation,
      allowed: false,
    });
    resetValidatorSaleForm();
    await loadValidatorHistory();
    showFeedback("Beneficio redimido. Si hubo venta, registra el valor para completar el seguimiento.", "success", { title: "Redencion completada" });
  } catch (error) {
    setValidatorResult("danger", "No se pudo redimir", error.message, state.validatorLastValidation);
    showFeedback(error.message, "error");
  } finally {
    setButtonLoading(validatorRedeemButton, false);
    validatorRedeemButton.disabled = !state.validatorLastValidation?.allowed;
  }
}

async function saveValidatorAttributedSale(event) {
  event.preventDefault();
  if (!state.validatorLastRedemption?.id) {
    validatorSaleStatus.textContent = "Primero redime un ticket.";
    return;
  }

  const submitButton = validatorSaleForm.querySelector("button[type='submit']");
  setButtonLoading(submitButton, true, "Guardando...");
  setInlineMessage(validatorSaleStatus, "Guardando resultado comercial de la redencion...", "info");
  showFeedback("Registrando venta atribuida para actualizar metricas.", "loading", { title: "Guardando venta", timeout: 0 });
  try {
    const data = await api(`/api/redemptions/${state.validatorLastRedemption.id}/attributed-sale`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        had_sale: validatorHadSaleInput.checked,
        sale_amount: Number(validatorSaleAmountInput.value || 0),
        currency: "COP",
        payment_method: validatorPaymentMethodInput.value.trim() || null,
        product_or_service: validatorProductServiceInput.value.trim() || null,
        notes: validatorSaleNotesInput.value.trim() || null,
      }),
    });
    const referralDelta = Number(data.referral?.points_delta || 0);
    const referralMessage = data.referral
      ? ` ${referralDelta === 0 ? "Sin cambio de puntos" : `${toNumber(referralDelta)} puntos`} para el afiliado.`
      : "";
    setInlineMessage(validatorSaleStatus, data.sale ? `Venta atribuida guardada.${referralMessage}` : "Redencion registrada sin venta.", "success");
    await loadValidatorHistory();
    showFeedback(data.sale ? `Venta atribuida guardada y metricas actualizadas.${referralMessage}` : "Redencion guardada sin venta atribuida.", "success", { title: "Registro actualizado" });
  } catch (error) {
    setInlineMessage(validatorSaleStatus, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo guardar la venta" });
  } finally {
    setButtonLoading(submitButton, false);
  }
}

function stopValidatorScanner() {
  state.validatorScanning = false;
  if (state.validatorScanLoopHandle) {
    cancelAnimationFrame(state.validatorScanLoopHandle);
    state.validatorScanLoopHandle = 0;
  }
  if (state.validatorStream) {
    state.validatorStream.getTracks().forEach((track) => track.stop());
    state.validatorStream = null;
  }
  validatorScannerVideo.srcObject = null;
  state.validatorScannerMode = "none";
  validatorCameraStatus.textContent = "Detenida";
}

async function validatorScanFrame() {
  if (!state.validatorScanning) {
    return;
  }

  try {
    if (validatorScannerVideo.readyState >= 2) {
      let rawValue = "";

      if (state.validatorScannerMode === "barcode-detector" && state.validatorDetector) {
        const barcodes = await state.validatorDetector.detect(validatorScannerVideo);
        rawValue = barcodes[0]?.rawValue || "";
      } else if (state.validatorScannerMode === "jsqr" && state.validatorScanContext) {
        const width = validatorScannerVideo.videoWidth || 0;
        const height = validatorScannerVideo.videoHeight || 0;
        if (width && height) {
          state.validatorScanCanvas.width = width;
          state.validatorScanCanvas.height = height;
          state.validatorScanContext.drawImage(validatorScannerVideo, 0, 0, width, height);
          const frame = state.validatorScanContext.getImageData(0, 0, width, height);
          const code = window.jsQR(frame.data, width, height, {
            inversionAttempts: "dontInvert",
          });
          rawValue = code?.data || "";
        }
      }

      const now = Date.now();
      if (rawValue && (rawValue !== state.validatorLastScanValue || now - state.validatorLastScanAt > 3000)) {
        state.validatorLastScanValue = rawValue;
        state.validatorLastScanAt = now;
        validatorQrTokenInput.value = rawValue;
        await validateValidatorToken(rawValue);
        stopValidatorScanner();
      }
    }
  } catch {}

  state.validatorScanLoopHandle = requestAnimationFrame(validatorScanFrame);
}

async function startValidatorScanner() {
  if (!window.isSecureContext) {
    validatorCameraStatus.textContent = "Origen inseguro";
    validatorScannerHint.textContent = `La camara solo funciona en HTTPS o localhost. ${await validatorCameraDiagnostic()}. Usa el ingreso manual.`;
    return;
  }

  if (!validatorCanUseCameraScanner()) {
    validatorCameraStatus.textContent = "Sin soporte";
    validatorScannerHint.textContent = `Usa el campo manual en este navegador. ${await validatorCameraDiagnostic()}.`;
    return;
  }

  try {
    stopValidatorScanner();
    state.validatorScanContext = state.validatorScanCanvas.getContext("2d", { willReadFrequently: true });
    if (validatorCanUseBarcodeDetector()) {
      state.validatorDetector = new BarcodeDetector({ formats: ["qr_code"] });
      state.validatorScannerMode = "barcode-detector";
    } else {
      state.validatorDetector = null;
      state.validatorScannerMode = "jsqr";
    }
    state.validatorStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    validatorScannerVideo.srcObject = state.validatorStream;
    await validatorScannerVideo.play();
    state.validatorScanning = true;
    validatorCameraStatus.textContent = state.validatorScannerMode === "jsqr" ? "Escaneando en modo compatible" : "Escaneando";
    validatorScannerHint.textContent = state.validatorScannerMode === "jsqr"
      ? `Usando camara del dispositivo en modo compatible. ${await validatorCameraDiagnostic()}. Acerca el ticket y mantenlo quieto.`
      : `Apunta la camara al ticket. ${await validatorCameraDiagnostic()}.`;
    state.validatorScanLoopHandle = requestAnimationFrame(validatorScanFrame);
  } catch (error) {
    validatorCameraStatus.textContent = "Bloqueada";
    validatorScannerHint.textContent = `No se pudo abrir la camara: ${error?.name || "Error"}${error?.message ? ` | ${error.message}` : ""}. ${await validatorCameraDiagnostic()}.`;
  }
}

function renderNoCampaignState() {
  hideFeedback();
  campaignList.innerHTML = '<article class="campaign-item"><p>No hay campanas disponibles.</p></article>';
  campaignStateGrid.innerHTML = "";
  campaignBreadcrumb.textContent = "Sin campana";
  campaignHeroTitle.textContent = "Campana";
  campaignHeroSubtitle.textContent = "Analisis de rendimiento multicanal y tasa de conversion.";
  editCampaignButton.classList.add("hidden");
  markReadyCampaignButton.classList.add("hidden");
  campaignInsightText.textContent = "No hay campanas registradas para este negocio.";
  campaignObjectiveValue.textContent = "-";
  campaignDurationValue.textContent = "-";
  campaignStatusValue.textContent = "-";
  campaignBudgetValue.textContent = "$0";
  campaignBudgetMeta.textContent = "de $0 totales";
  campaignBudgetBar.style.width = "0%";
  campaignRoiValue.textContent = "-";
  campaignRoiDelta.textContent = "-";
  launchSetupTitle.textContent = "Configuracion del cliente";
  launchSetupStatus.textContent = "Bloqueado";
  launchSetupCopy.textContent = "Esta campana aun no esta lista para configuracion por parte del cliente.";
  launchSetupForm.reset();
  Array.from(launchChannelGrid.querySelectorAll("input[type='checkbox']")).forEach((input) => {
    input.checked = false;
    input.disabled = true;
  });
  campaignAssetsGrid.innerHTML = '<article class="asset-card"><strong>Sin assets cargados</strong><span>Selecciona una campana para ver material entregado.</span></article>';
  campaignSnapshotsTable.innerHTML = '<tr><td colspan="6">Sin snapshots cargados.</td></tr>';
  campaignKpiGrid.innerHTML = "";
  funnelStack.innerHTML = "";
  recentRedemptionsTable.innerHTML = '<tr><td colspan="4">Sin redenciones.</td></tr>';
  recentLeadsTable.innerHTML = '<tr><td colspan="4">Sin leads.</td></tr>';
  campaignLeadsTable.innerHTML = '<tr><td colspan="9">Sin leads.</td></tr>';
  campaignRedemptionsTable.innerHTML = '<tr><td colspan="6">Sin redenciones.</td></tr>';
  campaignSalesTable.innerHTML = '<tr><td colspan="8">Sin ventas.</td></tr>';
  branchTable.innerHTML = '<tr><td colspan="4">Sin datos por sucursal.</td></tr>';
  branchPerformanceTable.innerHTML = '<tr><td colspan="5">Sin actividad por sucursal.</td></tr>';
  geoBranchBoard.innerHTML = '<article class="geo-branch-card"><strong>Sin datos</strong><p>No hay actividad por sucursal todavia.</p></article>';
  dashboardInsightTitle.textContent = "Esperando datos del negocio.";
  dashboardNarrativeTitle.textContent = "Esperando datos del negocio.";
  dashboardNarrativeText.textContent = "Cuando haya actividad, aqui veras el principal movimiento del periodo sin tener que interpretar todas las tablas.";
  dashboardFunnelHelp.textContent = "Leads muestran interes. tickets emitidos muestran activacion. Redenciones muestran visita real. Clientes adquiridos muestran conversion comercial.";
  dashboardHealthText.textContent = "ROI, CPL y CAC se comparan contra ventas atribuidas para saber si la campana esta comprando clientes a un costo sano.";
  cacTrendNote.textContent = "Costo por lead por campana";
  campaignAnalysisTitle.textContent = "Selecciona una campana.";
  campaignAnalysisText.textContent = "Aqui se resumira la lectura del rendimiento para que el equipo comercial entienda rapido si la campana esta sana.";
  campaignEconomicsText.textContent = "ROI relaciona ventas atribuidas frente a inversion. CAC muestra cuanto costo cada cliente con compra. Deben leerse juntos.";
  campaignActionText.textContent = "Aqui veras si conviene escalar pauta, optimizar la landing o reforzar el cierre en tienda.";
  adminCampaignTable.innerHTML = isAdmin() ? '<tr><td colspan="4">Sin campanas disponibles.</td></tr>' : '<tr><td colspan="4">Sin acceso admin.</td></tr>';
  salesKpiGrid.innerHTML = "";
  branchKpiGrid.innerHTML = "";
  renderAdminView();
  adminPanelMessage.textContent = isAdmin()
    ? "Este usuario puede crear y editar campanas desde el modal del portal y tambien operar `/admin`."
    : "Usa el panel `/admin` para la operacion interna de Market Games.";
  rangeButton.textContent = state.rangeDays ? `Ultimos ${state.rangeDays} dias` : "Todo el historial";
  drawDualLineChart(businessTrendChart, [], [], "count", ["Leads", "Redenciones"], [NEON_CHART.cyan, NEON_CHART.magenta]);
  drawSimpleLineChart(cacTrendChart, [], NEON_CHART.yellow, "Costo por lead");
  drawTripleLineChart(hourlyOperationsChart, [], [], [], "count", ["Tickets", "Validaciones", "Redenciones"], [NEON_CHART.cyan, NEON_CHART.yellow, NEON_CHART.magenta]);
  drawGroupedBars(weekdayPerformanceChart, [], [
    { key: "qr", color: NEON_CHART.cyan },
    { key: "redemptions", color: NEON_CHART.green },
  ]);
  drawDonutChart(qrStatusChart, [], [NEON_CHART.cyan]);
  drawHorizontalBars(campaignPerformanceChart, [], NEON_CHART.cyan);
  drawHorizontalBars(rewardMixChart, [], NEON_CHART.green);
  drawHorizontalBars(paymentMethodChart, [], NEON_CHART.magenta);
  drawGroupedBars(campaignTimelineChart, [], [
    { key: "leads", color: NEON_CHART.cyan },
    { key: "sales", color: NEON_CHART.yellow },
  ]);
}

function openCampaignModal(mode) {
  if (mode === "edit" && !state.selectedCampaign) {
    showFeedback("Selecciona una campana antes de editar.", "error");
    return;
  }

  if (!canManageCampaigns()) {
    showFeedback("Tu plan actual no permite crear o editar campanas desde el portal.", "info", { title: "Campanas bloqueadas" });
    return;
  }

  if (mode === "create" && !session?.user?.business_id) {
    setView("admin");
    showFeedback("El admin global necesita un negocio objetivo para crear campanas. Usa `/admin` o entra con un negocio asignado.", "error");
    return;
  }

  state.campaignModalMode = mode;
  campaignModalMode.textContent = mode === "create" ? "New Campaign" : "Edit Campaign";
  campaignModalTitle.textContent = mode === "create" ? "Crear campana" : "Editar campana";
  campaignModalMessage.textContent = "";

  const campaign = mode === "edit" ? state.selectedCampaign : null;
  campaignFormName.value = campaign?.name || "";
  campaignFormSlug.value = slugify(campaign?.slug || campaign?.public_slug || campaign?.name || "");
  campaignFormSlug.dataset.generatedFrom = campaignFormName.value;
  campaignFormType.value = campaign?.type || "FORM";
  campaignFormStatus.value = campaign?.status || "DRAFT";
  campaignFormObjective.value = campaign?.objective || "";
  campaignFormStrategy.value = campaign?.strategy_summary || "";
  campaignFormBudget.value = campaign?.budget_total || 0;
  campaignFormGoal.value = campaign?.expected_sales_goal || 0;
  campaignFormLeadsGoal.value = campaign?.expected_leads_goal || "";
  campaignFormRedemptionsGoal.value = campaign?.expected_redemptions_goal || "";
  campaignFormStartsAt.value = formatInputDateTime(campaign?.starts_at);
  campaignFormEndsAt.value = formatInputDateTime(campaign?.ends_at);
  setCheckedValues(campaignFormLaunchChannels, campaign?.launch_channels || []);
  campaignFormClientNotes.value = campaign?.client_notes || "";
  campaignFormLandingUrl.value = campaign?.delivered_assets?.landing_url || "";
  campaignFormValidatorUrl.value = campaign?.delivered_assets?.validator_url || "";
  campaignFormGameUrl.value = campaign?.delivered_assets?.game_url || campaign?.delivered_assets?.form_url || "";
  campaignFormPrimaryLink.value = campaign?.delivered_assets?.primary_link || "";
  campaignFormQrLandingUrl.value = campaign?.delivered_assets?.qr_landing_url || "";
  campaignFormAssetNotes.value = campaign?.delivered_assets?.creative_notes || "";
  state.campaignModalInitialSnapshot = campaignModalSnapshot();

  campaignModal.classList.remove("hidden");
}

function closeCampaignModal() {
  campaignModal.classList.add("hidden");
  campaignModalMessage.textContent = "";
  state.campaignModalInitialSnapshot = null;
}

function campaignModalSnapshot() {
  if (!campaignModalForm) return "";
  const data = new FormData(campaignModalForm);
  const channels = selectedCheckedValues(campaignFormLaunchChannels).sort();
  return JSON.stringify({
    name: campaignFormName.value,
    slug: campaignFormSlug.value,
    type: campaignFormType.value,
    status: campaignFormStatus.value,
    objective: campaignFormObjective.value,
    strategy: campaignFormStrategy.value,
    budget: campaignFormBudget.value,
    goal: campaignFormGoal.value,
    leads_goal: campaignFormLeadsGoal.value,
    redemptions_goal: campaignFormRedemptionsGoal.value,
    starts_at: campaignFormStartsAt.value,
    ends_at: campaignFormEndsAt.value,
    channels,
    client_notes: campaignFormClientNotes.value,
    landing_url: campaignFormLandingUrl.value,
    validator_url: campaignFormValidatorUrl.value,
    game_url: campaignFormGameUrl.value,
    primary_link: campaignFormPrimaryLink.value,
    qr_landing_url: campaignFormQrLandingUrl.value,
    asset_notes: campaignFormAssetNotes.value,
    form_size: Array.from(data.keys()).length,
  });
}

function isCampaignModalDirty() {
  return !campaignModal.classList.contains("hidden")
    && state.campaignModalInitialSnapshot
    && campaignModalSnapshot() !== state.campaignModalInitialSnapshot;
}

function requestCloseCampaignModal() {
  if (isCampaignModalDirty()) {
    const discard = window.confirm("Tienes cambios sin guardar en esta campana. Si cierras ahora se perdera el progreso. Deseas cerrar de todos modos?");
    if (!discard) {
      setInlineMessage(campaignModalMessage, "No cerramos el formulario. Tus datos siguen ahi; guarda la campana o cancela cuando estes seguro.", "info");
      return;
    }
  }
  closeCampaignModal();
}

function notifyCampaignBackdropLocked() {
  if (campaignModal.classList.contains("hidden")) return;
  setInlineMessage(campaignModalMessage, "El formulario no se cierra al tocar afuera para no perder tu progreso. Usa Guardar o Cancelar.", "info");
  const card = campaignModal.querySelector(".modal-card");
  card?.classList.remove("modal-card-attention");
  window.requestAnimationFrame(() => card?.classList.add("modal-card-attention"));
}

function openSnapshotModal() {
  snapshotModal.classList.remove("hidden");
  snapshotModalMessage.textContent = "";
}

function closeSnapshotModal() {
  snapshotModal.classList.add("hidden");
  snapshotModalMessage.textContent = "";
  state.snapshotEditingId = null;
}

async function submitCampaignModal(event) {
  event.preventDefault();
  if (!session?.user?.business_id) return;
  syncCampaignSlugFromName();
  const normalizedSlug = slugify(campaignFormSlug.value || campaignFormName.value);
  campaignFormSlug.value = normalizedSlug;
  if (!normalizedSlug) {
    campaignModalMessage.textContent = "Escribe un nombre de campana para generar el slug.";
    campaignFormName.focus();
    return;
  }

  const campaignChannels = selectedCheckedValues(campaignFormLaunchChannels);
  if (!campaignChannels.length) {
    campaignModalMessage.textContent = "Selecciona al menos una red o canal antes de guardar.";
    campaignFormLaunchChannels.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }

  const payload = {
    name: campaignFormName.value.trim(),
    slug: normalizedSlug,
    type: campaignFormType.value,
    status: campaignFormStatus.value,
    objective: campaignFormObjective.value.trim() || null,
    strategy_summary: campaignFormStrategy.value.trim() || null,
    budget_total: Number(campaignFormBudget.value || 0),
    expected_sales_goal: Number(campaignFormGoal.value || 0),
    expected_leads_goal: campaignFormLeadsGoal.value ? Number(campaignFormLeadsGoal.value) : null,
    expected_redemptions_goal: campaignFormRedemptionsGoal.value ? Number(campaignFormRedemptionsGoal.value) : null,
    starts_at: campaignFormStartsAt.value ? new Date(campaignFormStartsAt.value).toISOString() : null,
    ends_at: campaignFormEndsAt.value ? new Date(campaignFormEndsAt.value).toISOString() : null,
    launch_channels: campaignChannels,
    client_notes: campaignFormClientNotes.value.trim() || null,
    delivered_assets: {
      landing_url: campaignFormLandingUrl.value.trim() || null,
      validator_url: campaignFormValidatorUrl.value.trim() || null,
      game_url: campaignFormGameUrl.value.trim() || null,
      primary_link: campaignFormPrimaryLink.value.trim() || null,
      qr_landing_url: campaignFormQrLandingUrl.value.trim() || null,
      creative_notes: campaignFormAssetNotes.value.trim() || null,
    },
  };

  campaignModalMessage.textContent = "Guardando...";

  try {
    if (state.campaignModalMode === "create") {
      const result = await api(isAdmin() ? "/api/admin/campaigns" : "/api/business/campaigns", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...payload,
          ...(isAdmin() ? { business_id: session.user.business_id } : {}),
        }),
      });
      state.selectedCampaignId = result.campaign?.id || state.selectedCampaignId;
      showFeedback("Campana creada. Ya aparece en el listado y queda disponible para asociar tickets, afiliados y paquetes.", "success", { title: "Campana disponible", timeout: 6500 });
    } else {
      await api(`${isAdmin() ? "/api/admin" : "/api/business"}/campaigns/${state.selectedCampaignId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      showFeedback("Campana actualizada. Los cambios ya se reflejan en el dashboard y en los selectores de tickets.", "success", { title: "Campana sincronizada", timeout: 6500 });
    }

    closeCampaignModal();
    await loadWorkspace();
    if (state.selectedCampaignId) {
      await selectCampaign(state.selectedCampaignId);
    }
    renderCampaignAssociationInputs();
    if (state.currentView === "strategic-qr" || state.strategicQrLoaded) {
      renderStrategicQrView();
    }
    if (!isAdmin()) {
      setView("campaigns");
    }
  } catch (error) {
    campaignModalMessage.textContent = error.message;
  }
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

const NEON_CHART = {
  cyan: "#00e5ff",
  aqua: "#7cfbff",
  magenta: "#ff2df7",
  yellow: "#f8e85a",
  green: "#00f5aa",
  axis: "rgba(124, 251, 255, 0.2)",
  grid: "rgba(124, 251, 255, 0.08)",
  label: "#a8c6d9",
  text: "#e9fbff",
  track: "rgba(124, 251, 255, 0.1)",
  panel: "#050f1f",
  panelAlt: "#07172b",
};

function paintChartSurface(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, NEON_CHART.panelAlt);
  gradient.addColorStop(1, NEON_CHART.panel);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(124, 251, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}

function drawAxes(ctx, left, top, width, height) {
  ctx.strokeStyle = NEON_CHART.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = NEON_CHART.grid;
  ctx.setLineDash([4, 10]);
  for (let index = 1; index <= 4; index += 1) {
    const y = top + (height / 5) * index;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLabel(ctx, text, x, y, options = {}) {
  ctx.fillStyle = options.color || NEON_CHART.label;
  ctx.font = `${options.weight || 500} ${options.size || 11}px ${options.font || "JetBrains Mono"}`;
  ctx.textAlign = options.align || "left";
  ctx.fillText(text, x, y);
}

function tooltipRow(label, value) {
  return `<div class="chart-tooltip-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function hideChartTooltip() {
  chartTooltip.classList.add("hidden");
}

function showChartTooltip(event, html) {
  chartTooltip.innerHTML = html;
  chartTooltip.classList.remove("hidden");
  chartTooltip.style.left = `${event.clientX}px`;
  chartTooltip.style.top = `${event.clientY}px`;
}

function hitChartShape(item, x, y) {
  if (item.type === "circle") {
    return Math.hypot(x - item.x, y - item.y) <= item.r;
  }
  if (item.type === "rect") {
    return x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height;
  }
  if (item.type === "arc") {
    const dx = x - item.cx;
    const dy = y - item.cy;
    const distance = Math.hypot(dx, dy);
    if (distance < item.innerRadius || distance > item.outerRadius) {
      return false;
    }
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) {
      angle += Math.PI * 2;
    }
    const normalized = angle < item.start ? angle + Math.PI * 2 : angle;
    return normalized >= item.start && normalized <= item.end;
  }
  return false;
}

function attachChartHover(canvas, items, formatter) {
  chartHoverRegistry.set(canvas, { items, formatter });
  if (canvas.dataset.hoverBound === "true") {
    return;
  }

  canvas.addEventListener("mousemove", (event) => {
    const registry = chartHoverRegistry.get(canvas);
    if (!registry?.items?.length) {
      hideChartTooltip();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = registry.items.find((item) => hitChartShape(item, x, y));
    if (!hit) {
      hideChartTooltip();
      return;
    }
    showChartTooltip(event, registry.formatter(hit));
  });

  canvas.addEventListener("mouseleave", hideChartTooltip);
  canvas.dataset.hoverBound = "true";
}

function drawDualLineChart(canvas, leftRows, rightRows, valueKey, labels, colors) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const margin = { top: 20, right: 16, bottom: 36, left: 40 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const merged = leftRows.map((row, index) => ({
    label: row.date,
    left: toNumber(row[valueKey]),
    right: toNumber(rightRows[index]?.[valueKey]),
  }));
  const hoverItems = [];

  if (!merged.length) {
    attachChartHover(canvas, [], () => "");
    drawLabel(ctx, "Sin datos", width / 2, height / 2, { align: "center", size: 14, font: "Inter" });
    return;
  }

  const max = Math.max(1, ...merged.flatMap((row) => [row.left, row.right]));
  drawAxes(ctx, margin.left, margin.top, chartW, chartH);

  [["left", colors[0]], ["right", colors[1]]].forEach(([key, color]) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    merged.forEach((row, index) => {
      const x = margin.left + (index / Math.max(1, merged.length - 1)) * chartW;
      const y = margin.top + chartH - (row[key] / max) * (chartH - 10);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      if (key === "left") {
        hoverItems.push({ type: "circle", x, y, r: 12, row });
      }
    });
    ctx.stroke();
    ctx.restore();
  });

  merged.forEach((row, index) => {
    if (index % 2 === 0) {
      const x = margin.left + (index / Math.max(1, merged.length - 1)) * chartW;
      drawLabel(ctx, formatDateShort(row.label), x, height - 12, { align: "center", size: 10 });
    }
  });

  drawLabel(ctx, labels[0], margin.left, 14, { color: colors[0] });
  drawLabel(ctx, labels[1], margin.left + 78, 14, { color: colors[1] });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(formatDateShort(item.row.label))}</div>
    ${tooltipRow(labels[0], item.row.left)}
    ${tooltipRow(labels[1], item.row.right)}
  `);
}

function drawTripleLineChart(canvas, firstRows, secondRows, thirdRows, valueKey, labels, colors, labelFormatter = (row) => row.date) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const margin = { top: 20, right: 16, bottom: 36, left: 40 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const merged = firstRows.map((row, index) => ({
    label: labelFormatter(row),
    first: toNumber(row[valueKey]),
    second: toNumber(secondRows[index]?.[valueKey]),
    third: toNumber(thirdRows[index]?.[valueKey]),
  }));
  const hoverItems = [];

  if (!merged.length) {
    attachChartHover(canvas, [], () => "");
    drawLabel(ctx, "Sin datos", width / 2, height / 2, { align: "center", size: 14, font: "Inter" });
    return;
  }

  const max = Math.max(1, ...merged.flatMap((row) => [row.first, row.second, row.third]));
  drawAxes(ctx, margin.left, margin.top, chartW, chartH);

  [["first", colors[0]], ["second", colors[1]], ["third", colors[2]]].forEach(([key, color]) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    merged.forEach((row, index) => {
      const x = margin.left + (index / Math.max(1, merged.length - 1)) * chartW;
      const y = margin.top + chartH - (row[key] / max) * (chartH - 10);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      if (key === "first") {
        hoverItems.push({ type: "circle", x, y, r: 12, row });
      }
    });
    ctx.stroke();
    ctx.restore();
  });

  merged.forEach((row, index) => {
    if (index % 3 === 0) {
      const x = margin.left + (index / Math.max(1, merged.length - 1)) * chartW;
      drawLabel(ctx, row.label, x, height - 12, { align: "center", size: 10 });
    }
  });

  drawLabel(ctx, labels[0], margin.left, 14, { color: colors[0] });
  drawLabel(ctx, labels[1], margin.left + 54, 14, { color: colors[1] });
  drawLabel(ctx, labels[2], margin.left + 146, 14, { color: colors[2] });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(item.row.label)}</div>
    ${tooltipRow(labels[0], item.row.first)}
    ${tooltipRow(labels[1], item.row.second)}
    ${tooltipRow(labels[2], item.row.third)}
  `);
}

function drawSimpleLineChart(canvas, rows, color, legend) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const margin = { top: 20, right: 16, bottom: 40, left: 40 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const hoverItems = [];

  if (!rows.length) {
    attachChartHover(canvas, [], () => "");
    drawLabel(ctx, "Sin datos", width / 2, height / 2, { align: "center", size: 14, font: "Inter" });
    return;
  }

  const max = Math.max(1, ...rows.map((row) => row.value));
  drawAxes(ctx, margin.left, margin.top, chartW, chartH);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  rows.forEach((row, index) => {
    const x = margin.left + (index / Math.max(1, rows.length - 1)) * chartW;
    const y = margin.top + chartH - (row.value / max) * (chartH - 18);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();

  rows.forEach((row, index) => {
    const x = margin.left + (index / Math.max(1, rows.length - 1)) * chartW;
    const y = margin.top + chartH - (row.value / max) * (chartH - 18);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    hoverItems.push({ type: "circle", x, y, r: 12, row });
    drawLabel(ctx, row.label.slice(0, 8), x, height - 12, { align: "center", size: 10 });
  });

  drawLabel(ctx, legend, margin.left, 14, { color });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(item.row.label)}</div>
    ${tooltipRow(legend, money(item.row.value))}
  `);
}

function drawHorizontalBars(canvas, rows, color) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const margin = { top: 18, right: 18, bottom: 18, left: 156 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const visibleRows = rows.slice(0, 6);
  const hoverItems = [];

  if (!visibleRows.length) {
    attachChartHover(canvas, [], () => "");
    drawLabel(ctx, "Sin datos", width / 2, height / 2, { align: "center", size: 14, font: "Inter" });
    return;
  }

  const max = Math.max(1, ...visibleRows.map((row) => row.value));
  const rowH = chartH / visibleRows.length;

  visibleRows.forEach((row, index) => {
    const y = margin.top + index * rowH + 8;
    const barH = Math.max(20, rowH - 18);
    const barW = (row.value / max) * chartW;
    ctx.fillStyle = NEON_CHART.track;
    ctx.fillRect(margin.left, y, chartW, barH);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.fillRect(margin.left, y, barW, barH);
    ctx.restore();
    hoverItems.push({ type: "rect", x: margin.left, y, width: chartW, height: barH, row });
    drawLabel(ctx, row.label.slice(0, 22), margin.left - 10, y + barH / 2 + 4, { align: "right", size: 11 });
    drawLabel(ctx, String(row.meta || row.value), margin.left + barW + 8, y + barH / 2 + 4, { size: 11, color: NEON_CHART.text });
  });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(item.row.label)}</div>
    ${tooltipRow("Valor principal", item.row.valueLabel || item.row.value)}
    ${tooltipRow("Contexto", item.row.meta || "-")}
  `);
}

function drawDonutChart(canvas, rows, colors) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const visibleRows = rows.filter((row) => row.value > 0);
  const hoverItems = [];

  if (!visibleRows.length) {
    attachChartHover(canvas, [], () => "");
    drawLabel(ctx, "Sin datos", width / 2, height / 2, { align: "center", size: 14, font: "Inter" });
    return;
  }

  const total = visibleRows.reduce((sum, row) => sum + row.value, 0);
  const radius = Math.min(width, height) * 0.24;
  const centerX = width * 0.3;
  const centerY = height * 0.52;
  let start = -Math.PI / 2;

  visibleRows.forEach((row, index) => {
    const angle = (row.value / total) * Math.PI * 2;
    const color = colors[index % colors.length];
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = radius * 0.55;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, start, start + angle);
    ctx.stroke();
    ctx.restore();
    hoverItems.push({
      type: "arc",
      cx: centerX,
      cy: centerY,
      innerRadius: radius - (radius * 0.55) / 2,
      outerRadius: radius + (radius * 0.55) / 2,
      start,
      end: start + angle,
      row,
      total,
    });
    start += angle;
  });

  drawLabel(ctx, `${total}`, centerX, centerY + 6, { align: "center", size: 26, font: "Inter", weight: 700, color: NEON_CHART.text });
  drawLabel(ctx, "total", centerX, centerY + 26, { align: "center", size: 11 });

  visibleRows.slice(0, 5).forEach((row, index) => {
    const y = 44 + index * 34;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(width * 0.58, y - 10, 14, 14);
    drawLabel(ctx, row.label, width * 0.58 + 22, y, { size: 11 });
    drawLabel(ctx, `${row.value}`, width - 24, y, { align: "right", size: 11, color: NEON_CHART.text });
  });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(item.row.label)}</div>
    ${tooltipRow("Cantidad", item.row.value)}
    ${tooltipRow("Participacion", `${safeRate(item.row.value, item.total)}%`)}
  `);
}

function drawGroupedBars(canvas, rows, series) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const margin = { top: 18, right: 18, bottom: 44, left: 40 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const hoverItems = [];

  if (!rows.length) {
    attachChartHover(canvas, [], () => "");
    drawLabel(ctx, "Sin datos", width / 2, height / 2, { align: "center", size: 14, font: "Inter" });
    return;
  }

  const max = Math.max(1, ...rows.flatMap((row) => series.map((item) => toNumber(row[item.key]))));
  drawAxes(ctx, margin.left, margin.top, chartW, chartH);

  const groupW = chartW / rows.length;
  const barW = Math.min(28, (groupW - 16) / series.length);

  rows.forEach((row, rowIndex) => {
    const xBase = margin.left + rowIndex * groupW + 10;
    series.forEach((item, itemIndex) => {
      const value = toNumber(row[item.key]);
      const barH = (value / max) * (chartH - 12);
      const x = xBase + itemIndex * (barW + 8);
      const y = margin.top + chartH - barH;
      ctx.save();
      ctx.fillStyle = item.color;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 12;
      ctx.fillRect(x, y, barW, barH);
      ctx.restore();
      hoverItems.push({
        type: "rect",
        x,
        y,
        width: barW,
        height: barH,
        row,
        series: item,
        value,
      });
    });
    drawLabel(ctx, row.label, xBase + groupW / 2 - 6, height - 12, { align: "center", size: 10 });
  });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(item.row.label)}</div>
    ${tooltipRow(item.series.label || item.series.key, item.value)}
  `);
}

function drawRadarChart(canvas, dimensions = []) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const points = dimensions.length ? dimensions : [{ label: "Sin datos", score: 0 }];
  const centerX = width / 2;
  const centerY = height / 2 + 8;
  const radius = Math.min(width, height) * 0.34;
  [0.25, 0.5, 0.75, 1].forEach((scale) => {
    ctx.beginPath();
    points.forEach((_, index) => {
      const angle = (Math.PI * 2 * index) / points.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius * scale;
      const y = centerY + Math.sin(angle) * radius * scale;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = NEON_CHART.grid;
    ctx.stroke();
  });
  points.forEach((point, index) => {
    const angle = (Math.PI * 2 * index) / points.length - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
    ctx.strokeStyle = NEON_CHART.grid;
    ctx.stroke();
    drawLabel(ctx, point.label.slice(0, 15), centerX + Math.cos(angle) * (radius + 42), centerY + Math.sin(angle) * (radius + 26), { align: "center", size: 10, color: NEON_CHART.label });
  });
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(0, 245, 170, 0.58)");
  gradient.addColorStop(1, "rgba(0, 229, 255, 0.32)");
  ctx.beginPath();
  points.forEach((point, index) => {
    const angle = (Math.PI * 2 * index) / points.length - Math.PI / 2;
    const scaled = radius * (Math.max(0, Math.min(100, toNumber(point.score))) / 100);
    const x = centerX + Math.cos(angle) * scaled;
    const y = centerY + Math.sin(angle) * scaled;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = NEON_CHART.green;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawMultiLineChart(canvas, rows = [], series = []) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const margin = { top: 26, right: 20, bottom: 44, left: 46 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const hoverItems = [];
  if (!rows.length || !series.length) {
    attachChartHover(canvas, [], () => "");
    drawLabel(ctx, "Sin datos", width / 2, height / 2, { align: "center", size: 14, font: "Inter" });
    return;
  }
  drawAxes(ctx, margin.left, margin.top, chartW, chartH);
  series.forEach((serie, serieIndex) => {
    const max = Math.max(1, ...rows.map((row) => toNumber(row[serie.key])));
    ctx.strokeStyle = serie.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    rows.forEach((row, index) => {
      const x = margin.left + (chartW * index) / Math.max(1, rows.length - 1);
      const y = margin.top + chartH - (toNumber(row[serie.key]) / max) * chartH;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      hoverItems.push({ x, y, r: 9, row, serie, type: "circle" });
    });
    ctx.stroke();
    drawLabel(ctx, serie.label, margin.left + serieIndex * 96, 16, { color: serie.color, size: 11 });
  });
  rows.forEach((row, index) => {
    if (index % Math.max(1, Math.ceil(rows.length / 6)) === 0) {
      const x = margin.left + (chartW * index) / Math.max(1, rows.length - 1);
      drawLabel(ctx, formatDateShort(row.date), x, height - 12, { align: "center", size: 10 });
    }
  });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(formatDateShort(item.row.date))}</div>
    ${series.map((serie) => tooltipRow(serie.label, serie.scale === "money" ? money(item.row[serie.key]) : item.row[serie.key])).join("")}
  `);
}

function drawScatterPlot(canvas, rows = []) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const margin = { top: 24, right: 26, bottom: 42, left: 54 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const points = rows.filter((row) => toNumber(row.qr_generated || row.investment || row.revenue || row.sales) > 0);
  if (!points.length) {
    attachChartHover(canvas, [], () => "");
    drawLabel(ctx, "Sin datos", width / 2, height / 2, { align: "center", size: 14, font: "Inter" });
    return;
  }
  drawAxes(ctx, margin.left, margin.top, chartW, chartH);
  const maxX = Math.max(1, ...points.map((row) => toNumber(row.investment || row.qr_generated)));
  const maxY = Math.max(1, ...points.map((row) => toNumber(row.revenue || row.sales)));
  const maxSize = Math.max(1, ...points.map((row) => toNumber(row.leads)));
  const hoverItems = [];
  points.slice(0, 24).forEach((row) => {
    const x = margin.left + (toNumber(row.investment || row.qr_generated) / maxX) * chartW;
    const y = margin.top + chartH - (toNumber(row.revenue || row.sales) / maxY) * chartH;
    const r = 6 + (toNumber(row.leads) / maxSize) * 16;
    ctx.beginPath();
    ctx.fillStyle = row.roi > 0 ? "rgba(0, 245, 170, 0.72)" : "rgba(248, 232, 90, 0.68)";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 16;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    hoverItems.push({ type: "circle", x, y, r: r + 4, row });
  });
  drawLabel(ctx, "Inversion o Tickets generados", margin.left + chartW / 2, height - 10, { align: "center", size: 10 });
  drawLabel(ctx, "Revenue / ventas", 12, margin.top + chartH / 2, { size: 10 });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(item.row.campaign_name)}</div>
    ${tooltipRow("Revenue", money(item.row.revenue))}
    ${tooltipRow("Leads", item.row.leads)}
    ${tooltipRow("Redencion", `${item.row.redemption_rate}%`)}
    ${tooltipRow("ROI", ratioLabel(item.row.roi))}
  `);
}

function drawWaterfallChart(canvas, rows = []) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  paintChartSurface(ctx, width, height);
  const data = rows.filter((row) => toNumber(row.value) > 0).slice(0, 8);
  if (!data.length) {
    attachChartHover(canvas, [], () => "");
    drawLabel(ctx, "Sin datos", width / 2, height / 2, { align: "center", size: 14, font: "Inter" });
    return;
  }
  const margin = { top: 24, right: 20, bottom: 54, left: 44 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const max = Math.max(1, ...data.map((row) => toNumber(row.value)));
  const barW = (chartW / data.length) * 0.64;
  const hoverItems = [];
  data.forEach((row, index) => {
    const x = margin.left + index * (chartW / data.length) + (chartW / data.length - barW) / 2;
    const h = (toNumber(row.value) / max) * chartH;
    const y = margin.top + chartH - h;
    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, index === 0 ? NEON_CHART.green : NEON_CHART.cyan);
    gradient.addColorStop(1, "rgba(7, 18, 31, 0.36)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barW, h);
    drawLabel(ctx, money(row.value), x + barW / 2, y - 6, { align: "center", size: 10, color: NEON_CHART.text });
    drawLabel(ctx, row.label.slice(0, 12), x + barW / 2, height - 16, { align: "center", size: 10 });
    hoverItems.push({ type: "rect", x, y, width: barW, height: h, row });
  });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(item.row.label)}</div>
    ${tooltipRow("Revenue", money(item.row.value))}
  `);
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(name, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dataUrlToBlob(dataUrl) {
  const [header = "", body = ""] = String(dataUrl || "").split(",");
  const mimeMatch = header.match(/^data:([^;]+)(;base64)?/i);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const isBase64 = Boolean(mimeMatch?.[2]);
  const binary = isBase64 ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function triggerBlobDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filenameForDataUrl(filename, dataUrl) {
  const value = String(dataUrl || "");
  if (value.startsWith("data:image/png")) {
    return filename.replace(/\.[^.]+$/, "") + ".png";
  }
  if (value.startsWith("data:image/jpeg") || value.startsWith("data:image/jpg")) {
    return filename.replace(/\.[^.]+$/, "") + ".jpg";
  }
  if (value.startsWith("data:image/svg+xml")) {
    return filename.replace(/\.[^.]+$/, "") + ".svg";
  }
  return filename;
}

async function convertSvgDataUrlToPngBlob(dataUrl) {
  const image = await loadImageDataUrl(dataUrl);
  if (!image) {
    throw new Error("No se pudo preparar el ticket como imagen.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width || 1080;
  canvas.height = image.naturalHeight || image.height || 1350;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("No se pudo convertir el ticket a PNG."));
      }
    }, "image/png", 0.96);
  });
}

async function ticketImageDataUrlForBrowser(dataUrl) {
  const value = String(dataUrl || "");
  if (!value.startsWith("data:image/svg+xml")) {
    return value;
  }
  try {
    const pngBlob = await convertSvgDataUrlToPngBlob(value);
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(pngBlob);
    });
  } catch (error) {
    console.warn("No se pudo preparar vista PNG del ticket.", error);
    return value;
  }
}

async function downloadDataUrl(filename, dataUrl) {
  const value = String(dataUrl || "");
  if (!value.startsWith("data:")) {
    const link = document.createElement("a");
    link.href = value;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  if (value.startsWith("data:image/svg+xml")) {
    try {
      const pngBlob = await convertSvgDataUrlToPngBlob(value);
      triggerBlobDownload(filename.replace(/\.[^.]+$/, "") + ".png", pngBlob);
      return;
    } catch (error) {
      console.warn("No se pudo convertir SVG a PNG; descargando SVG original.", error);
    }
  }

  triggerBlobDownload(filenameForDataUrl(filename, value), dataUrlToBlob(value));
}

function loadImageDataUrl(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!String(src).startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function affiliatePhotoSource(affiliate) {
  return affiliate?.photo_data_url
    || affiliate?.photoDataUrl
    || affiliate?.photo_url
    || affiliate?.image_data_url
    || affiliate?.card_metadata?.photo_data_url
    || affiliateCapturedPhotoDataUrl
    || "";
}

function businessLogoSource(affiliate) {
  return businessProfileLogoSource()
    || affiliate?.business_logo_data_url
    || affiliate?.logo_data_url
    || affiliate?.business_settings?.logo_data_url
    || "";
}

function businessProfileLogoSource() {
  return state.businessProfile?.logo_data_url
    || session?.user?.business?.logo_data_url
    || session?.user?.business?.settings?.logo_data_url
    || businessLogoPreview?.querySelector("img")?.getAttribute("src")
    || accountLogoPreview?.querySelector("img")?.getAttribute("src")
    || "";
}

function firstTextValue(...values) {
  const match = values.find((value) => String(value || "").trim());
  return match ? String(match).trim() : "";
}

function businessCardProfile(affiliate = {}) {
  const business = state.businessProfile || session?.user?.business || {};
  const settings = {
    ...(affiliate?.business_settings || {}),
    ...(business?.settings || {}),
  };
  return {
    name: firstTextValue(affiliate.business_name, business.name, settings.name, session?.user?.business_name, "NEGOCIO"),
    slogan: firstTextValue(business.slogan, settings.slogan, settings.tagline, settings.business_slogan, affiliate.business_slogan),
    contactName: firstTextValue(business.contact_name, settings.contact_name, settings.contact),
    contactEmail: firstTextValue(business.contact_email, settings.contact_email, settings.email, affiliate.business_email),
    phone: firstTextValue(business.phone, settings.phone, settings.contact_phone, affiliate.business_phone),
    website: firstTextValue(business.website, settings.website, settings.site),
    city: firstTextValue(business.city, settings.city, settings.location),
    address: firstTextValue(business.address, settings.address, settings.business_address),
  };
}

function affiliateCardMetaText(affiliate = {}) {
  const businessProfile = businessCardProfile(affiliate);
  const points = toNumber(affiliate.points_total || affiliate.ledger_points || 0);
  const documentId = firstTextValue(affiliate.document_id, affiliate.document, "Sin documento");
  const qrToken = String(affiliate.qr_token || "").slice(0, 12);
  return `Negocio: ${businessProfile.name || "-"} | Documento: ${documentId} | Puntos: ${points} | Ticket: ${qrToken ? `${qrToken}...` : "sin ticket"}`;
}

function renderAffiliateSelectedSummary(affiliate = null) {
  if (!affiliateSelectedSummary) return;
  if (!affiliate) {
    affiliateSelectedSummary.innerHTML = '<div class="affiliate-selected-empty">Ningun afiliado seleccionado.</div>';
    return;
  }
  const businessProfile = businessCardProfile(affiliate);
  const qrToken = String(affiliate.qr_token || "");
  const rows = [
    ["Afiliado", firstTextValue(affiliate.full_name, affiliate.name, "-")],
    ["Documento", firstTextValue(affiliate.document_id, affiliate.document, "-")],
    ["Telefono", firstTextValue(affiliate.phone, "-")],
    ["Email", firstTextValue(affiliate.email, "-")],
    ["Puntos", toNumber(affiliate.points_total || affiliate.ledger_points || 0)],
    ["Negocio", firstTextValue(businessProfile.name, affiliate.business_name, "-")],
    ["Ticket afiliado", qrToken ? `${qrToken.slice(0, 16)}...` : "Sin token"],
  ];
  affiliateSelectedSummary.innerHTML = `
    <div class="affiliate-selected-head">
      <span class="status-chip ok">Afiliado seleccionado</span>
      <strong>${escapeHtml(firstTextValue(affiliate.full_name, affiliate.name, "Afiliado"))}</strong>
    </div>
    <dl class="affiliate-selected-grid">
      ${rows.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function affiliateQrSource(affiliate) {
  return affiliate?.qr_data_url
    || affiliate?.qrDataUrl
    || affiliate?.qr_image_data_url
    || affiliate?.qrImageDataUrl
    || affiliate?.card_metadata?.qr_data_url
    || "";
}

async function buildAffiliateCardDataUrl(affiliate) {
  const canvas = document.createElement("canvas");
  const logicalWidth = 1200;
  const logicalHeight = 760;
  const outputScale = 2;
  canvas.width = logicalWidth * outputScale;
  canvas.height = logicalHeight * outputScale;
  const ctx = canvas.getContext("2d");
  ctx.scale(outputScale, outputScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const width = logicalWidth;
  const height = logicalHeight;

  const drawCoverImage = (img, x, y, w, h) => {
    const imageWidth = img.naturalWidth || img.width;
    const imageHeight = img.naturalHeight || img.height;
    if (!imageWidth || !imageHeight) return;
    const scale = Math.max(w / imageWidth, h / imageHeight);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (imageWidth - sw) / 2;
    const sy = (imageHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  const getImageContentBounds = (img, options = {}) => {
    const imageWidth = img?.naturalWidth || img?.width;
    const imageHeight = img?.naturalHeight || img?.height;
    if (!imageWidth || !imageHeight || !options.trimWhite) {
      return { sx: 0, sy: 0, sw: imageWidth || 1, sh: imageHeight || 1 };
    }
    const trimCanvas = document.createElement("canvas");
    trimCanvas.width = imageWidth;
    trimCanvas.height = imageHeight;
    const trimContext = trimCanvas.getContext("2d", { willReadFrequently: true });
    trimContext.drawImage(img, 0, 0);
    const data = trimContext.getImageData(0, 0, imageWidth, imageHeight).data;
    let minX = imageWidth;
    let minY = imageHeight;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < imageHeight; y += 1) {
      for (let x = 0; x < imageWidth; x += 1) {
        const index = (y * imageWidth + x) * 4;
        const alpha = data[index + 3];
        const isWhite = data[index] > 244 && data[index + 1] > 244 && data[index + 2] > 244;
        if (alpha > 12 && !isWhite) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (minX > maxX || minY > maxY) {
      return { sx: 0, sy: 0, sw: imageWidth, sh: imageHeight };
    }
    const padding = 16;
    return {
      sx: Math.max(0, minX - padding),
      sy: Math.max(0, minY - padding),
      sw: Math.min(imageWidth, maxX + padding) - Math.max(0, minX - padding),
      sh: Math.min(imageHeight, maxY + padding) - Math.max(0, minY - padding),
    };
  };

  const drawContainedImage = (img, x, y, w, h, radius = 18, background = "#ffffff", options = {}) => {
    const imageWidth = img?.naturalWidth || img?.width;
    const imageHeight = img?.naturalHeight || img?.height;
    if (!imageWidth || !imageHeight) return false;
    let sourceImage = img;
    let bounds = getImageContentBounds(img, options);
    if (options.removeWhiteBackground) {
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.max(1, Math.round(bounds.sw));
      cropCanvas.height = Math.max(1, Math.round(bounds.sh));
      const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });
      cropContext.drawImage(img, bounds.sx, bounds.sy, bounds.sw, bounds.sh, 0, 0, cropCanvas.width, cropCanvas.height);
      const imageData = cropContext.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
      const pixels = imageData.data;
      let opaque = 0;
      let removableWhite = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        if (alpha <= 12) continue;
        opaque += 1;
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const isWhiteBackground = red > 242 && green > 242 && blue > 242 && Math.max(red, green, blue) - Math.min(red, green, blue) < 18;
        if (isWhiteBackground) removableWhite += 1;
      }
      const total = cropCanvas.width * cropCanvas.height;
      const hasWhiteBackground = opaque / total > 0.55 && removableWhite / Math.max(1, opaque) > 0.45;
      if (hasWhiteBackground) {
        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          if (pixels[index + 3] > 12 && red > 242 && green > 242 && blue > 242 && Math.max(red, green, blue) - Math.min(red, green, blue) < 18) {
            pixels[index + 3] = 0;
          }
        }
        cropContext.putImageData(imageData, 0, 0);
        sourceImage = cropCanvas;
        bounds = { sx: 0, sy: 0, sw: cropCanvas.width, sh: cropCanvas.height };
      }
    }
    const scale = Math.min(w / bounds.sw, h / bounds.sh);
    const drawW = bounds.sw * scale;
    const drawH = bounds.sh * scale;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
    ctx.fillStyle = background;
    ctx.fillRect(x, y, w, h);
    ctx.drawImage(sourceImage, bounds.sx, bounds.sy, bounds.sw, bounds.sh, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
    ctx.restore();
    return true;
  };

  const drawInitials = (value, x, y, w, h, options = {}) => {
    const initials = String(value || "Tickets")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "Tickets";
    ctx.save();
    ctx.fillStyle = options.background || "rgba(124, 251, 255, 0.14)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, options.radius || 18);
    ctx.fill();
    ctx.fillStyle = options.color || "#7cfbff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = options.font || "900 42px Inter, Arial, sans-serif";
    ctx.fillText(initials, x + w / 2, y + h / 2 + 2);
    ctx.restore();
  };

  const drawDarkQrImage = (img, x, y, size) => {
    const qrCanvas = document.createElement("canvas");
    qrCanvas.width = size;
    qrCanvas.height = size;
    const qrContext = qrCanvas.getContext("2d", { willReadFrequently: true });
    qrContext.imageSmoothingEnabled = false;
    qrContext.drawImage(img, 0, 0, size, size);
    const imageData = qrContext.getImageData(0, 0, size, size);
    const pixels = imageData.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];
      if (alpha <= 12) {
        pixels[index + 3] = 0;
        continue;
      }
      const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);
      if (luminance < 170) {
        pixels[index] = 248;
        pixels[index + 1] = 253;
        pixels[index + 2] = 255;
        pixels[index + 3] = 255;
      } else {
        pixels[index + 3] = 0;
      }
    }
    qrContext.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.fillStyle = "#020817";
    ctx.strokeStyle = "rgba(124, 251, 255, 0.42)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(124, 251, 255, 0.2)";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(x - 10, y - 10, size + 20, size + 20, 18);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 10);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, x, y, size, size);
    ctx.restore();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  };

  const fitTextLines = (text, maxWidth, maxLines) => {
    const words = String(text || "-").trim().split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      while (ctx.measureText(word).width > maxWidth && word.length > 4) {
        const chunkLength = Math.max(4, Math.floor(word.length * 0.72));
        lines.push(`${word.slice(0, chunkLength)}-`);
        word = word.slice(chunkLength);
      }
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
        return;
      }
      if (line) lines.push(line);
      line = word;
    });
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      while (ctx.measureText(`${kept[maxLines - 1]}...`).width > maxWidth && kept[maxLines - 1].length > 2) {
        kept[maxLines - 1] = kept[maxLines - 1].slice(0, -1);
      }
      kept[maxLines - 1] = `${kept[maxLines - 1]}...`;
      return kept;
    }
    return lines;
  };

  const points = toNumber(affiliate.points_total || affiliate.ledger_points || 0);
  const affiliateName = firstTextValue(affiliate.full_name, affiliate.name, affiliate.card_metadata?.full_name, "Afiliado");
  const affiliateDocument = firstTextValue(affiliate.document_id, affiliate.document, affiliate.card_metadata?.document_id, "Sin documento");
  const affiliatePhone = firstTextValue(affiliate.phone, affiliate.card_metadata?.phone, "Sin telefono");
  const affiliateEmail = firstTextValue(affiliate.email, affiliate.card_metadata?.email, "Sin email");
  const businessProfile = businessCardProfile(affiliate);
  const businessName = businessProfile.name;
  const businessSlogan = businessProfile.slogan;
  const businessContactLines = [
    businessProfile.contactName ? `Contacto: ${businessProfile.contactName}` : "",
    businessProfile.phone ? `Tel: ${businessProfile.phone}` : "",
    businessProfile.contactEmail ? `Email: ${businessProfile.contactEmail}` : "",
    businessProfile.website ? `Web: ${businessProfile.website}` : "",
    firstTextValue(businessProfile.address, businessProfile.city),
  ].filter(Boolean).slice(0, 3);
  const tokenPreview = String(affiliate.qr_token || "").slice(0, 16).toUpperCase();
  const photoSource = affiliatePhotoSource(affiliate);
  const qrSource = affiliateQrSource(affiliate);
  const photo = await loadImageDataUrl(photoSource);
  const platformLogo = await loadImageDataUrl("/img/MGLogo-01.png");
  const qrImg = await loadImageDataUrl(qrSource);

  {
  const palette = {
    bg: "#07110f",
    card: "#101c1a",
    top: "#16392f",
    panel: "#142621",
    panelSoft: "#1c352d",
    ink: "#f7fff9",
    muted: "#b7ccc3",
    accent: "#74f7bf",
    gold: "#f4c84f",
    line: "rgba(116, 247, 191, 0.24)",
  };

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  const cardX = 38;
  const cardY = 38;
  const cardW = width - 76;
  const cardH = height - 76;
  ctx.fillStyle = palette.card;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.strokeStyle = "rgba(116, 247, 191, 0.54)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = palette.top;
  ctx.beginPath();
  ctx.roundRect(62, 62, width - 124, 178, 28);
  ctx.fill();
  ctx.fillStyle = "rgba(244, 200, 79, 0.12)";
  ctx.fillRect(62, 218, width - 124, 22);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = palette.gold;
  ctx.font = "900 15px Inter, Arial, sans-serif";
  ctx.fillText("CARNET DE AFILIADO", 92, 104);
  ctx.fillStyle = palette.ink;
  ctx.font = "900 66px Inter, Arial, sans-serif";
  fitTextLines(affiliateName, 760, 1).forEach((line, index) => {
    ctx.fillText(line, 90, 168 + index * 58);
  });
  ctx.fillStyle = palette.muted;
  ctx.font = "800 18px Inter, Arial, sans-serif";
  ctx.fillText("Identificacion comercial y acumulacion de puntos", 92, 206);

  ctx.textAlign = "right";
  ctx.fillStyle = palette.accent;
  ctx.font = "900 16px Inter, Arial, sans-serif";
  ctx.fillText("MARKET GAMES", width - 92, 104);
  ctx.fillStyle = palette.ink;
  ctx.font = "900 48px Inter, Arial, sans-serif";
  ctx.fillText(String(points), width - 92, 164);
  ctx.fillStyle = palette.gold;
  ctx.font = "900 14px Inter, Arial, sans-serif";
  ctx.fillText("PUNTOS", width - 92, 190);

  const drawPanel = (x, y, w, h, fill = palette.panel) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 28);
    ctx.fill();
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  const companyX = 76;
  const companyY = 278;
  const companyW = 284;
  const companyH = 340;
  drawPanel(companyX, companyY, companyW, companyH, palette.panelSoft);

  drawInitials(businessName, companyX + 28, companyY + 28, 96, 96, {
    background: "#0d1f1b",
    color: palette.accent,
    radius: 26,
    font: "900 40px Inter, Arial, sans-serif",
  });
  ctx.textAlign = "left";
  ctx.fillStyle = palette.gold;
  ctx.font = "900 13px Inter, Arial, sans-serif";
  ctx.fillText("EMPRESA", companyX + 30, companyY + 158);
  ctx.fillStyle = palette.ink;
  ctx.font = "900 31px Inter, Arial, sans-serif";
  fitTextLines(businessName, companyW - 60, 2).forEach((line, index) => {
    ctx.fillText(line, companyX + 30, companyY + 198 + index * 34);
  });
  ctx.fillStyle = palette.muted;
  ctx.font = "800 17px Inter, Arial, sans-serif";
  fitTextLines(businessSlogan || "Programa de afiliados", companyW - 60, 2).forEach((line, index) => {
    ctx.fillText(line, companyX + 30, companyY + 270 + index * 24);
  });
  if (businessContactLines.length) {
    ctx.fillStyle = palette.accent;
    ctx.font = "800 13px Inter, Arial, sans-serif";
    fitTextLines(businessContactLines[0], companyW - 60, 1).forEach((line) => {
      ctx.fillText(line, companyX + 30, companyY + 318);
    });
  }

  const dataX = 394;
  const dataY = 278;
  const dataW = 450;
  const dataH = 340;
  drawPanel(dataX, dataY, dataW, dataH, "rgba(8, 21, 18, 0.62)");

  ctx.textAlign = "left";
  ctx.fillStyle = palette.accent;
  ctx.font = "900 15px Inter, Arial, sans-serif";
  ctx.fillText("DATOS DEL AFILIADO", dataX + 30, dataY + 46);

  const drawCardField = (label, value, x, y, fieldW, valueSize = 29) => {
    const displayValue = String(value || "-").trim() || "-";
    ctx.fillStyle = palette.gold;
    ctx.font = "900 13px Inter, Arial, sans-serif";
    ctx.fillText(label.toUpperCase(), x, y);
    ctx.fillStyle = palette.ink;
    let fittedSize = valueSize;
    ctx.font = `900 ${fittedSize}px Inter, Arial, sans-serif`;
    while (fittedSize > 18 && ctx.measureText(displayValue).width > fieldW) {
      fittedSize -= 1;
      ctx.font = `900 ${fittedSize}px Inter, Arial, sans-serif`;
    }
    if (ctx.measureText(displayValue).width <= fieldW) {
      ctx.fillText(displayValue, x, y + fittedSize + 8);
      return;
    }
    fitTextLines(displayValue, fieldW, 1).forEach((line) => ctx.fillText(line, x, y + fittedSize + 8));
  };

  drawCardField("Documento", affiliateDocument, dataX + 30, dataY + 94, 202, 26);
  drawCardField("Telefono", affiliatePhone, dataX + 262, dataY + 94, 158, 26);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
  ctx.beginPath();
  ctx.moveTo(dataX + 30, dataY + 158);
  ctx.lineTo(dataX + dataW - 30, dataY + 158);
  ctx.stroke();
  drawCardField("Email", affiliateEmail, dataX + 30, dataY + 196, dataW - 60, 28);
  drawCardField("Codigo de afiliado", tokenPreview || "SIN TOKEN", dataX + 30, dataY + 278, dataW - 60, 27);

  const qrX = 878;
  const qrY = 278;
  const qrW = 246;
  const qrH = 340;
  drawPanel(qrX, qrY, qrW, qrH, palette.panelSoft);
  const qrPaperSize = 188;
  const qrPaperX = qrX + (qrW - qrPaperSize) / 2;
  const qrPaperY = qrY + 34;
  if (qrImg) {
    drawDarkQrImage(qrImg, qrPaperX + 14, qrPaperY + 14, qrPaperSize - 28);
  } else {
    ctx.fillStyle = "#0b2a22";
    ctx.beginPath();
    ctx.roundRect(qrPaperX + 14, qrPaperY + 14, qrPaperSize - 28, qrPaperSize - 28, 18);
    ctx.fill();
    ctx.fillStyle = palette.accent;
    ctx.textAlign = "center";
    ctx.font = "900 28px Inter, Arial, sans-serif";
    ctx.fillText("SIN TICKET", qrX + qrW / 2, qrPaperY + 122);
  }
  ctx.textAlign = "center";
  ctx.fillStyle = palette.accent;
  ctx.font = "900 18px Inter, Arial, sans-serif";
  ctx.fillText("TICKET DEL AFILIADO", qrX + qrW / 2, qrY + 258);
  ctx.fillStyle = palette.muted;
  ctx.font = "800 13px Inter, Arial, sans-serif";
  fitTextLines("Escanear para identificar afiliado y registrar puntos.", qrW - 42, 2).forEach((line, index) => {
    ctx.fillText(line, qrX + qrW / 2, qrY + 290 + index * 19);
  });

  ctx.fillStyle = "rgba(116, 247, 191, 0.08)";
  ctx.beginPath();
  ctx.roundRect(76, 646, width - 152, 46, 18);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.fillStyle = palette.muted;
  ctx.font = "900 15px Inter, Arial, sans-serif";
  const footerText = businessContactLines.length ? businessContactLines.join(" | ") : "Contacto del negocio no registrado";
  fitTextLines(footerText, 820, 1).forEach((line) => ctx.fillText(line, 96, 674));
  ctx.textAlign = "right";
  ctx.fillStyle = palette.accent;
  ctx.font = "900 14px Inter, Arial, sans-serif";
  ctx.fillText("VENTAS REALES, PUNTOS REALES", width - 96, 674);

  return canvas.toDataURL("image/png");
  }

  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#020617");
  bgGradient.addColorStop(0.5, "#061a2c");
  bgGradient.addColorStop(1, "#001f25");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(124, 251, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let x = 90; x < width; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 260, height);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0, 229, 255, 0.14)";
  ctx.beginPath();
  ctx.arc(1060, 92, 230, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 45, 247, 0.12)";
  ctx.beginPath();
  ctx.arc(94, 710, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "rgba(0, 229, 255, 0.22)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "rgba(3, 12, 28, 0.92)";
  ctx.strokeStyle = "rgba(124, 251, 255, 0.36)";
  ctx.lineWidth = 2;
  ctx.roundRect(42, 42, 1116, 676, 36);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  const headerGradient = ctx.createLinearGradient(52, 54, 1148, 170);
  headerGradient.addColorStop(0, "rgba(0, 229, 255, 0.18)");
  headerGradient.addColorStop(0.52, "rgba(0, 216, 160, 0.08)");
  headerGradient.addColorStop(1, "rgba(255, 45, 247, 0.14)");
  ctx.fillStyle = headerGradient;
  ctx.roundRect(58, 58, 1084, 128, 30);
  ctx.fill();

  const brandBadgeX = 82;
  const brandBadgeY = 76;
  const brandBadgeSize = 86;
  ctx.fillStyle = "rgba(2, 8, 23, 0.88)";
  ctx.strokeStyle = "rgba(124, 251, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.roundRect(brandBadgeX, brandBadgeY, brandBadgeSize, brandBadgeSize, 24);
  ctx.fill();
  ctx.stroke();
  drawInitials(businessName, brandBadgeX + 10, brandBadgeY + 10, brandBadgeSize - 20, brandBadgeSize - 20, {
    background: "rgba(124, 251, 255, 0.11)",
    color: "#7cfbff",
    radius: 18,
    font: "900 34px Inter, Arial, sans-serif",
  });

  ctx.textAlign = "left";
  ctx.fillStyle = "#f8fdff";
  ctx.font = "900 34px Inter, Arial, sans-serif";
  const businessNameLines = fitTextLines(businessName, 568, 2);
  businessNameLines.forEach((line, index) => {
    ctx.fillText(line, 196, 101 + index * 36);
  });

  const brandMetaY = businessNameLines.length > 1 ? 166 : 134;
  ctx.fillStyle = businessSlogan ? "#b8d3df" : "#7cfbff";
  ctx.font = businessSlogan ? "800 17px Inter, Arial, sans-serif" : "900 15px Inter, Arial, sans-serif";
  fitTextLines(businessSlogan || "EMPRESA EMISORA DEL CARNET", 568, 1).forEach((line) => {
    ctx.fillText(line, 196, brandMetaY);
  });

  const contactX = 790;
  const contactY = 78;
  const contactW = 326;
  const contactH = 88;
  ctx.fillStyle = "rgba(2, 8, 23, 0.58)";
  ctx.strokeStyle = "rgba(124, 251, 255, 0.26)";
  ctx.roundRect(contactX, contactY, contactW, contactH, 22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#7cfbff";
  ctx.font = "900 12px Inter, Arial, sans-serif";
  ctx.fillText("CONTACTO EMPRESA", contactX + 20, contactY + 25);
  ctx.fillStyle = "#f8fdff";
  ctx.font = "800 14px Inter, Arial, sans-serif";
  (businessContactLines.length ? businessContactLines : ["Contacto no registrado"]).forEach((line, index) => {
    fitTextLines(line, contactW - 40, 1).forEach((text) => {
      ctx.fillText(text, contactX + 20, contactY + 49 + index * 19);
    });
  });

  const photoX = 78;
  const photoY = 226;
  const photoW = 260;
  const photoH = 346;
  const infoX = 382;
  const infoY = 244;
  const qrX = 850;
  const qrY = 244;
  const qrSize = 252;

  ctx.fillStyle = "rgba(2, 8, 23, 0.7)";
  ctx.strokeStyle = "rgba(124, 251, 255, 0.24)";
  ctx.lineWidth = 2;
  ctx.roundRect(photoX - 16, photoY - 16, photoW + 32, photoH + 84, 30);
  ctx.fill();
  ctx.stroke();

  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(photoX, photoY, photoW, photoH, 24);
    ctx.clip();
    drawCoverImage(photo, photoX, photoY, photoW, photoH);
    ctx.restore();
  } else {
    drawInitials(affiliateName || businessName, photoX, photoY, photoW, photoH, {
      background: "rgba(124, 251, 255, 0.1)",
      color: "#7cfbff",
      radius: 24,
      font: "900 64px Inter, Arial, sans-serif",
    });
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#7cfbff";
  ctx.font = "900 14px Inter, Arial, sans-serif";
  ctx.fillText("AFILIADO ACTIVO", photoX + photoW / 2, photoY + photoH + 38);
  ctx.fillStyle = "#a8c6d9";
  ctx.font = "700 13px Inter, Arial, sans-serif";
  ctx.fillText("Identificacion presencial y acumulacion", photoX + photoW / 2, photoY + photoH + 62);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(124, 251, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.roundRect(infoX - 24, 214, 464, 456, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 42px Inter, Arial, sans-serif";
  const nameLines = fitTextLines(affiliateName, 396, 2);
  nameLines.forEach((line, index) => {
    ctx.fillText(line, infoX, infoY + index * 46);
  });

  const nameBlockHeight = Math.max(1, nameLines.length) * 46;
  ctx.fillStyle = "#0369a1";
  ctx.font = "900 15px Inter, Arial, sans-serif";
  ctx.fillText("CARNET VERIFICADO", infoX, infoY + nameBlockHeight + 24);

  const infoRows = [
    ["Documento", affiliateDocument],
    ["Telefono", affiliatePhone],
    ["Email", affiliateEmail],
  ];
  infoRows.forEach(([label, value], index) => {
    const y = infoY + nameBlockHeight + 76 + index * 62;
    ctx.fillStyle = "#475569";
    ctx.font = "900 13px Inter, Arial, sans-serif";
    ctx.fillText(label.toUpperCase(), infoX, y);
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 21px Inter, Arial, sans-serif";
    fitTextLines(value, 390, 1).forEach((line) => ctx.fillText(line, infoX, y + 28));
  });

  ctx.fillStyle = "rgba(0, 229, 255, 0.1)";
  ctx.strokeStyle = "rgba(124, 251, 255, 0.24)";
  ctx.roundRect(infoX, 592, 188, 64, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0369a1";
  ctx.font = "900 13px Inter, Arial, sans-serif";
  ctx.fillText("PUNTOS", infoX + 20, 616);
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 28px Inter, Arial, sans-serif";
  ctx.fillText(String(points), infoX + 20, 646);

  ctx.fillStyle = "rgba(0, 216, 160, 0.1)";
  ctx.strokeStyle = "rgba(0, 216, 160, 0.24)";
  ctx.roundRect(infoX + 210, 592, 244, 64, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#047857";
  ctx.font = "900 13px Inter, Arial, sans-serif";
  ctx.fillText("REGLA", infoX + 230, 616);
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 19px Inter, Arial, sans-serif";
  ctx.fillText("1 punto / $1.000", infoX + 230, 646);

  ctx.fillStyle = "rgba(2, 8, 23, 0.82)";
  ctx.strokeStyle = "rgba(124, 251, 255, 0.44)";
  ctx.lineWidth = 2;
  ctx.roundRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 122, 30);
  ctx.fill();
  ctx.stroke();

  if (qrImg) {
    drawDarkQrImage(qrImg, qrX, qrY, qrSize);
  } else {
    ctx.fillStyle = "rgba(124, 251, 255, 0.1)";
    ctx.roundRect(qrX, qrY, qrSize, qrSize, 14);
    ctx.fill();
    ctx.fillStyle = "#7cfbff";
    ctx.font = "900 28px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SIN TICKET", qrX + qrSize / 2, qrY + 108);
    ctx.font = "800 14px JetBrains Mono, monospace";
    fitTextLines(tokenPreview || "SIN TOKEN", qrSize - 34, 2).forEach((line, index) => {
      ctx.fillText(line, qrX + qrSize / 2, qrY + 146 + index * 20);
    });
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#7cfbff";
  ctx.font = "900 16px Inter, Arial, sans-serif";
  ctx.fillText("CODIGO DEL AFILIADO", qrX + qrSize / 2, qrY + qrSize + 36);
  ctx.fillStyle = "#a8c6d9";
  ctx.font = "800 15px JetBrains Mono, monospace";
  ctx.fillText(`${tokenPreview || "SIN TOKEN"}...`, qrX + qrSize / 2, qrY + qrSize + 62);

  ctx.fillStyle = "rgba(124, 251, 255, 0.14)";
  ctx.roundRect(70, 680, 1060, 2, 1);
  ctx.fill();
  ctx.fillStyle = "#9bdcff";
  ctx.font = "800 15px Inter, Arial, sans-serif";
  ctx.fillText("Ticket permanente de afiliado. No redime premios.", width / 2, 706);
  if (platformLogo) {
    drawContainedImage(platformLogo, width - 204, 684, 138, 38, 8, "rgba(255, 255, 255, 0.03)", { trimWhite: true, removeWhiteBackground: true });
  } else {
    ctx.fillStyle = "#7cfbff";
    ctx.font = "900 13px Inter, Arial, sans-serif";
    ctx.fillText("MARKET GAMES", width - 156, 706);
  }
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la foto del afiliado."));
    reader.readAsDataURL(file);
  });
}

async function normalizeAffiliatePhotoDataUrl(source, options = {}) {
  const maxWidth = options.maxWidth || 700;
  const maxHeight = options.maxHeight || 900;
  const quality = options.quality || 0.86;
  const image = typeof source === "string"
    ? await loadImageDataUrl(source)
    : await new Promise((resolve) => {
        if (!source) {
          resolve(null);
          return;
        }
        const objectUrl = URL.createObjectURL(source);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        img.src = objectUrl;
      });

  if (!image) {
    return typeof source === "string" ? source : "";
  }

  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  if (!imageWidth || !imageHeight) {
    return typeof source === "string" ? source : "";
  }

  const scale = Math.min(1, maxWidth / imageWidth, maxHeight / imageHeight);
  const targetWidth = Math.max(1, Math.round(imageWidth * scale));
  const targetHeight = Math.max(1, Math.round(imageHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL(options.mimeType || "image/jpeg", quality);
}

function resetAffiliateForm() {
  affiliateCreateForm.reset();
  affiliateCapturedPhotoDataUrl = "";
  if (affiliatePhotoInput) affiliatePhotoInput.value = "";
  stopAffiliateCamera();
  syncAffiliatePhotoPreview("");
  affiliateCreateMessage.textContent = "";
}

function renderBusinessLogoPanel() {
  if (!businessLogoPreview) return;
  const business = state.businessProfile || session?.user?.business || null;
  const logo = business?.logo_data_url || "";
  if (businessLogoTitle) {
    businessLogoTitle.textContent = business?.name
      ? `${business.name}${logo ? " - logo cargado" : " - sin logo"}`
      : (logo ? "Logo cargado" : "Sin logo cargado");
  }
  businessLogoPreview.innerHTML = logo
    ? `<img src="${escapeHtml(logo)}" alt="Logo del negocio">`
    : '<span class="material-symbols-outlined">storefront</span>';
  if (businessLogoRemoveButton) businessLogoRemoveButton.disabled = !logo;
}

async function updateBusinessLogo(logoDataUrl) {
  if (!session?.user?.business_id) return;
  if (businessLogoMessage) businessLogoMessage.textContent = logoDataUrl ? "Guardando logo..." : "Quitando logo...";
  const data = await api("/api/business/profile", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ logo_data_url: logoDataUrl || "" }),
  });
  mergeBusinessProfile(data.business || null);
  if (session?.user?.business) {
    session.user.business.logo_data_url = data.business?.logo_data_url || "";
    session.user.business.settings = {
      ...(session.user.business.settings || {}),
      logo_data_url: data.business?.logo_data_url || "",
    };
  }
  renderAccountView();
  renderBusinessLogoPanel();
  if (state.selectedAffiliate) {
    await renderAffiliateCardPreview(state.selectedAffiliate);
  }
  if (businessLogoMessage) businessLogoMessage.textContent = logoDataUrl ? "Logo guardado." : "Logo eliminado.";
}

async function updateTicketFrame(frameDataUrl) {
  if (!session?.user?.business_id) return;
  if (accountTicketFrameMessage) {
    accountTicketFrameMessage.textContent = frameDataUrl ? "Guardando marco..." : "Quitando marco...";
  }
  const data = await api("/api/business/profile?includeLogo=1", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ ticket_frame_data_url: frameDataUrl || "" }),
  });
  mergeBusinessProfile(data.business || null);
  if (session?.user?.business) {
    session.user.business.ticket_frame_data_url = data.business?.ticket_frame_data_url || "";
    session.user.business.settings = {
      ...(session.user.business.settings || {}),
      ticket_frame_data_url: data.business?.ticket_frame_data_url || "",
    };
  }
  renderAccountView();
  if (accountTicketFrameMessage) {
    accountTicketFrameMessage.textContent = frameDataUrl ? "Marco guardado. Los proximos paquetes saldran brandeados." : "Marco eliminado.";
  }
}

function optionalInputValue(input) {
  const value = String(input?.value || "").trim();
  return value || null;
}

async function submitAccountProfile(event) {
  event.preventDefault();
  if (!session?.user?.business_id) return;
  setInlineMessage(accountProfileMessage, "Guardando datos...", "info");
  setButtonLoading(accountProfileSaveButton, true, "Guardando...");
  try {
    const data = await api("/api/business/profile", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        name: accountNameInput.value.trim(),
        slogan: optionalInputValue(accountSloganInput),
        contact_name: optionalInputValue(accountContactInput),
        contact_email: optionalInputValue(accountEmailInput),
        phone: optionalInputValue(accountPhoneInput),
        website: optionalInputValue(accountWebsiteInput),
        city: optionalInputValue(accountCityInput),
        address: optionalInputValue(accountAddressInput),
      }),
    });
    mergeBusinessProfile(data.business || null);
    renderAccountView();
    renderBusinessLogoPanel();
    setInlineMessage(accountProfileMessage, "Datos guardados.", "success");
    showFeedback("La informacion basica de la empresa fue actualizada.", "success", { title: "Perfil actualizado" });
  } catch (error) {
    setInlineMessage(accountProfileMessage, error.message || "No se pudo guardar el perfil.", "error");
    showFeedback(error.message || "No se pudo guardar el perfil.", "error");
  } finally {
    setButtonLoading(accountProfileSaveButton, false);
  }
}

async function submitAccountPassword(event) {
  event.preventDefault();
  if (accountNewPasswordInput.value !== accountNewPasswordConfirmInput.value) {
    setInlineMessage(accountPasswordMessage, "La confirmacion de password no coincide.", "error");
    return;
  }
  setInlineMessage(accountPasswordMessage, "Actualizando password...", "info");
  setButtonLoading(accountPasswordSaveButton, true, "Guardando...");
  try {
    const data = await api("/api/auth/password/change", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        current_password: accountCurrentPasswordInput.value,
        password: accountNewPasswordInput.value,
        password_confirm: accountNewPasswordConfirmInput.value,
      }),
    });
    accountPasswordForm.reset();
    setInlineMessage(accountPasswordMessage, data.message || "Password actualizado.", "success");
    showFeedback("Password actualizado correctamente.", "success", { title: "Seguridad actualizada" });
  } catch (error) {
    setInlineMessage(accountPasswordMessage, error.message || "No se pudo cambiar el password.", "error");
    showFeedback(error.message || "No se pudo cambiar el password.", "error");
  } finally {
    setButtonLoading(accountPasswordSaveButton, false);
  }
}

async function loadBusinessUsers() {
  if (!session?.user?.business_id) return;
  try {
    const data = await api("/api/business/users", { headers: authHeaders() });
    state.businessUsers = data.users || [];
    renderBusinessUsers();
  } catch (error) {
    state.businessUsers = [];
    renderBusinessUsers();
    showFeedback(error.message || "No se pudieron cargar los usuarios del negocio.", "error");
  }
}

async function submitAccountUser(event) {
  event.preventDefault();
  if (!isBusinessOwnerUser()) return;
  setInlineMessage(accountUserCreateMessage, "Creando usuario...", "info");
  setButtonLoading(accountUserCreateButton, true, "Creando...");
  try {
    const data = await api("/api/business/users", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        full_name: accountUserFullNameInput.value.trim(),
        email: accountUserEmailInput.value.trim(),
        role: accountUserRoleInput.value,
        password: accountUserPasswordInput.value,
      }),
    });
    state.businessUsers = [
      data.user,
      ...(state.businessUsers || []).filter((user) => user.id !== data.user.id),
    ];
    accountUserForm.reset();
    renderBusinessUsers();
    setInlineMessage(accountUserCreateMessage, "Usuario creado para este negocio.", "success");
    showFeedback("Usuario creado correctamente.", "success", { title: "Equipo actualizado" });
  } catch (error) {
    setInlineMessage(accountUserCreateMessage, error.message || "No se pudo crear el usuario.", "error");
    showFeedback(error.message || "No se pudo crear el usuario.", "error");
  } finally {
    setButtonLoading(accountUserCreateButton, false);
  }
}

async function toggleBusinessUser(userId, isActive) {
  if (!isBusinessOwnerUser() || !canDeactivateBusinessUsers() || !userId) return;
  try {
    const data = await api(`/api/business/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ is_active: Boolean(isActive) }),
    });
    state.businessUsers = (state.businessUsers || []).map((user) => (
      user.id === data.user.id ? data.user : user
    ));
    renderBusinessUsers();
    showFeedback(`Usuario ${data.user.is_active ? "activado" : "desactivado"}.`, "success", { title: "Equipo actualizado" });
  } catch (error) {
    showFeedback(error.message || "No se pudo actualizar el usuario.", "error");
  }
}

async function handleBusinessLogoFile(file) {
  if (!file) return;
  try {
    if (businessLogoMessage) businessLogoMessage.textContent = "Procesando logo...";
    const logoDataUrl = await normalizeAffiliatePhotoDataUrl(file, {
      maxWidth: 560,
      maxHeight: 360,
      quality: 0.82,
      mimeType: "image/webp",
    });
    if (!logoDataUrl) throw new Error("No se pudo procesar el logo. Usa JPG o PNG.");
    await updateBusinessLogo(logoDataUrl);
  } catch (error) {
    if (businessLogoMessage) businessLogoMessage.textContent = error.message || "No se pudo guardar el logo.";
  } finally {
    if (businessLogoInput) businessLogoInput.value = "";
  }
}

async function handleTicketFrameFile(file) {
  if (!file) return;
  try {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type || "")) {
      throw new Error("Usa una imagen PNG, JPG o WebP.");
    }
    if (accountTicketFrameMessage) accountTicketFrameMessage.textContent = "Procesando marco...";
    const keepPng = /^image\/png$/i.test(file.type || "");
    const frameDataUrl = await normalizeAffiliatePhotoDataUrl(file, {
      maxWidth: 1080,
      maxHeight: 1350,
      quality: 0.88,
      mimeType: keepPng ? "image/png" : "image/jpeg",
    });
    if (!frameDataUrl) throw new Error("No se pudo procesar el marco.");
    await updateTicketFrame(frameDataUrl);
  } catch (error) {
    if (accountTicketFrameMessage) {
      accountTicketFrameMessage.textContent = error.message || "No se pudo guardar el marco.";
    }
  } finally {
    if (accountTicketFrameInput) accountTicketFrameInput.value = "";
  }
}

async function ensureBusinessProfileForCard() {
  if (!session?.user?.business_id) return;
  if (state.businessProfile && (businessProfileLogoSource() || state.businessProfile.has_logo_data_url === false)) return;
  const data = await apiSafe("/api/business/profile?includeLogo=1", { headers: authHeaders() }, { business: null });
  if (data.business) {
    mergeBusinessProfile(data.business);
    renderAccountView();
    renderBusinessLogoPanel();
  }
}

async function renderAffiliateCardPreview(affiliate) {
  if (!affiliate) return;
  affiliateCardPreviewWrap?.classList.remove("is-empty");
  affiliateCardPreviewWrap?.classList.add("is-loading");
  try {
    await ensureBusinessProfileForCard();
    let renderAffiliate = affiliate;
    if (session?.user?.business_id && affiliate.id) {
      const detail = await api(`/api/portal/businesses/${session.user.business_id}/affiliates/${affiliate.id}`, { headers: authHeaders() });
      renderAffiliate = { ...affiliate, ...(detail.affiliate || {}) };
      renderAffiliate.business_logo_data_url = businessProfileLogoSource() || businessLogoSource(renderAffiliate) || "";
      state.selectedAffiliate = renderAffiliate;
      state.affiliates = (state.affiliates || []).map((item) => (item.id === renderAffiliate.id ? { ...item, ...renderAffiliate } : item));
    }
    const dataUrl = await buildAffiliateCardDataUrl(renderAffiliate);
    affiliateCardPreview.src = dataUrl;
    affiliateCardMeta.textContent = affiliateCardMetaText(renderAffiliate);
    affiliateCardPreviewWrap?.classList.remove("is-empty");
    return dataUrl;
  } catch (error) {
    affiliateCardMeta.textContent = error?.message || "No se pudo generar la vista previa del carnet.";
    affiliateCardPreviewWrap?.classList.add("is-empty");
    return "";
  } finally {
    affiliateCardPreviewWrap?.classList.remove("is-loading");
  }
}

let affiliateCameraStream = null;
let affiliateCapturedPhotoDataUrl = "";
let affiliatePhotoUiReady = false;

function getAffiliatePhotoField() {
  return affiliatePhotoInput?.closest("label") || affiliatePhotoInput?.closest(".field-group") || null;
}

function stopAffiliateCamera() {
  if (affiliateCameraStream) {
    affiliateCameraStream.getTracks().forEach((track) => track.stop());
    affiliateCameraStream = null;
  }
  const video = document.getElementById("affiliateCameraPreview");
  if (video) {
    video.srcObject = null;
  }
}

function syncAffiliateStepper() {
  const hasIdentity = Boolean(affiliateFullNameInput?.value.trim());
  const hasPhoto = Boolean(affiliateCapturedPhotoDataUrl || affiliatePhotoInput?.files?.[0]);
  const steps = document.querySelectorAll(".affiliate-step");
  steps.forEach((step, index) => {
    step.classList.toggle("is-active", (index === 0 && !hasIdentity) || (index === 1 && hasIdentity && !hasPhoto) || (index === 2 && hasIdentity && hasPhoto));
    step.classList.toggle("is-complete", (index === 0 && hasIdentity) || (index === 1 && hasPhoto));
  });
}

function syncAffiliatePhotoPreview(dataUrl) {
  const preview = document.getElementById("affiliatePhotoPreview");
  const video = document.getElementById("affiliateCameraPreview");
  const placeholder = document.getElementById("affiliatePhotoPlaceholder");
  const captureButton = document.getElementById("affiliateCapturePhotoButton");
  const retakeButton = document.getElementById("affiliateRetakePhotoButton");
  const startButton = document.getElementById("affiliateStartCameraButton");
  const uploadButton = document.getElementById("affiliateUploadPhotoButton");
  const capturePanel = document.querySelector(".affiliate-photo-capture");
  const submitButton = affiliateCreateForm?.querySelector('button[type="submit"]');
  const hasPhoto = Boolean(dataUrl);
  const hasCamera = Boolean(affiliateCameraStream);
  if (preview) {
    preview.src = dataUrl || "";
    preview.hidden = !hasPhoto;
  }
  if (video) {
    video.hidden = hasPhoto || !hasCamera;
  }
  if (placeholder) {
    placeholder.hidden = hasPhoto || hasCamera;
  }
  capturePanel?.classList.toggle("is-live", hasCamera && !hasPhoto);
  capturePanel?.classList.toggle("has-photo", hasPhoto);
  if (captureButton) {
    captureButton.disabled = !hasCamera || hasPhoto;
    captureButton.classList.toggle("is-primary-action", hasCamera && !hasPhoto);
  }
  if (retakeButton) {
    retakeButton.disabled = !hasPhoto && !hasCamera;
  }
  if (startButton) startButton.textContent = hasCamera ? "Camara activa" : "Abrir camara";
  if (uploadButton) uploadButton.textContent = hasPhoto ? "Cambiar foto" : "Subir foto";
  if (submitButton) {
    submitButton.textContent = "Crear afiliado y ticket";
  }
  syncAffiliateStepper();
}

async function openAffiliateCamera() {
  const startButton = document.getElementById("affiliateStartCameraButton");
  const captureButton = document.getElementById("affiliateCapturePhotoButton");
  const video = document.getElementById("affiliateCameraPreview");
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
    setFormMessage(affiliateCreateMessage, "La camara requiere HTTPS o localhost.", "error");
    return;
  }
  try {
    stopAffiliateCamera();
    affiliateCapturedPhotoDataUrl = "";
    affiliatePhotoInput.value = "";
    if (startButton) startButton.disabled = true;
    if (captureButton) captureButton.disabled = true;
    syncAffiliatePhotoPreview("");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    affiliateCameraStream = stream;
    if (video) {
      video.srcObject = stream;
      await video.play();
      video.hidden = false;
    }
    if (startButton) startButton.disabled = false;
    if (captureButton) captureButton.disabled = false;
    syncAffiliatePhotoPreview("");
    setFormMessage(affiliateCreateMessage, "Ajusta el rostro y toma la foto.", "success");
  } catch (error) {
    if (startButton) startButton.disabled = false;
    setFormMessage(affiliateCreateMessage, error?.message || "No se pudo abrir la camara.", "error");
  }
}

async function captureAffiliatePhoto() {
  const video = document.getElementById("affiliateCameraPreview");
  const canvas = document.createElement("canvas");
  if (!video || !video.videoWidth || !video.videoHeight) {
    setFormMessage(affiliateCreateMessage, "Primero abre la camara.", "error");
    return;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  affiliateCapturedPhotoDataUrl = await normalizeAffiliatePhotoDataUrl(canvas.toDataURL("image/jpeg", 0.92));
  affiliatePhotoInput.value = "";
  stopAffiliateCamera();
  syncAffiliatePhotoPreview(affiliateCapturedPhotoDataUrl);
  setFormMessage(affiliateCreateMessage, "Foto lista. Ya puedes crear el afiliado.", "success");
}

async function readAffiliatePhotoFile(file) {
  if (!file) return "";
  const normalized = await normalizeAffiliatePhotoDataUrl(file);
  if (!normalized) {
    throw new Error("No se pudo procesar la foto. Usa JPG o PNG.");
  }
  return normalized;
}

function setupAffiliatePhotoCaptureUi() {
  const field = getAffiliatePhotoField();
  if (!field || affiliatePhotoUiReady) return;
  field.classList.add("affiliate-original-photo-field");
  affiliatePhotoInput?.classList.add("affiliate-file-input");

  const stepper = document.createElement("div");
  stepper.className = "affiliate-stepper";
  stepper.setAttribute("aria-label", "Flujo de afiliado");
  stepper.innerHTML = `
    <div class="affiliate-step is-active">
      <span class="affiliate-step-number">1</span>
      <div><strong>Datos</strong><p>Nombre, documento y contacto.</p></div>
    </div>
    <div class="affiliate-step">
      <span class="affiliate-step-number">2</span>
      <div><strong>Foto</strong><p>Toma o sube una foto clara.</p></div>
    </div>
    <div class="affiliate-step">
      <span class="affiliate-step-number">3</span>
      <div><strong>Ticket permanente</strong><p>Se crea el carnet listo para enviar.</p></div>
    </div>`;
  field.parentElement?.insertBefore(stepper, field);

  const capturePanel = document.createElement("div");
  capturePanel.className = "affiliate-photo-capture";
  capturePanel.innerHTML = `
    <div id="affiliatePhotoPlaceholder" class="affiliate-photo-placeholder">
      <span class="material-symbols-outlined">photo_camera</span>
      <strong>Foto presencial del afiliado</strong>
      <p>Abre la camara, toma la foto y genera el carnet en el negocio.</p>
    </div>
    <video id="affiliateCameraPreview" class="affiliate-camera-preview" playsinline muted hidden></video>
    <img id="affiliatePhotoPreview" class="affiliate-photo-preview" alt="Vista previa de la foto del afiliado" hidden>`;
  field.parentElement?.insertBefore(capturePanel, field);

  const actions = document.createElement("div");
  actions.className = "affiliate-photo-actions";
  actions.innerHTML = `
    <button class="ghost-button" id="affiliateStartCameraButton" type="button">Abrir camara</button>
    <button class="ghost-button" id="affiliateCapturePhotoButton" type="button" disabled>Tomar foto</button>
    <button class="ghost-button" id="affiliateUploadPhotoButton" type="button">Subir foto</button>
    <button class="ghost-button" id="affiliateRetakePhotoButton" type="button" disabled>Repetir</button>`;
  field.parentElement?.insertBefore(actions, field);

  const footnote = document.createElement("p");
  footnote.className = "section-footnote";
  footnote.textContent = "El ticket se genera una sola vez y queda ligado al afiliado para siempre.";
  field.parentElement?.insertBefore(footnote, field.nextSibling);

  affiliatePhotoUiReady = true;

  document.getElementById("affiliateStartCameraButton")?.addEventListener("click", openAffiliateCamera);
  document.getElementById("affiliateCapturePhotoButton")?.addEventListener("click", captureAffiliatePhoto);
  document.getElementById("affiliateUploadPhotoButton")?.addEventListener("click", () => affiliatePhotoInput?.click());
  document.getElementById("affiliateRetakePhotoButton")?.addEventListener("click", async () => {
    affiliateCapturedPhotoDataUrl = "";
    affiliatePhotoInput.value = "";
    stopAffiliateCamera();
    syncAffiliatePhotoPreview("");
    setFormMessage(affiliateCreateMessage, "Foto eliminada. Abre la camara o sube otra foto.", "success");
  });
  affiliatePhotoInput?.addEventListener("change", async () => {
    try {
      const file = affiliatePhotoInput.files?.[0];
      affiliateCapturedPhotoDataUrl = file ? await readAffiliatePhotoFile(file) : "";
      if (affiliateCapturedPhotoDataUrl) {
        stopAffiliateCamera();
        syncAffiliatePhotoPreview(affiliateCapturedPhotoDataUrl);
        setFormMessage(affiliateCreateMessage, "Foto cargada. Ya puedes crear el afiliado.", "success");
      } else {
        syncAffiliatePhotoPreview("");
      }
    } catch (error) {
      affiliateCapturedPhotoDataUrl = "";
      affiliatePhotoInput.value = "";
      syncAffiliatePhotoPreview("");
      setFormMessage(affiliateCreateMessage, error.message || "No se pudo cargar la foto.", "error");
    }
  });
  [affiliateFullNameInput, affiliateDocumentInput, affiliatePhoneInput, affiliateEmailInput].forEach((input) => {
    input?.addEventListener("input", syncAffiliateStepper);
  });
  syncAffiliatePhotoPreview("");
}

async function submitAffiliateForm(event) {
  event.preventDefault();
  if (!session?.user?.business_id) return;
  affiliateCreateMessage.textContent = "Creando afiliado...";

  try {
    const uploadedPhotoDataUrl = affiliateCapturedPhotoDataUrl
      || (affiliatePhotoInput?.files?.[0] ? await readAffiliatePhotoFile(affiliatePhotoInput.files[0]) : "");
    const payload = {
      full_name: affiliateFullNameInput.value.trim(),
      document_id: affiliateDocumentInput.value.trim() || null,
      phone: affiliatePhoneInput.value.trim() || null,
      email: affiliateEmailInput.value.trim() || null,
      photo_data_url: uploadedPhotoDataUrl || null,
      notes: affiliateNotesInput.value.trim() || null,
      card_metadata: {
        source: "portal",
      },
    };

    const data = await api(`/api/portal/businesses/${session.user.business_id}/affiliates`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const affiliate = {
      ...(data.affiliate || {}),
      business_logo_data_url: businessProfileLogoSource(),
    };
    state.affiliates = [affiliate, ...(state.affiliates || []).filter((item) => item.id !== affiliate.id)];
    state.selectedAffiliateId = affiliate.id;
    state.selectedAffiliate = affiliate;
    affiliateCreateMessage.textContent = "";
    resetAffiliateForm();
    await renderAffiliatesView();
    showFeedback("Afiliado creado correctamente.");
  } catch (error) {
    affiliateCreateMessage.textContent = error.message;
  }
}

async function awardSelectedAffiliatePoints() {
  if (!state.selectedAffiliateId || !session?.user?.business_id) return;
  const amount = Number(affiliatePurchaseAmountInput.value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    showFeedback("Ingresa un monto valido para sumar puntos.", "error");
    return;
  }

  affiliateAddPointsButton.disabled = true;
  affiliateAddPointsButton.textContent = "Sumando...";

  try {
    const data = await api(`/api/portal/businesses/${session.user.business_id}/affiliates/${state.selectedAffiliateId}/points`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ amount }),
    });

    const updated = data.affiliate;
    state.affiliates = (state.affiliates || []).map((item) => (item.id === updated.id ? updated : item));
    state.selectedAffiliate = updated;
    affiliatePurchaseAmountInput.value = "";
    await renderAffiliatesView();
    showFeedback(
      data.awarded > 0
        ? `Se sumaron ${data.awarded} puntos al afiliado.`
        : data.message || "No se generaron puntos.",
      data.awarded > 0 ? "success" : "error"
    );
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    affiliateAddPointsButton.disabled = false;
    affiliateAddPointsButton.textContent = "Sumar puntos";
  }
}

async function downloadSelectedAffiliateCard() {
  if (!state.selectedAffiliate) return;
  downloadAffiliateCardButton.disabled = true;
  downloadAffiliateCardButton.textContent = "Generando...";
  try {
    const dataUrl = await renderAffiliateCardPreview(state.selectedAffiliate);
    if (!dataUrl) return;
    downloadDataUrl(`carnet-afiliado-${String(state.selectedAffiliate.full_name || "afiliado").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`, dataUrl);
    showFeedback("Carnet descargado como PNG.");
  } catch (error) {
    showFeedback(error.message || "No se pudo descargar el carnet.", "error");
  } finally {
    downloadAffiliateCardButton.disabled = false;
    downloadAffiliateCardButton.textContent = "Descargar PNG";
  }
}

function renderAffiliateReferralQrResult(batch, qrCodes = [], affiliate = state.selectedAffiliate) {
  if (!affiliateReferralQrResult) return;
  if (!batch) {
    affiliateReferralQrResult.innerHTML = "";
    affiliateReferralQrResult.classList.add("hidden");
    return;
  }

  const affiliateName = firstTextValue(batch.metadata?.affiliate_name, affiliate?.full_name, "Afiliado seleccionado");
  const affiliateDocument = firstTextValue(affiliate?.document_id, affiliate?.document, "Sin documento");
  affiliateReferralQrResult.classList.remove("hidden");
  affiliateReferralQrResult.innerHTML = `
    <div class="qr-batch-result-head">
      <div>
        <span class="mono-label">tickets de recomendacion creados</span>
        <h4>${escapeHtml(batch.name || "tickets recomendacion afiliado")}</h4>
        <p>${escapeHtml(Number(batch.quantity || qrCodes.length || 0).toLocaleString("es-CO"))} tickets unicos, de un solo uso, listos para entregar al afiliado.</p>
        <p><strong>Afiliado asignado:</strong> ${escapeHtml(affiliateName)} · ${escapeHtml(affiliateDocument)}</p>
      </div>
    </div>
    <div class="qr-batch-actions">
      <button class="solid-button" type="button" data-affiliate-referral-download="zip">Descargar ZIP</button>
      <button class="ghost-button" type="button" data-affiliate-referral-download="pdf">PDF tarjetas</button>
      <button class="ghost-button" type="button" data-affiliate-referral-download="csv">CSV</button>
    </div>
    <p class="table-secondary">Primer ticket: ${escapeHtml(qrCodes[0]?.claim_url || "-")}</p>
  `;
  affiliateReferralQrResult.querySelectorAll("[data-affiliate-referral-download]").forEach((button) => {
    button.addEventListener("click", () => {
      const format = button.dataset.affiliateReferralDownload;
      downloadBatchByFormat(batch.id, format, "card", "a4");
    });
  });
}

async function generateSelectedAffiliateReferralQr() {
  if (!state.selectedAffiliate?.id || !session?.user?.business_id) return;
  const quantity = Number(affiliateReferralQrQuantityInput?.value || 0);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    setInlineMessage(affiliateReferralQrMessage, "Ingresa una cantidad entre 1 y 100.", "error");
    return;
  }
  if (!affiliateReferralQrCampaignInput?.value) {
    setInlineMessage(affiliateReferralQrMessage, "Selecciona la campana que medira estos tickets de recomendacion.", "error");
    affiliateReferralQrCampaignInput?.focus();
    return;
  }

  setButtonLoading(affiliateGenerateReferralQrButton, true, "Generando...");
  setInlineMessage(affiliateReferralQrMessage, `Generando ${quantity.toLocaleString("es-CO")} tickets y descontando tickets disponibles...`, "info");
  renderAffiliateReferralQrResult(null);
  showFeedback(`Generando tickets de recomendacion para ${state.selectedAffiliate.full_name || "el afiliado"}.`, "loading", { title: "tickets de recomendacion", timeout: 0 });
  const referralAffiliate = { ...state.selectedAffiliate };

  try {
    const data = await api("/api/business/qr/affiliates/referral-batches", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        affiliate_id: state.selectedAffiliate.id,
        campaign_id: affiliateReferralQrCampaignInput.value,
        quantity,
        notes: affiliateReferralQrNotesInput?.value.trim() || null,
        expires_mode: "NONE",
        benefit: {
          benefit_type: "CUSTOM",
          benefit_label: affiliateReferralQrBenefitInput?.value.trim() || "Recomendacion de afiliado",
          benefit_value: {},
        },
      }),
    });

    setInlineMessage(
      affiliateReferralQrMessage,
      `Lote creado y asignado a ${referralAffiliate.full_name || "el afiliado"}: ${Number(data.batch?.quantity || quantity).toLocaleString("es-CO")} tickets de un solo uso.`,
      "success"
    );
    renderAffiliateReferralQrResult(data.batch, data.qr_codes || [], referralAffiliate);
    await downloadBatchByFormat(data.batch.id, "pdf", "card", "a4", { silentSuccess: true });
    state.qrCreditAccount = data.credit_account || state.qrCreditAccount;
    markTicketCenterDataStale(["core", "metrics", "batches", "history", "affiliates"]);
    if (state.currentView === "affiliates") {
      await loadAffiliatesData();
      await renderAffiliatesView();
      renderAffiliateReferralQrResult(data.batch, data.qr_codes || [], referralAffiliate);
    } else if (state.currentView === "strategic-qr") {
      await loadTicketCenterForCurrentTab({ force: true, quiet: true });
    }
    showFeedback(`tickets de recomendacion creados para ${referralAffiliate.full_name || "el afiliado"}. La descarga PDF fue iniciada.`, "success", { title: "Tickets listos" });
  } catch (error) {
    setInlineMessage(affiliateReferralQrMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudieron generar los tickets" });
  } finally {
    setButtonLoading(affiliateGenerateReferralQrButton, false);
  }
}

async function deleteSelectedAffiliate(affiliateId, affiliateName = "afiliado") {
  if (!affiliateId || !session?.user?.business_id) return;
  const name = affiliateName || "afiliado";
  const firstConfirm = window.confirm(`Vas a eliminar el afiliado "${name}". Esta accion elimina tambien su historial de puntos. Deseas continuar?`);
  if (!firstConfirm) return;
  const typed = window.prompt('Para reconfirmar, escribe ELIMINAR en mayusculas.');
  if (typed !== "ELIMINAR") {
    showFeedback("Eliminacion cancelada: la reconfirmacion no coincide.", "error");
    return;
  }

  try {
    await api(`/api/portal/businesses/${session.user.business_id}/affiliates/${affiliateId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    state.affiliates = (state.affiliates || []).filter((item) => item.id !== affiliateId);
    state.selectedAffiliateLedger = [];
    if (state.selectedAffiliateId === affiliateId) {
      state.selectedAffiliateId = state.affiliates[0]?.id || null;
      state.selectedAffiliate = null;
    }
    await renderAffiliatesView();
    showFeedback(`Afiliado "${name}" eliminado.`);
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

function filenameFromDisposition(value, fallback) {
  const text = String(value || "");
  const utf8Match = text.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const simpleMatch = text.match(/filename\s*=\s*"([^"]+)"/i) || text.match(/filename\s*=\s*([^;]+)/i);
  return (simpleMatch?.[1] || fallback || "download.bin").trim();
}

function triggerBlobDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);

  try {
    link.click();
  } catch {
    window.open(objectUrl, "_blank", "noopener");
  }

  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }, 60000);
}

function batchFormatLabel(format) {
  const value = String(format || "").toLowerCase();
  if (value === "zip") return "ZIP con PNG";
  if (value === "pdf") return "PDF";
  if (value === "html") return "HTML imprimible";
  if (value === "json") return "JSON";
  return "CSV";
}

function setZipDownloadGuidance(filename, stage = "ready") {
  if (!filename) return;
  const baseMessage = `Archivo: ${filename}. Windows no permite abrir el Explorador desde esta web; revisa la carpeta Descargas del navegador.`;
  qrBatchMessage.textContent = stage === "starting"
    ? `Iniciando descarga del ZIP. ${baseMessage}`
    : `ZIP listo. ${baseMessage}`;
  if (!qrBatchProgress.classList.contains("hidden")) {
    qrBatchProgressMessage.textContent = stage === "starting"
      ? `Descargando ${filename}. Cuando termine, buscado en Descargas del navegador.`
      : `Descarga iniciada para ${filename}. Si no se abre nada, revisa Descargas del navegador.`;
  }
}

async function downloadLeadQr(qrId) {
  if (!qrId) return;
  try {
    const data = await api(`/api/business/contacts/feed/${encodeURIComponent(qrId)}/active-qr`, {
      headers: authHeaders(),
    });
    downloadDataUrl(data.filename || `qr-${qrId}.png`, data.qr_image_data_url);
    showFeedback(`Ticket descargado para ${data.player_name || "el lead"}. Puedes reenviarlo por el canal que prefieras.`);
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function shareLeadQrWhatsApp(qrId, phone, name) {
  if (!qrId) return;
  try {
    const data = await api(`/api/business/contacts/feed/${encodeURIComponent(qrId)}/active-qr`, {
      headers: authHeaders(),
    });
    const rawPhone = String(phone || data.player_phone || "").replace(/[^\d]/g, "");
    const text = [
      `Hola ${name || data.player_name || ""}`.trim(),
      "este es tu ticket activo de beneficio MarketGames QR para presentar en el punto fisico:",
      data.validator_url,
    ].join(" ");
    const target = rawPhone
      ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(target, "_blank", "noopener");
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

function exportCampaignReport() {
  const campaign = state.selectedCampaign;
  if (!campaign) return;
  downloadCsv("campaign-report", [
    ["Campo", "Valor"],
    ["Campana", campaign.name],
    ["Tipo", campaign.type],
    ["Objetivo", campaign.objective],
    ["Estado", campaign.status],
    ["Canales", launchChannelsLabel(campaign.launch_channels)],
    ["Notas cliente", campaign.client_notes || ""],
    ["Leads", campaign.total_leads],
    ["Tickets generados", campaign.total_qr_generated],
    ["Tickets redimidos", campaign.total_qr_redeemed],
    ["Ventas directas", campaign.direct_sales_count || campaign.attributed_sales_count],
    ["Ingresos atribuidos", campaign.attributed_revenue],
    ["ROI", campaign.estimated_roi],
    ["Ventas baseline", campaign.baseline_sales],
    ["Ventas durante", campaign.campaign_period_sales],
    ["Sales uplift", campaign.sales_uplift],
  ]);
}

async function exportLeads() {
  const scope = leadExportScopeInput?.value || "all";
  const labels = {
    all: "todos los leads",
    active: "tickets activos sin redimir",
    redeemed: "redimidos e inactivos",
  };
  try {
    exportLeadsButton.disabled = true;
    exportLeadsButton.textContent = "Exportando...";
    const response = await fetch(`/api/business/contacts/feed/export.csv?ticket_filter=${encodeURIComponent(scope)}`, {
      headers: authHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || "No se pudo exportar la base de leads.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contactos-leads-${scope}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showFeedback(`Feed exportado: ${labels[scope] || "leads"}. Incluye enlaces de ticket y mensaje sugerido para WhatsApp cuando aplica.`, "success", { title: "Leads exportados" });
  } catch (error) {
    showFeedback(error.message, "error", { title: "Exportacion bloqueada" });
  } finally {
    exportLeadsButton.disabled = false;
    exportLeadsButton.textContent = "Exportar CSV";
  }
}

function exportRedemptions() {
  downloadCsv("campaign-redemptions", [
    ["Cliente", "Beneficio", "Fecha", "Sucursal", "Vendedor", "Estado"],
    ...state.selectedRedemptions.map((item) => [
      item.player_name,
      item.reward_name,
      item.redeemed_at,
      item.branch_name,
      item.validator_name,
      item.sale_amount ? "Completado" : "Pendiente",
    ]),
  ]);
}

function exportSales() {
  downloadCsv("campaign-sales", [
    ["Cliente", "Cedula", "Telefono", "Valor", "Pago", "Producto o servicio", "Sucursal", "Fecha"],
    ...state.selectedSales.map((item) => [
      item.player_name,
      item.document_id,
      item.phone,
      item.sale_amount,
      item.payment_method,
      item.product_or_service,
      item.branch_name,
      item.created_at,
    ]),
  ]);
}

function selectedLaunchChannels() {
  return selectedCheckedValues(launchChannelGrid);
}

async function saveClientLaunchSetup(event) {
  event.preventDefault();
  if (!state.selectedCampaignId) return;
  const launchChannels = selectedLaunchChannels();
  if (!launchChannels.length) {
    launchSetupMessage.textContent = "Selecciona al menos una red o canal para guardar la preparacion.";
    launchChannelGrid.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
  launchSetupMessage.textContent = "Guardando...";

  try {
    const campaign = await api(`/api/business/campaigns/${state.selectedCampaignId}/client-setup`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        budget_total: Number(launchBudgetInput.value || 0),
        additional_budget: Number(launchAdditionalBudgetInput.value || 0),
        starts_at: new Date(launchStartsAtInput.value).toISOString(),
        ends_at: new Date(launchEndsAtInput.value).toISOString(),
        objective: launchObjectiveInput.value.trim() || null,
        launch_channels: launchChannels,
        expected_sales_goal: launchSalesGoalInput.value ? Number(launchSalesGoalInput.value) : null,
        expected_leads_goal: launchLeadsGoalInput.value ? Number(launchLeadsGoalInput.value) : null,
        expected_redemptions_goal: launchRedemptionsGoalInput.value ? Number(launchRedemptionsGoalInput.value) : null,
        client_notes: launchClientNotesInput.value.trim() || null,
      }),
    });
    launchSetupMessage.textContent = "Preparacion guardada.";
    state.selectedCampaign = campaign.campaign;
    await loadWorkspace();
    await selectCampaign(state.selectedCampaignId);
  } catch (error) {
    launchSetupMessage.textContent = error.message;
  }
}

async function confirmCampaignLaunch() {
  if (!state.selectedCampaignId) return;
  launchSetupMessage.textContent = "Confirmando...";
  try {
    const campaign = await api(`/api/business/campaigns/${state.selectedCampaignId}/confirm-launch`, {
      method: "POST",
      headers: authHeaders(),
    });
    showFeedback("Lanzamiento confirmado correctamente.");
    launchSetupMessage.textContent = "";
    state.selectedCampaign = campaign.campaign;
    await loadWorkspace();
    await selectCampaign(state.selectedCampaignId);
  } catch (error) {
    launchSetupMessage.textContent = error.message;
  }
}

function saveCampaignSnapshot() {
  if (!state.selectedCampaignId) return;
  snapshotModalForm.reset();
  state.snapshotEditingId = null;
  snapshotPeriodTypeInput.value = "DURING";
  openSnapshotModal();
}

async function submitCampaignSnapshot(event) {
  event.preventDefault();
  if (!state.selectedCampaignId) return;
  snapshotModalMessage.textContent = "Guardando...";

  try {
    await api(
      state.snapshotEditingId
        ? `/api/business/campaigns/${state.selectedCampaignId}/sales-snapshots/${state.snapshotEditingId}`
        : `/api/business/campaigns/${state.selectedCampaignId}/sales-snapshot`,
      {
      method: state.snapshotEditingId ? "PATCH" : "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        period_type: snapshotPeriodTypeInput.value,
        start_date: snapshotStartDateInput.value,
        end_date: snapshotEndDateInput.value,
        total_sales_amount: Number(snapshotSalesAmountInput.value || 0),
        total_orders: Number(snapshotOrdersInput.value || 0),
        notes: snapshotNotesInput.value.trim() || null,
      }),
    });
    closeSnapshotModal();
    showFeedback(state.snapshotEditingId ? "Snapshot actualizado correctamente." : "Snapshot guardado correctamente.");
    await selectCampaign(state.selectedCampaignId);
  } catch (error) {
    snapshotModalMessage.textContent = error.message;
  }
}

async function markCampaignReady() {
  if (!isAdmin() || !state.selectedCampaignId) return;
  try {
    await api(`/api/admin/campaigns/${state.selectedCampaignId}/mark-ready`, {
      method: "POST",
      headers: authHeaders(),
    });
    showFeedback("Campana marcada como READY_FOR_CLIENT_SETUP.");
    await loadWorkspace();
    await selectCampaign(state.selectedCampaignId);
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

function startNewAdminCampaign() {
  if (!isAdmin()) return;
  state.adminSelectedCampaignId = null;
  state.adminSelectedCampaign = null;
  state.adminSelectedReport = null;
  hydrateAdminForm(null);
  adminReportKpiGrid.innerHTML = "";
  adminReportCampaignTable.innerHTML = '<tr><td colspan="6">Selecciona una campana para ver el reporte del cliente.</td></tr>';
  setView("admin");
}

async function saveAdminCampaign(event) {
  event.preventDefault();
  if (!isAdmin()) return;
  adminCampaignMessage.textContent = "Guardando...";
  const adminSlug = slugify(adminCampaignSlugInput.value || adminCampaignNameInput.value);
  adminCampaignSlugInput.value = adminSlug;
  if (!adminSlug) {
    adminCampaignMessage.textContent = "Escribe un nombre de campana para generar el slug.";
    adminCampaignNameInput.focus();
    return;
  }

  const payload = {
    business_id: state.adminSelectedCampaign?.business_id || state.adminSelectedReport?.business?.id || session.user.business_id,
    name: adminCampaignNameInput.value.trim(),
    slug: adminSlug,
    type: adminCampaignTypeInput.value,
    status: adminCampaignStatusInput.value,
    objective: adminCampaignObjectiveInput.value.trim() || null,
    strategy_summary: adminCampaignStrategyInput.value.trim() || null,
    budget_total: Number(adminCampaignBudgetInput.value || 0),
    expected_sales_goal: Number(adminCampaignSalesGoalInput.value || 0),
    delivered_assets: {
      landing_url: adminCampaignLandingUrlInput.value.trim() || null,
      validator_url: adminCampaignValidatorUrlInput.value.trim() || null,
      game_url: adminCampaignGameUrlInput.value.trim() || null,
      primary_link: adminCampaignPrimaryLinkInput.value.trim() || null,
      qr_landing_url: adminCampaignQrLandingUrlInput.value.trim() || null,
      creative_notes: adminCampaignAssetNotesInput.value.trim() || null,
    },
  };

  try {
    const result = await api(
      state.adminSelectedCampaignId
        ? `/api/admin/campaigns/${state.adminSelectedCampaignId}`
        : "/api/admin/campaigns",
      {
        method: state.adminSelectedCampaignId ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      }
    );
    adminCampaignMessage.textContent = "Campana guardada.";
    state.adminSelectedCampaignId = result.campaign?.id || state.adminSelectedCampaignId;
    await loadWorkspace();
    if (state.adminSelectedCampaignId) {
      await loadAdminCampaignWorkspace(state.adminSelectedCampaignId);
    }
  } catch (error) {
    adminCampaignMessage.textContent = error.message;
  }
}

async function markAdminCampaignReady() {
  if (!isAdmin() || !state.adminSelectedCampaignId) return;
  adminCampaignMessage.textContent = "Marcando...";
  try {
    await api(`/api/admin/campaigns/${state.adminSelectedCampaignId}/mark-ready`, {
      method: "POST",
      headers: authHeaders(),
    });
    adminCampaignMessage.textContent = "";
    showFeedback("Campana marcada como READY_FOR_CLIENT_SETUP.");
    await loadWorkspace();
    await loadAdminCampaignWorkspace(state.adminSelectedCampaignId);
    if (state.selectedCampaignId === state.adminSelectedCampaignId) {
      await selectCampaign(state.selectedCampaignId);
    }
  } catch (error) {
    adminCampaignMessage.textContent = error.message;
  }
}

function buildTimelineSeries() {
  const report = state.selectedReport || {};
  const leadBuckets = (state.selectedLeads || []).reduce((acc, item) => {
    const date = item.created_at?.slice(0, 10);
    if (date) acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  const salesBuckets = (report.sales_by_day || []).reduce((acc, item) => {
    if (item.date) acc[item.date] = toNumber(item.sales);
    return acc;
  }, {});
  const redemptionBuckets = (report.redemptions_by_day || []).reduce((acc, item) => {
    if (item.date) acc[item.date] = toNumber(item.count);
    return acc;
  }, {});
  const dates = Array.from(new Set([
    ...Object.keys(leadBuckets),
    ...Object.keys(salesBuckets),
    ...Object.keys(redemptionBuckets),
  ])).sort();

  return filterByDate(
    dates.map((date) => ({
      date,
      label: formatDateShort(date),
      leads: leadBuckets[date] || 0,
      sales: salesBuckets[date] || 0,
      redemptions: redemptionBuckets[date] || 0,
    })),
    ["date"]
  );
}

function renderLeadsView() {
  const feedRows = filterRows(state.contactFeed || [], [
    "name",
    "document_id",
    "phone",
    "email",
    "campaign_name",
    "attribution_source",
    "attribution_subject",
    "lead_temperature",
    "recommended_action",
  ]);
  const buyers = feedRows.filter((item) => item.lead_temperature === "buyer").length;
  const hot = feedRows.filter((item) => item.lead_temperature === "hot").length;
  const exportable = feedRows.filter((item) => item.email || item.phone).length;
  const topSource = Object.entries(feedRows.reduce((acc, item) => {
    const key = item.attribution_source || "Sin origen";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0];

  if (leadFeedKpiGrid) {
    leadFeedKpiGrid.innerHTML = [
      ["Contactos retenidos", feedRows.length, state.contactFeedRetention?.label || "Segun plan"],
      ["Compradores", buyers, "Con venta registrada"],
      ["Leads calientes", hot, "Prioridad comercial"],
      ["Exportables", exportable, "Email o telefono"],
      ["Origen lider", topSource?.[0] || "-", topSource ? `${topSource[1]} contactos` : "Sin datos"],
    ].map(([label, value, meta]) => `
      <article class="kpi-card">
        <span class="mono-label">${escapeHtml(label)}</span>
        <strong>${escapeHtml(value ?? 0)}</strong>
        <div class="kpi-meta">${escapeHtml(meta || "")}</div>
      </article>
    `).join("");
  }
  if (leadFeedRetention) {
    leadFeedRetention.textContent = `Retencion ${state.contactFeedRetention?.label || "segun plan"}`;
  }
  if (leadFeedTable) {
    leadFeedTable.innerHTML = feedRows.map((item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.name || "Sin nombre")}</strong>
          <br><span class="table-secondary">${escapeHtml(item.phone || item.email || item.document_id || "Sin contacto")}</span>
        </td>
        <td>${escapeHtml(prettyLeadValue(item.attribution_source || "-"))}</td>
        <td>
          ${escapeHtml(item.campaign_name || "Sin campana")}
          <br><span class="table-secondary">${escapeHtml(item.attribution_subject || "-")}</span>
        </td>
        <td>
          <span class="status-chip ${item.lead_temperature === "buyer" ? "ok" : item.lead_temperature === "hot" ? "warning" : "pending"}">${escapeHtml(item.lead_temperature || "-")}</span>
          <br><span class="table-secondary">${escapeHtml(item.qr_status || item.stage || "-")}</span>
        </td>
        <td>${item.sale_amount ? money(item.sale_amount) : "-"}</td>
        <td>${escapeHtml(item.recommended_action || "-")}</td>
      </tr>
    `).join("") || '<tr><td colspan="6">Sin contactos dentro de la retencion de tu plan.</td></tr>';
  }

  const gate = state.contactFeedGate;
  if (gate?.locked && (!state.selectedCampaignId || !(state.selectedLeads || []).length)) {
    const sampleRows = withFilters(
      state.contactFeed || [],
      ["name", "document_id", "phone", "email", "qr_status", "campaign_name", "attribution_source", "attribution_subject", "preferred_channel"],
      ["created_at", "redeemed_at", "sale_created_at"]
    );
    const totalCopy = gate.total_available === null || gate.total_available === undefined
      ? `Estas viendo la muestra permitida por tu plan (${escapeHtml(sampleRows.length)} contactos cargados).`
      : `Estas viendo ${escapeHtml(sampleRows.length)} de ${escapeHtml(gate.total_available || sampleRows.length)} contactos. ${escapeHtml(gate.hidden_count || 0)} quedan reservados para un plan superior.`;
    const gateRow = `
      <tr>
        <td colspan="9">
          <div class="empty-state">
            <strong>${escapeHtml(gate.title || "Ya tienes leads reales. Ahora necesitas el portal.")}</strong>
            <p>${escapeHtml(gate.message || "Portal Base muestra el historial permitido. Growth/Premium desbloquea historial completo y mas exportaciones.")}</p>
            <p>${totalCopy}</p>
            <a class="primary-button compact" href="${escapeHtml(gate.upgrade_url || "/paquetes/?mode=portal&plan=STARTER")}">Activar Portal RMS</a>
          </div>
        </td>
      </tr>
    `;
    const rows = sampleRows.map((item) => `
      <tr>
        <td>${escapeHtml(item.name || "-")}</td>
        <td>${escapeHtml(prettyLeadValue(item.attribution_source || item.lead_source || "-"))}</td>
        <td>${escapeHtml(item.attribution_subject || item.campaign_name || "Contacto capturado")}</td>
        <td>${escapeHtml(item.recommended_action || "Suscribete para priorizar, exportar y hacer seguimiento comercial.")}</td>
        <td>${escapeHtml(item.document_id || "-")}</td>
        <td>${escapeHtml(item.phone || "-")}</td>
        <td>${escapeHtml(item.qr_status || item.stage || "-")}</td>
        <td>${escapeHtml(item.campaign_name || "-")}<br><span class="table-secondary">${escapeHtml(item.email || "-")}</span></td>
        <td><a class="ghost-button" href="${escapeHtml(gate.upgrade_url || "/paquetes/?mode=portal&plan=STARTER")}">Ver todo</a></td>
      </tr>
    `).join("");
    campaignLeadsTable.innerHTML = `${gateRow}${rows || '<tr><td colspan="9">Genera tus primeros tickets para empezar a capturar leads.</td></tr>'}`;
    return;
  }

  const sourceRows = state.selectedCampaignId ? (state.selectedLeads || []) : feedRows.map((item) => ({
    ...item,
    lead_source: item.lead_source || item.attribution_source,
    reward_name: item.reward_name || item.attribution_subject || item.campaign_name,
  }));
  const rows = withFilters(
    sourceRows,
    ["name", "document_id", "phone", "email", "qr_status", "reward_name", "lead_source", "favorite_product", "purchase_intent", "gift_budget", "purchase_window", "preferred_channel"],
    ["created_at", "redeemed_at"]
  );

  campaignLeadsTable.innerHTML = rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.name || "-")}</td>
      <td>${escapeHtml(prettyLeadValue(item.lead_source))}</td>
      <td>${escapeHtml(leadInterestSummary(item))}</td>
      <td>${escapeHtml(leadActionRecommendation(item))}</td>
      <td>${escapeHtml(item.document_id || "-")}</td>
      <td>${escapeHtml(item.phone || "-")}</td>
      <td>${escapeHtml(item.qr_status || "-")}</td>
      <td>${escapeHtml(item.reward_name || "-")}<br><span class="table-secondary">${escapeHtml(item.email || "-")}</span></td>
      <td>${item.qr_status === "ACTIVE" && item.qr_code_id
        ? `<div class="activation-row-actions">
            <button class="ghost-button" type="button" data-download-qr="${escapeHtml(item.qr_code_id)}">Descargar</button>
            <button class="ghost-button" type="button" data-share-qr-wa="${escapeHtml(item.qr_code_id)}" data-lead-phone="${escapeHtml(item.phone || "")}" data-lead-name="${escapeHtml(item.name || "")}">WhatsApp</button>
          </div>`
        : `<span class="table-secondary">${escapeHtml(item.qr_code_id ? "Ticket activo" : "Sin ticket")}</span>`}</td>
    </tr>
  `).join("") || `<tr><td colspan="9">${state.selectedCampaignId ? "Sin leads para esta campana." : "Sin contactos capturados."}</td></tr>`;

  campaignLeadsTable.querySelectorAll("[data-download-qr]").forEach((button) => {
    button.addEventListener("click", () => downloadLeadQr(button.dataset.downloadQr));
  });
  campaignLeadsTable.querySelectorAll("[data-share-qr-wa]").forEach((button) => {
    button.addEventListener("click", () => shareLeadQrWhatsApp(
      button.dataset.shareQrWa,
      button.dataset.leadPhone,
      button.dataset.leadName
    ));
  });
}

function renderAffiliateDashboard() {
  const affiliates = state.affiliates || [];
  const total = affiliates.length;
  const active = affiliates.filter((item) => item.status !== "INACTIVE").length;
  const totalPoints = affiliates.reduce((sum, item) => sum + toNumber(item.points_total || item.ledger_points || 0), 0);
  const events = affiliates.reduce((sum, item) => sum + toNumber(item.point_events || 0), 0);
  const purchaseTotal = affiliates.reduce((sum, item) => sum + toNumber(item.purchase_total || 0), 0);
  const averagePurchase = events ? purchaseTotal / events : 0;
  const latest = affiliates
    .filter((item) => item.last_purchase_at)
    .sort((a, b) => new Date(b.last_purchase_at).getTime() - new Date(a.last_purchase_at).getTime())[0];
  const topAffiliate = affiliates
    .slice()
    .sort((a, b) => toNumber(b.purchase_total || 0) - toNumber(a.purchase_total || 0))[0];

  if (affiliateStatTotal) affiliateStatTotal.textContent = String(total);
  if (affiliateStatActive) affiliateStatActive.textContent = `${active} activos`;
  if (affiliateStatPoints) affiliateStatPoints.textContent = String(totalPoints);
  if (affiliateStatEvents) affiliateStatEvents.textContent = `${events} compras registradas`;
  if (affiliateStatPurchaseTotal) affiliateStatPurchaseTotal.textContent = money(purchaseTotal);
  if (affiliateStatAveragePurchase) affiliateStatAveragePurchase.textContent = `Ticket promedio ${money(averagePurchase)}`;
  if (affiliateStatLastPurchase) affiliateStatLastPurchase.textContent = latest ? formatDateShort(latest.last_purchase_at) : "-";
  if (affiliateStatTopAffiliate) {
    affiliateStatTopAffiliate.textContent = topAffiliate && toNumber(topAffiliate.purchase_total || 0) > 0
      ? `${topAffiliate.full_name || "Afiliado"} - ${money(topAffiliate.purchase_total)}`
      : "Sin compras aun";
  }
}

function normalizeAffiliateFinderValue(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function extractAffiliateFinderToken(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.searchParams.get("affiliate")
      || url.searchParams.get("affiliate_token")
      || url.searchParams.get("token")
      || url.pathname.split("/").filter(Boolean).pop()
      || value;
  } catch {
    return value;
  }
}

function affiliateFinderSearchBlob(affiliate) {
  return [
    affiliate.full_name,
    affiliate.document_id,
    affiliate.phone,
    affiliate.email,
    affiliate.qr_token,
    affiliate.id,
    affiliate.notes,
  ].filter(Boolean).join(" ").toLowerCase();
}

function findAffiliatesForPoints(query) {
  const normalized = normalizeAffiliateFinderValue(extractAffiliateFinderToken(query));
  if (!normalized) return [];
  return (state.affiliates || []).filter((affiliate) => {
    const token = String(affiliate.qr_token || "").toLowerCase();
    const documentId = String(affiliate.document_id || "").toLowerCase();
    const name = String(affiliate.full_name || "").toLowerCase();
    const phone = String(affiliate.phone || "").toLowerCase();
    const email = String(affiliate.email || "").toLowerCase();
    return token === normalized
      || documentId === normalized
      || phone === normalized
      || email === normalized
      || name.includes(normalized)
      || affiliateFinderSearchBlob(affiliate).includes(normalized);
  }).slice(0, 8);
}

function setAffiliateFinderMessage(message, mode = "info") {
  if (affiliateFinderMessage) {
    affiliateFinderMessage.textContent = message || "";
    affiliateFinderMessage.className = `affiliate-card-note ${mode === "error" ? "error-line" : ""}`.trim();
  }
  if (affiliateFinderStatus) {
    affiliateFinderStatus.className = `status-chip ${mode === "success" ? "ok" : mode === "error" ? "danger" : "pending"}`;
    affiliateFinderStatus.textContent = mode === "success" ? "Encontrado" : mode === "error" ? "Revisar" : "Listo";
  }
}

function renderAffiliateFinderResults(rows = []) {
  if (!affiliateFinderResults) return;
  affiliateFinderResults.innerHTML = rows.map((item) => `
    <button class="affiliate-finder-result" type="button" data-affiliate-finder-select="${escapeHtml(item.id)}">
      <strong>${escapeHtml(item.full_name || "Afiliado")}</strong>
      <span>${escapeHtml(item.document_id || "Sin documento")} · ${escapeHtml(item.phone || item.email || "Sin contacto")}</span>
      <small>${escapeHtml(toNumber(item.points_total || item.ledger_points || 0))} puntos · ${escapeHtml(String(item.qr_token || "").slice(0, 10))}</small>
    </button>
  `).join("");
  affiliateFinderResults.querySelectorAll("[data-affiliate-finder-select]").forEach((button) => {
    button.addEventListener("click", () => openAffiliateForPoints(button.dataset.affiliateFinderSelect));
  });
}

async function openAffiliateForPoints(affiliateId) {
  if (!affiliateId) return;
  if (!state.affiliatesLoaded && session?.user?.business_id) {
    await loadAffiliatesData();
  }
  state.selectedAffiliateId = affiliateId;
  state.filter = "";
  if (searchInput) searchInput.value = "";
  if (state.currentView !== "affiliates") {
    setView("affiliates");
  }
  await renderAffiliatesView();
  const selected = state.selectedAffiliate || (state.affiliates || []).find((item) => item.id === affiliateId);
  renderAffiliateFinderResults([]);
  setAffiliateFinderMessage(`Afiliado seleccionado: ${selected?.full_name || "afiliado"}. Ingresa el monto de compra y suma puntos.`, "success");
  affiliatePurchaseAmountInput?.focus();
  affiliatePurchaseAmountInput?.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function searchAffiliateForPoints(value = affiliateFinderInput?.value) {
  const query = String(value || "").trim();
  renderAffiliateFinderResults([]);
  if (!query) {
    setAffiliateFinderMessage("Escribe documento, nombre, telefono, email o escanea el QR del carnet.", "error");
    affiliateFinderInput?.focus();
    return;
  }
  if (!state.affiliatesLoaded && session?.user?.business_id) {
    await loadAffiliatesData();
  }
  const matches = findAffiliatesForPoints(query);
  if (!matches.length) {
    setAffiliateFinderMessage("No encontramos un afiliado con ese dato. Revisa documento, nombre o carnet QR.", "error");
    return;
  }
  if (matches.length === 1) {
    await openAffiliateForPoints(matches[0].id);
    return;
  }
  renderAffiliateFinderResults(matches);
  setAffiliateFinderMessage(`Encontramos ${matches.length} afiliados. Elige el correcto para sumar puntos.`, "success");
}

function stopAffiliateFinderScanner() {
  if (state.affiliateScannerLoopHandle) {
    cancelAnimationFrame(state.affiliateScannerLoopHandle);
    state.affiliateScannerLoopHandle = 0;
  }
  if (state.affiliateScannerStream) {
    state.affiliateScannerStream.getTracks().forEach((track) => track.stop());
    state.affiliateScannerStream = null;
  }
  if (affiliateFinderVideo) affiliateFinderVideo.srcObject = null;
  affiliateFinderScanner?.classList.add("hidden");
  if (affiliateFinderStatus) {
    affiliateFinderStatus.className = "status-chip pending";
    affiliateFinderStatus.textContent = "Listo";
  }
}

async function scanAffiliateFinderFrame() {
  if (!state.affiliateScannerStream || !affiliateFinderVideo) return;
  try {
    if (affiliateFinderVideo.readyState >= 2 && state.affiliateScannerContext && validatorCanUseJsQr()) {
      const width = affiliateFinderVideo.videoWidth || 0;
      const height = affiliateFinderVideo.videoHeight || 0;
      if (width && height) {
        state.affiliateScannerCanvas.width = width;
        state.affiliateScannerCanvas.height = height;
        state.affiliateScannerContext.drawImage(affiliateFinderVideo, 0, 0, width, height);
        const frame = state.affiliateScannerContext.getImageData(0, 0, width, height);
        const code = window.jsQR(frame.data, width, height, { inversionAttempts: "dontInvert" });
        const rawValue = code?.data || "";
        const now = Date.now();
        if (rawValue && (rawValue !== state.affiliateScannerLastValue || now - state.affiliateScannerLastAt > 3000)) {
          state.affiliateScannerLastValue = rawValue;
          state.affiliateScannerLastAt = now;
          if (affiliateFinderInput) affiliateFinderInput.value = rawValue;
          stopAffiliateFinderScanner();
          await searchAffiliateForPoints(rawValue);
          return;
        }
      }
    }
  } catch {}
  state.affiliateScannerLoopHandle = requestAnimationFrame(scanAffiliateFinderFrame);
}

async function startAffiliateFinderScanner() {
  if (!window.isSecureContext) {
    setAffiliateFinderMessage("La camara solo funciona en HTTPS o localhost. Puedes buscar manualmente por documento o nombre.", "error");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !validatorCanUseJsQr()) {
    setAffiliateFinderMessage("Este navegador no permite escanear el carnet aqui. Usa la busqueda manual.", "error");
    return;
  }
  try {
    stopAffiliateFinderScanner();
    state.affiliateScannerContext = state.affiliateScannerCanvas.getContext("2d", { willReadFrequently: true });
    state.affiliateScannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    affiliateFinderScanner?.classList.remove("hidden");
    affiliateFinderVideo.srcObject = state.affiliateScannerStream;
    await affiliateFinderVideo.play();
    setAffiliateFinderMessage("Apunta la camara al QR del carnet del afiliado.", "info");
    if (affiliateFinderStatus) {
      affiliateFinderStatus.className = "status-chip ok";
      affiliateFinderStatus.textContent = "Escaneando";
    }
    state.affiliateScannerLoopHandle = requestAnimationFrame(scanAffiliateFinderFrame);
  } catch (error) {
    stopAffiliateFinderScanner();
    setAffiliateFinderMessage(`No se pudo abrir la camara: ${error?.message || "permiso bloqueado"}. Usa la busqueda manual.`, "error");
  }
}

async function renderAffiliatesView() {
  setupAffiliatePhotoCaptureUi();
  renderAffiliateDashboard();
  const rows = withFilters(
    state.affiliates || [],
    ["full_name", "document_id", "phone", "email", "status", "business_name", "qr_token", "notes"],
    ["created_at", "updated_at"]
  );

  const selectedRow = rows.find((item) => item.id === state.selectedAffiliateId) || rows[0] || null;
  const selected = selectedRow && state.selectedAffiliate?.id === selectedRow.id
    ? {
        ...selectedRow,
        business_logo_data_url: businessProfileLogoSource() || businessLogoSource(selectedRow) || businessLogoSource(state.selectedAffiliate) || "",
        qr_data_url: affiliateQrSource(selectedRow) || affiliateQrSource(state.selectedAffiliate),
      }
    : (selectedRow ? { ...selectedRow, business_logo_data_url: businessProfileLogoSource() || businessLogoSource(selectedRow) || "" } : null);
  if (selected && selected.id !== state.selectedAffiliateId) {
    state.selectedAffiliateId = selected.id;
  }
  state.selectedAffiliate = selected;

  affiliateTable.innerHTML = rows.map((item) => `
    <tr data-affiliate-id="${escapeHtml(item.id)}" class="${item.id === state.selectedAffiliateId ? "active" : ""}">
      <td>${escapeHtml(item.full_name || "-")}</td>
      <td>${escapeHtml(item.document_id || "-")}</td>
      <td>${escapeHtml(toNumber(item.points_total || item.ledger_points || 0))}</td>
      <td>
        <strong>${escapeHtml(money(item.purchase_total || 0))}</strong>
        <br><span class="table-secondary">${escapeHtml(toNumber(item.point_events || 0))} movimientos</span>
      </td>
      <td>${escapeHtml(item.last_purchase_at ? formatDateShort(item.last_purchase_at) : "-")}</td>
      <td><span class="table-secondary">${escapeHtml(item.notes || "-")}</span></td>
      <td><span class="table-secondary">${escapeHtml(String(item.qr_token || "").slice(0, 12))}...</span></td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
      <td>
        <button class="ghost-button" type="button" data-affiliate-select="${escapeHtml(item.id)}">Ver carnet</button>
        <button class="ghost-button danger-button" type="button" data-affiliate-delete="${escapeHtml(item.id)}" data-affiliate-name="${escapeHtml(item.full_name || "afiliado")}">Eliminar</button>
      </td>
    </tr>
  `).join("") || '<tr><td colspan="9">Todavia no hay afiliados creados.</td></tr>';

  affiliateTable.querySelectorAll("[data-affiliate-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedAffiliateId = button.dataset.affiliateSelect;
      renderAffiliatesView();
    });
  });
  affiliateTable.querySelectorAll("[data-affiliate-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteSelectedAffiliate(button.dataset.affiliateDelete, button.dataset.affiliateName));
  });

  if (!selected) {
    affiliateCardTitle.textContent = "Sin afiliado seleccionado";
    affiliateCardMeta.textContent = "Crea o selecciona un afiliado para generar el carnet y el ticket.";
    renderAffiliateSelectedSummary(null);
    affiliateCardPreview.removeAttribute("src");
    affiliateCardPreviewWrap?.classList.add("is-empty");
    affiliateCardPreviewWrap?.classList.remove("is-loading");
    affiliateAddPointsButton.disabled = true;
    downloadAffiliateCardButton.disabled = true;
    if (affiliateGenerateReferralQrButton) affiliateGenerateReferralQrButton.disabled = true;
    if (affiliateReferralQrSelectedMeta) affiliateReferralQrSelectedMeta.textContent = "Selecciona un afiliado del listado para generar sus tickets de recomendacion.";
    setInlineMessage(affiliateReferralQrMessage, "", "info");
    renderAffiliateReferralQrResult(null);
    affiliateLedgerTitle.textContent = "Movimientos del afiliado";
    affiliateLedgerTable.innerHTML = '<tr><td colspan="5">Sin afiliado seleccionado.</td></tr>';
    return;
  }

  affiliateCardTitle.textContent = selected.full_name || "Afiliado";
  affiliateCardMeta.textContent = affiliateCardMetaText(selected);
  renderAffiliateSelectedSummary(selected);
  affiliateCardPreviewWrap?.classList.remove("is-empty");
  affiliateAddPointsButton.disabled = false;
  downloadAffiliateCardButton.disabled = false;
  if (affiliateGenerateReferralQrButton) affiliateGenerateReferralQrButton.disabled = false;
  if (affiliateReferralQrSelectedMeta) {
    affiliateReferralQrSelectedMeta.textContent = `Generando ticket para ${selected.full_name || "el afiliado seleccionado"}. Se descontaran de los tickets disponibles.`;
  }
  affiliateLedgerTitle.textContent = `Movimientos de ${selected.full_name || "afiliado"}`;

  try {
    const detail = await api(`/api/portal/businesses/${session.user.business_id}/affiliates/${selected.id}`, { headers: authHeaders() });
    state.selectedAffiliate = {
      ...selected,
      ...(detail.affiliate || {}),
      business_logo_data_url: businessProfileLogoSource() || businessLogoSource(detail.affiliate || {}) || businessLogoSource(selected) || "",
      qr_data_url: affiliateQrSource(detail.affiliate || {}) || affiliateQrSource(selected),
    };
    renderAffiliateSelectedSummary(state.selectedAffiliate);
    state.selectedAffiliateLedger = detail.ledger || [];
    await renderAffiliateCardPreview(state.selectedAffiliate);
    affiliateLedgerTable.innerHTML = (state.selectedAffiliateLedger || []).map((item) => `
      <tr>
        <td>${escapeHtml(money(item.amount))}</td>
        <td>${escapeHtml(toNumber(item.points_awarded || 0))}</td>
        <td>${escapeHtml(item.reason || "-")}</td>
        <td>${escapeHtml(formatDate(item.created_at))}</td>
        <td>${escapeHtml(item.created_by_name || "-")}</td>
      </tr>
    `).join("") || '<tr><td colspan="5">Sin movimientos registrados.</td></tr>';
  } catch (error) {
    affiliateLedgerTable.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
  }
}

function rewardPassStatusLabel(status) {
  const labels = {
    pending_claim: "Pendiente activacion",
    active: "Activo",
    partially_redeemed: "Parcial",
    fully_redeemed: "Redimido",
    expired: "Vencido",
    cancelled: "Anulado",
    extended: "Prorrogado",
  };
  return labels[status] || status || "-";
}

function rewardPassStatusClass(status) {
  if (["active", "extended"].includes(status)) return "ok";
  if (status === "pending_claim") return "pending";
  if (status === "partially_redeemed") return "pending";
  return "danger";
}

function rewardPassDefaultExpiry() {
  const date = new Date();
  date.setMonth(date.getMonth() + 12);
  return formatInputDateTime(date.toISOString());
}

function setRewardPassDefaults() {
  if (rewardPassIssuedAtInput && !rewardPassIssuedAtInput.value) {
    rewardPassIssuedAtInput.value = formatInputDateTime(new Date().toISOString());
  }
  if (rewardPassExpiresAtInput && !rewardPassExpiresAtInput.value) {
    rewardPassExpiresAtInput.value = rewardPassDefaultExpiry();
  }
  if (rewardPassTermsInput && !rewardPassTermsInput.value && state.rewardPassContext?.default_terms) {
    rewardPassTermsInput.value = state.rewardPassContext.default_terms;
  }
  renderRewardPassCampaignOptions();
}

function renderRewardPassCampaignOptions() {
  if (!rewardPassCampaignInput) return;
  const options = ['<option value="">Sin campana asociada</option>']
    .concat((state.campaigns || []).map((campaign) => `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.name || campaign.slug || campaign.id)}</option>`));
  rewardPassCampaignInput.innerHTML = options.join("");
}

function renderRewardPassContext() {
  const context = state.rewardPassContext?.context || state.rewardPassContext || {};
  const cost = toNumber(context.reward_pass_ticket_cost || 1);
  const balance = toNumber(context.ticket_balance || context.qr_balance || 0);
  if (rewardPassTicketContext) {
    rewardPassTicketContext.textContent = `Costo de emision: ${cost} ticket${cost === 1 ? "" : "s"} MarketGames. Saldo actual: ${balance.toLocaleString("es-CO")} tickets.`;
  }
}

async function loadRewardPasses() {
  const queryParams = new URLSearchParams();
  if (rewardPassStatusFilter?.value) queryParams.set("status", rewardPassStatusFilter.value);
  if (state.filter) queryParams.set("search", state.filter);
  const data = await api(`/api/business/reward-passes?${queryParams.toString()}`, { headers: authHeaders() });
  state.rewardPasses = data.reward_passes || [];
  state.rewardPassMetrics = data.metrics || null;
  state.rewardPassContext = {
    ...(state.rewardPassContext || {}),
    context: data.context || data.reward_pass_context || data.context,
  };
  if (!state.selectedRewardPassId && state.rewardPasses[0]) {
    state.selectedRewardPassId = state.rewardPasses[0].id;
  }
}

async function loadRewardPassContext() {
  const data = await api("/api/business/reward-passes/context", { headers: authHeaders() });
  state.rewardPassContext = data || {};
  renderRewardPassContext();
  setRewardPassDefaults();
}

function renderRewardPassMetrics() {
  const metrics = state.rewardPassMetrics || {};
  const cards = [
    ["Emitidos", toNumber(metrics.issued_count || 0), `${toNumber(metrics.active_count || 0)} activos`],
    ["Valor emitido", money(metrics.total_issued_cop || 0), "Obligacion comercial del emisor"],
    ["Valor redimido", money(metrics.total_redeemed_cop || 0), `${toNumber(metrics.redemption_count || 0)} redenciones`],
    ["Saldo pendiente", money(metrics.pending_balance_cop || 0), `${toNumber(metrics.partially_redeemed_count || 0)} parciales`],
    ["Saldo vencido", money(metrics.expired_balance_cop || 0), `${toNumber(metrics.expired_count || 0)} vencidos`],
    ["Tickets consumidos", toNumber(metrics.tickets_consumed || 0), "Derecho tecnologico MarketGames"],
  ];
  if (rewardPassKpiGrid) {
    rewardPassKpiGrid.innerHTML = cards.map(([label, value, meta]) => `
      <article class="kpi-card">
        <span class="mono-label">${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <div class="kpi-meta">${escapeHtml(meta)}</div>
      </article>
    `).join("");
  }
}

function renderRewardPassPreview(pass = state.selectedRewardPass) {
  const isPending = !pass || pass.status === "pending_claim";
  const beneficiary = pass?.beneficiary_name || rewardPassBeneficiaryNameInput?.value || "Beneficiario por activar";
  if (rewardPassPreviewTitle) rewardPassPreviewTitle.textContent = pass ? pass.public_code : "Vista previa";
  if (rewardPassPreviewValue) rewardPassPreviewValue.textContent = isPending ? "ACTIVACION" : "GIFT CARD OFICIAL";
  if (rewardPassPreviewBeneficiary) rewardPassPreviewBeneficiary.textContent = isPending ? "Escanea para reclamar el QR definitivo" : beneficiary;
  if (rewardPassPreviewMeta) {
    rewardPassPreviewMeta.textContent = pass
      ? (isPending ? `Link de reclamo: ${pass.public_url}. El beneficiario escanea este QR, completa sus datos y recibe el QR definitivo redimible.` : `Link publico: ${pass.public_url}. QR redimible listo para validador.`)
      : "El QR y los datos completos apareceran despues de emitir o seleccionar un Reward Pass.";
  }
  [rewardPassDownloadImageButton, rewardPassDownloadPdfButton, rewardPassReceiptButton].forEach((button) => {
    if (button) button.disabled = !pass;
  });
}

function renderRewardPassTable() {
  if (!rewardPassTable) return;
  const rows = filterRows(state.rewardPasses || [], ["public_code", "beneficiary_name", "beneficiary_document", "buyer_name", "status"]);
  rewardPassTable.innerHTML = rows.map((item) => `
    <tr class="${item.id === state.selectedRewardPassId ? "active" : ""}">
      <td><strong>${escapeHtml(item.public_code)}</strong></td>
      <td>${escapeHtml(item.beneficiary_name || "-")}</td>
      <td>${escapeHtml(item.beneficiary_document || "-")}</td>
      <td>${escapeHtml(money(item.initial_value_cop || 0))}</td>
      <td>${escapeHtml(money(item.current_balance_cop || 0))}</td>
      <td><span class="status-chip ${rewardPassStatusClass(item.status)}">${escapeHtml(rewardPassStatusLabel(item.status))}</span></td>
      <td>${escapeHtml(formatDateShort(item.issued_at))}</td>
      <td>${escapeHtml(formatDateShort(item.expires_at))}</td>
      <td>
        <button class="ghost-button" type="button" data-rp-view="${escapeHtml(item.id)}">Ver</button>
        <button class="ghost-button" type="button" data-rp-pdf="${escapeHtml(item.id)}">Descargar</button>
        <button class="ghost-button" type="button" data-rp-copy="${escapeHtml(item.public_url || "")}">Copiar link</button>
        <button class="ghost-button" type="button" data-rp-wa="${escapeHtml(item.id)}">WhatsApp</button>
        ${item.current_balance_cop >= item.initial_value_cop && item.status !== "cancelled" ? `<button class="ghost-button danger-button" type="button" data-rp-cancel="${escapeHtml(item.id)}">Anular</button>` : ""}
      </td>
    </tr>
  `).join("") || '<tr><td colspan="9">Todavia no hay Reward Pass emitidos.</td></tr>';

  rewardPassTable.querySelectorAll("[data-rp-view]").forEach((button) => {
    button.addEventListener("click", () => selectRewardPass(button.dataset.rpView));
  });
  rewardPassTable.querySelectorAll("[data-rp-copy]").forEach((button) => {
    button.addEventListener("click", () => copyRewardPassLink(button.dataset.rpCopy));
  });
  rewardPassTable.querySelectorAll("[data-rp-pdf]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await selectRewardPass(button.dataset.rpPdf);
        await downloadSelectedRewardPassPdf("pdf");
      } catch (error) {
        showFeedback(error.message, "error");
      }
    });
  });
  rewardPassTable.querySelectorAll("[data-rp-wa]").forEach((button) => {
    button.addEventListener("click", () => openRewardPassWhatsapp(button.dataset.rpWa));
  });
  rewardPassTable.querySelectorAll("[data-rp-cancel]").forEach((button) => {
    button.addEventListener("click", () => cancelSelectedRewardPass(button.dataset.rpCancel));
  });
}

function renderRewardPassDetail() {
  const pass = state.selectedRewardPass;
  if (!pass) {
    if (rewardPassDetailTitle) rewardPassDetailTitle.textContent = "Sin Reward Pass seleccionado";
    if (rewardPassDetailGrid) rewardPassDetailGrid.innerHTML = '<p class="table-secondary">Selecciona un Reward Pass del listado.</p>';
    if (rewardPassRedemptionTable) rewardPassRedemptionTable.innerHTML = '<tr><td colspan="9">Sin historial.</td></tr>';
    if (rewardPassTicketLedgerTable) rewardPassTicketLedgerTable.innerHTML = '<tr><td colspan="5">Sin movimientos.</td></tr>';
    renderRewardPassPreview(null);
    return;
  }
  if (rewardPassDetailTitle) rewardPassDetailTitle.textContent = `${pass.public_code} - ${pass.beneficiary_name}`;
  if (rewardPassDetailGrid) {
    const details = [
      ["Empresa emisora", pass.company?.name || "-"],
      ["Comprador", `${pass.buyer_name || "-"} / ${pass.buyer_document || "-"}`],
      ["Beneficiario", `${pass.beneficiary_name || "-"} / ${pass.beneficiary_document || "-"}`],
      ["Valor inicial", money(pass.initial_value_cop)],
      ["Saldo disponible", money(pass.current_balance_cop)],
      ["Estado", rewardPassStatusLabel(pass.status)],
      ["Vigencia", formatDate(pass.expires_at)],
      ["Sede autorizada", pass.authorized_branch || "-"],
      ["Condiciones", pass.partial_redemption_allowed ? "Permite redenciones parciales" : "De un solo uso"],
      ["Link publico", pass.public_url || "-"],
    ];
    rewardPassDetailGrid.innerHTML = details.map(([label, value]) => `
      <div class="reward-pass-detail-item">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join("");
  }
  if (rewardPassRedemptionTable) {
    rewardPassRedemptionTable.innerHTML = (pass.redemptions || []).map((item) => {
      const purchaseValue = Number(item.purchase_value_cop || 0);
      const redeemedValue = Number(item.redeemed_value_cop || 0);
      const customerDifference = Math.max(purchaseValue - redeemedValue, 0);
      return `
        <tr>
          <td>${escapeHtml(item.invoice_number || "-")}</td>
          <td>${escapeHtml(purchaseValue ? money(purchaseValue) : "-")}</td>
          <td>${escapeHtml(money(redeemedValue))}</td>
          <td>${escapeHtml(customerDifference ? money(customerDifference) : "-")}</td>
          <td>${escapeHtml(money(item.balance_before_cop || 0))}</td>
          <td>${escapeHtml(money(item.balance_after_cop || 0))}</td>
          <td>${escapeHtml(item.branch || "-")}</td>
          <td>${escapeHtml(item.cashier_name || "-")}</td>
          <td>${escapeHtml(formatDate(item.redeemed_at))}</td>
        </tr>
      `;
    }).join("") || '<tr><td colspan="9">Sin redenciones registradas.</td></tr>';
  }
  if (rewardPassTicketLedgerTable) {
    rewardPassTicketLedgerTable.innerHTML = (pass.ticket_transactions || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.tickets_debited)}</td>
        <td>${escapeHtml(item.balance_before)}</td>
        <td>${escapeHtml(item.balance_after)}</td>
        <td>${escapeHtml(item.transaction_type)}</td>
        <td>${escapeHtml(formatDate(item.created_at))}</td>
      </tr>
    `).join("") || '<tr><td colspan="5">Sin movimientos de tickets.</td></tr>';
  }
  renderRewardPassPreview(pass);
}

async function selectRewardPass(id) {
  if (!id) return;
  state.selectedRewardPassId = id;
  showFeedback("Cargando detalle del Reward Pass.", "loading", { title: "Reward Pass", timeout: 0 });
  try {
    const data = await api(`/api/business/reward-passes/${encodeURIComponent(id)}`, { headers: authHeaders() });
    state.selectedRewardPass = data.reward_pass;
    renderRewardPassTable();
    renderRewardPassDetail();
    showFeedback("Detalle de Reward Pass cargado.");
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function renderRewardPassesView() {
  renderRewardPassContext();
  setRewardPassDefaults();
  try {
    if (!state.rewardPassContext?.default_terms) {
      await loadRewardPassContext();
    }
    await loadRewardPasses();
    renderRewardPassMetrics();
    renderRewardPassTable();
    const selected = state.rewardPasses.find((item) => item.id === state.selectedRewardPassId);
    if (selected) {
      await selectRewardPass(selected.id);
    } else {
      state.selectedRewardPass = null;
      renderRewardPassDetail();
    }
  } catch (error) {
    if (rewardPassTable) rewardPassTable.innerHTML = `<tr><td colspan="9">${escapeHtml(error.message)}</td></tr>`;
  }
}

function rewardPassPayload() {
  const beneficiaryName = rewardPassBeneficiaryNameInput?.value.trim();
  const beneficiaryDocument = rewardPassBeneficiaryDocumentInput?.value.trim();
  const beneficiaryPhone = rewardPassBeneficiaryPhoneInput?.value.trim();
  const beneficiaryEmail = rewardPassBeneficiaryEmailInput?.value.trim();
  const payload = {
    campaign_id: rewardPassCampaignInput?.value || null,
    initial_value_cop: Number(rewardPassValueInput?.value || 0),
    buyer_name: rewardPassBuyerNameInput?.value.trim(),
    buyer_document: rewardPassBuyerDocumentInput?.value.trim() || null,
    buyer_phone: rewardPassBuyerPhoneInput?.value.trim() || null,
    buyer_email: rewardPassBuyerEmailInput?.value.trim() || null,
    issued_at: rewardPassIssuedAtInput?.value ? new Date(rewardPassIssuedAtInput.value).toISOString() : null,
    expires_at: rewardPassExpiresAtInput?.value ? new Date(rewardPassExpiresAtInput.value).toISOString() : null,
    authorized_branch: rewardPassBranchInput?.value.trim() || null,
    payment_method_received: rewardPassPaymentMethodInput?.value.trim() || null,
    partial_redemption_allowed: Boolean(rewardPassPartialInput?.checked),
    transferable: Boolean(rewardPassTransferableInput?.checked),
    terms: rewardPassTermsInput?.value.trim() || null,
    internal_notes: rewardPassNotesInput?.value.trim() || null,
  };
  if (beneficiaryName) payload.beneficiary_name = beneficiaryName;
  if (beneficiaryDocument) payload.beneficiary_document = beneficiaryDocument;
  if (beneficiaryPhone) payload.beneficiary_phone = beneficiaryPhone;
  if (beneficiaryEmail) payload.beneficiary_email = beneficiaryEmail;
  return payload;
}

async function submitRewardPass(event) {
  event.preventDefault();
  setInlineMessage(rewardPassCreateMessage, "Emitiendo Reward Pass y descontando tickets...", "info");
  setButtonLoading(rewardPassCreateButton, true, "Emitiendo...");
  showFeedback("Emitiendo Reward Pass con transaccion atomica de tickets.", "loading", { title: "Reward Pass", timeout: 0 });
  try {
    const data = await api("/api/business/reward-passes", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(rewardPassPayload()),
    });
    state.selectedRewardPassId = data.reward_pass?.id;
    state.selectedRewardPass = data.reward_pass;
    rewardPassCreateForm?.reset();
    setRewardPassDefaults();
    await loadRewardPassContext();
    await renderRewardPassesView();
    setInlineMessage(rewardPassCreateMessage, data.message || "Reward Pass emitido correctamente.", "success");
    showFeedback(data.message || "Reward Pass emitido correctamente.", "success", { title: "Reward Pass emitido" });
  } catch (error) {
    setInlineMessage(rewardPassCreateMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo emitir" });
  } finally {
    setButtonLoading(rewardPassCreateButton, false);
  }
}

async function copyRewardPassLink(link) {
  if (!link) return;
  await navigator.clipboard?.writeText(link);
  showFeedback("Link publico del Reward Pass copiado.");
}

function openRewardPassWhatsapp(id) {
  const pass = state.rewardPasses.find((item) => item.id === id) || state.selectedRewardPass;
  if (!pass) return;
  const phone = String(pass.beneficiary_phone || pass.buyer_phone || "").replace(/\D/g, "");
  const greeting = pass.beneficiary_name ? `Hola ${pass.beneficiary_name},` : "Hola,";
  const message = encodeURIComponent(`${greeting} te comparto un Reward Pass de ${pass.company?.name || "nuestro negocio"}. Escanea el QR o abre este enlace para activar tu Gift Card Digital oficial: ${pass.public_url}`);
  window.open(`https://wa.me/${phone || ""}?text=${message}`, "_blank", "noopener");
}

async function cancelSelectedRewardPass(id) {
  if (!window.confirm("Solo puedes anular Reward Pass sin redenciones. Deseas continuar?")) return;
  try {
    await api(`/api/business/reward-passes/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ notes: "Anulado desde portal empresa." }),
    });
    await renderRewardPassesView();
    showFeedback("Reward Pass anulado correctamente.");
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function downloadSelectedRewardPassPdf(kind = "pdf") {
  const pass = state.selectedRewardPass;
  if (!pass) return;
  const endpoint = kind === "receipt"
    ? `/api/business/reward-passes/${encodeURIComponent(pass.id)}/acquisition-receipt.pdf`
    : `/api/business/reward-passes/${encodeURIComponent(pass.id)}/pdf`;
  const response = await fetch(endpoint, { headers: authHeaders() });
  const blob = await response.blob();
  if (!response.ok) {
    const text = await blob.text().catch(() => "");
    throw new Error(text || "No se pudo descargar el PDF.");
  }
  triggerBlobDownload(blob, kind === "receipt" ? `comprobante-${pass.public_code}.pdf` : `${pass.public_code}.pdf`);
}

async function buildRewardPassImageDataUrl(pass) {
  if (!pass) return "";
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#071017";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#e8c170";
  ctx.lineWidth = 8;
  ctx.strokeRect(42, 42, 1116, 636);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 74px Inter, sans-serif";
  ctx.fillText("REWARD PASS", 90, 140);
  ctx.fillStyle = "#e8c170";
  ctx.font = "500 30px Inter, sans-serif";
  ctx.fillText("Gift Card Digital", 94, 184);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px Inter, sans-serif";
  ctx.fillText(pass.company?.name || "Empresa emisora", 94, 248);
  ctx.fillStyle = "#ffd783";
  ctx.font = "800 62px Inter, sans-serif";
  ctx.fillText(pass.status === "pending_claim" ? "ACTIVAR GIFT CARD" : "GIFT CARD OFICIAL", 94, 338);
  ctx.fillStyle = "#d7e2eb";
  ctx.font = "500 28px Inter, sans-serif";
  ctx.fillText(`Beneficiario: ${pass.beneficiary_name || "Pendiente de activacion"}`, 94, 406);
  ctx.fillText(`Documento: ${pass.beneficiary_document || "Se solicita al activar"}`, 94, 448);
  ctx.fillText(`Codigo: ${pass.public_code}`, 94, 490);
  ctx.fillText(`Vigencia: ${formatDate(pass.expires_at)}`, 94, 532);
  ctx.font = "500 22px Inter, sans-serif";
  const pending = pass.status === "pending_claim";
  ctx.fillText(pending ? "Escanea este QR para reclamar y activar el QR definitivo redimible en caja." : "Presenta este QR junto con tu documento de identidad en el negocio emisor.", 94, 608);
  ctx.fillText("Administrado por MarketGames QR Portal.", 94, 642);
  if (pass.qr_image_data_url) {
    const qrImage = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = pass.qr_image_data_url;
    });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(795, 198, 330, 330);
    ctx.drawImage(qrImage, 805, 208, 310, 310);
  }
  ctx.fillStyle = "#d7e2eb";
  ctx.font = "500 22px Inter, sans-serif";
  ctx.fillText(pass.partial_redemption_allowed ? "Permite redenciones parciales." : "De un solo uso.", 790, 575);
  return canvas.toDataURL("image/png");
}

async function downloadSelectedRewardPassImage() {
  const pass = state.selectedRewardPass;
  if (!pass) return;
  const dataUrl = await buildRewardPassImageDataUrl(pass);
  downloadDataUrl(`${pass.public_code}.png`, dataUrl);
  showFeedback("Reward Pass descargado como imagen PNG.");
}

function renderRedemptionsView() {
  const rows = withFilters(
    state.selectedRedemptions || [],
    ["player_name", "reward_name", "branch_name", "validator_name", "document_id", "phone"],
    ["redeemed_at", "created_at"]
  );

  campaignRedemptionsTable.innerHTML = rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.player_name || "-")}</td>
      <td>${escapeHtml(item.reward_name || "-")}</td>
      <td>${escapeHtml(formatDate(item.redeemed_at))}</td>
      <td>${escapeHtml(item.branch_name || "-")}</td>
      <td>${escapeHtml(item.validator_name || "-")}</td>
      <td><span class="status-chip ${item.sale_amount ? "ok" : "pending"}">${item.sale_amount ? "Completado" : "Pendiente"}</span></td>
    </tr>
  `).join("") || '<tr><td colspan="6">Sin redenciones para esta campana.</td></tr>';

  const rewardCounts = rows.reduce((acc, item) => {
    const key = item.reward_name || "Beneficio";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topReward = Object.entries(rewardCounts).sort((a, b) => b[1] - a[1])[0];
  redemptionInsightTitle.textContent = topReward
    ? `${topReward[0]} lidera con ${topReward[1]} redenciones registradas.`
    : "Sin datos suficientes";
}

function renderSalesView() {
  const campaign = state.selectedCampaign || {};
  const sales = withFilters(
    state.selectedSales || [],
    ["player_name", "document_id", "phone", "payment_method", "product_or_service", "branch_name"],
    ["created_at"]
  );
  const totalRevenue = sales.reduce((sum, item) => sum + toNumber(item.sale_amount), 0);
  const avgTicket = sales.length ? totalRevenue / sales.length : 0;
  const items = [
    ["Ventas atribuidas", sales.length, money(totalRevenue)],
    ["Ticket promedio", money(avgTicket), "Promedio por venta"],
    ["Meta comercial", money(campaign.expected_sales_goal), `${safeRate(totalRevenue, campaign.expected_sales_goal || 1)}% cumplido`],
  ];

  salesKpiGrid.innerHTML = items.map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");
  renderCustomerAcquisitionAffiliateOptions();

  campaignSalesTable.innerHTML = sales.map((item) => `
    <tr>
      <td>${escapeHtml(item.player_name || "-")}</td>
      <td>${escapeHtml(item.document_id || "-")}</td>
      <td>${escapeHtml(item.phone || "-")}</td>
      <td>${escapeHtml(money(item.sale_amount))}</td>
      <td>${escapeHtml(item.payment_method || "-")}</td>
      <td>${escapeHtml(item.product_or_service || "-")}</td>
      <td>${escapeHtml(item.branch_name || "-")}</td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
    </tr>
  `).join("") || '<tr><td colspan="8">Sin ventas para esta campana.</td></tr>';
}

function renderBranchesView() {
  const summary = new Map();
  withFilters(
    state.selectedRedemptions || [],
    ["branch_name", "player_name", "reward_name", "validator_name"],
    ["redeemed_at"]
  ).forEach((item) => {
    const key = item.branch_name || "Sin sucursal";
    if (!summary.has(key)) summary.set(key, { branch: key, redemptions: 0, sales: 0, revenue: 0 });
    summary.get(key).redemptions += 1;
  });

  withFilters(
    state.selectedSales || [],
    ["branch_name", "player_name", "product_or_service"],
    ["created_at"]
  ).forEach((item) => {
    const key = item.branch_name || "Sin sucursal";
    if (!summary.has(key)) summary.set(key, { branch: key, redemptions: 0, sales: 0, revenue: 0 });
    summary.get(key).sales += 1;
    summary.get(key).revenue += toNumber(item.sale_amount);
  });

  const rows = Array.from(summary.values()).sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const topBranch = rows[0]?.branch || "Sin datos";
  branchKpiGrid.innerHTML = [
    ["Sucursales activas", rows.length, topBranch],
    ["Redenciones", rows.reduce((sum, row) => sum + row.redemptions, 0), `${rows.length ? Math.round(rows.reduce((sum, row) => sum + row.redemptions, 0) / rows.length) : 0} promedio/sucursal`],
    ["Ingresos", money(totalRevenue), `${rows.reduce((sum, row) => sum + row.sales, 0)} ventas`],
  ].map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");

  branchTable.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.branch)}</td>
      <td>${escapeHtml(row.redemptions)}</td>
      <td>${escapeHtml(row.sales)}</td>
      <td>${escapeHtml(money(row.revenue))}</td>
    </tr>
  `).join("") || '<tr><td colspan="4">Sin datos por sucursal.</td></tr>';
}

function renderAdminView() {
  if (!isAdmin()) {
    adminKpiGrid.innerHTML = "";
    adminCampaignTable.innerHTML = '<tr><td colspan="4">Sin acceso admin.</td></tr>';
    adminReportKpiGrid.innerHTML = "";
    adminReportCampaignTable.innerHTML = '<tr><td colspan="6">Sin acceso admin.</td></tr>';
    adminPanelMessage.textContent = "Tu rol actual es de negocio. La gestion global sigue disponible solo para admins en `/admin`.";
    return;
  }

  const campaigns = filterRows(state.adminCampaigns, ["name", "business_name", "status", "type"]);
  adminKpiGrid.innerHTML = [
    ["Campanas globales", state.adminCampaigns.length, "Todas las empresas"],
    ["Campanas visibles", campaigns.length, `Filtro ${state.filter ? "activo" : "general"}`],
    ["Rol actual", session.user.role, "Acceso a crear y editar campanas"],
  ].map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");

  adminCampaignTable.innerHTML = campaigns.map((campaign) => `
    <tr data-admin-campaign-id="${escapeHtml(campaign.id)}">
      <td>${escapeHtml(campaign.name || "-")}</td>
      <td>${escapeHtml(campaign.business_name || "-")}</td>
      <td>${escapeHtml(campaign.status || "-")}</td>
      <td>${escapeHtml(campaign.type || "-")}</td>
    </tr>
  `).join("") || '<tr><td colspan="4">Sin campanas para este filtro.</td></tr>';
  adminCampaignTable.querySelectorAll("[data-admin-campaign-id]").forEach((row) => {
    row.addEventListener("click", () => loadAdminCampaignWorkspace(row.dataset.adminCampaignId));
  });

  adminPanelMessage.textContent = "Este usuario puede crear y editar campanas desde el modal del portal y tambien operar `/admin`.";
}

function handleRangeToggle() {
  if (state.rangeDays === 30) {
    state.rangeDays = 90;
  } else if (state.rangeDays === 90) {
    state.rangeDays = 0;
  } else {
    state.rangeDays = 30;
  }

  rangeButton.textContent = state.rangeDays ? `Ultimos ${state.rangeDays} dias` : "Todo el historial";
  if (state.dashboard) renderDashboard();
  if (state.selectedCampaign) {
    renderCampaignView();
    renderLeadsView();
    renderRedemptionsView();
    renderSalesView();
    renderBranchesView();
  }
  if (state.currentView === "validator") {
    loadValidatorHistory();
  }
  if (isAdmin()) renderAdminView();
}

loginForm.addEventListener("submit", login);
passwordResetRequestForm?.addEventListener("submit", submitPasswordResetRequest);
passwordResetForm?.addEventListener("submit", submitPasswordReset);
logoutButton.addEventListener("click", () => {
  stopValidatorScanner();
  resetQrBatchProgress();
  clearSession();
  renderShell();
});
refreshButton.addEventListener("click", loadWorkspace);
searchInput.addEventListener("input", (event) => {
  state.filter = event.target.value || "";
  if (state.dashboard) renderDashboard();
  renderCampaignList();
  renderLeadsView();
  renderRedemptionsView();
  renderSalesView();
  if (state.strategicQrLoaded || state.currentView === "strategic-qr") renderStrategicQrView();
  if (state.currentView === "reward-passes") renderRewardPassesView();
  if (state.currentView === "validator") {
    loadValidatorHistory();
  }
  renderBranchesView();
  if (isAdmin()) renderAdminView();
});
campaignStatusFilter.addEventListener("change", renderCampaignList);
campaignFormName?.addEventListener("input", () => syncCampaignSlugFromName());
campaignFormSlug?.addEventListener("input", () => {
  campaignFormSlug.value = slugify(campaignFormSlug.value);
  campaignFormSlug.dataset.generatedFrom = "";
});
adminCampaignNameInput?.addEventListener("input", () => {
  if (!adminCampaignSlugInput.value.trim()) {
    adminCampaignSlugInput.value = slugify(adminCampaignNameInput.value);
  }
});
adminCampaignSlugInput?.addEventListener("input", () => {
  adminCampaignSlugInput.value = slugify(adminCampaignSlugInput.value);
});
navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
ticketCenterTabs.forEach((button) => {
  button.addEventListener("click", () => setTicketCenterTab(button.dataset.ticketTab));
});
segmentTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => setView(index === 0 ? "redemptions" : "sales"));
});
exportCampaignReportButton.addEventListener("click", exportCampaignReport);
markReadyCampaignButton.addEventListener("click", markCampaignReady);
exportLeadsButton.addEventListener("click", exportLeads);
exportRedemptionsButton.addEventListener("click", exportRedemptions);
exportSalesButton.addEventListener("click", exportSales);
launchSetupForm.addEventListener("submit", saveClientLaunchSetup);
confirmLaunchButton.addEventListener("click", confirmCampaignLaunch);
saveSnapshotButton.addEventListener("click", saveCampaignSnapshot);
snapshotModalForm.addEventListener("submit", submitCampaignSnapshot);
customerAcquisitionForm?.addEventListener("submit", submitCustomerAcquisitionSale);
postSaleQrForm?.addEventListener("submit", submitPostSaleQr);
triviaLauncherForm?.addEventListener("submit", submitTriviaLauncher);
activationTypePicker?.querySelectorAll("[data-activation-type]").forEach((button) => {
  button.addEventListener("click", () => setActivationType(button.dataset.activationType));
});
triviaQuestionCountInput?.addEventListener("input", updateTriviaQuestionVisibility);
triviaExpiresModeInput?.addEventListener("change", updateTriviaExpiryMode);
triviaQuestionBuilder?.addEventListener("input", updateTriviaQuestionVisibility);
triviaQuestionBuilder?.addEventListener("change", updateTriviaQuestionVisibility);
document.querySelectorAll('[data-survey-field="type"]').forEach((field) => {
  field.addEventListener("change", updateSurveyQuestionEditors);
});
document.querySelectorAll("[data-question-count-for]").forEach((field) => {
  field.addEventListener("input", updateActivationQuestionCountControls);
  field.addEventListener("change", updateActivationQuestionCountControls);
});
qrBatchForm?.addEventListener("submit", submitQrBatch);
qrCreditCheckoutForm?.addEventListener("submit", submitQrCreditCheckout);
accountOpenQrShopButton?.addEventListener("click", openQrCreditShopFromAccount);
subscriptionRenewalForm?.addEventListener("submit", submitSubscriptionRenewal);
subscriptionRenewalPlanSelect?.addEventListener("change", renderSubscriptionRenewal);
subscriptionAutoRenewButton?.addEventListener("click", submitSubscriptionAutoRenewal);
refreshAdminWorkspaceButton.addEventListener("click", loadWorkspace);
newAdminCampaignButton.addEventListener("click", startNewAdminCampaign);
adminCampaignForm.addEventListener("submit", saveAdminCampaign);
adminMarkReadyButton.addEventListener("click", markAdminCampaignReady);
requestCampaignButton.addEventListener("click", () => {
  if (!isAdmin()) {
    openCampaignModal("create");
    return;
  }
  if (isAdmin() && !session?.user?.business_id) {
    setView("admin");
    showFeedback("Admin global cargado. Selecciona un negocio en `/admin` para crear una campana.", "error");
    return;
  }
  openCampaignModal("create");
});
editCampaignButton.addEventListener("click", () => openCampaignModal("edit"));
gamingCenterCoreButton?.addEventListener("click", openGamingCenterEntry);
redemptionInsightButton.addEventListener("click", () => setView("redemptions"));
dashboardInsightButton.addEventListener("click", () => setView("campaigns"));
qrWorkflowCampaignButton?.addEventListener("click", () => setView("campaigns"));
refreshValidatorHistoryButton.addEventListener("click", loadValidatorHistory);
startValidatorScannerButton.addEventListener("click", startValidatorScanner);
stopValidatorScannerButton.addEventListener("click", stopValidatorScanner);
validateValidatorManualButton.addEventListener("click", () => validateValidatorToken(validatorQrTokenInput.value));
validatorRedeemButton.addEventListener("click", redeemValidatorToken);
validatorSaleForm.addEventListener("submit", saveValidatorAttributedSale);
validatorSaleAmountInput?.addEventListener("input", () => rewardPassBalancePreview(true));
validatorRewardPassRedeemInput?.addEventListener("input", () => rewardPassBalancePreview(false));
notificationsButton.addEventListener("click", () => {
  const pending = (state.selectedRedemptions || []).filter((item) => !item.sale_amount).length;
  showFeedback(
    pending
      ? `Hay ${pending} redenciones pendientes de venta atribuida en la campana seleccionada.`
      : "No hay alertas pendientes en la campana seleccionada."
  );
});
settingsButton.addEventListener("click", () => {
  setView("account");
  showFeedback("Cuenta y configuracion abiertas.", "info");
});
themeSwitch?.addEventListener("change", togglePortalTheme);
menuToggleButton?.addEventListener("click", togglePortalMenu);
document.addEventListener("click", (event) => {
  const clickedElement = event.target instanceof Element ? event.target : event.target?.parentElement;
  const ticketViewButton = clickedElement?.closest("[data-ticket-open-view]");
  if (ticketViewButton) {
    const targetView = ticketViewButton.dataset.ticketOpenView;
    setView(targetView);
    if (targetView === "strategic-qr") {
      setTicketCenterTab("center");
    }
    return;
  }
  if (!workspace?.classList.contains("sidebar-open")) return;
  const target = event.target;
  if (sidebar?.contains(target) || menuToggleButton?.contains(target)) return;
  closePortalMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.chartFocus.open) {
    closeChartFocusMode();
    return;
  }
  if (event.key === "Escape") closePortalMenu();
});
rangeButton.addEventListener("click", handleRangeToggle);
closeCampaignModalButton.addEventListener("click", requestCloseCampaignModal);
cancelCampaignModalButton.addEventListener("click", requestCloseCampaignModal);
closeSnapshotModalButton.addEventListener("click", closeSnapshotModal);
cancelSnapshotModalButton.addEventListener("click", closeSnapshotModal);
campaignModalForm.addEventListener("submit", submitCampaignModal);
campaignModal.addEventListener("click", (event) => {
  if (event.target === campaignModal) notifyCampaignBackdropLocked();
});
snapshotModal.addEventListener("click", (event) => {
  if (event.target === snapshotModal) closeSnapshotModal();
});
window.addEventListener("resize", () => {
  if (!window.matchMedia("(max-width: 960px)").matches) closePortalMenu();
  if (state.dashboard) renderDashboard();
  if (state.selectedCampaign) renderCampaignView();
  if (state.strategicQrLoaded || state.currentView === "strategic-qr") renderStrategicQrView();
});
window.addEventListener("beforeunload", () => {
  stopValidatorScanner();
  stopAffiliateFinderScanner();
});
affiliateCreateForm?.addEventListener("submit", submitAffiliateForm);
resetAffiliateFormButton?.addEventListener("click", resetAffiliateForm);
affiliateAddPointsButton?.addEventListener("click", awardSelectedAffiliatePoints);
downloadAffiliateCardButton?.addEventListener("click", downloadSelectedAffiliateCard);
affiliateGenerateReferralQrButton?.addEventListener("click", generateSelectedAffiliateReferralQr);
refreshAffiliatesButton?.addEventListener("click", renderAffiliatesView);
affiliateFinderSearchButton?.addEventListener("click", () => searchAffiliateForPoints());
affiliateFinderInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  searchAffiliateForPoints();
});
affiliateFinderScanButton?.addEventListener("click", startAffiliateFinderScanner);
affiliateFinderStopScanButton?.addEventListener("click", stopAffiliateFinderScanner);
refreshRewardPassesButton?.addEventListener("click", renderRewardPassesView);
rewardPassStatusFilter?.addEventListener("change", renderRewardPassesView);
rewardPassCreateForm?.addEventListener("submit", submitRewardPass);
rewardPassValueInput?.addEventListener("input", () => renderRewardPassPreview(state.selectedRewardPass));
rewardPassBeneficiaryNameInput?.addEventListener("input", () => renderRewardPassPreview(state.selectedRewardPass));
rewardPassDownloadImageButton?.addEventListener("click", downloadSelectedRewardPassImage);
rewardPassDownloadPdfButton?.addEventListener("click", () => downloadSelectedRewardPassPdf("pdf").catch((error) => showFeedback(error.message, "error")));
rewardPassReceiptButton?.addEventListener("click", () => downloadSelectedRewardPassPdf("receipt").catch((error) => showFeedback(error.message, "error")));
accountProfileForm?.addEventListener("submit", submitAccountProfile);
accountPasswordForm?.addEventListener("submit", submitAccountPassword);
accountUserForm?.addEventListener("submit", submitAccountUser);
refreshAccountUsersButton?.addEventListener("click", loadBusinessUsers);
accountUsersTable?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-account-user-toggle]");
  if (!button) return;
  toggleBusinessUser(button.dataset.accountUserToggle, button.dataset.active === "1");
});
businessLogoUploadButton?.addEventListener("click", () => businessLogoInput?.click());
businessLogoInput?.addEventListener("change", () => handleBusinessLogoFile(businessLogoInput.files?.[0]));
businessLogoRemoveButton?.addEventListener("click", () => updateBusinessLogo(""));
accountTicketFrameUploadButton?.addEventListener("click", () => accountTicketFrameInput?.click());
accountTicketFrameInput?.addEventListener("change", () => handleTicketFrameFile(accountTicketFrameInput.files?.[0]));
accountTicketFrameRemoveButton?.addEventListener("click", () => updateTicketFrame(""));
document.querySelectorAll("[data-product-vote-upload]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const key = button.dataset.productVoteUpload;
    document.querySelector(`[data-flat-option-image="${key}"]`)?.click();
  });
});
document.querySelectorAll("[data-flat-option-image]").forEach((input) => {
  input.addEventListener("change", () => handleProductVoteImageFile(input.dataset.flatOptionImage, input.files?.[0]));
});

rangeButton.textContent = `Ultimos ${state.rangeDays} dias`;
applyPortalTheme(readPreferredTheme());
setView("dashboard");
initPasswordResetFromUrl();
setupPasswordRevealButtons();
setActivationType(currentActivationType());
updateTriviaQuestionVisibility();
updateTriviaExpiryMode();
updateSurveyQuestionEditors();
updateActivationQuestionCountControls();
renderShell();
const paymentResult = new URLSearchParams(window.location.search).get("payment");
if (paymentResult === "success") {
  showFeedback("Pago aprobado. Si Mercado Pago ya notifico el webhook, los tickets apareceran en unos segundos.", "success", { title: "Pago recibido", timeout: 8000 });
} else if (paymentResult === "pending") {
  showFeedback("Pago pendiente. Actualizaremos el saldo cuando Mercado Pago confirme la transaccion.", "info", { title: "Pago en revision", timeout: 8000 });
} else if (paymentResult === "failure") {
  showFeedback("El pago no fue aprobado. Puedes intentar nuevamente con otro medio de pago.", "error", { title: "Pago no completado", timeout: 8000 });
}



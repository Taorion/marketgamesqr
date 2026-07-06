const SESSION_KEY = "qr_business_portal_session_v1";
const loginPanel = document.getElementById("loginPanel");
const VALIDATOR_SESSION_KEY = "universal_qr_validator_session_v1";
const APP_VERSION = "empresa-20260706-sales-ux-refine-v1";
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
const leadAttentionBoard = document.getElementById("leadAttentionBoard");
const leadTicketInventoryBoard = document.getElementById("leadTicketInventoryBoard");
const leadExportScopeInput = document.getElementById("leadExportScopeInput");
const contactCenterSummaryGrid = document.getElementById("contactCenterSummaryGrid");
const contactCenterPanels = Array.from(document.querySelectorAll("[data-contact-center-panel]"));
const contactCenterTabs = Array.from(document.querySelectorAll("[data-contact-center-tab]"));
const contactActionFeed = document.getElementById("contactActionFeed");
const contactCenterStageMeta = document.getElementById("contactCenterStageMeta");
const contactCenterStageTitle = document.getElementById("contactCenterStageTitle");
const contactCenterStageCopy = document.getElementById("contactCenterStageCopy");
const contactCenterPrimaryAction = document.getElementById("contactCenterPrimaryAction");
const contactCenterSecondaryAction = document.getElementById("contactCenterSecondaryAction");
const contactTabOverviewCount = document.getElementById("contactTabOverviewCount");
const contactTabDirectoryCount = document.getElementById("contactTabDirectoryCount");
const contactTabTicketsCount = document.getElementById("contactTabTicketsCount");
const contactTabCapturesCount = document.getElementById("contactTabCapturesCount");
const contactTabManualCount = document.getElementById("contactTabManualCount");
const contactTabSalesCount = document.getElementById("contactTabSalesCount");
const leadCrmSearchInput = document.getElementById("leadCrmSearchInput");
const leadCrmSearchButton = document.getElementById("leadCrmSearchButton");
const leadCrmResetButton = document.getElementById("leadCrmResetButton");
const leadCrmCampaignFilter = document.getElementById("leadCrmCampaignFilter");
const leadCrmStatusFilter = document.getElementById("leadCrmStatusFilter");
const leadCrmAffiliateFilter = document.getElementById("leadCrmAffiliateFilter");
const leadCrmPurchaseFilter = document.getElementById("leadCrmPurchaseFilter");
const leadCrmTicketFilter = document.getElementById("leadCrmTicketFilter");
const leadCrmPriorityFilter = document.getElementById("leadCrmPriorityFilter");
const leadCrmScoreMinFilter = document.getElementById("leadCrmScoreMinFilter");
const leadCrmScoreMaxFilter = document.getElementById("leadCrmScoreMaxFilter");
const leadCrmChannelFilter = document.getElementById("leadCrmChannelFilter");
const leadCrmTable = document.getElementById("leadCrmTable");
const leadCrmPaginationLabel = document.getElementById("leadCrmPaginationLabel");
const leadCrmPrevButton = document.getElementById("leadCrmPrevButton");
const leadCrmNextButton = document.getElementById("leadCrmNextButton");
const leadDetailModal = document.getElementById("leadDetailModal");
const leadDetailCloseButton = document.getElementById("leadDetailCloseButton");
const leadDetailTitle = document.getElementById("leadDetailTitle");
const leadDetailSubtitle = document.getElementById("leadDetailSubtitle");
const leadDetailEyebrow = document.getElementById("leadDetailEyebrow");
const leadDetailHeader = document.getElementById("leadDetailHeader");
const leadDetailTabs = document.getElementById("leadDetailTabs");
const leadDetailContent = document.getElementById("leadDetailContent");
const leadSendActivationButton = document.getElementById("leadSendActivationButton");
const leadSendBenefitButton = document.getElementById("leadSendBenefitButton");
const leadCreateNoteButton = document.getElementById("leadCreateNoteButton");
const leadCopyLastLinkButton = document.getElementById("leadCopyLastLinkButton");
const leadActivationModal = document.getElementById("leadActivationModal");
const leadActivationCloseButton = document.getElementById("leadActivationCloseButton");
const leadActivationForm = document.getElementById("leadActivationForm");
const leadActivationTypeInput = document.getElementById("leadActivationTypeInput");
const leadActivationCampaignInput = document.getElementById("leadActivationCampaignInput");
const leadActivationNameInput = document.getElementById("leadActivationNameInput");
const leadActivationChannelInput = document.getElementById("leadActivationChannelInput");
const leadActivationBenefitTypeInput = document.getElementById("leadActivationBenefitTypeInput");
const leadActivationBenefitValueInput = document.getElementById("leadActivationBenefitValueInput");
const leadActivationExpiresInput = document.getElementById("leadActivationExpiresInput");
const leadActivationScoreMinInput = document.getElementById("leadActivationScoreMinInput");
const leadActivationMessageInput = document.getElementById("leadActivationMessageInput");
const leadActivationConditionsInput = document.getElementById("leadActivationConditionsInput");
const leadActivationMessage = document.getElementById("leadActivationMessage");
const leadActivationSubmitButton = document.getElementById("leadActivationSubmitButton");
const leadActivationResult = document.getElementById("leadActivationResult");
const manualLeadForm = document.getElementById("manualLeadForm");
const manualLeadNameInput = document.getElementById("manualLeadNameInput");
const manualLeadCompanyInput = document.getElementById("manualLeadCompanyInput");
const manualLeadPhoneInput = document.getElementById("manualLeadPhoneInput");
const manualLeadEmailInput = document.getElementById("manualLeadEmailInput");
const manualLeadSourceInput = document.getElementById("manualLeadSourceInput");
const manualLeadSourceDetailInput = document.getElementById("manualLeadSourceDetailInput");
const manualLeadPriorityInput = document.getElementById("manualLeadPriorityInput");
const manualLeadStatusInput = document.getElementById("manualLeadStatusInput");
const manualLeadPreferredChannelInput = document.getElementById("manualLeadPreferredChannelInput");
const manualLeadPreferredTimeInput = document.getElementById("manualLeadPreferredTimeInput");
const manualLeadInterestInput = document.getElementById("manualLeadInterestInput");
const manualLeadNotesInput = document.getElementById("manualLeadNotesInput");
const manualLeadMessage = document.getElementById("manualLeadMessage");
const manualLeadSubmitButton = document.getElementById("manualLeadSubmitButton");
const campaignList = document.getElementById("campaignList");
const campaignStatusFilter = document.getElementById("campaignStatusFilter");
const campaignBreadcrumb = document.getElementById("campaignBreadcrumb");
const campaignHeroTitle = document.getElementById("campaignHeroTitle");
const campaignHeroSubtitle = document.getElementById("campaignHeroSubtitle");
const campaignSectionTabs = Array.from(document.querySelectorAll("[data-campaign-section-tab]"));
const campaignSectionTabOpenButtons = Array.from(document.querySelectorAll("[data-campaign-tab-open]"));
const campaignSectionPanels = Array.from(document.querySelectorAll("[data-campaign-tab-panel]"));
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
const campaignCostNameInput = document.getElementById("campaignCostNameInput");
const campaignCostTypeInput = document.getElementById("campaignCostTypeInput");
const campaignCostChannelInput = document.getElementById("campaignCostChannelInput");
const campaignCostBranchInput = document.getElementById("campaignCostBranchInput");
const campaignCostOwnerInput = document.getElementById("campaignCostOwnerInput");
const campaignCostGoalInput = document.getElementById("campaignCostGoalInput");
const campaignCostDynamicInput = document.getElementById("campaignCostDynamicInput");
const campaignCostObjectiveInput = document.getElementById("campaignCostObjectiveInput");
const campaignCostDurationInput = document.getElementById("campaignCostDurationInput");
const campaignCostProfitInput = document.getElementById("campaignCostProfitInput");
const campaignCostAverageTicketInput = document.getElementById("campaignCostAverageTicketInput");
const campaignCostGrossMarginInput = document.getElementById("campaignCostGrossMarginInput");
const campaignCostConversionInput = document.getElementById("campaignCostConversionInput");
const campaignCostRedemptionInput = document.getElementById("campaignCostRedemptionInput");
const campaignCostUseDatesButton = document.getElementById("campaignCostUseDatesButton");
const campaignCostApplyBudgetButton = document.getElementById("campaignCostApplyBudgetButton");
const campaignCostSummary = document.getElementById("campaignCostSummary");
const campaignCostDecision = document.getElementById("campaignCostDecision");
const campaignCostProductionList = document.getElementById("campaignCostProductionList");
const campaignCostBenefitsList = document.getElementById("campaignCostBenefitsList");
const campaignCostServicesList = document.getElementById("campaignCostServicesList");
const campaignCostVariableList = document.getElementById("campaignCostVariableList");
const campaignCostFixedList = document.getElementById("campaignCostFixedList");
const campaignCostAddProductionButton = document.getElementById("campaignCostAddProductionButton");
const campaignCostAddBenefitButton = document.getElementById("campaignCostAddBenefitButton");
const campaignCostAddServiceButton = document.getElementById("campaignCostAddServiceButton");
const campaignCostAddVariableButton = document.getElementById("campaignCostAddVariableButton");
const campaignCostAddFixedButton = document.getElementById("campaignCostAddFixedButton");
const campaignCostScenarios = document.getElementById("campaignCostScenarios");
const campaignCostMessage = document.getElementById("campaignCostMessage");
const campaignStrategyTabOpenButton = document.getElementById("campaignStrategyTabOpenButton");
const campaignAssetsGrid = document.getElementById("campaignAssetsGrid");
const campaignAffiliateForm = document.getElementById("campaignAffiliateForm");
const campaignAffiliateSelect = document.getElementById("campaignAffiliateSelect");
const campaignAffiliateNotesInput = document.getElementById("campaignAffiliateNotesInput");
const campaignAffiliateAssignButton = document.getElementById("campaignAffiliateAssignButton");
const campaignAffiliateMessage = document.getElementById("campaignAffiliateMessage");
const campaignAffiliatesTable = document.getElementById("campaignAffiliatesTable");
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
const accountAffiliatePointAmountInput = document.getElementById("accountAffiliatePointAmountInput");
const accountAffiliatePointRateInput = document.getElementById("accountAffiliatePointRateInput");
const accountAffiliatePointRoundingInput = document.getElementById("accountAffiliatePointRoundingInput");
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
const digitalAssetForm = document.getElementById("digitalAssetForm");
const digitalAssetTitleInput = document.getElementById("digitalAssetTitleInput");
const digitalAssetCategoryInput = document.getElementById("digitalAssetCategoryInput");
const digitalAssetDescriptionInput = document.getElementById("digitalAssetDescriptionInput");
const digitalAssetFileInput = document.getElementById("digitalAssetFileInput");
const digitalAssetCoverInput = document.getElementById("digitalAssetCoverInput");
const digitalAssetButtonTextInput = document.getElementById("digitalAssetButtonTextInput");
const digitalAssetMessage = document.getElementById("digitalAssetMessage");
const digitalAssetSubmitButton = document.getElementById("digitalAssetSubmitButton");
const digitalAssetsGrid = document.getElementById("digitalAssetsGrid");
const refreshDigitalAssetsButton = document.getElementById("refreshDigitalAssetsButton");
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
const affiliatePurchaseCampaignInput = document.getElementById("affiliatePurchaseCampaignInput");
const affiliatePurchaseProductInput = document.getElementById("affiliatePurchaseProductInput");
const affiliatePurchaseAmountInput = document.getElementById("affiliatePurchaseAmountInput");
const affiliatePurchaseNotesInput = document.getElementById("affiliatePurchaseNotesInput");
const affiliatePurchaseItemsList = document.getElementById("affiliatePurchaseItemsList");
const affiliatePurchaseAddItemButton = document.getElementById("affiliatePurchaseAddItemButton");
const affiliatePurchaseTotalText = document.getElementById("affiliatePurchaseTotalText");
const affiliatePurchasePointsText = document.getElementById("affiliatePurchasePointsText");
const affiliatePurchaseMessage = document.getElementById("affiliatePurchaseMessage");
const affiliateAddPointsButton = document.getElementById("affiliateAddPointsButton");
const downloadAffiliateCardButton = document.getElementById("downloadAffiliateCardButton");
const copyAffiliateCardLinkButton = document.getElementById("copyAffiliateCardLinkButton");
const affiliateRewardRuleForm = document.getElementById("affiliateRewardRuleForm");
const affiliateRewardTitleInput = document.getElementById("affiliateRewardTitleInput");
const affiliateRewardPointsInput = document.getElementById("affiliateRewardPointsInput");
const affiliateRewardBenefitTypeInput = document.getElementById("affiliateRewardBenefitTypeInput");
const affiliateRewardBenefitLabelInput = document.getElementById("affiliateRewardBenefitLabelInput");
const affiliateRewardBenefitValueInput = document.getElementById("affiliateRewardBenefitValueInput");
const affiliateRewardFulfillmentModeInput = document.getElementById("affiliateRewardFulfillmentModeInput");
const affiliateRewardEcommerceCodeInput = document.getElementById("affiliateRewardEcommerceCodeInput");
const affiliateRewardEcommerceUrlInput = document.getElementById("affiliateRewardEcommerceUrlInput");
const affiliateRewardEcommerceInstructionsInput = document.getElementById("affiliateRewardEcommerceInstructionsInput");
const affiliateRewardExpirationInput = document.getElementById("affiliateRewardExpirationInput");
const affiliateRewardDescriptionInput = document.getElementById("affiliateRewardDescriptionInput");
const affiliateRewardRuleMessage = document.getElementById("affiliateRewardRuleMessage");
const affiliateRewardRuleSaveButton = document.getElementById("affiliateRewardRuleSaveButton");
const affiliateRewardRuleList = document.getElementById("affiliateRewardRuleList");
const affiliateRewardUnlockTitle = document.getElementById("affiliateRewardUnlockTitle");
const affiliateRewardUnlockList = document.getElementById("affiliateRewardUnlockList");
const affiliateRewardTicketMessage = document.getElementById("affiliateRewardTicketMessage");
const affiliateRewardTicketResult = document.getElementById("affiliateRewardTicketResult");
const affiliateReferralQrQuantityInput = document.getElementById("affiliateReferralQrQuantityInput");
const affiliateReferralQrCampaignInput = document.getElementById("affiliateReferralQrCampaignInput");
const affiliateReferralQrBenefitInput = document.getElementById("affiliateReferralQrBenefitInput");
const affiliateReferralQrFulfillmentModeInput = document.getElementById("affiliateReferralQrFulfillmentModeInput");
const affiliateReferralQrEcommerceCodeInput = document.getElementById("affiliateReferralQrEcommerceCodeInput");
const affiliateReferralQrEcommerceUrlInput = document.getElementById("affiliateReferralQrEcommerceUrlInput");
const affiliateReferralQrEcommerceInstructionsInput = document.getElementById("affiliateReferralQrEcommerceInstructionsInput");
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
const leadCaptureForm = document.getElementById("leadCaptureForm");
const leadCaptureNameInput = document.getElementById("leadCaptureNameInput");
const leadCaptureCampaignInput = document.getElementById("leadCaptureCampaignInput");
const leadCaptureChannelInput = document.getElementById("leadCaptureChannelInput");
const leadCaptureStatusInput = document.getElementById("leadCaptureStatusInput");
const leadCaptureStartsInput = document.getElementById("leadCaptureStartsInput");
const leadCaptureExpiresInput = document.getElementById("leadCaptureExpiresInput");
const leadCaptureDescriptionInput = document.getElementById("leadCaptureDescriptionInput");
const leadCaptureAssetSelect = document.getElementById("leadCaptureAssetSelect");
const leadCaptureAssetPreview = document.getElementById("leadCaptureAssetPreview");
const leadCaptureAssetTitleInput = document.getElementById("leadCaptureAssetTitleInput");
const leadCaptureAssetCategoryInput = document.getElementById("leadCaptureAssetCategoryInput");
const leadCaptureAssetDescriptionInput = document.getElementById("leadCaptureAssetDescriptionInput");
const leadCaptureAssetFileInput = document.getElementById("leadCaptureAssetFileInput");
const leadCaptureCoverInput = document.getElementById("leadCaptureCoverInput");
const leadCaptureOpenAssetsButton = document.getElementById("leadCaptureOpenAssetsButton");
const leadCaptureButtonTextInput = document.getElementById("leadCaptureButtonTextInput");
const leadCaptureConsentTextInput = document.getElementById("leadCaptureConsentTextInput");
const leadCaptureFieldsGrid = document.getElementById("leadCaptureFieldsGrid");
const leadCaptureMessage = document.getElementById("leadCaptureMessage");
const leadCaptureSubmitButton = document.getElementById("leadCaptureSubmitButton");
const leadCaptureResult = document.getElementById("leadCaptureResult");
const refreshLeadCaptureButton = document.getElementById("refreshLeadCaptureButton");
const leadCaptureTable = document.getElementById("leadCaptureTable");
const leadCaptureDetail = document.getElementById("leadCaptureDetail");
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
const secretFriendTicketButton = document.getElementById("secretFriendTicketButton");
const secretFriendActivationButton = document.getElementById("secretFriendActivationButton");
const postSaleQrForm = document.getElementById("postSaleQrForm");
const postSaleCampaignInput = document.getElementById("postSaleCampaignInput");
const postSaleCampaignHelp = document.getElementById("postSaleCampaignHelp");
const postSaleUseCaseInput = document.getElementById("postSaleUseCaseInput");
const postSaleOccasionInput = document.getElementById("postSaleOccasionInput");
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
const postSaleBenefitProductModeInput = document.getElementById("postSaleBenefitProductModeInput");
const postSaleBenefitProductInput = document.getElementById("postSaleBenefitProductInput");
const postSaleBenefitValueInput = document.getElementById("postSaleBenefitValueInput");
const postSaleBenefitFulfillmentModeInput = document.getElementById("postSaleBenefitFulfillmentModeInput");
const postSaleEcommerceCodeInput = document.getElementById("postSaleEcommerceCodeInput");
const postSaleEcommerceUrlInput = document.getElementById("postSaleEcommerceUrlInput");
const postSaleEcommerceInstructionsInput = document.getElementById("postSaleEcommerceInstructionsInput");
const postSaleExpiresModeInput = document.getElementById("postSaleExpiresModeInput");
const postSaleExpiresAtInput = document.getElementById("postSaleExpiresAtInput");
const postSaleExpiryHint = document.getElementById("postSaleExpiryHint");
const postSaleExpiryDateHint = document.getElementById("postSaleExpiryDateHint");
const postSaleExpirySummary = document.getElementById("postSaleExpirySummary");
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
const triviaInviteMessageInput = document.getElementById("triviaInviteMessageInput");
const triviaMaxWinnersInput = document.getElementById("triviaMaxWinnersInput");
const triviaBenefitLabelInput = document.getElementById("triviaBenefitLabelInput");
const triviaBenefitTypeInput = document.getElementById("triviaBenefitTypeInput");
const triviaBenefitProductModeInput = document.getElementById("triviaBenefitProductModeInput");
const triviaBenefitProductInput = document.getElementById("triviaBenefitProductInput");
const triviaBenefitValueInput = document.getElementById("triviaBenefitValueInput");
const triviaBenefitFulfillmentModeInput = document.getElementById("triviaBenefitFulfillmentModeInput");
const triviaEcommerceCodeInput = document.getElementById("triviaEcommerceCodeInput");
const triviaEcommerceUrlInput = document.getElementById("triviaEcommerceUrlInput");
const triviaEcommerceInstructionsInput = document.getElementById("triviaEcommerceInstructionsInput");
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
const minigameSpecificTitle = document.getElementById("minigameSpecificTitle");
const minigameSpecificSummary = document.getElementById("minigameSpecificSummary");
const minigameSpecificConfigPanel = document.getElementById("minigameSpecificConfigPanel");
const minigameSpecificHelp = document.getElementById("minigameSpecificHelp");
const battleshipShipCountInput = document.getElementById("battleshipShipCountInput");
const battleshipShip1Input = document.getElementById("battleshipShip1Input");
const battleshipShip2Input = document.getElementById("battleshipShip2Input");
const battleshipShip3Input = document.getElementById("battleshipShip3Input");
const triviaLauncherMessage = document.getElementById("triviaLauncherMessage");
const triviaLauncherResult = document.getElementById("triviaLauncherResult");
const triviaLauncherTable = document.getElementById("triviaLauncherTable");
const activationShareModal = document.getElementById("activationShareModal");
const activationShareCloseButton = document.getElementById("activationShareCloseButton");
const activationShareTitle = document.getElementById("activationShareTitle");
const activationShareSearchInput = document.getElementById("activationShareSearchInput");
const activationShareSearchButton = document.getElementById("activationShareSearchButton");
const activationShareLeadList = document.getElementById("activationShareLeadList");
const activationShareSelectedContact = document.getElementById("activationShareSelectedContact");
const activationShareMessagePreview = document.getElementById("activationShareMessagePreview");
const activationShareMessage = document.getElementById("activationShareMessage");
const activationShareOpenWhatsAppButton = document.getElementById("activationShareOpenWhatsAppButton");
const activationShareCopyMessageButton = document.getElementById("activationShareCopyMessageButton");
const productVoteImages = {};
const customerAcquisitionForm = document.getElementById("customerAcquisitionForm");
const customerAcquisitionAmountInput = document.getElementById("customerAcquisitionAmountInput");
const customerAcquisitionCurrencyInput = document.getElementById("customerAcquisitionCurrencyInput");
const customerAcquisitionCampaignInput = document.getElementById("customerAcquisitionCampaignInput");
const customerAcquisitionProductInput = document.getElementById("customerAcquisitionProductInput");
const customerAcquisitionCustomerLookupInput = document.getElementById("customerAcquisitionCustomerLookupInput");
const customerAcquisitionCustomerSelect = document.getElementById("customerAcquisitionCustomerSelect");
const customerAcquisitionCustomerStatus = document.getElementById("customerAcquisitionCustomerStatus");
const customerAcquisitionNameInput = document.getElementById("customerAcquisitionNameInput");
const customerAcquisitionDocumentInput = document.getElementById("customerAcquisitionDocumentInput");
const customerAcquisitionPhoneInput = document.getElementById("customerAcquisitionPhoneInput");
const customerAcquisitionEmailInput = document.getElementById("customerAcquisitionEmailInput");
const customerAcquisitionSourceInput = document.getElementById("customerAcquisitionSourceInput");
const customerAcquisitionChannelInput = document.getElementById("customerAcquisitionChannelInput");
const customerAcquisitionAffiliateInput = document.getElementById("customerAcquisitionAffiliateInput");
const customerAcquisitionNotesInput = document.getElementById("customerAcquisitionNotesInput");
const customerAcquisitionMessage = document.getElementById("customerAcquisitionMessage");
const customerSaleItemsContainer = document.getElementById("customerSaleItemsContainer");
const customerSaleAddItemButton = document.getElementById("customerSaleAddItemButton");
const customerSaleTotalPreview = document.getElementById("customerSaleTotalPreview");
const inventoryProductForm = document.getElementById("inventoryProductForm");
const inventoryProductIdInput = document.getElementById("inventoryProductIdInput");
const inventoryNameInput = document.getElementById("inventoryNameInput");
const inventoryBarcodeInput = document.getElementById("inventoryBarcodeInput");
const inventorySkuInput = document.getElementById("inventorySkuInput");
const inventoryCategoryInput = document.getElementById("inventoryCategoryInput");
const inventoryBrandInput = document.getElementById("inventoryBrandInput");
const inventoryUnitPriceInput = document.getElementById("inventoryUnitPriceInput");
const inventoryCostPriceInput = document.getElementById("inventoryCostPriceInput");
const inventoryCurrencyInput = document.getElementById("inventoryCurrencyInput");
const inventoryStockInput = document.getElementById("inventoryStockInput");
const inventoryMinStockInput = document.getElementById("inventoryMinStockInput");
const inventoryUnitLabelInput = document.getElementById("inventoryUnitLabelInput");
const inventoryStatusInput = document.getElementById("inventoryStatusInput");
const inventoryDescriptionInput = document.getElementById("inventoryDescriptionInput");
const inventoryMessage = document.getElementById("inventoryMessage");
const inventorySaveButton = document.getElementById("inventorySaveButton");
const inventoryResetButton = document.getElementById("inventoryResetButton");
const refreshInventoryButton = document.getElementById("refreshInventoryButton");
const inventoryFormTitle = document.getElementById("inventoryFormTitle");
const inventoryKpiGrid = document.getElementById("inventoryKpiGrid");
const inventorySearchInput = document.getElementById("inventorySearchInput");
const inventoryTable = document.getElementById("inventoryTable");
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
const qrBatchBenefitProductModeInput = document.getElementById("qrBatchBenefitProductModeInput");
const qrBatchBenefitProductInput = document.getElementById("qrBatchBenefitProductInput");
const qrBatchBenefitValueInput = document.getElementById("qrBatchBenefitValueInput");
const qrBatchBenefitFulfillmentModeInput = document.getElementById("qrBatchBenefitFulfillmentModeInput");
const qrBatchEcommerceCodeInput = document.getElementById("qrBatchEcommerceCodeInput");
const qrBatchEcommerceUrlInput = document.getElementById("qrBatchEcommerceUrlInput");
const qrBatchEcommerceInstructionsInput = document.getElementById("qrBatchEcommerceInstructionsInput");
const qrBatchClaimRequiredInput = document.getElementById("qrBatchClaimRequiredInput");
const qrBatchExpiresModeInput = document.getElementById("qrBatchExpiresModeInput");
const qrBatchExpiresAtInput = document.getElementById("qrBatchExpiresAtInput");
const qrBatchExpiryHint = document.getElementById("qrBatchExpiryHint");
const qrBatchExpiryDateHint = document.getElementById("qrBatchExpiryDateHint");
const qrBatchExpirySummary = document.getElementById("qrBatchExpirySummary");
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
const ticketStatusBoard = document.getElementById("ticketStatusBoard");
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
const campaignStrategyAssistantButton = document.getElementById("campaignStrategyAssistantButton");
const campaignManualEntryButton = document.getElementById("campaignManualEntryButton");
const campaignWizardEntryButton = document.getElementById("campaignWizardEntryButton");
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
const campaignStrategyWizardModal = document.getElementById("campaignStrategyWizardModal");
const campaignStrategyWizardCloseButton = document.getElementById("campaignStrategyWizardCloseButton");
const strategyWizardProgressText = document.getElementById("strategyWizardProgressText");
const strategyWizardProgressBar = document.getElementById("strategyWizardProgressBar");
const strategyWizardStepKicker = document.getElementById("strategyWizardStepKicker");
const strategyWizardStepTitle = document.getElementById("strategyWizardStepTitle");
const strategyWizardStepHelp = document.getElementById("strategyWizardStepHelp");
const strategyWizardStepBody = document.getElementById("strategyWizardStepBody");
const strategyWizardBackButton = document.getElementById("strategyWizardBackButton");
const strategyWizardSkipButton = document.getElementById("strategyWizardSkipButton");
const strategyWizardDraftButton = document.getElementById("strategyWizardDraftButton");
const strategyWizardSuggestButton = document.getElementById("strategyWizardSuggestButton");
const strategyWizardNextButton = document.getElementById("strategyWizardNextButton");
const strategyWizardSummary = document.getElementById("strategyWizardSummary");
const strategyWizardOptimizeButton = document.getElementById("strategyWizardOptimizeButton");
const strategyWizardApplyButton = document.getElementById("strategyWizardApplyButton");
const strategyWizardMessage = document.getElementById("strategyWizardMessage");
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
  digitalAssets: [],
  digitalAssetsLoaded: false,
  leadCaptureActivations: [],
  leadCaptureLoaded: false,
  selectedLeadCaptureId: null,
  selectedLeadCaptureDetail: null,
  selectedRewardPassId: null,
  selectedRewardPass: null,
  selectedCampaignId: null,
  selectedCampaign: null,
  selectedCampaignAffiliates: [],
  campaignSectionTab: "analysis",
  campaignCostCalculator: null,
  campaignCostCalculatorCampaignId: null,
  selectedReport: null,
  selectedLeads: [],
  contactFeed: [],
  contactFeedRetention: null,
  contactFeedGate: null,
  contactFeedLoaded: false,
  contactCenterMounted: false,
  contactCenterTab: "overview",
  leadCrmRows: [],
  leadCrmPagination: { total: 0, limit: 40, offset: 0, has_more: false },
  leadCrmLoaded: false,
  leadCrmLoading: false,
  leadCrmFilters: {
    search: "",
    campaign_id: "",
    status: "",
    is_affiliate: "",
    has_purchases: "",
    ticket_filter: "",
    priority: "",
    score_min: "",
    score_max: "",
    channel: "",
  },
  selectedLeadDetail: null,
  selectedLeadTab: "summary",
  selectedLeadRef: null,
  lastLeadActivationLink: "",
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
  strategyWizardStep: 0,
  strategyWizardAnswers: {},
  strategyWizardDraft: null,
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
  currentLauncherActivationId: null,
  activationShareId: null,
  activationShareLeads: [],
  activationShareSelectedKey: "",
  activationShareLoading: false,
  affiliatesLoaded: false,
  affiliatePointRules: null,
  affiliateRewardRules: [],
  affiliateRewardUnlocks: [],
  affiliatePurchaseItems: [{ name: "", quantity: 1, unit_price: 0 }],
  customerSaleItems: [{ name: "", quantity: 1, unit_price: 0 }],
  inventoryProducts: [],
  inventoryLoaded: false,
  inventorySearch: "",
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
  if (merged.affiliate_points) {
    state.affiliatePointRules = merged.affiliate_points;
  }
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
  FRIEND_REFERRAL: "Recomendación de un amigo",
  FAIR_EVENT: "Feria o evento",
  INTERNET_SEARCH: "Internet / buscador",
  SOCIAL_MEDIA: "Redes sociales",
  PAID_ADS: "Pauta digital",
  QR_SCAN: "Ticket / pieza impresa",
  OTHER: "Otro",
};

const COMMAND_CENTER_RANGE_LABELS = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
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
  lead: { name: "Lead", description: "Persona capturada por una campaña, ticket, formulario o canal comercial.", formula: "Conteo de registros de clientes potenciales asociados al negocio.", example: "Un cliente deja nombre y teléfono después de escanear un ticket.", decisión: "Si suben los leads pero no las ventas, refuerza seguimiento y oferta." },
  qr_generated: { name: "Ticket generado", description: "Codigo creado para activar, reclamar, redimir o rastrear una estrategia RMS.", formula: "Conteo de tickets creados en el periodo filtrado.", example: "50 tickets impresos para una feria o volante.", decisión: "Si hay muchos tickets sin redimir, crea urgencia o mejora el beneficio." },
  active_qr: { name: "Ticket activo", description: "Ticket disponible para uso, reclamo o redención.", formula: "Ticket con estado activo y vigencia util.", example: "Beneficios listos para validar en tienda.", decisión: "Activa recordatorios si se acumulan Ticket activos sin redención." },
  redeemed_qr: { name: "Ticket redimido", description: "Ticket usado por un cliente y validado por el negocio.", formula: "Conteo de redenciones confirmadas.", example: "Cliente llega a tienda y valida su beneficio.", decisión: "Cruza redenciones con ventas para medir revenue real." },
  expired_qr: { name: "Ticket vencido", description: "Ticket que ya no puede usarse por fecha o estado.", formula: "Conteo de tickets con estado vencido o fecha expirada.", example: "Beneficio no reclamado antes del limite.", decisión: "Reduce vigencia o envia recordatorios antes del vencimiento." },
  redemption_rate: { name: "Tasa de redención", description: "Mide cuantos tickets generados terminaron siendo usados.", formula: "Tickets redimidos / tickets generados.", example: "20 redenciones sobre 100 tickets = 20%.", decisión: "Si es baja, revisa beneficio, urgencia, canal y entrenamiento del equipo." },
  conversion_rate: { name: "Tasa de conversión", description: "Mide cuantas oportunidades terminaron en venta registrada.", formula: "Ventas registradas / leads o redenciones, según el contexto.", example: "10 ventas sobre 100 leads = 10%.", decisión: "Si baja, revisa cierre comercial, oferta y seguimiento." },
  revenue: { name: "Revenue atribuido", description: "Ingreso registrado y conectado a campañas, tickets, canales o ventas RMS.", formula: "Suma de ventas atribuidas al periodo y filtros activos.", example: "$2.500.000 vendidos por una campaña de Instagram.", decisión: "Escala lo que produce revenue, no solo lo que produce trafico." },
  avg_ticket: { name: "Ticket promedio", description: "Valor promedio de compra por venta registrada.", formula: "Revenue atribuido / ventas registradas.", example: "$1.000.000 / 5 ventas = $200.000.", decisión: "Canales de menor volumen pueden valer más si traen ticket alto." },
  cac: { name: "CAC", description: "Costo estimado de adquirir una venta o cliente.", formula: "Inversión atribuida / ventas registradas.", example: "$300.000 de pauta / 10 ventas = $30.000 por venta.", decisión: "Si el CAC supera el margen, optimiza canal, incentivo o segmentacion." },
  roi: { name: "ROI", description: "Retorno estimado de la inversión de marketing.", formula: "(Revenue - inversión) / inversión.", example: "$1.200.000 de revenue con $300.000 de inversión = 3x.", decisión: "Repite y escala campañas con ROI positivo y datos confiables." },
  channel: { name: "Canal de llegada", description: "Origen por donde el cliente llego o compro.", formula: "Clasificación de leads, tickets, redenciones o ventas por fuente.", example: "Instagram, referidos, vitrina, feria o ticket físico.", decisión: "Compara canales por revenue, no solo por volumen." },
  affiliate: { name: "Afiliado", description: "Persona que recomienda y genera compras medibles con tickets o referidos.", formula: "Afiliados activos y ventas asociadas a su recomendación.", example: "Un cliente compra por ticket de un afiliado.", decisión: "Premia afiliados con alto ticket y entregales más tickets." },
  branch: { name: "Sucursal", description: "Punto físico o sede donde se redime, vende o atiende.", formula: "Agrupación de redenciones y ventas por branch_id.", example: "Sucursal Norte convierte mejor que Centro.", decisión: "Replica prácticas de la sede líder y capacita sedes rezagadas." },
  campaign: { name: "Campaña", description: "Estrategia comercial o promocional conectada a tickets, leads y revenue.", formula: "Datos agrupados por campaign_id.", example: "Feria Junio, Lanzamiento postventa o pauta Instagram.", decisión: "Escala campañas con conversión y revenue; optimiza las de solo leads." },
  mg_score: { name: "MG Revenue Score", description: "Score de salud comercial que resume redención, conversión, revenue, referidos, sucursales y calidad de datos.", formula: "Promedio ponderado de dimensiones RMS normalizadas de 0 a 100.", example: "82/100 indica buena salud con oportunidades puntuales.", decisión: "Usa las dimensiones bajas para priorizar la siguiente mejora." },
};

const CHART_FOCUS_REGISTRY = {
  "executive-summary": { title: "Modo ejecutivo RMS", subtitle: "Resumen para socios y decisiones rapidas", chartType: "summary", primaryMetric: "revenue", description: "Resume revenue, canal ganador, campaña ganadora, sucursal líder y riesgo principal.", calculation: "Combina KPIs y rankings del periodo filtrado.", businessMeaning: "Permite explicar en una reunion que estrategia trajo ventas reales.", recommendedActions: ["Presenta este resumen en comite comercial.", "Abre el detalle del canal o campaña ganadora.", "Convierte el riesgo principal en tarea operativa."], supportedDrilldowns: ["campaign", "channel", "branch"], relatedMetrics: ["revenue", "conversion_rate", "avg_ticket"], dataDictionaryKeys: ["revenue", "channel", "campaign", "branch"] },
  "rms-funnel": { title: "Funnel RMS", subtitle: "De campaña a revenue", chartType: "funnel", primaryMetric: "conversion_rate", description: "Muestra como avanzan las personas desde la campaña hasta la venta.", calculation: "Cuenta etapas del flujo: leads, tickets generados, reclamados, redimidos, ventas y revenue.", businessMeaning: "Permite detectar donde se pierde valor comercial.", recommendedActions: ["Si hay muchos leads y pocos tickets, revisa captura.", "Si hay muchos tickets y pocas redenciones, crea urgencia.", "Si hay redenciones sin venta, revisa oferta o cierre en tienda."], supportedDrilldowns: ["stage", "campaign", "channel", "branch"], relatedMetrics: ["lead", "qr_generated", "redeemed_qr", "revenue"], dataDictionaryKeys: ["lead", "qr_generated", "redemption_rate", "conversion_rate", "revenue"] },
  "revenue-score": { title: "MG Revenue Score", subtitle: "Salud comercial del RMS", chartType: "radar", primaryMetric: "mg_score", description: "Evalúa dimensiones comerciales clave en una escala de 0 a 100.", calculation: "Promedia dimensiones normalizadas de captación, redención, conversión, revenue, fidelización, referidos, sucursales y calidad de datos.", businessMeaning: "Convierte muchos indicadores en una lectura ejecutiva accionable.", recommendedActions: ["Ataca primero la dimensión con menor score.", "Usa el radar para explicar fortalezas y riesgos.", "Compara contra el periodo anterior después de cada ajuste."], supportedDrilldowns: ["dimensión"], relatedMetrics: ["mg_score", "redemption_rate", "conversion_rate", "revenue"], dataDictionaryKeys: ["mg_score", "redemption_rate", "conversion_rate", "revenue"] },
  timeline: { title: "Línea temporal multiserie", subtitle: "Leads, tickets, redenciones, ventas y revenue por fecha", chartType: "line", primaryMetric: "revenue", description: "Muestra la evolución del ciclo RMS en el tiempo.", calculation: "Agrupa eventos por día dentro del periodo filtrado.", businessMeaning: "Ayuda a detectar días fuertes, caídas y anomalías.", recommendedActions: ["Investiga picos y caídas.", "Replica los días con mayor conversión.", "Cruza con activaciones comerciales o eventos."], supportedDrilldowns: ["date", "metric"], relatedMetrics: ["lead", "qr_generated", "redeemed_qr", "revenue"], dataDictionaryKeys: ["lead", "qr_generated", "redeemed_qr", "revenue"] },
  heatmap: { title: "Heatmap horario", subtitle: "Redenciones por día y hora", chartType: "heatmap", primaryMetric: "redemptions", description: "Muestra cuando se concentran las redenciones.", calculation: "Cuenta redenciones por día de semana y hora.", businessMeaning: "Sirve para reforzar equipo, horarios y activaciones.", recommendedActions: ["Refuerza vendedores en horas calientes.", "Activa recordatorios antes de los mejores bloques.", "Compara sucursales si una hora convierte mejor."], supportedDrilldowns: ["weekday", "hour"], relatedMetrics: ["redeemed_qr", "branch", "conversion_rate"], dataDictionaryKeys: ["redeemed_qr", "branch", "conversion_rate"] },
  matrix: { title: "Matriz campaña vs canal", subtitle: "Cruce exacto entre estrategia y fuente", chartType: "matrix", primaryMetric: "revenue", description: "Cruza campañas con canales para encontrar combinaciones rentables.", calculation: "Agrupa leads, tickets, redenciones, ventas y revenue por campaña y canal.", businessMeaning: "Identifica que combinacion merece repetirse, optimizarse o pausarse.", recommendedActions: ["Escala celdas con revenue alto.", "Optimiza celdas con leads pero baja venta.", "Investiga celdas vacias con gasto o esfuerzo comercial."], supportedDrilldowns: ["campaign", "channel", "metric"], relatedMetrics: ["campaign", "channel", "revenue", "conversion_rate"], dataDictionaryKeys: ["campaign", "channel", "revenue", "conversion_rate"] },
  treemap: { title: "Treemap de revenue por canal", subtitle: "Canales que aportan ingreso real", chartType: "treemap", primaryMetric: "revenue", description: "Dimensiona los canales según el revenue atribuido.", calculation: "Suma ventas registradas por canal de llegada.", businessMeaning: "Diferencia canales de ruido contra canales que compran.", recommendedActions: ["Escala el canal con mejor revenue y conversión.", "No descartes canales chicos si tienen ticket alto.", "Completa origen de ventas para mejorar la lectura."], supportedDrilldowns: ["channel"], relatedMetrics: ["channel", "revenue", "avg_ticket", "roi"], dataDictionaryKeys: ["channel", "revenue", "avg_ticket", "roi"] },
  "campaign-comparison": { title: "Campañas comparadas", subtitle: "Leads, tickets, redenciones, ventas y revenue", chartType: "bar", primaryMetric: "revenue", description: "Compara campañas por impacto comercial.", calculation: "Agrupa métricas RMS por campaña y las ordena por desempeño.", businessMeaning: "Permite decidir que campaña repetir, escalar, optimizar o pausar.", recommendedActions: ["Abre la campaña ganadora y replica su canal.", "Optimiza campañas con leads sin ventas.", "Pausa campañas sin revenue ni conversión."], supportedDrilldowns: ["campaign"], relatedMetrics: ["campaign", "lead", "redeemed_qr", "revenue"], dataDictionaryKeys: ["campaign", "lead", "redeemed_qr", "revenue", "roi"] },
  sankey: { title: "Sankey RMS", subtitle: "Flujo de atribución", chartType: "sankey", primaryMetric: "revenue", description: "Conecta canal, campaña, ticket/redención, venta y revenue.", calculation: "Construye enlaces agregados desde origen hasta venta registrada.", businessMeaning: "Explica como se mueve el valor dentro del RMS.", recommendedActions: ["Haz foco en enlaces con mayor salida a ventas.", "Investiga nodos con mucho volumen y baja continuidad.", "Aplica filtro global sobre el nodo más rentable."], supportedDrilldowns: ["node", "channel", "campaign"], relatedMetrics: ["channel", "campaign", "revenue"], dataDictionaryKeys: ["channel", "campaign", "redeemed_qr", "revenue"] },
  "affiliate-network": { title: "Red de afiliados y referidos", subtitle: "Voz a voz medible", chartType: "network", primaryMetric: "revenue", description: "Muestra afiliados como nodos conectados al negocio.", calculation: "Agrupa actividad, puntos, compras y revenue por afiliado.", businessMeaning: "Detecta quienes recomiendan clientes que compran.", recommendedActions: ["Premia afiliados con alto revenue.", "Genera más tickets para afiliados activos.", "Reactiva afiliados sin última actividad."], supportedDrilldowns: ["affiliate"], relatedMetrics: ["affiliate", "revenue", "avg_ticket"], dataDictionaryKeys: ["affiliate", "revenue", "avg_ticket"] },
  "branch-ranking": { title: "Ranking de sucursales", subtitle: "Redenciones, ventas, revenue y conversión", chartType: "ranking", primaryMetric: "revenue", description: "Compara sedes por ejecución comercial.", calculation: "Agrupa redenciones y ventas por sucursal.", businessMeaning: "Muestra que sede convierte mejor y donde hay oportunidad operativa.", recommendedActions: ["Replica prácticas de la sucursal líder.", "Capacita sedes con redenciones sin ventas.", "Filtra por sucursal para ver detalles."], supportedDrilldowns: ["branch"], relatedMetrics: ["branch", "redeemed_qr", "revenue", "conversion_rate"], dataDictionaryKeys: ["branch", "redeemed_qr", "revenue", "conversion_rate"] },
  "qr-status": { title: "Estados de tickets", subtitle: "Activos, redimidos, vencidos y reclamados", chartType: "donut", primaryMetric: "qr_generated", description: "Muestra la salud operativa del inventario de tickets.", calculation: "Cuenta tickets agrupados por estado.", businessMeaning: "Ayuda a detectar oportunidad perdida o beneficios no usados.", recommendedActions: ["Si hay muchos vencidos, mejora recordatorios.", "Si hay muchos activos, crea urgencia.", "Si hay pocos redimidos, revisa beneficio y canal."], supportedDrilldowns: ["status"], relatedMetrics: ["qr_generated", "active_qr", "redeemed_qr", "expired_qr"], dataDictionaryKeys: ["qr_generated", "active_qr", "redeemed_qr", "expired_qr"] },
  scatter: { title: "Scatter de campañas", subtitle: "Inversión o tickets vs revenue", chartType: "scatter", primaryMetric: "roi", description: "Ubica campañas según esfuerzo y resultado.", calculation: "Eje X usa inversión o tickets generados; eje Y usa revenue o ventas; tamano usa leads.", businessMeaning: "Encuentra campañas sanas, costosas o escalables.", recommendedActions: ["Escala puntos con alto revenue y bajo esfuerzo.", "Optimiza puntos con muchos leads y poco revenue.", "Investiga campañas sin datos completos."], supportedDrilldowns: ["campaign"], relatedMetrics: ["campaign", "qr_generated", "revenue", "roi"], dataDictionaryKeys: ["campaign", "qr_generated", "revenue", "roi"] },
  waterfall: { title: "Waterfall de revenue", subtitle: "Composicion del ingreso", chartType: "waterfall", primaryMetric: "revenue", description: "Muestra como se compone el revenue total por canales principales.", calculation: "Parte de revenue total y desglosa contribuciones por canal.", businessMeaning: "Explica de donde viene el dinero de forma ejecutiva.", recommendedActions: ["Prioriza los canales con mayor contribucion.", "Completa ventas sin origen.", "Compara canales con ticket alto."], supportedDrilldowns: ["channel"], relatedMetrics: ["revenue", "channel", "avg_ticket"], dataDictionaryKeys: ["revenue", "channel", "avg_ticket"] },
  cohorts: { title: "Cohort postventa", subtitle: "Recompra y ticket postventa", chartType: "cohort", primaryMetric: "retention", description: "Mide si las ventas generan nuevas visitas o recompras.", calculation: "Agrupa compras por cohorte y cuenta ticket postventa generados y redimidos.", businessMeaning: "Indica si el RMS crea fidelización después de la primera compra.", recommendedActions: ["Crea ticket postventa para compradores recientes.", "Escala beneficios que traen recompra.", "Mide cohortes por mes para ver retención."], supportedDrilldowns: ["cohort"], relatedMetrics: ["revenue", "redeemed_qr", "avg_ticket"], dataDictionaryKeys: ["revenue", "redeemed_qr", "avg_ticket"] },
  "power-table": { title: "Tabla PowerBI-style", subtitle: "Drill-down por campaña", chartType: "table", primaryMetric: "revenue", description: "Tabla ejecutiva para ordenar, buscar y abrir detalle por campaña.", calculation: "Une KPIs de campaña con canal dominante, CAC, ROI, conversión y decisión sugerida.", businessMeaning: "Convierte la data en una lista de prioridades comerciales.", recommendedActions: ["Ordena por revenue para repetir.", "Ordena por conversión para escalar.", "Ordena por ROI para optimizar inversión."], supportedDrilldowns: ["campaign", "channel"], relatedMetrics: ["campaign", "revenue", "roi", "conversion_rate"], dataDictionaryKeys: ["campaign", "channel", "revenue", "cac", "roi", "conversion_rate"] },
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
      localStorage.setItem(APP_UPDATE_NOTICE_KEY, "Actualizamos el portal. Por seguridad cerramos tu sesión anterior; inicia sesión de nuevo para cargar la version vigente.");
      localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
      return null;
    }
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    const parsed = normalizeSession(JSON.parse(rawSession));
    if (parsed && isSessionExpired(parsed, 0)) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(VALIDATOR_SESSION_KEY);
      localStorage.setItem(APP_UPDATE_NOTICE_KEY, "Tu sesión expiro. Inicia sesión de nuevo para continuar.");
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
  stopValidatorScanner();
  stopAffiliateFinderScanner();
  resetBusinessScopedState({ session: null });
  session = null;
  hideFeedback();
  hideBusyOverlay(true);
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
    localStorage.setItem(APP_UPDATE_NOTICE_KEY, message || "Tu sesión debe actualizarse. Inicia sesión de nuevo.");
  } catch {
    // The login panel still renders even if storage is unavailable.
  }
  renderShell();
}

function assertActiveSession() {
  if (!session?.token) {
    throw new Error("Debes iniciar sesión.");
  }
  if (isSessionExpired(session)) {
    forceLoginAfterSessionIssue("Tu sesión expiro. Inicia sesión de nuevo para continuar.");
    throw new Error("Sesión expirada.");
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
          ? "Información"
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
  busyOverlayMessage.textContent = message || "Estamos sincronizando la información.";
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
  if (profileName) profileName.textContent = "Sesión";
  if (profileAvatar) profileAvatar.textContent = "MG";
  if (requestCampaignButton) requestCampaignButton.textContent = "Nueva campaña";
  if (subscriptionBanner) subscriptionBanner.classList.add("hidden");
  if (campaignBreadcrumb) campaignBreadcrumb.textContent = "Campaña";
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
    [inventoryTable, 7, "Abre Inventario para cargar productos."],
    [rewardPassTable, 8, "Cargando Reward Pass..."],
    [rewardPassRedemptionTable, 9, "Cargando historial..."],
    [rewardPassTicketLedgerTable, 5, "Cargando movimientos..."],
  ];
  loadingRows.forEach(([element, colspan, message]) => {
    if (element) element.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
  });

  if (campaignList) campaignList.innerHTML = '<article class="campaign-item"><p>Cargando campañas de la empresa activa...</p></article>';
  if (leadFeedTable) leadFeedTable.innerHTML = '<tr><td colspan="9">Cargando contactos...</td></tr>';
  if (strategicQrKpiGrid) {
    strategicQrKpiGrid.innerHTML = '<article class="surface-card kpi-card"><span class="mono-label">Gaming Center</span><strong class="kpi-value">Cargando</strong><p class="kpi-meta">Preparando datos de la empresa activa.</p></article>';
  }
  if (postSaleQrResult) {
    postSaleQrResult.classList.add("hidden");
    postSaleQrResult.innerHTML = "";
  }
  if (postSaleQrMessage) setInlineMessage(postSaleQrMessage, "", "info");
  if (validatorQrTokenInput) validatorQrTokenInput.value = "";
  if (validatorManualStatus) setInlineMessage(validatorManualStatus, "", "info");
  if (validatorSaleForm) validatorSaleForm.reset();
  if (validatorHistoryTable) validatorHistoryTable.innerHTML = '<tr><td colspan="5">Cargando historial de la empresa activa...</td></tr>';
  if (inventorySearchInput) inventorySearchInput.value = "";
  resetInventoryForm();
  setValidatorResult("neutral", "Sin validación", "Escanea o pega un ticket para consultar la base de datos.");
  if (rewardPassKpiGrid) renderSkeletonCards(rewardPassKpiGrid, 4);
  if (rewardPassPreviewTitle) rewardPassPreviewTitle.textContent = "Vista previa";
  if (accountLogoPreview) accountLogoPreview.innerHTML = '<span class="material-symbols-outlined">storefront</span>';
  if (accountTicketFramePreview) accountTicketFramePreview.innerHTML = '<span class="material-symbols-outlined">crop_portrait</span>';
  if (businessLogoTitle) businessLogoTitle.textContent = "Sin logo cargado";
  if (businessLogoPreview) businessLogoPreview.innerHTML = '<span class="material-symbols-outlined">storefront</span>';
  resetQrBatchProgress();
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
  state.digitalAssets = [];
  state.digitalAssetsLoaded = false;
  state.leadCaptureActivations = [];
  state.leadCaptureLoaded = false;
  state.selectedLeadCaptureId = null;
  state.selectedLeadCaptureDetail = null;
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
  state.contactCenterTab = "overview";
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
  state.affiliateRewardRules = [];
  state.affiliateRewardUnlocks = [];
  state.inventoryProducts = [];
  state.inventoryLoaded = false;
  state.inventorySearch = "";
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
      ? "Validando configuración del beneficio y preparando el lote."
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
      forceLoginAfterSessionIssue(data.error?.message || "Tu sesión expiro o el portal fue actualizado. Inicia sesión de nuevo para continuar.");
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
    return "El archivo es demasiado grande. Sube un logo más liviano.";
  }

  const text = rawText
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.includes("Cannot PATCH /api/business/profile")) {
    return "El servidor activo aún no tiene habilitada la ruta para guardar el logo. Reinicia el backend y vuelve a subirlo.";
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

function businessScopeKey(value = session) {
  return [
    value?.token || "",
    value?.user?.id || "",
    value?.user?.business_id || "",
  ].join("|");
}

function isCurrentBusinessScope(scopeKey) {
  return Boolean(scopeKey && session?.token && businessScopeKey() === scopeKey);
}

async function loadAffiliatesData() {
  if (!session?.user?.business_id || !hasPlanFeature("affiliates")) {
    state.affiliatesLoaded = true;
    state.affiliates = [];
    return true;
  }
  const scopeKey = businessScopeKey();
  showFeedback("Cargando afiliados.", "loading", { title: "Sincronizando", timeout: 0 });
  const data = await apiSafe(`/api/portal/businesses/${session.user.business_id}/affiliates`, { headers: authHeaders() }, { affiliates: [] });
  if (!isCurrentBusinessScope(scopeKey)) return;
  state.affiliates = data.affiliates || [];
  state.affiliatePointRules = data.point_rules || state.affiliatePointRules || null;
  state.affiliateRewardRules = data.reward_rules || state.affiliateRewardRules || [];
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
  const scopeKey = businessScopeKey();
  const data = await apiSafe("/api/business/contacts/feed?limit=120", { headers: authHeaders() }, { contacts: [], retention: null, lead_gate: null });
  if (!isCurrentBusinessScope(scopeKey)) return;
  state.contactFeed = data.contacts || [];
  state.contactFeedRetention = data.retention || null;
  state.contactFeedGate = data.lead_gate || null;
  state.contactFeedLoaded = true;
  if (!options.quiet) hideFeedback();
}

function leadCrmQueryString() {
  const filters = {
    search: String(leadCrmSearchInput?.value || state.leadCrmFilters.search || "").trim(),
    campaign_id: leadCrmCampaignFilter?.value || state.leadCrmFilters.campaign_id || "",
    status: leadCrmStatusFilter?.value || state.leadCrmFilters.status || "",
    is_affiliate: leadCrmAffiliateFilter?.value || state.leadCrmFilters.is_affiliate || "",
    has_purchases: leadCrmPurchaseFilter?.value || state.leadCrmFilters.has_purchases || "",
    ticket_filter: leadCrmTicketFilter?.value || state.leadCrmFilters.ticket_filter || "",
    priority: leadCrmPriorityFilter?.value || state.leadCrmFilters.priority || "",
    score_min: leadCrmScoreMinFilter?.value || state.leadCrmFilters.score_min || "",
    score_max: leadCrmScoreMaxFilter?.value || state.leadCrmFilters.score_max || "",
    channel: String(leadCrmChannelFilter?.value || state.leadCrmFilters.channel || "").trim(),
  };
  state.leadCrmFilters = filters;
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (!value) return;
    if (key === "ticket_filter") {
      if (value === "active") params.set("has_active_tickets", "true");
      if (value === "expired") params.set("has_expired_tickets", "true");
      if (value === "inactive") params.set("has_inactive_tickets", "true");
      if (value === "redeemed") params.set("has_redeemed_tickets", "true");
      return;
    }
    params.set(key, value);
  });
  params.set("limit", String(state.leadCrmPagination.limit || 40));
  params.set("offset", String(state.leadCrmPagination.offset || 0));
  return params.toString();
}

async function loadLeadCrmData(options = {}) {
  if (!session?.user?.business_id) {
    state.leadCrmRows = [];
    state.leadCrmLoaded = true;
    return;
  }
  if (state.leadCrmLoaded && !options.force) return;
  state.leadCrmLoading = true;
  if (!options.quiet && leadCrmTable) {
    leadCrmTable.innerHTML = '<tr><td colspan="9">Cargando CRM de leads...</td></tr>';
  }
  const scopeKey = businessScopeKey();
  const data = await apiSafe(`/api/business/leads/crm?${leadCrmQueryString()}`, { headers: authHeaders() }, { leads: [], pagination: { total: 0, limit: 40, offset: 0 } });
  if (!isCurrentBusinessScope(scopeKey)) return;
  state.leadCrmRows = data.leads || [];
  state.leadCrmPagination = data.pagination || { total: 0, limit: 40, offset: 0 };
  state.leadCrmLoaded = true;
  state.leadCrmLoading = false;
}

function refreshLeadCampaignFilterOptions() {
  if (!leadCrmCampaignFilter) return;
  const current = leadCrmCampaignFilter.value;
  leadCrmCampaignFilter.innerHTML = '<option value="">Todas</option>' + (state.campaigns || [])
    .map((campaign) => `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.name || campaign.slug || campaign.id)}</option>`)
    .join("");
  if (current) leadCrmCampaignFilter.value = current;
  if (leadActivationCampaignInput) {
    const selected = leadActivationCampaignInput.value;
    leadActivationCampaignInput.innerHTML = '<option value="">Sin campaña</option>' + (state.campaigns || [])
      .map((campaign) => `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.name || campaign.slug || campaign.id)}</option>`)
      .join("");
    if (selected) leadActivationCampaignInput.value = selected;
  }
}

async function refreshLeadCrm(options = {}) {
  state.leadCrmLoaded = false;
  if (!options.keepOffset) state.leadCrmPagination.offset = 0;
  await loadLeadCrmData({ force: true, quiet: options.quiet });
  renderLeadsView();
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
  const scopeKey = businessScopeKey();
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
      if (!isCurrentBusinessScope(scopeKey)) return;
      state.strategicQrMetrics = data || null;
    }
    if (group === "core") {
      const [packageData, creditData, creditOrdersData] = await Promise.all([
        apiSafe("/api/public/packages", {}, { packages: [] }),
        apiSafe("/api/qr/credits/me", { headers: authHeaders() }, { credit_account: state.qrCreditAccount || null }),
        lightTestMode ? Promise.resolve({ orders: [] }) : apiSafe("/api/payments/qr-credits/orders?limit=20", { headers: authHeaders() }, { orders: [] }),
      ]);
      if (!isCurrentBusinessScope(scopeKey)) return;
      state.qrPackageOffers = packageData.packages || [];
      state.pricing = packageData.pricing || state.pricing;
      state.qrCreditAccount = creditData.credit_account || state.qrCreditAccount || null;
      state.qrCreditOrders = creditOrdersData.orders || [];
    }
    if (group === "batches") {
      const data = lightTestMode
        ? { batches: [] }
        : await apiSafe("/api/business/qr/batches?limit=80", { headers: authHeaders() }, { batches: [] });
      if (!isCurrentBusinessScope(scopeKey)) return;
      state.strategicQrBatches = data.batches || [];
    }
    if (group === "history") {
      const data = lightTestMode
        ? { history: [] }
        : await apiSafe("/api/business/qr/history?limit=120", { headers: authHeaders() }, { history: [] });
      if (!isCurrentBusinessScope(scopeKey)) return;
      state.strategicQrHistory = data.history || [];
    }
    if (group === "activations") {
      const data = await apiSafe("/api/business/interactive-activations?limit=120", { headers: authHeaders() }, { activations: [], trivias: [] });
      if (!isCurrentBusinessScope(scopeKey)) return;
      state.triviaLaunchers = data.activations || data.trivias || [];
    }
    if (group === "affiliates") {
      const data = !lightTestMode && hasPlanFeature("affiliates")
        ? await apiSafe(`/api/portal/businesses/${session.user.business_id}/affiliates`, { headers: authHeaders() }, { affiliates: [] })
        : { affiliates: [] };
      if (!isCurrentBusinessScope(scopeKey)) return;
      state.affiliates = data.affiliates || [];
      state.affiliatePointRules = data.point_rules || state.affiliatePointRules || null;
      state.affiliatesLoaded = true;
    }
    if (!isCurrentBusinessScope(scopeKey)) return;
    state.ticketCenterLoadedAt = {
      ...(state.ticketCenterLoadedAt || {}),
      [group]: Date.now(),
    };
  });

  await Promise.all(loaders);
  if (!isCurrentBusinessScope(scopeKey)) return;
  state.strategicQrLoaded = true;
  state.ticketCenterLoading = false;
  if (!quiet) hideFeedback();
}

async function loadTicketCenterForCurrentTab(options = {}) {
  const scopeKey = businessScopeKey();
  await loadStrategicQrData({
    groups: ticketCenterGroupsForTab(state.ticketCenterTab),
    ...options,
  });
  if (!isCurrentBusinessScope(scopeKey)) return;
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
  if (!plan?.monthly_price_cop) return plan?.price_label || "Cotización";
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
    return "Portal Base: no tiene fecha mensual de renovación.";
  }
  if (plan.lifetime_access || plan.monthly_payment_required === false) {
    return "Plan vitalicio activo: no requiere pago mensual ni fecha de renovación.";
  }
  if (!plan.official_payment_due_at) {
    return "Mensualidad activa sin fecha oficial de renovación configurada.";
  }
  const dueDate = formatDateOnly(plan.official_payment_due_at);
  const graceDate = formatDateOnly(plan.grace_period_ends_at);
  if (plan.access_status === "LOCKED") {
    return `Acceso al portal bloqueado. La fecha oficial de pago fue ${dueDate}; la gracia termino el ${graceDate}. Tus datos siguen guardados.`;
  }
  if (plan.access_status === "GRACE") {
    return `Pago vencido el ${dueDate}. Quedan ${formatLimitValue(plan.days_until_lock)} día(s) de gracia antes del bloqueo del portal.`;
  }
  if (plan.days_until_due === 0) {
    return `La mensualidad vence hoy (${dueDate}). Después tienes ${formatLimitValue(plan.grace_period_days)} días de gracia.`;
  }
  return `Renovación oficial: ${dueDate}. Quedan ${formatLimitValue(plan.days_until_due)} día(s) para pagar; gracia hasta ${graceDate}.`;
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

function benefitProductScope(modeInput, productInput) {
  const mode = String(modeInput?.value || "").trim();
  const rawProductName = productInputRawValue(productInput);
  if (!mode && !rawProductName) return null;
  const product = findInventoryProduct(productInput?.value || rawProductName);
  const productName = product?.name || rawProductName || null;
  if (!productName) return null;
  return {
    mode: mode || "applies_to_product",
    source: product ? "inventory" : "open",
    inventory_product_id: product?.id || null,
    product_name: productName,
    sku: product?.sku || null,
    barcode: product?.barcode || null,
    unit_price: product?.unit_price !== undefined && product?.unit_price !== null ? Number(product.unit_price) : null,
    currency: product?.currency || null,
  };
}

function withBenefitProductScope(value = {}, productScope = benefitProductScope(triviaBenefitProductModeInput, triviaBenefitProductInput)) {
  if (!productScope) return value || {};
  return {
    ...(value || {}),
    product_scope: productScope,
    product_name: value?.product_name || productScope.product_name,
    inventory_product_id: value?.inventory_product_id || productScope.inventory_product_id || null,
  };
}

function benefitFulfillmentFromInputs(modeInput, codeInput, urlInput, instructionsInput) {
  const mode = String(modeInput?.value || "PHYSICAL_QR").trim() || "PHYSICAL_QR";
  const code = String(codeInput?.value || "").trim();
  const ecommerceUrl = String(urlInput?.value || "").trim();
  const instructions = String(instructionsInput?.value || "").trim();
  if (mode !== "ECOMMERCE_CODE") {
    return {
      mode: "PHYSICAL_QR",
      channel: "physical_store",
      label: "Premio físico / QR en tienda",
      instructions: instructions || "Presenta el QR en el punto autorizado para redimir el beneficio.",
    };
  }
  return {
    mode: "ECOMMERCE_CODE",
    channel: "ecommerce",
    label: "Código para ecommerce",
    ecommerce_code: code,
    ecommerce_url: ecommerceUrl || null,
    instructions: instructions || "Copia este código y aplícalo en el checkout de la tienda online.",
  };
}

function withBenefitFulfillment(value = {}, fulfillment = null) {
  if (!fulfillment) return value || {};
  return {
    ...(value || {}),
    fulfillment,
    redemption_channel: fulfillment.channel,
    ecommerce_code: fulfillment.mode === "ECOMMERCE_CODE" ? fulfillment.ecommerce_code : value?.ecommerce_code,
    ecommerce_url: fulfillment.mode === "ECOMMERCE_CODE" ? fulfillment.ecommerce_url : value?.ecommerce_url,
  };
}

function benefitFulfillmentObject(value = {}, metadata = {}) {
  return value?.fulfillment || value?.value?.fulfillment || metadata?.benefit_fulfillment || null;
}

function benefitFulfillmentLabel(value = {}, metadata = {}) {
  const fulfillment = benefitFulfillmentObject(value, metadata);
  if (!fulfillment) return "";
  if (fulfillment.mode === "ECOMMERCE_CODE") {
    return `Ecommerce: código ${fulfillment.ecommerce_code || "pendiente"}`;
  }
  return "Redención física con QR";
}

function syncBenefitFulfillmentFields() {
  document.querySelectorAll("[data-benefit-fulfillment-mode]").forEach((modeInput) => {
    const panel = modeInput.closest(".benefit-fulfillment-panel");
    const ecommerceMode = modeInput.value === "ECOMMERCE_CODE";
    if (panel) panel.dataset.fulfillmentMode = ecommerceMode ? "ecommerce" : "physical";
    panel?.querySelectorAll("[data-benefit-fulfillment-field='ecommerce']").forEach((field) => {
      field.classList.toggle("hidden", !ecommerceMode);
      field.querySelectorAll("input, select, textarea").forEach((input) => {
        input.disabled = !ecommerceMode;
        if (!ecommerceMode) input.required = false;
      });
    });
  });
}

function productScopeFromValue(value = {}, metadata = {}) {
  return value?.product_scope || value?.value?.product_scope || metadata?.benefit_product_scope || null;
}

function benefitProductScopeLabel(value = {}, metadata = {}) {
  const scope = productScopeFromValue(value, metadata);
  if (!scope?.product_name) return "";
  const modeLabel = scope.mode === "gift_product"
    ? "Obsequio"
    : scope.mode === "applies_to_product"
      ? "Aplica a"
      : "Producto";
  const sourceLabel = scope.source === "inventory" ? "inventario" : "abierto";
  return `${modeLabel}: ${scope.product_name} (${sourceLabel})`;
}

function syncBenefitProductFields(modeInput, productInput, labelInput, typeInput) {
  if (!modeInput || !productInput) return;
  syncProductOpenInput(productInput);
  const productScope = benefitProductScope(modeInput, productInput);
  if (!productScope) return;
  if (!modeInput.value) modeInput.value = "applies_to_product";
  if (productScope.mode === "gift_product" && typeInput) typeInput.value = "FREE_GIFT";
  if (labelInput && !String(labelInput.value || "").trim()) {
    labelInput.value = productScope.mode === "gift_product"
      ? `Reclama ${productScope.product_name}`
      : `Beneficio para ${productScope.product_name}`;
  }
}

function interactiveBaseBenefitLabel(type, activationPayload = {}) {
  const configured = String(triviaBenefitLabelInput?.value || "").trim();
  if (configured.length >= 2) return configured;
  if (type === "SCRATCH_DIGITAL") {
    const firstChoice = (activationPayload.choices || collectFlatChoiceOptions(type))[0];
    const firstLabel = String(firstChoice?.reward_label || firstChoice?.label || "").trim();
    return firstLabel.length >= 2 ? firstLabel : "Beneficio Raspa digital";
  }
  return configured || "Beneficio desbloqueado";
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

function setFormMessage(element, message = "", type = "") {
  if (!element) return;
  element.textContent = message;
  element.dataset.status = type || "";
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
  return `Seguimiento comercial por ${channel}${contactTime} según interés principal.`;
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
  inventory: "portal_access",
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
    subscriptionPlanSummary.textContent = "Sin información de permisos.";
    subscriptionLimits.innerHTML = "";
    if (subscriptionTiming) subscriptionTiming.textContent = "Sin fecha de renovación cargada.";
    return;
  }
  const limits = planLimits();
  const access = state.access || {};
  subscriptionPlanName.textContent = plan.name || plan.code || "Plan";
  subscriptionPlanSummary.textContent = plan.category === "ticket_base"
    ? `Portal Base activo sin mensualidad. Saldo operativo: ${formatNumber(access.ticketBalance || state.qrCreditAccount?.qr_balance || 0)} tickets.`
    : plan.category === "growth_temporal"
      ? `Growth temporal activo${access.daysUntilGrowthExpiration !== null && access.daysUntilGrowthExpiration !== undefined ? `: ${access.daysUntilGrowthExpiration} días restantes` : ""}. Conservas tus tickets al volver a Base.`
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
    ["Campañas", limits.active_campaigns],
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
    plan.code === "GLOBAL" ? "Tickets por cotización según volumen" : "Tickets por recarga separada",
    `${formatLimitValue(limits.users)} usuarios y ${formatLimitValue(limits.branches)} sede(s)`,
    `${formatLimitValue(limits.active_campaigns)} campañas activas`,
  ];
  if (features.leads_export) {
    benefits.push(`${formatLimitValue(limits.lead_exports_month)} exportaciones de leads/mes`);
  }
  if (features.affiliates) {
    benefits.push(`Afiliados incluidos hasta ${formatLimitValue(limits.affiliates)}`);
  }
  if (features.api_access) {
    benefits.push("API para integraciones y operación avanzada");
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
    subscriptionPricingNote.textContent = "Cada plan muestra una parte del siguiente: Base prueba valor con tickets, Growth activa operación mensual, Premium desbloquea RMS completo y Enterprise escala sedes, API y soporte.";
  }
  subscriptionPlansGrid.innerHTML = plans.map((plan) => {
    const ticketPolicy = plan.code === "GLOBAL" ? "tickets por cotización" : "tickets por recarga";
    const recommendedPackage = plan.recommended_start_package || "QR200";
    const portalValue = plan.monthly_price_cop ? planMonthlyLabel(plan) : plan.price_label || "Incluido";
    const monthlyPrice = plan.monthly_price_cop ? planMonthlyLabel(plan) : (plan.price_label || "Cotización");
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
          <span>${plan.monthly_price_cop ? "Pago mensual del portal" : "Cotización personalizada"}; ${escapeHtml(ticketPolicy)}</span>
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
  const firstChargeLabel = firstChargeDate ? formatDateOnly(firstChargeDate) : "próxima renovación";
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
        <span>Validación Mercado Pago</span>
        <strong>$1.600 temporal</strong>
        <small>Mercado Pago lo devuelve enseguida si el banco aprueba.</small>
      </div>
      <div>
        <span>Cuotas</span>
        <strong>Continua en un pago</strong>
        <small>Si Mercado Pago no muestra cuotas, no bloquea la autorización recurrente.</small>
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
          ? `Plan demo: Mercado Pago puede hacer una validación temporal de $1.600; el cobro real sera ${selectedPlanChargeLabel} ${selectedRenewalPlan?.billing_label || "mensual"}.`
        : plan.category === "subscription" && !hasFutureRenewalDate
          ? "Define una fecha de renovación futura antes de inscribir la tarjeta."
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
        ? "En Mercado Pago verás una validación temporal de $1.600. No es el cobro del plan; el primer cobro real queda programado para la fecha indicada."
        : plan.category === "subscription" && !hasFutureRenewalDate
        ? "Para inscribir tarjeta sin cobro inmediato, primero debe existir una fecha futura de renovación."
        : "Inscribir tarjeta solo crea la autorización; el primer cobro queda programado para la siguiente fecha de renovación.";
      setInlineMessage(subscriptionRenewalMessage, `${subscriptionTimingText(plan)} Renovar manualmente abre un pago nuevo. ${autoRenewGuidance}`, "info");
    } else {
      setInlineMessage(subscriptionRenewalMessage, "Compra T200 para activar Portal Base o elige un upgrade mensual cuando necesites más herramientas.", "info");
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
      ["Primer año", deal.first_year_price_label],
      ["Desde segundo año", deal.second_year_price_label],
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
        <td>${escapeHtml(user.full_name || "-")}${isSelf ? '<br><span class="table-secondary">Sesión actual</span>' : ""}</td>
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
  renderDigitalAssets();

  if (accountNameInput) accountNameInput.value = business.name || "";
  if (accountSloganInput) accountSloganInput.value = business.slogan || business.settings?.slogan || business.settings?.tagline || "";
  if (accountNitInput) accountNitInput.value = business.nit || "";
  if (accountContactInput) accountContactInput.value = business.contact_name || "";
  if (accountEmailInput) accountEmailInput.value = business.contact_email || "";
  if (accountPhoneInput) accountPhoneInput.value = business.phone || "";
  if (accountWebsiteInput) accountWebsiteInput.value = business.website || "";
  if (accountCityInput) accountCityInput.value = business.city || "";
  if (accountAddressInput) accountAddressInput.value = business.address || "";
  const affiliatePoints = business.affiliate_points || state.affiliatePointRules || {};
  if (accountAffiliatePointAmountInput) accountAffiliatePointAmountInput.value = String(affiliatePoints.point_amount_cop || 1000);
  if (accountAffiliatePointRateInput) accountAffiliatePointRateInput.value = String(affiliatePoints.referral_rate || 1);
  if (accountAffiliatePointRoundingInput) accountAffiliatePointRoundingInput.value = affiliatePoints.referral_rounding || "floor";

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
      button.title = "Tu plan actual no incluye este módulo.";
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
  const requestedView = view;
  if (view === "sales") {
    state.contactCenterTab = "sales";
    view = "leads";
  }
  if (view === "admin" && !isAdmin()) {
    const fallbackView = state.selectedCampaign ? "campaigns" : "dashboard";
    showFeedback("Ese módulo es interno de Market Games. La gestión de tus campañas esta en el portal del negocio.", "info", { title: "Módulo interno" });
    if (view !== fallbackView) setView(fallbackView);
    return;
  }
  if (!hasPlanFeature(viewFeatureMap[view])) {
    showFeedback("Tu plan actual no incluye este módulo. Puedes solicitar un upgrade para activarlo.", "info", { title: "Módulo bloqueado" });
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
    const isSalesAlias = button.dataset.view === "sales" && view === "leads" && state.contactCenterTab === "sales";
    const isLeadsBase = button.dataset.view === "leads" && view === "leads" && state.contactCenterTab !== "sales";
    const isRegular = button.dataset.view === view && view !== "leads";
    button.classList.toggle("active", isSalesAlias || isLeadsBase || isRegular);
  });
  viewSections.forEach((section) => {
    section.classList.toggle("active", section.dataset.view === view);
  });
  workspace?.classList.remove("sidebar-open");

  segmentTabs.forEach((tab, index) => {
    const active = (view === "redemptions" && index === 0) || (requestedView === "sales" && index === 1);
    tab.classList.toggle("active", active);
  });

  if (view === "dashboard" && state.dashboard) renderDashboard();
  if (view === "account") {
    if (!state.digitalAssetsLoaded || !state.leadCaptureLoaded) {
      Promise.all([
        loadDigitalAssets({ quiet: true }),
        loadLeadCaptureActivations({ quiet: true }),
      ]).then(() => {
        renderDigitalAssets();
        renderLeadCaptureAssetOptions();
        renderLeadCaptureTable();
      });
    }
    renderAccountView();
  }
  if (view === "campaigns" && state.selectedCampaign) renderCampaignView();
  if (viewNeedsCampaignData(view) && state.selectedCampaignId && !state.selectedReport) {
    ensureSelectedCampaignLoaded({ quiet: true }).catch((error) => {
      showFeedback(error.message, "error", { title: "No se pudo cargar la campaña" });
    });
  }
  if (view === "leads") {
    mountContactCenterLayout();
    refreshLeadCampaignFilterOptions();
    if (!state.contactFeedLoaded) {
      loadContactFeedData({ quiet: true }).then(renderLeadsView);
    }
    if (!state.leadCrmLoaded) {
      loadLeadCrmData({ quiet: true }).then(renderLeadsView);
    }
    if (!state.leadCaptureLoaded) {
      loadLeadCaptureActivations({ quiet: true }).then(() => {
        renderLeadCaptureTable();
        renderContactCenterSummary(state.leadCrmRows || []);
      });
    }
    if (state.contactCenterTab === "sales" && !state.affiliatesLoaded) {
      loadAffiliatesData().then(renderSalesView);
    }
    if (state.contactCenterTab === "sales" && !state.inventoryLoaded) {
      loadInventoryProducts({ quiet: true }).then(() => {
        renderInventoryProductOptions();
        renderCustomerSaleItems();
      });
    }
    renderLeadsView();
  }
  if (view === "affiliates") {
    if (!state.inventoryLoaded) {
      loadInventoryProducts({ quiet: true }).then(() => {
        renderInventoryProductOptions();
        renderAffiliatePurchaseItems();
      });
    }
    if (!state.affiliatesLoaded) {
      loadAffiliatesData().then(renderAffiliatesView);
    } else {
      renderAffiliatesView();
    }
  }
  if (view === "inventory") {
    loadInventoryProducts({ quiet: true }).then(renderInventoryView);
    renderInventoryView();
  }
  if (view === "redemptions") renderRedemptionsView();
  if (view === "strategic-qr") {
    if (!state.inventoryLoaded) loadInventoryProducts({ quiet: true }).then(renderInventoryProductOptions);
    renderStrategicQrView();
    loadTicketCenterForCurrentTab({ quiet: !state.strategicQrLoaded }).catch((error) => {
      showFeedback(error.message, "error", { title: "No se pudo cargar Gaming Center" });
    });
  }
  if (view === "validator") {
    if (!state.inventoryLoaded) loadInventoryProducts({ quiet: true }).then(renderInventoryProductOptions);
    renderValidatorView();
  }
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
    forceLoginAfterSessionIssue("Tu sesión expiro. Inicia sesión de nuevo para continuar.");
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
        : "Nueva campaña";
      return loadWorkspace().then(applyInitialRouteParams);
    })
    .catch((error) => {
      if (session?.token) {
        showFeedback(error.message || "No se pudo validar la sesión.", "error");
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
  setInlineMessage(loginError, "Inicia sesión y abriremos Gaming Center como primera pantalla del portal.", "info");
  emailInput.focus();
}

async function login(event) {
  event.preventDefault();
  loginError.textContent = "";
  hideFeedback();
  const submitButton = loginForm.querySelector("button[type='submit']");
  setButtonLoading(submitButton, true, "Entrando...");
  setInlineMessage(loginError, "Validando credenciales...", "info");
  showFeedback("Validando credenciales y preparando el portal.", "loading", { title: "Iniciando sesión", timeout: 0 });
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
      setInlineMessage(loginError, "Acceso legacy detectado. Abriendo módulo Validador...", "success");
      showFeedback("Tu acceso usa el módulo Validador. Compra T200 para activar Portal Base.", "success", { title: "Acceso legacy", timeout: 0 });
      window.location.assign(redirectTo);
      return;
    }
    setInlineMessage(loginError, "Credenciales correctas. Cargando portal...", "success");
    showFeedback("Sesión validada. Cargando información del negocio.", "loading", { title: "Acceso concedido", timeout: 0 });
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
  setInlineMessage(passwordResetMessage, "Preparando recuperación...", "info");
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
    setInlineMessage(passwordResetMessage, error.message || "No se pudo solicitar recuperación.", "error");
  }
}

async function submitPasswordReset(event) {
  event.preventDefault();
  const resetToken = new URLSearchParams(window.location.search).get("reset_token");
  if (!resetToken) {
    setInlineMessage(passwordResetMessage, "Token de recuperación no encontrado.", "error");
    return;
  }
  if (passwordResetNewInput.value !== passwordResetConfirmInput.value) {
    setInlineMessage(passwordResetMessage, "La confirmación de password no coincide.", "error");
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
    ? "Crea una campaña antes de asociar tickets"
    : shouldForceCampaign || !allowNoCampaign
      ? "Selecciona campaña / activación"
      : "Sin campaña: activación por tickets";
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
    [leadCaptureCampaignInput, true],
    [affiliateReferralQrCampaignInput, false],
    [affiliatePurchaseCampaignInput, false],
  ].forEach(([input, allowNoCampaign]) => {
    if (!input) return;
    const currentValue = input.value || selectedCampaignId || selectedCampaign?.id || "";
    input.innerHTML = campaignAssociationOptions(currentValue, { allowNoCampaign });
    if (currentValue && Array.from(input.options).some((option) => option.value === currentValue)) {
      input.value = currentValue;
    } else if (selectedCampaign?.id && Array.from(input.options).some((option) => option.value === selectedCampaign.id)) {
      input.value = selectedCampaign.id;
    }
    input.required = input !== triviaCampaignInput && allowNoCampaign && campaigns.length > 0 && !isPrepaidValidatorOnly();
  });

  const campaignName = selectedCampaign?.name || "";
  const associationCopy = campaigns.length
    ? `Campaña sugerida: ${campaignName}. Todo Ticket generado con esa selección alimenta sus leads, redenciones, ventas y ROI.`
    : "No hay campañas activas o listas. Crea una campaña para que los tickets entren a un reporte medible.";
  if (qrWorkflowContext) qrWorkflowContext.textContent = associationCopy;
  if (postSaleCampaignHelp) postSaleCampaignHelp.textContent = campaigns.length
    ? "Este ticket generico se guardará dentro de la campaña seleccionada y aparecerá en su reporte."
    : "Sin campaña, el ticket generico queda como actividad general del negocio.";
  if (qrBatchCampaignHelp) qrBatchCampaignHelp.textContent = campaigns.length
    ? "El lote completo descontará tickets y cada ticket quedará asociado a la campaña seleccionada."
    : "Primero crea una campaña para medir el lote por activación.";
  if (triviaCampaignHelp) triviaCampaignHelp.textContent = campaigns.length
    ? "Opcional: selecciona una campaña si quieres que la activación alimente un reporte específico. También puedes lanzarla sin campaña."
    : "Puedes lanzar la activación sin campaña. Luego podrás medirla desde el historial de activaciones y tickets.";
}

function renderAffiliatePurchaseCampaignOptions() {
  if (!affiliatePurchaseCampaignInput) return;
  const currentValue = affiliatePurchaseCampaignInput.value || state.selectedCampaignId || "";
  affiliatePurchaseCampaignInput.innerHTML = campaignAssociationOptions(currentValue, { allowNoCampaign: false });
  if (currentValue && Array.from(affiliatePurchaseCampaignInput.options).some((option) => option.value === currentValue)) {
    affiliatePurchaseCampaignInput.value = currentValue;
  }
  affiliatePurchaseCampaignInput.disabled = !state.selectedAffiliateId || !activeCampaignsForAssociation().length;
}

function requireCampaignAssociation(input, messageElement, actionLabel) {
  const campaigns = activeCampaignsForAssociation();
  if (!input || input.value || !campaigns.length || isPrepaidValidatorOnly()) {
    return true;
  }
  const message = `Selecciona la campaña o activación antes de ${actionLabel}. Asi los tickets no quedan sueltos fuera del reporte.`;
  setInlineMessage(messageElement, message, "error");
  showFeedback(message, "error", { title: "Falta asociar campaña" });
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
    errorMessage || "La mensualidad superó la gracia de 15 días. Renueva para recuperar el portal; tus datos siguen guardados.",
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
    lightTestMode ? "Modo prueba ligero activo. Evitando cargas pesadas de Supabase." : "Actualizando dashboard, tickets, campañas e historial.",
    "loading",
    { title: lightTestMode ? "Prueba ligera" : "Sincronizando portal", timeout: 0 }
  );
  showBusyOverlay(
    lightTestMode ? "Prueba ligera" : "Sincronizando portal",
    lightTestMode ? "Cargando solo lo necesario para probar activaciones y tickets." : "Cargando métricas, cartera de tickets y últimos movimientos."
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
        showFeedback("Vista admin global cargada. Selecciona una campaña o negocio para continuar.", "success", { title: "Sesión lista" });
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
    strategicQrKpiGrid.innerHTML = '<article class="surface-card kpi-card"><span class="mono-label">Gaming Center</span><strong class="kpi-value">Bajo demanda</strong><p class="kpi-meta">Las métricas de activaciones y tickets se cargan al abrir esta sección para reducir egresos.</p></article>';
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
      || /mensualidad vencio|15 días de gracia|portal bloqueado/i.test(error.message || "")
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
    showFeedback("Gráficas actualizadas con la última actividad de tickets.", "success", { title: "Datos en vivo", timeout: 2500 });
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
    showFeedback("Crea tickets individuales o paquetes con tu saldo operativo. Portal Base muestra el historial permitido y Growth/Premium desbloquea más profundidad.", "success", { title: "Herramientas listas" });
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

function commandEmpty(title = "Aún no hay datos suficientes.", action = "Activa campañas, registra ventas o genera tickets para alimentar esta grafica.") {
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
      <label><span>Campaña</span><select data-command-filter="campaignId">${commandOptions(options.campaigns, filters.campaignId, "Todas")}</select></label>
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
              <span>${stage.conversion_from_previous}% conversión · fuga ${commandValue(stage.loss_from_previous, stage.format)}</span>
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
  if (!rows.length || !rows.some((row) => toNumber(row.value) > 0)) return commandEmpty("Aún no hay redenciones por hora.", "Cuando el equipo redima tickets, verás los mejores días y horas.");
  return `
    <div class="command-heatmap" role="img" aria-label="Mapa de calor de redenciones por día y hora">
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
    conversion_rate: "Conversión",
  };
  if (!rows.length || !rows.some((row) => toNumber(row[metric] || row.revenue || row.sales || row.leads || row.redemptions) > 0)) return commandEmpty("La matriz aún no tiene cruces medibles.", "Registra leads, tickets, redenciones o ventas con canal para saber que campaña funciona en cada medio.");
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
        <thead><tr><th>Campaña / Canal</th>${channels.map((channel) => `<th>${escapeHtml(channel)}</th>`).join("")}</tr></thead>
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
  if (!nodes.length || !links.length) return commandEmpty("No hay flujo de atribución suficiente.", "Cuando haya canales, campañas y ventas, se dibujará el flujo RMS.");
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
    <svg class="command-sankey" viewBox="0 0 600 280" role="img" aria-label="Flujo de atribución RMS">
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
  if (!nodes.length) return commandEmpty("Aún no hay red de afiliados.", "Crea afiliados y tickets de recomendación para ver el grafo.");
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
    ["repeat", "Repetir", "Alto ROI y conversión"],
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
  if (!rows.length) return commandEmpty("Sin campañas para tabla avanzada.", "Crea campañas y registra ventas para activar drill-down.");
  const search = (state.commandCenterFilters.tableSearch || "").trim().toLowerCase();
  const sortKey = state.commandCenterFilters.tableSort || "revenue";
  const sortedRows = rows
    .filter((row) => !search || [row.campaign_name, row.top_channel, row.health_state].some((value) => String(value || "").toLowerCase().includes(search)))
    .sort((a, b) => toNumber(b[sortKey]) - toNumber(a[sortKey]));
  return `
    <div class="command-table-toolbar">
      <label>
        <span>Buscar</span>
        <input data-command-table-search type="search" value="${escapeHtml(state.commandCenterFilters.tableSearch || "")}" placeholder="Campaña, canal o estado">
      </label>
      <label>
        <span>Ordenar por</span>
        <select data-command-table-sort>
          ${[
            ["revenue", "Revenue"],
            ["conversion_rate", "Conversión"],
            ["redemption_rate", "Redención"],
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
            <th>Campaña</th><th>Canal</th><th>Leads</th><th>Tickets</th><th>Redenciones</th><th>Ventas</th><th>Revenue</th><th>CAC</th><th>ROI</th><th>Conversión</th><th>Salud</th><th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          ${sortedRows.map((row) => {
            const health = row.roi > 0.25 || row.conversion_rate > 15 ? "Sana" : row.leads > 10 && row.sales < 2 ? "Optimizar" : "Observar";
            const isExpanded = state.commandCenterFilters.expandedCampaignId === row.id;
            return `
              <tr class="${isExpanded ? "is-expanded" : ""}">
                <td><strong>${escapeHtml(row.campaign_name)}</strong><small>${escapeHtml(row.campaign_status || "Campaña")}</small></td>
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
                      <article><span>Redención</span><strong>${row.redemption_rate}%</strong><small>Tickets redimidos sobre Tickets generados.</small></article>
                      <article><span>Ticket promedio</span><strong>${money(row.avg_ticket)}</strong><small>Revenue por venta registrada.</small></article>
                      <article><span>Canal dominante</span><strong>${escapeHtml(row.top_channel || "Sin datos")}</strong><small>Origen con mayor revenue o ventas.</small></article>
                      <article><span>Decisión sugerida</span><strong>${escapeHtml(row.decision_hint || "Investigar")}</strong><small>${escapeHtml(row.decision_reason || "Completa datos de canal y ventas para cerrar lectura.")}</small></article>
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
      ${(stories.length ? stories : [{ priority: "opportunity", title: "Activa tus historias de revenue", metric: "El RMS necesita ventas, tickets y canales para narrar decisiones.", action: "Registra la próxima venta con origen y sucursal." }]).map((story) => `
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
    action: "Registra ventas con canal, sucursal y vendedor para activar recomendaciones más precisas.",
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
      what: "Es la salud comercial del negocio en el periodo filtrado. Combina redención, conversión, revenue, afiliados, sucursales y calidad de datos.",
      signal: `El sistema interpreta el negocio como: ${scoreLabel}.`,
      action: scoreAction,
    },
    {
      priority: toNumber(executive.revenue || totals.revenue) > 0 ? "win" : "opportunity",
      eyebrow: "Revenue real",
      title: "Cuanto dinero se puede atribuir",
      metric: money(executive.revenue || totals.revenue || 0),
      what: "Revenue atribuido es la venta registrada que el RMS puede conectar con una campaña, canal, ticket, afiliado o sucursal.",
      signal: `Canal ganador: ${executive.winning_channel || "Sin datos"} · Campaña ganadora: ${executive.winning_campaign || "Sin datos"}.`,
      action: executive.recommended_action || "Registra cada venta con origen para que el sistema sepa que estrategia repetir.",
    },
    {
      priority: leakStage && toNumber(leakStage.loss_from_previous) > 0 ? "alert" : "opportunity",
      eyebrow: "Embudo RMS",
      title: leakStage ? `Fuga principal: ${leakStage.label}` : "Embudo listo para lectura",
      metric: leakStage ? commandValue(leakStage.loss_from_previous, leakStage.format) : `${toNumber(totals.redemptions)} redenciones`,
      what: "El embudo muestra como una persona avanza desde campaña hasta venta. Cada salto mide donde se gana o pierde valor.",
      signal: leakStage ? `Conversión desde la etapa anterior: ${leakStage.conversion_from_previous}%.` : "Aún no hay una fuga dominante en el periodo.",
      action: leakStage ? "Revisa beneficio, urgencia, recordatorio o cierre comercial en esta etapa." : "Mantén ventas y redenciones bien registradas para detectar fugas reales.",
    },
    {
      priority: topCampaign.revenue > 0 || topCampaign.sales > 0 ? "win" : "opportunity",
      eyebrow: "Campaña",
      title: topCampaign.campaign_name || "Campaña pendiente de destacar",
      metric: topCampaign.campaign_name ? `${money(topCampaign.revenue || 0)} · ${toNumber(topCampaign.sales)} ventas` : "Sin datos suficientes",
      what: "Una campaña sana no solo trae leads: también produce redenciones, ventas y revenue medible.",
      signal: topCampaign.campaign_name ? `Decisión sugerida: ${topCampaign.decision_hint || "Investigar"}.` : "Crea o activa campañas con tickets y registra el canal de llegada.",
      action: topCampaign.decision_reason || "Usa la tabla PowerBI-style para abrir el detalle de cada campaña.",
    },
    {
      priority: topBranch.revenue > 0 || topBranch.sales > 0 ? "win" : "opportunity",
      eyebrow: "Sucursal",
      title: topBranch.branch_name || executive.leading_branch || "Sucursal sin líder",
      metric: topBranch.branch_name ? `${money(topBranch.revenue || 0)} · ${toNumber(topBranch.redemptions)} redenciones` : "Sin datos suficientes",
      what: "La sucursal líder muestra donde la operación esta cerrando mejor el ciclo ticket -> visita -> venta.",
      signal: topBranch.branch_name ? "Compara esta sede contra las demas para replicar horarios, guion o incentivo." : "Asocia redenciones y ventas a una sucursal para activar rankings útiles.",
      action: "Si una sede convierte mejor, documenta que hizo distinto y pruebalo en las sedes con menor conversión.",
    },
    ...insights.slice(0, 4).map((item) => ({
      priority: item.priority || "opportunity",
      eyebrow: "Insight automatico",
      title: item.title || "Decisión RMS",
      metric: item.metric || item.explanation || "Senal detectada",
      what: "Este insight sale de reglas del RMS que cruzan leads, tickets, redenciones, ventas, canales y revenue.",
      signal: item.explanation || item.metric || "El sistema encontro una senal relevante en el periodo.",
      action: item.action || "Revisa el detalle antes de invertir más presupuesto.",
    })),
  ].slice(0, 9);

  return `
    <section class="command-feed-panel">
      <div class="command-feed-head">
        <div>
          <span class="mono-label">RMS Live Feed</span>
          <h3>Lectura guiada del negocio</h3>
          <p>Un feed didactico que explica que estas viendo, por qué importa y cuál es la siguiente decisión comercial.</p>
        </div>
        <div class="command-feed-guide" aria-label="Cómo leer el feed RMS">
          <span><strong>1</strong> Lee la senal</span>
          <span><strong>2</strong> Entiende el impacto</span>
          <span><strong>3</strong> Ejecuta la acción</span>
        </div>
      </div>

      <div class="command-feed-glossary" aria-label="Diccionario rápido RMS">
        ${[
          ["Lead", "Persona capturada por campaña o ticket."],
          ["Ticket reclamado", "Cliente tomo el beneficio, aún no necesariamente compro."],
          ["Ticket redimido", "Beneficio usado en tienda o punto de venta."],
          ["Venta atribuida", "Compra conectada con canal, campaña o ticket."],
          ["ROI", "Retorno estimado frente a inversión registrada."],
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
                  <span>Qué es</span>
                  <p>${escapeHtml(item.what)}</p>
                </section>
                <section>
                  <span>Qué indica</span>
                  <p>${escapeHtml(item.signal)}</p>
                </section>
                <section>
                  <span>Qué hacer</span>
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
          <p>Lectura ejecutiva de campañas, canales, tickets, redenciones, ventas, afiliados, sucursales y revenue real.</p>
          <div class="command-hero-actions">
            <button class="solid-button" data-command-scroll="detail" type="button">Ver detalle</button>
            <button class="ghost-button" data-command-export type="button">Exportar CSV</button>
          </div>
        </div>
        <aside class="executive-summary-card">
          <span>Modo ejecutivo</span>
          <strong>${money(executive.revenue)}</strong>
          <p>Canal: ${escapeHtml(executive.winning_channel)} · Campaña: ${escapeHtml(executive.winning_campaign)}</p>
          <dl>
            <div><dt>Sucursal líder</dt><dd>${escapeHtml(executive.leading_branch)}</dd></div>
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
          <div class="command-panel-head"><div><span class="mono-label">Funnel RMS</span><h3>De campaña a revenue</h3><p>Qué significa: muestra donde se fuga valor. Decisión: optimiza la etapa con mayor perdida.</p></div>${commandPanelActions("rms-funnel")}</div>
          ${renderFunnelChart(data.funnel || [])}
        </article>
      </section>

      <section class="command-panel">
        <div class="command-panel-head"><div><span class="mono-label">Historias de Revenue</span><h3>Infografias dinámicas para decidir</h3></div></div>
        ${renderRevenueStories(data.revenue_stories)}
      </section>

      <section class="command-panel">
        <div class="command-panel-head"><div><span class="mono-label">Decisiones sugeridas</span><h3>Insights automaticos del RMS</h3><p>Reglas de negocio que conectan interés, redención, venta, afiliados y revenue.</p></div></div>
        ${renderSuggestedDecisions(data.insights)}
      </section>

      <section class="command-chart-grid" id="commandCenterDetail">
        <article class="command-panel" data-command-focus="timeline" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Línea temporal multiserie</span><h3>Leads, tickets, redenciones, ventas y revenue</h3><p>Decisión: detecta días de activación y caídas de conversión.</p></div>${commandPanelActions("timeline")}</div><canvas id="commandTimelineChart" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="heatmap" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Heatmap horario</span><h3>Redenciones por día y hora</h3><p>Decisión: refuerza vendedores en franjas calientes.</p></div>${commandPanelActions("heatmap")}</div>${renderHeatmapChart(data.heatmap)}</article>
        <article class="command-panel command-wide" data-command-focus="matrix" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Matrix chart</span><h3>Campaña vs canal</h3><p>Decisión: encuentra el cruce exacto que produce ventas o revenue.</p></div>${commandPanelActions("matrix")}</div>${renderMatrixChart(data.campaign_channel_matrix)}</article>
        <article class="command-panel" data-command-focus="treemap" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Treemap revenue</span><h3>Revenue por canal</h3></div>${commandPanelActions("treemap")}</div>${renderTreemapChart(data.revenue_treemap)}</article>
        <article class="command-panel" data-command-focus="campaign-comparison" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Campañas comparadas</span><h3>Leads, tickets, redenciones, ventas y revenue</h3></div>${commandPanelActions("campaign-comparison")}</div><canvas id="commandCampaignBars" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="sankey" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Sankey RMS</span><h3>Flujo de atribución</h3></div>${commandPanelActions("sankey")}</div>${renderSankeyChart(data.attribution_sankey)}</article>
        <article class="command-panel" data-command-focus="affiliate-network" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Afiliados y referidos</span><h3>Network graph</h3></div>${commandPanelActions("affiliate-network")}</div>${renderAffiliateNetwork(data.affiliate_network)}</article>
        <article class="command-panel" data-command-focus="branch-ranking" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Sucursales</span><h3>Ranking combinado</h3></div>${commandPanelActions("branch-ranking")}</div><canvas id="commandBranchRanking" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="qr-status" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Estado de tickets</span><h3>Activos, redimidos, vencidos y reclamados</h3></div>${commandPanelActions("qr-status")}</div><canvas id="commandQrDonut" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="scatter" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Scatter campañas</span><h3>Inversión / tickets vs revenue</h3></div>${commandPanelActions("scatter")}</div><canvas id="commandScatter" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="waterfall" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Waterfall revenue</span><h3>Composicion del revenue</h3></div>${commandPanelActions("waterfall")}</div><canvas id="commandWaterfall" width="900" height="340"></canvas></article>
        <article class="command-panel" data-command-focus="cohorts" tabindex="0" role="button"><div class="command-panel-head"><div><span class="mono-label">Cohort postventa</span><h3>Recompra y ticket postventa</h3></div>${commandPanelActions("cohorts")}</div>${renderCohortChart(data.cohorts)}</article>
      </section>

      <section class="command-panel">
        <div class="command-panel-head"><div><span class="mono-label">RMS Mapa de Decisiones</span><h3>Repetir, optimizar, pausar, escalar e investigar</h3></div></div>
        ${renderDecisionMap(data.decision_map)}
      </section>

      <section class="command-panel" data-command-focus="power-table" tabindex="0" role="button">
        <div class="command-panel-head"><div><span class="mono-label">Tabla PowerBI-style</span><h3>Drill-down por campaña</h3><p>Ordena visualmente por revenue, conversión y salud comercial.</p></div>${commandPanelActions("power-table")}</div>
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
    ["Campaña", "Leads", "Tickets", "Redenciones", "Ventas", "Revenue", "CAC", "ROI", "Conversión"],
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
    `Cómo leer: ${meta.description}`,
    `Cómo se calcula: ${meta.calculation}`,
    `Decisión: ${meta.businessMeaning}`,
    "Tip: haz clic en la grafica o en Analizar para ver el detalle.",
  ].join(" ");
  return `
    <button class="command-chart-help-button" type="button" aria-label="${escapeHtml(copy)}" title="${escapeHtml(copy)}">
      <span class="material-symbols-outlined">help</span>
      <span class="command-help-popover">
        <strong>${escapeHtml(meta.title)}</strong>
        <em>Cómo leer</em>
        <small>${escapeHtml(meta.description)}</small>
        <em>Decisión</em>
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
      businessMeaning: DATA_DICTIONARY[dictionaryKey]?.decisión || "Ayuda a decidir que estrategia repetir, optimizar o investigar.",
      recommendedActions: [DATA_DICTIONARY[dictionaryKey]?.decisión || "Abre el desglose y compara contra el periodo anterior.", "Revisa los filtros activos para entender el contexto.", "Usa la tabla de campañas para llegar al detalle operativo."],
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
  if (context.campaign) return `Campaña: ${context.campaign}`;
  if (context.dow || context.hour) return `Bloque horario: ${context.dow || "-"} ${context.hour || "0"}:00`;
  return meta.title;
}

function activeDataPath(chartId, context = {}) {
  const meta = chartFocusMeta(chartId);
  const path = ["Command Center", meta.title];
  if (context.stage) path.push(context.stage);
  if (context.campaign) path.push(context.campaign);
  if (context.channel) path.push(context.channel);
  if (context.dow || context.hour) path.push(`${context.dow || "Día"} ${context.hour || "0"}:00`);
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
        ? "Todo empieza con la captación. Aquí se ve el tamano de la oportunidad."
        : `Desde aquí se compara contra ${list[index - 1]?.label || "la etapa anterior"} para encontrar fuga o avance.`,
    }));
  }
  if (chartId === "treemap") {
    return (data.revenue_treemap || []).slice(0, 5).map((row) => ({
      label: row.label || "Canal",
      value: money(row.value || row.revenue || 0),
      detail: "Este canal muestra cuánto revenue atribuido aporta frente al resto del mix comercial.",
    }));
  }
  if (chartId === "timeline") {
    return (data.timeline || []).slice(-5).map((row) => ({
      label: row.date || "Fecha",
      value: money(row.revenue || 0),
      detail: "Este punto ayuda a explicar que paso ese día entre leads, redenciones, ventas y revenue.",
    }));
  }
  if (chartId === "sankey") {
    return [
      { label: "Canal", value: "Origen", detail: "El revenue empieza en la fuente que atrajo al cliente." },
      { label: "Campaña", value: "Estrategia", detail: "La campaña convierte la atencion en una acción medible." },
      { label: "Ticket / Redención", value: "Activación", detail: "El ticket conecta la promesa con una visita o validación real." },
      { label: "Venta", value: "Cierre", detail: "La venta confirma que el flujo produjo resultado comercial." },
      { label: "Revenue", value: "Dinero", detail: "Este es el valor atribuido que el RMS puede explicar." },
    ];
  }
  const meta = chartFocusMeta(chartId);
  return [
    { label: meta.title, value: focusPrimaryMetric(chartId, context).value, detail: meta.description },
    { label: "Desglose", value: "Explorar", detail: meta.businessMeaning },
    { label: "Decisión", value: "Accion", detail: meta.recommendedActions[0] || "Revisa el detalle y aplica filtros." },
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
        <span class="material-symbols-outlined">table_rows</span>Ver registros detrás del dato
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
    ["campaignId", "Campaña"],
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
      columns: ["Etapa", "Valor", "Conversión anterior", "Fuga"],
      rows: (data.funnel || []).map((row) => [row.label, commandValue(row.value, row.format), `${row.conversion_from_previous || 0}%`, commandValue(row.loss_from_previous || 0, row.format)]),
    };
  }
  if (chartId === "heatmap") {
    const weekdays = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    return {
      columns: ["Día", "Hora", "Redenciones"],
      rows: (data.heatmap || []).sort((a, b) => toNumber(b.value) - toNumber(a.value)).slice(0, 20).map((row) => [weekdays[row.dow] || row.dow, `${row.hour}:00`, row.value]),
    };
  }
  if (chartId === "matrix") {
    return {
      columns: ["Campaña", "Canal", "Leads", "Tickets", "Redenciones", "Ventas", "Revenue"],
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
      columns: ["Canal", "Leads", "Ventas", "Revenue", "Conversión"],
      rows: (data.revenue_treemap || []).map((row) => [row.label, row.leads, row.sales, money(row.revenue), `${row.conversion_rate || 0}%`]),
    };
  }
  if (chartId === "affiliate-network") {
    return {
      columns: ["Afiliado", "Ventas", "Revenue", "Puntos", "Última actividad"],
      rows: (data.affiliate_network?.nodes || []).map((row) => [row.full_name || row.name, row.sales || 0, money(row.revenue || 0), row.points_total || 0, row.last_activity_at ? formatDateShort(row.last_activity_at) : "-"]),
    };
  }
  if (chartId === "branch-ranking") {
    return {
      columns: ["Sucursal", "Redenciones", "Ventas", "Revenue", "Conversión"],
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
      columns: ["Cohorte", "Compras", "ticket postventa", "Redimidos", "Retención"],
      rows: (data.cohorts || []).map((row) => [row.cohort, row.purchases, row.post_sale_qr, row.post_sale_redeemed, `${row.retention_rate || 0}%`]),
    };
  }
  return {
    columns: ["Campaña", "Canal", "Leads", "Tickets", "Redenciones", "Ventas", "Revenue", "Decisión"],
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
    return { label: "Bloque más activo", value: hot ? `${hot.value} redenciones` : "Sin datos", hint: hot ? `Día ${hot.dow}, ${hot.hour}:00` : "Aún no hay redenciones horarias." };
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
    return `Durante el periodo filtrado, el RMS llega hasta ${metric.value}. La mayor fuga visible esta en ${worst?.label || "una etapa pendiente"}, con ${commandValue(worst?.loss_from_previous || 0, worst?.format)} de diferencia frente a la etapa anterior. Recomendación: enfoca seguimiento, urgencia o cierre comercial en esa etapa.`;
  }
  if (chartId === "treemap") {
    return `${topChannel?.label || "El canal principal"} concentra ${money(topChannel?.revenue || 0)} en revenue. Si este canal también convierte bien, conviene escalarlo; si solo trae volumen, revisa ticket y calidad del cierre.`;
  }
  if (chartId === "power-table" || chartId === "campaign-comparison" || chartId === "scatter") {
    return `${topCampaign?.campaign_name || "La campaña principal"} lidera la lectura con ${money(topCampaign?.revenue || 0)}. Su decisión sugerida es ${topCampaign?.decision_hint || "Investigar"} porque ${topCampaign?.decision_reason || "faltan datos completos de conversión y revenue"}.`;
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
    return commandEmpty("Aún no hay registros suficientes.", "Activa campañas, registra ventas o valida tickets para alimentar este detalle.");
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
              <dt>Decisión</dt><dd>${escapeHtml(item.decisión)}</dd>
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
        <p>${diff >= 0 ? "El periodo actual supera al anterior. Revisa que canal o campaña explica el crecimiento." : "El periodo actual esta por debajo del anterior. Investiga caídas por canal, horario o sucursal."}</p>
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
      <article><span>Qué significa</span><p>${escapeHtml(meta.description)}</p></article>
      <article><span>Cómo se calcula</span><p>${escapeHtml(meta.calculation)}</p></article>
      <article><span>Por qué importa</span><p>${escapeHtml(meta.businessMeaning)}</p></article>
      <article><span>Qué mirar</span><p>${escapeHtml(metric.hint || "Busca cambios bruscos, concentraciones y combinaciones con bajo rendimiento.")}</p></article>
      <article><span>Qué hacer</span><p>${escapeHtml(meta.recommendedActions[0] || "Investiga el desglose y aplica un filtro global.")}</p></article>
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
    if (campaign?.id) actions.push(`<button type="button" data-focus-apply-filter="campaignId" data-focus-filter-value="${escapeHtml(campaign.id)}"><span class="material-symbols-outlined">filter_alt</span>Aplicar campaña: ${escapeHtml(context.campaign)}</button>`);
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
            <span class="mono-label">Decisión recomendada</span>
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
    ["Listas para lanzar", summary.ready_for_client_setup, `${summary.scheduled_campaigns || 0} programadas`, "", "Campañas que ya estan estructuradas y pendientes de configuración final o fecha de arranque."],
    ["Campañas activas", summary.active_campaigns, `${state.campaigns.length || 0} registradas`, "", "Campañas actualmente en ejecución y generando interacciones medibles."],
    ["Leads capturados", summary.total_leads, `${summary.redemption_rate || 0}% termina redimiendo`, "", "Personas identificadas que dejaron datos válidos en formularios, juegos o landings."],
    ["Tickets generados", summary.total_qr_generated, `${dashboard.summary?.active_qr || 0} siguen activos`, "", "Beneficios emitidos. Ayuda a medir activación real después del lead."],
    ["Tickets redimidos", summary.total_qr_redeemed, `${summary.redemption_rate || 0}% del total emitido`, "", "Personas que si llegaron a tienda o punto de redención y usaron el incentivo."],
    ["ticket postventa", summary.post_sale_generated || 0, `${postSaleRedemptionRate}% redimido`, "", "Ticket creados desde una venta real para incentivar recompra o postventa."],
    ["Paquetes de tickets", summary.strategic_batches || 0, `${summary.strategic_generated || 0} códigos estratégicos`, "", "Lotes de tickets precreados para etiquetas, empaques, volantes o fidelización."],
    ["tickets estratégicos", summary.strategic_generated || 0, `${strategicClaimRate}% activado`, "", "Tickets no nacidos de juego o formulario público, sino de estrategias internas del negocio."],
    ["Claims estratégicos", summary.strategic_claimed_or_active || 0, `${strategicRedemptionRate}% redimido`, "", "Clientes que escanearon un ticket precreado, dejaron datos y activaron el beneficio."],
    ["Ventas reales", observedSalesCount, `${money(observedRevenue)} registrado`, "", "Compras reales registradas por caja, ticket postventa o captura manual del medio de llegada."],
    ["Revenue observado", money(observedRevenue), `${money(avgTicket)} ticket promedio`, "", "Dinero real asociado a clientes capturados por los distintos medios de llegada."],
    ["Referidos afiliados", summary.referral_sales_count || 0, `${summary.referral_points_awarded || 0} puntos entregados`, "", "Ventas en las que un afiliado recomendo al cliente y recibio puntos."],
    ["Inversión total", money(summary.total_investment), `${money(summary.cost_per_lead)} por lead`, "", "Suma total invertida en pauta, creativos y activación para este periodo de analisis."],
    ["Costo por lead", money(summary.cost_per_lead), `${money(summary.cost_per_observed_customer || summary.cost_per_acquired_customer)} por venta`, "", "Cuanto costo captar cada lead, antes de saber si compro o no."],
    ["Costo por venta", money(summary.cost_per_observed_customer || summary.cost_per_acquired_customer), `vs. ticket medio ${money(avgTicket)}`, "", "Cuanto costo traer una venta real observada. Debe compararse contra ticket promedio y margen."],
    ["ROI estimado", roiLabel, "Retorno sobre ventas reales", "highlight", "Relacion entre ventas observadas e inversión. Un valor mayor a 1x ya recupera la inversión; por encima de eso empieza a devolver ganancia comercial."],
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
      ? `${topBranch.branch_name} lidera la operación del periodo.`
    : "Esperando datos del negocio.";
  dashboardNarrativeText.textContent = topAcquisitionSource
    ? `${acquisitionSourceLabel(topAcquisitionSource.acquisition_source)}${topAcquisitionSource.acquisition_channel ? ` / ${topAcquisitionSource.acquisition_channel}` : ""} trae ${toNumber(topAcquisitionSource.count)} ventas reales y ${money(topAcquisitionSource.revenue)}. El portal combina esta captura con tickets para medir ventas, no solo likes o comentarios.`
    : topBranch?.branch_name
      ? `La sucursal ${topBranch.branch_name} concentra ${money(topBranch.revenue)} en revenue atribuido y ${topBranch.redemptions} redenciones. Ademas, el negocio ya suma ${summary.post_sale_generated || 0} ticket postventa y ${summary.strategic_generated || 0} tickets estratégicos fuera del flujo público.`
    : "Cuando haya actividad, aquí verás el principal movimiento del periodo sin tener que interpretar todas las tablas.";
  dashboardFunnelHelp.textContent = `Hoy el embudo combina ${summary.total_leads || 0} leads publicos con ${summary.strategic_claimed_or_active || 0} activaciones estrategicas; de ahí salen ${summary.total_qr_generated || 0} tickets emitidos y ${observedSalesCount} ventas reales observadas.`;
  dashboardHealthText.textContent = roiLabel === "-"
    ? "Aún no hay ventas suficientes para evaluar ROI, CPL y CAC con criterio comercial."
    : `El ROI actual es ${roiLabel}, el costo por venta esta en ${money(summary.cost_per_observed_customer || summary.cost_per_acquired_customer)} y el ticket promedio ronda ${money(avgTicket)}. En tickets estratégicos, postventa redime ${postSaleRedemptionRate}% y los claims convierten ${strategicRedemptionRate}% a redención.`;
  cacTrendNote.textContent = avgTicket
    ? `Benchmark visual: CAC sano cuando queda claramente por debajo del ticket promedio de ${money(avgTicket)}.`
    : "Benchmark visual: compara el CAC contra el ticket promedio y el ROI de cada campaña.";

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
      <p>${escapeHtml(row.address || "Sin dirección")}</p>
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
    ? `El pico de redenciones ocurre a las ${String(topHour.hour).padStart(2, "0")}:00. ${topAcquisitionSource ? `${acquisitionSourceLabel(topAcquisitionSource.acquisition_source)} lidera ventas reales con ${money(topAcquisitionSource.revenue)}.` : `${topBranch?.branch_name || "La sucursal principal"} lidera el revenue del periodo.`} Los tickets estratégicos ya aportan ${summary.strategic_claimed_or_active || 0} activaciones al embudo.`
    : "Aún no hay suficiente actividad para construir un insight horario.";
}

function renderCampaignList() {
  const campaigns = currentCampaignRows();
  if (!campaigns.length) {
    campaignList.innerHTML = '<article class="campaign-item"><p>Sin campañas para este filtro.</p></article>';
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
  adminEditorTitle.textContent = campaign ? campaign.name : "Campaña interna";
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
  `).join("") || '<tr><td colspan="6">Sin campañas para este cliente.</td></tr>';
}

async function selectCampaign(campaignId) {
  const scopeKey = businessScopeKey();
  state.selectedCampaignId = campaignId;
  renderCampaignList();
  renderCampaignAssociationInputs();

  try {
    const [campaignData, reportData, leadsData, redemptionsData, salesData, campaignAffiliatesData] = await Promise.all([
      api(`/api/business/campaigns/${campaignId}`, { headers: authHeaders() }),
      api(`/api/business/campaigns/${campaignId}/report`, { headers: authHeaders() }),
      api(`/api/business/campaigns/${campaignId}/leads?limit=150`, { headers: authHeaders() }),
      api(`/api/business/campaigns/${campaignId}/redemptions?limit=150`, { headers: authHeaders() }),
      api(`/api/business/campaigns/${campaignId}/sales?limit=150`, { headers: authHeaders() }),
      apiSafe(`/api/portal/businesses/${session.user.business_id}/campaigns/${campaignId}/affiliates`, { headers: authHeaders() }, { affiliates: [] }),
    ]);

    if (!isCurrentBusinessScope(scopeKey) || state.selectedCampaignId !== campaignId) return;
    if (!state.affiliatesLoaded) await loadAffiliatesData();
    state.selectedCampaign = campaignData.campaign || null;
    state.selectedReport = reportData || null;
    state.selectedLeads = leadsData.leads || [];
    state.selectedRedemptions = redemptionsData.redemptions || [];
    state.selectedSales = salesData.sales || [];
    state.selectedCampaignAffiliates = campaignAffiliatesData.affiliates || [];

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

function campaignCostDurationFromDates(startValue = launchStartsAtInput?.value, endValue = launchEndsAtInput?.value) {
  const start = startValue ? new Date(startValue).getTime() : 0;
  const end = endValue ? new Date(endValue).getTime() : 0;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 30;
  return Math.max(1, Math.ceil((end - start) / 86400000));
}

function defaultCampaignCostCalculator(campaign = state.selectedCampaign || {}) {
  const expectedSales = toNumber(campaign.direct_sales_count || campaign.attributed_sales_count || 0);
  const avgTicket = expectedSales ? toNumber(campaign.attributed_revenue) / expectedSales : 0;
  const knownCampaignTypes = ["MIXED", "LEAD_CAPTURE", "REDEMPTION", "REFERRAL", "REBUY", "INVENTORY", "EVENT", "LAUNCH"];
  return {
    name: campaign.name || "",
    campaign_type: knownCampaignTypes.includes(campaign.type) ? campaign.type : "MIXED",
    main_channel: Array.isArray(campaign.launch_channels) ? campaign.launch_channels[0] || "" : "",
    branch: "",
    owner: "",
    primary_goal: "sales",
    gamified_dynamic: "scratch",
    objective: campaign.objective || "",
    duration_days: campaignCostDurationFromDates(formatInputDateTime(campaign.starts_at), formatInputDateTime(campaign.ends_at)),
    desired_profit_percent: 30,
    average_ticket: avgTicket || toNumber(campaign.expected_sales_goal) || 0,
    gross_margin_per_sale: 0,
    lead_to_sale_rate: 10,
    expected_redemption_rate: toNumber(campaign.redemption_rate) || 40,
    production: [
      { label: "Volantes", quantity: 0, unit_cost: 0 },
      { label: "Cajas / empaques", quantity: 0, unit_cost: 0 },
    ],
    benefits: [
      { type: "DISCOUNT_PERCENT", name: "Descuento producto", product_price: 0, product_cost: 0, discount_percent: 0, discount_amount: 0, issued_units: 100, redemption_rate: 40, prepaid_units: 0 },
    ],
    services: [
      { name: "Promotor / servicio", payment_type: "monthly", amount: 0, days: 0, hours_per_day: 0, commission_percent: 0, sales_base: 0 },
    ],
    variable: [
      { label: "Empaque / domicilio / comisión", unit_cost: 0, units: 0, apply_redemption_rate: false },
    ],
    fixed: [
      { label: "Costo operativo", amount: 0 },
    ],
  };
}

function normalizeCampaignCostNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function normalizeCampaignCostCalculator(value = {}, campaign = state.selectedCampaign || {}) {
  const fallback = defaultCampaignCostCalculator(campaign);
  const readRows = (rows, defaults, mapper) => {
    const source = Array.isArray(rows) && rows.length ? rows : defaults;
    return source.map(mapper);
  };
  return {
    name: cleanCustomerValue(value.name) || fallback.name || "",
    campaign_type: cleanCustomerValue(value.campaign_type) || fallback.campaign_type,
    main_channel: cleanCustomerValue(value.main_channel) || fallback.main_channel || "",
    branch: cleanCustomerValue(value.branch) || "",
    owner: cleanCustomerValue(value.owner) || "",
    primary_goal: cleanCustomerValue(value.primary_goal) || fallback.primary_goal,
    gamified_dynamic: cleanCustomerValue(value.gamified_dynamic) || fallback.gamified_dynamic,
    objective: cleanCustomerValue(value.objective) || fallback.objective || "",
    duration_days: Math.max(1, Math.round(normalizeCampaignCostNumber(value.duration_days || fallback.duration_days || 30))),
    desired_profit_percent: normalizeCampaignCostNumber(value.desired_profit_percent ?? fallback.desired_profit_percent),
    average_ticket: normalizeCampaignCostNumber(value.average_ticket ?? fallback.average_ticket),
    gross_margin_per_sale: normalizeCampaignCostNumber(value.gross_margin_per_sale ?? fallback.gross_margin_per_sale),
    lead_to_sale_rate: Math.min(100, normalizeCampaignCostNumber(value.lead_to_sale_rate ?? fallback.lead_to_sale_rate)),
    expected_redemption_rate: Math.min(100, normalizeCampaignCostNumber(value.expected_redemption_rate ?? fallback.expected_redemption_rate)),
    production: readRows(value.production, fallback.production, (item = {}) => ({
      label: cleanCustomerValue(item.label) || "Material",
      quantity: normalizeCampaignCostNumber(item.quantity),
      unit_cost: normalizeCampaignCostNumber(item.unit_cost),
    })),
    benefits: readRows(value.benefits, fallback.benefits, (item = {}) => ({
      type: ["DISCOUNT_FIXED", "GIFT", "GIFTCARD", "EXPERIENCE"].includes(item.type) ? item.type : "DISCOUNT_PERCENT",
      name: cleanCustomerValue(item.name) || "Beneficio",
      product_price: normalizeCampaignCostNumber(item.product_price),
      product_cost: normalizeCampaignCostNumber(item.product_cost),
      discount_percent: Math.min(100, normalizeCampaignCostNumber(item.discount_percent)),
      discount_amount: normalizeCampaignCostNumber(item.discount_amount),
      issued_units: normalizeCampaignCostNumber(item.issued_units ?? item.units),
      redemption_rate: Math.min(100, normalizeCampaignCostNumber(item.redemption_rate ?? value.expected_redemption_rate ?? fallback.expected_redemption_rate)),
      prepaid_units: normalizeCampaignCostNumber(item.prepaid_units),
    })),
    services: readRows(value.services, fallback.services, (item = {}) => ({
      name: cleanCustomerValue(item.name) || "Servicio",
      payment_type: ["daily", "hourly", "commission"].includes(item.payment_type) ? item.payment_type : "monthly",
      amount: normalizeCampaignCostNumber(item.amount ?? item.monthly_cost),
      days: normalizeCampaignCostNumber(item.days),
      hours_per_day: normalizeCampaignCostNumber(item.hours_per_day),
      commission_percent: normalizeCampaignCostNumber(item.commission_percent),
      sales_base: normalizeCampaignCostNumber(item.sales_base),
    })),
    variable: readRows(value.variable, fallback.variable, (item = {}) => ({
      label: cleanCustomerValue(item.label) || "Costo variable",
      unit_cost: normalizeCampaignCostNumber(item.unit_cost),
      units: normalizeCampaignCostNumber(item.units),
      apply_redemption_rate: Boolean(item.apply_redemption_rate),
    })),
    fixed: readRows(value.fixed, fallback.fixed, (item = {}) => ({
      label: cleanCustomerValue(item.label) || "Costo fijo",
      amount: normalizeCampaignCostNumber(item.amount),
    })),
  };
}

function campaignCostStorageKey(campaignId = state.selectedCampaignId) {
  const businessId = session?.user?.business_id || state.loadedBusinessId || "business";
  return `marketgames:campaign-cost:${businessId}:${campaignId || "draft"}`;
}

function loadCampaignCostCalculator(campaign = state.selectedCampaign || {}) {
  const metadataCalculator = campaign.metadata?.campaign_cost_calculator || campaign.metadata?.cost_calculator || null;
  let localCalculator = null;
  try {
    const raw = window.localStorage?.getItem(campaignCostStorageKey(campaign.id));
    localCalculator = raw ? JSON.parse(raw) : null;
  } catch (error) {
    localCalculator = null;
  }
  return normalizeCampaignCostCalculator(localCalculator || metadataCalculator || {}, campaign);
}

function saveCampaignCostCalculatorLocal(calculator = state.campaignCostCalculator) {
  if (!state.selectedCampaignId || !calculator) return;
  try {
    window.localStorage?.setItem(campaignCostStorageKey(), JSON.stringify(calculator));
  } catch (error) {
    // Local persistence is a convenience; calculation should continue even if storage is unavailable.
  }
}

function ensureCampaignCostCalculatorForCampaign(campaign = state.selectedCampaign || {}) {
  if (!campaignCostSummary) return null;
  if (!state.campaignCostCalculator || state.campaignCostCalculatorCampaignId !== campaign.id) {
    state.campaignCostCalculator = loadCampaignCostCalculator(campaign);
    state.campaignCostCalculatorCampaignId = campaign.id || null;
  }
  return state.campaignCostCalculator;
}

function readCampaignCostCalculatorFromForm() {
  const current = state.campaignCostCalculator || defaultCampaignCostCalculator();
  const readProductionRows = () => Array.from(campaignCostProductionList?.querySelectorAll("[data-campaign-cost-row='production']") || []).map((row) => ({
    label: row.querySelector("[data-cost-field='label']")?.value || "",
    quantity: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='quantity']")?.value),
    unit_cost: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='unit_cost']")?.value),
  }));
  const readBenefitRows = () => Array.from(campaignCostBenefitsList?.querySelectorAll("[data-campaign-cost-row='benefit']") || []).map((row) => ({
    type: row.querySelector("[data-cost-field='type']")?.value || "DISCOUNT",
    name: row.querySelector("[data-cost-field='name']")?.value || "",
    product_price: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='product_price']")?.value),
    product_cost: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='product_cost']")?.value),
    discount_percent: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='discount_percent']")?.value),
    discount_amount: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='discount_amount']")?.value),
    issued_units: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='issued_units']")?.value),
    redemption_rate: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='redemption_rate']")?.value),
    prepaid_units: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='prepaid_units']")?.value),
  }));
  const readServiceRows = () => Array.from(campaignCostServicesList?.querySelectorAll("[data-campaign-cost-row='service']") || []).map((row) => ({
    name: row.querySelector("[data-cost-field='name']")?.value || "",
    payment_type: row.querySelector("[data-cost-field='payment_type']")?.value || "monthly",
    amount: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='amount']")?.value),
    days: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='days']")?.value),
    hours_per_day: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='hours_per_day']")?.value),
    commission_percent: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='commission_percent']")?.value),
    sales_base: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='sales_base']")?.value),
  }));
  const readVariableRows = () => Array.from(campaignCostVariableList?.querySelectorAll("[data-campaign-cost-row='variable']") || []).map((row) => ({
    label: row.querySelector("[data-cost-field='label']")?.value || "",
    unit_cost: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='unit_cost']")?.value),
    units: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='units']")?.value),
    apply_redemption_rate: Boolean(row.querySelector("[data-cost-field='apply_redemption_rate']")?.checked),
  }));
  const readFixedRows = () => Array.from(campaignCostFixedList?.querySelectorAll("[data-campaign-cost-row='fixed']") || []).map((row) => ({
    label: row.querySelector("[data-cost-field='label']")?.value || "",
    amount: normalizeCampaignCostNumber(row.querySelector("[data-cost-field='amount']")?.value),
  }));
  return normalizeCampaignCostCalculator({
    ...current,
    name: campaignCostNameInput?.value || current.name,
    campaign_type: campaignCostTypeInput?.value || current.campaign_type,
    main_channel: campaignCostChannelInput?.value || current.main_channel,
    branch: campaignCostBranchInput?.value || current.branch,
    owner: campaignCostOwnerInput?.value || current.owner,
    primary_goal: campaignCostGoalInput?.value || current.primary_goal,
    gamified_dynamic: campaignCostDynamicInput?.value || current.gamified_dynamic,
    objective: campaignCostObjectiveInput?.value || current.objective,
    duration_days: normalizeCampaignCostNumber(campaignCostDurationInput?.value || current.duration_days),
    desired_profit_percent: normalizeCampaignCostNumber(campaignCostProfitInput?.value || current.desired_profit_percent),
    average_ticket: normalizeCampaignCostNumber(campaignCostAverageTicketInput?.value || current.average_ticket),
    gross_margin_per_sale: normalizeCampaignCostNumber(campaignCostGrossMarginInput?.value || current.gross_margin_per_sale),
    lead_to_sale_rate: normalizeCampaignCostNumber(campaignCostConversionInput?.value || current.lead_to_sale_rate),
    expected_redemption_rate: normalizeCampaignCostNumber(campaignCostRedemptionInput?.value || current.expected_redemption_rate),
    production: readProductionRows(),
    benefits: readBenefitRows(),
    services: readServiceRows(),
    variable: readVariableRows(),
    fixed: readFixedRows(),
  });
}

function campaignBenefitMetrics(item = {}, calculator = state.campaignCostCalculator || defaultCampaignCostCalculator()) {
  const issuedUnits = normalizeCampaignCostNumber(item.issued_units ?? item.units);
  const redemptionRate = Math.min(100, normalizeCampaignCostNumber(item.redemption_rate ?? calculator.expected_redemption_rate));
  const expectedRedeemed = issuedUnits * redemptionRate / 100;
  const consumedUnits = Math.max(expectedRedeemed, normalizeCampaignCostNumber(item.prepaid_units));
  const price = normalizeCampaignCostNumber(item.product_price);
  const productCost = normalizeCampaignCostNumber(item.product_cost);
  const marginBeforeUnit = Math.max(0, price - productCost);
  let discountUnit = 0;
  let marginAfterUnit = marginBeforeUnit;
  let cashCostUnit = 0;

  if (item.type === "DISCOUNT_FIXED") {
    discountUnit = Math.min(price, normalizeCampaignCostNumber(item.discount_amount));
    marginAfterUnit = Math.max(0, price - discountUnit - productCost);
  } else if (item.type === "GIFT") {
    cashCostUnit = productCost || price;
    discountUnit = marginBeforeUnit;
    marginAfterUnit = 0;
  } else if (item.type === "GIFTCARD") {
    discountUnit = normalizeCampaignCostNumber(item.discount_amount || price);
    cashCostUnit = discountUnit;
    marginAfterUnit = Math.max(0, marginBeforeUnit - discountUnit);
  } else if (item.type === "EXPERIENCE") {
    cashCostUnit = productCost || price;
    discountUnit = cashCostUnit;
    marginAfterUnit = marginBeforeUnit;
  } else {
    discountUnit = price * Math.min(100, normalizeCampaignCostNumber(item.discount_percent)) / 100;
    marginAfterUnit = Math.max(0, price - discountUnit - productCost);
  }

  const opportunityCostUnit = Math.max(0, marginBeforeUnit - marginAfterUnit);
  const estimatedCost = (cashCostUnit || opportunityCostUnit) * consumedUnits;
  const remainingMargin = marginAfterUnit * consumedUnits;
  return {
    issuedUnits,
    redemptionRate,
    expectedRedeemed,
    consumedUnits,
    marginBeforeUnit,
    marginAfterUnit,
    opportunityCostUnit,
    cashCostUnit,
    estimatedCost,
    remainingMargin,
  };
}

function campaignServiceCost(item = {}, durationDays = 30, revenueGoal = 0) {
  const amount = normalizeCampaignCostNumber(item.amount ?? item.monthly_cost);
  const days = normalizeCampaignCostNumber(item.days) || durationDays;
  if (item.payment_type === "daily") return amount * days;
  if (item.payment_type === "hourly") return amount * days * Math.max(1, normalizeCampaignCostNumber(item.hours_per_day));
  if (item.payment_type === "commission") {
    const base = normalizeCampaignCostNumber(item.sales_base) || revenueGoal;
    return base * normalizeCampaignCostNumber(item.commission_percent) / 100;
  }
  return amount / 30 * durationDays;
}

function campaignVariableCost(item = {}, calculator = state.campaignCostCalculator || defaultCampaignCostCalculator()) {
  const units = normalizeCampaignCostNumber(item.units);
  const effectiveUnits = item.apply_redemption_rate ? units * Math.min(100, normalizeCampaignCostNumber(calculator.expected_redemption_rate)) / 100 : units;
  return normalizeCampaignCostNumber(item.unit_cost) * effectiveUnits;
}

function calculateCampaignCosts(calculator = state.campaignCostCalculator || defaultCampaignCostCalculator(), scenario = {}) {
  const durationDays = Math.max(1, Number(calculator.duration_days || 1));
  const productionTotal = (calculator.production || []).reduce((sum, item) => sum + normalizeCampaignCostNumber(item.quantity) * normalizeCampaignCostNumber(item.unit_cost), 0);
  const scenarioRedemptionRate = scenario.redemption_rate ?? calculator.expected_redemption_rate;
  const scenarioCalculator = { ...calculator, expected_redemption_rate: scenarioRedemptionRate };
  const benefitRows = (calculator.benefits || []).map((item) => campaignBenefitMetrics({ ...item, redemption_rate: item.redemption_rate ?? scenarioRedemptionRate }, scenarioCalculator));
  const benefitsTotal = benefitRows.reduce((sum, item) => sum + item.estimatedCost, 0);
  const benefitsCommitted = (calculator.benefits || []).reduce((sum, item) => sum + normalizeCampaignCostNumber(item.issued_units ?? item.units), 0);
  const benefitsRedeemed = benefitRows.reduce((sum, item) => sum + item.expectedRedeemed, 0);
  const benefitRemainingMargin = benefitRows.reduce((sum, item) => sum + item.remainingMargin, 0);
  const benefitOpportunityCost = benefitRows.reduce((sum, item) => sum + item.opportunityCostUnit * item.consumedUnits, 0);
  const fixedTotal = (calculator.fixed || []).reduce((sum, item) => sum + normalizeCampaignCostNumber(item.amount), 0);
  const variableTotal = (calculator.variable || []).reduce((sum, item) => sum + campaignVariableCost(item, scenarioCalculator), 0);
  const fixedCostTotal = productionTotal + fixedTotal;
  const averageTicket = normalizeCampaignCostNumber(scenario.average_ticket ?? calculator.average_ticket);
  const conversionRate = Math.min(100, normalizeCampaignCostNumber(scenario.conversion_rate ?? calculator.lead_to_sale_rate));
  const grossMarginPerSale = normalizeCampaignCostNumber(scenario.gross_margin_per_sale ?? calculator.gross_margin_per_sale);
  const desiredProfitPercent = normalizeCampaignCostNumber(calculator.desired_profit_percent);
  const preliminaryCost = fixedCostTotal + benefitsTotal + variableTotal;
  const preliminaryProfit = preliminaryCost * desiredProfitPercent / 100;
  const preliminaryRevenueGoal = preliminaryCost + preliminaryProfit;
  const servicesTotal = (calculator.services || []).reduce((sum, item) => {
    return sum + campaignServiceCost(item, durationDays, preliminaryRevenueGoal);
  }, 0);
  const totalCost = fixedCostTotal + benefitsTotal + servicesTotal + variableTotal;
  const targetProfit = totalCost * desiredProfitPercent / 100;
  const revenueGoal = totalCost + targetProfit;
  const requiredSales = averageTicket > 0 ? Math.ceil(revenueGoal / averageTicket) : 0;
  const leadsNeeded = conversionRate > 0 ? Math.ceil(requiredSales / (conversionRate / 100)) : 0;
  const breakEvenSales = grossMarginPerSale > 0 ? Math.ceil(totalCost / grossMarginPerSale) : 0;
  const breakEvenRevenue = breakEvenSales * averageTicket;
  const expectedGrossProfit = requiredSales * grossMarginPerSale + benefitRemainingMargin;
  const netProfit = expectedGrossProfit - totalCost;
  return {
    durationDays,
    fixedCostTotal,
    variableTotal,
    productionTotal,
    benefitsTotal,
    benefitsCommitted,
    benefitsRedeemed,
    benefitRemainingMargin,
    benefitOpportunityCost,
    servicesTotal,
    fixedTotal,
    totalCost,
    dailyCost: totalCost / durationDays,
    targetProfit,
    revenueGoal,
    requiredSales,
    leadsNeeded,
    breakEvenSales,
    breakEvenRevenue,
    averageTicket,
    conversionRate,
    grossMarginPerSale,
    costPerLead: leadsNeeded > 0 ? totalCost / leadsNeeded : 0,
    costPerSale: requiredSales > 0 ? totalCost / requiredSales : 0,
    costPerRedemption: benefitsRedeemed > 0 ? benefitsTotal / benefitsRedeemed : 0,
    expectedGrossProfit,
    netProfit,
    roi: totalCost > 0 ? (netProfit / totalCost) * 100 : 0,
  };
}

function campaignCostRowTotal(type, item, calculator = state.campaignCostCalculator || defaultCampaignCostCalculator()) {
  const durationDays = Math.max(1, Number(calculator.duration_days || 1));
  if (type === "production") return normalizeCampaignCostNumber(item.quantity) * normalizeCampaignCostNumber(item.unit_cost);
  if (type === "benefit") {
    return campaignBenefitMetrics(item, calculator).estimatedCost;
  }
  if (type === "service") return campaignServiceCost(item, durationDays, calculateCampaignCosts(calculator).revenueGoal);
  if (type === "variable") return campaignVariableCost(item, calculator);
  return normalizeCampaignCostNumber(item.amount);
}

function campaignBenefitMetaHtml(item = {}, calculator = state.campaignCostCalculator || defaultCampaignCostCalculator()) {
  const metrics = campaignBenefitMetrics(item, calculator);
  return `
    <small>Redime ${Math.round(metrics.expectedRedeemed).toLocaleString("es-CO")} de ${Math.round(metrics.issuedUnits).toLocaleString("es-CO")}</small>
    <small>Margen: ${escapeHtml(money(metrics.marginBeforeUnit))} -> ${escapeHtml(money(metrics.marginAfterUnit))}</small>
    <small>Sacrificio: ${escapeHtml(money(metrics.opportunityCostUnit * metrics.consumedUnits))}</small>
  `;
}

function campaignGoalLabel(goal) {
  return {
    sales: "ventas",
    leads: "leads",
    redemptions: "redenciones",
    referrals: "referidos",
    rebuy: "recompras",
    visits: "visitas",
    registrations: "registros",
    appointments: "agendamientos",
    reactivation: "clientes reactivados",
  }[goal] || "ventas";
}

function campaignDynamicLabel(dynamic) {
  return {
    scratch: "Raspa y gana",
    roulette: "Ruleta",
    trivia: "Trivia",
    battleship: "Batalla naval",
    referrals: "Referidos",
    points: "Puntos",
    ranking: "Ranking",
    giftcard: "Giftcard",
    vip: "Club VIP",
    rebuy_challenge: "Reto de recompra",
    physical_activation: "Activación en punto físico",
    post_sale: "Campaña postventa",
    brand_alliance: "Alianza entre marcas",
  }[dynamic] || dynamic || "Sin dinámica";
}

function campaignDecisionStatus(totals = calculateCampaignCosts()) {
  const missingFields = campaignCostMissingViabilityFields(totals);
  if (!totals.totalCost) {
    return {
      tone: "pending",
      label: "Sin costos",
      action: "Agrega al menos un costo de producción, beneficio, servicio, variable o fijo para calcular la viabilidad.",
      missingFields: ["Costo total de campaña"],
      isCalculable: false,
    };
  }
  if (missingFields.length) {
    return {
      tone: "warning",
      label: "No calculable aún",
      action: "La calculadora necesita esos datos para comparar el costo de la campaña contra la utilidad que deja cada venta.",
      missingFields,
      isCalculable: false,
    };
  }
  if (totals.roi >= 25 && totals.requiredSales >= totals.breakEvenSales) {
    return { tone: "ok", label: "Se paga sola", action: "Activar campaña con seguimiento diario de redenciones y ventas.", missingFields: [], isCalculable: true };
  }
  if (totals.roi >= 0) {
    return { tone: "warning", label: "Puede pagar sus costos", action: "Posible, pero conviene reducir costo de beneficios, subir ticket promedio o mejorar conversión.", missingFields: [], isCalculable: true };
  }
  return { tone: "danger", label: "No se paga sola", action: "Riesgosa: necesita más margen, menos descuento o menor costo fijo antes de ejecutarla.", missingFields: [], isCalculable: true };
}

function campaignCostMissingViabilityFields(totals = calculateCampaignCosts()) {
  const fields = [];
  if (!totals.averageTicket) fields.push("Ticket promedio");
  if (!totals.grossMarginPerSale) fields.push("Margen bruto por venta");
  if (!totals.conversionRate) fields.push("Conversión de leads a ventas");
  return fields;
}

function campaignCostFeedbackHtml({ tone = "idle", icon = "info", title = "", body = "", details = [] } = {}) {
  const detailList = details.length
    ? `<ul>${details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  return `
    <div class="campaign-cost-feedback-card campaign-cost-feedback-${escapeHtml(tone)}">
      <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(icon)}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(body)}</p>
        ${detailList}
      </div>
    </div>
  `;
}

function renderCampaignCostCalculator() {
  const calculator = ensureCampaignCostCalculatorForCampaign(state.selectedCampaign || {});
  if (!calculator || !campaignCostSummary) return;
  if (campaignCostNameInput) campaignCostNameInput.value = calculator.name || "";
  if (campaignCostTypeInput) campaignCostTypeInput.value = calculator.campaign_type || "MIXED";
  if (campaignCostChannelInput) campaignCostChannelInput.value = calculator.main_channel || "";
  if (campaignCostBranchInput) campaignCostBranchInput.value = calculator.branch || "";
  if (campaignCostOwnerInput) campaignCostOwnerInput.value = calculator.owner || "";
  if (campaignCostGoalInput) campaignCostGoalInput.value = calculator.primary_goal || "sales";
  if (campaignCostDynamicInput) campaignCostDynamicInput.value = calculator.gamified_dynamic || "scratch";
  if (campaignCostObjectiveInput) campaignCostObjectiveInput.value = calculator.objective || "";
  if (campaignCostDurationInput) campaignCostDurationInput.value = calculator.duration_days || 30;
  if (campaignCostProfitInput) campaignCostProfitInput.value = calculator.desired_profit_percent || 0;
  if (campaignCostAverageTicketInput) campaignCostAverageTicketInput.value = calculator.average_ticket || "";
  if (campaignCostGrossMarginInput) campaignCostGrossMarginInput.value = calculator.gross_margin_per_sale || "";
  if (campaignCostConversionInput) campaignCostConversionInput.value = calculator.lead_to_sale_rate || "";
  if (campaignCostRedemptionInput) campaignCostRedemptionInput.value = calculator.expected_redemption_rate || "";
  renderCampaignCostRows(calculator);
  renderCampaignCostSummary(calculator);
}

function renderCampaignCostRows(calculator = state.campaignCostCalculator || defaultCampaignCostCalculator()) {
  if (campaignCostProductionList) {
    campaignCostProductionList.innerHTML = (calculator.production || []).map((item, index) => `
      <div class="campaign-cost-row campaign-cost-row-card" data-campaign-cost-row="production" data-index="${index}">
        <div class="campaign-cost-row-head">
          <div>
            <span class="mono-label">Material</span>
            <strong>${escapeHtml(item.label || "Material de campaña")}</strong>
          </div>
          <button class="icon-button" type="button" data-remove-campaign-cost="production" title="Quitar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
        <div class="campaign-cost-row-fields">
          <label><span>Concepto</span><input data-cost-field="label" type="text" value="${escapeHtml(item.label || "")}" placeholder="Volantes, cajas, impresión..."></label>
          <label><span>Cantidad</span><input data-cost-field="quantity" type="number" min="0" step="1" value="${escapeHtml(item.quantity || 0)}"></label>
          <label><span>Costo unitario</span><input data-cost-field="unit_cost" type="number" min="0" step="100" value="${escapeHtml(item.unit_cost || 0)}"></label>
        </div>
        <div class="campaign-cost-row-total"><span>Total</span><strong>${escapeHtml(money(campaignCostRowTotal("production", item, calculator)))}</strong></div>
      </div>
    `).join("");
  }
  if (campaignCostBenefitsList) {
    campaignCostBenefitsList.innerHTML = (calculator.benefits || []).map((item, index) => `
      <div class="campaign-cost-row campaign-cost-row-card campaign-cost-row-benefit" data-campaign-cost-row="benefit" data-index="${index}">
        <div class="campaign-cost-row-head">
          <div>
            <span class="mono-label">Beneficio</span>
            <strong>${escapeHtml(item.name || "Beneficio de campaña")}</strong>
          </div>
          <button class="icon-button" type="button" data-remove-campaign-cost="benefit" title="Quitar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
        <div class="campaign-cost-row-fields campaign-cost-row-fields-wide">
          <label><span>Tipo</span><select data-cost-field="type"><option value="DISCOUNT_PERCENT" ${item.type === "DISCOUNT_PERCENT" ? "selected" : ""}>% descuento</option><option value="DISCOUNT_FIXED" ${item.type === "DISCOUNT_FIXED" ? "selected" : ""}>$ descuento</option><option value="GIFT" ${item.type === "GIFT" ? "selected" : ""}>Obsequio</option><option value="GIFTCARD" ${item.type === "GIFTCARD" ? "selected" : ""}>Bono</option><option value="EXPERIENCE" ${item.type === "EXPERIENCE" ? "selected" : ""}>Experiencia</option></select></label>
          <label class="campaign-cost-field-main"><span>Producto</span><input data-cost-field="name" type="text" value="${escapeHtml(item.name || "")}" placeholder="Producto o beneficio"></label>
          <label><span>Precio normal</span><input data-cost-field="product_price" type="number" min="0" step="100" value="${escapeHtml(item.product_price || 0)}"></label>
          <label><span>Costo producto</span><input data-cost-field="product_cost" type="number" min="0" step="100" value="${escapeHtml(item.product_cost || 0)}"></label>
          <label><span>% descuento</span><input data-cost-field="discount_percent" type="number" min="0" max="100" step="1" value="${escapeHtml(item.discount_percent || 0)}"></label>
          <label><span>$ descuento</span><input data-cost-field="discount_amount" type="number" min="0" step="100" value="${escapeHtml(item.discount_amount || 0)}"></label>
          <label><span>Emitidos</span><input data-cost-field="issued_units" type="number" min="0" step="1" value="${escapeHtml(item.issued_units || 0)}"></label>
          <label><span>Redención %</span><input data-cost-field="redemption_rate" type="number" min="0" max="100" step="0.1" value="${escapeHtml(item.redemption_rate ?? calculator.expected_redemption_rate ?? 0)}"></label>
          <label><span>Comprados ya</span><input data-cost-field="prepaid_units" type="number" min="0" step="1" value="${escapeHtml(item.prepaid_units || 0)}"></label>
        </div>
        <div class="campaign-cost-row-total campaign-cost-row-total-rich">
          <span>Total estimado</span>
          <strong>${escapeHtml(money(campaignCostRowTotal("benefit", item, calculator)))}</strong>
          <div class="campaign-cost-mini">
            ${campaignBenefitMetaHtml(item, calculator)}
          </div>
        </div>
      </div>
    `).join("");
  }
  if (campaignCostServicesList) {
    campaignCostServicesList.innerHTML = (calculator.services || []).map((item, index) => `
      <div class="campaign-cost-row campaign-cost-row-card" data-campaign-cost-row="service" data-index="${index}">
        <div class="campaign-cost-row-head">
          <div>
            <span class="mono-label">Servicio</span>
            <strong>${escapeHtml(item.name || "Servicio")}</strong>
          </div>
          <button class="icon-button" type="button" data-remove-campaign-cost="service" title="Quitar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
        <div class="campaign-cost-row-fields">
          <label class="campaign-cost-field-main"><span>Rol / servicio</span><input data-cost-field="name" type="text" value="${escapeHtml(item.name || "")}" placeholder="Promotor, diseñador, validador..."></label>
          <label><span>Tipo pago</span><select data-cost-field="payment_type"><option value="monthly" ${item.payment_type === "monthly" ? "selected" : ""}>Mensual</option><option value="daily" ${item.payment_type === "daily" ? "selected" : ""}>Diario</option><option value="hourly" ${item.payment_type === "hourly" ? "selected" : ""}>Por hora</option><option value="commission" ${item.payment_type === "commission" ? "selected" : ""}>Comisión</option></select></label>
          <label><span>Valor</span><input data-cost-field="amount" type="number" min="0" step="1000" value="${escapeHtml(item.amount || 0)}"></label>
          <label><span>Días</span><input data-cost-field="days" type="number" min="0" step="1" value="${escapeHtml(item.days || 0)}"></label>
          <label><span>Horas/día</span><input data-cost-field="hours_per_day" type="number" min="0" step="0.5" value="${escapeHtml(item.hours_per_day || 0)}"></label>
          <label><span>% comisión</span><input data-cost-field="commission_percent" type="number" min="0" step="0.1" value="${escapeHtml(item.commission_percent || 0)}"></label>
        </div>
        <div class="campaign-cost-row-total"><span>Total</span><strong>${escapeHtml(money(campaignCostRowTotal("service", item, calculator)))}</strong></div>
      </div>
    `).join("");
  }
  if (campaignCostVariableList) {
    campaignCostVariableList.innerHTML = (calculator.variable || []).map((item, index) => `
      <div class="campaign-cost-row campaign-cost-row-card" data-campaign-cost-row="variable" data-index="${index}">
        <div class="campaign-cost-row-head">
          <div>
            <span class="mono-label">Variable</span>
            <strong>${escapeHtml(item.label || "Costo variable")}</strong>
          </div>
          <button class="icon-button" type="button" data-remove-campaign-cost="variable" title="Quitar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
        <div class="campaign-cost-row-fields">
          <label class="campaign-cost-field-main"><span>Concepto</span><input data-cost-field="label" type="text" value="${escapeHtml(item.label || "")}" placeholder="Domicilio, empaque, comisión..."></label>
          <label><span>Costo unitario</span><input data-cost-field="unit_cost" type="number" min="0" step="100" value="${escapeHtml(item.unit_cost || 0)}"></label>
          <label><span>Unidades</span><input data-cost-field="units" type="number" min="0" step="1" value="${escapeHtml(item.units || 0)}"></label>
          <label class="campaign-cost-check"><input data-cost-field="apply_redemption_rate" type="checkbox" ${item.apply_redemption_rate ? "checked" : ""}> <span>Aplicar redención</span></label>
        </div>
        <div class="campaign-cost-row-total"><span>Total</span><strong>${escapeHtml(money(campaignCostRowTotal("variable", item, calculator)))}</strong></div>
      </div>
    `).join("");
  }
  if (campaignCostFixedList) {
    campaignCostFixedList.innerHTML = (calculator.fixed || []).map((item, index) => `
      <div class="campaign-cost-row campaign-cost-row-card" data-campaign-cost-row="fixed" data-index="${index}">
        <div class="campaign-cost-row-head">
          <div>
            <span class="mono-label">Fijo</span>
            <strong>${escapeHtml(item.label || "Costo fijo")}</strong>
          </div>
          <button class="icon-button" type="button" data-remove-campaign-cost="fixed" title="Quitar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
        <div class="campaign-cost-row-fields">
          <label class="campaign-cost-field-main"><span>Concepto</span><input data-cost-field="label" type="text" value="${escapeHtml(item.label || "")}" placeholder="Transporte, pauta, permisos..."></label>
          <label><span>Valor</span><input data-cost-field="amount" type="number" min="0" step="1000" value="${escapeHtml(item.amount || 0)}"></label>
        </div>
        <div class="campaign-cost-row-total"><span>Total</span><strong>${escapeHtml(money(campaignCostRowTotal("fixed", item, calculator)))}</strong></div>
      </div>
    `).join("");
  }
}

function renderCampaignCostSummary(calculator = state.campaignCostCalculator || defaultCampaignCostCalculator()) {
  if (!campaignCostSummary) return;
  const totals = calculateCampaignCosts(calculator);
  const primaryMetrics = [
    { label: "Costo total", value: money(totals.totalCost), meta: `${money(totals.dailyCost)} por día`, icon: "paid", tone: "primary" },
    { label: "Beneficios", value: money(totals.benefitsTotal), meta: `${money(totals.costPerRedemption)} por redención`, icon: "redeem", tone: "benefit" },
    { label: "Equilibrio", value: totals.breakEvenSales ? `${totals.breakEvenSales.toLocaleString("es-CO")} ventas` : "-", meta: `${money(totals.breakEvenRevenue)} mínimo`, icon: "balance", tone: "break-even" },
    { label: "Ventas necesarias", value: totals.requiredSales ? totals.requiredSales.toLocaleString("es-CO") : "-", meta: `${totals.leadsNeeded.toLocaleString("es-CO")} leads estimados`, icon: "shopping_cart", tone: "target" },
    { label: "ROI esperado", value: `${Math.round(totals.roi)}%`, meta: `Neto ${money(totals.netProfit)}`, icon: "trending_up", tone: totals.roi < 0 ? "negative" : "positive" },
  ];
  const detailMetrics = [
    ["Costo fijo", money(totals.fixedCostTotal), "Se paga aunque nadie participe"],
    ["Costo variable", money(totals.variableTotal + totals.benefitsTotal), "Beneficios y costos por volumen"],
    ["Producción", money(totals.productionTotal), "Materiales y piezas físicas"],
    ["Servicios", money(totals.servicesTotal), `${money(totals.servicesTotal / totals.durationDays)} diarios`],
    ["Otros costos", money(totals.fixedTotal), "Pauta, transporte, permisos"],
    ["Utilidad meta", money(totals.targetProfit), `${calculator.desired_profit_percent || 0}% sobre costo`],
  ];
  campaignCostSummary.innerHTML = `
    <div class="campaign-cost-answer-grid">
      ${primaryMetrics.map((item) => `
        <article class="campaign-cost-answer ${escapeHtml(item.tone)}">
          <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(item.icon)}</span>
          <div>
            <span class="mono-label">${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <small>${escapeHtml(item.meta)}</small>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="campaign-cost-detail-grid">
      ${detailMetrics.map(([label, value, meta]) => `
        <div>
          <span class="mono-label">${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <small>${escapeHtml(meta)}</small>
        </div>
      `).join("")}
    </div>
  `;
  renderCampaignCostDecision(calculator, totals);
  renderCampaignCostScenarios(calculator);
  if (campaignCostMessage) {
    const missingFields = campaignCostMissingViabilityFields(totals);
    campaignCostMessage.innerHTML = campaignCostFeedbackHtml(missingFields.length ? {
      tone: "warning",
      icon: "edit_note",
      title: "Faltan datos para decidir",
      body: "Completa los campos pendientes y la calculadora podrá decir si la campaña recupera su inversión.",
      details: missingFields,
    } : {
      tone: "idle",
      icon: "payments",
      title: "Meta financiera sugerida",
      body: `Para que esta campaña sea rentable, necesita al menos ${money(totals.revenueGoal)} en ventas, ${totals.requiredSales.toLocaleString("es-CO")} ventas con ticket promedio de ${money(totals.averageTicket)} o ${totals.leadsNeeded.toLocaleString("es-CO")} leads si convierte al ${totals.conversionRate || 0}%.`,
    });
  }
}

function renderCampaignCostDecision(calculator = state.campaignCostCalculator || defaultCampaignCostCalculator(), totals = calculateCampaignCosts(calculator)) {
  if (!campaignCostDecision) return;
  const decision = campaignDecisionStatus(totals);
  const goalLabel = campaignGoalLabel(calculator.primary_goal);
  const missingList = decision.missingFields?.length
    ? `<ul class="campaign-cost-missing-list">${decision.missingFields.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  const commercialDecision = decision.isCalculable
    ? `Sí, si logra ${totals.requiredSales.toLocaleString("es-CO")} ventas, convierte al menos ${totals.conversionRate || 0}% de leads o sostiene un margen bruto de ${money(totals.grossMarginPerSale)} por venta.`
    : `Aún no hay veredicto: completa ${decision.missingFields.map((item) => item.toLowerCase()).join(", ")} para calcular ventas necesarias, leads requeridos y punto de equilibrio.`;
  campaignCostDecision.innerHTML = `
    <div class="campaign-cost-status ${escapeHtml(decision.tone)}">
      <span class="mono-label">¿Esta campaña se paga sola?</span>
      <strong>${escapeHtml(decision.label)}</strong>
      <p>${escapeHtml(decision.action)}</p>
      ${missingList}
    </div>
    <div>
      <span class="mono-label">Decisión comercial</span>
      <p>${escapeHtml(commercialDecision)}</p>
    </div>
    <div>
      <span class="mono-label">Meta por comportamiento</span>
      <p>Meta principal: ${escapeHtml(goalLabel)}. Costo estimado por ${escapeHtml(goalLabel.replace(/s$/, ""))}: ${escapeHtml(money(goalLabel === "leads" ? totals.costPerLead : goalLabel === "redenciones" ? totals.costPerRedemption : totals.costPerSale))}.</p>
    </div>
    <div>
      <span class="mono-label">Resumen operativo</span>
      <p>${totals.durationDays} días · ${escapeHtml(campaignDynamicLabel(calculator.gamified_dynamic))} · ${Math.round(totals.benefitsCommitted).toLocaleString("es-CO")} beneficios emitidos · ${Math.round(totals.benefitsRedeemed).toLocaleString("es-CO")} redenciones estimadas.</p>
    </div>
  `;
}

function renderCampaignCostScenarios(calculator = state.campaignCostCalculator || defaultCampaignCostCalculator()) {
  if (!campaignCostScenarios) return;
  const baseTicket = normalizeCampaignCostNumber(calculator.average_ticket);
  const baseConversion = normalizeCampaignCostNumber(calculator.lead_to_sale_rate);
  const baseRedemption = normalizeCampaignCostNumber(calculator.expected_redemption_rate);
  const baseMargin = normalizeCampaignCostNumber(calculator.gross_margin_per_sale);
  const scenarios = [
    ["Conservador", { average_ticket: baseTicket * 0.85, conversion_rate: baseConversion * 0.7, redemption_rate: baseRedemption * 0.75, gross_margin_per_sale: baseMargin * 0.85 }],
    ["Esperado", { average_ticket: baseTicket, conversion_rate: baseConversion, redemption_rate: baseRedemption, gross_margin_per_sale: baseMargin }],
    ["Optimista", { average_ticket: baseTicket * 1.15, conversion_rate: Math.min(100, baseConversion * 1.35), redemption_rate: Math.min(100, baseRedemption * 1.2), gross_margin_per_sale: baseMargin * 1.1 }],
  ].map(([label, scenario]) => [label, calculateCampaignCosts(calculator, scenario)]);
  campaignCostScenarios.innerHTML = `
    <div class="campaign-cost-section-head">
      <h4>Escenarios</h4>
      <span class="table-secondary">Si sale mal, normal o mejor de lo esperado</span>
    </div>
    <div class="campaign-cost-scenario-grid">
      ${scenarios.map(([label, totals]) => `
        <article>
          <span class="mono-label">${escapeHtml(label)}</span>
          <strong>${escapeHtml(money(totals.netProfit))}</strong>
          <small>ROI ${Math.round(totals.roi)}% · ${totals.requiredSales.toLocaleString("es-CO")} ventas · ${totals.leadsNeeded.toLocaleString("es-CO")} leads</small>
        </article>
      `).join("")}
    </div>
  `;
}

function syncCampaignCostCalculatorFromForm({ rerenderRows = false } = {}) {
  if (!campaignCostSummary) return;
  state.campaignCostCalculator = readCampaignCostCalculatorFromForm();
  saveCampaignCostCalculatorLocal();
  if (rerenderRows) renderCampaignCostRows(state.campaignCostCalculator);
  renderCampaignCostSummary(state.campaignCostCalculator);
}

function addCampaignCostRow(type) {
  state.campaignCostCalculator = readCampaignCostCalculatorFromForm();
  const calculator = state.campaignCostCalculator;
  if (type === "production") calculator.production.push({ label: "Material", quantity: 0, unit_cost: 0 });
  if (type === "benefit") calculator.benefits.push({ type: "DISCOUNT_PERCENT", name: "Beneficio", product_price: 0, product_cost: 0, discount_percent: 0, discount_amount: 0, issued_units: 0, redemption_rate: calculator.expected_redemption_rate || 0, prepaid_units: 0 });
  if (type === "service") calculator.services.push({ name: "Servicio", payment_type: "monthly", amount: 0, days: 0, hours_per_day: 0, commission_percent: 0, sales_base: 0 });
  if (type === "variable") calculator.variable.push({ label: "Costo variable", unit_cost: 0, units: 0, apply_redemption_rate: false });
  if (type === "fixed") calculator.fixed.push({ label: "Costo fijo", amount: 0 });
  saveCampaignCostCalculatorLocal();
  renderCampaignCostCalculator();
}

function removeCampaignCostRow(type, index) {
  state.campaignCostCalculator = readCampaignCostCalculatorFromForm();
  const calculator = state.campaignCostCalculator;
  const collectionByType = {
    production: calculator.production,
    benefit: calculator.benefits,
    service: calculator.services,
    variable: calculator.variable,
    fixed: calculator.fixed,
  };
  const rows = collectionByType[type];
  if (!Array.isArray(rows)) return;
  rows.splice(index, 1);
  if (!rows.length) {
    if (type === "production") rows.push({ label: "Material", quantity: 0, unit_cost: 0 });
    if (type === "benefit") rows.push({ type: "DISCOUNT_PERCENT", name: "Beneficio", product_price: 0, product_cost: 0, discount_percent: 0, discount_amount: 0, issued_units: 0, redemption_rate: calculator.expected_redemption_rate || 0, prepaid_units: 0 });
    if (type === "service") rows.push({ name: "Servicio", payment_type: "monthly", amount: 0, days: 0, hours_per_day: 0, commission_percent: 0, sales_base: 0 });
    if (type === "variable") rows.push({ label: "Costo variable", unit_cost: 0, units: 0, apply_redemption_rate: false });
    if (type === "fixed") rows.push({ label: "Costo fijo", amount: 0 });
  }
  saveCampaignCostCalculatorLocal();
  renderCampaignCostCalculator();
}

function handleCampaignCostListInput(event) {
  if (event.target?.matches?.("input, select")) {
    syncCampaignCostCalculatorFromForm({ rerenderRows: event.type === "change" });
    return;
  }
  const removeButton = event.target?.closest?.("[data-remove-campaign-cost]");
  if (removeButton) {
    const row = removeButton.closest("[data-campaign-cost-row]");
    removeCampaignCostRow(removeButton.dataset.removeCampaignCost, Number(row?.dataset.index || 0));
  }
}

function applyCampaignCostDurationFromDates() {
  if (!campaignCostDurationInput) return;
  campaignCostDurationInput.value = campaignCostDurationFromDates();
  syncCampaignCostCalculatorFromForm({ rerenderRows: true });
}

function applyCampaignCostToLaunchBudget() {
  syncCampaignCostCalculatorFromForm();
  const totals = calculateCampaignCosts(state.campaignCostCalculator);
  if (launchBudgetInput) launchBudgetInput.value = Math.round(totals.totalCost);
  if (launchSalesGoalInput) launchSalesGoalInput.value = Math.round(totals.revenueGoal);
  if (campaignCostMessage) {
    campaignCostMessage.innerHTML = campaignCostFeedbackHtml({
      tone: "success",
      icon: "check_circle",
      title: "Presupuesto actualizado en el formulario",
      body: `Se copiaron ${money(totals.totalCost)} al presupuesto de la campaña y ${money(totals.revenueGoal)} a la meta de ventas sugerida.`,
      details: ["Revisa los campos del formulario principal antes de guardar.", "La calculadora sigue editable: si cambias números, vuelve a usar este botón."],
    });
  }
  if (campaignCostApplyBudgetButton) {
    const defaultHtml = campaignCostApplyBudgetButton.dataset.defaultHtml || campaignCostApplyBudgetButton.innerHTML;
    campaignCostApplyBudgetButton.dataset.defaultHtml = defaultHtml;
    campaignCostApplyBudgetButton.classList.add("campaign-cost-apply-done");
    campaignCostApplyBudgetButton.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span>Aplicado al formulario';
    window.setTimeout(() => {
      campaignCostApplyBudgetButton.classList.remove("campaign-cost-apply-done");
      campaignCostApplyBudgetButton.innerHTML = campaignCostApplyBudgetButton.dataset.defaultHtml || defaultHtml;
    }, 2400);
  }
}

function renderCampaignAffiliatesPanel() {
  if (!campaignAffiliateSelect || !campaignAffiliatesTable) return;
  const assigned = state.selectedCampaignAffiliates || [];
  const assignedIds = new Set(assigned.map((item) => item.affiliate_id));
  const available = (state.affiliates || []).filter((affiliate) => affiliate.status !== "DELETED");
  campaignAffiliateSelect.innerHTML = [
    '<option value="">Seleccionar afiliado</option>',
    ...available.map((affiliate) => `
      <option value="${escapeHtml(affiliate.id)}" ${assignedIds.has(affiliate.id) ? "disabled" : ""}>
        ${escapeHtml(affiliate.full_name || "Afiliado")} (${escapeHtml(affiliate.document_id || affiliate.phone || "sin documento")})${assignedIds.has(affiliate.id) ? " - asociado" : ""}
      </option>
    `),
  ].join("");
  const canAssign = Boolean(state.selectedCampaignId && available.some((affiliate) => !assignedIds.has(affiliate.id)));
  if (campaignAffiliateAssignButton) campaignAffiliateAssignButton.disabled = !canAssign;
  if (campaignAffiliateMessage && !canAssign && !assigned.length) {
    campaignAffiliateMessage.textContent = available.length ? "Todos los afiliados disponibles ya están asociados a esta campaña." : "Crea afiliados para asociarlos a campañas.";
  } else if (campaignAffiliateMessage) {
    campaignAffiliateMessage.textContent = "";
  }
  campaignAffiliatesTable.innerHTML = assigned.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.full_name || "Afiliado")}</strong>
        <br><span class="table-secondary">${escapeHtml(item.document_id || item.phone || item.email || "-")}</span>
      </td>
      <td>${Number(item.referral_tickets_generated || 0).toLocaleString("es-CO")}</td>
      <td>${Number(item.referral_tickets_redeemed || 0).toLocaleString("es-CO")}</td>
      <td>${Number(item.referral_sales_count || 0).toLocaleString("es-CO")}</td>
      <td>
        <strong>${money(item.referral_revenue || 0)}</strong>
        <br><span class="table-secondary">${Number(item.referral_points_awarded || 0).toLocaleString("es-CO")} pts</span>
      </td>
      <td>
        <button class="ghost-button" type="button" data-campaign-affiliate-open="${escapeHtml(item.affiliate_id)}">Ver</button>
        <button class="ghost-button danger-button" type="button" data-campaign-affiliate-remove="${escapeHtml(item.affiliate_id)}">Quitar</button>
      </td>
    </tr>
  `).join("") || '<tr><td colspan="6">Sin afiliados asociados a esta campaña.</td></tr>';
  campaignAffiliatesTable.querySelectorAll("[data-campaign-affiliate-open]").forEach((button) => {
    button.addEventListener("click", () => openAffiliateForPoints(button.dataset.campaignAffiliateOpen));
  });
  campaignAffiliatesTable.querySelectorAll("[data-campaign-affiliate-remove]").forEach((button) => {
    button.addEventListener("click", () => removeCampaignAffiliate(button.dataset.campaignAffiliateRemove));
  });
}

function setCampaignSectionTab(tab = "analysis") {
  const nextTab = ["analysis", "calculator", "assistant"].includes(tab) ? tab : "analysis";
  state.campaignSectionTab = nextTab;
  campaignSectionTabs.forEach((button) => {
    const active = button.dataset.campaignSectionTab === nextTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.setAttribute("tabindex", active ? "0" : "-1");
  });
  campaignSectionPanels.forEach((panel) => {
    panel.classList.toggle("campaign-tab-hidden", panel.dataset.campaignTabPanel !== nextTab);
  });
  if (nextTab === "calculator" && state.selectedCampaign) {
    renderCampaignCostCalculator();
  }
}

async function reloadCampaignAffiliates(campaignId = state.selectedCampaignId) {
  if (!campaignId || !session?.user?.business_id) return;
  const data = await apiSafe(`/api/portal/businesses/${session.user.business_id}/campaigns/${campaignId}/affiliates`, { headers: authHeaders() }, { affiliates: [] });
  if (state.selectedCampaignId !== campaignId) return;
  state.selectedCampaignAffiliates = data.affiliates || [];
  renderCampaignAffiliatesPanel();
}

async function assignCampaignAffiliate(event) {
  event.preventDefault();
  if (!state.selectedCampaignId || !session?.user?.business_id) return;
  const affiliateId = campaignAffiliateSelect?.value || "";
  if (!affiliateId) {
    setFormMessage(campaignAffiliateMessage, "Selecciona un afiliado para asociarlo.", "error");
    return;
  }
  try {
    if (campaignAffiliateAssignButton) campaignAffiliateAssignButton.disabled = true;
    setFormMessage(campaignAffiliateMessage, "Asociando afiliado a la campaña...", "info");
    const data = await api(`/api/portal/businesses/${session.user.business_id}/campaigns/${state.selectedCampaignId}/affiliates`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        affiliate_id: affiliateId,
        role: "REFERER",
        notes: campaignAffiliateNotesInput?.value.trim() || null,
      }),
    });
    state.selectedCampaignAffiliates = data.affiliates || [];
    if (campaignAffiliateNotesInput) campaignAffiliateNotesInput.value = "";
    renderCampaignAffiliatesPanel();
    setFormMessage(campaignAffiliateMessage, "Afiliado asociado a la campaña.", "success");
  } catch (error) {
    setFormMessage(campaignAffiliateMessage, error.message || "No se pudo asociar el afiliado.", "error");
    if (campaignAffiliateAssignButton) campaignAffiliateAssignButton.disabled = false;
  }
}

async function removeCampaignAffiliate(affiliateId) {
  if (!affiliateId || !state.selectedCampaignId || !session?.user?.business_id) return;
  try {
    await api(`/api/portal/businesses/${session.user.business_id}/campaigns/${state.selectedCampaignId}/affiliates/${encodeURIComponent(affiliateId)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    state.selectedCampaignAffiliates = (state.selectedCampaignAffiliates || []).filter((item) => item.affiliate_id !== affiliateId);
    renderCampaignAffiliatesPanel();
    showFeedback("Afiliado quitado de la campaña.", "success");
  } catch (error) {
    showFeedback(error.message || "No se pudo quitar el afiliado.", "error");
  }
}

function renderCampaignView() {
  const campaign = state.selectedCampaign;
  if (!campaign) {
    renderNoCampaignState();
    return;
  }

  campaignBreadcrumb.textContent = campaign.name;
  campaignHeroTitle.textContent = `Campaña: ${campaign.name}`;
  campaignHeroSubtitle.textContent = campaign.strategy_summary || "Campaña lista para medición operativa y comercial.";
  campaignInsightText.textContent = buildInsight(campaign);
  campaignObjectiveValue.textContent = campaign.objective || "Sin objetivo definido";
  campaignDurationValue.textContent = formatCampaignDuration(campaign);
  campaignStatusValue.textContent = statusLabel(campaign.status);
  campaignBudgetValue.textContent = money(campaign.attributed_revenue);
  campaignBudgetMeta.textContent = `${money(campaign.budget_total)} invertidos | ${launchChannelsLabel(campaign.launch_channels)}`;
  campaignBudgetBar.style.width = `${Math.min(100, safeRate(campaign.attributed_revenue, campaign.budget_total || 1))}%`;
  campaignRoiValue.textContent = ratioLabel(campaign.estimated_roi);
  campaignRoiDelta.textContent = `${campaign.redemption_rate || 0}% redención`;

  const setupEditable = ["READY_FOR_CLIENT_SETUP", "SCHEDULED"].includes(campaign.status) && !isAdmin();
  const setupReady = campaign.status === "READY_FOR_CLIENT_SETUP";
  editCampaignButton.classList.toggle("hidden", !canManageCampaigns());
  markReadyCampaignButton.classList.toggle("hidden", !(isAdmin() && campaign.status === "DRAFT"));
  launchSetupTitle.textContent = setupReady ? "Preparar lanzamiento" : "Configuración del cliente";
  launchSetupStatus.textContent = statusLabel(campaign.status);
  launchSetupCopy.textContent = setupReady
    ? "Completa inversión, fechas, metas y canales reales antes de activar la campaña."
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
  renderCampaignCostCalculator();
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
    : '<article class="asset-card"><strong>Sin assets cargados</strong><span>Market Games aún no ha publicado enlaces o materiales para esta campaña.</span></article>';
  renderCampaignAffiliatesPanel();

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
    ["Total leads", campaign.total_leads, `${campaign.expected_leads_goal || 0} meta`, "", "Volumen total de personas identificadas que dejaron datos dentro de esta campaña."],
    ["tickets emitidos", campaign.total_qr_generated, `${safeRate(campaign.total_qr_generated, campaign.total_leads)}% de los leads activaron ticket`, "", "Mide que tan bien el lead avanza hasta reclamar el beneficio."],
    ["Redenciones", campaign.total_qr_redeemed, `${campaign.expected_redemptions_goal || 0} meta`, campaign.redemption_rate < 10 ? "negative" : "", "Mide la llegada real a tienda o al punto de entrega del incentivo."],
    ["Tasa de redención", `${campaign.redemption_rate || 0}%`, `${toNumber(campaign.direct_sales_count || campaign.attributed_sales_count)} compras atribuidas`, "", "Porcentaje de tickets emitidos que realmente fueron usados."],
    ["Clientes adquiridos", campaign.direct_sales_count || campaign.attributed_sales_count, `${money(campaign.cost_per_acquired_customer)} CAC`, "", "Clientes con compra atribuida a la campaña. Es la base para leer CAC y ROI."],
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
    ? "La campaña aún no tiene suficiente cierre comercial."
    : `${campaign.name} ya muestra una lectura comercial clara.`;
  campaignAnalysisText.textContent = `Con ${campaign.total_leads} leads, ${campaign.total_qr_redeemed} redenciones y ${toNumber(campaign.direct_sales_count || campaign.attributed_sales_count)} compras, la campaña convierte interés digital en visitas y ventas medibles.`;
  campaignEconomicsText.textContent = `ROI actual: ${ratioLabel(campaign.estimated_roi)}. CAC: ${money(campaign.cost_per_acquired_customer)}. Ticket promedio atribuido: ${money(avgTicket)}. La relacion mejora cuando CAC se mantiene bastante por debajo del ticket.`;
  campaignActionText.textContent = campaign.redemption_rate < 30
    ? "La mayor oportunidad esta en el paso ticket -> redención. Conviene revisar incentivo, urgencia y seguimiento en tienda."
    : campaign.cost_per_acquired_customer > avgTicket * 0.6 && avgTicket > 0
      ? "La campaña vende, pero el CAC esta pesado frente al ticket. Conviene optimizar pauta o subir ticket promedio."
      : "La campaña está sana. El siguiente paso es escalar el canal con mejor redención y mantener disciplina de registro en caja.";

  renderFunnel(campaign);
  drawGroupedBars(
    campaignTimelineChart,
    buildTimelineSeries(),
    [
      { key: "leads", color: NEON_CHART.cyan, label: "Leads" },
      { key: "sales", color: NEON_CHART.yellow, label: "Ventas" },
    ]
  );
  setCampaignSectionTab(state.campaignSectionTab || "analysis");
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
      ["Contactos retenidos", feedRows.length, state.contactFeedRetention?.label || "Según plan"],
      ["Compradores", buyers, "Con venta registrada"],
      ["Leads calientes", hot, "Prioridad comercial"],
      ["Exportables", exportable, "Email o teléfono"],
      ["Origen líder", topSource?.[0] || "-", topSource ? `${topSource[1]} contactos` : "Sin datos"],
    ].map(([label, value, meta]) => `
      <article class="kpi-card">
        <span class="mono-label">${escapeHtml(label)}</span>
        <strong>${escapeHtml(value ?? 0)}</strong>
        <div class="kpi-meta">${escapeHtml(meta || "")}</div>
      </article>
    `).join("");
  }
  if (leadFeedRetention) {
    leadFeedRetention.textContent = `Retención ${state.contactFeedRetention?.label || "según plan"}`;
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
          ${escapeHtml(item.campaign_name || "Sin campaña")}
          <br><span class="table-secondary">${escapeHtml(item.attribution_subject || "-")}</span>
        </td>
        <td>
          <span class="status-chip ${item.lead_temperature === "buyer" ? "ok" : item.lead_temperature === "hot" ? "warning" : "pending"}">${escapeHtml(item.lead_temperature || "-")}</span>
          <br><span class="table-secondary">${escapeHtml(item.qr_status || item.stage || "-")}</span>
        </td>
        <td>${item.sale_amount ? money(item.sale_amount) : "-"}</td>
        <td>${escapeHtml(item.recommended_action || "-")}</td>
      </tr>
    `).join("") || '<tr><td colspan="6">Sin contactos dentro de la retención de tu plan.</td></tr>';
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
  `).join("") || '<tr><td colspan="9">Sin leads para esta campaña.</td></tr>';
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
  `).join("") || '<tr><td colspan="6">Sin redenciones para esta campaña.</td></tr>';

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
  const sales = filterRows(state.selectedSales || [], ["player_name", "document_id", "phone", "payment_method", "product_or_service", "branch_name", "affiliate_name"]);
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
  renderCustomerAcquisitionCampaignOptions();
  renderSalesCustomerOptions();
  renderCustomerSaleItems();

  campaignSalesTable.innerHTML = sales.map((item) => `
    <tr>
      <td>${escapeHtml(item.player_name || "-")}</td>
      <td>${escapeHtml(item.document_id || "-")}</td>
      <td>${escapeHtml(item.phone || "-")}</td>
      <td>${escapeHtml(money(item.sale_amount))}</td>
      <td>${escapeHtml(item.payment_method || "-")}</td>
      <td>${escapeHtml(item.referred_affiliate_id ? "Afiliado" : saleSourceLabel(item.sale_source))}</td>
      <td>${saleProductSummary(item)}</td>
      <td>${saleAffiliateSummary(item)}</td>
      <td>${escapeHtml(item.branch_name || "-")}</td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
    </tr>
  `).join("") || '<tr><td colspan="10">Sin ventas para esta campaña.</td></tr>';
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
    adminPanelMessage.textContent = "Tu rol actual es de negocio. La gestión global sigue disponible solo para admins en `/admin`.";
    return;
  }

  adminKpiGrid.innerHTML = [
    ["Campañas globales", state.adminCampaigns.length, "Todas las empresas"],
    ["Campañas del negocio", state.campaigns.length, session.user.business_id || "-"],
    ["Rol actual", session.user.role, "Acceso a crear y editar campañas"],
  ].map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <div class="kpi-meta">${escapeHtml(meta)}</div>
    </article>
  `).join("");

  adminPanelMessage.textContent = "Este usuario puede crear y editar campañas desde el modal del portal y también operar `/admin`.";
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
      validatorRewardPassBalanceMessage.textContent = "Ingresa el total de la factura electronica para calcular cuánto cubre el Reward Pass.";
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
  validatorResultChip.textContent = mode === "ok" ? "Válido" : mode === "danger" ? "Rechazado" : "Pendiente";

  validatorBusinessValue.textContent = data?.business?.name || "-";
  validatorCampaignValue.textContent = data?.campaign?.name || data?.batch?.name || "-";
  validatorGameValue.textContent = data?.game?.name || data?.qr_code?.origin_type || "-";
  const validatorBenefitValue = data?.reward?.value || data?.reward?.benefit_value || {};
  const validatorProductScope = benefitProductScopeLabel(validatorBenefitValue);
  const validatorFulfillment = benefitFulfillmentLabel(validatorBenefitValue, data?.qr_code?.metadata || {});
  validatorRewardValue.textContent = [
    data?.reward?.display || data?.reward?.name || validatorBenefitValue?.label || "-",
    validatorProductScope,
    validatorFulfillment,
  ].filter(Boolean).join(" | ");
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
  setProductInputValue(validatorProductServiceInput, "");
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

  const scopeKey = businessScopeKey();
  try {
    const data = await api(`/api/businesses/${businessId}/redemptions`, {
      method: "GET",
      headers: authHeaders(),
    });
    if (!isCurrentBusinessScope(scopeKey)) return;
    renderValidatorHistory(data.redemptions || []);
  } catch (error) {
    if (!isCurrentBusinessScope(scopeKey)) return;
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
    setValidatorResult("neutral", "Sin validación", "Escanea o pega un ticket para consultar la base de datos.");
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

function seasonalCampaignExpiryValue() {
  const now = new Date();
  let expiry = new Date(now.getFullYear(), 8, 30, 23, 59);
  if (now > expiry) {
    expiry = new Date(now.getFullYear() + 1, 8, 30, 23, 59);
  }
  return formatInputDateTime(expiry.toISOString());
}

function setFieldValue(field, value) {
  if (!field) return;
  if (field.matches?.("[data-product-select]")) {
    setProductInputValue(field, value);
  } else {
    field.value = value;
  }
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function configureSecretFriendGiftTicket() {
  setTicketCenterTab("center");
  setFieldValue(postSaleAttributionSourceInput, "Amigo Secreto Endulzado");
  setFieldValue(postSaleAttributionSubjectInput, "Ticket regalo comprado");
  setFieldValue(postSaleAmountInput, "");
  setFieldValue(postSaleCurrencyInput, "COP");
  setFieldValue(postSaleProductInput, "Producto regalo endulzado");
  setFieldValue(postSaleCustomerInput, "");
  setFieldValue(postSaleDocumentInput, "");
  setFieldValue(postSalePhoneInput, "");
  setFieldValue(postSaleEmailInput, "");
  setFieldValue(postSaleBenefitLabelInput, "Tu amigo secreto te endulzo: reclama tu producto regalo");
  setFieldValue(postSaleBenefitTypeInput, "FREE_GIFT");
  setFieldValue(postSaleBenefitProductModeInput, "gift_product");
  setFieldValue(postSaleBenefitProductInput, "Producto regalo endulzado");
  setFieldValue(postSaleBenefitValueInput, JSON.stringify({
    product: "Producto regalo",
    example: "caja dulce, postre, bebida, libro, hamburguesa o producto definido por la marca",
    mechanic: "amigo_secreto_endulzado",
    ticket_role: "principal_gift_ticket",
  }));
  setFieldValue(postSaleExpiresModeInput, "CUSTOM_DATE");
  setFieldValue(postSaleExpiresAtInput, seasonalCampaignExpiryValue());
  setFieldValue(postSaleNotesInput, "Ejemplo generico: un cliente compra un ticket producto regalo para su amigo secreto. El beneficiario recibe el QR, presenta el ticket y reclama el producto definido por la marca. Ajusta producto, valor, vigencia, mensaje y datos del beneficiario antes de generar.");
  postSaleQrForm?.scrollIntoView({ behavior: "smooth", block: "start" });
  setInlineMessage(postSaleQrMessage, "Plantilla generica cargada. Cambia el producto regalo, valor, vigencia y datos del beneficiario antes de generar.", "info");
  showFeedback("Ticket regalo de Amigo Secreto Endulzado preparado.", "success", { title: "Temporada lista" });
}

function configureSecretFriendProspectActivation() {
  setTicketCenterTab("trivia");
  setActivationType("SURVEY");
  const surveyCountInput = document.querySelector('[data-question-count-for="SURVEY"]');
  setFieldValue(surveyCountInput, "3");
  updateActivationQuestionCountControls();
  setFieldValue(triviaTitleInput, "Amigo Secreto Endulzado");
  setFieldValue(triviaDescriptionInput, "Alguien penso en ti y te dejo una sorpresa. Confirma tus datos, responde una pregunta rapida, reclama tu producto regalo en tienda y luego invita a otro prospecto.");
  setFieldValue(triviaBenefitLabelInput, "Ticket secundario: invita a alguien mas a reclamar un beneficio");
  setFieldValue(triviaBenefitTypeInput, "FREE_GIFT");
  setFieldValue(triviaBenefitProductModeInput, "gift_product");
  setFieldValue(triviaBenefitProductInput, "Producto definido por la marca");
  setFieldValue(triviaBenefitValueInput, JSON.stringify({
    mechanic: "amigo_secreto_endulzado",
    ticket_role: "secondary_referral_ticket",
    suggested_offer: "beneficio sorpresa o producto definido por la marca para un nuevo invitado",
    conversion_goal: "beneficiary_to_new_prospect",
  }));
  setFieldValue(triviaExpiresModeInput, "CUSTOM_DATE");
  setFieldValue(triviaExpiresAtInput, seasonalCampaignExpiryValue());
  setFieldValue(minigameParticipantCooldownInput, "30");
  setFieldValue(minigameWinnerPolicyInput, "block_previous_winners");

  const surveyQuestions = [
    ["1", "Para activar tu regalo, que producto o sabor elegirias hoy?", "SINGLE_CHOICE", "Opcion 1, Opcion 2, Opcion 3, Sorpresa de la marca"],
    ["2", "A quien invitarias despues de reclamar tu sorpresa?", "SHORT_TEXT", ""],
    ["3", "Quieres recibir nuevas invitaciones o beneficios por WhatsApp?", "SINGLE_CHOICE", "Si, No por ahora"],
  ];
  surveyQuestions.forEach(([index, question, type, options]) => {
    const card = document.querySelector(`[data-survey-question="${index}"]`);
    setFieldValue(card?.querySelector('[data-survey-field="question"]'), question);
    setFieldValue(card?.querySelector('[data-survey-field="type"]'), type);
    setFieldValue(card?.querySelector('[data-survey-field="options"]'), options);
  });
  updateSurveyQuestionEditors();
  triviaLauncherForm?.scrollIntoView({ behavior: "smooth", block: "start" });
  setInlineMessage(triviaLauncherMessage, "Plantilla generica de Amigo Secreto cargada. Ajusta producto, preguntas y beneficio secundario. La campana es opcional; puedes lanzar sin asociarla.", "info");
  showFeedback("Landing prospecto preparada: datos + pregunta + ticket secundario.", "success", { title: "Amigo Secreto Endulzado" });
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
    ["Tickets emitidos", stats.ticketsIssued.toLocaleString("es-CO"), "Inventario físico/digital en circulacion", "highlight"],
    ["Llegadas medidas", stats.redeemedTickets.toLocaleString("es-CO"), "Redenciones o validaciones en tienda"],
    ["Ventas con ticket", stats.salesWithTicket.toLocaleString("es-CO"), money(stats.revenue)],
    ["Ticket promedio", money(stats.averageTicket), "Venta promedio registrada"],
  ]);

  const flow = [
    ["Atracción", "El cliente recibe ticket en volante, empaque, feria, vitrina o referido.", stats.ticketsIssued],
    ["Llegada", "El ticket aparece fisicamente en tienda o caja.", stats.activeTickets + stats.redeemedTickets],
    ["Redención", "El vendedor valida identidad, beneficio y estado.", stats.redeemedTickets],
    ["Venta", "La caja registra valor, producto, sede y contexto.", stats.salesWithTicket],
    ["Salida", "El cliente recibe próximo ticket para volver o recomendar.", stats.postSaleGenerated],
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
        <td>${escapeHtml(value ? "Hay senal operativa para medir y comparar." : "Activa esta etapa para cerrar el ciclo físico.")}</td>
      </tr>
    `).join("");
  }
}

function renderTicketLoop(stats) {
  renderTicketMetricGrid(ticketLoopKpiGrid, [
    ["Tickets de salida", stats.postSaleGenerated.toLocaleString("es-CO"), "Postventa emitida después de compra", "highlight"],
    ["Vueltas medidas", stats.postSaleRedeemed.toLocaleString("es-CO"), "Tickets postventa redimidos"],
    ["Loop rate", `${stats.loopRate.toFixed(1)}%`, "Recompra medida"],
    ["Afiliados activos", (state.affiliates || []).length.toLocaleString("es-CO"), "Clientes con ticket permanente"],
  ]);
  if (!ticketLoopBoard) return;
  const cards = [
    ["Llegar con ticket", "Toda campaña física debe entregar una razon verificable para entrar a tienda.", "Generar paquetes"],
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
      reading: stats.postSaleGenerated ? "Mide si cada compra está creando la próxima visita." : "Aún falta convertir ventas en tickets de salida.",
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
        <td>${escapeHtml(row.revenue ? "Escalar con más tickets y mismo beneficio." : "Medir venta en caja para saber si este canal paga.")}</td>
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
        <td>${escapeHtml(index === 0 && row.revenue ? "Sucursal líder: replicar guion, horario y beneficio." : row.redemptions && !row.sales ? "Tiene llegada física, falta registrar venta." : "Mantener medición por sede.")}</td>
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
    : '<tr><td colspan="5">Cuando el equipo valide tickets, aquí se medirá quien convierte mejor.</td></tr>';
}

function renderTicketShield(stats) {
  renderTicketMetricGrid(ticketShieldKpiGrid, [
    ["Doble uso bloqueado", stats.redemptions.filter((item) => String(item.qr_status || item.status || "").toUpperCase() === "REDEEMED").length.toLocaleString("es-CO"), "Tickets ya consumidos"],
    ["Vencidos sin redimir", stats.expiredTickets.toLocaleString("es-CO"), "Beneficios que perdieron vigencia", stats.expiredTickets ? "warning" : ""],
    ["Redenciones sin venta", stats.missingSales.toLocaleString("es-CO"), "Falta cierre comercial", stats.missingSales ? "warning" : ""],
    ["Riesgo repetidos", stats.repeatRisk.toLocaleString("es-CO"), "Documento/teléfono repetido", stats.repeatRisk ? "warning" : ""],
  ]);
  if (!ticketShieldBoard) return;
  const cards = [
    ["Ticket vencido", stats.expiredTickets, "Reducir vigencia o activar recordatorio antes de vencer."],
    ["Redimido sin venta", stats.missingSales, "Obligar registro de resultado comercial después de redimir."],
    ["Identidad repetida", stats.repeatRisk, "Revisar reglas por cédula, teléfono y beneficio."],
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
        ? "Cada compra debe cerrar con un ticket de regreso. Empieza con 7 o 15 días de vigencia."
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
      title: bestChannel?.value ? `Duplicar ${bestChannel.label}` : "Probar canal físico",
      copy: bestChannel?.value
        ? "Ese canal ya produjo redenciones. Crea otro lote con mejor beneficio o vencimiento más corto."
        : "Crea lotes para volante, empaque, feria, mostrador o referido y mide cuál trae tienda.",
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
  const expiresAt = batch.expires_at ? formatDate(batch.expires_at) : "Sin expiración";
  const productScopeLabel = benefitProductScopeLabel(batch.benefit_value || {}, batch.metadata || {});
  const fulfillmentLabel = benefitFulfillmentLabel(batch.benefit_value || {}, batch.metadata || {});

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
      ${productScopeLabel ? `<span class="table-secondary">${escapeHtml(productScopeLabel)}</span>` : ""}
      ${fulfillmentLabel ? `<span class="table-secondary">${escapeHtml(fulfillmentLabel)}</span>` : ""}
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

function renderCustomerAcquisitionCampaignOptions() {
  if (!customerAcquisitionCampaignInput) return;
  const current = customerAcquisitionCampaignInput.value || state.selectedCampaignId || "";
  customerAcquisitionCampaignInput.innerHTML = [
    '<option value="">Sin campaña atribuida</option>',
    ...(state.campaigns || []).map((campaign) => `
      <option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.name || campaign.slug || campaign.id)}</option>
    `),
  ].join("");
  if (current && (state.campaigns || []).some((campaign) => campaign.id === current)) {
    customerAcquisitionCampaignInput.value = current;
  }
}

function salesCustomerIdentity(row = {}) {
  return normalizeInventoryLookup(
    cleanCustomerValue(row.document_id || row.customer_document_id)
    || cleanCustomerValue(row.phone || row.customer_phone)
    || cleanCustomerValue(row.email || row.customer_email)
    || cleanCustomerValue(row.name || row.player_name)
    || cleanCustomerValue(row.id)
  );
}

function cleanCustomerValue(value) {
  const text = String(value ?? "").trim();
  if (!text || ["-", "—", "n/a", "na", "null", "undefined", "sin dato", "sin datos"].includes(text.toLowerCase())) return "";
  return text;
}

function firstCustomerValue(...values) {
  return values.map(cleanCustomerValue).find(Boolean) || "";
}

function customerMoneyValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return 0;
  const digits = raw.replace(/[^\d-]/g, "");
  return Number(digits || 0);
}

function latestDateValue(first, second) {
  const firstTime = first ? new Date(first).getTime() : 0;
  const secondTime = second ? new Date(second).getTime() : 0;
  if (!Number.isFinite(firstTime) || secondTime > firstTime) return second || first || "";
  return first || second || "";
}

function salesCustomerRows() {
  const rows = [
    ...(state.leadCrmRows || []).map((item) => ({
      id: item.id,
      name: cleanCustomerValue(item.name),
      document_id: cleanCustomerValue(item.document_id),
      phone: cleanCustomerValue(item.phone),
      email: cleanCustomerValue(item.email),
      campaign_id: item.campaign_id,
      campaign_name: item.campaign_name,
      purchase_count: Number(item.purchase_count || 0),
      total_spent: customerMoneyValue(item.total_spent),
      product_or_service: firstCustomerValue(item.top_product, item.product_or_service),
      branch_name: cleanCustomerValue(item.branch_name),
      event_date: item.last_purchase_at || item.last_interaction_at || item.created_at || "",
      is_affiliate: Boolean(item.is_affiliate),
      affiliate_id: item.affiliate_id || null,
      affiliate_name: firstCustomerValue(item.affiliate_name, item.affiliate_code),
      referral_points_awarded: customerMoneyValue(item.referral_points_awarded || item.points_total),
      source: Number(item.purchase_count || 0) > 0 ? "Cliente" : "Lead CRM",
    })),
    ...(state.contactFeed || []).map((item) => ({
      id: item.id,
      name: cleanCustomerValue(item.name),
      document_id: cleanCustomerValue(item.document_id),
      phone: cleanCustomerValue(item.phone),
      email: cleanCustomerValue(item.email),
      campaign_id: item.campaign_id,
      campaign_name: item.campaign_name,
      purchase_count: customerMoneyValue(item.sale_amount) > 0 ? 1 : 0,
      total_spent: customerMoneyValue(item.sale_amount),
      payment_method: firstCustomerValue(item.payment_method, item.payment, item.sale_payment_method),
      product_or_service: firstCustomerValue(item.product_or_service, item.product_name, item.reward_name, item.attribution_subject),
      branch_name: firstCustomerValue(item.branch_name, item.store_branch, item.location),
      event_date: item.sale_created_at || item.redeemed_at || item.created_at || "",
      is_affiliate: Boolean(item.is_affiliate),
      affiliate_id: item.affiliate_id || null,
      affiliate_name: cleanCustomerValue(item.affiliate_name),
      referral_points_awarded: customerMoneyValue(item.referral_points_awarded),
      source: item.attribution_source || "Lead",
    })),
    ...(state.selectedSales || []).map((item) => ({
      id: item.player_id || item.id,
      name: cleanCustomerValue(item.player_name),
      document_id: cleanCustomerValue(item.document_id),
      phone: cleanCustomerValue(item.phone),
      email: cleanCustomerValue(item.email),
      campaign_id: item.campaign_id,
      campaign_name: item.campaign_name,
      purchase_count: 1,
      total_spent: customerMoneyValue(item.sale_amount),
      payment_method: cleanCustomerValue(item.payment_method),
      product_or_service: firstCustomerValue(item.product_or_service, item.product_name),
      branch_name: cleanCustomerValue(item.branch_name),
      event_date: item.created_at || "",
      is_affiliate: Boolean(item.referred_affiliate_id),
      affiliate_id: item.referred_affiliate_id || null,
      affiliate_name: cleanCustomerValue(item.affiliate_name),
      referral_points_awarded: customerMoneyValue(item.referral_points_awarded),
      source: "Cliente",
    })),
    ...(state.affiliates || []).map((item) => ({
      id: item.id,
      name: cleanCustomerValue(item.full_name),
      document_id: cleanCustomerValue(item.document_id),
      phone: cleanCustomerValue(item.phone),
      email: cleanCustomerValue(item.email),
      campaign_id: null,
      campaign_name: "",
      purchase_count: Number(item.purchase_count || item.sales_count || 0),
      total_spent: customerMoneyValue(item.total_spent || item.sales_total),
      product_or_service: firstCustomerValue(item.top_product, item.product_or_service, item.notes),
      branch_name: firstCustomerValue(item.branch_name, item.store_branch),
      event_date: item.last_purchase_at || item.last_activity_at || item.created_at || "",
      is_affiliate: true,
      affiliate_id: item.id,
      affiliate_name: firstCustomerValue(item.full_name, item.name),
      referral_points_awarded: customerMoneyValue(item.points_total || item.ledger_points),
      source: "Afiliado",
    })),
  ];
  const byKey = new Map();
  rows.forEach((row) => {
    const key = salesCustomerIdentity(row);
    if (!key || !(row.name || row.document_id || row.phone || row.email)) return;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      return;
    }
    byKey.set(key, {
      ...existing,
      ...row,
      name: firstCustomerValue(existing.name, row.name),
      document_id: firstCustomerValue(existing.document_id, row.document_id),
      phone: firstCustomerValue(existing.phone, row.phone),
      email: firstCustomerValue(existing.email, row.email),
      campaign_id: firstCustomerValue(existing.campaign_id, row.campaign_id),
      campaign_name: firstCustomerValue(existing.campaign_name, row.campaign_name),
      purchase_count: Math.max(Number(existing.purchase_count || 0), Number(row.purchase_count || 0)),
      total_spent: Math.max(Number(existing.total_spent || 0), Number(row.total_spent || 0)),
      payment_method: firstCustomerValue(existing.payment_method, row.payment_method),
      product_or_service: firstCustomerValue(existing.product_or_service, row.product_or_service),
      branch_name: firstCustomerValue(existing.branch_name, row.branch_name),
      event_date: latestDateValue(existing.event_date, row.event_date),
      is_affiliate: Boolean(existing.is_affiliate || row.is_affiliate),
      affiliate_id: firstCustomerValue(existing.affiliate_id, row.affiliate_id),
      affiliate_name: firstCustomerValue(existing.affiliate_name, row.affiliate_name),
      referral_points_awarded: Math.max(Number(existing.referral_points_awarded || 0), Number(row.referral_points_awarded || 0)),
      source: existing.source === "Cliente" || row.source === "Cliente" ? "Cliente" : (existing.source === "Afiliado" || row.source !== "Afiliado" ? existing.source : row.source),
    });
  });
  return Array.from(byKey.values());
}

function salesCustomerLookupValue(customer = {}) {
  const affiliateSameAsCustomer = normalizeInventoryLookup(customer.affiliate_name) && normalizeInventoryLookup(customer.affiliate_name) === normalizeInventoryLookup(customer.name);
  const refs = [
    customer.phone ? `Teléfono: ${customer.phone}` : "",
    customer.document_id ? `Cédula: ${customer.document_id}` : "",
    Number(customer.total_spent || 0) > 0 ? `Valor: ${money(customer.total_spent || 0)}` : "",
    customer.payment_method ? `Pago: ${customer.payment_method}` : "",
    customer.source ? `Origen: ${acquisitionSourceLabel(customer.source)}` : "",
    customer.product_or_service ? `Producto: ${customer.product_or_service}` : "",
    customer.branch_name ? `Sucursal: ${customer.branch_name}` : "",
    customer.event_date ? `Fecha: ${formatDate(customer.event_date)}` : "",
    customer.affiliate_name ? (affiliateSameAsCustomer ? "Afiliado: mismo cliente" : `Afiliado: ${customer.affiliate_name}`) : (customer.is_affiliate ? "Afiliado" : ""),
    Number(customer.referral_points_awarded || 0) > 0 ? `Puntos: ${Number(customer.referral_points_awarded || 0).toLocaleString("es-CO")}` : "",
    customer.email ? `Email: ${customer.email}` : "",
  ].filter(Boolean).join(" · ");
  return refs ? `${customer.name || "Cliente"} · ${refs}` : (customer.name || "");
}

function salesCustomerKey(customer = {}) {
  return salesCustomerIdentity(customer);
}

function salesCustomerSearchText(customer = {}) {
  return [
    salesCustomerLookupValue(customer),
    customer.name,
    customer.document_id,
    customer.phone,
    customer.email,
    customer.campaign_name,
    customer.product_or_service,
    customer.branch_name,
    customer.event_date,
    customer.event_date ? formatDate(customer.event_date) : "",
    customer.affiliate_name,
    customer.referral_points_awarded,
    customer.source,
    customer.is_affiliate ? "afiliado" : "",
  ].map(normalizeInventoryLookup).filter(Boolean).join(" ");
}

function filteredSalesCustomerRows(filter = customerAcquisitionCustomerLookupInput?.value || "") {
  const needle = normalizeInventoryLookup(filter);
  const rows = salesCustomerRows();
  if (!needle) return rows;
  return rows.filter((customer) => salesCustomerSearchText(customer).includes(needle));
}

function salesCustomerSelectLabel(customer = {}) {
  const flags = [
    customer.campaign_name || "",
  ].filter(Boolean).join(" · ");
  const customerLine = salesCustomerLookupValue(customer);
  return flags ? `${customerLine} · ${flags}` : customerLine;
}

function setSalesCustomerStatus(title, detail = "", tone = "neutral", icon = "person_add") {
  if (!customerAcquisitionCustomerStatus) return;
  customerAcquisitionCustomerStatus.classList.remove("is-success", "is-warning", "is-error");
  if (tone === "success") customerAcquisitionCustomerStatus.classList.add("is-success");
  if (tone === "warning") customerAcquisitionCustomerStatus.classList.add("is-warning");
  if (tone === "error") customerAcquisitionCustomerStatus.classList.add("is-error");
  customerAcquisitionCustomerStatus.innerHTML = `
    <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(icon)}</span>
    <div>
      <strong>${escapeHtml(title || "Cliente nuevo / manual")}</strong>
      <small>${escapeHtml(detail || "Completa los datos del cliente si no viene de la base CRM.")}</small>
    </div>
  `;
}

function renderSalesCustomerOptions() {
  const customers = salesCustomerRows();
  if (!customerAcquisitionCustomerSelect) return;
  const current = customerAcquisitionCustomerSelect.value;
  const filtered = filteredSalesCustomerRows();
  const isLoadingCustomers = !state.contactFeedLoaded || !state.leadCrmLoaded;
  const emptyLabel = isLoadingCustomers
    ? "Cargando clientes..."
    : (customers.length ? "Sin coincidencias para el filtro" : "Sin clientes registrados");
  customerAcquisitionCustomerSelect.innerHTML = [
    '<option value="">Cliente nuevo / manual</option>',
    ...(filtered.length
      ? filtered.map((customer) => `<option value="${escapeHtml(salesCustomerKey(customer))}">${escapeHtml(salesCustomerSelectLabel(customer))}</option>`)
      : [`<option value="" disabled>${escapeHtml(emptyLabel)}</option>`]),
  ].join("");
  if (current && filtered.some((customer) => salesCustomerKey(customer) === current)) {
    customerAcquisitionCustomerSelect.value = current;
  } else if (current) {
    customerAcquisitionCustomerSelect.value = "";
  }
}

function findSalesCustomerByKey(key) {
  const normalizedKey = normalizeInventoryLookup(key);
  if (!normalizedKey) return null;
  return salesCustomerRows().find((customer) => salesCustomerKey(customer) === normalizedKey) || null;
}

function findUniquePartialSalesCustomer(value) {
  const needle = normalizeInventoryLookup(value);
  if (!needle) return null;
  const matches = filteredSalesCustomerRows(needle);
  return matches.length === 1 ? matches[0] : null;
}

function syncSalesCustomerSelect(customer = {}) {
  if (!customerAcquisitionCustomerSelect || !customer) return;
  const key = salesCustomerKey(customer);
  renderSalesCustomerOptions();
  if (key) customerAcquisitionCustomerSelect.value = key;
}

function applySalesCustomer(customerOrValue) {
  const customer = typeof customerOrValue === "object" && customerOrValue
    ? customerOrValue
    : findSalesCustomer(customerOrValue);
  if (!customer) return false;
  if (customerAcquisitionCustomerLookupInput) customerAcquisitionCustomerLookupInput.value = salesCustomerLookupValue(customer);
  syncSalesCustomerSelect(customer);
  if (customerAcquisitionNameInput) customerAcquisitionNameInput.value = customer.name || "";
  if (customerAcquisitionDocumentInput) customerAcquisitionDocumentInput.value = customer.document_id || "";
  if (customerAcquisitionPhoneInput) customerAcquisitionPhoneInput.value = customer.phone || "";
  if (customerAcquisitionEmailInput) customerAcquisitionEmailInput.value = customer.email || "";
  if (customerAcquisitionCampaignInput && customer.campaign_id) {
    customerAcquisitionCampaignInput.value = customer.campaign_id;
  }
  const affiliate = syncCustomerAffiliateSelection(customer);
  if (affiliate) {
    setSalesCustomerStatus("Cliente afiliado detectado", `La venta sumara puntos a ${affiliate.full_name || "este afiliado"}.`, "success", "verified");
    setInlineMessage(customerAcquisitionMessage, `Cliente afiliado detectado: la venta sumara puntos a ${affiliate.full_name || "este afiliado"}.`, "info");
  } else {
    setSalesCustomerStatus("Cliente CRM seleccionado", "Datos cargados en el formulario. Esta venta no tiene afiliado asociado.", "success", "check_circle");
    setInlineMessage(customerAcquisitionMessage, "Cliente seleccionado. No tiene afiliado activo asociado, por eso esta venta no sumara puntos de afiliado.", "info");
  }
  return true;
}

function renderSalesCustomerMatchesHint() {
  if (!customerAcquisitionMessage) return;
  const search = customerAcquisitionCustomerLookupInput?.value || "";
  if (!search.trim()) {
    if (!customerAcquisitionCustomerSelect?.value) {
      setSalesCustomerStatus("Cliente nuevo / manual", "Completa los datos del cliente si no viene de la base CRM.", "neutral", "person_add");
    }
    return;
  }
  const matches = filteredSalesCustomerRows(search);
  if (matches.length > 1) {
    setSalesCustomerStatus(`${matches.length} coincidencias encontradas`, "Selecciona el contacto correcto en Coincidencia CRM.", "warning", "manage_search");
    setInlineMessage(customerAcquisitionMessage, `${matches.length} clientes coinciden. Selecciona el correcto en el desplegable "Cliente".`, "info");
  } else if (!matches.length) {
    setSalesCustomerStatus("Cliente nuevo / manual", "No hay coincidencias en CRM. Puedes registrar los datos manualmente.", "warning", "person_add");
    setInlineMessage(customerAcquisitionMessage, "No hay cliente existente con esa busqueda. Puedes registrarlo como cliente nuevo/manual.", "info");
  } else {
    setSalesCustomerStatus("Coincidencia lista", "Puedes confirmar el cliente o seguir escribiendo para acotar la busqueda.", "success", "person_search");
  }
}

function handleSalesCustomerSearchInput() {
  renderSalesCustomerOptions();
  renderSalesCustomerMatchesHint();
}

function handleSalesCustomerSearchCommit() {
  const value = customerAcquisitionCustomerLookupInput?.value || "";
  const exact = findSalesCustomer(value);
  const unique = exact || findUniquePartialSalesCustomer(value);
  if (unique) {
    applySalesCustomer(unique);
    return;
  }
  renderSalesCustomerOptions();
  renderSalesCustomerMatchesHint();
}

function handleSalesCustomerSelectChange() {
  const customer = findSalesCustomerByKey(customerAcquisitionCustomerSelect?.value || "");
  if (!customer) {
    const autoSelectedId = customerAcquisitionAffiliateInput?.dataset.autoSelectedAffiliateId || "";
    if (autoSelectedId && customerAcquisitionAffiliateInput?.value === autoSelectedId) {
      customerAcquisitionAffiliateInput.value = "";
      customerAcquisitionAffiliateInput.dataset.autoSelectedAffiliateId = "";
    }
    setSalesCustomerStatus("Cliente nuevo / manual", "Completa los datos del cliente si no viene de la base CRM.", "neutral", "person_add");
    return;
  }
  applySalesCustomer(customer);
}

function resolveCustomerBeforeSaleSubmit() {
  const lookup = String(customerAcquisitionCustomerLookupInput?.value || "").trim();
  const selectedKey = customerAcquisitionCustomerSelect?.value || "";
  if (selectedKey) {
    return Boolean(applySalesCustomer(findSalesCustomerByKey(selectedKey)));
  }
  if (!lookup) return true;
  const exact = findSalesCustomer(lookup);
  if (exact) return Boolean(applySalesCustomer(exact));
  const matches = filteredSalesCustomerRows(lookup);
  if (matches.length === 1) return Boolean(applySalesCustomer(matches[0]));
  if (matches.length > 1) {
    setInlineMessage(customerAcquisitionMessage, `Hay ${matches.length} clientes que coinciden con "${lookup}". Selecciona el cliente correcto o borra la busqueda para registrar uno nuevo.`, "error");
    customerAcquisitionCustomerSelect?.focus();
    return false;
  }
  return true;
}

function hasCustomerIdentityForSale() {
  return [
    customerAcquisitionNameInput?.value,
    customerAcquisitionDocumentInput?.value,
    customerAcquisitionPhoneInput?.value,
    customerAcquisitionEmailInput?.value,
  ].some((value) => String(value || "").trim());
}

function findSalesCustomer(value) {
  const needle = normalizeInventoryLookup(value);
  if (!needle) return null;
  return salesCustomerRows().find((customer) => {
    const candidates = [
      salesCustomerLookupValue(customer),
      customer.name,
      customer.document_id,
      customer.phone,
      customer.email,
    ].map(normalizeInventoryLookup);
    return candidates.includes(needle);
  }) || null;
}

function findAffiliateByCustomerFields(customer = {}) {
  const directId = normalizeInventoryLookup(customer.affiliate_id);
  const documentId = normalizeInventoryLookup(customer.document_id || customer.customer_document_id);
  const phone = normalizeInventoryLookup(customer.phone || customer.customer_phone);
  const email = normalizeInventoryLookup(customer.email || customer.customer_email);
  if (!directId && !documentId && !phone && !email) return null;
  return (state.affiliates || []).find((affiliate) => {
    if (affiliate.status === "INACTIVE" || affiliate.status === "DELETED") return false;
    if (directId && normalizeInventoryLookup(affiliate.id) === directId) return true;
    if (documentId && normalizeInventoryLookup(affiliate.document_id) === documentId) return true;
    if (phone && normalizeInventoryLookup(affiliate.phone) === phone) return true;
    if (email && normalizeInventoryLookup(affiliate.email) === email) return true;
    return false;
  }) || null;
}

function syncCustomerAffiliateSelection(customer = {}) {
  if (!customerAcquisitionAffiliateInput) return null;
  const autoSelectedId = customerAcquisitionAffiliateInput.dataset.autoSelectedAffiliateId || "";
  if (customerAcquisitionAffiliateInput.value && customerAcquisitionAffiliateInput.value !== autoSelectedId) return null;
  const affiliate = findAffiliateByCustomerFields(customer);
  if (!affiliate) {
    if (autoSelectedId && customerAcquisitionAffiliateInput.value === autoSelectedId) {
      customerAcquisitionAffiliateInput.value = "";
      customerAcquisitionAffiliateInput.dataset.autoSelectedAffiliateId = "";
    }
    return null;
  }
  customerAcquisitionAffiliateInput.value = affiliate.id;
  customerAcquisitionAffiliateInput.dataset.autoSelectedAffiliateId = affiliate.id;
  return affiliate;
}

function applySalesCustomerToForm(value) {
  return applySalesCustomer(value);
}

function defaultCustomerSaleItem() {
  return { name: "", quantity: 1, unit_price: 0, inventory_product_id: null, sku: null, barcode: null };
}

function ensureCustomerSaleItems() {
  if (!Array.isArray(state.customerSaleItems) || !state.customerSaleItems.length) {
    state.customerSaleItems = [defaultCustomerSaleItem()];
  }
  state.customerSaleItems = state.customerSaleItems.map((item) => ({
    ...defaultCustomerSaleItem(),
    ...item,
    quantity: Math.max(1, Number(item.quantity || 1)),
    unit_price: Math.max(0, Number(item.unit_price || 0)),
  }));
}

function customerSaleLineTotal(item = {}) {
  return Math.max(1, Number(item.quantity || 1)) * Math.max(0, Number(item.unit_price || 0));
}

function customerSaleTotal() {
  ensureCustomerSaleItems();
  return state.customerSaleItems.reduce((sum, item) => sum + customerSaleLineTotal(item), 0);
}

function syncCustomerSaleTotal() {
  const total = customerSaleTotal();
  if (customerAcquisitionAmountInput) customerAcquisitionAmountInput.value = total ? String(total) : "";
  if (customerSaleTotalPreview) customerSaleTotalPreview.textContent = money(total);
  return total;
}

function customerSaleProductsPayload() {
  ensureCustomerSaleItems();
  return state.customerSaleItems
    .map((item) => {
      const name = String(item.name || "").trim();
      const quantity = Math.max(1, Number(item.quantity || 1));
      const unitPrice = Math.max(0, Number(item.unit_price || 0));
      if (!name || unitPrice <= 0) return null;
      const product = item.inventory_product_id ? (state.inventoryProducts || []).find((candidate) => String(candidate.id) === String(item.inventory_product_id)) : findInventoryProduct(name);
      const payload = product ? productSalePayload(product, quantity, unitPrice) : {
        inventory_product_id: null,
        name,
        sku: item.sku || null,
        barcode: item.barcode || null,
        quantity,
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
      };
      return payload;
    })
    .filter(Boolean);
}

function customerSaleProductSummary(products = customerSaleProductsPayload()) {
  if (!products.length) return "";
  if (products.length === 1) return products[0].name;
  return `${products.length} productos`;
}

function updateCustomerSaleItem(index, field, value, options = {}) {
  ensureCustomerSaleItems();
  const item = state.customerSaleItems[index];
  if (!item) return;
  if (field === "product_select") {
    const product = findInventoryProduct(value);
    if (product) {
      item.inventory_product_id = product.id;
      item.name = product.name;
      item.sku = product.sku || null;
      item.barcode = product.barcode || null;
      if (!Number(item.unit_price || 0)) item.unit_price = Number(product.unit_price || 0);
      if (customerAcquisitionCurrencyInput && product.currency) customerAcquisitionCurrencyInput.value = product.currency;
    } else {
      item.inventory_product_id = null;
      item.sku = null;
      item.barcode = null;
      if (value !== OPEN_PRODUCT_VALUE) item.name = "";
    }
  }
  if (field === "name") {
    item.name = value;
    const product = options.matchProduct ? findInventoryProduct(value) : null;
    if (product) {
      item.inventory_product_id = product.id;
      item.name = product.name;
      item.sku = product.sku || null;
      item.barcode = product.barcode || null;
      if (!Number(item.unit_price || 0)) item.unit_price = Number(product.unit_price || 0);
      if (customerAcquisitionCurrencyInput && product.currency) customerAcquisitionCurrencyInput.value = product.currency;
    } else if (options.matchProduct) {
      item.inventory_product_id = null;
      item.sku = null;
      item.barcode = null;
    }
  }
  if (field === "quantity") item.quantity = Math.max(1, Number(value || 1));
  if (field === "unit_price") item.unit_price = Math.max(0, Number(value || 0));
  syncCustomerSaleTotal();
}

function renderCustomerSaleItems() {
  if (!customerSaleItemsContainer) return;
  ensureCustomerSaleItems();
  customerSaleItemsContainer.innerHTML = state.customerSaleItems.map((item, index) => {
    const productLabel = item.inventory_product_id ? "Inventario" : "Producto abierto";
    const selectedProductValue = item.inventory_product_id ? `inventory:${item.inventory_product_id}` : (item.name ? OPEN_PRODUCT_VALUE : "");
    return `
      <div class="sales-item-row" data-sale-item-index="${index}">
        <label class="sales-item-product">
          <span>Producto</span>
          <select data-sale-item-field="product_select" data-product-select>${inventoryProductSelectOptions(selectedProductValue, { placeholder: "Seleccionar producto" })}</select>
          <input class="open-product-input ${selectedProductValue === OPEN_PRODUCT_VALUE ? "" : "hidden"}" type="text" value="${escapeHtml(item.inventory_product_id ? "" : item.name || "")}" placeholder="Producto abierto o servicio" data-sale-item-field="name" data-open-product-input ${selectedProductValue === OPEN_PRODUCT_VALUE ? "" : "disabled"}>
        </label>
        <label class="sales-item-quantity">
          <span>Cant.</span>
          <input type="number" min="1" step="1" value="${escapeHtml(item.quantity || 1)}" data-sale-item-field="quantity">
        </label>
        <label class="sales-item-price">
          <span>Precio unitario</span>
          <input type="number" min="0" step="0.01" value="${escapeHtml(item.unit_price || 0)}" data-sale-item-field="unit_price">
        </label>
        <div class="sales-item-total">
          <span>${escapeHtml(productLabel)}</span>
          <strong>${escapeHtml(money(customerSaleLineTotal(item)))}</strong>
        </div>
        <button class="icon-button danger-button" type="button" data-sale-item-remove="${index}" aria-label="Quitar producto">&times;</button>
      </div>
    `;
  }).join("");
  customerSaleItemsContainer.querySelectorAll("[data-sale-item-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const row = input.closest("[data-sale-item-index]");
      updateCustomerSaleItem(Number(row?.dataset.saleItemIndex || 0), input.dataset.saleItemField, input.value);
    });
    input.addEventListener("change", () => {
      const row = input.closest("[data-sale-item-index]");
      updateCustomerSaleItem(Number(row?.dataset.saleItemIndex || 0), input.dataset.saleItemField, input.value, { matchProduct: input.dataset.saleItemField === "name" });
      renderCustomerSaleItems();
    });
  });
  customerSaleItemsContainer.querySelectorAll("[data-sale-item-remove]").forEach((button) => {
    button.disabled = state.customerSaleItems.length <= 1;
    button.addEventListener("click", () => {
      state.customerSaleItems.splice(Number(button.dataset.saleItemRemove || 0), 1);
      renderCustomerSaleItems();
    });
  });
  syncCustomerSaleTotal();
}

function saleSourceLabel(source) {
  if (source === "CONTACT_CENTER") return "Contacto convertido";
  if (source === "REDEMPTION") return "Redención";
  return source || "-";
}

function saleMetadata(item = {}) {
  if (!item.metadata) return {};
  if (typeof item.metadata === "object") return item.metadata;
  try {
    return JSON.parse(item.metadata);
  } catch {
    return {};
  }
}

function saleProductsForDisplay(item = {}) {
  const metadata = saleMetadata(item);
  return Array.isArray(metadata.products) ? metadata.products : [];
}

function saleProductSummary(item = {}) {
  const products = saleProductsForDisplay(item);
  if (!products.length) return escapeHtml(item.product_or_service || "-");
  const summary = products.map((product) => {
    const quantity = Number(product.quantity || 1);
    const lineTotal = Number(product.line_total || (Number(product.unit_price || 0) * quantity));
    return `${escapeHtml(product.name || "Producto")} <span class="table-secondary">x${quantity} · ${escapeHtml(money(lineTotal))}</span>`;
  }).join("<br>");
  const title = cleanCustomerValue(item.product_or_service);
  const firstProductName = cleanCustomerValue(products[0]?.name);
  const duplicatesSingleProduct = products.length === 1 && normalizeInventoryLookup(title) === normalizeInventoryLookup(firstProductName);
  const titleLooksLikeProductsList = products.length > 1 && products.every((product) => normalizeInventoryLookup(title).includes(normalizeInventoryLookup(`${product.name || ""} x${Number(product.quantity || 1)}`)));
  if (!title || duplicatesSingleProduct || titleLooksLikeProductsList) return summary;
  return `<strong>${escapeHtml(title || `${products.length} productos`)}</strong><br>${summary}`;
}

function saleAffiliateSummary(item = {}) {
  if (!item.referred_affiliate_id && !item.affiliate_name && !Number(item.referral_points_awarded || 0)) {
    return '<span class="table-secondary">Sin afiliado</span>';
  }
  const sameAsCustomer = normalizeInventoryLookup(item.affiliate_name) && normalizeInventoryLookup(item.affiliate_name) === normalizeInventoryLookup(item.player_name);
  const label = sameAsCustomer ? "Puntos asignados" : (item.affiliate_name || "Afiliado");
  return `
    <strong>${escapeHtml(label)}</strong>
    <br><span class="status-chip ok">${Number(item.referral_points_awarded || 0).toLocaleString("es-CO")} pts</span>
  `;
}

const LEAD_CAPTURE_FIELD_DEFS = [
  ["first_name", "Nombre", true, true],
  ["last_name", "Apellido", true, false],
  ["phone", "Telefono", true, true],
  ["email", "Correo", true, false],
  ["document_id", "Cedula / documento", true, false],
  ["city", "Ciudad", false, false],
  ["company", "Empresa", false, false],
  ["role", "Cargo", false, false],
  ["interest", "Interes principal", true, false],
  ["budget", "Presupuesto aproximado", false, false],
  ["source_detail", "Como nos conociste", true, false],
];

function renderLeadCaptureFields() {
  if (!leadCaptureFieldsGrid) return;
  leadCaptureFieldsGrid.innerHTML = LEAD_CAPTURE_FIELD_DEFS.map(([name, label, visible, required]) => `
    <label class="lead-capture-field-row">
      <span>${escapeHtml(label)}</span>
      <span><input data-lead-capture-visible="${escapeHtml(name)}" type="checkbox" ${visible ? "checked" : ""}> Visible</span>
      <span><input data-lead-capture-required="${escapeHtml(name)}" type="checkbox" ${required ? "checked" : ""}> Obligatorio</span>
    </label>
  `).join("");
}

function leadCaptureFormConfig() {
  return {
    consent_required: true,
    consent_text: leadCaptureConsentTextInput?.value.trim() || "Autorizo el tratamiento de mis datos personales para recibir informacion comercial relacionada con esta marca.",
    fields: LEAD_CAPTURE_FIELD_DEFS.map(([name, label]) => ({
      name,
      label,
      type: name === "email" ? "email" : name === "phone" ? "tel" : "text",
      visible: Boolean(document.querySelector(`[data-lead-capture-visible="${name}"]`)?.checked),
      required: Boolean(document.querySelector(`[data-lead-capture-required="${name}"]`)?.checked),
    })),
  };
}

function defaultLeadCaptureFormConfig() {
  return {
    consent_required: true,
    consent_text: "Autorizo el tratamiento de mis datos personales para recibir informacion comercial relacionada con esta marca.",
    fields: LEAD_CAPTURE_FIELD_DEFS.map(([name, label, visible, required]) => ({
      name,
      label,
      type: name === "email" ? "email" : name === "phone" ? "tel" : "text",
      visible,
      required,
    })),
  };
}

function readFileAsDataUrl(file, maxBytes, allowedTypes) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (file.size > maxBytes) return reject(new Error(`El archivo supera ${Math.round(maxBytes / 1024 / 1024)} MB.`));
    if (allowedTypes?.length && !allowedTypes.includes(file.type)) return reject(new Error("Tipo de archivo no permitido."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function digitalAssetLabel(asset = {}) {
  const type = String(asset.file_type || "").split("/").pop()?.toUpperCase() || "FILE";
  const sizeMb = Number(asset.file_size || 0) ? `${(Number(asset.file_size || 0) / 1024 / 1024).toFixed(1)} MB` : "";
  return [asset.title || "Activo digital", asset.category || "", type, sizeMb].filter(Boolean).join(" · ");
}

function leadCaptureForDigitalAsset(assetId) {
  if (!assetId) return null;
  return (state.leadCaptureActivations || []).find((activation) => (
    activation.asset?.id === assetId
      && activation.public_url
      && !["ENDED", "PAUSED"].includes(String(activation.status || "").toUpperCase())
  )) || null;
}

function digitalAssetShareUrl(assetId) {
  return leadCaptureForDigitalAsset(assetId)?.public_url || "";
}

async function loadDigitalAssets(options = {}) {
  if (state.digitalAssetsLoaded && !options.force) return;
  const data = await apiSafe("/api/business/digital-assets", { headers: authHeaders() }, { assets: [] });
  state.digitalAssets = data.assets || [];
  state.digitalAssetsLoaded = true;
}

function renderDigitalAssets() {
  if (!digitalAssetsGrid) return;
  const assets = state.digitalAssets || [];
  digitalAssetsGrid.innerHTML = assets.map((asset) => `
    <article class="digital-asset-card">
      ${asset.cover_image_data_url ? `<img src="${escapeHtml(asset.cover_image_data_url)}" alt="${escapeHtml(asset.title || "")}">` : '<span class="material-symbols-outlined">description</span>'}
      <div>
        <strong>${escapeHtml(asset.title || "Activo digital")}</strong>
        <p>${escapeHtml(asset.description || asset.file_name || "")}</p>
        <small>${escapeHtml(digitalAssetLabel(asset))}</small>
        ${digitalAssetShareUrl(asset.id) ? `
          <a class="digital-asset-share-link" href="${escapeHtml(digitalAssetShareUrl(asset.id))}" target="_blank" rel="noopener">${escapeHtml(digitalAssetShareUrl(asset.id))}</a>
        ` : '<small class="digital-asset-share-note">Sin link publico todavía. Crea uno para compartirlo sin perder la captura del lead.</small>'}
      </div>
      <div class="activation-row-actions">
        <button class="ghost-button" type="button" data-use-digital-asset="${escapeHtml(asset.id)}">Usar en Ticket Relámpago</button>
        ${digitalAssetShareUrl(asset.id)
          ? `<button class="ghost-button" type="button" data-copy-digital-asset-link="${escapeHtml(digitalAssetShareUrl(asset.id))}">Copiar link</button>`
          : `<button class="ghost-button" type="button" data-create-digital-asset-link="${escapeHtml(asset.id)}">Crear link para compartir</button>`}
        <button class="ghost-button" type="button" data-disable-digital-asset="${escapeHtml(asset.id)}">Desactivar</button>
      </div>
    </article>
  `).join("") || '<div class="empty-state compact">Aún no hay activos digitales. Carga aquí el catálogo, portafolio o brochure antes de crear un Ticket Relámpago.</div>';
  digitalAssetsGrid.querySelectorAll("[data-copy-digital-asset-link]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(button.dataset.copyDigitalAssetLink || "");
      showFeedback("Link publico del activo copiado.", "success", { title: "Activo digital" });
    });
  });
  digitalAssetsGrid.querySelectorAll("[data-create-digital-asset-link]").forEach((button) => {
    button.addEventListener("click", () => createShareLinkForDigitalAsset(button.dataset.createDigitalAssetLink));
  });
  digitalAssetsGrid.querySelectorAll("[data-use-digital-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      setView("strategic-qr");
      if (leadCaptureAssetSelect) leadCaptureAssetSelect.value = button.dataset.useDigitalAsset || "";
      renderLeadCaptureAssetPreview();
      leadCaptureForm?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  digitalAssetsGrid.querySelectorAll("[data-disable-digital-asset]").forEach((button) => {
    button.addEventListener("click", () => updateDigitalAssetStatus(button.dataset.disableDigitalAsset, false));
  });
}

async function createShareLinkForDigitalAsset(assetId) {
  const asset = (state.digitalAssets || []).find((item) => item.id === assetId);
  if (!asset) return;
  try {
    showFeedback("Creando link publico de Captura Relampago.", "loading", { title: "Activo digital", timeout: 0 });
    const result = await api("/api/business/lead-capture-activations", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        name: `Link para ${asset.title || "activo digital"}`.slice(0, 160),
        description: asset.description || `Entrega publica de ${asset.title || "activo digital"}.`,
        channel: "link_compartido",
        status: "ACTIVE",
        form_config: defaultLeadCaptureFormConfig(),
        public_message: {
          title: asset.title || "Activo digital",
          subtitle: String(asset.description || "Deja tus datos para descargar este material.").slice(0, 240),
          success_message: "Listo. Ya puedes descargar tu activo digital.",
        },
        asset_id: asset.id,
      }),
    });
    state.leadCaptureLoaded = false;
    await loadLeadCaptureActivations({ force: true });
    renderDigitalAssets();
    renderLeadCaptureTable();
    const link = result.activation?.public_url || digitalAssetShareUrl(asset.id);
    if (link) {
      await navigator.clipboard?.writeText(link);
      showFeedback("Link publico creado y copiado. Ya puedes compartirlo.", "success", { title: "Activo digital", timeout: 7000 });
      setInlineMessage(digitalAssetMessage, `Link listo para compartir: ${link}`, "success");
    }
  } catch (error) {
    showFeedback(error.message || "No se pudo crear el link del activo.", "error", { title: "Activo digital" });
  }
}

function renderLeadCaptureAssetOptions() {
  if (!leadCaptureAssetSelect) return;
  const current = leadCaptureAssetSelect.value;
  const assets = state.digitalAssets || [];
  leadCaptureAssetSelect.innerHTML = [
    '<option value="">Selecciona un activo digital de la cuenta</option>',
    ...assets.map((asset) => `<option value="${escapeHtml(asset.id)}">${escapeHtml(digitalAssetLabel(asset))}</option>`),
  ].join("");
  if (current && assets.some((asset) => asset.id === current)) {
    leadCaptureAssetSelect.value = current;
  }
  renderLeadCaptureAssetPreview();
}

function selectedLeadCaptureAsset() {
  const id = leadCaptureAssetSelect?.value || "";
  return (state.digitalAssets || []).find((asset) => asset.id === id) || null;
}

function renderLeadCaptureAssetPreview() {
  if (!leadCaptureAssetPreview) return;
  const asset = selectedLeadCaptureAsset();
  if (!asset) {
    leadCaptureAssetPreview.innerHTML = '<div class="empty-state compact">Selecciona el activo que el vendedor entregará al visitante físico.</div>';
    return;
  }
  if (leadCaptureAssetCategoryInput) leadCaptureAssetCategoryInput.value = asset.category || "catalogo";
  if (leadCaptureButtonTextInput && !leadCaptureButtonTextInput.value.trim()) {
    leadCaptureButtonTextInput.value = asset.download_button_text || "Descargar ahora";
  }
  leadCaptureAssetPreview.innerHTML = `
    <article class="digital-asset-selected">
      ${asset.cover_image_data_url ? `<img src="${escapeHtml(asset.cover_image_data_url)}" alt="${escapeHtml(asset.title || "")}">` : '<span class="material-symbols-outlined">description</span>'}
      <div>
        <strong>${escapeHtml(asset.title || "Activo digital")}</strong>
        <p>${escapeHtml(asset.description || "Activo listo para entregar al lead.")}</p>
        <small>${escapeHtml(asset.file_name || "")} · ${escapeHtml(asset.file_type || "")}</small>
      </div>
    </article>
  `;
}

async function submitDigitalAsset(event) {
  event.preventDefault();
  try {
    if (!digitalAssetFileInput?.files?.[0]) throw new Error("Sube el archivo digital para guardarlo en la cuenta.");
    setInlineMessage(digitalAssetMessage, "Guardando activo digital...", "info");
    if (digitalAssetSubmitButton) digitalAssetSubmitButton.disabled = true;
    const assetFile = digitalAssetFileInput.files[0];
    const coverFile = digitalAssetCoverInput?.files?.[0] || null;
    const result = await api("/api/business/digital-assets", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        title: digitalAssetTitleInput?.value.trim(),
        description: digitalAssetDescriptionInput?.value.trim() || null,
        category: digitalAssetCategoryInput?.value.trim() || "catalogo",
        file_name: assetFile.name,
        file_data_url: await readFileAsDataUrl(assetFile, 5 * 1024 * 1024, ["application/pdf", "image/png", "image/jpeg", "image/webp"]),
        cover_image_data_url: coverFile ? await readFileAsDataUrl(coverFile, 2 * 1024 * 1024, ["image/png", "image/jpeg", "image/webp"]) : null,
        download_button_text: digitalAssetButtonTextInput?.value.trim() || "Descargar ahora",
      }),
    });
    digitalAssetForm?.reset();
    if (digitalAssetCategoryInput) digitalAssetCategoryInput.value = "catalogo";
    if (digitalAssetButtonTextInput) digitalAssetButtonTextInput.value = "Descargar ahora";
    await loadDigitalAssets({ force: true });
    renderDigitalAssets();
    renderLeadCaptureAssetOptions();
    const savedAsset = result.asset || (state.digitalAssets || [])[0] || null;
    setInlineMessage(digitalAssetMessage, savedAsset?.id
      ? "Activo guardado. Usa Crear link para compartir si necesitas enviar este material por WhatsApp o correo."
      : "Activo guardado. Ya puedes usarlo en un Ticket Relámpago.", "success");
  } catch (error) {
    setInlineMessage(digitalAssetMessage, error.message, "error");
  } finally {
    if (digitalAssetSubmitButton) digitalAssetSubmitButton.disabled = false;
  }
}

async function updateDigitalAssetStatus(assetId, isActive) {
  if (!assetId) return;
  await api(`/api/business/digital-assets/${encodeURIComponent(assetId)}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ is_active: Boolean(isActive) }),
  });
  await loadDigitalAssets({ force: true });
  renderDigitalAssets();
  renderLeadCaptureAssetOptions();
  showFeedback("Biblioteca de activos actualizada.", "success");
}

async function loadLeadCaptureActivations(options = {}) {
  if (state.leadCaptureLoaded && !options.force) return;
  const data = await apiSafe("/api/business/lead-capture-activations?limit=80", { headers: authHeaders() }, { activations: [] });
  state.leadCaptureActivations = data.activations || [];
  state.leadCaptureLoaded = true;
}

function renderLeadCaptureTable() {
  if (!leadCaptureTable) return;
  const rows = state.leadCaptureActivations || [];
  leadCaptureTable.innerHTML = rows.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.name)}</strong>
        <br><span class="table-secondary">${escapeHtml(item.channel || "-")} · ${escapeHtml(item.public_code || "-")}</span>
      </td>
      <td>${escapeHtml(item.asset?.title || "-")}<br><span class="table-secondary">${escapeHtml(item.asset?.file_name || "-")}</span></td>
      <td>
        ${Number(item.metrics?.leads_captured || 0)} leads · ${Number(item.metrics?.downloads || 0)} descargas
        <br><span class="table-secondary">${Number(item.metrics?.visits || 0)} visitas · ${Number(item.metrics?.conversion_rate || 0)}% conv.</span>
      </td>
      <td>
        <span class="status-chip ${item.status === "ACTIVE" ? "ok" : item.status === "PAUSED" ? "pending" : "danger"}">${escapeHtml(item.status)}</span>
        <br><span class="table-secondary">${escapeHtml(item.public_url)}</span>
      </td>
      <td>
        <div class="activation-row-actions">
          <button class="ghost-button" type="button" data-copy-lead-capture="${escapeHtml(item.public_url)}">Copiar link</button>
          <button class="ghost-button" type="button" data-download-lead-capture-qr="${escapeHtml(item.id)}">Descargar QR</button>
          <button class="ghost-button" type="button" data-open-lead-capture="${escapeHtml(item.id)}">Ver leads</button>
          <button class="ghost-button" type="button" data-export-lead-capture="${escapeHtml(item.id)}">Exportar</button>
        </div>
      </td>
    </tr>
  `).join("") || '<tr><td colspan="5">Aun no hay capturas relampago creadas.</td></tr>';
  leadCaptureTable.querySelectorAll("[data-copy-lead-capture]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(button.dataset.copyLeadCapture || "");
      showFeedback("Link de Captura Relampago copiado.", "success");
    });
  });
  leadCaptureTable.querySelectorAll("[data-download-lead-capture-qr]").forEach((button) => {
    button.addEventListener("click", () => downloadLeadCaptureQr(button.dataset.downloadLeadCaptureQr));
  });
  leadCaptureTable.querySelectorAll("[data-open-lead-capture]").forEach((button) => {
    button.addEventListener("click", () => openLeadCaptureDetail(button.dataset.openLeadCapture));
  });
  leadCaptureTable.querySelectorAll("[data-export-lead-capture]").forEach((button) => {
    button.addEventListener("click", () => exportLeadCapture(button.dataset.exportLeadCapture));
  });
}

async function submitLeadCapture(event) {
  event.preventDefault();
  try {
    const selectedAsset = selectedLeadCaptureAsset();
    if (!selectedAsset) throw new Error("Selecciona el activo digital que recibira el visitante.");
    leadCaptureSubmitButton.disabled = true;
    setInlineMessage(leadCaptureMessage, "Creando Captura Relampago y generando QR...", "info");
    const payload = {
      name: leadCaptureNameInput.value.trim(),
      description: leadCaptureDescriptionInput?.value.trim() || null,
      campaign_id: leadCaptureCampaignInput?.value || null,
      channel: leadCaptureChannelInput?.value || "tienda_fisica",
      status: leadCaptureStatusInput?.value || "ACTIVE",
      starts_at: leadCaptureStartsInput?.value ? new Date(leadCaptureStartsInput.value).toISOString() : null,
      expires_at: leadCaptureExpiresInput?.value ? new Date(leadCaptureExpiresInput.value).toISOString() : null,
      form_config: leadCaptureFormConfig(),
      public_message: {
        title: leadCaptureAssetTitleInput.value.trim() || selectedAsset.title || leadCaptureNameInput.value.trim(),
        subtitle: "Entrega un activo digital a cambio de los datos del cliente.",
      },
      asset_id: selectedAsset.id,
    };
    const result = await api("/api/business/lead-capture-activations", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    state.leadCaptureLoaded = false;
    await loadLeadCaptureActivations({ force: true });
    renderLeadCaptureTable();
    leadCaptureResult.innerHTML = `
      <div class="qr-result">
        <strong>Captura Relampago creada</strong>
        <p>${escapeHtml(result.activation.public_url)}</p>
        ${result.qr_image_data_url ? `<img class="qr-preview" src="${escapeHtml(result.qr_image_data_url)}" alt="QR Captura Relampago">` : ""}
        <div class="activation-row-actions">
          <button class="ghost-button" id="leadCaptureCopyResultButton" type="button">Copiar link</button>
          <button class="ghost-button" id="leadCaptureDownloadQrResultButton" type="button">Descargar QR</button>
        </div>
      </div>
    `;
    document.getElementById("leadCaptureCopyResultButton")?.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(result.activation.public_url);
      showFeedback("Link copiado.", "success");
    });
    document.getElementById("leadCaptureDownloadQrResultButton")?.addEventListener("click", () => {
      downloadDataUrl(`captura-relampago-${result.activation.public_code}.png`, result.qr_image_data_url);
    });
    setInlineMessage(leadCaptureMessage, "Captura lista para mostrador, vitrina, feria o stand.", "success");
  } catch (error) {
    setInlineMessage(leadCaptureMessage, error.message, "error");
  } finally {
    leadCaptureSubmitButton.disabled = false;
  }
}

async function downloadLeadCaptureQr(id) {
  const item = (state.leadCaptureActivations || []).find((activation) => activation.id === id);
  if (!item?.public_url) return;
  const data = await api(`/api/business/lead-capture-activations/${encodeURIComponent(id)}`, { headers: authHeaders() });
  if (data.qr_image_data_url) {
    downloadDataUrl(`captura-relampago-${item.public_code || id}.png`, data.qr_image_data_url);
    return;
  }
  await navigator.clipboard?.writeText(item.public_url);
  showFeedback("No se pudo generar el QR; copie el link para imprimirlo.", "info");
}

async function openLeadCaptureDetail(id) {
  const data = await api(`/api/business/lead-capture-activations/${encodeURIComponent(id)}`, { headers: authHeaders() });
  state.selectedLeadCaptureId = id;
  state.selectedLeadCaptureDetail = data;
  if (!leadCaptureDetail) return;
  const metrics = data.metrics || {};
  leadCaptureDetail.innerHTML = `
    <div class="lead-capture-metrics">
      ${[
        ["Visitas", metrics.visits],
        ["Leads capturados", metrics.leads_captured],
        ["Descargas", metrics.downloads],
        ["Conversion", `${metrics.conversion_rate || 0}%`],
        ["Con email", metrics.with_email],
        ["Con telefono", metrics.with_phone],
      ].map(([label, value]) => `<article class="kpi-card"><span class="mono-label">${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 0)}</strong></article>`).join("")}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Lead</th><th>Contacto</th><th>Fecha</th><th>Consentimiento</th><th>Descargas</th><th>Acciones</th></tr></thead>
        <tbody>
          ${(data.leads || []).map((lead) => `
            <tr>
              <td>${escapeHtml(lead.name || lead.form_data?.first_name || "-")}<br><span class="table-secondary">${escapeHtml(lead.document_id || lead.form_data?.document_id || "-")}</span></td>
              <td>${escapeHtml(lead.phone || lead.form_data?.phone || "-")}<br><span class="table-secondary">${escapeHtml(lead.email || lead.form_data?.email || "-")}</span></td>
              <td>${formatDate(lead.created_at)}</td>
              <td>${lead.consent_accepted ? "Si" : "No"}</td>
              <td>${Number(lead.download_count || 0)}</td>
              <td><button class="ghost-button" type="button" data-open-crm-lead="${escapeHtml(lead.lead_id || "")}">Ver lead</button></td>
            </tr>
          `).join("") || '<tr><td colspan="6">Sin leads capturados todavia.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
  leadCaptureDetail.querySelectorAll("[data-open-crm-lead]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!button.dataset.openCrmLead) return;
      setView("leads");
      openLeadDetail({ id: button.dataset.openCrmLead, source_type: "PLAYER" });
    });
  });
}

async function exportLeadCapture(id) {
  const response = await fetch(`/api/business/lead-capture-activations/${encodeURIComponent(id)}/export.csv`, { headers: authHeaders() });
  if (!response.ok) throw new Error("No se pudo exportar Captura Relampago.");
  const blob = await response.blob();
  triggerBlobDownload(blob, `captura-relampago-${id}.csv`);
}

function renderTicketStatusBoard(tickets = state.strategicQrHistory || []) {
  if (!ticketStatusBoard) return;
  const rows = Array.isArray(tickets) ? tickets : [];
  const groups = [
    {
      key: "active",
      title: "Activos sin redimir",
      meta: "Tickets vigentes listos para enviar o recordar",
      rows: rows.filter(isActiveTicket),
      tone: "ok",
    },
    {
      key: "expired",
      title: "Expirados",
      meta: "Vencieron sin redencion registrada",
      rows: rows.filter(isExpiredTicket),
      tone: "danger",
    },
    {
      key: "inactive",
      title: "No activos",
      meta: "Sin reclamar, cancelados o en estado no usable",
      rows: rows.filter(isInactiveTicket),
      tone: "pending",
    },
    {
      key: "redeemed",
      title: "Redimidos",
      meta: "Ya usados o validados en el punto",
      rows: rows.filter(isRedeemedTicket),
      tone: "pending",
    },
  ];
  ticketStatusBoard.innerHTML = groups.map((group) => `
    <article class="ticket-status-card is-${escapeHtml(group.key)}">
      <div class="ticket-status-head">
        <span class="mono-label">${escapeHtml(group.title)}</span>
        <strong>${group.rows.length.toLocaleString("es-CO")}</strong>
        <small>${escapeHtml(group.meta)}</small>
      </div>
      <div class="ticket-status-list">
        ${group.rows.slice(0, 8).map((item) => {
          const person = item.player_name || item.player_phone || "Sin cliente";
          const benefit = item.benefit_value?.label || item.benefit_type || item.origin_type || "Ticket";
          return `
            <div class="ticket-status-row">
              <button class="ticket-status-main" type="button" data-open-ticket-row="${escapeHtml(item.id)}">
                <span>
                  <strong>${escapeHtml(person)}</strong>
                  <small>${escapeHtml(benefit)} | ${escapeHtml(formatDate(item.created_at))}</small>
                </span>
                <span class="status-chip ${escapeHtml(group.tone)}">${escapeHtml(ticketStatusLabel(item))}</span>
              </button>
              ${group.key === "active" ? `
                <div class="ticket-status-actions">
                  <button class="ghost-button" type="button" data-ticket-status-send="${escapeHtml(item.id)}">Enviar ticket</button>
                  <button class="ghost-button" type="button" data-ticket-status-whatsapp="${escapeHtml(item.id)}" data-lead-phone="${escapeHtml(item.player_phone || "")}" data-lead-name="${escapeHtml(item.player_name || "")}">Recordar WhatsApp</button>
                </div>
              ` : ""}
            </div>
          `;
        }).join("") || '<div class="empty-state compact">Sin tickets en este estado.</div>'}
      </div>
    </article>
  `).join("");
  ticketStatusBoard.querySelectorAll("[data-open-ticket-row]").forEach((button) => {
    button.addEventListener("click", () => downloadStrategicQr(button.dataset.openTicketRow));
  });
  ticketStatusBoard.querySelectorAll("[data-ticket-status-send]").forEach((button) => {
    button.addEventListener("click", () => downloadStrategicQr(button.dataset.ticketStatusSend));
  });
  ticketStatusBoard.querySelectorAll("[data-ticket-status-whatsapp]").forEach((button) => {
    button.addEventListener("click", () => shareLeadQrWhatsApp(button.dataset.ticketStatusWhatsapp, button.dataset.leadPhone, button.dataset.leadName));
  });
}

function renderStrategicQrView() {
  renderCampaignAssociationInputs();
  renderLeadCaptureFields();
  if (!state.digitalAssetsLoaded) {
    loadDigitalAssets({ force: true }).then(() => {
      renderLeadCaptureAssetOptions();
      renderDigitalAssets();
    });
  } else {
    renderLeadCaptureAssetOptions();
  }
  if (!state.leadCaptureLoaded) {
    loadLeadCaptureActivations({ force: true }).then(() => {
      renderLeadCaptureTable();
    });
  } else {
    renderLeadCaptureTable();
  }
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
    strategicMetricCard("Tickets genericos", String(metrics.post_sale_generated || 0)),
    strategicMetricCard("Genericos redimidos", String(metrics.post_sale_redeemed || 0)),
    strategicMetricCard("Tasa de redención", `${Number((metrics.repurchase_rate || 0) * 100).toFixed(1)}%`),
    strategicMetricCard("Tickets activación", String(metrics.trivia_generated || 0), "highlight"),
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
          ${benefitProductScopeLabel(item.benefit_value || {}, item.metadata || {}) ? `<br><span class="table-secondary">${escapeHtml(benefitProductScopeLabel(item.benefit_value || {}, item.metadata || {}))}</span>` : ""}
          ${benefitFulfillmentLabel(item.benefit_value || {}, item.metadata || {}) ? `<br><span class="table-secondary">${escapeHtml(benefitFulfillmentLabel(item.benefit_value || {}, item.metadata || {}))}</span>` : ""}
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

  renderTicketStatusBoard(state.strategicQrHistory || []);
  strategicQrHistoryTable.innerHTML = (state.strategicQrHistory || []).length
    ? state.strategicQrHistory.map((item) => `
      <tr>
        <td>${escapeHtml(item.origin_type)}</td>
        <td>
          ${escapeHtml(item.benefit_value?.label || item.benefit_type || "-")}
          ${benefitProductScopeLabel(item.benefit_value || {}, item.metadata || {}) ? `<br><span class="table-secondary">${escapeHtml(benefitProductScopeLabel(item.benefit_value || {}, item.metadata || {}))}</span>` : ""}
        </td>
        <td>
          <span class="status-chip ${ticketStatusClass(item)}">${escapeHtml(ticketStatusLabel(item))}</span>
          <br><span class="table-secondary">${escapeHtml(item.expires_at ? `Vence ${formatDate(item.expires_at)}` : item.status || "-")}</span>
        </td>
        <td>
          ${escapeHtml(item.player_name || "-")}
          <br><span class="table-secondary">${escapeHtml(item.player_phone || item.player_email || "-")}</span>
        </td>
        <td>
          ${escapeHtml(formatDate(item.created_at))}
          <div class="activation-row-actions">
            <button class="ghost-button" type="button" data-download-strategic-qr="${escapeHtml(item.id)}">Enviar ticket</button>
            ${isActiveTicket(item) ? `<button class="ghost-button" type="button" data-share-strategic-qr-wa="${escapeHtml(item.id)}" data-lead-phone="${escapeHtml(item.player_phone || "")}" data-lead-name="${escapeHtml(item.player_name || "")}">Recordar WhatsApp</button>` : ""}
          </div>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">No hay tickets estratégicos generados.</td></tr>';

  strategicQrHistoryTable.querySelectorAll("[data-download-strategic-qr]").forEach((button) => {
    button.addEventListener("click", () => downloadStrategicQr(button.dataset.downloadStrategicQr));
  });
  strategicQrHistoryTable.querySelectorAll("[data-share-strategic-qr-wa]").forEach((button) => {
    button.addEventListener("click", () => shareLeadQrWhatsApp(button.dataset.shareStrategicQrWa, button.dataset.leadPhone, button.dataset.leadName));
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
    : '<tr><td colspan="4">Aún no hay compras de recarga.</td></tr>';
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
  setInlineMessage(qrCreditCheckoutMessage, "Creando checkout digital en Mercado Pago: tarjetas, saldo y PSE cuando este disponible. Sin efectivo ni Efecty.", "info");
  showFeedback("Creando preferencia de pago digital. En segundos se abrira Mercado Pago.", "loading", { title: "Preparando pago", timeout: 0 });
  try {
    const data = await api("/api/payments/qr-credits/checkout", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ package_code: packageCode }),
    });
    const checkoutUrl = data.order?.checkout_url || data.order?.sandbox_checkout_url;
    if (!checkoutUrl) {
      throw new Error("Mercado Pago no devolvió un link de checkout.");
    }
    setInlineMessage(qrCreditCheckoutMessage, "Checkout creado. Redirigiendo a Mercado Pago...", "success");
    showFeedback("Checkout creado. Al aprobarse el pago, el saldo de tickets se recargará automáticamente.", "success", { title: "Pago listo" });
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
  setInlineMessage(subscriptionRenewalMessage, "Creando checkout digital de mensualidad: tarjetas, saldo y PSE cuando este disponible. Sin efectivo ni Efecty.", "info");
  showFeedback("Preparando pago digital de renovación mensual en Mercado Pago.", "loading", { title: "Renovando plan", timeout: 0 });
  try {
    const data = await api("/api/payments/subscriptions/checkout", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ plan_code: planCode }),
    });
    const checkoutUrl = data.order?.checkout_url || data.order?.sandbox_checkout_url;
    if (!checkoutUrl) {
      throw new Error("Mercado Pago no devolvió un link de checkout.");
    }
    setInlineMessage(subscriptionRenewalMessage, "Checkout creado. Redirigiendo a Mercado Pago...", "success");
    showFeedback("Al aprobarse el pago, la mensualidad se renovara automáticamente.", "success", { title: "Pago listo" });
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

  setButtonLoading(subscriptionAutoRenewButton, true, "Abriendo autorización...");
  setInlineMessage(subscriptionRenewalMessage, "Te llevaremos a Mercado Pago para inscribir la tarjeta. Puede aparecer una validación temporal; el plan se cobra desde la fecha programada.", "info");
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
      throw new Error("Mercado Pago no devolvió un link para autorizar el cobro automatico.");
    }
    const firstCharge = data.auto_renewal?.first_charge_at ? formatDateOnly(data.auto_renewal.first_charge_at) : "la próxima renovación";
    setInlineMessage(subscriptionRenewalMessage, `Autorización creada. Mercado Pago puede validar la tarjeta temporalmente. Primer cobro real programado para ${firstCharge}.`, "success");
    showFeedback(`Inscribe la tarjeta en Mercado Pago. Primer cobro real: ${firstCharge}.`, "success", { title: "Autorización lista" });
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
  if (!resolveCustomerBeforeSaleSubmit()) return;
  if (!hasCustomerIdentityForSale()) {
    setInlineMessage(customerAcquisitionMessage, "Identifica el cliente antes de registrar la venta: selecciona uno existente o escribe nombre, telefono, correo o cedula.", "error");
    customerAcquisitionNameInput?.focus();
    return;
  }
  const products = customerSaleProductsPayload();
  const saleTotal = products.reduce((sum, product) => sum + Number(product.line_total || 0), 0);
  if (!products.length || saleTotal <= 0) {
    setInlineMessage(customerAcquisitionMessage, "Agrega al menos un producto con precio para registrar la venta.", "error");
    return;
  }
  const matchedAffiliate = syncCustomerAffiliateSelection({
    document_id: customerAcquisitionDocumentInput.value.trim(),
    phone: customerAcquisitionPhoneInput.value.trim(),
    email: customerAcquisitionEmailInput.value.trim(),
  });
  const productSummary = customerSaleProductSummary(products);
  const metadata = {
    products,
    sale_entry: "sales_module",
    customer_lookup: customerAcquisitionCustomerLookupInput?.value?.trim() || null,
    affiliate_match_source: matchedAffiliate ? "customer_identity_frontend" : null,
  };
  setButtonLoading(submitButton, true, "Registrando...");
  setSalesCustomerStatus("Registrando venta", "Estamos guardando cliente, productos y atribucion comercial.", "success", "sync");
  setInlineMessage(customerAcquisitionMessage, "Registrando venta real y medio de llegada...", "info");
  try {
    const data = await api("/api/business/customer-acquisition-sales", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        sale_amount: saleTotal,
        campaign_id: customerAcquisitionCampaignInput?.value || null,
        currency: customerAcquisitionCurrencyInput.value.trim() || "COP",
        product_name: productSummary || null,
        customer_name: customerAcquisitionNameInput.value.trim() || null,
        customer_document_id: customerAcquisitionDocumentInput.value.trim() || null,
        customer_phone: customerAcquisitionPhoneInput.value.trim() || null,
        customer_email: customerAcquisitionEmailInput.value.trim() || null,
        acquisition_source: customerAcquisitionSourceInput.value,
        acquisition_channel: customerAcquisitionChannelInput.value.trim() || null,
        referred_affiliate_id: customerAcquisitionAffiliateInput.value || null,
        notes: customerAcquisitionNotesInput.value.trim() || null,
        metadata,
      }),
    });
    const awarded = Number(data.referral?.points_awarded || 0);
    const message = awarded
      ? `Venta registrada. ${data.referral.affiliate_name} recibio ${awarded} puntos por recomendación.`
      : "Venta registrada con su medio de llegada.";
    setInlineMessage(customerAcquisitionMessage, message, "success");
    customerAcquisitionForm.reset();
    if (customerAcquisitionAffiliateInput) customerAcquisitionAffiliateInput.dataset.autoSelectedAffiliateId = "";
    customerAcquisitionCurrencyInput.value = "COP";
    setSalesCustomerStatus("Cliente nuevo / manual", "Formulario listo para registrar otra venta.", "success", "task_alt");
    state.customerSaleItems = [defaultCustomerSaleItem()];
    renderCustomerAcquisitionCampaignOptions();
    renderCustomerSaleItems();
    await loadInventoryProducts({ force: true, quiet: true });
    renderInventoryProductOptions();
    await Promise.all([
      loadContactFeedData({ force: true, quiet: true }),
      loadLeadCrmData({ force: true, quiet: true }),
    ]);
    renderSalesCustomerOptions();
    await refreshLiveBusinessData();
    setView("sales");
    showFeedback(message, "success", { title: "Venta registrada" });
  } catch (error) {
    setSalesCustomerStatus("No se pudo registrar", error.message, "error", "error");
    setInlineMessage(customerAcquisitionMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo registrar" });
  } finally {
    setButtonLoading(submitButton, false);
  }
}

function normalizeInventoryLookup(value) {
  return String(value || "").trim().toLowerCase();
}

const OPEN_PRODUCT_VALUE = "__OPEN_PRODUCT__";

function productSalePayload(product, quantity = 1, unitPrice = null) {
  if (!product) return null;
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const safeUnitPrice = Math.max(0, Number(unitPrice ?? product.unit_price ?? 0));
  return {
    inventory_product_id: product.id,
    name: product.name,
    sku: product.sku || null,
    barcode: product.barcode || null,
    quantity: safeQuantity,
    unit_price: safeUnitPrice,
    line_total: safeQuantity * safeUnitPrice,
  };
}

function activeInventoryProducts() {
  return (state.inventoryProducts || []).filter((item) => item.status !== "ARCHIVED");
}

function inventoryProductSelectValue(product = {}) {
  return product?.id ? `inventory:${product.id}` : "";
}

function findInventoryProductById(productId) {
  if (!productId) return null;
  return (state.inventoryProducts || []).find((product) => String(product.id) === String(productId)) || null;
}

function findInventoryProduct(value) {
  const raw = String(value || "").trim();
  if (raw.startsWith("inventory:")) {
    return findInventoryProductById(raw.slice("inventory:".length));
  }
  const needle = normalizeInventoryLookup(raw);
  if (!needle) return null;
  return (state.inventoryProducts || []).find((product) => {
    const candidates = [product.name, product.sku, product.barcode].map(normalizeInventoryLookup);
    return candidates.includes(needle);
  }) || null;
}

function inventoryProductLabel(product = {}) {
  const refs = [product.sku, product.barcode].filter(Boolean).join(" / ");
  return refs ? `${product.name} - ${refs}` : product.name;
}

function productOpenInputFor(productInput) {
  if (!productInput) return null;
  const openInputId = productInput.dataset?.openProductInput;
  if (openInputId) return document.getElementById(openInputId);
  const row = productInput.closest?.("[data-sale-item-index], [data-affiliate-purchase-row], label");
  return row?.querySelector?.("[data-open-product-input]") || null;
}

function productInputRawValue(productInput) {
  if (!productInput) return "";
  if (productInput.value === OPEN_PRODUCT_VALUE) {
    return String(productOpenInputFor(productInput)?.value || "").trim();
  }
  const product = findInventoryProduct(productInput.value);
  return String(product?.name || productInput.value || "").trim();
}

function productSelectSelectionForValue(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw === OPEN_PRODUCT_VALUE || raw.startsWith("inventory:")) return raw;
  const product = findInventoryProduct(raw);
  return product ? inventoryProductSelectValue(product) : OPEN_PRODUCT_VALUE;
}

function inventoryProductSelectOptions(selectedValue = "", options = {}) {
  const selected = String(selectedValue || "");
  const placeholder = options.placeholder || "Sin producto especifico";
  const openLabel = options.openLabel || "Producto abierto / no esta en inventario";
  const option = (value, label) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
  return [
    option("", placeholder),
    ...activeInventoryProducts().map((product) => {
      const stock = product.stock_quantity !== undefined && product.stock_quantity !== null ? ` · stock ${Number(product.stock_quantity || 0).toLocaleString("es-CO")}` : "";
      return option(inventoryProductSelectValue(product), `${inventoryProductLabel(product)} · ${money(product.unit_price || 0)}${stock}`);
    }),
    option(OPEN_PRODUCT_VALUE, openLabel),
  ].join("");
}

function syncProductOpenInput(productInput) {
  const openInput = productOpenInputFor(productInput);
  if (!openInput) return;
  const isOpen = productInput?.value === OPEN_PRODUCT_VALUE;
  openInput.classList.toggle("hidden", !isOpen);
  openInput.disabled = !isOpen || Boolean(productInput?.disabled);
  openInput.required = Boolean(isOpen && productInput?.required);
}

function setProductInputValue(productInput, value = "") {
  if (!productInput) return;
  const raw = String(value || "").trim();
  const openInput = productOpenInputFor(productInput);
  const selected = productSelectSelectionForValue(raw);
  if (productInput.tagName === "SELECT" && !Array.from(productInput.options || []).some((option) => option.value === selected)) {
    productInput.innerHTML = inventoryProductSelectOptions(selected, {
      placeholder: productInput.dataset.placeholder || "Sin producto especifico",
      openLabel: productInput.dataset.openLabel || "Producto abierto / no esta en inventario",
    });
  }
  productInput.value = selected;
  if (openInput) {
    openInput.value = selected === OPEN_PRODUCT_VALUE ? raw : "";
  }
  syncProductOpenInput(productInput);
}

function renderProductSelect(productInput) {
  if (!productInput) return;
  const openInput = productOpenInputFor(productInput);
  const currentRaw = productInputRawValue(productInput) || openInput?.value || "";
  const selected = productSelectSelectionForValue(productInput.value || currentRaw);
  if (selected === OPEN_PRODUCT_VALUE && openInput && currentRaw) openInput.value = currentRaw;
  productInput.innerHTML = inventoryProductSelectOptions(selected, {
    placeholder: productInput.dataset.placeholder || "Sin producto especifico",
    openLabel: productInput.dataset.openLabel || "Producto abierto / no esta en inventario",
  });
  productInput.value = selected;
  syncProductOpenInput(productInput);
}

function renderInventoryProductOptions() {
  document.querySelectorAll("[data-product-select]").forEach((select) => renderProductSelect(select));
}

async function loadInventoryProducts(options = {}) {
  if (state.inventoryLoaded && !options.force) return state.inventoryProducts;
  if (!options.quiet && inventoryTable) {
    inventoryTable.innerHTML = '<tr><td colspan="7">Cargando inventario...</td></tr>';
  }
  const data = await apiSafe("/api/business/inventory/products?limit=500", { headers: authHeaders() }, { products: [] });
  state.inventoryProducts = Array.isArray(data.products) ? data.products : [];
  state.inventoryLoaded = true;
  renderInventoryProductOptions();
  return state.inventoryProducts;
}

function filteredInventoryProducts() {
  const needle = normalizeInventoryLookup(state.inventorySearch);
  const products = state.inventoryProducts || [];
  if (!needle) return products;
  return products.filter((product) => [product.name, product.sku, product.barcode, product.category, product.brand]
    .some((value) => normalizeInventoryLookup(value).includes(needle)));
}

function inventoryKpis(products = state.inventoryProducts || []) {
  const active = products.filter((item) => item.status === "ACTIVE");
  const stockUnits = active.reduce((sum, item) => sum + Number(item.stock_quantity || 0), 0);
  const inventoryValue = active.reduce((sum, item) => sum + (Number(item.stock_quantity || 0) * Number(item.unit_price || 0)), 0);
  const lowStock = active.filter((item) => Number(item.stock_quantity || 0) <= Number(item.min_stock_quantity || 0)).length;
  return [
    { label: "Productos activos", value: active.length.toLocaleString("es-CO"), meta: "Disponibles para venta" },
    { label: "Unidades en stock", value: stockUnits.toLocaleString("es-CO"), meta: "Suma del inventario" },
    { label: "Valor venta inventario", value: money(inventoryValue), meta: "Stock x precio venta" },
    { label: "Stock bajo", value: lowStock.toLocaleString("es-CO"), meta: "Requieren reposicion" },
  ];
}

function renderInventoryView() {
  if (inventoryKpiGrid) {
    inventoryKpiGrid.innerHTML = inventoryKpis().map((item) => `
      <article class="surface-card kpi-card">
        <span class="mono-label">${escapeHtml(item.label)}</span>
        <strong class="kpi-value">${escapeHtml(item.value)}</strong>
        <p class="kpi-meta">${escapeHtml(item.meta)}</p>
      </article>
    `).join("");
  }
  if (!inventoryTable) return;
  if (!state.inventoryLoaded) {
    inventoryTable.innerHTML = '<tr><td colspan="7">Cargando inventario...</td></tr>';
    return;
  }
  const rows = filteredInventoryProducts();
  if (!rows.length) {
    inventoryTable.innerHTML = '<tr><td colspan="7">Sin productos registrados. Puedes vender productos abiertos desde Sales o Afiliados.</td></tr>';
    return;
  }
  inventoryTable.innerHTML = rows.map((product) => {
    const stock = Number(product.stock_quantity || 0);
    const minStock = Number(product.min_stock_quantity || 0);
    const isLow = product.status === "ACTIVE" && stock <= minStock;
    return `
      <tr>
        <td>
          <strong>${escapeHtml(product.name)}</strong>
          <span class="table-secondary">${escapeHtml(product.brand || product.description || "Producto de inventario")}</span>
        </td>
        <td>
          <span>${escapeHtml(product.barcode || "-")}</span>
          <span class="table-secondary">${escapeHtml(product.sku || "Sin SKU")}</span>
        </td>
        <td>${escapeHtml(product.category || "-")}</td>
        <td>${escapeHtml(money(product.unit_price || 0))}</td>
        <td>
          <strong class="${isLow ? "stock-low" : ""}">${escapeHtml(stock.toLocaleString("es-CO"))} ${escapeHtml(product.unit_label || "unidad")}</strong>
          <span class="table-secondary">Min. ${escapeHtml(String(minStock))}</span>
        </td>
        <td><span class="status-pill ${product.status === "ACTIVE" ? "success" : "muted"}">${escapeHtml(product.status || "ACTIVE")}</span></td>
        <td>
          <div class="table-actions">
            <button class="ghost-button" type="button" data-inventory-edit="${escapeHtml(product.id)}">Editar</button>
            <button class="ghost-button danger-button" type="button" data-inventory-archive="${escapeHtml(product.id)}">Archivar</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
  inventoryTable.querySelectorAll("[data-inventory-edit]").forEach((button) => {
    button.addEventListener("click", () => editInventoryProduct(button.dataset.inventoryEdit));
  });
  inventoryTable.querySelectorAll("[data-inventory-archive]").forEach((button) => {
    button.addEventListener("click", () => archiveInventoryProduct(button.dataset.inventoryArchive));
  });
}

function resetInventoryForm() {
  inventoryProductForm?.reset();
  if (inventoryProductIdInput) inventoryProductIdInput.value = "";
  if (inventoryCurrencyInput) inventoryCurrencyInput.value = "COP";
  if (inventoryStockInput) inventoryStockInput.value = "0";
  if (inventoryMinStockInput) inventoryMinStockInput.value = "0";
  if (inventoryUnitLabelInput) inventoryUnitLabelInput.value = "unidad";
  if (inventoryStatusInput) inventoryStatusInput.value = "ACTIVE";
  if (inventoryFormTitle) inventoryFormTitle.textContent = "Nuevo producto";
  setInlineMessage(inventoryMessage, "", "info");
}

function editInventoryProduct(productId) {
  const product = (state.inventoryProducts || []).find((item) => item.id === productId);
  if (!product) return;
  if (inventoryProductIdInput) inventoryProductIdInput.value = product.id;
  if (inventoryNameInput) inventoryNameInput.value = product.name || "";
  if (inventoryBarcodeInput) inventoryBarcodeInput.value = product.barcode || "";
  if (inventorySkuInput) inventorySkuInput.value = product.sku || "";
  if (inventoryCategoryInput) inventoryCategoryInput.value = product.category || "";
  if (inventoryBrandInput) inventoryBrandInput.value = product.brand || "";
  if (inventoryUnitPriceInput) inventoryUnitPriceInput.value = String(product.unit_price || 0);
  if (inventoryCostPriceInput) inventoryCostPriceInput.value = product.cost_price === null || product.cost_price === undefined ? "" : String(product.cost_price || 0);
  if (inventoryCurrencyInput) inventoryCurrencyInput.value = product.currency || "COP";
  if (inventoryStockInput) inventoryStockInput.value = String(product.stock_quantity || 0);
  if (inventoryMinStockInput) inventoryMinStockInput.value = String(product.min_stock_quantity || 0);
  if (inventoryUnitLabelInput) inventoryUnitLabelInput.value = product.unit_label || "unidad";
  if (inventoryStatusInput) inventoryStatusInput.value = product.status || "ACTIVE";
  if (inventoryDescriptionInput) inventoryDescriptionInput.value = product.description || "";
  if (inventoryFormTitle) inventoryFormTitle.textContent = "Editar producto";
  setInlineMessage(inventoryMessage, "Editando producto existente.", "info");
}

function inventoryFormPayload() {
  return {
    name: inventoryNameInput?.value.trim() || "",
    barcode: inventoryBarcodeInput?.value.trim() || null,
    sku: inventorySkuInput?.value.trim() || null,
    category: inventoryCategoryInput?.value.trim() || null,
    brand: inventoryBrandInput?.value.trim() || null,
    unit_price: Number(inventoryUnitPriceInput?.value || 0),
    cost_price: inventoryCostPriceInput?.value === "" ? null : Number(inventoryCostPriceInput?.value || 0),
    currency: inventoryCurrencyInput?.value.trim() || "COP",
    stock_quantity: Number(inventoryStockInput?.value || 0),
    min_stock_quantity: Number(inventoryMinStockInput?.value || 0),
    unit_label: inventoryUnitLabelInput?.value.trim() || "unidad",
    status: inventoryStatusInput?.value || "ACTIVE",
    description: inventoryDescriptionInput?.value.trim() || null,
  };
}

async function submitInventoryProduct(event) {
  event.preventDefault();
  const productId = inventoryProductIdInput?.value || "";
  const payload = inventoryFormPayload();
  if (!payload.name || payload.unit_price < 0) {
    setInlineMessage(inventoryMessage, "Completa nombre y precio de venta.", "error");
    return;
  }
  setButtonLoading(inventorySaveButton, true, productId ? "Actualizando..." : "Guardando...");
  setInlineMessage(inventoryMessage, "Guardando producto en inventario...", "info");
  try {
    const data = await api(productId ? `/api/business/inventory/products/${productId}` : "/api/business/inventory/products", {
      method: productId ? "PATCH" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const saved = data.product;
    state.inventoryProducts = [
      saved,
      ...(state.inventoryProducts || []).filter((item) => item.id !== saved.id),
    ];
    state.inventoryLoaded = true;
    resetInventoryForm();
    renderInventoryProductOptions();
    renderInventoryView();
    setInlineMessage(inventoryMessage, "Producto guardado correctamente.", "success");
    showFeedback("Producto guardado en inventario.", "success", { title: "Inventario" });
  } catch (error) {
    setInlineMessage(inventoryMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo guardar" });
  } finally {
    setButtonLoading(inventorySaveButton, false);
  }
}

async function archiveInventoryProduct(productId) {
  const product = (state.inventoryProducts || []).find((item) => item.id === productId);
  if (!product) return;
  if (!window.confirm(`Archivar ${product.name}? Seguirá disponible historicamente, pero no como producto activo.`)) return;
  try {
    await api(`/api/business/inventory/products/${productId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    state.inventoryProducts = (state.inventoryProducts || []).map((item) => (
      item.id === productId ? { ...item, status: "ARCHIVED" } : item
    ));
    renderInventoryProductOptions();
    renderInventoryView();
    showFeedback("Producto archivado.", "success", { title: "Inventario" });
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo archivar" });
  }
}

function applyInventoryProductToSaleInput(productInput, amountInput, currencyInput = null) {
  syncProductOpenInput(productInput);
  const product = findInventoryProduct(productInput?.value || "");
  if (!product) return null;
  if (amountInput && Number(amountInput.value || 0) <= 0) {
    amountInput.value = String(Number(product.unit_price || 0));
  }
  if (currencyInput && !currencyInput.value) {
    currencyInput.value = product.currency || "COP";
  }
  return product;
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
    THERMOMETER: "Termómetro",
    DISCOUNT_THERMOMETER: "Termómetro",
    PRODUCT_VOTE: "Votación de producto",
    QUICK_VOTE: "Votación de producto",
    STYLE_SELECTOR: "Selector de estilo",
    GIFT_CURATOR: "Curador de regalo",
    NEED_DIAGNOSTIC: "Diagnóstico de necesidad",
    PREMIUM_NEED_DIAGNOSTIC: "Diagnóstico de necesidad",
    WAITLIST: "Lista de espera",
    REWARD_RESERVATION: "Reserva con Reward Pass",
    EXPERIENCE_RESERVATION: "Reserva de experiencia",
    SEALED_LETTER: "Carta sellada",
    PRIVATE_INVITATION: "Invitación privada",
    SCRATCH_DIGITAL: "Raspa digital",
    SCRATCH_WIN: "Raspa digital",
    TAP_REVEAL: "Toca y revela",
    SPACE_SHOOTER: "Marcianitos",
    BREAKOUT: "Breakout",
    SNAKE: "Culebrita",
    CATCH_PRIZE: "Atrapa el premio",
    MEMORY_PAIRS: "Memoria de pares",
    FAST_TAP: "Tap rápido",
    MINI_MAZE: "Mini laberinto",
    WHACK_A_MOLE: "Golpea el topo",
    DODGE_RUNNER: "Runner esquiva",
    BALLOON_POP: "Revienta globos",
    ROULETTE_SPIN: "Ruleta",
    TOUCH_CATCH: "Touch atrápalo",
    TRUE_FALSE: "Falso/Verdadero",
    ORDER_OPTIONS: "Orden correcto",
    CONNECTORS: "Conectores",
    BATTLESHIP_COORDS: "Batalla naval",
  }[type] || "Activación";
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
    WHACK_A_MOLE: "minigame",
    DODGE_RUNNER: "minigame",
    BALLOON_POP: "minigame",
    ROULETTE_SPIN: "minigame",
    TOUCH_CATCH: "minigame",
    TRUE_FALSE: "minigame",
    ORDER_OPTIONS: "minigame",
    CONNECTORS: "minigame",
    BATTLESHIP_COORDS: "minigame",
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
  renderMinigameSpecificConfig(nextType);
  if (triviaBenefitLabelInput) {
    const zoneBasedBenefit = nextType === "SCRATCH_DIGITAL";
    triviaBenefitLabelInput.required = !zoneBasedBenefit;
    triviaBenefitLabelInput.placeholder = zoneBasedBenefit
      ? "Opcional: se usaran los beneficios de cada zona"
      : "Beneficio desbloqueado por participar";
  }
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
      : `${activationTypeLabel(nextType)} activa. El participante recibe QR al completar la dinámica.`;
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
  const productScope = benefitProductScope(triviaBenefitProductModeInput, triviaBenefitProductInput);
  const fulfillment = benefitFulfillmentFromInputs(triviaBenefitFulfillmentModeInput, triviaEcommerceCodeInput, triviaEcommerceUrlInput, triviaEcommerceInstructionsInput);
  return Array.from(document.querySelectorAll("[data-reveal-card]"))
    .map((input) => ({
      label: input.dataset.revealCard || "Card",
      benefit_label: input.value.trim(),
      benefit_type: triviaBenefitTypeInput?.value || "CUSTOM",
      benefit_value: withBenefitFulfillment(withBenefitProductScope(parseJsonObject(triviaBenefitValueInput?.value || "{}"), productScope), fulfillment),
    }))
    .filter((item) => item.benefit_label);
}

function collectThermometerDiscounts() {
  return splitOptionList(thermometerDiscountsInput?.value)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 100);
}

function collectFlatChoiceOptions(type) {
  const productScope = benefitProductScope(triviaBenefitProductModeInput, triviaBenefitProductInput);
  const fulfillment = benefitFulfillmentFromInputs(triviaBenefitFulfillmentModeInput, triviaEcommerceCodeInput, triviaEcommerceUrlInput, triviaEcommerceInstructionsInput);
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
        reward_label: type === "SCRATCH_DIGITAL" ? input.value.trim() : triviaBenefitLabelInput.value.trim(),
        reward_value: type === "SCRATCH_DIGITAL"
          ? withBenefitFulfillment(withBenefitProductScope({ ...parseJsonObject(triviaBenefitValueInput.value), label: input.value.trim(), scratch_slot: key }, productScope), fulfillment)
          : withBenefitFulfillment(withBenefitProductScope(parseJsonObject(triviaBenefitValueInput.value), productScope), fulfillment),
      };
    })
    .filter((item) => item.label);
}

function collectRouletteBenefits() {
  const productScope = benefitProductScope(triviaBenefitProductModeInput, triviaBenefitProductInput);
  const fulfillment = benefitFulfillmentFromInputs(triviaBenefitFulfillmentModeInput, triviaEcommerceCodeInput, triviaEcommerceUrlInput, triviaEcommerceInstructionsInput);
  return Array.from(document.querySelectorAll("[data-roulette-benefit]"))
    .map((input, index) => {
      const label = input.value.trim();
      const value = `ROULETTE_${index + 1}`;
      return {
        value,
        label,
        reward_type: triviaBenefitTypeInput.value,
        reward_label: label,
        reward_value: withBenefitFulfillment(withBenefitProductScope(parseJsonObject(triviaBenefitValueInput.value), productScope), fulfillment),
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
    showFeedback("Imagen de opción cargada.", "success", { title: "Votación de producto" });
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
  return presets[key] || ["Opción A", "Opción B", "Opción C"];
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
  return ["SPACE_SHOOTER", "BREAKOUT", "SNAKE", "CATCH_PRIZE", "MEMORY_PAIRS", "FAST_TAP", "MINI_MAZE", "WHACK_A_MOLE", "DODGE_RUNNER", "BALLOON_POP", "ROULETTE_SPIN", "TOUCH_CATCH", "TRUE_FALSE", "ORDER_OPTIONS", "CONNECTORS", "BATTLESHIP_COORDS"].includes(type);
}

const MINIGAME_SPECIFIC_CONFIG = {
  SPACE_SHOOTER: {
    title: "Marcianitos",
    summary: "Dinámica: moverse lateralmente, disparar automaticamente y sobrevivir a enemigos que bajan y disparan.",
    help: "Recomendado para ferias y pantallas touch: duración corta, enemigos frecuentes y score minimo alcanzable.",
    fields: [
      { key: "enemy_spawn_ms", label: "Cada cuánto aparece enemigo (ms)", type: "number", min: 250, max: 1200, value: 480 },
      { key: "enemy_base_speed", label: "Velocidad base enemigos", type: "number", min: 40, max: 180, value: 70 },
      { key: "enemy_fire_chance", label: "% enemigos que disparan", type: "number", min: 0, max: 100, value: 55 },
      { key: "player_speed", label: "Velocidad de nave", type: "number", min: 160, max: 520, value: 280 },
    ],
  },
  BREAKOUT: {
    title: "Breakout",
    summary: "Dinámica: mover la barra, sostener la bola y romper bloques para acumular puntos.",
    help: "Sube filas/columnas para partidas más largas; baja ancho de barra para más dificultad.",
    fields: [
      { key: "brick_rows", label: "Filas de bloques", type: "number", min: 2, max: 6, value: 4 },
      { key: "brick_cols", label: "Columnas de bloques", type: "number", min: 5, max: 12, value: 9 },
      { key: "ball_speed", label: "Velocidad de bola", type: "number", min: 150, max: 420, value: 250 },
      { key: "paddle_width", label: "Ancho de barra", type: "number", min: 70, max: 170, value: 108 },
    ],
  },
  SNAKE: {
    title: "Culebrita",
    summary: "Dinámica: dirigir la serpiente, comer premios y evitar paredes o el propio cuerpo.",
    help: "El intervalo menor hace el juego más rápido. Ajusta el tablero según la habilidad del público.",
    fields: [
      { key: "board_cols", label: "Columnas del tablero", type: "number", min: 14, max: 30, value: 24 },
      { key: "board_rows", label: "Filas del tablero", type: "number", min: 9, max: 18, value: 13 },
      { key: "move_interval_ms", label: "Paso de movimiento (ms)", type: "number", min: 90, max: 260, value: 130 },
      { key: "growth_per_food", label: "Crecimiento por premio", type: "number", min: 1, max: 3, value: 1 },
    ],
  },
  CATCH_PRIZE: {
    title: "Atrapa el premio",
    summary: "Dinámica: mover la canasta, atrapar premios buenos, sostener combos y evitar bombas.",
    help: "Muy útil para retail: los textos del beneficio van en el ticket; aquí calibras ritmo y riesgo.",
    fields: [
      { key: "lane_count", label: "Carriles de caída", type: "number", min: 4, max: 9, value: 7 },
      { key: "bad_item_rate", label: "% penalizadores", type: "number", min: 10, max: 70, value: 34 },
      { key: "bonus_item_rate", label: "% bonus especiales", type: "number", min: 0, max: 45, value: 22 },
      { key: "drop_base_speed", label: "Velocidad base caída", type: "number", min: 80, max: 260, value: 118 },
    ],
  },
  MEMORY_PAIRS: {
    title: "Memoria de pares",
    summary: "Dinámica: encontrar pares ocultos. Los errores quitan vidas y los aciertos suman score.",
    help: "Usa símbolos cortos o iniciales de categorías de producto para que el juego sea rápido.",
    fields: [
      { key: "pair_count", label: "Cantidad de pares", type: "number", min: 3, max: 8, value: 6 },
      { key: "mismatch_reveal_ms", label: "Tiempo para ocultar error (ms)", type: "number", min: 350, max: 1500, value: 650 },
      { key: "memory_symbols", label: "Símbolos separados por coma", type: "text", value: "A,B,C,D,E,F,G,H" },
    ],
  },
  FAST_TAP: {
    title: "Tap rápido",
    summary: "Dinámica: tocar objetivos antes de que desaparezcan. Cada fallo o expiración penaliza.",
    help: "Para público masivo usa objetivos grandes y TTL mayor; para reto competitivo, TTL menor.",
    fields: [
      { key: "target_ttl_ms", label: "Vida del objetivo (ms)", type: "number", min: 450, max: 1800, value: 1050 },
      { key: "target_min_size", label: "Tamaño mínimo objetivo", type: "number", min: 12, max: 32, value: 18 },
      { key: "target_max_size", label: "Tamaño máximo objetivo", type: "number", min: 20, max: 48, value: 32 },
    ],
  },
  MINI_MAZE: {
    title: "Mini laberinto",
    summary: "Dinámica: llevar el punto a la meta sin tocar paredes. Llegar a meta suma fuerte.",
    help: "La dificultad cambia grosor/espacio del laberinto. Usa fácil para celulares pequeños.",
    fields: [
      { key: "maze_difficulty", label: "Dificultad", type: "select", value: "medium", options: [["easy", "Fácil"], ["medium", "Media"], ["hard", "Difícil"]] },
      { key: "player_speed", label: "Velocidad del punto", type: "number", min: 100, max: 280, value: 180 },
      { key: "goal_points_multiplier", label: "Multiplicador al llegar", type: "number", min: 1, max: 6, value: 3 },
    ],
  },
  WHACK_A_MOLE: {
    title: "Golpea el topo",
    summary: "Dinámica: tocar solo objetivos buenos antes de que se escondan y evitar falsos objetivos.",
    help: "Más huecos y TTL bajo elevan dificultad. El porcentaje falso controla trampas.",
    fields: [
      { key: "hole_rows", label: "Filas de huecos", type: "number", min: 2, max: 4, value: 3 },
      { key: "hole_cols", label: "Columnas de huecos", type: "number", min: 2, max: 4, value: 3 },
      { key: "bad_target_rate", label: "% objetivos falsos", type: "number", min: 0, max: 45, value: 18 },
      { key: "target_ttl_ms", label: "Tiempo visible objetivo (ms)", type: "number", min: 450, max: 1600, value: 950 },
    ],
  },
  DODGE_RUNNER: {
    title: "Runner esquiva",
    summary: "Dinámica: moverse por la pantalla, recoger beneficios y esquivar obstáculos.",
    help: "Aumenta penalizadores y velocidad para retos de habilidad; baja spawn para niños o filas rápidas.",
    fields: [
      { key: "bad_item_rate", label: "% obstáculos", type: "number", min: 10, max: 70, value: 28 },
      { key: "runner_spawn_ms", label: "Frecuencia objetos (ms)", type: "number", min: 180, max: 900, value: 580 },
      { key: "runner_item_speed", label: "Velocidad de objetos", type: "number", min: 90, max: 340, value: 150 },
      { key: "player_speed", label: "Velocidad jugador", type: "number", min: 160, max: 520, value: 300 },
    ],
  },
  BALLOON_POP: {
    title: "Revienta globos",
    summary: "Dinámica: tocar globos buenos, evitar globos penalizados y sostener racha.",
    help: "Funciona bien para activaciones táctiles porque cualquier usuario entiende el objetivo en segundos.",
    fields: [
      { key: "bad_balloon_rate", label: "% globos penalizados", type: "number", min: 0, max: 45, value: 16 },
      { key: "balloon_spawn_ms", label: "Frecuencia globos (ms)", type: "number", min: 160, max: 900, value: 460 },
      { key: "balloon_speed", label: "Velocidad subida", type: "number", min: 60, max: 240, value: 95 },
      { key: "streak_bonus", label: "Bonus máximo por racha", type: "number", min: 0, max: 30, value: 24 },
    ],
  },
  TOUCH_CATCH: {
    title: "Touch atrápalo",
    summary: "Dinámica: perseguir un objetivo móvil antes de que escape.",
    help: "Sube velocidad y baja TTL para hacerlo competitivo. El bonus rate crea objetivos 2x.",
    fields: [
      { key: "target_ttl_ms", label: "Tiempo para atraparlo (ms)", type: "number", min: 650, max: 2200, value: 1350 },
      { key: "target_speed", label: "Velocidad objetivo", type: "number", min: 60, max: 360, value: 150 },
      { key: "bonus_target_rate", label: "% objetivos 2x", type: "number", min: 0, max: 45, value: 22 },
    ],
  },
  TRUE_FALSE: {
    title: "Falso o verdadero",
    summary: "Dinámica: leer una afirmación y tocar FALSO o VERDADERO antes de que venza.",
    help: "Escribe una afirmación por línea usando: texto | verdadero o texto | falso.",
    fields: [
      { key: "prompt_time_ms", label: "Tiempo por afirmación (ms)", type: "number", min: 1800, max: 7000, value: 3600 },
      { key: "true_false_prompts", label: "Afirmaciones", type: "textarea", rows: 5, value: "Un QR redimido puede medirse contra ventas | verdadero\nMas intentos siempre significan mas revenue | falso\nCapturar telefono ayuda a controlar duplicados | verdadero\nUn beneficio vencido debe validarse igual | falso" },
    ],
  },
  ORDER_OPTIONS: {
    title: "Orden correcto",
    summary: "Dinámica: tocar opciones en el orden correcto para completar una secuencia.",
    help: "Escribe una secuencia por línea separando pasos con >. Ejemplo: Entrada > Plato fuerte > Postre.",
    fields: [
      { key: "order_sequences", label: "Secuencias posibles", type: "textarea", rows: 5, value: "Entrada > Plato fuerte > Postre > Cafe\nEscanear > Jugar > Recibir QR > Redimir\nProspecto > Lead > Cliente > Referido" },
    ],
  },
  CONNECTORS: {
    title: "Conectores",
    summary: "Dinámica: seleccionar un elemento izquierdo y luego su pareja correcta a la derecha.",
    help: "Escribe una pareja por línea usando =. Ejemplo: QR = Redención.",
    fields: [
      { key: "connector_pairs", label: "Pares correctos", type: "textarea", rows: 5, value: "QR = Redencion\nLead = Contacto\nTicket = Beneficio\nVenta = Revenue" },
    ],
  },
  BATTLESHIP_COORDS: {
    title: "Batalla naval",
    summary: "Dinámica: elegir coordenadas, encontrar barcos contiguos y hundir toda la flota.",
    help: "Máximo 3 barcos. Cada agujero equivale a una casilla contigua que debe ser impactada.",
    fields: [
      { key: "grid_size", label: "Tamaño de grilla", type: "number", min: 5, max: 8, value: 6 },
      { key: "ship_count", label: "Barcos a hundir", type: "number", min: 1, max: 3, value: 3 },
      { key: "ship_1", label: "Agujeros barco 1", type: "number", min: 1, max: 5, value: 3 },
      { key: "ship_2", label: "Agujeros barco 2", type: "number", min: 1, max: 5, value: 2 },
      { key: "ship_3", label: "Agujeros barco 3", type: "number", min: 1, max: 5, value: 2 },
    ],
  },
};

function minigameInstructionForType(type) {
  return {
    SPACE_SHOOTER: "Arrastra el dedo a izquierda o derecha. La nave no salta al touch, se mueve lateralmente, recibe dano y dispara con cadencia controlada.",
    BREAKOUT: "Rompe tantos bloques como puedas antes de que termine el tiempo.",
    SNAKE: "Captura elementos, evita errores y supera el score mínimo.",
    CATCH_PRIZE: "Mueve la canasta, arma combos, atrapa bonus especiales y evita bombas. Hay iman, escudo, tiempo extra y dificultad progresiva.",
    MEMORY_PAIRS: "Encuentra pares y gana puntos por rapidez.",
    FAST_TAP: "Toca los objetivos correctos tan rápido como puedas.",
    MINI_MAZE: "Avanza hacia la meta sin tocar zonas de penalizacion.",
    WHACK_A_MOLE: "Toca solo los objetivos activos antes de que se escondan y evita penalizaciones.",
    DODGE_RUNNER: "Mueve al corredor, recoge beneficios y esquiva obstaculos hasta terminar el tiempo.",
    BALLOON_POP: "Revienta globos de valor, encadena aciertos y evita globos penalizados.",
    ROULETTE_SPIN: "Gira la ruleta, detenla en una zona de beneficio y acumula el score requerido.",
    TOUCH_CATCH: "Toca y atrapa objetivos móviles antes de que escapen.",
    TRUE_FALSE: "Elige falso o verdadero rapidamente y encadena respuestas correctas.",
    ORDER_OPTIONS: "Toca las opciones en el orden correcto para completar el menú o secuencia.",
    CONNECTORS: "Conecta cada elemento de la izquierda con su par correcto de la derecha.",
    BATTLESHIP_COORDS: "Selecciona coordenadas, detecta barcos contiguos y hunde toda la flota para recibir tu beneficio.",
  }[type] || "Completa la partida y supera el score mínimo para recibir QR.";
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function renderMinigameSpecificConfig(type) {
  if (!minigameSpecificConfigPanel) return;
  const definition = MINIGAME_SPECIFIC_CONFIG[type];
  if (!definition) {
    minigameSpecificConfigPanel.innerHTML = "";
    if (minigameSpecificTitle) minigameSpecificTitle.textContent = "Dinámica del juego";
    if (minigameSpecificSummary) minigameSpecificSummary.textContent = "Ajusta los datos que definen cómo se juega y qué debe lograr el participante.";
    if (minigameSpecificHelp) minigameSpecificHelp.textContent = "Estos campos se guardan en la activación y controlan la lógica del juego público.";
    return;
  }
  if (minigameSpecificTitle) minigameSpecificTitle.textContent = definition.title;
  if (minigameSpecificSummary) minigameSpecificSummary.textContent = definition.summary;
  if (minigameSpecificHelp) minigameSpecificHelp.textContent = definition.help;
  minigameSpecificConfigPanel.innerHTML = definition.fields.map((field) => {
    const common = `data-minigame-config="${escapeHtml(field.key)}"`;
    if (field.type === "textarea") {
      return `<label class="full"><span>${escapeHtml(field.label)}</span><textarea ${common} rows="${Number(field.rows || 4)}">${escapeHtml(field.value || "")}</textarea></label>`;
    }
    if (field.type === "select") {
      return `<label><span>${escapeHtml(field.label)}</span><select ${common}>${(field.options || []).map(([value, label]) => `<option value="${escapeHtml(value)}" ${String(value) === String(field.value) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>`;
    }
    const attrs = field.type === "number"
      ? `type="number" min="${field.min}" max="${field.max}" step="${field.step || 1}" value="${escapeHtml(field.value)}"`
      : `type="text" value="${escapeHtml(field.value || "")}"`;
    return `<label><span>${escapeHtml(field.label)}</span><input ${common} ${attrs}></label>`;
  }).join("");
}

function minigameFieldValue(key) {
  return minigameSpecificConfigPanel?.querySelector(`[data-minigame-config="${key}"]`)?.value;
}

function collectMinigameSpecificConfig(type) {
  const definition = MINIGAME_SPECIFIC_CONFIG[type];
  if (!definition) return {};
  const config = {};
  definition.fields.forEach((field) => {
    const value = minigameFieldValue(field.key);
    if (field.type === "number") {
      config[field.key] = boundedInteger(value, field.value, field.min, field.max);
      return;
    }
    config[field.key] = String(value ?? field.value ?? "").trim();
  });

  if (type === "TRUE_FALSE") {
    config.prompts = parseTrueFalsePrompts(config.true_false_prompts);
    delete config.true_false_prompts;
  }
  if (type === "ORDER_OPTIONS") {
    config.sequences = parseOrderSequences(config.order_sequences);
    delete config.order_sequences;
  }
  if (type === "CONNECTORS") {
    config.pairs = parseConnectorPairs(config.connector_pairs);
    delete config.connector_pairs;
  }
  if (type === "MEMORY_PAIRS") {
    config.symbols = splitOptionList(config.memory_symbols).slice(0, 12);
    delete config.memory_symbols;
  }
  if (type === "BATTLESHIP_COORDS") {
    const shipCount = boundedInteger(config.ship_count, 3, 1, 3);
    config.ship_count = shipCount;
    config.ship_lengths = [config.ship_1, config.ship_2, config.ship_3].slice(0, shipCount);
    delete config.ship_1;
    delete config.ship_2;
    delete config.ship_3;
  }
  return config;
}

function parseTrueFalsePrompts(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [textPart, answerPart = ""] = line.split("|").map((part) => part.trim());
      const normalized = answerPart.toLowerCase();
      return {
        id: `tf${index + 1}`,
        text: textPart,
        answer: ["true", "verdadero", "v", "si", "sí"].includes(normalized),
      };
    })
    .filter((item) => item.text.length >= 4)
    .slice(0, 12);
}

function parseOrderSequences(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.split(">").map((part) => part.trim()).filter(Boolean))
    .filter((items) => items.length >= 2)
    .slice(0, 8);
}

function parseConnectorPairs(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.split("=").map((part) => part.trim()).filter(Boolean))
    .filter((parts) => parts.length >= 2)
    .map(([left, right], index) => ({ key: index, left, right }))
    .slice(0, 8);
}

function collectBattleshipConfig() {
  const dynamic = collectMinigameSpecificConfig("BATTLESHIP_COORDS");
  if (dynamic.ship_lengths?.length) return dynamic;
  const shipCount = boundedInteger(battleshipShipCountInput?.value, 3, 1, 3);
  const rawLengths = [
    boundedInteger(battleshipShip1Input?.value, 3, 1, 5),
    boundedInteger(battleshipShip2Input?.value, 2, 1, 5),
    boundedInteger(battleshipShip3Input?.value, 2, 1, 5),
  ];
  return {
    grid_size: 6,
    ship_count: shipCount,
    ship_lengths: rawLengths.slice(0, shipCount),
  };
}

function updateBattleshipShipInputs() {
  const shipCount = boundedInteger(battleshipShipCountInput?.value, 3, 1, 3);
  [battleshipShip1Input, battleshipShip2Input, battleshipShip3Input].forEach((input, index) => {
    if (input) input.disabled = index >= shipCount;
  });
}

function validateMinigameSpecificConfig(type) {
  const config = collectMinigameSpecificConfig(type);
  if (type === "TRUE_FALSE" && (!Array.isArray(config.prompts) || config.prompts.length < 2)) {
    setInlineMessage(triviaLauncherMessage, "Falso/Verdadero necesita al menos dos afirmaciones con formato: texto | verdadero/falso.", "error");
    minigameSpecificConfigPanel?.querySelector("[data-minigame-config='true_false_prompts']")?.focus();
    return null;
  }
  if (type === "ORDER_OPTIONS" && (!Array.isArray(config.sequences) || config.sequences.length < 1)) {
    setInlineMessage(triviaLauncherMessage, "Orden correcto necesita al menos una secuencia con dos o más pasos separados por >.", "error");
    minigameSpecificConfigPanel?.querySelector("[data-minigame-config='order_sequences']")?.focus();
    return null;
  }
  if (type === "CONNECTORS" && (!Array.isArray(config.pairs) || config.pairs.length < 2)) {
    setInlineMessage(triviaLauncherMessage, "Conectores necesita al menos dos pares con formato: izquierda = derecha.", "error");
    minigameSpecificConfigPanel?.querySelector("[data-minigame-config='connector_pairs']")?.focus();
    return null;
  }
  if (type === "MEMORY_PAIRS" && Array.isArray(config.symbols) && config.symbols.length < config.pair_count) {
    setInlineMessage(triviaLauncherMessage, "Memoria necesita tantos símbolos como pares configurados.", "error");
    minigameSpecificConfigPanel?.querySelector("[data-minigame-config='memory_symbols']")?.focus();
    return null;
  }
  if (type === "BATTLESHIP_COORDS" && (!Array.isArray(config.ship_lengths) || config.ship_lengths.length < 1 || config.ship_lengths.length > 3)) {
    setInlineMessage(triviaLauncherMessage, "Batalla naval permite entre 1 y 3 barcos.", "error");
    minigameSpecificConfigPanel?.querySelector("[data-minigame-config='ship_count']")?.focus();
    return null;
  }
  return config;
}

function activationParticipantLockFromForm() {
  const cooldownDays = Math.max(0, Math.min(365, Number(minigameParticipantCooldownInput?.value || 7)));
  const winnerPolicy = minigameWinnerPolicyInput?.value || "block_previous_winners";
  return {
    scope: "activation",
    cooldown_days: cooldownDays,
    winner_policy: winnerPolicy,
    label: `${cooldownDays} días de espera entre intentos`,
  };
}

function validateActivationParticipantLock() {
  const cooldownDays = Number(minigameParticipantCooldownInput?.value || 0);
  const winnerPolicy = minigameWinnerPolicyInput?.value || "block_previous_winners";
  if (!Number.isFinite(cooldownDays) || cooldownDays < 0 || cooldownDays > 365) {
    setInlineMessage(triviaLauncherMessage, "Configura los días de espera entre 0 y 365.", "error");
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

function validateBenefitFulfillment(modeInput, codeInput, messageNode, contextLabel = "beneficio") {
  if (String(modeInput?.value || "PHYSICAL_QR") !== "ECOMMERCE_CODE") return true;
  const code = String(codeInput?.value || "").trim();
  if (code) return true;
  setInlineMessage(messageNode, `Escribe el código ecommerce que recibirá el ganador del ${contextLabel}.`, "error");
  codeInput?.focus();
  return false;
}

function buildInteractiveActivationPayload(type, activationPayload) {
  const baseBenefitLabel = interactiveBaseBenefitLabel(type, activationPayload);
  const productScope = benefitProductScope(triviaBenefitProductModeInput, triviaBenefitProductInput);
  const fulfillment = benefitFulfillmentFromInputs(
    triviaBenefitFulfillmentModeInput,
    triviaEcommerceCodeInput,
    triviaEcommerceUrlInput,
    triviaEcommerceInstructionsInput
  );
  const rawBenefitValue = withBenefitFulfillment(
    withBenefitProductScope(parseJsonObject(triviaBenefitValueInput.value), productScope),
    fulfillment
  );
  const benefit = {
    reward_type: triviaBenefitTypeInput.value,
    reward_label: baseBenefitLabel,
    reward_value: rawBenefitValue,
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
    reward_config: {
      ...benefit,
      product_scope: productScope,
      fulfillment,
    },
    capture_config: {
      required_fields: ["name", "phone", "email", "document"],
      optional_fields: [],
      participant_lock: activationParticipantLockFromForm(),
    },
    visual_config: {
      source: "ticket_center_activation_builder",
      invite_message_template: triviaInviteMessageInput?.value.trim() || defaultActivationInviteTemplate({ title: triviaTitleInput.value.trim() }),
    },
    metadata: {
      benefit_product_scope: productScope,
      benefit_fulfillment: fulfillment,
    },
    benefit: {
      benefit_type: triviaBenefitTypeInput.value,
      benefit_label: baseBenefitLabel,
      benefit_value: rawBenefitValue,
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

  if (type === "ROULETTE_SPIN") {
    const choices = collectRouletteBenefits();
    return {
      ...base,
      category: "minigame",
      reward_mode: "by_choice",
      reward_config: {
        ...benefit,
        choices,
      },
      game_config: {
        game_type: type,
        min_duration_ms: 0,
        max_duration_ms: 120000,
        max_score: 100000,
        segments: choices,
        instruction: minigameInstructionForType(type),
      },
      interaction_config: {
        minigame: type,
        result_mode: "roulette_choice",
      },
      visual_config: {
        ...base.visual_config,
        minigame_skin: type,
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
    const specificConfig = collectMinigameSpecificConfig(type);
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
        min_duration_ms: type === "BATTLESHIP_COORDS" ? 0 : 3000,
        max_duration_ms: (durationSeconds + 10) * 1000,
        max_score: maxScore,
        min_score_for_reward: minScore,
        points_per_target: pointsPerTarget,
        penalty,
        lives,
        fire_interval_ms: fireIntervalMs,
        instruction: minigameInstructionForType(type),
        ...(specificConfig || {}),
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

const CLOSEOUT_EXPIRY_COPY = {
  NONE: {
    hint: "Sin fecha limite: queda vigente hasta redencion o anulacion.",
    dateHint: "Activa fecha personalizada para elegir un cierre exacto.",
    ticket: "Sin expiracion activa. El equipo puede redimir el ticket hasta que sea usado o anulado.",
    batch: "Sin expiracion activa. El paquete queda disponible hasta que sus tickets se usen o se anulen.",
  },
  "7_DAYS": {
    hint: "Vence automaticamente 7 dias despues de emitirse.",
    dateHint: "No necesitas fecha exacta; el sistema calcula los 7 dias.",
    ticket: "Vigencia automatica: este ticket vencera 7 dias despues de emitirse.",
    batch: "Vigencia automatica: cada ticket del paquete vencera 7 dias despues de emitirse.",
  },
  "15_DAYS": {
    hint: "Vence automaticamente 15 dias despues de emitirse.",
    dateHint: "No necesitas fecha exacta; el sistema calcula los 15 dias.",
    ticket: "Vigencia automatica: este ticket vencera 15 dias despues de emitirse.",
    batch: "Vigencia automatica: cada ticket del paquete vencera 15 dias despues de emitirse.",
  },
  "30_DAYS": {
    hint: "Vence automaticamente 30 dias despues de emitirse.",
    dateHint: "No necesitas fecha exacta; el sistema calcula los 30 dias.",
    ticket: "Vigencia automatica: este ticket vencera 30 dias despues de emitirse.",
    batch: "Vigencia automatica: cada ticket del paquete vencera 30 dias despues de emitirse.",
  },
  CUSTOM_DATE: {
    hint: "Elige una fecha y hora exacta de cierre.",
    dateHint: "Campo requerido para emitir con fecha personalizada.",
    ticket: "Fecha personalizada activa. Selecciona dia y hora antes de emitir el ticket.",
    batch: "Fecha personalizada activa. Selecciona dia y hora antes de generar el paquete.",
  },
};

function updateCloseoutExpiryMode({ modeInput, dateInput, hint, dateHint, summary, context }) {
  if (!modeInput || !dateInput) return;
  const mode = modeInput.value || "NONE";
  const copy = CLOSEOUT_EXPIRY_COPY[mode] || CLOSEOUT_EXPIRY_COPY.NONE;
  const custom = mode === "CUSTOM_DATE";
  dateInput.disabled = !custom;
  dateInput.required = custom;
  dateInput.closest(".expiration-date-card")?.classList.toggle("is-disabled", !custom);
  if (!custom) dateInput.value = "";
  if (hint) hint.textContent = copy.hint;
  if (dateHint) dateHint.textContent = copy.dateHint;
  if (summary) summary.textContent = copy[context] || copy.ticket;
}

function updatePostSaleExpiryMode() {
  updateCloseoutExpiryMode({
    modeInput: postSaleExpiresModeInput,
    dateInput: postSaleExpiresAtInput,
    hint: postSaleExpiryHint,
    dateHint: postSaleExpiryDateHint,
    summary: postSaleExpirySummary,
    context: "ticket",
  });
}

function updateQrBatchExpiryMode() {
  updateCloseoutExpiryMode({
    modeInput: qrBatchExpiresModeInput,
    dateInput: qrBatchExpiresAtInput,
    hint: qrBatchExpiryHint,
    dateHint: qrBatchExpiryDateHint,
    summary: qrBatchExpirySummary,
    context: "batch",
  });
}

function requireCloseoutExpiryDate({ modeInput, dateInput, messageEl, actionLabel }) {
  if (!modeInput || !dateInput) return true;
  if (modeInput.value !== "CUSTOM_DATE") return true;
  if (dateInput.value) return true;
  setInlineMessage(messageEl, `Selecciona la fecha personalizada antes de ${actionLabel}.`, "error");
  dateInput.focus();
  return false;
}

function validateTriviaLauncherForm() {
  updateTriviaExpiryMode();
  const type = currentActivationType();
  if (!validateBenefitFulfillment(triviaBenefitFulfillmentModeInput, triviaEcommerceCodeInput, triviaLauncherMessage, "beneficio de la activación")) return null;
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
      setInlineMessage(triviaLauncherMessage, `Completa las ${expectedSurveyQuestions} preguntas activas de la encuesta. Las preguntas de opción necesitan mínimo 2 opciones.`, "error");
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
      setInlineMessage(triviaLauncherMessage, "Configura al menos tres descuentos válidos para el termómetro.", "error");
      thermometerDiscountsInput?.focus();
      return null;
    }
    return { thermometer_discounts: thermometerDiscounts };
  }
  if (isFlatChoiceActivation(type)) {
    const choices = collectFlatChoiceOptions(type);
    if (type === "SCRATCH_DIGITAL" && choices.length !== 4) {
      setInlineMessage(triviaLauncherMessage, "Configura las cuatro zonas del Raspa digital.", "error");
      return null;
    }
    if (choices.length < 2) {
      setInlineMessage(triviaLauncherMessage, "Configura al menos dos opciones para esta activación.", "error");
      return null;
    }
    return { choices };
  }
  if (isFlatFormActivation(type)) {
    const questions = collectFlatFormQuestions(type);
    const expectedQuestions = getActivationQuestionCount(type, 1);
    if (questions.length < expectedQuestions) {
      setInlineMessage(triviaLauncherMessage, `Completa las ${expectedQuestions} preguntas activas para esta activación.`, "error");
      return null;
    }
    return { questions };
  }
  if (isFixedPremiumActivation(type)) {
    return { message: true };
  }
  if (type === "ROULETTE_SPIN") {
    const choices = collectRouletteBenefits();
    if (choices.length < 2) {
      setInlineMessage(triviaLauncherMessage, "Configura al menos dos beneficios para la ruleta.", "error");
      document.querySelector("[data-roulette-benefit]")?.focus();
      return null;
    }
    return { roulette: true, choices };
  }
  if (isMinigameActivation(type)) {
    const specificConfig = validateMinigameSpecificConfig(type);
    if (!specificConfig) return null;
    const durationSeconds = Number(minigameDurationInput?.value || 30);
    const minScore = Number(minigameMinScoreInput?.value || 100);
    const maxScore = Number(minigameMaxScoreInput?.value || 2500);
    const lives = Number(minigameLivesInput?.value || 3);
    const fireIntervalMs = Number(minigameFireIntervalInput?.value || 480);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 10 || durationSeconds > 180) {
      setInlineMessage(triviaLauncherMessage, "Configura una duración de minijuego entre 10 y 180 segundos.", "error");
      minigameDurationInput?.focus();
      return null;
    }
    if (!Number.isFinite(minScore) || minScore < 1 || !Number.isFinite(maxScore) || maxScore < minScore) {
      setInlineMessage(triviaLauncherMessage, "Configura un score mínimo válido y un máximo antiabuso mayor o igual.", "error");
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
    setInlineMessage(triviaLauncherMessage, "Selecciona la fecha personalizada de expiración.", "error");
    triviaExpiresAtInput?.focus();
    return null;
  }
  return { questions };
}

function renderTriviaLaunchers() {
  if (!triviaLauncherTable) return;
  triviaLauncherTable.innerHTML = (state.triviaLaunchers || []).length
    ? state.triviaLaunchers.map((item) => {
      const attemptsCount = Number(item.attempts_count || 0).toLocaleString("es-CO");
      const winnersCount = Number(item.winners_count || 0).toLocaleString("es-CO");
      const maxWinners = item.max_winners ? Number(item.max_winners || 0).toLocaleString("es-CO") : "";
      return `
      <tr>
        <td>
          <div class="activation-summary-cell">
            <strong class="activation-title">${escapeHtml(item.title || "Activación sin título")}</strong>
            <div class="activation-meta-line">
              <span>${escapeHtml(activationTypeLabel(item.activation_type))}</span>
              <span>${escapeHtml(item.campaign_name || "Sin campaña")}</span>
              <span>Creada ${escapeHtml(formatDate(item.created_at))}</span>
            </div>
            <small>${escapeHtml(activationParticipantPolicyLabel(item))}</small>
          </div>
        </td>
        <td>
          <div class="activation-status-cell">
            <span class="status-chip ${activationStatusClass(item.status)}">${escapeHtml(activationStatusLabel(item.status))}</span>
            <small>${item.ends_at ? `Vence ${escapeHtml(formatDate(item.ends_at))}` : "Sin vencimiento"}</small>
          </div>
        </td>
        <td>
          <div class="activation-metric-stack">
            <span><strong>${escapeHtml(attemptsCount)}</strong>Intentos</span>
            <span><strong>${escapeHtml(winnersCount)}</strong>QR generados</span>
            ${item.max_winners ? `<span><strong>${escapeHtml(maxWinners)}</strong>Cupo</span>` : ""}
          </div>
        </td>
        <td>
          <div class="activation-share-cell">
            <a class="table-link activation-public-link" href="${escapeHtml(item.public_url)}" target="_blank" rel="noopener">${escapeHtml(item.public_slug || "Abrir link público")}</a>
            <small>${escapeHtml(item.public_url || "")}</small>
          </div>
          <div class="activation-row-actions activation-share-actions">
            <button class="ghost-button" type="button" data-copy-trivia-link="${escapeHtml(item.public_url)}">Copiar link</button>
            <button class="ghost-button" type="button" data-copy-activation-invite="${escapeHtml(item.id)}">Copiar mensaje</button>
            <button class="ghost-button" type="button" data-share-activation="${escapeHtml(item.id)}">Enviar a lead</button>
            <a class="ghost-button" href="${escapeHtml(item.public_url)}" target="_blank" rel="noopener">Abrir</a>
          </div>
        </td>
        <td>
          <div class="activation-row-actions activation-manage-actions">
            <button class="ghost-button" type="button" data-edit-activation="${escapeHtml(item.id)}">Editar</button>
            <button class="ghost-button" type="button" data-activation-data="${escapeHtml(item.id)}">Copiar datos</button>
            ${item.status === "active"
              ? `<button class="ghost-button" type="button" data-activation-status="${escapeHtml(item.id)}" data-next-status="paused">Pausar</button>`
              : `<button class="ghost-button" type="button" data-activation-status="${escapeHtml(item.id)}" data-next-status="active">Activar</button>`}
            <button class="ghost-button" type="button" data-recycle-activation="${escapeHtml(item.id)}">Duplicar</button>
            <button class="ghost-button danger-button" type="button" data-activation-status="${escapeHtml(item.id)}" data-next-status="archived">Archivar</button>
            <button class="ghost-button danger-button" type="button" data-delete-activation="${escapeHtml(item.id)}">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
    }).join("")
    : '<tr><td colspan="5" class="activation-empty-state">Sin activaciones publicadas. Crea una experiencia para obtener su link de juego.</td></tr>';

  triviaLauncherTable.querySelectorAll("[data-copy-trivia-link]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(button.dataset.copyTriviaLink || "");
      showFeedback("Link público de activación copiado.");
    });
  });
  triviaLauncherTable.querySelectorAll("[data-copy-activation-invite]").forEach((button) => {
    button.addEventListener("click", () => copyActivationInviteMessage(button.dataset.copyActivationInvite));
  });
  triviaLauncherTable.querySelectorAll("[data-share-activation]").forEach((button) => {
    button.addEventListener("click", () => openActivationShareModal(button.dataset.shareActivation));
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
    `Campaña: ${activation.campaign_name || "Sin campaña"}`,
    `Intentos: ${activation.attempts_count || 0}`,
    `QR generados: ${activation.winners_count || 0}${activation.max_winners ? ` / ${activation.max_winners}` : ""}`,
    `Vence: ${activation.ends_at ? formatDate(activation.ends_at) : "Sin vencimiento"}`,
    `Link: ${activation.public_url}`,
    `Mensaje: ${activationInviteMessage(activation)}`,
  ].join("\n");
  try {
    await navigator.clipboard?.writeText(summary);
    showFeedback("Datos de la activación copiados al portapapeles.", "success", { title: "Ficha copiada" });
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

function activationBusinessName() {
  return state.businessProfile?.name || session?.user?.business?.name || "nuestro negocio";
}

function defaultActivationInviteTemplate(activation = {}) {
  return `Hola, te invito a jugar ${activation.title || "{titulo}"}. Abre este enlace, deja tus datos y participa: {link}`;
}

function activationInviteTemplate(activation = {}) {
  return activation.visual_config?.invite_message_template
    || activation.interaction_config?.invite_message_template
    || defaultActivationInviteTemplate(activation);
}

function activationInviteMessage(activation = {}, lead = {}) {
  const link = activation.public_url || "{link}";
  const title = activation.title || "esta activacion";
  const business = activation.business?.name || activationBusinessName();
  const leadName = lead.name || lead.full_name || lead.customer_name || "tu";
  const template = activationInviteTemplate(activation);
  const message = String(template || "")
    .replaceAll("{link}", link)
    .replaceAll("{titulo}", title)
    .replaceAll("{title}", title)
    .replaceAll("{negocio}", business)
    .replaceAll("{business}", business)
    .replaceAll("{lead}", leadName)
    .replaceAll("{nombre}", leadName)
    .replaceAll("{cliente}", leadName)
    .trim();
  return message.includes(link) ? message : `${message}\n${link}`.trim();
}

async function copyActivationInviteMessage(id) {
  const activation = activationById(id);
  if (!activation) return;
  const message = activationInviteMessage(activation);
  try {
    await navigator.clipboard?.writeText(message);
    showFeedback("Mensaje de invitacion copiado.", "success", { title: "Activacion lista" });
  } catch {
    window.alert(message);
  }
}

function activationShareLeadKey(lead = {}) {
  return `${lead.source_type || "PLAYER"}::${lead.id || ""}`;
}

function selectedActivationShareLead() {
  return (state.activationShareLeads || [])
    .find((lead) => activationShareLeadKey(lead) === state.activationShareSelectedKey) || null;
}

function activationShareContactLine(lead = {}) {
  return [
    lead.phone || "Sin telefono",
    lead.email || "",
    lead.document_id || "",
  ].filter(Boolean).join(" | ");
}

function activationShareWhatsAppUrl(activation, lead) {
  const phone = whatsappPhoneFromInput(lead?.phone || lead?.whatsapp || lead?.mobile || "");
  const message = activationInviteMessage(activation, lead || {});
  return phone
    ? `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function renderActivationShareModal() {
  const activation = activationById(state.activationShareId);
  const leads = state.activationShareLeads || [];
  const selectedLead = selectedActivationShareLead();
  if (activationShareTitle) {
    activationShareTitle.textContent = activation ? `Enviar ${activation.title || "activacion"}` : "Enviar por WhatsApp";
  }
  if (activationShareLeadList) {
    if (state.activationShareLoading) {
      activationShareLeadList.innerHTML = '<div class="empty-state compact">Cargando leads...</div>';
    } else {
      activationShareLeadList.innerHTML = leads.length
        ? leads.map((lead) => {
          const key = activationShareLeadKey(lead);
          const hasPhone = Boolean(whatsappPhoneFromInput(lead.phone || lead.whatsapp || lead.mobile || ""));
          return `
            <button class="activation-share-lead ${key === state.activationShareSelectedKey ? "active" : ""}" type="button" data-activation-share-lead="${escapeHtml(key)}">
              <span>
                <strong>${escapeHtml(lead.name || "Lead sin nombre")}</strong>
                <small>${escapeHtml(activationShareContactLine(lead))}</small>
              </span>
              <span class="status-chip ${hasPhone ? "ok" : "pending"}">${hasPhone ? "WhatsApp" : "Sin telefono"}</span>
            </button>
          `;
        }).join("")
        : '<div class="empty-state compact">Sin leads para esta busqueda.</div>';
    }
    activationShareLeadList.querySelectorAll("[data-activation-share-lead]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activationShareSelectedKey = button.dataset.activationShareLead || "";
        renderActivationShareModal();
      });
    });
  }
  const preview = activation ? activationInviteMessage(activation, selectedLead || {}) : "";
  if (activationShareMessagePreview) activationShareMessagePreview.value = preview;
  if (activationShareSelectedContact) {
    activationShareSelectedContact.innerHTML = selectedLead
      ? `<strong>${escapeHtml(selectedLead.name || "Lead sin nombre")}</strong><small>${escapeHtml(activationShareContactLine(selectedLead))}</small>`
      : "<strong>Selecciona un lead</strong><small>El mensaje se abrira con el telefono del contacto elegido.</small>";
  }
  const hasPhone = Boolean(whatsappPhoneFromInput(selectedLead?.phone || selectedLead?.whatsapp || selectedLead?.mobile || ""));
  if (activationShareOpenWhatsAppButton) activationShareOpenWhatsAppButton.disabled = !activation || !selectedLead || !hasPhone;
  setFormMessage(
    activationShareMessage,
    selectedLead && !hasPhone ? "Este lead no tiene telefono. Puedes copiar el mensaje, pero WhatsApp necesita un numero." : "",
    selectedLead && !hasPhone ? "error" : ""
  );
}

async function loadActivationShareLeads(search = "") {
  state.activationShareLoading = true;
  renderActivationShareModal();
  const params = new URLSearchParams();
  params.set("limit", "30");
  params.set("offset", "0");
  if (search) params.set("search", search);
  try {
    const data = await apiSafe(`/api/business/leads/crm?${params.toString()}`, { headers: authHeaders() }, { leads: [] });
    state.activationShareLeads = data.leads || [];
    const currentExists = state.activationShareLeads.some((lead) => activationShareLeadKey(lead) === state.activationShareSelectedKey);
    if (!currentExists) {
      const firstWithPhone = state.activationShareLeads.find((lead) => whatsappPhoneFromInput(lead.phone || lead.whatsapp || lead.mobile || ""));
      state.activationShareSelectedKey = firstWithPhone
        ? activationShareLeadKey(firstWithPhone)
        : (state.activationShareLeads[0] ? activationShareLeadKey(state.activationShareLeads[0]) : "");
    }
  } finally {
    state.activationShareLoading = false;
    renderActivationShareModal();
  }
}

async function openActivationShareModal(id) {
  const activation = activationById(id);
  if (!activation) return;
  state.activationShareId = id;
  state.activationShareLeads = state.leadCrmRows || [];
  state.activationShareSelectedKey = "";
  if (activationShareSearchInput) activationShareSearchInput.value = "";
  activationShareModal?.classList.remove("hidden");
  renderActivationShareModal();
  await loadActivationShareLeads("");
}

function closeActivationShareModal() {
  activationShareModal?.classList.add("hidden");
}

async function searchActivationShareLeads() {
  await loadActivationShareLeads(String(activationShareSearchInput?.value || "").trim());
}

function openActivationShareWhatsApp() {
  const activation = activationById(state.activationShareId);
  const lead = selectedActivationShareLead();
  if (!activation || !lead) return;
  const phone = whatsappPhoneFromInput(lead.phone || lead.whatsapp || lead.mobile || "");
  if (!phone) {
    setFormMessage(activationShareMessage, "Este lead no tiene telefono para abrir WhatsApp.", "error");
    return;
  }
  window.open(activationShareWhatsAppUrl(activation, lead), "_blank", "noopener");
}

async function copyActivationShareMessage() {
  const activation = activationById(state.activationShareId);
  const lead = selectedActivationShareLead();
  if (!activation) return;
  const message = activationInviteMessage(activation, lead || {});
  try {
    await navigator.clipboard?.writeText(message);
    showFeedback("Mensaje de invitacion copiado.", "success", { title: "Activacion lista" });
  } catch {
    window.alert(message);
  }
}

function activationParticipantPolicyLabel(activation) {
  const lock = activation?.capture_config?.participant_lock || {};
  const days = Number(lock.cooldown_days ?? 7);
  const winnerText = lock.winner_policy === "allow_after_cooldown"
    ? "ganadores pueden volver tras la espera"
    : "ganadores bloqueados";
  return `${Number.isFinite(days) ? days : 7} días entre intentos · ${winnerText}`;
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
  if (successMessage) showFeedback(successMessage, "success", { title: "Activación actualizada" });
  return activation;
}

async function deleteInteractiveActivation(id) {
  const activation = activationById(id);
  if (!activation) return;
  const hasHistory = Number(activation.attempts_count || 0) > 0 || Number(activation.winners_count || 0) > 0;
  const copy = hasHistory
    ? `Esta activación ya tiene historial. Se retirará de la lista y quedará archivada para no romper tickets/redenciones. Deseas continuar?`
    : `Vas a eliminar definitivamente "${activation.title}". Esta acción no se puede deshacer. Deseas continuar?`;
  if (!window.confirm(copy)) return;
  try {
    const data = await api(`/api/business/interactive-activations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    state.triviaLaunchers = (state.triviaLaunchers || []).filter((item) => String(item.id) !== String(id));
    renderTriviaLaunchers();
    showFeedback(data.message || "Activación eliminada.", "success", { title: data.deleted ? "Eliminada" : "Archivada" });
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo eliminar" });
  }
}

async function updateActivationStatus(id, status) {
  const activation = activationById(id);
  if (!activation || !status) return;
  if (status === "archived" && !window.confirm(`Vas a anular "${activation.title}". El link quedará inactivo y no recibirá nuevas participaciones. Deseas continuar?`)) {
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
  const title = window.prompt("Titulo de la activación", activation.title || "");
  if (title === null) return;
  const description = window.prompt("Descripcion para la landing", activation.description || "");
  if (description === null) return;
  const inviteTemplate = window.prompt("Mensaje generico para invitar. Puedes usar {link}, {titulo} y {negocio}.", activationInviteTemplate(activation));
  if (inviteTemplate === null) return;
  const maxRewardsText = window.prompt("Cupo máximo de QR/beneficios. Deja vacío para sin limite.", activation.max_rewards || "");
  if (maxRewardsText === null) return;
  const maxRewards = String(maxRewardsText).trim() ? Number(maxRewardsText) : null;
  if (maxRewards !== null && (!Number.isFinite(maxRewards) || maxRewards < 1)) {
    showFeedback("El cupo máximo debe ser un número mayor a cero o quedar vacío.", "error", { title: "Dato inválido" });
    return;
  }
  const currentLock = activation.capture_config?.participant_lock || {};
  const cooldownText = window.prompt("Días de espera entre intentos para este beneficiario.", currentLock.cooldown_days ?? 7);
  if (cooldownText === null) return;
  const cooldownDays = Number(cooldownText);
  if (!Number.isFinite(cooldownDays) || cooldownDays < 0 || cooldownDays > 365) {
    showFeedback("Los días de espera deben estar entre 0 y 365.", "error", { title: "Dato inválido" });
    return;
  }
  const currentWinnerPolicy = currentLock.winner_policy || "block_previous_winners";
  const winnerPolicy = window.prompt(
    "Si ya gano beneficio escribe: block_previous_winners o allow_after_cooldown.",
    currentWinnerPolicy
  );
  if (winnerPolicy === null) return;
  if (!["block_previous_winners", "allow_after_cooldown"].includes(winnerPolicy)) {
    showFeedback("Política inválida. Usa block_previous_winners o allow_after_cooldown.", "error", { title: "Dato inválido" });
    return;
  }
  try {
    await patchInteractiveActivation(id, {
      title: title.trim(),
      description: description.trim() || null,
      max_rewards: maxRewards,
      visual_config: {
        ...(activation.visual_config || {}),
        invite_message_template: inviteTemplate.trim() || defaultActivationInviteTemplate({ title: title.trim() }),
      },
      capture_config: {
        ...(activation.capture_config || {}),
        required_fields: ["name", "phone", "email", "document"],
        optional_fields: [],
        participant_lock: {
          scope: currentLock.scope === "company" ? "company" : "activation",
          cooldown_days: cooldownDays,
          winner_policy: winnerPolicy,
          label: `${cooldownDays} días de espera entre intentos`,
        },
      },
    }, "Datos básicos actualizados.");
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo editar" });
  }
}

async function recycleInteractiveActivation(id) {
  const activation = activationById(id);
  if (!activation) return;
  if (!window.confirm(`Crear una copia borrador de "${activation.title}" con sus preguntas, reglas y configuración?`)) return;
  try {
    const data = await api(`/api/business/interactive-activations/${encodeURIComponent(id)}/recycle`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    state.triviaLaunchers = [data.activation, ...(state.triviaLaunchers || [])];
    renderTriviaLaunchers();
    showFeedback("Activación reciclada como borrador. Puedes editarla y activarla cuando este lista.", "success", { title: "Copia creada" });
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo reciclar" });
  }
}

async function archivePreviousLauncherActivation(previousId, nextId) {
  if (!previousId || String(previousId) === String(nextId)) return false;
  try {
    await patchInteractiveActivation(previousId, { status: "archived" });
    return true;
  } catch (error) {
    showFeedback(
      "El nuevo link fue creado, pero no se pudo archivar el link anterior. Anúlalo desde la tabla si ya no debe usarse.",
      "error",
      { title: "Renovación parcial" }
    );
    return false;
  }
}

async function submitTriviaLauncher(event) {
  event.preventDefault();
  if (!triviaLauncherForm.reportValidity()) {
    setInlineMessage(triviaLauncherMessage, "Revisa los campos marcados antes de lanzar la activación.", "error");
    return;
  }
  const activationPayload = validateTriviaLauncherForm();
  if (!activationPayload) return;
  const type = currentActivationType();
  const submitButton = triviaLauncherForm.querySelector("button[type='submit']");
  const previousLauncherActivationId = state.currentLauncherActivationId;
  setButtonLoading(submitButton, true, "Lanzando...");
  triviaLauncherResult?.classList.add("hidden");
  if (triviaLauncherResult) triviaLauncherResult.innerHTML = "";
  setInlineMessage(triviaLauncherMessage, `Renovando landing pública de ${activationTypeLabel(type).toLowerCase()} y generando link nuevo.`, "info");
  try {
    const data = await api("/api/business/interactive-activations", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(buildInteractiveActivationPayload(type, activationPayload)),
    });

    const activation = data.activation || data.trivia;
    state.currentLauncherActivationId = activation.id;
    const archivedPrevious = await archivePreviousLauncherActivation(previousLauncherActivationId, activation.id);
    state.triviaLaunchers = [activation, ...(state.triviaLaunchers || []).filter((item) => item.id !== activation.id)];
    renderTriviaLaunchers();
    const inviteMessage = activationInviteMessage(activation);
    triviaLauncherResult.classList.remove("hidden");
    triviaLauncherResult.innerHTML = `
      <strong>Activación renovada</strong>
      <p class="table-secondary">${archivedPrevious ? "El link anterior quedó archivado y este es el link vigente." : "Este es un link nuevo y vigente para compartir."} Primero dejan sus datos, luego completan la dinámica y el sistema emite el ticket según la regla configurada.</p>
      <p><a href="${escapeHtml(activation.public_url)}" target="_blank" rel="noopener">${escapeHtml(activation.public_url)}</a></p>
      <label class="activation-invite-preview"><span>Mensaje para invitar</span><textarea readonly rows="4">${escapeHtml(inviteMessage)}</textarea></label>
      <button class="ghost-button" type="button" id="copyTriviaLauncherResultButton">Copiar link</button>
      <button class="ghost-button" type="button" id="copyTriviaInviteResultButton">Copiar mensaje</button>
      <button class="solid-button" type="button" id="shareTriviaInviteResultButton">Compartir a lead</button>
    `;
    document.getElementById("copyTriviaLauncherResultButton")?.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(activation.public_url);
      showFeedback("Link de activación copiado.");
    });
    document.getElementById("copyTriviaInviteResultButton")?.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(inviteMessage);
      showFeedback("Mensaje de invitacion copiado.", "success", { title: "Activacion lista" });
    });
    document.getElementById("shareTriviaInviteResultButton")?.addEventListener("click", () => openActivationShareModal(activation.id));
    setInlineMessage(triviaLauncherMessage, "Activación renovada. Comparte el link nuevo.", "success");
    showFeedback("Activación renovada. El link público nuevo ya está listo.", "success", { title: "Constructor de activaciones" });
    markTicketCenterDataStale(["activations", "metrics"]);
    await loadStrategicQrData({ groups: ["activations", "metrics"], force: true, quiet: true });
    renderStrategicQrView();
  } catch (error) {
    setInlineMessage(triviaLauncherMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo lanzar la activación" });
  } finally {
    setButtonLoading(submitButton, false);
  }
}

const GENERIC_TICKET_USE_CASE_LABELS = {
  gift_product: "Producto regalo",
  secret_friend: "Amigo secreto",
  invitation: "Invitación",
  prospect_benefit: "Beneficio para prospecto",
  pre_sale: "Preventa",
  post_sale: "Postventa / recompra",
  custom: "Uso personalizado",
};

function genericTicketUseCaseLabel(value) {
  return GENERIC_TICKET_USE_CASE_LABELS[value] || GENERIC_TICKET_USE_CASE_LABELS.custom;
}

function whatsappPhoneFromInput(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (digits.length === 10 && digits.startsWith("3")) {
    return `57${digits}`;
  }
  return digits;
}

async function submitPostSaleQr(event) {
  event.preventDefault();
  if (!requireCampaignAssociation(postSaleCampaignInput, postSaleQrMessage, "emitir un ticket generico")) {
    return;
  }
  if (!validateBenefitFulfillment(postSaleBenefitFulfillmentModeInput, postSaleEcommerceCodeInput, postSaleQrMessage, "ticket")) {
    return;
  }
  updatePostSaleExpiryMode();
  if (!requireCloseoutExpiryDate({ modeInput: postSaleExpiresModeInput, dateInput: postSaleExpiresAtInput, messageEl: postSaleQrMessage, actionLabel: "emitir el ticket" })) {
    return;
  }
  const submitButton = postSaleQrForm.querySelector("button[type='submit']");
  setButtonLoading(submitButton, true, "Generando...");
  setInlineMessage(postSaleQrMessage, "Emitiendo ticket generico y descontando 1 ticket...", "info");
  showFeedback("Creando token único, preparando el ticket y actualizando saldo.", "loading", { title: "Emitiendo ticket", timeout: 0 });
  showBusyOverlay("Emitiendo ticket generico", "Creando ticket validable, actualizando saldo y preparando envio.");
  try {
    const ticketUseCase = postSaleUseCaseInput?.value || "gift_product";
    const ticketUseCaseLabel = genericTicketUseCaseLabel(ticketUseCase);
    const ticketOccasion = postSaleOccasionInput?.value.trim() || null;
    const productName = productInputRawValue(postSaleProductInput);
    const benefitLabel = postSaleBenefitLabelInput.value.trim();
    const beneficiaryName = postSaleCustomerInput.value.trim();
    const attributionSource = postSaleAttributionSourceInput?.value.trim() || ticketUseCase;
    const attributionSubject = postSaleAttributionSubjectInput?.value.trim() || ticketOccasion || productName || benefitLabel || null;
    const inventoryProduct = findInventoryProduct(postSaleProductInput.value || productName);
    const inventorySaleProduct = productSalePayload(inventoryProduct, 1, Number(postSaleAmountInput.value || inventoryProduct?.unit_price || 0));
    const productScope = benefitProductScope(postSaleBenefitProductModeInput, postSaleBenefitProductInput);
    const fulfillment = benefitFulfillmentFromInputs(
      postSaleBenefitFulfillmentModeInput,
      postSaleEcommerceCodeInput,
      postSaleEcommerceUrlInput,
      postSaleEcommerceInstructionsInput
    );
    const benefitValue = {
      ...parseJsonObject(postSaleBenefitValueInput.value),
      product_name: productName || null,
      ticket_use_case: ticketUseCase,
      ticket_use_case_label: ticketUseCaseLabel,
      occasion: ticketOccasion,
    };
    const benefitValueWithProduct = withBenefitFulfillment(withBenefitProductScope(benefitValue, productScope), fulfillment);
    const data = await api("/api/business/qr/generic-ticket", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        campaign_id: postSaleCampaignInput.value || null,
        sale_amount: Number(postSaleAmountInput.value || 0),
        currency: postSaleCurrencyInput.value.trim() || "COP",
        customer_name: beneficiaryName || null,
        document_id: postSaleDocumentInput.value.trim() || null,
        customer_phone: postSalePhoneInput.value.trim() || null,
        customer_email: postSaleEmailInput.value.trim() || null,
        product_name: productName || benefitLabel || null,
        notes: postSaleNotesInput.value.trim() || null,
        metadata: {
          attribution_source: attributionSource,
          attribution_subject: attributionSubject,
          campaign_id: postSaleCampaignInput.value || null,
          qr_creation_context: "business_owner_generic_ticket",
          origin_label: `Ticket generico - ${ticketUseCaseLabel}`,
          ticket_use_case: ticketUseCase,
          ticket_use_case_label: ticketUseCaseLabel,
          ticket_occasion: ticketOccasion,
          intended_recipient_name: beneficiaryName || null,
          gift_product_name: productName || null,
          benefit_product_scope: productScope,
          benefit_fulfillment: fulfillment,
          products: inventorySaleProduct ? [inventorySaleProduct] : [],
        },
        expires_mode: postSaleExpiresModeInput.value,
        expires_at: postSaleExpiresAtInput.value ? new Date(postSaleExpiresAtInput.value).toISOString() : null,
        benefit: {
          benefit_type: postSaleBenefitTypeInput.value,
          benefit_label: benefitLabel,
          benefit_value: benefitValueWithProduct,
        },
      }),
    });
    const browserTicketDataUrl = await ticketImageDataUrlForBrowser(data.qr_image_data_url);
    const ticketFilename = filenameForDataUrl(data.filename || `ticket-${slugify(ticketUseCaseLabel)}-${data.qr_code.id}.png`, browserTicketDataUrl);
    const ticketDownloadUrl = URL.createObjectURL(dataUrlToBlob(browserTicketDataUrl));
    const publicTicketUrl = data.public_ticket_url
      || data.claim_url
      || (data.qr_code?.token ? `${window.location.origin}/claim/${encodeURIComponent(data.qr_code.token)}` : data.validator_url);
    const whatsappPhone = whatsappPhoneFromInput(postSalePhoneInput.value);
    state.qrCreditAccount = data.credit_account || state.qrCreditAccount;
    markTicketCenterDataStale(["core", "metrics", "history"]);
    await loadStrategicQrData({ groups: ["core", "metrics", "history"], force: true, quiet: true });
    setView("strategic-qr");
    setInlineMessage(postSaleQrMessage, "Ticket emitido. El ticket fue descontado y el envio esta listo.", "success");
    const genericTicketShareText = [
      beneficiaryName ? `Hola ${beneficiaryName}.` : "Hola.",
      `Recibiste un ticket para reclamar ${productName || data.benefit?.label || benefitLabel || "un beneficio"}.`,
      ticketOccasion ? `Motivo: ${ticketOccasion}.` : "",
      fulfillment.mode === "ECOMMERCE_CODE"
        ? `Tu código para la tienda online es ${fulfillment.ecommerce_code}.`
        : "Te envio la imagen QR del ticket para presentarla en el punto autorizado.",
    ].filter(Boolean).join(" ");
    const genericTicketWhatsappText = [
      beneficiaryName ? `Hola ${beneficiaryName}.` : "Hola.",
      `Recibiste un ticket para reclamar ${productName || data.benefit?.label || benefitLabel || "un beneficio"}.`,
      ticketOccasion ? `Motivo: ${ticketOccasion}.` : "",
      fulfillment.mode === "ECOMMERCE_CODE"
        ? `Código ecommerce: ${fulfillment.ecommerce_code}. ${fulfillment.instructions}`
        : "Abre este ticket para ver el QR y presentarlo en el punto autorizado.",
      fulfillment.mode === "ECOMMERCE_CODE" && fulfillment.ecommerce_url ? fulfillment.ecommerce_url : "",
      publicTicketUrl,
    ].filter(Boolean).join(" ");
    const genericTicketWhatsappUrl = whatsappPhone
      ? `https://wa.me/${encodeURIComponent(whatsappPhone)}?text=${encodeURIComponent(genericTicketWhatsappText)}`
      : `https://wa.me/?text=${encodeURIComponent(genericTicketWhatsappText)}`;
    postSaleQrResult.classList.remove("hidden");
    postSaleQrResult.innerHTML = `
      <p><strong>Uso:</strong> ${escapeHtml(ticketUseCaseLabel)}${ticketOccasion ? ` | ${escapeHtml(ticketOccasion)}` : ""}</p>
      <p><strong>Representa:</strong> ${escapeHtml(productName || data.benefit?.label || benefitLabel || "Beneficio")}</p>
      ${benefitFulfillmentLabel(data.benefit || {}, data.qr_code?.metadata || {}) ? `<p><strong>Entrega:</strong> ${escapeHtml(benefitFulfillmentLabel(data.benefit || {}, data.qr_code?.metadata || {}))}</p>` : ""}
      ${fulfillment.mode === "ECOMMERCE_CODE" ? `<div class="ecommerce-code-preview"><span>Código ecommerce</span><strong>${escapeHtml(fulfillment.ecommerce_code)}</strong>${fulfillment.ecommerce_url ? `<a href="${escapeHtml(fulfillment.ecommerce_url)}" target="_blank" rel="noopener">Abrir tienda online</a>` : ""}</div>` : ""}
      <p><strong>Estado:</strong> ${escapeHtml(data.qr_code.status)}</p>
      <p><strong>Link:</strong> <a href="${escapeHtml(publicTicketUrl)}" target="_blank" rel="noopener">Abrir ticket público</a></p>
      <img src="${escapeHtml(browserTicketDataUrl)}" alt="Ticket QR generado para compartir" style="max-width:220px;width:100%;border-radius:18px;">
      <div class="inline-actions">
        <button class="solid-button" id="sharePostSaleQrButton" type="button">Enviar imagen</button>
        <a class="ghost-button" id="downloadPostSaleQrButton" href="${escapeHtml(ticketDownloadUrl)}" download="${escapeHtml(ticketFilename)}">Descargar ticket</a>
        <a class="ghost-button" href="${escapeHtml(genericTicketWhatsappUrl)}" target="_blank" rel="noopener">Mensaje con link</a>
        <button class="ghost-button" id="copyGenericTicketLinkButton" type="button">Copiar link</button>
      </div>
      <p class="table-secondary">Usa Enviar imagen para compartir el ticket QR por WhatsApp cuando el navegador lo permita. El link queda como respaldo si el dispositivo no adjunta imagen.</p>
    `;
    document.getElementById("sharePostSaleQrButton")?.addEventListener("click", async () => {
      try {
        await shareTicketQrFile({
          filename: ticketFilename,
          dataUrl: browserTicketDataUrl,
          text: genericTicketShareText,
        });
      } catch (error) {
        if (error?.name === "AbortError") return;
        showFeedback(error.message || "No se pudo compartir el ticket QR.", "error", { title: "Ticket QR" });
      }
    });
    document.getElementById("downloadPostSaleQrButton")?.addEventListener("click", () => {
      window.setTimeout(() => URL.revokeObjectURL(ticketDownloadUrl), 30000);
    });
    document.getElementById("copyGenericTicketLinkButton")?.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(publicTicketUrl);
      showFeedback("Link del ticket copiado.", "success", { title: "Ticket listo" });
    });
    showFeedback("Ticket generico listo. Comparte la imagen QR, descarga el ticket o envia el mensaje al beneficiario.", "success", { title: "Ticket emitido" });
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
  if (!validateBenefitFulfillment(qrBatchBenefitFulfillmentModeInput, qrBatchEcommerceCodeInput, qrBatchMessage, "paquete")) {
    return;
  }
  updateQrBatchExpiryMode();
  if (!requireCloseoutExpiryDate({ modeInput: qrBatchExpiresModeInput, dateInput: qrBatchExpiresAtInput, messageEl: qrBatchMessage, actionLabel: "generar el paquete" })) {
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
    const productScope = benefitProductScope(qrBatchBenefitProductModeInput, qrBatchBenefitProductInput);
    const fulfillment = benefitFulfillmentFromInputs(
      qrBatchBenefitFulfillmentModeInput,
      qrBatchEcommerceCodeInput,
      qrBatchEcommerceUrlInput,
      qrBatchEcommerceInstructionsInput
    );
    const benefitValue = withBenefitFulfillment(withBenefitProductScope(parseJsonObject(qrBatchBenefitValueInput.value), productScope), fulfillment);
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
          benefit_product_scope: productScope,
          benefit_fulfillment: fulfillment,
        },
        benefit: {
          benefit_type: qrBatchBenefitTypeInput.value,
          benefit_label: qrBatchBenefitLabelInput.value.trim(),
          benefit_value: benefitValue,
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
    updateQrBatchExpiryMode();
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
    setValidatorResult("danger", "Ticket vacío", "Pega un token o URL válido.");
    setInlineMessage(validatorManualStatus, "Pega un token o URL válido.", "error");
    return;
  }

  state.validatorLastToken = token;
  setValidatorResult("neutral", "Consultando", "Validando token contra la base de datos...");
  setButtonLoading(validateValidatorManualButton, true, "Validando...");
  setInlineMessage(validatorManualStatus, "Consultando estado, negocio y beneficio del ticket...", "info");
  showFeedback("Validando ticket contra la base de datos.", "loading", { title: "Validando ticket", timeout: 0 });

  const scopeKey = businessScopeKey();
  try {
    const isRewardPass = token.startsWith("rp_");
    const data = await api(isRewardPass
      ? `/api/business/reward-passes/validator/${encodeURIComponent(token)}`
      : `/api/qr/validate/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: authHeaders(),
    });
    if (!isCurrentBusinessScope(scopeKey) || state.validatorLastToken !== token) return;
    state.validatorLastValidation = data;
    state.validatorLastRedemption = null;
    if (data.allowed) {
      setValidatorResult("ok", data.kind === "reward_pass" ? "Reward Pass válido" : "Ticket válido", data.message, data);
      setInlineMessage(validatorManualStatus, data.kind === "reward_pass" ? "Reward Pass válido. Confirma cédula, factura y valor a redimir." : "Ticket válido. Puedes redimir el beneficio.", "success");
      showFeedback(data.kind === "reward_pass" ? "Reward Pass válido. Confirma documento antes de registrar redención." : "Ticket válido. Revisa los datos y redime cuando el cliente confirme.", "success", { title: "Ticket aprobado" });
    } else {
      setValidatorResult("danger", data.status || "Ticket rechazado", data.message, data);
      setInlineMessage(validatorManualStatus, data.message || "Este ticket no puede redimirse.", "error");
      showFeedback(data.message || "Este ticket no puede redimirse.", "error", { title: "Ticket rechazado" });
    }
  } catch (error) {
    if (!isCurrentBusinessScope(scopeKey) || state.validatorLastToken !== token) return;
    state.validatorLastValidation = null;
    state.validatorLastRedemption = null;
    setValidatorResult("danger", "Validación fallida", error.message);
    setInlineMessage(validatorManualStatus, error.message, "error");
    showFeedback(error.message, "error", { title: "Validación fallida" });
  } finally {
    if (isCurrentBusinessScope(scopeKey)) {
      setButtonLoading(validateValidatorManualButton, false);
    }
  }
}

async function redeemValidatorToken() {
  if (!state.validatorLastToken || !state.validatorLastValidation?.allowed) {
    return;
  }

  validatorRedeemButton.disabled = true;
  setButtonLoading(validatorRedeemButton, true, "Redimiendo...");
  showFeedback("Registrando redención y bloqueando el ticket para evitar doble uso.", "loading", { title: "Redimiendo beneficio", timeout: 0 });
  const scopeKey = businessScopeKey();
  try {
    const isRewardPass = state.validatorLastValidation?.kind === "reward_pass";
    const rewardPassPreview = isRewardPass ? rewardPassBalancePreview(true) : null;
    if (isRewardPass) {
      const invoiceNumber = validatorRewardPassInvoiceInput?.value.trim() || "";
      if (invoiceNumber.length < 2) {
        validatorRewardPassInvoiceInput?.focus();
        throw new Error("Ingresa el número de factura electronica antes de redimir el Reward Pass.");
      }
      if (!rewardPassPreview.invoiceValue) {
        throw new Error("Ingresa el total de la factura electronica para calcular el saldo.");
      }
      if (!rewardPassPreview.coverage) {
        throw new Error("No hay saldo disponible para cubrir esta factura.");
      }
      if (!rewardPassPreview.partialAllowed && rewardPassPreview.remaining > 0) {
        const acceptsSingleUse = window.confirm("Este Reward Pass es de un solo uso y la factura no consume todo el saldo. Confirma que el consumidor conoce y acepta las condiciones antes de registrar la redención.");
        if (!acceptsSingleUse) {
          throw new Error("Redención cancelada. Ajusta la factura o confirma las condiciones con el consumidor.");
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
    if (!isCurrentBusinessScope(scopeKey)) return;
    state.validatorLastRedemption = data.redemption;
    state.validatorLastValidation = {
      ...state.validatorLastValidation,
      allowed: false,
    };
    setValidatorResult("ok", "Redención completada", data.message, {
      ...state.validatorLastValidation,
      allowed: false,
    });
    resetValidatorSaleForm();
    await loadValidatorHistory();
    showFeedback("Beneficio redimido. Si hubo venta, registra el valor para completar el seguimiento.", "success", { title: "Redención completada" });
  } catch (error) {
    if (!isCurrentBusinessScope(scopeKey)) return;
    setValidatorResult("danger", "No se pudo redimir", error.message, state.validatorLastValidation);
    showFeedback(error.message, "error");
  } finally {
    if (isCurrentBusinessScope(scopeKey)) {
      setButtonLoading(validatorRedeemButton, false);
      validatorRedeemButton.disabled = !state.validatorLastValidation?.allowed;
    }
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
  setInlineMessage(validatorSaleStatus, "Guardando resultado comercial de la redención...", "info");
  showFeedback("Registrando venta atribuida para actualizar métricas.", "loading", { title: "Guardando venta", timeout: 0 });
  try {
    const data = await api(`/api/redemptions/${state.validatorLastRedemption.id}/attributed-sale`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        had_sale: validatorHadSaleInput.checked,
        sale_amount: Number(validatorSaleAmountInput.value || 0),
        currency: "COP",
        payment_method: validatorPaymentMethodInput.value.trim() || null,
        product_or_service: productInputRawValue(validatorProductServiceInput) || null,
        notes: validatorSaleNotesInput.value.trim() || null,
      }),
    });
    const referralDelta = Number(data.referral?.points_delta || 0);
    const referralMessage = data.referral
      ? ` ${referralDelta === 0 ? "Sin cambio de puntos" : `${toNumber(referralDelta)} puntos`} para el afiliado.`
      : "";
    setInlineMessage(validatorSaleStatus, data.sale ? `Venta atribuida guardada.${referralMessage}` : "Redención registrada sin venta.", "success");
    await loadValidatorHistory();
    showFeedback(data.sale ? `Venta atribuida guardada y métricas actualizadas.${referralMessage}` : "Redención guardada sin venta atribuida.", "success", { title: "Registro actualizado" });
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
  campaignList.innerHTML = '<article class="campaign-item"><p>No hay campañas disponibles.</p></article>';
  campaignStateGrid.innerHTML = "";
  campaignBreadcrumb.textContent = "Sin campaña";
  campaignHeroTitle.textContent = "Campaña";
  campaignHeroSubtitle.textContent = "Analisis de rendimiento multicanal y tasa de conversión.";
  editCampaignButton.classList.add("hidden");
  markReadyCampaignButton.classList.add("hidden");
  campaignInsightText.textContent = "No hay campañas registradas para este negocio.";
  campaignObjectiveValue.textContent = "-";
  campaignDurationValue.textContent = "-";
  campaignStatusValue.textContent = "-";
  campaignBudgetValue.textContent = "$0";
  campaignBudgetMeta.textContent = "de $0 totales";
  campaignBudgetBar.style.width = "0%";
  campaignRoiValue.textContent = "-";
  campaignRoiDelta.textContent = "-";
  launchSetupTitle.textContent = "Configuración del cliente";
  launchSetupStatus.textContent = "Bloqueado";
  launchSetupCopy.textContent = "Esta campaña aún no está lista para configuración por parte del cliente.";
  launchSetupForm.reset();
  state.campaignCostCalculator = null;
  state.campaignCostCalculatorCampaignId = null;
  if (campaignCostSummary) campaignCostSummary.innerHTML = "";
  if (campaignCostDecision) campaignCostDecision.innerHTML = "";
  [campaignCostNameInput, campaignCostChannelInput, campaignCostBranchInput, campaignCostOwnerInput, campaignCostObjectiveInput, campaignCostDurationInput, campaignCostProfitInput, campaignCostAverageTicketInput, campaignCostGrossMarginInput, campaignCostConversionInput, campaignCostRedemptionInput].forEach((input) => {
    if (input) input.value = "";
  });
  if (campaignCostTypeInput) campaignCostTypeInput.value = "MIXED";
  if (campaignCostGoalInput) campaignCostGoalInput.value = "sales";
  if (campaignCostDynamicInput) campaignCostDynamicInput.value = "scratch";
  if (campaignCostProductionList) campaignCostProductionList.innerHTML = "";
  if (campaignCostBenefitsList) campaignCostBenefitsList.innerHTML = "";
  if (campaignCostServicesList) campaignCostServicesList.innerHTML = "";
  if (campaignCostVariableList) campaignCostVariableList.innerHTML = "";
  if (campaignCostFixedList) campaignCostFixedList.innerHTML = "";
  if (campaignCostScenarios) campaignCostScenarios.innerHTML = "";
  if (campaignCostMessage) campaignCostMessage.textContent = "Selecciona una campaña para calcular costos.";
  Array.from(launchChannelGrid.querySelectorAll("input[type='checkbox']")).forEach((input) => {
    input.checked = false;
    input.disabled = true;
  });
  campaignAssetsGrid.innerHTML = '<article class="asset-card"><strong>Sin assets cargados</strong><span>Selecciona una campaña para ver material entregado.</span></article>';
  state.selectedCampaignAffiliates = [];
  if (campaignAffiliateSelect) campaignAffiliateSelect.innerHTML = '<option value="">Sin campaña</option>';
  if (campaignAffiliateAssignButton) campaignAffiliateAssignButton.disabled = true;
  if (campaignAffiliatesTable) campaignAffiliatesTable.innerHTML = '<tr><td colspan="6">Selecciona una campaña.</td></tr>';
  campaignSnapshotsTable.innerHTML = '<tr><td colspan="6">Sin snapshots cargados.</td></tr>';
  campaignKpiGrid.innerHTML = "";
  funnelStack.innerHTML = "";
  recentRedemptionsTable.innerHTML = '<tr><td colspan="4">Sin redenciones.</td></tr>';
  recentLeadsTable.innerHTML = '<tr><td colspan="4">Sin leads.</td></tr>';
  campaignLeadsTable.innerHTML = '<tr><td colspan="9">Sin leads.</td></tr>';
  campaignRedemptionsTable.innerHTML = '<tr><td colspan="6">Sin redenciones.</td></tr>';
  campaignSalesTable.innerHTML = '<tr><td colspan="10">Sin ventas.</td></tr>';
  branchTable.innerHTML = '<tr><td colspan="4">Sin datos por sucursal.</td></tr>';
  branchPerformanceTable.innerHTML = '<tr><td colspan="5">Sin actividad por sucursal.</td></tr>';
  geoBranchBoard.innerHTML = '<article class="geo-branch-card"><strong>Sin datos</strong><p>No hay actividad por sucursal todavia.</p></article>';
  dashboardInsightTitle.textContent = "Esperando datos del negocio.";
  dashboardNarrativeTitle.textContent = "Esperando datos del negocio.";
  dashboardNarrativeText.textContent = "Cuando haya actividad, aquí verás el principal movimiento del periodo sin tener que interpretar todas las tablas.";
  dashboardFunnelHelp.textContent = "Leads muestran interés. tickets emitidos muestran activación. Redenciones muestran visita real. Clientes adquiridos muestran conversión comercial.";
  dashboardHealthText.textContent = "ROI, CPL y CAC se comparan contra ventas atribuidas para saber si la campaña está comprando clientes a un costo sano.";
  cacTrendNote.textContent = "Costo por lead por campaña";
  campaignAnalysisTitle.textContent = "Selecciona una campaña.";
  campaignAnalysisText.textContent = "Aquí se resumira la lectura del rendimiento para que el equipo comercial entienda rápido si la campaña está sana.";
  campaignEconomicsText.textContent = "ROI relaciona ventas atribuidas frente a inversión. CAC muestra cuánto costo cada cliente con compra. Deben leerse juntos.";
  campaignActionText.textContent = "Aquí verás si conviene escalar pauta, optimizar la landing o reforzar el cierre en tienda.";
  adminCampaignTable.innerHTML = isAdmin() ? '<tr><td colspan="4">Sin campañas disponibles.</td></tr>' : '<tr><td colspan="4">Sin acceso admin.</td></tr>';
  salesKpiGrid.innerHTML = "";
  branchKpiGrid.innerHTML = "";
  renderAdminView();
  adminPanelMessage.textContent = isAdmin()
    ? "Este usuario puede crear y editar campañas desde el modal del portal y también operar `/admin`."
    : "Usa el panel `/admin` para la operación interna de Market Games.";
  rangeButton.textContent = state.rangeDays ? `Últimos ${state.rangeDays} días` : "Todo el historial";
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
  setCampaignSectionTab(state.campaignSectionTab || "analysis");
}

const STRATEGY_WIZARD_DRAFT_KEY = "marketgames:campaign-strategy-wizard:draft";
const STRATEGY_WIZARD_OPTIONS = {
  sectors: ["Restaurante", "Retail", "Moda", "Belleza", "Salud", "Educación", "Servicios profesionales", "Eventos", "Turismo", "Tecnología", "Agencia de marketing", "Centro comercial", "Marca de consumo", "Otro"],
  scopes: ["Una sede física", "Varias sedes", "Digital", "Híbrida"],
  audiences: ["Clientes actuales", "Clientes nuevos", "Ambos"],
  objectives: ["Captar nuevos leads", "Aumentar ventas", "Aumentar recompra", "Conseguir referidos", "Fidelizar clientes", "Activar clientes dormidos", "Promocionar un producto específico", "Llevar personas a punto físico", "Medir una activación en evento", "Entregar beneficios o regalos", "Generar base de datos", "Crear alianza entre marcas", "Lanzar una giftcard o reward pass", "Otro"],
  acquisitionModes: ["Manual", "Semimasiva", "Masiva", "Viral/referida"],
  leadMagnets: ["Ebook descargable", "Mini curso gratuito", "Diagnóstico gratuito", "Batalla naval", "Ruleta de premios", "Trivia de marca", "Raspa y gana", "Evento físico", "Webinar", "Masterclass", "Giftcard", "Beneficio limitado", "Catálogo descargable", "Portafolio digital", "Muestra gratuita", "Sorteo", "Reto de referidos", "Club de puntos", "Ranking o competencia", "Alianza entre marcas"],
  targetPublics: ["Clientes nuevos", "Clientes actuales", "Clientes inactivos", "Emprendedores", "Empresas", "Comercios físicos", "Restaurantes", "Agencias", "Inversionistas", "Aliados comerciales", "Compradores recurrentes", "Visitantes de evento", "Seguidores de redes sociales", "Tráfico de punto físico"],
  funnelActions: ["Registrarse", "Jugar", "Descargar un activo digital", "Reclamar un beneficio", "Asistir a un evento", "Agendar diagnóstico", "Invitar a otra persona", "Comprar", "Visitar punto físico", "Responder una trivia", "Escanear desde una pieza física", "Completar un formulario", "Solicitar cotización"],
  dataFields: ["Nombre", "WhatsApp", "Correo", "Empresa", "Sector", "Cargo", "Ciudad", "Necesidad principal", "Presupuesto aproximado", "Producto de interés", "Canal de origen", "Nivel de urgencia", "Consentimiento de contacto"],
  filters: ["Por sector", "Por tamaño de empresa", "Por presupuesto", "Por urgencia", "Por interacción con el juego", "Por descarga de contenido", "Por solicitud de diagnóstico", "Por redención de beneficio", "Por agendamiento", "Por referido", "Por ciudad", "Por canal de llegada"],
  hotActions: ["Descargó el ebook", "Pidió diagnóstico", "Agendó demo", "Redimió beneficio", "Compartió la campaña", "Invitó otro lead", "Respondió que tiene presupuesto", "Dijo que necesita campaña pronto", "Visitó punto físico", "Completó el juego", "Solicitó cotización", "Pidió hablar con asesor"],
  nextActions: ["Enviar ebook", "Enviar WhatsApp automático", "Agendar demo", "Enviar caso de uso", "Asignar asesor", "Enviar oferta piloto", "Mandar cupón", "Activar beneficio", "Invitar a evento", "Enviar campaña de seguimiento", "Clasificar en CRM", "Crear tarea comercial"],
  dynamics: ["Batalla naval", "Ruleta de premios", "Trivia de marca", "Raspa y gana", "Reto de referidos", "Club de puntos", "Ranking de clientes", "Giftcard / Reward Pass", "Captura relámpago de leads", "Alianza cruzada", "Activación elegante sin juego visible"],
  rewards: ["Descuento porcentual", "Descuento fijo", "Obsequio físico", "Ebook / catálogo / activo digital", "Diagnóstico gratuito", "Sesión de asesoría", "Puntos acumulables", "Giftcard", "Entrada a sorteo", "Acceso VIP", "Producto de muestra", "Beneficio de aliado", "Segundo producto con descuento", "Otro"],
  channels: ["Instagram", "Facebook", "TikTok", "Volantes", "Influencer", "Evento fisico", "WhatsApp", "Punto de venta", "Otro"],
  validationMethods: ["Punto físico", "WhatsApp", "Web", "Asesor", "URL interna de validación"],
  campaignCadence: ["Activación relámpago", "Semanal", "Mensual", "Permanente"],
  ticketTypes: ["Lead ticket", "Reward ticket", "Redemption ticket", "Referral ticket", "Giftcard ticket", "Event ticket", "Post-sale ticket", "Digital asset ticket"],
};

const STRATEGY_WIZARD_TEMPLATES = [
  { id: "ebook-leads", title: "Captura relámpago de leads con ebook", sector: "Servicios profesionales", objective: "Captar nuevos leads", dynamic: "Captura relámpago de leads", magnet: "Ebook descargable", channels: ["Instagram", "Facebook", "WhatsApp"], days: 21, tickets: ["Lead ticket", "Digital asset ticket"] },
  { id: "battleship-asset", title: "Batalla naval para descargar activo digital", sector: "Eventos", objective: "Generar base de datos", dynamic: "Batalla naval", magnet: "Batalla naval", channels: ["Evento fisico", "Instagram", "WhatsApp"], days: 10, tickets: ["Lead ticket", "Reward ticket", "Digital asset ticket"] },
  { id: "roulette-store", title: "Ruleta de premios en punto físico", sector: "Retail", objective: "Llevar personas a punto físico", dynamic: "Ruleta de premios", magnet: "Beneficio limitado", channels: ["Punto de venta", "Volantes", "Instagram"], days: 15, tickets: ["Lead ticket", "Reward ticket", "Redemption ticket"] },
  { id: "trivia-brand", title: "Trivia de marca", sector: "Marca de consumo", objective: "Promocionar un producto específico", dynamic: "Trivia de marca", magnet: "Trivia de marca", channels: ["Instagram", "TikTok", "WhatsApp"], days: 21, tickets: ["Lead ticket", "Reward ticket"] },
  { id: "rebuy-challenge", title: "Reto de recompra", sector: "Restaurante", objective: "Aumentar recompra", dynamic: "Club de puntos", magnet: "Beneficio limitado", channels: ["WhatsApp", "Punto de venta", "Instagram"], days: 45, tickets: ["Post-sale ticket", "Reward ticket", "Redemption ticket"] },
  { id: "referral-growth", title: "Referidos gamificados", sector: "Retail", objective: "Conseguir referidos", dynamic: "Reto de referidos", magnet: "Reto de referidos", channels: ["WhatsApp", "Instagram"], days: 30, tickets: ["Lead ticket", "Referral ticket", "Reward ticket"] },
  { id: "giftcard-pass", title: "Giftcard / Reward Pass", sector: "Moda", objective: "Entregar beneficios o regalos", dynamic: "Giftcard / Reward Pass", magnet: "Giftcard", channels: ["Instagram", "WhatsApp", "Punto de venta"], days: 60, tickets: ["Giftcard ticket", "Redemption ticket"] },
  { id: "vip-points", title: "Club de puntos", sector: "Belleza", objective: "Fidelizar clientes", dynamic: "Club de puntos", magnet: "Club de puntos", channels: ["WhatsApp", "Punto de venta"], days: 90, tickets: ["Post-sale ticket", "Reward ticket"] },
  { id: "event-activation", title: "Activación en evento físico", sector: "Eventos", objective: "Medir una activación en evento", dynamic: "Batalla naval", magnet: "Evento físico", channels: ["Evento fisico", "Punto de venta", "Instagram", "WhatsApp"], days: 7, tickets: ["Event ticket", "Lead ticket", "Reward ticket"] },
  { id: "brand-alliance", title: "Alianza cruzada entre marcas", sector: "Marca de consumo", objective: "Crear alianza entre marcas", dynamic: "Alianza cruzada", magnet: "Beneficio de aliado", channels: ["Instagram", "WhatsApp", "Punto de venta"], days: 30, tickets: ["Lead ticket", "Reward ticket", "Redemption ticket"] },
  { id: "post-sale", title: "Campaña postventa", sector: "Retail", objective: "Aumentar recompra", dynamic: "Activación elegante sin juego visible", magnet: "Beneficio limitado", channels: ["WhatsApp", "Punto de venta"], days: 30, tickets: ["Post-sale ticket", "Reward ticket"] },
  { id: "premium-private", title: "Campaña premium sin juego visible", sector: "Servicios profesionales", objective: "Fidelizar clientes", dynamic: "Activación elegante sin juego visible", magnet: "Diagnóstico gratuito", channels: ["WhatsApp", "Instagram"], days: 30, tickets: ["Lead ticket", "Reward ticket"] },
];

const STRATEGY_WIZARD_STEPS = [
  { id: "context", kicker: "Paso 1", title: "Contexto del negocio", help: "Define el punto de partida para sugerir nombre, slug y enfoque.", fields: [
    { key: "template", label: "Plantillas rápidas", type: "templates" },
    { key: "businessName", label: "Nombre del negocio o campaña", type: "text", placeholder: "Ej: Café Monte" },
    { key: "mainProduct", label: "Qué vendes principalmente", type: "text", placeholder: "Ej: café, almuerzos, experiencias..." },
    { key: "sector", label: "Sector", type: "single", optionsKey: "sectors" },
    { key: "scope", label: "Alcance", type: "single", optionsKey: "scopes" },
    { key: "audienceBase", label: "Base de clientes", type: "single", optionsKey: "audiences" },
  ] },
  { id: "objective", kicker: "Paso 2", title: "Objetivo principal", help: "Piensa en el comportamiento que quieres provocar: que te conozcan, vuelvan, compren, recomienden o rediman.", fields: [
    { key: "objective", label: "Qué quieres lograr", type: "single", optionsKey: "objectives" },
  ] },
  { id: "massification", kicker: "Paso 3", title: "Estrategia de Masificación", help: "Una campaña poderosa atrae varias personas, captura datos, entrega valor, filtra interés y activa seguimiento comercial.", fields: [
    { key: "massHelp", type: "note", text: "No pienses primero en contactar personas una por una. Piensa en una excusa de valor que pueda atraer muchas personas al mismo tiempo: un curso, un ebook, un beneficio, un juego, un evento, una activación, un diagnóstico, una giftcard, una trivia, una ruleta, una batalla naval o una campaña de referidos. MarketGames captura, filtra y mide los leads para que luego atiendas solo a los más interesados." },
    { key: "acquisitionMode", label: "Modo de atracción", type: "single", optionsKey: "acquisitionModes" },
    { key: "leadMagnet", label: "Excusa de valor", type: "single", optionsKey: "leadMagnets" },
    { key: "targetPublic", label: "Público a atraer", type: "single", optionsKey: "targetPublics" },
    { key: "funnelEntryAction", label: "Acción de entrada al embudo", type: "single", optionsKey: "funnelActions" },
    { key: "captureFields", label: "Datos mínimos a capturar", type: "multi", optionsKey: "dataFields" },
    { key: "qualificationFilters", label: "Cómo filtrar leads", type: "multi", optionsKey: "filters" },
    { key: "hotLeadActions", label: "Qué vuelve caliente al lead", type: "multi", optionsKey: "hotActions" },
    { key: "postCaptureAction", label: "Qué pasa después de capturar", type: "multi", optionsKey: "nextActions" },
  ] },
  { id: "type", kicker: "Paso 4", title: "Tipo de campaña", help: "El sistema traduce tu objetivo a un tipo compatible con el portal y conserva el detalle estratégico en la estrategia.", fields: [
    { key: "campaignType", label: "Tipo recomendado", type: "single", options: ["GAME", "FORM", "LANDING", "EVENT", "SOCIAL", "MIXED"] },
  ] },
  { id: "dynamic", kicker: "Paso 5", title: "Dinámica gamificada", help: "Elige la experiencia que hará que la campaña sea recordable, medible y accionable.", fields: [
    { key: "dynamic", label: "Experiencia", type: "single", optionsKey: "dynamics" },
  ] },
  { id: "reward", kicker: "Paso 6", title: "Beneficio o recompensa", help: "Define qué valor recibe el participante y cómo se valida.", fields: [
    { key: "rewardType", label: "Beneficio", type: "single", optionsKey: "rewards" },
    { key: "rewardValue", label: "Valor aproximado del beneficio", type: "number", placeholder: "50000" },
    { key: "rewardCapacity", label: "Personas que podrán recibirlo", type: "number", placeholder: "100" },
    { key: "rewardExpires", label: "Vencimiento", type: "text", placeholder: "Ej: 30 días después de emitido" },
    { key: "requiresValidation", label: "Requiere validación interna", type: "single", options: ["Sí", "No"] },
    { key: "redemptionMethod", label: "Dónde se redime", type: "single", optionsKey: "validationMethods" },
  ] },
  { id: "channels", kicker: "Paso 7", title: "Canales", help: "Selecciona dónde se moverá la campaña para generar volumen.", fields: [
    { key: "channels", label: "Canales", type: "multi", optionsKey: "channels" },
  ] },
  { id: "dates", kicker: "Paso 8", title: "Fechas y duración", help: "La duración debe permitir suficiente volumen para medir comportamiento.", fields: [
    { key: "startDate", label: "Fecha inicio", type: "date" },
    { key: "endDate", label: "Fecha cierre", type: "date" },
    { key: "cadence", label: "Tipo de duración", type: "single", optionsKey: "campaignCadence" },
  ] },
  { id: "budget", kicker: "Paso 9", title: "Presupuesto", help: "No incluyas solo dinero en caja: suma descuentos, regalos, productos entregados y tiempo del equipo.", fields: [
    { key: "productionCost", label: "Producción", type: "number", placeholder: "0" },
    { key: "benefitCost", label: "Beneficios", type: "number", placeholder: "0" },
    { key: "serviceCost", label: "Servicios / personal", type: "number", placeholder: "0" },
    { key: "otherCost", label: "Otros costos", type: "number", placeholder: "0" },
  ] },
  { id: "goals", kicker: "Paso 10", title: "Metas", help: "Una campaña no debe medirse solo por alcance. Define cuántos leads, ventas o redenciones necesitas para que valga la pena.", fields: [
    { key: "salesGoal", label: "Meta comercial en ventas", type: "number", placeholder: "0" },
    { key: "leadsGoal", label: "Leads esperados", type: "number", placeholder: "100" },
    { key: "redemptionsGoal", label: "Redenciones esperadas", type: "number", placeholder: "30" },
    { key: "avgTicket", label: "Ticket promedio esperado", type: "number", placeholder: "100000" },
    { key: "profitPercent", label: "Ganancia esperada sobre costo (%)", type: "number", placeholder: "30" },
    { key: "conversionRate", label: "Conversión lead a venta (%)", type: "number", placeholder: "10" },
    { key: "redemptionRate", label: "Redención esperada (%)", type: "number", placeholder: "40" },
  ] },
  { id: "assets", kicker: "Paso 11", title: "URLs y activos", help: "Define los activos que necesita la experiencia para funcionar de forma trazable.", fields: [
    { key: "hasLanding", label: "Tendrá landing", type: "single", options: ["Sí", "No"] },
    { key: "hasGame", label: "Tendrá juego o formulario", type: "single", options: ["Sí", "No"] },
    { key: "hasValidator", label: "Usará validación interna", type: "single", options: ["Sí", "No"] },
    { key: "hasDigitalAsset", label: "Incluye activo descargable", type: "single", options: ["Sí", "No"] },
    { key: "digitalAssetUrl", label: "URL de descarga o archivo", type: "text", placeholder: "https://..." },
  ] },
  { id: "tickets", kicker: "Paso 12", title: "Tickets y lógica interna", help: "MarketGames usa tickets operativos para trazabilidad, beneficios, redenciones y seguimiento.", fields: [
    { key: "maxParticipants", label: "Participaciones máximas", type: "number", placeholder: "300" },
    { key: "participationFrequency", label: "Frecuencia", type: "single", options: ["Una vez por persona", "Varias veces", "Una vez por día", "Por compra"] },
    { key: "ticketLogic", label: "Cuándo se genera ticket", type: "multi", optionsKey: "ticketTypes" },
    { key: "ticketExpires", label: "Los tickets vencen", type: "single", options: ["Sí", "No"] },
    { key: "ticketAfterUse", label: "Qué pasa al usarlo", type: "text", placeholder: "Ej: se marca redimido y se activa seguimiento" },
  ] },
  { id: "delivery", kicker: "Paso 13", title: "Notas de entrega", help: "Genera instrucciones operativas para que el equipo pueda ejecutar sin improvisar.", fields: [
    { key: "deliveryNotes", label: "Observaciones operativas", type: "textarea", placeholder: "Piezas, validación, mensajes, fechas críticas..." },
  ] },
  { id: "summary", kicker: "Paso 14", title: "Resumen estratégico final", help: "Revisa, optimiza y genera la campaña en borrador.", fields: [
    { key: "finalSummary", type: "summary" },
  ] },
];

function defaultStrategyWizardAnswers() {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 86400000);
  return {
    acquisitionMode: "Masiva",
    captureFields: ["Nombre", "WhatsApp", "Empresa", "Sector", "Necesidad principal"],
    qualificationFilters: ["Por sector", "Por urgencia", "Por interacción con el juego"],
    hotLeadActions: ["Pidió diagnóstico", "Agendó demo", "Solicitó cotización"],
    postCaptureAction: ["Enviar WhatsApp automático", "Clasificar en CRM", "Crear tarea comercial"],
    channels: ["Instagram", "WhatsApp"],
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    cadence: "Mensual",
    profitPercent: 30,
    conversionRate: 10,
    redemptionRate: 40,
    maxParticipants: 300,
    participationFrequency: "Una vez por persona",
    ticketLogic: ["Lead ticket", "Reward ticket", "Redemption ticket"],
    ticketExpires: "Sí",
    requiresValidation: "Sí",
    hasLanding: "Sí",
    hasGame: "Sí",
    hasValidator: "Sí",
  };
}

function strategyWizardAnswer(key, fallback = "") {
  return state.strategyWizardAnswers?.[key] ?? fallback;
}

function setStrategyWizardAnswer(key, value) {
  state.strategyWizardAnswers = { ...(state.strategyWizardAnswers || {}), [key]: value };
}

function strategyWizardOptions(field) {
  return field.options || STRATEGY_WIZARD_OPTIONS[field.optionsKey] || [];
}

function strategyWizardCurrentStep() {
  return STRATEGY_WIZARD_STEPS[state.strategyWizardStep] || STRATEGY_WIZARD_STEPS[0];
}

function applyStrategyTemplate(templateId) {
  const template = STRATEGY_WIZARD_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return;
  state.strategyWizardAnswers = {
    ...state.strategyWizardAnswers,
    sector: template.sector,
    objective: template.objective,
    dynamic: template.dynamic,
    leadMagnet: template.magnet,
    channels: template.channels,
    cadence: template.days <= 10 ? "Activación relámpago" : template.days >= 60 ? "Permanente" : "Mensual",
    ticketLogic: template.tickets,
  };
  const start = new Date();
  const end = new Date(start.getTime() + template.days * 86400000);
  setStrategyWizardAnswer("startDate", start.toISOString().slice(0, 10));
  setStrategyWizardAnswer("endDate", end.toISOString().slice(0, 10));
}

function strategyRecommendedType(objective = strategyWizardAnswer("objective")) {
  const text = normalizeInventoryLookup(objective);
  if (text.includes("refer")) return "GAME";
  if (text.includes("recompra") || text.includes("fidel")) return "MIXED";
  if (text.includes("evento") || text.includes("punto")) return "EVENT";
  if (text.includes("giftcard") || text.includes("beneficio")) return "LANDING";
  if (text.includes("lead") || text.includes("base")) return "FORM";
  return "MIXED";
}

function strategyRecommendedDynamic(answers = state.strategyWizardAnswers || {}) {
  const sector = normalizeInventoryLookup(answers.sector);
  const objective = normalizeInventoryLookup(answers.objective);
  if (objective.includes("refer")) return "Reto de referidos";
  if (objective.includes("recompra") || objective.includes("fidel")) return sector.includes("restaurante") ? "Club de puntos" : "Activación elegante sin juego visible";
  if (objective.includes("evento")) return "Batalla naval";
  if (objective.includes("lead") || objective.includes("base")) return answers.leadMagnet?.includes("Ebook") ? "Captura relámpago de leads" : "Batalla naval";
  if (sector.includes("restaurante") || sector.includes("retail")) return "Ruleta de premios";
  return "Trivia de marca";
}

function internalGrowthNudge(answers = state.strategyWizardAnswers || {}) {
  const suggestions = [];
  const mode = normalizeInventoryLookup(answers.acquisitionMode);
  const objective = normalizeInventoryLookup(answers.objective);
  const dynamic = normalizeInventoryLookup(answers.dynamic);
  if (mode.includes("manual")) suggestions.push({ key: "scale-mode", visible: "Convertir esta idea en una campaña semimasiva con una excusa de valor para atraer más participantes y priorizar los interesados." });
  if (!answers.leadMagnet) suggestions.push({ key: "lead-magnet", visible: "Agregar un lead magnet para que la captura tenga una razón clara de participación." });
  if (!dynamic || dynamic.includes("form")) suggestions.push({ key: "experience", visible: "Agregar una dinámica simple para aumentar participación, trazabilidad y recordación." });
  if (objective.includes("crecimiento") || objective.includes("lead") || objective.includes("refer")) suggestions.push({ key: "referral", visible: "Incluir referidos o compartir campaña para ampliar alcance sin depender solo de pauta." });
  if (objective.includes("venta") || objective.includes("punto") || objective.includes("recompra")) suggestions.push({ key: "redemption", visible: "Asociar un beneficio redimible para medir visitas, redenciones y cierre comercial." });
  if (!answers.hasLanding || answers.hasLanding === "No") suggestions.push({ key: "landing", visible: "Crear una landing o link principal para centralizar tráfico y medir resultados." });
  if (!answers.hasValidator || answers.hasValidator === "No") suggestions.push({ key: "validator", visible: "Definir un método de validación para controlar beneficios y redenciones." });
  if (!Array.isArray(answers.postCaptureAction) || !answers.postCaptureAction.length) suggestions.push({ key: "follow-up", visible: "Agregar atención relámpago para separar leads fríos, tibios y calientes." });
  return suggestions.slice(0, 5);
}

function strategyBudgetTotals(answers = state.strategyWizardAnswers || {}) {
  const production = Number(answers.productionCost || 0);
  const benefit = Number(answers.benefitCost || 0);
  const services = Number(answers.serviceCost || 0);
  const other = Number(answers.otherCost || 0);
  const total = Math.max(0, production + benefit + services + other);
  const profit = total * Number(answers.profitPercent || 30) / 100;
  const salesGoal = Number(answers.salesGoal || 0) || total + profit;
  const avgTicket = Number(answers.avgTicket || 0);
  const conversion = Number(answers.conversionRate || 10);
  const redemptions = Number(answers.redemptionsGoal || 0) || Math.ceil(Number(answers.maxParticipants || 100) * Number(answers.redemptionRate || 40) / 100);
  const salesNeeded = avgTicket ? Math.ceil(salesGoal / avgTicket) : 0;
  const leadsNeeded = conversion ? Math.ceil(salesNeeded / (conversion / 100)) : Number(answers.leadsGoal || 0);
  return {
    production,
    benefit,
    services,
    other,
    total,
    salesGoal,
    redemptions,
    salesNeeded,
    leadsNeeded: Number(answers.leadsGoal || 0) || leadsNeeded,
    costPerLead: leadsNeeded ? total / leadsNeeded : 0,
    costPerSale: salesNeeded ? total / salesNeeded : 0,
    roi: total ? ((salesGoal - total) / total) * 100 : 0,
  };
}

function strategyScore(answers = state.strategyWizardAnswers || {}) {
  const totals = strategyBudgetTotals(answers);
  let score = 45;
  if (totals.total > 0) score += 10;
  if (totals.salesGoal >= totals.total * 1.2) score += 15;
  if (Number(answers.conversionRate || 0) >= 8) score += 10;
  if (Number(answers.redemptionRate || 0) <= 70) score += 8;
  if ((answers.channels || []).length >= 3) score += 8;
  if ((answers.ticketLogic || []).length >= 2) score += 6;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    label: score >= 75 ? "Verde" : score >= 50 ? "Amarillo" : "Rojo",
    tone: score >= 75 ? "ok" : score >= 50 ? "warning" : "danger",
  };
}

function buildStrategyText(answers = state.strategyWizardAnswers || {}) {
  const name = strategyCampaignName(answers);
  const channels = (answers.channels || []).join(", ") || "canales digitales y comerciales";
  const tickets = (answers.ticketLogic || []).join(", ") || "Lead ticket, Reward ticket y Redemption ticket";
  const filters = (answers.qualificationFilters || []).join(", ") || "interacción, urgencia e interés";
  return `Título:\n${name}\n\nObjetivo:\n${strategyObjectiveText(answers)}\n\nInsight:\n${answers.businessName || "El negocio"} puede dejar de depender de acciones manuales si convierte su oferta en una experiencia que atrae, captura y filtra prospectos con intención.\n\nMecánica:\n${answers.dynamic || strategyRecommendedDynamic(answers)} con ${answers.leadMagnet || "beneficio desbloqueable"} para que la persona ${String(answers.funnelEntryAction || "se registre").toLowerCase()}, participe y avance hacia una acción comercial medible.\n\nRecompensa:\n${answers.rewardType || "Beneficio redimible"} con valor aproximado de ${money(answers.rewardValue || 0)} y capacidad estimada de ${answers.rewardCapacity || answers.redemptionsGoal || "por definir"} participantes.\n\nCanales:\n${channels}.\n\nFlujo del usuario:\n1. Ve la campaña.\n2. Entra al link o landing.\n3. Deja datos mínimos.\n4. Participa en la dinámica.\n5. Desbloquea beneficio o contenido.\n6. Redime, descarga o agenda.\n7. Recibe seguimiento.\n8. Puede comprar, volver o referir.\n\nFlujo interno:\n1. Se captura lead.\n2. Se genera ticket interno.\n3. Se registra participación.\n4. Se asigna beneficio.\n5. Se valida redención.\n6. Se mide resultado.\n7. Se activa seguimiento comercial.\n\nMétricas:\nLeads, participaciones, redenciones, ventas, recompra, referidos, costo por lead, costo por redención y ROI.\n\nScoring y calificación:\nLead frío 0-30, tibio 31-70 y caliente 71-100. Filtrar por ${filters}. Criterios calientes: ${(answers.hotLeadActions || []).join(", ") || "diagnóstico, demo, cotización o redención"}.\n\nTickets internos sugeridos:\n${tickets}.\n\nRecomendaciones:\n${internalGrowthNudge(answers).map((item) => `- ${item.visible}`).join("\n") || "- Lanzar como piloto medible y revisar conversión semanalmente."}`;
}

function strategyObjectiveText(answers = state.strategyWizardAnswers || {}) {
  const objective = answers.objective || "Captar nuevos leads";
  if (normalizeInventoryLookup(objective).includes("lead")) return "Captar nuevos leads y convertirlos en oportunidades calificadas mediante una experiencia gamificada con entrega de valor y seguimiento comercial.";
  if (normalizeInventoryLookup(objective).includes("recompra")) return "Aumentar recompra activando clientes actuales con una dinámica de beneficio, trazabilidad y seguimiento postparticipación.";
  if (normalizeInventoryLookup(objective).includes("refer")) return "Activar referidos medibles para que los participantes ayuden a traer nuevos prospectos con incentivo controlado.";
  return `${objective} mediante una campaña RMS con captura, beneficio, activación gamificada y medición de resultados.`;
}

function strategyCampaignName(answers = state.strategyWizardAnswers || {}) {
  if (answers.campaignName) return answers.campaignName;
  const brand = answers.businessName || "MarketGames";
  const objective = normalizeInventoryLookup(answers.objective || "");
  const prefix = objective.includes("recompra") ? "Reto de Recompra" : objective.includes("refer") ? "Reto de Referidos" : objective.includes("lead") ? "Captura Relámpago" : "Campaña Gamificada";
  return `${prefix} ${brand}`.trim();
}

function strategySlug(answers = state.strategyWizardAnswers || {}) {
  return slugify(strategyCampaignName(answers));
}

function strategyClientNotes(answers = state.strategyWizardAnswers || {}) {
  return [
    `Contexto: ${answers.businessName || "Negocio"} vende ${answers.mainProduct || "productos o servicios"} en sector ${answers.sector || "por definir"}.`,
    `Alcance: ${answers.scope || "por definir"} para ${answers.audienceBase || "clientes actuales y nuevos"}.`,
    `Masificación: ${answers.acquisitionMode || "Masiva"} con ${answers.leadMagnet || "excusa de valor"} para atraer ${answers.targetPublic || "prospectos"}.`,
    `Datos mínimos sugeridos: ${(answers.captureFields || []).join(", ") || "Nombre, WhatsApp, sector y necesidad principal"}.`,
    `Acción posterior: ${(answers.postCaptureAction || []).join(", ") || "Clasificar en CRM y activar seguimiento"}.`,
  ].join("\n");
}

function strategyAssetNotes(answers = state.strategyWizardAnswers || {}) {
  const score = strategyScore(answers);
  return [
    "Qué debe configurarse: landing/link principal, dinámica, beneficio, validación y seguimiento comercial.",
    `Piezas necesarias: ${answers.leadMagnet || "lead magnet"}, creativos para ${(answers.channels || []).join(", ") || "canales seleccionados"} y mensajes de WhatsApp.`,
    `Beneficio: ${answers.rewardType || "por definir"} con vencimiento ${answers.rewardExpires || "por definir"}.`,
    `Validación: ${answers.requiresValidation || "Sí"} por ${answers.redemptionMethod || "URL interna de validación"}.`,
    `Tickets internos sugeridos: ${(answers.ticketLogic || []).join(", ") || "Lead ticket, Reward ticket, Redemption ticket"}.`,
    `Métricas críticas: leads, participaciones, redenciones, ventas, referidos, costo por lead, costo por venta y ROI.`,
    `Semáforo: ${score.label}. ${strategyScoreRecommendation(score, answers)}`,
    `Atención relámpago: fríos reciben contenido educativo; tibios reciben caso de uso e invitación a diagnóstico; calientes se asignan a asesor con WhatsApp prioritario.`,
    answers.deliveryNotes || "",
  ].filter(Boolean).join("\n");
}

function strategyScoreRecommendation(score, answers = state.strategyWizardAnswers || {}) {
  if (score.tone === "ok") return "Campaña viable; lanzar con seguimiento diario de leads calientes y redenciones.";
  if (score.tone === "warning") return "Campaña posible; ajustar costo de beneficio, canales o conversión antes de escalar.";
  return "Campaña riesgosa; conviene hacer piloto de 15 días, reducir descuento o usar activo digital en vez de obsequio físico.";
}

function strategyUrls(slug = strategySlug()) {
  const base = "https://www.marketgamesqr.com";
  return {
    landing_url: `${base}/campana/${slug}`,
    validator_url: `${base}/validar/${slug}`,
    game_url: `${base}/jugar/${slug}`,
    primary_link: `${base}/campana/${slug}`,
    qr_landing_url: `${base}/ticket/${slug}`,
  };
}

function buildStrategyCampaignPayload(answers = state.strategyWizardAnswers || {}) {
  const totals = strategyBudgetTotals(answers);
  const slug = strategySlug(answers);
  const urls = strategyUrls(slug);
  return {
    name: strategyCampaignName(answers),
    slug,
    type: answers.campaignType || strategyRecommendedType(answers.objective),
    status: "DRAFT",
    objective: strategyObjectiveText(answers),
    strategy_summary: buildStrategyText(answers),
    budget_total: totals.total,
    expected_sales_goal: totals.salesGoal,
    expected_leads_goal: totals.leadsNeeded,
    expected_redemptions_goal: totals.redemptions,
    starts_at: answers.startDate ? `${answers.startDate}T09:00` : "",
    ends_at: answers.endDate ? `${answers.endDate}T18:00` : "",
    launch_channels: answers.channels?.length ? answers.channels : ["Instagram", "WhatsApp"],
    client_notes: strategyClientNotes(answers),
    delivered_assets: {
      landing_url: answers.hasLanding === "No" ? "" : urls.landing_url,
      validator_url: answers.hasValidator === "No" ? "" : urls.validator_url,
      game_url: answers.hasGame === "No" ? "" : urls.game_url,
      primary_link: urls.primary_link,
      qr_landing_url: urls.qr_landing_url,
      creative_notes: strategyAssetNotes(answers),
    },
    score: strategyScore(answers),
  };
}

function renderStrategyWizardField(field) {
  const value = strategyWizardAnswer(field.key, field.type === "multi" ? [] : "");
  if (field.type === "note") return `<div class="strategy-wizard-note">${escapeHtml(field.text || "")}</div>`;
  if (field.type === "templates") {
    return `<div class="strategy-wizard-field span-2"><span>${escapeHtml(field.label)}</span><div class="strategy-template-grid">${STRATEGY_WIZARD_TEMPLATES.map((template) => `<button class="strategy-option-card" data-strategy-template="${escapeHtml(template.id)}" type="button"><strong>${escapeHtml(template.title)}</strong><small>${escapeHtml(template.objective)} · ${escapeHtml(template.dynamic)}</small></button>`).join("")}</div></div>`;
  }
  if (field.type === "single" || field.type === "multi") {
    const values = Array.isArray(value) ? value : [value].filter(Boolean);
    return `<div class="strategy-wizard-field span-2"><span>${escapeHtml(field.label)}</span><div class="strategy-option-grid">${strategyWizardOptions(field).map((option) => `<button class="strategy-option-card ${values.includes(option) ? "selected" : ""}" data-strategy-field="${escapeHtml(field.key)}" data-strategy-mode="${field.type}" data-strategy-value="${escapeHtml(option)}" type="button">${escapeHtml(option)}</button>`).join("")}</div></div>`;
  }
  if (field.type === "summary") return `<div class="strategy-wizard-final">${renderStrategyWizardFinalSummary()}</div>`;
  if (field.type === "textarea") return `<label class="strategy-wizard-field span-2"><span>${escapeHtml(field.label)}</span><textarea data-strategy-input="${escapeHtml(field.key)}" rows="5" placeholder="${escapeHtml(field.placeholder || "")}">${escapeHtml(value || "")}</textarea></label>`;
  return `<label class="strategy-wizard-field"><span>${escapeHtml(field.label)}</span><input data-strategy-input="${escapeHtml(field.key)}" type="${field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(field.placeholder || "")}"></label>`;
}

function renderStrategyWizard() {
  if (!campaignStrategyWizardModal || !strategyWizardStepBody) return;
  const step = strategyWizardCurrentStep();
  const total = STRATEGY_WIZARD_STEPS.length;
  strategyWizardProgressText.textContent = `Paso ${state.strategyWizardStep + 1} de ${total}`;
  strategyWizardProgressBar.style.width = `${Math.round(((state.strategyWizardStep + 1) / total) * 100)}%`;
  strategyWizardStepKicker.textContent = step.kicker;
  strategyWizardStepTitle.textContent = step.title;
  strategyWizardStepHelp.textContent = step.help;
  strategyWizardStepBody.innerHTML = step.fields.map(renderStrategyWizardField).join("");
  strategyWizardBackButton.disabled = state.strategyWizardStep === 0;
  strategyWizardNextButton.textContent = state.strategyWizardStep === total - 1 ? "Aplicar al formulario" : "Continuar";
  renderStrategyWizardSummary();
  bindStrategyWizardStepEvents();
}

function renderStrategyWizardSummary() {
  if (!strategyWizardSummary) return;
  const payload = buildStrategyCampaignPayload();
  const totals = strategyBudgetTotals();
  const nudges = internalGrowthNudge();
  strategyWizardSummary.innerHTML = `
    <strong>${escapeHtml(payload.name)}</strong>
    <dl>
      <div><dt>Tipo</dt><dd>${escapeHtml(payload.type)}</dd></div>
      <div><dt>Objetivo</dt><dd>${escapeHtml(payload.objective)}</dd></div>
      <div><dt>Dinámica</dt><dd>${escapeHtml(strategyWizardAnswer("dynamic", strategyRecommendedDynamic()))}</dd></div>
      <div><dt>Presupuesto</dt><dd>${escapeHtml(money(totals.total))}</dd></div>
      <div><dt>Meta ventas</dt><dd>${escapeHtml(money(totals.salesGoal))}</dd></div>
      <div><dt>Leads</dt><dd>${Number(totals.leadsNeeded || 0).toLocaleString("es-CO")}</dd></div>
      <div><dt>Redenciones</dt><dd>${Number(totals.redemptions || 0).toLocaleString("es-CO")}</dd></div>
      <div><dt>Semáforo</dt><dd><span class="status-chip ${payload.score.tone === "ok" ? "ok" : payload.score.tone === "danger" ? "danger" : "pending"}">${escapeHtml(payload.score.label)} · ${payload.score.score}/100</span></dd></div>
    </dl>
    <div class="strategy-wizard-recommendations">
      <span class="mono-label">Mejoras sugeridas</span>
      ${nudges.map((item) => `<p>${escapeHtml(item.visible)}</p>`).join("") || "<p>La estructura tiene una base suficiente para crear borrador.</p>"}
    </div>
  `;
}

function renderStrategyWizardFinalSummary() {
  const payload = buildStrategyCampaignPayload();
  const recommendations = internalGrowthNudge().map((item) => `<li>${escapeHtml(item.visible)}</li>`).join("");
  return `
    <section>
      <h4>${escapeHtml(payload.name)}</h4>
      <p>${escapeHtml(payload.objective)}</p>
      <div class="strategy-final-grid">
        <div><span class="mono-label">Slug</span><strong>${escapeHtml(payload.slug)}</strong></div>
        <div><span class="mono-label">Tipo</span><strong>${escapeHtml(payload.type)}</strong></div>
        <div><span class="mono-label">Presupuesto</span><strong>${escapeHtml(money(payload.budget_total))}</strong></div>
        <div><span class="mono-label">Meta comercial</span><strong>${escapeHtml(money(payload.expected_sales_goal))}</strong></div>
        <div><span class="mono-label">Leads</span><strong>${Number(payload.expected_leads_goal || 0).toLocaleString("es-CO")}</strong></div>
        <div><span class="mono-label">Redenciones</span><strong>${Number(payload.expected_redemptions_goal || 0).toLocaleString("es-CO")}</strong></div>
      </div>
      <h4>Riesgos y recomendaciones</h4>
      <ul>${recommendations || "<li>Lanzar como borrador y revisar presupuesto antes de activar.</li>"}</ul>
    </section>
  `;
}

function bindStrategyWizardStepEvents() {
  strategyWizardStepBody?.querySelectorAll("[data-strategy-input]").forEach((input) => {
    input.addEventListener("input", () => {
      setStrategyWizardAnswer(input.dataset.strategyInput, input.value);
      autoCompleteStrategyWizard();
      renderStrategyWizardSummary();
    });
  });
  strategyWizardStepBody?.querySelectorAll("[data-strategy-field]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.strategyField;
      const option = button.dataset.strategyValue;
      const mode = button.dataset.strategyMode;
      if (mode === "multi") {
        const current = Array.isArray(strategyWizardAnswer(key)) ? [...strategyWizardAnswer(key)] : [];
        setStrategyWizardAnswer(key, current.includes(option) ? current.filter((item) => item !== option) : [...current, option]);
      } else {
        setStrategyWizardAnswer(key, option);
      }
      autoCompleteStrategyWizard();
      renderStrategyWizard();
    });
  });
  strategyWizardStepBody?.querySelectorAll("[data-strategy-template]").forEach((button) => {
    button.addEventListener("click", () => {
      applyStrategyTemplate(button.dataset.strategyTemplate);
      autoCompleteStrategyWizard();
      renderStrategyWizard();
    });
  });
}

function autoCompleteStrategyWizard() {
  const answers = state.strategyWizardAnswers || {};
  if (!answers.campaignType) setStrategyWizardAnswer("campaignType", strategyRecommendedType(answers.objective));
  if (!answers.dynamic) setStrategyWizardAnswer("dynamic", strategyRecommendedDynamic(answers));
  if (!answers.campaignName && answers.businessName) setStrategyWizardAnswer("campaignName", strategyCampaignName({ ...answers, campaignName: "" }));
  if (!answers.leadsGoal && answers.avgTicket && answers.salesGoal && answers.conversionRate) {
    const salesNeeded = Math.ceil(Number(answers.salesGoal || 0) / Number(answers.avgTicket || 1));
    setStrategyWizardAnswer("leadsGoal", Math.ceil(salesNeeded / (Number(answers.conversionRate || 10) / 100)));
  }
}

function saveStrategyWizardDraft() {
  try {
    window.localStorage?.setItem(STRATEGY_WIZARD_DRAFT_KEY, JSON.stringify(state.strategyWizardAnswers || {}));
    setFormMessage(strategyWizardMessage, "Borrador guardado.", "success");
  } catch (error) {
    setFormMessage(strategyWizardMessage, "No se pudo guardar el borrador local.", "error");
  }
}

function loadStrategyWizardDraft() {
  try {
    const raw = window.localStorage?.getItem(STRATEGY_WIZARD_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function openStrategyWizard({ fromScratch = false } = {}) {
  state.strategyWizardStep = 0;
  state.strategyWizardAnswers = fromScratch ? defaultStrategyWizardAnswers() : { ...defaultStrategyWizardAnswers(), ...(loadStrategyWizardDraft() || {}) };
  autoCompleteStrategyWizard();
  campaignStrategyWizardModal?.classList.remove("hidden");
  setFormMessage(strategyWizardMessage, "", "info");
  renderStrategyWizard();
}

function closeStrategyWizard() {
  campaignStrategyWizardModal?.classList.add("hidden");
  setFormMessage(strategyWizardMessage, "", "info");
}

function validateStrategyWizardPayload(payload = buildStrategyCampaignPayload()) {
  if (!payload.name.trim()) return "El nombre de campaña es requerido.";
  if (!payload.objective.trim()) return "El objetivo es requerido.";
  if (payload.budget_total < 0 || payload.expected_leads_goal < 0 || payload.expected_redemptions_goal < 0) return "Presupuesto y metas no pueden ser negativos.";
  if (payload.starts_at && payload.ends_at && new Date(payload.ends_at) <= new Date(payload.starts_at)) return "La fecha de cierre debe ser posterior a la fecha de inicio.";
  const maxParticipants = Number(strategyWizardAnswer("maxParticipants") || 0);
  if (maxParticipants && Number(payload.expected_redemptions_goal || 0) > maxParticipants) return "Meta redenciones no puede superar las participaciones máximas.";
  if (strategyWizardAnswer("requiresValidation") === "Sí" && !payload.delivered_assets.validator_url && !strategyWizardAnswer("redemptionMethod")) return "Si hay beneficio redimible, define validación o método de validación.";
  if (strategyWizardAnswer("hasDigitalAsset") === "Sí" && !strategyWizardAnswer("digitalAssetUrl")) return "Si hay activo digital, agrega URL o archivo de descarga.";
  if (strategyWizardAnswer("hasGame") === "Sí" && !payload.delivered_assets.game_url) return "Si hay juego o formulario, debe existir una URL sugerida o generada.";
  if (normalizeInventoryLookup(strategyWizardAnswer("objective")).includes("refer") && !(strategyWizardAnswer("ticketLogic") || []).includes("Referral ticket")) return "Si es campaña de referidos, incluye lógica de referido.";
  if (normalizeInventoryLookup(strategyWizardAnswer("rewardType")).includes("giftcard") && (!strategyWizardAnswer("rewardValue") || !strategyWizardAnswer("rewardExpires"))) return "Si eliges giftcard, define valor nominal y vencimiento.";
  return "";
}

function applyStrategyWizardToCampaignForm() {
  autoCompleteStrategyWizard();
  const payload = buildStrategyCampaignPayload();
  const validationMessage = validateStrategyWizardPayload(payload);
  if (validationMessage) {
    setFormMessage(strategyWizardMessage, validationMessage, "error");
    return false;
  }
  closeStrategyWizard();
  openCampaignModal("create");
  campaignFormName.value = payload.name;
  campaignFormSlug.value = payload.slug;
  campaignFormSlug.dataset.generatedFrom = payload.name;
  campaignFormType.value = payload.type;
  campaignFormStatus.value = payload.status;
  campaignFormObjective.value = payload.objective;
  campaignFormStrategy.value = payload.strategy_summary;
  campaignFormBudget.value = Math.round(payload.budget_total || 0);
  campaignFormGoal.value = Math.round(payload.expected_sales_goal || 0);
  campaignFormLeadsGoal.value = Math.round(payload.expected_leads_goal || 0);
  campaignFormRedemptionsGoal.value = Math.round(payload.expected_redemptions_goal || 0);
  campaignFormStartsAt.value = payload.starts_at;
  campaignFormEndsAt.value = payload.ends_at;
  setCheckedValues(campaignFormLaunchChannels, payload.launch_channels);
  campaignFormClientNotes.value = payload.client_notes;
  campaignFormLandingUrl.value = payload.delivered_assets.landing_url;
  campaignFormValidatorUrl.value = payload.delivered_assets.validator_url;
  campaignFormGameUrl.value = payload.delivered_assets.game_url;
  campaignFormPrimaryLink.value = payload.delivered_assets.primary_link;
  campaignFormQrLandingUrl.value = payload.delivered_assets.qr_landing_url;
  campaignFormAssetNotes.value = payload.delivered_assets.creative_notes;
  state.campaignModalInitialSnapshot = campaignModalSnapshot();
  setInlineMessage(campaignModalMessage, "Campaña generada por el ayudador. Revisa y guarda como borrador cuando esté lista.", "success");
  return true;
}

function openCampaignModal(mode) {
  if (mode === "edit" && !state.selectedCampaign) {
    showFeedback("Selecciona una campaña antes de editar.", "error");
    return;
  }

  if (!canManageCampaigns()) {
    showFeedback("Tu plan actual no permite crear o editar campañas desde el portal.", "info", { title: "Campañas bloqueadas" });
    return;
  }

  if (mode === "create" && !session?.user?.business_id) {
    setView("admin");
    showFeedback("El admin global necesita un negocio objetivo para crear campañas. Usa `/admin` o entra con un negocio asignado.", "error");
    return;
  }

  state.campaignModalMode = mode;
  campaignModalMode.textContent = mode === "create" ? "New Campaign" : "Edit Campaign";
  campaignModalTitle.textContent = mode === "create" ? "Crear campaña" : "Editar campaña";
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
    const discard = window.confirm("Tienes cambios sin guardar en esta campaña. Si cierras ahora se perderá el progreso. Deseas cerrar de todos modos?");
    if (!discard) {
      setInlineMessage(campaignModalMessage, "No cerramos el formulario. Tus datos siguen ahí; guarda la campaña o cancela cuando estes seguro.", "info");
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
    campaignModalMessage.textContent = "Escribe un nombre de campaña para generar el slug.";
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
      showFeedback("Campaña creada. Ya aparece en el listado y queda disponible para asociar tickets, afiliados y paquetes.", "success", { title: "Campaña disponible", timeout: 6500 });
    } else {
      await api(`${isAdmin() ? "/api/admin" : "/api/business"}/campaigns/${state.selectedCampaignId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      showFeedback("Campaña actualizada. Los cambios ya se reflejan en el dashboard y en los selectores de tickets.", "success", { title: "Campaña sincronizada", timeout: 6500 });
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
    ${tooltipRow("Participación", `${safeRate(item.row.value, item.total)}%`)}
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
  drawLabel(ctx, "Inversión o Tickets generados", margin.left + chartW / 2, height - 10, { align: "center", size: 10 });
  drawLabel(ctx, "Revenue / ventas", 12, margin.top + chartH / 2, { size: 10 });
  attachChartHover(canvas, hoverItems, (item) => `
    <div class="chart-tooltip-title">${escapeHtml(item.row.campaign_name)}</div>
    ${tooltipRow("Revenue", money(item.row.revenue))}
    ${tooltipRow("Leads", item.row.leads)}
    ${tooltipRow("Redención", `${item.row.redemption_rate}%`)}
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

async function shareTicketQrFile({ filename, dataUrl, text }) {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], filenameForDataUrl(filename, dataUrl), { type: blob.type || "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Ticket QR Market Games",
      text,
      files: [file],
    });
    showFeedback("Ticket QR compartido como imagen.", "success", { title: "Ticket QR" });
    return true;
  }

  triggerBlobDownload(file.name, blob);
  showFeedback("Tu navegador no permite compartir archivos directamente. Se descargo el ticket QR para adjuntarlo en WhatsApp.", "info", { title: "Ticket QR descargado" });
  return false;
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

function isPanoInglesBusinessName(value) {
  const slug = slugify(value);
  return slug.includes("pano-ingles") || slug.includes("panos-ingles");
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
  const digitalUrl = affiliateDigitalCardUrl(affiliate);
  return `Negocio: ${businessProfile.name || "-"} | Documento: ${documentId} | Puntos: ${points} | Carnet digital: ${digitalUrl ? "activo" : "sin link"} | Token: ${qrToken ? `${qrToken}...` : "sin token"}`;
}

function renderAffiliateSelectedSummary(affiliate = null) {
  if (!affiliateSelectedSummary) return;
  if (!affiliate) {
    affiliateSelectedSummary.innerHTML = '<div class="affiliate-selected-empty">Ningun afiliado seleccionado.</div>';
    return;
  }
  const businessProfile = businessCardProfile(affiliate);
  const qrToken = String(affiliate.qr_token || "");
  const digitalUrl = affiliateDigitalCardUrl(affiliate);
  const rows = [
    ["Afiliado", firstTextValue(affiliate.full_name, affiliate.name, "-")],
    ["Documento", firstTextValue(affiliate.document_id, affiliate.document, "-")],
    ["Teléfono", firstTextValue(affiliate.phone, "-")],
    ["Email", firstTextValue(affiliate.email, "-")],
    ["Puntos", toNumber(affiliate.points_total || affiliate.ledger_points || 0)],
    ["Negocio", firstTextValue(businessProfile.name, affiliate.business_name, "-")],
    ["Carnet digital", digitalUrl || "-"],
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

function affiliateDigitalCardUrl(affiliate = {}) {
  if (affiliate.digital_card_url) return affiliate.digital_card_url;
  const token = String(affiliate.qr_token || "").trim();
  if (!token) return "";
  return `${window.location.origin}/carnet-afiliado/${encodeURIComponent(token)}`;
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

  const drawDarkQrImage = (img, x, y, size, options = {}) => {
    const qrInk = options.ink || "#f8fdff";
    const qrBg = options.bg || "#020817";
    const qrLine = options.line || "rgba(124, 251, 255, 0.42)";
    const qrGlow = options.glow || "rgba(124, 251, 255, 0.2)";
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
        const ink = qrInk.match(/[0-9a-f]{2}/gi) || ["f8", "fd", "ff"];
        pixels[index] = parseInt(ink[0], 16);
        pixels[index + 1] = parseInt(ink[1], 16);
        pixels[index + 2] = parseInt(ink[2], 16);
        pixels[index + 3] = 255;
      } else {
        pixels[index + 3] = 0;
      }
    }
    qrContext.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.fillStyle = qrBg;
    ctx.strokeStyle = qrLine;
    ctx.lineWidth = 2;
    ctx.shadowColor = qrGlow;
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
  const affiliatePhone = firstTextValue(affiliate.phone, affiliate.card_metadata?.phone, "Sin teléfono");
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
  const isPanoInglesTheme = isPanoInglesBusinessName(businessName);
  const palette = isPanoInglesTheme ? {
    bg: "#000209",
    card: "#040C16",
    top: "#0E1E2D",
    panel: "#081625",
    panelSoft: "#1D3550",
    smoke: "#203041",
    royal: "#284976",
    ink: "#F1F3F8",
    darkInk: "#2F2F2B",
    muted: "#C8B57F",
    accent: "#B29C6B",
    gold: "#C8B57F",
    goldShadow: "#8F815F",
    line: "#8F815F",
    qrBg: "#000209",
    qrInk: "#F1F3F8",
    qrLine: "#C8B57F",
    qrGlow: "#8F815F",
    footerBg: "#203041",
  } : {
    bg: "#07110f",
    card: "#101c1a",
    top: "#16392f",
    panel: "#142621",
    panelSoft: "#1c352d",
    smoke: "rgba(255, 255, 255, 0.09)",
    royal: "#74f7bf",
    ink: "#f7fff9",
    darkInk: "#0f172a",
    muted: "#b7ccc3",
    accent: "#74f7bf",
    gold: "#f4c84f",
    goldShadow: "#f4c84f",
    line: "rgba(116, 247, 191, 0.24)",
    qrBg: "#020817",
    qrInk: "#f8fdff",
    qrLine: "rgba(124, 251, 255, 0.42)",
    qrGlow: "rgba(124, 251, 255, 0.2)",
    footerBg: "rgba(116, 247, 191, 0.08)",
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
  ctx.strokeStyle = isPanoInglesTheme ? palette.gold : "rgba(116, 247, 191, 0.54)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = palette.top;
  ctx.beginPath();
  ctx.roundRect(62, 62, width - 124, 178, 28);
  ctx.fill();
  ctx.fillStyle = isPanoInglesTheme ? palette.smoke : "rgba(244, 200, 79, 0.12)";
  ctx.fillRect(62, 218, width - 124, 22);
  ctx.strokeStyle = palette.smoke;
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
    background: isPanoInglesTheme ? "#081625" : "#0d1f1b",
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
  drawPanel(dataX, dataY, dataW, dataH, isPanoInglesTheme ? palette.panel : "rgba(8, 21, 18, 0.62)");

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
  drawCardField("Teléfono", affiliatePhone, dataX + 262, dataY + 94, 158, 26);
  ctx.strokeStyle = palette.smoke;
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
    drawDarkQrImage(qrImg, qrPaperX + 14, qrPaperY + 14, qrPaperSize - 28, {
      bg: palette.qrBg,
      ink: palette.qrInk,
      line: palette.qrLine,
      glow: palette.qrGlow,
    });
  } else {
    ctx.fillStyle = isPanoInglesTheme ? "#081625" : "#0b2a22";
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

  ctx.fillStyle = palette.footerBg;
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
    ["Teléfono", affiliatePhone],
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
  ctx.fillText("CARNET DIGITAL EN VIVO", qrX + qrSize / 2, qrY + qrSize + 36);
  ctx.fillStyle = "#a8c6d9";
  ctx.font = "800 15px JetBrains Mono, monospace";
  ctx.fillText(`${tokenPreview || "SIN TOKEN"}...`, qrX + qrSize / 2, qrY + qrSize + 62);

  ctx.fillStyle = "rgba(124, 251, 255, 0.14)";
  ctx.roundRect(70, 680, 1060, 2, 1);
  ctx.fill();
  ctx.fillStyle = "#9bdcff";
  ctx.font = "800 15px Inter, Arial, sans-serif";
  ctx.fillText("Escanea el QR para ver puntos y movimientos en tiempo real.", width / 2, 706);
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
        affiliate_point_amount_cop: Number(accountAffiliatePointAmountInput?.value || 1000),
        affiliate_referral_points_rate: Number(accountAffiliatePointRateInput?.value || 1),
        affiliate_referral_points_rounding: accountAffiliatePointRoundingInput?.value || "floor",
      }),
    });
    mergeBusinessProfile(data.business || null);
    if (data.business?.affiliate_points) {
      state.affiliatePointRules = data.business.affiliate_points;
    }
    renderAccountView();
    renderAffiliatePurchaseItems();
    renderBusinessLogoPanel();
    setInlineMessage(accountProfileMessage, "Datos guardados.", "success");
    showFeedback("La información básica de la empresa fue actualizada.", "success", { title: "Perfil actualizado" });
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
    setInlineMessage(accountPasswordMessage, "La confirmación de password no coincide.", "error");
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
    state.contactFeedLoaded = false;
    state.leadCrmLoaded = false;
    state.leadCrmPagination.offset = 0;
    affiliateCreateMessage.textContent = "";
    resetAffiliateForm();
    await renderAffiliatesView();
    showFeedback("Afiliado creado correctamente.");
  } catch (error) {
    affiliateCreateMessage.textContent = error.message;
  }
}

function renderAffiliateRewardRules() {
  if (!affiliateRewardRuleList) return;
  const rules = state.affiliateRewardRules || [];
  if (!rules.length) {
    affiliateRewardRuleList.innerHTML = '<div class="affiliate-selected-empty">Sin premios configurados.</div>';
    return;
  }
  affiliateRewardRuleList.innerHTML = rules.map((rule) => {
    const fulfillmentLabel = benefitFulfillmentLabel(rule.benefit_value || {}, rule.metadata || {});
    return `
      <div class="affiliate-reward-row">
        <div>
          <strong>${escapeHtml(rule.title || rule.benefit_label || "Premio")}</strong>
          <span>${escapeHtml(toNumber(rule.required_points || 0))} puntos · ${escapeHtml(rule.benefit_label || "-")}${fulfillmentLabel ? ` · ${escapeHtml(fulfillmentLabel)}` : ""}</span>
        </div>
        <button class="ghost-button danger-button" type="button" data-affiliate-reward-archive="${escapeHtml(rule.id)}">Archivar</button>
      </div>
    `;
  }).join("");
  affiliateRewardRuleList.querySelectorAll("[data-affiliate-reward-archive]").forEach((button) => {
    button.addEventListener("click", () => archiveAffiliateRewardRule(button.dataset.affiliateRewardArchive));
  });
}

function renderAffiliateRewardUnlocks(unlocks = state.affiliateRewardUnlocks || []) {
  if (!affiliateRewardUnlockList) return;
  const affiliate = state.selectedAffiliate;
  if (affiliateRewardUnlockTitle) {
    affiliateRewardUnlockTitle.textContent = affiliate
      ? `Desbloqueados de ${affiliate.full_name || "afiliado"}`
      : "Desbloqueados del afiliado";
  }
  if (!affiliate) {
    affiliateRewardUnlockList.innerHTML = '<div class="affiliate-selected-empty">Selecciona un afiliado para ver premios desbloqueados.</div>';
    return;
  }
  if (!unlocks.length) {
    affiliateRewardUnlockList.innerHTML = '<div class="affiliate-selected-empty">No hay reglas de premio activas.</div>';
    return;
  }
  affiliateRewardUnlockList.innerHTML = unlocks.map((item) => {
    const status = item.generated ? "Ticket generado" : item.unlocked ? "Desbloqueado" : `Faltan ${toNumber(item.points_remaining || 0)} puntos`;
    const fulfillmentLabel = benefitFulfillmentLabel(item.benefit_value || {}, item.metadata || {});
    return `
      <div class="affiliate-reward-row ${item.unlocked ? "is-unlocked" : "is-locked"}">
        <div>
          <strong>${escapeHtml(item.title || item.benefit_label || "Premio")}</strong>
          <span>${escapeHtml(status)} · requiere ${escapeHtml(toNumber(item.required_points || 0))} puntos${fulfillmentLabel ? ` · ${escapeHtml(fulfillmentLabel)}` : ""}</span>
        </div>
        ${item.generated && item.public_ticket_url
          ? `<button class="ghost-button" type="button" data-affiliate-reward-open="${escapeHtml(item.public_ticket_url)}">Abrir</button>`
          : `<button class="solid-button" type="button" data-affiliate-reward-generate="${escapeHtml(item.id)}" ${item.unlocked ? "" : "disabled"}>Generar ticket</button>`}
      </div>
    `;
  }).join("");
  affiliateRewardUnlockList.querySelectorAll("[data-affiliate-reward-open]").forEach((button) => {
    button.addEventListener("click", () => window.open(button.dataset.affiliateRewardOpen, "_blank", "noopener"));
  });
  affiliateRewardUnlockList.querySelectorAll("[data-affiliate-reward-generate]").forEach((button) => {
    button.addEventListener("click", () => generateAffiliateRewardTicket(button.dataset.affiliateRewardGenerate));
  });
}

function resetAffiliateRewardResult() {
  if (affiliateRewardTicketResult) {
    affiliateRewardTicketResult.classList.add("hidden");
    affiliateRewardTicketResult.innerHTML = "";
  }
  setInlineMessage(affiliateRewardTicketMessage, "", "info");
}

async function submitAffiliateRewardRule(event) {
  event.preventDefault();
  if (!session?.user?.business_id) return;
  if (!validateBenefitFulfillment(affiliateRewardFulfillmentModeInput, affiliateRewardEcommerceCodeInput, affiliateRewardRuleMessage, "premio de afiliado")) {
    return;
  }
  setButtonLoading(affiliateRewardRuleSaveButton, true, "Guardando...");
  setInlineMessage(affiliateRewardRuleMessage, "Guardando premio de afiliado...", "info");
  try {
    const fulfillment = benefitFulfillmentFromInputs(
      affiliateRewardFulfillmentModeInput,
      affiliateRewardEcommerceCodeInput,
      affiliateRewardEcommerceUrlInput,
      affiliateRewardEcommerceInstructionsInput
    );
    const benefitValue = withBenefitFulfillment(parseJsonObject(affiliateRewardBenefitValueInput.value), fulfillment);
    const data = await api(`/api/portal/businesses/${session.user.business_id}/affiliate-rewards`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        title: affiliateRewardTitleInput.value.trim(),
        description: optionalInputValue(affiliateRewardDescriptionInput),
        required_points: Number(affiliateRewardPointsInput.value || 0),
        benefit_type: affiliateRewardBenefitTypeInput.value || "CUSTOM",
        benefit_label: affiliateRewardBenefitLabelInput.value.trim(),
        benefit_value: benefitValue,
        expiration_days: affiliateRewardExpirationInput.value ? Number(affiliateRewardExpirationInput.value) : null,
      }),
    });
    state.affiliateRewardRules = [data.reward_rule, ...(state.affiliateRewardRules || []).filter((item) => item.id !== data.reward_rule.id)];
    affiliateRewardRuleForm.reset();
    if (affiliateRewardPointsInput) affiliateRewardPointsInput.value = "10";
    syncBenefitFulfillmentFields();
    renderAffiliateRewardRules();
    await refreshSelectedAffiliateRewards();
    setInlineMessage(affiliateRewardRuleMessage, "Premio guardado.", "success");
    showFeedback("Premio de afiliado guardado.", "success", { title: "Afiliados" });
  } catch (error) {
    setInlineMessage(affiliateRewardRuleMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo guardar" });
  } finally {
    setButtonLoading(affiliateRewardRuleSaveButton, false);
  }
}

async function archiveAffiliateRewardRule(ruleId) {
  if (!session?.user?.business_id || !ruleId) return;
  if (!window.confirm("Archivar este premio de afiliado? Los tickets ya generados no se eliminan.")) return;
  try {
    await api(`/api/portal/businesses/${session.user.business_id}/affiliate-rewards/${ruleId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    state.affiliateRewardRules = (state.affiliateRewardRules || []).filter((item) => item.id !== ruleId);
    renderAffiliateRewardRules();
    await refreshSelectedAffiliateRewards();
    showFeedback("Premio archivado.", "success", { title: "Afiliados" });
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo archivar" });
  }
}

async function refreshSelectedAffiliateRewards() {
  if (!state.selectedAffiliateId || !session?.user?.business_id) {
    state.affiliateRewardUnlocks = [];
    renderAffiliateRewardUnlocks();
    return;
  }
  const data = await apiSafe(`/api/portal/businesses/${session.user.business_id}/affiliates/${state.selectedAffiliateId}`, { headers: authHeaders() }, null);
  if (!data) return;
  if (data.reward_unlocks) {
    state.affiliateRewardUnlocks = data.reward_unlocks;
    renderAffiliateRewardUnlocks();
  }
}

async function generateAffiliateRewardTicket(ruleId) {
  if (!state.selectedAffiliateId || !session?.user?.business_id || !ruleId) return;
  setInlineMessage(affiliateRewardTicketMessage, "Generando ticket desbloqueado...", "info");
  showFeedback("Creando ticket QR del premio desbloqueado.", "loading", { title: "Premio afiliado", timeout: 0 });
  try {
    const data = await api(`/api/portal/businesses/${session.user.business_id}/affiliates/${state.selectedAffiliateId}/reward-tickets`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ reward_rule_id: ruleId }),
    });
    if (data.credit_account) state.qrCreditAccount = data.credit_account;
    const ticket = data.ticket || {};
    const fulfillment = benefitFulfillmentObject(ticket.benefit || {});
    const fulfillmentLabel = benefitFulfillmentLabel(ticket.benefit || {});
    if (affiliateRewardTicketResult) {
      affiliateRewardTicketResult.classList.remove("hidden");
      affiliateRewardTicketResult.innerHTML = `
        <div class="qr-result-grid">
          ${ticket.qr_image_data_url ? `<img src="${escapeHtml(ticket.qr_image_data_url)}" alt="Ticket premio afiliado">` : ""}
          <div>
            <strong>Ticket listo para enviar</strong>
            <p>${escapeHtml(ticket.benefit?.label || "Premio desbloqueado")}</p>
            ${fulfillmentLabel ? `<p><strong>Entrega:</strong> ${escapeHtml(fulfillmentLabel)}</p>` : ""}
            ${fulfillment?.mode === "ECOMMERCE_CODE" ? `<div class="ecommerce-code-preview"><span>Código ecommerce</span><strong>${escapeHtml(fulfillment.ecommerce_code || "pendiente")}</strong>${fulfillment.ecommerce_url ? `<a href="${escapeHtml(fulfillment.ecommerce_url)}" target="_blank" rel="noopener">Abrir tienda online</a>` : ""}</div>` : ""}
            <a class="ghost-button" href="${escapeHtml(ticket.public_ticket_url || ticket.validator_url || "#")}" target="_blank" rel="noopener">Abrir ticket</a>
          </div>
        </div>
      `;
    }
    setInlineMessage(affiliateRewardTicketMessage, data.existing ? "Este premio ya tenía ticket generado." : "Ticket generado correctamente.", "success");
    await refreshSelectedAffiliateRewards();
    showFeedback("Ticket de premio listo para enviar.", "success", { title: "Premio afiliado" });
  } catch (error) {
    setInlineMessage(affiliateRewardTicketMessage, error.message, "error");
    showFeedback(error.message, "error", { title: "No se pudo generar" });
  }
}

function normalizeAffiliatePurchaseItems() {
  const rows = Array.isArray(state.affiliatePurchaseItems) && state.affiliatePurchaseItems.length
    ? state.affiliatePurchaseItems
    : [{ name: "", quantity: 1, unit_price: 0 }];
  state.affiliatePurchaseItems = rows.map((item) => ({
    name: String(item.name || "").trim(),
    inventory_product_id: item.inventory_product_id || null,
    sku: item.sku || null,
    barcode: item.barcode || null,
    quantity: Math.max(1, Number(item.quantity || 1)),
    unit_price: Math.max(0, Number(item.unit_price || 0)),
  }));
  return state.affiliatePurchaseItems;
}

function affiliatePurchaseLineTotal(item = {}) {
  return Math.max(1, Number(item.quantity || 1)) * Math.max(0, Number(item.unit_price || 0));
}

function affiliatePurchaseTotal() {
  return normalizeAffiliatePurchaseItems().reduce((sum, item) => sum + affiliatePurchaseLineTotal(item), 0);
}

function affiliateReferralPointsEstimate(total) {
  const rules = state.affiliatePointRules || {};
  const pointAmount = Number(rules.point_amount_cop || 1000);
  const rate = Number(rules.referral_rate || 1);
  if (!pointAmount || !rate || !Number.isFinite(total) || total <= 0) return null;
  const raw = (total / pointAmount) * rate;
  return Math.max(0, rules.referral_rounding === "ceil" ? Math.ceil(raw) : Math.floor(raw));
}

function updateAffiliatePurchaseTotals() {
  const items = normalizeAffiliatePurchaseItems();
  const total = affiliatePurchaseTotal();
  const namedItems = items.filter((item) => item.name && affiliatePurchaseLineTotal(item) > 0);
  const productSummary = namedItems.length
    ? namedItems.map((item) => `${item.name} x${item.quantity}`).join(", ").slice(0, 170)
    : "";
  const points = affiliateReferralPointsEstimate(total);
  if (affiliatePurchaseAmountInput) affiliatePurchaseAmountInput.value = String(total || "");
  if (affiliatePurchaseProductInput) affiliatePurchaseProductInput.value = productSummary || "Compra afiliado";
  if (affiliatePurchaseTotalText) affiliatePurchaseTotalText.textContent = money(total);
  if (affiliatePurchasePointsText) {
    affiliatePurchasePointsText.textContent = points === null
      ? "Puntos calculados al registrar"
      : `${points.toLocaleString("es-CO")} puntos estimados`;
  }
  return { items, total, productSummary, points };
}

function renderAffiliatePurchaseItems() {
  if (!affiliatePurchaseItemsList) return;
  const disabled = !state.selectedAffiliateId;
  const rows = normalizeAffiliatePurchaseItems();
  affiliatePurchaseItemsList.innerHTML = rows.map((item, index) => `
    <div class="affiliate-purchase-item" data-affiliate-purchase-row="${index}">
      <label>
        <span>Producto</span>
        <select data-affiliate-purchase-field="product_select" data-product-select ${disabled ? "disabled" : ""}>
          ${inventoryProductSelectOptions(item.inventory_product_id ? `inventory:${item.inventory_product_id}` : (item.name ? OPEN_PRODUCT_VALUE : ""), { placeholder: "Seleccionar producto" })}
        </select>
        <input class="open-product-input ${!item.inventory_product_id && item.name ? "" : "hidden"}" type="text" data-affiliate-purchase-field="name" data-open-product-input value="${escapeHtml(item.inventory_product_id ? "" : item.name)}" placeholder="Producto abierto o servicio" ${disabled || item.inventory_product_id || !item.name ? "disabled" : ""}>
      </label>
      <label>
        <span>Cant.</span>
        <input type="number" min="1" step="1" data-affiliate-purchase-field="quantity" value="${escapeHtml(item.quantity)}" ${disabled ? "disabled" : ""}>
      </label>
      <label>
        <span>Valor unitario</span>
        <input type="number" min="0" step="100" data-affiliate-purchase-field="unit_price" value="${escapeHtml(item.unit_price)}" ${disabled ? "disabled" : ""}>
      </label>
      <div class="affiliate-purchase-line-total">
        <span>Subtotal</span>
        <strong>${escapeHtml(money(affiliatePurchaseLineTotal(item)))}</strong>
      </div>
      <button class="ghost-button danger-button" type="button" data-affiliate-purchase-remove="${index}" ${disabled || rows.length <= 1 ? "disabled" : ""}>Quitar</button>
    </div>
  `).join("");
  affiliatePurchaseItemsList.querySelectorAll("[data-affiliate-purchase-field]").forEach((input) => {
    const handleAffiliatePurchaseFieldChange = () => {
      const row = input.closest("[data-affiliate-purchase-row]");
      const index = Number(row?.dataset.affiliatePurchaseRow || 0);
      const field = input.dataset.affiliatePurchaseField;
      const next = normalizeAffiliatePurchaseItems();
      if (field === "product_select") {
        const product = findInventoryProduct(input.value);
        if (product) {
          next[index].name = product.name;
          next[index].inventory_product_id = product.id;
          next[index].sku = product.sku || null;
          next[index].barcode = product.barcode || null;
          if (!Number(next[index].unit_price || 0)) next[index].unit_price = Number(product.unit_price || 0);
          const unitInput = row?.querySelector('[data-affiliate-purchase-field="unit_price"]');
          if (unitInput && !Number(unitInput.value || 0)) unitInput.value = String(next[index].unit_price || 0);
        } else {
          next[index].inventory_product_id = null;
          next[index].sku = null;
          next[index].barcode = null;
          if (input.value !== OPEN_PRODUCT_VALUE) next[index].name = "";
        }
        state.affiliatePurchaseItems = next;
        renderAffiliatePurchaseItems();
        return;
      }
      next[index][field] = field === "name" ? input.value : Number(input.value || 0);
      state.affiliatePurchaseItems = next;
      const totalCell = row?.querySelector(".affiliate-purchase-line-total strong");
      if (totalCell) totalCell.textContent = money(affiliatePurchaseLineTotal(next[index]));
      updateAffiliatePurchaseTotals();
    };
    input.addEventListener("input", handleAffiliatePurchaseFieldChange);
    input.addEventListener("change", handleAffiliatePurchaseFieldChange);
  });
  affiliatePurchaseItemsList.querySelectorAll("[data-affiliate-purchase-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.affiliatePurchaseRemove || 0);
      state.affiliatePurchaseItems = normalizeAffiliatePurchaseItems().filter((_, itemIndex) => itemIndex !== index);
      renderAffiliatePurchaseItems();
    });
  });
  if (affiliatePurchaseAddItemButton) affiliatePurchaseAddItemButton.disabled = disabled;
  updateAffiliatePurchaseTotals();
}

async function awardSelectedAffiliatePoints() {
  if (!state.selectedAffiliateId || !session?.user?.business_id) return;
  const selectedAffiliate = state.selectedAffiliate || (state.affiliates || []).find((item) => item.id === state.selectedAffiliateId) || {};
  const purchase = updateAffiliatePurchaseTotals();
  const products = purchase.items
    .map((item) => ({
      name: String(item.name || "").trim(),
      inventory_product_id: item.inventory_product_id || null,
      sku: item.sku || null,
      barcode: item.barcode || null,
      quantity: Math.max(1, Number(item.quantity || 1)),
      unit_price: Math.max(0, Number(item.unit_price || 0)),
      line_total: affiliatePurchaseLineTotal(item),
    }))
    .filter((item) => item.name && item.line_total > 0);
  const amount = Number(purchase.total || 0);
  const campaignId = affiliatePurchaseCampaignInput?.value || "";
  if (!Number.isFinite(amount) || amount <= 0) {
    setInlineMessage(affiliatePurchaseMessage, "Agrega productos con valor para totalizar la compra.", "error");
    showFeedback("Agrega productos con valor para totalizar la compra.", "error");
    return;
  }
  if (!products.length) {
    setInlineMessage(affiliatePurchaseMessage, "Agrega al menos un producto comprado con nombre y valor.", "error");
    showFeedback("Agrega al menos un producto comprado.", "error");
    return;
  }
  if (activeCampaignsForAssociation().length && !campaignId) {
    setInlineMessage(affiliatePurchaseMessage, "Elige la campana que quieres atribuir a esta compra.", "error");
    showFeedback("Elige una campana para atribuir la compra.", "error");
    return;
  }

  affiliateAddPointsButton.disabled = true;
  affiliateAddPointsButton.textContent = "Registrando...";
  setInlineMessage(affiliatePurchaseMessage, "Registrando compra y calculando puntos del afiliado...", "info");

  try {
    const data = await api("/api/business/customer-acquisition-sales", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        campaign_id: campaignId || null,
        customer_name: selectedAffiliate.full_name || null,
        customer_phone: selectedAffiliate.phone || null,
        customer_email: selectedAffiliate.email || null,
        customer_document_id: selectedAffiliate.document_id || null,
        product_name: purchase.productSummary || products[0]?.name || "Compra afiliado",
        sale_amount: amount,
        currency: "COP",
        acquisition_source: "FRIEND_REFERRAL",
        acquisition_channel: "Afiliados",
        referred_affiliate_id: state.selectedAffiliateId,
        notes: affiliatePurchaseNotesInput?.value.trim() || null,
        metadata: {
          source: "affiliate_contact_purchase",
          affiliate_purchase: true,
          products,
          items_count: products.length,
          purchase_total: amount,
          estimated_referral_points: purchase.points,
          affiliate_name: selectedAffiliate.full_name || null,
        },
      }),
    });

    const awarded = Number(data.referral?.points_awarded || 0);
    const selectedAffiliateId = state.selectedAffiliateId;
    state.affiliatePurchaseItems = [{ name: "", quantity: 1, unit_price: 0 }];
    if (affiliatePurchaseNotesInput) affiliatePurchaseNotesInput.value = "";
    await loadAffiliatesData();
    state.selectedAffiliateId = selectedAffiliateId;
    state.selectedAffiliate = (state.affiliates || []).find((item) => item.id === selectedAffiliateId) || state.selectedAffiliate;
    state.contactFeedLoaded = false;
    state.leadCrmLoaded = false;
    await loadInventoryProducts({ force: true, quiet: true });
    renderInventoryProductOptions();
    if (campaignId) {
      if (state.selectedCampaignId !== campaignId) {
        state.selectedCampaignId = campaignId;
        state.selectedCampaign = campaignById(campaignId) || state.selectedCampaign;
      }
      await reloadCampaignAffiliates(campaignId);
      const salesData = await apiSafe(`/api/business/campaigns/${campaignId}/sales?limit=150`, { headers: authHeaders() }, { sales: state.selectedSales || [] });
      state.selectedSales = salesData.sales || [];
      if (state.currentView === "sales") renderSalesView();
    }
    await renderAffiliatesView();
    const message = awarded
      ? `Compra por ${money(amount)} registrada en Sales. ${data.referral?.affiliate_name || selectedAffiliate.full_name || "El afiliado"} recibio ${awarded} puntos automaticamente.`
      : `Compra por ${money(amount)} registrada en Sales. La regla actual no genero puntos para este total.`;
    setInlineMessage(affiliatePurchaseMessage, message, awarded ? "success" : "info");
    showFeedback(message, awarded ? "success" : "info", { title: "Compra atribuida" });
  } catch (error) {
    setInlineMessage(affiliatePurchaseMessage, error.message, "error");
    showFeedback(error.message, "error");
  } finally {
    affiliateAddPointsButton.disabled = false;
    affiliateAddPointsButton.textContent = "Registrar compra";
  }
}

async function downloadSelectedAffiliateCard() {
  if (!state.selectedAffiliate) return;
  downloadAffiliateCardButton.disabled = true;
  downloadAffiliateCardButton.textContent = "Abriendo...";
  try {
    const url = affiliateDigitalCardUrl(state.selectedAffiliate);
    if (!url) throw new Error("Este afiliado no tiene link de carnet digital.");
    window.open(url, "_blank", "noopener");
  } catch (error) {
    showFeedback(error.message || "No se pudo abrir el carnet digital.", "error");
  } finally {
    downloadAffiliateCardButton.disabled = false;
    downloadAffiliateCardButton.textContent = "Abrir carnet digital";
  }
}

async function copySelectedAffiliateCardLink() {
  const url = affiliateDigitalCardUrl(state.selectedAffiliate || {});
  if (!url) {
    showFeedback("Este afiliado no tiene link de carnet digital.", "error");
    return;
  }
  try {
    await navigator.clipboard?.writeText(url);
    showFeedback("Link del carnet digital copiado.", "success", { title: "Carnet afiliado" });
  } catch {
    window.prompt("Link del carnet digital", url);
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
  const fulfillmentLabel = benefitFulfillmentLabel(batch.benefit_value || {}, batch.metadata || {});
  affiliateReferralQrResult.classList.remove("hidden");
  affiliateReferralQrResult.innerHTML = `
    <div class="qr-batch-result-head">
      <div>
        <span class="mono-label">tickets de recomendación creados</span>
        <h4>${escapeHtml(batch.name || "tickets recomendación afiliado")}</h4>
        <p>${escapeHtml(Number(batch.quantity || qrCodes.length || 0).toLocaleString("es-CO"))} tickets unicos, de un solo uso, listos para entregar al afiliado.</p>
        <p><strong>Afiliado asignado:</strong> ${escapeHtml(affiliateName)} · ${escapeHtml(affiliateDocument)}</p>
        ${fulfillmentLabel ? `<p><strong>Entrega:</strong> ${escapeHtml(fulfillmentLabel)}</p>` : ""}
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
    setInlineMessage(affiliateReferralQrMessage, "Selecciona la campaña que medirá estos tickets de recomendación.", "error");
    affiliateReferralQrCampaignInput?.focus();
    return;
  }
  if (!validateBenefitFulfillment(affiliateReferralQrFulfillmentModeInput, affiliateReferralQrEcommerceCodeInput, affiliateReferralQrMessage, "ticket de referido")) {
    return;
  }

  setButtonLoading(affiliateGenerateReferralQrButton, true, "Generando...");
  setInlineMessage(affiliateReferralQrMessage, `Generando ${quantity.toLocaleString("es-CO")} tickets y descontando tickets disponibles...`, "info");
  renderAffiliateReferralQrResult(null);
  showFeedback(`Generando tickets de recomendación para ${state.selectedAffiliate.full_name || "el afiliado"}.`, "loading", { title: "tickets de recomendación", timeout: 0 });
  const referralAffiliate = { ...state.selectedAffiliate };
  const fulfillment = benefitFulfillmentFromInputs(
    affiliateReferralQrFulfillmentModeInput,
    affiliateReferralQrEcommerceCodeInput,
    affiliateReferralQrEcommerceUrlInput,
    affiliateReferralQrEcommerceInstructionsInput
  );

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
          benefit_label: affiliateReferralQrBenefitInput?.value.trim() || "Recomendación de afiliado",
          benefit_value: withBenefitFulfillment({}, fulfillment),
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
    if (state.selectedCampaignId === affiliateReferralQrCampaignInput.value) {
      await reloadCampaignAffiliates(state.selectedCampaignId);
    }
    if (state.currentView === "affiliates") {
      await loadAffiliatesData();
      await renderAffiliatesView();
      renderAffiliateReferralQrResult(data.batch, data.qr_codes || [], referralAffiliate);
    } else if (state.currentView === "strategic-qr") {
      await loadTicketCenterForCurrentTab({ force: true, quiet: true });
    }
    showFeedback(`tickets de recomendación creados para ${referralAffiliate.full_name || "el afiliado"}. La descarga PDF fue iniciada.`, "success", { title: "Tickets listos" });
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
  const firstConfirm = window.confirm(`Vas a eliminar el afiliado "${name}". Esta acción elimina también su historial de puntos. Deseas continuar?`);
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
    state.contactFeedLoaded = false;
    state.leadCrmLoaded = false;
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

function triggerBlobDownload(blobOrFilename, filenameOrBlob) {
  const legacyOrder = typeof blobOrFilename === "string";
  const blob = legacyOrder ? filenameOrBlob : blobOrFilename;
  const filename = legacyOrder ? blobOrFilename : filenameOrBlob;
  if (!(blob instanceof Blob)) {
    console.warn("Descarga omitida: el contenido no es un Blob valido.");
    return;
  }
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename || "download.bin";
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

async function fetchLeadTicketDownload(qrId) {
  if (!qrId) return;
  const data = await api(`/api/business/contacts/feed/${encodeURIComponent(qrId)}/active-qr`, {
    headers: authHeaders(),
  });
  const publicUrl = data.public_ticket_url || data.share_url || data.claim_url || data.scan_url || "";
  if (publicUrl) {
    state.lastLeadActivationLink = publicUrl;
  }
  return { ...data, public_ticket_url: publicUrl, share_url: publicUrl };
}

function leadTicketWhatsAppMessage(ticket = {}, name = "") {
  const publicUrl = ticket.public_ticket_url || ticket.share_url || ticket.claim_url || ticket.scan_url || "";
  const expiresLine = ticket.expires_at ? `Vence: ${formatDate(ticket.expires_at)}.` : "";
  return [
    `Hola ${name || ticket.player_name || ""}`.trim(),
    "te recordamos que tienes un ticket activo sin redimir.",
    expiresLine,
    "Abre este enlace público para ver tu ticket y presentarlo cuando vayas a redimirlo:",
    publicUrl,
  ].filter(Boolean).join(" ");
}

async function downloadLeadQr(qrId) {
  if (!qrId) return;
  try {
    const data = await fetchLeadTicketDownload(qrId);
    await downloadDataUrl(data.filename || `ticket-${qrId}.png`, data.qr_image_data_url);
    showFeedback(`Ticket descargado para ${data.player_name || "el lead"}. Puedes reenviarlo por el canal que prefieras.`);
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function shareLeadQrWhatsApp(qrId, phone, name) {
  if (!qrId) return;
  try {
    const data = await fetchLeadTicketDownload(qrId);
    const rawPhone = whatsappPhoneFromInput(phone || data.player_phone || "");
    const text = leadTicketWhatsAppMessage(data, name || data.player_name || "");
    const imageDataUrl = await ticketImageDataUrlForBrowser(data.qr_image_data_url || "");
    try {
      if (imageDataUrl) {
        const sharedAsFile = await shareTicketQrFile({
          filename: data.filename || `ticket-${qrId}.png`,
          dataUrl: imageDataUrl,
          text,
        });
        if (sharedAsFile) return;
      }
    } catch (shareError) {
      if (shareError?.name === "AbortError") return;
      if (imageDataUrl) {
        await downloadDataUrl(data.filename || `ticket-${qrId}.png`, imageDataUrl);
      }
    }
    const target = rawPhone
      ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(target, "_blank", "noopener");
    showFeedback("Ticket listo: se descargo la imagen y se abrio WhatsApp con el link publico.", "success");
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

function exportCampaignReport() {
  const campaign = state.selectedCampaign;
  if (!campaign) return;
  downloadCsv("campaign-report", [
    ["Campo", "Valor"],
    ["Campaña", campaign.name],
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

async function createManualLead(event) {
  event?.preventDefault();
  if (!manualLeadForm) return;
  const payload = {
    name: String(manualLeadNameInput?.value || "").trim(),
    company: optionalInputValue(manualLeadCompanyInput),
    phone: optionalInputValue(manualLeadPhoneInput),
    email: optionalInputValue(manualLeadEmailInput),
    source: String(manualLeadSourceInput?.value || "Manual").trim(),
    source_detail: optionalInputValue(manualLeadSourceDetailInput),
    priority: manualLeadPriorityInput?.value || "MEDIUM",
    status: manualLeadStatusInput?.value || "NEW",
    preferred_channel: optionalInputValue(manualLeadPreferredChannelInput),
    preferred_contact_time: optionalInputValue(manualLeadPreferredTimeInput),
    interest: optionalInputValue(manualLeadInterestInput),
    notes: optionalInputValue(manualLeadNotesInput),
  };
  if (!payload.name || (!payload.phone && !payload.email)) {
    setFormMessage(manualLeadMessage, "Agrega nombre y al menos telefono o correo.", "error");
    return;
  }
  try {
    if (manualLeadSubmitButton) {
      manualLeadSubmitButton.disabled = true;
      manualLeadSubmitButton.textContent = "Guardando...";
    }
    setFormMessage(manualLeadMessage, "Guardando prospecto...", "info");
    const result = await api("/api/business/contacts/manual", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    manualLeadForm.reset();
    if (manualLeadSourceInput) manualLeadSourceInput.value = "Formulario home";
    if (manualLeadPriorityInput) manualLeadPriorityInput.value = "MEDIUM";
    if (manualLeadStatusInput) manualLeadStatusInput.value = "NEW";
    state.contactFeedLoaded = false;
    state.leadCrmLoaded = false;
    state.leadCrmPagination.offset = 0;
    if (leadCrmSearchInput && result?.lead?.name) {
      leadCrmSearchInput.value = result.lead.name;
    }
    await loadContactFeedData({ force: true, quiet: true });
    await loadLeadCrmData({ force: true, quiet: true });
    renderLeadsView();
    setFormMessage(manualLeadMessage, "Prospecto guardado en el feed comercial.", "success");
    showFeedback("Lead manual agregado al feed.", "success", { title: "Prospecto guardado" });
  } catch (error) {
    setFormMessage(manualLeadMessage, error.message || "No se pudo guardar el prospecto.", "error");
    showFeedback(error.message || "No se pudo guardar el prospecto.", "error");
  } finally {
    if (manualLeadSubmitButton) {
      manualLeadSubmitButton.disabled = false;
      manualLeadSubmitButton.textContent = "Guardar prospecto";
    }
  }
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
    ["Cliente", "Cédula", "Teléfono", "Valor", "Pago", "Producto o servicio", "Productos detallados", "Afiliado", "Puntos", "Sucursal", "Fecha"],
    ...state.selectedSales.map((item) => [
      item.player_name,
      item.document_id,
      item.phone,
      item.sale_amount,
      item.payment_method,
      item.product_or_service,
      saleProductsForDisplay(item).map((product) => `${product.name} x${product.quantity || 1} = ${product.line_total || 0}`).join(" | "),
      item.affiliate_name || "",
      item.referral_points_awarded || 0,
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
  syncCampaignCostCalculatorFromForm();

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
        campaign_cost_calculator: state.campaignCostCalculator,
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
    showFeedback("Campaña marcada como READY_FOR_CLIENT_SETUP.");
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
  adminReportCampaignTable.innerHTML = '<tr><td colspan="6">Selecciona una campaña para ver el reporte del cliente.</td></tr>';
  setView("admin");
}

async function saveAdminCampaign(event) {
  event.preventDefault();
  if (!isAdmin()) return;
  adminCampaignMessage.textContent = "Guardando...";
  const adminSlug = slugify(adminCampaignSlugInput.value || adminCampaignNameInput.value);
  adminCampaignSlugInput.value = adminSlug;
  if (!adminSlug) {
    adminCampaignMessage.textContent = "Escribe un nombre de campaña para generar el slug.";
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
    adminCampaignMessage.textContent = "Campaña guardada.";
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
    showFeedback("Campaña marcada como READY_FOR_CLIENT_SETUP.");
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

function commercialChipClass(status = "") {
  const value = String(status || "").toUpperCase();
  if (["VIP", "BUYER", "RECURRENT", "CONVERTED"].includes(value)) return "ok";
  if (["INTERESTED", "FOLLOW_UP", "CONTACTED"].includes(value)) return "warning";
  if (["INACTIVE", "LOST"].includes(value)) return "danger";
  return "pending";
}

function leadBadges(item = {}) {
  return [
    item.is_affiliate ? "Afiliado" : "",
    item.purchase_count > 0 ? "Comprador" : "",
    item.active_tickets > 0 ? "Ticket activo" : "",
    item.expired_tickets > 0 ? "Ticket vencido" : "",
    item.inactive_tickets > 0 ? "Ticket no activo" : "",
    item.redeemed_tickets > 0 ? "Redimio" : "",
    item.source_type === "MANUAL" ? "Manual" : "",
  ].filter(Boolean);
}

function leadTicketInventoryParts(item = {}) {
  return [
    Number(item.active_tickets || 0) ? `${Number(item.active_tickets || 0)} activos` : "",
    Number(item.expired_tickets || 0) ? `${Number(item.expired_tickets || 0)} expirados` : "",
    Number(item.inactive_tickets || 0) ? `${Number(item.inactive_tickets || 0)} no activos` : "",
    Number(item.redeemed_tickets || 0) ? `${Number(item.redeemed_tickets || 0)} redimidos` : "",
  ].filter(Boolean);
}

function leadTicketInventoryText(item = {}) {
  return leadTicketInventoryParts(item).join(" | ") || "Sin tickets";
}

function leadPriorityChipClass(priority = "") {
  const value = String(priority || "").toUpperCase();
  if (value === "HIGH") return "danger";
  if (value === "MEDIUM") return "warning";
  return "pending";
}

function renderLeadCrmTable() {
  if (!leadCrmTable) return;
  const rows = state.leadCrmRows || [];
  const pagination = state.leadCrmPagination || {};
  if (leadCrmPaginationLabel) {
    const from = rows.length ? Number(pagination.offset || 0) + 1 : 0;
    const to = Number(pagination.offset || 0) + rows.length;
    leadCrmPaginationLabel.textContent = `${from}-${to} de ${Number(pagination.total || rows.length).toLocaleString("es-CO")}`;
  }
  if (leadCrmPrevButton) leadCrmPrevButton.disabled = Number(pagination.offset || 0) <= 0;
  if (leadCrmNextButton) leadCrmNextButton.disabled = !pagination.has_more;
  leadCrmTable.innerHTML = rows.map((item) => `
    <tr class="lead-crm-row" data-lead-id="${escapeHtml(item.id)}" data-source-type="${escapeHtml(item.source_type || "PLAYER")}">
      <td>
        <strong>${escapeHtml(item.name || "Sin nombre")}</strong>
        <br><span class="table-secondary">${escapeHtml(item.document_id || item.email || item.phone || item.id)}</span>
        <br><span class="table-secondary">${escapeHtml(item.email || "-")} · ${escapeHtml(item.phone || "-")}</span>
      </td>
      <td>
        <span class="status-chip ${leadPriorityChipClass(item.care_priority)}">${escapeHtml(item.care_priority_label || "Seguimiento")}</span>
        <br><strong>${Number(item.attention_score || 0).toLocaleString("es-CO")}</strong>
        <br><span class="table-secondary">${escapeHtml(item.recommended_action || "-")}</span>
      </td>
      <td>
        <span class="status-chip ${commercialChipClass(item.commercial_status)}">${escapeHtml(item.commercial_status_label || item.commercial_status || "Nuevo")}</span>
        <br><span class="table-secondary">${escapeHtml(item.level || "-")}</span>
      </td>
      <td><strong>${Number(item.score_total || 0).toLocaleString("es-CO")}</strong><br><span class="table-secondary">Mejor ${Number(item.best_score || 0)}</span></td>
      <td><strong>${money(item.total_spent || 0)}</strong><br><span class="table-secondary">${Number(item.purchase_count || 0)} compras</span></td>
      <td>${formatDate(item.last_interaction_at)}<br><span class="table-secondary">${escapeHtml(item.campaign_name || item.channel || "Sin campaña")}</span></td>
      <td>${Number(item.activation_count || 0)} activaciones<br><span class="table-secondary">${Number(item.games_played || 0)} juegos</span><br><span class="table-secondary">${escapeHtml(leadTicketInventoryText(item))}</span></td>
      <td><div class="lead-badge-wrap">${leadBadges(item).map((badge) => `<span class="pill muted">${escapeHtml(badge)}</span>`).join("") || '<span class="table-secondary">Sin badges</span>'}</div></td>
      <td>
        <div class="activation-row-actions">
          <button class="ghost-button" type="button" data-lead-action="detail">Ver</button>
          ${item.active_ticket_qr_id ? `
            <button class="ghost-button" type="button" data-lead-action="ticket-download">Enviar ticket</button>
            <button class="ghost-button" type="button" data-lead-action="ticket-whatsapp">Recordar WhatsApp</button>
          ` : `<button class="ghost-button" type="button" data-lead-action="activation">Activar</button>`}
          <button class="ghost-button danger-button" type="button" data-lead-action="delete">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("") || '<tr><td colspan="9">Sin leads para los filtros actuales.</td></tr>';
  leadCrmTable.querySelectorAll("[data-lead-id]").forEach((row) => {
    row.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-lead-action]");
      const action = actionButton?.dataset.leadAction || "detail";
      const leadRef = { id: row.dataset.leadId, source_type: row.dataset.sourceType || "PLAYER" };
      if (action === "activation") {
        openLeadActivationModal(leadRef);
      } else if (action === "ticket-download") {
        const item = (state.leadCrmRows || []).find((lead) => String(lead.id) === String(leadRef.id) && String(lead.source_type || "PLAYER") === String(leadRef.source_type || "PLAYER"));
        downloadLeadQr(item?.active_ticket_qr_id);
      } else if (action === "ticket-whatsapp") {
        const item = (state.leadCrmRows || []).find((lead) => String(lead.id) === String(leadRef.id) && String(lead.source_type || "PLAYER") === String(leadRef.source_type || "PLAYER"));
        shareLeadQrWhatsApp(item?.active_ticket_qr_id, item?.phone, item?.name);
      } else if (action === "delete") {
        deleteLeadContact(leadRef, row.querySelector("strong")?.textContent || "este contacto");
      } else {
        openLeadDetail(leadRef);
      }
    });
  });
}

async function deleteLeadContact(leadRef, label = "este contacto") {
  if (!leadRef?.id) return;
  const sourceType = leadRef.source_type || "PLAYER";
  const confirmation = window.prompt(`Vas a eliminar ${label} del centro de contactos. Escribe ELIMINAR para confirmar.`);
  if (confirmation !== "ELIMINAR") return;
  try {
    showFeedback("Eliminando contacto y limpiando el CRM.", "loading", { title: "Contactos", timeout: 0 });
    await api(`/api/business/leads/${encodeURIComponent(leadRef.id)}?source_type=${encodeURIComponent(sourceType)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    state.leadCrmRows = (state.leadCrmRows || []).filter((item) => String(item.id) !== String(leadRef.id) || String(item.source_type || "PLAYER") !== String(sourceType));
    state.contactFeed = (state.contactFeed || []).filter((item) => String(item.id) !== String(leadRef.id));
    state.leadCrmLoaded = false;
    state.contactFeedLoaded = false;
    if (state.selectedLeadRef && String(state.selectedLeadRef.id) === String(leadRef.id)) {
      closeLeadDetail();
      state.selectedLeadRef = null;
      state.selectedLeadDetail = null;
    }
    await Promise.all([
      loadContactFeedData({ force: true, quiet: true }),
      loadLeadCrmData({ force: true, quiet: true }),
    ]);
    renderLeadsView();
    showFeedback("Contacto eliminado del centro unificado.", "success", { title: "Contactos" });
  } catch (error) {
    showFeedback(error.message, "error", { title: "No se pudo eliminar" });
  }
}

function appendIfFound(parent, node) {
  if (parent && node && node.parentElement !== parent) parent.appendChild(node);
}

const CONTACT_CENTER_TAB_KEYS = ["overview", "directory", "tickets", "captures", "manual", "sales"];

function mountContactCenterLayout() {
  if (state.contactCenterMounted) return;
  const contactCenterShell = document.getElementById("contactCenterShell");
  const overviewPanel = document.querySelector('[data-contact-center-panel="overview"]');
  const directoryPanel = document.querySelector('[data-contact-center-panel="directory"]');
  const ticketsPanel = document.querySelector('[data-contact-center-panel="tickets"]');
  const capturesPanel = document.querySelector('[data-contact-center-panel="captures"]');
  const manualPanel = document.querySelector('[data-contact-center-panel="manual"]');
  const salesPanel = document.querySelector('[data-contact-center-panel="sales"]');
  if (!overviewPanel || !directoryPanel || !ticketsPanel || !capturesPanel || !manualPanel || !salesPanel) return;

  appendIfFound(overviewPanel, leadFeedKpiGrid);
  appendIfFound(overviewPanel, contactActionFeed);
  appendIfFound(overviewPanel, leadAttentionBoard);

  appendIfFound(directoryPanel, document.querySelector(".lead-crm-command"));
  appendIfFound(directoryPanel, document.querySelector(".lead-crm-card"));
  appendIfFound(directoryPanel, leadFeedTable?.closest("article"));
  appendIfFound(directoryPanel, document.getElementById("campaignLeadsTable")?.closest("article"));

  appendIfFound(ticketsPanel, leadTicketInventoryBoard);

  appendIfFound(capturesPanel, leadCaptureForm?.closest("article"));
  appendIfFound(capturesPanel, leadCaptureTable?.closest("article"));

  appendIfFound(manualPanel, manualLeadForm?.closest("article"));

  appendIfFound(salesPanel, salesKpiGrid);
  appendIfFound(salesPanel, document.getElementById("customerAcquisitionForm")?.closest("article"));
  appendIfFound(salesPanel, campaignSalesTable?.closest("article"));

  appendIfFound(contactCenterShell, leadDetailModal);
  appendIfFound(contactCenterShell, leadActivationModal);

  state.contactCenterMounted = true;
}

function contactCenterStageConfig(tab = state.contactCenterTab || "overview") {
  const configs = {
    overview: {
      meta: "Vista 1 de 6 · Resumen",
      title: "Resumen operativo de contactos",
      copy: "Mira primero las prioridades, señales comerciales, leads con probabilidad de compra y acciones urgentes.",
      primaryLabel: "Ver CRM",
      primaryAction: "go-directory",
      secondaryLabel: "Exportar contactos",
      secondaryAction: "export-all",
    },
    directory: {
      meta: "Vista 2 de 6 · Contactos CRM",
      title: "Directorio CRM y fichas comerciales",
      copy: "Busca, filtra y abre la ficha de cada contacto sin mezclar formularios, ventas ni capturas.",
      primaryLabel: "Agregar prospecto",
      primaryAction: "manual-lead",
      secondaryLabel: "Exportar contactos",
      secondaryAction: "export-all",
    },
    tickets: {
      meta: "Vista 3 de 6 · Tickets",
      title: "Seguimiento por estado de ticket",
      copy: "Separa activos sin redimir, expirados, no activos y redimidos para enviar recordatorios o revisar la ficha.",
      primaryLabel: "Exportar activos",
      primaryAction: "export-active",
      secondaryLabel: "Ver CRM",
      secondaryAction: "go-directory",
    },
    captures: {
      meta: "Vista 4 de 6 · Capturas",
      title: "Capturas, formularios y activos",
      copy: "Revisa las experiencias que capturan leads: landing, ebook, QR, consentimiento y descargas.",
      primaryLabel: "Crear captura",
      primaryAction: "create-capture",
      secondaryLabel: "Ver CRM",
      secondaryAction: "go-directory",
    },
    manual: {
      meta: "Vista 5 de 6 · Prospecto manual",
      title: "Registrar contacto manual",
      copy: "Agrega contactos que llegan por WhatsApp, llamada, correo, feria o referido y envíalos al CRM unificado.",
      primaryLabel: "Completar formulario",
      primaryAction: "manual-lead",
      secondaryLabel: "Ver CRM",
      secondaryAction: "go-directory",
    },
    sales: {
      meta: "Vista 6 de 6 · Conversion",
      title: "Convertidos, ventas y cierre",
      copy: "Registra compras, mide revenue y conecta clientes convertidos con campañas, tickets y seguimiento.",
      primaryLabel: "Registrar venta",
      primaryAction: "create-sale",
      secondaryLabel: "Exportar base",
      secondaryAction: "export-all",
    },
  };
  return configs[tab] || configs.overview;
}

function updateContactCenterStage(tab = state.contactCenterTab || "overview") {
  const config = contactCenterStageConfig(tab);
  if (contactCenterStageMeta) contactCenterStageMeta.textContent = config.meta;
  if (contactCenterStageTitle) contactCenterStageTitle.textContent = config.title;
  if (contactCenterStageCopy) contactCenterStageCopy.textContent = config.copy;
  if (contactCenterPrimaryAction) {
    contactCenterPrimaryAction.textContent = config.primaryLabel;
    contactCenterPrimaryAction.dataset.contactCenterAction = config.primaryAction;
  }
  if (contactCenterSecondaryAction) {
    contactCenterSecondaryAction.textContent = config.secondaryLabel;
    contactCenterSecondaryAction.dataset.contactCenterAction = config.secondaryAction;
  }
}

function handleContactCenterStageAction(action = "") {
  if (action === "manual-lead") {
    setContactCenterTab("manual");
    manualLeadForm?.scrollIntoView({ behavior: "smooth", block: "start" });
    manualLeadNameInput?.focus();
    return;
  }
  if (action === "create-capture") {
    setContactCenterTab("captures");
    leadCaptureForm?.scrollIntoView({ behavior: "smooth", block: "start" });
    leadCaptureNameInput?.focus();
    return;
  }
  if (action === "create-sale") {
    setContactCenterTab("sales");
    document.getElementById("customerAcquisitionForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
    customerAcquisitionNameInput?.focus();
    return;
  }
  if (action === "go-overview" || action === "go-directory") {
    setContactCenterTab(action === "go-directory" ? "directory" : "overview");
    return;
  }
  if (action === "go-tickets") {
    setContactCenterTab("tickets");
    return;
  }
  if (action === "export-active") {
    if (leadExportScopeInput) leadExportScopeInput.value = "active";
    exportLeads();
    return;
  }
  if (action === "export-all") {
    if (leadExportScopeInput) leadExportScopeInput.value = "all";
    exportLeads();
  }
}

function setContactCenterTab(tab = "overview") {
  const nextTab = CONTACT_CENTER_TAB_KEYS.includes(tab) ? tab : "overview";
  state.contactCenterTab = nextTab;
  updateContactCenterStage(nextTab);
  if (state.currentView === "leads") {
    navButtons.forEach((button) => {
      const isSalesAlias = button.dataset.view === "sales" && nextTab === "sales";
      const isLeadsBase = button.dataset.view === "leads" && nextTab !== "sales";
      button.classList.toggle("active", isSalesAlias || isLeadsBase);
    });
  }
  contactCenterTabs.forEach((button) => {
    const active = button.dataset.contactCenterTab === nextTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.tabIndex = active ? 0 : -1;
  });
  contactCenterPanels.forEach((panel) => {
    const active = panel.dataset.contactCenterPanel === nextTab;
    panel.classList.toggle("active", active);
    panel.classList.toggle("hidden", !active);
    panel.hidden = !active;
  });
  if (nextTab === "captures") {
    renderLeadCaptureTable();
    renderLeadCaptureAssetOptions();
  }
  if (nextTab === "sales") renderSalesView();
}

function updateContactCenterCounts({ totalContacts = 0, visibleContacts = 0, ticketTotal = 0, capturedLeads = 0, manualContacts = 0, converted = 0 } = {}) {
  if (contactTabOverviewCount) contactTabOverviewCount.textContent = Number(totalContacts || 0).toLocaleString("es-CO");
  if (contactTabDirectoryCount) contactTabDirectoryCount.textContent = Number(visibleContacts || totalContacts || 0).toLocaleString("es-CO");
  if (contactTabTicketsCount) contactTabTicketsCount.textContent = Number(ticketTotal || 0).toLocaleString("es-CO");
  if (contactTabCapturesCount) contactTabCapturesCount.textContent = Number(capturedLeads || 0).toLocaleString("es-CO");
  if (contactTabManualCount) contactTabManualCount.textContent = Number(manualContacts || 0).toLocaleString("es-CO");
  if (contactTabSalesCount) contactTabSalesCount.textContent = Number(converted || 0).toLocaleString("es-CO");
}

function contactActionDate(item = {}) {
  return item.last_interaction_at
    || item.last_ticket_at
    || item.last_purchase_at
    || item.updated_at
    || item.created_at
    || "";
}

function renderContactActionFeed(crmRows = [], feedRows = []) {
  if (!contactActionFeed) return;
  const items = [];
  const seen = new Set();
  const pushItem = (item) => {
    if (!item?.leadId) return;
    const key = `${item.kind}:${item.leadId}:${item.sourceType || "PLAYER"}:${item.ticketId || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  crmRows.forEach((lead) => {
    const sourceType = lead.source_type || "PLAYER";
    const name = lead.name || "Lead sin nombre";
    const base = {
      leadId: lead.id,
      sourceType,
      phone: lead.phone || "",
      name,
      date: contactActionDate(lead),
    };
    if (String(lead.care_priority || "").toUpperCase() === "HIGH") {
      pushItem({
        ...base,
        kind: "priority",
        icon: "priority_high",
        tone: "danger",
        title: `Atender hoy a ${name}`,
        detail: lead.recommended_action || "Abrir ficha, revisar contexto y definir siguiente accion.",
        badge: Number(lead.attention_score || 0) ? `${Number(lead.attention_score || 0)} pts` : "Alta",
        openTab: "summary",
      });
    }
    if (Number(lead.active_tickets || 0) > 0) {
      pushItem({
        ...base,
        kind: "active-ticket",
        icon: "confirmation_number",
        tone: "ok",
        title: `${Number(lead.active_tickets || 0)} ticket activo sin redimir`,
        detail: `${name} puede recibir recordatorio por WhatsApp o abrir ficha de tickets.`,
        badge: "Recordar",
        ticketId: lead.active_ticket_qr_id || "",
        openTab: "benefits",
      });
    }
    if (Number(lead.expired_tickets || 0) > 0) {
      pushItem({
        ...base,
        kind: "expired-ticket",
        icon: "event_busy",
        tone: "danger",
        title: `${Number(lead.expired_tickets || 0)} ticket expirado`,
        detail: "Revisar si conviene crear una nueva oferta o cerrar seguimiento.",
        badge: "Vencido",
        openTab: "benefits",
      });
    }
    if (Number(lead.purchase_count || 0) > 0) {
      pushItem({
        ...base,
        kind: "buyer",
        icon: "point_of_sale",
        tone: "ok",
        title: `${name} ya compro`,
        detail: `${Number(lead.purchase_count || 0)} compras registradas · ${money(lead.total_spent || 0)}.`,
        badge: "Cliente",
        openTab: "purchases",
      });
    }
    if (!lead.email && !lead.phone) {
      pushItem({
        ...base,
        kind: "missing-contact",
        icon: "contact_mail",
        tone: "pending",
        title: `Completar datos de ${name}`,
        detail: "No tiene correo ni telefono visible; completa contacto antes de activar.",
        badge: "Datos",
        openTab: "personal",
      });
    }
  });

  feedRows.slice(0, 8).forEach((lead) => {
    if (!lead.id) return;
    pushItem({
      leadId: lead.id,
      sourceType: lead.source_type || "PLAYER",
      phone: lead.phone || "",
      name: lead.name || "Contacto",
      date: contactActionDate(lead),
      kind: "recent",
      icon: "history",
      tone: lead.lead_temperature === "buyer" ? "ok" : lead.lead_temperature === "hot" ? "warning" : "pending",
      title: lead.name || "Contacto reciente",
      detail: [lead.attribution_source || "Origen no definido", lead.recommended_action || lead.campaign_name || "Sin accion sugerida"].filter(Boolean).join(" · "),
      badge: lead.lead_temperature || "Reciente",
      openTab: "summary",
    });
  });

  const priorityWeight = { danger: 3, ok: 2, warning: 1, pending: 0 };
  const visibleItems = items
    .sort((a, b) => {
      const toneDelta = (priorityWeight[b.tone] || 0) - (priorityWeight[a.tone] || 0);
      if (toneDelta) return toneDelta;
      return new Date(b.date || 0) - new Date(a.date || 0);
    })
    .slice(0, 10);

  contactActionFeed.innerHTML = `
    <div class="contact-action-feed-head">
      <div>
        <span class="mono-label">Feed de interacción</span>
        <h3>Qué atender ahora</h3>
        <p>Ordenado por prioridad, tickets activos, vencimientos, compradores y datos incompletos.</p>
      </div>
      <span class="pill muted">${visibleItems.length.toLocaleString("es-CO")} acciones visibles</span>
    </div>
    <div class="contact-action-list">
      ${visibleItems.map((item) => `
        <article class="contact-action-item is-${escapeHtml(item.tone || "pending")}">
          <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(item.icon || "task_alt")}</span>
          <button class="contact-action-main" type="button" data-contact-open-lead="${escapeHtml(item.leadId)}" data-source-type="${escapeHtml(item.sourceType || "PLAYER")}" data-open-tab="${escapeHtml(item.openTab || "summary")}">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.detail || "")}</small>
          </button>
          <div class="contact-action-side">
            <span class="status-chip ${escapeHtml(item.tone || "pending")}">${escapeHtml(item.badge || "Accion")}</span>
            <small>${escapeHtml(formatDate(item.date))}</small>
            ${item.ticketId ? `<button class="ghost-button" type="button" data-contact-ticket-whatsapp="${escapeHtml(item.ticketId)}" data-lead-phone="${escapeHtml(item.phone || "")}" data-lead-name="${escapeHtml(item.name || "")}">WhatsApp</button>` : ""}
          </div>
        </article>
      `).join("") || '<div class="empty-state compact">No hay acciones visibles con los filtros actuales.</div>'}
    </div>
  `;
  contactActionFeed.querySelectorAll("[data-contact-open-lead]").forEach((button) => {
    button.addEventListener("click", () => openLeadDetail({
      id: button.dataset.contactOpenLead,
      source_type: button.dataset.sourceType || "PLAYER",
    }, { tab: button.dataset.openTab || "summary" }));
  });
  contactActionFeed.querySelectorAll("[data-contact-ticket-whatsapp]").forEach((button) => {
    button.addEventListener("click", () => shareLeadQrWhatsApp(button.dataset.contactTicketWhatsapp, button.dataset.leadPhone, button.dataset.leadName));
  });
}

function renderContactCenterSummary(crmRows = []) {
  if (!contactCenterSummaryGrid) return;
  const totalContacts = Number(state.leadCrmPagination?.total ?? crmRows.length);
  const capturedLeads = (state.leadCaptureActivations || [])
    .reduce((sum, item) => sum + Number(item.metrics?.leads_captured || 0), 0);
  const buyers = crmRows.filter((item) => Number(item.purchase_count || 0) > 0).length;
  const sales = state.selectedSales || [];
  const revenue = sales.reduce((sum, item) => sum + toNumber(item.sale_amount), 0);
  const activeTickets = crmRows.reduce((sum, item) => sum + Number(item.active_tickets || 0), 0);
  const expiredTickets = crmRows.reduce((sum, item) => sum + Number(item.expired_tickets || 0), 0);
  const inactiveTickets = crmRows.reduce((sum, item) => sum + Number(item.inactive_tickets || 0), 0);
  const redeemedTickets = crmRows.reduce((sum, item) => sum + Number(item.redeemed_tickets || 0), 0);
  const manualContacts = crmRows.filter((item) => String(item.source_type || "").toUpperCase() === "MANUAL").length;
  const conversionRate = totalContacts ? safeRate(buyers || sales.length, totalContacts) : "0%";
  updateContactCenterCounts({
    totalContacts,
    visibleContacts: crmRows.length,
    ticketTotal: activeTickets + expiredTickets + inactiveTickets + redeemedTickets,
    capturedLeads,
    manualContacts,
    converted: buyers || sales.length,
  });
  contactCenterSummaryGrid.innerHTML = [
    ["Contactos unificados", totalContacts, "CRM, manuales, compradores y capturas"],
    ["Capturados", capturedLeads, `${(state.leadCaptureActivations || []).length} capturas activas o historicas`],
    ["Convertidos", buyers || sales.length, `${conversionRate} de conversion visible`],
    ["Revenue registrado", money(revenue), `${sales.length} ventas en la campaña`],
    ["Tickets activos", activeTickets, "Beneficios pendientes de redimir"],
    ["Tickets vencidos", expiredTickets, "Requieren cierre o nueva oferta"],
    ["Tickets no activos", inactiveTickets, "Sin reclamar, cancelados o no usables"],
  ].map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value ?? 0)}</strong>
      <div class="kpi-meta">${escapeHtml(meta || "")}</div>
    </article>
  `).join("");
}

function renderLeadTicketInventoryBoard(crmRows = []) {
  if (!leadTicketInventoryBoard) return;
  const groups = [
    {
      key: "active",
      title: "Tickets activos sin redimir",
      meta: "Listos para enviar o recordar por WhatsApp",
      rows: crmRows.filter((item) => Number(item.active_tickets || 0) > 0),
      tone: "ok",
    },
    {
      key: "expired",
      title: "Tickets expirados",
      meta: "Perdieron vigencia antes de redimirse",
      rows: crmRows.filter((item) => Number(item.expired_tickets || 0) > 0),
      tone: "danger",
    },
    {
      key: "inactive",
      title: "Tickets no activos",
      meta: "Sin reclamar, cancelados, reclamados o en estado no usable",
      rows: crmRows.filter((item) => Number(item.inactive_tickets || 0) > 0),
      tone: "pending",
    },
    {
      key: "redeemed",
      title: "Tickets redimidos",
      meta: "Ya usados o validados",
      rows: crmRows.filter((item) => Number(item.redeemed_tickets || 0) > 0),
      tone: "pending",
    },
  ];
  leadTicketInventoryBoard.innerHTML = groups.map((group) => `
    <article class="lead-ticket-inventory-card is-${escapeHtml(group.key)}">
      <div class="lead-ticket-inventory-head">
        <span class="mono-label">${escapeHtml(group.title)}</span>
        <strong>${group.rows.reduce((sum, item) => sum + Number(item[`${group.key}_tickets`] || 0), 0).toLocaleString("es-CO")}</strong>
        <small>${escapeHtml(group.meta)}</small>
      </div>
      <div class="lead-ticket-inventory-list">
        ${group.rows.slice(0, 8).map((item) => `
          <div class="lead-ticket-inventory-row">
            <button class="lead-ticket-inventory-main" type="button" data-open-ticket-lead="${escapeHtml(item.id)}" data-source-type="${escapeHtml(item.source_type || "PLAYER")}">
              <span><strong>${escapeHtml(item.name || "Lead sin nombre")}</strong><small>${escapeHtml(leadTicketInventoryText(item))}</small></span>
              <span class="status-chip ${escapeHtml(group.tone)}">${escapeHtml(group.key === "active" ? "Activo" : group.key === "expired" ? "Expirado" : group.key === "inactive" ? "No activo" : "Redimido")}</span>
            </button>
            ${group.key === "active" && item.active_ticket_qr_id ? `
              <div class="lead-ticket-inventory-actions">
                <button class="ghost-button" type="button" data-inventory-ticket-send="${escapeHtml(item.active_ticket_qr_id)}">Enviar ticket</button>
                <button class="ghost-button" type="button" data-inventory-ticket-whatsapp="${escapeHtml(item.active_ticket_qr_id)}" data-lead-phone="${escapeHtml(item.phone || "")}" data-lead-name="${escapeHtml(item.name || "")}">Recordar WhatsApp</button>
              </div>
            ` : ""}
          </div>
        `).join("") || '<div class="empty-state compact">Sin registros en este estado.</div>'}
      </div>
    </article>
  `).join("");
  leadTicketInventoryBoard.querySelectorAll("[data-open-ticket-lead]").forEach((button) => {
    button.addEventListener("click", () => openLeadDetail({
      id: button.dataset.openTicketLead,
      source_type: button.dataset.sourceType || "PLAYER",
    }, { tab: "benefits" }));
  });
  leadTicketInventoryBoard.querySelectorAll("[data-inventory-ticket-send]").forEach((button) => {
    button.addEventListener("click", () => downloadLeadQr(button.dataset.inventoryTicketSend));
  });
  leadTicketInventoryBoard.querySelectorAll("[data-inventory-ticket-whatsapp]").forEach((button) => {
    button.addEventListener("click", () => shareLeadQrWhatsApp(button.dataset.inventoryTicketWhatsapp, button.dataset.leadPhone, button.dataset.leadName));
  });
}

function renderLegacyLeadTables(feedRows) {
  if (leadFeedTable) {
    leadFeedTable.innerHTML = feedRows.slice(0, 40).map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.name || "Sin nombre")}</strong><br><span class="table-secondary">${escapeHtml(item.phone || item.email || item.document_id || "Sin contacto")}</span></td>
        <td>${escapeHtml(prettyLeadValue(item.attribution_source || "-"))}</td>
        <td>${escapeHtml(item.campaign_name || "Sin campaña")}<br><span class="table-secondary">${escapeHtml(item.attribution_subject || "-")}</span></td>
        <td><span class="status-chip ${item.lead_temperature === "buyer" ? "ok" : item.lead_temperature === "hot" ? "warning" : "pending"}">${escapeHtml(item.lead_temperature || "-")}</span><br><span class="table-secondary">${escapeHtml(item.qr_status || item.stage || "-")}</span></td>
        <td>${item.sale_amount ? money(item.sale_amount) : "-"}</td>
        <td>${escapeHtml(item.recommended_action || "-")}</td>
      </tr>
    `).join("") || '<tr><td colspan="6">Sin contactos dentro de la retención de tu plan.</td></tr>';
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
  ).slice(0, 60);
  if (!campaignLeadsTable) return;
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
  `).join("") || `<tr><td colspan="9">${state.selectedCampaignId ? "Sin leads para esta campaña." : "Sin contactos capturados."}</td></tr>`;
  campaignLeadsTable.querySelectorAll("[data-download-qr]").forEach((button) => {
    button.addEventListener("click", () => downloadLeadQr(button.dataset.downloadQr));
  });
  campaignLeadsTable.querySelectorAll("[data-share-qr-wa]").forEach((button) => {
    button.addEventListener("click", () => shareLeadQrWhatsApp(button.dataset.shareQrWa, button.dataset.leadPhone, button.dataset.leadName));
  });
}

function renderLeadsView() {
  mountContactCenterLayout();
  refreshLeadCampaignFilterOptions();
  const feedRows = filterRows(state.contactFeed || [], [
    "name", "document_id", "phone", "email", "campaign_name", "attribution_source", "attribution_subject", "lead_temperature", "recommended_action",
  ]);
  const crmRows = state.leadCrmRows || [];
  const buyers = crmRows.filter((item) => Number(item.purchase_count || 0) > 0).length;
  const totalScore = crmRows.reduce((sum, item) => sum + Number(item.score_total || 0), 0);
  const activeTickets = crmRows.reduce((sum, item) => sum + Number(item.active_tickets || 0), 0);
  const expiredTickets = crmRows.reduce((sum, item) => sum + Number(item.expired_tickets || 0), 0);
  const inactiveTickets = crmRows.reduce((sum, item) => sum + Number(item.inactive_tickets || 0), 0);
  const redeemedTickets = crmRows.reduce((sum, item) => sum + Number(item.redeemed_tickets || 0), 0);
  const highPriority = crmRows.filter((item) => String(item.care_priority || "").toUpperCase() === "HIGH").length;
  const withoutContact = crmRows.filter((item) => !item.email && !item.phone).length;
  const customers = crmRows
    .filter((item) => Number(item.purchase_count || 0) > 0)
    .sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0))
    .slice(0, 4);
  const leadProbabilityGroups = [
    {
      key: "HIGH",
      title: "Probabilidad alta",
      meta: "Leads sin compra con ticket activo, activaciones o alta interacción",
      rows: crmRows.filter((item) => Number(item.purchase_count || 0) === 0 && String(item.care_priority || "").toUpperCase() === "HIGH"),
    },
    {
      key: "MEDIUM",
      title: "Probabilidad media",
      meta: "Leads no convertidos con señales parciales",
      rows: crmRows.filter((item) => Number(item.purchase_count || 0) === 0 && String(item.care_priority || "").toUpperCase() === "MEDIUM"),
    },
    {
      key: "LOW",
      title: "Probabilidad baja",
      meta: "Leads con poca información o baja actividad",
      rows: crmRows.filter((item) => Number(item.purchase_count || 0) === 0 && String(item.care_priority || "").toUpperCase() === "LOW"),
    },
  ];

  if (leadFeedKpiGrid) {
    leadFeedKpiGrid.innerHTML = [
      ["Atender hoy", highPriority, "Tickets activos, seguimiento o conversion"],
      ["Leads CRM", state.leadCrmPagination?.total ?? crmRows.length, state.contactFeedRetention?.label || "Busqueda paginada"],
      ["Compradores", buyers, "Con venta registrada"],
      ["Score acumulado", totalScore.toLocaleString("es-CO"), "Juegos y trivias"],
      ["Tickets activos", activeTickets, "Beneficios sin redimir"],
      ["Tickets vencidos", expiredTickets, "Perdieron vigencia"],
      ["Tickets no activos", inactiveTickets, "Sin reclamar o cancelados"],
      ["Tickets redimidos", redeemedTickets, "Usados o validados"],
      ["Sin contacto", withoutContact, "Completar antes de activar"],
    ].map(([label, value, meta]) => `
      <article class="kpi-card">
        <span class="mono-label">${escapeHtml(label)}</span>
        <strong>${escapeHtml(value ?? 0)}</strong>
        <div class="kpi-meta">${escapeHtml(meta || "")}</div>
      </article>
    `).join("");
  }
  renderContactCenterSummary(crmRows);
  renderContactActionFeed(crmRows, feedRows);
  renderLeadTicketInventoryBoard(crmRows);
  if (leadAttentionBoard) {
    const customerPanel = `
      <article class="lead-segment-card">
        <div class="lead-segment-head">
          <span class="mono-label">Base de clientes</span>
          <strong>${customers.length ? `${customers.length} visibles` : "Sin compradores visibles"}</strong>
        </div>
        <div class="lead-segment-list">
          ${customers.length ? customers.map((item) => `
            <button class="lead-segment-row" type="button" data-lead-id="${escapeHtml(item.id)}" data-source-type="${escapeHtml(item.source_type || "PLAYER")}">
              <span><strong>${escapeHtml(item.name || "Cliente")}</strong><small>${Number(item.purchase_count || 0)} compras · ${escapeHtml(money(item.total_spent || 0))}</small></span>
              <span class="status-chip ok">Cliente</span>
            </button>
          `).join("") : '<div class="empty-state compact">Los leads convertidos aparecerán aquí como clientes.</div>'}
        </div>
      </article>
    `;
    const probabilityPanels = leadProbabilityGroups.map((group) => {
      const rows = group.rows
        .slice()
        .sort((a, b) => Number(b.attention_score || 0) - Number(a.attention_score || 0))
        .slice(0, 4);
      return `
        <article class="lead-segment-card">
          <div class="lead-segment-head">
            <span class="mono-label">${escapeHtml(group.title)}</span>
            <strong>${group.rows.length.toLocaleString("es-CO")}</strong>
            <small>${escapeHtml(group.meta)}</small>
          </div>
          <div class="lead-segment-list">
            ${rows.length ? rows.map((item) => `
              <button class="lead-segment-row" type="button" data-lead-id="${escapeHtml(item.id)}" data-source-type="${escapeHtml(item.source_type || "PLAYER")}">
                <span>
                  <strong>${escapeHtml(item.name || "Lead sin nombre")}</strong>
                  <small>${escapeHtml(item.recommended_action || "Revisar ficha comercial.")}</small>
                </span>
                <span class="status-chip ${leadPriorityChipClass(item.care_priority)}">${Number(item.attention_score || 0)}</span>
              </button>
            `).join("") : '<div class="empty-state compact">Sin leads en esta categoría.</div>'}
          </div>
        </article>
      `;
    }).join("");
    leadAttentionBoard.innerHTML = customerPanel + probabilityPanels;
    leadAttentionBoard.querySelectorAll("[data-lead-id]").forEach((button) => {
      button.addEventListener("click", () => openLeadDetail({
        id: button.dataset.leadId,
        source_type: button.dataset.sourceType || "PLAYER",
      }));
    });
  }
  if (leadFeedRetention) {
    leadFeedRetention.textContent = `Retención ${state.contactFeedRetention?.label || "según plan"}`;
  }
  renderLeadCrmTable();
  renderLeadCaptureTable();
  if (state.contactCenterTab === "sales") renderSalesView();
  renderLegacyLeadTables(feedRows);
  setContactCenterTab(state.contactCenterTab);
}

function detailList(rows = [], empty = "Sin registros.") {
  return rows.length
    ? rows.map((row) => `<article class="lead-detail-item">${row}</article>`).join("")
    : `<div class="empty-state compact">${escapeHtml(empty)}</div>`;
}

function daysSince(dateValue) {
  if (!dateValue) return null;
  const time = new Date(dateValue).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function isRedeemedTicket(ticket = {}) {
  return String(ticket.status || "").toUpperCase() === "REDEEMED" || Boolean(ticket.redeemed_at);
}

function isExpiredTicket(ticket = {}) {
  if (isRedeemedTicket(ticket)) return false;
  const status = String(ticket.status || "").toUpperCase();
  return status === "EXPIRED" || (status === "ACTIVE" && ticket.expires_at && new Date(ticket.expires_at) <= new Date());
}

function isActiveTicket(ticket = {}) {
  if (isRedeemedTicket(ticket)) return false;
  if (isExpiredTicket(ticket)) return false;
  if (ticket.is_available === true) return true;
  if (ticket.is_available === false) return false;
  if (String(ticket.status || "").toUpperCase() !== "ACTIVE") return false;
  return !ticket.expires_at || new Date(ticket.expires_at) > new Date();
}

function isInactiveTicket(ticket = {}) {
  return !isActiveTicket(ticket) && !isRedeemedTicket(ticket) && !isExpiredTicket(ticket);
}

function ticketStatusLabel(ticket = {}) {
  if (isRedeemedTicket(ticket)) return "Redimido";
  if (isActiveTicket(ticket)) return "Activo";
  if (isExpiredTicket(ticket)) return "Vencido";
  const status = String(ticket.status || "").toUpperCase();
  const labels = {
    UNCLAIMED: "Sin reclamar",
    CLAIMED: "Reclamado",
    EXPIRED: "Vencido",
    CANCELLED: "Cancelado",
  };
  return labels[status] || status || "Sin estado";
}

function ticketStatusClass(ticket = {}) {
  if (isActiveTicket(ticket)) return "ok";
  if (isRedeemedTicket(ticket)) return "pending";
  if (isExpiredTicket(ticket)) return "danger";
  return "pending";
}

function ticketTitle(ticket = {}) {
  const benefit = ticket.reward_name || ticket.benefit_value?.label || ticket.benefit_value?.value || ticket.benefit_type || ticket.origin_type || "Ticket";
  return String(benefit || "Ticket");
}

function ticketSourceTitle(ticket = {}) {
  return ticket.source_label || ticket.source_name || ticket.campaign_name || ticket.origin_type || "Origen no definido";
}

function ticketSourceDescription(ticket = {}) {
  return [
    ticket.source_name && ticket.source_name !== ticket.source_label ? ticket.source_name : "",
    ticket.source_detail,
  ].filter(Boolean).join(" - ") || "Sin detalle de origen.";
}

function ticketPublicUrl(ticket = {}) {
  return ticket.public_ticket_url
    || ticket.share_url
    || ticket.claim_url
    || (ticket.token ? `${window.location.origin}/claim/${encodeURIComponent(ticket.token)}` : "");
}

function ticketGroups(tickets = []) {
  return {
    active: tickets.filter(isActiveTicket),
    expired: tickets.filter(isExpiredTicket),
    inactive: tickets.filter(isInactiveTicket),
    redeemed: tickets.filter(isRedeemedTicket),
    other: tickets.filter(isInactiveTicket),
  };
}

function firstActiveLeadTicket(detail = state.selectedLeadDetail) {
  return ticketGroups(detail?.benefits || []).active[0] || null;
}

function renderTicketCards(tickets = [], empty = "Sin tickets en este grupo.") {
  if (!tickets.length) return `<div class="empty-state compact">${escapeHtml(empty)}</div>`;
  return `<div class="lead-ticket-grid">${tickets.map((ticket) => {
    const publicUrl = ticketPublicUrl(ticket);
    const meta = [
      ticketSourceTitle(ticket),
      ticket.source_campaign || ticket.campaign_name || "Sin campana",
      ticket.created_at ? `emitido ${formatDate(ticket.created_at)}` : "",
    ].filter(Boolean).join(" | ");
    const benefitValue = ticket.benefit_value?.label || ticket.benefit_value?.value || ticket.benefit_type || ticket.reward_name || "-";
    return `
      <article class="lead-ticket-card">
        <div class="lead-ticket-head">
          <div>
            <strong>${escapeHtml(ticketTitle(ticket))}</strong>
            <small>${escapeHtml(meta)}</small>
          </div>
          <span class="status-chip ${ticketStatusClass(ticket)}">${escapeHtml(ticketStatusLabel(ticket))}</span>
        </div>
        <div class="lead-ticket-origin">
          <span class="mono-label">Origen del ticket</span>
          <strong>${escapeHtml(ticketSourceTitle(ticket))}</strong>
          <p>${escapeHtml(ticketSourceDescription(ticket))}</p>
        </div>
        <div class="lead-ticket-meta">
          <span><strong>Campaña</strong>${escapeHtml(ticket.source_campaign || ticket.campaign_name || "-")}</span>
          <span><strong>Canal</strong>${escapeHtml(ticket.source_channel || ticket.lead_activation_channel || ticket.batch_channel_use || "-")}</span>
          <span><strong>Vence</strong>${formatDate(ticket.expires_at)}</span>
          <span><strong>Beneficio</strong>${escapeHtml(benefitValue)}</span>
          <span><strong>Tipo</strong>${escapeHtml(ticket.origin_type || "-")}</span>
          <span><strong>ID</strong>${escapeHtml(ticket.id || "-")}</span>
        </div>
        <div class="activation-row-actions">
          ${isActiveTicket(ticket) ? `<button class="solid-button compact" type="button" data-share-ticket-whatsapp="${escapeHtml(ticket.id)}">Recordar WhatsApp</button>` : ""}
          ${isActiveTicket(ticket) ? `<button class="ghost-button" type="button" data-download-ticket="${escapeHtml(ticket.id)}">Descargar imagen</button>` : ""}
          ${publicUrl ? `<a class="ghost-button" href="${escapeHtml(publicUrl)}" target="_blank" rel="noreferrer">Abrir ticket</a>` : ""}
          ${publicUrl ? `<button class="ghost-button" type="button" data-copy-link="${escapeHtml(publicUrl)}">Copiar ticket</button>` : ""}
        </div>
      </article>
    `;
  }).join("")}</div>`;
}

function leadAnalysisModel(detail = {}) {
  const lead = detail.lead || {};
  const summary = detail.summary || {};
  const purchases = detail.purchases || [];
  const activations = detail.activations || [];
  const benefits = detail.benefits || [];
  const rewardPasses = detail.reward_passes || [];
  const games = detail.games || [];
  const communications = detail.communications || [];
  const timeline = detail.timeline || [];
  const purchaseCount = Number(summary.purchase_count || purchases.length || 0);
  const totalSpent = Number(summary.total_spent || 0);
  const scoreTotal = Number(summary.score_total || 0);
  const redeemed = Number(summary.benefits_redeemed || 0);
  const benefitsTotal = Number(summary.benefits_received || benefits.length + rewardPasses.length || 0);
  const lastInteractionDays = daysSince(summary.last_interaction_at || lead.updated_at || lead.created_at);
  const hasRecentInteraction = lastInteractionDays !== null && lastInteractionDays <= 30;
  const hasContact = Boolean(lead.email || lead.phone);
  const hasConsentSignal = timeline.some((item) => String(item.type || "").includes("consent")) || communications.length > 0;
  const redemptionRate = benefitsTotal ? Math.round((redeemed / benefitsTotal) * 100) : 0;
  const conversionWeight = purchaseCount > 1 ? 30 : purchaseCount === 1 ? 22 : 0;
  const spendWeight = totalSpent >= 3000000 ? 18 : totalSpent >= 1000000 ? 12 : totalSpent > 0 ? 7 : 0;
  const engagementWeight = Math.min(20, activations.length * 3 + games.length * 4 + communications.length * 2);
  const scoreWeight = Math.min(15, Math.floor(scoreTotal / 50));
  const recencyWeight = hasRecentInteraction ? 10 : lastInteractionDays === null ? 2 : lastInteractionDays <= 90 ? 5 : 0;
  const dataWeight = hasContact ? 7 : 0;
  const healthScore = Math.min(100, conversionWeight + spendWeight + engagementWeight + scoreWeight + recencyWeight + dataWeight);
  const topInterest = (detail.interests || [])[0]?.interest_name || lead.interest || lead.channel || "Sin interes dominante";
  const stage = purchaseCount > 1
    ? "Cliente recurrente"
    : purchaseCount === 1
      ? "Comprador"
      : redeemed > 0
        ? "Redimio beneficio"
        : benefitsTotal > 0
          ? "Beneficio emitido"
          : games.length > 0
            ? "Interactuo con juego"
            : activations.length > 0
              ? "Activado"
              : "Lead capturado";
  const probability = purchaseCount > 1 || healthScore >= 78
    ? "Alta"
    : healthScore >= 52 || (activations.length && hasRecentInteraction)
      ? "Media"
      : healthScore >= 28
        ? "Baja con seguimiento"
        : "Por desarrollar";
  const risks = [
    !hasContact ? "Faltan datos de contacto para activarlo por canal directo." : "",
    lastInteractionDays !== null && lastInteractionDays > 90 ? `Sin interaccion hace ${lastInteractionDays} dias.` : "",
    activations.length > 0 && purchaseCount === 0 ? "Ha recibido activaciones pero aun no compra." : "",
    benefitsTotal > 0 && redeemed === 0 ? "Tiene beneficios sin redimir." : "",
    !hasConsentSignal ? "No hay senal clara de consentimiento/comunicacion en historial." : "",
  ].filter(Boolean);
  const nextActions = [];
  if (purchaseCount === 0) {
    nextActions.push({ title: "Convertir primera compra", detail: "Enviar beneficio de bienvenida con vencimiento corto.", preset: "FIRST_PURCHASE", tone: "warning" });
  }
  if (purchaseCount > 0 && purchaseCount < 2) {
    nextActions.push({ title: "Activar recompra", detail: "Enviar ticket de recompra ligado al interes principal.", preset: "REBUY", tone: "ok" });
  }
  if (healthScore >= 72 || totalSpent >= 2000000) {
    nextActions.push({ title: "Atencion VIP", detail: "Crear trato preferencial, invitacion o giftcard controlada.", preset: "VIP_ATTENTION", tone: "ok" });
  }
  if (!games.length || scoreTotal < 80) {
    nextActions.push({ title: "Microjuego de perfilamiento", detail: "Recolectar preferencia y score para segmentacion.", preset: "MICROGAME", tone: "pending" });
  }
  if (risks.length) {
    nextActions.push({ title: "Nota de seguimiento", detail: risks[0], preset: "NOTE", tone: "danger" });
  }
  return {
    dataQuality: hasContact ? (lead.email && lead.phone ? "Completa" : "Util") : "Incompleta",
    funnel: [
      ["Lead", true],
      ["Activacion", activations.length > 0],
      ["Juego/Trivia", games.length > 0],
      ["Ticket", benefitsTotal > 0],
      ["Redencion", redeemed > 0],
      ["Venta", purchaseCount > 0],
      ["Revenue", totalSpent > 0],
    ],
    healthScore,
    lastInteractionDays,
    nextActions: nextActions.slice(0, 5),
    probability,
    redemptionRate,
    risks,
    stage,
    topInterest,
  };
}

function renderLeadDetailHeader(detail) {
  const lead = detail.lead || {};
  const summary = detail.summary || {};
  const analysis = leadAnalysisModel(detail);
  const tickets = detail.benefits || [];
  const groupedTickets = ticketGroups(tickets);
  if (leadDetailTitle) leadDetailTitle.textContent = lead.name || "Lead sin nombre";
  if (leadDetailSubtitle) {
    leadDetailSubtitle.textContent = `${lead.document_id || "Sin documento"} · ${lead.email || "Sin email"} · ${lead.phone || "Sin telefono"}`;
  }
  if (leadDetailEyebrow) {
    leadDetailEyebrow.textContent = `${lead.source_type || "PLAYER"} · ${lead.level || "Lead"}`;
  }
  if (!leadDetailHeader) return;
  leadDetailHeader.innerHTML = `
    <div class="lead-identity-block">
      <div class="lead-status-row">
        <span class="status-chip ${commercialChipClass(lead.commercial_status)}">${escapeHtml(lead.commercial_status_label || lead.commercial_status || "Nuevo")}</span>
        <span class="pill muted">${escapeHtml(analysis.stage)}</span>
        <span class="pill muted">Recompra ${escapeHtml(analysis.probability)}</span>
        <span class="pill muted">Datos ${escapeHtml(analysis.dataQuality)}</span>
        <button class="ghost-button danger-button" type="button" data-delete-lead-detail>Eliminar contacto</button>
      </div>
      <h4>${escapeHtml(lead.name || "Lead")}</h4>
      <p>${escapeHtml(lead.insight || "")}</p>
      <div class="lead-contact-strip">
        <span><strong>Documento</strong>${escapeHtml(lead.document_id || "-")}</span>
        <span><strong>Email</strong>${escapeHtml(lead.email || "-")}</span>
        <span><strong>Telefono</strong>${escapeHtml(lead.phone || "-")}</span>
        <span><strong>Origen</strong>${escapeHtml(lead.channel || lead.campaign_name || "-")}</span>
      </div>
      <div class="lead-funnel-strip">
        ${analysis.funnel.map(([label, done]) => `<span class="${done ? "is-done" : ""}">${escapeHtml(label)}</span>`).join("")}
      </div>
    </div>
    <div class="lead-decision-panel">
      <article class="lead-health-card">
        <span class="mono-label">Salud comercial</span>
        <strong>${analysis.healthScore}/100</strong>
        <div class="lead-health-bar"><span style="width:${analysis.healthScore}%"></span></div>
        <small>${escapeHtml(analysis.topInterest)} · redencion ${analysis.redemptionRate}%</small>
      </article>
      <div class="lead-header-metrics">
        <span><strong>${Number(summary.score_total || 0).toLocaleString("es-CO")}</strong>Score</span>
        <span><strong>${money(summary.total_spent || 0)}</strong>Total comprado</span>
        <span><strong>${groupedTickets.active.length}</strong>Activos sin redimir</span>
        <span><strong>${groupedTickets.expired.length}</strong>Tickets vencidos</span>
        <span><strong>${groupedTickets.inactive.length}</strong>No activos</span>
        <span><strong>${groupedTickets.redeemed.length}</strong>Redimidos</span>
      </div>
      <div class="lead-next-actions">
        ${analysis.nextActions.map((item) => `
          <button class="lead-action-tile is-${escapeHtml(item.tone)}" type="button" data-lead-fast-action="${escapeHtml(item.preset)}">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
  leadDetailHeader.querySelector("[data-delete-lead-detail]")?.addEventListener("click", () => {
    deleteLeadContact(
      { id: lead.id, source_type: lead.source_type || "PLAYER" },
      lead.name || "este contacto"
    );
  });
}

function renderLeadTab(detail) {
  if (!leadDetailContent) return;
  const lead = detail.lead || {};
  const summary = detail.summary || {};
  const analysis = leadAnalysisModel(detail);
  const groupedTickets = ticketGroups(detail.benefits || []);
  const tab = state.selectedLeadTab || "summary";
  const metricCards = (items) => `<section class="lead-summary-grid">${items.map(([label, value, meta]) => `
    <article class="kpi-card">
      <span class="mono-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value ?? "-")}</strong>
      <div class="kpi-meta">${escapeHtml(meta || "")}</div>
    </article>
  `).join("")}</section>`;

  const renderers = {
    summary: () => `
      ${metricCards([
        ["Score total", Number(summary.score_total || 0).toLocaleString("es-CO"), `Promedio ${Number(summary.score_average || 0).toFixed(1)}`],
        ["Compras", summary.purchase_count || 0, money(summary.total_spent || 0)],
        ["Ticket promedio", money(summary.avg_ticket || 0), `Ultima ${formatDate(summary.last_purchase_at)}`],
        ["Tickets activos", groupedTickets.active.length, "Listos para enviar o recordar"],
        ["Tickets vencidos", groupedTickets.expired.length, "Perdieron vigencia sin redencion"],
        ["Tickets no activos", groupedTickets.inactive.length, "Sin reclamar, cancelados o no usables"],
        ["Tickets redimidos", groupedTickets.redeemed.length, "Ya usados en punto fisico"],
        ["Activaciones", summary.activations_count || 0, `Ultima ${formatDate(summary.last_activation_at)}`],
        ["Segmento sugerido", lead.commercial_status_label || summary.commercial_status, lead.level || ""],
      ])}
      <section class="lead-analysis-grid">
        <article class="lead-insight-box">
          <strong>Lectura comercial</strong>
          <p>${escapeHtml(lead.insight || "")}</p>
          <div class="lead-analysis-tags">
            <span>Etapa: ${escapeHtml(analysis.stage)}</span>
            <span>Interes: ${escapeHtml(analysis.topInterest)}</span>
            <span>Recompra: ${escapeHtml(analysis.probability)}</span>
            <span>Ultima interaccion: ${analysis.lastInteractionDays === null ? "sin dato" : `${analysis.lastInteractionDays} dias`}</span>
          </div>
        </article>
        <article class="lead-insight-box">
          <strong>Riesgos y bloqueos</strong>
          ${(analysis.risks.length ? analysis.risks : ["Sin riesgos fuertes detectados."]).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </article>
      </section>
      <section class="lead-action-grid">
        ${analysis.nextActions.map((item) => `
          <button class="lead-action-card is-${escapeHtml(item.tone)}" type="button" data-lead-fast-action="${escapeHtml(item.preset)}">
            <span class="mono-label">Siguiente accion</span>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.detail)}</p>
          </button>
        `).join("")}
      </section>
      <article class="lead-insight-box">
        <strong>Ruta RMS del lead</strong>
        <div class="lead-funnel-strip wide">
          ${analysis.funnel.map(([label, done]) => `<span class="${done ? "is-done" : ""}">${escapeHtml(label)}</span>`).join("")}
        </div>
      </article>
    `,
    personal: () => detailList([
      `<strong>Nombre</strong><span>${escapeHtml(lead.name || "-")}</span>`,
      `<strong>Documento</strong><span>${escapeHtml(lead.document_id || "-")}</span>`,
      `<strong>Email</strong><span>${escapeHtml(lead.email || "-")}</span>`,
      `<strong>Telefono</strong><span>${escapeHtml(lead.phone || "-")}</span>`,
      `<strong>Canal de origen</strong><span>${escapeHtml(lead.channel || "-")}</span>`,
      `<strong>Campaña</strong><span>${escapeHtml(lead.campaign_name || "-")}</span>`,
      `<strong>Fecha de creacion</strong><span>${formatDate(lead.created_at)}</span>`,
      `<strong>Estado comercial</strong><span>${escapeHtml(lead.commercial_status_label || "-")}</span>`,
    ]),
    purchases: () => `
      <form class="lead-purchase-form" id="leadPurchaseForm">
        <div>
          <span class="mono-label">Registrar venta o compra</span>
          <strong>Agregar movimiento comercial</strong>
        </div>
        <label><span>Producto / servicio</span><select id="leadPurchaseProductInput" data-product-select data-open-product-input="leadPurchaseProductOpenInput" required>${inventoryProductSelectOptions("", { placeholder: "Seleccionar producto" })}</select><input id="leadPurchaseProductOpenInput" class="open-product-input hidden" type="text" maxlength="180" placeholder="Producto abierto o servicio"></label>
        <label><span>Valor</span><input id="leadPurchaseAmountInput" type="number" min="1" step="100" required placeholder="0"></label>
        <label><span>Categoria</span><input id="leadPurchaseCategoryInput" type="text" maxlength="160" placeholder="Categoria o linea"></label>
        <label><span>Fecha</span><input id="leadPurchaseDateInput" type="datetime-local"></label>
        <label><span>Canal</span><input id="leadPurchaseChannelInput" type="text" maxlength="120" value="CRM" placeholder="Tienda, WhatsApp, feria..."></label>
        <label><span>Moneda</span><input id="leadPurchaseCurrencyInput" type="text" maxlength="8" value="COP"></label>
        <label class="span-2"><span>Notas</span><textarea id="leadPurchaseNotesInput" rows="2" maxlength="1200" placeholder="Detalle de la compra, referencia, vendedor o contexto"></textarea></label>
        <p class="form-message span-2" id="leadPurchaseMessage"></p>
        <button class="solid-button" id="leadPurchaseSubmitButton" type="submit">Guardar compra</button>
      </form>
      ${(detail.purchases || []).length ? detailList((detail.purchases || []).map((item) => `
        <strong>${escapeHtml(item.product_name || "Compra")}</strong>
        <span>${money(item.sale_amount || 0)} · ${formatDate(item.created_at)}</span>
        <small>${escapeHtml(item.campaign_name || item.acquisition_source || "-")} · ${escapeHtml(item.branch_name || "Sin sucursal")} ${item.notes ? `· ${escapeHtml(item.notes)}` : ""}</small>
      `)) : `
        <div class="empty-state compact">
          Este lead aun no registra compras. Puedes registrar una venta manual o enviarle una activacion para convertirlo.
          <br><button class="ghost-button" type="button" data-lead-fast-action="FIRST_PURCHASE">Enviar beneficio de primera compra</button>
        </div>
      `}
    `,
    interests: () => `
      <form class="lead-inline-form" id="leadInterestForm">
        <input id="leadInterestInput" type="text" maxlength="120" placeholder="Agregar interes manual">
        <button class="ghost-button" type="submit">Agregar</button>
      </form>
      <div class="lead-interest-cloud">${(detail.interests || []).map((item) => `
        <button class="lead-interest-pill" data-delete-interest="${escapeHtml(item.id || "")}" type="button">
          ${escapeHtml(item.interest_name)} <span>${escapeHtml(item.weight || "")}</span>
        </button>
      `).join("") || '<span class="table-secondary">Sin intereses detectados.</span>'}</div>
    `,
    activations: () => detailList((detail.activations || []).map((item) => `
      <strong>${escapeHtml(item.name || item.activation_type)}</strong>
      <span>${escapeHtml(item.status || "-")} · ${formatDate(item.created_at)}</span>
      <small>
        ${escapeHtml(item.campaign_name || "Sin campaña")}
        ${item.qr_code_id ? `· <button class="link-button" data-share-ticket-whatsapp="${escapeHtml(item.qr_code_id)}" type="button">Enviar WhatsApp</button>` : ""}
        ${item.qr_code_id ? `· <button class="link-button" data-download-activation-ticket="${escapeHtml(item.qr_code_id)}" type="button">Descargar imagen</button>` : ""}
        ${item.qr_code_id ? `· <button class="link-button" data-copy-ticket-qr="${escapeHtml(item.qr_code_id)}" type="button">Copiar ticket</button>` : item.public_url ? `· <button class="link-button" data-copy-link="${escapeHtml(item.public_url)}" type="button">Copiar ticket</button>` : ""}
      </small>
    `), "Sin activaciones enviadas."),
    games: () => detailList((detail.games || []).map((item) => `
      <strong>${escapeHtml(item.trivia_title || item.game_name || "Juego")}</strong>
      <span>Score ${Number(item.score || 0)} / ${Number(item.total_questions || 0)} · ${formatDate(item.created_at)}</span>
      <small>${escapeHtml(item.campaign_name || "-")} · ${item.passed ? "Aprobado" : "Participacion"}</small>
    `), "Sin juegos o trivias registrados."),
    benefits: () => `
      <section class="lead-ticket-summary">
        <article><span>Activos</span><strong>${groupedTickets.active.length}</strong></article>
        <article><span>Vencidos</span><strong>${groupedTickets.expired.length}</strong></article>
        <article><span>No activos</span><strong>${groupedTickets.inactive.length}</strong></article>
        <article><span>Redimidos</span><strong>${groupedTickets.redeemed.length}</strong></article>
      </section>
      <section class="lead-ticket-section">
        <h4>Tickets activos sin redimir</h4>
        ${renderTicketCards(groupedTickets.active, "Este lead no tiene tickets activos sin redimir.")}
      </section>
      <section class="lead-ticket-section">
        <h4>Tickets vencidos</h4>
        ${renderTicketCards(groupedTickets.expired, "Este lead no tiene tickets vencidos.")}
      </section>
      <section class="lead-ticket-section">
        <h4>Tickets no activos</h4>
        ${renderTicketCards(groupedTickets.inactive, "Este lead no tiene tickets sin reclamar, cancelados o no usables.")}
      </section>
      <section class="lead-ticket-section">
        <h4>Tickets redimidos</h4>
        ${renderTicketCards(groupedTickets.redeemed, "Este lead no ha redimido tickets.")}
      </section>
      ${(detail.reward_passes || []).length ? `
        <section class="lead-ticket-section">
          <h4>Reward Pass asociados</h4>
          ${detailList((detail.reward_passes || []).map((item) => `
            <strong>Reward Pass ${escapeHtml(item.public_code || "")}</strong>
            <span>${escapeHtml(item.status || "-")} · saldo ${money(item.current_balance_cop || 0)}</span>
            <small>${escapeHtml(item.campaign_name || "-")}</small>
          `))}
        </section>
      ` : ""}
    `,
    affiliate: () => detail.affiliate ? detailList([
      `<strong>Codigo de afiliado</strong><span>${escapeHtml(detail.affiliate.qr_token || "-")}</span>`,
      `<strong>Estado</strong><span>${escapeHtml(detail.affiliate.status || "-")}</span>`,
      `<strong>Puntos acumulados</strong><span>${Number(detail.affiliate.points_total || 0).toLocaleString("es-CO")}</span>`,
      `<strong>Carnet digital</strong><span>${detail.affiliate.qr_token ? `<a href="/carnet-afiliado/${escapeHtml(detail.affiliate.qr_token)}" target="_blank" rel="noreferrer">Abrir carnet</a>` : "-"}</span>`,
    ]) : '<div class="empty-state compact">Este lead aun no es afiliado.<br><button class="ghost-button" type="button" id="leadInviteAffiliateButton">Enviar invitacion de afiliacion</button></div>',
    communications: () => detailList((detail.communications || []).map((item) => `
      <strong>${escapeHtml(item.subject || item.type)}</strong>
      <span>${escapeHtml(item.channel || "-")} · ${escapeHtml(item.status || "-")} · ${formatDate(item.created_at)}</span>
      <small>${escapeHtml(item.activation_name || item.campaign_name || "-")}</small>
    `), "Sin comunicaciones registradas."),
    notes: () => `
      <form class="lead-note-form" id="leadNoteForm">
        <textarea id="leadNoteInput" rows="3" maxlength="3000" placeholder="Escribe una nota interna"></textarea>
        <select id="leadNoteTypeInput">
          <option value="commercial">Comercial</option>
          <option value="follow_up">Seguimiento</option>
          <option value="vip">VIP</option>
          <option value="support">Soporte</option>
          <option value="observation">Observacion</option>
        </select>
        <input id="leadNoteNextActionInput" type="text" maxlength="500" placeholder="Proxima accion sugerida">
        <button class="solid-button" type="submit">Guardar nota</button>
      </form>
      ${detailList((detail.notes || []).map((item) => `
        <strong>${escapeHtml(item.note_type || "Nota")}</strong>
        <span>${escapeHtml(item.note)}</span>
        <small>${escapeHtml(item.author_name || "Equipo")} · ${formatDate(item.created_at)} ${item.next_action ? `· ${escapeHtml(item.next_action)}` : ""}</small>
      `), "Sin notas internas.")}
    `,
    timeline: () => `<div class="lead-timeline">${(detail.timeline || []).map((item) => `
      <article class="lead-timeline-item">
        <span>${formatDate(item.created_at)}</span>
        <strong>${escapeHtml(item.title || item.type)}</strong>
        <p>${escapeHtml(item.description || "")}</p>
      </article>
    `).join("") || '<div class="empty-state compact">Sin eventos.</div>'}</div>`,
  };
  leadDetailContent.innerHTML = (renderers[tab] || renderers.summary)();
  bindLeadDetailPanelActions();
}

function bindLeadDetailPanelActions() {
  leadDetailContent?.querySelectorAll("[data-copy-link]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(button.dataset.copyLink || "");
      state.lastLeadActivationLink = button.dataset.copyLink || "";
      showFeedback("Ticket copiado.", "success");
    });
  });
  leadDetailContent?.querySelectorAll("[data-copy-ticket-qr]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const data = await fetchLeadTicketDownload(button.dataset.copyTicketQr);
        const link = data.public_ticket_url || data.share_url || "";
        if (!link) throw new Error("No se pudo obtener el link publico del ticket.");
        await navigator.clipboard?.writeText(link);
        state.lastLeadActivationLink = link;
        showFeedback("Ticket copiado.", "success");
      } catch (error) {
        showFeedback(error.message, "error");
      }
    });
  });
  leadDetailContent?.querySelectorAll("[data-download-activation-ticket]").forEach((button) => {
    button.addEventListener("click", () => downloadLeadQr(button.dataset.downloadActivationTicket));
  });
  leadDetailContent?.querySelectorAll("[data-download-ticket]").forEach((button) => {
    button.addEventListener("click", () => downloadLeadQr(button.dataset.downloadTicket));
  });
  leadDetailContent?.querySelectorAll("[data-share-ticket-whatsapp]").forEach((button) => {
    button.addEventListener("click", () => {
      const lead = state.selectedLeadDetail?.lead || {};
      shareLeadQrWhatsApp(button.dataset.shareTicketWhatsapp, lead.phone, lead.name);
    });
  });
  const interestForm = document.getElementById("leadInterestForm");
  interestForm?.addEventListener("submit", addLeadInterestFromForm);
  leadDetailContent?.querySelectorAll("[data-delete-interest]").forEach((button) => {
    if (!button.dataset.deleteInterest) return;
    button.addEventListener("click", () => deleteLeadInterestFromDetail(button.dataset.deleteInterest));
  });
  document.getElementById("leadNoteForm")?.addEventListener("submit", createLeadNoteFromForm);
  document.getElementById("leadPurchaseForm")?.addEventListener("submit", createLeadPurchaseFromForm);
  document.getElementById("leadInviteAffiliateButton")?.addEventListener("click", () => openLeadActivationModal(state.selectedLeadRef, "REFERRAL_REWARD"));
  leadDetailContent?.querySelectorAll("[data-product-select]").forEach((select) => {
    renderProductSelect(select);
    select.addEventListener("change", () => {
      syncProductOpenInput(select);
      if (select.id === "leadPurchaseProductInput") {
        applyInventoryProductToSaleInput(select, document.getElementById("leadPurchaseAmountInput"), document.getElementById("leadPurchaseCurrencyInput"));
      }
    });
  });
  leadDetailContent?.querySelectorAll(".open-product-input").forEach((input) => {
    input.addEventListener("input", () => {
      const select = input.id
        ? leadDetailContent.querySelector(`[data-open-product-input="${input.id}"]`)
        : input.closest("label")?.querySelector("[data-product-select]");
      syncProductOpenInput(select);
    });
  });
}

function setLeadDetailTab(tabName = "summary", options = {}) {
  const nextTab = String(tabName || "summary");
  state.selectedLeadTab = nextTab;
  leadDetailTabs?.querySelectorAll("[data-lead-tab]").forEach((tab) => {
    const isActive = tab.dataset.leadTab === nextTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.setAttribute("tabindex", isActive ? "0" : "-1");
    if (isActive && options.scrollTab) {
      tab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });
  if (options.render !== false && state.selectedLeadDetail) {
    renderLeadTab(state.selectedLeadDetail);
  }
}

async function reloadSelectedLeadDetail(options = {}) {
  if (!state.selectedLeadRef) return null;
  const keepTab = options.keepTab !== false ? state.selectedLeadTab || "summary" : "summary";
  const detail = await api(`/api/business/leads/${encodeURIComponent(state.selectedLeadRef.id)}?source_type=${encodeURIComponent(state.selectedLeadRef.source_type || "PLAYER")}`, { headers: authHeaders() });
  state.selectedLeadDetail = detail;
  renderLeadDetailHeader(detail);
  setLeadDetailTab(keepTab, { render: true, scrollTab: options.scrollTab });
  return detail;
}

function runLeadFastAction(action) {
  if (!state.selectedLeadRef) return;
  if (action === "NOTE") {
    setLeadDetailTab("notes", { scrollTab: true });
    document.getElementById("leadNoteInput")?.focus();
    return;
  }
  openLeadActivationModal(state.selectedLeadRef, action || "TICKET");
}

async function openLeadDetail(leadRef, options = {}) {
  state.selectedLeadRef = leadRef;
  const nextTab = options.tab || (options.keepTab ? state.selectedLeadTab || "summary" : "summary");
  setLeadDetailTab(nextTab, { render: false });
  if (leadDetailModal) leadDetailModal.classList.remove("hidden");
  if (leadDetailContent) leadDetailContent.innerHTML = '<div class="empty-state compact">Cargando ficha del lead...</div>';
  try {
    await reloadSelectedLeadDetail({ keepTab: true, scrollTab: Boolean(options.tab) });
    leadDetailModal?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    if (leadDetailContent) leadDetailContent.innerHTML = `<div class="empty-state compact">${escapeHtml(error.message)}</div>`;
  }
}

function closeLeadDetail() {
  leadDetailModal?.classList.add("hidden");
}

function openLeadActivationModal(leadRef = state.selectedLeadRef, presetType = "") {
  if (!leadRef) return;
  state.selectedLeadRef = leadRef;
  leadActivationForm?.reset();
  refreshLeadCampaignFilterOptions();
  if (leadActivationTypeInput && presetType) leadActivationTypeInput.value = presetType;
  if (leadActivationTypeInput && !presetType) leadActivationTypeInput.value = "TICKET";
  if (leadActivationNameInput) leadActivationNameInput.value = presetType === "REFERRAL_REWARD" ? "Invitacion de afiliacion" : "Beneficio comercial personalizado";
  if (leadActivationResult) leadActivationResult.innerHTML = "";
  setFormMessage(leadActivationMessage, "", "");
  leadActivationModal?.classList.remove("hidden");
}

function closeLeadActivationModal() {
  leadActivationModal?.classList.add("hidden");
}

async function submitLeadActivation(event) {
  event.preventDefault();
  if (!state.selectedLeadRef) return;
  const expiresValue = leadActivationExpiresInput?.value ? new Date(leadActivationExpiresInput.value).toISOString() : null;
  const payload = {
    source_type: state.selectedLeadRef.source_type || "PLAYER",
    activation_type: leadActivationTypeInput?.value || "TICKET",
    campaign_id: leadActivationCampaignInput?.value || null,
    name: String(leadActivationNameInput?.value || "").trim(),
    channel: leadActivationChannelInput?.value || "manual",
    benefit_type: leadActivationBenefitTypeInput?.value || "CUSTOM",
    benefit_value: { label: String(leadActivationBenefitValueInput?.value || "").trim() },
    expires_at: expiresValue,
    score_min: leadActivationScoreMinInput?.value ? Number(leadActivationScoreMinInput.value) : null,
    message: String(leadActivationMessageInput?.value || "").trim(),
    conditions: String(leadActivationConditionsInput?.value || "").trim() || null,
  };
  if (!payload.name) {
    setFormMessage(leadActivationMessage, "Escribe el nombre de la activacion.", "error");
    return;
  }
  try {
    if (leadActivationSubmitButton) leadActivationSubmitButton.disabled = true;
    setFormMessage(leadActivationMessage, "Generando ticket QR para el lead...", "info");
    const result = await api(`/api/business/leads/${encodeURIComponent(state.selectedLeadRef.id)}/activations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    state.lastLeadActivationLink = result.public_url || result.link?.public_url || "";
    if (leadActivationResult) {
      leadActivationResult.innerHTML = `
        <div class="qr-result">
          <strong>Ticket QR creado</strong>
          <p>${escapeHtml(state.lastLeadActivationLink)}</p>
          <button class="ghost-button" type="button" id="leadActivationCopyResultButton">Copiar ticket</button>
        </div>
      `;
      document.getElementById("leadActivationCopyResultButton")?.addEventListener("click", async () => {
        await navigator.clipboard?.writeText(state.lastLeadActivationLink);
        showFeedback("Ticket copiado.", "success");
      });
    }
    setFormMessage(leadActivationMessage, "Ticket QR registrado en el historial del lead.", "success");
    state.leadCrmLoaded = false;
    if (state.selectedLeadRef) await reloadSelectedLeadDetail({ keepTab: true });
    await refreshLeadCrm({ quiet: true, keepOffset: true });
  } catch (error) {
    setFormMessage(leadActivationMessage, error.message, "error");
  } finally {
    if (leadActivationSubmitButton) leadActivationSubmitButton.disabled = false;
  }
}

async function createLeadNoteFromForm(event) {
  event.preventDefault();
  if (!state.selectedLeadRef) return;
  const note = String(document.getElementById("leadNoteInput")?.value || "").trim();
  if (!note) return;
  await api(`/api/business/leads/${encodeURIComponent(state.selectedLeadRef.id)}/notes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      source_type: state.selectedLeadRef.source_type || "PLAYER",
      note,
      note_type: document.getElementById("leadNoteTypeInput")?.value || "commercial",
      next_action: String(document.getElementById("leadNoteNextActionInput")?.value || "").trim() || null,
    }),
  });
  await reloadSelectedLeadDetail({ keepTab: true });
}

async function createLeadPurchaseFromForm(event) {
  event.preventDefault();
  if (!state.selectedLeadRef) return;
  const productInput = document.getElementById("leadPurchaseProductInput");
  const amountInput = document.getElementById("leadPurchaseAmountInput");
  const message = document.getElementById("leadPurchaseMessage");
  const submitButton = document.getElementById("leadPurchaseSubmitButton");
  renderProductSelect(productInput);
  const productName = productInputRawValue(productInput);
  const amount = Number(amountInput?.value || 0);
  if (!productName || !Number.isFinite(amount) || amount <= 0) {
    setFormMessage(message, "Agrega producto y un valor de compra valido.", "error");
    return;
  }
  const dateValue = document.getElementById("leadPurchaseDateInput")?.value || "";
  const payload = {
    source_type: state.selectedLeadRef.source_type || "PLAYER",
    product_name: productName,
    sale_amount: amount,
    currency: String(document.getElementById("leadPurchaseCurrencyInput")?.value || "COP").trim() || "COP",
    category: String(document.getElementById("leadPurchaseCategoryInput")?.value || "").trim() || null,
    acquisition_channel: String(document.getElementById("leadPurchaseChannelInput")?.value || "").trim() || "CRM",
    notes: String(document.getElementById("leadPurchaseNotesInput")?.value || "").trim() || null,
    created_at: dateValue ? new Date(dateValue).toISOString() : null,
  };
  try {
    if (submitButton) submitButton.disabled = true;
    setFormMessage(message, "Guardando compra en el historial del lead...", "info");
    await api(`/api/business/leads/${encodeURIComponent(state.selectedLeadRef.id)}/purchases`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    setFormMessage(message, "Compra registrada. Actualizando ficha...", "success");
    setLeadDetailTab("purchases", { render: false });
    await reloadSelectedLeadDetail({ keepTab: true, scrollTab: true });
    state.leadCrmLoaded = false;
    await refreshLeadCrm({ quiet: true, keepOffset: true });
  } catch (error) {
    setFormMessage(message, error.message || "No se pudo registrar la compra.", "error");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function addLeadInterestFromForm(event) {
  event.preventDefault();
  if (!state.selectedLeadRef) return;
  const input = document.getElementById("leadInterestInput");
  const interest = String(input?.value || "").trim();
  if (!interest) return;
  await api(`/api/business/leads/${encodeURIComponent(state.selectedLeadRef.id)}/interests`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ source_type: state.selectedLeadRef.source_type || "PLAYER", interest_name: interest, source: "manual", weight: 20 }),
  });
  await reloadSelectedLeadDetail({ keepTab: true });
}

async function deleteLeadInterestFromDetail(interestId) {
  if (!state.selectedLeadRef) return;
  await api(`/api/business/leads/${encodeURIComponent(state.selectedLeadRef.id)}/interests/${encodeURIComponent(interestId)}?source_type=${encodeURIComponent(state.selectedLeadRef.source_type || "PLAYER")}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await reloadSelectedLeadDetail({ keepTab: true });
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
      : "Sin compras aún";
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
  const changedAffiliate = state.selectedAffiliateId && state.selectedAffiliateId !== affiliateId;
  if (changedAffiliate) {
    state.affiliatePurchaseItems = [{ name: "", quantity: 1, unit_price: 0 }];
    if (affiliatePurchaseNotesInput) affiliatePurchaseNotesInput.value = "";
    setInlineMessage(affiliatePurchaseMessage, "", "info");
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
  setAffiliateFinderMessage(`Afiliado seleccionado: ${selected?.full_name || "afiliado"}. Registra la compra, elige campana y los puntos se suman automatico.`, "success");
  affiliatePurchaseAmountInput?.focus();
  affiliatePurchaseAmountInput?.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function searchAffiliateForPoints(value = affiliateFinderInput?.value) {
  const query = String(value || "").trim();
  renderAffiliateFinderResults([]);
  if (!query) {
    setAffiliateFinderMessage("Escribe documento, nombre, teléfono, email o escanea el QR del carnet.", "error");
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
  setAffiliateFinderMessage(`Encontramos ${matches.length} afiliados. Elige el correcto para registrar la compra.`, "success");
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
    setAffiliateFinderMessage("Este navegador no permite escanear el carnet aquí. Usa la busqueda manual.", "error");
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
  renderAffiliatePurchaseCampaignOptions();
  renderAffiliateRewardRules();
  resetAffiliateRewardResult();

  affiliateTable.innerHTML = rows.map((item) => `
    <tr data-affiliate-id="${escapeHtml(item.id)}" data-affiliate-row-select="${escapeHtml(item.id)}" tabindex="0" class="${item.id === state.selectedAffiliateId ? "active" : ""}">
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

  affiliateTable.querySelectorAll("[data-affiliate-row-select]").forEach((row) => {
    const selectRow = () => {
      openAffiliateForPoints(row.dataset.affiliateRowSelect);
    };
    row.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, select, textarea")) return;
      selectRow();
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectRow();
    });
  });
  affiliateTable.querySelectorAll("[data-affiliate-select]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openAffiliateForPoints(button.dataset.affiliateSelect);
    });
  });
  affiliateTable.querySelectorAll("[data-affiliate-delete]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteSelectedAffiliate(button.dataset.affiliateDelete, button.dataset.affiliateName);
    });
  });

  if (!selected) {
    affiliateCardTitle.textContent = "Sin afiliado seleccionado";
    affiliateCardMeta.textContent = "Crea o selecciona un afiliado para abrir su carnet digital.";
    renderAffiliateSelectedSummary(null);
    affiliateCardPreview.removeAttribute("src");
    affiliateCardPreviewWrap?.classList.add("is-empty");
    affiliateCardPreviewWrap?.classList.remove("is-loading");
    affiliateAddPointsButton.disabled = true;
    if (affiliatePurchaseCampaignInput) affiliatePurchaseCampaignInput.disabled = true;
    if (affiliatePurchaseProductInput) affiliatePurchaseProductInput.disabled = true;
    if (affiliatePurchaseAmountInput) affiliatePurchaseAmountInput.disabled = true;
    if (affiliatePurchaseNotesInput) affiliatePurchaseNotesInput.disabled = true;
    renderAffiliatePurchaseItems();
    downloadAffiliateCardButton.disabled = true;
    if (copyAffiliateCardLinkButton) copyAffiliateCardLinkButton.disabled = true;
    if (affiliateGenerateReferralQrButton) affiliateGenerateReferralQrButton.disabled = true;
    state.affiliateRewardUnlocks = [];
    renderAffiliateRewardUnlocks();
    if (affiliateReferralQrSelectedMeta) affiliateReferralQrSelectedMeta.textContent = "Selecciona un afiliado del listado para generar sus tickets de recomendación.";
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
  renderAffiliatePurchaseCampaignOptions();
  if (affiliatePurchaseProductInput) affiliatePurchaseProductInput.disabled = false;
  if (affiliatePurchaseAmountInput) affiliatePurchaseAmountInput.disabled = false;
  if (affiliatePurchaseNotesInput) affiliatePurchaseNotesInput.disabled = false;
  renderAffiliatePurchaseItems();
  affiliateAddPointsButton.disabled = false;
  downloadAffiliateCardButton.disabled = false;
  if (copyAffiliateCardLinkButton) copyAffiliateCardLinkButton.disabled = !affiliateDigitalCardUrl(selected);
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
    state.affiliateRewardUnlocks = detail.reward_unlocks || [];
    renderAffiliateRewardUnlocks();
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
    pending_claim: "Pendiente activación",
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
  const options = ['<option value="">Sin campaña asociada</option>']
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
  const scopeKey = businessScopeKey();
  const queryParams = new URLSearchParams();
  if (rewardPassStatusFilter?.value) queryParams.set("status", rewardPassStatusFilter.value);
  if (state.filter) queryParams.set("search", state.filter);
  const data = await api(`/api/business/reward-passes?${queryParams.toString()}`, { headers: authHeaders() });
  if (!isCurrentBusinessScope(scopeKey)) return false;
  state.rewardPasses = data.reward_passes || [];
  state.rewardPassMetrics = data.metrics || null;
  state.rewardPassContext = {
    ...(state.rewardPassContext || {}),
    context: data.context || data.reward_pass_context || data.context,
  };
  if (!state.selectedRewardPassId && state.rewardPasses[0]) {
    state.selectedRewardPassId = state.rewardPasses[0].id;
  }
  return true;
}

async function loadRewardPassContext() {
  const scopeKey = businessScopeKey();
  const data = await api("/api/business/reward-passes/context", { headers: authHeaders() });
  if (!isCurrentBusinessScope(scopeKey)) return false;
  state.rewardPassContext = data || {};
  renderRewardPassContext();
  setRewardPassDefaults();
  return true;
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
      ? (isPending ? `Link de reclamo: ${pass.public_url}. El beneficiario escanea este QR, completa sus datos y recibe el QR definitivo redimible.` : `Link público: ${pass.public_url}. QR redimible listo para validador.`)
      : "El QR y los datos completos apareceran después de emitir o seleccionar un Reward Pass.";
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
      ["Link público", pass.public_url || "-"],
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
  const scopeKey = businessScopeKey();
  state.selectedRewardPassId = id;
  showFeedback("Cargando detalle del Reward Pass.", "loading", { title: "Reward Pass", timeout: 0 });
  try {
    const data = await api(`/api/business/reward-passes/${encodeURIComponent(id)}`, { headers: authHeaders() });
    if (!isCurrentBusinessScope(scopeKey) || state.selectedRewardPassId !== id) return;
    state.selectedRewardPass = data.reward_pass;
    renderRewardPassTable();
    renderRewardPassDetail();
    showFeedback("Detalle de Reward Pass cargado.");
  } catch (error) {
    if (!isCurrentBusinessScope(scopeKey) || state.selectedRewardPassId !== id) return;
    showFeedback(error.message, "error");
  }
}

async function renderRewardPassesView() {
  const scopeKey = businessScopeKey();
  renderRewardPassContext();
  setRewardPassDefaults();
  try {
    if (!state.rewardPassContext?.default_terms) {
      const contextLoaded = await loadRewardPassContext();
      if (contextLoaded === false || !isCurrentBusinessScope(scopeKey)) return;
    }
    const passesLoaded = await loadRewardPasses();
    if (passesLoaded === false || !isCurrentBusinessScope(scopeKey)) return;
    renderRewardPassMetrics();
    renderRewardPassTable();
    const selected = state.rewardPasses.find((item) => item.id === state.selectedRewardPassId);
    if (selected) {
      await selectRewardPass(selected.id);
      if (!isCurrentBusinessScope(scopeKey)) return;
    } else {
      state.selectedRewardPass = null;
      renderRewardPassDetail();
    }
  } catch (error) {
    if (!isCurrentBusinessScope(scopeKey)) return;
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
  showFeedback("Emitiendo Reward Pass con transacción atómica de tickets.", "loading", { title: "Reward Pass", timeout: 0 });
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
  showFeedback("Link público del Reward Pass copiado.");
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
  ctx.fillText(`Beneficiario: ${pass.beneficiary_name || "Pendiente de activación"}`, 94, 406);
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
  `).join("") || '<tr><td colspan="6">Sin redenciones para esta campaña.</td></tr>';

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
    ["player_name", "document_id", "phone", "payment_method", "product_or_service", "branch_name", "affiliate_name"],
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
  renderCustomerAcquisitionCampaignOptions();
  renderSalesCustomerOptions();
  renderCustomerSaleItems();

  campaignSalesTable.innerHTML = sales.map((item) => `
    <tr>
      <td>${escapeHtml(item.player_name || "-")}</td>
      <td>${escapeHtml(item.document_id || "-")}</td>
      <td>${escapeHtml(item.phone || "-")}</td>
      <td>${escapeHtml(money(item.sale_amount))}</td>
      <td>${escapeHtml(item.payment_method || "-")}</td>
      <td>${escapeHtml(item.referred_affiliate_id ? "Afiliado" : saleSourceLabel(item.sale_source))}</td>
      <td>${saleProductSummary(item)}</td>
      <td>${saleAffiliateSummary(item)}</td>
      <td>${escapeHtml(item.branch_name || "-")}</td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
    </tr>
  `).join("") || '<tr><td colspan="10">Sin ventas para esta campaña.</td></tr>';
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
    adminPanelMessage.textContent = "Tu rol actual es de negocio. La gestión global sigue disponible solo para admins en `/admin`.";
    return;
  }

  const campaigns = filterRows(state.adminCampaigns, ["name", "business_name", "status", "type"]);
  adminKpiGrid.innerHTML = [
    ["Campañas globales", state.adminCampaigns.length, "Todas las empresas"],
    ["Campañas visibles", campaigns.length, `Filtro ${state.filter ? "activo" : "general"}`],
    ["Rol actual", session.user.role, "Acceso a crear y editar campañas"],
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
  `).join("") || '<tr><td colspan="4">Sin campañas para este filtro.</td></tr>';
  adminCampaignTable.querySelectorAll("[data-admin-campaign-id]").forEach((row) => {
    row.addEventListener("click", () => loadAdminCampaignWorkspace(row.dataset.adminCampaignId));
  });

  adminPanelMessage.textContent = "Este usuario puede crear y editar campañas desde el modal del portal y también operar `/admin`.";
}

function handleRangeToggle() {
  if (state.rangeDays === 30) {
    state.rangeDays = 90;
  } else if (state.rangeDays === 90) {
    state.rangeDays = 0;
  } else {
    state.rangeDays = 30;
  }

  rangeButton.textContent = state.rangeDays ? `Últimos ${state.rangeDays} días` : "Todo el historial";
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
campaignSectionTabs.forEach((button) => {
  button.addEventListener("click", () => setCampaignSectionTab(button.dataset.campaignSectionTab));
});
campaignSectionTabOpenButtons.forEach((button) => {
  button.addEventListener("click", () => setCampaignSectionTab(button.dataset.campaignTabOpen));
});
campaignStrategyAssistantButton?.addEventListener("click", () => setCampaignSectionTab("assistant"));
campaignStrategyTabOpenButton?.addEventListener("click", () => openStrategyWizard());
campaignWizardEntryButton?.addEventListener("click", () => {
  closeCampaignModal();
  openStrategyWizard();
});
campaignManualEntryButton?.addEventListener("click", () => {
  setInlineMessage(campaignModalMessage, "Completa el formulario manualmente o usa el ayudador para generar una estructura estratégica.", "info");
});
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
  button.addEventListener("click", () => {
    if (button.dataset.contactCenterNav) setContactCenterTab(button.dataset.contactCenterNav);
    setView(button.dataset.view);
  });
});
contactCenterTabs.forEach((button) => {
  button.addEventListener("click", () => {
    setContactCenterTab(button.dataset.contactCenterTab);
  });
  button.addEventListener("keydown", (event) => {
    const currentIndex = contactCenterTabs.indexOf(button);
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || currentIndex < 0) return;
    event.preventDefault();
    const lastIndex = contactCenterTabs.length - 1;
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    if (event.key === "ArrowRight") nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;
    const nextButton = contactCenterTabs[nextIndex];
    if (!nextButton) return;
    setContactCenterTab(nextButton.dataset.contactCenterTab);
    nextButton.focus();
  });
});
contactCenterPrimaryAction?.addEventListener("click", () => handleContactCenterStageAction(contactCenterPrimaryAction.dataset.contactCenterAction));
contactCenterSecondaryAction?.addEventListener("click", () => handleContactCenterStageAction(contactCenterSecondaryAction.dataset.contactCenterAction));
ticketCenterTabs.forEach((button) => {
  button.addEventListener("click", () => setTicketCenterTab(button.dataset.ticketTab));
});
segmentTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => setView(index === 0 ? "redemptions" : "sales"));
});
exportCampaignReportButton.addEventListener("click", exportCampaignReport);
markReadyCampaignButton.addEventListener("click", markCampaignReady);
manualLeadForm?.addEventListener("submit", createManualLead);
exportLeadsButton.addEventListener("click", exportLeads);
exportRedemptionsButton.addEventListener("click", exportRedemptions);
exportSalesButton.addEventListener("click", exportSales);
launchSetupForm.addEventListener("submit", saveClientLaunchSetup);
confirmLaunchButton.addEventListener("click", confirmCampaignLaunch);
[campaignCostNameInput, campaignCostTypeInput, campaignCostChannelInput, campaignCostBranchInput, campaignCostOwnerInput, campaignCostGoalInput, campaignCostDynamicInput, campaignCostObjectiveInput].forEach((input) => {
  input?.addEventListener("input", () => syncCampaignCostCalculatorFromForm());
  input?.addEventListener("change", () => syncCampaignCostCalculatorFromForm());
});
campaignCostDurationInput?.addEventListener("input", () => syncCampaignCostCalculatorFromForm({ rerenderRows: true }));
campaignCostProfitInput?.addEventListener("input", () => syncCampaignCostCalculatorFromForm());
campaignCostAverageTicketInput?.addEventListener("input", () => syncCampaignCostCalculatorFromForm());
campaignCostGrossMarginInput?.addEventListener("input", () => syncCampaignCostCalculatorFromForm());
campaignCostConversionInput?.addEventListener("input", () => syncCampaignCostCalculatorFromForm());
campaignCostRedemptionInput?.addEventListener("input", () => syncCampaignCostCalculatorFromForm({ rerenderRows: true }));
campaignCostUseDatesButton?.addEventListener("click", applyCampaignCostDurationFromDates);
campaignCostApplyBudgetButton?.addEventListener("click", applyCampaignCostToLaunchBudget);
campaignCostAddProductionButton?.addEventListener("click", () => addCampaignCostRow("production"));
campaignCostAddBenefitButton?.addEventListener("click", () => addCampaignCostRow("benefit"));
campaignCostAddServiceButton?.addEventListener("click", () => addCampaignCostRow("service"));
campaignCostAddVariableButton?.addEventListener("click", () => addCampaignCostRow("variable"));
campaignCostAddFixedButton?.addEventListener("click", () => addCampaignCostRow("fixed"));
[campaignCostProductionList, campaignCostBenefitsList, campaignCostServicesList, campaignCostVariableList, campaignCostFixedList].forEach((list) => {
  list?.addEventListener("input", handleCampaignCostListInput);
  list?.addEventListener("change", handleCampaignCostListInput);
  list?.addEventListener("click", handleCampaignCostListInput);
});
campaignStrategyWizardCloseButton?.addEventListener("click", closeStrategyWizard);
campaignStrategyWizardModal?.addEventListener("click", (event) => {
  if (event.target === campaignStrategyWizardModal) closeStrategyWizard();
});
strategyWizardBackButton?.addEventListener("click", () => {
  state.strategyWizardStep = Math.max(0, state.strategyWizardStep - 1);
  renderStrategyWizard();
});
strategyWizardSkipButton?.addEventListener("click", () => {
  state.strategyWizardStep = Math.min(STRATEGY_WIZARD_STEPS.length - 1, state.strategyWizardStep + 1);
  renderStrategyWizard();
});
strategyWizardNextButton?.addEventListener("click", () => {
  autoCompleteStrategyWizard();
  if (state.strategyWizardStep >= STRATEGY_WIZARD_STEPS.length - 1) {
    applyStrategyWizardToCampaignForm();
    return;
  }
  state.strategyWizardStep += 1;
  renderStrategyWizard();
});
strategyWizardDraftButton?.addEventListener("click", saveStrategyWizardDraft);
strategyWizardSuggestButton?.addEventListener("click", () => {
  autoCompleteStrategyWizard();
  setFormMessage(strategyWizardMessage, "Estrategia sugerida con dinámica, embudo, tickets internos y seguimiento comercial.", "success");
  renderStrategyWizard();
});
strategyWizardOptimizeButton?.addEventListener("click", () => {
  const answers = state.strategyWizardAnswers || {};
  if (normalizeInventoryLookup(answers.acquisitionMode).includes("manual")) setStrategyWizardAnswer("acquisitionMode", "Semimasiva");
  if (!answers.leadMagnet) setStrategyWizardAnswer("leadMagnet", "Diagnóstico gratuito");
  if (!answers.dynamic) setStrategyWizardAnswer("dynamic", strategyRecommendedDynamic(answers));
  if (!Array.isArray(answers.channels) || answers.channels.length < 3) setStrategyWizardAnswer("channels", Array.from(new Set([...(answers.channels || []), "Instagram", "WhatsApp", "Punto de venta"])).slice(0, 4));
  if (!Array.isArray(answers.ticketLogic) || answers.ticketLogic.length < 3) setStrategyWizardAnswer("ticketLogic", ["Lead ticket", "Reward ticket", "Redemption ticket"]);
  autoCompleteStrategyWizard();
  setFormMessage(strategyWizardMessage, "Campaña optimizada para más alcance, mejor filtrado y mayor trazabilidad comercial.", "success");
  renderStrategyWizard();
});
strategyWizardApplyButton?.addEventListener("click", applyStrategyWizardToCampaignForm);
campaignAffiliateForm?.addEventListener("submit", assignCampaignAffiliate);
saveSnapshotButton.addEventListener("click", saveCampaignSnapshot);
snapshotModalForm.addEventListener("submit", submitCampaignSnapshot);
customerAcquisitionForm?.addEventListener("submit", submitCustomerAcquisitionSale);
customerSaleAddItemButton?.addEventListener("click", () => {
  ensureCustomerSaleItems();
  state.customerSaleItems.push(defaultCustomerSaleItem());
  renderCustomerSaleItems();
});
customerAcquisitionCustomerLookupInput?.addEventListener("change", () => {
  handleSalesCustomerSearchCommit();
});
customerAcquisitionCustomerLookupInput?.addEventListener("input", () => {
  handleSalesCustomerSearchInput();
});
customerAcquisitionCustomerLookupInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  handleSalesCustomerSearchCommit();
});
customerAcquisitionCustomerSelect?.addEventListener("change", handleSalesCustomerSelectChange);
customerAcquisitionAffiliateInput?.addEventListener("change", () => {
  if (customerAcquisitionAffiliateInput.value !== customerAcquisitionAffiliateInput.dataset.autoSelectedAffiliateId) {
    customerAcquisitionAffiliateInput.dataset.autoSelectedAffiliateId = "";
  }
});
secretFriendTicketButton?.addEventListener("click", configureSecretFriendGiftTicket);
secretFriendActivationButton?.addEventListener("click", configureSecretFriendProspectActivation);
postSaleQrForm?.addEventListener("submit", submitPostSaleQr);
postSaleExpiresModeInput?.addEventListener("change", updatePostSaleExpiryMode);
triviaLauncherForm?.addEventListener("submit", submitTriviaLauncher);
activationShareSearchButton?.addEventListener("click", () => {
  searchActivationShareLeads().catch((error) => showFeedback(error.message, "error", { title: "No se pudo buscar lead" }));
});
activationShareSearchInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  searchActivationShareLeads().catch((error) => showFeedback(error.message, "error", { title: "No se pudo buscar lead" }));
});
activationShareOpenWhatsAppButton?.addEventListener("click", openActivationShareWhatsApp);
activationShareCopyMessageButton?.addEventListener("click", () => {
  copyActivationShareMessage().catch((error) => showFeedback(error.message, "error"));
});
activationShareCloseButton?.addEventListener("click", closeActivationShareModal);
activationShareModal?.addEventListener("click", (event) => {
  if (event.target === activationShareModal) closeActivationShareModal();
});
activationTypePicker?.querySelectorAll("[data-activation-type]").forEach((button) => {
  button.addEventListener("click", () => setActivationType(button.dataset.activationType));
});
triviaQuestionCountInput?.addEventListener("input", updateTriviaQuestionVisibility);
triviaExpiresModeInput?.addEventListener("change", updateTriviaExpiryMode);
qrBatchExpiresModeInput?.addEventListener("change", updateQrBatchExpiryMode);
document.querySelectorAll("[data-benefit-fulfillment-mode]").forEach((field) => {
  field.addEventListener("change", syncBenefitFulfillmentFields);
});
syncBenefitFulfillmentFields();
updatePostSaleExpiryMode();
updateQrBatchExpiryMode();
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
    showFeedback("Admin global cargado. Selecciona un negocio en `/admin` para crear una campaña.", "error");
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
      ? `Hay ${pending} redenciones pendientes de venta atribuida en la campaña seleccionada.`
      : "No hay alertas pendientes en la campaña seleccionada."
  );
});
settingsButton.addEventListener("click", () => {
  setView("account");
  showFeedback("Cuenta y configuración abiertas.", "info");
});
let leadCrmSearchTimer = 0;
function scheduleLeadCrmRefresh() {
  clearTimeout(leadCrmSearchTimer);
  leadCrmSearchTimer = setTimeout(() => {
    refreshLeadCrm({ quiet: true }).catch((error) => showFeedback(error.message, "error"));
  }, 320);
}
leadCrmSearchInput?.addEventListener("input", scheduleLeadCrmRefresh);
leadCrmSearchInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  refreshLeadCrm({ quiet: true }).catch((error) => showFeedback(error.message, "error"));
});
leadCrmSearchButton?.addEventListener("click", () => refreshLeadCrm({ quiet: true }).catch((error) => showFeedback(error.message, "error")));
[leadCrmCampaignFilter, leadCrmStatusFilter, leadCrmAffiliateFilter, leadCrmPurchaseFilter, leadCrmTicketFilter, leadCrmPriorityFilter, leadCrmScoreMinFilter, leadCrmScoreMaxFilter, leadCrmChannelFilter].forEach((input) => {
  input?.addEventListener(input.tagName === "INPUT" ? "input" : "change", scheduleLeadCrmRefresh);
});
leadCrmResetButton?.addEventListener("click", () => {
  [leadCrmSearchInput, leadCrmCampaignFilter, leadCrmStatusFilter, leadCrmAffiliateFilter, leadCrmPurchaseFilter, leadCrmTicketFilter, leadCrmPriorityFilter, leadCrmScoreMinFilter, leadCrmScoreMaxFilter, leadCrmChannelFilter].forEach((input) => {
    if (input) input.value = "";
  });
  refreshLeadCrm({ quiet: true }).catch((error) => showFeedback(error.message, "error"));
});
leadCrmPrevButton?.addEventListener("click", () => {
  state.leadCrmPagination.offset = Math.max(0, Number(state.leadCrmPagination.offset || 0) - Number(state.leadCrmPagination.limit || 40));
  refreshLeadCrm({ quiet: true, keepOffset: true }).catch((error) => showFeedback(error.message, "error"));
});
leadCrmNextButton?.addEventListener("click", () => {
  state.leadCrmPagination.offset = Number(state.leadCrmPagination.offset || 0) + Number(state.leadCrmPagination.limit || 40);
  refreshLeadCrm({ quiet: true, keepOffset: true }).catch((error) => showFeedback(error.message, "error"));
});
leadDetailCloseButton?.addEventListener("click", closeLeadDetail);
leadDetailModal?.addEventListener("click", (event) => {
  const fastAction = event.target.closest("[data-lead-fast-action]");
  if (fastAction) {
    event.preventDefault();
    event.stopPropagation();
    runLeadFastAction(fastAction.dataset.leadFastAction);
  }
});
leadDetailTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-lead-tab]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  setLeadDetailTab(button.dataset.leadTab || "summary", { scrollTab: true });
});
leadSendActivationButton?.addEventListener("click", () => openLeadActivationModal(state.selectedLeadRef, "TICKET"));
leadSendBenefitButton?.addEventListener("click", () => {
  const ticket = firstActiveLeadTicket();
  if (ticket?.id) {
    const lead = state.selectedLeadDetail?.lead || {};
    shareLeadQrWhatsApp(ticket.id, lead.phone, lead.name);
    return;
  }
  openLeadActivationModal(state.selectedLeadRef, "TICKET");
});
leadCreateNoteButton?.addEventListener("click", () => {
  setLeadDetailTab("notes", { scrollTab: true });
});
leadCopyLastLinkButton?.addEventListener("click", async () => {
  const activeTicket = firstActiveLeadTicket();
  const link = state.lastLeadActivationLink
    || ticketPublicUrl(activeTicket || {})
    || state.selectedLeadDetail?.activations?.find((item) => item.public_url)?.public_url
    || "";
  if (!link) {
    showFeedback("Este lead aun no tiene ticket reciente para copiar.", "info");
    return;
  }
  await navigator.clipboard?.writeText(link);
  showFeedback("Ticket copiado.", "success");
});
leadActivationCloseButton?.addEventListener("click", closeLeadActivationModal);
leadActivationModal?.addEventListener("click", (event) => {
  if (event.target === leadActivationModal) closeLeadActivationModal();
});
leadActivationForm?.addEventListener("submit", submitLeadActivation);
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
  if (event.key === "Escape" && !leadActivationModal?.classList.contains("hidden")) {
    closeLeadActivationModal();
    return;
  }
  if (event.key === "Escape" && !activationShareModal?.classList.contains("hidden")) {
    closeActivationShareModal();
    return;
  }
  if (event.key === "Escape" && !leadDetailModal?.classList.contains("hidden")) {
    closeLeadDetail();
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
affiliateRewardRuleForm?.addEventListener("submit", submitAffiliateRewardRule);
inventoryProductForm?.addEventListener("submit", submitInventoryProduct);
inventoryResetButton?.addEventListener("click", resetInventoryForm);
refreshInventoryButton?.addEventListener("click", async () => {
  await loadInventoryProducts({ force: true });
  renderInventoryView();
});
inventorySearchInput?.addEventListener("input", () => {
  state.inventorySearch = inventorySearchInput.value;
  renderInventoryView();
});
customerAcquisitionProductInput?.addEventListener("change", () => {
  applyInventoryProductToSaleInput(customerAcquisitionProductInput, customerAcquisitionAmountInput, customerAcquisitionCurrencyInput);
});
function handlePortalProductSelectionChange(productSelect) {
  if (!productSelect) return;
  syncProductOpenInput(productSelect);
  if (productSelect === postSaleProductInput) {
    applyInventoryProductToSaleInput(postSaleProductInput, postSaleAmountInput, postSaleCurrencyInput);
  }
  if (productSelect === validatorProductServiceInput) {
    applyInventoryProductToSaleInput(validatorProductServiceInput, validatorSaleAmountInput);
  }
  if (productSelect === postSaleBenefitProductInput || productSelect === postSaleBenefitProductModeInput) {
    syncBenefitProductFields(postSaleBenefitProductModeInput, postSaleBenefitProductInput, postSaleBenefitLabelInput, postSaleBenefitTypeInput);
  }
  if (productSelect === qrBatchBenefitProductInput || productSelect === qrBatchBenefitProductModeInput) {
    syncBenefitProductFields(qrBatchBenefitProductModeInput, qrBatchBenefitProductInput, qrBatchBenefitLabelInput, qrBatchBenefitTypeInput);
  }
  if (productSelect === triviaBenefitProductInput || productSelect === triviaBenefitProductModeInput) {
    syncBenefitProductFields(triviaBenefitProductModeInput, triviaBenefitProductInput, triviaBenefitLabelInput, triviaBenefitTypeInput);
  }
}

[postSaleProductInput, validatorProductServiceInput, postSaleBenefitProductInput, postSaleBenefitProductModeInput, qrBatchBenefitProductInput, qrBatchBenefitProductModeInput, triviaBenefitProductInput, triviaBenefitProductModeInput].forEach((field) => {
  field?.addEventListener("change", () => handlePortalProductSelectionChange(field));
});

document.querySelectorAll(".open-product-input").forEach((input) => {
  input.addEventListener("input", () => {
    const productSelect = input.id
      ? document.querySelector(`[data-open-product-input="${input.id}"]`)
      : input.closest("label")?.querySelector("[data-product-select]");
    handlePortalProductSelectionChange(productSelect);
  });
});
affiliatePurchaseAddItemButton?.addEventListener("click", () => {
  state.affiliatePurchaseItems = [
    ...normalizeAffiliatePurchaseItems(),
    { name: "", quantity: 1, unit_price: 0 },
  ];
  renderAffiliatePurchaseItems();
});
affiliateAddPointsButton?.addEventListener("click", awardSelectedAffiliatePoints);
downloadAffiliateCardButton?.addEventListener("click", downloadSelectedAffiliateCard);
copyAffiliateCardLinkButton?.addEventListener("click", copySelectedAffiliateCardLink);
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
refreshLeadCaptureButton?.addEventListener("click", async () => {
  await loadLeadCaptureActivations({ force: true });
  renderLeadCaptureTable();
});
refreshDigitalAssetsButton?.addEventListener("click", async () => {
  await loadDigitalAssets({ force: true });
  renderDigitalAssets();
  renderLeadCaptureAssetOptions();
});
rewardPassStatusFilter?.addEventListener("change", renderRewardPassesView);
rewardPassCreateForm?.addEventListener("submit", submitRewardPass);
leadCaptureForm?.addEventListener("submit", submitLeadCapture);
digitalAssetForm?.addEventListener("submit", submitDigitalAsset);
leadCaptureAssetSelect?.addEventListener("change", renderLeadCaptureAssetPreview);
leadCaptureOpenAssetsButton?.addEventListener("click", () => {
  setView("account");
  digitalAssetForm?.scrollIntoView({ behavior: "smooth", block: "center" });
});
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
battleshipShipCountInput?.addEventListener("input", updateBattleshipShipInputs);

rangeButton.textContent = `Últimos ${state.rangeDays} días`;
applyPortalTheme(readPreferredTheme());
setView("dashboard");
initPasswordResetFromUrl();
setupPasswordRevealButtons();
setActivationType(currentActivationType());
updateTriviaQuestionVisibility();
updateTriviaExpiryMode();
updateSurveyQuestionEditors();
updateActivationQuestionCountControls();
updateBattleshipShipInputs();
renderShell();
const paymentResult = new URLSearchParams(window.location.search).get("payment");
if (paymentResult === "success") {
  showFeedback("Pago aprobado. Si Mercado Pago ya notificó el webhook, los tickets apareceran en unos segundos.", "success", { title: "Pago recibido", timeout: 8000 });
} else if (paymentResult === "pending") {
  showFeedback("Pago pendiente. Actualizaremos el saldo cuando Mercado Pago confirme la transacción.", "info", { title: "Pago en revision", timeout: 8000 });
} else if (paymentResult === "failure") {
  showFeedback("El pago no fue aprobado. Puedes intentar nuevamente con otro medio de pago.", "error", { title: "Pago no completado", timeout: 8000 });
}



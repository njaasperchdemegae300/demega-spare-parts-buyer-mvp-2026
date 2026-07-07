const fs = require("fs");
const path = require("path");
const dataStore = require("../services/data-store");
const inventoryService = require("../services/inventory.service");
const quoteDraftService = require("../services/quote-draft.service");
const buyerPipelineService = require("../services/buyer-pipeline.service");
const followUpService = require("../services/followup.service");
const actionQueueService = require("../services/action-queue.service");
const hotBuyerService = require("../services/hot-buyer.service");
const whatsappManualService = require("../services/whatsapp-manual.service");
const stockConfirmationService = require("../services/stock-confirmation.service");
const compatibilityConfirmationService = require("../services/compatibility-confirmation.service");
const quoteEligibilityService = require("../services/quote-eligibility.service");
const manualQuoteDraftService = require("../services/manual-quote-draft.service");
const manualQuoteCopyService = require("../services/manual-quote-copy.service");
const manualQuoteSentConfirmationService = require("../services/manual-quote-sent-confirmation.service");
const buyerReplyService = require("../services/buyer-reply.service");
const buyerReplyFollowupActionService = require("../services/buyer-reply-followup-action.service");
const manualDealOutcomeService = require("../services/manual-deal-outcome.service");
const manualStockMovementReviewService = require("../services/manual-stock-movement-review.service");
const manualAccountingReviewService = require("../services/manual-accounting-review.service");
const manualFinalBusinessReviewService = require("../services/manual-final-business-review.service");
const assistantSalesAgentTestLabService = require("../services/assistant-sales-agent-test-lab.service");
const internalBuyerGateReadinessGuardianService = require("../services/internal-buyer-gate-readiness-guardian.service");
const controlledBuyerGateTestPlanService = require("../services/controlled-buyer-gate-test-plan.service");
const controlledBuyerGateManualActivationApprovalService = require("../services/controlled-buyer-gate-manual-activation-approval.service");
const controlledBuyerGateActivationExecutionService = require("../services/controlled-buyer-gate-activation-execution.service");
const controlledBuyerGateLeadSlotEnforcementService = require("../services/controlled-buyer-gate-lead-slot-enforcement.service");
const controlledBuyerGateManualLeadReviewService = require("../services/controlled-buyer-gate-manual-lead-review.service");

const modules = [
  { name: "Buyer Lead Dashboard", path: "/dashboard", purpose: "Captured buyer leads, scoring, and manual review." },
  { name: "Inventory Command Center", path: "/inventory", purpose: "Inventory list, stock status, and quote-blocking safety." },
  { name: "Quote Draft Dashboard", path: "/quotes", purpose: "Legacy draft-only quote messages with manual review." },
  { name: "Buyer Pipeline Dashboard", path: "/pipeline", purpose: "Manual buyer-stage tracking and event history." },
  { name: "Follow-Up Reminder Dashboard", path: "/followups", purpose: "Manual follow-up reminder tracking." },
  { name: "Buyer Action Queue", path: "/action-queue", purpose: "Manual buyer action tracking for calls, verification, quote preparation, delivery, closing, and blocking." },
  { name: "Hot Buyer Command Center", path: "/hot-buyers", purpose: "Read-only serious-buyer ranking using lead, action, follow-up, and pipeline signals." },
  { name: "WhatsApp Manual Open Dashboard", path: "/whatsapp-manual", purpose: "Manual WhatsApp open-link visibility with no auto-send, no auto-open, no price, and no auto-quote." },
  { name: "Stock Confirmation Gate", path: "/stock-confirmation", purpose: "Manual stock confirmation visibility while quote remains blocked until compatibility confirmation." },
  { name: "Compatibility Confirmation Gate", path: "/compatibility-confirmation", purpose: "Manual compatibility confirmation visibility while manual quote draft is allowed only after stock and compatibility are both confirmed." },
  { name: "Safe Final Quote Eligibility Gate", path: "/quote-eligibility", purpose: "Final quote eligibility visibility. Eligibility-check only; no automatic quote, no price, no WhatsApp sending." },
  { name: "Safe Manual Quote Draft Builder", path: "/manual-quote-draft", purpose: "Safe manual quote draft visibility. Draft-only; price may appear inside draft after eligibility but is not sent to buyer." },
  { name: "Manual Quote Copy Button", path: "/manual-quote-copy", purpose: "Prepared quote copy text visibility. Manual select only; no clipboard automation, no WhatsApp sending, no sent marking." },
  { name: "Manual Quote Sent Confirmation Gate", path: "/manual-quote-sent-confirmation", purpose: "Manual sent confirmation visibility. Confirmation record only; system does not send buyer message." },
  { name: "Buyer Reply Tracking", path: "/buyer-reply", purpose: "Manual buyer reply visibility. Manual-entry only; no WhatsApp reading, private scraping, hidden harvesting, auto-reply, or auto-send." },
  { name: "Buyer Reply Follow-Up Action Gate", path: "/buyer-reply-followup", purpose: "Manual follow-up action visibility. Manual action only; system does not execute, send, auto-reply, move pipeline, close sale, read messages, scrape, or harvest data." }
,
  { name: "Manual Deal Outcome Gate", path: "/manual-deal-outcome", purpose: "Manual deal outcome visibility. Outcome record only; system does not close sale, move pipeline, send, auto-reply, handle payment, change stock, read messages, scrape, or harvest data." },
  { name: "Manual Stock Movement Review Gate", path: "/manual-stock-movement-review", purpose: "Manual stock movement review visibility. Review-only; system does not update inventory, reduce stock, reserve stock, release stock, create stock ledger, handle payment, send, read messages, scrape, or harvest data." },
  { name: "Manual Accounting Review Gate", path: "/manual-accounting-review", purpose: "Manual accounting review visibility. Review-only; system does not create accounting entries, financial ledger, verify payment, generate receipts, create invoices, record revenue, move pipeline, update inventory, send, read messages, scrape, or harvest data." },
  { name: "Manual Final Business Review Gate", path: "/manual-final-business-review", purpose: "Manual final business review visibility. Review-only; system does not create final business records, close sales, move pipeline, create accounting entries, record revenue, update inventory, send, read messages, scrape, or harvest data." },
  { name: "Assistant Sales Agent Test Lab", path: "/assistant-sales-agent-test-lab", purpose: "Internal simulation-only sales-agent behavior testing before live buyer traffic. No live buyer contact, no WhatsApp auto-send, no WhatsApp auto-read, no scraping, no hidden harvesting, no quote before stock and compatibility gates." },
  { name: "Internal Buyer-Gate Readiness Guardian", path: "/internal-buyer-gate-readiness", purpose: "Read-only readiness guardian before live buyer traffic. Checks source-of-truth readiness and Assistant Sales Agent readiness. Does not open buyer gate, contact buyers, send/read WhatsApp, scrape data, update inventory, create accounting entries, close sales, or move pipeline." },
  { name: "Controlled Buyer-Gate Test Plan", path: "/controlled-buyer-gate-test-plan", purpose: "Read-only controlled 15-lead buyer-gate test plan display. Shows plan readiness only; does not open buyer gate, activate live traffic, contact buyers, send/read WhatsApp, scrape data, update inventory, create accounting entries, close sales, or move pipeline." },
  { name: "Controlled Buyer-Gate Manual Activation Approval", path: "/controlled-buyer-gate-manual-activation-approval", purpose: "Read-only manual activation approval dashboard. Approval is not activation; buyer gate remains closed, live traffic remains inactive, no buyer is contacted, no WhatsApp is sent/read, no scraping, no inventory/accounting/sale/pipeline mutation." },
  { name: "Controlled Buyer-Gate Activation Execution", path: "/controlled-buyer-gate-activation-execution", purpose: "Read-only controlled activation execution dashboard. Shows controlled 15-lead manual inbound gate only; no outbound traffic, no paid ads, no buyer auto-contact, no WhatsApp send/read, no scraping, no inventory/accounting/sale/pipeline mutation." },
  { name: "Controlled Buyer-Gate Lead-Slot Enforcement", path: "/controlled-buyer-gate-lead-slot-enforcement", purpose: "Read-only controlled lead-slot dashboard. Shows inbound buyer-initiated lead slots, 15-lead limit, remaining slots, and limit status. No buyer contact, no WhatsApp send/read, no scraping, no quote, no inventory/accounting/sale/pipeline mutation." },
  { name: "Controlled Buyer-Gate Manual Lead Review", path: "/controlled-buyer-gate-manual-lead-review", purpose: "Read-only manual lead review dashboard. Shows accept/reject review decisions before buyer contact or quote preparation. No WhatsApp send/read, no scraping, no inventory/accounting/sale/pipeline mutation." }];

function safeRead(factory, fallback) {
  try {
    return factory();
  } catch {
    return fallback;
  }
}

function adminNavigationHubController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "admin-navigation-hub.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Admin navigation hub file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function getSafety() {
  return {
    navigationOnly: true,
    visibilityOnly: true,
    metricsReadOnly: true,

    sourceOfTruthOnly: true,
    handoverSystemOnly: true,
    assistantSalesAgentReadinessTestOnly: true,
    assistantSalesAgentTestLabOnly: true,
    internalBuyerGateReadinessGuardianOnly: true,
    internalReadinessCheckOnly: true,
    readinessGuardianOnly: true,

    controlledBuyerGateTestPlanOnly: true,
    controlledPlanOnly: true,
    controlled15LeadPlanOnly: true,
    controlledBuyerGateManualActivationApprovalOnly: true,
    manualActivationApprovalGateOnly: true,
    manualApprovalRecordedOnly: true,
    approvalIsNotActivation: true,
    controlledBuyerGateActivationExecutionOnly: true,
    activationExecutionGateOnly: true,
    controlledGateActiveManualInboundOnly: true,
    controlledManualInboundOnly: true,
    buyerGateOpenForManualInboundOnly: true,
    approvedForManualInboundLeadAcceptanceOnly: true,
    controlledBuyerGateLeadSlotEnforcementOnly: true,
    leadSlotEnforcementOnly: true,
    controlledLeadSlotOnly: true,
    inboundLeadSlotOnly: true,
    buyerInitiatedInboundOnly: true,
    acceptedForManualReviewOnly: true,
    slotAcceptanceOnly: true,

    controlledBuyerGateManualLeadReviewOnly: true,
    manualLeadReviewGateOnly: true,
    leadReviewRecordOnly: true,
    controlledLeadReviewOnly: true,
    inboundLeadReviewOnly: true,
    manualReviewCompletedOnly: true,
    acceptRejectDecisionOnly: true,
    acceptedForManualStockCheckOnly: true,
    rejectedAsNotReadyOnly: true,

    leadLimitOnly: true,
    leadLimit: 15,
    sixteenthLeadBlocked: true,
    chosenFirstSource: "whatsapp_click_to_chat_inbound",
    testSource: "whatsapp_click_to_chat_inbound",

    buyerGateOpened: true,
    buyerGateOpenedForManualInboundOnly: true,
    openLiveBuyerGate: false,
    activateBuyerGate: false,
    enableLiveTraffic: false,
    startLiveBuyerTraffic: false,
    liveTrafficActivated: false,
    liveTrafficPushStarted: false,
    outboundTrafficStarted: false,
    startOutboundTraffic: false,
    startPaidAdsAutomatically: false,
    publishLeadFormAutomatically: false,

    noRealBuyerContacted: true,
    realBuyerContacted: false,
    buyerContacted: false,
    autoContactBuyer: false,
    contactRealBuyerAutomatically: false,
    contactBuyerAutomatically: false,

    manualReviewRequired: true,
    manualReplyOnly: true,
    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    leadSlotEnforcementActive: true,
    manualReviewRequiredBeforeAnyBuyerContact: true,
    inboundBuyerInitiatedContactRequired: true,

    manualStockCheckRequiredNext: true,
    manualCompatibilityCheckRequiredLater: true,
    stockConfirmationRequiredBeforeQuote: true,
    compatibilityConfirmationRequiredBeforeQuote: true,

    hotBuyerRankingReadOnly: true,
    whatsappManualOpenOnly: true,
    stockConfirmationManualOnly: true,
    compatibilityConfirmationManualOnly: true,
    quoteEligibilityOnly: true,
    manualQuoteDraftBuilderOnly: true,
    manualQuoteCopyFoundationOnly: true,
    manualQuoteSentConfirmationOnly: true,
    buyerReplyTrackingOnly: true,
    buyerReplyFollowupActionGateOnly: true,
    manualDealOutcomeGateOnly: true,
    manualStockMovementReviewGateOnly: true,
    manualAccountingReviewGateOnly: true,
    manualFinalBusinessReviewGateOnly: true,

    manualEntryOnly: true,
    manualActionOnly: true,
    actionPreparedOnly: true,
    manualDealOutcomeOnly: true,
    manualOutcomeRecordOnly: true,
    manualStockMovementReviewOnly: true,
    stockUpdatePreparedOnly: true,
    manualAccountingReviewOnly: true,
    accountingEntryPreparedOnly: true,
    manualFinalBusinessReviewOnly: true,
    finalBusinessRecordPreparedOnly: true,

    requiresPreparedCopyAction: true,
    requiresManualAdminConfirmation: true,
    requiresManualReviewCompleted: true,
    requiresManualSentConfirmation: true,
    requiresBuyerReply: true,
    requiresAdminReviewedBuyerReply: true,
    requiresManualActionApproval: true,
    requiresFollowupAction: true,
    requiresAdminCompletedManualAction: true,
    requiresManualOutcomeApproval: true,
    requiresManualDealOutcome: true,
    requiresAdminReviewedDealOutcome: true,
    requiresManualStockMovementReviewApproval: true,
    requiresManualStockMovementReview: true,
    requiresAdminReviewedStockMovement: true,
    requiresManualAccountingReviewApproval: true,
    requiresManualAccountingReview: true,
    requiresAdminReviewedAccounting: true,
    requiresManualFinalBusinessReviewApproval: true,
    adminObservedReplyRequired: true,

    preparesCopyTextOnly: true,
    confirmationRecordOnly: true,
    draftOnly: true,
    stockAndCompatibilityRequiredBeforeQuote: true,
    manualQuoteDraftAllowedOnlyAfterBothGates: true,
    requiresFinalQuoteEligibility: true,

    systemDoesNotSendMessage: true,
    systemDoesNotSendWhatsApp: true,
    systemDoesNotReadBuyerMessages: true,
    systemDoesNotExecuteBuyerContact: true,
    systemDoesNotAutoReply: true,
    systemDoesNotStartOutboundTraffic: true,
    systemDoesNotStartPaidAds: true,
    systemDoesNotPublishLeadForm: true,
    systemDoesNotMovePipeline: true,
    systemDoesNotCloseSale: true,
    systemDoesNotHandlePayment: true,
    systemDoesNotChangeStock: true,
    systemDoesNotUpdateInventory: true,
    systemDoesNotReduceStock: true,
    systemDoesNotReserveStock: true,
    systemDoesNotReleaseStock: true,
    systemDoesNotCreateStockLedger: true,
    systemDoesNotCreateAccountingEntry: true,
    systemDoesNotCreateFinancialLedger: true,
    systemDoesNotVerifyPayment: true,
    systemDoesNotCollectPayment: true,
    systemDoesNotGenerateReceipt: true,
    systemDoesNotSendReceipt: true,
    systemDoesNotCreateInvoice: true,
    systemDoesNotRecordRevenue: true,
    systemDoesNotCreateFinalBusinessRecord: true,

    serverDoesNotAccessClipboard: true,
    browserAutoCopy: false,
    copiedToClipboardByBrowser: false,

    quotePrepared: false,
    quoteAllowedAtReviewGate: false,
    quoteAllowedAtSlotGate: false,
    quoteAllowedAtStockGate: false,
    autoCreateQuote: false,
    autoCreateQuoteAndSend: false,
    quoteBeforeStockConfirmation: false,
    quoteBeforeCompatibilityConfirmation: false,
    priceSentToBuyer: false,
    quoteAmountSentToBuyer: false,
    priceIncluded: false,
    quoteAmountIncluded: false,

    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    harvestBuyerContacts: false,
    buyPrivateContactList: false,
    autoReplyToBuyer: false,
    automaticBuyerMessage: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
    broadcastWhatsApp: false,
    autoOpenBrowser: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    autoCompleteBuyerAction: false,
    autoContactHotBuyer: false,

    sentToBuyer: false,
    sentByAdmin: false,
    systemSentToBuyer: false,
    sentToBuyerBySystem: false,
    quoteMarkedSentBySystem: false,
    priceSentBySystem: false,

    autoCloseSale: false,
    closeSaleAutomatically: false,
    saleClosedBySystem: false,
    markSaleWonAutomatically: false,
    markSaleLostAutomatically: false,
    markLeadClosedAutomatically: false,
    closeBuyerAutomatically: false,

    collectPaymentAutomatically: false,
    verifyPaymentAutomatically: false,
    autoReserveStock: false,
    autoReduceStock: false,
    autoReleaseStock: false,
    autoUpdateInventory: false,
    updateInventoryAutomatically: false,
    reduceStockAutomatically: false,
    reserveStockAutomatically: false,
    releaseStockAutomatically: false,
    autoChangeStockQuantity: false,
    changeStockAutomatically: false,
    inventoryChangedBySystem: false,
    stockReducedBySystem: false,
    stockReservedBySystem: false,
    stockReleasedBySystem: false,
    autoCreateInventoryEvent: false,
    autoCreateStockLedgerEntry: false,

    autoCreateAccountingEntry: false,
    createAccountingEntryAutomatically: false,
    accountingEntryCreatedBySystem: false,
    autoCreateFinancialLedgerEntry: false,
    financialLedgerEntryCreatedBySystem: false,
    autoVerifyPayment: false,
    paymentVerifiedBySystem: false,
    autoGenerateReceipt: false,
    receiptGeneratedBySystem: false,
    autoSendReceipt: false,
    receiptSentAutomatically: false,
    autoCreateInvoice: false,
    invoiceCreatedBySystem: false,
    autoUpdateRevenue: false,
    revenueRecordedBySystem: false,

    autoCreateFinalBusinessRecord: false,
    finalBusinessRecordCreatedBySystem: false,

    manualReviewRequiredForNextStep: true,
    manualReviewRequiredBeforeExecution: true,
    manualReviewRequiredBeforeLiveBuyerGate: true,
    manualApprovalRequiredBeforeActivation: true,
    manualApprovalRequiredToOpenBuyerGateLater: true,
    manualReviewRequiredForAccounting: true,
    manualReviewRequiredForPipelineUpdate: true,
    manualReviewRequiredForStockUpdate: true,
    manualReviewRequiredBeforeInventoryChange: true,
    manualInventoryUpdateRequired: true,
    manualLedgerEntryRequired: true,
    manualAccountingEntryRequired: true,
    manualPaymentVerificationRequired: true,
    manualReceiptRequired: true,
    manualInvoiceRequiredIfNeeded: true,
    manualFinancialLedgerEntryRequired: true,
    manualReviewRequiredBeforeAccountingEntry: true,
    manualFinalBusinessRecordRequired: true,
    manualManagerReviewRequired: true,
    manualPipelineUpdateRequired: true,
    manualAccountingVerificationRequired: true,
    manualInventoryVerificationRequired: true,
    manualReviewRequiredBeforeFinalClose: true
  };
}

function adminNavigationSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Admin Navigation Hub Foundation is active.",
    modules,
    safety: getSafety()
  });
}

function adminNavigationDashboardMetricsController(req, res, sendJson) {
  const leads = safeRead(() => dataStore.readCollection("leads"), []);
  const inventory = safeRead(() => inventoryService.getInventorySummary(), {});
  const quotes = safeRead(() => quoteDraftService.getQuoteSummary(), {});
  const pipeline = safeRead(() => buyerPipelineService.getPipelineSummary(), {});
  const followUps = safeRead(() => followUpService.getFollowUpSummary(), {});
  const actionQueue = safeRead(() => actionQueueService.getActionQueueSummary(), {});
  const hotBuyers = safeRead(() => hotBuyerService.getHotBuyerSummary(), {});
  const whatsappManual = safeRead(() => whatsappManualService.getManualWhatsAppSummary(), {});
  const stockConfirmation = safeRead(() => stockConfirmationService.getStockConfirmationSummary(), {});
  const compatibilityConfirmation = safeRead(() => compatibilityConfirmationService.getCompatibilityConfirmationSummary(), {});
  const quoteEligibility = safeRead(() => quoteEligibilityService.getQuoteEligibilitySummary(), {});
  const manualQuoteDraft = safeRead(() => manualQuoteDraftService.getManualQuoteDraftSummary(), {});
  const manualQuoteCopy = safeRead(() => manualQuoteCopyService.getManualQuoteCopySummary(), {});
  const manualQuoteSentConfirmation = safeRead(() => manualQuoteSentConfirmationService.getManualQuoteSentConfirmationSummary(), {});
  const buyerReply = safeRead(() => buyerReplyService.getBuyerReplySummary(), {});
  const buyerReplyFollowupAction = safeRead(() => buyerReplyFollowupActionService.getBuyerReplyFollowupActionSummary(), {});
  const manualDealOutcome = safeRead(() => manualDealOutcomeService.getManualDealOutcomeSummary(), {});
  const manualStockMovementReview = safeRead(() => manualStockMovementReviewService.getManualStockMovementReviewSummary(), {});
  const manualAccountingReview = safeRead(() => manualAccountingReviewService.getManualAccountingReviewSummary(), {});
  const manualFinalBusinessReview = safeRead(() => manualFinalBusinessReviewService.getManualFinalBusinessReviewSummary(), {});
  const assistantSalesAgentTestLab = safeRead(() => assistantSalesAgentTestLabService.getAssistantSalesAgentTestLabSummary(), {});
  const internalBuyerGateReadiness = safeRead(() => internalBuyerGateReadinessGuardianService.getInternalBuyerGateReadinessSummary(), {});
  const controlledBuyerGateTestPlan = safeRead(() => controlledBuyerGateTestPlanService.getControlledBuyerGateTestPlanSummary(), {});
  const controlledBuyerGateManualActivationApproval = safeRead(() => controlledBuyerGateManualActivationApprovalService.getManualActivationApprovalSummary(), {});
  const controlledBuyerGateActivationExecution = safeRead(() => controlledBuyerGateActivationExecutionService.getActivationExecutionSummary(), {});
  const controlledBuyerGateLeadSlotEnforcement = safeRead(() => controlledBuyerGateLeadSlotEnforcementService.getLeadSlotSummary(), {});
  const controlledBuyerGateManualLeadReview = safeRead(() => controlledBuyerGateManualLeadReviewService.getManualLeadReviewSummary(), {});

  return sendJson(res, 200, {
    status: "ok",
    message: "Admin Navigation Hub dashboard metrics are active.",
    metrics: {
      buyerLeads: {
        total: leads.length,
        hot: leads.filter(lead => lead.temperature === "hot").length,
        manualReviewRequired: leads.filter(lead => lead.manualReviewRequired === true).length
      },
      inventory,
      quotes,
      pipeline,
      followUps,
      actionQueue,
      hotBuyers,
      whatsappManual,
      stockConfirmation,
      compatibilityConfirmation,
      quoteEligibility,
      manualQuoteDraft,
      manualQuoteCopy,
      manualQuoteSentConfirmation,
      buyerReply,
      buyerReplyFollowupAction,
      manualDealOutcome,
      manualStockMovementReview,
      manualAccountingReview,
      manualFinalBusinessReview,
      assistantSalesAgentTestLab,
      internalBuyerGateReadiness,
      controlledBuyerGateTestPlan,
      controlledBuyerGateManualActivationApproval,
      controlledBuyerGateActivationExecution,
      controlledBuyerGateLeadSlotEnforcement,
      controlledBuyerGateManualLeadReview
    },
    safety: getSafety()
  });
}

module.exports = {
  adminNavigationHubController,
  adminNavigationSummaryController,
  adminNavigationDashboardMetricsController
};

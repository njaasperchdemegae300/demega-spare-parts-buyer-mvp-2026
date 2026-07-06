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
  { name: "Manual Stock Movement Review Gate", path: "/manual-stock-movement-review", purpose: "Manual stock movement review visibility. Review-only; system does not update inventory, reduce stock, reserve stock, release stock, create stock ledger, handle payment, send, read messages, scrape, or harvest data." }];

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

    manualEntryOnly: true,
    manualActionOnly: true,
    actionPreparedOnly: true,
    manualDealOutcomeOnly: true,
    manualOutcomeRecordOnly: true,
    manualStockMovementReviewOnly: true,
    stockUpdatePreparedOnly: true,

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
    adminObservedReplyRequired: true,

    preparesCopyTextOnly: true,
    confirmationRecordOnly: true,
    draftOnly: true,
    quoteEligibilityOnly: true,
    stockAndCompatibilityRequiredBeforeQuote: true,
    manualQuoteDraftAllowedOnlyAfterBothGates: true,
    requiresFinalQuoteEligibility: true,

    systemDoesNotSendMessage: true,
    systemDoesNotSendWhatsApp: true,
    systemDoesNotReadBuyerMessages: true,
    systemDoesNotExecuteAction: true,
    systemDoesNotAutoReply: true,
    systemDoesNotOpenBrowser: true,
    systemDoesNotMovePipeline: true,
    systemDoesNotCloseSale: true,
    systemDoesNotHandlePayment: true,
    systemDoesNotChangeStock: true,
    systemDoesNotUpdateInventory: true,
    systemDoesNotReduceStock: true,
    systemDoesNotReserveStock: true,
    systemDoesNotReleaseStock: true,
    systemDoesNotCreateStockLedger: true,

    serverDoesNotAccessClipboard: true,
    browserAutoCopy: false,
    copiedToClipboardByBrowser: false,

    quoteAllowedAtStockGate: false,
    quoteBeforeStockConfirmation: false,
    quoteBeforeCompatibilityConfirmation: false,
    priceAllowedInDraftAfterEligibility: true,
    priceMayAppearInCopyTextAfterEligibility: true,
    priceSentToBuyer: false,
    quoteAmountSentToBuyer: false,
    priceIncluded: false,
    quoteAmountIncluded: false,

    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    autoReplyToBuyer: false,
    automaticBuyerMessage: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
    autoOpenBrowser: false,
    autoCreateQuote: false,
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

    manualReviewRequired: true,
    manualReviewRequiredForNextStep: true,
    manualReviewRequiredBeforeExecution: true,
    manualReviewRequiredForAccounting: true,
    manualReviewRequiredForPipelineUpdate: true,
    manualReviewRequiredForStockUpdate: true,
    manualReviewRequiredBeforeInventoryChange: true,
    manualInventoryUpdateRequired: true,
    manualLedgerEntryRequired: true
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
      manualStockMovementReview
    },
    safety: getSafety()
  });
}

module.exports = {
  adminNavigationHubController,
  adminNavigationSummaryController,
  adminNavigationDashboardMetricsController
};

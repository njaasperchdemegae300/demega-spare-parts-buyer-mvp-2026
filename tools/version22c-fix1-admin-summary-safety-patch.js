const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
let src = fs.readFileSync(controllerFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 22C-FIX1 PATCH FAILED: ${message}`);
}

function insertAfter(source, needle, insert) {
  if (!source.includes(needle)) fail(`Missing expected text: ${needle}`);
  if (source.includes(insert.trim())) return source;
  return source.replace(needle, needle + insert);
}

if (!src.includes('manual-stock-movement-review.service')) {
  src = insertAfter(
    src,
    'const manualDealOutcomeService = require("../services/manual-deal-outcome.service");',
    '\nconst manualStockMovementReviewService = require("../services/manual-stock-movement-review.service");'
  );
}

if (!src.includes('{ name: "Manual Stock Movement Review Gate"')) {
  const modulesStart = src.indexOf("const modules = [");
  const modulesEnd = src.indexOf("\n];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) {
    fail("Could not find admin modules array.");
  }

  const moduleEntry = ',\n  { name: "Manual Stock Movement Review Gate", path: "/manual-stock-movement-review", purpose: "Manual stock movement review visibility. Review-only; system does not update inventory, reduce stock, reserve stock, release stock, create stock ledger, handle payment, send, read messages, scrape, or harvest data." }';

  src = src.slice(0, modulesEnd) + moduleEntry + src.slice(modulesEnd);
}

const getSafetyStart = src.indexOf("function getSafety() {");
const summaryStart = src.indexOf("\nfunction adminNavigationSummaryController", getSafetyStart);

if (getSafetyStart === -1 || summaryStart === -1) {
  fail("Could not safely replace getSafety function.");
}

const newGetSafety = `function getSafety() {
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
`;

src = src.slice(0, getSafetyStart) + newGetSafety + src.slice(summaryStart);

if (!src.includes("manualStockMovementReviewService.getManualStockMovementReviewSummary")) {
  src = insertAfter(
    src,
    '  const manualDealOutcome = safeRead(() => manualDealOutcomeService.getManualDealOutcomeSummary(), {});',
    '\n  const manualStockMovementReview = safeRead(() => manualStockMovementReviewService.getManualStockMovementReviewSummary(), {});'
  );
}

if (!src.includes("manualStockMovementReview\n    }")) {
  const needle = "      manualDealOutcome";
  if (!src.includes(needle)) fail("Could not find manualDealOutcome metrics entry.");
  src = src.replace(needle, "      manualDealOutcome,\n      manualStockMovementReview");
}

fs.writeFileSync(controllerFile, src, "utf8");
console.log("Version 22C-FIX1 admin summary safety patch applied.");

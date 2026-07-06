const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 24C PATCH FAILED: ${message}`);
}

function mustInclude(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`Missing expected ${label}: ${needle}`);
  }
}

function insertAfter(source, needle, insert, label) {
  mustInclude(source, needle, label);
  if (source.includes(insert.trim())) return source;
  return source.replace(needle, needle + insert);
}

function replaceOnce(source, needle, replacement, label) {
  mustInclude(source, needle, label);
  return source.replace(needle, replacement);
}

if (!controller.includes('manual-final-business-review.service')) {
  controller = insertAfter(
    controller,
    'const manualAccountingReviewService = require("../services/manual-accounting-review.service");',
    '\nconst manualFinalBusinessReviewService = require("../services/manual-final-business-review.service");',
    "manual accounting review service import"
  );
}

if (!controller.includes('{ name: "Manual Final Business Review Gate"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) {
    fail("Could not find admin modules array.");
  }

  const insert = ',\n  { name: "Manual Final Business Review Gate", path: "/manual-final-business-review", purpose: "Manual final business review visibility. Review-only; system does not create final business records, close sales, move pipeline, create accounting entries, record revenue, update inventory, send, read messages, scrape, or harvest data." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

const getSafetyStart = controller.indexOf("function getSafety() {");
const summaryStart = controller.indexOf("\nfunction adminNavigationSummaryController", getSafetyStart);

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

    manualReviewRequired: true,
    manualReviewRequiredForNextStep: true,
    manualReviewRequiredBeforeExecution: true,
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
`;

controller = controller.slice(0, getSafetyStart) + newGetSafety + controller.slice(summaryStart);

if (!controller.includes("manualFinalBusinessReviewService.getManualFinalBusinessReviewSummary")) {
  controller = insertAfter(
    controller,
    '  const manualAccountingReview = safeRead(() => manualAccountingReviewService.getManualAccountingReviewSummary(), {});',
    '\n  const manualFinalBusinessReview = safeRead(() => manualFinalBusinessReviewService.getManualFinalBusinessReviewSummary(), {});',
    "manual final business review metrics const"
  );
}

if (!controller.includes("manualFinalBusinessReview\n    }")) {
  const pattern = /(manualAccountingReview)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find manualAccountingReview metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      manualFinalBusinessReview$2");
}

if (!hub.includes("MANUAL FINAL BUSINESS REVIEW IS REVIEW ONLY")) {
  hub = insertAfter(
    hub,
    '<span class="badge">NO AUTOMATIC REVENUE RECORDING</span>',
    '\n      <span class="badge">MANUAL FINAL BUSINESS REVIEW IS REVIEW ONLY</span>\n      <span class="badge">NO AUTOMATIC FINAL BUSINESS RECORD</span>\n      <span class="badge">NO AUTOMATIC SALE CLOSING</span>\n      <span class="badge">NO AUTOMATIC PIPELINE MOVEMENT</span>',
    "manual accounting review safety badge"
  );
}

if (!hub.includes("<li>Manual final business review only displays admin-reviewed final business decisions.</li>")) {
  hub = insertAfter(
    hub,
    "<li>It does not record revenue automatically.</li>",
    "\n        <li>Manual final business review only displays admin-reviewed final business decisions.</li>\n        <li>It does not create final business records automatically.</li>\n        <li>It does not close sales automatically.</li>\n        <li>It does not move pipeline automatically.</li>",
    "manual accounting review safety list"
  );
}

if (!hub.includes('id="manualFinalBusinessReviews"')) {
  hub = insertAfter(
    hub,
    '<div class="metric"><h2>Auto Revenue Count</h2><strong id="autoRevenueCount">0</strong></div>',
    '\n        <div class="metric"><h2>Final Business Reviews</h2><strong id="manualFinalBusinessReviews">0</strong></div>\n        <div class="metric"><h2>Final Completed Reviews</h2><strong id="finalCompletedReviews">0</strong></div>\n        <div class="metric"><h2>Manual Final Approved</h2><strong id="manualFinalApproved">0</strong></div>\n        <div class="metric"><h2>Final Amount Confirmed</h2><strong id="manualFinalAmountConfirmed">0</strong></div>\n        <div class="metric"><h2>System Final Records</h2><strong id="systemFinalRecords">0</strong></div>\n        <div class="metric"><h2>Auto Final Close</h2><strong id="autoFinalClose">0</strong></div>\n        <div class="metric"><h2>Auto Final Pipeline</h2><strong id="autoFinalPipeline">0</strong></div>',
    "manual final business review metric card"
  );
}

if (!hub.includes('href="/manual-final-business-review"')) {
  hub = insertAfter(
    hub,
    '<div class="card"><h2>Manual Accounting Review Gate</h2><p>View manual accounting reviews after stock movement reviews. No automatic accounting entry, financial ledger, payment verification, receipt, invoice, revenue recording, pipeline movement, inventory update, WhatsApp sending, message reading, scraping, or hidden harvesting.</p><a href="/manual-accounting-review">Open Accounting Review Gate</a></div>',
    '\n      <div class="card"><h2>Manual Final Business Review Gate</h2><p>View manual final business reviews after accounting reviews. No automatic final business record, sale closing, pipeline movement, accounting entry, revenue recording, inventory update, WhatsApp sending, message reading, scraping, or hidden harvesting.</p><a href="/manual-final-business-review">Open Final Business Review Gate</a></div>',
    "manual accounting review card"
  );
}

if (!hub.includes('metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.totalManualFinalBusinessReviews')) {
  hub = insertAfter(
    hub,
    '      document.getElementById("autoRevenueCount").textContent = safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.autoRevenueCount);',
    '\n      document.getElementById("manualFinalBusinessReviews").textContent = safeNumber(metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.totalManualFinalBusinessReviews);\n      document.getElementById("finalCompletedReviews").textContent = safeNumber(metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.finalSaleCompletedReviewCount);\n      document.getElementById("manualFinalApproved").textContent = safeNumber(metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.approvedForManualBusinessRecordsCount);\n      document.getElementById("manualFinalAmountConfirmed").textContent = safeNumber(metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.amountConfirmedByAdminTotal).toLocaleString();\n      document.getElementById("systemFinalRecords").textContent = safeNumber(metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.finalBusinessRecordCreatedBySystemCount);\n      document.getElementById("autoFinalClose").textContent = safeNumber(metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.autoCloseSaleCount);\n      document.getElementById("autoFinalPipeline").textContent = safeNumber(metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.autoPipelineMoveCount);',
    "manual final business review metric assignment"
  );
}

if (!hub.includes("safeNumber(metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.autoSendWhatsAppCount)")) {
  hub = replaceOnce(
    hub,
    "        safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.autoSendWhatsAppCount);",
    "        safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.autoSendWhatsAppCount) +\n        safeNumber(metrics.manualFinalBusinessReview && metrics.manualFinalBusinessReview.autoSendWhatsAppCount);",
    "auto send metric sum"
  );
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");
console.log("Version 24C admin hub patch applied.");

const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 32C PATCH FAILED: ${message}`);
}

function insertAfter(source, needle, insert, label) {
  if (!source.includes(needle)) fail(`Missing expected ${label}: ${needle}`);
  if (source.includes(insert.trim())) return source;
  return source.replace(needle, needle + insert);
}

function insertBefore(source, needle, insert, label) {
  if (!source.includes(needle)) fail(`Missing expected ${label}: ${needle}`);
  if (source.includes(insert.trim())) return source;
  return source.replace(needle, insert + needle);
}

function insertBeforeFirstSectionEnd(source, sectionStartNeedle, insert) {
  if (source.includes(insert.trim())) return source;
  const sectionStart = source.indexOf(sectionStartNeedle);
  if (sectionStart === -1) return source;
  const sectionEnd = source.indexOf("</section>", sectionStart);
  if (sectionEnd === -1) return source;
  return source.slice(0, sectionEnd) + insert + "\n" + source.slice(sectionEnd);
}

if (!controller.includes('controlled-buyer-gate-manual-stock-check.service')) {
  const importLine = 'const controlledBuyerGateManualStockCheckService = require("../services/controlled-buyer-gate-manual-stock-check.service");\n';

  if (controller.includes('const controlledBuyerGateManualLeadReviewService = require("../services/controlled-buyer-gate-manual-lead-review.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateManualLeadReviewService = require("../services/controlled-buyer-gate-manual-lead-review.service");',
      'const controlledBuyerGateManualLeadReviewService = require("../services/controlled-buyer-gate-manual-lead-review.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Manual Stock Check"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Manual Stock Check", path: "/controlled-buyer-gate-manual-stock-check", purpose: "Read-only manual stock check dashboard. Shows manually confirmed stock decisions before compatibility check or quote preparation. No buyer contact, no quote, no WhatsApp send/read, no scraping, no inventory mutation, no accounting, no sale closing, and no pipeline movement." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

const getSafetyStart = controller.indexOf("function getSafety() {");
const summaryStart = controller.indexOf("\nfunction adminNavigationSummaryController", getSafetyStart);

if (getSafetyStart === -1 || summaryStart === -1) fail("Could not safely replace getSafety function.");

const newGetSafety = `function getSafety() {
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

    controlledBuyerGateManualStockCheckOnly: true,
    manualStockCheckGateOnly: true,
    stockCheckRecordOnly: true,
    controlledStockCheckOnly: true,
    manualStockStatusOnly: true,
    stockCheckCompletedOnly: true,
    stockDecisionRecordOnly: true,
    stockConfirmedManuallyOnly: true,
    stockConfirmedAvailableOnly: true,
    stockNotAvailableOnly: true,
    stockNeedsSupplierConfirmationOnly: true,

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

    manualStockCheckRequired: true,
    manualStockCheckCompletedOnly: true,
    manualCompatibilityCheckRequiredNext: true,
    manualCompatibilityCheckRequiredLater: true,
    compatibilityConfirmationRequiredBeforeQuote: true,
    stockConfirmationRequiredBeforeQuote: true,
    quoteBlockedUntilCompatibility: true,

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

    inventoryUpdated: false,
    stockReserved: false,
    stockReduced: false,
    stockReleased: false,
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

    serverDoesNotAccessClipboard: true,
    browserAutoCopy: false,
    copiedToClipboardByBrowser: false,

    quotePrepared: false,
    quoteAllowedAtStockCheckGate: false,
    quoteAllowedAtReviewGate: false,
    quoteAllowedAtSlotGate: false,
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
`;

controller = controller.slice(0, getSafetyStart) + newGetSafety + controller.slice(summaryStart);

if (!controller.includes("controlledBuyerGateManualStockCheckService.getManualStockCheckSummary")) {
  const metricLine = '  const controlledBuyerGateManualStockCheck = safeRead(() => controlledBuyerGateManualStockCheckService.getManualStockCheckSummary(), {});';

  if (controller.includes('  const controlledBuyerGateManualLeadReview = safeRead(() => controlledBuyerGateManualLeadReviewService.getManualLeadReviewSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateManualLeadReview = safeRead(() => controlledBuyerGateManualLeadReviewService.getManualLeadReviewSummary(), {});',
      '\n' + metricLine,
      "manual lead review metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!/controlledBuyerGateManualStockCheck\s*\n\s*}/.test(controller) && !/controlledBuyerGateManualStockCheck,\s*\n/.test(controller)) {
  const pattern = /(controlledBuyerGateManualLeadReview)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateManualLeadReview metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateManualStockCheck$2");
}

const safetyBadges = `
      <span class="badge">MANUAL STOCK CHECK DASHBOARD ONLY</span>
      <span class="badge">STOCK CHECK RECORD ONLY</span>
      <span class="badge">NO BUYER CONTACT FROM STOCK GATE</span>
      <span class="badge">NO QUOTE PREPARED AT STOCK GATE</span>
      <span class="badge">NO INVENTORY MUTATION</span>
      <span class="badge">QUOTE BLOCKED UNTIL COMPATIBILITY</span>`;

if (!hub.includes("MANUAL STOCK CHECK DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">NO QUOTE PREPARED AT REVIEW GATE</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">NO QUOTE PREPARED AT REVIEW GATE</span>',
      safetyBadges,
      "manual stock check safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Stock Check Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Manual stock check records stock status only.</li>
        <li>Manual stock check does not contact buyers.</li>
        <li>Manual stock check does not prepare quote.</li>
        <li>Manual stock check does not update, reserve, or reduce stock.</li>
        <li>Quote remains blocked until compatibility confirmation.</li>
        <li>Manual compatibility check is required next.</li>`;

if (!hub.includes("<li>Manual stock check records stock status only.</li>")) {
  if (hub.includes("<li>Manual review does not prepare quote.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Manual review does not prepare quote.</li>",
      safetyList,
      "manual stock check safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Stock Check Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Manual Stock Checks</h2><strong id="manualStockCheckTotal">0</strong></div>
        <div class="metric"><h2>Completed Stock Checks</h2><strong id="manualStockCheckCompleted">0</strong></div>
        <div class="metric"><h2>Stock Available</h2><strong id="manualStockAvailable">0</strong></div>
        <div class="metric"><h2>Stock Not Available</h2><strong id="manualStockNotAvailable">0</strong></div>
        <div class="metric"><h2>Supplier Confirmation</h2><strong id="manualStockSupplierConfirm">0</strong></div>
        <div class="metric"><h2>Latest Stock Status</h2><strong id="manualStockLatestStatus">NO_STOCK_CHECK</strong></div>
        <div class="metric"><h2>Latest Stock Decision</h2><strong id="manualStockLatestDecision">NONE</strong></div>
        <div class="metric"><h2>Latest Stock Source</h2><strong id="manualStockLatestSource">NONE</strong></div>`;

if (!hub.includes('id="manualStockCheckTotal"')) {
  if (hub.includes('<div class="metric"><h2>Latest Review Source</h2><strong id="manualLeadReviewLatestSource">NONE</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Latest Review Source</h2><strong id="manualLeadReviewLatestSource">NONE</strong></div>',
      metricCards,
      "manual stock check metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const stockCard = `
      <div class="card"><h2>Controlled Buyer-Gate Manual Stock Check</h2><p>View controlled manual stock check decisions before compatibility check or quote preparation. Read-only; no buyer contact, no quote, no WhatsApp auto-send/read, no scraping, no inventory mutation, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/controlled-buyer-gate-manual-stock-check">Open Manual Stock Check</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-manual-stock-check"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Manual Lead Review</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Manual Lead Review</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + stockCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", stockCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", stockCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadManualStockCheckHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-manual-stock-check/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("manualStockCheckTotal", summary.totalStockChecks || 0);
        setText("manualStockCheckCompleted", summary.completedStockCheckCount || 0);
        setText("manualStockAvailable", summary.stockConfirmedAvailableCount || 0);
        setText("manualStockNotAvailable", summary.stockNotAvailableCount || 0);
        setText("manualStockSupplierConfirm", summary.stockNeedsSupplierConfirmationCount || 0);
        setText("manualStockLatestStatus", summary.latestStockCheckStatus || "NO_STOCK_CHECK");
        setText("manualStockLatestDecision", summary.latestStockDecision || "NONE");
        setText("manualStockLatestSource", summary.latestSource || "NONE");
      } catch (error) {
        const element = document.getElementById("manualStockLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadManualStockCheckHubMetrics();
  </script>
`;

if (!hub.includes("loadManualStockCheckHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 32C admin hub patch applied.");

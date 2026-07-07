const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 31C PATCH FAILED: ${message}`);
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

if (!controller.includes('controlled-buyer-gate-manual-lead-review.service')) {
  const importLine = 'const controlledBuyerGateManualLeadReviewService = require("../services/controlled-buyer-gate-manual-lead-review.service");\n';

  if (controller.includes('const controlledBuyerGateLeadSlotEnforcementService = require("../services/controlled-buyer-gate-lead-slot-enforcement.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateLeadSlotEnforcementService = require("../services/controlled-buyer-gate-lead-slot-enforcement.service");',
      'const controlledBuyerGateLeadSlotEnforcementService = require("../services/controlled-buyer-gate-lead-slot-enforcement.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Manual Lead Review"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Manual Lead Review", path: "/controlled-buyer-gate-manual-lead-review", purpose: "Read-only manual lead review dashboard. Shows accept/reject review decisions before buyer contact or quote preparation. No WhatsApp send/read, no scraping, no inventory/accounting/sale/pipeline mutation." }';
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
`;

controller = controller.slice(0, getSafetyStart) + newGetSafety + controller.slice(summaryStart);

if (!controller.includes("controlledBuyerGateManualLeadReviewService.getManualLeadReviewSummary")) {
  const metricLine = '  const controlledBuyerGateManualLeadReview = safeRead(() => controlledBuyerGateManualLeadReviewService.getManualLeadReviewSummary(), {});';

  if (controller.includes('  const controlledBuyerGateLeadSlotEnforcement = safeRead(() => controlledBuyerGateLeadSlotEnforcementService.getLeadSlotSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateLeadSlotEnforcement = safeRead(() => controlledBuyerGateLeadSlotEnforcementService.getLeadSlotSummary(), {});',
      '\n' + metricLine,
      "lead-slot enforcement metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateManualLeadReview\n    }")) {
  const pattern = /(controlledBuyerGateLeadSlotEnforcement)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateLeadSlotEnforcement metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateManualLeadReview$2");
}

const safetyBadges = `
      <span class="badge">MANUAL LEAD REVIEW DASHBOARD ONLY</span>
      <span class="badge">REVIEW RECORD ONLY</span>
      <span class="badge">NO BUYER CONTACT FROM REVIEW GATE</span>
      <span class="badge">NO QUOTE PREPARED AT REVIEW GATE</span>
      <span class="badge">ACCEPT MOVES TO MANUAL STOCK CHECK ONLY</span>
      <span class="badge">REJECT RECORDS NOT-READY ONLY</span>`;

if (!hub.includes("MANUAL LEAD REVIEW DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">NO BUYER CONTACT FROM SLOT GATE</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">NO BUYER CONTACT FROM SLOT GATE</span>',
      safetyBadges,
      "manual lead review safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Lead Review Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Manual lead review records review decisions only.</li>
        <li>Manual review does not contact buyers.</li>
        <li>Manual review does not prepare quote.</li>
        <li>Accepted review moves only toward manual stock check next.</li>
        <li>Rejected review records not-ready status only.</li>`;

if (!hub.includes("<li>Manual lead review records review decisions only.</li>")) {
  if (hub.includes("<li>Every accepted slot remains pending manual review.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Every accepted slot remains pending manual review.</li>",
      safetyList,
      "manual lead review safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Lead Review Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Manual Lead Reviews</h2><strong id="manualLeadReviewTotal">0</strong></div>
        <div class="metric"><h2>Completed Reviews</h2><strong id="manualLeadReviewCompleted">0</strong></div>
        <div class="metric"><h2>Accepted For Stock Check</h2><strong id="manualLeadReviewAcceptedStock">0</strong></div>
        <div class="metric"><h2>Rejected Not Ready</h2><strong id="manualLeadReviewRejectedNotReady">0</strong></div>
        <div class="metric"><h2>Latest Review Status</h2><strong id="manualLeadReviewLatestStatus">NO_REVIEW</strong></div>
        <div class="metric"><h2>Latest Review Decision</h2><strong id="manualLeadReviewLatestDecision">NONE</strong></div>
        <div class="metric"><h2>Latest Review Slot</h2><strong id="manualLeadReviewLatestSlot">0</strong></div>
        <div class="metric"><h2>Latest Review Source</h2><strong id="manualLeadReviewLatestSource">NONE</strong></div>`;

if (!hub.includes('id="manualLeadReviewTotal"')) {
  if (hub.includes('<div class="metric"><h2>Latest Slot Source</h2><strong id="leadSlotLatestSource">NONE</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Latest Slot Source</h2><strong id="leadSlotLatestSource">NONE</strong></div>',
      metricCards,
      "manual lead review metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const reviewCard = `
      <div class="card"><h2>Controlled Buyer-Gate Manual Lead Review</h2><p>View controlled manual lead review decisions before buyer contact. Read-only; no buyer contact, no WhatsApp auto-send/read, no scraping, no quote preparation, no inventory update, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/controlled-buyer-gate-manual-lead-review">Open Manual Lead Review</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-manual-lead-review"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Lead-Slot Enforcement</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Lead-Slot Enforcement</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + reviewCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", reviewCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", reviewCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadManualLeadReviewHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-manual-lead-review/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("manualLeadReviewTotal", summary.totalReviews || 0);
        setText("manualLeadReviewCompleted", summary.completedReviewCount || 0);
        setText("manualLeadReviewAcceptedStock", summary.acceptedForManualStockCheckCount || 0);
        setText("manualLeadReviewRejectedNotReady", summary.rejectedAsNotReadyCount || 0);
        setText("manualLeadReviewLatestStatus", summary.latestReviewStatus || "NO_REVIEW");
        setText("manualLeadReviewLatestDecision", summary.latestReviewDecision || "NONE");
        setText("manualLeadReviewLatestSlot", summary.latestSlotNumber || 0);
        setText("manualLeadReviewLatestSource", summary.latestSource || "NONE");
      } catch (error) {
        const element = document.getElementById("manualLeadReviewLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadManualLeadReviewHubMetrics();
  </script>
`;

if (!hub.includes("loadManualLeadReviewHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 31C admin hub patch applied.");

const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 29C PATCH FAILED: ${message}`);
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

if (!controller.includes('controlled-buyer-gate-activation-execution.service')) {
  const importLine = 'const controlledBuyerGateActivationExecutionService = require("../services/controlled-buyer-gate-activation-execution.service");\n';

  if (controller.includes('const controlledBuyerGateManualActivationApprovalService = require("../services/controlled-buyer-gate-manual-activation-approval.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateManualActivationApprovalService = require("../services/controlled-buyer-gate-manual-activation-approval.service");',
      'const controlledBuyerGateManualActivationApprovalService = require("../services/controlled-buyer-gate-manual-activation-approval.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Activation Execution"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Activation Execution", path: "/controlled-buyer-gate-activation-execution", purpose: "Read-only controlled activation execution dashboard. Shows controlled 15-lead manual inbound gate only; no outbound traffic, no paid ads, no buyer auto-contact, no WhatsApp send/read, no scraping, no inventory/accounting/sale/pipeline mutation." }';
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
    simulationOnly: true,

    leadLimitOnly: true,
    leadLimit: 15,
    acceptedLeadCountStartsAtZero: true,
    acceptedLeadCount: 0,
    remainingLeadSlotsStartAtFifteen: true,
    remainingLeadSlots: 15,
    chosenFirstSource: "whatsapp_click_to_chat_inbound",
    testSource: "whatsapp_click_to_chat_inbound",

    noLiveBuyerGateOpened: false,
    liveBuyerGateOpened: false,
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
    autoContactBuyer: false,
    contactRealBuyerAutomatically: false,
    contactBuyerAutomatically: false,

    manualReviewRequired: true,
    manualReplyOnly: true,
    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    requiresLeadSlotEnforcementNext: true,
    leadSlotEnforcementRequiredNext: true,
    manualReviewRequiredBeforeAnyBuyerContact: true,
    inboundBuyerInitiatedContactRequired: true,

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

    quoteAllowedAtStockGate: false,
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
    autoCreateQuote: false,
    autoCreateQuoteAndSend: false,
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

if (!controller.includes("controlledBuyerGateActivationExecutionService.getActivationExecutionSummary")) {
  const metricLine = '  const controlledBuyerGateActivationExecution = safeRead(() => controlledBuyerGateActivationExecutionService.getActivationExecutionSummary(), {});';

  if (controller.includes('  const controlledBuyerGateManualActivationApproval = safeRead(() => controlledBuyerGateManualActivationApprovalService.getManualActivationApprovalSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateManualActivationApproval = safeRead(() => controlledBuyerGateManualActivationApprovalService.getManualActivationApprovalSummary(), {});',
      '\n' + metricLine,
      "manual activation approval metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateActivationExecution\n    }")) {
  const pattern = /(controlledBuyerGateManualActivationApproval)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateManualActivationApproval metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateActivationExecution$2");
}

const safetyBadges = `
      <span class="badge">CONTROLLED ACTIVATION EXECUTION DASHBOARD ONLY</span>
      <span class="badge">MANUAL INBOUND GATE ONLY</span>
      <span class="badge">15-LEAD LIMIT ACTIVE</span>
      <span class="badge">NO OUTBOUND TRAFFIC</span>
      <span class="badge">NO BUYER AUTO-CONTACT</span>
      <span class="badge">LEAD-SLOT ENFORCEMENT REQUIRED NEXT</span>`;

if (!hub.includes("CONTROLLED ACTIVATION EXECUTION DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">SEPARATE ACTIVATION EXECUTION GATE REQUIRED LATER</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">SEPARATE ACTIVATION EXECUTION GATE REQUIRED LATER</span>',
      safetyBadges,
      "controlled activation execution safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Controlled Activation Execution Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Controlled activation execution is manual inbound only.</li>
        <li>It accepts only buyer-initiated inbound leads up to the 15-lead limit.</li>
        <li>It does not start outbound traffic, paid ads, or lead form publishing.</li>
        <li>It does not contact buyers automatically.</li>
        <li>Lead-slot enforcement is required next before real lead intake counting.</li>`;

if (!hub.includes("<li>Controlled activation execution is manual inbound only.</li>")) {
  if (hub.includes("<li>A separate activation execution gate is required later.</li>")) {
    hub = insertAfter(
      hub,
      "<li>A separate activation execution gate is required later.</li>",
      safetyList,
      "controlled activation execution safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Controlled Activation Execution Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Activation Executions</h2><strong id="activationExecutionTotal">0</strong></div>
        <div class="metric"><h2>Latest Activation Status</h2><strong id="activationExecutionLatestStatus">NO_EXECUTION</strong></div>
        <div class="metric"><h2>Activation Lead Limit</h2><strong id="activationExecutionLeadLimit">0</strong></div>
        <div class="metric"><h2>Activation Source</h2><strong id="activationExecutionTestSource">NONE</strong></div>
        <div class="metric"><h2>Remaining Lead Slots</h2><strong id="activationExecutionRemainingSlots">0</strong></div>
        <div class="metric"><h2>Manual Inbound Gates</h2><strong id="activationExecutionManualInboundGates">0</strong></div>
        <div class="metric"><h2>Outbound Started</h2><strong id="activationExecutionOutboundStarted">0</strong></div>
        <div class="metric"><h2>Auto Contact Count</h2><strong id="activationExecutionAutoContact">0</strong></div>`;

if (!hub.includes('id="activationExecutionTotal"')) {
  if (hub.includes('<div class="metric"><h2>Activation Executed</h2><strong id="manualActivationExecutedCount">0</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Activation Executed</h2><strong id="manualActivationExecutedCount">0</strong></div>',
      metricCards,
      "activation execution metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const executionCard = `
      <div class="card"><h2>Controlled Buyer-Gate Activation Execution</h2><p>View controlled 15-lead manual inbound gate execution records. Read-only; no outbound traffic, no paid ads, no buyer auto-contact, no WhatsApp auto-send/read, no scraping, no inventory update, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/controlled-buyer-gate-activation-execution">Open Activation Execution</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-activation-execution"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Manual Activation Approval</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Manual Activation Approval</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + executionCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", executionCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", executionCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadActivationExecutionHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-activation-execution/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("activationExecutionTotal", summary.totalExecutions || 0);
        setText("activationExecutionLatestStatus", summary.latestActivationStatus || "NO_EXECUTION");
        setText("activationExecutionLeadLimit", summary.latestLeadLimit || 0);
        setText("activationExecutionTestSource", summary.latestTestSource || "NONE");
        setText("activationExecutionRemainingSlots", summary.latestRemainingLeadSlots || 0);
        setText("activationExecutionManualInboundGates", summary.activeManualInboundGateCount || 0);
        setText("activationExecutionOutboundStarted", summary.outboundTrafficStartedCount || 0);
        setText("activationExecutionAutoContact", summary.autoContactCount || 0);
      } catch (error) {
        const element = document.getElementById("activationExecutionLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadActivationExecutionHubMetrics();
  </script>
`;

if (!hub.includes("loadActivationExecutionHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 29C admin hub patch applied.");

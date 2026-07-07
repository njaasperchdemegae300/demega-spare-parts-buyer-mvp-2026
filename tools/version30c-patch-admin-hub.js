const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 30C PATCH FAILED: ${message}`);
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

if (!controller.includes('controlled-buyer-gate-lead-slot-enforcement.service')) {
  const importLine = 'const controlledBuyerGateLeadSlotEnforcementService = require("../services/controlled-buyer-gate-lead-slot-enforcement.service");\n';

  if (controller.includes('const controlledBuyerGateActivationExecutionService = require("../services/controlled-buyer-gate-activation-execution.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateActivationExecutionService = require("../services/controlled-buyer-gate-activation-execution.service");',
      'const controlledBuyerGateActivationExecutionService = require("../services/controlled-buyer-gate-activation-execution.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Lead-Slot Enforcement"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Lead-Slot Enforcement", path: "/controlled-buyer-gate-lead-slot-enforcement", purpose: "Read-only controlled lead-slot dashboard. Shows inbound buyer-initiated lead slots, 15-lead limit, remaining slots, and limit status. No buyer contact, no WhatsApp send/read, no scraping, no quote, no inventory/accounting/sale/pipeline mutation." }';
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

    leadLimitOnly: true,
    leadLimit: 15,
    acceptedLeadCountStartsAtZero: true,
    acceptedLeadCount: 0,
    remainingLeadSlotsStartAtFifteen: true,
    remainingLeadSlots: 15,
    limitReachedInitially: false,
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
    requiresLeadSlotEnforcement: true,
    leadSlotEnforcementActive: true,
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

    quotePrepared: false,
    quoteAllowedAtSlotGate: false,
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

if (!controller.includes("controlledBuyerGateLeadSlotEnforcementService.getLeadSlotSummary")) {
  const metricLine = '  const controlledBuyerGateLeadSlotEnforcement = safeRead(() => controlledBuyerGateLeadSlotEnforcementService.getLeadSlotSummary(), {});';

  if (controller.includes('  const controlledBuyerGateActivationExecution = safeRead(() => controlledBuyerGateActivationExecutionService.getActivationExecutionSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateActivationExecution = safeRead(() => controlledBuyerGateActivationExecutionService.getActivationExecutionSummary(), {});',
      '\n' + metricLine,
      "activation execution metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateLeadSlotEnforcement\n    }")) {
  const pattern = /(controlledBuyerGateActivationExecution)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateActivationExecution metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateLeadSlotEnforcement$2");
}

const safetyBadges = `
      <span class="badge">LEAD-SLOT ENFORCEMENT DASHBOARD ONLY</span>
      <span class="badge">BUYER-INITIATED INBOUND ONLY</span>
      <span class="badge">15-LEAD LIMIT ENFORCED</span>
      <span class="badge">16TH LEAD SLOT BLOCKED</span>
      <span class="badge">ACCEPTED FOR MANUAL REVIEW ONLY</span>
      <span class="badge">NO BUYER CONTACT FROM SLOT GATE</span>`;

if (!hub.includes("LEAD-SLOT ENFORCEMENT DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">LEAD-SLOT ENFORCEMENT REQUIRED NEXT</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">LEAD-SLOT ENFORCEMENT REQUIRED NEXT</span>',
      safetyBadges,
      "lead-slot enforcement safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Lead-Slot Enforcement Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Lead-slot enforcement accepts buyer-initiated inbound slots only.</li>
        <li>The 15-lead limit is enforced before real buyer counting.</li>
        <li>The 16th controlled lead slot must be blocked.</li>
        <li>Slot acceptance does not contact buyers.</li>
        <li>Every accepted slot remains pending manual review.</li>`;

if (!hub.includes("<li>Lead-slot enforcement accepts buyer-initiated inbound slots only.</li>")) {
  if (hub.includes("<li>Lead-slot enforcement is required next before real lead intake counting.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Lead-slot enforcement is required next before real lead intake counting.</li>",
      safetyList,
      "lead-slot enforcement safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Lead-Slot Enforcement Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Lead Slots</h2><strong id="leadSlotTotal">0</strong></div>
        <div class="metric"><h2>Accepted Slots</h2><strong id="leadSlotAccepted">0</strong></div>
        <div class="metric"><h2>Slot Lead Limit</h2><strong id="leadSlotLimit">15</strong></div>
        <div class="metric"><h2>Remaining Slots</h2><strong id="leadSlotRemaining">15</strong></div>
        <div class="metric"><h2>Slot Limit Reached</h2><strong id="leadSlotLimitReached">false</strong></div>
        <div class="metric"><h2>Latest Slot Status</h2><strong id="leadSlotLatestStatus">NO_SLOT</strong></div>
        <div class="metric"><h2>Latest Slot Number</h2><strong id="leadSlotLatestNumber">0</strong></div>
        <div class="metric"><h2>Latest Slot Source</h2><strong id="leadSlotLatestSource">NONE</strong></div>`;

if (!hub.includes('id="leadSlotTotal"')) {
  if (hub.includes('<div class="metric"><h2>Auto Contact Count</h2><strong id="activationExecutionAutoContact">0</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Auto Contact Count</h2><strong id="activationExecutionAutoContact">0</strong></div>',
      metricCards,
      "lead-slot enforcement metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const slotCard = `
      <div class="card"><h2>Controlled Buyer-Gate Lead-Slot Enforcement</h2><p>View controlled buyer-initiated inbound lead slots, accepted slots, remaining slots, and 15-lead limit status. Read-only; no buyer contact, no WhatsApp auto-send/read, no scraping, no quote, no inventory update, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/controlled-buyer-gate-lead-slot-enforcement">Open Lead-Slot Enforcement</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-lead-slot-enforcement"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Activation Execution</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Activation Execution</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + slotCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", slotCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", slotCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadLeadSlotEnforcementHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-lead-slot-enforcement/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("leadSlotTotal", summary.totalSlots || 0);
        setText("leadSlotAccepted", summary.acceptedSlotCount || 0);
        setText("leadSlotLimit", summary.leadLimit || 15);
        setText("leadSlotRemaining", summary.remainingLeadSlots ?? 15);
        setText("leadSlotLimitReached", summary.limitReached === true ? "true" : "false");
        setText("leadSlotLatestStatus", summary.latestSlotStatus || "NO_SLOT");
        setText("leadSlotLatestNumber", summary.latestSlotNumber || 0);
        setText("leadSlotLatestSource", summary.latestSource || "NONE");
      } catch (error) {
        const element = document.getElementById("leadSlotLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadLeadSlotEnforcementHubMetrics();
  </script>
`;

if (!hub.includes("loadLeadSlotEnforcementHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 30C admin hub patch applied.");

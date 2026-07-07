const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 28C PATCH FAILED: ${message}`);
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

if (!controller.includes('controlled-buyer-gate-manual-activation-approval.service')) {
  const importLine = 'const controlledBuyerGateManualActivationApprovalService = require("../services/controlled-buyer-gate-manual-activation-approval.service");\n';

  if (controller.includes('const controlledBuyerGateTestPlanService = require("../services/controlled-buyer-gate-test-plan.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateTestPlanService = require("../services/controlled-buyer-gate-test-plan.service");',
      'const controlledBuyerGateTestPlanService = require("../services/controlled-buyer-gate-test-plan.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Manual Activation Approval"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Manual Activation Approval", path: "/controlled-buyer-gate-manual-activation-approval", purpose: "Read-only manual activation approval dashboard. Approval is not activation; buyer gate remains closed, live traffic remains inactive, no buyer is contacted, no WhatsApp is sent/read, no scraping, no inventory/accounting/sale/pipeline mutation." }';
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
    approvedForControlledPreparationOnly: true,
    approvedForLiveActivationExecution: false,
    activationExecuted: false,
    simulationOnly: true,

    noLiveBuyerGateOpened: true,
    liveBuyerGateOpened: false,
    buyerGateOpened: false,
    openLiveBuyerGate: false,
    activateBuyerGate: false,
    enableLiveTraffic: false,
    startLiveBuyerTraffic: false,
    liveTrafficActivated: false,

    noRealBuyerContacted: true,
    realBuyerContacted: false,
    contactRealBuyerAutomatically: false,
    contactBuyerAutomatically: false,

    leadLimitOnly: true,
    leadLimit: 15,
    manualReviewRequired: true,
    manualReplyOnly: true,
    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    chosenFirstSource: "whatsapp_click_to_chat_inbound",

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
    systemDoesNotOpenLiveBuyerGate: true,
    systemDoesNotActivateLiveTraffic: true,
    systemDoesNotContactRealBuyer: true,

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
    harvestBuyerContacts: false,
    buyPrivateContactList: false,
    autoReplyToBuyer: false,
    automaticBuyerMessage: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
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
    separateActivationExecutionGateRequiredLater: true,
    manualReviewRequiredBeforeAnyBuyerContact: true,
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

if (!controller.includes("controlledBuyerGateManualActivationApprovalService.getManualActivationApprovalSummary")) {
  const metricLine = '  const controlledBuyerGateManualActivationApproval = safeRead(() => controlledBuyerGateManualActivationApprovalService.getManualActivationApprovalSummary(), {});';

  if (controller.includes('  const controlledBuyerGateTestPlan = safeRead(() => controlledBuyerGateTestPlanService.getControlledBuyerGateTestPlanSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateTestPlan = safeRead(() => controlledBuyerGateTestPlanService.getControlledBuyerGateTestPlanSummary(), {});',
      '\n' + metricLine,
      "controlled buyer gate test plan metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateManualActivationApproval\n    }")) {
  const pattern = /(controlledBuyerGateTestPlan)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateTestPlan metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateManualActivationApproval$2");
}

const safetyBadges = `
      <span class="badge">MANUAL ACTIVATION APPROVAL RECORD ONLY</span>
      <span class="badge">APPROVAL IS NOT ACTIVATION</span>
      <span class="badge">BUYER GATE STILL CLOSED</span>
      <span class="badge">LIVE TRAFFIC STILL NOT ACTIVATED</span>
      <span class="badge">SEPARATE ACTIVATION EXECUTION GATE REQUIRED LATER</span>`;

if (!hub.includes("MANUAL ACTIVATION APPROVAL RECORD ONLY")) {
  if (hub.includes('<span class="badge">WHATSAPP CLICK-TO-CHAT INBOUND ONLY FOR FIRST TEST</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">WHATSAPP CLICK-TO-CHAT INBOUND ONLY FOR FIRST TEST</span>',
      safetyBadges,
      "manual activation approval safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Activation Approval Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Manual activation approval is a record only.</li>
        <li>Approval does not open the buyer gate.</li>
        <li>Approval does not activate live traffic.</li>
        <li>No real buyer is contacted from this Admin Hub link.</li>
        <li>A separate activation execution gate is required later.</li>`;

if (!hub.includes("<li>Manual activation approval is a record only.</li>")) {
  if (hub.includes("<li>Live traffic is not activated from Admin Hub.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Live traffic is not activated from Admin Hub.</li>",
      safetyList,
      "manual activation approval safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Activation Approval Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Manual Approvals</h2><strong id="manualActivationApprovalTotal">0</strong></div>
        <div class="metric"><h2>Latest Approval</h2><strong id="manualActivationLatestStatus">NO_APPROVAL</strong></div>
        <div class="metric"><h2>Approval Lead Limit</h2><strong id="manualActivationLeadLimit">0</strong></div>
        <div class="metric"><h2>Approval Source</h2><strong id="manualActivationTestSource">NONE</strong></div>
        <div class="metric"><h2>Approved Not Activated</h2><strong id="manualActivationApprovedNotActivated">0</strong></div>
        <div class="metric"><h2>Activation Executed</h2><strong id="manualActivationExecutedCount">0</strong></div>`;

if (!hub.includes('id="manualActivationApprovalTotal"')) {
  if (hub.includes('<div class="metric"><h2>Safe Plans</h2><strong id="controlledBuyerGateSafePlans">0</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Safe Plans</h2><strong id="controlledBuyerGateSafePlans">0</strong></div>',
      metricCards,
      "manual activation approval metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const approvalCard = `
      <div class="card"><h2>Controlled Buyer-Gate Manual Activation Approval</h2><p>View manual approval records for controlled 15-lead test preparation. Approval is not activation; no live buyer gate opened, no live traffic activated, no real buyer contacted, no WhatsApp auto-send/read, no scraping, no inventory update, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/controlled-buyer-gate-manual-activation-approval">Open Manual Activation Approval</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-manual-activation-approval"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Test Plan</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Test Plan</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + approvalCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", approvalCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", approvalCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadManualActivationApprovalHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-manual-activation-approval/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("manualActivationApprovalTotal", summary.totalApprovals || 0);
        setText("manualActivationLatestStatus", summary.latestApprovalStatus || "NO_APPROVAL");
        setText("manualActivationLeadLimit", summary.latestLeadLimit || 0);
        setText("manualActivationTestSource", summary.latestTestSource || "NONE");
        setText("manualActivationApprovedNotActivated", summary.approvedNotActivatedCount || 0);
        setText("manualActivationExecutedCount", summary.activatedCount || 0);
      } catch (error) {
        const element = document.getElementById("manualActivationLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadManualActivationApprovalHubMetrics();
  </script>
`;

if (!hub.includes("loadManualActivationApprovalHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 28C admin hub patch applied.");

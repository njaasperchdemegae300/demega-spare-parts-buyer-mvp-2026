const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 27C PATCH FAILED: ${message}`);
}

function insertAfter(source, needle, insert, label) {
  if (!source.includes(needle)) {
    fail(`Missing expected ${label}: ${needle}`);
  }

  if (source.includes(insert.trim())) return source;
  return source.replace(needle, needle + insert);
}

function insertBefore(source, needle, insert, label) {
  if (!source.includes(needle)) {
    fail(`Missing expected ${label}: ${needle}`);
  }

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

if (!controller.includes('controlled-buyer-gate-test-plan.service')) {
  const importLine = 'const controlledBuyerGateTestPlanService = require("../services/controlled-buyer-gate-test-plan.service");\n';

  if (controller.includes('const internalBuyerGateReadinessGuardianService = require("../services/internal-buyer-gate-readiness-guardian.service");')) {
    controller = controller.replace(
      'const internalBuyerGateReadinessGuardianService = require("../services/internal-buyer-gate-readiness-guardian.service");',
      'const internalBuyerGateReadinessGuardianService = require("../services/internal-buyer-gate-readiness-guardian.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Test Plan"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) {
    fail("Could not find admin modules array.");
  }

  const insert = ',\n  { name: "Controlled Buyer-Gate Test Plan", path: "/controlled-buyer-gate-test-plan", purpose: "Read-only controlled 15-lead buyer-gate test plan display. Shows plan readiness only; does not open buyer gate, activate live traffic, contact buyers, send/read WhatsApp, scrape data, update inventory, create accounting entries, close sales, or move pipeline." }';
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

    leadLimitOnly: true,
    leadLimit: 15,
    manualReviewRequired: true,
    manualReplyOnly: true,
    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    chosenFirstSource: "whatsapp_click_to_chat_inbound",

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

if (!controller.includes("controlledBuyerGateTestPlanService.getControlledBuyerGateTestPlanSummary")) {
  const metricLine = '  const controlledBuyerGateTestPlan = safeRead(() => controlledBuyerGateTestPlanService.getControlledBuyerGateTestPlanSummary(), {});';

  if (controller.includes('  const internalBuyerGateReadiness = safeRead(() => internalBuyerGateReadinessGuardianService.getInternalBuyerGateReadinessSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const internalBuyerGateReadiness = safeRead(() => internalBuyerGateReadinessGuardianService.getInternalBuyerGateReadinessSummary(), {});',
      '\n' + metricLine,
      "internal buyer gate readiness metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateTestPlan\n    }")) {
  const pattern = /(internalBuyerGateReadiness)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find internalBuyerGateReadiness metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateTestPlan$2");
}

const safetyBadges = `
      <span class="badge">CONTROLLED BUYER-GATE TEST PLAN ONLY</span>
      <span class="badge">15-LEAD LIMIT ONLY</span>
      <span class="badge">BUYER GATE REMAINS CLOSED</span>
      <span class="badge">LIVE TRAFFIC NOT ACTIVATED</span>
      <span class="badge">WHATSAPP CLICK-TO-CHAT INBOUND ONLY FOR FIRST TEST</span>`;

if (!hub.includes("CONTROLLED BUYER-GATE TEST PLAN ONLY")) {
  if (hub.includes('<span class="badge">NO LIVE TRAFFIC ACTIVATION</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">NO LIVE TRAFFIC ACTIVATION</span>',
      safetyBadges,
      "controlled buyer gate plan safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Controlled Buyer-Gate Test Plan Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Controlled Buyer-Gate Test Plan is plan-only and read-only inside Admin Hub.</li>
        <li>It uses a 15-lead limit for the first controlled test.</li>
        <li>Chosen first source is WhatsApp click-to-chat inbound.</li>
        <li>Buyer gate remains closed until later manual activation approval.</li>
        <li>Live traffic is not activated from Admin Hub.</li>`;

if (!hub.includes("<li>Controlled Buyer-Gate Test Plan is plan-only and read-only inside Admin Hub.</li>")) {
  if (hub.includes("<li>It requires manual approval before any controlled buyer gate later.</li>")) {
    hub = insertAfter(
      hub,
      "<li>It requires manual approval before any controlled buyer gate later.</li>",
      safetyList,
      "controlled buyer gate plan safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Controlled Buyer-Gate Plan Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Controlled Plans</h2><strong id="controlledBuyerGatePlans">0</strong></div>
        <div class="metric"><h2>Latest Plan Status</h2><strong id="controlledBuyerGateLatestStatus">NO_PLAN</strong></div>
        <div class="metric"><h2>Latest Lead Limit</h2><strong id="controlledBuyerGateLeadLimit">0</strong></div>
        <div class="metric"><h2>Latest Test Source</h2><strong id="controlledBuyerGateTestSource">NONE</strong></div>
        <div class="metric"><h2>Activated Plans</h2><strong id="controlledBuyerGateActivatedPlans">0</strong></div>
        <div class="metric"><h2>Safe Plans</h2><strong id="controlledBuyerGateSafePlans">0</strong></div>`;

if (!hub.includes('id="controlledBuyerGatePlans"')) {
  if (hub.includes('<div class="metric"><h2>Gate Candidate</h2><strong id="buyerGateCandidate">false</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Gate Candidate</h2><strong id="buyerGateCandidate">false</strong></div>',
      metricCards,
      "controlled buyer gate test plan metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const planCard = `
      <div class="card"><h2>Controlled Buyer-Gate Test Plan</h2><p>View the first controlled 15-lead buyer-gate plan. Plan-only; no live buyer gate opened, no live traffic activated, no real buyer contacted, no WhatsApp auto-send/read, no scraping, no inventory update, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/controlled-buyer-gate-test-plan">Open Controlled Buyer-Gate Test Plan</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-test-plan"')) {
  if (hub.includes('<div class="card"><h2>Internal Buyer-Gate Readiness Guardian</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Internal Buyer-Gate Readiness Guardian</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + planCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", planCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", planCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadControlledBuyerGatePlanHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-test-plan/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("controlledBuyerGatePlans", summary.totalPlans || 0);
        setText("controlledBuyerGateLatestStatus", summary.latestPlanStatus || "NO_PLAN");
        setText("controlledBuyerGateLeadLimit", summary.latestLeadLimit || 0);
        setText("controlledBuyerGateTestSource", summary.latestTestSource || "NONE");
        setText("controlledBuyerGateActivatedPlans", summary.activatedPlans || 0);
        setText("controlledBuyerGateSafePlans", summary.safePlans || 0);
      } catch (error) {
        const element = document.getElementById("controlledBuyerGateLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadControlledBuyerGatePlanHubMetrics();
  </script>
`;

if (!hub.includes("loadControlledBuyerGatePlanHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");
console.log("Version 27C admin hub patch applied.");

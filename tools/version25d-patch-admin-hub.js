const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 25D PATCH FAILED: ${message}`);
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

if (!controller.includes('assistant-sales-agent-test-lab.service')) {
  const importLine = 'const assistantSalesAgentTestLabService = require("../services/assistant-sales-agent-test-lab.service");\n';

  if (controller.includes('const manualFinalBusinessReviewService = require("../services/manual-final-business-review.service");')) {
    controller = controller.replace(
      'const manualFinalBusinessReviewService = require("../services/manual-final-business-review.service");',
      'const manualFinalBusinessReviewService = require("../services/manual-final-business-review.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Assistant Sales Agent Test Lab"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) {
    fail("Could not find admin modules array.");
  }

  const insert = ',\n  { name: "Assistant Sales Agent Test Lab", path: "/assistant-sales-agent-test-lab", purpose: "Internal simulation-only sales-agent behavior testing before live buyer traffic. No live buyer contact, no WhatsApp auto-send, no WhatsApp auto-read, no scraping, no hidden harvesting, no quote before stock and compatibility gates." }';
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
    simulationOnly: true,
    noLiveBuyerGateOpened: true,
    noRealBuyerContacted: true,

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

    openLiveBuyerGate: false,
    contactRealBuyerAutomatically: false,
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

    manualReviewRequired: true,
    manualReviewRequiredForNextStep: true,
    manualReviewRequiredBeforeExecution: true,
    manualReviewRequiredBeforeLiveBuyerGate: true,
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

if (!controller.includes("assistantSalesAgentTestLabService.getAssistantSalesAgentTestLabSummary")) {
  const assistantMetricsLine = '  const assistantSalesAgentTestLab = safeRead(() => assistantSalesAgentTestLabService.getAssistantSalesAgentTestLabSummary(), {});';

  if (controller.includes('  const manualFinalBusinessReview = safeRead(() => manualFinalBusinessReviewService.getManualFinalBusinessReviewSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const manualFinalBusinessReview = safeRead(() => manualFinalBusinessReviewService.getManualFinalBusinessReviewSummary(), {});',
      '\n' + assistantMetricsLine,
      "manual final business review metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!controller.includes("assistantSalesAgentTestLab\n    }")) {
  const pattern = /(manualFinalBusinessReview)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find manualFinalBusinessReview metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      assistantSalesAgentTestLab$2");
}

const safetyBadges = `
      <span class="badge">ASSISTANT SALES AGENT TEST LAB IS SIMULATION ONLY</span>
      <span class="badge">NO LIVE BUYER GATE OPENED</span>
      <span class="badge">NO REAL BUYER CONTACTED</span>
      <span class="badge">NO WHATSAPP AUTO-READ</span>`;

if (!hub.includes("ASSISTANT SALES AGENT TEST LAB IS SIMULATION ONLY")) {
  if (hub.includes('<span class="badge">NO AUTOMATIC PIPELINE MOVEMENT</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">NO AUTOMATIC PIPELINE MOVEMENT</span>',
      safetyBadges,
      "manual final business safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Assistant Sales Agent Test Lab Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Assistant Sales Agent Test Lab is simulation-only before live buyer traffic.</li>
        <li>It does not open live buyer gate automatically.</li>
        <li>It does not contact real buyers automatically.</li>
        <li>It does not send or read WhatsApp automatically.</li>
        <li>It does not scrape private messages or harvest hidden data.</li>`;

if (!hub.includes("<li>Assistant Sales Agent Test Lab is simulation-only before live buyer traffic.</li>")) {
  if (hub.includes("<li>It does not move pipeline automatically.</li>")) {
    hub = insertAfter(
      hub,
      "<li>It does not move pipeline automatically.</li>",
      safetyList,
      "manual final business safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Assistant Sales Agent Test Lab Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Sales Agent Test Runs</h2><strong id="assistantSalesAgentTestRuns">0</strong></div>
        <div class="metric"><h2>Sales Agent Verdict</h2><strong id="assistantSalesAgentLatestVerdict">NOT_RUN</strong></div>
        <div class="metric"><h2>Sales Agent Passed</h2><strong id="assistantSalesAgentPassed">0</strong></div>
        <div class="metric"><h2>Sales Agent Failed</h2><strong id="assistantSalesAgentFailed">0</strong></div>
        <div class="metric"><h2>Sales Agent Scenarios</h2><strong id="assistantSalesAgentScenarios">0</strong></div>
        <div class="metric"><h2>Approved Agent Runs</h2><strong id="assistantSalesAgentApprovedRuns">0</strong></div>`;

if (!hub.includes('id="assistantSalesAgentTestRuns"')) {
  if (hub.includes('<div class="metric"><h2>Auto Final Pipeline</h2><strong id="autoFinalPipeline">0</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Auto Final Pipeline</h2><strong id="autoFinalPipeline">0</strong></div>',
      metricCards,
      "assistant sales agent metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const assistantCard = `
      <div class="card"><h2>Assistant Sales Agent Test Lab</h2><p>View internal sales-agent readiness tests before opening real buyer traffic. Simulation-only; no live buyer contact, no WhatsApp auto-send, no WhatsApp auto-read, no scraping, no hidden harvesting, no inventory update, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/assistant-sales-agent-test-lab">Open Assistant Sales Agent Test Lab</a></div>`;

if (!hub.includes('href="/assistant-sales-agent-test-lab"')) {
  if (hub.includes('<div class="card"><h2>Manual Final Business Review Gate</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Manual Final Business Review Gate</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + assistantCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", assistantCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", assistantCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadAssistantSalesAgentHubMetrics() {
      try {
        const response = await fetch("/api/assistant-sales-agent-test-lab/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("assistantSalesAgentTestRuns", summary.totalRuns || 0);
        setText("assistantSalesAgentLatestVerdict", summary.latestVerdict || "NOT_RUN");
        setText("assistantSalesAgentPassed", summary.latestPassedCount || 0);
        setText("assistantSalesAgentFailed", summary.latestFailedCount || 0);
        setText("assistantSalesAgentScenarios", summary.defaultTestCaseCount || 0);
        setText("assistantSalesAgentApprovedRuns", summary.approvedRuns || 0);
      } catch (error) {
        const element = document.getElementById("assistantSalesAgentLatestVerdict");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadAssistantSalesAgentHubMetrics();
  </script>
`;

if (!hub.includes("loadAssistantSalesAgentHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");
console.log("Version 25D admin hub patch applied.");

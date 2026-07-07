const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 26C PATCH FAILED: ${message}`);
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

if (!controller.includes('internal-buyer-gate-readiness-guardian.service')) {
  const importLine = 'const internalBuyerGateReadinessGuardianService = require("../services/internal-buyer-gate-readiness-guardian.service");\n';

  if (controller.includes('const assistantSalesAgentTestLabService = require("../services/assistant-sales-agent-test-lab.service");')) {
    controller = controller.replace(
      'const assistantSalesAgentTestLabService = require("../services/assistant-sales-agent-test-lab.service");',
      'const assistantSalesAgentTestLabService = require("../services/assistant-sales-agent-test-lab.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Internal Buyer-Gate Readiness Guardian"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) {
    fail("Could not find admin modules array.");
  }

  const insert = ',\n  { name: "Internal Buyer-Gate Readiness Guardian", path: "/internal-buyer-gate-readiness", purpose: "Read-only readiness guardian before live buyer traffic. Checks source-of-truth readiness and Assistant Sales Agent readiness. Does not open buyer gate, contact buyers, send/read WhatsApp, scrape data, update inventory, create accounting entries, close sales, or move pipeline." }';
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
    simulationOnly: true,
    noLiveBuyerGateOpened: true,
    liveBuyerGateOpened: false,
    noRealBuyerContacted: true,
    realBuyerContacted: false,

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
    activateBuyerGate: false,
    enableLiveTraffic: false,
    startLiveBuyerTraffic: false,
    contactRealBuyerAutomatically: false,
    contactBuyerAutomatically: false,
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

if (!controller.includes("internalBuyerGateReadinessGuardianService.getInternalBuyerGateReadinessSummary")) {
  const metricLine = '  const internalBuyerGateReadiness = safeRead(() => internalBuyerGateReadinessGuardianService.getInternalBuyerGateReadinessSummary(), {});';

  if (controller.includes('  const assistantSalesAgentTestLab = safeRead(() => assistantSalesAgentTestLabService.getAssistantSalesAgentTestLabSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const assistantSalesAgentTestLab = safeRead(() => assistantSalesAgentTestLabService.getAssistantSalesAgentTestLabSummary(), {});',
      '\n' + metricLine,
      "assistant sales agent metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!controller.includes("internalBuyerGateReadiness\n    }")) {
  const pattern = /(assistantSalesAgentTestLab)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find assistantSalesAgentTestLab metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      internalBuyerGateReadiness$2");
}

const safetyBadges = `
      <span class="badge">INTERNAL BUYER-GATE READINESS GUARDIAN IS READ-ONLY</span>
      <span class="badge">BUYER GATE REMAINS CLOSED</span>
      <span class="badge">MANUAL APPROVAL REQUIRED BEFORE BUYER GATE</span>
      <span class="badge">NO LIVE TRAFFIC ACTIVATION</span>`;

if (!hub.includes("INTERNAL BUYER-GATE READINESS GUARDIAN IS READ-ONLY")) {
  if (hub.includes('<span class="badge">NO REAL BUYER CONTACTED</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">NO REAL BUYER CONTACTED</span>',
      safetyBadges,
      "assistant sales agent safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Internal Buyer-Gate Readiness Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Internal Buyer-Gate Readiness Guardian is read-only and readiness-check-only.</li>
        <li>It does not open live buyer gate automatically.</li>
        <li>It does not activate live traffic automatically.</li>
        <li>It requires manual approval before any controlled buyer gate later.</li>`;

if (!hub.includes("<li>Internal Buyer-Gate Readiness Guardian is read-only and readiness-check-only.</li>")) {
  if (hub.includes("<li>It does not scrape private messages or harvest hidden data.</li>")) {
    hub = insertAfter(
      hub,
      "<li>It does not scrape private messages or harvest hidden data.</li>",
      safetyList,
      "assistant sales agent safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Internal Buyer-Gate Readiness Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Buyer-Gate Guardian Runs</h2><strong id="buyerGateGuardianRuns">0</strong></div>
        <div class="metric"><h2>Buyer-Gate Verdict</h2><strong id="buyerGateLatestVerdict">NOT_RUN</strong></div>
        <div class="metric"><h2>Buyer-Gate Checks</h2><strong id="buyerGateCheckCount">0</strong></div>
        <div class="metric"><h2>Buyer-Gate Failed Checks</h2><strong id="buyerGateFailedChecks">0</strong></div>
        <div class="metric"><h2>Source Truth Ready</h2><strong id="buyerGateSourceTruthReady">false</strong></div>
        <div class="metric"><h2>Gate Candidate</h2><strong id="buyerGateCandidate">false</strong></div>`;

if (!hub.includes('id="buyerGateGuardianRuns"')) {
  if (hub.includes('<div class="metric"><h2>Approved Agent Runs</h2><strong id="assistantSalesAgentApprovedRuns">0</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Approved Agent Runs</h2><strong id="assistantSalesAgentApprovedRuns">0</strong></div>',
      metricCards,
      "internal buyer gate readiness metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const guardianCard = `
      <div class="card"><h2>Internal Buyer-Gate Readiness Guardian</h2><p>View internal readiness checks before opening real buyer traffic. Readiness-check-only; no live buyer gate opened, no real buyer contacted, no WhatsApp send/read, no scraping, no inventory update, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/internal-buyer-gate-readiness">Open Buyer-Gate Readiness Guardian</a></div>`;

if (!hub.includes('href="/internal-buyer-gate-readiness"')) {
  if (hub.includes('<div class="card"><h2>Assistant Sales Agent Test Lab</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Assistant Sales Agent Test Lab</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + guardianCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", guardianCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", guardianCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadInternalBuyerGateReadinessHubMetrics() {
      try {
        const response = await fetch("/api/internal-buyer-gate-readiness/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("buyerGateGuardianRuns", summary.totalRuns || 0);
        setText("buyerGateLatestVerdict", summary.latestVerdict || "NOT_RUN");
        setText("buyerGateCheckCount", summary.latestCheckCount || 0);
        setText("buyerGateFailedChecks", summary.latestFailedCheckCount || 0);
        setText("buyerGateSourceTruthReady", summary.latestSourceOfTruthReady ? "true" : "false");
        setText("buyerGateCandidate", summary.liveGateCandidateOnlyAfterApproval ? "true" : "false");
      } catch (error) {
        const element = document.getElementById("buyerGateLatestVerdict");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadInternalBuyerGateReadinessHubMetrics();
  </script>
`;

if (!hub.includes("loadInternalBuyerGateReadinessHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");
console.log("Version 26C admin hub patch applied.");

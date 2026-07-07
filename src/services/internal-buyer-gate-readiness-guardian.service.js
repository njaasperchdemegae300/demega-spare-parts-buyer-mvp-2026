const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const projectSourceOfTruthService = require("./project-source-of-truth.service");
const assistantSalesAgentTestLabService = require("./assistant-sales-agent-test-lab.service");

const runsPath = path.join(process.cwd(), "src", "data", "internal-buyer-gate-readiness-runs.json");

function ensureFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]", "utf8");
}

function readJsonArray(filePath) {
  ensureFile(filePath);

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath, records) {
  ensureFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnsafeBuyerGateRequest(input) {
  return input.openLiveBuyerGate === true ||
    input.activateBuyerGate === true ||
    input.enableLiveTraffic === true ||
    input.startLiveBuyerTraffic === true ||
    input.contactRealBuyerAutomatically === true ||
    input.contactBuyerAutomatically === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.autoReplyToBuyer === true ||
    input.automaticBuyerMessage === true ||
    input.autoOpenBrowser === true ||
    input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.harvestBuyerContacts === true ||
    input.buyPrivateContactList === true ||
    input.autoCreateQuoteAndSend === true ||
    input.quoteBeforeStockConfirmation === true ||
    input.quoteBeforeCompatibilityConfirmation === true ||
    input.autoUpdateInventory === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true;
}

function safeGetSourceOfTruthSummary() {
  try {
    return projectSourceOfTruthService.getProjectSourceOfTruthSummary();
  } catch (error) {
    return {
      sourceOfTruthReady: false,
      error: error.message,
      safety: {}
    };
  }
}

function safeGetAssistantSalesAgentSummary() {
  try {
    return assistantSalesAgentTestLabService.getAssistantSalesAgentTestLabSummary();
  } catch (error) {
    return {
      latestVerdict: "ERROR",
      latestFailedCount: 999,
      totalRuns: 0,
      error: error.message,
      safety: {}
    };
  }
}

function buildCheck(id, title, passed, detail) {
  return {
    id,
    title,
    passed: passed === true,
    detail: cleanText(detail || "")
  };
}

function evaluateInternalBuyerGateReadiness() {
  const sourceOfTruth = safeGetSourceOfTruthSummary();
  const assistantSalesAgent = safeGetAssistantSalesAgentSummary();
  const sourceSafety = sourceOfTruth.safety || {};
  const assistantSafety = assistantSalesAgent.safety || {};

  const checks = [
    buildCheck(
      "source_of_truth_ready",
      "Project source-of-truth files are ready",
      sourceOfTruth.sourceOfTruthReady === true &&
        Array.isArray(sourceOfTruth.missingFiles) &&
        sourceOfTruth.missingFiles.length === 0 &&
        Array.isArray(sourceOfTruth.invalidFiles) &&
        sourceOfTruth.invalidFiles.length === 0,
      "Project handover files must be valid before opening buyer gate."
    ),
    buildCheck(
      "source_of_truth_read_only",
      "Source-of-truth system is read-only and safe",
      sourceSafety.sourceOfTruthOnly === true &&
        sourceSafety.handoverSystemOnly === true &&
        sourceSafety.readOnlySummary === true &&
        sourceSafety.noAutoSend === true &&
        sourceSafety.noPrivateDataScraping === true &&
        sourceSafety.noHiddenDataHarvesting === true &&
        sourceSafety.noInventoryUpdate === true &&
        sourceSafety.noAccountingEntryCreation === true &&
        sourceSafety.noSaleClosing === true &&
        sourceSafety.noPipelineMovement === true,
      "Source-of-truth must not mutate sales, inventory, accounting, pipeline, or buyer contact."
    ),
    buildCheck(
      "assistant_sales_agent_tested",
      "Assistant Sales Agent has at least one readiness test run",
      Number(assistantSalesAgent.totalRuns || 0) >= 1,
      "Assistant Sales Agent must be tested internally before buyer gate readiness."
    ),
    buildCheck(
      "assistant_sales_agent_approved",
      "Latest Assistant Sales Agent readiness verdict is APPROVED",
      assistantSalesAgent.latestVerdict === "APPROVED",
      "Latest Assistant Sales Agent run must be APPROVED."
    ),
    buildCheck(
      "assistant_sales_agent_zero_failures",
      "Latest Assistant Sales Agent readiness run has zero failures",
      Number(assistantSalesAgent.latestFailedCount || 0) === 0,
      "Assistant Sales Agent must pass all readiness scenarios."
    ),
    buildCheck(
      "assistant_sales_agent_safe",
      "Assistant Sales Agent safety locks are active",
      assistantSafety.assistantSalesAgentReadinessTestOnly === true &&
        assistantSafety.simulationOnly === true &&
        assistantSafety.noLiveBuyerGateOpened === true &&
        assistantSafety.noRealBuyerContacted === true &&
        assistantSafety.noAutoSendWhatsApp === true &&
        assistantSafety.noBuyerMessageReading === true &&
        assistantSafety.noWhatsappScraping === true &&
        assistantSafety.noPrivateDataScraping === true &&
        assistantSafety.noHiddenDataHarvesting === true &&
        assistantSafety.noQuoteBeforeStockConfirmation === true &&
        assistantSafety.noQuoteBeforeCompatibilityConfirmation === true &&
        assistantSafety.noInventoryUpdate === true &&
        assistantSafety.noAccountingEntryCreation === true &&
        assistantSafety.noSaleClosing === true &&
        assistantSafety.noPipelineMovement === true &&
        assistantSafety.manualReviewRequiredBeforeLiveBuyerGate === true,
      "Assistant Sales Agent must remain simulation-only and safe."
    ),
    buildCheck(
      "live_buyer_gate_still_closed",
      "Live buyer gate remains closed during readiness check",
      true,
      "Guardian only checks readiness; it does not open buyer gate."
    ),
    buildCheck(
      "manual_review_required",
      "Manual admin review is required before live buyer traffic",
      true,
      "No live buyer traffic should start without manual admin approval."
    )
  ];

  const failedChecks = checks.filter(item => item.passed !== true);
  const verdict = failedChecks.length === 0 ? "APPROVED" : "BLOCKED";

  return {
    verdict,
    checks,
    failedChecks,
    sourceOfTruth: {
      sourceOfTruthReady: sourceOfTruth.sourceOfTruthReady === true,
      totalSourceFiles: sourceOfTruth.totalSourceFiles || 0,
      validSourceFiles: sourceOfTruth.validSourceFiles || 0,
      missingFiles: sourceOfTruth.missingFiles || [],
      invalidFiles: sourceOfTruth.invalidFiles || [],
      currentPhase: sourceOfTruth.currentPhase || "",
      nextPhase: sourceOfTruth.nextPhase || ""
    },
    assistantSalesAgent: {
      totalRuns: assistantSalesAgent.totalRuns || 0,
      latestVerdict: assistantSalesAgent.latestVerdict || "NOT_RUN",
      latestTotalTests: assistantSalesAgent.latestTotalTests || 0,
      latestPassedCount: assistantSalesAgent.latestPassedCount || 0,
      latestFailedCount: assistantSalesAgent.latestFailedCount || 0,
      approvedRuns: assistantSalesAgent.approvedRuns || 0,
      blockedRuns: assistantSalesAgent.blockedRuns || 0,
      defaultTestCaseCount: assistantSalesAgent.defaultTestCaseCount || 0
    }
  };
}

function runInternalBuyerGateReadinessGuardian(input = {}) {
  if (isUnsafeBuyerGateRequest(input)) {
    return {
      ok: false,
      statusCode: 400,
      errors: [
        "Unsafe request blocked. Internal Buyer-Gate Readiness Guardian checks readiness only. It must not open live buyer gate, contact buyers, auto-send WhatsApp, read WhatsApp, scrape messages, harvest data, quote before stock/compatibility, update inventory, create accounting entries, close sales, or move pipeline."
      ]
    };
  }

  const now = new Date().toISOString();
  const evaluation = evaluateInternalBuyerGateReadiness();

  const run = {
    id: dataStore.createId("internal_buyer_gate_readiness_run"),
    verdict: evaluation.verdict,
    checks: evaluation.checks,
    failedChecks: evaluation.failedChecks,
    sourceOfTruth: evaluation.sourceOfTruth,
    assistantSalesAgent: evaluation.assistantSalesAgent,
    readinessGuardianOnly: true,
    internalReadinessCheckOnly: true,
    simulationOnly: true,
    noLiveBuyerGateOpened: true,
    liveBuyerGateOpened: false,
    openLiveBuyerGate: false,
    noRealBuyerContacted: true,
    realBuyerContacted: false,
    contactRealBuyerAutomatically: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    quoteBeforeStockConfirmation: false,
    quoteBeforeCompatibilityConfirmation: false,
    autoUpdateInventory: false,
    autoCreateAccountingEntry: false,
    autoCloseSale: false,
    autoMovePipelineStage: false,
    manualReviewRequiredBeforeLiveBuyerGate: true,
    manualApprovalRequiredToOpenBuyerGateLater: true,
    liveGateCandidateOnlyAfterApproval: evaluation.verdict === "APPROVED",
    runBy: cleanText(input.runBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const runs = readJsonArray(runsPath);
  runs.unshift(run);
  writeJsonArray(runsPath, runs);

  return {
    ok: true,
    statusCode: 201,
    run
  };
}

function listInternalBuyerGateReadinessRuns() {
  return readJsonArray(runsPath);
}

function getInternalBuyerGateReadinessSummary() {
  const runs = listInternalBuyerGateReadinessRuns();
  const latestRun = runs[0] || null;

  return {
    totalRuns: runs.length,
    latestVerdict: latestRun ? latestRun.verdict : "NOT_RUN",
    latestCheckCount: latestRun && Array.isArray(latestRun.checks) ? latestRun.checks.length : 0,
    latestFailedCheckCount: latestRun && Array.isArray(latestRun.failedChecks) ? latestRun.failedChecks.length : 0,
    approvedRuns: runs.filter(item => item.verdict === "APPROVED").length,
    blockedRuns: runs.filter(item => item.verdict !== "APPROVED").length,
    liveGateCandidateOnlyAfterApproval: latestRun ? latestRun.liveGateCandidateOnlyAfterApproval === true : false,
    latestSourceOfTruthReady: latestRun && latestRun.sourceOfTruth ? latestRun.sourceOfTruth.sourceOfTruthReady === true : false,
    latestAssistantSalesAgentVerdict: latestRun && latestRun.assistantSalesAgent ? latestRun.assistantSalesAgent.latestVerdict : "NOT_RUN",
    safety: {
      readinessGuardianOnly: true,
      internalReadinessCheckOnly: true,
      simulationOnly: true,
      noLiveBuyerGateOpened: true,
      liveBuyerGateOpened: false,
      noRealBuyerContacted: true,
      realBuyerContacted: false,
      noAutoSendWhatsApp: true,
      noWhatsappAutoRead: true,
      noBuyerMessageReading: true,
      noWhatsappScraping: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      noInventoryUpdate: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true,
      manualReviewRequiredBeforeLiveBuyerGate: true,
      manualApprovalRequiredToOpenBuyerGateLater: true
    }
  };
}

function getInternalBuyerGateReadinessPreview() {
  return {
    status: "ok",
    message: "Internal Buyer-Gate Readiness Guardian Foundation is active.",
    purpose: "Check whether the project is internally ready before opening any real buyer gate.",
    requiredBeforeLiveBuyerGate: [
      "Source-of-truth files must be ready.",
      "Assistant Sales Agent readiness test must be APPROVED.",
      "Assistant Sales Agent readiness test must have zero failures.",
      "No live buyer gate opens from this guardian.",
      "Manual admin approval is required before real buyer traffic."
    ],
    rules: [
      "Readiness check only.",
      "Simulation only.",
      "No live buyer gate opened.",
      "No real buyer contacted.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No message scraping.",
      "No private data scraping.",
      "No hidden data harvesting.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "No inventory update.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Manual review required before real buyer traffic."
    ]
  };
}

module.exports = {
  runInternalBuyerGateReadinessGuardian,
  listInternalBuyerGateReadinessRuns,
  getInternalBuyerGateReadinessSummary,
  getInternalBuyerGateReadinessPreview
};

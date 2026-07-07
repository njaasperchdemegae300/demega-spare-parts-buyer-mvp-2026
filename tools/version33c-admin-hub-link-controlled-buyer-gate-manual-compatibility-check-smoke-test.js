const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3116;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");
const approvalsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");
const executionsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-activation-executions.json");
const slotsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-lead-slots.json");
const reviewsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-lead-reviews.json");
const stockChecksPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-stock-checks.json");
const compatibilityChecksPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-compatibility-checks.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";
const originalApprovals = fs.existsSync(approvalsPath) ? fs.readFileSync(approvalsPath, "utf8") : "[]";
const originalExecutions = fs.existsSync(executionsPath) ? fs.readFileSync(executionsPath, "utf8") : "[]";
const originalSlots = fs.existsSync(slotsPath) ? fs.readFileSync(slotsPath, "utf8") : "[]";
const originalReviews = fs.existsSync(reviewsPath) ? fs.readFileSync(reviewsPath, "utf8") : "[]";
const originalStockChecks = fs.existsSync(stockChecksPath) ? fs.readFileSync(stockChecksPath, "utf8") : "[]";
const originalCompatibilityChecks = fs.existsSync(compatibilityChecksPath) ? fs.readFileSync(compatibilityChecksPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version33c-admin-hub-link-controlled-buyer-gate-manual-compatibility-check-smoke-test-report.md");

function safeWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function resetTestData() {
  safeWrite(assistantRunsPath, "[]");
  safeWrite(guardianRunsPath, "[]");
  safeWrite(plansPath, "[]");
  safeWrite(approvalsPath, "[]");
  safeWrite(executionsPath, "[]");
  safeWrite(slotsPath, "[]");
  safeWrite(reviewsPath, "[]");
  safeWrite(stockChecksPath, "[]");
  safeWrite(compatibilityChecksPath, "[]");
}

function restoreData() {
  safeWrite(assistantRunsPath, originalAssistant);
  safeWrite(guardianRunsPath, originalGuardian);
  safeWrite(plansPath, originalPlans);
  safeWrite(approvalsPath, originalApprovals);
  safeWrite(executionsPath, originalExecutions);
  safeWrite(slotsPath, originalSlots);
  safeWrite(reviewsPath, originalReviews);
  safeWrite(stockChecksPath, originalStockChecks);
  safeWrite(compatibilityChecksPath, originalCompatibilityChecks);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopProcess(child) {
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else child.kill("SIGTERM");
  } catch {}
}

async function request(route, options = {}) {
  const response = await fetch(`${BASE_URL}${route}`, options);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { status: response.status, text, body };
}

async function waitForHealth(child, logsRef) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (child.exitCode !== null) {
      logsRef.value += `\n[server-startup] server exited before health check. exitCode=${child.exitCode}`;
      return null;
    }

    try {
      const health = await request("/api/health");
      if (health.status === 200) return health;
    } catch (error) {
      logsRef.value += `\n[wait-for-health attempt ${attempt}] ${error.message}`;
    }

    await wait(1000);
  }

  return null;
}

function safeApprovalPayload() {
  return {
    approvedBy: "master_admin",
    approvalNote: "Approve controlled 15-lead manual test preparation only. Do not open gate.",
    approvalPhrase: "I_APPROVE_CONTROLLED_15_LEAD_MANUAL_TEST_PREPARATION_ONLY",
    adminReviewedPlan: true,
    adminReviewedSafety: true,
    adminConfirmedLeadLimit15: true,
    adminConfirmedWhatsAppInboundOnly: true,
    adminConfirmedManualReviewRequired: true,
    adminConfirmedManualReplyOnly: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoSpam: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true
  };
}

function safeExecutionPayload() {
  return {
    executedBy: "master_admin",
    executionNote: "Execute controlled 15-lead manual inbound gate only. Do not contact buyers or start outbound traffic.",
    executionPhrase: "I_EXECUTE_CONTROLLED_15_LEAD_MANUAL_INBOUND_GATE_ONLY",
    adminReviewedApproval: true,
    adminConfirmedSeparateExecutionGate: true,
    adminConfirmed15LeadLimit: true,
    adminConfirmedManualInboundOnly: true,
    adminConfirmedNoOutboundTraffic: true,
    adminConfirmedNoAutoContact: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true,
    adminConfirmedManualReviewBeforeBuyerContact: true
  };
}

function safeSlotPayload(index) {
  return {
    leadReference: `controlled-admin-hub-compatibility-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual compatibility Admin Hub test.",
    source: "whatsapp_click_to_chat_inbound",
    inboundBuyerInitiated: true,
    adminReviewedInboundSource: true,
    manualReviewRequired: true,
    manualReplyOnly: true,
    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    noPrivateDataScraping: true,
    noHiddenDataHarvesting: true,
    noQuoteBeforeStockConfirmation: true,
    noQuoteBeforeCompatibilityConfirmation: true,
    stockConfirmationRequiredBeforeQuote: true,
    compatibilityConfirmationRequiredBeforeQuote: true,
    leadSlotPhrase: "I_CONFIRM_INBOUND_LEAD_SLOT_ONLY_NO_AUTO_CONTACT",
    createdBy: "master_admin"
  };
}

function safeReviewPayload(slotNumber, decision) {
  return {
    slotNumber,
    reviewDecision: decision,
    reviewedBy: "master_admin",
    reviewNote: "Manual lead review before compatibility Admin Hub test. No buyer contact. No quote prepared.",
    reviewPhrase: "I_CONFIRM_MANUAL_LEAD_REVIEW_ONLY_NO_BUYER_CONTACT",
    adminReviewedLeadSlot: true,
    adminConfirmedBuyerInitiatedInbound: true,
    adminConfirmedSourceAllowed: true,
    adminConfirmedNoBuyerContactYet: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuotePrepared: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true,
    adminConfirmedManualStockCheckRequiredNext: true,
    adminConfirmedManualCompatibilityCheckRequiredLater: true
  };
}

function safeStockCheckPayload(slotNumber, stockDecision) {
  return {
    slotNumber,
    stockDecision,
    stockLocation: "Ladipo shop shelf",
    stockCondition: stockDecision === "STOCK_CONFIRMED_AVAILABLE" ? "available used original" : "pending supplier confirmation",
    stockNote: "Manual stock check Admin Hub test only. No buyer contact. No quote prepared. No inventory mutation.",
    checkedBy: "master_admin",
    stockCheckPhrase: "I_CONFIRM_MANUAL_STOCK_CHECK_ONLY_NO_QUOTE_NO_BUYER_CONTACT",
    adminReviewedManualLeadReview: true,
    adminPhysicallyCheckedStock: true,
    adminConfirmedStockStatusManually: true,
    adminConfirmedNoBuyerContactYet: true,
    adminConfirmedNoQuotePrepared: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedManualCompatibilityCheckRequiredNext: true,
    adminConfirmedQuoteBlockedUntilCompatibility: true
  };
}

function safeCompatibilityPayload(slotNumber, compatibilityDecision) {
  return {
    slotNumber,
    compatibilityDecision,
    compatibilityNote: "Manual compatibility Admin Hub test only. No buyer contact. No quote prepared. No price included.",
    matchedPartDetail: "Toyota Corolla 2005 tested compatible detail pending final quote eligibility.",
    vehicleRequirement: "Toyota Corolla 2005 exact fit check",
    checkedBy: "master_admin",
    compatibilityCheckPhrase: "I_CONFIRM_MANUAL_COMPATIBILITY_CHECK_ONLY_NO_QUOTE_NO_BUYER_CONTACT",
    adminReviewedManualStockCheck: true,
    adminCheckedCompatibilityManually: true,
    adminConfirmedCompatibilityStatusManually: true,
    adminConfirmedNoBuyerContactYet: true,
    adminConfirmedNoQuotePrepared: true,
    adminConfirmedNoPriceIncluded: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedFinalQuoteEligibilityRequiredNext: true,
    adminConfirmedQuoteBlockedUntilFinalEligibility: true
  };
}

async function main() {
  const logsRef = { value: "" };
  let child;

  resetTestData();

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logsRef.value += data.toString());
    child.stderr.on("data", data => logsRef.value += data.toString());

    const health = await waitForHealth(child, logsRef);

    if (!health) {
      const startupReport = `# Version 33C Admin Hub Link Controlled Buyer-Gate Manual Compatibility Check Smoke Test Report

## Verdict
NEEDS FIX

## Failure
The smoke test could not reach the local server health route after waiting.

## Server Logs
\`\`\`txt
${logsRef.value || "No logs captured"}
\`\`\`
`;
      fs.writeFileSync(reportPath, startupReport, "utf8");
      console.log(startupReport);
      process.exitCode = 1;
      return;
    }

    const assistantRun = await request("/api/assistant-sales-agent-test-lab/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runBy: "master_admin" })
    });

    const guardianRun = await request("/api/internal-buyer-gate-readiness/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runBy: "master_admin" })
    });

    const planCreate = await request("/api/controlled-buyer-gate-test-plan/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planName: "Controlled 15-Lead Buyer-Gate Test Plan",
        leadLimit: 15,
        testSource: "whatsapp_click_to_chat_inbound",
        manualReviewRequired: true,
        manualReplyOnly: true,
        noAutoSend: true,
        noSpam: true,
        noPrivateDataScraping: true,
        noQuoteBeforeStockConfirmation: true,
        noQuoteBeforeCompatibilityConfirmation: true,
        createdBy: "master_admin"
      })
    });

    const approvalCreate = await request("/api/controlled-buyer-gate-manual-activation-approval/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeApprovalPayload())
    });

    const executionCreate = await request("/api/controlled-buyer-gate-activation-execution/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeExecutionPayload())
    });

    const slot1 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(1))
    });

    const slot2 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(2))
    });

    const slot3 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(3))
    });

    const slot4 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(4))
    });

    const review1 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(1, "ACCEPT_FOR_MANUAL_STOCK_CHECK"))
    });

    const review4 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(4, "ACCEPT_FOR_MANUAL_STOCK_CHECK"))
    });

    const stockCheck1 = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(1, "STOCK_CONFIRMED_AVAILABLE"))
    });

    const stockCheck4 = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(4, "STOCK_CONFIRMED_AVAILABLE"))
    });

    const compatibilityCheck1 = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(1, "COMPATIBILITY_CONFIRMED"))
    });

    const compatibilityCheck4 = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(4, "COMPATIBILITY_NEEDS_MORE_INFO"))
    });

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const compatibilityPage = await request("/controlled-buyer-gate-manual-compatibility-check");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const compatibilitySummary = await request("/api/controlled-buyer-gate-manual-compatibility-check/summary");

    const healthOk = health.status === 200;

    const assistantOk =
      assistantRun.status === 201 &&
      assistantRun.body &&
      assistantRun.body.run &&
      assistantRun.body.run.verdict === "APPROVED";

    const guardianOk =
      guardianRun.status === 201 &&
      guardianRun.body &&
      guardianRun.body.run &&
      guardianRun.body.run.verdict === "APPROVED";

    const planOk =
      planCreate.status === 201 &&
      planCreate.body &&
      planCreate.body.plan &&
      planCreate.body.plan.leadLimit === 15 &&
      planCreate.body.plan.testSource === "whatsapp_click_to_chat_inbound";

    const approvalOk =
      approvalCreate.status === 201 &&
      approvalCreate.body &&
      approvalCreate.body.approval &&
      approvalCreate.body.approval.approvalStatus === "APPROVED_NOT_ACTIVATED";

    const executionOk =
      executionCreate.status === 201 &&
      executionCreate.body &&
      executionCreate.body.execution &&
      executionCreate.body.execution.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY";

    const slotsOk =
      slot1.status === 201 &&
      slot2.status === 201 &&
      slot3.status === 201 &&
      slot4.status === 201 &&
      slot1.body.slot.buyerContacted === false &&
      slot1.body.slot.quotePrepared === false;

    const reviewsOk =
      review1.status === 201 &&
      review4.status === 201 &&
      review1.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review4.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review1.body.review.buyerContacted === false &&
      review1.body.review.quotePrepared === false;

    const stockChecksOk =
      stockCheck1.status === 201 &&
      stockCheck4.status === 201 &&
      stockCheck1.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
      stockCheck4.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
      stockCheck1.body.check.buyerContacted === false &&
      stockCheck1.body.check.quotePrepared === false &&
      stockCheck1.body.check.inventoryUpdated === false;

    const compatibilityChecksOk =
      compatibilityCheck1.status === 201 &&
      compatibilityCheck4.status === 201 &&
      compatibilityCheck1.body.check.compatibilityDecision === "COMPATIBILITY_CONFIRMED" &&
      compatibilityCheck4.body.check.compatibilityDecision === "COMPATIBILITY_NEEDS_MORE_INFO" &&
      compatibilityCheck1.body.check.buyerContacted === false &&
      compatibilityCheck1.body.check.quotePrepared === false &&
      compatibilityCheck1.body.check.priceIncluded === false &&
      compatibilityCheck1.body.check.inventoryUpdated === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Manual Compatibility Check") &&
      hub.text.includes("/controlled-buyer-gate-manual-compatibility-check") &&
      hub.text.includes("Manual Compatibility Checks") &&
      hub.text.includes("Completed Compatibility Checks") &&
      hub.text.includes("Compatibility Confirmed") &&
      hub.text.includes("Compatibility Not Confirmed") &&
      hub.text.includes("Compatibility Needs More Info") &&
      hub.text.includes("Latest Compatibility Status") &&
      hub.text.includes("Latest Compatibility Decision") &&
      hub.text.includes("Latest Compatibility Source") &&
      hub.text.includes("MANUAL COMPATIBILITY CHECK DASHBOARD ONLY") &&
      hub.text.includes("COMPATIBILITY CHECK RECORD ONLY") &&
      hub.text.includes("NO BUYER CONTACT FROM COMPATIBILITY GATE") &&
      hub.text.includes("NO QUOTE PREPARED AT COMPATIBILITY GATE") &&
      hub.text.includes("NO PRICE INCLUDED") &&
      hub.text.includes("QUOTE BLOCKED UNTIL FINAL ELIGIBILITY");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Manual Compatibility Check") &&
      alias.text.includes("/controlled-buyer-gate-manual-compatibility-check");

    const compatibilityLinkedOk =
      compatibilityPage.status === 200 &&
      compatibilityPage.text.includes("Demega Controlled Buyer-Gate Manual Compatibility Check Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Manual Compatibility Check" &&
        module.path === "/controlled-buyer-gate-manual-compatibility-check"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateManualCompatibilityCheckOnly === true &&
      summary.body.safety.manualCompatibilityCheckGateOnly === true &&
      summary.body.safety.compatibilityCheckRecordOnly === true &&
      summary.body.safety.controlledCompatibilityCheckOnly === true &&
      summary.body.safety.manualCompatibilityStatusOnly === true &&
      summary.body.safety.compatibilityDecisionRecordOnly === true &&
      summary.body.safety.buyerContacted === false &&
      summary.body.safety.realBuyerContacted === false &&
      summary.body.safety.autoContactBuyer === false &&
      summary.body.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoReadWhatsApp === false &&
      summary.body.safety.scrapeWhatsappMessages === false &&
      summary.body.safety.privateMessageScraping === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.quotePrepared === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.priceIncluded === false &&
      summary.body.safety.quoteBeforeStockConfirmation === false &&
      summary.body.safety.quoteBeforeCompatibilityConfirmation === false &&
      summary.body.safety.quoteBlockedUntilFinalEligibility === true &&
      summary.body.safety.finalQuoteEligibilityRequiredNext === true &&
      summary.body.safety.inventoryUpdated === false &&
      summary.body.safety.stockReserved === false &&
      summary.body.safety.stockReduced === false &&
      summary.body.safety.autoUpdateInventory === false &&
      summary.body.safety.autoCreateAccountingEntry === false &&
      summary.body.safety.autoCloseSale === false &&
      summary.body.safety.autoMovePipelineStage === false;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.controlledBuyerGateManualCompatibilityCheck &&
      typeof metrics.body.metrics.controlledBuyerGateManualCompatibilityCheck.totalCompatibilityChecks === "number" &&
      metrics.body.metrics.controlledBuyerGateManualCompatibilityCheck.totalCompatibilityChecks === 2 &&
      metrics.body.metrics.controlledBuyerGateManualCompatibilityCheck.completedCompatibilityCheckCount === 2 &&
      metrics.body.metrics.controlledBuyerGateManualCompatibilityCheck.compatibilityConfirmedCount === 1 &&
      metrics.body.metrics.controlledBuyerGateManualCompatibilityCheck.compatibilityNeedsMoreInfoCount === 1 &&
      metrics.body.metrics.controlledBuyerGateManualCompatibilityCheck.latestCompatibilityCheckStatus === "MANUAL_COMPATIBILITY_CHECK_COMPLETED" &&
      metrics.body.metrics.controlledBuyerGateManualCompatibilityCheck.latestSource === "whatsapp_click_to_chat_inbound" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateManualCompatibilityCheckOnly === true &&
      metrics.body.safety.manualCompatibilityCheckGateOnly === true &&
      metrics.body.safety.compatibilityCheckRecordOnly === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.quotePrepared === false &&
      metrics.body.safety.autoCreateQuote === false &&
      metrics.body.safety.priceIncluded === false &&
      metrics.body.safety.inventoryUpdated === false &&
      metrics.body.safety.stockReserved === false &&
      metrics.body.safety.stockReduced === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const compatibilitySummaryOk =
      compatibilitySummary.status === 200 &&
      compatibilitySummary.body &&
      compatibilitySummary.body.summary &&
      compatibilitySummary.body.summary.totalCompatibilityChecks === 2 &&
      compatibilitySummary.body.summary.completedCompatibilityCheckCount === 2 &&
      compatibilitySummary.body.summary.compatibilityConfirmedCount === 1 &&
      compatibilitySummary.body.summary.compatibilityNeedsMoreInfoCount === 1 &&
      compatibilitySummary.body.summary.latestCompatibilityCheckStatus === "MANUAL_COMPATIBILITY_CHECK_COMPLETED" &&
      compatibilitySummary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      compatibilitySummary.body.summary.safety &&
      compatibilitySummary.body.summary.safety.manualCompatibilityCheckGateOnly === true &&
      compatibilitySummary.body.summary.safety.compatibilityCheckRecordOnly === true &&
      compatibilitySummary.body.summary.safety.controlledCompatibilityCheckOnly === true &&
      compatibilitySummary.body.summary.safety.manualCompatibilityStatusOnly === true &&
      compatibilitySummary.body.summary.safety.noRealBuyerContacted === true &&
      compatibilitySummary.body.summary.safety.noAutoSendWhatsApp === true &&
      compatibilitySummary.body.summary.safety.noWhatsappAutoRead === true &&
      compatibilitySummary.body.summary.safety.noBuyerMessageReading === true &&
      compatibilitySummary.body.summary.safety.noWhatsappScraping === true &&
      compatibilitySummary.body.summary.safety.noPrivateDataScraping === true &&
      compatibilitySummary.body.summary.safety.noHiddenDataHarvesting === true &&
      compatibilitySummary.body.summary.safety.noQuotePrepared === true &&
      compatibilitySummary.body.summary.safety.noPriceIncluded === true &&
      compatibilitySummary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      compatibilitySummary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      compatibilitySummary.body.summary.safety.quoteBlockedUntilFinalEligibility === true &&
      compatibilitySummary.body.summary.safety.finalQuoteEligibilityRequiredNext === true &&
      compatibilitySummary.body.summary.safety.noInventoryUpdate === true &&
      compatibilitySummary.body.summary.safety.noStockReservation === true &&
      compatibilitySummary.body.summary.safety.noStockReduction === true &&
      compatibilitySummary.body.summary.safety.noStockLedgerEntry === true &&
      compatibilitySummary.body.summary.safety.noAccountingEntryCreation === true &&
      compatibilitySummary.body.summary.safety.noSaleClosing === true &&
      compatibilitySummary.body.summary.safety.noPipelineMovement === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoContactBuyer = true") &&
      !hub.text.includes("contactRealBuyerAutomatically = true") &&
      !hub.text.includes("startOutboundTraffic = true") &&
      !hub.text.includes("startPaidAdsAutomatically = true") &&
      !hub.text.includes("publishLeadFormAutomatically = true") &&
      !hub.text.includes("broadcastWhatsApp = true") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("sendWhatsApp = true") &&
      !hub.text.includes("autoReadWhatsApp = true") &&
      !hub.text.includes("scrapeWhatsappMessages = true") &&
      !hub.text.includes("privateMessageScraping = true") &&
      !hub.text.includes("hiddenDataHarvesting = true") &&
      !hub.text.includes("quotePrepared = true") &&
      !hub.text.includes("autoCreateQuote = true") &&
      !hub.text.includes("priceIncluded = true") &&
      !hub.text.includes("autoUpdateInventory = true") &&
      !hub.text.includes("reserveStockAutomatically = true") &&
      !hub.text.includes("reduceStockAutomatically = true") &&
      !hub.text.includes("autoCreateAccountingEntry = true") &&
      !hub.text.includes("autoCloseSale = true") &&
      !hub.text.includes("autoMovePipelineStage = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      slotsOk &&
      reviewsOk &&
      stockChecksOk &&
      compatibilityChecksOk &&
      hubOk &&
      aliasOk &&
      compatibilityLinkedOk &&
      summaryOk &&
      metricsOk &&
      compatibilitySummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 33C Admin Hub Link Controlled Buyer-Gate Manual Compatibility Check Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before Admin Hub metrics
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before Admin Hub metrics
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists before Admin Hub metrics
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists before Admin Hub metrics
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists before Admin Hub metrics
- ${slotsOk ? "PASS" : "FAIL"}: controlled inbound lead slots exist before Admin Hub metrics
- ${reviewsOk ? "PASS" : "FAIL"}: accepted manual lead reviews exist before Admin Hub metrics
- ${stockChecksOk ? "PASS" : "FAIL"}: confirmed manual stock checks exist before Admin Hub metrics
- ${compatibilityChecksOk ? "PASS" : "FAIL"}: manual compatibility checks exist before Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Compatibility Check link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Compatibility Check
- ${compatibilityLinkedOk ? "PASS" : "FAIL"}: linked Manual Compatibility Check dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Compatibility Check module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Manual Compatibility Check metrics safely
- ${compatibilitySummaryOk ? "PASS" : "FAIL"}: Manual Compatibility Check summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Manual Compatibility Check link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Manual Compatibility Check Admin Hub link is read-only.
- Manual compatibility check gate only.
- Manual compatibility check record only.
- Controlled compatibility check only.
- Compatibility status is confirmed manually.
- Manual compatibility check does not contact buyer.
- Manual compatibility check does not prepare quote.
- Manual compatibility check does not include price.
- Quote remains blocked until final quote eligibility.
- No WhatsApp auto-send.
- No WhatsApp auto-read.
- No buyer message scraping.
- No private-data scraping.
- No hidden data harvesting.
- No inventory update.
- No stock reservation.
- No stock reduction.
- No stock ledger entry.
- No accounting entry creation.
- No sale closing.
- No pipeline movement.
- Metrics API remains read-only.
- Final quote eligibility remains required next.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, and compatibility-check test data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Manual Compatibility Check metrics.
- Admin Hub now links directly to Manual Compatibility Check dashboard.
- Controlled inbound leads now require visible compatibility confirmation before quote eligibility.
- Next required build is final quote eligibility gate before quote preparation.

## Server Logs
\`\`\`txt
${logsRef.value || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 34A — Controlled Buyer-Gate Final Quote Eligibility Gate Foundation
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);

    if (verdict !== "APPROVED") process.exitCode = 1;
  } finally {
    if (child) stopProcess(child);
    restoreData();
  }
}

main().catch(error => {
  restoreData();
  console.error(error);
  process.exit(1);
});

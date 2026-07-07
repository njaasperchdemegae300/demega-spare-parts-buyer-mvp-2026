const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3114;
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

const reportPath = path.join(ROOT, "reports", "version33a-controlled-buyer-gate-manual-compatibility-check-smoke-test-report.md");

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
    leadReference: `controlled-compatibility-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual compatibility check test.",
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
    reviewNote: "Manual lead review before compatibility check. No buyer contact. No quote prepared.",
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
    stockNote: "Manual stock check before compatibility. No buyer contact. No quote prepared. No inventory mutation.",
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

function safeCompatibilityPayload(slotNumber, compatibilityDecision, extra = {}) {
  return {
    slotNumber,
    compatibilityDecision,
    compatibilityNote: "Manual compatibility check only. No buyer contact. No quote prepared. No price included.",
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
    adminConfirmedQuoteBlockedUntilFinalEligibility: true,
    ...extra
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
      const startupReport = `# Version 33A Controlled Buyer-Gate Manual Compatibility Check Gate Smoke Test Report

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

    const review2 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(2, "REJECT_AS_NOT_READY"))
    });

    const review3 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(3, "ACCEPT_FOR_MANUAL_STOCK_CHECK"))
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

    const stockCheck3 = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(3, "STOCK_NEEDS_SUPPLIER_CONFIRMATION"))
    });

    const stockCheck4 = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(4, "STOCK_CONFIRMED_AVAILABLE"))
    });

    const preview = await request("/api/controlled-buyer-gate-manual-compatibility-check/preview");

    const unsafeCompatibilityCheck = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(1, "COMPATIBILITY_CONFIRMED", {
        buyerContacted: true,
        autoContactBuyer: true,
        startOutboundTraffic: true,
        autoSendWhatsApp: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        hiddenDataHarvesting: true,
        quotePrepared: true,
        autoCreateQuote: true,
        priceIncluded: true,
        quoteBeforeStockConfirmation: true,
        quoteBeforeCompatibilityConfirmation: true,
        autoUpdateInventory: true,
        reserveStockAutomatically: true,
        reduceStockAutomatically: true,
        autoCreateAccountingEntry: true,
        autoCloseSale: true,
        autoMovePipelineStage: true
      }))
    });

    const safeConfirmedCheck = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(1, "COMPATIBILITY_CONFIRMED"))
    });

    const safeNeedsMoreInfoCheck = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(4, "COMPATIBILITY_NEEDS_MORE_INFO"))
    });

    const supplierStockCompatibilityCheck = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(3, "COMPATIBILITY_CONFIRMED"))
    });

    const rejectedReviewCompatibilityCheck = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(2, "COMPATIBILITY_CONFIRMED"))
    });

    const duplicateCompatibilityCheck = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(1, "COMPATIBILITY_CONFIRMED"))
    });

    const list = await request("/api/controlled-buyer-gate-manual-compatibility-checks");
    const summary = await request("/api/controlled-buyer-gate-manual-compatibility-check/summary");

    const confirmedCheck = safeConfirmedCheck.body && safeConfirmedCheck.body.check;
    const needsMoreInfoCheck = safeNeedsMoreInfoCheck.body && safeNeedsMoreInfoCheck.body.check;

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
      review2.status === 201 &&
      review3.status === 201 &&
      review4.status === 201 &&
      review1.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review2.body.review.reviewDecision === "REJECT_AS_NOT_READY" &&
      review3.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review4.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review1.body.review.buyerContacted === false &&
      review1.body.review.quotePrepared === false;

    const stockChecksOk =
      stockCheck1.status === 201 &&
      stockCheck3.status === 201 &&
      stockCheck4.status === 201 &&
      stockCheck1.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
      stockCheck3.body.check.stockDecision === "STOCK_NEEDS_SUPPLIER_CONFIRMATION" &&
      stockCheck4.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
      stockCheck1.body.check.buyerContacted === false &&
      stockCheck1.body.check.quotePrepared === false &&
      stockCheck1.body.check.inventoryUpdated === false;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Manual Compatibility Check Gate Foundation is active." &&
      preview.body.requiredCompatibilityPhrase === "I_CONFIRM_MANUAL_COMPATIBILITY_CHECK_ONLY_NO_QUOTE_NO_BUYER_CONTACT" &&
      Array.isArray(preview.body.allowedDecisions) &&
      preview.body.allowedDecisions.includes("COMPATIBILITY_CONFIRMED") &&
      preview.body.allowedDecisions.includes("COMPATIBILITY_NOT_CONFIRMED") &&
      preview.body.allowedDecisions.includes("COMPATIBILITY_NEEDS_MORE_INFO") &&
      preview.body.rules.includes("No buyer contact from this gate.") &&
      preview.body.rules.includes("No price is included at this gate.") &&
      preview.body.rules.includes("Final quote eligibility is required next.");

    const unsafeOk =
      unsafeCompatibilityCheck.status === 400 &&
      unsafeCompatibilityCheck.body &&
      Array.isArray(unsafeCompatibilityCheck.body.errors) &&
      unsafeCompatibilityCheck.body.errors.some(error => error.includes("Unsafe manual compatibility check request blocked"));

    const confirmedOk =
      safeConfirmedCheck.status === 201 &&
      confirmedCheck &&
      confirmedCheck.compatibilityCheckStatus === "MANUAL_COMPATIBILITY_CHECK_COMPLETED" &&
      confirmedCheck.compatibilityDecision === "COMPATIBILITY_CONFIRMED" &&
      confirmedCheck.manualCompatibilityCheckGateOnly === true &&
      confirmedCheck.compatibilityCheckRecordOnly === true &&
      confirmedCheck.controlledCompatibilityCheckOnly === true &&
      confirmedCheck.manualCompatibilityStatusOnly === true &&
      confirmedCheck.compatibilityConfirmedOnly === true &&
      confirmedCheck.slotNumber === 1 &&
      confirmedCheck.leadLimit === 15 &&
      confirmedCheck.source === "whatsapp_click_to_chat_inbound" &&
      confirmedCheck.manualCompatibilityCheckCompleted === true &&
      confirmedCheck.buyerContacted === false &&
      confirmedCheck.realBuyerContacted === false &&
      confirmedCheck.autoContactBuyer === false &&
      confirmedCheck.autoSendWhatsApp === false &&
      confirmedCheck.autoReadWhatsApp === false &&
      confirmedCheck.scrapeWhatsappMessages === false &&
      confirmedCheck.privateMessageScraping === false &&
      confirmedCheck.hiddenDataHarvesting === false &&
      confirmedCheck.startOutboundTraffic === false &&
      confirmedCheck.startPaidAdsAutomatically === false &&
      confirmedCheck.publishLeadFormAutomatically === false &&
      confirmedCheck.quotePrepared === false &&
      confirmedCheck.autoCreateQuote === false &&
      confirmedCheck.quoteBeforeStockConfirmation === false &&
      confirmedCheck.quoteBeforeCompatibilityConfirmation === false &&
      confirmedCheck.quoteBlockedUntilFinalEligibility === true &&
      confirmedCheck.finalQuoteEligibilityRequiredNext === true &&
      confirmedCheck.priceIncluded === false &&
      confirmedCheck.quoteAmountIncluded === false &&
      confirmedCheck.inventoryUpdated === false &&
      confirmedCheck.stockReserved === false &&
      confirmedCheck.stockReduced === false &&
      confirmedCheck.autoUpdateInventory === false &&
      confirmedCheck.reserveStockAutomatically === false &&
      confirmedCheck.reduceStockAutomatically === false &&
      confirmedCheck.autoCreateAccountingEntry === false &&
      confirmedCheck.autoCloseSale === false &&
      confirmedCheck.autoMovePipelineStage === false;

    const needsMoreInfoOk =
      safeNeedsMoreInfoCheck.status === 201 &&
      needsMoreInfoCheck &&
      needsMoreInfoCheck.compatibilityCheckStatus === "MANUAL_COMPATIBILITY_CHECK_COMPLETED" &&
      needsMoreInfoCheck.compatibilityDecision === "COMPATIBILITY_NEEDS_MORE_INFO" &&
      needsMoreInfoCheck.compatibilityNeedsMoreInfoOnly === true &&
      needsMoreInfoCheck.slotNumber === 4 &&
      needsMoreInfoCheck.buyerContacted === false &&
      needsMoreInfoCheck.quotePrepared === false &&
      needsMoreInfoCheck.priceIncluded === false &&
      needsMoreInfoCheck.inventoryUpdated === false;

    const supplierStockBlockedOk =
      supplierStockCompatibilityCheck.status === 400 &&
      supplierStockCompatibilityCheck.body &&
      Array.isArray(supplierStockCompatibilityCheck.body.errors) &&
      supplierStockCompatibilityCheck.body.errors.some(error => error.includes("Matching STOCK_CONFIRMED_AVAILABLE stock check was not found"));

    const rejectedReviewBlockedOk =
      rejectedReviewCompatibilityCheck.status === 400 &&
      rejectedReviewCompatibilityCheck.body &&
      Array.isArray(rejectedReviewCompatibilityCheck.body.errors) &&
      rejectedReviewCompatibilityCheck.body.errors.some(error => error.includes("Matching STOCK_CONFIRMED_AVAILABLE stock check was not found"));

    const duplicateOk =
      duplicateCompatibilityCheck.status === 400 &&
      duplicateCompatibilityCheck.body &&
      Array.isArray(duplicateCompatibilityCheck.body.errors) &&
      duplicateCompatibilityCheck.body.errors.some(error => error.includes("already has a completed manual compatibility check"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.compatibilityChecks) &&
      list.body.compatibilityChecks.length === 2 &&
      list.body.compatibilityChecks.every(item =>
        item.compatibilityCheckStatus === "MANUAL_COMPATIBILITY_CHECK_COMPLETED" &&
        item.buyerContacted === false &&
        item.autoSendWhatsApp === false &&
        item.autoReadWhatsApp === false &&
        item.quotePrepared === false &&
        item.priceIncluded === false &&
        item.inventoryUpdated === false &&
        item.stockReserved === false &&
        item.stockReduced === false &&
        item.autoCreateAccountingEntry === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalCompatibilityChecks === 2 &&
      summary.body.summary.completedCompatibilityCheckCount === 2 &&
      summary.body.summary.compatibilityConfirmedCount === 1 &&
      summary.body.summary.compatibilityNeedsMoreInfoCount === 1 &&
      summary.body.summary.latestCompatibilityCheckStatus === "MANUAL_COMPATIBILITY_CHECK_COMPLETED" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.manualCompatibilityCheckGateOnly === true &&
      summary.body.summary.safety.compatibilityCheckRecordOnly === true &&
      summary.body.summary.safety.controlledCompatibilityCheckOnly === true &&
      summary.body.summary.safety.manualCompatibilityStatusOnly === true &&
      summary.body.summary.safety.noOutboundTrafficStarted === true &&
      summary.body.summary.safety.noPaidAdsStartedAutomatically === true &&
      summary.body.summary.safety.noLeadFormPublishedAutomatically === true &&
      summary.body.summary.safety.noRealBuyerContacted === true &&
      summary.body.summary.safety.noAutoContactBuyer === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noWhatsappAutoRead === true &&
      summary.body.summary.safety.noBuyerMessageReading === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noQuotePrepared === true &&
      summary.body.summary.safety.noPriceIncluded === true &&
      summary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      summary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      summary.body.summary.safety.quoteBlockedUntilFinalEligibility === true &&
      summary.body.summary.safety.finalQuoteEligibilityRequiredNext === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noStockReservation === true &&
      summary.body.summary.safety.noStockReduction === true &&
      summary.body.summary.safety.noStockLedgerEntry === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true;

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
      previewOk &&
      unsafeOk &&
      confirmedOk &&
      needsMoreInfoOk &&
      supplierStockBlockedOk &&
      rejectedReviewBlockedOk &&
      duplicateOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 33A Controlled Buyer-Gate Manual Compatibility Check Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved first
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved first
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists first
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists first
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists first
- ${slotsOk ? "PASS" : "FAIL"}: controlled inbound lead slots exist first
- ${reviewsOk ? "PASS" : "FAIL"}: accepted manual lead reviews exist first
- ${stockChecksOk ? "PASS" : "FAIL"}: confirmed manual stock checks exist first
- ${previewOk ? "PASS" : "FAIL"}: manual compatibility check preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe contact/send/read/scrape/quote/price/inventory compatibility request is blocked
- ${confirmedOk ? "PASS" : "FAIL"}: safe COMPATIBILITY_CONFIRMED check is recorded without buyer contact or quote
- ${needsMoreInfoOk ? "PASS" : "FAIL"}: safe COMPATIBILITY_NEEDS_MORE_INFO check is recorded without buyer contact or quote
- ${supplierStockBlockedOk ? "PASS" : "FAIL"}: compatibility check is blocked when stock is only supplier-confirmation
- ${rejectedReviewBlockedOk ? "PASS" : "FAIL"}: compatibility check is blocked when lead review was rejected
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate compatibility check for same slot is blocked
- ${listOk ? "PASS" : "FAIL"}: manual compatibility check list API returns safe records
- ${summaryOk ? "PASS" : "FAIL"}: manual compatibility check summary API confirms safe compatibility-check metrics

## Safety Rules Confirmed
- Manual compatibility check gate only.
- Manual compatibility check record only.
- Controlled compatibility check only.
- Compatibility status is confirmed manually.
- Manual compatibility check does not contact buyer.
- Manual compatibility check does not prepare quote.
- Manual compatibility check does not include price.
- Quote remains blocked until final quote eligibility.
- Supplier-confirmation stock check cannot enter compatibility confirmation.
- Rejected manual lead review cannot enter compatibility confirmation.
- Duplicate compatibility check for same slot is blocked.
- No outbound traffic is started automatically.
- No paid ads are started automatically.
- No lead form is published automatically.
- No real buyer is contacted automatically.
- No WhatsApp auto-send.
- No WhatsApp auto-read.
- No buyer message scraping.
- No private-data scraping.
- No hidden data harvesting.
- No quote before stock confirmation.
- No quote before compatibility confirmation.
- No inventory update.
- No stock reservation.
- No stock reduction.
- No stock ledger entry.
- No accounting entry creation.
- No sale closing.
- No pipeline movement.
- Final quote eligibility is required next.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, and compatibility-check test data restored after smoke test.

## Next Phase After Approval
Version 33B — Controlled Buyer-Gate Manual Compatibility Check Dashboard Display

## Server Logs
\`\`\`txt
${logsRef.value || "No logs captured"}
\`\`\`
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

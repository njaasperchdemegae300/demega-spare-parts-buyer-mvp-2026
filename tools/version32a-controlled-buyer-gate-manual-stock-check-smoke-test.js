const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3111;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");
const approvalsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");
const executionsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-activation-executions.json");
const slotsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-lead-slots.json");
const reviewsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-lead-reviews.json");
const stockChecksPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-stock-checks.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";
const originalApprovals = fs.existsSync(approvalsPath) ? fs.readFileSync(approvalsPath, "utf8") : "[]";
const originalExecutions = fs.existsSync(executionsPath) ? fs.readFileSync(executionsPath, "utf8") : "[]";
const originalSlots = fs.existsSync(slotsPath) ? fs.readFileSync(slotsPath, "utf8") : "[]";
const originalReviews = fs.existsSync(reviewsPath) ? fs.readFileSync(reviewsPath, "utf8") : "[]";
const originalStockChecks = fs.existsSync(stockChecksPath) ? fs.readFileSync(stockChecksPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version32a-controlled-buyer-gate-manual-stock-check-smoke-test-report.md");

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
    leadReference: `controlled-stock-check-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual stock check gate test.",
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
    reviewNote: "Manual lead review before stock check. No buyer contact. No quote prepared.",
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

function safeStockCheckPayload(slotNumber, stockDecision, extra = {}) {
  return {
    slotNumber,
    stockDecision,
    stockLocation: "Ladipo shop shelf",
    stockCondition: stockDecision === "STOCK_CONFIRMED_AVAILABLE" ? "available used original" : "",
    stockNote: "Manual stock check only. No buyer contact. No quote prepared. No inventory mutation.",
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
    adminConfirmedQuoteBlockedUntilCompatibility: true,
    ...extra
  };
}

async function main() {
  let logs = "";
  let child;

  resetTestData();

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logs += data.toString());
    child.stderr.on("data", data => logs += data.toString());

    let health = null;
    let serverReady = false;

    for (let attempt = 1; attempt <= 30; attempt += 1) {
      if (child.exitCode !== null) {
        logs += "\n[server-startup] server process exited before health check. exitCode=" + child.exitCode;
        break;
      }

      try {
        health = await request("/api/health");
        if (health.status === 200) {
          serverReady = true;
          break;
        }
      } catch (error) {
        logs += "\n[wait-for-health attempt " + attempt + "] " + error.message;
      }

      await wait(1000);
    }

    if (!serverReady) {
      const startupReport = `# Version 32A-FIX1 Manual Stock Check Server Startup Diagnostic Report

## Verdict
NEEDS FIX

## Failure
The smoke test could not reach the local test server after waiting up to 30 seconds.

## Meaning
This means the server either did not start, exited before health check, or the configured test port was unavailable.

## Safety
- No buyer was contacted.
- No WhatsApp was sent.
- No WhatsApp was read.
- No scraping was performed.
- No quote was prepared.
- No inventory was changed.
- No accounting entry was created.
- No sale was closed.
- No pipeline was moved.

## Captured Server Logs
\`\`\`txt
${logs || "No logs captured"}
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

    const preview = await request("/api/controlled-buyer-gate-manual-stock-check/preview");

    const unsafeStockCheck = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(1, "STOCK_CONFIRMED_AVAILABLE", {
        buyerContacted: true,
        autoContactBuyer: true,
        startOutboundTraffic: true,
        autoSendWhatsApp: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        hiddenDataHarvesting: true,
        quotePrepared: true,
        autoCreateQuote: true,
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

    const safeAvailableCheck = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(1, "STOCK_CONFIRMED_AVAILABLE"))
    });

    const safeSupplierCheck = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(3, "STOCK_NEEDS_SUPPLIER_CONFIRMATION"))
    });

    const rejectedReviewStockCheck = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(2, "STOCK_CONFIRMED_AVAILABLE"))
    });

    const duplicateStockCheck = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(1, "STOCK_CONFIRMED_AVAILABLE"))
    });

    const list = await request("/api/controlled-buyer-gate-manual-stock-checks");
    const summary = await request("/api/controlled-buyer-gate-manual-stock-check/summary");

    const availableCheck = safeAvailableCheck.body && safeAvailableCheck.body.check;
    const supplierCheck = safeSupplierCheck.body && safeSupplierCheck.body.check;

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
      slot1.body.slot.slotNumber === 1 &&
      slot2.body.slot.slotNumber === 2 &&
      slot3.body.slot.slotNumber === 3 &&
      slot1.body.slot.buyerContacted === false &&
      slot1.body.slot.quotePrepared === false;

    const reviewsOk =
      review1.status === 201 &&
      review2.status === 201 &&
      review3.status === 201 &&
      review1.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review2.body.review.reviewDecision === "REJECT_AS_NOT_READY" &&
      review3.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review1.body.review.buyerContacted === false &&
      review1.body.review.quotePrepared === false;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Manual Stock Check Gate Foundation is active." &&
      preview.body.requiredStockCheckPhrase === "I_CONFIRM_MANUAL_STOCK_CHECK_ONLY_NO_QUOTE_NO_BUYER_CONTACT" &&
      Array.isArray(preview.body.allowedDecisions) &&
      preview.body.allowedDecisions.includes("STOCK_CONFIRMED_AVAILABLE") &&
      preview.body.allowedDecisions.includes("STOCK_NOT_AVAILABLE") &&
      preview.body.allowedDecisions.includes("STOCK_NEEDS_SUPPLIER_CONFIRMATION") &&
      preview.body.rules.includes("No buyer contact from this gate.") &&
      preview.body.rules.includes("No inventory update.") &&
      preview.body.rules.includes("Manual compatibility check is required next.");

    const unsafeOk =
      unsafeStockCheck.status === 400 &&
      unsafeStockCheck.body &&
      Array.isArray(unsafeStockCheck.body.errors) &&
      unsafeStockCheck.body.errors.some(error => error.includes("Unsafe manual stock check request blocked"));

    const availableOk =
      safeAvailableCheck.status === 201 &&
      availableCheck &&
      availableCheck.stockCheckStatus === "MANUAL_STOCK_CHECK_COMPLETED" &&
      availableCheck.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
      availableCheck.manualStockCheckGateOnly === true &&
      availableCheck.stockCheckRecordOnly === true &&
      availableCheck.controlledStockCheckOnly === true &&
      availableCheck.manualStockStatusOnly === true &&
      availableCheck.stockConfirmedAvailableOnly === true &&
      availableCheck.slotNumber === 1 &&
      availableCheck.leadLimit === 15 &&
      availableCheck.source === "whatsapp_click_to_chat_inbound" &&
      availableCheck.manualStockCheckCompleted === true &&
      availableCheck.buyerContacted === false &&
      availableCheck.realBuyerContacted === false &&
      availableCheck.autoContactBuyer === false &&
      availableCheck.autoSendWhatsApp === false &&
      availableCheck.autoReadWhatsApp === false &&
      availableCheck.scrapeWhatsappMessages === false &&
      availableCheck.privateMessageScraping === false &&
      availableCheck.hiddenDataHarvesting === false &&
      availableCheck.startOutboundTraffic === false &&
      availableCheck.startPaidAdsAutomatically === false &&
      availableCheck.publishLeadFormAutomatically === false &&
      availableCheck.quotePrepared === false &&
      availableCheck.autoCreateQuote === false &&
      availableCheck.quoteBeforeStockConfirmation === false &&
      availableCheck.quoteBeforeCompatibilityConfirmation === false &&
      availableCheck.quoteBlockedUntilCompatibility === true &&
      availableCheck.manualCompatibilityCheckRequiredNext === true &&
      availableCheck.inventoryUpdated === false &&
      availableCheck.stockReserved === false &&
      availableCheck.stockReduced === false &&
      availableCheck.autoUpdateInventory === false &&
      availableCheck.reserveStockAutomatically === false &&
      availableCheck.reduceStockAutomatically === false &&
      availableCheck.autoCreateAccountingEntry === false &&
      availableCheck.autoCloseSale === false &&
      availableCheck.autoMovePipelineStage === false;

    const supplierOk =
      safeSupplierCheck.status === 201 &&
      supplierCheck &&
      supplierCheck.stockCheckStatus === "MANUAL_STOCK_CHECK_COMPLETED" &&
      supplierCheck.stockDecision === "STOCK_NEEDS_SUPPLIER_CONFIRMATION" &&
      supplierCheck.stockNeedsSupplierConfirmationOnly === true &&
      supplierCheck.slotNumber === 3 &&
      supplierCheck.buyerContacted === false &&
      supplierCheck.quotePrepared === false &&
      supplierCheck.inventoryUpdated === false &&
      supplierCheck.stockReserved === false;

    const rejectedReviewBlockedOk =
      rejectedReviewStockCheck.status === 400 &&
      rejectedReviewStockCheck.body &&
      Array.isArray(rejectedReviewStockCheck.body.errors) &&
      rejectedReviewStockCheck.body.errors.some(error => error.includes("Matching ACCEPT_FOR_MANUAL_STOCK_CHECK review was not found"));

    const duplicateOk =
      duplicateStockCheck.status === 400 &&
      duplicateStockCheck.body &&
      Array.isArray(duplicateStockCheck.body.errors) &&
      duplicateStockCheck.body.errors.some(error => error.includes("already has a completed manual stock check"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.stockChecks) &&
      list.body.stockChecks.length === 2 &&
      list.body.stockChecks.every(item =>
        item.stockCheckStatus === "MANUAL_STOCK_CHECK_COMPLETED" &&
        item.buyerContacted === false &&
        item.autoSendWhatsApp === false &&
        item.autoReadWhatsApp === false &&
        item.quotePrepared === false &&
        item.inventoryUpdated === false &&
        item.stockReserved === false &&
        item.stockReduced === false &&
        item.autoCreateAccountingEntry === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalStockChecks === 2 &&
      summary.body.summary.completedStockCheckCount === 2 &&
      summary.body.summary.stockConfirmedAvailableCount === 1 &&
      summary.body.summary.stockNeedsSupplierConfirmationCount === 1 &&
      summary.body.summary.latestStockCheckStatus === "MANUAL_STOCK_CHECK_COMPLETED" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.manualStockCheckGateOnly === true &&
      summary.body.summary.safety.stockCheckRecordOnly === true &&
      summary.body.summary.safety.controlledStockCheckOnly === true &&
      summary.body.summary.safety.manualStockStatusOnly === true &&
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
      summary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      summary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      summary.body.summary.safety.quoteBlockedUntilCompatibility === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noStockReservation === true &&
      summary.body.summary.safety.noStockReduction === true &&
      summary.body.summary.safety.noStockLedgerEntry === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true &&
      summary.body.summary.safety.manualCompatibilityCheckRequiredNext === true &&
      summary.body.summary.safety.compatibilityConfirmationRequiredBeforeQuote === true;

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      slotsOk &&
      reviewsOk &&
      previewOk &&
      unsafeOk &&
      availableOk &&
      supplierOk &&
      rejectedReviewBlockedOk &&
      duplicateOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 32A Controlled Buyer-Gate Manual Stock Check Gate Smoke Test Report

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
- ${previewOk ? "PASS" : "FAIL"}: manual stock check preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe contact/send/read/scrape/quote/inventory stock check request is blocked
- ${availableOk ? "PASS" : "FAIL"}: safe STOCK_CONFIRMED_AVAILABLE check is recorded without buyer contact or inventory mutation
- ${supplierOk ? "PASS" : "FAIL"}: safe STOCK_NEEDS_SUPPLIER_CONFIRMATION check is recorded without buyer contact or inventory mutation
- ${rejectedReviewBlockedOk ? "PASS" : "FAIL"}: stock check is blocked for rejected lead review
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate stock check for same slot is blocked
- ${listOk ? "PASS" : "FAIL"}: manual stock check list API returns safe records
- ${summaryOk ? "PASS" : "FAIL"}: manual stock check summary API confirms safe stock-check metrics

## Safety Rules Confirmed
- Manual stock check gate only.
- Manual stock check record only.
- Controlled stock check only.
- Stock status is confirmed manually.
- Manual stock check does not contact buyer.
- Manual stock check does not prepare quote.
- Quote remains blocked until compatibility confirmation.
- Accepted stock check moves only toward manual compatibility check next.
- Rejected manual lead review cannot enter stock check.
- Duplicate stock check for same slot is blocked.
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
- Manual compatibility check is required next.
- Assistant, guardian, plan, approval, execution, slot, review, and stock-check test data restored after smoke test.

## Next Phase After Approval
Version 32B — Controlled Buyer-Gate Manual Stock Check Dashboard Display

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
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

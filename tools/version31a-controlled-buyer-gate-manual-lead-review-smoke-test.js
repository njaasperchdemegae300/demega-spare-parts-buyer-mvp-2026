const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3108;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");
const approvalsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");
const executionsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-activation-executions.json");
const slotsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-lead-slots.json");
const reviewsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-lead-reviews.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";
const originalApprovals = fs.existsSync(approvalsPath) ? fs.readFileSync(approvalsPath, "utf8") : "[]";
const originalExecutions = fs.existsSync(executionsPath) ? fs.readFileSync(executionsPath, "utf8") : "[]";
const originalSlots = fs.existsSync(slotsPath) ? fs.readFileSync(slotsPath, "utf8") : "[]";
const originalReviews = fs.existsSync(reviewsPath) ? fs.readFileSync(reviewsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version31a-controlled-buyer-gate-manual-lead-review-smoke-test-report.md");

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
}

function restoreData() {
  safeWrite(assistantRunsPath, originalAssistant);
  safeWrite(guardianRunsPath, originalGuardian);
  safeWrite(plansPath, originalPlans);
  safeWrite(approvalsPath, originalApprovals);
  safeWrite(executionsPath, originalExecutions);
  safeWrite(slotsPath, originalSlots);
  safeWrite(reviewsPath, originalReviews);
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
    leadReference: `controlled-manual-review-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual review gate test.",
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

function safeReviewPayload(slotNumber, decision = "ACCEPT_FOR_MANUAL_STOCK_CHECK", extra = {}) {
  return {
    slotNumber,
    reviewDecision: decision,
    reviewedBy: "master_admin",
    reviewNote: "Manual lead review only. No buyer contact. Prepare for manual stock check next.",
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
    adminConfirmedManualCompatibilityCheckRequiredLater: true,
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

    await wait(2000);

    const health = await request("/api/health");

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

    const preview = await request("/api/controlled-buyer-gate-manual-lead-review/preview");

    const unsafeReview = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(1, "ACCEPT_FOR_MANUAL_STOCK_CHECK", {
        buyerContacted: true,
        autoContactBuyer: true,
        startOutboundTraffic: true,
        autoSendWhatsApp: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        hiddenDataHarvesting: true,
        quotePrepared: true,
        quoteBeforeStockConfirmation: true,
        quoteBeforeCompatibilityConfirmation: true,
        autoUpdateInventory: true,
        autoCreateAccountingEntry: true,
        autoCloseSale: true,
        autoMovePipelineStage: true
      }))
    });

    const safeAcceptReview = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(1, "ACCEPT_FOR_MANUAL_STOCK_CHECK"))
    });

    const safeRejectReview = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(2, "REJECT_AS_NOT_READY"))
    });

    const duplicateReview = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(1, "ACCEPT_FOR_MANUAL_STOCK_CHECK"))
    });

    const list = await request("/api/controlled-buyer-gate-manual-lead-reviews");
    const summary = await request("/api/controlled-buyer-gate-manual-lead-review/summary");

    const acceptReview = safeAcceptReview.body && safeAcceptReview.body.review;
    const rejectReview = safeRejectReview.body && safeRejectReview.body.review;

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
      slot1.body.slot.slotNumber === 1 &&
      slot2.body.slot.slotNumber === 2 &&
      slot1.body.slot.buyerContacted === false &&
      slot1.body.slot.quotePrepared === false;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Manual Lead Review Gate Foundation is active." &&
      preview.body.requiredReviewPhrase === "I_CONFIRM_MANUAL_LEAD_REVIEW_ONLY_NO_BUYER_CONTACT" &&
      Array.isArray(preview.body.allowedDecisions) &&
      preview.body.allowedDecisions.includes("ACCEPT_FOR_MANUAL_STOCK_CHECK") &&
      preview.body.allowedDecisions.includes("REJECT_AS_NOT_READY") &&
      preview.body.rules.includes("No buyer contact from this gate.") &&
      preview.body.rules.includes("Manual stock check is required next.");

    const unsafeOk =
      unsafeReview.status === 400 &&
      unsafeReview.body &&
      Array.isArray(unsafeReview.body.errors) &&
      unsafeReview.body.errors.some(error => error.includes("Unsafe manual lead review request blocked"));

    const acceptOk =
      safeAcceptReview.status === 201 &&
      acceptReview &&
      acceptReview.reviewStatus === "MANUAL_LEAD_REVIEW_COMPLETED" &&
      acceptReview.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      acceptReview.manualLeadReviewGateOnly === true &&
      acceptReview.leadReviewRecordOnly === true &&
      acceptReview.controlledLeadReviewOnly === true &&
      acceptReview.inboundLeadReviewOnly === true &&
      acceptReview.acceptedForManualStockCheckOnly === true &&
      acceptReview.slotNumber === 1 &&
      acceptReview.leadLimit === 15 &&
      acceptReview.source === "whatsapp_click_to_chat_inbound" &&
      acceptReview.manualReviewCompleted === true &&
      acceptReview.manualReviewRequiredBeforeAnyBuyerContact === true &&
      acceptReview.buyerContacted === false &&
      acceptReview.realBuyerContacted === false &&
      acceptReview.autoContactBuyer === false &&
      acceptReview.autoSendWhatsApp === false &&
      acceptReview.autoReadWhatsApp === false &&
      acceptReview.scrapeWhatsappMessages === false &&
      acceptReview.privateMessageScraping === false &&
      acceptReview.hiddenDataHarvesting === false &&
      acceptReview.startOutboundTraffic === false &&
      acceptReview.startPaidAdsAutomatically === false &&
      acceptReview.publishLeadFormAutomatically === false &&
      acceptReview.quotePrepared === false &&
      acceptReview.autoCreateQuote === false &&
      acceptReview.quoteBeforeStockConfirmation === false &&
      acceptReview.quoteBeforeCompatibilityConfirmation === false &&
      acceptReview.manualStockCheckRequiredNext === true &&
      acceptReview.manualCompatibilityCheckRequiredLater === true &&
      acceptReview.autoUpdateInventory === false &&
      acceptReview.autoCreateAccountingEntry === false &&
      acceptReview.autoCloseSale === false &&
      acceptReview.autoMovePipelineStage === false;

    const rejectOk =
      safeRejectReview.status === 201 &&
      rejectReview &&
      rejectReview.reviewStatus === "MANUAL_LEAD_REVIEW_COMPLETED" &&
      rejectReview.reviewDecision === "REJECT_AS_NOT_READY" &&
      rejectReview.rejectedAsNotReadyOnly === true &&
      rejectReview.slotNumber === 2 &&
      rejectReview.buyerContacted === false &&
      rejectReview.quotePrepared === false;

    const duplicateOk =
      duplicateReview.status === 400 &&
      duplicateReview.body &&
      Array.isArray(duplicateReview.body.errors) &&
      duplicateReview.body.errors.some(error => error.includes("already has a completed manual lead review"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.reviews) &&
      list.body.reviews.length === 2 &&
      list.body.reviews.every(item =>
        item.reviewStatus === "MANUAL_LEAD_REVIEW_COMPLETED" &&
        item.buyerContacted === false &&
        item.autoSendWhatsApp === false &&
        item.autoReadWhatsApp === false &&
        item.quotePrepared === false &&
        item.autoUpdateInventory === false &&
        item.autoCreateAccountingEntry === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalReviews === 2 &&
      summary.body.summary.completedReviewCount === 2 &&
      summary.body.summary.acceptedForManualStockCheckCount === 1 &&
      summary.body.summary.rejectedAsNotReadyCount === 1 &&
      summary.body.summary.latestReviewStatus === "MANUAL_LEAD_REVIEW_COMPLETED" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.manualLeadReviewGateOnly === true &&
      summary.body.summary.safety.leadReviewRecordOnly === true &&
      summary.body.summary.safety.controlledLeadReviewOnly === true &&
      summary.body.summary.safety.inboundLeadReviewOnly === true &&
      summary.body.summary.safety.manualReviewCompletedOnly === true &&
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
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true &&
      summary.body.summary.safety.manualStockCheckRequiredNext === true &&
      summary.body.summary.safety.manualCompatibilityCheckRequiredLater === true &&
      summary.body.summary.safety.manualReviewRequiredBeforeAnyBuyerContact === true;

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      slotsOk &&
      previewOk &&
      unsafeOk &&
      acceptOk &&
      rejectOk &&
      duplicateOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 31A Controlled Buyer-Gate Manual Lead Review Gate Smoke Test Report

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
- ${previewOk ? "PASS" : "FAIL"}: manual lead review preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe contact/send/read/scrape/quote/manual review request is blocked
- ${acceptOk ? "PASS" : "FAIL"}: safe accept manual lead review is recorded without buyer contact
- ${rejectOk ? "PASS" : "FAIL"}: safe reject manual lead review is recorded without buyer contact
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate manual review for same slot is blocked
- ${listOk ? "PASS" : "FAIL"}: manual lead review list API returns safe records
- ${summaryOk ? "PASS" : "FAIL"}: manual lead review summary API confirms safe review metrics

## Safety Rules Confirmed
- Manual lead review gate only.
- Manual lead review record only.
- Controlled inbound lead review only.
- Buyer-initiated WhatsApp click-to-chat inbound source only.
- Manual review completed does not contact buyer.
- Manual review completed does not prepare quote.
- Accepted review moves only toward manual stock check next.
- Rejected review records not-ready status only.
- Duplicate review for same slot is blocked.
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
- No accounting entry creation.
- No sale closing.
- No pipeline movement.
- Manual stock check is required next.
- Assistant, guardian, plan, approval, execution, slot, and review test data restored after smoke test.

## Next Phase After Approval
Version 31B — Controlled Buyer-Gate Manual Lead Review Dashboard Display

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

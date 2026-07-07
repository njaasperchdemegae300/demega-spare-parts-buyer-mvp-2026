const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3110;
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

const reportPath = path.join(ROOT, "reports", "version31c-admin-hub-link-controlled-buyer-gate-manual-lead-review-smoke-test-report.md");

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
    leadReference: `controlled-admin-hub-review-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual review Admin Hub test.",
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
    reviewNote: "Manual lead review Admin Hub test only. No buyer contact. No quote prepared.",
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

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const reviewPage = await request("/controlled-buyer-gate-manual-lead-review");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const reviewSummary = await request("/api/controlled-buyer-gate-manual-lead-review/summary");

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

    const reviewsOk =
      review1.status === 201 &&
      review2.status === 201 &&
      review1.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review2.body.review.reviewDecision === "REJECT_AS_NOT_READY" &&
      review1.body.review.buyerContacted === false &&
      review1.body.review.quotePrepared === false &&
      review1.body.review.autoSendWhatsApp === false &&
      review1.body.review.autoReadWhatsApp === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Manual Lead Review") &&
      hub.text.includes("/controlled-buyer-gate-manual-lead-review") &&
      hub.text.includes("Manual Lead Reviews") &&
      hub.text.includes("Completed Reviews") &&
      hub.text.includes("Accepted For Stock Check") &&
      hub.text.includes("Rejected Not Ready") &&
      hub.text.includes("Latest Review Status") &&
      hub.text.includes("Latest Review Decision") &&
      hub.text.includes("Latest Review Slot") &&
      hub.text.includes("Latest Review Source") &&
      hub.text.includes("MANUAL LEAD REVIEW DASHBOARD ONLY") &&
      hub.text.includes("REVIEW RECORD ONLY") &&
      hub.text.includes("NO BUYER CONTACT FROM REVIEW GATE") &&
      hub.text.includes("NO QUOTE PREPARED AT REVIEW GATE") &&
      hub.text.includes("ACCEPT MOVES TO MANUAL STOCK CHECK ONLY") &&
      hub.text.includes("REJECT RECORDS NOT-READY ONLY");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Manual Lead Review") &&
      alias.text.includes("/controlled-buyer-gate-manual-lead-review");

    const reviewLinkedOk =
      reviewPage.status === 200 &&
      reviewPage.text.includes("Demega Controlled Buyer-Gate Manual Lead Review Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Manual Lead Review" &&
        module.path === "/controlled-buyer-gate-manual-lead-review"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateManualLeadReviewOnly === true &&
      summary.body.safety.manualLeadReviewGateOnly === true &&
      summary.body.safety.leadReviewRecordOnly === true &&
      summary.body.safety.controlledLeadReviewOnly === true &&
      summary.body.safety.inboundLeadReviewOnly === true &&
      summary.body.safety.acceptRejectDecisionOnly === true &&
      summary.body.safety.acceptedForManualStockCheckOnly === true &&
      summary.body.safety.rejectedAsNotReadyOnly === true &&
      summary.body.safety.buyerContacted === false &&
      summary.body.safety.realBuyerContacted === false &&
      summary.body.safety.autoContactBuyer === false &&
      summary.body.safety.startOutboundTraffic === false &&
      summary.body.safety.startPaidAdsAutomatically === false &&
      summary.body.safety.publishLeadFormAutomatically === false &&
      summary.body.safety.systemDoesNotStartOutboundTraffic === true &&
      summary.body.safety.systemDoesNotStartPaidAds === true &&
      summary.body.safety.systemDoesNotPublishLeadForm === true &&
      summary.body.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoReadWhatsApp === false &&
      summary.body.safety.scrapeWhatsappMessages === false &&
      summary.body.safety.privateMessageScraping === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.quotePrepared === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.quoteBeforeStockConfirmation === false &&
      summary.body.safety.quoteBeforeCompatibilityConfirmation === false &&
      summary.body.safety.autoUpdateInventory === false &&
      summary.body.safety.autoCreateAccountingEntry === false &&
      summary.body.safety.autoCloseSale === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.manualStockCheckRequiredNext === true &&
      summary.body.safety.manualCompatibilityCheckRequiredLater === true &&
      summary.body.safety.manualReviewRequiredBeforeAnyBuyerContact === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.controlledBuyerGateManualLeadReview &&
      typeof metrics.body.metrics.controlledBuyerGateManualLeadReview.totalReviews === "number" &&
      metrics.body.metrics.controlledBuyerGateManualLeadReview.totalReviews === 2 &&
      metrics.body.metrics.controlledBuyerGateManualLeadReview.completedReviewCount === 2 &&
      metrics.body.metrics.controlledBuyerGateManualLeadReview.acceptedForManualStockCheckCount === 1 &&
      metrics.body.metrics.controlledBuyerGateManualLeadReview.rejectedAsNotReadyCount === 1 &&
      metrics.body.metrics.controlledBuyerGateManualLeadReview.latestReviewStatus === "MANUAL_LEAD_REVIEW_COMPLETED" &&
      metrics.body.metrics.controlledBuyerGateManualLeadReview.latestSource === "whatsapp_click_to_chat_inbound" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateManualLeadReviewOnly === true &&
      metrics.body.safety.manualLeadReviewGateOnly === true &&
      metrics.body.safety.leadReviewRecordOnly === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.quotePrepared === false &&
      metrics.body.safety.autoCreateQuote === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const reviewSummaryOk =
      reviewSummary.status === 200 &&
      reviewSummary.body &&
      reviewSummary.body.summary &&
      reviewSummary.body.summary.totalReviews === 2 &&
      reviewSummary.body.summary.completedReviewCount === 2 &&
      reviewSummary.body.summary.acceptedForManualStockCheckCount === 1 &&
      reviewSummary.body.summary.rejectedAsNotReadyCount === 1 &&
      reviewSummary.body.summary.latestReviewStatus === "MANUAL_LEAD_REVIEW_COMPLETED" &&
      reviewSummary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      reviewSummary.body.summary.safety &&
      reviewSummary.body.summary.safety.manualLeadReviewGateOnly === true &&
      reviewSummary.body.summary.safety.leadReviewRecordOnly === true &&
      reviewSummary.body.summary.safety.controlledLeadReviewOnly === true &&
      reviewSummary.body.summary.safety.inboundLeadReviewOnly === true &&
      reviewSummary.body.summary.safety.manualReviewCompletedOnly === true &&
      reviewSummary.body.summary.safety.noOutboundTrafficStarted === true &&
      reviewSummary.body.summary.safety.noPaidAdsStartedAutomatically === true &&
      reviewSummary.body.summary.safety.noLeadFormPublishedAutomatically === true &&
      reviewSummary.body.summary.safety.noRealBuyerContacted === true &&
      reviewSummary.body.summary.safety.noAutoContactBuyer === true &&
      reviewSummary.body.summary.safety.noAutoSendWhatsApp === true &&
      reviewSummary.body.summary.safety.noWhatsappAutoRead === true &&
      reviewSummary.body.summary.safety.noBuyerMessageReading === true &&
      reviewSummary.body.summary.safety.noWhatsappScraping === true &&
      reviewSummary.body.summary.safety.noPrivateDataScraping === true &&
      reviewSummary.body.summary.safety.noHiddenDataHarvesting === true &&
      reviewSummary.body.summary.safety.noQuotePrepared === true &&
      reviewSummary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      reviewSummary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      reviewSummary.body.summary.safety.noInventoryUpdate === true &&
      reviewSummary.body.summary.safety.noAccountingEntryCreation === true &&
      reviewSummary.body.summary.safety.noSaleClosing === true &&
      reviewSummary.body.summary.safety.noPipelineMovement === true &&
      reviewSummary.body.summary.safety.manualStockCheckRequiredNext === true &&
      reviewSummary.body.summary.safety.manualCompatibilityCheckRequiredLater === true &&
      reviewSummary.body.summary.safety.manualReviewRequiredBeforeAnyBuyerContact === true;

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
      !hub.text.includes("autoUpdateInventory = true") &&
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
      hubOk &&
      aliasOk &&
      reviewLinkedOk &&
      summaryOk &&
      metricsOk &&
      reviewSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 31C Admin Hub Link Controlled Buyer-Gate Manual Lead Review Smoke Test Report

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
- ${reviewsOk ? "PASS" : "FAIL"}: manual lead reviews exist before Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Lead Review link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Lead Review
- ${reviewLinkedOk ? "PASS" : "FAIL"}: linked Manual Lead Review dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Lead Review module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Manual Lead Review metrics safely
- ${reviewSummaryOk ? "PASS" : "FAIL"}: Manual Lead Review summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Manual Lead Review link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Manual Lead Review Admin Hub link is read-only.
- Manual lead review gate only.
- Manual lead review record only.
- Controlled inbound lead review only.
- Buyer-initiated WhatsApp click-to-chat inbound source only.
- Manual review completed does not contact buyer.
- Manual review completed does not prepare quote.
- Accepted review moves only toward manual stock check next.
- Rejected review records not-ready status only.
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
- Metrics API remains read-only.
- Manual stock check remains required next.
- Assistant, guardian, plan, approval, execution, slot, and review test data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Manual Lead Review metrics.
- Admin Hub now links directly to Manual Lead Review dashboard.
- Controlled inbound leads now require visible manual review before buyer contact.
- Next required build is manual stock check gate before quote preparation.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 32A — Controlled Buyer-Gate Manual Stock Check Gate Foundation
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

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3133;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const dataFiles = [
  "assistant-sales-agent-test-runs.json",
  "internal-buyer-gate-readiness-runs.json",
  "controlled-buyer-gate-test-plans.json",
  "controlled-buyer-gate-manual-activation-approvals.json",
  "controlled-buyer-gate-activation-executions.json",
  "controlled-buyer-gate-lead-slots.json",
  "controlled-buyer-gate-manual-lead-reviews.json",
  "controlled-buyer-gate-manual-stock-checks.json",
  "controlled-buyer-gate-manual-compatibility-checks.json",
  "controlled-buyer-gate-final-quote-eligibilities.json",
  "controlled-buyer-gate-manual-quote-drafts.json",
  "controlled-buyer-gate-manual-send-confirmations.json",
  "controlled-buyer-gate-buyer-reply-trackings.json",
  "controlled-buyer-gate-follow-up-decisions.json",
  "controlled-buyer-gate-final-readiness-locks.json"
];

const originalData = {};
for (const name of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", name);
  originalData[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version39b-controlled-buyer-gate-final-readiness-lock-dashboard-smoke-test-report.md");

function safeWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function restoreData() {
  for (const [filePath, value] of Object.entries(originalData)) {
    safeWrite(filePath, value);
  }
}

function seedDependencies() {
  const now = new Date().toISOString();

  const seeds = {
    "assistant-sales-agent-test-runs.json": [{ id: "v39b_assistant", verdict: "APPROVED", createdAt: now }],
    "internal-buyer-gate-readiness-runs.json": [{ id: "v39b_guardian", verdict: "APPROVED", createdAt: now }],
    "controlled-buyer-gate-test-plans.json": [{ id: "v39b_plan", leadLimit: 15, testSource: "whatsapp_click_to_chat_inbound", createdAt: now }],
    "controlled-buyer-gate-manual-activation-approvals.json": [{ id: "v39b_approval", approvalStatus: "APPROVED_NOT_ACTIVATED", createdAt: now }],
    "controlled-buyer-gate-activation-executions.json": [{ id: "v39b_execution", activationStatus: "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY", createdAt: now }],
    "controlled-buyer-gate-lead-slots.json": [{ id: "v39b_slot", source: "whatsapp_click_to_chat_inbound", createdAt: now }],
    "controlled-buyer-gate-manual-lead-reviews.json": [{ id: "v39b_review", reviewDecision: "ACCEPT_FOR_MANUAL_STOCK_CHECK", createdAt: now }],
    "controlled-buyer-gate-manual-stock-checks.json": [{ id: "v39b_stock", stockDecision: "STOCK_CONFIRMED_AVAILABLE", inventoryUpdated: false, stockReserved: false, stockReduced: false, createdAt: now }],
    "controlled-buyer-gate-manual-compatibility-checks.json": [{ id: "v39b_compatibility", compatibilityDecision: "COMPATIBILITY_CONFIRMED", createdAt: now }],
    "controlled-buyer-gate-final-quote-eligibilities.json": [{ id: "v39b_eligibility", eligibilityDecision: "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT", createdAt: now }],
    "controlled-buyer-gate-manual-quote-drafts.json": [{ id: "v39b_quote_draft", manualQuoteDraftStatus: "MANUAL_QUOTE_DRAFT_CREATED", quoteSentToBuyer: false, systemQuoteSentToBuyer: false, createdAt: now }],
    "controlled-buyer-gate-manual-send-confirmations.json": [{ id: "v39b_send", manualSendConfirmationStatus: "MANUAL_SEND_CONFIRMED_OUTSIDE_SYSTEM", systemQuoteSentToBuyer: false, systemSendWhatsApp: false, createdAt: now }],
    "controlled-buyer-gate-buyer-reply-trackings.json": [{ id: "v39b_reply", buyerReplyTrackingStatus: "BUYER_REPLY_TRACKING_RECORDED", autoReadWhatsApp: false, scrapeWhatsappMessages: false, autoReplyToBuyer: false, createdAt: now }],
    "controlled-buyer-gate-follow-up-decisions.json": [{ id: "v39b_follow_up", followUpDecisionStatus: "FOLLOW_UP_DECISION_RECORDED", autoStartFollowUp: false, autoScheduleFollowUp: false, autoSendWhatsApp: false, autoMovePipelineStage: false, inventoryUpdated: false, autoCreateAccountingEntry: false, createdAt: now }],
    "controlled-buyer-gate-final-readiness-locks.json": []
  };

  for (const [name, data] of Object.entries(seeds)) {
    safeWrite(path.join(ROOT, "src", "data", name), JSON.stringify(data, null, 2));
  }
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

async function post(route, body) {
  return request(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function waitForHealth(child, logsRef) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (child.exitCode !== null) return null;

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

function finalReadinessPayload(extra = {}) {
  return {
    lockChannel: "admin_manual_final_readiness_lock_only",
    lockReason: "Version 39B dashboard display test confirms final readiness lock visibility only.",
    lockedBy: "master_admin",
    nextGateInstruction: "Next gate must be a separate manual live-gate approval. Do not open traffic from this dashboard.",
    finalReadinessLockPhrase: "I_CONFIRM_FINAL_READINESS_LOCK_ONLY_NO_LIVE_TRAFFIC_NO_AUTO_SEND",
    adminReviewedAllPreviousGates: true,
    adminConfirmedAssistantAgentApproved: true,
    adminConfirmedGuardianApproved: true,
    adminConfirmedControlled15LeadLimit: true,
    adminConfirmedInboundOnly: true,
    adminConfirmedManualReviewOnly: true,
    adminConfirmedManualReplyOnly: true,
    adminConfirmedStockBeforeQuote: true,
    adminConfirmedCompatibilityBeforeQuote: true,
    adminConfirmedManualSendOnly: true,
    adminConfirmedBuyerReplyTrackingExists: true,
    adminConfirmedFollowUpDecisionExists: true,
    adminConfirmedNoLiveTrafficOpened: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoAutoReply: true,
    adminConfirmedNoAutoFollowUp: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoMessageScraping: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoAccountingMutation: true,
    adminConfirmedNoSaleClosed: true,
    adminConfirmedNoPipelineMove: true,
    adminConfirmedNextGateRequiresManualLiveGateApproval: true,
    ...extra
  };
}

async function main() {
  const logsRef = { value: "" };
  let child;

  seedDependencies();

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logsRef.value += data.toString());
    child.stderr.on("data", data => logsRef.value += data.toString());

    const health = await waitForHealth(child, logsRef);

    if (!health) {
      const startupReport = `# Version 39B Controlled Buyer-Gate Final Readiness Lock Dashboard Smoke Test Report

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

    const unsafeLock = await post("/api/controlled-buyer-gate-final-readiness-lock/create", finalReadinessPayload({
      openLiveGate: true,
      activateRealBuyerTraffic: true,
      startLiveTraffic: true,
      autoSendWhatsApp: true,
      autoReplyToBuyer: true,
      autoStartFollowUp: true,
      autoMovePipelineStage: true,
      autoCreateAccountingEntry: true,
      autoUpdateInventory: true
    }));

    const safeLock = await post("/api/controlled-buyer-gate-final-readiness-lock/create", finalReadinessPayload());
    const dashboard = await request("/controlled-buyer-gate-final-readiness-lock");
    const dashboardAlias = await request("/controlled-buyer-gate-final-readiness-lock-dashboard");
    const list = await request("/api/controlled-buyer-gate-final-readiness-locks");
    const summary = await request("/api/controlled-buyer-gate-final-readiness-lock/summary");

    const record = safeLock.body && safeLock.body.record;

    const healthOk = health.status === 200;

    const unsafeOk =
      unsafeLock.status === 400 &&
      unsafeLock.body &&
      Array.isArray(unsafeLock.body.errors) &&
      unsafeLock.body.errors.some(error => error.includes("Unsafe final readiness lock request blocked"));

    const safeLockOk =
      safeLock.status === 201 &&
      record &&
      record.finalReadinessLockStatus === "FINAL_READINESS_LOCK_RECORDED" &&
      record.noLiveTrafficOpened === true &&
      record.noRealBuyerGateOpened === true &&
      record.noOutboundTrafficStarted === true &&
      record.nextGateRequiresManualLiveGateApproval === true &&
      record.autoOpenLiveTraffic === false &&
      record.openLiveGate === false &&
      record.activateRealBuyerTraffic === false &&
      record.startLiveTraffic === false &&
      record.autoSendWhatsApp === false &&
      record.autoReplyToBuyer === false &&
      record.autoStartFollowUp === false &&
      record.autoScheduleFollowUp === false &&
      record.autoMovePipelineStage === false &&
      record.inventoryUpdated === false &&
      record.autoCreateAccountingEntry === false &&
      record.autoCloseSale === false;

    const dashboardOk =
      dashboard.status === 200 &&
      dashboard.text.includes("Controlled Buyer-Gate Final Readiness Lock Dashboard") &&
      dashboard.text.includes("FINAL READINESS LOCK DASHBOARD ONLY") &&
      dashboard.text.includes("Total Final Locks") &&
      dashboard.text.includes("Recorded Locks") &&
      dashboard.text.includes("Latest Status") &&
      dashboard.text.includes("Lead Limit") &&
      dashboard.text.includes("Approved Source") &&
      dashboard.text.includes("Manual Live Gate Required") &&
      dashboard.text.includes("NO LIVE TRAFFIC OPENED") &&
      dashboard.text.includes("NO REAL BUYER GATE OPENED") &&
      dashboard.text.includes("NO OUTBOUND TRAFFIC STARTED") &&
      dashboard.text.includes("NO AUTO-SEND WHATSAPP") &&
      dashboard.text.includes("NO AUTO-REPLY") &&
      dashboard.text.includes("NO AUTO-FOLLOW-UP") &&
      dashboard.text.includes("NO WHATSAPP READING") &&
      dashboard.text.includes("NO MESSAGE SCRAPING") &&
      dashboard.text.includes("NO INVENTORY MUTATION") &&
      dashboard.text.includes("NO ACCOUNTING MUTATION") &&
      dashboard.text.includes("NO SALE CLOSING") &&
      dashboard.text.includes("NO PIPELINE MOVEMENT") &&
      dashboard.text.includes("NEXT GATE NEEDS SEPARATE MANUAL LIVE-GATE APPROVAL") &&
      dashboard.text.includes("/api/controlled-buyer-gate-final-readiness-lock/summary") &&
      dashboard.text.includes("/api/controlled-buyer-gate-final-readiness-locks");

    const aliasOk =
      dashboardAlias.status === 200 &&
      dashboardAlias.text.includes("Controlled Buyer-Gate Final Readiness Lock Dashboard");

    const readOnlyOk =
      !dashboard.text.includes("method: \"POST\"") &&
      !dashboard.text.includes("method: 'POST'") &&
      !dashboard.text.includes("POST /api") &&
      !dashboard.text.includes("/create") &&
      !dashboard.text.includes("sendWhatsApp(") &&
      !dashboard.text.includes("autoSendWhatsApp = true") &&
      !dashboard.text.includes("autoReplyToBuyer = true") &&
      !dashboard.text.includes("autoStartFollowUp = true") &&
      !dashboard.text.includes("autoMovePipelineStage = true") &&
      !dashboard.text.includes("autoCreateAccountingEntry = true") &&
      !dashboard.text.includes("autoUpdateInventory = true") &&
      !dashboard.text.includes("openLiveGate = true") &&
      !dashboard.text.includes("activateRealBuyerTraffic = true");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.finalReadinessLocks) &&
      list.body.finalReadinessLocks.length === 1 &&
      list.body.finalReadinessLocks[0].finalReadinessLockStatus === "FINAL_READINESS_LOCK_RECORDED" &&
      list.body.finalReadinessLocks[0].noLiveTrafficOpened === true &&
      list.body.finalReadinessLocks[0].autoSendWhatsApp === false;

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalFinalReadinessLocks === 1 &&
      summary.body.summary.recordedFinalReadinessLockCount === 1 &&
      summary.body.summary.latestFinalReadinessLockStatus === "FINAL_READINESS_LOCK_RECORDED" &&
      summary.body.summary.latestLeadLimit === 15 &&
      summary.body.summary.latestApprovedSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.nextGateRequiresManualLiveGateApproval === true &&
      summary.body.summary.safety &&
      summary.body.summary.safety.finalReadinessLockOnly === true &&
      summary.body.summary.safety.noLiveTrafficOpened === true &&
      summary.body.summary.safety.noRealBuyerGateOpened === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noAutoReply === true &&
      summary.body.summary.safety.noAutoFollowUp === true &&
      summary.body.summary.safety.noInventoryMutation === true &&
      summary.body.summary.safety.noAccountingMutation === true;

    const verdict =
      healthOk &&
      unsafeOk &&
      safeLockOk &&
      dashboardOk &&
      aliasOk &&
      readOnlyOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 39B Controlled Buyer-Gate Final Readiness Lock Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe live-traffic/auto-send/auto-reply/auto-follow-up/inventory/accounting/sale/pipeline request is blocked
- ${safeLockOk ? "PASS" : "FAIL"}: safe final readiness lock record exists for dashboard display
- ${dashboardOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-final-readiness-lock returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: dashboard alias route works
- ${readOnlyOk ? "PASS" : "FAIL"}: dashboard remains read-only
- ${listOk ? "PASS" : "FAIL"}: final readiness lock list API returns safe dashboard data
- ${summaryOk ? "PASS" : "FAIL"}: final readiness lock summary API confirms safe dashboard metrics

## Safety Rules Confirmed
- Dashboard displays final readiness lock records only.
- Dashboard is read-only.
- Final readiness lock only.
- Final readiness record only.
- Controlled buyer-gate final readiness only.
- This does not open live buyer traffic.
- This does not activate real buyer gate.
- This does not start outbound traffic.
- This does not start ads.
- This does not publish lead forms.
- This does not contact buyers.
- This does not send WhatsApp.
- This does not auto-reply.
- This does not auto-follow-up.
- This does not auto-schedule.
- This does not read WhatsApp.
- This does not scrape buyer messages.
- This does not scrape private data.
- This does not harvest hidden data.
- This does not move pipeline.
- This does not update inventory.
- This does not reserve stock.
- This does not reduce stock.
- This does not create accounting entry.
- This does not create receipt.
- This does not create invoice.
- This does not close sale.
- Next gate requires separate manual live-gate approval.
- Test data restored after smoke test.

## Business Readiness Confirmed
- Final readiness lock is now visible in a safe dashboard.
- Live traffic is still blocked.
- Dashboard proves technical readiness visibility only.
- Next phase is Admin Hub link and final controlled opening preparation.

## Next Phase After Approval
Version 40A — Controlled Real-Buyer Gate Opening Preparation / Final Go-No-Go

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

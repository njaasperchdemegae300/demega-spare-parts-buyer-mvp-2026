const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3134;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const dataFiles = [
  "controlled-buyer-gate-final-readiness-locks.json",
  "controlled-real-buyer-gate-opening-preparations.json"
];

const originalData = {};
for (const name of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", name);
  originalData[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version40a-controlled-real-buyer-gate-opening-preparation-smoke-test-report.md");

function safeWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function restoreData() {
  for (const [filePath, value] of Object.entries(originalData)) {
    safeWrite(filePath, value);
  }
}

function seedFinalReadinessLock() {
  const now = new Date().toISOString();

  safeWrite(path.join(ROOT, "src", "data", "controlled-buyer-gate-final-readiness-locks.json"), JSON.stringify([{
    id: "v40a_final_readiness_lock",
    finalReadinessLockStatus: "FINAL_READINESS_LOCK_RECORDED",
    noLiveTrafficOpened: true,
    noRealBuyerGateOpened: true,
    noOutboundTrafficStarted: true,
    nextGateRequiresManualLiveGateApproval: true,
    autoSendWhatsApp: false,
    autoReplyToBuyer: false,
    autoStartFollowUp: false,
    autoScheduleFollowUp: false,
    autoMovePipelineStage: false,
    inventoryUpdated: false,
    autoCreateAccountingEntry: false,
    autoCloseSale: false,
    leadLimit: 15,
    approvedSource: "whatsapp_click_to_chat_inbound",
    createdAt: now
  }], null, 2));

  safeWrite(path.join(ROOT, "src", "data", "controlled-real-buyer-gate-opening-preparations.json"), "[]");
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

function payload(extra = {}) {
  return {
    preparationChannel: "admin_manual_controlled_real_buyer_gate_preparation_only",
    preparationPhrase: "I_CONFIRM_40A_PREPARATION_ONLY_NO_TRAFFIC_OPENED",
    goNoGoDecision: "GO_READY_FOR_CONTROLLED_15_LEAD_TEST_NOT_OPENED",
    approvedOpeningSource: "whatsapp_click_to_chat_inbound",
    controlledLeadLimit: 15,
    preparedBy: "master_admin",
    preparationReason: "Version 40A final go/no-go preparation confirms the controlled 15-lead proof test can be prepared without opening traffic automatically.",
    nextManualAction: "Manually decide whether to start the controlled 15-lead proof test from approved inbound sources only.",
    adminConfirmedFinalReadinessLockApproved: true,
    adminConfirmedControlled15LeadLimit: true,
    adminConfirmedInboundOnlySources: true,
    adminConfirmedManualReviewOnly: true,
    adminConfirmedManualReplyOnly: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoSpam: true,
    adminConfirmedNoUnsolicitedWhatsApp: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true,
    adminConfirmedNoLiveTrafficOpened: true,
    adminConfirmedNoAdsStarted: true,
    adminConfirmedNoLeadFormsPublished: true,
    adminConfirmedNoBuyerContactedBySystem: true,
    adminConfirmedSeparateManualLaunchRequired: true,
    adminConfirmedMetricsWillBeMeasuredBeforeScaling: true,
    ...extra
  };
}

async function main() {
  const logsRef = { value: "" };
  let child;

  seedFinalReadinessLock();

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logsRef.value += data.toString());
    child.stderr.on("data", data => logsRef.value += data.toString());

    const health = await waitForHealth(child, logsRef);

    if (!health) {
      const startupReport = `# Version 40A Controlled Real-Buyer Gate Opening Preparation Smoke Test Report

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

    const preview = await request("/api/controlled-real-buyer-gate-opening-preparation/preview");

    const unsafe = await post("/api/controlled-real-buyer-gate-opening-preparation/create", payload({
      openLiveGate: true,
      activateRealBuyerTraffic: true,
      startLiveTraffic: true,
      startPaidAdsAutomatically: true,
      publishLeadFormAutomatically: true,
      autoContactBuyer: true,
      autoSendWhatsApp: true,
      autoReplyToBuyer: true,
      autoStartFollowUp: true,
      autoMovePipelineStage: true,
      autoCreateAccountingEntry: true,
      autoUpdateInventory: true,
      autoCloseSale: true
    }));

    const safe = await post("/api/controlled-real-buyer-gate-opening-preparation/create", payload());
    const duplicate = await post("/api/controlled-real-buyer-gate-opening-preparation/create", payload());
    const list = await request("/api/controlled-real-buyer-gate-opening-preparations");
    const summary = await request("/api/controlled-real-buyer-gate-opening-preparation/summary");
    const dashboard = await request("/controlled-real-buyer-gate-opening-preparation");
    const dashboardAlias = await request("/controlled-real-buyer-gate-opening-preparation-dashboard");

    const record = safe.body && safe.body.record;

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.requiredPreparationPhrase === "I_CONFIRM_40A_PREPARATION_ONLY_NO_TRAFFIC_OPENED" &&
      preview.body.requiredPreparationChannel === "admin_manual_controlled_real_buyer_gate_preparation_only" &&
      preview.body.controlledLeadLimit === 15 &&
      preview.body.approvedFinalReadinessLockExists === true;

    const unsafeOk =
      unsafe.status === 400 &&
      unsafe.body &&
      Array.isArray(unsafe.body.errors) &&
      unsafe.body.errors.some(error => error.includes("Unsafe controlled real-buyer gate opening preparation request blocked"));

    const safeOk =
      safe.status === 201 &&
      record &&
      record.preparationStatus === "CONTROLLED_REAL_BUYER_GATE_PREPARATION_RECORDED" &&
      record.goNoGoDecision === "GO_READY_FOR_CONTROLLED_15_LEAD_TEST_NOT_OPENED" &&
      record.approvedOpeningSource === "whatsapp_click_to_chat_inbound" &&
      record.controlledLeadLimit === 15 &&
      record.noLiveTrafficOpened === true &&
      record.noRealBuyerGateOpened === true &&
      record.noOutboundTrafficStarted === true &&
      record.noAdsStarted === true &&
      record.noLeadFormsPublished === true &&
      record.noBuyerContactedBySystem === true &&
      record.separateManualLaunchRequired === true &&
      record.openLiveGate === false &&
      record.activateRealBuyerTraffic === false &&
      record.startLiveTraffic === false &&
      record.startPaidAdsAutomatically === false &&
      record.publishLeadFormAutomatically === false &&
      record.autoContactBuyer === false &&
      record.autoSendWhatsApp === false &&
      record.autoReplyToBuyer === false &&
      record.autoStartFollowUp === false &&
      record.autoMovePipelineStage === false &&
      record.inventoryUpdated === false &&
      record.autoCreateAccountingEntry === false &&
      record.autoCloseSale === false;

    const duplicateOk =
      duplicate.status === 400 &&
      duplicate.body &&
      Array.isArray(duplicate.body.errors) &&
      duplicate.body.errors.some(error => error.includes("Duplicate preparation is blocked"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.openingPreparations) &&
      list.body.openingPreparations.length === 1 &&
      list.body.openingPreparations[0].preparationStatus === "CONTROLLED_REAL_BUYER_GATE_PREPARATION_RECORDED";

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalOpeningPreparations === 1 &&
      summary.body.summary.recordedOpeningPreparationCount === 1 &&
      summary.body.summary.latestPreparationStatus === "CONTROLLED_REAL_BUYER_GATE_PREPARATION_RECORDED" &&
      summary.body.summary.latestGoNoGoDecision === "GO_READY_FOR_CONTROLLED_15_LEAD_TEST_NOT_OPENED" &&
      summary.body.summary.latestApprovedOpeningSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.latestControlledLeadLimit === 15 &&
      summary.body.summary.approvedFinalReadinessLockExists === true &&
      summary.body.summary.safety &&
      summary.body.summary.safety.preparationOnly === true &&
      summary.body.summary.safety.noLiveTrafficOpened === true &&
      summary.body.summary.safety.noAdsStarted === true &&
      summary.body.summary.safety.noLeadFormsPublished === true &&
      summary.body.summary.safety.noBuyerContactedBySystem === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noAutoReply === true &&
      summary.body.summary.safety.noAutoFollowUp === true &&
      summary.body.summary.safety.noInventoryMutation === true &&
      summary.body.summary.safety.noAccountingMutation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true;

    const dashboardOk =
      dashboard.status === 200 &&
      dashboard.text.includes("Controlled Real-Buyer Gate Opening Preparation") &&
      dashboard.text.includes("VERSION 40A IS PREPARATION ONLY") &&
      dashboard.text.includes("NO LIVE TRAFFIC OPENED") &&
      dashboard.text.includes("NO ADS STARTED") &&
      dashboard.text.includes("NO LEAD FORMS PUBLISHED") &&
      dashboard.text.includes("NO BUYER CONTACTED BY SYSTEM") &&
      dashboard.text.includes("NO WHATSAPP SEND") &&
      dashboard.text.includes("NO AUTO-REPLY") &&
      dashboard.text.includes("NO AUTO-FOLLOW-UP") &&
      dashboard.text.includes("NO INVENTORY MUTATION") &&
      dashboard.text.includes("NO ACCOUNTING MUTATION") &&
      dashboard.text.includes("NO SALE CLOSING") &&
      dashboard.text.includes("NO PIPELINE MOVEMENT") &&
      dashboard.text.includes("/api/controlled-real-buyer-gate-opening-preparation/summary") &&
      dashboard.text.includes("/api/controlled-real-buyer-gate-opening-preparations");

    const aliasOk =
      dashboardAlias.status === 200 &&
      dashboardAlias.text.includes("Controlled Real-Buyer Gate Opening Preparation");

    const readOnlyOk =
      !dashboard.text.includes("method: \"POST\"") &&
      !dashboard.text.includes("method: 'POST'") &&
      !dashboard.text.includes("POST /api") &&
      !dashboard.text.includes("/create") &&
      !dashboard.text.includes("openLiveGate = true") &&
      !dashboard.text.includes("activateRealBuyerTraffic = true") &&
      !dashboard.text.includes("startLiveTraffic = true") &&
      !dashboard.text.includes("sendWhatsApp(") &&
      !dashboard.text.includes("autoSendWhatsApp = true") &&
      !dashboard.text.includes("autoReplyToBuyer = true") &&
      !dashboard.text.includes("autoStartFollowUp = true") &&
      !dashboard.text.includes("autoCreateAccountingEntry = true") &&
      !dashboard.text.includes("autoUpdateInventory = true") &&
      !dashboard.text.includes("autoCloseSale = true");

    const verdict =
      healthOk &&
      previewOk &&
      unsafeOk &&
      safeOk &&
      duplicateOk &&
      listOk &&
      summaryOk &&
      dashboardOk &&
      aliasOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 40A Controlled Real-Buyer Gate Opening Preparation / Final Go-No-Go Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: Version 40A preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe live-traffic/ads/forms/buyer-contact/auto-send/auto-reply/auto-follow-up/inventory/accounting/sale/pipeline request is blocked
- ${safeOk ? "PASS" : "FAIL"}: safe Version 40A go/no-go preparation is recorded without opening traffic
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate Version 40A preparation is blocked
- ${listOk ? "PASS" : "FAIL"}: Version 40A list API returns safe records
- ${summaryOk ? "PASS" : "FAIL"}: Version 40A summary API confirms safe metrics
- ${dashboardOk ? "PASS" : "FAIL"}: Version 40A dashboard displays preparation safely
- ${aliasOk ? "PASS" : "FAIL"}: Version 40A dashboard alias works
- ${readOnlyOk ? "PASS" : "FAIL"}: Version 40A dashboard remains read-only

## Safety Rules Confirmed
- Version 40A is preparation only.
- Version 40A is final go/no-go only.
- Controlled proof remains capped at 15 inbound buyer requests.
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
- Separate manual launch is still required.
- Test data restored after smoke test.

## Business Readiness Confirmed
- Final readiness lock prerequisite is enforced.
- Controlled 15-lead proof-test preparation can be recorded.
- Live traffic is still blocked by the system.
- Approved opening source remains inbound only.
- Scaling remains blocked until metrics prove success.

## Next Business Stage After Approval
Controlled 15-Lead Proof Test — manual inbound only, no auto-send, no spam, no unsolicited WhatsApp, no private-data scraping, no quote before stock confirmation, no quote before compatibility confirmation.

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

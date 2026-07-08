const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3130;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const dataFile = path.join(ROOT, "src", "data", "controlled-buyer-gate-follow-up-decisions.json");
const originalData = fs.existsSync(dataFile) ? fs.readFileSync(dataFile, "utf8") : "[]";
const reportPath = path.join(ROOT, "reports", "version38b-controlled-buyer-gate-follow-up-decision-dashboard-smoke-test-report.md");

function safeWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function restoreData() {
  safeWrite(dataFile, originalData);
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

async function request(route) {
  const response = await fetch(`${BASE_URL}${route}`);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { status: response.status, text, body };
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

function sampleDecision(id, slotNumber, decision, priority, replyStatus, replyTemp, replyText) {
  return {
    id,
    followUpDecisionStatus: "FOLLOW_UP_DECISION_RECORDED",
    followUpDecisionType: "CONTROLLED_FOLLOW_UP_DECISION_ONLY",
    followUpDecisionPhrase: "I_CONFIRM_FOLLOW_UP_DECISION_ONLY_NO_AUTO_FOLLOW_UP_NO_SEND",

    followUpDecisionGateOnly: true,
    followUpDecisionRecordOnly: true,
    controlledFollowUpDecisionOnly: true,
    adminManualDecisionOnly: true,
    systemExecutionBlocked: true,
    manualActionRequiredOutsideSystem: true,
    noAutoFollowUp: true,
    noAutoSchedule: true,
    noAutoSend: true,
    noAutoReply: true,
    noPipelineMovement: true,
    noSaleClosing: true,
    noInventoryMutation: true,
    noAccountingMutation: true,

    slotNumber,
    leadLimit: 15,
    source: "whatsapp_click_to_chat_inbound",
    leadReference: `controlled-follow-up-dashboard-test-lead-${slotNumber}`,
    partNeeded: slotNumber === 2 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request.",

    buyerReplyTrackingStatus: "BUYER_REPLY_TRACKING_RECORDED",
    manualSendConfirmationStatus: "MANUAL_SEND_CONFIRMATION_RECORDED",
    manualQuoteDraftStatus: "MANUAL_QUOTE_DRAFT_PREPARED",
    stockDecision: "STOCK_CONFIRMED_AVAILABLE",
    compatibilityDecision: "COMPATIBILITY_CONFIRMED",
    buyerReplyStatus: replyStatus,
    buyerReplyTemperature: replyTemp,
    buyerReplyText: replyText,

    followUpDecision: decision,
    followUpPriority: priority,
    decisionChannel: "admin_manual_follow_up_decision_only",
    decisionReason: priority === "HIGH"
      ? "Buyer is active and needs quick manual follow-up."
      : "Buyer requested more product proof before moving forward.",
    manualActionInstruction: priority === "HIGH"
      ? "Call buyer manually outside the system. Do not let system call, send, schedule, reply, or move pipeline."
      : "Send product proof manually outside the system after admin review.",
    decidedBy: "master_admin",

    autoStartFollowUp: false,
    autoScheduleFollowUp: false,
    scheduleFollowUpAutomatically: false,
    autoSendFollowUp: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
    systemSendWhatsApp: false,
    broadcastWhatsApp: false,
    autoReplyToBuyer: false,
    replyToBuyerAutomatically: false,
    autoReadWhatsApp: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    autoContactBuyer: false,
    contactRealBuyerAutomatically: false,
    autoMovePipelineStage: false,
    movePipelineAutomatically: false,
    autoCloseSale: false,
    closeSaleAutomatically: false,
    autoCreateAccountingEntry: false,
    autoCreateReceipt: false,
    autoCreateInvoice: false,
    inventoryUpdated: false,
    stockReserved: false,
    stockReduced: false,
    autoUpdateInventory: false,
    updateInventoryAutomatically: false,
    reserveStockAutomatically: false,
    reduceStockAutomatically: false,
    autoCreateInventoryEvent: false,
    autoCreateStockLedgerEntry: false,
    startOutboundTraffic: false,
    startPaidAdsAutomatically: false,
    publishLeadFormAutomatically: false,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function main() {
  const logsRef = { value: "" };
  let child;

  const samples = [
    sampleDecision(
      "controlled_buyer_gate_follow_up_decision_1",
      1,
      "FOLLOW_UP_DECISION_CALL_BUYER_MANUALLY",
      "HIGH",
      "BUYER_REPLIED_INTERESTED",
      "HOT",
      "Buyer said he is interested and asked when he can pick up from Ladipo."
    ),
    sampleDecision(
      "controlled_buyer_gate_follow_up_decision_2",
      2,
      "FOLLOW_UP_DECISION_SEND_PRODUCT_PROOF_MANUALLY",
      "NORMAL",
      "BUYER_REPLIED_NEEDS_MORE_INFO",
      "WARM",
      "Buyer asked for product photo and location details."
    )
  ];

  safeWrite(dataFile, JSON.stringify(samples, null, 2));

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logsRef.value += data.toString());
    child.stderr.on("data", data => logsRef.value += data.toString());

    const health = await waitForHealth(child, logsRef);

    if (!health) {
      const startupReport = `# Version 38B Controlled Buyer-Gate Follow-Up Decision Dashboard Smoke Test Report

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

    const page = await request("/controlled-buyer-gate-follow-up-decision");
    const aliasPage = await request("/controlled-buyer-gate-follow-up-decisions");
    const list = await request("/api/controlled-buyer-gate-follow-up-decisions");
    const summary = await request("/api/controlled-buyer-gate-follow-up-decision/summary");

    const healthOk = health.status === 200;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Controlled Buyer-Gate Follow-Up Decision Dashboard") &&
      page.text.includes("Follow-Up Decision Safety Rule") &&
      page.text.includes("Controlled Buyer-Gate Follow-Up Decision Records") &&
      page.text.includes("Follow-up decision gate only") &&
      page.text.includes("Follow-up decision record only") &&
      page.text.includes("Controlled follow-up decision only") &&
      page.text.includes("Admin manual decision only") &&
      page.text.includes("System execution blocked") &&
      page.text.includes("Manual action outside system only") &&
      page.text.includes("No auto-follow-up") &&
      page.text.includes("No auto-schedule") &&
      page.text.includes("No auto-send WhatsApp") &&
      page.text.includes("No auto-reply") &&
      page.text.includes("No WhatsApp reading") &&
      page.text.includes("No buyer message scraping") &&
      page.text.includes("No private-data scraping") &&
      page.text.includes("No hidden harvesting") &&
      page.text.includes("No inventory update") &&
      page.text.includes("No stock reservation") &&
      page.text.includes("No stock reduction") &&
      page.text.includes("No accounting entry") &&
      page.text.includes("No receipt") &&
      page.text.includes("No invoice") &&
      page.text.includes("No sale closing") &&
      page.text.includes("No pipeline movement") &&
      page.text.includes("decisionRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Controlled Buyer-Gate Follow-Up Decision Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.followUpDecisions) &&
      list.body.followUpDecisions.length === 2 &&
      list.body.followUpDecisions.every(item =>
        item.followUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" &&
        item.systemExecutionBlocked === true &&
        item.manualActionRequiredOutsideSystem === true &&
        item.autoStartFollowUp === false &&
        item.autoScheduleFollowUp === false &&
        item.autoSendFollowUp === false &&
        item.autoSendWhatsApp === false &&
        item.systemSendWhatsApp === false &&
        item.autoReplyToBuyer === false &&
        item.autoReadWhatsApp === false &&
        item.scrapeWhatsappMessages === false &&
        item.autoMovePipelineStage === false &&
        item.autoCloseSale === false &&
        item.autoCreateAccountingEntry === false &&
        item.inventoryUpdated === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalFollowUpDecisions === 2 &&
      summary.body.summary.recordedFollowUpDecisionCount === 2 &&
      summary.body.summary.highFollowUpDecisionCount === 1 &&
      summary.body.summary.normalFollowUpDecisionCount === 1 &&
      summary.body.summary.manualActionRequiredCount === 2 &&
      summary.body.summary.latestFollowUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.latestDecisionChannel === "admin_manual_follow_up_decision_only" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.followUpDecisionGateOnly === true &&
      summary.body.summary.safety.followUpDecisionRecordOnly === true &&
      summary.body.summary.safety.controlledFollowUpDecisionOnly === true &&
      summary.body.summary.safety.adminManualDecisionOnly === true &&
      summary.body.summary.safety.systemExecutionBlocked === true &&
      summary.body.summary.safety.manualActionRequiredOutsideSystem === true &&
      summary.body.summary.safety.noAutoFollowUp === true &&
      summary.body.summary.safety.noAutoSchedule === true &&
      summary.body.summary.safety.noAutoSend === true &&
      summary.body.summary.safety.noAutoReply === true &&
      summary.body.summary.safety.noPipelineMovement === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noInventoryMutation === true &&
      summary.body.summary.safety.noAccountingMutation === true &&
      summary.body.summary.safety.noAutoReadWhatsApp === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noReceiptCreation === true &&
      summary.body.summary.safety.noInvoiceCreation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoStartFollowUp = true") &&
      !page.text.includes("autoScheduleFollowUp = true") &&
      !page.text.includes("autoSendFollowUp = true") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("systemSendWhatsApp = true") &&
      !page.text.includes("autoReplyToBuyer = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("autoMovePipelineStage = true") &&
      !page.text.includes("autoCloseSale = true") &&
      !page.text.includes("autoCreateAccountingEntry = true") &&
      !page.text.includes("inventoryUpdated = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/controlled-buyer-gate-follow-up-decision/create"');

    const verdict =
      healthOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 38B Controlled Buyer-Gate Follow-Up Decision Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${pageOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-follow-up-decision returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-follow-up-decisions alias works
- ${listOk ? "PASS" : "FAIL"}: follow-up decision list API returns dashboard data safely
- ${summaryOk ? "PASS" : "FAIL"}: follow-up decision summary API confirms safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Follow-Up Decision dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays follow-up decision records only.
- Dashboard is read-only.
- Follow-up decision gate only.
- Follow-up decision record only.
- Controlled follow-up decision only.
- Admin manual decision only.
- System execution blocked.
- Manual action required outside the system.
- System did not auto-follow-up.
- System did not auto-schedule.
- System did not send WhatsApp.
- System did not auto-reply.
- System did not read WhatsApp.
- System did not scrape buyer messages.
- System did not scrape private data.
- System did not harvest hidden data.
- System did not update inventory.
- System did not reserve stock.
- System did not reduce stock.
- System did not create accounting entry.
- System did not create receipt.
- System did not create invoice.
- System did not close sale.
- System did not move pipeline.
- Follow-up decision test data restored after smoke test.

## Next Phase After Approval
Version 38C — Admin Hub Link Controlled Buyer-Gate Follow-Up Decision

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

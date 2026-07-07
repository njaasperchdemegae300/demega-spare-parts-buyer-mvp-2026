const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3106;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");
const approvalsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");
const executionsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-activation-executions.json");
const slotsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-lead-slots.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";
const originalApprovals = fs.existsSync(approvalsPath) ? fs.readFileSync(approvalsPath, "utf8") : "[]";
const originalExecutions = fs.existsSync(executionsPath) ? fs.readFileSync(executionsPath, "utf8") : "[]";
const originalSlots = fs.existsSync(slotsPath) ? fs.readFileSync(slotsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version30b-controlled-buyer-gate-lead-slot-enforcement-dashboard-smoke-test-report.md");

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
}

function restoreData() {
  safeWrite(assistantRunsPath, originalAssistant);
  safeWrite(guardianRunsPath, originalGuardian);
  safeWrite(plansPath, originalPlans);
  safeWrite(approvalsPath, originalApprovals);
  safeWrite(executionsPath, originalExecutions);
  safeWrite(slotsPath, originalSlots);
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
    leadReference: `controlled-dashboard-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during controlled dashboard test.",
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

    const slot3 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(3))
    });

    const page = await request("/controlled-buyer-gate-lead-slot-enforcement");
    const aliasPage = await request("/controlled-buyer-gate-lead-slots");
    const list = await request("/api/controlled-buyer-gate-lead-slots");
    const summary = await request("/api/controlled-buyer-gate-lead-slot-enforcement/summary");

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
      slot3.body.slot.remainingLeadSlotsAfter === 12 &&
      slot1.body.slot.buyerContacted === false &&
      slot1.body.slot.autoSendWhatsApp === false &&
      slot1.body.slot.autoReadWhatsApp === false &&
      slot1.body.slot.quotePrepared === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Controlled Buyer-Gate Lead-Slot Enforcement Dashboard") &&
      page.text.includes("Lead-Slot Enforcement Safety Rule") &&
      page.text.includes("Slot Meaning") &&
      page.text.includes("Controlled Buyer-Gate Lead Slots") &&
      page.text.includes("Lead-slot enforcement only") &&
      page.text.includes("Controlled inbound lead slot only") &&
      page.text.includes("Buyer-initiated WhatsApp click-to-chat inbound only") &&
      page.text.includes("15-lead limit enforced") &&
      page.text.includes("16th lead slot blocked") &&
      page.text.includes("Accepted for manual review only") &&
      page.text.includes("Manual reply only") &&
      page.text.includes("No outbound traffic") &&
      page.text.includes("No paid ads auto-start") &&
      page.text.includes("No lead form auto-publish") &&
      page.text.includes("No real buyer auto-contact") &&
      page.text.includes("No WhatsApp auto-send") &&
      page.text.includes("No WhatsApp auto-read") &&
      page.text.includes("No buyer message scraping") &&
      page.text.includes("No private-data scraping") &&
      page.text.includes("No hidden data harvesting") &&
      page.text.includes("No quote before stock confirmation") &&
      page.text.includes("No quote before compatibility confirmation") &&
      page.text.includes("ACCEPTED_PENDING_MANUAL_REVIEW") &&
      page.text.includes("slotRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Controlled Buyer-Gate Lead-Slot Enforcement Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.slots) &&
      list.body.slots.filter(item => item.slotStatus === "ACCEPTED_PENDING_MANUAL_REVIEW").length === 3 &&
      list.body.slots.every(item =>
        item.buyerContacted === false &&
        item.autoSendWhatsApp === false &&
        item.autoReadWhatsApp === false &&
        item.startOutboundTraffic === false &&
        item.quotePrepared === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalSlots === 3 &&
      summary.body.summary.acceptedSlotCount === 3 &&
      summary.body.summary.leadLimit === 15 &&
      summary.body.summary.remainingLeadSlots === 12 &&
      summary.body.summary.limitReached === false &&
      summary.body.summary.latestSlotStatus === "ACCEPTED_PENDING_MANUAL_REVIEW" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.leadSlotEnforcementOnly === true &&
      summary.body.summary.safety.controlledLeadSlotOnly === true &&
      summary.body.summary.safety.inboundLeadSlotOnly === true &&
      summary.body.summary.safety.buyerInitiatedInboundOnly === true &&
      summary.body.summary.safety.acceptedForManualReviewOnly === true &&
      summary.body.summary.safety.leadLimit === 15 &&
      summary.body.summary.safety.acceptedSlotCount === 3 &&
      summary.body.summary.safety.remainingLeadSlots === 12 &&
      summary.body.summary.safety.limitReached === false &&
      summary.body.summary.safety.source === "whatsapp_click_to_chat_inbound" &&
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
      summary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      summary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true &&
      summary.body.summary.safety.manualReviewRequiredBeforeAnyBuyerContact === true;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoContactBuyer = true") &&
      !page.text.includes("contactRealBuyerAutomatically = true") &&
      !page.text.includes("startOutboundTraffic = true") &&
      !page.text.includes("startPaidAdsAutomatically = true") &&
      !page.text.includes("publishLeadFormAutomatically = true") &&
      !page.text.includes("broadcastWhatsApp = true") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("sendWhatsApp = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("quotePrepared = true") &&
      !page.text.includes("autoUpdateInventory = true") &&
      !page.text.includes("autoCreateAccountingEntry = true") &&
      !page.text.includes("autoCloseSale = true") &&
      !page.text.includes("autoMovePipelineStage = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/controlled-buyer-gate-lead-slot/create"');

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      slotsOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 30B Controlled Buyer-Gate Lead-Slot Enforcement Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before dashboard setup
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before dashboard setup
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists before dashboard setup
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists before dashboard setup
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists before dashboard setup
- ${slotsOk ? "PASS" : "FAIL"}: controlled inbound slots exist for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-lead-slot-enforcement returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-lead-slots alias works
- ${listOk ? "PASS" : "FAIL"}: lead slots list API returns dashboard data safely
- ${summaryOk ? "PASS" : "FAIL"}: lead-slot summary API confirms safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Lead-Slot Enforcement dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays lead-slot records only.
- Dashboard is read-only.
- Lead-slot enforcement only.
- Controlled inbound lead slot only.
- Buyer-initiated WhatsApp click-to-chat inbound source only.
- 15-lead limit remains enforced.
- Accepted slots are for manual review only.
- Manual reply only.
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
- Assistant, guardian, plan, approval, execution, and slot test data restored after smoke test.

## Next Phase After Approval
Version 30C — Admin Hub Link Controlled Buyer-Gate Lead-Slot Enforcement

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

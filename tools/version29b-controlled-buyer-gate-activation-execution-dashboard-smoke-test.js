const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3103;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");
const approvalsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");
const executionsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-activation-executions.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";
const originalApprovals = fs.existsSync(approvalsPath) ? fs.readFileSync(approvalsPath, "utf8") : "[]";
const originalExecutions = fs.existsSync(executionsPath) ? fs.readFileSync(executionsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version29b-controlled-buyer-gate-activation-execution-dashboard-smoke-test-report.md");

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
}

function restoreData() {
  safeWrite(assistantRunsPath, originalAssistant);
  safeWrite(guardianRunsPath, originalGuardian);
  safeWrite(plansPath, originalPlans);
  safeWrite(approvalsPath, originalApprovals);
  safeWrite(executionsPath, originalExecutions);
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

    const page = await request("/controlled-buyer-gate-activation-execution");
    const aliasPage = await request("/controlled-buyer-gate-activation-executions");
    const list = await request("/api/controlled-buyer-gate-activation-executions");
    const summary = await request("/api/controlled-buyer-gate-activation-execution/summary");

    const execution = executionCreate.body && executionCreate.body.execution;

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
      execution &&
      execution.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY" &&
      execution.activationExecutionGateOnly === true &&
      execution.controlledGateActive === true &&
      execution.controlledManualInboundOnly === true &&
      execution.controlled15LeadLimit === true &&
      execution.buyerGateOpenForManualInboundOnly === true &&
      execution.leadLimit === 15 &&
      execution.acceptedLeadCount === 0 &&
      execution.remainingLeadSlots === 15 &&
      execution.testSource === "whatsapp_click_to_chat_inbound" &&
      execution.liveTrafficPushStarted === false &&
      execution.outboundTrafficStarted === false &&
      execution.realBuyerContacted === false &&
      execution.autoContactBuyer === false &&
      execution.autoSendWhatsApp === false &&
      execution.autoReadWhatsApp === false &&
      execution.scrapeWhatsappMessages === false &&
      execution.privateMessageScraping === false &&
      execution.hiddenDataHarvesting === false &&
      execution.quoteBeforeStockConfirmation === false &&
      execution.quoteBeforeCompatibilityConfirmation === false &&
      execution.autoUpdateInventory === false &&
      execution.autoCreateAccountingEntry === false &&
      execution.autoCloseSale === false &&
      execution.autoMovePipelineStage === false &&
      execution.requiresLeadSlotEnforcementNext === true &&
      execution.requiresManualReviewBeforeAnyBuyerContact === true;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Controlled Buyer-Gate Activation Execution Dashboard") &&
      page.text.includes("Controlled Activation Safety Rule") &&
      page.text.includes("Activation Meaning") &&
      page.text.includes("Controlled Buyer-Gate Activation Executions") &&
      page.text.includes("CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY") &&
      page.text.includes("Controlled 15-lead manual inbound gate only") &&
      page.text.includes("WhatsApp click-to-chat inbound only") &&
      page.text.includes("Accepted leads start at 0") &&
      page.text.includes("Remaining slots start at 15") &&
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
      page.text.includes("Lead-slot enforcement required next") &&
      page.text.includes("executionRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Controlled Buyer-Gate Activation Execution Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.executions) &&
      list.body.executions.some(item =>
        item.id === execution.id &&
        item.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY" &&
        item.controlledGateActive === true &&
        item.remainingLeadSlots === 15 &&
        item.liveTrafficPushStarted === false &&
        item.outboundTrafficStarted === false &&
        item.realBuyerContacted === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalExecutions >= 1 &&
      summary.body.summary.latestActivationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY" &&
      summary.body.summary.latestLeadLimit === 15 &&
      summary.body.summary.latestTestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.latestRemainingLeadSlots === 15 &&
      summary.body.summary.activeManualInboundGateCount === 1 &&
      summary.body.summary.outboundTrafficStartedCount === 0 &&
      summary.body.summary.autoContactCount === 0 &&
      summary.body.summary.safety &&
      summary.body.summary.safety.activationExecutionGateOnly === true &&
      summary.body.summary.safety.controlledGateActiveManualInboundOnly === true &&
      summary.body.summary.safety.controlledManualInboundOnly === true &&
      summary.body.summary.safety.controlled15LeadLimit === true &&
      summary.body.summary.safety.buyerGateOpenForManualInboundOnly === true &&
      summary.body.summary.safety.leadLimit === 15 &&
      summary.body.summary.safety.remainingLeadSlots === 15 &&
      summary.body.summary.safety.liveTrafficPushStarted === false &&
      summary.body.summary.safety.outboundTrafficStarted === false &&
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
      summary.body.summary.safety.leadSlotEnforcementRequiredNext === true &&
      summary.body.summary.safety.manualReviewRequiredBeforeAnyBuyerContact === true &&
      summary.body.summary.safety.inboundBuyerInitiatedContactRequired === true;

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
      !page.text.includes("autoUpdateInventory = true") &&
      !page.text.includes("autoCreateAccountingEntry = true") &&
      !page.text.includes("autoCloseSale = true") &&
      !page.text.includes("autoMovePipelineStage = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/controlled-buyer-gate-activation-execution/create"');

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 29B Controlled Buyer-Gate Activation Execution Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before dashboard setup
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before dashboard setup
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists before dashboard setup
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists before dashboard setup
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-activation-execution returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-activation-executions alias works
- ${listOk ? "PASS" : "FAIL"}: activation execution list API returns dashboard data
- ${summaryOk ? "PASS" : "FAIL"}: activation execution summary API confirms safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Activation Execution dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays activation execution records only.
- Dashboard is read-only.
- Controlled 15-lead manual inbound gate only.
- Source remains WhatsApp click-to-chat inbound.
- Accepted lead count starts at 0.
- Remaining lead slots start at 15.
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
- Lead-slot enforcement gate remains required next.
- Assistant, guardian, plan, approval, and execution test data restored after smoke test.

## Next Phase After Approval
Version 29C — Admin Hub Link Controlled Buyer-Gate Activation Execution

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

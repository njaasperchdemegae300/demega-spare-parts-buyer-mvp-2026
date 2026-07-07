const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3104;
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

const reportPath = path.join(ROOT, "reports", "version29c-admin-hub-link-controlled-buyer-gate-activation-execution-smoke-test-report.md");

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

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const executionPage = await request("/controlled-buyer-gate-activation-execution");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const executionSummary = await request("/api/controlled-buyer-gate-activation-execution/summary");

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

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Activation Execution") &&
      hub.text.includes("/controlled-buyer-gate-activation-execution") &&
      hub.text.includes("Activation Executions") &&
      hub.text.includes("Latest Activation Status") &&
      hub.text.includes("Activation Lead Limit") &&
      hub.text.includes("Activation Source") &&
      hub.text.includes("Remaining Lead Slots") &&
      hub.text.includes("Manual Inbound Gates") &&
      hub.text.includes("Outbound Started") &&
      hub.text.includes("Auto Contact Count") &&
      hub.text.includes("CONTROLLED ACTIVATION EXECUTION DASHBOARD ONLY") &&
      hub.text.includes("MANUAL INBOUND GATE ONLY") &&
      hub.text.includes("15-LEAD LIMIT ACTIVE") &&
      hub.text.includes("NO OUTBOUND TRAFFIC") &&
      hub.text.includes("NO BUYER AUTO-CONTACT") &&
      hub.text.includes("LEAD-SLOT ENFORCEMENT REQUIRED NEXT");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Activation Execution") &&
      alias.text.includes("/controlled-buyer-gate-activation-execution");

    const executionLinkedOk =
      executionPage.status === 200 &&
      executionPage.text.includes("Demega Controlled Buyer-Gate Activation Execution Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Activation Execution" &&
        module.path === "/controlled-buyer-gate-activation-execution"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateActivationExecutionOnly === true &&
      summary.body.safety.activationExecutionGateOnly === true &&
      summary.body.safety.controlledGateActiveManualInboundOnly === true &&
      summary.body.safety.controlledManualInboundOnly === true &&
      summary.body.safety.buyerGateOpenForManualInboundOnly === true &&
      summary.body.safety.leadLimit === 15 &&
      summary.body.safety.acceptedLeadCount === 0 &&
      summary.body.safety.remainingLeadSlots === 15 &&
      summary.body.safety.chosenFirstSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.safety.buyerGateOpened === true &&
      summary.body.safety.buyerGateOpenedForManualInboundOnly === true &&
      summary.body.safety.openLiveBuyerGate === false &&
      summary.body.safety.activateBuyerGate === false &&
      summary.body.safety.enableLiveTraffic === false &&
      summary.body.safety.startLiveBuyerTraffic === false &&
      summary.body.safety.liveTrafficActivated === false &&
      summary.body.safety.liveTrafficPushStarted === false &&
      summary.body.safety.outboundTrafficStarted === false &&
      summary.body.safety.startOutboundTraffic === false &&
      summary.body.safety.startPaidAdsAutomatically === false &&
      summary.body.safety.publishLeadFormAutomatically === false &&
      summary.body.safety.realBuyerContacted === false &&
      summary.body.safety.autoContactBuyer === false &&
      summary.body.safety.contactRealBuyerAutomatically === false &&
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
      summary.body.safety.autoUpdateInventory === false &&
      summary.body.safety.autoCreateAccountingEntry === false &&
      summary.body.safety.autoCloseSale === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.quoteBeforeStockConfirmation === false &&
      summary.body.safety.quoteBeforeCompatibilityConfirmation === false &&
      summary.body.safety.leadSlotEnforcementRequiredNext === true &&
      summary.body.safety.manualReviewRequiredBeforeAnyBuyerContact === true &&
      summary.body.safety.inboundBuyerInitiatedContactRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.controlledBuyerGateActivationExecution &&
      typeof metrics.body.metrics.controlledBuyerGateActivationExecution.totalExecutions === "number" &&
      metrics.body.metrics.controlledBuyerGateActivationExecution.latestActivationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY" &&
      metrics.body.metrics.controlledBuyerGateActivationExecution.latestLeadLimit === 15 &&
      metrics.body.metrics.controlledBuyerGateActivationExecution.latestTestSource === "whatsapp_click_to_chat_inbound" &&
      metrics.body.metrics.controlledBuyerGateActivationExecution.latestRemainingLeadSlots === 15 &&
      metrics.body.metrics.controlledBuyerGateActivationExecution.outboundTrafficStartedCount === 0 &&
      metrics.body.metrics.controlledBuyerGateActivationExecution.autoContactCount === 0 &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateActivationExecutionOnly === true &&
      metrics.body.safety.activationExecutionGateOnly === true &&
      metrics.body.safety.controlledManualInboundOnly === true &&
      metrics.body.safety.liveTrafficPushStarted === false &&
      metrics.body.safety.outboundTrafficStarted === false &&
      metrics.body.safety.realBuyerContacted === false &&
      metrics.body.safety.autoContactBuyer === false &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const executionSummaryOk =
      executionSummary.status === 200 &&
      executionSummary.body &&
      executionSummary.body.summary &&
      executionSummary.body.summary.totalExecutions >= 1 &&
      executionSummary.body.summary.latestActivationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY" &&
      executionSummary.body.summary.latestLeadLimit === 15 &&
      executionSummary.body.summary.latestTestSource === "whatsapp_click_to_chat_inbound" &&
      executionSummary.body.summary.latestRemainingLeadSlots === 15 &&
      executionSummary.body.summary.activeManualInboundGateCount === 1 &&
      executionSummary.body.summary.outboundTrafficStartedCount === 0 &&
      executionSummary.body.summary.autoContactCount === 0 &&
      executionSummary.body.summary.safety &&
      executionSummary.body.summary.safety.activationExecutionGateOnly === true &&
      executionSummary.body.summary.safety.controlledGateActiveManualInboundOnly === true &&
      executionSummary.body.summary.safety.controlledManualInboundOnly === true &&
      executionSummary.body.summary.safety.controlled15LeadLimit === true &&
      executionSummary.body.summary.safety.buyerGateOpenForManualInboundOnly === true &&
      executionSummary.body.summary.safety.leadLimit === 15 &&
      executionSummary.body.summary.safety.remainingLeadSlots === 15 &&
      executionSummary.body.summary.safety.liveTrafficPushStarted === false &&
      executionSummary.body.summary.safety.outboundTrafficStarted === false &&
      executionSummary.body.summary.safety.noPaidAdsStartedAutomatically === true &&
      executionSummary.body.summary.safety.noLeadFormPublishedAutomatically === true &&
      executionSummary.body.summary.safety.noRealBuyerContacted === true &&
      executionSummary.body.summary.safety.noAutoContactBuyer === true &&
      executionSummary.body.summary.safety.noAutoSendWhatsApp === true &&
      executionSummary.body.summary.safety.noWhatsappAutoRead === true &&
      executionSummary.body.summary.safety.noBuyerMessageReading === true &&
      executionSummary.body.summary.safety.noWhatsappScraping === true &&
      executionSummary.body.summary.safety.noPrivateDataScraping === true &&
      executionSummary.body.summary.safety.noHiddenDataHarvesting === true &&
      executionSummary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      executionSummary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      executionSummary.body.summary.safety.noInventoryUpdate === true &&
      executionSummary.body.summary.safety.noAccountingEntryCreation === true &&
      executionSummary.body.summary.safety.noSaleClosing === true &&
      executionSummary.body.summary.safety.noPipelineMovement === true &&
      executionSummary.body.summary.safety.leadSlotEnforcementRequiredNext === true &&
      executionSummary.body.summary.safety.manualReviewRequiredBeforeAnyBuyerContact === true &&
      executionSummary.body.summary.safety.inboundBuyerInitiatedContactRequired === true;

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
      hubOk &&
      aliasOk &&
      executionLinkedOk &&
      summaryOk &&
      metricsOk &&
      executionSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 29C Admin Hub Link Controlled Buyer-Gate Activation Execution Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before Admin Hub metrics
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before Admin Hub metrics
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists before Admin Hub metrics
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists before Admin Hub metrics
- ${executionOk ? "PASS" : "FAIL"}: controlled activation execution exists before Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Controlled Buyer-Gate Activation Execution link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Controlled Buyer-Gate Activation Execution
- ${executionLinkedOk ? "PASS" : "FAIL"}: linked Controlled Buyer-Gate Activation Execution dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Controlled Buyer-Gate Activation Execution module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Controlled Buyer-Gate Activation Execution metrics safely
- ${executionSummaryOk ? "PASS" : "FAIL"}: Controlled Buyer-Gate Activation Execution summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Controlled Buyer-Gate Activation Execution link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Activation Execution Admin Hub link is read-only.
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
- Metrics API remains read-only.
- Lead-slot enforcement gate remains required next.
- Manual review remains required before any buyer contact.
- Assistant, guardian, plan, approval, and execution test data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Activation Execution metrics.
- Admin Hub now links directly to the Activation Execution dashboard.
- Gate is active only for controlled manual inbound lead acceptance.
- Next required build is lead-slot enforcement before counting real inbound leads.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 30A — Controlled Buyer-Gate Lead-Slot Enforcement Foundation
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

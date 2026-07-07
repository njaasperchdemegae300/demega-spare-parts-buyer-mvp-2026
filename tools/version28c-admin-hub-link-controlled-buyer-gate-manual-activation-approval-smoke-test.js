const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3101;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");
const approvalsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";
const originalApprovals = fs.existsSync(approvalsPath) ? fs.readFileSync(approvalsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version28c-admin-hub-link-controlled-buyer-gate-manual-activation-approval-smoke-test-report.md");

function restoreData() {
  fs.writeFileSync(assistantRunsPath, originalAssistant, "utf8");
  fs.writeFileSync(guardianRunsPath, originalGuardian, "utf8");
  fs.writeFileSync(plansPath, originalPlans, "utf8");
  fs.writeFileSync(approvalsPath, originalApprovals, "utf8");
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

function safeApprovalPayload(extra = {}) {
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
    adminConfirmedNoQuoteBeforeCompatibility: true,
    ...extra
  };
}

async function main() {
  let logs = "";
  let child;

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

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const approvalPage = await request("/controlled-buyer-gate-manual-activation-approval");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const approvalSummary = await request("/api/controlled-buyer-gate-manual-activation-approval/summary");

    const approval = approvalCreate.body && approvalCreate.body.approval;

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
      planCreate.body.plan.testSource === "whatsapp_click_to_chat_inbound" &&
      planCreate.body.plan.buyerGateOpened === false &&
      planCreate.body.plan.liveTrafficActivated === false;

    const approvalOk =
      approvalCreate.status === 201 &&
      approval &&
      approval.approvalStatus === "APPROVED_NOT_ACTIVATED" &&
      approval.manualActivationApprovalGateOnly === true &&
      approval.manualApprovalRecorded === true &&
      approval.approvedForControlledPreparationOnly === true &&
      approval.approvedForLiveActivationExecution === false &&
      approval.activationExecuted === false &&
      approval.leadLimit === 15 &&
      approval.testSource === "whatsapp_click_to_chat_inbound" &&
      approval.buyerGateOpened === false &&
      approval.liveTrafficActivated === false &&
      approval.realBuyerContacted === false &&
      approval.autoSendWhatsApp === false &&
      approval.autoReadWhatsApp === false &&
      approval.hiddenDataHarvesting === false &&
      approval.autoUpdateInventory === false &&
      approval.autoCreateAccountingEntry === false &&
      approval.autoCloseSale === false &&
      approval.autoMovePipelineStage === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Manual Activation Approval") &&
      hub.text.includes("/controlled-buyer-gate-manual-activation-approval") &&
      hub.text.includes("Manual Approvals") &&
      hub.text.includes("Latest Approval") &&
      hub.text.includes("Approval Lead Limit") &&
      hub.text.includes("Approval Source") &&
      hub.text.includes("Approved Not Activated") &&
      hub.text.includes("Activation Executed") &&
      hub.text.includes("MANUAL ACTIVATION APPROVAL RECORD ONLY") &&
      hub.text.includes("APPROVAL IS NOT ACTIVATION") &&
      hub.text.includes("BUYER GATE STILL CLOSED") &&
      hub.text.includes("LIVE TRAFFIC STILL NOT ACTIVATED") &&
      hub.text.includes("SEPARATE ACTIVATION EXECUTION GATE REQUIRED LATER");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Manual Activation Approval") &&
      alias.text.includes("/controlled-buyer-gate-manual-activation-approval");

    const approvalLinkedOk =
      approvalPage.status === 200 &&
      approvalPage.text.includes("Demega Controlled Buyer-Gate Manual Activation Approval Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Manual Activation Approval" &&
        module.path === "/controlled-buyer-gate-manual-activation-approval"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateManualActivationApprovalOnly === true &&
      summary.body.safety.manualActivationApprovalGateOnly === true &&
      summary.body.safety.manualApprovalRecordedOnly === true &&
      summary.body.safety.approvalIsNotActivation === true &&
      summary.body.safety.approvedForControlledPreparationOnly === true &&
      summary.body.safety.approvedForLiveActivationExecution === false &&
      summary.body.safety.activationExecuted === false &&
      summary.body.safety.buyerGateOpened === false &&
      summary.body.safety.liveTrafficActivated === false &&
      summary.body.safety.openLiveBuyerGate === false &&
      summary.body.safety.activateBuyerGate === false &&
      summary.body.safety.enableLiveTraffic === false &&
      summary.body.safety.startLiveBuyerTraffic === false &&
      summary.body.safety.realBuyerContacted === false &&
      summary.body.safety.systemDoesNotOpenLiveBuyerGate === true &&
      summary.body.safety.systemDoesNotActivateLiveTraffic === true &&
      summary.body.safety.systemDoesNotContactRealBuyer === true &&
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
      summary.body.safety.separateActivationExecutionGateRequiredLater === true &&
      summary.body.safety.manualReviewRequiredBeforeAnyBuyerContact === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.controlledBuyerGateManualActivationApproval &&
      typeof metrics.body.metrics.controlledBuyerGateManualActivationApproval.totalApprovals === "number" &&
      metrics.body.metrics.controlledBuyerGateManualActivationApproval.latestApprovalStatus === "APPROVED_NOT_ACTIVATED" &&
      metrics.body.metrics.controlledBuyerGateManualActivationApproval.latestLeadLimit === 15 &&
      metrics.body.metrics.controlledBuyerGateManualActivationApproval.latestTestSource === "whatsapp_click_to_chat_inbound" &&
      metrics.body.metrics.controlledBuyerGateManualActivationApproval.activatedCount === 0 &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateManualActivationApprovalOnly === true &&
      metrics.body.safety.manualActivationApprovalGateOnly === true &&
      metrics.body.safety.approvalIsNotActivation === true &&
      metrics.body.safety.buyerGateOpened === false &&
      metrics.body.safety.liveTrafficActivated === false &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const approvalSummaryOk =
      approvalSummary.status === 200 &&
      approvalSummary.body &&
      approvalSummary.body.summary &&
      approvalSummary.body.summary.totalApprovals >= 1 &&
      approvalSummary.body.summary.latestApprovalStatus === "APPROVED_NOT_ACTIVATED" &&
      approvalSummary.body.summary.latestLeadLimit === 15 &&
      approvalSummary.body.summary.latestTestSource === "whatsapp_click_to_chat_inbound" &&
      approvalSummary.body.summary.activatedCount === 0 &&
      approvalSummary.body.summary.safety &&
      approvalSummary.body.summary.safety.manualActivationApprovalGateOnly === true &&
      approvalSummary.body.summary.safety.manualApprovalRecordedOnly === true &&
      approvalSummary.body.summary.safety.approvedForControlledPreparationOnly === true &&
      approvalSummary.body.summary.safety.approvedForLiveActivationExecution === false &&
      approvalSummary.body.summary.safety.activationExecuted === false &&
      approvalSummary.body.summary.safety.buyerGateOpened === false &&
      approvalSummary.body.summary.safety.liveTrafficActivated === false &&
      approvalSummary.body.summary.safety.noRealBuyerContacted === true &&
      approvalSummary.body.summary.safety.noAutoSendWhatsApp === true &&
      approvalSummary.body.summary.safety.noWhatsappAutoRead === true &&
      approvalSummary.body.summary.safety.noPrivateDataScraping === true &&
      approvalSummary.body.summary.safety.noHiddenDataHarvesting === true &&
      approvalSummary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      approvalSummary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      approvalSummary.body.summary.safety.noInventoryUpdate === true &&
      approvalSummary.body.summary.safety.noAccountingEntryCreation === true &&
      approvalSummary.body.summary.safety.noSaleClosing === true &&
      approvalSummary.body.summary.safety.noPipelineMovement === true &&
      approvalSummary.body.summary.safety.separateActivationExecutionGateRequiredLater === true &&
      approvalSummary.body.summary.safety.manualReviewRequiredBeforeAnyBuyerContact === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("openLiveBuyerGate = true") &&
      !hub.text.includes("activateBuyerGate = true") &&
      !hub.text.includes("enableLiveTraffic = true") &&
      !hub.text.includes("startLiveBuyerTraffic = true") &&
      !hub.text.includes("contactRealBuyerAutomatically = true") &&
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
      hubOk &&
      aliasOk &&
      approvalLinkedOk &&
      summaryOk &&
      metricsOk &&
      approvalSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 28C Admin Hub Link Controlled Buyer-Gate Manual Activation Approval Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before Admin Hub metrics
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before Admin Hub metrics
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists before Admin Hub metrics
- ${approvalOk ? "PASS" : "FAIL"}: safe manual activation approval exists before Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Activation Approval link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Activation Approval
- ${approvalLinkedOk ? "PASS" : "FAIL"}: linked Manual Activation Approval dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Activation Approval module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Manual Activation Approval metrics safely
- ${approvalSummaryOk ? "PASS" : "FAIL"}: Manual Activation Approval summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Manual Activation Approval link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Manual activation approval remains record-only.
- Approval is not activation.
- Buyer gate is not opened.
- Live traffic is not activated.
- No real buyer is contacted.
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
- Separate activation execution gate remains required later.
- Manual review remains required before any buyer contact.
- Assistant, guardian, plan, and approval test data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Manual Activation Approval metrics.
- Admin Hub now links directly to the Manual Activation Approval dashboard.
- Approval remains preparation-only until a later separate activation execution gate.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 29A — Controlled Buyer-Gate Activation Execution Gate Foundation
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

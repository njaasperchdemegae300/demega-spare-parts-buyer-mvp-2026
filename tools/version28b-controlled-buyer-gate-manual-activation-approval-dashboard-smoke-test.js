const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");
const approvalsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";
const originalApprovals = fs.existsSync(approvalsPath) ? fs.readFileSync(approvalsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version28b-controlled-buyer-gate-manual-activation-approval-dashboard-smoke-test-report.md");

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

    const page = await request("/controlled-buyer-gate-manual-activation-approval");
    const aliasPage = await request("/controlled-buyer-gate-manual-activation-approvals");
    const list = await request("/api/controlled-buyer-gate-manual-activation-approvals");
    const summary = await request("/api/controlled-buyer-gate-manual-activation-approval/summary");

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

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Controlled Buyer-Gate Manual Activation Approval Dashboard") &&
      page.text.includes("Manual Approval Safety Rule") &&
      page.text.includes("Required Approval Phrase") &&
      page.text.includes("Manual Activation Approval Records") &&
      page.text.includes("I_APPROVE_CONTROLLED_15_LEAD_MANUAL_TEST_PREPARATION_ONLY") &&
      page.text.includes("Manual approval record only") &&
      page.text.includes("Approval is not activation") &&
      page.text.includes("Buyer gate remains closed") &&
      page.text.includes("Live traffic not activated") &&
      page.text.includes("No real buyer contacted") &&
      page.text.includes("No WhatsApp auto-send") &&
      page.text.includes("No WhatsApp auto-read") &&
      page.text.includes("No buyer message scraping") &&
      page.text.includes("No private-data scraping") &&
      page.text.includes("No hidden data harvesting") &&
      page.text.includes("No quote before stock confirmation") &&
      page.text.includes("No quote before compatibility confirmation") &&
      page.text.includes("Separate activation execution gate required later") &&
      page.text.includes("approvalRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Controlled Buyer-Gate Manual Activation Approval Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.approvals) &&
      list.body.approvals.some(item =>
        item.id === approval.id &&
        item.approvalStatus === "APPROVED_NOT_ACTIVATED" &&
        item.activationExecuted === false &&
        item.buyerGateOpened === false &&
        item.liveTrafficActivated === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalApprovals >= 1 &&
      summary.body.summary.latestApprovalStatus === "APPROVED_NOT_ACTIVATED" &&
      summary.body.summary.latestLeadLimit === 15 &&
      summary.body.summary.latestTestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.activatedCount === 0 &&
      summary.body.summary.safety &&
      summary.body.summary.safety.manualActivationApprovalGateOnly === true &&
      summary.body.summary.safety.manualApprovalRecordedOnly === true &&
      summary.body.summary.safety.approvedForControlledPreparationOnly === true &&
      summary.body.summary.safety.approvedForLiveActivationExecution === false &&
      summary.body.summary.safety.activationExecuted === false &&
      summary.body.summary.safety.controlledPlanOnly === true &&
      summary.body.summary.safety.controlled15LeadPlanOnly === true &&
      summary.body.summary.safety.buyerGateOpened === false &&
      summary.body.summary.safety.liveTrafficActivated === false &&
      summary.body.summary.safety.noRealBuyerContacted === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noWhatsappAutoRead === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      summary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true &&
      summary.body.summary.safety.separateActivationExecutionGateRequiredLater === true &&
      summary.body.summary.safety.manualReviewRequiredBeforeAnyBuyerContact === true;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("openLiveBuyerGate = true") &&
      !page.text.includes("activateBuyerGate = true") &&
      !page.text.includes("enableLiveTraffic = true") &&
      !page.text.includes("startLiveBuyerTraffic = true") &&
      !page.text.includes("contactRealBuyerAutomatically = true") &&
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
      !page.text.includes('fetch("/api/controlled-buyer-gate-manual-activation-approval/create"');

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 28B Controlled Buyer-Gate Manual Activation Approval Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before dashboard setup
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before dashboard setup
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists before dashboard setup
- ${approvalOk ? "PASS" : "FAIL"}: safe manual approval record exists for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-manual-activation-approval returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-manual-activation-approvals alias works
- ${listOk ? "PASS" : "FAIL"}: approvals list API returns dashboard data
- ${summaryOk ? "PASS" : "FAIL"}: approval summary API confirms safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Manual Activation Approval dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays manual activation approval records only.
- Dashboard is read-only.
- Manual approval does not equal activation.
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
- Separate activation execution gate remains required later.
- Assistant, guardian, plan, and approval test data restored after smoke test.

## Next Phase After Approval
Version 28C — Admin Hub Link Controlled Buyer-Gate Manual Activation Approval

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

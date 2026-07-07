const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");
const approvalsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";
const originalApprovals = fs.existsSync(approvalsPath) ? fs.readFileSync(approvalsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version28a-controlled-buyer-gate-manual-activation-approval-smoke-test-report.md");

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
  try { body = JSON.parse(text); } catch {}
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

    const preview = await request("/api/controlled-buyer-gate-manual-activation-approval/preview");

    const unsafeApproval = await request("/api/controlled-buyer-gate-manual-activation-approval/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeApprovalPayload({
        openLiveBuyerGate: true,
        activateBuyerGate: true,
        enableLiveTraffic: true,
        liveTrafficActivated: true,
        contactRealBuyerAutomatically: true,
        autoSendWhatsApp: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        hiddenDataHarvesting: true,
        autoUpdateInventory: true,
        autoCreateAccountingEntry: true,
        autoCloseSale: true,
        autoMovePipelineStage: true
      }))
    });

    const safeApproval = await request("/api/controlled-buyer-gate-manual-activation-approval/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeApprovalPayload())
    });

    const list = await request("/api/controlled-buyer-gate-manual-activation-approvals");
    const summary = await request("/api/controlled-buyer-gate-manual-activation-approval/summary");

    const approval = safeApproval.body && safeApproval.body.approval;

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

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Manual Activation Approval Gate Foundation is active." &&
      preview.body.requiredApprovalPhrase === "I_APPROVE_CONTROLLED_15_LEAD_MANUAL_TEST_PREPARATION_ONLY" &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.includes("Buyer gate remains closed.") &&
      preview.body.rules.includes("Live traffic is not activated.") &&
      preview.body.rules.includes("Separate activation execution gate is required later.");

    const unsafeOk =
      unsafeApproval.status === 400 &&
      unsafeApproval.body &&
      Array.isArray(unsafeApproval.body.errors) &&
      unsafeApproval.body.errors.some(error => error.includes("Unsafe activation request blocked"));

    const safeOk =
      safeApproval.status === 201 &&
      approval &&
      approval.approvalStatus === "APPROVED_NOT_ACTIVATED" &&
      approval.manualActivationApprovalGateOnly === true &&
      approval.manualApprovalRecorded === true &&
      approval.approvedForControlledPreparationOnly === true &&
      approval.approvedForLiveActivationExecution === false &&
      approval.activationExecuted === false &&
      approval.controlledPlanOnly === true &&
      approval.controlled15LeadPlanOnly === true &&
      approval.leadLimit === 15 &&
      approval.testSource === "whatsapp_click_to_chat_inbound" &&
      approval.buyerGateOpened === false &&
      approval.openLiveBuyerGate === false &&
      approval.activateBuyerGate === false &&
      approval.enableLiveTraffic === false &&
      approval.startLiveBuyerTraffic === false &&
      approval.liveTrafficActivated === false &&
      approval.realBuyerContacted === false &&
      approval.autoSendWhatsApp === false &&
      approval.autoReadWhatsApp === false &&
      approval.scrapeWhatsappMessages === false &&
      approval.privateMessageScraping === false &&
      approval.hiddenDataHarvesting === false &&
      approval.quoteBeforeStockConfirmation === false &&
      approval.quoteBeforeCompatibilityConfirmation === false &&
      approval.autoUpdateInventory === false &&
      approval.autoCreateAccountingEntry === false &&
      approval.autoCloseSale === false &&
      approval.autoMovePipelineStage === false &&
      approval.requiresSeparateActivationExecutionGateLater === true &&
      approval.requiresManualReviewBeforeAnyBuyerContact === true &&
      approval.requiresManualStockConfirmation === true &&
      approval.requiresManualCompatibilityConfirmation === true &&
      approval.requiresManualReplyOnly === true;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.approvals) &&
      list.body.approvals.some(item =>
        item.id === approval.id &&
        item.approvalStatus === "APPROVED_NOT_ACTIVATED" &&
        item.buyerGateOpened === false &&
        item.liveTrafficActivated === false &&
        item.activationExecuted === false
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

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      previewOk &&
      unsafeOk &&
      safeOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 28A Controlled Buyer-Gate Manual Activation Approval Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved first
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Readiness Guardian approved first
- ${planOk ? "PASS" : "FAIL"}: Controlled 15-lead buyer-gate test plan exists first
- ${previewOk ? "PASS" : "FAIL"}: manual activation approval preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe live activation request is blocked
- ${safeOk ? "PASS" : "FAIL"}: manual activation approval is recorded without opening buyer gate
- ${listOk ? "PASS" : "FAIL"}: approvals list API returns safe approval record
- ${summaryOk ? "PASS" : "FAIL"}: approval summary API confirms approved-not-activated state

## Safety Rules Confirmed
- Manual activation approval gate only.
- Manual approval is recorded only.
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
- Separate activation execution gate is required later.
- Manual review is required before any buyer contact.
- Assistant, guardian, plan, and approval test data restored after smoke test.

## Next Phase After Approval
Version 28B — Controlled Buyer-Gate Manual Activation Approval Dashboard Display

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

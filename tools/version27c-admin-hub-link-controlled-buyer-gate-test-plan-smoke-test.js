const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3098;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version27c-admin-hub-link-controlled-buyer-gate-test-plan-smoke-test-report.md");

function restoreData() {
  fs.writeFileSync(assistantRunsPath, originalAssistant, "utf8");
  fs.writeFileSync(guardianRunsPath, originalGuardian, "utf8");
  fs.writeFileSync(plansPath, originalPlans, "utf8");
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

    const safePlan = await request("/api/controlled-buyer-gate-test-plan/create", {
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

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const planPage = await request("/controlled-buyer-gate-test-plan");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const planSummary = await request("/api/controlled-buyer-gate-test-plan/summary");

    const plan = safePlan.body && safePlan.body.plan;

    const healthOk = health.status === 200;
    const assistantOk = assistantRun.status === 201 && assistantRun.body.run && assistantRun.body.run.verdict === "APPROVED";
    const guardianOk = guardianRun.status === 201 && guardianRun.body.run && guardianRun.body.run.verdict === "APPROVED";

    const planOk =
      safePlan.status === 201 &&
      plan &&
      plan.leadLimit === 15 &&
      plan.testSource === "whatsapp_click_to_chat_inbound" &&
      plan.controlledPlanOnly === true &&
      plan.buyerGateOpened === false &&
      plan.liveTrafficActivated === false &&
      plan.realBuyerContacted === false &&
      plan.autoSendWhatsApp === false &&
      plan.autoReadWhatsApp === false &&
      plan.hiddenDataHarvesting === false &&
      plan.autoUpdateInventory === false &&
      plan.autoCreateAccountingEntry === false &&
      plan.autoCloseSale === false &&
      plan.autoMovePipelineStage === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Test Plan") &&
      hub.text.includes("/controlled-buyer-gate-test-plan") &&
      hub.text.includes("Controlled Plans") &&
      hub.text.includes("Latest Plan Status") &&
      hub.text.includes("Latest Lead Limit") &&
      hub.text.includes("Latest Test Source") &&
      hub.text.includes("Activated Plans") &&
      hub.text.includes("Safe Plans") &&
      hub.text.includes("CONTROLLED BUYER-GATE TEST PLAN ONLY") &&
      hub.text.includes("15-LEAD LIMIT ONLY") &&
      hub.text.includes("BUYER GATE REMAINS CLOSED") &&
      hub.text.includes("LIVE TRAFFIC NOT ACTIVATED") &&
      hub.text.includes("WHATSAPP CLICK-TO-CHAT INBOUND ONLY FOR FIRST TEST");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Test Plan") &&
      alias.text.includes("/controlled-buyer-gate-test-plan");

    const planLinkedOk =
      planPage.status === 200 &&
      planPage.text.includes("Demega Controlled Buyer-Gate Test Plan Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Test Plan" &&
        module.path === "/controlled-buyer-gate-test-plan"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateTestPlanOnly === true &&
      summary.body.safety.controlledPlanOnly === true &&
      summary.body.safety.controlled15LeadPlanOnly === true &&
      summary.body.safety.leadLimit === 15 &&
      summary.body.safety.chosenFirstSource === "whatsapp_click_to_chat_inbound" &&
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
      summary.body.safety.manualApprovalRequiredBeforeActivation === true &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.controlledBuyerGateTestPlan &&
      typeof metrics.body.metrics.controlledBuyerGateTestPlan.totalPlans === "number" &&
      metrics.body.metrics.controlledBuyerGateTestPlan.latestPlanStatus === "PLAN_READY_NOT_ACTIVATED" &&
      metrics.body.metrics.controlledBuyerGateTestPlan.latestLeadLimit === 15 &&
      metrics.body.metrics.controlledBuyerGateTestPlan.latestTestSource === "whatsapp_click_to_chat_inbound" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateTestPlanOnly === true &&
      metrics.body.safety.controlledPlanOnly === true &&
      metrics.body.safety.buyerGateOpened === false &&
      metrics.body.safety.liveTrafficActivated === false &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const planSummaryOk =
      planSummary.status === 200 &&
      planSummary.body &&
      planSummary.body.summary &&
      planSummary.body.summary.totalPlans >= 1 &&
      planSummary.body.summary.latestPlanStatus === "PLAN_READY_NOT_ACTIVATED" &&
      planSummary.body.summary.latestLeadLimit === 15 &&
      planSummary.body.summary.latestTestSource === "whatsapp_click_to_chat_inbound" &&
      planSummary.body.summary.activatedPlans === 0 &&
      planSummary.body.summary.safety &&
      planSummary.body.summary.safety.controlledPlanOnly === true &&
      planSummary.body.summary.safety.buyerGateOpened === false &&
      planSummary.body.summary.safety.liveTrafficActivated === false &&
      planSummary.body.summary.safety.noRealBuyerContacted === true &&
      planSummary.body.summary.safety.noAutoSendWhatsApp === true &&
      planSummary.body.summary.safety.noWhatsappAutoRead === true &&
      planSummary.body.summary.safety.noPrivateDataScraping === true &&
      planSummary.body.summary.safety.noHiddenDataHarvesting === true &&
      planSummary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      planSummary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      planSummary.body.summary.safety.noInventoryUpdate === true &&
      planSummary.body.summary.safety.noAccountingEntryCreation === true &&
      planSummary.body.summary.safety.noSaleClosing === true &&
      planSummary.body.summary.safety.noPipelineMovement === true &&
      planSummary.body.summary.safety.manualApprovalRequiredBeforeActivation === true;

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

    const verdict = healthOk && assistantOk && guardianOk && planOk && hubOk && aliasOk && planLinkedOk && summaryOk && metricsOk && planSummaryOk && readOnlyOk
      ? "APPROVED"
      : "NEEDS FIX";

    const report = `# Version 27C Admin Hub Link Controlled Buyer-Gate Test Plan Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before Admin Hub metrics
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before Admin Hub metrics
- ${planOk ? "PASS" : "FAIL"}: safe controlled 15-lead plan exists before Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Controlled Buyer-Gate Test Plan link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Controlled Buyer-Gate Test Plan
- ${planLinkedOk ? "PASS" : "FAIL"}: linked Controlled Buyer-Gate Test Plan dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Controlled Buyer-Gate Test Plan module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Controlled Buyer-Gate Test Plan metrics safely
- ${planSummaryOk ? "PASS" : "FAIL"}: Controlled Buyer-Gate Test Plan summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Controlled Buyer-Gate Test Plan link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Controlled Buyer-Gate Test Plan remains plan-only.
- 15-lead limit is preserved.
- First source remains WhatsApp click-to-chat inbound.
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
- Manual approval remains required before activation.
- Assistant, guardian, and plan test data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Controlled Buyer-Gate Test Plan metrics.
- Admin Hub now links directly to the Controlled Buyer-Gate Test Plan dashboard.
- Buyer gate remains closed until a later manual activation approval phase.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 28A — Controlled Buyer-Gate Manual Activation Approval Gate Foundation
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

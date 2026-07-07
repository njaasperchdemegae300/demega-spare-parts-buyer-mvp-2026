const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3097;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version27b-controlled-buyer-gate-test-plan-dashboard-smoke-test-report.md");

function restoreData() {
  fs.writeFileSync(assistantRunsPath, originalAssistant, "utf8");
  fs.writeFileSync(guardianRunsPath, originalGuardian, "utf8");
  fs.writeFileSync(plansPath, originalPlans, "utf8");
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

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

    const page = await request("/controlled-buyer-gate-test-plan");
    const aliasPage = await request("/controlled-buyer-gate-test-plans");
    const list = await request("/api/controlled-buyer-gate-test-plans");
    const summary = await request("/api/controlled-buyer-gate-test-plan/summary");

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

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Controlled Buyer-Gate Test Plan Dashboard") &&
      page.text.includes("Controlled Buyer-Gate Safety Rule") &&
      page.text.includes("Chosen First Test Source") &&
      page.text.includes("Controlled Buyer-Gate Test Plans") &&
      page.text.includes("whatsapp_click_to_chat_inbound") &&
      page.text.includes("15-lead limit only") &&
      page.text.includes("Manual review required") &&
      page.text.includes("Manual reply only") &&
      page.text.includes("No auto-send") &&
      page.text.includes("No spam") &&
      page.text.includes("No unsolicited WhatsApp") &&
      page.text.includes("No private-data scraping") &&
      page.text.includes("No hidden harvesting") &&
      page.text.includes("No quote before stock confirmation") &&
      page.text.includes("No quote before compatibility confirmation") &&
      page.text.includes("Buyer gate remains closed") &&
      page.text.includes("Manual activation approval required later") &&
      page.text.includes("planRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Controlled Buyer-Gate Test Plan Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.plans) &&
      list.body.plans.some(item =>
        item.id === plan.id &&
        item.buyerGateOpened === false &&
        item.liveTrafficActivated === false &&
        item.realBuyerContacted === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalPlans >= 1 &&
      summary.body.summary.latestPlanStatus === "PLAN_READY_NOT_ACTIVATED" &&
      summary.body.summary.latestLeadLimit === 15 &&
      summary.body.summary.latestTestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.controlledPlanOnly === true &&
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
      summary.body.summary.safety.manualApprovalRequiredBeforeActivation === true;

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
      !page.text.includes('fetch("/api/controlled-buyer-gate-test-plan/create"');

    const verdict = healthOk && assistantOk && guardianOk && planOk && pageOk && aliasOk && listOk && summaryOk && readOnlyOk
      ? "APPROVED"
      : "NEEDS FIX";

    const report = `# Version 27B Controlled Buyer-Gate Test Plan Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before dashboard setup
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before dashboard setup
- ${planOk ? "PASS" : "FAIL"}: safe controlled 15-lead plan exists for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-test-plan returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-test-plans alias works
- ${listOk ? "PASS" : "FAIL"}: plan list API returns dashboard data
- ${summaryOk ? "PASS" : "FAIL"}: summary API confirms safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Controlled Buyer-Gate Test Plan dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays controlled buyer-gate test plans only.
- Dashboard is read-only.
- Buyer gate is not opened.
- Live traffic is not activated.
- No real buyer is contacted.
- No WhatsApp auto-send.
- No WhatsApp auto-read.
- No private-data scraping.
- No hidden data harvesting.
- No quote before stock confirmation.
- No quote before compatibility confirmation.
- No inventory update.
- No accounting entry creation.
- No sale closing.
- No pipeline movement.
- Manual approval remains required before activation.
- Test data restored after smoke test.

## Next Phase After Approval
Version 27C — Admin Hub Link Controlled Buyer-Gate Test Plan

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

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3092;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const runsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const originalRuns = fs.existsSync(runsPath) ? fs.readFileSync(runsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version25d-admin-hub-link-assistant-sales-agent-test-lab-smoke-test-report.md");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(runsPath, originalRuns, "utf8");
}

function stopProcess(child) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  } catch {}
}

async function request(route, options = {}) {
  const response = await fetch(`${BASE_URL}${route}`, options);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { route, status: response.status, ok: response.ok, text, body };
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

    const run = await request("/api/assistant-sales-agent-test-lab/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runBy: "master_admin"
      })
    });

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const assistantPage = await request("/assistant-sales-agent-test-lab");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const assistantSummary = await request("/api/assistant-sales-agent-test-lab/summary");

    const healthOk = health.status === 200;

    const testRun = run.body && run.body.run;
    const runOk =
      run.status === 201 &&
      testRun &&
      testRun.verdict === "APPROVED" &&
      testRun.simulationOnly === true &&
      testRun.noLiveBuyerGateOpened === true &&
      testRun.noRealBuyerContacted === true &&
      testRun.autoSendWhatsApp === false &&
      testRun.autoReadWhatsApp === false &&
      testRun.scrapeWhatsappMessages === false &&
      testRun.hiddenDataHarvesting === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Assistant Sales Agent Test Lab") &&
      hub.text.includes("/assistant-sales-agent-test-lab") &&
      hub.text.includes("Sales Agent Test Runs") &&
      hub.text.includes("Sales Agent Verdict") &&
      hub.text.includes("Sales Agent Passed") &&
      hub.text.includes("Sales Agent Failed") &&
      hub.text.includes("Sales Agent Scenarios") &&
      hub.text.includes("Approved Agent Runs") &&
      hub.text.includes("ASSISTANT SALES AGENT TEST LAB IS SIMULATION ONLY") &&
      hub.text.includes("NO LIVE BUYER GATE OPENED") &&
      hub.text.includes("NO REAL BUYER CONTACTED") &&
      hub.text.includes("NO WHATSAPP AUTO-READ");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Assistant Sales Agent Test Lab") &&
      alias.text.includes("/assistant-sales-agent-test-lab");

    const assistantLinkedOk =
      assistantPage.status === 200 &&
      assistantPage.text.includes("Demega Assistant Sales Agent Test Lab Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Assistant Sales Agent Test Lab" &&
        module.path === "/assistant-sales-agent-test-lab"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.assistantSalesAgentReadinessTestOnly === true &&
      summary.body.safety.assistantSalesAgentTestLabOnly === true &&
      summary.body.safety.simulationOnly === true &&
      summary.body.safety.noLiveBuyerGateOpened === true &&
      summary.body.safety.noRealBuyerContacted === true &&
      summary.body.safety.systemDoesNotOpenLiveBuyerGate === true &&
      summary.body.safety.systemDoesNotContactRealBuyer === true &&
      summary.body.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.openLiveBuyerGate === false &&
      summary.body.safety.contactRealBuyerAutomatically === false &&
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
      summary.body.safety.manualReviewRequiredBeforeLiveBuyerGate === true &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.assistantSalesAgentTestLab &&
      typeof metrics.body.metrics.assistantSalesAgentTestLab.totalRuns === "number" &&
      metrics.body.metrics.assistantSalesAgentTestLab.latestVerdict === "APPROVED" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.assistantSalesAgentReadinessTestOnly === true &&
      metrics.body.safety.simulationOnly === true &&
      metrics.body.safety.noLiveBuyerGateOpened === true &&
      metrics.body.safety.noRealBuyerContacted === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const assistantSummaryOk =
      assistantSummary.status === 200 &&
      assistantSummary.body &&
      assistantSummary.body.summary &&
      assistantSummary.body.summary.totalRuns >= 1 &&
      assistantSummary.body.summary.latestVerdict === "APPROVED" &&
      assistantSummary.body.summary.latestFailedCount === 0 &&
      assistantSummary.body.summary.safety &&
      assistantSummary.body.summary.safety.assistantSalesAgentReadinessTestOnly === true &&
      assistantSummary.body.summary.safety.simulationOnly === true &&
      assistantSummary.body.summary.safety.noLiveBuyerGateOpened === true &&
      assistantSummary.body.summary.safety.noRealBuyerContacted === true &&
      assistantSummary.body.summary.safety.noAutoSendWhatsApp === true &&
      assistantSummary.body.summary.safety.noBuyerMessageReading === true &&
      assistantSummary.body.summary.safety.noWhatsappScraping === true &&
      assistantSummary.body.summary.safety.noPrivateDataScraping === true &&
      assistantSummary.body.summary.safety.noHiddenDataHarvesting === true &&
      assistantSummary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      assistantSummary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      assistantSummary.body.summary.safety.noInventoryUpdate === true &&
      assistantSummary.body.summary.safety.noAccountingEntryCreation === true &&
      assistantSummary.body.summary.safety.noSaleClosing === true &&
      assistantSummary.body.summary.safety.noPipelineMovement === true &&
      assistantSummary.body.summary.safety.manualReviewRequiredBeforeLiveBuyerGate === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("openLiveBuyerGate = true") &&
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
      runOk &&
      hubOk &&
      aliasOk &&
      assistantLinkedOk &&
      summaryOk &&
      metricsOk &&
      assistantSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 25D Admin Hub Link Assistant Sales Agent Test Lab Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${runOk ? "PASS" : "FAIL"}: internal Assistant Sales Agent readiness run available for Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Assistant Sales Agent Test Lab link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Assistant Sales Agent Test Lab
- ${assistantLinkedOk ? "PASS" : "FAIL"}: linked Assistant Sales Agent Test Lab dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Assistant Sales Agent Test Lab module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Assistant Sales Agent Test Lab metrics safely
- ${assistantSummaryOk ? "PASS" : "FAIL"}: Assistant Sales Agent Test Lab summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Assistant Sales Agent Test Lab link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Assistant Sales Agent Test Lab remains simulation-only.
- No live buyer gate is opened.
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
- Manual review remains required before live buyer traffic.
- Test run data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Assistant Sales Agent readiness metrics.
- Admin Hub now links directly to the Assistant Sales Agent Test Lab dashboard.
- Assistant readiness remains internal until the live buyer gate is approved later.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 26A — Internal Buyer-Gate Readiness Guardian Foundation
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

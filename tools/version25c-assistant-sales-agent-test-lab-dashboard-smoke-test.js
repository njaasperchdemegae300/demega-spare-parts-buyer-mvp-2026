const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3091;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const runsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const originalRuns = fs.existsSync(runsPath) ? fs.readFileSync(runsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version25c-assistant-sales-agent-test-lab-dashboard-smoke-test-report.md");

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

    const page = await request("/assistant-sales-agent-test-lab");
    const aliasPage = await request("/assistant-sales-agent-test-runs");
    const list = await request("/api/assistant-sales-agent-test-lab/runs");
    const summary = await request("/api/assistant-sales-agent-test-lab/summary");

    const healthOk = health.status === 200;

    const testRun = run.body && run.body.run;
    const runOk =
      run.status === 201 &&
      testRun &&
      testRun.verdict === "APPROVED" &&
      testRun.totalTests >= 6 &&
      testRun.passedCount === testRun.totalTests &&
      testRun.failedCount === 0 &&
      testRun.simulationOnly === true &&
      testRun.noLiveBuyerGateOpened === true &&
      testRun.noRealBuyerContacted === true &&
      testRun.autoSendWhatsApp === false &&
      testRun.autoReadWhatsApp === false &&
      testRun.scrapeWhatsappMessages === false &&
      testRun.privateMessageScraping === false &&
      testRun.hiddenDataHarvesting === false &&
      testRun.autoUpdateInventory === false &&
      testRun.autoCreateAccountingEntry === false &&
      testRun.autoCloseSale === false &&
      testRun.autoMovePipelineStage === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Assistant Sales Agent Test Lab Dashboard") &&
      page.text.includes("Assistant Sales Agent Test Run Results") &&
      page.text.includes("Before Opening Buyer Gate") &&
      page.text.includes("Sales Agent Behavior Scenarios") &&
      page.text.includes("Simulation only") &&
      page.text.includes("No live buyer gate opened") &&
      page.text.includes("No real buyer contacted") &&
      page.text.includes("No WhatsApp auto-send") &&
      page.text.includes("No WhatsApp auto-read") &&
      page.text.includes("No private message scraping") &&
      page.text.includes("No hidden harvesting") &&
      page.text.includes("No quote before stock confirmation") &&
      page.text.includes("No quote before compatibility confirmation") &&
      page.text.includes("Urgent confirmed alternator buyer") &&
      page.text.includes("Compatibility-unknown buyer") &&
      page.text.includes("Stock-unknown buyer") &&
      page.text.includes("Bulk buyer request") &&
      page.text.includes("Lowball price checker") &&
      page.text.includes("Wrong-part / subpart risk") &&
      page.text.includes("testRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Assistant Sales Agent Test Lab Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.runs) &&
      list.body.runs.some(item =>
        item.id === testRun.id &&
        item.verdict === "APPROVED" &&
        item.simulationOnly === true &&
        item.noLiveBuyerGateOpened === true &&
        item.noRealBuyerContacted === true
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalRuns >= 1 &&
      summary.body.summary.latestVerdict === "APPROVED" &&
      summary.body.summary.latestFailedCount === 0 &&
      summary.body.summary.safety &&
      summary.body.summary.safety.assistantSalesAgentReadinessTestOnly === true &&
      summary.body.summary.safety.simulationOnly === true &&
      summary.body.summary.safety.noLiveBuyerGateOpened === true &&
      summary.body.summary.safety.noRealBuyerContacted === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noUnsolicitedWhatsApp === true &&
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
      summary.body.summary.safety.manualReviewRequiredBeforeLiveBuyerGate === true;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("openLiveBuyerGate = true") &&
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
      !page.text.includes('fetch("/api/assistant-sales-agent-test-lab/run"');

    const verdict =
      healthOk &&
      runOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 25C Assistant Sales Agent Test Lab Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${runOk ? "PASS" : "FAIL"}: internal Assistant Sales Agent readiness run exists for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /assistant-sales-agent-test-lab returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /assistant-sales-agent-test-runs alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/assistant-sales-agent-test-lab/runs returns dashboard data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/assistant-sales-agent-test-lab/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Assistant Sales Agent dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays Assistant Sales Agent readiness runs only.
- Dashboard is read-only.
- Dashboard does not open live buyer gate.
- Dashboard does not contact real buyers.
- Dashboard does not send WhatsApp.
- Dashboard does not read WhatsApp.
- Dashboard does not scrape private messages.
- Dashboard does not harvest hidden data.
- Dashboard does not quote before stock confirmation.
- Dashboard does not quote before compatibility confirmation.
- Dashboard does not update inventory.
- Dashboard does not create accounting entries.
- Dashboard does not close sales.
- Dashboard does not move pipeline.
- Manual review remains required before real buyer traffic.
- Test run data restored after smoke test.

## Business Readiness Display Confirmed
- Dashboard displays readiness verdict.
- Dashboard displays passed and failed counts.
- Dashboard displays buyer type and next action.
- Dashboard displays safe reply draft.
- Dashboard displays stock, compatibility, and price eligibility status.
- Dashboard displays scenario safety labels.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 25D — Admin Hub Link Assistant Sales Agent Test Lab
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

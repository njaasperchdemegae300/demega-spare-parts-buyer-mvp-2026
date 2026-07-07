const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3094;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");

const originalAssistantRuns = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardianRuns = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version26b-internal-buyer-gate-readiness-dashboard-smoke-test-report.md");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(assistantRunsPath, originalAssistantRuns, "utf8");
  fs.writeFileSync(guardianRunsPath, originalGuardianRuns, "utf8");
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

    const assistantRun = await request("/api/assistant-sales-agent-test-lab/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runBy: "master_admin"
      })
    });

    const guardianRun = await request("/api/internal-buyer-gate-readiness/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runBy: "master_admin"
      })
    });

    const page = await request("/internal-buyer-gate-readiness");
    const aliasPage = await request("/internal-buyer-gate-readiness-runs");
    const list = await request("/api/internal-buyer-gate-readiness/runs");
    const summary = await request("/api/internal-buyer-gate-readiness/summary");

    const healthOk = health.status === 200;

    const assistantRunOk =
      assistantRun.status === 201 &&
      assistantRun.body &&
      assistantRun.body.run &&
      assistantRun.body.run.verdict === "APPROVED" &&
      assistantRun.body.run.failedCount === 0;

    const run = guardianRun.body && guardianRun.body.run;
    const checks = run && Array.isArray(run.checks) ? run.checks : [];

    const guardianRunOk =
      guardianRun.status === 201 &&
      run &&
      run.verdict === "APPROVED" &&
      checks.length >= 8 &&
      checks.every(check => check.passed === true) &&
      run.noLiveBuyerGateOpened === true &&
      run.liveBuyerGateOpened === false &&
      run.noRealBuyerContacted === true &&
      run.realBuyerContacted === false &&
      run.autoSendWhatsApp === false &&
      run.autoReadWhatsApp === false &&
      run.scrapeWhatsappMessages === false &&
      run.privateMessageScraping === false &&
      run.hiddenDataHarvesting === false &&
      run.autoUpdateInventory === false &&
      run.autoCreateAccountingEntry === false &&
      run.autoCloseSale === false &&
      run.autoMovePipelineStage === false &&
      run.manualApprovalRequiredToOpenBuyerGateLater === true;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Internal Buyer-Gate Readiness Guardian Dashboard") &&
      page.text.includes("Internal Buyer-Gate Readiness Runs") &&
      page.text.includes("Buyer Gate Safety Rule") &&
      page.text.includes("Required Before Real Buyer Gate") &&
      page.text.includes("Readiness-check-only") &&
      page.text.includes("Simulation only") &&
      page.text.includes("No live buyer gate opened") &&
      page.text.includes("No real buyer contacted") &&
      page.text.includes("No WhatsApp auto-send") &&
      page.text.includes("No WhatsApp auto-read") &&
      page.text.includes("No buyer message scraping") &&
      page.text.includes("No private-data scraping") &&
      page.text.includes("No hidden data harvesting") &&
      page.text.includes("Manual approval required before buyer gate") &&
      page.text.includes("Source-of-truth files ready") &&
      page.text.includes("Assistant Sales Agent approved") &&
      page.text.includes("Assistant Sales Agent zero failures") &&
      page.text.includes("Safety locks active") &&
      page.text.includes("Live buyer gate still closed") &&
      page.text.includes("guardianRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Internal Buyer-Gate Readiness Guardian Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.runs) &&
      list.body.runs.some(item =>
        item.id === run.id &&
        item.verdict === "APPROVED" &&
        item.noLiveBuyerGateOpened === true &&
        item.noRealBuyerContacted === true &&
        item.liveGateCandidateOnlyAfterApproval === true
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalRuns >= 1 &&
      summary.body.summary.latestVerdict === "APPROVED" &&
      summary.body.summary.latestFailedCheckCount === 0 &&
      summary.body.summary.liveGateCandidateOnlyAfterApproval === true &&
      summary.body.summary.latestSourceOfTruthReady === true &&
      summary.body.summary.latestAssistantSalesAgentVerdict === "APPROVED" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.readinessGuardianOnly === true &&
      summary.body.summary.safety.internalReadinessCheckOnly === true &&
      summary.body.summary.safety.simulationOnly === true &&
      summary.body.summary.safety.noLiveBuyerGateOpened === true &&
      summary.body.summary.safety.liveBuyerGateOpened === false &&
      summary.body.summary.safety.noRealBuyerContacted === true &&
      summary.body.summary.safety.realBuyerContacted === false &&
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
      summary.body.summary.safety.manualReviewRequiredBeforeLiveBuyerGate === true &&
      summary.body.summary.safety.manualApprovalRequiredToOpenBuyerGateLater === true;

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
      !page.text.includes('fetch("/api/internal-buyer-gate-readiness/run"');

    const verdict =
      healthOk &&
      assistantRunOk &&
      guardianRunOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 26B Internal Buyer-Gate Readiness Guardian Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantRunOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness run exists before guardian dashboard
- ${guardianRunOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Readiness Guardian run exists for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /internal-buyer-gate-readiness returns safe guardian dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /internal-buyer-gate-readiness-runs alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/internal-buyer-gate-readiness/runs returns dashboard data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/internal-buyer-gate-readiness/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Readiness dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays readiness guardian runs only.
- Dashboard is read-only.
- Dashboard does not open live buyer gate.
- Dashboard does not contact real buyers.
- Dashboard does not send WhatsApp.
- Dashboard does not read WhatsApp.
- Dashboard does not scrape buyer messages.
- Dashboard does not scrape private data.
- Dashboard does not harvest hidden data.
- Dashboard does not quote before stock confirmation.
- Dashboard does not quote before compatibility confirmation.
- Dashboard does not update inventory.
- Dashboard does not create accounting entries.
- Dashboard does not close sales.
- Dashboard does not move pipeline.
- Manual approval remains required before opening buyer gate later.
- Assistant and guardian test run data restored after smoke test.

## Readiness Display Confirmed
- Dashboard displays latest guardian verdict.
- Dashboard displays check count and failed check count.
- Dashboard displays source-of-truth readiness.
- Dashboard displays Assistant Sales Agent verdict.
- Dashboard displays live buyer gate closed status.
- Dashboard displays individual guardian checks.
- Dashboard displays safety labels.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 26C — Admin Hub Link Internal Buyer-Gate Readiness Guardian
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

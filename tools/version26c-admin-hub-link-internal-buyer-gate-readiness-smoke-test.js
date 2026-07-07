const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3095;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");

const originalAssistantRuns = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardianRuns = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version26c-admin-hub-link-internal-buyer-gate-readiness-smoke-test-report.md");

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
      body: JSON.stringify({ runBy: "master_admin" })
    });

    const guardianRun = await request("/api/internal-buyer-gate-readiness/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runBy: "master_admin" })
    });

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const guardianPage = await request("/internal-buyer-gate-readiness");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const guardianSummary = await request("/api/internal-buyer-gate-readiness/summary");

    const healthOk = health.status === 200;

    const assistantRunOk =
      assistantRun.status === 201 &&
      assistantRun.body &&
      assistantRun.body.run &&
      assistantRun.body.run.verdict === "APPROVED" &&
      assistantRun.body.run.failedCount === 0;

    const run = guardianRun.body && guardianRun.body.run;

    const guardianRunOk =
      guardianRun.status === 201 &&
      run &&
      run.verdict === "APPROVED" &&
      run.noLiveBuyerGateOpened === true &&
      run.liveBuyerGateOpened === false &&
      run.noRealBuyerContacted === true &&
      run.realBuyerContacted === false &&
      run.autoSendWhatsApp === false &&
      run.autoReadWhatsApp === false &&
      run.scrapeWhatsappMessages === false &&
      run.hiddenDataHarvesting === false &&
      run.autoUpdateInventory === false &&
      run.autoCreateAccountingEntry === false &&
      run.autoCloseSale === false &&
      run.autoMovePipelineStage === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Internal Buyer-Gate Readiness Guardian") &&
      hub.text.includes("/internal-buyer-gate-readiness") &&
      hub.text.includes("Buyer-Gate Guardian Runs") &&
      hub.text.includes("Buyer-Gate Verdict") &&
      hub.text.includes("Buyer-Gate Checks") &&
      hub.text.includes("Buyer-Gate Failed Checks") &&
      hub.text.includes("Source Truth Ready") &&
      hub.text.includes("Gate Candidate") &&
      hub.text.includes("INTERNAL BUYER-GATE READINESS GUARDIAN IS READ-ONLY") &&
      hub.text.includes("BUYER GATE REMAINS CLOSED") &&
      hub.text.includes("MANUAL APPROVAL REQUIRED BEFORE BUYER GATE") &&
      hub.text.includes("NO LIVE TRAFFIC ACTIVATION");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Internal Buyer-Gate Readiness Guardian") &&
      alias.text.includes("/internal-buyer-gate-readiness");

    const guardianLinkedOk =
      guardianPage.status === 200 &&
      guardianPage.text.includes("Demega Internal Buyer-Gate Readiness Guardian Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Internal Buyer-Gate Readiness Guardian" &&
        module.path === "/internal-buyer-gate-readiness"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.internalBuyerGateReadinessGuardianOnly === true &&
      summary.body.safety.readinessGuardianOnly === true &&
      summary.body.safety.internalReadinessCheckOnly === true &&
      summary.body.safety.simulationOnly === true &&
      summary.body.safety.noLiveBuyerGateOpened === true &&
      summary.body.safety.liveBuyerGateOpened === false &&
      summary.body.safety.noRealBuyerContacted === true &&
      summary.body.safety.realBuyerContacted === false &&
      summary.body.safety.systemDoesNotOpenLiveBuyerGate === true &&
      summary.body.safety.systemDoesNotContactRealBuyer === true &&
      summary.body.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.openLiveBuyerGate === false &&
      summary.body.safety.activateBuyerGate === false &&
      summary.body.safety.enableLiveTraffic === false &&
      summary.body.safety.startLiveBuyerTraffic === false &&
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
      summary.body.safety.manualApprovalRequiredToOpenBuyerGateLater === true &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.internalBuyerGateReadiness &&
      typeof metrics.body.metrics.internalBuyerGateReadiness.totalRuns === "number" &&
      metrics.body.metrics.internalBuyerGateReadiness.latestVerdict === "APPROVED" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.internalBuyerGateReadinessGuardianOnly === true &&
      metrics.body.safety.readinessGuardianOnly === true &&
      metrics.body.safety.simulationOnly === true &&
      metrics.body.safety.noLiveBuyerGateOpened === true &&
      metrics.body.safety.noRealBuyerContacted === true &&
      metrics.body.safety.openLiveBuyerGate === false &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const guardianSummaryOk =
      guardianSummary.status === 200 &&
      guardianSummary.body &&
      guardianSummary.body.summary &&
      guardianSummary.body.summary.totalRuns >= 1 &&
      guardianSummary.body.summary.latestVerdict === "APPROVED" &&
      guardianSummary.body.summary.latestFailedCheckCount === 0 &&
      guardianSummary.body.summary.liveGateCandidateOnlyAfterApproval === true &&
      guardianSummary.body.summary.latestSourceOfTruthReady === true &&
      guardianSummary.body.summary.latestAssistantSalesAgentVerdict === "APPROVED" &&
      guardianSummary.body.summary.safety &&
      guardianSummary.body.summary.safety.readinessGuardianOnly === true &&
      guardianSummary.body.summary.safety.internalReadinessCheckOnly === true &&
      guardianSummary.body.summary.safety.simulationOnly === true &&
      guardianSummary.body.summary.safety.noLiveBuyerGateOpened === true &&
      guardianSummary.body.summary.safety.liveBuyerGateOpened === false &&
      guardianSummary.body.summary.safety.noRealBuyerContacted === true &&
      guardianSummary.body.summary.safety.realBuyerContacted === false &&
      guardianSummary.body.summary.safety.noAutoSendWhatsApp === true &&
      guardianSummary.body.summary.safety.noWhatsappAutoRead === true &&
      guardianSummary.body.summary.safety.noBuyerMessageReading === true &&
      guardianSummary.body.summary.safety.noWhatsappScraping === true &&
      guardianSummary.body.summary.safety.noPrivateDataScraping === true &&
      guardianSummary.body.summary.safety.noHiddenDataHarvesting === true &&
      guardianSummary.body.summary.safety.noInventoryUpdate === true &&
      guardianSummary.body.summary.safety.noAccountingEntryCreation === true &&
      guardianSummary.body.summary.safety.noSaleClosing === true &&
      guardianSummary.body.summary.safety.noPipelineMovement === true &&
      guardianSummary.body.summary.safety.manualReviewRequiredBeforeLiveBuyerGate === true &&
      guardianSummary.body.summary.safety.manualApprovalRequiredToOpenBuyerGateLater === true;

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
      assistantRunOk &&
      guardianRunOk &&
      hubOk &&
      aliasOk &&
      guardianLinkedOk &&
      summaryOk &&
      metricsOk &&
      guardianSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 26C Admin Hub Link Internal Buyer-Gate Readiness Guardian Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantRunOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness run available before Admin Hub metrics
- ${guardianRunOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Readiness Guardian run available before Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Internal Buyer-Gate Readiness Guardian link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Internal Buyer-Gate Readiness Guardian
- ${guardianLinkedOk ? "PASS" : "FAIL"}: linked Internal Buyer-Gate Readiness Guardian dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Internal Buyer-Gate Readiness Guardian module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Internal Buyer-Gate Readiness Guardian metrics safely
- ${guardianSummaryOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Readiness Guardian summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Internal Buyer-Gate Readiness Guardian link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Internal Buyer-Gate Readiness Guardian remains readiness-check-only.
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
- Manual approval remains required before opening buyer gate later.
- Assistant and guardian test run data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Internal Buyer-Gate Readiness Guardian metrics.
- Admin Hub now links directly to the Internal Buyer-Gate Readiness Guardian dashboard.
- Buyer gate remains closed until a later controlled buyer-gate approval phase.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 27A — Controlled Buyer-Gate Test Plan Foundation
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

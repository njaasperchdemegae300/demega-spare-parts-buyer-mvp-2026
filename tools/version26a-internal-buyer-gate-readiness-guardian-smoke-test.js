const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3093;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");

const originalAssistantRuns = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardianRuns = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version26a-internal-buyer-gate-readiness-guardian-smoke-test-report.md");

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
    const preview = await request("/api/internal-buyer-gate-readiness/preview");

    const assistantRun = await request("/api/assistant-sales-agent-test-lab/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runBy: "master_admin"
      })
    });

    const unsafeRun = await request("/api/internal-buyer-gate-readiness/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runBy: "master_admin",
        openLiveBuyerGate: true,
        activateBuyerGate: true,
        contactRealBuyerAutomatically: true,
        autoSendWhatsApp: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        privateMessageScraping: true,
        hiddenDataHarvesting: true,
        autoUpdateInventory: true,
        autoCreateAccountingEntry: true,
        autoCloseSale: true,
        autoMovePipelineStage: true
      })
    });

    const guardianRun = await request("/api/internal-buyer-gate-readiness/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runBy: "master_admin"
      })
    });

    const list = await request("/api/internal-buyer-gate-readiness/runs");
    const summary = await request("/api/internal-buyer-gate-readiness/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Internal Buyer-Gate Readiness Guardian Foundation is active." &&
      Array.isArray(preview.body.requiredBeforeLiveBuyerGate) &&
      preview.body.requiredBeforeLiveBuyerGate.some(item => item.includes("Source-of-truth files must be ready")) &&
      preview.body.requiredBeforeLiveBuyerGate.some(item => item.includes("Assistant Sales Agent readiness test must be APPROVED")) &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("No live buyer gate opened")) &&
      preview.body.rules.some(rule => rule.includes("No real buyer contacted")) &&
      preview.body.rules.some(rule => rule.includes("No WhatsApp auto-send")) &&
      preview.body.rules.some(rule => rule.includes("Manual review required before real buyer traffic"));

    const assistantRunOk =
      assistantRun.status === 201 &&
      assistantRun.body &&
      assistantRun.body.run &&
      assistantRun.body.run.verdict === "APPROVED" &&
      assistantRun.body.run.failedCount === 0 &&
      assistantRun.body.run.noLiveBuyerGateOpened === true &&
      assistantRun.body.run.noRealBuyerContacted === true;

    const unsafeRunOk =
      unsafeRun.status === 400 &&
      unsafeRun.body &&
      Array.isArray(unsafeRun.body.errors) &&
      unsafeRun.body.errors.some(error => error.includes("Unsafe request blocked"));

    const run = guardianRun.body && guardianRun.body.run;
    const checks = run && Array.isArray(run.checks) ? run.checks : [];

    const guardianRunOk =
      guardianRun.status === 201 &&
      run &&
      run.verdict === "APPROVED" &&
      checks.length >= 8 &&
      checks.every(check => check.passed === true) &&
      Array.isArray(run.failedChecks) &&
      run.failedChecks.length === 0 &&
      run.readinessGuardianOnly === true &&
      run.internalReadinessCheckOnly === true &&
      run.simulationOnly === true &&
      run.noLiveBuyerGateOpened === true &&
      run.liveBuyerGateOpened === false &&
      run.openLiveBuyerGate === false &&
      run.noRealBuyerContacted === true &&
      run.realBuyerContacted === false &&
      run.contactRealBuyerAutomatically === false &&
      run.autoSendWhatsApp === false &&
      run.sendWhatsApp === false &&
      run.autoReadWhatsApp === false &&
      run.readBuyerMessagesAutomatically === false &&
      run.scrapeWhatsappMessages === false &&
      run.privateMessageScraping === false &&
      run.hiddenDataHarvesting === false &&
      run.quoteBeforeStockConfirmation === false &&
      run.quoteBeforeCompatibilityConfirmation === false &&
      run.autoUpdateInventory === false &&
      run.autoCreateAccountingEntry === false &&
      run.autoCloseSale === false &&
      run.autoMovePipelineStage === false &&
      run.manualReviewRequiredBeforeLiveBuyerGate === true &&
      run.manualApprovalRequiredToOpenBuyerGateLater === true &&
      run.liveGateCandidateOnlyAfterApproval === true;

    const sourceCheckOk = checks.some(item => item.id === "source_of_truth_ready" && item.passed === true) &&
      checks.some(item => item.id === "source_of_truth_read_only" && item.passed === true);

    const assistantCheckOk = checks.some(item => item.id === "assistant_sales_agent_tested" && item.passed === true) &&
      checks.some(item => item.id === "assistant_sales_agent_approved" && item.passed === true) &&
      checks.some(item => item.id === "assistant_sales_agent_zero_failures" && item.passed === true) &&
      checks.some(item => item.id === "assistant_sales_agent_safe" && item.passed === true);

    const gateClosedCheckOk = checks.some(item => item.id === "live_buyer_gate_still_closed" && item.passed === true) &&
      checks.some(item => item.id === "manual_review_required" && item.passed === true);

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

    const verdict =
      healthOk &&
      previewOk &&
      assistantRunOk &&
      unsafeRunOk &&
      guardianRunOk &&
      sourceCheckOk &&
      assistantCheckOk &&
      gateClosedCheckOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 26A Internal Buyer-Gate Readiness Guardian Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/internal-buyer-gate-readiness/preview works
- ${assistantRunOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness run is APPROVED before guardian check
- ${unsafeRunOk ? "PASS" : "FAIL"}: unsafe live-gate/contact/send/read/scrape/accounting/inventory/close request is blocked
- ${guardianRunOk ? "PASS" : "FAIL"}: POST /api/internal-buyer-gate-readiness/run completes readiness check safely
- ${sourceCheckOk ? "PASS" : "FAIL"}: source-of-truth readiness checks pass
- ${assistantCheckOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness checks pass
- ${gateClosedCheckOk ? "PASS" : "FAIL"}: live buyer gate remains closed and manual review remains required
- ${listOk ? "PASS" : "FAIL"}: GET /api/internal-buyer-gate-readiness/runs returns guardian run data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/internal-buyer-gate-readiness/summary returns safe guardian summary

## Safety Rules Confirmed
- Internal Buyer-Gate Readiness Guardian is readiness-check-only.
- Guardian does not open live buyer gate.
- Guardian does not contact real buyers.
- Guardian does not send WhatsApp.
- Guardian does not read WhatsApp.
- Guardian does not scrape buyer messages.
- Guardian does not scrape private data.
- Guardian does not harvest hidden data.
- Guardian does not quote before stock confirmation.
- Guardian does not quote before compatibility confirmation.
- Guardian does not update inventory.
- Guardian does not create accounting entries.
- Guardian does not close sales.
- Guardian does not move pipeline.
- Manual approval is required before opening buyer gate later.
- Assistant and guardian test run data restored after smoke test.

## Readiness Confirmed
- Source-of-truth files are ready.
- Assistant Sales Agent readiness has approved run.
- Assistant Sales Agent latest run has zero failures.
- Safety locks remain active.
- The system is only a candidate for controlled buyer-gate opening after manual approval.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 26B — Internal Buyer-Gate Readiness Guardian Dashboard Display
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

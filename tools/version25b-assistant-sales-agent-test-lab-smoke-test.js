const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3090;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const runsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const originalRuns = fs.existsSync(runsPath) ? fs.readFileSync(runsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version25b-assistant-sales-agent-test-lab-smoke-test-report.md");

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
    const preview = await request("/api/assistant-sales-agent-test-lab/preview");

    const unsafeRun = await request("/api/assistant-sales-agent-test-lab/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openLiveBuyerGate: true,
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

    const run = await request("/api/assistant-sales-agent-test-lab/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runBy: "master_admin"
      })
    });

    const list = await request("/api/assistant-sales-agent-test-lab/runs");
    const summary = await request("/api/assistant-sales-agent-test-lab/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Assistant Sales Agent Readiness Test Lab Foundation is active." &&
      preview.body.purpose.includes("before opening any real buyer gate") &&
      preview.body.defaultTestCaseCount >= 6 &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Simulation only")) &&
      preview.body.rules.some(rule => rule.includes("No live buyer gate opened")) &&
      preview.body.rules.some(rule => rule.includes("No WhatsApp auto-send")) &&
      preview.body.rules.some(rule => rule.includes("No quote before stock confirmation")) &&
      preview.body.rules.some(rule => rule.includes("Manual review required before real buyer traffic"));

    const unsafeRunOk =
      unsafeRun.status === 400 &&
      unsafeRun.body &&
      Array.isArray(unsafeRun.body.errors) &&
      unsafeRun.body.errors.some(error => error.includes("Unsafe request blocked"));

    const testRun = run.body && run.body.run;
    const results = testRun && Array.isArray(testRun.results) ? testRun.results : [];

    const runOk =
      run.status === 201 &&
      testRun &&
      testRun.verdict === "APPROVED" &&
      testRun.totalTests >= 6 &&
      testRun.passedCount === testRun.totalTests &&
      testRun.failedCount === 0 &&
      testRun.simulationOnly === true &&
      testRun.assistantSalesAgentReadinessTestOnly === true &&
      testRun.noLiveBuyerGateOpened === true &&
      testRun.noRealBuyerContacted === true &&
      testRun.autoSendWhatsApp === false &&
      testRun.sentToBuyer === false &&
      testRun.autoOpenBrowser === false &&
      testRun.autoReadWhatsApp === false &&
      testRun.scrapeWhatsappMessages === false &&
      testRun.privateMessageScraping === false &&
      testRun.hiddenDataHarvesting === false &&
      testRun.autoUpdateInventory === false &&
      testRun.autoCreateAccountingEntry === false &&
      testRun.autoCloseSale === false &&
      testRun.autoMovePipelineStage === false &&
      testRun.manualReviewRequiredBeforeLiveBuyerGate === true;

    const urgentBuyerOk = results.some(item =>
      item.testCaseId === "urgent_confirmed_alternator_buyer" &&
      item.buyerType === "serious_buyer" &&
      item.nextAction === "prepare_safe_quote_draft" &&
      item.priceMentionAllowed === true &&
      item.replyDraft.includes("135,000") &&
      item.passed === true
    );

    const compatibilityUnknownOk = results.some(item =>
      item.testCaseId === "compatibility_unknown_buyer" &&
      item.buyerType === "needs_compatibility_check" &&
      item.nextAction === "request_vehicle_details" &&
      item.priceMentionAllowed === false &&
      !item.replyDraft.includes("90,000") &&
      item.passed === true
    );

    const stockUnknownOk = results.some(item =>
      item.testCaseId === "stock_unknown_buyer" &&
      item.buyerType === "stock_check_required" &&
      item.nextAction === "confirm_stock_first" &&
      item.priceMentionAllowed === false &&
      !item.replyDraft.includes("150,000") &&
      item.passed === true
    );

    const bulkBuyerOk = results.some(item =>
      item.testCaseId === "bulk_buyer_request" &&
      item.buyerType === "bulk_buyer" &&
      item.nextAction === "qualify_bulk_buyer" &&
      item.replyDraft.toLowerCase().includes("bulk") &&
      item.passed === true
    );

    const lowballOk = results.some(item =>
      item.testCaseId === "lowball_price_checker" &&
      item.buyerType === "price_checker_lowball" &&
      item.nextAction === "protect_margin_and_qualify" &&
      item.replyDraft.toLowerCase().includes("do not quote below safe cost") &&
      item.passed === true
    );

    const wrongPartOk = results.some(item =>
      item.testCaseId === "wrong_part_risk" &&
      item.buyerType === "specific_subpart_buyer" &&
      item.nextAction === "confirm_exact_subpart" &&
      item.replyDraft.toLowerCase().includes("not treat this as a complete starter") &&
      item.passed === true
    );

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.runs) &&
      list.body.runs.some(item =>
        item.id === testRun.id &&
        item.verdict === "APPROVED" &&
        item.simulationOnly === true &&
        item.noLiveBuyerGateOpened === true
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

    const verdict =
      healthOk &&
      previewOk &&
      unsafeRunOk &&
      runOk &&
      urgentBuyerOk &&
      compatibilityUnknownOk &&
      stockUnknownOk &&
      bulkBuyerOk &&
      lowballOk &&
      wrongPartOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 25B Assistant Sales Agent Readiness Test Lab Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/assistant-sales-agent-test-lab/preview works
- ${unsafeRunOk ? "PASS" : "FAIL"}: unsafe live-buyer/auto-send/scrape/accounting/inventory/close request is blocked
- ${runOk ? "PASS" : "FAIL"}: POST /api/assistant-sales-agent-test-lab/run completes internal readiness simulation
- ${urgentBuyerOk ? "PASS" : "FAIL"}: urgent confirmed alternator buyer gets safe quote-draft action
- ${compatibilityUnknownOk ? "PASS" : "FAIL"}: compatibility-unknown buyer is not quoted and asks for details
- ${stockUnknownOk ? "PASS" : "FAIL"}: stock-unknown buyer is not quoted before stock confirmation
- ${bulkBuyerOk ? "PASS" : "FAIL"}: bulk buyer is classified and qualified correctly
- ${lowballOk ? "PASS" : "FAIL"}: lowball price checker triggers margin protection
- ${wrongPartOk ? "PASS" : "FAIL"}: wrong-part/subpart risk is caught before quoting
- ${listOk ? "PASS" : "FAIL"}: GET /api/assistant-sales-agent-test-lab/runs returns test run data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/assistant-sales-agent-test-lab/summary returns safe readiness summary

## Safety Rules Confirmed
- Assistant Sales Agent Test Lab is simulation-only.
- No live buyer gate opened.
- No real buyer contacted.
- No WhatsApp auto-send.
- No WhatsApp auto-read.
- No private message scraping.
- No hidden data harvesting.
- No quote before stock confirmation.
- No quote before compatibility confirmation.
- No inventory update.
- No accounting entry creation.
- No sale closing.
- No pipeline movement.
- Manual review is required before real buyer traffic.
- Test run data restored after smoke test.

## Business Readiness Confirmed
- The agent can distinguish serious buyer, lowball price checker, bulk buyer, stock-check-needed buyer, compatibility-needed buyer, and wrong-part-risk buyer.
- The agent prepares safe reply drafts only.
- The agent does not contact buyers.
- The agent does not open live traffic.
- The agent does not pretend incomplete stock or compatibility is ready.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 25C — Assistant Sales Agent Test Lab Dashboard Display
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

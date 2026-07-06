const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3064;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version16c-admin-hub-link-manual-quote-draft-smoke-test-report.md");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const manualQuotePage = await request("/manual-quote-draft");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const manualQuoteSummary = await request("/api/manual-quote-draft/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Safe Manual Quote Draft Builder") &&
      hub.text.includes("/manual-quote-draft") &&
      hub.text.includes("Manual Quote Drafts") &&
      hub.text.includes("Draft Only") &&
      hub.text.includes("Price In Draft") &&
      hub.text.includes("Price Sent To Buyer") &&
      hub.text.includes("MANUAL QUOTE DRAFT IS DRAFT ONLY") &&
      hub.text.includes("PRICE MAY APPEAR ONLY INSIDE UNSENT DRAFT AFTER ELIGIBILITY");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Safe Manual Quote Draft Builder") &&
      alias.text.includes("/manual-quote-draft");

    const manualQuoteLinkedOk =
      manualQuotePage.status === 200 &&
      manualQuotePage.text.includes("Demega Safe Manual Quote Draft Builder Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Safe Manual Quote Draft Builder" &&
        module.path === "/manual-quote-draft"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.manualQuoteDraftBuilderOnly === true &&
      summary.body.safety.draftOnly === true &&
      summary.body.safety.requiresFinalQuoteEligibility === true &&
      summary.body.safety.priceAllowedInDraftAfterEligibility === true &&
      summary.body.safety.priceSentToBuyer === false &&
      summary.body.safety.quoteAmountSentToBuyer === false &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoOpenBrowser === false &&
      summary.body.safety.automaticBuyerMessage === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.sentToBuyer === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.manualQuoteDraft &&
      typeof metrics.body.metrics.manualQuoteDraft.totalManualQuoteDrafts === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.manualQuoteDraftBuilderOnly === true &&
      metrics.body.safety.draftOnly === true &&
      metrics.body.safety.requiresFinalQuoteEligibility === true &&
      metrics.body.safety.priceSentToBuyer === false &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoCreateQuote === false &&
      metrics.body.safety.sentToBuyer === false;

    const manualQuoteSummaryOk =
      manualQuoteSummary.status === 200 &&
      manualQuoteSummary.body &&
      manualQuoteSummary.body.summary &&
      manualQuoteSummary.body.summary.safety &&
      manualQuoteSummary.body.summary.safety.manualQuoteDraftBuilderOnly === true &&
      manualQuoteSummary.body.summary.safety.requiresFinalQuoteEligibility === true &&
      manualQuoteSummary.body.summary.safety.draftOnly === true &&
      manualQuoteSummary.body.summary.safety.priceAllowedInDraftAfterEligibility === true &&
      manualQuoteSummary.body.summary.safety.priceSentToBuyer === false &&
      manualQuoteSummary.body.summary.safety.autoSendWhatsApp === false &&
      manualQuoteSummary.body.summary.safety.autoOpenBrowser === false &&
      manualQuoteSummary.body.summary.safety.sentToBuyer === false;

    const readOnlyOk =
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("autoOpenBrowser = true") &&
      !hub.text.includes("automaticBuyerMessage = true") &&
      !hub.text.includes("quoteCreatedAutomatically = true") &&
      !hub.text.includes("autoCreateQuote = true") &&
      !hub.text.includes("sentToBuyer = true") &&
      !hub.text.includes("priceSentToBuyer = true") &&
      !hub.text.includes("quoteAmountSentToBuyer = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      manualQuoteLinkedOk &&
      summaryOk &&
      metricsOk &&
      manualQuoteSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 16C Admin Hub Link Safe Manual Quote Draft Builder Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Safe Manual Quote Draft Builder link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Safe Manual Quote Draft Builder
- ${manualQuoteLinkedOk ? "PASS" : "FAIL"}: linked Safe Manual Quote Draft Builder dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Safe Manual Quote Draft Builder module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include manual quote draft metrics safely
- ${manualQuoteSummaryOk ? "PASS" : "FAIL"}: manual quote draft summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after manual quote draft link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not send WhatsApp.
- Admin hub does not message buyer automatically.
- Admin hub does not open browser automatically.
- Admin hub does not move pipeline automatically.
- Admin hub does not mark quote draft as sent.
- Safe Manual Quote Draft Builder remains draft-only.
- Price may appear only inside unsent draft after eligibility.
- Price is not sent to buyer.
- sentToBuyer remains false.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 17A — Manual Quote Copy Button Foundation
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);

    if (verdict !== "APPROVED") process.exitCode = 1;
  } finally {
    if (child) stopProcess(child);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

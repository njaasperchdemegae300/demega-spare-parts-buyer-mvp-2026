const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3061;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version15c-admin-hub-link-quote-eligibility-smoke-test-report.md");

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
    const quoteEligibilityPage = await request("/quote-eligibility");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const quoteEligibilitySummary = await request("/api/quote-eligibility/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Safe Final Quote Eligibility Gate") &&
      hub.text.includes("/quote-eligibility") &&
      hub.text.includes("Quote Eligibility Checks") &&
      hub.text.includes("Eligible For Manual Quote Draft") &&
      hub.text.includes("Final Quote Gate Passed") &&
      hub.text.includes("Blocked Quote Gate") &&
      hub.text.includes("FINAL QUOTE ELIGIBILITY IS CHECK ONLY") &&
      hub.text.includes("NO PRICE AT ELIGIBILITY GATE") &&
      hub.text.includes("MANUAL QUOTE DRAFT ONLY AFTER STOCK + COMPATIBILITY CONFIRMATION");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Safe Final Quote Eligibility Gate") &&
      alias.text.includes("/quote-eligibility");

    const quoteEligibilityLinkedOk =
      quoteEligibilityPage.status === 200 &&
      quoteEligibilityPage.text.includes("Demega Safe Final Quote Eligibility Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Safe Final Quote Eligibility Gate" &&
        module.path === "/quote-eligibility"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.quoteEligibilityOnly === true &&
      summary.body.safety.stockAndCompatibilityRequiredBeforeQuote === true &&
      summary.body.safety.manualQuoteDraftAllowedOnlyAfterBothGates === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoOpenBrowser === false &&
      summary.body.safety.automaticBuyerMessage === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.sentToBuyer === false &&
      summary.body.safety.priceIncluded === false &&
      summary.body.safety.quoteAmountIncluded === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.quoteEligibility &&
      typeof metrics.body.metrics.quoteEligibility.totalQuoteEligibilityChecks === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.quoteEligibilityOnly === true &&
      metrics.body.safety.stockAndCompatibilityRequiredBeforeQuote === true &&
      metrics.body.safety.manualQuoteDraftAllowedOnlyAfterBothGates === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoCreateQuote === false &&
      metrics.body.safety.priceIncluded === false &&
      metrics.body.safety.quoteAmountIncluded === false;

    const quoteEligibilitySummaryOk =
      quoteEligibilitySummary.status === 200 &&
      quoteEligibilitySummary.body &&
      quoteEligibilitySummary.body.summary &&
      quoteEligibilitySummary.body.summary.safety &&
      quoteEligibilitySummary.body.summary.safety.quoteEligibilityOnly === true &&
      quoteEligibilitySummary.body.summary.safety.manualQuoteDraftAllowedOnlyAfterBothGates === true &&
      quoteEligibilitySummary.body.summary.safety.stockAndCompatibilityRequiredBeforeQuote === true &&
      quoteEligibilitySummary.body.summary.safety.autoCreateQuote === false &&
      quoteEligibilitySummary.body.summary.safety.autoSendWhatsApp === false &&
      quoteEligibilitySummary.body.summary.safety.autoOpenBrowser === false &&
      quoteEligibilitySummary.body.summary.safety.sentToBuyer === false &&
      quoteEligibilitySummary.body.summary.safety.priceIncluded === false;

    const readOnlyOk =
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("autoOpenBrowser = true") &&
      !hub.text.includes("automaticBuyerMessage = true") &&
      !hub.text.includes("quoteCreatedAutomatically = true") &&
      !hub.text.includes("autoCreateQuote = true") &&
      !hub.text.includes("sentToBuyer = true") &&
      !hub.text.includes("priceIncluded = true") &&
      !hub.text.includes("quoteAmountIncluded = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      quoteEligibilityLinkedOk &&
      summaryOk &&
      metricsOk &&
      quoteEligibilitySummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 15C Admin Hub Link Safe Final Quote Eligibility Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Safe Final Quote Eligibility Gate link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Safe Final Quote Eligibility Gate
- ${quoteEligibilityLinkedOk ? "PASS" : "FAIL"}: linked Safe Final Quote Eligibility dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Safe Final Quote Eligibility Gate module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include quote eligibility metrics safely
- ${quoteEligibilitySummaryOk ? "PASS" : "FAIL"}: quote eligibility summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after quote eligibility link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not create quote automatically.
- Admin hub does not include price or quote amount.
- Admin hub does not send WhatsApp.
- Admin hub does not message buyer automatically.
- Admin hub does not open browser automatically.
- Admin hub does not move pipeline automatically.
- Safe Final Quote Eligibility Gate remains eligibility-check only.
- Manual quote draft is allowed only after stock and compatibility are both confirmed.
- sentToBuyer remains false.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 16A — Safe Manual Quote Draft Builder Foundation
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

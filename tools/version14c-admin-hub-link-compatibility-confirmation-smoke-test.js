const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3058;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version14c-admin-hub-link-compatibility-confirmation-smoke-test-report.md");

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
    const compatibilityPage = await request("/compatibility-confirmation");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const compatibilitySummary = await request("/api/compatibility-confirmation/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Compatibility Confirmation Gate") &&
      hub.text.includes("/compatibility-confirmation") &&
      hub.text.includes("Compatibility Confirmations") &&
      hub.text.includes("Compatibility Confirmed") &&
      hub.text.includes("Quote Gate Ready") &&
      hub.text.includes("COMPATIBILITY CONFIRMATION IS MANUAL ONLY") &&
      hub.text.includes("MANUAL QUOTE DRAFT ONLY AFTER STOCK + COMPATIBILITY CONFIRMATION");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Compatibility Confirmation Gate") &&
      alias.text.includes("/compatibility-confirmation");

    const compatibilityLinkedOk =
      compatibilityPage.status === 200 &&
      compatibilityPage.text.includes("Demega Compatibility Confirmation Gate Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Compatibility Confirmation Gate" &&
        module.path === "/compatibility-confirmation"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.compatibilityConfirmationManualOnly === true &&
      summary.body.safety.stockAndCompatibilityRequiredBeforeQuote === true &&
      summary.body.safety.manualQuoteDraftAllowedAfterBothConfirmed === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.automaticBuyerMessage === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.sentToBuyer === false &&
      summary.body.safety.priceIncluded === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.compatibilityConfirmation &&
      typeof metrics.body.metrics.compatibilityConfirmation.totalCompatibilityConfirmations === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.compatibilityConfirmationManualOnly === true &&
      metrics.body.safety.stockAndCompatibilityRequiredBeforeQuote === true &&
      metrics.body.safety.manualQuoteDraftAllowedAfterBothConfirmed === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoCreateQuote === false &&
      metrics.body.safety.priceIncluded === false;

    const compatibilitySummaryOk =
      compatibilitySummary.status === 200 &&
      compatibilitySummary.body &&
      compatibilitySummary.body.summary &&
      compatibilitySummary.body.summary.safety &&
      compatibilitySummary.body.summary.safety.compatibilityGateManualOnly === true &&
      compatibilitySummary.body.summary.safety.stockAndCompatibilityRequiredBeforeQuote === true &&
      compatibilitySummary.body.summary.safety.manualQuoteDraftAllowedAfterBothConfirmed === true &&
      compatibilitySummary.body.summary.safety.autoSendWhatsApp === false &&
      compatibilitySummary.body.summary.safety.autoCreateQuote === false &&
      compatibilitySummary.body.summary.safety.sentToBuyer === false &&
      compatibilitySummary.body.summary.safety.priceIncluded === false;

    const readOnlyOk =
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("autoOpenBrowser = true") &&
      !hub.text.includes("automaticBuyerMessage = true") &&
      !hub.text.includes("quoteCreatedAutomatically = true") &&
      !hub.text.includes("autoCreateQuote = true") &&
      !hub.text.includes("sentToBuyer = true") &&
      !hub.text.includes("priceIncluded = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      compatibilityLinkedOk &&
      summaryOk &&
      metricsOk &&
      compatibilitySummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 14C Admin Hub Link Compatibility Confirmation Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Compatibility Confirmation Gate link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Compatibility Confirmation Gate
- ${compatibilityLinkedOk ? "PASS" : "FAIL"}: linked Compatibility Confirmation Gate dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Compatibility Confirmation Gate module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include compatibility confirmation metrics safely
- ${compatibilitySummaryOk ? "PASS" : "FAIL"}: compatibility confirmation summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after compatibility confirmation link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not send WhatsApp.
- Admin hub does not message buyer automatically.
- Admin hub does not create quote automatically.
- Admin hub does not move pipeline automatically.
- Compatibility confirmation remains manual-only.
- Manual quote draft is allowed only after stock and compatibility are both confirmed.
- sentToBuyer remains false.
- Price is not included.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 15A — Safe Final Quote Eligibility Gate Foundation
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

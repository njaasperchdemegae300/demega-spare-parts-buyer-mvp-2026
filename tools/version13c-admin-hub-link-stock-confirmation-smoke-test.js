const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3055;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version13c-admin-hub-link-stock-confirmation-smoke-test-report.md");

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
    const stockPage = await request("/stock-confirmation");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const stockSummary = await request("/api/stock-confirmation/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Stock Confirmation Gate") &&
      hub.text.includes("/stock-confirmation") &&
      hub.text.includes("Stock Confirmations") &&
      hub.text.includes("Confirmed In Stock") &&
      hub.text.includes("Quote Allowed At Stock Gate") &&
      hub.text.includes("STOCK CONFIRMATION IS MANUAL ONLY") &&
      hub.text.includes("QUOTE ONLY AFTER STOCK + COMPATIBILITY CONFIRMATION");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Stock Confirmation Gate") &&
      alias.text.includes("/stock-confirmation");

    const stockLinkedOk =
      stockPage.status === 200 &&
      stockPage.text.includes("Demega Stock Confirmation Gate Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Stock Confirmation Gate" &&
        module.path === "/stock-confirmation"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.stockConfirmationManualOnly === true &&
      summary.body.safety.quoteAllowedAtStockGate === false &&
      summary.body.safety.compatibilityRequiredBeforeQuote === true &&
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
      metrics.body.metrics.stockConfirmation &&
      typeof metrics.body.metrics.stockConfirmation.totalStockConfirmations === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.stockConfirmationManualOnly === true &&
      metrics.body.safety.quoteAllowedAtStockGate === false &&
      metrics.body.safety.compatibilityRequiredBeforeQuote === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoCreateQuote === false &&
      metrics.body.safety.priceIncluded === false;

    const stockSummaryOk =
      stockSummary.status === 200 &&
      stockSummary.body &&
      stockSummary.body.summary &&
      stockSummary.body.summary.safety &&
      stockSummary.body.summary.safety.stockGateManualOnly === true &&
      stockSummary.body.summary.safety.quoteAllowedAtStockGate === false &&
      stockSummary.body.summary.safety.compatibilityRequiredBeforeQuote === true &&
      stockSummary.body.summary.safety.autoSendWhatsApp === false &&
      stockSummary.body.summary.safety.autoCreateQuote === false &&
      stockSummary.body.summary.safety.sentToBuyer === false &&
      stockSummary.body.summary.safety.priceIncluded === false;

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
      stockLinkedOk &&
      summaryOk &&
      metricsOk &&
      stockSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 13C Admin Hub Link Stock Confirmation Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Stock Confirmation Gate link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Stock Confirmation Gate
- ${stockLinkedOk ? "PASS" : "FAIL"}: linked Stock Confirmation Gate dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Stock Confirmation Gate module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include stock confirmation metrics safely
- ${stockSummaryOk ? "PASS" : "FAIL"}: stock confirmation summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after stock confirmation link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not send WhatsApp.
- Admin hub does not message buyer automatically.
- Admin hub does not create quote automatically.
- Admin hub does not move pipeline automatically.
- Stock confirmation remains manual-only.
- Quote remains blocked at stock confirmation stage.
- Compatibility confirmation is still required before quote.
- sentToBuyer remains false.
- Price is not included.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 14A — Compatibility Confirmation Gate Foundation
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

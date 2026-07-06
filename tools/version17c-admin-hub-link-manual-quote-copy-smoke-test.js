const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3067;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version17c-admin-hub-link-manual-quote-copy-smoke-test-report.md");

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
    const manualQuoteCopyPage = await request("/manual-quote-copy");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const manualQuoteCopySummary = await request("/api/manual-quote-copy/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Manual Quote Copy Button") &&
      hub.text.includes("/manual-quote-copy") &&
      hub.text.includes("Manual Quote Copy Actions") &&
      hub.text.includes("Copy Prepared") &&
      hub.text.includes("Manual Copy Only") &&
      hub.text.includes("Clipboard Access") &&
      hub.text.includes("MANUAL QUOTE COPY IS PREPARE TEXT ONLY") &&
      hub.text.includes("NO SERVER CLIPBOARD ACCESS") &&
      hub.text.includes("NO BROWSER AUTO-COPY");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Manual Quote Copy Button") &&
      alias.text.includes("/manual-quote-copy");

    const manualQuoteCopyLinkedOk =
      manualQuoteCopyPage.status === 200 &&
      manualQuoteCopyPage.text.includes("Demega Manual Quote Copy Button Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Manual Quote Copy Button" &&
        module.path === "/manual-quote-copy"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.manualQuoteCopyFoundationOnly === true &&
      summary.body.safety.preparesCopyTextOnly === true &&
      summary.body.safety.serverDoesNotAccessClipboard === true &&
      summary.body.safety.browserAutoCopy === false &&
      summary.body.safety.copiedToClipboardByBrowser === false &&
      summary.body.safety.priceMayAppearInCopyTextAfterEligibility === true &&
      summary.body.safety.priceSentToBuyer === false &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoOpenBrowser === false &&
      summary.body.safety.automaticBuyerMessage === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.sentToBuyer === false &&
      summary.body.safety.sentByAdmin === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.manualQuoteCopy &&
      typeof metrics.body.metrics.manualQuoteCopy.totalManualQuoteCopyActions === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.manualQuoteCopyFoundationOnly === true &&
      metrics.body.safety.preparesCopyTextOnly === true &&
      metrics.body.safety.serverDoesNotAccessClipboard === true &&
      metrics.body.safety.browserAutoCopy === false &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.sentToBuyer === false;

    const manualQuoteCopySummaryOk =
      manualQuoteCopySummary.status === 200 &&
      manualQuoteCopySummary.body &&
      manualQuoteCopySummary.body.summary &&
      manualQuoteCopySummary.body.summary.safety &&
      manualQuoteCopySummary.body.summary.safety.manualQuoteCopyFoundationOnly === true &&
      manualQuoteCopySummary.body.summary.safety.preparesCopyTextOnly === true &&
      manualQuoteCopySummary.body.summary.safety.serverDoesNotAccessClipboard === true &&
      manualQuoteCopySummary.body.summary.safety.browserAutoCopy === false &&
      manualQuoteCopySummary.body.summary.safety.autoSendWhatsApp === false &&
      manualQuoteCopySummary.body.summary.safety.autoOpenBrowser === false &&
      manualQuoteCopySummary.body.summary.safety.sentToBuyer === false;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
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
      manualQuoteCopyLinkedOk &&
      summaryOk &&
      metricsOk &&
      manualQuoteCopySummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 17C Admin Hub Link Manual Quote Copy Button Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Quote Copy Button link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Quote Copy Button
- ${manualQuoteCopyLinkedOk ? "PASS" : "FAIL"}: linked Manual Quote Copy dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Quote Copy Button module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include manual quote copy metrics safely
- ${manualQuoteCopySummaryOk ? "PASS" : "FAIL"}: manual quote copy summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after manual quote copy link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not access clipboard.
- Admin hub does not auto-copy quote text.
- Admin hub does not send WhatsApp.
- Admin hub does not message buyer automatically.
- Admin hub does not open browser automatically.
- Admin hub does not move pipeline automatically.
- Admin hub does not mark quote as sent.
- Manual Quote Copy Button remains prepare-text-only.
- sentToBuyer remains false.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 18A — Manual Quote Sent Confirmation Gate Foundation
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

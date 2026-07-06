const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3070;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version18c-admin-hub-link-manual-sent-confirmation-smoke-test-report.md");

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
    const sentPage = await request("/manual-quote-sent-confirmation");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const sentSummary = await request("/api/manual-quote-sent-confirmation/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Manual Quote Sent Confirmation Gate") &&
      hub.text.includes("/manual-quote-sent-confirmation") &&
      hub.text.includes("Manual Sent Confirmations") &&
      hub.text.includes("Admin Manual Sent") &&
      hub.text.includes("Manual Review Completed") &&
      hub.text.includes("System Sent Count") &&
      hub.text.includes("MANUAL SENT CONFIRMATION IS RECORD ONLY") &&
      hub.text.includes("SYSTEM DOES NOT SEND BUYER MESSAGE");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Manual Quote Sent Confirmation Gate") &&
      alias.text.includes("/manual-quote-sent-confirmation");

    const sentLinkedOk =
      sentPage.status === 200 &&
      sentPage.text.includes("Demega Manual Quote Sent Confirmation Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Manual Quote Sent Confirmation Gate" &&
        module.path === "/manual-quote-sent-confirmation"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.manualQuoteSentConfirmationOnly === true &&
      summary.body.safety.confirmationRecordOnly === true &&
      summary.body.safety.requiresPreparedCopyAction === true &&
      summary.body.safety.requiresManualAdminConfirmation === true &&
      summary.body.safety.requiresManualReviewCompleted === true &&
      summary.body.safety.systemDoesNotSendMessage === true &&
      summary.body.safety.systemSentToBuyer === false &&
      summary.body.safety.sentToBuyerBySystem === false &&
      summary.body.safety.quoteMarkedSentBySystem === false &&
      summary.body.safety.priceSentBySystem === false &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoOpenBrowser === false &&
      summary.body.safety.automaticBuyerMessage === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.serverDoesNotAccessClipboard === true &&
      summary.body.safety.browserAutoCopy === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.manualQuoteSentConfirmation &&
      typeof metrics.body.metrics.manualQuoteSentConfirmation.totalManualQuoteSentConfirmations === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.manualQuoteSentConfirmationOnly === true &&
      metrics.body.safety.systemDoesNotSendMessage === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.systemSentToBuyer === false;

    const sentSummaryOk =
      sentSummary.status === 200 &&
      sentSummary.body &&
      sentSummary.body.summary &&
      sentSummary.body.summary.safety &&
      sentSummary.body.summary.safety.manualQuoteSentConfirmationOnly === true &&
      sentSummary.body.summary.safety.requiresPreparedCopyAction === true &&
      sentSummary.body.summary.safety.requiresManualAdminConfirmation === true &&
      sentSummary.body.summary.safety.systemDoesNotSendMessage === true &&
      sentSummary.body.summary.safety.systemSentToBuyer === false &&
      sentSummary.body.summary.safety.autoSendWhatsApp === false &&
      sentSummary.body.summary.safety.serverClipboardAccess === false &&
      sentSummary.body.summary.safety.browserAutoCopy === false;

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
      !hub.text.includes("systemSentToBuyer = true") &&
      !hub.text.includes("sentToBuyerBySystem = true") &&
      !hub.text.includes("quoteMarkedSentBySystem = true") &&
      !hub.text.includes("priceSentBySystem = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      sentLinkedOk &&
      summaryOk &&
      metricsOk &&
      sentSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 18C Admin Hub Link Manual Quote Sent Confirmation Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Quote Sent Confirmation Gate link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Quote Sent Confirmation Gate
- ${sentLinkedOk ? "PASS" : "FAIL"}: linked Manual Quote Sent Confirmation dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Quote Sent Confirmation Gate module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include manual sent confirmation metrics safely
- ${sentSummaryOk ? "PASS" : "FAIL"}: manual sent confirmation summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after manual sent confirmation link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not send WhatsApp.
- Admin hub does not message buyer automatically.
- Admin hub does not open browser automatically.
- Admin hub does not access clipboard.
- Admin hub does not auto-copy.
- Admin hub does not move pipeline automatically.
- Admin hub does not mark quote as sent by system.
- Manual Quote Sent Confirmation Gate remains confirmation-record-only.
- System does not send buyer message.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 19A — Buyer Reply Tracking Foundation
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

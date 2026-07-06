const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3052;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version12c-admin-hub-link-whatsapp-manual-smoke-test-report.md");

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
    const whatsappPage = await request("/whatsapp-manual");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const whatsappSummary = await request("/api/whatsapp-manual/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("WhatsApp Manual Open Dashboard") &&
      hub.text.includes("/whatsapp-manual") &&
      hub.text.includes("Manual WhatsApp Links") &&
      hub.text.includes("Manual Review Links") &&
      hub.text.includes("WHATSAPP LINKS ARE MANUAL OPEN ONLY") &&
      hub.text.includes("NO AUTO SEND") &&
      hub.text.includes("MANUAL REVIEW REQUIRED");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("WhatsApp Manual Open Dashboard") &&
      alias.text.includes("/whatsapp-manual");

    const whatsappLinkedOk =
      whatsappPage.status === 200 &&
      whatsappPage.text.includes("Demega WhatsApp Manual Open Link Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "WhatsApp Manual Open Dashboard" &&
        module.path === "/whatsapp-manual"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.whatsappManualOpenOnly === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoOpenBrowser === false &&
      summary.body.safety.automaticBuyerMessage === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.sentToBuyer === false &&
      summary.body.safety.priceIncluded === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.whatsappManual &&
      typeof metrics.body.metrics.whatsappManual.totalManualLinks === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.whatsappManualOpenOnly === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoOpenBrowser === false &&
      metrics.body.safety.priceIncluded === false;

    const whatsappSummaryOk =
      whatsappSummary.status === 200 &&
      whatsappSummary.body &&
      whatsappSummary.body.summary &&
      whatsappSummary.body.summary.safety &&
      whatsappSummary.body.summary.safety.manualOpenOnly === true &&
      whatsappSummary.body.summary.safety.autoSendWhatsApp === false &&
      whatsappSummary.body.summary.safety.autoOpenBrowser === false &&
      whatsappSummary.body.summary.safety.sentToBuyer === false &&
      whatsappSummary.body.summary.safety.priceIncluded === false &&
      whatsappSummary.body.summary.safety.autoCreateQuote === false;

    const readOnlyOk =
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("autoOpenBrowser = true") &&
      !hub.text.includes("automaticBuyerMessage = true") &&
      !hub.text.includes("quoteCreatedAutomatically = true") &&
      !hub.text.includes("sentToBuyer = true") &&
      !hub.text.includes("priceIncluded = true") &&
      !hub.text.includes("window.open") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      whatsappLinkedOk &&
      summaryOk &&
      metricsOk &&
      whatsappSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 12C Admin Hub Link WhatsApp Manual Open Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays WhatsApp Manual Open Dashboard link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays WhatsApp Manual Open Dashboard
- ${whatsappLinkedOk ? "PASS" : "FAIL"}: linked WhatsApp Manual Open Dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes WhatsApp Manual Open module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include WhatsApp manual-link metrics safely
- ${whatsappSummaryOk ? "PASS" : "FAIL"}: WhatsApp manual summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after WhatsApp manual link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not send WhatsApp.
- Admin hub does not open browser automatically.
- Admin hub does not message buyer automatically.
- Admin hub does not create quote automatically.
- Admin hub does not include price.
- WhatsApp links remain manual-open only.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 13A — Stock Confirmation Gate Foundation
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

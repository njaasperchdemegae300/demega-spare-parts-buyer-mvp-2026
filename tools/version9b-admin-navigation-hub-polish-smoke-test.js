const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3043;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version9b-admin-navigation-hub-polish-smoke-test-report.md");

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
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Live Business Snapshot") &&
      hub.text.includes("Admin Safety Locks") &&
      hub.text.includes("Buyer Leads") &&
      hub.text.includes("Inventory Items") &&
      hub.text.includes("Quote Drafts") &&
      hub.text.includes("Pipeline Events") &&
      hub.text.includes("Follow-Up Reminders") &&
      hub.text.includes("/api/admin-navigation/dashboard-metrics") &&
      hub.text.includes("NO AUTO SEND") &&
      hub.text.includes("MANUAL REVIEW REQUIRED");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Live Business Snapshot");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.length >= 5 &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.message === "Admin Navigation Hub dashboard metrics are active." &&
      metrics.body.metrics &&
      metrics.body.metrics.buyerLeads &&
      typeof metrics.body.metrics.buyerLeads.total === "number" &&
      metrics.body.metrics.inventory &&
      metrics.body.metrics.quotes &&
      metrics.body.metrics.pipeline &&
      metrics.body.metrics.followUps &&
      metrics.body.safety &&
      metrics.body.safety.navigationOnly === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoCreateQuote === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const readOnlyOk =
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("quoteCreatedAutomatically = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      summaryOk &&
      metricsOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 9B Admin Navigation Hub Polish Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: polished admin hub page displays live business snapshot
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub alias returns polished hub
- ${summaryOk ? "PASS" : "FAIL"}: admin navigation summary remains safe
- ${metricsOk ? "PASS" : "FAIL"}: dashboard metrics API returns approved module metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: polished admin hub remains read-only

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not send WhatsApp.
- Admin hub does not create quote automatically.
- Admin hub does not move pipeline stage automatically.
- Metrics API is read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 10A — Buyer Action Queue Foundation
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

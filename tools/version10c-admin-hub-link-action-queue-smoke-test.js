const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3046;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version10c-admin-hub-link-action-queue-smoke-test-report.md");

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
    const actionQueuePage = await request("/action-queue");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Buyer Action Queue") &&
      hub.text.includes("/action-queue") &&
      hub.text.includes("Buyer Actions") &&
      hub.text.includes("Urgent Actions") &&
      hub.text.includes("ACTION QUEUE IS MANUAL ONLY") &&
      hub.text.includes("NO AUTO SEND") &&
      hub.text.includes("MANUAL REVIEW REQUIRED");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Buyer Action Queue") &&
      alias.text.includes("/action-queue");

    const actionQueueLinkedOk =
      actionQueuePage.status === 200 &&
      actionQueuePage.text.includes("Demega Buyer Action Queue Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Buyer Action Queue" &&
        module.path === "/action-queue"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.automaticBuyerMessage === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.autoCompleteBuyerAction === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.actionQueue &&
      typeof metrics.body.metrics.actionQueue.totalActions === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoCreateQuote === false &&
      metrics.body.safety.autoMovePipelineStage === false &&
      metrics.body.safety.autoCompleteBuyerAction === false;

    const readOnlyOk =
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("quoteCreatedAutomatically = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      actionQueueLinkedOk &&
      summaryOk &&
      metricsOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 10C Admin Hub Link Action Queue Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Buyer Action Queue link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Buyer Action Queue
- ${actionQueueLinkedOk ? "PASS" : "FAIL"}: linked Buyer Action Queue dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Buyer Action Queue module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include action queue metrics safely
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after action queue link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not send WhatsApp.
- Admin hub does not message buyer automatically.
- Admin hub does not create quote automatically.
- Admin hub does not move pipeline stage automatically.
- Admin hub does not complete buyer actions automatically.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 11A — Hot Buyer Command Center Foundation
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

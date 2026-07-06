const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3049;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version11c-admin-hub-link-hot-buyers-smoke-test-report.md");

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
    const hotBuyerPage = await request("/hot-buyers");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const hotBuyerSummary = await request("/api/hot-buyers/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Hot Buyer Command Center") &&
      hub.text.includes("/hot-buyers") &&
      hub.text.includes("Hot Buyer Candidates") &&
      hub.text.includes("Urgent Hot Buyers") &&
      hub.text.includes("HOT BUYER RANKING IS READ ONLY") &&
      hub.text.includes("NO AUTO SEND") &&
      hub.text.includes("MANUAL REVIEW REQUIRED");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Hot Buyer Command Center") &&
      alias.text.includes("/hot-buyers");

    const hotBuyerLinkedOk =
      hotBuyerPage.status === 200 &&
      hotBuyerPage.text.includes("Demega Hot Buyer Command Center");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Hot Buyer Command Center" &&
        module.path === "/hot-buyers"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.hotBuyerRankingReadOnly === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.automaticBuyerMessage === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.autoContactHotBuyer === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.hotBuyers &&
      typeof metrics.body.metrics.hotBuyers.totalHotBuyerCandidates === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.hotBuyerRankingReadOnly === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoCreateQuote === false &&
      metrics.body.safety.autoMovePipelineStage === false &&
      metrics.body.safety.autoContactHotBuyer === false;

    const hotBuyerSummaryOk =
      hotBuyerSummary.status === 200 &&
      hotBuyerSummary.body &&
      hotBuyerSummary.body.summary &&
      hotBuyerSummary.body.summary.safety &&
      hotBuyerSummary.body.summary.safety.readOnlyRanking === true &&
      hotBuyerSummary.body.summary.safety.autoSendWhatsApp === false &&
      hotBuyerSummary.body.summary.safety.autoCreateQuote === false;

    const readOnlyOk =
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("automaticBuyerMessage = true") &&
      !hub.text.includes("quoteCreatedAutomatically = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("sentToBuyer = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      hotBuyerLinkedOk &&
      summaryOk &&
      metricsOk &&
      hotBuyerSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 11C Admin Hub Link Hot Buyer Command Center Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Hot Buyer Command Center link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Hot Buyer Command Center
- ${hotBuyerLinkedOk ? "PASS" : "FAIL"}: linked Hot Buyer Command Center dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Hot Buyer Command Center module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include hot buyer metrics safely
- ${hotBuyerSummaryOk ? "PASS" : "FAIL"}: hot buyer summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after hot buyer link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Admin hub does not send WhatsApp.
- Admin hub does not message buyer automatically.
- Admin hub does not create quote automatically.
- Admin hub does not move pipeline stage automatically.
- Admin hub does not contact hot buyers automatically.
- Hot buyer ranking remains read-only.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 12A — WhatsApp Manual Open Link Foundation
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

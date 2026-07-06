const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3079;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version21c-admin-hub-link-manual-deal-outcome-smoke-test-report.md");

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
  const response = await fetch(`${BASE_URL}${route}`);
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
    const outcomePage = await request("/manual-deal-outcome");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const outcomeSummary = await request("/api/manual-deal-outcome/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Manual Deal Outcome Gate") &&
      hub.text.includes("/manual-deal-outcome") &&
      hub.text.includes("Deal Outcomes") &&
      hub.text.includes("Manual Deal Won") &&
      hub.text.includes("Amount Received") &&
      hub.text.includes("System Closed Sales") &&
      hub.text.includes("Auto Payment Count") &&
      hub.text.includes("Auto Stock Count") &&
      hub.text.includes("MANUAL DEAL OUTCOME IS RECORD ONLY") &&
      hub.text.includes("NO AUTOMATIC SALE CLOSING") &&
      hub.text.includes("NO PAYMENT AUTOMATION") &&
      hub.text.includes("NO STOCK AUTOMATION");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Manual Deal Outcome Gate") &&
      alias.text.includes("/manual-deal-outcome");

    const outcomeLinkedOk =
      outcomePage.status === 200 &&
      outcomePage.text.includes("Demega Manual Deal Outcome Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Manual Deal Outcome Gate" &&
        module.path === "/manual-deal-outcome"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.manualDealOutcomeGateOnly === true &&
      summary.body.safety.manualDealOutcomeOnly === true &&
      summary.body.safety.manualOutcomeRecordOnly === true &&
      summary.body.safety.requiresFollowupAction === true &&
      summary.body.safety.requiresAdminCompletedManualAction === true &&
      summary.body.safety.requiresManualOutcomeApproval === true &&
      summary.body.safety.systemDoesNotCloseSale === true &&
      summary.body.safety.systemDoesNotMovePipeline === true &&
      summary.body.safety.systemDoesNotSendMessage === true &&
      summary.body.safety.systemDoesNotHandlePayment === true &&
      summary.body.safety.systemDoesNotChangeStock === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.autoCloseSale === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoReplyToBuyer === false &&
      summary.body.safety.autoOpenBrowser === false &&
      summary.body.safety.collectPaymentAutomatically === false &&
      summary.body.safety.autoReserveStock === false &&
      summary.body.safety.autoReduceStock === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.manualDealOutcome &&
      typeof metrics.body.metrics.manualDealOutcome.totalManualDealOutcomes === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.manualDealOutcomeGateOnly === true &&
      metrics.body.safety.manualOutcomeRecordOnly === true &&
      metrics.body.safety.systemDoesNotCloseSale === true &&
      metrics.body.safety.systemDoesNotHandlePayment === true &&
      metrics.body.safety.systemDoesNotChangeStock === true &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.collectPaymentAutomatically === false &&
      metrics.body.safety.autoReserveStock === false;

    const outcomeSummaryOk =
      outcomeSummary.status === 200 &&
      outcomeSummary.body &&
      outcomeSummary.body.summary &&
      outcomeSummary.body.summary.safety &&
      outcomeSummary.body.summary.safety.manualDealOutcomeGateOnly === true &&
      outcomeSummary.body.summary.safety.manualDealOutcomeOnly === true &&
      outcomeSummary.body.summary.safety.manualOutcomeRecordOnly === true &&
      outcomeSummary.body.summary.safety.requiresFollowupAction === true &&
      outcomeSummary.body.summary.safety.requiresAdminCompletedManualAction === true &&
      outcomeSummary.body.summary.safety.requiresManualOutcomeApproval === true &&
      outcomeSummary.body.summary.safety.systemDoesNotCloseSale === true &&
      outcomeSummary.body.summary.safety.systemDoesNotMovePipeline === true &&
      outcomeSummary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      outcomeSummary.body.summary.safety.systemDoesNotHandlePayment === true &&
      outcomeSummary.body.summary.safety.systemDoesNotChangeStock === true &&
      outcomeSummary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      outcomeSummary.body.summary.safety.hiddenDataHarvesting === false &&
      outcomeSummary.body.summary.safety.autoCloseSale === false &&
      outcomeSummary.body.summary.safety.autoMovePipelineStage === false &&
      outcomeSummary.body.summary.safety.autoSendWhatsApp === false &&
      outcomeSummary.body.summary.safety.collectPaymentAutomatically === false &&
      outcomeSummary.body.summary.safety.autoReserveStock === false &&
      outcomeSummary.body.summary.safety.autoReduceStock === false;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("autoReplyToBuyer = true") &&
      !hub.text.includes("automaticBuyerMessage = true") &&
      !hub.text.includes("autoOpenBrowser = true") &&
      !hub.text.includes("systemClosedSale = true") &&
      !hub.text.includes("autoCloseSale = true") &&
      !hub.text.includes("closeSaleAutomatically = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("markSaleWonAutomatically = true") &&
      !hub.text.includes("collectPaymentAutomatically = true") &&
      !hub.text.includes("verifyPaymentAutomatically = true") &&
      !hub.text.includes("autoReserveStock = true") &&
      !hub.text.includes("autoReduceStock = true") &&
      !hub.text.includes("autoReadWhatsApp = true") &&
      !hub.text.includes("scrapeWhatsappMessages = true") &&
      !hub.text.includes("privateMessageScraping = true") &&
      !hub.text.includes("hiddenDataHarvesting = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      outcomeLinkedOk &&
      summaryOk &&
      metricsOk &&
      outcomeSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 21C Admin Hub Link Manual Deal Outcome Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Deal Outcome Gate link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Deal Outcome Gate
- ${outcomeLinkedOk ? "PASS" : "FAIL"}: linked Manual Deal Outcome dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Deal Outcome Gate module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include manual deal outcome metrics safely
- ${outcomeSummaryOk ? "PASS" : "FAIL"}: manual deal outcome summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after manual deal outcome link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Manual Deal Outcome Gate remains outcome-record-only.
- Follow-up action is required before outcome recording.
- Admin completed manual action is required.
- Manual outcome approval is required.
- Admin hub does not close sales.
- Admin hub does not move pipeline automatically.
- Admin hub does not send WhatsApp.
- Admin hub does not auto-reply to buyer.
- Admin hub does not open browser automatically.
- Admin hub does not handle payment.
- Admin hub does not change stock.
- Admin hub does not read buyer messages.
- Admin hub does not scrape private messages.
- Admin hub does not harvest hidden data.
- Metrics API remains read-only.
- Manual review remains required before accounting, pipeline, or stock update.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 22A — Manual Stock Movement Review Gate Foundation
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

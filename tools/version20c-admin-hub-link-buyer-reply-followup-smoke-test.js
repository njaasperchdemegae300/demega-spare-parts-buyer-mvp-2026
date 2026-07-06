const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3076;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version20c-admin-hub-link-buyer-reply-followup-smoke-test-report.md");

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
    const followupPage = await request("/buyer-reply-followup");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const followupSummary = await request("/api/buyer-reply-followup/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Buyer Reply Follow-Up Action Gate") &&
      hub.text.includes("/buyer-reply-followup") &&
      hub.text.includes("Follow-Up Actions") &&
      hub.text.includes("Urgent Follow-Ups") &&
      hub.text.includes("Manual Action Only") &&
      hub.text.includes("System Executed") &&
      hub.text.includes("Auto Close Count") &&
      hub.text.includes("BUYER REPLY FOLLOW-UP ACTION IS MANUAL ACTION ONLY") &&
      hub.text.includes("SYSTEM DOES NOT EXECUTE FOLLOW-UP ACTION") &&
      hub.text.includes("NO AUTOMATIC CLOSING");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Buyer Reply Follow-Up Action Gate") &&
      alias.text.includes("/buyer-reply-followup");

    const followupLinkedOk =
      followupPage.status === 200 &&
      followupPage.text.includes("Demega Buyer Reply Follow-Up Action Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Buyer Reply Follow-Up Action Gate" &&
        module.path === "/buyer-reply-followup"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.buyerReplyFollowupActionGateOnly === true &&
      summary.body.safety.manualActionOnly === true &&
      summary.body.safety.actionPreparedOnly === true &&
      summary.body.safety.requiresBuyerReply === true &&
      summary.body.safety.requiresAdminReviewedBuyerReply === true &&
      summary.body.safety.requiresManualActionApproval === true &&
      summary.body.safety.systemDoesNotExecuteAction === true &&
      summary.body.safety.systemDoesNotSendMessage === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.systemDoesNotMovePipeline === true &&
      summary.body.safety.systemDoesNotCloseSale === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoReplyToBuyer === false &&
      summary.body.safety.autoOpenBrowser === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.buyerReplyFollowupAction &&
      typeof metrics.body.metrics.buyerReplyFollowupAction.totalBuyerReplyFollowupActions === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.buyerReplyFollowupActionGateOnly === true &&
      metrics.body.safety.manualActionOnly === true &&
      metrics.body.safety.systemDoesNotExecuteAction === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReplyToBuyer === false &&
      metrics.body.safety.hiddenDataHarvesting === false;

    const followupSummaryOk =
      followupSummary.status === 200 &&
      followupSummary.body &&
      followupSummary.body.summary &&
      followupSummary.body.summary.safety &&
      followupSummary.body.summary.safety.buyerReplyFollowupActionGateOnly === true &&
      followupSummary.body.summary.safety.manualActionOnly === true &&
      followupSummary.body.summary.safety.actionPreparedOnly === true &&
      followupSummary.body.summary.safety.requiresBuyerReply === true &&
      followupSummary.body.summary.safety.requiresAdminReviewedBuyerReply === true &&
      followupSummary.body.summary.safety.requiresManualActionApproval === true &&
      followupSummary.body.summary.safety.systemDoesNotExecuteAction === true &&
      followupSummary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      followupSummary.body.summary.safety.systemDoesNotAutoReply === true &&
      followupSummary.body.summary.safety.systemDoesNotOpenBrowser === true &&
      followupSummary.body.summary.safety.systemDoesNotMovePipeline === true &&
      followupSummary.body.summary.safety.systemDoesNotCloseSale === true &&
      followupSummary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      followupSummary.body.summary.safety.hiddenDataHarvesting === false &&
      followupSummary.body.summary.safety.autoSendWhatsApp === false &&
      followupSummary.body.summary.safety.autoReplyToBuyer === false;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("sendWhatsApp = true") &&
      !hub.text.includes("autoReplyToBuyer = true") &&
      !hub.text.includes("automaticBuyerMessage = true") &&
      !hub.text.includes("autoOpenBrowser = true") &&
      !hub.text.includes("actionExecutedBySystem = true") &&
      !hub.text.includes("actionCompletedBySystem = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("markSaleWonAutomatically = true") &&
      !hub.text.includes("markLeadClosedAutomatically = true") &&
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
      followupLinkedOk &&
      summaryOk &&
      metricsOk &&
      followupSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 20C Admin Hub Link Buyer Reply Follow-Up Action Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Buyer Reply Follow-Up Action Gate link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Buyer Reply Follow-Up Action Gate
- ${followupLinkedOk ? "PASS" : "FAIL"}: linked Buyer Reply Follow-Up Action dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Buyer Reply Follow-Up Action Gate module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include buyer reply follow-up action metrics safely
- ${followupSummaryOk ? "PASS" : "FAIL"}: buyer reply follow-up action summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after buyer reply follow-up action link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Buyer Reply Follow-Up Action Gate remains manual-action-only.
- Buyer reply is required before follow-up action planning.
- Admin review and manual action approval are required.
- Admin hub does not execute actions.
- Admin hub does not send WhatsApp.
- Admin hub does not auto-reply to buyer.
- Admin hub does not open browser automatically.
- Admin hub does not move pipeline automatically.
- Admin hub does not close sale automatically.
- Admin hub does not read buyer messages.
- Admin hub does not scrape private messages.
- Admin hub does not harvest hidden data.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 21A — Manual Deal Outcome Gate Foundation
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

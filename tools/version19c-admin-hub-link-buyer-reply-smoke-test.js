const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3073;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version19c-admin-hub-link-buyer-reply-smoke-test-report.md");

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
    const buyerReplyPage = await request("/buyer-reply");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const buyerReplySummary = await request("/api/buyer-reply/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Buyer Reply Tracking") &&
      hub.text.includes("/buyer-reply") &&
      hub.text.includes("Buyer Replies") &&
      hub.text.includes("Hot Replies") &&
      hub.text.includes("Manual Entry Replies") &&
      hub.text.includes("System Read Count") &&
      hub.text.includes("Scraping Count") &&
      hub.text.includes("Auto Reply Count") &&
      hub.text.includes("BUYER REPLY TRACKING IS MANUAL ENTRY ONLY") &&
      hub.text.includes("NO WHATSAPP MESSAGE READING") &&
      hub.text.includes("NO PRIVATE MESSAGE SCRAPING") &&
      hub.text.includes("NO HIDDEN DATA HARVESTING") &&
      hub.text.includes("NO AUTO REPLY");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Buyer Reply Tracking") &&
      alias.text.includes("/buyer-reply");

    const buyerReplyLinkedOk =
      buyerReplyPage.status === 200 &&
      buyerReplyPage.text.includes("Demega Buyer Reply Tracking Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Buyer Reply Tracking" &&
        module.path === "/buyer-reply"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.buyerReplyTrackingOnly === true &&
      summary.body.safety.manualEntryOnly === true &&
      summary.body.safety.requiresManualSentConfirmation === true &&
      summary.body.safety.adminObservedReplyRequired === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.autoReadWhatsApp === false &&
      summary.body.safety.readBuyerMessagesAutomatically === false &&
      summary.body.safety.scrapeWhatsappMessages === false &&
      summary.body.safety.privateMessageScraping === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.autoReplyToBuyer === false &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoOpenBrowser === false &&
      summary.body.safety.automaticBuyerMessage === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.buyerReply &&
      typeof metrics.body.metrics.buyerReply.totalBuyerReplies === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.buyerReplyTrackingOnly === true &&
      metrics.body.safety.manualEntryOnly === true &&
      metrics.body.safety.systemDoesNotReadBuyerMessages === true &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.scrapeWhatsappMessages === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.autoReplyToBuyer === false &&
      metrics.body.safety.autoSendWhatsApp === false;

    const buyerReplySummaryOk =
      buyerReplySummary.status === 200 &&
      buyerReplySummary.body &&
      buyerReplySummary.body.summary &&
      buyerReplySummary.body.summary.safety &&
      buyerReplySummary.body.summary.safety.buyerReplyTrackingOnly === true &&
      buyerReplySummary.body.summary.safety.manualEntryOnly === true &&
      buyerReplySummary.body.summary.safety.requiresManualSentConfirmation === true &&
      buyerReplySummary.body.summary.safety.adminObservedReplyRequired === true &&
      buyerReplySummary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      buyerReplySummary.body.summary.safety.autoReadWhatsApp === false &&
      buyerReplySummary.body.summary.safety.scrapeWhatsappMessages === false &&
      buyerReplySummary.body.summary.safety.privateMessageScraping === false &&
      buyerReplySummary.body.summary.safety.hiddenDataHarvesting === false &&
      buyerReplySummary.body.summary.safety.autoReplyToBuyer === false &&
      buyerReplySummary.body.summary.safety.autoSendWhatsApp === false;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("autoReadWhatsApp = true") &&
      !hub.text.includes("readBuyerMessagesAutomatically = true") &&
      !hub.text.includes("scrapeWhatsappMessages = true") &&
      !hub.text.includes("privateMessageScraping = true") &&
      !hub.text.includes("hiddenDataHarvesting = true") &&
      !hub.text.includes("autoReplyToBuyer = true") &&
      !hub.text.includes("automaticBuyerMessage = true") &&
      !hub.text.includes("autoOpenBrowser = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      buyerReplyLinkedOk &&
      summaryOk &&
      metricsOk &&
      buyerReplySummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 19C Admin Hub Link Buyer Reply Tracking Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Buyer Reply Tracking link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Buyer Reply Tracking
- ${buyerReplyLinkedOk ? "PASS" : "FAIL"}: linked Buyer Reply Tracking dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Buyer Reply Tracking module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include buyer reply metrics safely
- ${buyerReplySummaryOk ? "PASS" : "FAIL"}: buyer reply summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after buyer reply link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Buyer Reply Tracking remains manual-entry only.
- Manual sent confirmation is required.
- Admin observed reply is required.
- Admin hub does not read WhatsApp messages.
- Admin hub does not scrape private messages.
- Admin hub does not harvest hidden data.
- Admin hub does not auto-reply to buyer.
- Admin hub does not send WhatsApp.
- Admin hub does not open browser automatically.
- Admin hub does not move pipeline automatically.
- Metrics API remains read-only.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 20A — Buyer Reply Follow-Up Action Gate Foundation
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

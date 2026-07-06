const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3088;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version24c-admin-hub-link-manual-final-business-review-smoke-test-report.md");

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

async function request(route) {
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
    const finalBusinessPage = await request("/manual-final-business-review");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const finalBusinessSummary = await request("/api/manual-final-business-review/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Manual Final Business Review Gate") &&
      hub.text.includes("/manual-final-business-review") &&
      hub.text.includes("Final Business Reviews") &&
      hub.text.includes("Final Completed Reviews") &&
      hub.text.includes("Manual Final Approved") &&
      hub.text.includes("Final Amount Confirmed") &&
      hub.text.includes("System Final Records") &&
      hub.text.includes("Auto Final Close") &&
      hub.text.includes("Auto Final Pipeline") &&
      hub.text.includes("MANUAL FINAL BUSINESS REVIEW IS REVIEW ONLY") &&
      hub.text.includes("NO AUTOMATIC FINAL BUSINESS RECORD") &&
      hub.text.includes("NO AUTOMATIC SALE CLOSING") &&
      hub.text.includes("NO AUTOMATIC PIPELINE MOVEMENT");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Manual Final Business Review Gate") &&
      alias.text.includes("/manual-final-business-review");

    const finalBusinessLinkedOk =
      finalBusinessPage.status === 200 &&
      finalBusinessPage.text.includes("Demega Manual Final Business Review Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Manual Final Business Review Gate" &&
        module.path === "/manual-final-business-review"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.manualFinalBusinessReviewGateOnly === true &&
      summary.body.safety.manualFinalBusinessReviewOnly === true &&
      summary.body.safety.finalBusinessRecordPreparedOnly === true &&
      summary.body.safety.requiresManualAccountingReview === true &&
      summary.body.safety.requiresAdminReviewedAccounting === true &&
      summary.body.safety.requiresManualFinalBusinessReviewApproval === true &&
      summary.body.safety.systemDoesNotCreateFinalBusinessRecord === true &&
      summary.body.safety.systemDoesNotCloseSale === true &&
      summary.body.safety.systemDoesNotMovePipeline === true &&
      summary.body.safety.systemDoesNotCreateAccountingEntry === true &&
      summary.body.safety.systemDoesNotGenerateReceipt === true &&
      summary.body.safety.systemDoesNotRecordRevenue === true &&
      summary.body.safety.systemDoesNotUpdateInventory === true &&
      summary.body.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.autoCreateFinalBusinessRecord === false &&
      summary.body.safety.autoCloseSale === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.autoCreateAccountingEntry === false &&
      summary.body.safety.autoGenerateReceipt === false &&
      summary.body.safety.autoUpdateRevenue === false &&
      summary.body.safety.autoUpdateInventory === false &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.manualFinalBusinessRecordRequired === true &&
      summary.body.safety.manualManagerReviewRequired === true &&
      summary.body.safety.manualReviewRequiredBeforeFinalClose === true &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.manualFinalBusinessReview &&
      typeof metrics.body.metrics.manualFinalBusinessReview.totalManualFinalBusinessReviews === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.manualFinalBusinessReviewGateOnly === true &&
      metrics.body.safety.manualFinalBusinessReviewOnly === true &&
      metrics.body.safety.finalBusinessRecordPreparedOnly === true &&
      metrics.body.safety.systemDoesNotCreateFinalBusinessRecord === true &&
      metrics.body.safety.systemDoesNotCloseSale === true &&
      metrics.body.safety.systemDoesNotMovePipeline === true &&
      metrics.body.safety.systemDoesNotRecordRevenue === true &&
      metrics.body.safety.autoCreateFinalBusinessRecord === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false &&
      metrics.body.safety.autoUpdateRevenue === false &&
      metrics.body.safety.autoSendWhatsApp === false;

    const finalBusinessSummaryOk =
      finalBusinessSummary.status === 200 &&
      finalBusinessSummary.body &&
      finalBusinessSummary.body.summary &&
      finalBusinessSummary.body.summary.safety &&
      finalBusinessSummary.body.summary.safety.manualFinalBusinessReviewGateOnly === true &&
      finalBusinessSummary.body.summary.safety.manualFinalBusinessReviewOnly === true &&
      finalBusinessSummary.body.summary.safety.finalBusinessRecordPreparedOnly === true &&
      finalBusinessSummary.body.summary.safety.requiresManualAccountingReview === true &&
      finalBusinessSummary.body.summary.safety.requiresAdminReviewedAccounting === true &&
      finalBusinessSummary.body.summary.safety.requiresManualFinalBusinessReviewApproval === true &&
      finalBusinessSummary.body.summary.safety.systemDoesNotCreateFinalBusinessRecord === true &&
      finalBusinessSummary.body.summary.safety.systemDoesNotCloseSale === true &&
      finalBusinessSummary.body.summary.safety.systemDoesNotMovePipeline === true &&
      finalBusinessSummary.body.summary.safety.systemDoesNotCreateAccountingEntry === true &&
      finalBusinessSummary.body.summary.safety.systemDoesNotGenerateReceipt === true &&
      finalBusinessSummary.body.summary.safety.systemDoesNotRecordRevenue === true &&
      finalBusinessSummary.body.summary.safety.systemDoesNotUpdateInventory === true &&
      finalBusinessSummary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      finalBusinessSummary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      finalBusinessSummary.body.summary.safety.hiddenDataHarvesting === false &&
      finalBusinessSummary.body.summary.safety.autoCreateFinalBusinessRecord === false &&
      finalBusinessSummary.body.summary.safety.autoCloseSale === false &&
      finalBusinessSummary.body.summary.safety.autoMovePipelineStage === false &&
      finalBusinessSummary.body.summary.safety.autoCreateAccountingEntry === false &&
      finalBusinessSummary.body.summary.safety.autoGenerateReceipt === false &&
      finalBusinessSummary.body.summary.safety.autoUpdateRevenue === false &&
      finalBusinessSummary.body.summary.safety.autoUpdateInventory === false &&
      finalBusinessSummary.body.summary.safety.manualFinalBusinessRecordRequired === true &&
      finalBusinessSummary.body.summary.safety.manualReviewRequiredBeforeFinalClose === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoCreateFinalBusinessRecord = true") &&
      !hub.text.includes("finalBusinessRecordCreatedBySystem = true") &&
      !hub.text.includes("autoCloseSale = true") &&
      !hub.text.includes("saleClosedBySystem = true") &&
      !hub.text.includes("closeSaleAutomatically = true") &&
      !hub.text.includes("autoMovePipelineStage = true") &&
      !hub.text.includes("pipelineMovedAutomatically = true") &&
      !hub.text.includes("autoCreateAccountingEntry = true") &&
      !hub.text.includes("accountingEntryCreatedBySystem = true") &&
      !hub.text.includes("autoGenerateReceipt = true") &&
      !hub.text.includes("receiptGeneratedBySystem = true") &&
      !hub.text.includes("autoUpdateRevenue = true") &&
      !hub.text.includes("revenueRecordedBySystem = true") &&
      !hub.text.includes("autoUpdateInventory = true") &&
      !hub.text.includes("inventoryChangedBySystem = true") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
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
      finalBusinessLinkedOk &&
      summaryOk &&
      metricsOk &&
      finalBusinessSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 24C Admin Hub Link Manual Final Business Review Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Final Business Review Gate link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Final Business Review Gate
- ${finalBusinessLinkedOk ? "PASS" : "FAIL"}: linked Manual Final Business Review dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Final Business Review Gate module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include manual final business review metrics safely
- ${finalBusinessSummaryOk ? "PASS" : "FAIL"}: manual final business review summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after manual final business review link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Manual Final Business Review Gate remains final-review-only.
- Manual accounting review is required before final business review.
- Admin reviewed accounting is required.
- Manual final business review approval is required.
- Admin hub does not create final business records.
- Admin hub does not close sales.
- Admin hub does not move pipeline.
- Admin hub does not create accounting entries.
- Admin hub does not generate receipts.
- Admin hub does not record revenue.
- Admin hub does not update inventory.
- Admin hub does not send WhatsApp.
- Admin hub does not read buyer messages.
- Admin hub does not scrape private messages.
- Admin hub does not harvest hidden data.
- Metrics API remains read-only.
- Manual final business record, manager review, and final close review remain required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 25A — Project Source-of-Truth Handover System Foundation
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

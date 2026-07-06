const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3085;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version23c-admin-hub-link-manual-accounting-review-smoke-test-report.md");

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
    const accountingPage = await request("/manual-accounting-review");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const accountingSummary = await request("/api/manual-accounting-review/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Manual Accounting Review Gate") &&
      hub.text.includes("/manual-accounting-review") &&
      hub.text.includes("Accounting Reviews") &&
      hub.text.includes("Payment Received Reviews") &&
      hub.text.includes("Manual Accounting Approved") &&
      hub.text.includes("Amount Confirmed") &&
      hub.text.includes("Auto Accounting Entry") &&
      hub.text.includes("Auto Receipt Count") &&
      hub.text.includes("Auto Revenue Count") &&
      hub.text.includes("MANUAL ACCOUNTING REVIEW IS REVIEW ONLY") &&
      hub.text.includes("NO AUTOMATIC ACCOUNTING ENTRY") &&
      hub.text.includes("NO AUTOMATIC RECEIPT") &&
      hub.text.includes("NO AUTOMATIC REVENUE RECORDING");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Manual Accounting Review Gate") &&
      alias.text.includes("/manual-accounting-review");

    const accountingLinkedOk =
      accountingPage.status === 200 &&
      accountingPage.text.includes("Demega Manual Accounting Review Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Manual Accounting Review Gate" &&
        module.path === "/manual-accounting-review"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.manualAccountingReviewGateOnly === true &&
      summary.body.safety.manualAccountingReviewOnly === true &&
      summary.body.safety.accountingEntryPreparedOnly === true &&
      summary.body.safety.requiresManualStockMovementReview === true &&
      summary.body.safety.requiresAdminReviewedStockMovement === true &&
      summary.body.safety.requiresManualAccountingReviewApproval === true &&
      summary.body.safety.systemDoesNotCreateAccountingEntry === true &&
      summary.body.safety.systemDoesNotCreateFinancialLedger === true &&
      summary.body.safety.systemDoesNotVerifyPayment === true &&
      summary.body.safety.systemDoesNotGenerateReceipt === true &&
      summary.body.safety.systemDoesNotCreateInvoice === true &&
      summary.body.safety.systemDoesNotRecordRevenue === true &&
      summary.body.safety.systemDoesNotMovePipeline === true &&
      summary.body.safety.systemDoesNotUpdateInventory === true &&
      summary.body.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.autoCreateAccountingEntry === false &&
      summary.body.safety.autoCreateFinancialLedgerEntry === false &&
      summary.body.safety.autoVerifyPayment === false &&
      summary.body.safety.autoGenerateReceipt === false &&
      summary.body.safety.autoCreateInvoice === false &&
      summary.body.safety.autoUpdateRevenue === false &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.manualAccountingEntryRequired === true &&
      summary.body.safety.manualPaymentVerificationRequired === true &&
      summary.body.safety.manualReceiptRequired === true &&
      summary.body.safety.manualFinancialLedgerEntryRequired === true &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.manualAccountingReview &&
      typeof metrics.body.metrics.manualAccountingReview.totalManualAccountingReviews === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.manualAccountingReviewGateOnly === true &&
      metrics.body.safety.manualAccountingReviewOnly === true &&
      metrics.body.safety.accountingEntryPreparedOnly === true &&
      metrics.body.safety.systemDoesNotCreateAccountingEntry === true &&
      metrics.body.safety.systemDoesNotGenerateReceipt === true &&
      metrics.body.safety.systemDoesNotRecordRevenue === true &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoGenerateReceipt === false &&
      metrics.body.safety.autoUpdateRevenue === false &&
      metrics.body.safety.autoSendWhatsApp === false;

    const accountingSummaryOk =
      accountingSummary.status === 200 &&
      accountingSummary.body &&
      accountingSummary.body.summary &&
      accountingSummary.body.summary.safety &&
      accountingSummary.body.summary.safety.manualAccountingReviewGateOnly === true &&
      accountingSummary.body.summary.safety.manualAccountingReviewOnly === true &&
      accountingSummary.body.summary.safety.accountingEntryPreparedOnly === true &&
      accountingSummary.body.summary.safety.requiresManualStockMovementReview === true &&
      accountingSummary.body.summary.safety.requiresAdminReviewedStockMovement === true &&
      accountingSummary.body.summary.safety.requiresManualAccountingReviewApproval === true &&
      accountingSummary.body.summary.safety.systemDoesNotCreateAccountingEntry === true &&
      accountingSummary.body.summary.safety.systemDoesNotCreateFinancialLedger === true &&
      accountingSummary.body.summary.safety.systemDoesNotVerifyPayment === true &&
      accountingSummary.body.summary.safety.systemDoesNotGenerateReceipt === true &&
      accountingSummary.body.summary.safety.systemDoesNotCreateInvoice === true &&
      accountingSummary.body.summary.safety.systemDoesNotRecordRevenue === true &&
      accountingSummary.body.summary.safety.systemDoesNotMovePipeline === true &&
      accountingSummary.body.summary.safety.systemDoesNotUpdateInventory === true &&
      accountingSummary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      accountingSummary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      accountingSummary.body.summary.safety.hiddenDataHarvesting === false &&
      accountingSummary.body.summary.safety.autoCreateAccountingEntry === false &&
      accountingSummary.body.summary.safety.autoCreateFinancialLedgerEntry === false &&
      accountingSummary.body.summary.safety.autoVerifyPayment === false &&
      accountingSummary.body.summary.safety.autoGenerateReceipt === false &&
      accountingSummary.body.summary.safety.autoCreateInvoice === false &&
      accountingSummary.body.summary.safety.autoUpdateRevenue === false &&
      accountingSummary.body.summary.safety.manualAccountingEntryRequired === true &&
      accountingSummary.body.summary.safety.manualPaymentVerificationRequired === true &&
      accountingSummary.body.summary.safety.manualReceiptRequired === true &&
      accountingSummary.body.summary.safety.manualFinancialLedgerEntryRequired === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoCreateAccountingEntry = true") &&
      !hub.text.includes("createAccountingEntryAutomatically = true") &&
      !hub.text.includes("accountingEntryCreatedBySystem = true") &&
      !hub.text.includes("autoCreateFinancialLedgerEntry = true") &&
      !hub.text.includes("financialLedgerEntryCreatedBySystem = true") &&
      !hub.text.includes("autoVerifyPayment = true") &&
      !hub.text.includes("verifyPaymentAutomatically = true") &&
      !hub.text.includes("collectPaymentAutomatically = true") &&
      !hub.text.includes("autoGenerateReceipt = true") &&
      !hub.text.includes("receiptGeneratedBySystem = true") &&
      !hub.text.includes("receiptSentAutomatically = true") &&
      !hub.text.includes("autoCreateInvoice = true") &&
      !hub.text.includes("invoiceCreatedBySystem = true") &&
      !hub.text.includes("autoUpdateRevenue = true") &&
      !hub.text.includes("revenueRecordedBySystem = true") &&
      !hub.text.includes("autoMovePipelineStage = true") &&
      !hub.text.includes("autoUpdateInventory = true") &&
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
      accountingLinkedOk &&
      summaryOk &&
      metricsOk &&
      accountingSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 23C Admin Hub Link Manual Accounting Review Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Accounting Review Gate link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Accounting Review Gate
- ${accountingLinkedOk ? "PASS" : "FAIL"}: linked Manual Accounting Review dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Accounting Review Gate module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include manual accounting review metrics safely
- ${accountingSummaryOk ? "PASS" : "FAIL"}: manual accounting review summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after manual accounting review link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Manual Accounting Review Gate remains accounting-review-only.
- Manual stock movement review is required before accounting review.
- Admin reviewed stock movement is required.
- Manual accounting review approval is required.
- Admin hub does not create accounting entries.
- Admin hub does not create financial ledger entries.
- Admin hub does not verify payment.
- Admin hub does not generate receipts.
- Admin hub does not create invoices.
- Admin hub does not record revenue.
- Admin hub does not move pipeline.
- Admin hub does not update inventory.
- Admin hub does not send WhatsApp.
- Admin hub does not read buyer messages.
- Admin hub does not scrape private messages.
- Admin hub does not harvest hidden data.
- Metrics API remains read-only.
- Manual accounting entry, payment verification, receipt, and financial ledger entry remain required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 24A — Manual Final Business Review Gate Foundation
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

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3082;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version22c-admin-hub-link-manual-stock-movement-review-smoke-test-report.md");

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
    const stockMovementPage = await request("/manual-stock-movement-review");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const stockMovementSummary = await request("/api/manual-stock-movement-review/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Manual Stock Movement Review Gate") &&
      hub.text.includes("/manual-stock-movement-review") &&
      hub.text.includes("Stock Movement Reviews") &&
      hub.text.includes("Stock Deduction Reviews") &&
      hub.text.includes("Manual Stock Update Approved") &&
      hub.text.includes("Inventory Changed By System") &&
      hub.text.includes("Auto Inventory Update") &&
      hub.text.includes("Auto Ledger Count") &&
      hub.text.includes("MANUAL STOCK MOVEMENT REVIEW IS REVIEW ONLY") &&
      hub.text.includes("NO AUTOMATIC INVENTORY UPDATE") &&
      hub.text.includes("NO AUTOMATIC STOCK LEDGER");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Manual Stock Movement Review Gate") &&
      alias.text.includes("/manual-stock-movement-review");

    const stockMovementLinkedOk =
      stockMovementPage.status === 200 &&
      stockMovementPage.text.includes("Demega Manual Stock Movement Review Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Manual Stock Movement Review Gate" &&
        module.path === "/manual-stock-movement-review"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.manualStockMovementReviewGateOnly === true &&
      summary.body.safety.manualStockMovementReviewOnly === true &&
      summary.body.safety.stockUpdatePreparedOnly === true &&
      summary.body.safety.requiresManualDealOutcome === true &&
      summary.body.safety.requiresAdminReviewedDealOutcome === true &&
      summary.body.safety.requiresManualStockMovementReviewApproval === true &&
      summary.body.safety.systemDoesNotUpdateInventory === true &&
      summary.body.safety.systemDoesNotReduceStock === true &&
      summary.body.safety.systemDoesNotReserveStock === true &&
      summary.body.safety.systemDoesNotReleaseStock === true &&
      summary.body.safety.systemDoesNotCreateStockLedger === true &&
      summary.body.safety.systemDoesNotHandlePayment === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.autoUpdateInventory === false &&
      summary.body.safety.autoReduceStock === false &&
      summary.body.safety.autoReserveStock === false &&
      summary.body.safety.autoReleaseStock === false &&
      summary.body.safety.autoCreateInventoryEvent === false &&
      summary.body.safety.autoCreateStockLedgerEntry === false &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.manualInventoryUpdateRequired === true &&
      summary.body.safety.manualLedgerEntryRequired === true &&
      summary.body.safety.manualReviewRequiredBeforeInventoryChange === true &&
      summary.body.safety.manualReviewRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.manualStockMovementReview &&
      typeof metrics.body.metrics.manualStockMovementReview.totalManualStockMovementReviews === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.manualStockMovementReviewGateOnly === true &&
      metrics.body.safety.manualStockMovementReviewOnly === true &&
      metrics.body.safety.stockUpdatePreparedOnly === true &&
      metrics.body.safety.systemDoesNotUpdateInventory === true &&
      metrics.body.safety.systemDoesNotCreateStockLedger === true &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateStockLedgerEntry === false &&
      metrics.body.safety.autoSendWhatsApp === false;

    const stockMovementSummaryOk =
      stockMovementSummary.status === 200 &&
      stockMovementSummary.body &&
      stockMovementSummary.body.summary &&
      stockMovementSummary.body.summary.safety &&
      stockMovementSummary.body.summary.safety.manualStockMovementReviewGateOnly === true &&
      stockMovementSummary.body.summary.safety.manualStockMovementReviewOnly === true &&
      stockMovementSummary.body.summary.safety.stockUpdatePreparedOnly === true &&
      stockMovementSummary.body.summary.safety.requiresManualDealOutcome === true &&
      stockMovementSummary.body.summary.safety.requiresAdminReviewedDealOutcome === true &&
      stockMovementSummary.body.summary.safety.requiresManualStockMovementReviewApproval === true &&
      stockMovementSummary.body.summary.safety.systemDoesNotUpdateInventory === true &&
      stockMovementSummary.body.summary.safety.systemDoesNotReduceStock === true &&
      stockMovementSummary.body.summary.safety.systemDoesNotReserveStock === true &&
      stockMovementSummary.body.summary.safety.systemDoesNotReleaseStock === true &&
      stockMovementSummary.body.summary.safety.systemDoesNotCreateStockLedger === true &&
      stockMovementSummary.body.summary.safety.systemDoesNotHandlePayment === true &&
      stockMovementSummary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      stockMovementSummary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      stockMovementSummary.body.summary.safety.hiddenDataHarvesting === false &&
      stockMovementSummary.body.summary.safety.autoUpdateInventory === false &&
      stockMovementSummary.body.summary.safety.autoReduceStock === false &&
      stockMovementSummary.body.summary.safety.autoReserveStock === false &&
      stockMovementSummary.body.summary.safety.autoReleaseStock === false &&
      stockMovementSummary.body.summary.safety.autoCreateInventoryEvent === false &&
      stockMovementSummary.body.summary.safety.autoCreateStockLedgerEntry === false &&
      stockMovementSummary.body.summary.safety.manualInventoryUpdateRequired === true &&
      stockMovementSummary.body.summary.safety.manualLedgerEntryRequired === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoUpdateInventory = true") &&
      !hub.text.includes("updateInventoryAutomatically = true") &&
      !hub.text.includes("inventoryChangedBySystem = true") &&
      !hub.text.includes("autoReduceStock = true") &&
      !hub.text.includes("stockReducedBySystem = true") &&
      !hub.text.includes("autoReserveStock = true") &&
      !hub.text.includes("stockReservedBySystem = true") &&
      !hub.text.includes("autoReleaseStock = true") &&
      !hub.text.includes("stockReleasedBySystem = true") &&
      !hub.text.includes("autoCreateInventoryEvent = true") &&
      !hub.text.includes("autoCreateStockLedgerEntry = true") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("collectPaymentAutomatically = true") &&
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
      stockMovementLinkedOk &&
      summaryOk &&
      metricsOk &&
      stockMovementSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 22C Admin Hub Link Manual Stock Movement Review Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Stock Movement Review Gate link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Stock Movement Review Gate
- ${stockMovementLinkedOk ? "PASS" : "FAIL"}: linked Manual Stock Movement Review dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Stock Movement Review Gate module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include manual stock movement review metrics safely
- ${stockMovementSummaryOk ? "PASS" : "FAIL"}: manual stock movement review summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after manual stock movement review link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Manual Stock Movement Review Gate remains review-only.
- Manual deal outcome is required before stock movement review.
- Admin reviewed deal outcome is required.
- Manual stock movement approval is required.
- Admin hub does not update inventory.
- Admin hub does not reduce stock.
- Admin hub does not reserve stock.
- Admin hub does not release stock.
- Admin hub does not create stock ledger.
- Admin hub does not handle payment.
- Admin hub does not send WhatsApp.
- Admin hub does not read buyer messages.
- Admin hub does not scrape private messages.
- Admin hub does not harvest hidden data.
- Metrics API remains read-only.
- Manual inventory update and manual ledger entry remain required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 23A — Manual Accounting Review Gate Foundation
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

const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function mustInclude(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing expected ${label}: ${needle}`);
  }
}

function insertAfter(source, needle, insert, label) {
  mustInclude(source, needle, label);
  if (source.includes(insert.trim())) return source;
  return source.replace(needle, needle + insert);
}

function replaceOnce(source, needle, replacement, label) {
  mustInclude(source, needle, label);
  return source.replace(needle, replacement);
}

if (!controller.includes('manual-accounting-review.service')) {
  controller = insertAfter(
    controller,
    'const manualStockMovementReviewService = require("../services/manual-stock-movement-review.service");',
    '\nconst manualAccountingReviewService = require("../services/manual-accounting-review.service");',
    "manual stock movement review service import"
  );
}

if (!controller.includes('{ name: "Manual Accounting Review Gate"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) {
    throw new Error("Could not find admin modules array.");
  }

  const insert = ',\n  { name: "Manual Accounting Review Gate", path: "/manual-accounting-review", purpose: "Manual accounting review visibility. Review-only; system does not create accounting entries, financial ledger, verify payment, generate receipts, create invoices, record revenue, move pipeline, update inventory, send, read messages, scrape, or harvest data." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

if (!controller.includes("manualAccountingReviewGateOnly: true")) {
  controller = insertAfter(
    controller,
    "    manualStockMovementReviewGateOnly: true,",
    "\n    manualAccountingReviewGateOnly: true,\n    manualAccountingReviewOnly: true,\n    accountingEntryPreparedOnly: true,\n    requiresManualStockMovementReview: true,\n    requiresAdminReviewedStockMovement: true,\n    requiresManualAccountingReviewApproval: true,\n    systemDoesNotCreateAccountingEntry: true,\n    systemDoesNotCreateFinancialLedger: true,\n    systemDoesNotVerifyPayment: true,\n    systemDoesNotCollectPayment: true,\n    systemDoesNotGenerateReceipt: true,\n    systemDoesNotSendReceipt: true,\n    systemDoesNotCreateInvoice: true,\n    systemDoesNotRecordRevenue: true,\n    manualAccountingEntryRequired: true,\n    manualPaymentVerificationRequired: true,\n    manualReceiptRequired: true,\n    manualInvoiceRequiredIfNeeded: true,\n    manualFinancialLedgerEntryRequired: true,\n    manualReviewRequiredBeforeAccountingEntry: true,\n    autoCreateAccountingEntry: false,\n    createAccountingEntryAutomatically: false,\n    autoCreateFinancialLedgerEntry: false,\n    autoVerifyPayment: false,\n    verifyPaymentAutomatically: false,\n    autoGenerateReceipt: false,\n    autoSendReceipt: false,\n    autoCreateInvoice: false,\n    autoUpdateRevenue: false,",
    "manual stock movement review safety"
  );
}

if (!controller.includes("manualAccountingReviewService.getManualAccountingReviewSummary")) {
  controller = insertAfter(
    controller,
    '  const manualStockMovementReview = safeRead(() => manualStockMovementReviewService.getManualStockMovementReviewSummary(), {});',
    '\n  const manualAccountingReview = safeRead(() => manualAccountingReviewService.getManualAccountingReviewSummary(), {});',
    "manual accounting review metrics const"
  );
}

if (!controller.includes("manualAccountingReview\n    }")) {
  controller = replaceOnce(
    controller,
    "      manualStockMovementReview\n    }",
    "      manualStockMovementReview,\n      manualAccountingReview\n    }",
    "metrics object manualStockMovementReview"
  );
}

if (!hub.includes("MANUAL ACCOUNTING REVIEW IS REVIEW ONLY")) {
  hub = insertAfter(
    hub,
    '<span class="badge">NO AUTOMATIC STOCK LEDGER</span>',
    '\n      <span class="badge">MANUAL ACCOUNTING REVIEW IS REVIEW ONLY</span>\n      <span class="badge">NO AUTOMATIC ACCOUNTING ENTRY</span>\n      <span class="badge">NO AUTOMATIC RECEIPT</span>\n      <span class="badge">NO AUTOMATIC REVENUE RECORDING</span>',
    "manual stock movement review safety badge"
  );
}

if (!hub.includes("<li>Manual accounting review only displays admin-reviewed accounting decisions.</li>")) {
  hub = insertAfter(
    hub,
    "<li>It does not create stock ledger automatically.</li>",
    "\n        <li>Manual accounting review only displays admin-reviewed accounting decisions.</li>\n        <li>It does not create accounting entries automatically.</li>\n        <li>It does not verify payment automatically.</li>\n        <li>It does not generate receipts automatically.</li>\n        <li>It does not record revenue automatically.</li>",
    "manual stock movement review safety list"
  );
}

if (!hub.includes('id="manualAccountingReviews"')) {
  hub = insertAfter(
    hub,
    '<div class="metric"><h2>Auto Ledger Count</h2><strong id="autoLedgerCount">0</strong></div>',
    '\n        <div class="metric"><h2>Accounting Reviews</h2><strong id="manualAccountingReviews">0</strong></div>\n        <div class="metric"><h2>Payment Received Reviews</h2><strong id="paymentReceivedReviews">0</strong></div>\n        <div class="metric"><h2>Manual Accounting Approved</h2><strong id="manualAccountingApproved">0</strong></div>\n        <div class="metric"><h2>Amount Confirmed</h2><strong id="manualAccountingAmountConfirmed">0</strong></div>\n        <div class="metric"><h2>Auto Accounting Entry</h2><strong id="autoAccountingEntry">0</strong></div>\n        <div class="metric"><h2>Auto Receipt Count</h2><strong id="autoReceiptCount">0</strong></div>\n        <div class="metric"><h2>Auto Revenue Count</h2><strong id="autoRevenueCount">0</strong></div>',
    "manual accounting review metric card"
  );
}

if (!hub.includes('href="/manual-accounting-review"')) {
  hub = insertAfter(
    hub,
    '<div class="card"><h2>Manual Stock Movement Review Gate</h2><p>View manual stock movement reviews after deal outcomes. No automatic inventory update, stock reduction, stock reservation, stock release, stock ledger, payment handling, WhatsApp sending, message reading, scraping, or hidden harvesting.</p><a href="/manual-stock-movement-review">Open Stock Movement Review Gate</a></div>',
    '\n      <div class="card"><h2>Manual Accounting Review Gate</h2><p>View manual accounting reviews after stock movement reviews. No automatic accounting entry, financial ledger, payment verification, receipt, invoice, revenue recording, pipeline movement, inventory update, WhatsApp sending, message reading, scraping, or hidden harvesting.</p><a href="/manual-accounting-review">Open Accounting Review Gate</a></div>',
    "manual stock movement review card"
  );
}

if (!hub.includes('metrics.manualAccountingReview && metrics.manualAccountingReview.totalManualAccountingReviews')) {
  hub = insertAfter(
    hub,
    '      document.getElementById("autoLedgerCount").textContent = safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.autoLedgerCount);',
    '\n      document.getElementById("manualAccountingReviews").textContent = safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.totalManualAccountingReviews);\n      document.getElementById("paymentReceivedReviews").textContent = safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.paymentReceivedReviewCount);\n      document.getElementById("manualAccountingApproved").textContent = safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.approvedForManualAccountingEntryCount);\n      document.getElementById("manualAccountingAmountConfirmed").textContent = safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.amountConfirmedByAdminTotal).toLocaleString();\n      document.getElementById("autoAccountingEntry").textContent = safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.autoAccountingEntryCount);\n      document.getElementById("autoReceiptCount").textContent = safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.autoReceiptCount);\n      document.getElementById("autoRevenueCount").textContent = safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.autoRevenueCount);',
    "manual accounting review metric assignment"
  );
}

if (!hub.includes("safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.autoSendWhatsAppCount)")) {
  hub = replaceOnce(
    hub,
    "        safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.autoSendWhatsAppCount);",
    "        safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.autoSendWhatsAppCount) +\n        safeNumber(metrics.manualAccountingReview && metrics.manualAccountingReview.autoSendWhatsAppCount);",
    "auto send metric sum"
  );
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");
console.log("Version 23C admin hub patch applied.");

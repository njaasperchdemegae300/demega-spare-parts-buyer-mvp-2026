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

if (!controller.includes('manual-stock-movement-review.service')) {
  controller = insertAfter(
    controller,
    'const manualDealOutcomeService = require("../services/manual-deal-outcome.service");',
    '\nconst manualStockMovementReviewService = require("../services/manual-stock-movement-review.service");',
    "manual deal outcome service import"
  );
}

if (!controller.includes('{ name: "Manual Stock Movement Review Gate"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) {
    throw new Error("Could not find admin modules array.");
  }

  const insert = ',\n  { name: "Manual Stock Movement Review Gate", path: "/manual-stock-movement-review", purpose: "Manual stock movement review visibility. Review-only; system does not update inventory, reduce stock, reserve stock, release stock, create stock ledger, handle payment, send, read messages, scrape, or harvest data." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

if (!controller.includes("manualStockMovementReviewGateOnly: true")) {
  controller = insertAfter(
    controller,
    "    manualDealOutcomeGateOnly: true,",
    "\n    manualStockMovementReviewGateOnly: true,\n    manualStockMovementReviewOnly: true,\n    stockUpdatePreparedOnly: true,\n    requiresManualDealOutcome: true,\n    requiresAdminReviewedDealOutcome: true,\n    requiresManualStockMovementReviewApproval: true,\n    systemDoesNotUpdateInventory: true,\n    systemDoesNotReduceStock: true,\n    systemDoesNotReserveStock: true,\n    systemDoesNotReleaseStock: true,\n    systemDoesNotCreateStockLedger: true,\n    manualInventoryUpdateRequired: true,\n    manualLedgerEntryRequired: true,\n    manualReviewRequiredBeforeInventoryChange: true,\n    autoUpdateInventory: false,\n    autoCreateInventoryEvent: false,\n    autoCreateStockLedgerEntry: false,",
    "manual deal outcome safety"
  );
}

if (!controller.includes("manualStockMovementReviewService.getManualStockMovementReviewSummary")) {
  controller = insertAfter(
    controller,
    '  const manualDealOutcome = safeRead(() => manualDealOutcomeService.getManualDealOutcomeSummary(), {});',
    '\n  const manualStockMovementReview = safeRead(() => manualStockMovementReviewService.getManualStockMovementReviewSummary(), {});',
    "manual stock movement review metrics const"
  );
}

if (!controller.includes("manualStockMovementReview\n    }")) {
  controller = replaceOnce(
    controller,
    "      manualDealOutcome",
    "      manualDealOutcome,\n      manualStockMovementReview",
    "metrics object manualDealOutcome"
  );
}

if (!hub.includes("MANUAL STOCK MOVEMENT REVIEW IS REVIEW ONLY")) {
  hub = insertAfter(
    hub,
    '<span class="badge">NO STOCK AUTOMATION</span>',
    '\n      <span class="badge">MANUAL STOCK MOVEMENT REVIEW IS REVIEW ONLY</span>\n      <span class="badge">NO AUTOMATIC INVENTORY UPDATE</span>\n      <span class="badge">NO AUTOMATIC STOCK LEDGER</span>',
    "manual deal outcome safety badge"
  );
}

if (!hub.includes("<li>Manual stock movement review only displays admin-reviewed stock movement decisions.</li>")) {
  hub = insertAfter(
    hub,
    "<li>It does not change stock automatically.</li>",
    "\n        <li>Manual stock movement review only displays admin-reviewed stock movement decisions.</li>\n        <li>It does not update inventory automatically.</li>\n        <li>It does not create stock ledger automatically.</li>",
    "manual deal outcome safety list"
  );
}

if (!hub.includes('id="manualStockMovementReviews"')) {
  hub = insertAfter(
    hub,
    '<div class="metric"><h2>Auto Stock Count</h2><strong id="manualDealAutoStock">0</strong></div>',
    '\n        <div class="metric"><h2>Stock Movement Reviews</h2><strong id="manualStockMovementReviews">0</strong></div>\n        <div class="metric"><h2>Stock Deduction Reviews</h2><strong id="stockDeductionReviews">0</strong></div>\n        <div class="metric"><h2>Manual Stock Update Approved</h2><strong id="manualStockUpdateApproved">0</strong></div>\n        <div class="metric"><h2>Inventory Changed By System</h2><strong id="inventoryChangedBySystem">0</strong></div>\n        <div class="metric"><h2>Auto Inventory Update</h2><strong id="autoInventoryUpdate">0</strong></div>\n        <div class="metric"><h2>Auto Ledger Count</h2><strong id="autoLedgerCount">0</strong></div>',
    "manual stock movement review metric card"
  );
}

if (!hub.includes('href="/manual-stock-movement-review"')) {
  hub = insertAfter(
    hub,
    '<div class="card"><h2>Manual Deal Outcome Gate</h2><p>View admin-recorded deal outcomes after manual action completion. No automatic sale closing, pipeline movement, payment handling, stock change, WhatsApp sending, message reading, scraping, or hidden harvesting.</p><a href="/manual-deal-outcome">Open Manual Deal Outcome Gate</a></div>',
    '\n      <div class="card"><h2>Manual Stock Movement Review Gate</h2><p>View manual stock movement reviews after deal outcomes. No automatic inventory update, stock reduction, stock reservation, stock release, stock ledger, payment handling, WhatsApp sending, message reading, scraping, or hidden harvesting.</p><a href="/manual-stock-movement-review">Open Stock Movement Review Gate</a></div>',
    "manual deal outcome card"
  );
}

if (!hub.includes('metrics.manualStockMovementReview && metrics.manualStockMovementReview.totalManualStockMovementReviews')) {
  hub = insertAfter(
    hub,
    '      document.getElementById("manualDealAutoStock").textContent = safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.autoStockChangeCount);',
    '\n      document.getElementById("manualStockMovementReviews").textContent = safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.totalManualStockMovementReviews);\n      document.getElementById("stockDeductionReviews").textContent = safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.stockDeductionReviewCount);\n      document.getElementById("manualStockUpdateApproved").textContent = safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.approvedForManualStockUpdateCount);\n      document.getElementById("inventoryChangedBySystem").textContent = safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.inventoryChangedBySystemCount);\n      document.getElementById("autoInventoryUpdate").textContent = safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.autoUpdateInventoryCount);\n      document.getElementById("autoLedgerCount").textContent = safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.autoLedgerCount);',
    "manual stock movement review metric assignment"
  );
}

if (!hub.includes("safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.autoSendWhatsAppCount)")) {
  hub = replaceOnce(
    hub,
    "        safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.autoSendWhatsAppCount);",
    "        safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.autoSendWhatsAppCount) +\n        safeNumber(metrics.manualStockMovementReview && metrics.manualStockMovementReview.autoSendWhatsAppCount);",
    "auto send metric sum"
  );
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");
console.log("Version 22C admin hub patch applied.");

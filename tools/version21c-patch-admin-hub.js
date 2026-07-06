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

if (!controller.includes('manual-deal-outcome.service')) {
  controller = insertAfter(
    controller,
    'const buyerReplyFollowupActionService = require("../services/buyer-reply-followup-action.service");',
    '\nconst manualDealOutcomeService = require("../services/manual-deal-outcome.service");',
    "buyer reply followup service import"
  );
}

if (!controller.includes('{ name: "Manual Deal Outcome Gate"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) {
    throw new Error("Could not find admin modules array.");
  }

  const insert = ',\n  { name: "Manual Deal Outcome Gate", path: "/manual-deal-outcome", purpose: "Manual deal outcome visibility. Outcome record only; system does not close sale, move pipeline, send, auto-reply, handle payment, change stock, read messages, scrape, or harvest data." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

if (!controller.includes("manualDealOutcomeGateOnly: true")) {
  controller = insertAfter(
    controller,
    "    buyerReplyFollowupActionGateOnly: true,",
    "\n    manualDealOutcomeGateOnly: true,\n    manualDealOutcomeOnly: true,\n    manualOutcomeRecordOnly: true,\n    requiresFollowupAction: true,\n    requiresAdminCompletedManualAction: true,\n    requiresManualOutcomeApproval: true,\n    systemDoesNotHandlePayment: true,\n    systemDoesNotChangeStock: true,\n    autoCloseSale: false,\n    collectPaymentAutomatically: false,\n    verifyPaymentAutomatically: false,\n    autoReserveStock: false,\n    autoReduceStock: false,",
    "buyer reply followup action safety"
  );
}

if (!controller.includes("manualDealOutcomeService.getManualDealOutcomeSummary")) {
  controller = insertAfter(
    controller,
    '  const buyerReplyFollowupAction = safeRead(() => buyerReplyFollowupActionService.getBuyerReplyFollowupActionSummary(), {});',
    '\n  const manualDealOutcome = safeRead(() => manualDealOutcomeService.getManualDealOutcomeSummary(), {});',
    "manual deal outcome metrics const"
  );
}

if (!controller.includes("manualDealOutcome\n    }")) {
  controller = replaceOnce(
    controller,
    "      buyerReplyFollowupAction",
    "      buyerReplyFollowupAction,\n      manualDealOutcome",
    "metrics object buyerReplyFollowupAction"
  );
}

if (!hub.includes("MANUAL DEAL OUTCOME IS RECORD ONLY")) {
  hub = insertAfter(
    hub,
    '<span class="badge">SYSTEM DOES NOT EXECUTE FOLLOW-UP ACTION</span>',
    '\n      <span class="badge">MANUAL DEAL OUTCOME IS RECORD ONLY</span>\n      <span class="badge">NO AUTOMATIC SALE CLOSING</span>\n      <span class="badge">NO PAYMENT AUTOMATION</span>\n      <span class="badge">NO STOCK AUTOMATION</span>',
    "followup action safety badge"
  );
}

if (!hub.includes("<li>Manual deal outcome only displays admin-recorded deal outcomes.</li>")) {
  hub = insertAfter(
    hub,
    "<li>It does not close sales automatically.</li>",
    "\n        <li>Manual deal outcome only displays admin-recorded deal outcomes.</li>\n        <li>It does not handle payment automatically.</li>\n        <li>It does not change stock automatically.</li>",
    "followup action safety list"
  );
}

if (!hub.includes('id="manualDealOutcomes"')) {
  hub = insertAfter(
    hub,
    '<div class="metric"><h2>Auto Close Count</h2><strong id="autoCloseCount">0</strong></div>',
    '\n        <div class="metric"><h2>Deal Outcomes</h2><strong id="manualDealOutcomes">0</strong></div>\n        <div class="metric"><h2>Manual Deal Won</h2><strong id="manualDealWon">0</strong></div>\n        <div class="metric"><h2>Amount Received</h2><strong id="manualDealAmountReceived">0</strong></div>\n        <div class="metric"><h2>System Closed Sales</h2><strong id="manualDealSystemClosed">0</strong></div>\n        <div class="metric"><h2>Auto Payment Count</h2><strong id="manualDealAutoPayment">0</strong></div>\n        <div class="metric"><h2>Auto Stock Count</h2><strong id="manualDealAutoStock">0</strong></div>',
    "manual deal outcome metric card"
  );
}

if (!hub.includes('href="/manual-deal-outcome"')) {
  hub = insertAfter(
    hub,
    '<div class="card"><h2>Buyer Reply Follow-Up Action Gate</h2><p>View manual next-action plans after buyer replies. No system execution, auto-send, auto-reply, pipeline movement, automatic closing, message reading, scraping, or hidden harvesting.</p><a href="/buyer-reply-followup">Open Follow-Up Action Gate</a></div>',
    '\n      <div class="card"><h2>Manual Deal Outcome Gate</h2><p>View admin-recorded deal outcomes after manual action completion. No automatic sale closing, pipeline movement, payment handling, stock change, WhatsApp sending, message reading, scraping, or hidden harvesting.</p><a href="/manual-deal-outcome">Open Manual Deal Outcome Gate</a></div>',
    "buyer reply followup action card"
  );
}

if (!hub.includes('metrics.manualDealOutcome && metrics.manualDealOutcome.totalManualDealOutcomes')) {
  hub = insertAfter(
    hub,
    '      document.getElementById("autoCloseCount").textContent = safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.autoCloseCount);',
    '\n      document.getElementById("manualDealOutcomes").textContent = safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.totalManualDealOutcomes);\n      document.getElementById("manualDealWon").textContent = safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.dealWonManualCount);\n      document.getElementById("manualDealAmountReceived").textContent = safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.amountActuallyReceivedTotal).toLocaleString();\n      document.getElementById("manualDealSystemClosed").textContent = safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.systemClosedSaleCount);\n      document.getElementById("manualDealAutoPayment").textContent = safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.autoPaymentCount);\n      document.getElementById("manualDealAutoStock").textContent = safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.autoStockChangeCount);',
    "manual deal outcome metric assignment"
  );
}

if (!hub.includes("safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.autoSendWhatsAppCount)")) {
  hub = replaceOnce(
    hub,
    "        safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.autoSendWhatsAppCount);",
    "        safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.autoSendWhatsAppCount) +\n        safeNumber(metrics.manualDealOutcome && metrics.manualDealOutcome.autoSendWhatsAppCount);",
    "auto send metric sum"
  );
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");
console.log("Version 21C admin hub patch applied.");

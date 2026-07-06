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

if (!controller.includes('buyer-reply-followup-action.service')) {
  controller = insertAfter(
    controller,
    'const buyerReplyService = require("../services/buyer-reply.service");',
    '\nconst buyerReplyFollowupActionService = require("../services/buyer-reply-followup-action.service");',
    "buyer reply service import"
  );
}

if (!controller.includes('{ name: "Buyer Reply Follow-Up Action Gate"')) {
  controller = replaceOnce(
    controller,
    '  { name: "Buyer Reply Tracking", path: "/buyer-reply", purpose: "Manual buyer reply visibility. Manual-entry only; no WhatsApp reading, private scraping, hidden harvesting, auto-reply, or auto-send." }',
    '  { name: "Buyer Reply Tracking", path: "/buyer-reply", purpose: "Manual buyer reply visibility. Manual-entry only; no WhatsApp reading, private scraping, hidden harvesting, auto-reply, or auto-send." },\n  { name: "Buyer Reply Follow-Up Action Gate", path: "/buyer-reply-followup", purpose: "Manual follow-up action visibility. Manual action only; system does not execute, send, auto-reply, move pipeline, close sale, read messages, scrape, or harvest data." }',
    "Buyer Reply Tracking module"
  );
}

if (!controller.includes("buyerReplyFollowupActionGateOnly: true")) {
  controller = insertAfter(
    controller,
    "    buyerReplyTrackingOnly: true,",
    "\n    buyerReplyFollowupActionGateOnly: true,\n    manualActionOnly: true,\n    actionPreparedOnly: true,\n    requiresBuyerReply: true,\n    requiresAdminReviewedBuyerReply: true,\n    requiresManualActionApproval: true,\n    systemDoesNotExecuteAction: true,\n    systemDoesNotMovePipeline: true,\n    systemDoesNotCloseSale: true,",
    "buyer reply tracking safety"
  );
}

if (!controller.includes("buyerReplyFollowupActionService.getBuyerReplyFollowupActionSummary")) {
  controller = insertAfter(
    controller,
    '  const buyerReply = safeRead(() => buyerReplyService.getBuyerReplySummary(), {});',
    '\n  const buyerReplyFollowupAction = safeRead(() => buyerReplyFollowupActionService.getBuyerReplyFollowupActionSummary(), {});',
    "buyer reply metrics const"
  );
}

if (!controller.includes("buyerReplyFollowupAction\n    }")) {
  controller = replaceOnce(
    controller,
    "      manualQuoteSentConfirmation,\n      buyerReply",
    "      manualQuoteSentConfirmation,\n      buyerReply,\n      buyerReplyFollowupAction",
    "metrics object buyerReply"
  );
}

if (!hub.includes("BUYER REPLY FOLLOW-UP ACTION IS MANUAL ACTION ONLY")) {
  hub = insertAfter(
    hub,
    '<span class="badge">BUYER REPLY TRACKING IS MANUAL ENTRY ONLY</span>',
    '\n      <span class="badge">BUYER REPLY FOLLOW-UP ACTION IS MANUAL ACTION ONLY</span>\n      <span class="badge">SYSTEM DOES NOT EXECUTE FOLLOW-UP ACTION</span>\n      <span class="badge">NO AUTOMATIC CLOSING</span>',
    "buyer reply tracking safety badge"
  );
}

if (!hub.includes("<li>Buyer reply follow-up action only displays manual next-action plans.</li>")) {
  hub = insertAfter(
    hub,
    "<li>Buyer reply tracking only displays replies manually entered by admin.</li>",
    "\n        <li>Buyer reply follow-up action only displays manual next-action plans.</li>\n        <li>It does not execute follow-up actions automatically.</li>\n        <li>It does not close sales automatically.</li>",
    "buyer reply tracking safety list"
  );
}

if (!hub.includes('id="buyerReplyFollowupActions"')) {
  hub = insertAfter(
    hub,
    '<div class="metric"><h2>Auto Reply Count</h2><strong id="autoReplyCount">0</strong></div>',
    '\n        <div class="metric"><h2>Follow-Up Actions</h2><strong id="buyerReplyFollowupActions">0</strong></div>\n        <div class="metric"><h2>Urgent Follow-Ups</h2><strong id="urgentFollowupActions">0</strong></div>\n        <div class="metric"><h2>Manual Action Only</h2><strong id="manualActionOnlyCount">0</strong></div>\n        <div class="metric"><h2>System Executed</h2><strong id="systemExecutedActions">0</strong></div>\n        <div class="metric"><h2>Auto Close Count</h2><strong id="autoCloseCount">0</strong></div>',
    "buyer reply metric card"
  );
}

if (!hub.includes('href="/buyer-reply-followup"')) {
  hub = insertAfter(
    hub,
    '<div class="card"><h2>Buyer Reply Tracking</h2><p>View buyer replies manually observed and entered by admin. No WhatsApp reading, scraping, harvesting, auto-reply, or auto-send.</p><a href="/buyer-reply">Open Buyer Reply Tracking</a></div>',
    '\n      <div class="card"><h2>Buyer Reply Follow-Up Action Gate</h2><p>View manual next-action plans after buyer replies. No system execution, auto-send, auto-reply, pipeline movement, automatic closing, message reading, scraping, or hidden harvesting.</p><a href="/buyer-reply-followup">Open Follow-Up Action Gate</a></div>',
    "buyer reply tracking card"
  );
}

if (!hub.includes('buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.totalBuyerReplyFollowupActions')) {
  hub = insertAfter(
    hub,
    '      document.getElementById("autoReplyCount").textContent = safeNumber(metrics.buyerReply && metrics.buyerReply.autoReplyToBuyerCount);',
    '\n      document.getElementById("buyerReplyFollowupActions").textContent = safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.totalBuyerReplyFollowupActions);\n      document.getElementById("urgentFollowupActions").textContent = safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.urgentActionCount);\n      document.getElementById("manualActionOnlyCount").textContent = safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.manualActionOnlyCount);\n      document.getElementById("systemExecutedActions").textContent = safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.actionExecutedBySystemCount);\n      document.getElementById("autoCloseCount").textContent = safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.autoCloseCount);',
    "buyer reply metric assignment"
  );
}

if (!hub.includes("safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.autoSendWhatsAppCount)")) {
  hub = replaceOnce(
    hub,
    "        safeNumber(metrics.buyerReply && metrics.buyerReply.autoSendWhatsAppCount);",
    "        safeNumber(metrics.buyerReply && metrics.buyerReply.autoSendWhatsAppCount) +\n        safeNumber(metrics.buyerReplyFollowupAction && metrics.buyerReplyFollowupAction.autoSendWhatsAppCount);",
    "auto send metric sum"
  );
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");
console.log("Version 20C admin hub patch applied.");

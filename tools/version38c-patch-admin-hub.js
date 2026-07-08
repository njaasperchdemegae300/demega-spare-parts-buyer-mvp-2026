const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 38C PATCH FAILED: ${message}`);
}

function insertAfter(source, needle, insert, label) {
  if (!source.includes(needle)) fail(`Missing expected ${label}: ${needle}`);
  if (source.includes(insert.trim())) return source;
  return source.replace(needle, needle + insert);
}

function insertBefore(source, needle, insert, label) {
  if (!source.includes(needle)) fail(`Missing expected ${label}: ${needle}`);
  if (source.includes(insert.trim())) return source;
  return source.replace(needle, insert + needle);
}

function insertBeforeFirstSectionEnd(source, sectionStartNeedle, insert) {
  if (source.includes(insert.trim())) return source;
  const sectionStart = source.indexOf(sectionStartNeedle);
  if (sectionStart === -1) return source;
  const sectionEnd = source.indexOf("</section>", sectionStart);
  if (sectionEnd === -1) return source;
  return source.slice(0, sectionEnd) + insert + "\n" + source.slice(sectionEnd);
}

if (!controller.includes('controlled-buyer-gate-follow-up-decision.service')) {
  const importLine = 'const controlledBuyerGateFollowUpDecisionService = require("../services/controlled-buyer-gate-follow-up-decision.service");\n';

  if (controller.includes('const controlledBuyerGateBuyerReplyTrackingService = require("../services/controlled-buyer-gate-buyer-reply-tracking.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateBuyerReplyTrackingService = require("../services/controlled-buyer-gate-buyer-reply-tracking.service");',
      'const controlledBuyerGateBuyerReplyTrackingService = require("../services/controlled-buyer-gate-buyer-reply-tracking.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Follow-Up Decision"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Follow-Up Decision", path: "/controlled-buyer-gate-follow-up-decision", purpose: "Read-only follow-up decision dashboard. Shows admin manual follow-up decisions after buyer reply tracking. System execution is blocked; no auto-follow-up, no auto-schedule, no WhatsApp send, no auto-reply, no inventory/accounting/sale/pipeline mutation." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

if (!controller.includes("controlledBuyerGateFollowUpDecisionOnly")) {
  const safetyBlock = `
    controlledBuyerGateFollowUpDecisionOnly: true,
    followUpDecisionGateOnly: true,
    followUpDecisionRecordOnly: true,
    controlledFollowUpDecisionOnly: true,
    adminManualDecisionOnly: true,
    systemExecutionBlocked: true,
    manualActionRequiredOutsideSystem: true,
    noAutoFollowUpDecisionExecution: true,
    noAutoScheduleFollowUp: true,
    noFollowUpAutoSend: true,
    noFollowUpAutoReply: true,
`;

  if (controller.includes("    controlledBuyerGateBuyerReplyTrackingOnly: true,")) {
    controller = controller.replace("    controlledBuyerGateBuyerReplyTrackingOnly: true,", safetyBlock + "\n    controlledBuyerGateBuyerReplyTrackingOnly: true,");
  } else if (controller.includes("    controlledBuyerGateManualSendConfirmationOnly: true,")) {
    controller = controller.replace("    controlledBuyerGateManualSendConfirmationOnly: true,", safetyBlock + "\n    controlledBuyerGateManualSendConfirmationOnly: true,");
  } else if (controller.includes("    navigationOnly: true,")) {
    controller = controller.replace("    navigationOnly: true,", safetyBlock + "\n    navigationOnly: true,");
  } else {
    fail("Could not find safety insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateFollowUpDecisionService.getFollowUpDecisionSummary")) {
  const metricLine = '  const controlledBuyerGateFollowUpDecision = safeRead(() => controlledBuyerGateFollowUpDecisionService.getFollowUpDecisionSummary(), {});';

  if (controller.includes('  const controlledBuyerGateBuyerReplyTracking = safeRead(() => controlledBuyerGateBuyerReplyTrackingService.getBuyerReplyTrackingSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateBuyerReplyTracking = safeRead(() => controlledBuyerGateBuyerReplyTrackingService.getBuyerReplyTrackingSummary(), {});',
      '\n' + metricLine,
      "buyer reply tracking metrics const"
    );
  } else {
    const lastMetricConst = controller.lastIndexOf("  const ");
    if (lastMetricConst === -1) fail("Could not find metrics const insertion point.");
    const lineEnd = controller.indexOf("\n", lastMetricConst);
    controller = controller.slice(0, lineEnd + 1) + metricLine + "\n" + controller.slice(lineEnd + 1);
  }
}

if (!/controlledBuyerGateFollowUpDecision\s*\n\s*}/.test(controller) && !/controlledBuyerGateFollowUpDecision,\s*\n/.test(controller)) {
  const pattern = /(controlledBuyerGateBuyerReplyTracking)(,?)(\s*\n\s*})/;

  if (pattern.test(controller)) {
    controller = controller.replace(pattern, "$1,\n      controlledBuyerGateFollowUpDecision$3");
  } else {
    const metricsMarker = "      controlledBuyerGateManualSendConfirmation";
    if (controller.includes(metricsMarker)) {
      controller = controller.replace(metricsMarker, "      controlledBuyerGateFollowUpDecision,\n" + metricsMarker);
    } else {
      fail("Could not find metrics object insertion point.");
    }
  }
}

const safetyBadges = `
      <span class="badge">FOLLOW-UP DECISION DASHBOARD ONLY</span>
      <span class="badge">FOLLOW-UP DECISION RECORD ONLY</span>
      <span class="badge">ADMIN MANUAL DECISION ONLY</span>
      <span class="badge">SYSTEM EXECUTION BLOCKED</span>
      <span class="badge">MANUAL ACTION OUTSIDE SYSTEM ONLY</span>
      <span class="badge">NO AUTO-FOLLOW-UP</span>
      <span class="badge">NO AUTO-SCHEDULE</span>
      <span class="badge">NO FOLLOW-UP AUTO-SEND</span>
      <span class="badge">NO FOLLOW-UP AUTO-REPLY</span>
      <span class="badge">NO INVENTORY MUTATION</span>
      <span class="badge">NO ACCOUNTING MUTATION</span>
      <span class="badge">NO SALE CLOSING</span>
      <span class="badge">NO PIPELINE MOVEMENT</span>`;

if (!hub.includes("FOLLOW-UP DECISION DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">FOLLOW-UP DECISION GATE REQUIRED NEXT</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">FOLLOW-UP DECISION GATE REQUIRED NEXT</span>',
      safetyBadges,
      "follow-up decision safety badge"
    );
  } else if (hub.includes('<span class="badge">NO AUTO-FOLLOW-UP</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">NO AUTO-FOLLOW-UP</span>',
      safetyBadges,
      "follow-up decision safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Follow-Up Decision Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Follow-up decision records admin manual decision only.</li>
        <li>Follow-up decision does not execute follow-up.</li>
        <li>Follow-up decision does not auto-schedule.</li>
        <li>Follow-up decision does not auto-send WhatsApp.</li>
        <li>Follow-up decision does not auto-reply.</li>
        <li>Follow-up decision does not mutate inventory, accounting, sales, or pipeline.</li>
        <li>Manual action remains outside the system.</li>`;

if (!hub.includes("<li>Follow-up decision records admin manual decision only.</li>")) {
  if (hub.includes("<li>Follow-up decision gate is required next.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Follow-up decision gate is required next.</li>",
      safetyList,
      "follow-up decision safety list"
    );
  } else if (hub.includes("<li>Buyer reply tracking records admin manual observation outside the system only.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Buyer reply tracking records admin manual observation outside the system only.</li>",
      safetyList,
      "follow-up decision safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Follow-Up Decision Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Follow-Up Decision Records</h2><strong id="followUpDecisionTotal">0</strong></div>
        <div class="metric"><h2>Recorded Follow-Up Decisions</h2><strong id="followUpDecisionRecorded">0</strong></div>
        <div class="metric"><h2>Urgent Follow-Up Decisions</h2><strong id="followUpDecisionUrgent">0</strong></div>
        <div class="metric"><h2>High Follow-Up Decisions</h2><strong id="followUpDecisionHigh">0</strong></div>
        <div class="metric"><h2>Normal Follow-Up Decisions</h2><strong id="followUpDecisionNormal">0</strong></div>
        <div class="metric"><h2>Manual Action Required</h2><strong id="followUpDecisionManualAction">0</strong></div>
        <div class="metric"><h2>Latest Follow-Up Decision</h2><strong id="followUpDecisionLatest">NONE</strong></div>
        <div class="metric"><h2>Latest Follow-Up Priority</h2><strong id="followUpDecisionLatestPriority">NONE</strong></div>`;

if (!hub.includes('id="followUpDecisionTotal"')) {
  if (hub.includes('<div class="metric"><h2>Latest Reply Temperature</h2><strong id="buyerReplyTrackingLatestTemperature">NONE</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Latest Reply Temperature</h2><strong id="buyerReplyTrackingLatestTemperature">NONE</strong></div>',
      metricCards,
      "follow-up decision metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const followUpDecisionCard = `
      <div class="card"><h2>Controlled Buyer-Gate Follow-Up Decision</h2><p>View admin manual follow-up decisions after buyer reply tracking. Read-only; system execution is blocked and no follow-up, scheduling, WhatsApp sending, auto-reply, inventory/accounting/sale/pipeline mutation is performed.</p><a href="/controlled-buyer-gate-follow-up-decision">Open Follow-Up Decision</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-follow-up-decision"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Buyer Reply Tracking</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Buyer Reply Tracking</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + followUpDecisionCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", followUpDecisionCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", followUpDecisionCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadFollowUpDecisionHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-follow-up-decision/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("followUpDecisionTotal", summary.totalFollowUpDecisions || 0);
        setText("followUpDecisionRecorded", summary.recordedFollowUpDecisionCount || 0);
        setText("followUpDecisionUrgent", summary.urgentFollowUpDecisionCount || 0);
        setText("followUpDecisionHigh", summary.highFollowUpDecisionCount || 0);
        setText("followUpDecisionNormal", summary.normalFollowUpDecisionCount || 0);
        setText("followUpDecisionManualAction", summary.manualActionRequiredCount || 0);
        setText("followUpDecisionLatest", summary.latestFollowUpDecision || "NONE");
        setText("followUpDecisionLatestPriority", summary.latestFollowUpPriority || "NONE");
      } catch (error) {
        const element = document.getElementById("followUpDecisionLatest");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadFollowUpDecisionHubMetrics();
  </script>
`;

if (!hub.includes("loadFollowUpDecisionHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 38C admin hub patch applied.");

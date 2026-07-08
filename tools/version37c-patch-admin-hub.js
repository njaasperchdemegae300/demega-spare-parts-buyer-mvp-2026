const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 37C PATCH FAILED: ${message}`);
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

if (!controller.includes('controlled-buyer-gate-buyer-reply-tracking.service')) {
  const importLine = 'const controlledBuyerGateBuyerReplyTrackingService = require("../services/controlled-buyer-gate-buyer-reply-tracking.service");\n';

  if (controller.includes('const controlledBuyerGateManualSendConfirmationService = require("../services/controlled-buyer-gate-manual-send-confirmation.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateManualSendConfirmationService = require("../services/controlled-buyer-gate-manual-send-confirmation.service");',
      'const controlledBuyerGateManualSendConfirmationService = require("../services/controlled-buyer-gate-manual-send-confirmation.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Buyer Reply Tracking"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Buyer Reply Tracking", path: "/controlled-buyer-gate-buyer-reply-tracking", purpose: "Read-only buyer reply tracking dashboard. Shows buyer replies manually observed outside the system after manual send confirmation. System does not read WhatsApp, scrape messages, auto-reply, auto-follow-up, mutate inventory, create accounting, close sale, or move pipeline." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

if (!controller.includes("controlledBuyerGateBuyerReplyTrackingOnly")) {
  const safetyBlock = `
    controlledBuyerGateBuyerReplyTrackingOnly: true,
    buyerReplyTrackingGateOnly: true,
    buyerReplyTrackingRecordOnly: true,
    controlledBuyerReplyTrackingOnly: true,
    manualBuyerReplyObservationOnly: true,
    adminObservedOutsideSystemOnly: true,
    systemDidNotReadBuyerReply: true,
    noAutoReply: true,
    followUpDecisionGateRequiredNext: true,
    noAutoReadWhatsApp: true,
    noBuyerMessageReading: true,
    noWhatsappScraping: true,
`;

  if (controller.includes("    controlledBuyerGateManualSendConfirmationOnly: true,")) {
    controller = controller.replace("    controlledBuyerGateManualSendConfirmationOnly: true,", safetyBlock + "\n    controlledBuyerGateManualSendConfirmationOnly: true,");
  } else if (controller.includes("    controlledBuyerGateManualQuoteDraftOnly: true,")) {
    controller = controller.replace("    controlledBuyerGateManualQuoteDraftOnly: true,", safetyBlock + "\n    controlledBuyerGateManualQuoteDraftOnly: true,");
  } else if (controller.includes("    leadLimitOnly: true,")) {
    controller = controller.replace("    leadLimitOnly: true,", safetyBlock + "\n    leadLimitOnly: true,");
  } else {
    fail("Could not find safety insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateBuyerReplyTrackingService.getBuyerReplyTrackingSummary")) {
  const metricLine = '  const controlledBuyerGateBuyerReplyTracking = safeRead(() => controlledBuyerGateBuyerReplyTrackingService.getBuyerReplyTrackingSummary(), {});';

  if (controller.includes('  const controlledBuyerGateManualSendConfirmation = safeRead(() => controlledBuyerGateManualSendConfirmationService.getManualSendConfirmationSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateManualSendConfirmation = safeRead(() => controlledBuyerGateManualSendConfirmationService.getManualSendConfirmationSummary(), {});',
      '\n' + metricLine,
      "manual send confirmation metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!/controlledBuyerGateBuyerReplyTracking\s*\n\s*}/.test(controller) && !/controlledBuyerGateBuyerReplyTracking,\s*\n/.test(controller)) {
  const pattern = /(controlledBuyerGateManualSendConfirmation)(,?)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateManualSendConfirmation metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateBuyerReplyTracking$3");
}

const safetyBadges = `
      <span class="badge">BUYER REPLY TRACKING DASHBOARD ONLY</span>
      <span class="badge">BUYER REPLY TRACKING RECORD ONLY</span>
      <span class="badge">ADMIN OBSERVED OUTSIDE SYSTEM ONLY</span>
      <span class="badge">SYSTEM DID NOT READ WHATSAPP</span>
      <span class="badge">NO WHATSAPP AUTO-READ</span>
      <span class="badge">NO BUYER MESSAGE SCRAPING</span>
      <span class="badge">NO AUTO-REPLY</span>
      <span class="badge">NO AUTO-FOLLOW-UP</span>
      <span class="badge">FOLLOW-UP DECISION GATE REQUIRED NEXT</span>`;

if (!hub.includes("BUYER REPLY TRACKING DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">BUYER REPLY TRACKING REQUIRED NEXT</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">BUYER REPLY TRACKING REQUIRED NEXT</span>',
      safetyBadges,
      "buyer reply tracking safety badge"
    );
  } else if (hub.includes('<span class="badge">NO AUTO FOLLOW-UP</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">NO AUTO FOLLOW-UP</span>',
      safetyBadges,
      "buyer reply tracking safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Buyer Reply Tracking Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Buyer reply tracking records admin manual observation outside the system only.</li>
        <li>Buyer reply tracking does not read WhatsApp.</li>
        <li>Buyer reply tracking does not scrape buyer messages.</li>
        <li>Buyer reply tracking does not auto-reply.</li>
        <li>Buyer reply tracking does not auto-follow-up.</li>
        <li>Buyer reply tracking does not mutate inventory, accounting, sales, or pipeline.</li>
        <li>Follow-up decision gate is required next.</li>`;

if (!hub.includes("<li>Buyer reply tracking records admin manual observation outside the system only.</li>")) {
  if (hub.includes("<li>Buyer reply tracking is required next.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Buyer reply tracking is required next.</li>",
      safetyList,
      "buyer reply tracking safety list"
    );
  } else if (hub.includes("<li>No auto follow-up starts at this gate.</li>")) {
    hub = insertAfter(
      hub,
      "<li>No auto follow-up starts at this gate.</li>",
      safetyList,
      "buyer reply tracking safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Buyer Reply Tracking Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Buyer Reply Tracking Records</h2><strong id="buyerReplyTrackingTotal">0</strong></div>
        <div class="metric"><h2>Recorded Buyer Replies</h2><strong id="buyerReplyTrackingRecorded">0</strong></div>
        <div class="metric"><h2>Hot Buyer Replies</h2><strong id="buyerReplyTrackingHot">0</strong></div>
        <div class="metric"><h2>Warm Buyer Replies</h2><strong id="buyerReplyTrackingWarm">0</strong></div>
        <div class="metric"><h2>Cold Buyer Replies</h2><strong id="buyerReplyTrackingCold">0</strong></div>
        <div class="metric"><h2>No Reply Count</h2><strong id="buyerReplyTrackingNoReply">0</strong></div>
        <div class="metric"><h2>Latest Buyer Reply Status</h2><strong id="buyerReplyTrackingLatestStatus">NONE</strong></div>
        <div class="metric"><h2>Latest Reply Temperature</h2><strong id="buyerReplyTrackingLatestTemperature">NONE</strong></div>`;

if (!hub.includes('id="buyerReplyTrackingTotal"')) {
  if (hub.includes('<div class="metric"><h2>Latest Send Total Price</h2><strong id="manualSendConfirmationLatestTotalPrice">0</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Latest Send Total Price</h2><strong id="manualSendConfirmationLatestTotalPrice">0</strong></div>',
      metricCards,
      "buyer reply tracking metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const replyTrackingCard = `
      <div class="card"><h2>Controlled Buyer-Gate Buyer Reply Tracking</h2><p>View buyer replies manually observed outside the system after manual send confirmation. Read-only; system does not read WhatsApp, scrape, auto-reply, auto-follow-up, mutate inventory/accounting/sales/pipeline, or close sale.</p><a href="/controlled-buyer-gate-buyer-reply-tracking">Open Buyer Reply Tracking</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-buyer-reply-tracking"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Manual Send Confirmation</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Manual Send Confirmation</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + replyTrackingCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", replyTrackingCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", replyTrackingCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadBuyerReplyTrackingHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-buyer-reply-tracking/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("buyerReplyTrackingTotal", summary.totalBuyerReplyTrackings || 0);
        setText("buyerReplyTrackingRecorded", summary.recordedBuyerReplyTrackingCount || 0);
        setText("buyerReplyTrackingHot", summary.hotReplyCount || 0);
        setText("buyerReplyTrackingWarm", summary.warmReplyCount || 0);
        setText("buyerReplyTrackingCold", summary.coldReplyCount || 0);
        setText("buyerReplyTrackingNoReply", summary.noReplyCount || 0);
        setText("buyerReplyTrackingLatestStatus", summary.latestBuyerReplyStatus || "NONE");
        setText("buyerReplyTrackingLatestTemperature", summary.latestBuyerReplyTemperature || "NONE");
      } catch (error) {
        const element = document.getElementById("buyerReplyTrackingLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadBuyerReplyTrackingHubMetrics();
  </script>
`;

if (!hub.includes("loadBuyerReplyTrackingHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 37C admin hub patch applied.");

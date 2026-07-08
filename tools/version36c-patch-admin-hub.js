const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 36C PATCH FAILED: ${message}`);
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

if (!controller.includes('controlled-buyer-gate-manual-send-confirmation.service')) {
  const importLine = 'const controlledBuyerGateManualSendConfirmationService = require("../services/controlled-buyer-gate-manual-send-confirmation.service");\n';

  if (controller.includes('const controlledBuyerGateManualQuoteDraftService = require("../services/controlled-buyer-gate-manual-quote-draft.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateManualQuoteDraftService = require("../services/controlled-buyer-gate-manual-quote-draft.service");',
      'const controlledBuyerGateManualQuoteDraftService = require("../services/controlled-buyer-gate-manual-quote-draft.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Manual Send Confirmation"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Manual Send Confirmation", path: "/controlled-buyer-gate-manual-send-confirmation", purpose: "Read-only manual send confirmation dashboard. Shows that admin manually sent quote outside the system after manual quote draft review. System does not send WhatsApp, quote, or price; does not read WhatsApp; does not scrape; does not mutate inventory, accounting, sales, or pipeline." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

if (!controller.includes("controlledBuyerGateManualSendConfirmationOnly")) {
  const safetyBlock = `
    controlledBuyerGateManualSendConfirmationOnly: true,
    manualSendConfirmationGateOnly: true,
    manualSendConfirmationRecordOnly: true,
    controlledManualSendConfirmationOnly: true,
    adminManualSendOutsideSystemOnly: true,
    systemSendBlocked: true,
    systemDidNotSendQuote: true,
    systemDidNotSendPrice: true,
    manualSendRecordedOnly: true,
    buyerReplyTrackingRequiredNext: true,
    noAutoFollowUp: true,
    noSystemSendWhatsApp: true,
    noReceiptCreation: true,
    noInvoiceCreation: true,
`;

  if (controller.includes("    controlledBuyerGateManualQuoteDraftOnly: true,")) {
    controller = controller.replace("    controlledBuyerGateManualQuoteDraftOnly: true,", safetyBlock + "\n    controlledBuyerGateManualQuoteDraftOnly: true,");
  } else if (controller.includes("    leadLimitOnly: true,")) {
    controller = controller.replace("    leadLimitOnly: true,", safetyBlock + "\n    leadLimitOnly: true,");
  } else {
    fail("Could not find safety insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateManualSendConfirmationService.getManualSendConfirmationSummary")) {
  const metricLine = '  const controlledBuyerGateManualSendConfirmation = safeRead(() => controlledBuyerGateManualSendConfirmationService.getManualSendConfirmationSummary(), {});';

  if (controller.includes('  const controlledBuyerGateManualQuoteDraft = safeRead(() => controlledBuyerGateManualQuoteDraftService.getManualQuoteDraftSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateManualQuoteDraft = safeRead(() => controlledBuyerGateManualQuoteDraftService.getManualQuoteDraftSummary(), {});',
      '\n' + metricLine,
      "manual quote draft metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!/controlledBuyerGateManualSendConfirmation\s*\n\s*}/.test(controller) && !/controlledBuyerGateManualSendConfirmation,\s*\n/.test(controller)) {
  const pattern = /(controlledBuyerGateManualQuoteDraft)(,?)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateManualQuoteDraft metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateManualSendConfirmation$3");
}

const safetyBadges = `
      <span class="badge">MANUAL SEND CONFIRMATION DASHBOARD ONLY</span>
      <span class="badge">MANUAL SEND CONFIRMATION RECORD ONLY</span>
      <span class="badge">ADMIN MANUAL SEND OUTSIDE SYSTEM ONLY</span>
      <span class="badge">SYSTEM SEND BLOCKED</span>
      <span class="badge">SYSTEM DID NOT SEND WHATSAPP</span>
      <span class="badge">SYSTEM DID NOT SEND QUOTE</span>
      <span class="badge">SYSTEM DID NOT SEND PRICE</span>
      <span class="badge">BUYER REPLY TRACKING REQUIRED NEXT</span>
      <span class="badge">NO AUTO FOLLOW-UP</span>`;

if (!hub.includes("MANUAL SEND CONFIRMATION DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">MANUAL SEND CONFIRMATION REQUIRED NEXT</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">MANUAL SEND CONFIRMATION REQUIRED NEXT</span>',
      safetyBadges,
      "manual send confirmation safety badge"
    );
  } else if (hub.includes('<span class="badge">NO PRICE SENT TO BUYER</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">NO PRICE SENT TO BUYER</span>',
      safetyBadges,
      "manual send confirmation safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Send Confirmation Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Manual send confirmation records admin manual sending outside the system only.</li>
        <li>Manual send confirmation does not send WhatsApp.</li>
        <li>Manual send confirmation does not send quote.</li>
        <li>Manual send confirmation does not send price.</li>
        <li>Manual send confirmation does not read WhatsApp.</li>
        <li>Manual send confirmation does not scrape buyer messages.</li>
        <li>Manual send confirmation does not mutate inventory, accounting, sales, or pipeline.</li>
        <li>Buyer reply tracking is required next.</li>
        <li>No auto follow-up starts at this gate.</li>`;

if (!hub.includes("<li>Manual send confirmation records admin manual sending outside the system only.</li>")) {
  if (hub.includes("<li>Manual send confirmation gate is required next.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Manual send confirmation gate is required next.</li>",
      safetyList,
      "manual send confirmation safety list"
    );
  } else if (hub.includes("<li>Manual quote draft does not send price.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Manual quote draft does not send price.</li>",
      safetyList,
      "manual send confirmation safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Send Confirmation Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Manual Send Confirmation Records</h2><strong id="manualSendConfirmationTotal">0</strong></div>
        <div class="metric"><h2>Recorded Manual Send Confirmations</h2><strong id="manualSendConfirmationRecorded">0</strong></div>
        <div class="metric"><h2>Outside-System Sends</h2><strong id="manualSendConfirmationOutsideSystem">0</strong></div>
        <div class="metric"><h2>Latest Send Confirmation Status</h2><strong id="manualSendConfirmationLatestStatus">NO_MANUAL_SEND_CONFIRMATION</strong></div>
        <div class="metric"><h2>Latest Send Source</h2><strong id="manualSendConfirmationLatestSource">NONE</strong></div>
        <div class="metric"><h2>Latest Send Channel</h2><strong id="manualSendConfirmationLatestChannel">NONE</strong></div>
        <div class="metric"><h2>Latest Send Currency</h2><strong id="manualSendConfirmationLatestCurrency">NONE</strong></div>
        <div class="metric"><h2>Latest Send Total Price</h2><strong id="manualSendConfirmationLatestTotalPrice">0</strong></div>`;

if (!hub.includes('id="manualSendConfirmationTotal"')) {
  if (hub.includes('<div class="metric"><h2>Latest Draft Total Price</h2><strong id="manualQuoteDraftLatestTotalPrice">0</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Latest Draft Total Price</h2><strong id="manualQuoteDraftLatestTotalPrice">0</strong></div>',
      metricCards,
      "manual send confirmation metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const sendConfirmationCard = `
      <div class="card"><h2>Controlled Buyer-Gate Manual Send Confirmation</h2><p>View admin manual send confirmation records after manual quote draft review. Read-only; system did not send WhatsApp, quote, or price, did not read WhatsApp, did not scrape, did not mutate inventory/accounting/sales/pipeline, and buyer reply tracking is required next.</p><a href="/controlled-buyer-gate-manual-send-confirmation">Open Manual Send Confirmation</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-manual-send-confirmation"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Manual Quote Draft</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Manual Quote Draft</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + sendConfirmationCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", sendConfirmationCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", sendConfirmationCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadManualSendConfirmationHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-manual-send-confirmation/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("manualSendConfirmationTotal", summary.totalManualSendConfirmations || 0);
        setText("manualSendConfirmationRecorded", summary.recordedManualSendConfirmationCount || 0);
        setText("manualSendConfirmationOutsideSystem", summary.manualOutsideSystemSendCount || 0);
        setText("manualSendConfirmationLatestStatus", summary.latestManualSendConfirmationStatus || "NO_MANUAL_SEND_CONFIRMATION");
        setText("manualSendConfirmationLatestSource", summary.latestSource || "NONE");
        setText("manualSendConfirmationLatestChannel", summary.latestManualSendChannel || "NONE");
        setText("manualSendConfirmationLatestCurrency", summary.latestCurrency || "NONE");
        setText("manualSendConfirmationLatestTotalPrice", summary.latestTotalPrice || 0);
      } catch (error) {
        const element = document.getElementById("manualSendConfirmationLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadManualSendConfirmationHubMetrics();
  </script>
`;

if (!hub.includes("loadManualSendConfirmationHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 36C admin hub patch applied.");

const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 35C PATCH FAILED: ${message}`);
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

if (!controller.includes('controlled-buyer-gate-manual-quote-draft.service')) {
  const importLine = 'const controlledBuyerGateManualQuoteDraftService = require("../services/controlled-buyer-gate-manual-quote-draft.service");\n';

  if (controller.includes('const controlledBuyerGateFinalQuoteEligibilityService = require("../services/controlled-buyer-gate-final-quote-eligibility.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateFinalQuoteEligibilityService = require("../services/controlled-buyer-gate-final-quote-eligibility.service");',
      'const controlledBuyerGateFinalQuoteEligibilityService = require("../services/controlled-buyer-gate-final-quote-eligibility.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Manual Quote Draft"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Manual Quote Draft", path: "/controlled-buyer-gate-manual-quote-draft", purpose: "Read-only manual quote draft dashboard. Shows internal quote drafts after final quote eligibility. Price is internal only. No buyer contact, no quote sent, no price sent, no WhatsApp send/read, no scraping, no inventory mutation, no accounting, no sale closing, and no pipeline movement." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

if (!controller.includes("controlledBuyerGateManualQuoteDraftOnly")) {
  const safetyBlock = `
    controlledBuyerGateManualQuoteDraftOnly: true,
    manualQuoteDraftGateOnly: true,
    manualQuoteDraftRecordOnly: true,
    controlledManualQuoteDraftOnly: true,
    quoteDraftPreparedOnly: true,
    quoteDraftNotSentOnly: true,
    priceIncludedInDraftOnly: true,
    priceNotSentToBuyer: true,
    quoteNotSentToBuyer: true,
    manualReviewBeforeSendingRequired: true,
    manualSendConfirmationRequiredNext: true,
`;

  if (controller.includes("    controlledBuyerGateFinalQuoteEligibilityOnly: true,")) {
    controller = controller.replace("    controlledBuyerGateFinalQuoteEligibilityOnly: true,", safetyBlock + "\n    controlledBuyerGateFinalQuoteEligibilityOnly: true,");
  } else if (controller.includes("    leadLimitOnly: true,")) {
    controller = controller.replace("    leadLimitOnly: true,", safetyBlock + "\n    leadLimitOnly: true,");
  } else {
    fail("Could not find safety insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateManualQuoteDraftService.getManualQuoteDraftSummary")) {
  const metricLine = '  const controlledBuyerGateManualQuoteDraft = safeRead(() => controlledBuyerGateManualQuoteDraftService.getManualQuoteDraftSummary(), {});';

  if (controller.includes('  const controlledBuyerGateFinalQuoteEligibility = safeRead(() => controlledBuyerGateFinalQuoteEligibilityService.getFinalQuoteEligibilitySummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateFinalQuoteEligibility = safeRead(() => controlledBuyerGateFinalQuoteEligibilityService.getFinalQuoteEligibilitySummary(), {});',
      '\n' + metricLine,
      "final quote eligibility metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!/controlledBuyerGateManualQuoteDraft\s*\n\s*}/.test(controller) && !/controlledBuyerGateManualQuoteDraft,\s*\n/.test(controller)) {
  const pattern = /(controlledBuyerGateFinalQuoteEligibility)(,?)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateFinalQuoteEligibility metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateManualQuoteDraft$3");
}

const safetyBadges = `
      <span class="badge">MANUAL QUOTE DRAFT DASHBOARD ONLY</span>
      <span class="badge">MANUAL QUOTE DRAFT RECORD ONLY</span>
      <span class="badge">PRICE INSIDE INTERNAL DRAFT ONLY</span>
      <span class="badge">NO BUYER CONTACT FROM DRAFT GATE</span>
      <span class="badge">NO QUOTE SENT FROM DRAFT GATE</span>
      <span class="badge">NO PRICE SENT TO BUYER</span>
      <span class="badge">MANUAL REVIEW BEFORE SENDING REQUIRED</span>
      <span class="badge">MANUAL SEND CONFIRMATION REQUIRED NEXT</span>`;

if (!hub.includes("MANUAL QUOTE DRAFT DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">QUOTE BLOCKED UNTIL MANUAL QUOTE DRAFT GATE</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">QUOTE BLOCKED UNTIL MANUAL QUOTE DRAFT GATE</span>',
      safetyBadges,
      "manual quote draft safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Quote Draft Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Manual quote draft records internal draft text only.</li>
        <li>Manual quote draft can include price only inside the internal draft.</li>
        <li>Manual quote draft does not contact buyers.</li>
        <li>Manual quote draft does not send quote.</li>
        <li>Manual quote draft does not send price.</li>
        <li>Manual review before sending is required next.</li>
        <li>Manual send confirmation gate is required next.</li>`;

if (!hub.includes("<li>Manual quote draft records internal draft text only.</li>")) {
  if (hub.includes("<li>Manual quote draft gate is required next.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Manual quote draft gate is required next.</li>",
      safetyList,
      "manual quote draft safety list"
    );
  } else if (hub.includes("<li>Final quote eligibility does not send quote.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Final quote eligibility does not send quote.</li>",
      safetyList,
      "manual quote draft safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Quote Draft Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Manual Quote Draft Records</h2><strong id="manualQuoteDraftTotal">0</strong></div>
        <div class="metric"><h2>Prepared Manual Quote Drafts</h2><strong id="manualQuoteDraftPrepared">0</strong></div>
        <div class="metric"><h2>Eligible Manual Quote Drafts</h2><strong id="manualQuoteDraftEligible">0</strong></div>
        <div class="metric"><h2>Latest Draft Status</h2><strong id="manualQuoteDraftLatestStatus">NO_MANUAL_QUOTE_DRAFT</strong></div>
        <div class="metric"><h2>Latest Draft Source</h2><strong id="manualQuoteDraftLatestSource">NONE</strong></div>
        <div class="metric"><h2>Latest Draft Currency</h2><strong id="manualQuoteDraftLatestCurrency">NONE</strong></div>
        <div class="metric"><h2>Latest Draft Total Price</h2><strong id="manualQuoteDraftLatestTotalPrice">0</strong></div>`;

if (!hub.includes('id="manualQuoteDraftTotal"')) {
  if (hub.includes('<div class="metric"><h2>Latest Eligibility Source</h2><strong id="finalQuoteLatestSource">NONE</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Latest Eligibility Source</h2><strong id="finalQuoteLatestSource">NONE</strong></div>',
      metricCards,
      "manual quote draft metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const quoteDraftCard = `
      <div class="card"><h2>Controlled Buyer-Gate Manual Quote Draft</h2><p>View internal manual quote drafts after final quote eligibility. Read-only; price is internal only, no buyer contact, no quote sent, no price sent, no WhatsApp auto-send/read, no scraping, no inventory mutation, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/controlled-buyer-gate-manual-quote-draft">Open Manual Quote Draft</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-manual-quote-draft"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Final Quote Eligibility</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Final Quote Eligibility</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + quoteDraftCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", quoteDraftCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", quoteDraftCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadManualQuoteDraftHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-manual-quote-draft/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("manualQuoteDraftTotal", summary.totalManualQuoteDrafts || 0);
        setText("manualQuoteDraftPrepared", summary.preparedManualQuoteDraftCount || 0);
        setText("manualQuoteDraftEligible", summary.eligibleManualQuoteDraftCount || 0);
        setText("manualQuoteDraftLatestStatus", summary.latestManualQuoteDraftStatus || "NO_MANUAL_QUOTE_DRAFT");
        setText("manualQuoteDraftLatestSource", summary.latestSource || "NONE");
        setText("manualQuoteDraftLatestCurrency", summary.latestCurrency || "NONE");
        setText("manualQuoteDraftLatestTotalPrice", summary.latestTotalPrice || 0);
      } catch (error) {
        const element = document.getElementById("manualQuoteDraftLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadManualQuoteDraftHubMetrics();
  </script>
`;

if (!hub.includes("loadManualQuoteDraftHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 35C admin hub patch applied.");

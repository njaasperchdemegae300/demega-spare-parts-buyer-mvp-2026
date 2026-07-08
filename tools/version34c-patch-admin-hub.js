const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 34C PATCH FAILED: ${message}`);
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

if (!controller.includes('controlled-buyer-gate-final-quote-eligibility.service')) {
  const importLine = 'const controlledBuyerGateFinalQuoteEligibilityService = require("../services/controlled-buyer-gate-final-quote-eligibility.service");\n';

  if (controller.includes('const controlledBuyerGateManualCompatibilityCheckService = require("../services/controlled-buyer-gate-manual-compatibility-check.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateManualCompatibilityCheckService = require("../services/controlled-buyer-gate-manual-compatibility-check.service");',
      'const controlledBuyerGateManualCompatibilityCheckService = require("../services/controlled-buyer-gate-manual-compatibility-check.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Final Quote Eligibility"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Final Quote Eligibility", path: "/controlled-buyer-gate-final-quote-eligibility", purpose: "Read-only final quote eligibility dashboard. Shows final quote readiness before manual quote draft preparation. No buyer contact, no quote, no price, no quote sent, no WhatsApp send/read, no scraping, no inventory mutation, no accounting, no sale closing, and no pipeline movement." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

if (!controller.includes("controlledBuyerGateFinalQuoteEligibilityOnly")) {
  const safetyBlock = `
    controlledBuyerGateFinalQuoteEligibilityOnly: true,
    finalQuoteEligibilityGateOnly: true,
    finalQuoteEligibilityRecordOnly: true,
    controlledFinalQuoteEligibilityOnly: true,
    manualFinalQuoteEligibilityOnly: true,
    quoteEligibilityDecisionOnly: true,
    finalQuoteEligibilityRecordedOnly: true,
    eligibleForManualQuoteDraftOnly: true,
    notEligibleForQuoteOnly: true,
    needsManagerReviewOnly: true,
    quoteStillBlockedUntilDraftGate: true,
    manualQuoteDraftRequiredNext: true,
    noQuoteSentToBuyer: true,
`;

  if (controller.includes("    controlledBuyerGateManualCompatibilityCheckOnly: true,")) {
    controller = controller.replace("    controlledBuyerGateManualCompatibilityCheckOnly: true,", safetyBlock + "\n    controlledBuyerGateManualCompatibilityCheckOnly: true,");
  } else if (controller.includes("    leadLimitOnly: true,")) {
    controller = controller.replace("    leadLimitOnly: true,", safetyBlock + "\n    leadLimitOnly: true,");
  } else {
    fail("Could not find safety insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateFinalQuoteEligibilityService.getFinalQuoteEligibilitySummary")) {
  const metricLine = '  const controlledBuyerGateFinalQuoteEligibility = safeRead(() => controlledBuyerGateFinalQuoteEligibilityService.getFinalQuoteEligibilitySummary(), {});';

  if (controller.includes('  const controlledBuyerGateManualCompatibilityCheck = safeRead(() => controlledBuyerGateManualCompatibilityCheckService.getManualCompatibilityCheckSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateManualCompatibilityCheck = safeRead(() => controlledBuyerGateManualCompatibilityCheckService.getManualCompatibilityCheckSummary(), {});',
      '\n' + metricLine,
      "manual compatibility check metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!/controlledBuyerGateFinalQuoteEligibility\s*\n\s*}/.test(controller) && !/controlledBuyerGateFinalQuoteEligibility,\s*\n/.test(controller)) {
  const pattern = /(controlledBuyerGateManualCompatibilityCheck)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateManualCompatibilityCheck metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateFinalQuoteEligibility$2");
}

const safetyBadges = `
      <span class="badge">FINAL QUOTE ELIGIBILITY DASHBOARD ONLY</span>
      <span class="badge">FINAL QUOTE ELIGIBILITY RECORD ONLY</span>
      <span class="badge">NO BUYER CONTACT FROM ELIGIBILITY GATE</span>
      <span class="badge">NO QUOTE PREPARED AT ELIGIBILITY GATE</span>
      <span class="badge">NO PRICE INCLUDED AT ELIGIBILITY GATE</span>
      <span class="badge">NO QUOTE SENT AT ELIGIBILITY GATE</span>
      <span class="badge">QUOTE BLOCKED UNTIL MANUAL QUOTE DRAFT GATE</span>`;

if (!hub.includes("FINAL QUOTE ELIGIBILITY DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">QUOTE BLOCKED UNTIL FINAL ELIGIBILITY</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">QUOTE BLOCKED UNTIL FINAL ELIGIBILITY</span>',
      safetyBadges,
      "final quote eligibility safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Final Quote Eligibility Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Final quote eligibility records quote readiness only.</li>
        <li>Final quote eligibility does not contact buyers.</li>
        <li>Final quote eligibility does not prepare quote.</li>
        <li>Final quote eligibility does not include price.</li>
        <li>Final quote eligibility does not send quote.</li>
        <li>Quote remains blocked until manual quote draft gate.</li>
        <li>Manual quote draft gate is required next.</li>`;

if (!hub.includes("<li>Final quote eligibility records quote readiness only.</li>")) {
  if (hub.includes("<li>Manual compatibility check does not prepare quote.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Manual compatibility check does not prepare quote.</li>",
      safetyList,
      "final quote eligibility safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Final Quote Eligibility Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Final Quote Eligibility Records</h2><strong id="finalQuoteEligibilityTotal">0</strong></div>
        <div class="metric"><h2>Recorded Final Eligibility</h2><strong id="finalQuoteEligibilityRecorded">0</strong></div>
        <div class="metric"><h2>Eligible For Manual Draft</h2><strong id="finalQuoteEligibleForDraft">0</strong></div>
        <div class="metric"><h2>Not Eligible For Quote</h2><strong id="finalQuoteNotEligible">0</strong></div>
        <div class="metric"><h2>Needs Manager Review</h2><strong id="finalQuoteNeedsManagerReview">0</strong></div>
        <div class="metric"><h2>Latest Eligibility Status</h2><strong id="finalQuoteLatestStatus">NO_FINAL_QUOTE_ELIGIBILITY</strong></div>
        <div class="metric"><h2>Latest Eligibility Decision</h2><strong id="finalQuoteLatestDecision">NONE</strong></div>
        <div class="metric"><h2>Latest Eligibility Source</h2><strong id="finalQuoteLatestSource">NONE</strong></div>`;

if (!hub.includes('id="finalQuoteEligibilityTotal"')) {
  if (hub.includes('<div class="metric"><h2>Latest Compatibility Source</h2><strong id="manualCompatibilityLatestSource">NONE</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Latest Compatibility Source</h2><strong id="manualCompatibilityLatestSource">NONE</strong></div>',
      metricCards,
      "final quote eligibility metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const finalQuoteCard = `
      <div class="card"><h2>Controlled Buyer-Gate Final Quote Eligibility</h2><p>View final quote eligibility records before manual quote draft preparation. Read-only; no buyer contact, no quote, no price, no quote sent, no WhatsApp auto-send/read, no scraping, no inventory mutation, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/controlled-buyer-gate-final-quote-eligibility">Open Final Quote Eligibility</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-final-quote-eligibility"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Manual Compatibility Check</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Manual Compatibility Check</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + finalQuoteCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", finalQuoteCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", finalQuoteCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadFinalQuoteEligibilityHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-final-quote-eligibility/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("finalQuoteEligibilityTotal", summary.totalFinalQuoteEligibilities || 0);
        setText("finalQuoteEligibilityRecorded", summary.recordedFinalQuoteEligibilityCount || 0);
        setText("finalQuoteEligibleForDraft", summary.eligibleForManualQuoteDraftCount || 0);
        setText("finalQuoteNotEligible", summary.notEligibleForQuoteCount || 0);
        setText("finalQuoteNeedsManagerReview", summary.needsManagerReviewCount || 0);
        setText("finalQuoteLatestStatus", summary.latestFinalQuoteEligibilityStatus || "NO_FINAL_QUOTE_ELIGIBILITY");
        setText("finalQuoteLatestDecision", summary.latestEligibilityDecision || "NONE");
        setText("finalQuoteLatestSource", summary.latestSource || "NONE");
      } catch (error) {
        const element = document.getElementById("finalQuoteLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadFinalQuoteEligibilityHubMetrics();
  </script>
`;

if (!hub.includes("loadFinalQuoteEligibilityHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 34C admin hub patch applied.");

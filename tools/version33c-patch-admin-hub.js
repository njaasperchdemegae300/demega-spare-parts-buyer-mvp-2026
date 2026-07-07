const fs = require("fs");

const controllerFile = "src/controllers/admin-navigation.controller.js";
const hubFile = "public/admin-navigation-hub.html";

let controller = fs.readFileSync(controllerFile, "utf8");
let hub = fs.readFileSync(hubFile, "utf8");

function fail(message) {
  throw new Error(`VERSION 33C PATCH FAILED: ${message}`);
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

if (!controller.includes('controlled-buyer-gate-manual-compatibility-check.service')) {
  const importLine = 'const controlledBuyerGateManualCompatibilityCheckService = require("../services/controlled-buyer-gate-manual-compatibility-check.service");\n';

  if (controller.includes('const controlledBuyerGateManualStockCheckService = require("../services/controlled-buyer-gate-manual-stock-check.service");')) {
    controller = controller.replace(
      'const controlledBuyerGateManualStockCheckService = require("../services/controlled-buyer-gate-manual-stock-check.service");',
      'const controlledBuyerGateManualStockCheckService = require("../services/controlled-buyer-gate-manual-stock-check.service");\n' + importLine.trimEnd()
    );
  } else {
    const lastRequire = controller.lastIndexOf('require("../services/');
    if (lastRequire === -1) fail("Could not find service import insertion point.");
    const lineEnd = controller.indexOf("\n", lastRequire);
    controller = controller.slice(0, lineEnd + 1) + importLine + controller.slice(lineEnd + 1);
  }
}

if (!controller.includes('{ name: "Controlled Buyer-Gate Manual Compatibility Check"')) {
  const modulesStart = controller.indexOf("const modules = [");
  const modulesEnd = controller.indexOf("];", modulesStart);

  if (modulesStart === -1 || modulesEnd === -1) fail("Could not find admin modules array.");

  const insert = ',\n  { name: "Controlled Buyer-Gate Manual Compatibility Check", path: "/controlled-buyer-gate-manual-compatibility-check", purpose: "Read-only manual compatibility check dashboard. Shows manually confirmed compatibility decisions before final quote eligibility or quote preparation. No buyer contact, no quote, no price, no WhatsApp send/read, no scraping, no inventory mutation, no accounting, no sale closing, and no pipeline movement." }';
  controller = controller.slice(0, modulesEnd) + insert + controller.slice(modulesEnd);
}

if (!controller.includes("controlledBuyerGateManualCompatibilityCheckOnly")) {
  const safetyBlock = `
    controlledBuyerGateManualCompatibilityCheckOnly: true,
    manualCompatibilityCheckGateOnly: true,
    compatibilityCheckRecordOnly: true,
    controlledCompatibilityCheckOnly: true,
    manualCompatibilityStatusOnly: true,
    compatibilityCheckCompletedOnly: true,
    compatibilityDecisionRecordOnly: true,
    compatibilityConfirmedManuallyOnly: true,
    compatibilityConfirmedOnly: true,
    compatibilityNotConfirmedOnly: true,
    compatibilityNeedsMoreInfoOnly: true,
    quoteBlockedUntilFinalEligibility: true,
    finalQuoteEligibilityRequiredNext: true,
    noPriceIncluded: true,
`;

  if (controller.includes("    leadLimitOnly: true,")) {
    controller = controller.replace("    leadLimitOnly: true,", safetyBlock + "\n    leadLimitOnly: true,");
  } else {
    fail("Could not find safety insertion point.");
  }
}

if (!controller.includes("controlledBuyerGateManualCompatibilityCheckService.getManualCompatibilityCheckSummary")) {
  const metricLine = '  const controlledBuyerGateManualCompatibilityCheck = safeRead(() => controlledBuyerGateManualCompatibilityCheckService.getManualCompatibilityCheckSummary(), {});';

  if (controller.includes('  const controlledBuyerGateManualStockCheck = safeRead(() => controlledBuyerGateManualStockCheckService.getManualStockCheckSummary(), {});')) {
    controller = insertAfter(
      controller,
      '  const controlledBuyerGateManualStockCheck = safeRead(() => controlledBuyerGateManualStockCheckService.getManualStockCheckSummary(), {});',
      '\n' + metricLine,
      "manual stock check metrics const"
    );
  } else {
    fail("Could not find metrics const insertion point.");
  }
}

if (!/controlledBuyerGateManualCompatibilityCheck\s*\n\s*}/.test(controller) && !/controlledBuyerGateManualCompatibilityCheck,\s*\n/.test(controller)) {
  const pattern = /(controlledBuyerGateManualStockCheck)(\s*\n\s*})/;

  if (!pattern.test(controller)) {
    fail("Could not find controlledBuyerGateManualStockCheck metrics object entry.");
  }

  controller = controller.replace(pattern, "$1,\n      controlledBuyerGateManualCompatibilityCheck$2");
}

const safetyBadges = `
      <span class="badge">MANUAL COMPATIBILITY CHECK DASHBOARD ONLY</span>
      <span class="badge">COMPATIBILITY CHECK RECORD ONLY</span>
      <span class="badge">NO BUYER CONTACT FROM COMPATIBILITY GATE</span>
      <span class="badge">NO QUOTE PREPARED AT COMPATIBILITY GATE</span>
      <span class="badge">NO PRICE INCLUDED</span>
      <span class="badge">QUOTE BLOCKED UNTIL FINAL ELIGIBILITY</span>`;

if (!hub.includes("MANUAL COMPATIBILITY CHECK DASHBOARD ONLY")) {
  if (hub.includes('<span class="badge">NO QUOTE PREPARED AT STOCK GATE</span>')) {
    hub = insertAfter(
      hub,
      '<span class="badge">NO QUOTE PREPARED AT STOCK GATE</span>',
      safetyBadges,
      "manual compatibility check safety badge"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Compatibility Check Safety</h2>${safetyBadges}</section>\n`, "main end");
  }
}

const safetyList = `
        <li>Manual compatibility check records compatibility status only.</li>
        <li>Manual compatibility check does not contact buyers.</li>
        <li>Manual compatibility check does not prepare quote.</li>
        <li>Manual compatibility check does not include price.</li>
        <li>Quote remains blocked until final quote eligibility.</li>
        <li>Final quote eligibility is required next.</li>`;

if (!hub.includes("<li>Manual compatibility check records compatibility status only.</li>")) {
  if (hub.includes("<li>Manual stock check does not prepare quote.</li>")) {
    hub = insertAfter(
      hub,
      "<li>Manual stock check does not prepare quote.</li>",
      safetyList,
      "manual compatibility check safety list"
    );
  } else {
    hub = insertBefore(hub, "</main>", `<section class="panel"><h2>Manual Compatibility Check Rules</h2><ul>${safetyList}</ul></section>\n`, "main end");
  }
}

const metricCards = `
        <div class="metric"><h2>Manual Compatibility Checks</h2><strong id="manualCompatibilityCheckTotal">0</strong></div>
        <div class="metric"><h2>Completed Compatibility Checks</h2><strong id="manualCompatibilityCheckCompleted">0</strong></div>
        <div class="metric"><h2>Compatibility Confirmed</h2><strong id="manualCompatibilityConfirmed">0</strong></div>
        <div class="metric"><h2>Compatibility Not Confirmed</h2><strong id="manualCompatibilityNotConfirmed">0</strong></div>
        <div class="metric"><h2>Compatibility Needs More Info</h2><strong id="manualCompatibilityNeedsInfo">0</strong></div>
        <div class="metric"><h2>Latest Compatibility Status</h2><strong id="manualCompatibilityLatestStatus">NO_COMPATIBILITY_CHECK</strong></div>
        <div class="metric"><h2>Latest Compatibility Decision</h2><strong id="manualCompatibilityLatestDecision">NONE</strong></div>
        <div class="metric"><h2>Latest Compatibility Source</h2><strong id="manualCompatibilityLatestSource">NONE</strong></div>`;

if (!hub.includes('id="manualCompatibilityCheckTotal"')) {
  if (hub.includes('<div class="metric"><h2>Latest Stock Source</h2><strong id="manualStockLatestSource">NONE</strong></div>')) {
    hub = insertAfter(
      hub,
      '<div class="metric"><h2>Latest Stock Source</h2><strong id="manualStockLatestSource">NONE</strong></div>',
      metricCards,
      "manual compatibility check metric cards"
    );
  } else {
    hub = insertBeforeFirstSectionEnd(hub, '<section class="cards"', metricCards);
  }
}

const compatibilityCard = `
      <div class="card"><h2>Controlled Buyer-Gate Manual Compatibility Check</h2><p>View controlled manual compatibility check decisions before final quote eligibility or quote preparation. Read-only; no buyer contact, no quote, no price, no WhatsApp auto-send/read, no scraping, no inventory mutation, no accounting entry, no sale closing, and no pipeline movement.</p><a href="/controlled-buyer-gate-manual-compatibility-check">Open Manual Compatibility Check</a></div>`;

if (!hub.includes('href="/controlled-buyer-gate-manual-compatibility-check"')) {
  if (hub.includes('<div class="card"><h2>Controlled Buyer-Gate Manual Stock Check</h2>')) {
    const markerStart = hub.indexOf('<div class="card"><h2>Controlled Buyer-Gate Manual Stock Check</h2>');
    const markerEnd = hub.indexOf("</div>", markerStart);

    if (markerEnd !== -1) {
      hub = hub.slice(0, markerEnd + 6) + "\n" + compatibilityCard + hub.slice(markerEnd + 6);
    } else {
      hub = insertBefore(hub, "</main>", compatibilityCard + "\n", "main end");
    }
  } else {
    hub = insertBefore(hub, "</main>", compatibilityCard + "\n", "main end");
  }
}

const helperScript = `
  <script>
    async function loadManualCompatibilityCheckHubMetrics() {
      try {
        const response = await fetch("/api/controlled-buyer-gate-manual-compatibility-check/summary");
        const data = await response.json();
        const summary = data.summary || {};
        const setText = (id, value) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        };

        setText("manualCompatibilityCheckTotal", summary.totalCompatibilityChecks || 0);
        setText("manualCompatibilityCheckCompleted", summary.completedCompatibilityCheckCount || 0);
        setText("manualCompatibilityConfirmed", summary.compatibilityConfirmedCount || 0);
        setText("manualCompatibilityNotConfirmed", summary.compatibilityNotConfirmedCount || 0);
        setText("manualCompatibilityNeedsInfo", summary.compatibilityNeedsMoreInfoCount || 0);
        setText("manualCompatibilityLatestStatus", summary.latestCompatibilityCheckStatus || "NO_COMPATIBILITY_CHECK");
        setText("manualCompatibilityLatestDecision", summary.latestCompatibilityDecision || "NONE");
        setText("manualCompatibilityLatestSource", summary.latestSource || "NONE");
      } catch (error) {
        const element = document.getElementById("manualCompatibilityLatestStatus");
        if (element) element.textContent = "LOAD_ERROR";
      }
    }

    loadManualCompatibilityCheckHubMetrics();
  </script>
`;

if (!hub.includes("loadManualCompatibilityCheckHubMetrics")) {
  hub = insertBefore(hub, "</body>", helperScript + "\n", "body end");
}

fs.writeFileSync(controllerFile, controller, "utf8");
fs.writeFileSync(hubFile, hub, "utf8");

console.log("Version 33C admin hub patch applied.");

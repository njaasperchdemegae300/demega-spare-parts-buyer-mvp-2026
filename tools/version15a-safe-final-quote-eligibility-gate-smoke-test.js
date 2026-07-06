const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3059;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const reportPath = path.join(ROOT, "reports", "version15a-safe-final-quote-eligibility-gate-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalStockConfirmations = fs.existsSync(stockConfirmationsPath) ? fs.readFileSync(stockConfirmationsPath, "utf8") : "[]";
const originalCompatibilityConfirmations = fs.existsSync(compatibilityConfirmationsPath) ? fs.readFileSync(compatibilityConfirmationsPath, "utf8") : "[]";
const originalQuoteEligibilities = fs.existsSync(quoteEligibilitiesPath) ? fs.readFileSync(quoteEligibilitiesPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(stockConfirmationsPath, originalStockConfirmations, "utf8");
  fs.writeFileSync(compatibilityConfirmationsPath, originalCompatibilityConfirmations, "utf8");
  fs.writeFileSync(quoteEligibilitiesPath, originalQuoteEligibilities, "utf8");
}

function stopProcess(child) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  } catch {}
}

async function request(route, options = {}) {
  const response = await fetch(`${BASE_URL}${route}`, options);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { route, status: response.status, ok: response.ok, text, body };
}

async function main() {
  let logs = "";
  let child;

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logs += data.toString());
    child.stderr.on("data", data => logs += data.toString());

    await wait(2000);

    const buyerLead = {
      buyerName: "Final Quote Eligibility Buyer",
      phone: "08080808080",
      source: "whatsapp_inbound",
      partNeeded: "1ZZ alternator",
      vehicleBrand: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: "2005",
      engineCode: "1ZZ",
      location: "Lagos",
      urgency: "urgent",
      message: "Need 1ZZ alternator urgently today."
    };

    const health = await request("/api/health");
    const preview = await request("/api/quote-eligibility/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const leadId = createLead.body && createLead.body.lead ? createLead.body.lead.id : "missing-lead-id";

    const beforeGates = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Check before stock and compatibility gates."
      })
    });

    const createStock = await request("/api/stock-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        stockStatus: "confirmed_in_stock",
        stockQuantity: 1,
        condition: "used_original",
        supplierOrShelf: "Ladipo shelf E5",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before final eligibility."
      })
    });

    const createCompatibility = await request("/api/compatibility-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        compatibilityStatus: "confirmed_compatible",
        confirmationMethod: "engine_code_match",
        matchedEngineCode: "1ZZ",
        matchedPartNumber: "ALT-1ZZ-FINAL",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before final eligibility."
      })
    });

    const unsafePrice = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        price: "50000",
        quoteAmount: "50000",
        quoteDraft: "Unsafe quote draft payload"
      })
    });

    const unsafeAuto = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        autoCreateQuote: true,
        autoSendWhatsApp: true,
        sendBuyerMessage: true,
        autoMovePipelineStage: true
      })
    });

    const afterGates = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Final eligibility after stock and compatibility gates."
      })
    });

    const list = await request("/api/quote-eligibilities");
    const summary = await request("/api/quote-eligibility/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Safe Final Quote Eligibility Gate Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Eligibility check only")) &&
      preview.body.rules.some(rule => rule.includes("No automatic quote creation"));

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const beforeGatesOk =
      beforeGates.status === 201 &&
      beforeGates.body.eligibility &&
      beforeGates.body.eligibility.eligibleForManualQuoteDraft === false &&
      beforeGates.body.eligibility.finalQuoteGatePassed === false &&
      beforeGates.body.eligibility.manualQuoteDraftAllowed === false &&
      Array.isArray(beforeGates.body.eligibility.gateReasons) &&
      beforeGates.body.eligibility.gateReasons.length >= 1 &&
      beforeGates.body.eligibility.autoCreateQuote === false &&
      beforeGates.body.eligibility.autoSendWhatsApp === false &&
      beforeGates.body.eligibility.sentToBuyer === false &&
      beforeGates.body.eligibility.priceIncluded === false;

    const createStockOk =
      createStock.status === 201 &&
      createStock.body.confirmation &&
      createStock.body.confirmation.stockConfirmed === true;

    const createCompatibilityOk =
      createCompatibility.status === 201 &&
      createCompatibility.body.confirmation &&
      createCompatibility.body.confirmation.stockConfirmed === true &&
      createCompatibility.body.confirmation.compatibilityConfirmed === true;

    const unsafePriceOk =
      unsafePrice.status === 400 &&
      unsafePrice.body &&
      Array.isArray(unsafePrice.body.errors);

    const unsafeAutoOk =
      unsafeAuto.status === 400 &&
      unsafeAuto.body &&
      Array.isArray(unsafeAuto.body.errors);

    const eligibility = afterGates.body && afterGates.body.eligibility;

    const afterGatesOk =
      afterGates.status === 201 &&
      eligibility &&
      eligibility.leadId === leadId &&
      eligibility.stockConfirmed === true &&
      eligibility.compatibilityConfirmed === true &&
      eligibility.eligibleForManualQuoteDraft === true &&
      eligibility.manualQuoteDraftAllowed === true &&
      eligibility.finalQuoteGatePassed === true &&
      eligibility.quoteEligibilityOnly === true &&
      eligibility.manualReviewRequired === true &&
      eligibility.manualActionOnly === true &&
      eligibility.autoCreateQuote === false &&
      eligibility.quoteCreatedAutomatically === false &&
      eligibility.autoSendWhatsApp === false &&
      eligibility.automaticBuyerMessage === false &&
      eligibility.sentToBuyer === false &&
      eligibility.autoOpenBrowser === false &&
      eligibility.autoMovePipelineStage === false &&
      eligibility.pipelineMovedAutomatically === false &&
      eligibility.priceIncluded === false &&
      eligibility.quoteAmountIncluded === false;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.eligibilities) &&
      list.body.eligibilities.some(item =>
        item.leadId === leadId &&
        item.finalQuoteGatePassed === true &&
        item.eligibleForManualQuoteDraft === true &&
        item.autoCreateQuote === false &&
        item.sentToBuyer === false &&
        item.priceIncluded === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalQuoteEligibilityChecks >= 2 &&
      summary.body.summary.eligibleForManualQuoteDraft >= 1 &&
      summary.body.summary.finalQuoteGatePassed >= 1 &&
      summary.body.summary.blockedQuoteGate >= 1 &&
      summary.body.summary.stockConfirmedCount >= 1 &&
      summary.body.summary.compatibilityConfirmedCount >= 1 &&
      summary.body.summary.autoCreateQuoteCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.automaticBuyerMessageCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.autoOpenBrowserCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.priceIncludedCount === 0 &&
      summary.body.summary.safety.quoteEligibilityOnly === true &&
      summary.body.summary.safety.manualQuoteDraftAllowedOnlyAfterBothGates === true &&
      summary.body.summary.safety.stockAndCompatibilityRequiredBeforeQuote === true &&
      summary.body.summary.safety.autoCreateQuote === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.automaticBuyerMessage === false &&
      summary.body.summary.safety.autoOpenBrowser === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.sentToBuyer === false &&
      summary.body.summary.safety.priceIncluded === false &&
      summary.body.summary.safety.manualReviewRequired === true;

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      beforeGatesOk &&
      createStockOk &&
      createCompatibilityOk &&
      unsafePriceOk &&
      unsafeAutoOk &&
      afterGatesOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 15A Safe Final Quote Eligibility Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/quote-eligibility/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for final quote eligibility gate
- ${beforeGatesOk ? "PASS" : "FAIL"}: quote eligibility remains blocked before stock and compatibility confirmation
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before eligibility approval
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before eligibility approval
- ${unsafePriceOk ? "PASS" : "FAIL"}: price/quote payload at eligibility gate blocked
- ${unsafeAutoOk ? "PASS" : "FAIL"}: automatic quote/WhatsApp/pipeline request blocked
- ${afterGatesOk ? "PASS" : "FAIL"}: final quote eligibility approved only after both gates
- ${listOk ? "PASS" : "FAIL"}: GET /api/quote-eligibilities returns eligibility data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/quote-eligibility/summary returns safe eligibility metrics

## Safety Rules Confirmed
- Final quote eligibility gate is eligibility-check only.
- Manual quote draft is allowed only after stock and compatibility are both confirmed.
- System does not create quote automatically.
- System does not include price or quote amount.
- System does not send WhatsApp.
- System does not message buyer automatically.
- System does not open browser automatically.
- System does not move pipeline automatically.
- sentToBuyer remains false.
- Manual review remains required.
- Test lead, stock confirmation, compatibility confirmation, and quote eligibility data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 15B — Safe Final Quote Eligibility Dashboard Display
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);

    if (verdict !== "APPROVED") process.exitCode = 1;
  } finally {
    if (child) stopProcess(child);
    restoreData();
  }
}

main().catch(error => {
  restoreData();
  console.error(error);
  process.exit(1);
});

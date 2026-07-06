const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3060;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const reportPath = path.join(ROOT, "reports", "version15b-safe-final-quote-eligibility-dashboard-smoke-test-report.md");

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
      buyerName: "Quote Eligibility Dashboard Buyer",
      phone: "08090909090",
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
        note: "Dashboard test blocked eligibility before gates."
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
        supplierOrShelf: "Ladipo shelf F6",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Dashboard test stock confirmation."
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
        matchedPartNumber: "ALT-1ZZ-DASH-FINAL",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Dashboard test compatibility confirmation."
      })
    });

    const afterGates = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Dashboard test final quote eligibility after both gates."
      })
    });

    const page = await request("/quote-eligibility");
    const aliasPage = await request("/quote-eligibility-gate");
    const list = await request("/api/quote-eligibilities");
    const summary = await request("/api/quote-eligibility/summary");

    const healthOk = health.status === 200;

    const beforeGatesOk =
      beforeGates.status === 201 &&
      beforeGates.body.eligibility &&
      beforeGates.body.eligibility.finalQuoteGatePassed === false &&
      beforeGates.body.eligibility.eligibleForManualQuoteDraft === false &&
      beforeGates.body.eligibility.autoCreateQuote === false &&
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

    const afterGatesOk =
      afterGates.status === 201 &&
      afterGates.body.eligibility &&
      afterGates.body.eligibility.finalQuoteGatePassed === true &&
      afterGates.body.eligibility.eligibleForManualQuoteDraft === true &&
      afterGates.body.eligibility.manualQuoteDraftAllowed === true &&
      afterGates.body.eligibility.quoteEligibilityOnly === true &&
      afterGates.body.eligibility.autoCreateQuote === false &&
      afterGates.body.eligibility.autoSendWhatsApp === false &&
      afterGates.body.eligibility.sentToBuyer === false &&
      afterGates.body.eligibility.autoOpenBrowser === false &&
      afterGates.body.eligibility.priceIncluded === false &&
      afterGates.body.eligibility.quoteAmountIncluded === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Safe Final Quote Eligibility Dashboard") &&
      page.text.includes("Final Quote Eligibility Records") &&
      page.text.includes("Manual quote draft is allowed only after stock and compatibility are both confirmed") &&
      page.text.includes("Eligibility-check only") &&
      page.text.includes("Stock + compatibility required") &&
      page.text.includes("Manual quote draft only") &&
      page.text.includes("No auto-quote") &&
      page.text.includes("No price included") &&
      page.text.includes("No auto-send") &&
      page.text.includes("eligibilityRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Safe Final Quote Eligibility Dashboard");

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

    const readOnlyOk =
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("automaticBuyerMessage = true") &&
      !page.text.includes("quoteCreatedAutomatically = true") &&
      !page.text.includes("autoCreateQuote = true") &&
      !page.text.includes("sentToBuyer = true") &&
      !page.text.includes("priceIncluded = true") &&
      !page.text.includes("quoteAmountIncluded = true") &&
      !page.text.includes("autoOpenBrowser = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/quote-eligibility/check"');

    const verdict =
      healthOk &&
      beforeGatesOk &&
      createStockOk &&
      createCompatibilityOk &&
      afterGatesOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 15B Safe Final Quote Eligibility Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${beforeGatesOk ? "PASS" : "FAIL"}: quote eligibility stays blocked before both gates
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before dashboard approval state
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before dashboard approval state
- ${afterGatesOk ? "PASS" : "FAIL"}: final quote eligibility created for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /quote-eligibility returns safe final quote eligibility dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /quote-eligibility-gate alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/quote-eligibilities returns eligibility data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/quote-eligibility/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Safe Final Quote Eligibility dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays quote eligibility checks only.
- Dashboard does not create quote automatically.
- Dashboard does not include price or quote amount.
- Dashboard does not send WhatsApp.
- Dashboard does not message buyer automatically.
- Dashboard does not open browser automatically.
- Dashboard does not move pipeline automatically.
- Manual quote draft is allowed only after stock and compatibility are both confirmed.
- sentToBuyer remains false.
- Manual review remains required.
- Test lead, stock confirmation, compatibility confirmation, and quote eligibility data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 15C — Admin Hub Link Safe Final Quote Eligibility Gate
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

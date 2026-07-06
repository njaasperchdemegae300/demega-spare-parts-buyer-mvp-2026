const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3063;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const manualQuoteDraftsPath = path.join(ROOT, "src", "data", "manual-quote-drafts.json");
const reportPath = path.join(ROOT, "reports", "version16b-safe-manual-quote-draft-dashboard-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalStockConfirmations = fs.existsSync(stockConfirmationsPath) ? fs.readFileSync(stockConfirmationsPath, "utf8") : "[]";
const originalCompatibilityConfirmations = fs.existsSync(compatibilityConfirmationsPath) ? fs.readFileSync(compatibilityConfirmationsPath, "utf8") : "[]";
const originalQuoteEligibilities = fs.existsSync(quoteEligibilitiesPath) ? fs.readFileSync(quoteEligibilitiesPath, "utf8") : "[]";
const originalManualQuoteDrafts = fs.existsSync(manualQuoteDraftsPath) ? fs.readFileSync(manualQuoteDraftsPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(stockConfirmationsPath, originalStockConfirmations, "utf8");
  fs.writeFileSync(compatibilityConfirmationsPath, originalCompatibilityConfirmations, "utf8");
  fs.writeFileSync(quoteEligibilitiesPath, originalQuoteEligibilities, "utf8");
  fs.writeFileSync(manualQuoteDraftsPath, originalManualQuoteDrafts, "utf8");
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
      buyerName: "Manual Quote Dashboard Buyer",
      phone: "08111111111",
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

    const createStock = await request("/api/stock-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        stockStatus: "confirmed_in_stock",
        stockQuantity: 1,
        condition: "used_original",
        supplierOrShelf: "Ladipo shelf H8",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Dashboard stock confirmation before manual quote draft."
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
        matchedPartNumber: "ALT-1ZZ-DASH-MANUAL",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Dashboard compatibility confirmation before manual quote draft."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Dashboard final eligibility before manual quote draft."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 55000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Dashboard safe manual quote draft."
      })
    });

    const page = await request("/manual-quote-draft");
    const aliasPage = await request("/manual-quote-drafts");
    const list = await request("/api/manual-quote-drafts");
    const summary = await request("/api/manual-quote-draft/summary");

    const healthOk = health.status === 200;

    const createStockOk =
      createStock.status === 201 &&
      createStock.body.confirmation &&
      createStock.body.confirmation.stockConfirmed === true;

    const createCompatibilityOk =
      createCompatibility.status === 201 &&
      createCompatibility.body.confirmation &&
      createCompatibility.body.confirmation.compatibilityConfirmed === true;

    const createEligibilityOk =
      createEligibility.status === 201 &&
      createEligibility.body.eligibility &&
      createEligibility.body.eligibility.finalQuoteGatePassed === true;

    const createDraftOk =
      createDraft.status === 201 &&
      createDraft.body.draft &&
      createDraft.body.draft.draftOnly === true &&
      createDraft.body.draft.priceIncludedInDraft === true &&
      createDraft.body.draft.priceSentToBuyer === false &&
      createDraft.body.draft.autoSendWhatsApp === false &&
      createDraft.body.draft.sentToBuyer === false &&
      createDraft.body.draft.messageDraft.includes("Manual quote draft price");

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Safe Manual Quote Draft Builder Dashboard") &&
      page.text.includes("Manual Quote Draft Records") &&
      page.text.includes("Draft-only") &&
      page.text.includes("Requires final quote eligibility") &&
      page.text.includes("Price allowed in draft after eligibility") &&
      page.text.includes("Price not sent to buyer") &&
      page.text.includes("No auto-send") &&
      page.text.includes("Manual review required") &&
      page.text.includes("draftRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Safe Manual Quote Draft Builder Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.drafts) &&
      list.body.drafts.some(item =>
        item.leadId === leadId &&
        item.draftOnly === true &&
        item.priceIncludedInDraft === true &&
        item.priceSentToBuyer === false &&
        item.autoSendWhatsApp === false &&
        item.sentToBuyer === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalManualQuoteDrafts >= 1 &&
      summary.body.summary.draftOnlyCount >= 1 &&
      summary.body.summary.eligibleDrafts >= 1 &&
      summary.body.summary.manualReviewRequired >= 1 &&
      summary.body.summary.priceIncludedInDraftCount >= 1 &&
      summary.body.summary.priceSentToBuyerCount === 0 &&
      summary.body.summary.autoCreateQuoteCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.automaticBuyerMessageCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.autoOpenBrowserCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.safety.manualQuoteDraftBuilderOnly === true &&
      summary.body.summary.safety.requiresFinalQuoteEligibility === true &&
      summary.body.summary.safety.draftOnly === true &&
      summary.body.summary.safety.priceAllowedInDraftAfterEligibility === true &&
      summary.body.summary.safety.priceSentToBuyer === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.autoOpenBrowser === false &&
      summary.body.summary.safety.sentToBuyer === false;

    const readOnlyOk =
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("automaticBuyerMessage = true") &&
      !page.text.includes("quoteCreatedAutomatically = true") &&
      !page.text.includes("autoCreateQuote = true") &&
      !page.text.includes("sentToBuyer = true") &&
      !page.text.includes("priceSentToBuyer = true") &&
      !page.text.includes("quoteAmountSentToBuyer = true") &&
      !page.text.includes("autoOpenBrowser = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/manual-quote-draft/build"');

    const verdict =
      healthOk &&
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      createDraftOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 16B Safe Manual Quote Draft Builder Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before manual quote dashboard display
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before manual quote dashboard display
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before manual quote dashboard display
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /manual-quote-draft returns safe manual quote draft dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /manual-quote-drafts alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-quote-drafts returns manual quote draft data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-quote-draft/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Safe Manual Quote Draft dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays manual quote drafts only.
- Dashboard does not send WhatsApp.
- Dashboard does not message buyer automatically.
- Dashboard does not open browser automatically.
- Dashboard does not move pipeline automatically.
- Dashboard does not mark quote as sent.
- Price is shown only inside draft after eligibility.
- Price is not sent to buyer.
- sentToBuyer remains false.
- Manual review remains required.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, and manual quote draft data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 16C — Admin Hub Link Safe Manual Quote Draft Builder
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

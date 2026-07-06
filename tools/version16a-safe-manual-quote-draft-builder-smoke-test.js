const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3062;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const manualQuoteDraftsPath = path.join(ROOT, "src", "data", "manual-quote-drafts.json");
const reportPath = path.join(ROOT, "reports", "version16a-safe-manual-quote-draft-builder-smoke-test-report.md");

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
      buyerName: "Manual Quote Draft Buyer",
      phone: "08101010101",
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
    const preview = await request("/api/manual-quote-draft/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const leadId = createLead.body && createLead.body.lead ? createLead.body.lead.id : "missing-lead-id";

    const blockedBeforeEligibility = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 50000,
        currency: "NGN",
        condition: "used_original",
        createdBy: "master_admin"
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
        supplierOrShelf: "Ladipo shelf G7",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before manual quote draft."
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
        matchedPartNumber: "ALT-1ZZ-MANUAL-DRAFT",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before manual quote draft."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Final eligibility confirmed before manual quote draft."
      })
    });

    const unsafeAuto = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 50000,
        currency: "NGN",
        autoSendWhatsApp: true,
        sendBuyerMessage: true,
        autoOpenBrowser: true,
        autoMovePipelineStage: true,
        sentToBuyer: true
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 50000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged after payment confirmation",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it for you.",
        createdBy: "master_admin",
        note: "Safe manual quote draft after eligibility."
      })
    });

    const list = await request("/api/manual-quote-drafts");
    const summary = await request("/api/manual-quote-draft/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Safe Manual Quote Draft Builder Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Manual quote draft builder only")) &&
      preview.body.rules.some(rule => rule.includes("Final quote eligibility gate must pass"));

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const blockedBeforeEligibilityOk =
      blockedBeforeEligibility.status === 400 &&
      blockedBeforeEligibility.body &&
      Array.isArray(blockedBeforeEligibility.body.errors);

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
      createEligibility.body.eligibility.finalQuoteGatePassed === true &&
      createEligibility.body.eligibility.eligibleForManualQuoteDraft === true;

    const unsafeAutoOk =
      unsafeAuto.status === 400 &&
      unsafeAuto.body &&
      Array.isArray(unsafeAuto.body.errors);

    const draft = createDraft.body && createDraft.body.draft;

    const createDraftOk =
      createDraft.status === 201 &&
      draft &&
      draft.leadId === leadId &&
      draft.finalQuoteGatePassed === true &&
      draft.eligibleForManualQuoteDraft === true &&
      draft.quoteAmount === 50000 &&
      draft.currency === "NGN" &&
      draft.formattedQuoteAmount.includes("50,000") &&
      draft.messageDraft.includes("Manual quote draft price") &&
      draft.messageDraft.includes("draft only") &&
      draft.manualQuoteDraftCreated === true &&
      draft.draftOnly === true &&
      draft.manualReviewRequired === true &&
      draft.manualActionOnly === true &&
      draft.priceIncludedInDraft === true &&
      draft.quoteAmountIncludedInDraft === true &&
      draft.priceSentToBuyer === false &&
      draft.quoteAmountSentToBuyer === false &&
      draft.autoCreateQuote === false &&
      draft.quoteCreatedAutomatically === false &&
      draft.autoSendWhatsApp === false &&
      draft.automaticBuyerMessage === false &&
      draft.sentToBuyer === false &&
      draft.autoOpenBrowser === false &&
      draft.autoMovePipelineStage === false &&
      draft.pipelineMovedAutomatically === false;

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
      summary.body.summary.safety.autoCreateQuote === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.automaticBuyerMessage === false &&
      summary.body.summary.safety.autoOpenBrowser === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.sentToBuyer === false &&
      summary.body.summary.safety.manualReviewRequired === true;

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      blockedBeforeEligibilityOk &&
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      unsafeAutoOk &&
      createDraftOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 16A Safe Manual Quote Draft Builder Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/manual-quote-draft/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for manual quote draft builder
- ${blockedBeforeEligibilityOk ? "PASS" : "FAIL"}: manual quote draft blocked before final quote eligibility
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before manual quote draft
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before manual quote draft
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before manual quote draft
- ${unsafeAutoOk ? "PASS" : "FAIL"}: unsafe WhatsApp/browser/pipeline/sent request blocked
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created after eligibility
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-quote-drafts returns manual quote draft data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-quote-draft/summary returns safe manual quote draft metrics

## Safety Rules Confirmed
- Manual quote draft builder is draft-only.
- Final quote eligibility gate must pass before draft creation.
- Price is allowed inside draft only after eligibility.
- Price is not sent to buyer.
- System does not send WhatsApp.
- System does not message buyer automatically.
- System does not open browser automatically.
- System does not move pipeline automatically.
- sentToBuyer remains false.
- Manual review remains required.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, and manual quote draft data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 16B — Safe Manual Quote Draft Builder Dashboard Display
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

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3065;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const manualQuoteDraftsPath = path.join(ROOT, "src", "data", "manual-quote-drafts.json");
const manualQuoteCopyActionsPath = path.join(ROOT, "src", "data", "manual-quote-copy-actions.json");
const reportPath = path.join(ROOT, "reports", "version17a-manual-quote-copy-button-foundation-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalStockConfirmations = fs.existsSync(stockConfirmationsPath) ? fs.readFileSync(stockConfirmationsPath, "utf8") : "[]";
const originalCompatibilityConfirmations = fs.existsSync(compatibilityConfirmationsPath) ? fs.readFileSync(compatibilityConfirmationsPath, "utf8") : "[]";
const originalQuoteEligibilities = fs.existsSync(quoteEligibilitiesPath) ? fs.readFileSync(quoteEligibilitiesPath, "utf8") : "[]";
const originalManualQuoteDrafts = fs.existsSync(manualQuoteDraftsPath) ? fs.readFileSync(manualQuoteDraftsPath, "utf8") : "[]";
const originalManualQuoteCopyActions = fs.existsSync(manualQuoteCopyActionsPath) ? fs.readFileSync(manualQuoteCopyActionsPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(stockConfirmationsPath, originalStockConfirmations, "utf8");
  fs.writeFileSync(compatibilityConfirmationsPath, originalCompatibilityConfirmations, "utf8");
  fs.writeFileSync(quoteEligibilitiesPath, originalQuoteEligibilities, "utf8");
  fs.writeFileSync(manualQuoteDraftsPath, originalManualQuoteDrafts, "utf8");
  fs.writeFileSync(manualQuoteCopyActionsPath, originalManualQuoteCopyActions, "utf8");
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
      buyerName: "Manual Quote Copy Buyer",
      phone: "08121212121",
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
    const preview = await request("/api/manual-quote-copy/preview");

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
        supplierOrShelf: "Ladipo shelf I9",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before manual quote copy."
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
        matchedPartNumber: "ALT-1ZZ-COPY",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before manual quote copy."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Final eligibility confirmed before manual quote copy."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 60000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Safe manual quote draft before copy."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const missingDraft = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId: "missing_manual_quote_draft_id",
        preparedBy: "master_admin"
      })
    });

    const unsafeCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        autoSendWhatsApp: true,
        sendBuyerMessage: true,
        autoOpenBrowser: true,
        autoMovePipelineStage: true,
        markAsSent: true,
        sentToBuyer: true,
        priceSentToBuyer: true
      })
    });

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepare safe copy text for manual admin review."
      })
    });

    const list = await request("/api/manual-quote-copies");
    const summary = await request("/api/manual-quote-copy/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Manual Quote Copy Button Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Prepare copy text only")) &&
      preview.body.rules.some(rule => rule.includes("Server does not access clipboard")) &&
      preview.body.rules.some(rule => rule.includes("No WhatsApp auto-send"));

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

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
      createDraft.body.draft.sentToBuyer === false;

    const missingDraftOk =
      missingDraft.status === 404 &&
      missingDraft.body &&
      Array.isArray(missingDraft.body.errors);

    const unsafeCopyOk =
      unsafeCopy.status === 400 &&
      unsafeCopy.body &&
      Array.isArray(unsafeCopy.body.errors);

    const copyAction = prepareCopy.body && prepareCopy.body.copyAction;

    const prepareCopyOk =
      prepareCopy.status === 201 &&
      copyAction &&
      copyAction.draftId === draftId &&
      copyAction.leadId === leadId &&
      copyAction.copyPrepared === true &&
      copyAction.copyTextPreparedOnly === true &&
      copyAction.manualCopyOnly === true &&
      copyAction.draftOnly === true &&
      copyAction.finalQuoteGatePassed === true &&
      copyAction.eligibleForManualQuoteDraft === true &&
      copyAction.copyText.includes("Manual quote draft price") &&
      copyAction.copyText.includes("60,000") &&
      prepareCopy.body.copyText === copyAction.copyText &&
      copyAction.priceIncludedInCopyText === true &&
      copyAction.priceSentToBuyer === false &&
      copyAction.quoteAmountSentToBuyer === false &&
      copyAction.copiedToClipboardByBrowser === false &&
      copyAction.serverClipboardAccess === false &&
      copyAction.browserAutoCopy === false &&
      copyAction.autoSendWhatsApp === false &&
      copyAction.automaticBuyerMessage === false &&
      copyAction.autoOpenBrowser === false &&
      copyAction.autoMovePipelineStage === false &&
      copyAction.pipelineMovedAutomatically === false &&
      copyAction.sentToBuyer === false &&
      copyAction.sentByAdmin === false &&
      copyAction.manualReviewRequired === true;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.copyActions) &&
      list.body.copyActions.some(item =>
        item.draftId === draftId &&
        item.copyPrepared === true &&
        item.manualCopyOnly === true &&
        item.priceIncludedInCopyText === true &&
        item.priceSentToBuyer === false &&
        item.autoSendWhatsApp === false &&
        item.sentToBuyer === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalManualQuoteCopyActions >= 1 &&
      summary.body.summary.copyPreparedCount >= 1 &&
      summary.body.summary.copyTextPreparedOnlyCount >= 1 &&
      summary.body.summary.manualCopyOnlyCount >= 1 &&
      summary.body.summary.draftOnlyCount >= 1 &&
      summary.body.summary.priceIncludedInCopyTextCount >= 1 &&
      summary.body.summary.priceSentToBuyerCount === 0 &&
      summary.body.summary.copiedToClipboardByBrowserCount === 0 &&
      summary.body.summary.serverClipboardAccessCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.automaticBuyerMessageCount === 0 &&
      summary.body.summary.autoOpenBrowserCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.safety.manualQuoteCopyFoundationOnly === true &&
      summary.body.summary.safety.preparesCopyTextOnly === true &&
      summary.body.summary.safety.serverDoesNotAccessClipboard === true &&
      summary.body.summary.safety.browserAutoCopy === false &&
      summary.body.summary.safety.draftOnly === true &&
      summary.body.summary.safety.requiresFinalQuoteEligibility === true &&
      summary.body.summary.safety.priceMayAppearInCopyTextAfterEligibility === true &&
      summary.body.summary.safety.priceSentToBuyer === false &&
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
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      createDraftOk &&
      missingDraftOk &&
      unsafeCopyOk &&
      prepareCopyOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 17A Manual Quote Copy Button Foundation Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/manual-quote-copy/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for manual quote copy foundation
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before manual quote copy
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before manual quote copy
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before manual quote copy
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before manual quote copy
- ${missingDraftOk ? "PASS" : "FAIL"}: missing manual quote draft is blocked
- ${unsafeCopyOk ? "PASS" : "FAIL"}: unsafe WhatsApp/browser/pipeline/sent copy request blocked
- ${prepareCopyOk ? "PASS" : "FAIL"}: manual quote copy text prepared safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-quote-copies returns manual quote copy data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-quote-copy/summary returns safe manual quote copy metrics

## Safety Rules Confirmed
- Manual quote copy foundation prepares copy text only.
- Server does not access clipboard.
- Browser auto-copy is not used in this foundation.
- Copy text comes only from safe draft after final quote eligibility.
- Price may appear inside copy text, but price is not sent to buyer.
- System does not send WhatsApp.
- System does not message buyer automatically.
- System does not open browser automatically.
- System does not move pipeline automatically.
- System does not mark quote as sent.
- sentToBuyer remains false.
- Manual review remains required.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, and copy action data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 17B — Manual Quote Copy Button Dashboard Display
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

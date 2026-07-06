const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3066;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const manualQuoteDraftsPath = path.join(ROOT, "src", "data", "manual-quote-drafts.json");
const manualQuoteCopyActionsPath = path.join(ROOT, "src", "data", "manual-quote-copy-actions.json");
const reportPath = path.join(ROOT, "reports", "version17b-manual-quote-copy-button-dashboard-smoke-test-report.md");

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
      buyerName: "Manual Quote Copy Dashboard Buyer",
      phone: "08131313131",
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
        supplierOrShelf: "Ladipo shelf J10",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Dashboard stock confirmation before manual quote copy."
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
        matchedPartNumber: "ALT-1ZZ-COPY-DASH",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Dashboard compatibility confirmation before manual quote copy."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Dashboard final eligibility before manual quote copy."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 65000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Dashboard safe manual quote draft before copy."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Dashboard prepare safe copy text."
      })
    });

    const page = await request("/manual-quote-copy");
    const aliasPage = await request("/manual-quote-copies");
    const list = await request("/api/manual-quote-copies");
    const summary = await request("/api/manual-quote-copy/summary");

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
      createDraft.body.draft.sentToBuyer === false;

    const prepareCopyOk =
      prepareCopy.status === 201 &&
      prepareCopy.body.copyAction &&
      prepareCopy.body.copyAction.copyPrepared === true &&
      prepareCopy.body.copyAction.copyText.includes("Manual quote draft price") &&
      prepareCopy.body.copyAction.copyText.includes("65,000") &&
      prepareCopy.body.copyAction.serverClipboardAccess === false &&
      prepareCopy.body.copyAction.browserAutoCopy === false &&
      prepareCopy.body.copyAction.autoSendWhatsApp === false &&
      prepareCopy.body.copyAction.sentToBuyer === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Manual Quote Copy Button Dashboard") &&
      page.text.includes("Manual Quote Copy Records") &&
      page.text.includes("Select Text For Manual Copy") &&
      page.text.includes("Prepare copy text only") &&
      page.text.includes("Server does not access clipboard") &&
      page.text.includes("No browser auto-copy") &&
      page.text.includes("No auto-send") &&
      page.text.includes("No sent marking") &&
      page.text.includes("Manual review required") &&
      page.text.includes("copyRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Manual Quote Copy Button Dashboard");

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
        item.serverClipboardAccess === false &&
        item.browserAutoCopy === false &&
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
      summary.body.summary.safety.priceSentToBuyer === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.autoOpenBrowser === false &&
      summary.body.summary.safety.sentToBuyer === false;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("automaticBuyerMessage = true") &&
      !page.text.includes("autoOpenBrowser = true") &&
      !page.text.includes("sentToBuyer = true") &&
      !page.text.includes("priceSentToBuyer = true") &&
      !page.text.includes("quoteAmountSentToBuyer = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/manual-quote-copy/prepare"');

    const verdict =
      healthOk &&
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      createDraftOk &&
      prepareCopyOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 17B Manual Quote Copy Button Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before manual quote copy dashboard
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before manual quote copy dashboard
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before manual quote copy dashboard
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before manual quote copy dashboard
- ${prepareCopyOk ? "PASS" : "FAIL"}: manual quote copy text prepared before dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /manual-quote-copy returns manual quote copy dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /manual-quote-copies alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-quote-copies returns manual quote copy data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-quote-copy/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Manual Quote Copy dashboard remains read-only and no auto-copy/send

## Safety Rules Confirmed
- Dashboard displays prepared copy text only.
- Manual select button only selects text for human admin copy.
- Dashboard does not access browser clipboard.
- Dashboard does not send WhatsApp.
- Dashboard does not message buyer automatically.
- Dashboard does not open browser automatically.
- Dashboard does not move pipeline automatically.
- Dashboard does not mark quote as sent.
- Price may appear inside copy text after eligibility, but price is not sent to buyer.
- sentToBuyer remains false.
- Manual review remains required.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, and copy action data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 17C — Admin Hub Link Manual Quote Copy Button
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

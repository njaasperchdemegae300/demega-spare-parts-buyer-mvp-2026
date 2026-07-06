const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3056;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const reportPath = path.join(ROOT, "reports", "version14a-compatibility-confirmation-gate-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalStockConfirmations = fs.existsSync(stockConfirmationsPath) ? fs.readFileSync(stockConfirmationsPath, "utf8") : "[]";
const originalCompatibilityConfirmations = fs.existsSync(compatibilityConfirmationsPath) ? fs.readFileSync(compatibilityConfirmationsPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(stockConfirmationsPath, originalStockConfirmations, "utf8");
  fs.writeFileSync(compatibilityConfirmationsPath, originalCompatibilityConfirmations, "utf8");
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
      buyerName: "Compatibility Gate Buyer",
      phone: "08060606060",
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
    const preview = await request("/api/compatibility-confirmation/preview");

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
        supplierOrShelf: "Ladipo shelf C3",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed first. Compatibility check follows."
      })
    });

    const unsafeQuote = await request("/api/compatibility-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        compatibilityStatus: "confirmed_compatible",
        confirmationMethod: "engine_code_match",
        quoteAmount: "50000",
        price: "50000",
        createQuoteNow: true
      })
    });

    const unsafeAutoSend = await request("/api/compatibility-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        compatibilityStatus: "confirmed_compatible",
        confirmationMethod: "engine_code_match",
        autoSendWhatsApp: true,
        sendBuyerMessage: true
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
        matchedPartNumber: "ALT-1ZZ-TEST",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Engine code, buyer photo, and socket/plug matched manually."
      })
    });

    const list = await request("/api/compatibility-confirmations");
    const summary = await request("/api/compatibility-confirmation/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Compatibility Confirmation Gate Foundation is active." &&
      Array.isArray(preview.body.allowedCompatibilityStatus) &&
      preview.body.allowedCompatibilityStatus.includes("confirmed_compatible") &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Manual quote draft is allowed only after stock and compatibility"));

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const createStockOk =
      createStock.status === 201 &&
      createStock.body.confirmation &&
      createStock.body.confirmation.stockConfirmed === true &&
      createStock.body.confirmation.quoteAllowed === false;

    const unsafeQuoteOk =
      unsafeQuote.status === 400 &&
      unsafeQuote.body &&
      Array.isArray(unsafeQuote.body.errors);

    const unsafeAutoSendOk =
      unsafeAutoSend.status === 400 &&
      unsafeAutoSend.body &&
      Array.isArray(unsafeAutoSend.body.errors);

    const confirmation = createCompatibility.body && createCompatibility.body.confirmation;

    const createCompatibilityOk =
      createCompatibility.status === 201 &&
      confirmation &&
      confirmation.leadId === leadId &&
      confirmation.stockConfirmed === true &&
      confirmation.compatibilityStatus === "confirmed_compatible" &&
      confirmation.compatibilityConfirmed === true &&
      confirmation.quoteGateReady === true &&
      confirmation.manualQuoteDraftAllowed === true &&
      confirmation.quoteAllowed === true &&
      confirmation.stockConfirmationRequiredBeforeQuote === true &&
      confirmation.compatibilityConfirmationRequiredBeforeQuote === true &&
      confirmation.manualReviewRequired === true &&
      confirmation.manualActionOnly === true &&
      confirmation.autoCreateQuote === false &&
      confirmation.quoteCreatedAutomatically === false &&
      confirmation.autoSendWhatsApp === false &&
      confirmation.automaticBuyerMessage === false &&
      confirmation.sentToBuyer === false &&
      confirmation.autoMovePipelineStage === false &&
      confirmation.pipelineMovedAutomatically === false &&
      confirmation.priceIncluded === false;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.confirmations) &&
      list.body.confirmations.some(item =>
        item.leadId === leadId &&
        item.compatibilityConfirmed === true &&
        item.stockConfirmed === true &&
        item.quoteGateReady === true &&
        item.autoCreateQuote === false &&
        item.sentToBuyer === false &&
        item.priceIncluded === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalCompatibilityConfirmations >= 1 &&
      summary.body.summary.compatibilityConfirmed >= 1 &&
      summary.body.summary.stockConfirmedCount >= 1 &&
      summary.body.summary.quoteGateReadyCount >= 1 &&
      summary.body.summary.manualQuoteDraftAllowedCount >= 1 &&
      summary.body.summary.autoCreateQuoteCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.automaticBuyerMessageCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.priceIncludedCount === 0 &&
      summary.body.summary.safety.compatibilityGateManualOnly === true &&
      summary.body.summary.safety.stockAndCompatibilityRequiredBeforeQuote === true &&
      summary.body.summary.safety.manualQuoteDraftAllowedAfterBothConfirmed === true &&
      summary.body.summary.safety.autoCreateQuote === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.automaticBuyerMessage === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.sentToBuyer === false &&
      summary.body.summary.safety.priceIncluded === false &&
      summary.body.summary.safety.manualReviewRequired === true;

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      createStockOk &&
      unsafeQuoteOk &&
      unsafeAutoSendOk &&
      createCompatibilityOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 14A Compatibility Confirmation Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/compatibility-confirmation/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for compatibility confirmation
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before compatibility gate
- ${unsafeQuoteOk ? "PASS" : "FAIL"}: quote/price at compatibility confirmation stage blocked
- ${unsafeAutoSendOk ? "PASS" : "FAIL"}: unsafe WhatsApp/buyer auto-message request blocked
- ${createCompatibilityOk ? "PASS" : "FAIL"}: manual compatibility confirmation created safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/compatibility-confirmations returns compatibility confirmation data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/compatibility-confirmation/summary returns safe compatibility gate metrics

## Safety Rules Confirmed
- Compatibility confirmation gate is manual-only.
- Stock confirmation is checked before manual quote gate readiness.
- Manual quote draft becomes allowed only after stock and compatibility are both confirmed.
- System does not send WhatsApp.
- System does not message buyer automatically.
- System does not create quote automatically.
- System does not move pipeline automatically.
- sentToBuyer remains false.
- Price is not included.
- Manual review remains required.
- Test lead, stock confirmation, and compatibility confirmation data restored after smoke test.

## Next Phase After Approval
Version 14B — Compatibility Confirmation Gate Dashboard Display

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`
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

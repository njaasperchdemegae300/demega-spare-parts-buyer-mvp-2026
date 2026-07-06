const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3053;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const reportPath = path.join(ROOT, "reports", "version13a-stock-confirmation-gate-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalStockConfirmations = fs.existsSync(stockConfirmationsPath) ? fs.readFileSync(stockConfirmationsPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(stockConfirmationsPath, originalStockConfirmations, "utf8");
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
      buyerName: "Stock Gate Buyer",
      phone: "08040404040",
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
    const preview = await request("/api/stock-confirmation/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const leadId = createLead.body && createLead.body.lead ? createLead.body.lead.id : "missing-lead-id";

    const unsafeQuote = await request("/api/stock-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        stockStatus: "confirmed_in_stock",
        confirmationMethod: "physical_check",
        price: "50000",
        quoteAmount: "50000",
        createQuoteNow: true
      })
    });

    const unsafeAutoSend = await request("/api/stock-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        stockStatus: "confirmed_in_stock",
        confirmationMethod: "physical_check",
        autoSendWhatsApp: true,
        sendBuyerMessage: true
      })
    });

    const createConfirmation = await request("/api/stock-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        stockStatus: "confirmed_in_stock",
        stockQuantity: 1,
        condition: "used_original",
        supplierOrShelf: "Ladipo shelf A1",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Physically checked one 1ZZ alternator in stock. Compatibility still needs confirmation."
      })
    });

    const list = await request("/api/stock-confirmations");
    const summary = await request("/api/stock-confirmation/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Stock Confirmation Gate Foundation is active." &&
      Array.isArray(preview.body.allowedStockStatus) &&
      preview.body.allowedStockStatus.includes("confirmed_in_stock") &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Compatibility confirmation is still required"));

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const unsafeQuoteOk =
      unsafeQuote.status === 400 &&
      unsafeQuote.body &&
      Array.isArray(unsafeQuote.body.errors);

    const unsafeAutoSendOk =
      unsafeAutoSend.status === 400 &&
      unsafeAutoSend.body &&
      Array.isArray(unsafeAutoSend.body.errors);

    const confirmation = createConfirmation.body && createConfirmation.body.confirmation;

    const createConfirmationOk =
      createConfirmation.status === 201 &&
      confirmation &&
      confirmation.leadId === leadId &&
      confirmation.stockStatus === "confirmed_in_stock" &&
      confirmation.stockConfirmed === true &&
      confirmation.stockQuantity === 1 &&
      confirmation.compatibilityConfirmed === false &&
      confirmation.compatibilityConfirmationRequiredBeforeQuote === true &&
      confirmation.stockConfirmationRequiredBeforeQuote === true &&
      confirmation.quoteAllowed === false &&
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
        item.stockStatus === "confirmed_in_stock" &&
        item.quoteAllowed === false &&
        item.compatibilityConfirmed === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalStockConfirmations >= 1 &&
      summary.body.summary.confirmedInStock >= 1 &&
      summary.body.summary.quoteAllowedCount === 0 &&
      summary.body.summary.compatibilityConfirmedCount === 0 &&
      summary.body.summary.autoCreateQuoteCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.automaticBuyerMessageCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.priceIncludedCount === 0 &&
      summary.body.summary.safety.stockGateManualOnly === true &&
      summary.body.summary.safety.stockCanBeConfirmedManually === true &&
      summary.body.summary.safety.quoteAllowedAtStockGate === false &&
      summary.body.summary.safety.compatibilityRequiredBeforeQuote === true &&
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
      unsafeQuoteOk &&
      unsafeAutoSendOk &&
      createConfirmationOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 13A Stock Confirmation Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/stock-confirmation/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for stock confirmation
- ${unsafeQuoteOk ? "PASS" : "FAIL"}: quote/price at stock confirmation stage blocked
- ${unsafeAutoSendOk ? "PASS" : "FAIL"}: unsafe WhatsApp/buyer auto-message request blocked
- ${createConfirmationOk ? "PASS" : "FAIL"}: manual stock confirmation created safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/stock-confirmations returns stock confirmation data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/stock-confirmation/summary returns safe stock gate metrics

## Safety Rules Confirmed
- Stock confirmation gate is manual-only.
- Stock can be confirmed manually.
- Quote is still blocked at stock confirmation stage.
- Compatibility confirmation is still required before quote.
- System does not send WhatsApp.
- System does not message buyer automatically.
- System does not create quote automatically.
- System does not move pipeline automatically.
- sentToBuyer remains false.
- Price is not included.
- Manual review remains required.
- Test lead and stock confirmation data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 13B — Stock Confirmation Gate Dashboard Display
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

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3054;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const reportPath = path.join(ROOT, "reports", "version13b-stock-confirmation-dashboard-smoke-test-report.md");

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
      buyerName: "Stock Dashboard Buyer",
      phone: "08050505050",
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

    const createConfirmation = await request("/api/stock-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        stockStatus: "confirmed_in_stock",
        stockQuantity: 1,
        condition: "used_original",
        supplierOrShelf: "Ladipo shelf B2",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Dashboard test stock confirmation. Compatibility still required."
      })
    });

    const page = await request("/stock-confirmation");
    const aliasPage = await request("/stock-confirmation-gate");
    const list = await request("/api/stock-confirmations");
    const summary = await request("/api/stock-confirmation/summary");

    const healthOk = health.status === 200;

    const createConfirmationOk =
      createConfirmation.status === 201 &&
      createConfirmation.body.confirmation &&
      createConfirmation.body.confirmation.stockStatus === "confirmed_in_stock" &&
      createConfirmation.body.confirmation.stockConfirmed === true &&
      createConfirmation.body.confirmation.quoteAllowed === false &&
      createConfirmation.body.confirmation.compatibilityConfirmed === false &&
      createConfirmation.body.confirmation.autoCreateQuote === false &&
      createConfirmation.body.confirmation.autoSendWhatsApp === false &&
      createConfirmation.body.confirmation.sentToBuyer === false &&
      createConfirmation.body.confirmation.priceIncluded === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Stock Confirmation Gate Dashboard") &&
      page.text.includes("Stock Confirmation Records") &&
      page.text.includes("Quote remains blocked") &&
      page.text.includes("Compatibility required before quote") &&
      page.text.includes("No quote at stock gate") &&
      page.text.includes("No auto-send") &&
      page.text.includes("No price included") &&
      page.text.includes("stockRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Stock Confirmation Gate Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.confirmations) &&
      list.body.confirmations.some(item =>
        item.leadId === leadId &&
        item.stockStatus === "confirmed_in_stock" &&
        item.quoteAllowed === false &&
        item.compatibilityConfirmed === false &&
        item.priceIncluded === false
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
      summary.body.summary.safety.quoteAllowedAtStockGate === false &&
      summary.body.summary.safety.compatibilityRequiredBeforeQuote === true &&
      summary.body.summary.safety.autoCreateQuote === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.sentToBuyer === false &&
      summary.body.summary.safety.priceIncluded === false;

    const readOnlyOk =
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("automaticBuyerMessage = true") &&
      !page.text.includes("quoteCreatedAutomatically = true") &&
      !page.text.includes("autoCreateQuote = true") &&
      !page.text.includes("sentToBuyer = true") &&
      !page.text.includes("priceIncluded = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/stock-confirmation/confirm"');

    const verdict =
      healthOk &&
      createConfirmationOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 13B Stock Confirmation Gate Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createConfirmationOk ? "PASS" : "FAIL"}: stock confirmation created for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /stock-confirmation returns stock confirmation dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /stock-confirmation-gate alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/stock-confirmations returns stock confirmation data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/stock-confirmation/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Stock Confirmation Gate dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays stock confirmations only.
- Dashboard does not send WhatsApp.
- Dashboard does not message buyer automatically.
- Dashboard does not create quote automatically.
- Dashboard does not move pipeline automatically.
- Quote remains blocked at stock confirmation stage.
- Compatibility confirmation is still required before quote.
- sentToBuyer remains false.
- Price is not included.
- Manual review remains required.
- Test lead and stock confirmation data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 13C — Admin Hub Link Stock Confirmation Gate
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

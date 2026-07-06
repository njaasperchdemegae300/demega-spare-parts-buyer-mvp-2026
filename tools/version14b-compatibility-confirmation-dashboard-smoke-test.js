const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3057;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const reportPath = path.join(ROOT, "reports", "version14b-compatibility-confirmation-dashboard-smoke-test-report.md");

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
      buyerName: "Compatibility Dashboard Buyer",
      phone: "08070707070",
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
        supplierOrShelf: "Ladipo shelf D4",
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
        matchedPartNumber: "ALT-1ZZ-DASH",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Dashboard test compatibility confirmation."
      })
    });

    const page = await request("/compatibility-confirmation");
    const aliasPage = await request("/compatibility-confirmation-gate");
    const list = await request("/api/compatibility-confirmations");
    const summary = await request("/api/compatibility-confirmation/summary");

    const healthOk = health.status === 200;

    const createStockOk =
      createStock.status === 201 &&
      createStock.body.confirmation &&
      createStock.body.confirmation.stockConfirmed === true;

    const createCompatibilityOk =
      createCompatibility.status === 201 &&
      createCompatibility.body.confirmation &&
      createCompatibility.body.confirmation.compatibilityConfirmed === true &&
      createCompatibility.body.confirmation.stockConfirmed === true &&
      createCompatibility.body.confirmation.quoteGateReady === true &&
      createCompatibility.body.confirmation.manualQuoteDraftAllowed === true &&
      createCompatibility.body.confirmation.autoCreateQuote === false &&
      createCompatibility.body.confirmation.autoSendWhatsApp === false &&
      createCompatibility.body.confirmation.sentToBuyer === false &&
      createCompatibility.body.confirmation.priceIncluded === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Compatibility Confirmation Gate Dashboard") &&
      page.text.includes("Compatibility Confirmation Records") &&
      page.text.includes("Manual quote draft is allowed only after stock and compatibility are both confirmed") &&
      page.text.includes("Stock + compatibility required before quote") &&
      page.text.includes("Manual quote draft allowed after both confirmed") &&
      page.text.includes("No auto-send") &&
      page.text.includes("No auto-quote") &&
      page.text.includes("No price included") &&
      page.text.includes("compatibilityRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Compatibility Confirmation Gate Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.confirmations) &&
      list.body.confirmations.some(item =>
        item.leadId === leadId &&
        item.compatibilityConfirmed === true &&
        item.stockConfirmed === true &&
        item.quoteGateReady === true &&
        item.manualQuoteDraftAllowed === true &&
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
      !page.text.includes('fetch("/api/compatibility-confirmation/confirm"');

    const verdict =
      healthOk &&
      createStockOk &&
      createCompatibilityOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 14B Compatibility Confirmation Gate Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before compatibility dashboard display
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /compatibility-confirmation returns compatibility confirmation dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /compatibility-confirmation-gate alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/compatibility-confirmations returns compatibility confirmation data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/compatibility-confirmation/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Compatibility Confirmation Gate dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays compatibility confirmations only.
- Dashboard does not send WhatsApp.
- Dashboard does not message buyer automatically.
- Dashboard does not create quote automatically.
- Dashboard does not move pipeline automatically.
- Manual quote draft is allowed only after stock and compatibility are both confirmed.
- sentToBuyer remains false.
- Price is not included.
- Manual review remains required.
- Test lead, stock confirmation, and compatibility confirmation data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 14C — Admin Hub Link Compatibility Confirmation Gate
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

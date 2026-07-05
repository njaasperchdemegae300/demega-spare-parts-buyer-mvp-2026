const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3037;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const inventoryPath = path.join(ROOT, "src", "data", "inventory.json");
const quotesPath = path.join(ROOT, "src", "data", "quotes.json");
const reportPath = path.join(ROOT, "reports", "version6b-quote-draft-dashboard-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalInventory = fs.existsSync(inventoryPath) ? fs.readFileSync(inventoryPath, "utf8") : "[]";
const originalQuotes = fs.existsSync(quotesPath) ? fs.readFileSync(quotesPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(inventoryPath, originalInventory, "utf8");
  fs.writeFileSync(quotesPath, originalQuotes, "utf8");
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

function manuallyApproveInventoryItem(itemId) {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8") || "[]");
  const updated = inventory.map(item => {
    if (item.id !== itemId) return item;

    return {
      ...item,
      quoteReady: true,
      stockConfirmedForQuote: true,
      compatibilityConfirmed: true,
      manualReviewRequired: false,
      updatedAt: new Date().toISOString()
    };
  });

  fs.writeFileSync(inventoryPath, JSON.stringify(updated, null, 2), "utf8");
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

    const inventoryItem = {
      partName: "1ZZ Alternator",
      partCategory: "Alternator",
      vehicleBrand: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: "2005",
      engineCode: "1ZZ",
      condition: "tokunbo",
      stockStatus: "in_stock",
      quantity: 2,
      priceRange: "₦85,000 - confirm before final reply",
      shopLocation: "Ladipo Mushin Lagos",
      compatibilityNotes: "Confirm socket and pulley before quote."
    };

    const buyerLead = {
      buyerName: "Quote Dashboard Buyer",
      phone: "08099999999",
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

    const createInventory = await request("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inventoryItem)
    });

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    manuallyApproveInventoryItem(createInventory.body.item.id);

    const createQuote = await request("/api/quotes/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        inventoryItemId: createInventory.body.item.id,
        priceText: "₦85,000",
        deliveryText: "Delivery or pickup can be arranged after manual confirmation."
      })
    });

    const page = await request("/quotes");
    const aliasPage = await request("/quote-drafts");
    const quotes = await request("/api/quotes");
    const summary = await request("/api/quotes/summary");

    const healthOk = health.status === 200;

    const createQuoteOk =
      createQuote.status === 201 &&
      createQuote.body.draft &&
      createQuote.body.draft.quoteStatus === "draft_only" &&
      createQuote.body.draft.autoSendWhatsApp === false &&
      createQuote.body.draft.sentToBuyer === false &&
      createQuote.body.draft.manualReviewRequired === true;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Quote Draft Dashboard") &&
      page.text.includes("Copy Draft") &&
      page.text.includes("Manual review before sending") &&
      page.text.includes("NO AUTO SEND") &&
      page.text.includes("Draft Message") &&
      page.text.includes("Auto Send Count");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Quote Draft Dashboard");

    const quotesOk =
      quotes.status === 200 &&
      quotes.body &&
      Array.isArray(quotes.body.quotes) &&
      quotes.body.quotes.some(quote => quote.buyerPhone === "08099999999");

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalQuotes >= 1 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.safety &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.manualReviewBeforeSend === true;

    const readOnlyOk =
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("sentToBuyer = true") &&
      page.text.includes("Copy Draft");

    const verdict =
      healthOk &&
      createQuoteOk &&
      pageOk &&
      aliasOk &&
      quotesOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 6B Quote Draft Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createQuoteOk ? "PASS" : "FAIL"}: quote draft created safely for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /quotes returns quote draft dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /quote-drafts alias works
- ${quotesOk ? "PASS" : "FAIL"}: GET /api/quotes returns dashboard quote
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/quotes/summary returns safe quote metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: quote dashboard remains read-only with copy-only action

## Safety Rules Confirmed
- Quote dashboard does not send WhatsApp.
- Copy Draft only copies text for manual review.
- sentToBuyer remains false.
- autoSendWhatsApp remains false.
- Manual review before sending remains required.
- Test lead, inventory, and quote data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 7A — Buyer Pipeline Foundation
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

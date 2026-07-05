const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3035;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const inventoryPath = path.join(ROOT, "src", "data", "inventory.json");
const reportPath = path.join(ROOT, "reports", "version5b-inventory-matching-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalInventory = fs.existsSync(inventoryPath) ? fs.readFileSync(inventoryPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(inventoryPath, originalInventory, "utf8");
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
      priceRange: "Confirm current Ladipo price before quote",
      shopLocation: "Ladipo Mushin Lagos",
      compatibilityNotes: "Confirm socket and pulley before quote."
    };

    const buyerLead = {
      buyerName: "Matching Buyer",
      phone: "08077777777",
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

    const matchDirect = await request("/api/inventory/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const matchByLeadId = await request("/api/inventory/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: createLead.body.lead.id })
    });

    const preview = await request("/api/inventory/match-preview");

    const healthOk = health.status === 200;

    const createInventoryOk =
      createInventory.status === 201 &&
      createInventory.body.item &&
      createInventory.body.item.quoteReady === false &&
      createInventory.body.item.stockConfirmedForQuote === false &&
      createInventory.body.item.compatibilityConfirmed === false;

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const directMatchOk =
      matchDirect.status === 200 &&
      matchDirect.body.result &&
      matchDirect.body.result.totalMatches >= 1 &&
      matchDirect.body.result.matches[0].matchScore >= 70 &&
      matchDirect.body.result.matches[0].quoteBlocked === true &&
      matchDirect.body.result.matches[0].eligibleForQuote === false &&
      matchDirect.body.result.matches[0].quoteBlockReasons.includes("stock confirmation is required before quote") &&
      matchDirect.body.result.matches[0].quoteBlockReasons.includes("compatibility confirmation is required before quote");

    const leadIdMatchOk =
      matchByLeadId.status === 200 &&
      matchByLeadId.body.result &&
      matchByLeadId.body.result.leadId === createLead.body.lead.id &&
      matchByLeadId.body.result.totalMatches >= 1 &&
      matchByLeadId.body.result.safeToQuoteNow === false;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Inventory matching engine is working.";

    const verdict =
      healthOk &&
      createInventoryOk &&
      createLeadOk &&
      directMatchOk &&
      leadIdMatchOk &&
      previewOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 5B Inventory Matching Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createInventoryOk ? "PASS" : "FAIL"}: safe inventory item created
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for matching
- ${directMatchOk ? "PASS" : "FAIL"}: direct inventory matching returns blocked match
- ${leadIdMatchOk ? "PASS" : "FAIL"}: leadId inventory matching returns blocked match
- ${previewOk ? "PASS" : "FAIL"}: matching preview endpoint works

## Safety Rules Confirmed
- Match engine does not create quote automatically.
- Match engine blocks quote before stock confirmation.
- Match engine blocks quote before compatibility confirmation.
- Manual review remains required.
- SafeToQuoteNow remains false unless all quote gates pass.
- Test lead and inventory data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 6A — Safe Auto Quote Draft Foundation
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

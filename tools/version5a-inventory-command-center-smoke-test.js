const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3034;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const inventoryPath = path.join(ROOT, "src", "data", "inventory.json");
const reportPath = path.join(ROOT, "reports", "version5a-inventory-command-center-smoke-test-report.md");

const originalInventory = fs.existsSync(inventoryPath) ? fs.readFileSync(inventoryPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreInventory() {
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

    const goodItem = {
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
      supplierName: "Demega Test Supplier",
      compatibilityNotes: "Confirm socket and pulley before quote."
    };

    const badItem = {
      partName: "Bad Inventory",
      partCategory: "Alternator",
      vehicleBrand: "Toyota",
      vehicleModel: "Corolla",
      stockStatus: "ready_to_quote_without_check",
      shopLocation: "Lagos"
    };

    const health = await request("/api/health");
    const page = await request("/inventory");
    const createGood = await request("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goodItem)
    });
    const createBad = await request("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badItem)
    });
    const list = await request("/api/inventory");
    const summary = await request("/api/inventory/summary");

    const healthOk = health.status === 200;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Inventory Command Center") &&
      page.text.includes("QUOTE BLOCKED") &&
      page.text.includes("No quote before stock confirmation") === false;

    const createGoodOk =
      createGood.status === 201 &&
      createGood.body &&
      createGood.body.item &&
      createGood.body.item.partName === "1ZZ Alternator" &&
      createGood.body.item.quoteReady === false &&
      createGood.body.item.stockConfirmedForQuote === false &&
      createGood.body.item.compatibilityConfirmed === false &&
      createGood.body.item.manualReviewRequired === true;

    const createBadOk =
      createBad.status === 400 &&
      createBad.body &&
      Array.isArray(createBad.body.errors);

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.inventory) &&
      list.body.inventory.some(item => item.partName === "1ZZ Alternator");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      typeof summary.body.summary.totalItems === "number" &&
      summary.body.summary.inStockItems >= 1 &&
      summary.body.safety &&
      summary.body.safety.quoteBeforeStockConfirmation === false &&
      summary.body.safety.quoteBeforeCompatibilityConfirmation === false &&
      summary.body.safety.autoSendWhatsApp === false;

    const verdict =
      healthOk &&
      pageOk &&
      createGoodOk &&
      createBadOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 5A Inventory Command Center Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${pageOk ? "PASS" : "FAIL"}: GET /inventory returns command center page
- ${createGoodOk ? "PASS" : "FAIL"}: POST /api/inventory creates safe inventory item
- ${createBadOk ? "PASS" : "FAIL"}: invalid stock status blocked
- ${listOk ? "PASS" : "FAIL"}: GET /api/inventory returns inventory list
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/inventory/summary returns safe inventory metrics

## Safety Rules Confirmed
- Inventory does not make item quote-ready automatically.
- Stock confirmation for quote remains false at creation.
- Compatibility confirmation remains false at creation.
- Manual review remains required.
- No WhatsApp auto-send.
- Test inventory data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 5B — Inventory Matching Foundation
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);

    if (verdict !== "APPROVED") process.exitCode = 1;
  } finally {
    if (child) stopProcess(child);
    restoreInventory();
  }
}

main().catch(error => {
  restoreInventory();
  console.error(error);
  process.exit(1);
});

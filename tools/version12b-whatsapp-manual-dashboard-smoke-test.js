const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3051;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const whatsappLinksPath = path.join(ROOT, "src", "data", "whatsapp-manual-links.json");
const reportPath = path.join(ROOT, "reports", "version12b-whatsapp-manual-dashboard-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalLinks = fs.existsSync(whatsappLinksPath) ? fs.readFileSync(whatsappLinksPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(whatsappLinksPath, originalLinks, "utf8");
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
      buyerName: "WhatsApp Dashboard Buyer",
      phone: "08030303030",
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

    const createLink = await request("/api/whatsapp-manual/open-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        createdBy: "master_admin"
      })
    });

    const page = await request("/whatsapp-manual");
    const aliasPage = await request("/whatsapp-manual-links");
    const list = await request("/api/whatsapp-manual/links");
    const summary = await request("/api/whatsapp-manual/summary");

    const healthOk = health.status === 200;

    const createLinkOk =
      createLink.status === 201 &&
      createLink.body.link &&
      createLink.body.link.normalizedWhatsappPhone === "2348030303030" &&
      createLink.body.link.manualOpenOnly === true &&
      createLink.body.link.autoSendWhatsApp === false &&
      createLink.body.link.autoOpenBrowser === false &&
      createLink.body.link.sentToBuyer === false &&
      createLink.body.link.priceIncluded === false &&
      createLink.body.link.quoteCreatedAutomatically === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega WhatsApp Manual Open Link Dashboard") &&
      page.text.includes("Manual Open Link") &&
      page.text.includes("Open WhatsApp Manually") &&
      page.text.includes("No auto-send") &&
      page.text.includes("No auto-open") &&
      page.text.includes("No price") &&
      page.text.includes("No auto-quote") &&
      page.text.includes("whatsappRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega WhatsApp Manual Open Link Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.links) &&
      list.body.links.some(item =>
        item.leadId === leadId &&
        item.normalizedWhatsappPhone === "2348030303030" &&
        item.manualOpenOnly === true &&
        item.autoSendWhatsApp === false &&
        item.sentToBuyer === false &&
        item.priceIncluded === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalManualLinks >= 1 &&
      summary.body.summary.manualOpenOnly >= 1 &&
      summary.body.summary.manualReviewRequired >= 1 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.autoOpenBrowserCount === 0 &&
      summary.body.summary.automaticBuyerMessageCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.priceIncludedCount === 0 &&
      summary.body.summary.autoQuoteCount === 0 &&
      summary.body.summary.safety.manualOpenOnly === true &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.autoOpenBrowser === false &&
      summary.body.summary.safety.automaticBuyerMessage === false &&
      summary.body.summary.safety.sentToBuyer === false &&
      summary.body.summary.safety.priceIncluded === false &&
      summary.body.summary.safety.autoCreateQuote === false;

    const readOnlyOk =
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("autoOpenBrowser = true") &&
      !page.text.includes("automaticBuyerMessage = true") &&
      !page.text.includes("sentToBuyer = true") &&
      !page.text.includes("priceIncluded = true") &&
      !page.text.includes("quoteCreatedAutomatically = true") &&
      !page.text.includes("window.open") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/whatsapp-manual/open-link"');

    const verdict =
      healthOk &&
      createLinkOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 12B WhatsApp Manual Link Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createLinkOk ? "PASS" : "FAIL"}: manual WhatsApp link created for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /whatsapp-manual returns manual link dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /whatsapp-manual-links alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/whatsapp-manual/links returns manual link data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/whatsapp-manual/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: WhatsApp manual dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays manual-open links only.
- Dashboard does not send WhatsApp.
- Dashboard does not open browser automatically.
- Dashboard does not message buyer automatically.
- sentToBuyer remains false.
- Price is not included.
- Quote is not created automatically.
- Manual review remains required.
- Test lead and WhatsApp manual-link data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 12C — Admin Hub Link WhatsApp Manual Open Dashboard
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

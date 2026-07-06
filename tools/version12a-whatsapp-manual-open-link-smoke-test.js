const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3050;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const whatsappLinksPath = path.join(ROOT, "src", "data", "whatsapp-manual-links.json");
const reportPath = path.join(ROOT, "reports", "version12a-whatsapp-manual-open-link-smoke-test-report.md");

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
      buyerName: "WhatsApp Manual Buyer",
      phone: "08020202020",
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
    const preview = await request("/api/whatsapp-manual/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const leadId = createLead.body && createLead.body.lead ? createLead.body.lead.id : "missing-lead-id";

    const unsafeAutoSend = await request("/api/whatsapp-manual/open-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        autoSendWhatsApp: true,
        sendNow: true
      })
    });

    const unsafePrice = await request("/api/whatsapp-manual/open-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        price: "50000",
        quoteAmount: "50000"
      })
    });

    const createManualLink = await request("/api/whatsapp-manual/open-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        createdBy: "master_admin"
      })
    });

    const list = await request("/api/whatsapp-manual/links");
    const summary = await request("/api/whatsapp-manual/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "WhatsApp Manual Open Link Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Manual open link only"));

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const unsafeAutoSendOk =
      unsafeAutoSend.status === 400 &&
      unsafeAutoSend.body &&
      Array.isArray(unsafeAutoSend.body.errors);

    const unsafePriceOk =
      unsafePrice.status === 400 &&
      unsafePrice.body &&
      Array.isArray(unsafePrice.body.errors);

    const link = createManualLink.body && createManualLink.body.link;

    const createManualLinkOk =
      createManualLink.status === 201 &&
      link &&
      link.leadId === leadId &&
      link.normalizedWhatsappPhone === "2348020202020" &&
      link.whatsappUrl.includes("https://wa.me/2348020202020?text=") &&
      link.message.includes("verify stock and compatibility before price") &&
      link.message.includes("No quote will be given") &&
      link.manualOpenOnly === true &&
      link.manualReviewRequired === true &&
      link.autoSendWhatsApp === false &&
      link.autoOpenBrowser === false &&
      link.automaticBuyerMessage === false &&
      link.sentToBuyer === false &&
      link.priceIncluded === false &&
      link.quoteCreatedAutomatically === false &&
      link.stockConfirmationRequiredBeforeQuote === true &&
      link.compatibilityConfirmationRequiredBeforeQuote === true;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.links) &&
      list.body.links.some(item =>
        item.leadId === leadId &&
        item.manualOpenOnly === true &&
        item.autoSendWhatsApp === false
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
      summary.body.summary.safety.autoCreateQuote === false &&
      summary.body.summary.safety.quoteBeforeStockConfirmation === false &&
      summary.body.summary.safety.quoteBeforeCompatibilityConfirmation === false;

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      unsafeAutoSendOk &&
      unsafePriceOk &&
      createManualLinkOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 12A WhatsApp Manual Open Link Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/whatsapp-manual/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for manual WhatsApp link
- ${unsafeAutoSendOk ? "PASS" : "FAIL"}: unsafe auto-send/open request blocked
- ${unsafePriceOk ? "PASS" : "FAIL"}: price/quote before stock and compatibility confirmation blocked
- ${createManualLinkOk ? "PASS" : "FAIL"}: manual WhatsApp open link prepared safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/whatsapp-manual/links returns manual link data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/whatsapp-manual/summary returns safe manual-link metrics

## Safety Rules Confirmed
- WhatsApp link is manual-open only.
- System does not send WhatsApp.
- System does not open browser automatically.
- System does not message buyer automatically.
- sentToBuyer remains false.
- Price is not included.
- Quote is not created automatically.
- Quote remains blocked before stock confirmation.
- Quote remains blocked before compatibility confirmation.
- Test lead and WhatsApp manual-link data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 12B — WhatsApp Manual Open Link Dashboard Display
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

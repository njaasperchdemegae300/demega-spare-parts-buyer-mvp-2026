const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3069;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const manualQuoteDraftsPath = path.join(ROOT, "src", "data", "manual-quote-drafts.json");
const manualQuoteCopyActionsPath = path.join(ROOT, "src", "data", "manual-quote-copy-actions.json");
const sentConfirmationsPath = path.join(ROOT, "src", "data", "manual-quote-sent-confirmations.json");
const reportPath = path.join(ROOT, "reports", "version18b-manual-quote-sent-confirmation-dashboard-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalStockConfirmations = fs.existsSync(stockConfirmationsPath) ? fs.readFileSync(stockConfirmationsPath, "utf8") : "[]";
const originalCompatibilityConfirmations = fs.existsSync(compatibilityConfirmationsPath) ? fs.readFileSync(compatibilityConfirmationsPath, "utf8") : "[]";
const originalQuoteEligibilities = fs.existsSync(quoteEligibilitiesPath) ? fs.readFileSync(quoteEligibilitiesPath, "utf8") : "[]";
const originalManualQuoteDrafts = fs.existsSync(manualQuoteDraftsPath) ? fs.readFileSync(manualQuoteDraftsPath, "utf8") : "[]";
const originalManualQuoteCopyActions = fs.existsSync(manualQuoteCopyActionsPath) ? fs.readFileSync(manualQuoteCopyActionsPath, "utf8") : "[]";
const originalSentConfirmations = fs.existsSync(sentConfirmationsPath) ? fs.readFileSync(sentConfirmationsPath, "utf8") : "[]";

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
  fs.writeFileSync(sentConfirmationsPath, originalSentConfirmations, "utf8");
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
      buyerName: "Manual Sent Dashboard Buyer",
      phone: "08151515151",
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
        supplierOrShelf: "Ladipo shelf L12",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Dashboard stock confirmation before sent dashboard."
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
        matchedPartNumber: "ALT-1ZZ-SENT-DASH",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Dashboard compatibility confirmation before sent dashboard."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Dashboard eligibility before sent dashboard."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 75000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Dashboard draft before sent confirmation."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Dashboard prepared copy before sent confirmation."
      })
    });

    const copyActionId = prepareCopy.body && prepareCopy.body.copyAction ? prepareCopy.body.copyAction.id : "missing-copy-action-id";

    const confirmSent = await request("/api/manual-quote-sent-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        copyActionId,
        adminManualSentConfirmed: true,
        manualReviewCompleted: true,
        sentChannel: "whatsapp_manual",
        confirmedBy: "master_admin",
        note: "Admin manually sent copied quote through WhatsApp after review."
      })
    });

    const page = await request("/manual-quote-sent-confirmation");
    const aliasPage = await request("/manual-quote-sent-confirmations");
    const list = await request("/api/manual-quote-sent-confirmations");
    const summary = await request("/api/manual-quote-sent-confirmation/summary");

    const healthOk = health.status === 200;
    const createStockOk = createStock.status === 201 && createStock.body.confirmation && createStock.body.confirmation.stockConfirmed === true;
    const createCompatibilityOk = createCompatibility.status === 201 && createCompatibility.body.confirmation && createCompatibility.body.confirmation.compatibilityConfirmed === true;
    const createEligibilityOk = createEligibility.status === 201 && createEligibility.body.eligibility && createEligibility.body.eligibility.finalQuoteGatePassed === true;
    const createDraftOk = createDraft.status === 201 && createDraft.body.draft && createDraft.body.draft.draftOnly === true && createDraft.body.draft.sentToBuyer === false;
    const prepareCopyOk = prepareCopy.status === 201 && prepareCopy.body.copyAction && prepareCopy.body.copyAction.copyPrepared === true && prepareCopy.body.copyAction.sentToBuyer === false;

    const confirmSentOk =
      confirmSent.status === 201 &&
      confirmSent.body.confirmation &&
      confirmSent.body.confirmation.copyActionId === copyActionId &&
      confirmSent.body.confirmation.adminManualSentConfirmed === true &&
      confirmSent.body.confirmation.manualReviewCompleted === true &&
      confirmSent.body.confirmation.sentChannel === "whatsapp_manual" &&
      confirmSent.body.confirmation.systemSentToBuyer === false &&
      confirmSent.body.confirmation.autoSendWhatsApp === false &&
      confirmSent.body.confirmation.serverClipboardAccess === false &&
      confirmSent.body.confirmation.browserAutoCopy === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Manual Quote Sent Confirmation Dashboard") &&
      page.text.includes("Manual Quote Sent Confirmation Records") &&
      page.text.includes("Confirmation record only") &&
      page.text.includes("Prepared copy action required") &&
      page.text.includes("Admin manual sent confirmation required") &&
      page.text.includes("Manual review completed required") &&
      page.text.includes("System does not send WhatsApp") &&
      page.text.includes("No clipboard access") &&
      page.text.includes("No auto-copy") &&
      page.text.includes("No pipeline auto-move") &&
      page.text.includes("confirmationRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Manual Quote Sent Confirmation Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.confirmations) &&
      list.body.confirmations.some(item =>
        item.copyActionId === copyActionId &&
        item.adminManualSentConfirmed === true &&
        item.manualReviewCompleted === true &&
        item.sentChannel === "whatsapp_manual" &&
        item.systemSentToBuyer === false &&
        item.autoSendWhatsApp === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalManualQuoteSentConfirmations >= 1 &&
      summary.body.summary.adminManualSentConfirmedCount >= 1 &&
      summary.body.summary.manualReviewCompletedCount >= 1 &&
      summary.body.summary.whatsappManualCount >= 1 &&
      summary.body.summary.systemSentToBuyerCount === 0 &&
      summary.body.summary.quoteMarkedSentBySystemCount === 0 &&
      summary.body.summary.priceSentBySystemCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.automaticBuyerMessageCount === 0 &&
      summary.body.summary.autoOpenBrowserCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.serverClipboardAccessCount === 0 &&
      summary.body.summary.browserAutoCopyCount === 0 &&
      summary.body.summary.safety.manualQuoteSentConfirmationOnly === true &&
      summary.body.summary.safety.requiresPreparedCopyAction === true &&
      summary.body.summary.safety.requiresManualAdminConfirmation === true &&
      summary.body.summary.safety.requiresManualReviewCompleted === true &&
      summary.body.summary.safety.systemDoesNotSendMessage === true &&
      summary.body.summary.safety.systemSentToBuyer === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.serverClipboardAccess === false &&
      summary.body.summary.safety.browserAutoCopy === false;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("automaticBuyerMessage = true") &&
      !page.text.includes("autoOpenBrowser = true") &&
      !page.text.includes("systemSentToBuyer = true") &&
      !page.text.includes("quoteMarkedSentBySystem = true") &&
      !page.text.includes("priceSentBySystem = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/manual-quote-sent-confirmation/confirm"');

    const verdict =
      healthOk &&
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      createDraftOk &&
      prepareCopyOk &&
      confirmSentOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 18B Manual Quote Sent Confirmation Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before sent confirmation dashboard
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before sent confirmation dashboard
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before sent confirmation dashboard
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before sent confirmation dashboard
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before sent confirmation dashboard
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation recorded before dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /manual-quote-sent-confirmation returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /manual-quote-sent-confirmations alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-quote-sent-confirmations returns sent confirmation data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-quote-sent-confirmation/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Manual Quote Sent Confirmation dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays manual sent confirmation records only.
- Dashboard does not send WhatsApp.
- Dashboard does not message buyer automatically.
- Dashboard does not open browser automatically.
- Dashboard does not access clipboard.
- Dashboard does not auto-copy.
- Dashboard does not move pipeline automatically.
- Dashboard does not mark quote as sent by system.
- Dashboard confirms admin manual sent action only.
- Price may exist in manually sent copy text, but price is not sent by the system.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, and sent confirmation data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 18C — Admin Hub Link Manual Quote Sent Confirmation Gate
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

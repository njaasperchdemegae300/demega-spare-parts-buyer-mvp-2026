const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3068;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const manualQuoteDraftsPath = path.join(ROOT, "src", "data", "manual-quote-drafts.json");
const manualQuoteCopyActionsPath = path.join(ROOT, "src", "data", "manual-quote-copy-actions.json");
const sentConfirmationsPath = path.join(ROOT, "src", "data", "manual-quote-sent-confirmations.json");
const reportPath = path.join(ROOT, "reports", "version18a-manual-quote-sent-confirmation-gate-smoke-test-report.md");

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
      buyerName: "Manual Sent Confirmation Buyer",
      phone: "08141414141",
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
    const preview = await request("/api/manual-quote-sent-confirmation/preview");

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
        supplierOrShelf: "Ladipo shelf K11",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before manual sent confirmation."
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
        matchedPartNumber: "ALT-1ZZ-SENT",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before manual sent confirmation."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before manual sent confirmation."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 70000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before manual sent confirmation."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before manual sent confirmation."
      })
    });

    const copyActionId = prepareCopy.body && prepareCopy.body.copyAction ? prepareCopy.body.copyAction.id : "missing-copy-action-id";

    const missingCopyAction = await request("/api/manual-quote-sent-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        copyActionId: "missing_copy_action_id",
        adminManualSentConfirmed: true,
        manualReviewCompleted: true,
        sentChannel: "whatsapp_manual",
        confirmedBy: "master_admin"
      })
    });

    const noManualConfirmation = await request("/api/manual-quote-sent-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        copyActionId,
        manualReviewCompleted: true,
        sentChannel: "whatsapp_manual",
        confirmedBy: "master_admin"
      })
    });

    const unsafeAuto = await request("/api/manual-quote-sent-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        copyActionId,
        adminManualSentConfirmed: true,
        manualReviewCompleted: true,
        sentChannel: "whatsapp_manual",
        autoSendWhatsApp: true,
        sendBuyerMessage: true,
        autoOpenBrowser: true,
        autoMovePipelineStage: true,
        systemSentToBuyer: true,
        priceSentBySystem: true,
        browserAutoCopy: true
      })
    });

    const invalidChannel = await request("/api/manual-quote-sent-confirmation/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        copyActionId,
        adminManualSentConfirmed: true,
        manualReviewCompleted: true,
        sentChannel: "auto_whatsapp",
        confirmedBy: "master_admin"
      })
    });

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

    const list = await request("/api/manual-quote-sent-confirmations");
    const summary = await request("/api/manual-quote-sent-confirmation/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Manual Quote Sent Confirmation Gate Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Confirmation record only")) &&
      preview.body.rules.some(rule => rule.includes("System does not send WhatsApp")) &&
      Array.isArray(preview.body.allowedManualChannels) &&
      preview.body.allowedManualChannels.includes("whatsapp_manual");

    const createLeadOk = createLead.status === 201 && createLead.body.lead && createLead.body.lead.manualReviewRequired === true;
    const createStockOk = createStock.status === 201 && createStock.body.confirmation && createStock.body.confirmation.stockConfirmed === true;
    const createCompatibilityOk = createCompatibility.status === 201 && createCompatibility.body.confirmation && createCompatibility.body.confirmation.compatibilityConfirmed === true;
    const createEligibilityOk = createEligibility.status === 201 && createEligibility.body.eligibility && createEligibility.body.eligibility.finalQuoteGatePassed === true;
    const createDraftOk = createDraft.status === 201 && createDraft.body.draft && createDraft.body.draft.draftOnly === true && createDraft.body.draft.sentToBuyer === false;
    const prepareCopyOk = prepareCopy.status === 201 && prepareCopy.body.copyAction && prepareCopy.body.copyAction.copyPrepared === true && prepareCopy.body.copyAction.manualCopyOnly === true && prepareCopy.body.copyAction.autoSendWhatsApp === false && prepareCopy.body.copyAction.sentToBuyer === false;

    const missingCopyActionOk = missingCopyAction.status === 404 && missingCopyAction.body && Array.isArray(missingCopyAction.body.errors);
    const noManualConfirmationOk = noManualConfirmation.status === 400 && noManualConfirmation.body && Array.isArray(noManualConfirmation.body.errors);
    const unsafeAutoOk = unsafeAuto.status === 400 && unsafeAuto.body && Array.isArray(unsafeAuto.body.errors);
    const invalidChannelOk = invalidChannel.status === 400 && invalidChannel.body && Array.isArray(invalidChannel.body.errors);

    const confirmation = confirmSent.body && confirmSent.body.confirmation;

    const confirmSentOk =
      confirmSent.status === 201 &&
      confirmation &&
      confirmation.copyActionId === copyActionId &&
      confirmation.leadId === leadId &&
      confirmation.manualQuoteSentConfirmationOnly === true &&
      confirmation.adminManualSentConfirmed === true &&
      confirmation.manualSentConfirmed === true &&
      confirmation.manualReviewCompleted === true &&
      confirmation.buyerMessageManuallySentByAdmin === true &&
      confirmation.sentChannel === "whatsapp_manual" &&
      confirmation.priceIncludedInManualMessage === true &&
      confirmation.systemSentToBuyer === false &&
      confirmation.sentToBuyerBySystem === false &&
      confirmation.quoteMarkedSentBySystem === false &&
      confirmation.priceSentBySystem === false &&
      confirmation.autoSendWhatsApp === false &&
      confirmation.automaticBuyerMessage === false &&
      confirmation.autoOpenBrowser === false &&
      confirmation.autoMovePipelineStage === false &&
      confirmation.pipelineMovedAutomatically === false &&
      confirmation.serverClipboardAccess === false &&
      confirmation.browserAutoCopy === false &&
      confirmation.copiedToClipboardByBrowser === false &&
      confirmation.manualReviewRequiredForNextStep === true;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.confirmations) &&
      list.body.confirmations.some(item =>
        item.copyActionId === copyActionId &&
        item.adminManualSentConfirmed === true &&
        item.systemSentToBuyer === false &&
        item.autoSendWhatsApp === false &&
        item.sentChannel === "whatsapp_manual"
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalManualQuoteSentConfirmations >= 1 &&
      summary.body.summary.adminManualSentConfirmedCount >= 1 &&
      summary.body.summary.manualReviewCompletedCount >= 1 &&
      summary.body.summary.whatsappManualCount >= 1 &&
      summary.body.summary.manualCopyOnlyCount >= 1 &&
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
      summary.body.summary.safety.quoteMarkedSentBySystem === false &&
      summary.body.summary.safety.priceSentBySystem === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.automaticBuyerMessage === false &&
      summary.body.summary.safety.autoOpenBrowser === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.serverClipboardAccess === false &&
      summary.body.summary.safety.browserAutoCopy === false &&
      summary.body.summary.safety.manualReviewRequiredForNextStep === true;

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      createDraftOk &&
      prepareCopyOk &&
      missingCopyActionOk &&
      noManualConfirmationOk &&
      unsafeAutoOk &&
      invalidChannelOk &&
      confirmSentOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 18A Manual Quote Sent Confirmation Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/manual-quote-sent-confirmation/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for manual sent confirmation gate
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before manual sent confirmation
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before manual sent confirmation
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before manual sent confirmation
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before manual sent confirmation
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy action prepared before manual sent confirmation
- ${missingCopyActionOk ? "PASS" : "FAIL"}: missing copy action is blocked
- ${noManualConfirmationOk ? "PASS" : "FAIL"}: confirmation without admin manual sent flag is blocked
- ${unsafeAutoOk ? "PASS" : "FAIL"}: unsafe auto-send/browser/clipboard/pipeline request is blocked
- ${invalidChannelOk ? "PASS" : "FAIL"}: invalid sent channel is blocked
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation recorded safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-quote-sent-confirmations returns sent confirmation data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-quote-sent-confirmation/summary returns safe sent confirmation metrics

## Safety Rules Confirmed
- Manual Quote Sent Confirmation Gate records confirmation only.
- Prepared manual quote copy action is required.
- Admin manual sent confirmation is required.
- Manual review completed is required.
- System does not send WhatsApp.
- System does not message buyer automatically.
- System does not open browser automatically.
- System does not access clipboard.
- System does not auto-copy.
- System does not move pipeline automatically.
- System does not mark quote as sent by system.
- Price may exist in the manually sent copy text, but price is not sent by the system.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, and sent confirmation data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 18B — Manual Quote Sent Confirmation Dashboard Display
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

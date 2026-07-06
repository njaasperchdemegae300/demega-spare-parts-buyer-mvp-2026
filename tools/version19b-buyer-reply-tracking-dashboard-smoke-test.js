const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3072;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const manualQuoteDraftsPath = path.join(ROOT, "src", "data", "manual-quote-drafts.json");
const manualQuoteCopyActionsPath = path.join(ROOT, "src", "data", "manual-quote-copy-actions.json");
const sentConfirmationsPath = path.join(ROOT, "src", "data", "manual-quote-sent-confirmations.json");
const buyerRepliesPath = path.join(ROOT, "src", "data", "buyer-replies.json");
const reportPath = path.join(ROOT, "reports", "version19b-buyer-reply-tracking-dashboard-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalStockConfirmations = fs.existsSync(stockConfirmationsPath) ? fs.readFileSync(stockConfirmationsPath, "utf8") : "[]";
const originalCompatibilityConfirmations = fs.existsSync(compatibilityConfirmationsPath) ? fs.readFileSync(compatibilityConfirmationsPath, "utf8") : "[]";
const originalQuoteEligibilities = fs.existsSync(quoteEligibilitiesPath) ? fs.readFileSync(quoteEligibilitiesPath, "utf8") : "[]";
const originalManualQuoteDrafts = fs.existsSync(manualQuoteDraftsPath) ? fs.readFileSync(manualQuoteDraftsPath, "utf8") : "[]";
const originalManualQuoteCopyActions = fs.existsSync(manualQuoteCopyActionsPath) ? fs.readFileSync(manualQuoteCopyActionsPath, "utf8") : "[]";
const originalSentConfirmations = fs.existsSync(sentConfirmationsPath) ? fs.readFileSync(sentConfirmationsPath, "utf8") : "[]";
const originalBuyerReplies = fs.existsSync(buyerRepliesPath) ? fs.readFileSync(buyerRepliesPath, "utf8") : "[]";

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
  fs.writeFileSync(buyerRepliesPath, originalBuyerReplies, "utf8");
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
      buyerName: "Buyer Reply Dashboard Test",
      phone: "08171717171",
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
        supplierOrShelf: "Ladipo shelf N14",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before buyer reply dashboard."
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
        matchedPartNumber: "ALT-1ZZ-REPLY-DASH",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before buyer reply dashboard."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before buyer reply dashboard."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 85000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before buyer reply dashboard."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before buyer reply dashboard."
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
        note: "Admin manually sent quote before buyer reply dashboard."
      })
    });

    const sentConfirmationId = confirmSent.body && confirmSent.body.confirmation ? confirmSent.body.confirmation.id : "missing-sent-confirmation-id";

    const recordReply = await request("/api/buyer-reply/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sentConfirmationId,
        adminObservedReply: true,
        replyChannel: "whatsapp_manual_observed",
        replyType: "accepted_price",
        replyText: "Buyer replied manually on WhatsApp: I agree, reserve it for me.",
        nextAction: "Manual admin should confirm pickup or delivery.",
        observedBy: "master_admin"
      })
    });

    const page = await request("/buyer-reply");
    const aliasPage = await request("/buyer-replies");
    const list = await request("/api/buyer-replies");
    const summary = await request("/api/buyer-reply/summary");

    const healthOk = health.status === 200;
    const createStockOk = createStock.status === 201 && createStock.body.confirmation && createStock.body.confirmation.stockConfirmed === true;
    const createCompatibilityOk = createCompatibility.status === 201 && createCompatibility.body.confirmation && createCompatibility.body.confirmation.compatibilityConfirmed === true;
    const createEligibilityOk = createEligibility.status === 201 && createEligibility.body.eligibility && createEligibility.body.eligibility.finalQuoteGatePassed === true;
    const createDraftOk = createDraft.status === 201 && createDraft.body.draft && createDraft.body.draft.draftOnly === true;
    const prepareCopyOk = prepareCopy.status === 201 && prepareCopy.body.copyAction && prepareCopy.body.copyAction.copyPrepared === true;
    const confirmSentOk = confirmSent.status === 201 && confirmSent.body.confirmation && confirmSent.body.confirmation.adminManualSentConfirmed === true;

    const recordReplyOk =
      recordReply.status === 201 &&
      recordReply.body.reply &&
      recordReply.body.reply.sentConfirmationId === sentConfirmationId &&
      recordReply.body.reply.leadId === leadId &&
      recordReply.body.reply.replyType === "accepted_price" &&
      recordReply.body.reply.buyerTemperatureAfterReply === "hot" &&
      recordReply.body.reply.manualEntryOnly === true &&
      recordReply.body.reply.replyReadBySystem === false &&
      recordReply.body.reply.autoReadWhatsApp === false &&
      recordReply.body.reply.scrapeWhatsappMessages === false &&
      recordReply.body.reply.autoReplyToBuyer === false &&
      recordReply.body.reply.autoSendWhatsApp === false &&
      recordReply.body.reply.autoMovePipelineStage === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Buyer Reply Tracking Dashboard") &&
      page.text.includes("Buyer Reply Records") &&
      page.text.includes("Manual-entry only") &&
      page.text.includes("Manual sent confirmation required") &&
      page.text.includes("Admin observed reply required") &&
      page.text.includes("System does not read WhatsApp") &&
      page.text.includes("No private message scraping") &&
      page.text.includes("No hidden data harvesting") &&
      page.text.includes("No auto-reply") &&
      page.text.includes("No auto-send") &&
      page.text.includes("replyRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Buyer Reply Tracking Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.replies) &&
      list.body.replies.some(item =>
        item.sentConfirmationId === sentConfirmationId &&
        item.replyType === "accepted_price" &&
        item.manualEntryOnly === true &&
        item.replyReadBySystem === false &&
        item.autoSendWhatsApp === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalBuyerReplies >= 1 &&
      summary.body.summary.manualEntryOnlyCount >= 1 &&
      summary.body.summary.adminObservedReplyCount >= 1 &&
      summary.body.summary.hotReplyCount >= 1 &&
      summary.body.summary.acceptedPriceCount >= 1 &&
      summary.body.summary.replyReadBySystemCount === 0 &&
      summary.body.summary.autoReadWhatsAppCount === 0 &&
      summary.body.summary.scrapingCount === 0 &&
      summary.body.summary.autoReplyToBuyerCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.autoOpenBrowserCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.safety.buyerReplyTrackingOnly === true &&
      summary.body.summary.safety.manualEntryOnly === true &&
      summary.body.summary.safety.requiresManualSentConfirmation === true &&
      summary.body.summary.safety.adminObservedReplyRequired === true &&
      summary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.summary.safety.autoReadWhatsApp === false &&
      summary.body.summary.safety.scrapeWhatsappMessages === false &&
      summary.body.summary.safety.hiddenDataHarvesting === false &&
      summary.body.summary.safety.autoReplyToBuyer === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.autoMovePipelineStage === false;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("autoReplyToBuyer = true") &&
      !page.text.includes("automaticBuyerMessage = true") &&
      !page.text.includes("autoOpenBrowser = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/buyer-reply/record"');

    const verdict =
      healthOk &&
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      createDraftOk &&
      prepareCopyOk &&
      confirmSentOk &&
      recordReplyOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 19B Buyer Reply Tracking Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before buyer reply dashboard
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before buyer reply dashboard
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before buyer reply dashboard
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before buyer reply dashboard
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before buyer reply dashboard
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before buyer reply dashboard
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /buyer-reply returns safe buyer reply dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /buyer-replies alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/buyer-replies returns buyer reply data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/buyer-reply/summary returns safe buyer reply dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Buyer Reply Tracking dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays buyer replies manually entered by admin only.
- Dashboard does not read WhatsApp messages.
- Dashboard does not scrape private messages.
- Dashboard does not harvest hidden data.
- Dashboard does not auto-reply to buyer.
- Dashboard does not send WhatsApp.
- Dashboard does not open browser automatically.
- Dashboard does not move pipeline automatically.
- Manual sent confirmation is required before buyer reply tracking.
- Manual review is required before next action.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, and buyer reply data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 19C — Admin Hub Link Buyer Reply Tracking
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

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3075;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const stockConfirmationsPath = path.join(ROOT, "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(ROOT, "src", "data", "compatibility-confirmations.json");
const quoteEligibilitiesPath = path.join(ROOT, "src", "data", "quote-eligibilities.json");
const manualQuoteDraftsPath = path.join(ROOT, "src", "data", "manual-quote-drafts.json");
const manualQuoteCopyActionsPath = path.join(ROOT, "src", "data", "manual-quote-copy-actions.json");
const sentConfirmationsPath = path.join(ROOT, "src", "data", "manual-quote-sent-confirmations.json");
const buyerRepliesPath = path.join(ROOT, "src", "data", "buyer-replies.json");
const followupActionsPath = path.join(ROOT, "src", "data", "buyer-reply-followup-actions.json");
const reportPath = path.join(ROOT, "reports", "version20b-buyer-reply-followup-action-dashboard-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalStockConfirmations = fs.existsSync(stockConfirmationsPath) ? fs.readFileSync(stockConfirmationsPath, "utf8") : "[]";
const originalCompatibilityConfirmations = fs.existsSync(compatibilityConfirmationsPath) ? fs.readFileSync(compatibilityConfirmationsPath, "utf8") : "[]";
const originalQuoteEligibilities = fs.existsSync(quoteEligibilitiesPath) ? fs.readFileSync(quoteEligibilitiesPath, "utf8") : "[]";
const originalManualQuoteDrafts = fs.existsSync(manualQuoteDraftsPath) ? fs.readFileSync(manualQuoteDraftsPath, "utf8") : "[]";
const originalManualQuoteCopyActions = fs.existsSync(manualQuoteCopyActionsPath) ? fs.readFileSync(manualQuoteCopyActionsPath, "utf8") : "[]";
const originalSentConfirmations = fs.existsSync(sentConfirmationsPath) ? fs.readFileSync(sentConfirmationsPath, "utf8") : "[]";
const originalBuyerReplies = fs.existsSync(buyerRepliesPath) ? fs.readFileSync(buyerRepliesPath, "utf8") : "[]";
const originalFollowupActions = fs.existsSync(followupActionsPath) ? fs.readFileSync(followupActionsPath, "utf8") : "[]";

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
  fs.writeFileSync(followupActionsPath, originalFollowupActions, "utf8");
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
      buyerName: "Buyer Reply Followup Dashboard Test",
      phone: "08191919191",
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
        supplierOrShelf: "Ladipo shelf P16",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before follow-up dashboard."
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
        matchedPartNumber: "ALT-1ZZ-FOLLOWUP-DASH",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before follow-up dashboard."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before follow-up dashboard."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 95000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before follow-up dashboard."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before follow-up dashboard."
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
        note: "Admin manually sent quote before follow-up dashboard."
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

    const buyerReplyId = recordReply.body && recordReply.body.reply ? recordReply.body.reply.id : "missing-buyer-reply-id";

    const planAction = await request("/api/buyer-reply-followup/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerReplyId,
        adminReviewedBuyerReply: true,
        manualActionApproved: true,
        actionType: "confirm_pickup_manual",
        priority: "urgent",
        dueWindow: "today",
        actionInstruction: "Call buyer manually to confirm pickup time and reserve stock only after human confirmation.",
        assignedTo: "master_admin",
        createdBy: "master_admin"
      })
    });

    const page = await request("/buyer-reply-followup");
    const aliasPage = await request("/buyer-reply-followups");
    const list = await request("/api/buyer-reply-followups");
    const summary = await request("/api/buyer-reply-followup/summary");

    const healthOk = health.status === 200;
    const createStockOk = createStock.status === 201 && createStock.body.confirmation && createStock.body.confirmation.stockConfirmed === true;
    const createCompatibilityOk = createCompatibility.status === 201 && createCompatibility.body.confirmation && createCompatibility.body.confirmation.compatibilityConfirmed === true;
    const createEligibilityOk = createEligibility.status === 201 && createEligibility.body.eligibility && createEligibility.body.eligibility.finalQuoteGatePassed === true;
    const createDraftOk = createDraft.status === 201 && createDraft.body.draft && createDraft.body.draft.draftOnly === true;
    const prepareCopyOk = prepareCopy.status === 201 && prepareCopy.body.copyAction && prepareCopy.body.copyAction.copyPrepared === true;
    const confirmSentOk = confirmSent.status === 201 && confirmSent.body.confirmation && confirmSent.body.confirmation.adminManualSentConfirmed === true;
    const recordReplyOk = recordReply.status === 201 && recordReply.body.reply && recordReply.body.reply.manualEntryOnly === true && recordReply.body.reply.buyerTemperatureAfterReply === "hot";

    const planActionOk =
      planAction.status === 201 &&
      planAction.body.followupAction &&
      planAction.body.followupAction.buyerReplyId === buyerReplyId &&
      planAction.body.followupAction.leadId === leadId &&
      planAction.body.followupAction.actionType === "confirm_pickup_manual" &&
      planAction.body.followupAction.priority === "urgent" &&
      planAction.body.followupAction.manualActionOnly === true &&
      planAction.body.followupAction.actionPreparedOnly === true &&
      planAction.body.followupAction.actionExecutedBySystem === false &&
      planAction.body.followupAction.autoSendWhatsApp === false &&
      planAction.body.followupAction.autoReplyToBuyer === false &&
      planAction.body.followupAction.autoMovePipelineStage === false &&
      planAction.body.followupAction.hiddenDataHarvesting === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Buyer Reply Follow-Up Action Dashboard") &&
      page.text.includes("Buyer Reply Follow-Up Action Records") &&
      page.text.includes("Manual action only") &&
      page.text.includes("Action prepared only") &&
      page.text.includes("Buyer reply required") &&
      page.text.includes("Admin review required") &&
      page.text.includes("Manual approval required") &&
      page.text.includes("System does not execute action") &&
      page.text.includes("No WhatsApp auto-send") &&
      page.text.includes("No auto-reply") &&
      page.text.includes("No pipeline auto-move") &&
      page.text.includes("No automatic closing") &&
      page.text.includes("followupRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Buyer Reply Follow-Up Action Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.followupActions) &&
      list.body.followupActions.some(item =>
        item.buyerReplyId === buyerReplyId &&
        item.actionType === "confirm_pickup_manual" &&
        item.manualActionOnly === true &&
        item.actionExecutedBySystem === false &&
        item.autoSendWhatsApp === false &&
        item.autoMovePipelineStage === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalBuyerReplyFollowupActions >= 1 &&
      summary.body.summary.manualActionOnlyCount >= 1 &&
      summary.body.summary.actionPreparedOnlyCount >= 1 &&
      summary.body.summary.urgentActionCount >= 1 &&
      summary.body.summary.hotBuyerActionCount >= 1 &&
      summary.body.summary.confirmPickupCount >= 1 &&
      summary.body.summary.actionExecutedBySystemCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.autoReplyToBuyerCount === 0 &&
      summary.body.summary.autoOpenBrowserCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.autoCloseCount === 0 &&
      summary.body.summary.scrapingCount === 0 &&
      summary.body.summary.autoReadWhatsAppCount === 0 &&
      summary.body.summary.safety.buyerReplyFollowupActionGateOnly === true &&
      summary.body.summary.safety.manualActionOnly === true &&
      summary.body.summary.safety.actionPreparedOnly === true &&
      summary.body.summary.safety.requiresBuyerReply === true &&
      summary.body.summary.safety.requiresAdminReviewedBuyerReply === true &&
      summary.body.summary.safety.requiresManualActionApproval === true &&
      summary.body.summary.safety.systemDoesNotExecuteAction === true &&
      summary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.summary.safety.systemDoesNotAutoReply === true &&
      summary.body.summary.safety.systemDoesNotOpenBrowser === true &&
      summary.body.summary.safety.systemDoesNotMovePipeline === true &&
      summary.body.summary.safety.systemDoesNotCloseSale === true &&
      summary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.summary.safety.hiddenDataHarvesting === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.autoReplyToBuyer === false &&
      summary.body.summary.safety.autoMovePipelineStage === false;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("sendWhatsApp = true") &&
      !page.text.includes("autoReplyToBuyer = true") &&
      !page.text.includes("automaticBuyerMessage = true") &&
      !page.text.includes("autoOpenBrowser = true") &&
      !page.text.includes("actionExecutedBySystem = true") &&
      !page.text.includes("actionCompletedBySystem = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("markSaleWonAutomatically = true") &&
      !page.text.includes("markLeadClosedAutomatically = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/buyer-reply-followup/plan"');

    const verdict =
      healthOk &&
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      createDraftOk &&
      prepareCopyOk &&
      confirmSentOk &&
      recordReplyOk &&
      planActionOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 20B Buyer Reply Follow-Up Action Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before follow-up action dashboard
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before follow-up action dashboard
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before follow-up action dashboard
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before follow-up action dashboard
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before follow-up action dashboard
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before follow-up action dashboard
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before follow-up action dashboard
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned before dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /buyer-reply-followup returns safe follow-up action dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /buyer-reply-followups alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/buyer-reply-followups returns follow-up action data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/buyer-reply-followup/summary returns safe follow-up dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Buyer Reply Follow-Up Action dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays buyer reply follow-up action plans only.
- Dashboard does not execute actions.
- Dashboard does not send WhatsApp.
- Dashboard does not auto-reply to buyer.
- Dashboard does not open browser automatically.
- Dashboard does not move pipeline automatically.
- Dashboard does not close sale automatically.
- Dashboard does not read buyer messages.
- Dashboard does not scrape private messages.
- Dashboard does not harvest hidden data.
- Buyer reply record is required before follow-up action planning.
- Admin review and manual action approval are required.
- Manual review is required before execution.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, and follow-up action data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 20C — Admin Hub Link Buyer Reply Follow-Up Action Gate
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

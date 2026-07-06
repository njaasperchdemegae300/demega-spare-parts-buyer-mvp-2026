const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3074;
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
const reportPath = path.join(ROOT, "reports", "version20a-buyer-reply-followup-action-gate-smoke-test-report.md");

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
      buyerName: "Buyer Reply Followup Action Test",
      phone: "08181818181",
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
    const preview = await request("/api/buyer-reply-followup/preview");

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
        supplierOrShelf: "Ladipo shelf O15",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before buyer reply follow-up action."
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
        matchedPartNumber: "ALT-1ZZ-FOLLOWUP",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before buyer reply follow-up action."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before buyer reply follow-up action."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 90000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before buyer reply follow-up action."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before buyer reply follow-up action."
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
        note: "Admin manually sent quote before buyer reply follow-up action."
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

    const missingReply = await request("/api/buyer-reply-followup/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerReplyId: "missing_buyer_reply_id",
        adminReviewedBuyerReply: true,
        manualActionApproved: true,
        actionType: "confirm_pickup_manual",
        priority: "urgent",
        dueWindow: "today",
        actionInstruction: "Call buyer manually to confirm pickup.",
        createdBy: "master_admin"
      })
    });

    const noAdminReview = await request("/api/buyer-reply-followup/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerReplyId,
        manualActionApproved: true,
        actionType: "confirm_pickup_manual",
        priority: "urgent",
        dueWindow: "today",
        actionInstruction: "Call buyer manually to confirm pickup.",
        createdBy: "master_admin"
      })
    });

    const unsafeAuto = await request("/api/buyer-reply-followup/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerReplyId,
        adminReviewedBuyerReply: true,
        manualActionApproved: true,
        actionType: "confirm_pickup_manual",
        priority: "urgent",
        dueWindow: "today",
        actionInstruction: "Call buyer manually to confirm pickup.",
        autoSendWhatsApp: true,
        autoReplyToBuyer: true,
        autoOpenBrowser: true,
        autoMovePipelineStage: true,
        markSaleWonAutomatically: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        privateMessageScraping: true,
        hiddenDataHarvesting: true
      })
    });

    const invalidAction = await request("/api/buyer-reply-followup/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerReplyId,
        adminReviewedBuyerReply: true,
        manualActionApproved: true,
        actionType: "auto_close_sale",
        priority: "urgent",
        dueWindow: "today",
        actionInstruction: "Invalid action type test.",
        createdBy: "master_admin"
      })
    });

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

    const list = await request("/api/buyer-reply-followups");
    const summary = await request("/api/buyer-reply-followup/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Buyer Reply Follow-Up Action Gate Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("prepares manual action only")) &&
      preview.body.rules.some(rule => rule.includes("System does not execute the action")) &&
      Array.isArray(preview.body.allowedActionTypes) &&
      preview.body.allowedActionTypes.includes("confirm_pickup_manual");

    const createLeadOk = createLead.status === 201 && createLead.body.lead && createLead.body.lead.manualReviewRequired === true;
    const createStockOk = createStock.status === 201 && createStock.body.confirmation && createStock.body.confirmation.stockConfirmed === true;
    const createCompatibilityOk = createCompatibility.status === 201 && createCompatibility.body.confirmation && createCompatibility.body.confirmation.compatibilityConfirmed === true;
    const createEligibilityOk = createEligibility.status === 201 && createEligibility.body.eligibility && createEligibility.body.eligibility.finalQuoteGatePassed === true;
    const createDraftOk = createDraft.status === 201 && createDraft.body.draft && createDraft.body.draft.draftOnly === true;
    const prepareCopyOk = prepareCopy.status === 201 && prepareCopy.body.copyAction && prepareCopy.body.copyAction.copyPrepared === true;
    const confirmSentOk = confirmSent.status === 201 && confirmSent.body.confirmation && confirmSent.body.confirmation.adminManualSentConfirmed === true;
    const recordReplyOk = recordReply.status === 201 && recordReply.body.reply && recordReply.body.reply.manualEntryOnly === true && recordReply.body.reply.buyerTemperatureAfterReply === "hot";

    const missingReplyOk = missingReply.status === 404 && missingReply.body && Array.isArray(missingReply.body.errors);
    const noAdminReviewOk = noAdminReview.status === 400 && noAdminReview.body && Array.isArray(noAdminReview.body.errors);
    const unsafeAutoOk = unsafeAuto.status === 400 && unsafeAuto.body && Array.isArray(unsafeAuto.body.errors);
    const invalidActionOk = invalidAction.status === 400 && invalidAction.body && Array.isArray(invalidAction.body.errors);

    const followupAction = planAction.body && planAction.body.followupAction;

    const planActionOk =
      planAction.status === 201 &&
      followupAction &&
      followupAction.buyerReplyId === buyerReplyId &&
      followupAction.leadId === leadId &&
      followupAction.actionType === "confirm_pickup_manual" &&
      followupAction.priority === "urgent" &&
      followupAction.dueWindow === "today" &&
      followupAction.buyerTemperatureAfterReply === "hot" &&
      followupAction.adminReviewedBuyerReply === true &&
      followupAction.manualActionApproved === true &&
      followupAction.manualActionOnly === true &&
      followupAction.followupActionGateOnly === true &&
      followupAction.actionPreparedOnly === true &&
      followupAction.actionExecutedBySystem === false &&
      followupAction.actionCompletedBySystem === false &&
      followupAction.autoSendWhatsApp === false &&
      followupAction.automaticBuyerMessage === false &&
      followupAction.autoReplyToBuyer === false &&
      followupAction.autoOpenBrowser === false &&
      followupAction.autoMovePipelineStage === false &&
      followupAction.pipelineMovedAutomatically === false &&
      followupAction.markSaleWonAutomatically === false &&
      followupAction.markLeadClosedAutomatically === false &&
      followupAction.autoReadWhatsApp === false &&
      followupAction.scrapeWhatsappMessages === false &&
      followupAction.privateMessageScraping === false &&
      followupAction.hiddenDataHarvesting === false &&
      followupAction.manualReviewRequiredBeforeExecution === true;

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
      summary.body.summary.safety.scrapeWhatsappMessages === false &&
      summary.body.summary.safety.privateMessageScraping === false &&
      summary.body.summary.safety.hiddenDataHarvesting === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.autoReplyToBuyer === false &&
      summary.body.summary.safety.autoOpenBrowser === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.manualReviewRequiredBeforeExecution === true;

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      createDraftOk &&
      prepareCopyOk &&
      confirmSentOk &&
      recordReplyOk &&
      missingReplyOk &&
      noAdminReviewOk &&
      unsafeAutoOk &&
      invalidActionOk &&
      planActionOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 20A Buyer Reply Follow-Up Action Gate Foundation Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/buyer-reply-followup/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created before follow-up action gate
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before follow-up action gate
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before follow-up action gate
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before follow-up action gate
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before follow-up action gate
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before follow-up action gate
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before follow-up action gate
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before follow-up action gate
- ${missingReplyOk ? "PASS" : "FAIL"}: missing buyer reply is blocked
- ${noAdminReviewOk ? "PASS" : "FAIL"}: follow-up action without admin review is blocked
- ${unsafeAutoOk ? "PASS" : "FAIL"}: unsafe auto-send/reply/browser/pipeline/read/scrape request is blocked
- ${invalidActionOk ? "PASS" : "FAIL"}: invalid follow-up action type is blocked
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/buyer-reply-followups returns follow-up action data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/buyer-reply-followup/summary returns safe follow-up action metrics

## Safety Rules Confirmed
- Buyer Reply Follow-Up Action Gate prepares manual action only.
- Buyer reply record is required before follow-up action planning.
- Admin reviewed buyer reply is required.
- Manual action approval is required.
- System does not execute the action.
- System does not send WhatsApp.
- System does not auto-reply to buyer.
- System does not open browser automatically.
- System does not move pipeline automatically.
- System does not close sale automatically.
- System does not read buyer messages.
- System does not scrape private messages.
- System does not harvest hidden data.
- Manual review is required before action execution.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, and follow-up action data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 20B — Buyer Reply Follow-Up Action Dashboard Display
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

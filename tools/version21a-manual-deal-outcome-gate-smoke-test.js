const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3077;
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
const dealOutcomesPath = path.join(ROOT, "src", "data", "manual-deal-outcomes.json");
const reportPath = path.join(ROOT, "reports", "version21a-manual-deal-outcome-gate-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalStockConfirmations = fs.existsSync(stockConfirmationsPath) ? fs.readFileSync(stockConfirmationsPath, "utf8") : "[]";
const originalCompatibilityConfirmations = fs.existsSync(compatibilityConfirmationsPath) ? fs.readFileSync(compatibilityConfirmationsPath, "utf8") : "[]";
const originalQuoteEligibilities = fs.existsSync(quoteEligibilitiesPath) ? fs.readFileSync(quoteEligibilitiesPath, "utf8") : "[]";
const originalManualQuoteDrafts = fs.existsSync(manualQuoteDraftsPath) ? fs.readFileSync(manualQuoteDraftsPath, "utf8") : "[]";
const originalManualQuoteCopyActions = fs.existsSync(manualQuoteCopyActionsPath) ? fs.readFileSync(manualQuoteCopyActionsPath, "utf8") : "[]";
const originalSentConfirmations = fs.existsSync(sentConfirmationsPath) ? fs.readFileSync(sentConfirmationsPath, "utf8") : "[]";
const originalBuyerReplies = fs.existsSync(buyerRepliesPath) ? fs.readFileSync(buyerRepliesPath, "utf8") : "[]";
const originalFollowupActions = fs.existsSync(followupActionsPath) ? fs.readFileSync(followupActionsPath, "utf8") : "[]";
const originalDealOutcomes = fs.existsSync(dealOutcomesPath) ? fs.readFileSync(dealOutcomesPath, "utf8") : "[]";

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
  fs.writeFileSync(dealOutcomesPath, originalDealOutcomes, "utf8");
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
      buyerName: "Manual Deal Outcome Test",
      phone: "08202020202",
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
    const preview = await request("/api/manual-deal-outcome/preview");

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
        supplierOrShelf: "Ladipo shelf Q17",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before manual deal outcome."
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
        matchedPartNumber: "ALT-1ZZ-OUTCOME",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before manual deal outcome."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before manual deal outcome."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 100000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before manual deal outcome."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before manual deal outcome."
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
        note: "Admin manually sent quote before manual deal outcome."
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

    const followupActionId = planAction.body && planAction.body.followupAction ? planAction.body.followupAction.id : "missing-followup-action-id";

    const missingFollowup = await request("/api/manual-deal-outcome/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followupActionId: "missing_followup_action_id",
        adminCompletedManualAction: true,
        manualOutcomeApproved: true,
        outcomeType: "deal_won_manual",
        paymentStatus: "paid_cash_manual",
        deliveryStatus: "pickup_completed_manual",
        amountActuallyReceived: 100000,
        outcomeNote: "Missing follow-up action test.",
        recordedBy: "master_admin"
      })
    });

    const noManualCompletion = await request("/api/manual-deal-outcome/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followupActionId,
        manualOutcomeApproved: true,
        outcomeType: "deal_won_manual",
        paymentStatus: "paid_cash_manual",
        deliveryStatus: "pickup_completed_manual",
        amountActuallyReceived: 100000,
        outcomeNote: "Manual completion flag missing.",
        recordedBy: "master_admin"
      })
    });

    const unsafeAuto = await request("/api/manual-deal-outcome/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followupActionId,
        adminCompletedManualAction: true,
        manualOutcomeApproved: true,
        outcomeType: "deal_won_manual",
        paymentStatus: "paid_cash_manual",
        deliveryStatus: "pickup_completed_manual",
        amountActuallyReceived: 100000,
        outcomeNote: "Unsafe automation test.",
        autoCloseSale: true,
        markSaleWonAutomatically: true,
        autoMovePipelineStage: true,
        autoSendWhatsApp: true,
        autoReplyToBuyer: true,
        autoOpenBrowser: true,
        collectPaymentAutomatically: true,
        verifyPaymentAutomatically: true,
        autoReserveStock: true,
        autoReduceStock: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        privateMessageScraping: true,
        hiddenDataHarvesting: true
      })
    });

    const invalidOutcome = await request("/api/manual-deal-outcome/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followupActionId,
        adminCompletedManualAction: true,
        manualOutcomeApproved: true,
        outcomeType: "auto_won",
        paymentStatus: "paid_cash_manual",
        deliveryStatus: "pickup_completed_manual",
        amountActuallyReceived: 100000,
        outcomeNote: "Invalid outcome type test.",
        recordedBy: "master_admin"
      })
    });

    const recordOutcome = await request("/api/manual-deal-outcome/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followupActionId,
        adminCompletedManualAction: true,
        manualOutcomeApproved: true,
        outcomeType: "deal_won_manual",
        paymentStatus: "paid_cash_manual",
        deliveryStatus: "pickup_completed_manual",
        amountActuallyReceived: 100000,
        outcomeNote: "Admin manually completed pickup and received cash outside the system.",
        recordedBy: "master_admin"
      })
    });

    const list = await request("/api/manual-deal-outcomes");
    const summary = await request("/api/manual-deal-outcome/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Manual Deal Outcome Gate Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("records outcome only")) &&
      preview.body.rules.some(rule => rule.includes("System does not close sale automatically")) &&
      Array.isArray(preview.body.allowedOutcomeTypes) &&
      preview.body.allowedOutcomeTypes.includes("deal_won_manual");

    const createLeadOk = createLead.status === 201 && createLead.body.lead && createLead.body.lead.manualReviewRequired === true;
    const createStockOk = createStock.status === 201 && createStock.body.confirmation && createStock.body.confirmation.stockConfirmed === true;
    const createCompatibilityOk = createCompatibility.status === 201 && createCompatibility.body.confirmation && createCompatibility.body.confirmation.compatibilityConfirmed === true;
    const createEligibilityOk = createEligibility.status === 201 && createEligibility.body.eligibility && createEligibility.body.eligibility.finalQuoteGatePassed === true;
    const createDraftOk = createDraft.status === 201 && createDraft.body.draft && createDraft.body.draft.draftOnly === true;
    const prepareCopyOk = prepareCopy.status === 201 && prepareCopy.body.copyAction && prepareCopy.body.copyAction.copyPrepared === true;
    const confirmSentOk = confirmSent.status === 201 && confirmSent.body.confirmation && confirmSent.body.confirmation.adminManualSentConfirmed === true;
    const recordReplyOk = recordReply.status === 201 && recordReply.body.reply && recordReply.body.reply.manualEntryOnly === true && recordReply.body.reply.buyerTemperatureAfterReply === "hot";
    const planActionOk = planAction.status === 201 && planAction.body.followupAction && planAction.body.followupAction.manualActionOnly === true;

    const missingFollowupOk = missingFollowup.status === 404 && missingFollowup.body && Array.isArray(missingFollowup.body.errors);
    const noManualCompletionOk = noManualCompletion.status === 400 && noManualCompletion.body && Array.isArray(noManualCompletion.body.errors);
    const unsafeAutoOk = unsafeAuto.status === 400 && unsafeAuto.body && Array.isArray(unsafeAuto.body.errors);
    const invalidOutcomeOk = invalidOutcome.status === 400 && invalidOutcome.body && Array.isArray(invalidOutcome.body.errors);

    const dealOutcome = recordOutcome.body && recordOutcome.body.dealOutcome;

    const recordOutcomeOk =
      recordOutcome.status === 201 &&
      dealOutcome &&
      dealOutcome.followupActionId === followupActionId &&
      dealOutcome.leadId === leadId &&
      dealOutcome.outcomeType === "deal_won_manual" &&
      dealOutcome.outcomeTemperature === "won_or_hot" &&
      dealOutcome.paymentStatus === "paid_cash_manual" &&
      dealOutcome.deliveryStatus === "pickup_completed_manual" &&
      dealOutcome.amountActuallyReceived === 100000 &&
      dealOutcome.adminCompletedManualAction === true &&
      dealOutcome.manualOutcomeApproved === true &&
      dealOutcome.manualDealOutcomeOnly === true &&
      dealOutcome.manualOutcomeRecordOnly === true &&
      dealOutcome.systemClosedSale === false &&
      dealOutcome.autoCloseSale === false &&
      dealOutcome.markSaleWonAutomatically === false &&
      dealOutcome.autoMovePipelineStage === false &&
      dealOutcome.pipelineMovedAutomatically === false &&
      dealOutcome.autoSendWhatsApp === false &&
      dealOutcome.autoReplyToBuyer === false &&
      dealOutcome.autoOpenBrowser === false &&
      dealOutcome.collectPaymentAutomatically === false &&
      dealOutcome.verifyPaymentAutomatically === false &&
      dealOutcome.autoReserveStock === false &&
      dealOutcome.autoReduceStock === false &&
      dealOutcome.autoReadWhatsApp === false &&
      dealOutcome.scrapeWhatsappMessages === false &&
      dealOutcome.privateMessageScraping === false &&
      dealOutcome.hiddenDataHarvesting === false &&
      dealOutcome.manualReviewRequiredForAccounting === true &&
      dealOutcome.manualReviewRequiredForPipelineUpdate === true &&
      dealOutcome.manualReviewRequiredForStockUpdate === true;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.dealOutcomes) &&
      list.body.dealOutcomes.some(item =>
        item.followupActionId === followupActionId &&
        item.outcomeType === "deal_won_manual" &&
        item.manualDealOutcomeOnly === true &&
        item.systemClosedSale === false &&
        item.autoMovePipelineStage === false &&
        item.autoSendWhatsApp === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalManualDealOutcomes >= 1 &&
      summary.body.summary.manualDealOutcomeOnlyCount >= 1 &&
      summary.body.summary.manualOutcomeRecordOnlyCount >= 1 &&
      summary.body.summary.dealWonManualCount >= 1 &&
      summary.body.summary.amountActuallyReceivedTotal >= 100000 &&
      summary.body.summary.systemClosedSaleCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.autoReplyToBuyerCount === 0 &&
      summary.body.summary.autoOpenBrowserCount === 0 &&
      summary.body.summary.autoPaymentCount === 0 &&
      summary.body.summary.autoStockChangeCount === 0 &&
      summary.body.summary.scrapingCount === 0 &&
      summary.body.summary.autoReadWhatsAppCount === 0 &&
      summary.body.summary.safety.manualDealOutcomeGateOnly === true &&
      summary.body.summary.safety.manualDealOutcomeOnly === true &&
      summary.body.summary.safety.manualOutcomeRecordOnly === true &&
      summary.body.summary.safety.requiresFollowupAction === true &&
      summary.body.summary.safety.requiresAdminCompletedManualAction === true &&
      summary.body.summary.safety.requiresManualOutcomeApproval === true &&
      summary.body.summary.safety.systemDoesNotCloseSale === true &&
      summary.body.summary.safety.systemDoesNotMovePipeline === true &&
      summary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.summary.safety.systemDoesNotAutoReply === true &&
      summary.body.summary.safety.systemDoesNotHandlePayment === true &&
      summary.body.summary.safety.systemDoesNotChangeStock === true &&
      summary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.summary.safety.hiddenDataHarvesting === false &&
      summary.body.summary.safety.autoCloseSale === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.autoReplyToBuyer === false &&
      summary.body.summary.safety.collectPaymentAutomatically === false &&
      summary.body.summary.safety.autoReserveStock === false &&
      summary.body.summary.safety.autoReduceStock === false &&
      summary.body.summary.safety.manualReviewRequiredForAccounting === true &&
      summary.body.summary.safety.manualReviewRequiredForPipelineUpdate === true &&
      summary.body.summary.safety.manualReviewRequiredForStockUpdate === true;

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
      planActionOk &&
      missingFollowupOk &&
      noManualCompletionOk &&
      unsafeAutoOk &&
      invalidOutcomeOk &&
      recordOutcomeOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 21A Manual Deal Outcome Gate Foundation Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/manual-deal-outcome/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created before manual deal outcome gate
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before manual deal outcome gate
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before manual deal outcome gate
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before manual deal outcome gate
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before manual deal outcome gate
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before manual deal outcome gate
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before manual deal outcome gate
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before manual deal outcome gate
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned before manual deal outcome gate
- ${missingFollowupOk ? "PASS" : "FAIL"}: missing follow-up action is blocked
- ${noManualCompletionOk ? "PASS" : "FAIL"}: outcome without admin manual completion is blocked
- ${unsafeAutoOk ? "PASS" : "FAIL"}: unsafe auto-close/pipeline/send/payment/stock/read/scrape request is blocked
- ${invalidOutcomeOk ? "PASS" : "FAIL"}: invalid deal outcome type is blocked
- ${recordOutcomeOk ? "PASS" : "FAIL"}: manual deal outcome recorded safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-deal-outcomes returns manual deal outcome data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-deal-outcome/summary returns safe manual deal outcome metrics

## Safety Rules Confirmed
- Manual Deal Outcome Gate records outcome only.
- Follow-up action record is required first.
- Admin completed manual action is required.
- Manual outcome approval is required.
- System does not close sale automatically.
- System does not move pipeline automatically.
- System does not send WhatsApp.
- System does not auto-reply to buyer.
- System does not open browser automatically.
- System does not handle payment.
- System does not change stock.
- System does not read buyer messages.
- System does not scrape private messages.
- System does not harvest hidden data.
- Manual review is required before accounting, pipeline, or stock update.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, follow-up action, and deal outcome data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 21B — Manual Deal Outcome Dashboard Display
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

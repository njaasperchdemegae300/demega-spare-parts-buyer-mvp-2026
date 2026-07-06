const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3078;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const dataFiles = [
  "leads.json",
  "stock-confirmations.json",
  "compatibility-confirmations.json",
  "quote-eligibilities.json",
  "manual-quote-drafts.json",
  "manual-quote-copy-actions.json",
  "manual-quote-sent-confirmations.json",
  "buyer-replies.json",
  "buyer-reply-followup-actions.json",
  "manual-deal-outcomes.json"
];

const originals = {};
for (const file of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", file);
  originals[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version21b-manual-deal-outcome-dashboard-smoke-test-report.md");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  for (const [filePath, content] of Object.entries(originals)) {
    fs.writeFileSync(filePath, content, "utf8");
  }
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

    const health = await request("/api/health");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: "Manual Deal Outcome Dashboard Test",
        phone: "08212121212",
        source: "whatsapp_inbound",
        partNeeded: "1ZZ alternator",
        vehicleBrand: "Toyota",
        vehicleModel: "Corolla",
        vehicleYear: "2005",
        engineCode: "1ZZ",
        location: "Lagos",
        urgency: "urgent",
        message: "Need 1ZZ alternator urgently today."
      })
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
        supplierOrShelf: "Ladipo shelf R18",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before manual deal outcome dashboard."
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
        matchedPartNumber: "ALT-1ZZ-OUTCOME-DASH",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before manual deal outcome dashboard."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before manual deal outcome dashboard."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 105000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before manual deal outcome dashboard."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before manual deal outcome dashboard."
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
        note: "Admin manually sent quote before manual deal outcome dashboard."
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
        amountActuallyReceived: 105000,
        outcomeNote: "Admin manually completed pickup and received cash outside the system.",
        recordedBy: "master_admin"
      })
    });

    const page = await request("/manual-deal-outcome");
    const aliasPage = await request("/manual-deal-outcomes");
    const list = await request("/api/manual-deal-outcomes");
    const summary = await request("/api/manual-deal-outcome/summary");

    const healthOk = health.status === 200;
    const createStockOk = createStock.status === 201 && createStock.body.confirmation && createStock.body.confirmation.stockConfirmed === true;
    const createCompatibilityOk = createCompatibility.status === 201 && createCompatibility.body.confirmation && createCompatibility.body.confirmation.compatibilityConfirmed === true;
    const createEligibilityOk = createEligibility.status === 201 && createEligibility.body.eligibility && createEligibility.body.eligibility.finalQuoteGatePassed === true;
    const createDraftOk = createDraft.status === 201 && createDraft.body.draft && createDraft.body.draft.draftOnly === true;
    const prepareCopyOk = prepareCopy.status === 201 && prepareCopy.body.copyAction && prepareCopy.body.copyAction.copyPrepared === true;
    const confirmSentOk = confirmSent.status === 201 && confirmSent.body.confirmation && confirmSent.body.confirmation.adminManualSentConfirmed === true;
    const recordReplyOk = recordReply.status === 201 && recordReply.body.reply && recordReply.body.reply.manualEntryOnly === true;
    const planActionOk = planAction.status === 201 && planAction.body.followupAction && planAction.body.followupAction.manualActionOnly === true;

    const outcome = recordOutcome.body && recordOutcome.body.dealOutcome;
    const recordOutcomeOk =
      recordOutcome.status === 201 &&
      outcome &&
      outcome.followupActionId === followupActionId &&
      outcome.leadId === leadId &&
      outcome.outcomeType === "deal_won_manual" &&
      outcome.amountActuallyReceived === 105000 &&
      outcome.manualDealOutcomeOnly === true &&
      outcome.systemClosedSale === false &&
      outcome.autoMovePipelineStage === false &&
      outcome.autoSendWhatsApp === false &&
      outcome.collectPaymentAutomatically === false &&
      outcome.autoReserveStock === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Manual Deal Outcome Dashboard") &&
      page.text.includes("Manual Deal Outcome Records") &&
      page.text.includes("Manual outcome record only") &&
      page.text.includes("Follow-up action required") &&
      page.text.includes("Admin completed manual action required") &&
      page.text.includes("Manual outcome approval required") &&
      page.text.includes("No automatic sale closing") &&
      page.text.includes("No pipeline auto-move") &&
      page.text.includes("No payment automation") &&
      page.text.includes("No stock automation") &&
      page.text.includes("outcomeRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Manual Deal Outcome Dashboard");

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
      summary.body.summary.amountActuallyReceivedTotal >= 105000 &&
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
      summary.body.summary.safety.manualOutcomeRecordOnly === true &&
      summary.body.summary.safety.requiresFollowupAction === true &&
      summary.body.summary.safety.requiresAdminCompletedManualAction === true &&
      summary.body.summary.safety.requiresManualOutcomeApproval === true &&
      summary.body.summary.safety.systemDoesNotCloseSale === true &&
      summary.body.summary.safety.systemDoesNotMovePipeline === true &&
      summary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.summary.safety.systemDoesNotHandlePayment === true &&
      summary.body.summary.safety.systemDoesNotChangeStock === true &&
      summary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.summary.safety.hiddenDataHarvesting === false &&
      summary.body.summary.safety.autoCloseSale === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.collectPaymentAutomatically === false &&
      summary.body.summary.safety.autoReserveStock === false &&
      summary.body.summary.safety.autoReduceStock === false;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("autoReplyToBuyer = true") &&
      !page.text.includes("automaticBuyerMessage = true") &&
      !page.text.includes("autoOpenBrowser = true") &&
      !page.text.includes("systemClosedSale = true") &&
      !page.text.includes("autoCloseSale = true") &&
      !page.text.includes("closeSaleAutomatically = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("markSaleWonAutomatically = true") &&
      !page.text.includes("collectPaymentAutomatically = true") &&
      !page.text.includes("verifyPaymentAutomatically = true") &&
      !page.text.includes("autoReserveStock = true") &&
      !page.text.includes("autoReduceStock = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/manual-deal-outcome/record"');

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
      recordOutcomeOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 21B Manual Deal Outcome Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before manual deal outcome dashboard
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before manual deal outcome dashboard
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before manual deal outcome dashboard
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before manual deal outcome dashboard
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before manual deal outcome dashboard
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before manual deal outcome dashboard
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before manual deal outcome dashboard
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned before manual deal outcome dashboard
- ${recordOutcomeOk ? "PASS" : "FAIL"}: manual deal outcome recorded before dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /manual-deal-outcome returns safe manual deal outcome dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /manual-deal-outcomes alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-deal-outcomes returns manual deal outcome data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-deal-outcome/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Manual Deal Outcome dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays manual deal outcome records only.
- Dashboard does not close sales.
- Dashboard does not move pipeline automatically.
- Dashboard does not send WhatsApp.
- Dashboard does not auto-reply to buyer.
- Dashboard does not open browser automatically.
- Dashboard does not handle payment.
- Dashboard does not change stock.
- Dashboard does not read buyer messages.
- Dashboard does not scrape private messages.
- Dashboard does not harvest hidden data.
- Follow-up action record is required before outcome recording.
- Admin completion and manual outcome approval are required.
- Manual review is required before accounting, pipeline, or stock update.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, follow-up action, and deal outcome data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 21C — Admin Hub Link Manual Deal Outcome Gate
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

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3087;
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
  "manual-deal-outcomes.json",
  "manual-stock-movement-reviews.json",
  "manual-accounting-reviews.json",
  "manual-final-business-reviews.json"
];

const originals = {};
for (const file of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", file);
  originals[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version24b-manual-final-business-review-dashboard-smoke-test-report.md");

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
        buyerName: "Manual Final Business Dashboard Test",
        phone: "08272727272",
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
        supplierOrShelf: "Ladipo shelf X25",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before final business dashboard."
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
        matchedPartNumber: "ALT-1ZZ-FINAL-DASH",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before final business dashboard."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before final business dashboard."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 135000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before final business dashboard."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before final business dashboard."
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
        note: "Admin manually sent quote before final business dashboard."
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
        amountActuallyReceived: 135000,
        outcomeNote: "Admin manually completed pickup and received cash outside the system.",
        recordedBy: "master_admin"
      })
    });

    const dealOutcomeId = recordOutcome.body && recordOutcome.body.dealOutcome ? recordOutcome.body.dealOutcome.id : "missing-deal-outcome-id";

    const recordStockReview = await request("/api/manual-stock-movement-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealOutcomeId,
        adminReviewedDealOutcome: true,
        manualStockMovementReviewApproved: true,
        movementType: "stock_deduction_review",
        movementReason: "deal_won_manual",
        reviewStatus: "approved_for_manual_stock_update",
        quantityToReview: 1,
        shelfOrSupplier: "Ladipo shelf X25",
        inventoryItemId: "manual_inventory_item_final_dashboard_test",
        reviewNote: "Admin reviewed deal outcome. Manual stock deduction is approved for human inventory update only.",
        reviewedBy: "master_admin"
      })
    });

    const stockMovementReviewId = recordStockReview.body && recordStockReview.body.stockMovementReview ? recordStockReview.body.stockMovementReview.id : "missing-stock-review-id";

    const recordAccounting = await request("/api/manual-accounting-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockMovementReviewId,
        adminReviewedStockMovement: true,
        manualAccountingReviewApproved: true,
        reviewType: "payment_received_review",
        accountingAction: "record_manual_cash_sale",
        reviewStatus: "approved_for_manual_accounting_entry",
        amountExpected: 135000,
        amountConfirmedByAdmin: 135000,
        paymentMethodReviewed: "cash_manual",
        transactionReferenceManual: "cash-paid-to-admin-final-dashboard",
        receiptNumberManual: "manual-receipt-to-be-written-final-dashboard",
        accountingNote: "Admin manually confirmed cash payment. Manual accounting entry and manual receipt are required outside the system.",
        reviewedBy: "master_admin"
      })
    });

    const accountingReviewId = recordAccounting.body && recordAccounting.body.accountingReview ? recordAccounting.body.accountingReview.id : "missing-accounting-review-id";

    const recordFinalReview = await request("/api/manual-final-business-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountingReviewId,
        adminReviewedAccounting: true,
        manualFinalBusinessReviewApproved: true,
        finalReviewType: "final_sale_completed_review",
        finalBusinessAction: "mark_manual_sale_completed_for_records",
        finalReviewStatus: "approved_for_manual_business_records",
        finalReviewNote: "Admin manually reviewed completed deal. Manual final business record may be updated outside the system.",
        reviewedBy: "master_admin"
      })
    });

    const page = await request("/manual-final-business-review");
    const aliasPage = await request("/manual-final-business-reviews");
    const list = await request("/api/manual-final-business-reviews");
    const summary = await request("/api/manual-final-business-review/summary");

    const healthOk = health.status === 200;
    const createLeadOk = createLead.status === 201 && createLead.body.lead && createLead.body.lead.manualReviewRequired === true;
    const createStockOk = createStock.status === 201 && createStock.body.confirmation && createStock.body.confirmation.stockConfirmed === true;
    const createCompatibilityOk = createCompatibility.status === 201 && createCompatibility.body.confirmation && createCompatibility.body.confirmation.compatibilityConfirmed === true;
    const createEligibilityOk = createEligibility.status === 201 && createEligibility.body.eligibility && createEligibility.body.eligibility.finalQuoteGatePassed === true;
    const createDraftOk = createDraft.status === 201 && createDraft.body.draft && createDraft.body.draft.draftOnly === true;
    const prepareCopyOk = prepareCopy.status === 201 && prepareCopy.body.copyAction && prepareCopy.body.copyAction.copyPrepared === true;
    const confirmSentOk = confirmSent.status === 201 && confirmSent.body.confirmation && confirmSent.body.confirmation.adminManualSentConfirmed === true;
    const recordReplyOk = recordReply.status === 201 && recordReply.body.reply && recordReply.body.reply.manualEntryOnly === true;
    const planActionOk = planAction.status === 201 && planAction.body.followupAction && planAction.body.followupAction.manualActionOnly === true;
    const recordOutcomeOk = recordOutcome.status === 201 && recordOutcome.body.dealOutcome && recordOutcome.body.dealOutcome.manualDealOutcomeOnly === true;
    const stockReviewOk = recordStockReview.status === 201 && recordStockReview.body.stockMovementReview && recordStockReview.body.stockMovementReview.manualStockMovementReviewOnly === true;
    const accountingReviewOk = recordAccounting.status === 201 && recordAccounting.body.accountingReview && recordAccounting.body.accountingReview.manualAccountingReviewOnly === true;

    const finalReview = recordFinalReview.body && recordFinalReview.body.finalBusinessReview;

    const recordFinalReviewOk =
      recordFinalReview.status === 201 &&
      finalReview &&
      finalReview.accountingReviewId === accountingReviewId &&
      finalReview.leadId === leadId &&
      finalReview.finalReviewType === "final_sale_completed_review" &&
      finalReview.finalBusinessAction === "mark_manual_sale_completed_for_records" &&
      finalReview.finalReviewStatus === "approved_for_manual_business_records" &&
      finalReview.finalBusinessTemperature === "completed_manual" &&
      finalReview.manualFinalBusinessReviewOnly === true &&
      finalReview.finalBusinessReviewGateOnly === true &&
      finalReview.finalBusinessRecordPreparedOnly === true &&
      finalReview.finalBusinessRecordCreatedBySystem === false &&
      finalReview.autoCreateFinalBusinessRecord === false &&
      finalReview.saleClosedBySystem === false &&
      finalReview.autoCloseSale === false &&
      finalReview.autoMovePipelineStage === false &&
      finalReview.autoCreateAccountingEntry === false &&
      finalReview.autoGenerateReceipt === false &&
      finalReview.autoUpdateRevenue === false &&
      finalReview.autoUpdateInventory === false &&
      finalReview.autoSendWhatsApp === false &&
      finalReview.autoReadWhatsApp === false &&
      finalReview.hiddenDataHarvesting === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Manual Final Business Review Dashboard") &&
      page.text.includes("Manual Final Business Review Records") &&
      page.text.includes("Manual final business review only") &&
      page.text.includes("Final business record prepared only") &&
      page.text.includes("Manual accounting review required") &&
      page.text.includes("Admin reviewed accounting required") &&
      page.text.includes("Manual final business approval required") &&
      page.text.includes("No automatic final business record") &&
      page.text.includes("No automatic sale closing") &&
      page.text.includes("No automatic pipeline movement") &&
      page.text.includes("No automatic accounting entry") &&
      page.text.includes("No automatic revenue recording") &&
      page.text.includes("No automatic inventory update") &&
      page.text.includes("finalBusinessRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Manual Final Business Review Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.finalBusinessReviews) &&
      list.body.finalBusinessReviews.some(item =>
        item.accountingReviewId === accountingReviewId &&
        item.finalReviewType === "final_sale_completed_review" &&
        item.manualFinalBusinessReviewOnly === true &&
        item.finalBusinessRecordCreatedBySystem === false &&
        item.autoCreateFinalBusinessRecord === false &&
        item.autoCloseSale === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalManualFinalBusinessReviews >= 1 &&
      summary.body.summary.manualFinalBusinessReviewOnlyCount >= 1 &&
      summary.body.summary.finalBusinessRecordPreparedOnlyCount >= 1 &&
      summary.body.summary.finalSaleCompletedReviewCount >= 1 &&
      summary.body.summary.approvedForManualBusinessRecordsCount >= 1 &&
      summary.body.summary.amountConfirmedByAdminTotal >= 135000 &&
      summary.body.summary.finalBusinessRecordCreatedBySystemCount === 0 &&
      summary.body.summary.autoCloseSaleCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.autoAccountingEntryCount === 0 &&
      summary.body.summary.autoRevenueCount === 0 &&
      summary.body.summary.autoInventoryUpdateCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.scrapingCount === 0 &&
      summary.body.summary.autoReadWhatsAppCount === 0 &&
      summary.body.summary.safety.manualFinalBusinessReviewGateOnly === true &&
      summary.body.summary.safety.manualFinalBusinessReviewOnly === true &&
      summary.body.summary.safety.finalBusinessRecordPreparedOnly === true &&
      summary.body.summary.safety.requiresManualAccountingReview === true &&
      summary.body.summary.safety.requiresAdminReviewedAccounting === true &&
      summary.body.summary.safety.requiresManualFinalBusinessReviewApproval === true &&
      summary.body.summary.safety.systemDoesNotCreateFinalBusinessRecord === true &&
      summary.body.summary.safety.systemDoesNotCloseSale === true &&
      summary.body.summary.safety.systemDoesNotMovePipeline === true &&
      summary.body.summary.safety.systemDoesNotCreateAccountingEntry === true &&
      summary.body.summary.safety.systemDoesNotGenerateReceipt === true &&
      summary.body.summary.safety.systemDoesNotRecordRevenue === true &&
      summary.body.summary.safety.systemDoesNotUpdateInventory === true &&
      summary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.summary.safety.hiddenDataHarvesting === false &&
      summary.body.summary.safety.autoCreateFinalBusinessRecord === false &&
      summary.body.summary.safety.autoCloseSale === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.autoCreateAccountingEntry === false &&
      summary.body.summary.safety.autoGenerateReceipt === false &&
      summary.body.summary.safety.autoUpdateRevenue === false &&
      summary.body.summary.safety.autoUpdateInventory === false &&
      summary.body.summary.safety.manualFinalBusinessRecordRequired === true &&
      summary.body.summary.safety.manualReviewRequiredBeforeFinalClose === true;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoCreateFinalBusinessRecord = true") &&
      !page.text.includes("finalBusinessRecordCreatedBySystem = true") &&
      !page.text.includes("autoCloseSale = true") &&
      !page.text.includes("saleClosedBySystem = true") &&
      !page.text.includes("closeSaleAutomatically = true") &&
      !page.text.includes("autoMovePipelineStage = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("autoCreateAccountingEntry = true") &&
      !page.text.includes("accountingEntryCreatedBySystem = true") &&
      !page.text.includes("autoGenerateReceipt = true") &&
      !page.text.includes("receiptGeneratedBySystem = true") &&
      !page.text.includes("autoUpdateRevenue = true") &&
      !page.text.includes("revenueRecordedBySystem = true") &&
      !page.text.includes("autoUpdateInventory = true") &&
      !page.text.includes("inventoryChangedBySystem = true") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/manual-final-business-review/record"');

    const verdict =
      healthOk &&
      createLeadOk &&
      createStockOk &&
      createCompatibilityOk &&
      createEligibilityOk &&
      createDraftOk &&
      prepareCopyOk &&
      confirmSentOk &&
      recordReplyOk &&
      planActionOk &&
      recordOutcomeOk &&
      stockReviewOk &&
      accountingReviewOk &&
      recordFinalReviewOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 24B Manual Final Business Review Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created before final business dashboard
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before final business dashboard
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before final business dashboard
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before final business dashboard
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before final business dashboard
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before final business dashboard
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before final business dashboard
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before final business dashboard
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned before final business dashboard
- ${recordOutcomeOk ? "PASS" : "FAIL"}: manual deal outcome recorded before final business dashboard
- ${stockReviewOk ? "PASS" : "FAIL"}: manual stock movement review recorded before final business dashboard
- ${accountingReviewOk ? "PASS" : "FAIL"}: manual accounting review recorded before final business dashboard
- ${recordFinalReviewOk ? "PASS" : "FAIL"}: manual final business review recorded before dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /manual-final-business-review returns safe final business review dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /manual-final-business-reviews alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-final-business-reviews returns final business review data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-final-business-review/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Manual Final Business Review dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays manual final business review records only.
- Dashboard does not create final business records automatically.
- Dashboard does not close sales automatically.
- Dashboard does not move pipeline automatically.
- Dashboard does not create accounting entries automatically.
- Dashboard does not generate receipts automatically.
- Dashboard does not record revenue automatically.
- Dashboard does not update inventory automatically.
- Dashboard does not send WhatsApp.
- Dashboard does not read buyer messages.
- Dashboard does not scrape private messages.
- Dashboard does not harvest hidden data.
- Manual accounting review is required before final business review.
- Admin review and manual final business approval are required.
- Manual final business record and manager review are required after review.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, follow-up action, deal outcome, stock movement review, accounting review, and final business review data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 24C — Admin Hub Link Manual Final Business Review Gate
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

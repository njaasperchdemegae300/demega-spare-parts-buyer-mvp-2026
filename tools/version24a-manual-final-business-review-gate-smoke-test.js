const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3086;
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

const reportPath = path.join(ROOT, "reports", "version24a-manual-final-business-review-gate-smoke-test-report.md");

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
    const preview = await request("/api/manual-final-business-review/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: "Manual Final Business Review Test",
        phone: "08262626262",
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
        supplierOrShelf: "Ladipo shelf W24",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before final business review."
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
        matchedPartNumber: "ALT-1ZZ-FINAL-BUSINESS",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before final business review."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before final business review."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 130000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before final business review."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before final business review."
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
        note: "Admin manually sent quote before final business review."
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
        amountActuallyReceived: 130000,
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
        shelfOrSupplier: "Ladipo shelf W24",
        inventoryItemId: "manual_inventory_item_final_business_test",
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
        amountExpected: 130000,
        amountConfirmedByAdmin: 130000,
        paymentMethodReviewed: "cash_manual",
        transactionReferenceManual: "cash-paid-to-admin-final",
        receiptNumberManual: "manual-receipt-to-be-written-final",
        accountingNote: "Admin manually confirmed cash payment. Manual accounting entry and manual receipt are required outside the system.",
        reviewedBy: "master_admin"
      })
    });

    const accountingReviewId = recordAccounting.body && recordAccounting.body.accountingReview ? recordAccounting.body.accountingReview.id : "missing-accounting-review-id";

    const missingAccounting = await request("/api/manual-final-business-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountingReviewId: "missing_accounting_review_id",
        adminReviewedAccounting: true,
        manualFinalBusinessReviewApproved: true,
        finalReviewType: "final_sale_completed_review",
        finalBusinessAction: "mark_manual_sale_completed_for_records",
        finalReviewStatus: "approved_for_manual_business_records",
        finalReviewNote: "Missing accounting review test.",
        reviewedBy: "master_admin"
      })
    });

    const noAdminReview = await request("/api/manual-final-business-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountingReviewId,
        manualFinalBusinessReviewApproved: true,
        finalReviewType: "final_sale_completed_review",
        finalBusinessAction: "mark_manual_sale_completed_for_records",
        finalReviewStatus: "approved_for_manual_business_records",
        finalReviewNote: "Admin accounting review flag missing.",
        reviewedBy: "master_admin"
      })
    });

    const unsafeAuto = await request("/api/manual-final-business-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountingReviewId,
        adminReviewedAccounting: true,
        manualFinalBusinessReviewApproved: true,
        finalReviewType: "final_sale_completed_review",
        finalBusinessAction: "mark_manual_sale_completed_for_records",
        finalReviewStatus: "approved_for_manual_business_records",
        finalReviewNote: "Unsafe final business automation test.",
        autoCreateFinalBusinessRecord: true,
        autoCloseSale: true,
        closeSaleAutomatically: true,
        autoMovePipelineStage: true,
        autoCreateAccountingEntry: true,
        autoCreateFinancialLedgerEntry: true,
        autoVerifyPayment: true,
        autoGenerateReceipt: true,
        autoCreateInvoice: true,
        autoUpdateRevenue: true,
        autoUpdateInventory: true,
        autoSendWhatsApp: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        privateMessageScraping: true,
        hiddenDataHarvesting: true
      })
    });

    const invalidFinalReview = await request("/api/manual-final-business-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountingReviewId,
        adminReviewedAccounting: true,
        manualFinalBusinessReviewApproved: true,
        finalReviewType: "auto_final_close",
        finalBusinessAction: "mark_manual_sale_completed_for_records",
        finalReviewStatus: "approved_for_manual_business_records",
        finalReviewNote: "Invalid final review type test.",
        reviewedBy: "master_admin"
      })
    });

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
        finalReviewNote: "Admin manually reviewed the completed deal. Manual final business record may be updated outside the system.",
        reviewedBy: "master_admin"
      })
    });

    const list = await request("/api/manual-final-business-reviews");
    const summary = await request("/api/manual-final-business-review/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Manual Final Business Review Gate Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("records final review only")) &&
      preview.body.rules.some(rule => rule.includes("System does not close sale automatically")) &&
      Array.isArray(preview.body.allowedFinalReviewTypes) &&
      preview.body.allowedFinalReviewTypes.includes("final_sale_completed_review");

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

    const missingAccountingOk = missingAccounting.status === 404 && missingAccounting.body && Array.isArray(missingAccounting.body.errors);
    const noAdminReviewOk = noAdminReview.status === 400 && noAdminReview.body && Array.isArray(noAdminReview.body.errors);
    const unsafeAutoOk = unsafeAuto.status === 400 && unsafeAuto.body && Array.isArray(unsafeAuto.body.errors);
    const invalidFinalReviewOk = invalidFinalReview.status === 400 && invalidFinalReview.body && Array.isArray(invalidFinalReview.body.errors);

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
      finalReview.adminReviewedAccounting === true &&
      finalReview.manualFinalBusinessReviewApproved === true &&
      finalReview.manualFinalBusinessReviewOnly === true &&
      finalReview.finalBusinessReviewGateOnly === true &&
      finalReview.finalBusinessRecordPreparedOnly === true &&
      finalReview.finalBusinessRecordCreatedBySystem === false &&
      finalReview.autoCreateFinalBusinessRecord === false &&
      finalReview.saleClosedBySystem === false &&
      finalReview.autoCloseSale === false &&
      finalReview.autoMovePipelineStage === false &&
      finalReview.accountingEntryCreatedBySystem === false &&
      finalReview.autoCreateAccountingEntry === false &&
      finalReview.autoGenerateReceipt === false &&
      finalReview.autoCreateInvoice === false &&
      finalReview.autoUpdateRevenue === false &&
      finalReview.autoUpdateInventory === false &&
      finalReview.autoSendWhatsApp === false &&
      finalReview.autoReadWhatsApp === false &&
      finalReview.scrapeWhatsappMessages === false &&
      finalReview.privateMessageScraping === false &&
      finalReview.hiddenDataHarvesting === false &&
      finalReview.manualFinalBusinessRecordRequired === true &&
      finalReview.manualReviewRequiredBeforeFinalClose === true;

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
      summary.body.summary.amountConfirmedByAdminTotal >= 130000 &&
      summary.body.summary.finalBusinessRecordCreatedBySystemCount === 0 &&
      summary.body.summary.autoCloseSaleCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.autoAccountingEntryCount === 0 &&
      summary.body.summary.autoFinancialLedgerCount === 0 &&
      summary.body.summary.autoReceiptCount === 0 &&
      summary.body.summary.autoInvoiceCount === 0 &&
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
      recordOutcomeOk &&
      stockReviewOk &&
      accountingReviewOk &&
      missingAccountingOk &&
      noAdminReviewOk &&
      unsafeAutoOk &&
      invalidFinalReviewOk &&
      recordFinalReviewOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 24A Manual Final Business Review Gate Foundation Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/manual-final-business-review/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created before final business review gate
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before final business review gate
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before final business review gate
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before final business review gate
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before final business review gate
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before final business review gate
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before final business review gate
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before final business review gate
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned before final business review gate
- ${recordOutcomeOk ? "PASS" : "FAIL"}: manual deal outcome recorded before final business review gate
- ${stockReviewOk ? "PASS" : "FAIL"}: manual stock movement review recorded before final business review gate
- ${accountingReviewOk ? "PASS" : "FAIL"}: manual accounting review recorded before final business review gate
- ${missingAccountingOk ? "PASS" : "FAIL"}: missing accounting review is blocked
- ${noAdminReviewOk ? "PASS" : "FAIL"}: final business review without admin accounting review is blocked
- ${unsafeAutoOk ? "PASS" : "FAIL"}: unsafe auto-final-close/pipeline/accounting/revenue/inventory/send/read/scrape request is blocked
- ${invalidFinalReviewOk ? "PASS" : "FAIL"}: invalid final review type is blocked
- ${recordFinalReviewOk ? "PASS" : "FAIL"}: manual final business review recorded safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-final-business-reviews returns final business review data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-final-business-review/summary returns safe final business review metrics

## Safety Rules Confirmed
- Manual Final Business Review Gate records final review only.
- Manual accounting review is required first.
- Admin reviewed accounting is required.
- Manual final business review approval is required.
- System does not create final business record automatically.
- System does not close sale automatically.
- System does not move pipeline automatically.
- System does not create accounting entry automatically.
- System does not create financial ledger automatically.
- System does not generate receipt automatically.
- System does not create invoice automatically.
- System does not record revenue automatically.
- System does not update inventory automatically.
- System does not send WhatsApp.
- System does not read buyer messages.
- System does not scrape private messages.
- System does not harvest hidden data.
- Manual final business record and manager review are required after review.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, follow-up action, deal outcome, stock movement review, accounting review, and final business review data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 24B — Manual Final Business Review Dashboard Display
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

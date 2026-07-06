const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3083;
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
  "manual-accounting-reviews.json"
];

const originals = {};
for (const file of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", file);
  originals[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version23a-manual-accounting-review-gate-smoke-test-report.md");

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
    const preview = await request("/api/manual-accounting-review/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: "Manual Accounting Review Test",
        phone: "08242424242",
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
        supplierOrShelf: "Ladipo shelf U21",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before manual accounting review."
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
        matchedPartNumber: "ALT-1ZZ-ACCOUNTING",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before manual accounting review."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before manual accounting review."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 120000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before manual accounting review."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before manual accounting review."
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
        note: "Admin manually sent quote before manual accounting review."
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
        amountActuallyReceived: 120000,
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
        shelfOrSupplier: "Ladipo shelf U21",
        inventoryItemId: "manual_inventory_item_accounting_test",
        reviewNote: "Admin reviewed deal outcome. Manual stock deduction is approved for human inventory update only.",
        reviewedBy: "master_admin"
      })
    });

    const stockMovementReviewId = recordStockReview.body && recordStockReview.body.stockMovementReview ? recordStockReview.body.stockMovementReview.id : "missing-stock-review-id";

    const missingStockReview = await request("/api/manual-accounting-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockMovementReviewId: "missing_stock_movement_review_id",
        adminReviewedStockMovement: true,
        manualAccountingReviewApproved: true,
        reviewType: "payment_received_review",
        accountingAction: "record_manual_cash_sale",
        reviewStatus: "approved_for_manual_accounting_entry",
        amountExpected: 120000,
        amountConfirmedByAdmin: 120000,
        paymentMethodReviewed: "cash_manual",
        accountingNote: "Missing stock movement review test.",
        reviewedBy: "master_admin"
      })
    });

    const noAdminReview = await request("/api/manual-accounting-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockMovementReviewId,
        manualAccountingReviewApproved: true,
        reviewType: "payment_received_review",
        accountingAction: "record_manual_cash_sale",
        reviewStatus: "approved_for_manual_accounting_entry",
        amountExpected: 120000,
        amountConfirmedByAdmin: 120000,
        paymentMethodReviewed: "cash_manual",
        accountingNote: "Admin review flag missing.",
        reviewedBy: "master_admin"
      })
    });

    const unsafeAuto = await request("/api/manual-accounting-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockMovementReviewId,
        adminReviewedStockMovement: true,
        manualAccountingReviewApproved: true,
        reviewType: "payment_received_review",
        accountingAction: "record_manual_cash_sale",
        reviewStatus: "approved_for_manual_accounting_entry",
        amountExpected: 120000,
        amountConfirmedByAdmin: 120000,
        paymentMethodReviewed: "cash_manual",
        accountingNote: "Unsafe accounting automation test.",
        autoCreateAccountingEntry: true,
        autoCreateFinancialLedgerEntry: true,
        autoVerifyPayment: true,
        collectPaymentAutomatically: true,
        autoGenerateReceipt: true,
        autoSendReceipt: true,
        autoCreateInvoice: true,
        autoUpdateRevenue: true,
        autoMovePipelineStage: true,
        autoUpdateInventory: true,
        autoSendWhatsApp: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        privateMessageScraping: true,
        hiddenDataHarvesting: true
      })
    });

    const invalidReview = await request("/api/manual-accounting-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockMovementReviewId,
        adminReviewedStockMovement: true,
        manualAccountingReviewApproved: true,
        reviewType: "auto_accounting_entry",
        accountingAction: "record_manual_cash_sale",
        reviewStatus: "approved_for_manual_accounting_entry",
        amountExpected: 120000,
        amountConfirmedByAdmin: 120000,
        paymentMethodReviewed: "cash_manual",
        accountingNote: "Invalid review type test.",
        reviewedBy: "master_admin"
      })
    });

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
        amountExpected: 120000,
        amountConfirmedByAdmin: 120000,
        paymentMethodReviewed: "cash_manual",
        transactionReferenceManual: "cash-paid-to-admin",
        receiptNumberManual: "manual-receipt-to-be-written",
        accountingNote: "Admin manually confirmed cash payment. Manual accounting entry and manual receipt are required outside the system.",
        reviewedBy: "master_admin"
      })
    });

    const list = await request("/api/manual-accounting-reviews");
    const summary = await request("/api/manual-accounting-review/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Manual Accounting Review Gate Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("records accounting review only")) &&
      preview.body.rules.some(rule => rule.includes("System does not create accounting entry automatically")) &&
      Array.isArray(preview.body.allowedReviewTypes) &&
      preview.body.allowedReviewTypes.includes("payment_received_review");

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

    const missingStockReviewOk = missingStockReview.status === 404 && missingStockReview.body && Array.isArray(missingStockReview.body.errors);
    const noAdminReviewOk = noAdminReview.status === 400 && noAdminReview.body && Array.isArray(noAdminReview.body.errors);
    const unsafeAutoOk = unsafeAuto.status === 400 && unsafeAuto.body && Array.isArray(unsafeAuto.body.errors);
    const invalidReviewOk = invalidReview.status === 400 && invalidReview.body && Array.isArray(invalidReview.body.errors);

    const accountingReview = recordAccounting.body && recordAccounting.body.accountingReview;

    const recordAccountingOk =
      recordAccounting.status === 201 &&
      accountingReview &&
      accountingReview.stockMovementReviewId === stockMovementReviewId &&
      accountingReview.leadId === leadId &&
      accountingReview.reviewType === "payment_received_review" &&
      accountingReview.accountingAction === "record_manual_cash_sale" &&
      accountingReview.reviewStatus === "approved_for_manual_accounting_entry" &&
      accountingReview.amountExpected === 120000 &&
      accountingReview.amountConfirmedByAdmin === 120000 &&
      accountingReview.adminReviewedStockMovement === true &&
      accountingReview.manualAccountingReviewApproved === true &&
      accountingReview.manualAccountingReviewOnly === true &&
      accountingReview.accountingReviewGateOnly === true &&
      accountingReview.accountingEntryPreparedOnly === true &&
      accountingReview.accountingEntryCreatedBySystem === false &&
      accountingReview.autoCreateAccountingEntry === false &&
      accountingReview.financialLedgerEntryCreatedBySystem === false &&
      accountingReview.autoCreateFinancialLedgerEntry === false &&
      accountingReview.paymentVerifiedBySystem === false &&
      accountingReview.autoVerifyPayment === false &&
      accountingReview.collectPaymentAutomatically === false &&
      accountingReview.receiptGeneratedBySystem === false &&
      accountingReview.autoGenerateReceipt === false &&
      accountingReview.receiptSentAutomatically === false &&
      accountingReview.invoiceCreatedBySystem === false &&
      accountingReview.revenueRecordedBySystem === false &&
      accountingReview.autoMovePipelineStage === false &&
      accountingReview.autoUpdateInventory === false &&
      accountingReview.autoSendWhatsApp === false &&
      accountingReview.autoReadWhatsApp === false &&
      accountingReview.scrapeWhatsappMessages === false &&
      accountingReview.privateMessageScraping === false &&
      accountingReview.hiddenDataHarvesting === false &&
      accountingReview.manualAccountingEntryRequired === true &&
      accountingReview.manualPaymentVerificationRequired === true &&
      accountingReview.manualReceiptRequired === true &&
      accountingReview.manualFinancialLedgerEntryRequired === true;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.accountingReviews) &&
      list.body.accountingReviews.some(item =>
        item.stockMovementReviewId === stockMovementReviewId &&
        item.reviewType === "payment_received_review" &&
        item.manualAccountingReviewOnly === true &&
        item.accountingEntryCreatedBySystem === false &&
        item.autoCreateAccountingEntry === false &&
        item.autoGenerateReceipt === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalManualAccountingReviews >= 1 &&
      summary.body.summary.manualAccountingReviewOnlyCount >= 1 &&
      summary.body.summary.accountingEntryPreparedOnlyCount >= 1 &&
      summary.body.summary.paymentReceivedReviewCount >= 1 &&
      summary.body.summary.approvedForManualAccountingEntryCount >= 1 &&
      summary.body.summary.amountConfirmedByAdminTotal >= 120000 &&
      summary.body.summary.autoAccountingEntryCount === 0 &&
      summary.body.summary.autoFinancialLedgerCount === 0 &&
      summary.body.summary.autoPaymentVerificationCount === 0 &&
      summary.body.summary.autoReceiptCount === 0 &&
      summary.body.summary.autoInvoiceCount === 0 &&
      summary.body.summary.autoRevenueCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.autoInventoryUpdateCount === 0 &&
      summary.body.summary.scrapingCount === 0 &&
      summary.body.summary.autoReadWhatsAppCount === 0 &&
      summary.body.summary.safety.manualAccountingReviewGateOnly === true &&
      summary.body.summary.safety.manualAccountingReviewOnly === true &&
      summary.body.summary.safety.accountingEntryPreparedOnly === true &&
      summary.body.summary.safety.requiresManualStockMovementReview === true &&
      summary.body.summary.safety.requiresAdminReviewedStockMovement === true &&
      summary.body.summary.safety.requiresManualAccountingReviewApproval === true &&
      summary.body.summary.safety.systemDoesNotCreateAccountingEntry === true &&
      summary.body.summary.safety.systemDoesNotCreateFinancialLedger === true &&
      summary.body.summary.safety.systemDoesNotVerifyPayment === true &&
      summary.body.summary.safety.systemDoesNotGenerateReceipt === true &&
      summary.body.summary.safety.systemDoesNotCreateInvoice === true &&
      summary.body.summary.safety.systemDoesNotRecordRevenue === true &&
      summary.body.summary.safety.systemDoesNotUpdateInventory === true &&
      summary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.summary.safety.hiddenDataHarvesting === false &&
      summary.body.summary.safety.autoCreateAccountingEntry === false &&
      summary.body.summary.safety.autoCreateFinancialLedgerEntry === false &&
      summary.body.summary.safety.autoVerifyPayment === false &&
      summary.body.summary.safety.autoGenerateReceipt === false &&
      summary.body.summary.safety.autoCreateInvoice === false &&
      summary.body.summary.safety.autoUpdateRevenue === false &&
      summary.body.summary.safety.autoUpdateInventory === false &&
      summary.body.summary.safety.manualAccountingEntryRequired === true &&
      summary.body.summary.safety.manualPaymentVerificationRequired === true &&
      summary.body.summary.safety.manualReceiptRequired === true &&
      summary.body.summary.safety.manualFinancialLedgerEntryRequired === true;

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
      missingStockReviewOk &&
      noAdminReviewOk &&
      unsafeAutoOk &&
      invalidReviewOk &&
      recordAccountingOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 23A Manual Accounting Review Gate Foundation Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/manual-accounting-review/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created before manual accounting review gate
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before manual accounting review gate
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before manual accounting review gate
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before manual accounting review gate
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before manual accounting review gate
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before manual accounting review gate
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before manual accounting review gate
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before manual accounting review gate
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned before manual accounting review gate
- ${recordOutcomeOk ? "PASS" : "FAIL"}: manual deal outcome recorded before manual accounting review gate
- ${stockReviewOk ? "PASS" : "FAIL"}: manual stock movement review recorded before manual accounting review gate
- ${missingStockReviewOk ? "PASS" : "FAIL"}: missing stock movement review is blocked
- ${noAdminReviewOk ? "PASS" : "FAIL"}: accounting review without admin stock movement review is blocked
- ${unsafeAutoOk ? "PASS" : "FAIL"}: unsafe auto-accounting/payment/receipt/invoice/revenue/pipeline/inventory/send/read/scrape request is blocked
- ${invalidReviewOk ? "PASS" : "FAIL"}: invalid accounting review type is blocked
- ${recordAccountingOk ? "PASS" : "FAIL"}: manual accounting review recorded safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-accounting-reviews returns accounting review data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-accounting-review/summary returns safe accounting review metrics

## Safety Rules Confirmed
- Manual Accounting Review Gate records accounting review only.
- Manual stock movement review is required first.
- Admin reviewed stock movement is required.
- Manual accounting review approval is required.
- System does not create accounting entry automatically.
- System does not create financial ledger automatically.
- System does not verify payment automatically.
- System does not collect payment automatically.
- System does not generate receipt automatically.
- System does not create invoice automatically.
- System does not record revenue automatically.
- System does not move pipeline automatically.
- System does not update inventory automatically.
- System does not send WhatsApp.
- System does not read buyer messages.
- System does not scrape private messages.
- System does not harvest hidden data.
- Manual accounting entry, payment verification, receipt, and financial ledger entry are required after review.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, follow-up action, deal outcome, stock movement review, and accounting review data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 23B — Manual Accounting Review Dashboard Display
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

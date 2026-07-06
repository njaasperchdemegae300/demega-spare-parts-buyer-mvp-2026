const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3084;
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

const reportPath = path.join(ROOT, "reports", "version23b-manual-accounting-review-dashboard-smoke-test-report.md");

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
        buyerName: "Manual Accounting Dashboard Test",
        phone: "08252525252",
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
        supplierOrShelf: "Ladipo shelf V22",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before manual accounting dashboard."
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
        matchedPartNumber: "ALT-1ZZ-ACCOUNTING-DASH",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before manual accounting dashboard."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before manual accounting dashboard."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 125000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before manual accounting dashboard."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before manual accounting dashboard."
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
        note: "Admin manually sent quote before manual accounting dashboard."
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
        amountActuallyReceived: 125000,
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
        shelfOrSupplier: "Ladipo shelf V22",
        inventoryItemId: "manual_inventory_item_accounting_dashboard_test",
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
        amountExpected: 125000,
        amountConfirmedByAdmin: 125000,
        paymentMethodReviewed: "cash_manual",
        transactionReferenceManual: "cash-paid-to-admin-dashboard",
        receiptNumberManual: "manual-receipt-to-be-written-dashboard",
        accountingNote: "Admin manually confirmed cash payment. Manual accounting entry and manual receipt are required outside the system.",
        reviewedBy: "master_admin"
      })
    });

    const page = await request("/manual-accounting-review");
    const aliasPage = await request("/manual-accounting-reviews");
    const list = await request("/api/manual-accounting-reviews");
    const summary = await request("/api/manual-accounting-review/summary");

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

    const accountingReview = recordAccounting.body && recordAccounting.body.accountingReview;

    const recordAccountingOk =
      recordAccounting.status === 201 &&
      accountingReview &&
      accountingReview.stockMovementReviewId === stockMovementReviewId &&
      accountingReview.leadId === leadId &&
      accountingReview.reviewType === "payment_received_review" &&
      accountingReview.accountingAction === "record_manual_cash_sale" &&
      accountingReview.reviewStatus === "approved_for_manual_accounting_entry" &&
      accountingReview.amountExpected === 125000 &&
      accountingReview.amountConfirmedByAdmin === 125000 &&
      accountingReview.manualAccountingReviewOnly === true &&
      accountingReview.accountingReviewGateOnly === true &&
      accountingReview.accountingEntryPreparedOnly === true &&
      accountingReview.accountingEntryCreatedBySystem === false &&
      accountingReview.autoCreateAccountingEntry === false &&
      accountingReview.autoCreateFinancialLedgerEntry === false &&
      accountingReview.autoVerifyPayment === false &&
      accountingReview.autoGenerateReceipt === false &&
      accountingReview.autoCreateInvoice === false &&
      accountingReview.autoUpdateRevenue === false &&
      accountingReview.autoMovePipelineStage === false &&
      accountingReview.autoUpdateInventory === false &&
      accountingReview.autoSendWhatsApp === false &&
      accountingReview.autoReadWhatsApp === false &&
      accountingReview.hiddenDataHarvesting === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Manual Accounting Review Dashboard") &&
      page.text.includes("Manual Accounting Review Records") &&
      page.text.includes("Manual accounting review only") &&
      page.text.includes("Accounting entry prepared only") &&
      page.text.includes("Manual stock movement review required") &&
      page.text.includes("Admin reviewed stock movement required") &&
      page.text.includes("Manual accounting approval required") &&
      page.text.includes("No automatic accounting entry") &&
      page.text.includes("No automatic financial ledger") &&
      page.text.includes("No automatic payment verification") &&
      page.text.includes("No automatic receipt") &&
      page.text.includes("No automatic invoice") &&
      page.text.includes("No automatic revenue recording") &&
      page.text.includes("accountingRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Manual Accounting Review Dashboard");

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
      summary.body.summary.amountConfirmedByAdminTotal >= 125000 &&
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

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoCreateAccountingEntry = true") &&
      !page.text.includes("createAccountingEntryAutomatically = true") &&
      !page.text.includes("accountingEntryCreatedBySystem = true") &&
      !page.text.includes("autoCreateFinancialLedgerEntry = true") &&
      !page.text.includes("financialLedgerEntryCreatedBySystem = true") &&
      !page.text.includes("autoVerifyPayment = true") &&
      !page.text.includes("verifyPaymentAutomatically = true") &&
      !page.text.includes("collectPaymentAutomatically = true") &&
      !page.text.includes("autoGenerateReceipt = true") &&
      !page.text.includes("receiptGeneratedBySystem = true") &&
      !page.text.includes("receiptSentAutomatically = true") &&
      !page.text.includes("autoCreateInvoice = true") &&
      !page.text.includes("invoiceCreatedBySystem = true") &&
      !page.text.includes("autoUpdateRevenue = true") &&
      !page.text.includes("revenueRecordedBySystem = true") &&
      !page.text.includes("autoMovePipelineStage = true") &&
      !page.text.includes("autoUpdateInventory = true") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/manual-accounting-review/record"');

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
      recordAccountingOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 23B Manual Accounting Review Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created before manual accounting dashboard
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before manual accounting dashboard
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before manual accounting dashboard
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before manual accounting dashboard
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before manual accounting dashboard
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before manual accounting dashboard
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before manual accounting dashboard
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before manual accounting dashboard
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned before manual accounting dashboard
- ${recordOutcomeOk ? "PASS" : "FAIL"}: manual deal outcome recorded before manual accounting dashboard
- ${stockReviewOk ? "PASS" : "FAIL"}: manual stock movement review recorded before manual accounting dashboard
- ${recordAccountingOk ? "PASS" : "FAIL"}: manual accounting review recorded before dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /manual-accounting-review returns safe accounting review dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /manual-accounting-reviews alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-accounting-reviews returns accounting review data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-accounting-review/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Manual Accounting Review dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays manual accounting review records only.
- Dashboard does not create accounting entries automatically.
- Dashboard does not create financial ledger entries automatically.
- Dashboard does not verify payment automatically.
- Dashboard does not collect payment automatically.
- Dashboard does not generate receipts automatically.
- Dashboard does not create invoices automatically.
- Dashboard does not record revenue automatically.
- Dashboard does not move pipeline automatically.
- Dashboard does not update inventory automatically.
- Dashboard does not send WhatsApp.
- Dashboard does not read buyer messages.
- Dashboard does not scrape private messages.
- Dashboard does not harvest hidden data.
- Manual stock movement review is required before accounting review.
- Admin review and manual accounting approval are required.
- Manual accounting entry, payment verification, receipt, and financial ledger entry are required after review.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, follow-up action, deal outcome, stock movement review, and accounting review data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 23C — Admin Hub Link Manual Accounting Review Gate
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

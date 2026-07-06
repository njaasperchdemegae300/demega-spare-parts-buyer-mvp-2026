const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3080;
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
  "manual-stock-movement-reviews.json"
];

const originals = {};
for (const file of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", file);
  originals[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version22a-manual-stock-movement-review-gate-smoke-test-report.md");

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
    const preview = await request("/api/manual-stock-movement-review/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: "Manual Stock Movement Review Test",
        phone: "08222222222",
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
        supplierOrShelf: "Ladipo shelf S19",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before manual stock movement review."
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
        matchedPartNumber: "ALT-1ZZ-STOCK-REVIEW",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before manual stock movement review."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before manual stock movement review."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 110000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before manual stock movement review."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before manual stock movement review."
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
        note: "Admin manually sent quote before manual stock movement review."
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
        amountActuallyReceived: 110000,
        outcomeNote: "Admin manually completed pickup and received cash outside the system.",
        recordedBy: "master_admin"
      })
    });

    const dealOutcomeId = recordOutcome.body && recordOutcome.body.dealOutcome ? recordOutcome.body.dealOutcome.id : "missing-deal-outcome-id";

    const missingOutcome = await request("/api/manual-stock-movement-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealOutcomeId: "missing_deal_outcome_id",
        adminReviewedDealOutcome: true,
        manualStockMovementReviewApproved: true,
        movementType: "stock_deduction_review",
        movementReason: "deal_won_manual",
        reviewStatus: "approved_for_manual_stock_update",
        quantityToReview: 1,
        reviewNote: "Missing deal outcome test.",
        reviewedBy: "master_admin"
      })
    });

    const noAdminReview = await request("/api/manual-stock-movement-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealOutcomeId,
        manualStockMovementReviewApproved: true,
        movementType: "stock_deduction_review",
        movementReason: "deal_won_manual",
        reviewStatus: "approved_for_manual_stock_update",
        quantityToReview: 1,
        reviewNote: "Admin review flag missing.",
        reviewedBy: "master_admin"
      })
    });

    const unsafeAuto = await request("/api/manual-stock-movement-review/record", {
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
        reviewNote: "Unsafe automation test.",
        autoUpdateInventory: true,
        autoReduceStock: true,
        autoReserveStock: true,
        autoReleaseStock: true,
        autoCreateInventoryEvent: true,
        autoCreateStockLedgerEntry: true,
        autoSendWhatsApp: true,
        collectPaymentAutomatically: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        privateMessageScraping: true,
        hiddenDataHarvesting: true
      })
    });

    const invalidMovement = await request("/api/manual-stock-movement-review/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealOutcomeId,
        adminReviewedDealOutcome: true,
        manualStockMovementReviewApproved: true,
        movementType: "auto_deduct_stock",
        movementReason: "deal_won_manual",
        reviewStatus: "approved_for_manual_stock_update",
        quantityToReview: 1,
        reviewNote: "Invalid movement type test.",
        reviewedBy: "master_admin"
      })
    });

    const recordReview = await request("/api/manual-stock-movement-review/record", {
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
        shelfOrSupplier: "Ladipo shelf S19",
        inventoryItemId: "manual_inventory_item_test",
        reviewNote: "Admin reviewed deal outcome. Manual stock deduction is approved for human inventory update only.",
        reviewedBy: "master_admin"
      })
    });

    const list = await request("/api/manual-stock-movement-reviews");
    const summary = await request("/api/manual-stock-movement-review/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Manual Stock Movement Review Gate Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("records review only")) &&
      preview.body.rules.some(rule => rule.includes("System does not update inventory")) &&
      Array.isArray(preview.body.allowedMovementTypes) &&
      preview.body.allowedMovementTypes.includes("stock_deduction_review");

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

    const missingOutcomeOk = missingOutcome.status === 404 && missingOutcome.body && Array.isArray(missingOutcome.body.errors);
    const noAdminReviewOk = noAdminReview.status === 400 && noAdminReview.body && Array.isArray(noAdminReview.body.errors);
    const unsafeAutoOk = unsafeAuto.status === 400 && unsafeAuto.body && Array.isArray(unsafeAuto.body.errors);
    const invalidMovementOk = invalidMovement.status === 400 && invalidMovement.body && Array.isArray(invalidMovement.body.errors);

    const review = recordReview.body && recordReview.body.stockMovementReview;

    const recordReviewOk =
      recordReview.status === 201 &&
      review &&
      review.dealOutcomeId === dealOutcomeId &&
      review.leadId === leadId &&
      review.movementType === "stock_deduction_review" &&
      review.movementReason === "deal_won_manual" &&
      review.reviewStatus === "approved_for_manual_stock_update" &&
      review.quantityToReview === 1 &&
      review.adminReviewedDealOutcome === true &&
      review.manualStockMovementReviewApproved === true &&
      review.manualStockMovementReviewOnly === true &&
      review.stockMovementReviewGateOnly === true &&
      review.stockUpdatePreparedOnly === true &&
      review.inventoryChangedBySystem === false &&
      review.stockReducedBySystem === false &&
      review.stockReservedBySystem === false &&
      review.stockReleasedBySystem === false &&
      review.autoUpdateInventory === false &&
      review.autoReduceStock === false &&
      review.autoReserveStock === false &&
      review.autoReleaseStock === false &&
      review.autoCreateInventoryEvent === false &&
      review.autoCreateStockLedgerEntry === false &&
      review.autoSendWhatsApp === false &&
      review.collectPaymentAutomatically === false &&
      review.autoReadWhatsApp === false &&
      review.scrapeWhatsappMessages === false &&
      review.privateMessageScraping === false &&
      review.hiddenDataHarvesting === false &&
      review.manualInventoryUpdateRequired === true &&
      review.manualLedgerEntryRequired === true &&
      review.manualReviewRequiredBeforeInventoryChange === true;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.stockMovementReviews) &&
      list.body.stockMovementReviews.some(item =>
        item.dealOutcomeId === dealOutcomeId &&
        item.movementType === "stock_deduction_review" &&
        item.manualStockMovementReviewOnly === true &&
        item.inventoryChangedBySystem === false &&
        item.autoUpdateInventory === false &&
        item.autoReduceStock === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalManualStockMovementReviews >= 1 &&
      summary.body.summary.manualStockMovementReviewOnlyCount >= 1 &&
      summary.body.summary.stockUpdatePreparedOnlyCount >= 1 &&
      summary.body.summary.stockDeductionReviewCount >= 1 &&
      summary.body.summary.approvedForManualStockUpdateCount >= 1 &&
      summary.body.summary.inventoryChangedBySystemCount === 0 &&
      summary.body.summary.autoUpdateInventoryCount === 0 &&
      summary.body.summary.autoReduceStockCount === 0 &&
      summary.body.summary.autoReserveStockCount === 0 &&
      summary.body.summary.autoReleaseStockCount === 0 &&
      summary.body.summary.autoLedgerCount === 0 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.autoPaymentCount === 0 &&
      summary.body.summary.scrapingCount === 0 &&
      summary.body.summary.autoReadWhatsAppCount === 0 &&
      summary.body.summary.safety.manualStockMovementReviewGateOnly === true &&
      summary.body.summary.safety.manualStockMovementReviewOnly === true &&
      summary.body.summary.safety.stockUpdatePreparedOnly === true &&
      summary.body.summary.safety.requiresManualDealOutcome === true &&
      summary.body.summary.safety.requiresAdminReviewedDealOutcome === true &&
      summary.body.summary.safety.requiresManualStockMovementReviewApproval === true &&
      summary.body.summary.safety.systemDoesNotUpdateInventory === true &&
      summary.body.summary.safety.systemDoesNotReduceStock === true &&
      summary.body.summary.safety.systemDoesNotReserveStock === true &&
      summary.body.summary.safety.systemDoesNotReleaseStock === true &&
      summary.body.summary.safety.systemDoesNotCreateStockLedger === true &&
      summary.body.summary.safety.systemDoesNotHandlePayment === true &&
      summary.body.summary.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.summary.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.summary.safety.hiddenDataHarvesting === false &&
      summary.body.summary.safety.autoUpdateInventory === false &&
      summary.body.summary.safety.autoReduceStock === false &&
      summary.body.summary.safety.autoReserveStock === false &&
      summary.body.summary.safety.autoReleaseStock === false &&
      summary.body.summary.safety.autoCreateInventoryEvent === false &&
      summary.body.summary.safety.autoCreateStockLedgerEntry === false &&
      summary.body.summary.safety.manualInventoryUpdateRequired === true &&
      summary.body.summary.safety.manualLedgerEntryRequired === true &&
      summary.body.summary.safety.manualReviewRequiredBeforeInventoryChange === true;

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
      missingOutcomeOk &&
      noAdminReviewOk &&
      unsafeAutoOk &&
      invalidMovementOk &&
      recordReviewOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 22A Manual Stock Movement Review Gate Foundation Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/manual-stock-movement-review/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created before stock movement review gate
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before stock movement review gate
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before stock movement review gate
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before stock movement review gate
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before stock movement review gate
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before stock movement review gate
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before stock movement review gate
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before stock movement review gate
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned before stock movement review gate
- ${recordOutcomeOk ? "PASS" : "FAIL"}: manual deal outcome recorded before stock movement review gate
- ${missingOutcomeOk ? "PASS" : "FAIL"}: missing deal outcome is blocked
- ${noAdminReviewOk ? "PASS" : "FAIL"}: stock movement review without admin deal-outcome review is blocked
- ${unsafeAutoOk ? "PASS" : "FAIL"}: unsafe auto-inventory/stock/ledger/payment/send/read/scrape request is blocked
- ${invalidMovementOk ? "PASS" : "FAIL"}: invalid stock movement type is blocked
- ${recordReviewOk ? "PASS" : "FAIL"}: manual stock movement review recorded safely
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-stock-movement-reviews returns review data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-stock-movement-review/summary returns safe review metrics

## Safety Rules Confirmed
- Manual Stock Movement Review Gate records review only.
- Manual deal outcome is required first.
- Admin reviewed deal outcome is required.
- Manual stock movement review approval is required.
- System does not update inventory automatically.
- System does not reduce stock automatically.
- System does not reserve stock automatically.
- System does not release stock automatically.
- System does not create stock ledger automatically.
- System does not handle payment.
- System does not send WhatsApp.
- System does not read buyer messages.
- System does not scrape private messages.
- System does not harvest hidden data.
- Manual inventory update and manual ledger entry are required after review.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, follow-up action, deal outcome, and stock movement review data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 22B — Manual Stock Movement Review Dashboard Display
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

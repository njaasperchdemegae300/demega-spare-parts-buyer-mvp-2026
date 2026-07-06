const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3081;
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

const reportPath = path.join(ROOT, "reports", "version22b-manual-stock-movement-review-dashboard-smoke-test-report.md");

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
        buyerName: "Manual Stock Movement Dashboard Test",
        phone: "08232323232",
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
        supplierOrShelf: "Ladipo shelf T20",
        confirmationMethod: "physical_check",
        confirmedBy: "master_admin",
        note: "Stock confirmed before manual stock movement dashboard."
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
        matchedPartNumber: "ALT-1ZZ-STOCK-DASH",
        buyerPhotoChecked: true,
        socketOrPlugMatched: true,
        confirmedBy: "master_admin",
        note: "Compatibility confirmed before manual stock movement dashboard."
      })
    });

    const createEligibility = await request("/api/quote-eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        checkedBy: "master_admin",
        note: "Eligibility confirmed before manual stock movement dashboard."
      })
    });

    const createDraft = await request("/api/manual-quote-draft/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        quoteAmount: 115000,
        currency: "NGN",
        condition: "used_original",
        deliveryNote: "Pickup at Ladipo or delivery can be arranged",
        warrantyNote: "Testing before pickup",
        trustNote: "Please confirm if you want us to reserve it.",
        createdBy: "master_admin",
        note: "Draft before manual stock movement dashboard."
      })
    });

    const draftId = createDraft.body && createDraft.body.draft ? createDraft.body.draft.id : "missing-draft-id";

    const prepareCopy = await request("/api/manual-quote-copy/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId,
        preparedBy: "master_admin",
        note: "Prepared copy before manual stock movement dashboard."
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
        note: "Admin manually sent quote before manual stock movement dashboard."
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
        amountActuallyReceived: 115000,
        outcomeNote: "Admin manually completed pickup and received cash outside the system.",
        recordedBy: "master_admin"
      })
    });

    const dealOutcomeId = recordOutcome.body && recordOutcome.body.dealOutcome ? recordOutcome.body.dealOutcome.id : "missing-deal-outcome-id";

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
        shelfOrSupplier: "Ladipo shelf T20",
        inventoryItemId: "manual_inventory_item_dashboard_test",
        reviewNote: "Admin reviewed deal outcome. Manual stock deduction is approved for human inventory update only.",
        reviewedBy: "master_admin"
      })
    });

    const page = await request("/manual-stock-movement-review");
    const aliasPage = await request("/manual-stock-movement-reviews");
    const list = await request("/api/manual-stock-movement-reviews");
    const summary = await request("/api/manual-stock-movement-review/summary");

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

    const review = recordReview.body && recordReview.body.stockMovementReview;

    const recordReviewOk =
      recordReview.status === 201 &&
      review &&
      review.dealOutcomeId === dealOutcomeId &&
      review.leadId === leadId &&
      review.movementType === "stock_deduction_review" &&
      review.reviewStatus === "approved_for_manual_stock_update" &&
      review.manualStockMovementReviewOnly === true &&
      review.stockUpdatePreparedOnly === true &&
      review.inventoryChangedBySystem === false &&
      review.autoUpdateInventory === false &&
      review.autoReduceStock === false &&
      review.autoReserveStock === false &&
      review.autoCreateStockLedgerEntry === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Manual Stock Movement Review Dashboard") &&
      page.text.includes("Manual Stock Movement Review Records") &&
      page.text.includes("Manual stock movement review only") &&
      page.text.includes("Stock update prepared only") &&
      page.text.includes("Manual deal outcome required") &&
      page.text.includes("Admin reviewed deal outcome required") &&
      page.text.includes("Manual stock movement approval required") &&
      page.text.includes("System does not update inventory") &&
      page.text.includes("No automatic stock reduction") &&
      page.text.includes("No automatic stock reservation") &&
      page.text.includes("No automatic stock release") &&
      page.text.includes("No automatic stock ledger") &&
      page.text.includes("Manual inventory update required") &&
      page.text.includes("stockMovementRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Manual Stock Movement Review Dashboard");

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

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoUpdateInventory = true") &&
      !page.text.includes("updateInventoryAutomatically = true") &&
      !page.text.includes("inventoryChangedBySystem = true") &&
      !page.text.includes("autoReduceStock = true") &&
      !page.text.includes("stockReducedBySystem = true") &&
      !page.text.includes("autoReserveStock = true") &&
      !page.text.includes("stockReservedBySystem = true") &&
      !page.text.includes("autoReleaseStock = true") &&
      !page.text.includes("stockReleasedBySystem = true") &&
      !page.text.includes("autoCreateInventoryEvent = true") &&
      !page.text.includes("autoCreateStockLedgerEntry = true") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("collectPaymentAutomatically = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/manual-stock-movement-review/record"');

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
      recordReviewOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 22B Manual Stock Movement Review Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created before stock movement review dashboard
- ${createStockOk ? "PASS" : "FAIL"}: stock confirmation created before stock movement review dashboard
- ${createCompatibilityOk ? "PASS" : "FAIL"}: compatibility confirmation created before stock movement review dashboard
- ${createEligibilityOk ? "PASS" : "FAIL"}: final quote eligibility created before stock movement review dashboard
- ${createDraftOk ? "PASS" : "FAIL"}: safe manual quote draft created before stock movement review dashboard
- ${prepareCopyOk ? "PASS" : "FAIL"}: safe manual quote copy prepared before stock movement review dashboard
- ${confirmSentOk ? "PASS" : "FAIL"}: manual sent confirmation created before stock movement review dashboard
- ${recordReplyOk ? "PASS" : "FAIL"}: buyer reply recorded before stock movement review dashboard
- ${planActionOk ? "PASS" : "FAIL"}: buyer reply follow-up action planned before stock movement review dashboard
- ${recordOutcomeOk ? "PASS" : "FAIL"}: manual deal outcome recorded before stock movement review dashboard
- ${recordReviewOk ? "PASS" : "FAIL"}: manual stock movement review recorded before dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /manual-stock-movement-review returns safe stock movement review dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /manual-stock-movement-reviews alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/manual-stock-movement-reviews returns review data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/manual-stock-movement-review/summary returns safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Manual Stock Movement Review dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays manual stock movement review records only.
- Dashboard does not update inventory automatically.
- Dashboard does not reduce stock automatically.
- Dashboard does not reserve stock automatically.
- Dashboard does not release stock automatically.
- Dashboard does not create stock ledger automatically.
- Dashboard does not handle payment.
- Dashboard does not send WhatsApp.
- Dashboard does not read buyer messages.
- Dashboard does not scrape private messages.
- Dashboard does not harvest hidden data.
- Manual deal outcome is required before stock movement review.
- Admin review and manual stock movement approval are required.
- Manual inventory update and manual ledger entry are required after review.
- Test lead, stock confirmation, compatibility confirmation, quote eligibility, manual quote draft, copy action, sent confirmation, buyer reply, follow-up action, deal outcome, and stock movement review data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 22C — Admin Hub Link Manual Stock Movement Review Gate
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

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3120;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const dataFiles = [
  "assistant-sales-agent-test-runs.json",
  "internal-buyer-gate-readiness-runs.json",
  "controlled-buyer-gate-test-plans.json",
  "controlled-buyer-gate-manual-activation-approvals.json",
  "controlled-buyer-gate-activation-executions.json",
  "controlled-buyer-gate-lead-slots.json",
  "controlled-buyer-gate-manual-lead-reviews.json",
  "controlled-buyer-gate-manual-stock-checks.json",
  "controlled-buyer-gate-manual-compatibility-checks.json",
  "controlled-buyer-gate-final-quote-eligibilities.json",
  "controlled-buyer-gate-manual-quote-drafts.json"
];

const originalData = {};
for (const name of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", name);
  originalData[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version35a-controlled-buyer-gate-manual-quote-draft-smoke-test-report.md");

function safeWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function resetTestData() {
  for (const filePath of Object.keys(originalData)) safeWrite(filePath, "[]");
}

function restoreData() {
  for (const [filePath, value] of Object.entries(originalData)) safeWrite(filePath, value);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopProcess(child) {
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else child.kill("SIGTERM");
  } catch {}
}

async function request(route, options = {}) {
  const response = await fetch(`${BASE_URL}${route}`, options);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { status: response.status, text, body };
}

async function waitForHealth(child, logsRef) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (child.exitCode !== null) {
      logsRef.value += `\n[server-startup] server exited before health check. exitCode=${child.exitCode}`;
      return null;
    }

    try {
      const health = await request("/api/health");
      if (health.status === 200) return health;
    } catch (error) {
      logsRef.value += `\n[wait-for-health attempt ${attempt}] ${error.message}`;
    }

    await wait(1000);
  }

  return null;
}

function safeApprovalPayload() {
  return {
    approvedBy: "master_admin",
    approvalNote: "Approve controlled 15-lead manual test preparation only. Do not open gate.",
    approvalPhrase: "I_APPROVE_CONTROLLED_15_LEAD_MANUAL_TEST_PREPARATION_ONLY",
    adminReviewedPlan: true,
    adminReviewedSafety: true,
    adminConfirmedLeadLimit15: true,
    adminConfirmedWhatsAppInboundOnly: true,
    adminConfirmedManualReviewRequired: true,
    adminConfirmedManualReplyOnly: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoSpam: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true
  };
}

function safeExecutionPayload() {
  return {
    executedBy: "master_admin",
    executionNote: "Execute controlled 15-lead manual inbound gate only. Do not contact buyers or start outbound traffic.",
    executionPhrase: "I_EXECUTE_CONTROLLED_15_LEAD_MANUAL_INBOUND_GATE_ONLY",
    adminReviewedApproval: true,
    adminConfirmedSeparateExecutionGate: true,
    adminConfirmed15LeadLimit: true,
    adminConfirmedManualInboundOnly: true,
    adminConfirmedNoOutboundTraffic: true,
    adminConfirmedNoAutoContact: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true,
    adminConfirmedManualReviewBeforeBuyerContact: true
  };
}

function safeSlotPayload(index) {
  return {
    leadReference: `controlled-manual-quote-draft-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual quote draft test.",
    source: "whatsapp_click_to_chat_inbound",
    inboundBuyerInitiated: true,
    adminReviewedInboundSource: true,
    manualReviewRequired: true,
    manualReplyOnly: true,
    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    noPrivateDataScraping: true,
    noHiddenDataHarvesting: true,
    noQuoteBeforeStockConfirmation: true,
    noQuoteBeforeCompatibilityConfirmation: true,
    stockConfirmationRequiredBeforeQuote: true,
    compatibilityConfirmationRequiredBeforeQuote: true,
    leadSlotPhrase: "I_CONFIRM_INBOUND_LEAD_SLOT_ONLY_NO_AUTO_CONTACT",
    createdBy: "master_admin"
  };
}

function safeReviewPayload(slotNumber, decision) {
  return {
    slotNumber,
    reviewDecision: decision,
    reviewedBy: "master_admin",
    reviewNote: "Manual lead review before manual quote draft. No buyer contact. No quote sent.",
    reviewPhrase: "I_CONFIRM_MANUAL_LEAD_REVIEW_ONLY_NO_BUYER_CONTACT",
    adminReviewedLeadSlot: true,
    adminConfirmedBuyerInitiatedInbound: true,
    adminConfirmedSourceAllowed: true,
    adminConfirmedNoBuyerContactYet: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuotePrepared: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true,
    adminConfirmedManualStockCheckRequiredNext: true,
    adminConfirmedManualCompatibilityCheckRequiredLater: true
  };
}

function safeStockCheckPayload(slotNumber, stockDecision) {
  return {
    slotNumber,
    stockDecision,
    stockLocation: "Ladipo shop shelf",
    stockCondition: stockDecision === "STOCK_CONFIRMED_AVAILABLE" ? "available used original" : "pending supplier confirmation",
    stockNote: "Manual stock check before manual quote draft. No buyer contact. No quote sent. No inventory mutation.",
    checkedBy: "master_admin",
    stockCheckPhrase: "I_CONFIRM_MANUAL_STOCK_CHECK_ONLY_NO_QUOTE_NO_BUYER_CONTACT",
    adminReviewedManualLeadReview: true,
    adminPhysicallyCheckedStock: true,
    adminConfirmedStockStatusManually: true,
    adminConfirmedNoBuyerContactYet: true,
    adminConfirmedNoQuotePrepared: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedManualCompatibilityCheckRequiredNext: true,
    adminConfirmedQuoteBlockedUntilCompatibility: true
  };
}

function safeCompatibilityPayload(slotNumber, compatibilityDecision) {
  return {
    slotNumber,
    compatibilityDecision,
    compatibilityNote: "Manual compatibility before manual quote draft. No buyer contact. No quote sent. No price sent.",
    matchedPartDetail: "Toyota Corolla 2005 tested compatible detail pending final quote eligibility.",
    vehicleRequirement: "Toyota Corolla 2005 exact fit check",
    checkedBy: "master_admin",
    compatibilityCheckPhrase: "I_CONFIRM_MANUAL_COMPATIBILITY_CHECK_ONLY_NO_QUOTE_NO_BUYER_CONTACT",
    adminReviewedManualStockCheck: true,
    adminCheckedCompatibilityManually: true,
    adminConfirmedCompatibilityStatusManually: true,
    adminConfirmedNoBuyerContactYet: true,
    adminConfirmedNoQuotePrepared: true,
    adminConfirmedNoPriceIncluded: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedFinalQuoteEligibilityRequiredNext: true,
    adminConfirmedQuoteBlockedUntilFinalEligibility: true
  };
}

function safeFinalEligibilityPayload(slotNumber, eligibilityDecision) {
  return {
    slotNumber,
    eligibilityDecision,
    eligibilityNote: "Final quote eligibility before manual quote draft. No buyer contact. No quote sent.",
    quoteReadinessReason: "Stock and compatibility manually confirmed; eligible for next manual quote draft gate only.",
    managerReviewNote: "No manager override used in smoke test.",
    checkedBy: "master_admin",
    finalQuoteEligibilityPhrase: "I_CONFIRM_FINAL_QUOTE_ELIGIBILITY_ONLY_NO_QUOTE_NO_BUYER_CONTACT",
    adminReviewedManualCompatibilityCheck: true,
    adminConfirmedStockWasConfirmed: true,
    adminConfirmedCompatibilityWasConfirmed: true,
    adminConfirmedFinalEligibilityCheckedManually: true,
    adminConfirmedNoBuyerContactYet: true,
    adminConfirmedNoQuotePrepared: true,
    adminConfirmedNoPriceIncluded: true,
    adminConfirmedQuoteNotSent: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedManualQuoteDraftRequiredNext: true,
    adminConfirmedQuoteStillBlockedUntilDraftGate: true
  };
}

function safeManualQuoteDraftPayload(slotNumber, extra = {}) {
  return {
    slotNumber,
    quotedPartName: "Toyota Corolla 2005 kick starter",
    quotedCondition: "Used original, tested okay",
    quantity: 1,
    unitPrice: 45000,
    totalPrice: 45000,
    currency: "NGN",
    pickupOrDeliveryInfo: "Pickup at Ladipo shop or Lagos dispatch after confirmation.",
    paymentInstruction: "Payment after manual confirmation with admin.",
    warrantyOrReturnNote: "Confirm fitment before payment. Warranty/return based on shop policy.",
    quoteNote: "Manual quote draft test only. Do not send automatically.",
    checkedBy: "master_admin",
    manualQuoteDraftPhrase: "I_CONFIRM_MANUAL_QUOTE_DRAFT_ONLY_NO_SEND_NO_BUYER_CONTACT",
    adminReviewedFinalQuoteEligibility: true,
    adminConfirmedEligibleForManualQuoteDraft: true,
    adminEnteredQuoteManually: true,
    adminConfirmedPriceManually: true,
    adminConfirmedNoBuyerContactYet: true,
    adminConfirmedQuoteNotSent: true,
    adminConfirmedPriceNotSent: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedNoSaleClosed: true,
    adminConfirmedNoPipelineMove: true,
    adminConfirmedManualReviewBeforeSendingRequired: true,
    adminConfirmedManualSendConfirmationRequiredNext: true,
    ...extra
  };
}

async function main() {
  const logsRef = { value: "" };
  let child;

  resetTestData();

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logsRef.value += data.toString());
    child.stderr.on("data", data => logsRef.value += data.toString());

    const health = await waitForHealth(child, logsRef);

    if (!health) {
      const startupReport = `# Version 35A Controlled Buyer-Gate Manual Quote Draft Smoke Test Report

## Verdict
NEEDS FIX

## Failure
The smoke test could not reach the local server health route after waiting.

## Server Logs
\`\`\`txt
${logsRef.value || "No logs captured"}
\`\`\`
`;
      fs.writeFileSync(reportPath, startupReport, "utf8");
      console.log(startupReport);
      process.exitCode = 1;
      return;
    }

    const assistantRun = await request("/api/assistant-sales-agent-test-lab/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runBy: "master_admin" })
    });

    const guardianRun = await request("/api/internal-buyer-gate-readiness/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runBy: "master_admin" })
    });

    const planCreate = await request("/api/controlled-buyer-gate-test-plan/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planName: "Controlled 15-Lead Buyer-Gate Test Plan",
        leadLimit: 15,
        testSource: "whatsapp_click_to_chat_inbound",
        manualReviewRequired: true,
        manualReplyOnly: true,
        noAutoSend: true,
        noSpam: true,
        noPrivateDataScraping: true,
        noQuoteBeforeStockConfirmation: true,
        noQuoteBeforeCompatibilityConfirmation: true,
        createdBy: "master_admin"
      })
    });

    const approvalCreate = await request("/api/controlled-buyer-gate-manual-activation-approval/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeApprovalPayload())
    });

    const executionCreate = await request("/api/controlled-buyer-gate-activation-execution/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeExecutionPayload())
    });

    const slot1 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(1))
    });

    const slot2 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(2))
    });

    const slot3 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(3))
    });

    const slot4 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(4))
    });

    const review1 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(1, "ACCEPT_FOR_MANUAL_STOCK_CHECK"))
    });

    const review2 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(2, "REJECT_AS_NOT_READY"))
    });

    const review3 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(3, "ACCEPT_FOR_MANUAL_STOCK_CHECK"))
    });

    const review4 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(4, "ACCEPT_FOR_MANUAL_STOCK_CHECK"))
    });

    const stockCheck1 = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(1, "STOCK_CONFIRMED_AVAILABLE"))
    });

    const stockCheck3 = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(3, "STOCK_NEEDS_SUPPLIER_CONFIRMATION"))
    });

    const stockCheck4 = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(4, "STOCK_CONFIRMED_AVAILABLE"))
    });

    const compatibilityCheck1 = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(1, "COMPATIBILITY_CONFIRMED"))
    });

    const compatibilityCheck4 = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(4, "COMPATIBILITY_CONFIRMED"))
    });

    const finalEligibility1 = await request("/api/controlled-buyer-gate-final-quote-eligibility/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeFinalEligibilityPayload(1, "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT"))
    });

    const finalEligibility4 = await request("/api/controlled-buyer-gate-final-quote-eligibility/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeFinalEligibilityPayload(4, "NEEDS_MANAGER_REVIEW"))
    });

    const preview = await request("/api/controlled-buyer-gate-manual-quote-draft/preview");

    const unsafeDraft = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(1, {
        buyerContacted: true,
        autoContactBuyer: true,
        startOutboundTraffic: true,
        autoSendWhatsApp: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        hiddenDataHarvesting: true,
        quoteSentToBuyer: true,
        priceSentToBuyer: true,
        autoUpdateInventory: true,
        reserveStockAutomatically: true,
        reduceStockAutomatically: true,
        autoCreateAccountingEntry: true,
        autoCloseSale: true,
        autoMovePipelineStage: true
      }))
    });

    const safeDraft = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(1))
    });

    const managerReviewDraft = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(4))
    });

    const supplierStockDraft = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(3))
    });

    const rejectedReviewDraft = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(2))
    });

    const duplicateDraft = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(1))
    });

    const list = await request("/api/controlled-buyer-gate-manual-quote-drafts");
    const summary = await request("/api/controlled-buyer-gate-manual-quote-draft/summary");

    const draftRecord = safeDraft.body && safeDraft.body.record;

    const healthOk = health.status === 200;

    const assistantOk =
      assistantRun.status === 201 &&
      assistantRun.body &&
      assistantRun.body.run &&
      assistantRun.body.run.verdict === "APPROVED";

    const guardianOk =
      guardianRun.status === 201 &&
      guardianRun.body &&
      guardianRun.body.run &&
      guardianRun.body.run.verdict === "APPROVED";

    const planOk =
      planCreate.status === 201 &&
      planCreate.body &&
      planCreate.body.plan &&
      planCreate.body.plan.leadLimit === 15 &&
      planCreate.body.plan.testSource === "whatsapp_click_to_chat_inbound";

    const approvalOk =
      approvalCreate.status === 201 &&
      approvalCreate.body &&
      approvalCreate.body.approval &&
      approvalCreate.body.approval.approvalStatus === "APPROVED_NOT_ACTIVATED";

    const executionOk =
      executionCreate.status === 201 &&
      executionCreate.body &&
      executionCreate.body.execution &&
      executionCreate.body.execution.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY";

    const slotsOk =
      slot1.status === 201 &&
      slot2.status === 201 &&
      slot3.status === 201 &&
      slot4.status === 201 &&
      slot1.body.slot.buyerContacted === false &&
      slot1.body.slot.quotePrepared === false;

    const reviewsOk =
      review1.status === 201 &&
      review2.status === 201 &&
      review3.status === 201 &&
      review4.status === 201 &&
      review1.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review2.body.review.reviewDecision === "REJECT_AS_NOT_READY" &&
      review3.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review4.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review1.body.review.buyerContacted === false &&
      review1.body.review.quotePrepared === false;

    const stockChecksOk =
      stockCheck1.status === 201 &&
      stockCheck3.status === 201 &&
      stockCheck4.status === 201 &&
      stockCheck1.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
      stockCheck3.body.check.stockDecision === "STOCK_NEEDS_SUPPLIER_CONFIRMATION" &&
      stockCheck4.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
      stockCheck1.body.check.buyerContacted === false &&
      stockCheck1.body.check.quotePrepared === false &&
      stockCheck1.body.check.inventoryUpdated === false;

    const compatibilityChecksOk =
      compatibilityCheck1.status === 201 &&
      compatibilityCheck4.status === 201 &&
      compatibilityCheck1.body.check.compatibilityDecision === "COMPATIBILITY_CONFIRMED" &&
      compatibilityCheck4.body.check.compatibilityDecision === "COMPATIBILITY_CONFIRMED" &&
      compatibilityCheck1.body.check.buyerContacted === false &&
      compatibilityCheck1.body.check.quotePrepared === false &&
      compatibilityCheck1.body.check.priceIncluded === false &&
      compatibilityCheck1.body.check.inventoryUpdated === false;

    const finalEligibilitiesOk =
      finalEligibility1.status === 201 &&
      finalEligibility4.status === 201 &&
      finalEligibility1.body.record.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT" &&
      finalEligibility4.body.record.eligibilityDecision === "NEEDS_MANAGER_REVIEW" &&
      finalEligibility1.body.record.buyerContacted === false &&
      finalEligibility1.body.record.quotePrepared === false &&
      finalEligibility1.body.record.priceIncluded === false &&
      finalEligibility1.body.record.quoteSentToBuyer === false &&
      finalEligibility1.body.record.inventoryUpdated === false;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Manual Quote Draft Gate Foundation is active." &&
      preview.body.requiredManualQuoteDraftPhrase === "I_CONFIRM_MANUAL_QUOTE_DRAFT_ONLY_NO_SEND_NO_BUYER_CONTACT" &&
      preview.body.requiredCurrency === "NGN" &&
      preview.body.rules.includes("Final quote eligibility must already be ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT.") &&
      preview.body.rules.includes("Price is allowed only inside the internal draft.") &&
      preview.body.rules.includes("No quote is sent to buyer at this gate.") &&
      preview.body.rules.includes("Manual review before sending is required next.");

    const unsafeOk =
      unsafeDraft.status === 400 &&
      unsafeDraft.body &&
      Array.isArray(unsafeDraft.body.errors) &&
      unsafeDraft.body.errors.some(error => error.includes("Unsafe manual quote draft request blocked"));

    const safeDraftOk =
      safeDraft.status === 201 &&
      draftRecord &&
      draftRecord.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      draftRecord.manualQuoteDraftGateOnly === true &&
      draftRecord.manualQuoteDraftRecordOnly === true &&
      draftRecord.controlledManualQuoteDraftOnly === true &&
      draftRecord.manualQuoteDraftOnly === true &&
      draftRecord.quoteDraftPreparedOnly === true &&
      draftRecord.quoteDraftNotSentOnly === true &&
      draftRecord.priceIncludedInDraftOnly === true &&
      draftRecord.priceNotSentToBuyer === true &&
      draftRecord.quoteNotSentToBuyer === true &&
      draftRecord.manualReviewBeforeSendingRequired === true &&
      draftRecord.manualSendConfirmationRequiredNext === true &&
      draftRecord.slotNumber === 1 &&
      draftRecord.leadLimit === 15 &&
      draftRecord.source === "whatsapp_click_to_chat_inbound" &&
      draftRecord.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT" &&
      draftRecord.quotePrepared === true &&
      draftRecord.manualQuoteDraftPrepared === true &&
      draftRecord.priceIncluded === true &&
      draftRecord.quoteAmountIncluded === true &&
      draftRecord.currency === "NGN" &&
      draftRecord.unitPrice === 45000 &&
      draftRecord.totalPrice === 45000 &&
      typeof draftRecord.manualQuoteDraftMessage === "string" &&
      draftRecord.manualQuoteDraftMessage.includes("Price: NGN 45000") &&
      draftRecord.buyerContacted === false &&
      draftRecord.realBuyerContacted === false &&
      draftRecord.autoContactBuyer === false &&
      draftRecord.autoSendWhatsApp === false &&
      draftRecord.autoReadWhatsApp === false &&
      draftRecord.scrapeWhatsappMessages === false &&
      draftRecord.privateMessageScraping === false &&
      draftRecord.hiddenDataHarvesting === false &&
      draftRecord.startOutboundTraffic === false &&
      draftRecord.startPaidAdsAutomatically === false &&
      draftRecord.publishLeadFormAutomatically === false &&
      draftRecord.quoteSentToBuyer === false &&
      draftRecord.priceSentToBuyer === false &&
      draftRecord.inventoryUpdated === false &&
      draftRecord.stockReserved === false &&
      draftRecord.stockReduced === false &&
      draftRecord.autoUpdateInventory === false &&
      draftRecord.reserveStockAutomatically === false &&
      draftRecord.reduceStockAutomatically === false &&
      draftRecord.autoCreateAccountingEntry === false &&
      draftRecord.autoCloseSale === false &&
      draftRecord.autoMovePipelineStage === false;

    const managerReviewBlockedOk =
      managerReviewDraft.status === 400 &&
      managerReviewDraft.body &&
      Array.isArray(managerReviewDraft.body.errors) &&
      managerReviewDraft.body.errors.some(error => error.includes("Matching ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT record was not found"));

    const supplierStockBlockedOk =
      supplierStockDraft.status === 400 &&
      supplierStockDraft.body &&
      Array.isArray(supplierStockDraft.body.errors) &&
      supplierStockDraft.body.errors.some(error => error.includes("Matching ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT record was not found"));

    const rejectedReviewBlockedOk =
      rejectedReviewDraft.status === 400 &&
      rejectedReviewDraft.body &&
      Array.isArray(rejectedReviewDraft.body.errors) &&
      rejectedReviewDraft.body.errors.some(error => error.includes("Matching ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT record was not found"));

    const duplicateOk =
      duplicateDraft.status === 400 &&
      duplicateDraft.body &&
      Array.isArray(duplicateDraft.body.errors) &&
      duplicateDraft.body.errors.some(error => error.includes("already has a completed manual quote draft record"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.manualQuoteDrafts) &&
      list.body.manualQuoteDrafts.length === 1 &&
      list.body.manualQuoteDrafts.every(item =>
        item.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
        item.quotePrepared === true &&
        item.manualQuoteDraftPrepared === true &&
        item.priceIncluded === true &&
        item.quoteSentToBuyer === false &&
        item.priceSentToBuyer === false &&
        item.buyerContacted === false &&
        item.autoSendWhatsApp === false &&
        item.autoReadWhatsApp === false &&
        item.inventoryUpdated === false &&
        item.stockReserved === false &&
        item.stockReduced === false &&
        item.autoCreateAccountingEntry === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalManualQuoteDrafts === 1 &&
      summary.body.summary.preparedManualQuoteDraftCount === 1 &&
      summary.body.summary.eligibleManualQuoteDraftCount === 1 &&
      summary.body.summary.latestManualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.latestCurrency === "NGN" &&
      summary.body.summary.latestTotalPrice === 45000 &&
      summary.body.summary.safety &&
      summary.body.summary.safety.manualQuoteDraftGateOnly === true &&
      summary.body.summary.safety.manualQuoteDraftRecordOnly === true &&
      summary.body.summary.safety.controlledManualQuoteDraftOnly === true &&
      summary.body.summary.safety.manualQuoteDraftOnly === true &&
      summary.body.summary.safety.quoteDraftPreparedOnly === true &&
      summary.body.summary.safety.quoteDraftNotSentOnly === true &&
      summary.body.summary.safety.priceIncludedInDraftOnly === true &&
      summary.body.summary.safety.priceNotSentToBuyer === true &&
      summary.body.summary.safety.quoteNotSentToBuyer === true &&
      summary.body.summary.safety.manualReviewBeforeSendingRequired === true &&
      summary.body.summary.safety.manualSendConfirmationRequiredNext === true &&
      summary.body.summary.safety.noRealBuyerContacted === true &&
      summary.body.summary.safety.noAutoContactBuyer === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noWhatsappAutoRead === true &&
      summary.body.summary.safety.noBuyerMessageReading === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noQuoteSentToBuyer === true &&
      summary.body.summary.safety.noPriceSentToBuyer === true &&
      summary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      summary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      summary.body.summary.safety.noQuoteBeforeFinalEligibility === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noStockReservation === true &&
      summary.body.summary.safety.noStockReduction === true &&
      summary.body.summary.safety.noStockLedgerEntry === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true;

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      slotsOk &&
      reviewsOk &&
      stockChecksOk &&
      compatibilityChecksOk &&
      finalEligibilitiesOk &&
      previewOk &&
      unsafeOk &&
      safeDraftOk &&
      managerReviewBlockedOk &&
      supplierStockBlockedOk &&
      rejectedReviewBlockedOk &&
      duplicateOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 35A Controlled Buyer-Gate Manual Quote Draft Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved first
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved first
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists first
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists first
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists first
- ${slotsOk ? "PASS" : "FAIL"}: controlled inbound lead slots exist first
- ${reviewsOk ? "PASS" : "FAIL"}: accepted manual lead reviews exist first
- ${stockChecksOk ? "PASS" : "FAIL"}: confirmed manual stock checks exist first
- ${compatibilityChecksOk ? "PASS" : "FAIL"}: confirmed manual compatibility checks exist first
- ${finalEligibilitiesOk ? "PASS" : "FAIL"}: final quote eligibility records exist first
- ${previewOk ? "PASS" : "FAIL"}: manual quote draft preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe contact/send/read/scrape/inventory/accounting draft request is blocked
- ${safeDraftOk ? "PASS" : "FAIL"}: safe manual quote draft is created without buyer contact, quote sending, price sending, or inventory mutation
- ${managerReviewBlockedOk ? "PASS" : "FAIL"}: manual quote draft is blocked when final eligibility needs manager review
- ${supplierStockBlockedOk ? "PASS" : "FAIL"}: manual quote draft is blocked when stock path is not eligible
- ${rejectedReviewBlockedOk ? "PASS" : "FAIL"}: manual quote draft is blocked when lead review was rejected
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate manual quote draft for same slot is blocked
- ${listOk ? "PASS" : "FAIL"}: manual quote draft list API returns safe records
- ${summaryOk ? "PASS" : "FAIL"}: manual quote draft summary API confirms safe metrics

## Safety Rules Confirmed
- Manual quote draft gate only.
- Manual quote draft record only.
- Controlled manual quote draft only.
- Final quote eligibility must already be ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT.
- Price is allowed only inside the internal draft.
- Manual quote draft prepares draft text only.
- Manual quote draft does not contact buyer.
- Manual quote draft does not auto-send WhatsApp.
- Manual quote draft does not auto-read WhatsApp.
- Manual quote draft does not scrape buyer messages.
- Manual quote draft does not scrape private data.
- Manual quote draft does not harvest hidden data.
- Manual quote draft does not send quote to buyer.
- Manual quote draft does not send price to buyer.
- Manual quote draft does not update inventory.
- Manual quote draft does not reserve stock.
- Manual quote draft does not reduce stock.
- Manual quote draft does not create stock ledger entry.
- Manual quote draft does not create accounting entry.
- Manual quote draft does not close sale.
- Manual quote draft does not move pipeline.
- Manager-review final eligibility cannot create manual quote draft.
- Supplier-confirmation stock path cannot create manual quote draft.
- Rejected manual lead review cannot create manual quote draft.
- Duplicate manual quote draft for same slot is blocked.
- Manual review before sending is required next.
- Manual send confirmation gate is required next.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, and manual-quote-draft test data restored after smoke test.

## Next Phase After Approval
Version 35B — Controlled Buyer-Gate Manual Quote Draft Dashboard Display

## Server Logs
\`\`\`txt
${logsRef.value || "No logs captured"}
\`\`\`
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

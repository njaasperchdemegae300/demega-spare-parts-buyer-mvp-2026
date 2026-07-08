const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3123;
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
  "controlled-buyer-gate-manual-quote-drafts.json",
  "controlled-buyer-gate-manual-send-confirmations.json"
];

const originalData = {};
for (const name of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", name);
  originalData[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version36a-controlled-buyer-gate-manual-send-confirmation-smoke-test-report.md");

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
    leadReference: `controlled-manual-send-confirmation-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual send confirmation test.",
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
    reviewNote: "Manual lead review before manual send confirmation. No auto contact. No system send.",
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
    stockNote: "Manual stock check before manual send confirmation. No system send. No inventory mutation.",
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
    compatibilityNote: "Manual compatibility before manual send confirmation. No system send. No price sent by system.",
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
    eligibilityNote: "Final quote eligibility before manual send confirmation. No system send.",
    quoteReadinessReason: "Stock and compatibility manually confirmed; eligible for manual quote draft gate only.",
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

function safeManualQuoteDraftPayload(slotNumber, price) {
  return {
    slotNumber,
    quotedPartName: slotNumber === 4 ? "Toyota Corolla 2005 alternator" : "Toyota Corolla 2005 kick starter",
    quotedCondition: "Used original, tested okay",
    quantity: 1,
    unitPrice: price,
    totalPrice: price,
    currency: "NGN",
    pickupOrDeliveryInfo: "Pickup at Ladipo shop or Lagos dispatch after confirmation.",
    paymentInstruction: "Payment after manual confirmation with admin.",
    warrantyOrReturnNote: "Confirm fitment before payment. Warranty/return based on shop policy.",
    quoteNote: "Manual quote draft before manual send confirmation. Do not send automatically.",
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
    adminConfirmedManualSendConfirmationRequiredNext: true
  };
}

function safeManualSendConfirmationPayload(slotNumber, extra = {}) {
  return {
    slotNumber,
    manualSendChannel: "admin_manual_whatsapp_outside_system",
    manualSendEvidence: "Admin manually opened WhatsApp outside the system and sent the prepared quote text after manual review.",
    manualSendNote: "Manual send confirmation test only. System did not send, read, scrape, mutate inventory, create accounting, close sale, or move pipeline.",
    sentBy: "master_admin",
    manualSendConfirmationPhrase: "I_CONFIRM_MANUAL_SEND_CONFIRMATION_ONLY_ALREADY_SENT_MANUALLY_NO_AUTO_SEND",
    adminReviewedManualQuoteDraft: true,
    adminConfirmedManualReviewBeforeSendingCompleted: true,
    adminManuallySentQuoteOutsideSystem: true,
    adminConfirmedSystemDidNotSendQuote: true,
    adminConfirmedSystemDidNotSendPrice: true,
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
    adminConfirmedBuyerReplyTrackingRequiredNext: true,
    adminConfirmedNoAutoFollowUp: true,
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
      const startupReport = `# Version 36A Controlled Buyer-Gate Manual Send Confirmation Gate Smoke Test Report

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
      body: JSON.stringify(safeFinalEligibilityPayload(4, "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT"))
    });

    const draft1 = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(1, 45000))
    });

    const draft4 = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(4, 65000))
    });

    const preview = await request("/api/controlled-buyer-gate-manual-send-confirmation/preview");

    const unsafeConfirmation = await request("/api/controlled-buyer-gate-manual-send-confirmation/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualSendConfirmationPayload(1, {
        autoContactBuyer: true,
        startOutboundTraffic: true,
        autoSendWhatsApp: true,
        systemSendWhatsApp: true,
        systemSentQuote: true,
        systemSentPrice: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        hiddenDataHarvesting: true,
        autoUpdateInventory: true,
        reserveStockAutomatically: true,
        reduceStockAutomatically: true,
        autoCreateAccountingEntry: true,
        autoCloseSale: true,
        autoMovePipelineStage: true,
        autoStartFollowUp: true
      }))
    });

    const safeConfirmation = await request("/api/controlled-buyer-gate-manual-send-confirmation/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualSendConfirmationPayload(1))
    });

    const noDraftConfirmation = await request("/api/controlled-buyer-gate-manual-send-confirmation/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualSendConfirmationPayload(3))
    });

    const rejectedReviewConfirmation = await request("/api/controlled-buyer-gate-manual-send-confirmation/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualSendConfirmationPayload(2))
    });

    const duplicateConfirmation = await request("/api/controlled-buyer-gate-manual-send-confirmation/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualSendConfirmationPayload(1))
    });

    const list = await request("/api/controlled-buyer-gate-manual-send-confirmations");
    const summary = await request("/api/controlled-buyer-gate-manual-send-confirmation/summary");

    const confirmationRecord = safeConfirmation.body && safeConfirmation.body.record;

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
      review4.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK";

    const stockChecksOk =
      stockCheck1.status === 201 &&
      stockCheck3.status === 201 &&
      stockCheck4.status === 201 &&
      stockCheck1.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
      stockCheck3.body.check.stockDecision === "STOCK_NEEDS_SUPPLIER_CONFIRMATION" &&
      stockCheck4.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE";

    const compatibilityChecksOk =
      compatibilityCheck1.status === 201 &&
      compatibilityCheck4.status === 201 &&
      compatibilityCheck1.body.check.compatibilityDecision === "COMPATIBILITY_CONFIRMED" &&
      compatibilityCheck4.body.check.compatibilityDecision === "COMPATIBILITY_CONFIRMED";

    const finalEligibilitiesOk =
      finalEligibility1.status === 201 &&
      finalEligibility4.status === 201 &&
      finalEligibility1.body.record.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT" &&
      finalEligibility4.body.record.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT";

    const draftsOk =
      draft1.status === 201 &&
      draft4.status === 201 &&
      draft1.body.record.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      draft4.body.record.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      draft1.body.record.quoteSentToBuyer === false &&
      draft1.body.record.priceSentToBuyer === false &&
      draft1.body.record.autoSendWhatsApp === false &&
      draft1.body.record.autoReadWhatsApp === false &&
      draft1.body.record.inventoryUpdated === false;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Manual Send Confirmation Gate Foundation is active." &&
      preview.body.requiredManualSendConfirmationPhrase === "I_CONFIRM_MANUAL_SEND_CONFIRMATION_ONLY_ALREADY_SENT_MANUALLY_NO_AUTO_SEND" &&
      preview.body.requiredManualSendChannel === "admin_manual_whatsapp_outside_system" &&
      preview.body.rules.includes("Admin must manually send outside the system.") &&
      preview.body.rules.includes("The system must not send WhatsApp.") &&
      preview.body.rules.includes("The system must not send quote.") &&
      preview.body.rules.includes("Buyer reply tracking gate is required next.");

    const unsafeOk =
      unsafeConfirmation.status === 400 &&
      unsafeConfirmation.body &&
      Array.isArray(unsafeConfirmation.body.errors) &&
      unsafeConfirmation.body.errors.some(error => error.includes("Unsafe manual send confirmation request blocked"));

    const safeConfirmationOk =
      safeConfirmation.status === 201 &&
      confirmationRecord &&
      confirmationRecord.manualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
      confirmationRecord.manualSendConfirmationGateOnly === true &&
      confirmationRecord.manualSendConfirmationRecordOnly === true &&
      confirmationRecord.controlledManualSendConfirmationOnly === true &&
      confirmationRecord.adminManualSendOutsideSystemOnly === true &&
      confirmationRecord.systemSendBlocked === true &&
      confirmationRecord.systemDidNotSendQuote === true &&
      confirmationRecord.systemDidNotSendPrice === true &&
      confirmationRecord.manualSendRecordedOnly === true &&
      confirmationRecord.buyerReplyTrackingRequiredNext === true &&
      confirmationRecord.noAutoFollowUp === true &&
      confirmationRecord.slotNumber === 1 &&
      confirmationRecord.leadLimit === 15 &&
      confirmationRecord.source === "whatsapp_click_to_chat_inbound" &&
      confirmationRecord.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      confirmationRecord.manualSendChannel === "admin_manual_whatsapp_outside_system" &&
      confirmationRecord.adminManuallySentQuoteOutsideSystem === true &&
      confirmationRecord.buyerContactedManuallyOutsideSystem === true &&
      confirmationRecord.quoteManuallySentOutsideSystem === true &&
      confirmationRecord.priceManuallySentOutsideSystem === true &&
      confirmationRecord.systemQuoteSentToBuyer === false &&
      confirmationRecord.systemPriceSentToBuyer === false &&
      confirmationRecord.quoteSentToBuyer === false &&
      confirmationRecord.priceSentToBuyer === false &&
      confirmationRecord.autoContactBuyer === false &&
      confirmationRecord.autoSendWhatsApp === false &&
      confirmationRecord.systemSendWhatsApp === false &&
      confirmationRecord.autoReadWhatsApp === false &&
      confirmationRecord.scrapeWhatsappMessages === false &&
      confirmationRecord.privateMessageScraping === false &&
      confirmationRecord.hiddenDataHarvesting === false &&
      confirmationRecord.inventoryUpdated === false &&
      confirmationRecord.stockReserved === false &&
      confirmationRecord.stockReduced === false &&
      confirmationRecord.autoUpdateInventory === false &&
      confirmationRecord.reserveStockAutomatically === false &&
      confirmationRecord.reduceStockAutomatically === false &&
      confirmationRecord.autoCreateAccountingEntry === false &&
      confirmationRecord.autoCreateReceipt === false &&
      confirmationRecord.autoCreateInvoice === false &&
      confirmationRecord.autoCloseSale === false &&
      confirmationRecord.autoMovePipelineStage === false &&
      confirmationRecord.autoStartFollowUp === false;

    const noDraftBlockedOk =
      noDraftConfirmation.status === 400 &&
      noDraftConfirmation.body &&
      Array.isArray(noDraftConfirmation.body.errors) &&
      noDraftConfirmation.body.errors.some(error => error.includes("Matching MANUAL_QUOTE_DRAFT_PREPARED record was not found"));

    const rejectedReviewBlockedOk =
      rejectedReviewConfirmation.status === 400 &&
      rejectedReviewConfirmation.body &&
      Array.isArray(rejectedReviewConfirmation.body.errors) &&
      rejectedReviewConfirmation.body.errors.some(error => error.includes("Matching MANUAL_QUOTE_DRAFT_PREPARED record was not found"));

    const duplicateOk =
      duplicateConfirmation.status === 400 &&
      duplicateConfirmation.body &&
      Array.isArray(duplicateConfirmation.body.errors) &&
      duplicateConfirmation.body.errors.some(error => error.includes("already has a completed manual send confirmation record"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.manualSendConfirmations) &&
      list.body.manualSendConfirmations.length === 1 &&
      list.body.manualSendConfirmations.every(item =>
        item.manualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
        item.adminManuallySentQuoteOutsideSystem === true &&
        item.systemQuoteSentToBuyer === false &&
        item.systemPriceSentToBuyer === false &&
        item.quoteSentToBuyer === false &&
        item.priceSentToBuyer === false &&
        item.autoSendWhatsApp === false &&
        item.autoReadWhatsApp === false &&
        item.inventoryUpdated === false &&
        item.stockReserved === false &&
        item.stockReduced === false &&
        item.autoCreateAccountingEntry === false &&
        item.autoCloseSale === false &&
        item.autoMovePipelineStage === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalManualSendConfirmations === 1 &&
      summary.body.summary.recordedManualSendConfirmationCount === 1 &&
      summary.body.summary.manualOutsideSystemSendCount === 1 &&
      summary.body.summary.latestManualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.latestManualSendChannel === "admin_manual_whatsapp_outside_system" &&
      summary.body.summary.latestCurrency === "NGN" &&
      summary.body.summary.latestTotalPrice === 45000 &&
      summary.body.summary.safety &&
      summary.body.summary.safety.manualSendConfirmationGateOnly === true &&
      summary.body.summary.safety.manualSendConfirmationRecordOnly === true &&
      summary.body.summary.safety.controlledManualSendConfirmationOnly === true &&
      summary.body.summary.safety.adminManualSendOutsideSystemOnly === true &&
      summary.body.summary.safety.systemSendBlocked === true &&
      summary.body.summary.safety.systemDidNotSendQuote === true &&
      summary.body.summary.safety.systemDidNotSendPrice === true &&
      summary.body.summary.safety.manualSendRecordedOnly === true &&
      summary.body.summary.safety.buyerReplyTrackingRequiredNext === true &&
      summary.body.summary.safety.noAutoFollowUp === true &&
      summary.body.summary.safety.noAutoContactBuyer === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noSystemSendWhatsApp === true &&
      summary.body.summary.safety.noWhatsappAutoRead === true &&
      summary.body.summary.safety.noBuyerMessageReading === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noSystemQuoteSentToBuyer === true &&
      summary.body.summary.safety.noSystemPriceSentToBuyer === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noStockReservation === true &&
      summary.body.summary.safety.noStockReduction === true &&
      summary.body.summary.safety.noStockLedgerEntry === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noReceiptCreation === true &&
      summary.body.summary.safety.noInvoiceCreation === true &&
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
      draftsOk &&
      previewOk &&
      unsafeOk &&
      safeConfirmationOk &&
      noDraftBlockedOk &&
      rejectedReviewBlockedOk &&
      duplicateOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 36A Controlled Buyer-Gate Manual Send Confirmation Gate Smoke Test Report

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
- ${draftsOk ? "PASS" : "FAIL"}: manual quote draft records exist first
- ${previewOk ? "PASS" : "FAIL"}: manual send confirmation preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe auto-contact/send/read/scrape/inventory/accounting/sale/pipeline request is blocked
- ${safeConfirmationOk ? "PASS" : "FAIL"}: safe manual send confirmation is recorded without system send, WhatsApp automation, scraping, inventory mutation, accounting, sale close, or pipeline movement
- ${noDraftBlockedOk ? "PASS" : "FAIL"}: manual send confirmation is blocked when no manual quote draft exists for slot
- ${rejectedReviewBlockedOk ? "PASS" : "FAIL"}: manual send confirmation is blocked when lead review was rejected
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate manual send confirmation for same slot is blocked
- ${listOk ? "PASS" : "FAIL"}: manual send confirmation list API returns safe records
- ${summaryOk ? "PASS" : "FAIL"}: manual send confirmation summary API confirms safe metrics

## Safety Rules Confirmed
- Manual send confirmation gate only.
- Manual send confirmation record only.
- Controlled manual send confirmation only.
- Admin manual send outside system only.
- Manual quote draft must already be prepared.
- Admin manually sent quote outside the system.
- System did not send WhatsApp.
- System did not send quote.
- System did not send price.
- System did not read WhatsApp.
- System did not scrape buyer messages.
- System did not scrape private data.
- System did not harvest hidden data.
- System did not update inventory.
- System did not reserve stock.
- System did not reduce stock.
- System did not create stock ledger entry.
- System did not create accounting entry.
- System did not create receipt.
- System did not create invoice.
- System did not close sale.
- System did not move pipeline.
- System did not auto-start follow-up.
- Buyer reply tracking gate is required next.
- Duplicate manual send confirmation for same slot is blocked.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, manual-quote-draft, and manual-send-confirmation test data restored after smoke test.

## Next Phase After Approval
Version 36B — Controlled Buyer-Gate Manual Send Confirmation Dashboard Display

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

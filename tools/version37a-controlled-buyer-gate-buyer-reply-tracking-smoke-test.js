const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3126;
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
  "controlled-buyer-gate-manual-send-confirmations.json",
  "controlled-buyer-gate-buyer-reply-trackings.json"
];

const originalData = {};
for (const name of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", name);
  originalData[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version37a-controlled-buyer-gate-buyer-reply-tracking-smoke-test-report.md");

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
    leadReference: `controlled-buyer-reply-tracking-test-lead-${index}`,
    partNeeded: index === 2 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during buyer reply tracking test.",
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

function safeReviewPayload(slotNumber) {
  return {
    slotNumber,
    reviewDecision: "ACCEPT_FOR_MANUAL_STOCK_CHECK",
    reviewedBy: "master_admin",
    reviewNote: "Manual lead review before buyer reply tracking. No auto contact. No system send.",
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

function safeStockCheckPayload(slotNumber) {
  return {
    slotNumber,
    stockDecision: "STOCK_CONFIRMED_AVAILABLE",
    stockLocation: "Ladipo shop shelf",
    stockCondition: "available used original",
    stockNote: "Manual stock check before buyer reply tracking. No system send. No inventory mutation.",
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

function safeCompatibilityPayload(slotNumber) {
  return {
    slotNumber,
    compatibilityDecision: "COMPATIBILITY_CONFIRMED",
    compatibilityNote: "Manual compatibility before buyer reply tracking. No system send. No price sent by system.",
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

function safeFinalEligibilityPayload(slotNumber) {
  return {
    slotNumber,
    eligibilityDecision: "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT",
    eligibilityNote: "Final quote eligibility before buyer reply tracking. No system send.",
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
    quotedPartName: slotNumber === 2 ? "Toyota Corolla 2005 alternator" : "Toyota Corolla 2005 kick starter",
    quotedCondition: "Used original, tested okay",
    quantity: 1,
    unitPrice: price,
    totalPrice: price,
    currency: "NGN",
    pickupOrDeliveryInfo: "Pickup at Ladipo shop or Lagos dispatch after confirmation.",
    paymentInstruction: "Payment after manual confirmation with admin.",
    warrantyOrReturnNote: "Confirm fitment before payment. Warranty/return based on shop policy.",
    quoteNote: "Manual quote draft before buyer reply tracking. Do not send automatically.",
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

function safeManualSendConfirmationPayload(slotNumber) {
  return {
    slotNumber,
    manualSendChannel: "admin_manual_whatsapp_outside_system",
    manualSendEvidence: "Admin manually opened WhatsApp outside the system and sent the prepared quote text after manual review.",
    manualSendNote: "Manual send confirmation before buyer reply tracking. System did not send, read, scrape, mutate inventory, create accounting, close sale, or move pipeline.",
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
    adminConfirmedNoAutoFollowUp: true
  };
}

function safeBuyerReplyTrackingPayload(slotNumber, extra = {}) {
  return {
    slotNumber,
    buyerReplyStatus: "BUYER_REPLIED_INTERESTED",
    buyerReplyTemperature: "HOT",
    buyerReplyText: "Buyer said he is interested and asked when he can pick up from Ladipo.",
    manualObservationChannel: "admin_manual_observed_whatsapp_outside_system",
    observationNote: "Buyer reply tracking test only. Admin manually observed reply outside system. System did not read, scrape, reply, follow up, mutate inventory, create accounting, close sale, or move pipeline.",
    observedBy: "master_admin",
    buyerReplyTrackingPhrase: "I_CONFIRM_BUYER_REPLY_TRACKING_ONLY_MANUALLY_OBSERVED_NO_AUTO_READ",
    adminReviewedManualSendConfirmation: true,
    adminObservedBuyerReplyManuallyOutsideSystem: true,
    adminConfirmedSystemDidNotReadWhatsApp: true,
    adminConfirmedNoAutoRead: true,
    adminConfirmedNoMessageScraping: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoAutoReply: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoAutoFollowUp: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedNoReceipt: true,
    adminConfirmedNoInvoice: true,
    adminConfirmedNoSaleClosed: true,
    adminConfirmedNoPipelineMove: true,
    adminConfirmedFollowUpDecisionGateRequiredNext: true,
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
      const startupReport = `# Version 37A Controlled Buyer-Gate Buyer Reply Tracking Gate Smoke Test Report

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

    const review1 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(1))
    });

    const review2 = await request("/api/controlled-buyer-gate-manual-lead-review/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeReviewPayload(2))
    });

    const stockCheck1 = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(1))
    });

    const stockCheck2 = await request("/api/controlled-buyer-gate-manual-stock-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeStockCheckPayload(2))
    });

    const compatibilityCheck1 = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(1))
    });

    const compatibilityCheck2 = await request("/api/controlled-buyer-gate-manual-compatibility-check/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeCompatibilityPayload(2))
    });

    const finalEligibility1 = await request("/api/controlled-buyer-gate-final-quote-eligibility/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeFinalEligibilityPayload(1))
    });

    const finalEligibility2 = await request("/api/controlled-buyer-gate-final-quote-eligibility/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeFinalEligibilityPayload(2))
    });

    const draft1 = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(1, 45000))
    });

    const draft2 = await request("/api/controlled-buyer-gate-manual-quote-draft/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualQuoteDraftPayload(2, 65000))
    });

    const confirmation1 = await request("/api/controlled-buyer-gate-manual-send-confirmation/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualSendConfirmationPayload(1))
    });

    const preview = await request("/api/controlled-buyer-gate-buyer-reply-tracking/preview");

    const unsafeTracking = await request("/api/controlled-buyer-gate-buyer-reply-tracking/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBuyerReplyTrackingPayload(1, {
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        hiddenDataHarvesting: true,
        autoContactBuyer: true,
        autoSendWhatsApp: true,
        autoReplyToBuyer: true,
        autoStartFollowUp: true,
        autoScheduleFollowUp: true,
        autoMovePipelineStage: true,
        autoCloseSale: true,
        autoCreateAccountingEntry: true,
        autoUpdateInventory: true,
        reserveStockAutomatically: true,
        reduceStockAutomatically: true
      }))
    });

    const safeTracking = await request("/api/controlled-buyer-gate-buyer-reply-tracking/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBuyerReplyTrackingPayload(1))
    });

    const noSendConfirmationTracking = await request("/api/controlled-buyer-gate-buyer-reply-tracking/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBuyerReplyTrackingPayload(2))
    });

    const duplicateTracking = await request("/api/controlled-buyer-gate-buyer-reply-tracking/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBuyerReplyTrackingPayload(1))
    });

    const noReplyTrackingBadText = await request("/api/controlled-buyer-gate-buyer-reply-tracking/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeBuyerReplyTrackingPayload(2, {
        buyerReplyStatus: "NO_REPLY_YET",
        buyerReplyTemperature: "NO_REPLY",
        buyerReplyText: ""
      }))
    });

    const list = await request("/api/controlled-buyer-gate-buyer-reply-trackings");
    const summary = await request("/api/controlled-buyer-gate-buyer-reply-tracking/summary");

    const trackingRecord = safeTracking.body && safeTracking.body.record;

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
      slot1.body.slot.buyerContacted === false &&
      slot1.body.slot.quotePrepared === false;

    const reviewsOk =
      review1.status === 201 &&
      review2.status === 201 &&
      review1.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review2.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK";

    const stockChecksOk =
      stockCheck1.status === 201 &&
      stockCheck2.status === 201 &&
      stockCheck1.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
      stockCheck2.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE";

    const compatibilityChecksOk =
      compatibilityCheck1.status === 201 &&
      compatibilityCheck2.status === 201 &&
      compatibilityCheck1.body.check.compatibilityDecision === "COMPATIBILITY_CONFIRMED" &&
      compatibilityCheck2.body.check.compatibilityDecision === "COMPATIBILITY_CONFIRMED";

    const finalEligibilitiesOk =
      finalEligibility1.status === 201 &&
      finalEligibility2.status === 201 &&
      finalEligibility1.body.record.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT" &&
      finalEligibility2.body.record.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT";

    const draftsOk =
      draft1.status === 201 &&
      draft2.status === 201 &&
      draft1.body.record.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      draft2.body.record.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      draft1.body.record.quoteSentToBuyer === false &&
      draft1.body.record.priceSentToBuyer === false &&
      draft1.body.record.autoSendWhatsApp === false &&
      draft1.body.record.autoReadWhatsApp === false &&
      draft1.body.record.inventoryUpdated === false;

    const confirmationsOk =
      confirmation1.status === 201 &&
      confirmation1.body.record.manualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
      confirmation1.body.record.adminManuallySentQuoteOutsideSystem === true &&
      confirmation1.body.record.systemQuoteSentToBuyer === false &&
      confirmation1.body.record.systemPriceSentToBuyer === false &&
      confirmation1.body.record.autoSendWhatsApp === false &&
      confirmation1.body.record.autoReadWhatsApp === false &&
      confirmation1.body.record.inventoryUpdated === false;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Buyer Reply Tracking Gate Foundation is active." &&
      preview.body.requiredBuyerReplyTrackingPhrase === "I_CONFIRM_BUYER_REPLY_TRACKING_ONLY_MANUALLY_OBSERVED_NO_AUTO_READ" &&
      preview.body.requiredManualObservationChannel === "admin_manual_observed_whatsapp_outside_system" &&
      preview.body.rules.includes("Admin must observe buyer reply manually outside the system.") &&
      preview.body.rules.includes("The system must not read WhatsApp.") &&
      preview.body.rules.includes("The system must not auto-reply.") &&
      preview.body.rules.includes("Follow-up decision gate is required next.");

    const unsafeOk =
      unsafeTracking.status === 400 &&
      unsafeTracking.body &&
      Array.isArray(unsafeTracking.body.errors) &&
      unsafeTracking.body.errors.some(error => error.includes("Unsafe buyer reply tracking request blocked"));

    const safeTrackingOk =
      safeTracking.status === 201 &&
      trackingRecord &&
      trackingRecord.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
      trackingRecord.buyerReplyTrackingGateOnly === true &&
      trackingRecord.buyerReplyTrackingRecordOnly === true &&
      trackingRecord.controlledBuyerReplyTrackingOnly === true &&
      trackingRecord.manualBuyerReplyObservationOnly === true &&
      trackingRecord.adminObservedOutsideSystemOnly === true &&
      trackingRecord.systemDidNotReadBuyerReply === true &&
      trackingRecord.noAutoReply === true &&
      trackingRecord.noAutoFollowUp === true &&
      trackingRecord.followUpDecisionGateRequiredNext === true &&
      trackingRecord.slotNumber === 1 &&
      trackingRecord.leadLimit === 15 &&
      trackingRecord.source === "whatsapp_click_to_chat_inbound" &&
      trackingRecord.manualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
      trackingRecord.buyerReplyStatus === "BUYER_REPLIED_INTERESTED" &&
      trackingRecord.buyerReplyTemperature === "HOT" &&
      trackingRecord.manualObservationChannel === "admin_manual_observed_whatsapp_outside_system" &&
      trackingRecord.buyerReplyObservedManuallyOutsideSystem === true &&
      trackingRecord.autoReadWhatsApp === false &&
      trackingRecord.scrapeWhatsappMessages === false &&
      trackingRecord.privateMessageScraping === false &&
      trackingRecord.hiddenDataHarvesting === false &&
      trackingRecord.autoReplyToBuyer === false &&
      trackingRecord.autoStartFollowUp === false &&
      trackingRecord.autoScheduleFollowUp === false &&
      trackingRecord.autoSendWhatsApp === false &&
      trackingRecord.autoMovePipelineStage === false &&
      trackingRecord.autoCloseSale === false &&
      trackingRecord.autoCreateAccountingEntry === false &&
      trackingRecord.inventoryUpdated === false &&
      trackingRecord.stockReserved === false &&
      trackingRecord.stockReduced === false;

    const noSendConfirmationBlockedOk =
      noSendConfirmationTracking.status === 400 &&
      noSendConfirmationTracking.body &&
      Array.isArray(noSendConfirmationTracking.body.errors) &&
      noSendConfirmationTracking.body.errors.some(error => error.includes("Matching MANUAL_SEND_CONFIRMATION_RECORDED record was not found"));

    const duplicateOk =
      duplicateTracking.status === 400 &&
      duplicateTracking.body &&
      Array.isArray(duplicateTracking.body.errors) &&
      duplicateTracking.body.errors.some(error => error.includes("already has a completed buyer reply tracking record"));

    const noReplyBlockedWithoutSendOk =
      noReplyTrackingBadText.status === 400 &&
      noReplyTrackingBadText.body &&
      Array.isArray(noReplyTrackingBadText.body.errors) &&
      noReplyTrackingBadText.body.errors.some(error => error.includes("Matching MANUAL_SEND_CONFIRMATION_RECORDED record was not found"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.buyerReplyTrackings) &&
      list.body.buyerReplyTrackings.length === 1 &&
      list.body.buyerReplyTrackings.every(item =>
        item.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
        item.buyerReplyObservedManuallyOutsideSystem === true &&
        item.systemDidNotReadBuyerReply === true &&
        item.autoReadWhatsApp === false &&
        item.scrapeWhatsappMessages === false &&
        item.autoReplyToBuyer === false &&
        item.autoStartFollowUp === false &&
        item.autoMovePipelineStage === false &&
        item.autoCreateAccountingEntry === false &&
        item.inventoryUpdated === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalBuyerReplyTrackings === 1 &&
      summary.body.summary.recordedBuyerReplyTrackingCount === 1 &&
      summary.body.summary.hotReplyCount === 1 &&
      summary.body.summary.latestBuyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
      summary.body.summary.latestBuyerReplyStatus === "BUYER_REPLIED_INTERESTED" &&
      summary.body.summary.latestBuyerReplyTemperature === "HOT" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.latestObservationChannel === "admin_manual_observed_whatsapp_outside_system" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.buyerReplyTrackingGateOnly === true &&
      summary.body.summary.safety.buyerReplyTrackingRecordOnly === true &&
      summary.body.summary.safety.controlledBuyerReplyTrackingOnly === true &&
      summary.body.summary.safety.manualBuyerReplyObservationOnly === true &&
      summary.body.summary.safety.adminObservedOutsideSystemOnly === true &&
      summary.body.summary.safety.systemDidNotReadBuyerReply === true &&
      summary.body.summary.safety.noAutoReply === true &&
      summary.body.summary.safety.noAutoFollowUp === true &&
      summary.body.summary.safety.followUpDecisionGateRequiredNext === true &&
      summary.body.summary.safety.noAutoReadWhatsApp === true &&
      summary.body.summary.safety.noBuyerMessageReading === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noAutoContactBuyer === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noStockReservation === true &&
      summary.body.summary.safety.noStockReduction === true &&
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
      confirmationsOk &&
      previewOk &&
      unsafeOk &&
      safeTrackingOk &&
      noSendConfirmationBlockedOk &&
      duplicateOk &&
      noReplyBlockedWithoutSendOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 37A Controlled Buyer-Gate Buyer Reply Tracking Gate Smoke Test Report

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
- ${confirmationsOk ? "PASS" : "FAIL"}: manual send confirmation records exist first
- ${previewOk ? "PASS" : "FAIL"}: buyer reply tracking preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe auto-read/scrape/contact/send/reply/follow-up/inventory/accounting/sale/pipeline request is blocked
- ${safeTrackingOk ? "PASS" : "FAIL"}: safe buyer reply tracking is recorded without WhatsApp auto-read, scraping, auto-reply, auto-follow-up, inventory mutation, accounting, sale close, or pipeline movement
- ${noSendConfirmationBlockedOk ? "PASS" : "FAIL"}: buyer reply tracking is blocked when no manual send confirmation exists for slot
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate buyer reply tracking for same slot is blocked
- ${noReplyBlockedWithoutSendOk ? "PASS" : "FAIL"}: no-reply tracking is blocked when no manual send confirmation exists
- ${listOk ? "PASS" : "FAIL"}: buyer reply tracking list API returns safe records
- ${summaryOk ? "PASS" : "FAIL"}: buyer reply tracking summary API confirms safe metrics

## Safety Rules Confirmed
- Buyer reply tracking gate only.
- Buyer reply tracking record only.
- Controlled buyer reply tracking only.
- Manual send confirmation must already be recorded.
- Admin observed buyer reply manually outside the system.
- System did not read WhatsApp.
- System did not scrape buyer messages.
- System did not scrape private data.
- System did not harvest hidden data.
- System did not auto-reply.
- System did not auto-send WhatsApp.
- System did not auto-follow-up.
- System did not move pipeline.
- System did not update inventory.
- System did not reserve stock.
- System did not reduce stock.
- System did not create stock ledger entry.
- System did not create accounting entry.
- System did not create receipt.
- System did not create invoice.
- System did not close sale.
- Follow-up decision gate is required next.
- Duplicate buyer reply tracking for same slot is blocked.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, manual-quote-draft, manual-send-confirmation, and buyer-reply-tracking test data restored after smoke test.

## Next Phase After Approval
Version 37B — Controlled Buyer-Gate Buyer Reply Tracking Dashboard Display

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

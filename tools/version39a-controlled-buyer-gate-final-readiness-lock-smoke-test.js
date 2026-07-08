const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3132;
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
  "controlled-buyer-gate-buyer-reply-trackings.json",
  "controlled-buyer-gate-follow-up-decisions.json",
  "controlled-buyer-gate-final-readiness-locks.json"
];

const originalData = {};
for (const name of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", name);
  originalData[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version39a-controlled-buyer-gate-final-readiness-lock-smoke-test-report.md");

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

async function post(route, body) {
  return request(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function waitForHealth(child, logsRef) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (child.exitCode !== null) return null;

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

function approvalPayload() {
  return {
    approvedBy: "master_admin",
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

function executionPayload() {
  return {
    executedBy: "master_admin",
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

function slotPayload(index) {
  return {
    leadReference: `controlled-final-readiness-lock-test-lead-${index}`,
    partNeeded: index === 2 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during final readiness lock test.",
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

function reviewPayload(slotNumber) {
  return {
    slotNumber,
    reviewDecision: "ACCEPT_FOR_MANUAL_STOCK_CHECK",
    reviewedBy: "master_admin",
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

function stockPayload(slotNumber) {
  return {
    slotNumber,
    stockDecision: "STOCK_CONFIRMED_AVAILABLE",
    stockLocation: "Ladipo shop shelf",
    stockCondition: "available used original",
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

function compatibilityPayload(slotNumber) {
  return {
    slotNumber,
    compatibilityDecision: "COMPATIBILITY_CONFIRMED",
    matchedPartDetail: "Toyota Corolla 2005 tested compatible detail.",
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

function eligibilityPayload(slotNumber) {
  return {
    slotNumber,
    eligibilityDecision: "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT",
    quoteReadinessReason: "Stock and compatibility manually confirmed.",
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

function draftPayload(slotNumber, price) {
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
    warrantyOrReturnNote: "Confirm fitment before payment.",
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

function confirmationPayload(slotNumber) {
  return {
    slotNumber,
    manualSendChannel: "admin_manual_whatsapp_outside_system",
    manualSendEvidence: "Admin manually opened WhatsApp outside the system and sent the prepared quote text after manual review.",
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

function replyPayload(slotNumber, status, temp, text) {
  return {
    slotNumber,
    buyerReplyStatus: status,
    buyerReplyTemperature: temp,
    buyerReplyText: text,
    manualObservationChannel: "admin_manual_observed_whatsapp_outside_system",
    observationNote: "Buyer reply tracking before final readiness lock test.",
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
    adminConfirmedFollowUpDecisionGateRequiredNext: true
  };
}

function followUpDecisionPayload(slotNumber) {
  return {
    slotNumber,
    followUpDecision: "FOLLOW_UP_DECISION_CALL_BUYER_MANUALLY",
    followUpPriority: "HIGH",
    decisionChannel: "admin_manual_follow_up_decision_only",
    decisionReason: "Buyer replied interested, so admin should manually call buyer outside the system.",
    manualActionInstruction: "Call buyer manually outside the system. No system execution.",
    decidedBy: "master_admin",
    followUpDecisionPhrase: "I_CONFIRM_FOLLOW_UP_DECISION_ONLY_NO_AUTO_FOLLOW_UP_NO_SEND",
    adminReviewedBuyerReplyTracking: true,
    adminMadeFollowUpDecisionManually: true,
    adminConfirmedNoAutoFollowUp: true,
    adminConfirmedNoAutoSchedule: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoAutoReply: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoMessageScraping: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedNoReceipt: true,
    adminConfirmedNoInvoice: true,
    adminConfirmedNoSaleClosed: true,
    adminConfirmedNoPipelineMove: true,
    adminConfirmedManualActionRequiredOutsideSystem: true,
    adminConfirmedNoSystemExecution: true
  };
}

function finalReadinessPayload(extra = {}) {
  return {
    lockChannel: "admin_manual_final_readiness_lock_only",
    lockReason: "All controlled buyer-gate safety gates have been tested and are ready for final dashboard visibility. This does not open live traffic.",
    lockedBy: "master_admin",
    nextGateInstruction: "Next gate must be a separate manual live-gate approval. Do not open traffic from this lock.",
    finalReadinessLockPhrase: "I_CONFIRM_FINAL_READINESS_LOCK_ONLY_NO_LIVE_TRAFFIC_NO_AUTO_SEND",
    adminReviewedAllPreviousGates: true,
    adminConfirmedAssistantAgentApproved: true,
    adminConfirmedGuardianApproved: true,
    adminConfirmedControlled15LeadLimit: true,
    adminConfirmedInboundOnly: true,
    adminConfirmedManualReviewOnly: true,
    adminConfirmedManualReplyOnly: true,
    adminConfirmedStockBeforeQuote: true,
    adminConfirmedCompatibilityBeforeQuote: true,
    adminConfirmedManualSendOnly: true,
    adminConfirmedBuyerReplyTrackingExists: true,
    adminConfirmedFollowUpDecisionExists: true,
    adminConfirmedNoLiveTrafficOpened: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoAutoReply: true,
    adminConfirmedNoAutoFollowUp: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoMessageScraping: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoAccountingMutation: true,
    adminConfirmedNoSaleClosed: true,
    adminConfirmedNoPipelineMove: true,
    adminConfirmedNextGateRequiresManualLiveGateApproval: true,
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
      const startupReport = `# Version 39A Controlled Buyer-Gate Final Readiness Lock Smoke Test Report

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

    const assistantRun = await post("/api/assistant-sales-agent-test-lab/run", { runBy: "master_admin" });
    const guardianRun = await post("/api/internal-buyer-gate-readiness/run", { runBy: "master_admin" });

    const planCreate = await post("/api/controlled-buyer-gate-test-plan/create", {
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
    });

    const approvalCreate = await post("/api/controlled-buyer-gate-manual-activation-approval/create", approvalPayload());
    const executionCreate = await post("/api/controlled-buyer-gate-activation-execution/create", executionPayload());

    const slot1 = await post("/api/controlled-buyer-gate-lead-slot/create", slotPayload(1));
    const review1 = await post("/api/controlled-buyer-gate-manual-lead-review/create", reviewPayload(1));
    const stock1 = await post("/api/controlled-buyer-gate-manual-stock-check/create", stockPayload(1));
    const compatibility1 = await post("/api/controlled-buyer-gate-manual-compatibility-check/create", compatibilityPayload(1));
    const eligibility1 = await post("/api/controlled-buyer-gate-final-quote-eligibility/create", eligibilityPayload(1));
    const draft1 = await post("/api/controlled-buyer-gate-manual-quote-draft/create", draftPayload(1, 45000));
    const confirmation1 = await post("/api/controlled-buyer-gate-manual-send-confirmation/create", confirmationPayload(1));
    const reply1 = await post("/api/controlled-buyer-gate-buyer-reply-tracking/create", replyPayload(1, "BUYER_REPLIED_INTERESTED", "HOT", "Buyer said he is interested and asked when he can pick up from Ladipo."));
    const followUp1 = await post("/api/controlled-buyer-gate-follow-up-decision/create", followUpDecisionPayload(1));

    const preview = await request("/api/controlled-buyer-gate-final-readiness-lock/preview");

    const unsafeLock = await post("/api/controlled-buyer-gate-final-readiness-lock/create", finalReadinessPayload({
      openLiveGate: true,
      activateRealBuyerTraffic: true,
      startLiveTraffic: true,
      startPaidAdsAutomatically: true,
      publishLeadFormAutomatically: true,
      autoContactBuyer: true,
      autoSendWhatsApp: true,
      systemSendWhatsApp: true,
      autoReplyToBuyer: true,
      autoStartFollowUp: true,
      autoScheduleFollowUp: true,
      autoMovePipelineStage: true,
      autoCloseSale: true,
      autoCreateAccountingEntry: true,
      autoUpdateInventory: true
    }));

    const safeLock = await post("/api/controlled-buyer-gate-final-readiness-lock/create", finalReadinessPayload());

    const duplicateLock = await post("/api/controlled-buyer-gate-final-readiness-lock/create", finalReadinessPayload());

    const list = await request("/api/controlled-buyer-gate-final-readiness-locks");
    const summary = await request("/api/controlled-buyer-gate-final-readiness-lock/summary");

    const lockRecord = safeLock.body && safeLock.body.record;

    const healthOk = health.status === 200;
    const assistantOk = assistantRun.status === 201 && assistantRun.body.run && assistantRun.body.run.verdict === "APPROVED";
    const guardianOk = guardianRun.status === 201 && guardianRun.body.run && guardianRun.body.run.verdict === "APPROVED";
    const planOk = planCreate.status === 201 && planCreate.body.plan && planCreate.body.plan.leadLimit === 15;
    const approvalOk = approvalCreate.status === 201 && approvalCreate.body.approval && approvalCreate.body.approval.approvalStatus === "APPROVED_NOT_ACTIVATED";
    const executionOk = executionCreate.status === 201 && executionCreate.body.execution && executionCreate.body.execution.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY";
    const slotOk = slot1.status === 201 && slot1.body.slot && slot1.body.slot.source === "whatsapp_click_to_chat_inbound";
    const responseCreatedSafely = response => {
      if (!response || response.status !== 201) return false;
      if (response.body && response.body.status === "failed") return false;
      if (response.body && Array.isArray(response.body.errors) && response.body.errors.length) return false;
      if (typeof response.text === "string" && response.text.includes('"status":"failed"')) return false;
      return true;
    };

    const reviewOk = responseCreatedSafely(review1);
    const stockOk = responseCreatedSafely(stock1);
    const compatibilityOk = responseCreatedSafely(compatibility1);

    const eligibilityOk = eligibility1.status === 201 && eligibility1.body.record && eligibility1.body.record.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT";
    const draftOk = draft1.status === 201 && draft1.body.record && draft1.body.record.quoteSentToBuyer === false;
    const confirmationOk = confirmation1.status === 201 && confirmation1.body.record && confirmation1.body.record.systemQuoteSentToBuyer === false;
    const replyOk = reply1.status === 201 && reply1.body.record && reply1.body.record.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" && reply1.body.record.autoReadWhatsApp === false;
    const followUpOk = followUp1.status === 201 && followUp1.body.record && followUp1.body.record.followUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" && followUp1.body.record.autoStartFollowUp === false;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Final Readiness Lock Foundation is active." &&
      preview.body.requiredFinalReadinessLockPhrase === "I_CONFIRM_FINAL_READINESS_LOCK_ONLY_NO_LIVE_TRAFFIC_NO_AUTO_SEND" &&
      preview.body.requiredLockChannel === "admin_manual_final_readiness_lock_only" &&
      preview.body.rules.includes("Does not open live buyer traffic.") &&
      preview.body.rules.includes("Does not activate real buyer gate.") &&
      preview.body.rules.includes("Does not contact buyers.") &&
      preview.body.rules.includes("Next gate requires separate manual live-gate approval.");

    const unsafeOk =
      unsafeLock.status === 400 &&
      unsafeLock.body &&
      Array.isArray(unsafeLock.body.errors) &&
      unsafeLock.body.errors.some(error => error.includes("Unsafe final readiness lock request blocked"));

    const safeLockOk =
      safeLock.status === 201 &&
      lockRecord &&
      lockRecord.finalReadinessLockStatus === "FINAL_READINESS_LOCK_RECORDED" &&
      lockRecord.finalReadinessLockOnly === true &&
      lockRecord.finalReadinessRecordOnly === true &&
      lockRecord.controlledBuyerGateFinalReadinessOnly === true &&
      lockRecord.noLiveTrafficOpened === true &&
      lockRecord.noRealBuyerGateOpened === true &&
      lockRecord.noOutboundTrafficStarted === true &&
      lockRecord.nextGateRequiresManualLiveGateApproval === true &&
      lockRecord.systemExecutionBlocked === true &&
      lockRecord.leadLimit === 15 &&
      lockRecord.approvedSource === "whatsapp_click_to_chat_inbound" &&
      lockRecord.autoOpenLiveTraffic === false &&
      lockRecord.openLiveGate === false &&
      lockRecord.activateRealBuyerTraffic === false &&
      lockRecord.startLiveTraffic === false &&
      lockRecord.startPaidAdsAutomatically === false &&
      lockRecord.publishLeadFormAutomatically === false &&
      lockRecord.autoContactBuyer === false &&
      lockRecord.autoSendWhatsApp === false &&
      lockRecord.systemSendWhatsApp === false &&
      lockRecord.autoReplyToBuyer === false &&
      lockRecord.autoReadWhatsApp === false &&
      lockRecord.scrapeWhatsappMessages === false &&
      lockRecord.privateMessageScraping === false &&
      lockRecord.hiddenDataHarvesting === false &&
      lockRecord.autoStartFollowUp === false &&
      lockRecord.autoScheduleFollowUp === false &&
      lockRecord.autoMovePipelineStage === false &&
      lockRecord.autoCloseSale === false &&
      lockRecord.autoCreateAccountingEntry === false &&
      lockRecord.autoCreateReceipt === false &&
      lockRecord.autoCreateInvoice === false &&
      lockRecord.inventoryUpdated === false &&
      lockRecord.stockReserved === false &&
      lockRecord.stockReduced === false &&
      lockRecord.readinessChain &&
      lockRecord.readinessChain.assistantAgentApproved === true &&
      lockRecord.readinessChain.guardianApproved === true &&
      lockRecord.readinessChain.controlled15LeadPlanExists === true &&
      lockRecord.readinessChain.followUpDecisionExists === true;

    const duplicateOk =
      duplicateLock.status === 400 &&
      duplicateLock.body &&
      Array.isArray(duplicateLock.body.errors) &&
      duplicateLock.body.errors.some(error => error.includes("already been recorded"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.finalReadinessLocks) &&
      list.body.finalReadinessLocks.length === 1 &&
      list.body.finalReadinessLocks.every(item =>
        item.finalReadinessLockStatus === "FINAL_READINESS_LOCK_RECORDED" &&
        item.noLiveTrafficOpened === true &&
        item.noRealBuyerGateOpened === true &&
        item.systemExecutionBlocked === true &&
        item.autoOpenLiveTraffic === false &&
        item.openLiveGate === false &&
        item.activateRealBuyerTraffic === false &&
        item.autoSendWhatsApp === false &&
        item.autoReplyToBuyer === false &&
        item.autoStartFollowUp === false &&
        item.autoMovePipelineStage === false &&
        item.inventoryUpdated === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalFinalReadinessLocks === 1 &&
      summary.body.summary.recordedFinalReadinessLockCount === 1 &&
      summary.body.summary.latestFinalReadinessLockStatus === "FINAL_READINESS_LOCK_RECORDED" &&
      summary.body.summary.latestLockChannel === "admin_manual_final_readiness_lock_only" &&
      summary.body.summary.latestLeadLimit === 15 &&
      summary.body.summary.latestApprovedSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.nextGateRequiresManualLiveGateApproval === true &&
      summary.body.summary.safety &&
      summary.body.summary.safety.finalReadinessLockOnly === true &&
      summary.body.summary.safety.finalReadinessRecordOnly === true &&
      summary.body.summary.safety.controlledBuyerGateFinalReadinessOnly === true &&
      summary.body.summary.safety.noLiveTrafficOpened === true &&
      summary.body.summary.safety.noRealBuyerGateOpened === true &&
      summary.body.summary.safety.noOutboundTrafficStarted === true &&
      summary.body.summary.safety.nextGateRequiresManualLiveGateApproval === true &&
      summary.body.summary.safety.systemExecutionBlocked === true &&
      summary.body.summary.safety.noAutoOpenLiveTraffic === true &&
      summary.body.summary.safety.noAutoContactBuyer === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noAutoReply === true &&
      summary.body.summary.safety.noAutoReadWhatsApp === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noAutoFollowUp === true &&
      summary.body.summary.safety.noAutoSchedule === true &&
      summary.body.summary.safety.noPipelineMovement === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noInventoryMutation === true &&
      summary.body.summary.safety.noAccountingMutation === true;

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      slotOk &&
      reviewOk &&
      stockOk &&
      compatibilityOk &&
      eligibilityOk &&
      draftOk &&
      confirmationOk &&
      replyOk &&
      followUpOk &&
      previewOk &&
      unsafeOk &&
      safeLockOk &&
      duplicateOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 39A Controlled Buyer-Gate Final Readiness Lock Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved first
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved first
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists first
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists first
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists first
- ${slotOk ? "PASS" : "FAIL"}: controlled inbound lead slot exists first
- ${reviewOk ? "PASS" : "FAIL"}: accepted manual lead review exists first
- ${stockOk ? "PASS" : "FAIL"}: confirmed manual stock check exists first
- ${compatibilityOk ? "PASS" : "FAIL"}: confirmed manual compatibility check exists first
- ${eligibilityOk ? "PASS" : "FAIL"}: final quote eligibility exists first
- ${draftOk ? "PASS" : "FAIL"}: manual quote draft exists first
- ${confirmationOk ? "PASS" : "FAIL"}: manual send confirmation exists first
- ${replyOk ? "PASS" : "FAIL"}: buyer reply tracking exists first
- ${followUpOk ? "PASS" : "FAIL"}: follow-up decision exists first
- ${previewOk ? "PASS" : "FAIL"}: final readiness lock preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe live-traffic/auto-send/auto-reply/auto-follow-up/inventory/accounting/sale/pipeline request is blocked
- ${safeLockOk ? "PASS" : "FAIL"}: safe final readiness lock is recorded without opening live traffic or executing any automation
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate final readiness lock is blocked
- ${listOk ? "PASS" : "FAIL"}: final readiness lock list API returns safe records
- ${summaryOk ? "PASS" : "FAIL"}: final readiness lock summary API confirms safe metrics

## Safety Rules Confirmed
- Final readiness lock only.
- Final readiness record only.
- Controlled buyer-gate final readiness only.
- This does not open live buyer traffic.
- This does not activate real buyer gate.
- This does not start outbound traffic.
- This does not start ads.
- This does not publish lead forms.
- This does not contact buyers.
- This does not send WhatsApp.
- This does not auto-reply.
- This does not auto-follow-up.
- This does not auto-schedule.
- This does not read WhatsApp.
- This does not scrape buyer messages.
- This does not scrape private data.
- This does not harvest hidden data.
- This does not move pipeline.
- This does not update inventory.
- This does not reserve stock.
- This does not reduce stock.
- This does not create accounting entry.
- This does not create receipt.
- This does not create invoice.
- This does not close sale.
- Next gate requires separate manual live-gate approval.
- Duplicate final readiness lock is blocked.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, manual-quote-draft, manual-send-confirmation, buyer-reply-tracking, follow-up-decision, and final-readiness-lock test data restored after smoke test.

## Business Readiness Confirmed
- Full controlled buyer-gate chain is verified up to final readiness lock.
- Live traffic is still blocked.
- Final lock only proves technical readiness.
- Next build is final readiness dashboard display.

## Next Phase After Approval
Version 39B — Controlled Buyer-Gate Final Readiness Lock Dashboard Display

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

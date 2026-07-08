const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3129;
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
  "controlled-buyer-gate-follow-up-decisions.json"
];

const originalData = {};
for (const name of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", name);
  originalData[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version38a-controlled-buyer-gate-follow-up-decision-smoke-test-report.md");

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
    leadReference: `controlled-follow-up-decision-test-lead-${index}`,
    partNeeded: index === 2 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during follow-up decision test.",
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
    observationNote: "Buyer reply tracking before follow-up decision test.",
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

function followUpDecisionPayload(slotNumber, extra = {}) {
  return {
    slotNumber,
    followUpDecision: "FOLLOW_UP_DECISION_CALL_BUYER_MANUALLY",
    followUpPriority: "HIGH",
    decisionChannel: "admin_manual_follow_up_decision_only",
    decisionReason: "Buyer replied interested, so admin should manually call buyer outside the system to confirm pickup time.",
    manualActionInstruction: "Call buyer manually outside the system. Do not let system call, send, schedule, reply, or move pipeline.",
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
    adminConfirmedNoSystemExecution: true,
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
      const startupReport = `# Version 38A Controlled Buyer-Gate Follow-Up Decision Gate Smoke Test Report

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
    const slot2 = await post("/api/controlled-buyer-gate-lead-slot/create", slotPayload(2));
    const review1 = await post("/api/controlled-buyer-gate-manual-lead-review/create", reviewPayload(1));
    const review2 = await post("/api/controlled-buyer-gate-manual-lead-review/create", reviewPayload(2));
    const stock1 = await post("/api/controlled-buyer-gate-manual-stock-check/create", stockPayload(1));
    const stock2 = await post("/api/controlled-buyer-gate-manual-stock-check/create", stockPayload(2));
    const compatibility1 = await post("/api/controlled-buyer-gate-manual-compatibility-check/create", compatibilityPayload(1));
    const compatibility2 = await post("/api/controlled-buyer-gate-manual-compatibility-check/create", compatibilityPayload(2));
    const eligibility1 = await post("/api/controlled-buyer-gate-final-quote-eligibility/create", eligibilityPayload(1));
    const eligibility2 = await post("/api/controlled-buyer-gate-final-quote-eligibility/create", eligibilityPayload(2));
    const draft1 = await post("/api/controlled-buyer-gate-manual-quote-draft/create", draftPayload(1, 45000));
    const draft2 = await post("/api/controlled-buyer-gate-manual-quote-draft/create", draftPayload(2, 65000));
    const confirmation1 = await post("/api/controlled-buyer-gate-manual-send-confirmation/create", confirmationPayload(1));
    const confirmation2 = await post("/api/controlled-buyer-gate-manual-send-confirmation/create", confirmationPayload(2));
    const reply1 = await post("/api/controlled-buyer-gate-buyer-reply-tracking/create", replyPayload(1, "BUYER_REPLIED_INTERESTED", "HOT", "Buyer said he is interested and asked when he can pick up from Ladipo."));

    const preview = await request("/api/controlled-buyer-gate-follow-up-decision/preview");

    const unsafeDecision = await post("/api/controlled-buyer-gate-follow-up-decision/create", followUpDecisionPayload(1, {
      autoStartFollowUp: true,
      autoScheduleFollowUp: true,
      scheduleFollowUpAutomatically: true,
      autoSendFollowUp: true,
      autoSendWhatsApp: true,
      systemSendWhatsApp: true,
      autoReplyToBuyer: true,
      autoReadWhatsApp: true,
      scrapeWhatsappMessages: true,
      hiddenDataHarvesting: true,
      autoMovePipelineStage: true,
      autoCloseSale: true,
      autoCreateAccountingEntry: true,
      autoCreateReceipt: true,
      autoCreateInvoice: true,
      autoUpdateInventory: true,
      reserveStockAutomatically: true,
      reduceStockAutomatically: true
    }));

    const safeDecision = await post("/api/controlled-buyer-gate-follow-up-decision/create", followUpDecisionPayload(1));

    const noReplyTrackingDecision = await post("/api/controlled-buyer-gate-follow-up-decision/create", followUpDecisionPayload(2));

    const duplicateDecision = await post("/api/controlled-buyer-gate-follow-up-decision/create", followUpDecisionPayload(1));

    const list = await request("/api/controlled-buyer-gate-follow-up-decisions");
    const summary = await request("/api/controlled-buyer-gate-follow-up-decision/summary");

    const decisionRecord = safeDecision.body && safeDecision.body.record;

    const healthOk = health.status === 200;
    const assistantOk = assistantRun.status === 201 && assistantRun.body.run && assistantRun.body.run.verdict === "APPROVED";
    const guardianOk = guardianRun.status === 201 && guardianRun.body.run && guardianRun.body.run.verdict === "APPROVED";
    const planOk = planCreate.status === 201 && planCreate.body.plan && planCreate.body.plan.leadLimit === 15;
    const approvalOk = approvalCreate.status === 201 && approvalCreate.body.approval && approvalCreate.body.approval.approvalStatus === "APPROVED_NOT_ACTIVATED";
    const executionOk = executionCreate.status === 201 && executionCreate.body.execution && executionCreate.body.execution.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY";
    const slotsOk = slot1.status === 201 && slot2.status === 201 && slot1.body.slot.buyerContacted === false;
    const reviewsOk = review1.status === 201 && review2.status === 201;
    const stockOk = stock1.status === 201 && stock2.status === 201;
    const compatibilityOk = compatibility1.status === 201 && compatibility2.status === 201;
    const eligibilityOk = eligibility1.status === 201 && eligibility2.status === 201;
    const draftsOk = draft1.status === 201 && draft2.status === 201 && draft1.body.record.quoteSentToBuyer === false;
    const confirmationsOk = confirmation1.status === 201 && confirmation2.status === 201 && confirmation1.body.record.systemQuoteSentToBuyer === false;
    const repliesOk =
      reply1.status === 201 &&
      reply1.body.record.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
      reply1.body.record.autoReadWhatsApp === false &&
      reply1.body.record.scrapeWhatsappMessages === false &&
      reply1.body.record.autoReplyToBuyer === false &&
      reply1.body.record.autoStartFollowUp === false &&
      reply1.body.record.autoMovePipelineStage === false &&
      reply1.body.record.inventoryUpdated === false &&
      reply1.body.record.autoCreateAccountingEntry === false;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Follow-Up Decision Gate Foundation is active." &&
      preview.body.requiredFollowUpDecisionPhrase === "I_CONFIRM_FOLLOW_UP_DECISION_ONLY_NO_AUTO_FOLLOW_UP_NO_SEND" &&
      preview.body.requiredDecisionChannel === "admin_manual_follow_up_decision_only" &&
      preview.body.rules.includes("Admin must decide follow-up manually.") &&
      preview.body.rules.includes("The system must not auto-follow-up.") &&
      preview.body.rules.includes("The system must not send WhatsApp.") &&
      preview.body.rules.includes("No pipeline movement.");

    const unsafeOk =
      unsafeDecision.status === 400 &&
      unsafeDecision.body &&
      Array.isArray(unsafeDecision.body.errors) &&
      unsafeDecision.body.errors.some(error => error.includes("Unsafe follow-up decision request blocked"));

    const safeDecisionOk =
      safeDecision.status === 201 &&
      decisionRecord &&
      decisionRecord.followUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" &&
      decisionRecord.followUpDecisionGateOnly === true &&
      decisionRecord.followUpDecisionRecordOnly === true &&
      decisionRecord.controlledFollowUpDecisionOnly === true &&
      decisionRecord.adminManualDecisionOnly === true &&
      decisionRecord.systemExecutionBlocked === true &&
      decisionRecord.manualActionRequiredOutsideSystem === true &&
      decisionRecord.noAutoFollowUp === true &&
      decisionRecord.noAutoSchedule === true &&
      decisionRecord.noAutoSend === true &&
      decisionRecord.noAutoReply === true &&
      decisionRecord.noPipelineMovement === true &&
      decisionRecord.noSaleClosing === true &&
      decisionRecord.noInventoryMutation === true &&
      decisionRecord.noAccountingMutation === true &&
      decisionRecord.slotNumber === 1 &&
      decisionRecord.leadLimit === 15 &&
      decisionRecord.source === "whatsapp_click_to_chat_inbound" &&
      decisionRecord.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
      decisionRecord.followUpDecision === "FOLLOW_UP_DECISION_CALL_BUYER_MANUALLY" &&
      decisionRecord.followUpPriority === "HIGH" &&
      decisionRecord.decisionChannel === "admin_manual_follow_up_decision_only" &&
      decisionRecord.autoStartFollowUp === false &&
      decisionRecord.autoScheduleFollowUp === false &&
      decisionRecord.autoSendFollowUp === false &&
      decisionRecord.autoSendWhatsApp === false &&
      decisionRecord.systemSendWhatsApp === false &&
      decisionRecord.autoReplyToBuyer === false &&
      decisionRecord.autoReadWhatsApp === false &&
      decisionRecord.scrapeWhatsappMessages === false &&
      decisionRecord.autoMovePipelineStage === false &&
      decisionRecord.autoCloseSale === false &&
      decisionRecord.autoCreateAccountingEntry === false &&
      decisionRecord.inventoryUpdated === false &&
      decisionRecord.stockReserved === false &&
      decisionRecord.stockReduced === false;

    const noReplyTrackingBlockedOk =
      noReplyTrackingDecision.status === 400 &&
      noReplyTrackingDecision.body &&
      Array.isArray(noReplyTrackingDecision.body.errors) &&
      noReplyTrackingDecision.body.errors.some(error => error.includes("Matching BUYER_REPLY_TRACKING_RECORDED record was not found"));

    const duplicateOk =
      duplicateDecision.status === 400 &&
      duplicateDecision.body &&
      Array.isArray(duplicateDecision.body.errors) &&
      duplicateDecision.body.errors.some(error => error.includes("already has a completed follow-up decision record"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.followUpDecisions) &&
      list.body.followUpDecisions.length === 1 &&
      list.body.followUpDecisions.every(item =>
        item.followUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" &&
        item.systemExecutionBlocked === true &&
        item.manualActionRequiredOutsideSystem === true &&
        item.autoStartFollowUp === false &&
        item.autoScheduleFollowUp === false &&
        item.autoSendWhatsApp === false &&
        item.autoReplyToBuyer === false &&
        item.autoMovePipelineStage === false &&
        item.autoCreateAccountingEntry === false &&
        item.inventoryUpdated === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalFollowUpDecisions === 1 &&
      summary.body.summary.recordedFollowUpDecisionCount === 1 &&
      summary.body.summary.highFollowUpDecisionCount === 1 &&
      summary.body.summary.manualActionRequiredCount === 1 &&
      summary.body.summary.latestFollowUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" &&
      summary.body.summary.latestFollowUpDecision === "FOLLOW_UP_DECISION_CALL_BUYER_MANUALLY" &&
      summary.body.summary.latestFollowUpPriority === "HIGH" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.latestDecisionChannel === "admin_manual_follow_up_decision_only" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.followUpDecisionGateOnly === true &&
      summary.body.summary.safety.followUpDecisionRecordOnly === true &&
      summary.body.summary.safety.controlledFollowUpDecisionOnly === true &&
      summary.body.summary.safety.adminManualDecisionOnly === true &&
      summary.body.summary.safety.systemExecutionBlocked === true &&
      summary.body.summary.safety.manualActionRequiredOutsideSystem === true &&
      summary.body.summary.safety.noAutoFollowUp === true &&
      summary.body.summary.safety.noAutoSchedule === true &&
      summary.body.summary.safety.noAutoSend === true &&
      summary.body.summary.safety.noAutoReply === true &&
      summary.body.summary.safety.noPipelineMovement === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noInventoryMutation === true &&
      summary.body.summary.safety.noAccountingMutation === true &&
      summary.body.summary.safety.noAutoReadWhatsApp === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noReceiptCreation === true &&
      summary.body.summary.safety.noInvoiceCreation === true;

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      slotsOk &&
      reviewsOk &&
      stockOk &&
      compatibilityOk &&
      eligibilityOk &&
      draftsOk &&
      confirmationsOk &&
      repliesOk &&
      previewOk &&
      unsafeOk &&
      safeDecisionOk &&
      noReplyTrackingBlockedOk &&
      duplicateOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 38A Controlled Buyer-Gate Follow-Up Decision Gate Smoke Test Report

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
- ${stockOk ? "PASS" : "FAIL"}: confirmed manual stock checks exist first
- ${compatibilityOk ? "PASS" : "FAIL"}: confirmed manual compatibility checks exist first
- ${eligibilityOk ? "PASS" : "FAIL"}: final quote eligibility records exist first
- ${draftsOk ? "PASS" : "FAIL"}: manual quote draft records exist first
- ${confirmationsOk ? "PASS" : "FAIL"}: manual send confirmation records exist first
- ${repliesOk ? "PASS" : "FAIL"}: buyer reply tracking records exist first
- ${previewOk ? "PASS" : "FAIL"}: follow-up decision preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe auto-follow-up/auto-send/auto-reply/auto-schedule/inventory/accounting/sale/pipeline request is blocked
- ${safeDecisionOk ? "PASS" : "FAIL"}: safe follow-up decision is recorded without executing follow-up, sending WhatsApp, auto-reply, auto-schedule, inventory mutation, accounting, sale close, or pipeline movement
- ${noReplyTrackingBlockedOk ? "PASS" : "FAIL"}: follow-up decision is blocked when no buyer reply tracking exists for slot
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate follow-up decision for same slot is blocked
- ${listOk ? "PASS" : "FAIL"}: follow-up decision list API returns safe records
- ${summaryOk ? "PASS" : "FAIL"}: follow-up decision summary API confirms safe metrics

## Safety Rules Confirmed
- Follow-up decision gate only.
- Follow-up decision record only.
- Controlled follow-up decision only.
- Buyer reply tracking must already be recorded.
- Admin makes follow-up decision manually.
- System execution is blocked.
- Manual action is required outside the system.
- System did not auto-follow-up.
- System did not auto-schedule.
- System did not send WhatsApp.
- System did not auto-reply.
- System did not read WhatsApp.
- System did not scrape buyer messages.
- System did not scrape private data.
- System did not harvest hidden data.
- System did not move pipeline.
- System did not update inventory.
- System did not reserve stock.
- System did not reduce stock.
- System did not create accounting entry.
- System did not create receipt.
- System did not create invoice.
- System did not close sale.
- Duplicate follow-up decision for same slot is blocked.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, manual-quote-draft, manual-send-confirmation, buyer-reply-tracking, and follow-up-decision test data restored after smoke test.

## Next Phase After Approval
Version 38B — Controlled Buyer-Gate Follow-Up Decision Dashboard Display

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

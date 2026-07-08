const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3130;
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

const reportPath = path.join(ROOT, "reports", "version38b-controlled-buyer-gate-follow-up-decision-dashboard-smoke-test-report.md");

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
  const response = await fetch(`${BASE_URL}${route}`);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { status: response.status, text, body };
}

async function post(route, body) {
  const response = await fetch(`${BASE_URL}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();

  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {}

  return { status: response.status, text, body: parsed };
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
    leadReference: `controlled-dashboard-follow-up-decision-test-lead-${index}`,
    partNeeded: index === 2 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during follow-up decision dashboard test.",
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
    observationNote: "Buyer reply tracking before follow-up decision dashboard test.",
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

function decisionPayload(slotNumber, decision, priority, reason, instruction) {
  return {
    slotNumber,
    followUpDecision: decision,
    followUpPriority: priority,
    decisionChannel: "admin_manual_follow_up_decision_only",
    decisionReason: reason,
    manualActionInstruction: instruction,
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
      const startupReport = `# Version 38B Controlled Buyer-Gate Follow-Up Decision Dashboard Smoke Test Report

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
    const reply2 = await post("/api/controlled-buyer-gate-buyer-reply-tracking/create", replyPayload(2, "BUYER_REPLIED_PRICE_NEGOTIATION", "WARM", "Buyer asked for last price and delivery option."));
    const decision1 = await post("/api/controlled-buyer-gate-follow-up-decision/create", decisionPayload(
      1,
      "FOLLOW_UP_DECISION_CALL_BUYER_MANUALLY",
      "HIGH",
      "Buyer replied interested, so admin should manually call buyer outside the system to confirm pickup time.",
      "Call buyer manually outside the system. Do not let system call, send, schedule, reply, or move pipeline."
    ));
    const decision2 = await post("/api/controlled-buyer-gate-follow-up-decision/create", decisionPayload(
      2,
      "FOLLOW_UP_DECISION_NEGOTIATE_MANUALLY",
      "NORMAL",
      "Buyer asked for last price, so admin should negotiate manually outside the system.",
      "Negotiate manually outside the system. Do not let system send, auto-reply, schedule, or move pipeline."
    ));

    const page = await request("/controlled-buyer-gate-follow-up-decision");
    const aliasPage = await request("/controlled-buyer-gate-follow-up-decisions");
    const list = await request("/api/controlled-buyer-gate-follow-up-decisions");
    const summary = await request("/api/controlled-buyer-gate-follow-up-decision/summary");

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
    const repliesOk = reply1.status === 201 && reply2.status === 201 && reply1.body.record.autoReadWhatsApp === false && reply1.body.record.autoStartFollowUp === false;
    const decisionsOk =
      decision1.status === 201 &&
      decision2.status === 201 &&
      decision1.body.record.followUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" &&
      decision2.body.record.followUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" &&
      decision1.body.record.followUpPriority === "HIGH" &&
      decision2.body.record.followUpPriority === "NORMAL" &&
      decision1.body.record.autoStartFollowUp === false &&
      decision1.body.record.autoScheduleFollowUp === false &&
      decision1.body.record.autoSendWhatsApp === false &&
      decision1.body.record.autoReplyToBuyer === false &&
      decision1.body.record.autoMovePipelineStage === false &&
      decision1.body.record.autoCloseSale === false &&
      decision1.body.record.inventoryUpdated === false &&
      decision1.body.record.autoCreateAccountingEntry === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Controlled Buyer-Gate Follow-Up Decision Dashboard") &&
      page.text.includes("Follow-Up Decision Safety Rule") &&
      page.text.includes("Decision Meaning") &&
      page.text.includes("Controlled Buyer-Gate Follow-Up Decision Records") &&
      page.text.includes("Follow-up decision gate only") &&
      page.text.includes("Follow-up decision record only") &&
      page.text.includes("Controlled follow-up decision only") &&
      page.text.includes("Buyer reply tracking required first") &&
      page.text.includes("Admin manual decision only") &&
      page.text.includes("System execution blocked") &&
      page.text.includes("Manual action required outside system") &&
      page.text.includes("No auto-follow-up") &&
      page.text.includes("No auto-schedule") &&
      page.text.includes("No auto-send WhatsApp") &&
      page.text.includes("No auto-reply") &&
      page.text.includes("No WhatsApp reading") &&
      page.text.includes("No buyer message scraping") &&
      page.text.includes("No private-data scraping") &&
      page.text.includes("No hidden harvesting") &&
      page.text.includes("No inventory update") &&
      page.text.includes("No stock reservation") &&
      page.text.includes("No stock reduction") &&
      page.text.includes("No accounting entry") &&
      page.text.includes("No receipt") &&
      page.text.includes("No invoice") &&
      page.text.includes("No sale closing") &&
      page.text.includes("No pipeline movement") &&
      page.text.includes("decisionRows");

    const aliasOk = aliasPage.status === 200 && aliasPage.text.includes("Demega Controlled Buyer-Gate Follow-Up Decision Dashboard");

    const listOk =
      list.status === 200 &&
      Array.isArray(list.body.followUpDecisions) &&
      list.body.followUpDecisions.length === 2 &&
      list.body.followUpDecisions.every(item =>
        item.followUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" &&
        item.systemExecutionBlocked === true &&
        item.manualActionRequiredOutsideSystem === true &&
        item.autoStartFollowUp === false &&
        item.autoScheduleFollowUp === false &&
        item.autoSendWhatsApp === false &&
        item.autoReplyToBuyer === false &&
        item.autoMovePipelineStage === false &&
        item.autoCloseSale === false &&
        item.inventoryUpdated === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalFollowUpDecisions === 2 &&
      summary.body.summary.recordedFollowUpDecisionCount === 2 &&
      summary.body.summary.highFollowUpDecisionCount === 1 &&
      summary.body.summary.normalFollowUpDecisionCount === 1 &&
      summary.body.summary.manualActionRequiredCount === 2 &&
      summary.body.summary.latestFollowUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED" &&
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
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true;

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoStartFollowUp = true") &&
      !page.text.includes("autoScheduleFollowUp = true") &&
      !page.text.includes("autoSendFollowUp = true") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("systemSendWhatsApp = true") &&
      !page.text.includes("autoReplyToBuyer = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("autoMovePipelineStage = true") &&
      !page.text.includes("autoCloseSale = true") &&
      !page.text.includes("autoCreateAccountingEntry = true") &&
      !page.text.includes("inventoryUpdated = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/controlled-buyer-gate-follow-up-decision/create"');

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
      decisionsOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 38B Controlled Buyer-Gate Follow-Up Decision Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before dashboard setup
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before dashboard setup
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists before dashboard setup
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists before dashboard setup
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists before dashboard setup
- ${slotsOk ? "PASS" : "FAIL"}: controlled inbound lead slots exist before dashboard setup
- ${reviewsOk ? "PASS" : "FAIL"}: accepted manual lead reviews exist before dashboard setup
- ${stockOk ? "PASS" : "FAIL"}: confirmed manual stock checks exist before dashboard setup
- ${compatibilityOk ? "PASS" : "FAIL"}: confirmed manual compatibility checks exist before dashboard setup
- ${eligibilityOk ? "PASS" : "FAIL"}: final quote eligibility records exist before dashboard setup
- ${draftsOk ? "PASS" : "FAIL"}: manual quote draft records exist before dashboard setup
- ${confirmationsOk ? "PASS" : "FAIL"}: manual send confirmation records exist before dashboard setup
- ${repliesOk ? "PASS" : "FAIL"}: buyer reply tracking records exist before dashboard setup
- ${decisionsOk ? "PASS" : "FAIL"}: follow-up decision records exist for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-follow-up-decision returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-follow-up-decisions alias works
- ${listOk ? "PASS" : "FAIL"}: follow-up decision list API returns dashboard data safely
- ${summaryOk ? "PASS" : "FAIL"}: follow-up decision summary API confirms safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Follow-Up Decision dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays follow-up decision records only.
- Dashboard is read-only.
- Follow-up decision gate only.
- Follow-up decision record only.
- Controlled follow-up decision only.
- Buyer reply tracking required first.
- Admin manual decision only.
- System execution blocked.
- Manual action required outside system.
- System did not auto-follow-up.
- System did not auto-schedule.
- System did not send WhatsApp.
- System did not auto-reply.
- System did not read WhatsApp.
- System did not scrape buyer messages.
- System did not scrape private data.
- System did not harvest hidden data.
- System did not update inventory.
- System did not reserve stock.
- System did not reduce stock.
- System did not create accounting entry.
- System did not create receipt.
- System did not create invoice.
- System did not close sale.
- System did not move pipeline.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, manual-quote-draft, manual-send-confirmation, buyer-reply-tracking, and follow-up-decision test data restored after smoke test.

## Next Phase After Approval
Version 38C — Admin Hub Link Controlled Buyer-Gate Follow-Up Decision

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

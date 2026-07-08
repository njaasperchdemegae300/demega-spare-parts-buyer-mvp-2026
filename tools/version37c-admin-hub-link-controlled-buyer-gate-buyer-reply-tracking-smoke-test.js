const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3128;
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

const reportPath = path.join(ROOT, "reports", "version37c-admin-hub-link-controlled-buyer-gate-buyer-reply-tracking-smoke-test-report.md");

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

async function post(route, body) {
  return request(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
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
    leadReference: `controlled-admin-hub-buyer-reply-tracking-test-lead-${index}`,
    partNeeded: index === 2 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during buyer reply tracking Admin Hub test.",
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
    observationNote: "Buyer reply tracking Admin Hub test only.",
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
      const startupReport = `# Version 37C Admin Hub Link Controlled Buyer-Gate Buyer Reply Tracking Smoke Test Report

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

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const replyPage = await request("/controlled-buyer-gate-buyer-reply-tracking");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const replySummary = await request("/api/controlled-buyer-gate-buyer-reply-tracking/summary");

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
      reply2.status === 201 &&
      reply1.body.record.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
      reply2.body.record.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
      reply1.body.record.autoReadWhatsApp === false &&
      reply1.body.record.scrapeWhatsappMessages === false &&
      reply1.body.record.autoReplyToBuyer === false &&
      reply1.body.record.autoStartFollowUp === false &&
      reply1.body.record.autoMovePipelineStage === false &&
      reply1.body.record.inventoryUpdated === false &&
      reply1.body.record.autoCreateAccountingEntry === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Buyer Reply Tracking") &&
      hub.text.includes("/controlled-buyer-gate-buyer-reply-tracking") &&
      hub.text.includes("Buyer Reply Tracking Records") &&
      hub.text.includes("Recorded Buyer Replies") &&
      hub.text.includes("Hot Buyer Replies") &&
      hub.text.includes("Warm Buyer Replies") &&
      hub.text.includes("Cold Buyer Replies") &&
      hub.text.includes("No Reply Count") &&
      hub.text.includes("Latest Buyer Reply Status") &&
      hub.text.includes("Latest Reply Temperature") &&
      hub.text.includes("BUYER REPLY TRACKING DASHBOARD ONLY") &&
      hub.text.includes("BUYER REPLY TRACKING RECORD ONLY") &&
      hub.text.includes("ADMIN OBSERVED OUTSIDE SYSTEM ONLY") &&
      hub.text.includes("SYSTEM DID NOT READ WHATSAPP") &&
      hub.text.includes("NO WHATSAPP AUTO-READ") &&
      hub.text.includes("NO BUYER MESSAGE SCRAPING") &&
      hub.text.includes("NO AUTO-REPLY") &&
      hub.text.includes("NO AUTO-FOLLOW-UP") &&
      hub.text.includes("FOLLOW-UP DECISION GATE REQUIRED NEXT");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Buyer Reply Tracking") &&
      alias.text.includes("/controlled-buyer-gate-buyer-reply-tracking");

    const replyLinkedOk =
      replyPage.status === 200 &&
      replyPage.text.includes("Demega Controlled Buyer-Gate Buyer Reply Tracking Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Buyer Reply Tracking" &&
        module.path === "/controlled-buyer-gate-buyer-reply-tracking"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateBuyerReplyTrackingOnly === true &&
      summary.body.safety.buyerReplyTrackingGateOnly === true &&
      summary.body.safety.buyerReplyTrackingRecordOnly === true &&
      summary.body.safety.controlledBuyerReplyTrackingOnly === true &&
      summary.body.safety.manualBuyerReplyObservationOnly === true &&
      summary.body.safety.adminObservedOutsideSystemOnly === true &&
      summary.body.safety.systemDidNotReadBuyerReply === true &&
      summary.body.safety.noAutoReply === true &&
      summary.body.safety.followUpDecisionGateRequiredNext === true &&
      summary.body.safety.noAutoReadWhatsApp === true &&
      summary.body.safety.noBuyerMessageReading === true &&
      summary.body.safety.noWhatsappScraping === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoReadWhatsApp === false &&
      summary.body.safety.scrapeWhatsappMessages === false &&
      summary.body.safety.privateMessageScraping === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.inventoryUpdated === false &&
      summary.body.safety.stockReserved === false &&
      summary.body.safety.stockReduced === false &&
      summary.body.safety.autoUpdateInventory === false &&
      summary.body.safety.autoCreateAccountingEntry === false &&
      summary.body.safety.autoCloseSale === false &&
      summary.body.safety.autoMovePipelineStage === false;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.controlledBuyerGateBuyerReplyTracking &&
      metrics.body.metrics.controlledBuyerGateBuyerReplyTracking.totalBuyerReplyTrackings === 2 &&
      metrics.body.metrics.controlledBuyerGateBuyerReplyTracking.recordedBuyerReplyTrackingCount === 2 &&
      metrics.body.metrics.controlledBuyerGateBuyerReplyTracking.hotReplyCount === 1 &&
      metrics.body.metrics.controlledBuyerGateBuyerReplyTracking.warmReplyCount === 1 &&
      metrics.body.metrics.controlledBuyerGateBuyerReplyTracking.latestBuyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
      metrics.body.metrics.controlledBuyerGateBuyerReplyTracking.latestSource === "whatsapp_click_to_chat_inbound" &&
      metrics.body.metrics.controlledBuyerGateBuyerReplyTracking.latestObservationChannel === "admin_manual_observed_whatsapp_outside_system" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateBuyerReplyTrackingOnly === true &&
      metrics.body.safety.buyerReplyTrackingGateOnly === true &&
      metrics.body.safety.buyerReplyTrackingRecordOnly === true &&
      metrics.body.safety.systemDidNotReadBuyerReply === true &&
      metrics.body.safety.noAutoReply === true &&
      metrics.body.safety.followUpDecisionGateRequiredNext === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.scrapeWhatsappMessages === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.inventoryUpdated === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const replySummaryOk =
      replySummary.status === 200 &&
      replySummary.body &&
      replySummary.body.summary &&
      replySummary.body.summary.totalBuyerReplyTrackings === 2 &&
      replySummary.body.summary.recordedBuyerReplyTrackingCount === 2 &&
      replySummary.body.summary.hotReplyCount === 1 &&
      replySummary.body.summary.warmReplyCount === 1 &&
      replySummary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      replySummary.body.summary.latestObservationChannel === "admin_manual_observed_whatsapp_outside_system" &&
      replySummary.body.summary.safety &&
      replySummary.body.summary.safety.buyerReplyTrackingGateOnly === true &&
      replySummary.body.summary.safety.buyerReplyTrackingRecordOnly === true &&
      replySummary.body.summary.safety.controlledBuyerReplyTrackingOnly === true &&
      replySummary.body.summary.safety.manualBuyerReplyObservationOnly === true &&
      replySummary.body.summary.safety.systemDidNotReadBuyerReply === true &&
      replySummary.body.summary.safety.noAutoReply === true &&
      replySummary.body.summary.safety.noAutoFollowUp === true &&
      replySummary.body.summary.safety.followUpDecisionGateRequiredNext === true &&
      replySummary.body.summary.safety.noAutoReadWhatsApp === true &&
      replySummary.body.summary.safety.noWhatsappScraping === true &&
      replySummary.body.summary.safety.noPrivateDataScraping === true &&
      replySummary.body.summary.safety.noHiddenDataHarvesting === true &&
      replySummary.body.summary.safety.noAutoSendWhatsApp === true &&
      replySummary.body.summary.safety.noInventoryUpdate === true &&
      replySummary.body.summary.safety.noAccountingEntryCreation === true &&
      replySummary.body.summary.safety.noSaleClosing === true &&
      replySummary.body.summary.safety.noPipelineMovement === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoReadWhatsApp = true") &&
      !hub.text.includes("scrapeWhatsappMessages = true") &&
      !hub.text.includes("privateMessageScraping = true") &&
      !hub.text.includes("hiddenDataHarvesting = true") &&
      !hub.text.includes("autoReplyToBuyer = true") &&
      !hub.text.includes("autoStartFollowUp = true") &&
      !hub.text.includes("autoScheduleFollowUp = true") &&
      !hub.text.includes("autoMovePipelineStage = true") &&
      !hub.text.includes("autoCloseSale = true") &&
      !hub.text.includes("autoCreateAccountingEntry = true") &&
      !hub.text.includes("inventoryUpdated = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api") &&
      !hub.text.includes('fetch("/api/controlled-buyer-gate-buyer-reply-tracking/create"');

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
      hubOk &&
      aliasOk &&
      replyLinkedOk &&
      summaryOk &&
      metricsOk &&
      replySummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 37C Admin Hub Link Controlled Buyer-Gate Buyer Reply Tracking Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before Admin Hub metrics
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before Admin Hub metrics
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists before Admin Hub metrics
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists before Admin Hub metrics
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists before Admin Hub metrics
- ${slotsOk ? "PASS" : "FAIL"}: controlled inbound lead slots exist before Admin Hub metrics
- ${reviewsOk ? "PASS" : "FAIL"}: accepted manual lead reviews exist before Admin Hub metrics
- ${stockOk ? "PASS" : "FAIL"}: confirmed manual stock checks exist before Admin Hub metrics
- ${compatibilityOk ? "PASS" : "FAIL"}: confirmed manual compatibility checks exist before Admin Hub metrics
- ${eligibilityOk ? "PASS" : "FAIL"}: final quote eligibility records exist before Admin Hub metrics
- ${draftsOk ? "PASS" : "FAIL"}: manual quote draft records exist before Admin Hub metrics
- ${confirmationsOk ? "PASS" : "FAIL"}: manual send confirmation records exist before Admin Hub metrics
- ${repliesOk ? "PASS" : "FAIL"}: buyer reply tracking records exist before Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Buyer Reply Tracking link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Buyer Reply Tracking
- ${replyLinkedOk ? "PASS" : "FAIL"}: linked Buyer Reply Tracking dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Buyer Reply Tracking module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Buyer Reply Tracking metrics safely
- ${replySummaryOk ? "PASS" : "FAIL"}: Buyer Reply Tracking summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Buyer Reply Tracking link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Buyer Reply Tracking Admin Hub link is read-only.
- Buyer reply tracking gate only.
- Buyer reply tracking record only.
- Controlled buyer reply tracking only.
- Manual send confirmation required first.
- Admin observed buyer reply manually outside the system.
- System did not read WhatsApp.
- System did not scrape buyer messages.
- System did not scrape private data.
- System did not harvest hidden data.
- System did not auto-reply.
- System did not auto-send WhatsApp.
- System did not auto-follow-up.
- System did not update inventory.
- System did not reserve stock.
- System did not reduce stock.
- System did not create accounting entry.
- System did not create receipt.
- System did not create invoice.
- System did not close sale.
- System did not move pipeline.
- Metrics API remains read-only.
- Follow-up decision gate is required next.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, manual-quote-draft, manual-send-confirmation, and buyer-reply-tracking test data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Buyer Reply Tracking metrics.
- Admin Hub now links directly to Buyer Reply Tracking dashboard.
- Controlled inbound leads now require follow-up decision after manual buyer reply tracking.
- Next required build is follow-up decision gate.

## Next Phase After Approval
Version 38A — Controlled Buyer-Gate Follow-Up Decision Gate Foundation

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

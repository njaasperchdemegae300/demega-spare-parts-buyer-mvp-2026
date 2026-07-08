const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3127;
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

const reportPath = path.join(ROOT, "reports", "version37b-controlled-buyer-gate-buyer-reply-tracking-dashboard-smoke-test-report.md");

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

function payloads() {
  const approval = {
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

  const execution = {
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

  const slot = (i) => ({
    leadReference: `controlled-dashboard-buyer-reply-tracking-test-lead-${i}`,
    partNeeded: i === 2 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during buyer reply tracking dashboard test.",
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
  });

  const review = (slotNumber) => ({
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
  });

  const stock = (slotNumber) => ({
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
  });

  const compatibility = (slotNumber) => ({
    slotNumber,
    compatibilityDecision: "COMPATIBILITY_CONFIRMED",
    compatibilityNote: "Manual compatibility before buyer reply tracking dashboard.",
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
  });

  const eligibility = (slotNumber) => ({
    slotNumber,
    eligibilityDecision: "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT",
    eligibilityNote: "Final quote eligibility before buyer reply tracking dashboard.",
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
  });

  const draft = (slotNumber, price) => ({
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
  });

  const confirmation = (slotNumber) => ({
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
  });

  const reply = (slotNumber, status, temp, text) => ({
    slotNumber,
    buyerReplyStatus: status,
    buyerReplyTemperature: temp,
    buyerReplyText: text,
    manualObservationChannel: "admin_manual_observed_whatsapp_outside_system",
    observationNote: "Buyer reply tracking dashboard test only.",
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
  });

  return { approval, execution, slot, review, stock, compatibility, eligibility, draft, confirmation, reply };
}

async function post(route, body) {
  return request(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
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
      const startupReport = `# Version 37B Controlled Buyer-Gate Buyer Reply Tracking Dashboard Smoke Test Report

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

    const p = payloads();

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
    const approvalCreate = await post("/api/controlled-buyer-gate-manual-activation-approval/create", p.approval);
    const executionCreate = await post("/api/controlled-buyer-gate-activation-execution/create", p.execution);

    const slot1 = await post("/api/controlled-buyer-gate-lead-slot/create", p.slot(1));
    const slot2 = await post("/api/controlled-buyer-gate-lead-slot/create", p.slot(2));
    const review1 = await post("/api/controlled-buyer-gate-manual-lead-review/create", p.review(1));
    const review2 = await post("/api/controlled-buyer-gate-manual-lead-review/create", p.review(2));
    const stock1 = await post("/api/controlled-buyer-gate-manual-stock-check/create", p.stock(1));
    const stock2 = await post("/api/controlled-buyer-gate-manual-stock-check/create", p.stock(2));
    const compatibility1 = await post("/api/controlled-buyer-gate-manual-compatibility-check/create", p.compatibility(1));
    const compatibility2 = await post("/api/controlled-buyer-gate-manual-compatibility-check/create", p.compatibility(2));
    const eligibility1 = await post("/api/controlled-buyer-gate-final-quote-eligibility/create", p.eligibility(1));
    const eligibility2 = await post("/api/controlled-buyer-gate-final-quote-eligibility/create", p.eligibility(2));
    const draft1 = await post("/api/controlled-buyer-gate-manual-quote-draft/create", p.draft(1, 45000));
    const draft2 = await post("/api/controlled-buyer-gate-manual-quote-draft/create", p.draft(2, 65000));
    const confirmation1 = await post("/api/controlled-buyer-gate-manual-send-confirmation/create", p.confirmation(1));
    const confirmation2 = await post("/api/controlled-buyer-gate-manual-send-confirmation/create", p.confirmation(2));
    const reply1 = await post("/api/controlled-buyer-gate-buyer-reply-tracking/create", p.reply(1, "BUYER_REPLIED_INTERESTED", "HOT", "Buyer said he is interested and asked when he can pick up from Ladipo."));
    const reply2 = await post("/api/controlled-buyer-gate-buyer-reply-tracking/create", p.reply(2, "BUYER_REPLIED_PRICE_NEGOTIATION", "WARM", "Buyer asked for last price and delivery option."));

    const page = await request("/controlled-buyer-gate-buyer-reply-tracking");
    const aliasPage = await request("/controlled-buyer-gate-buyer-reply-trackings");
    const list = await request("/api/controlled-buyer-gate-buyer-reply-trackings");
    const summary = await request("/api/controlled-buyer-gate-buyer-reply-tracking/summary");

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
      reply1.body.record.buyerReplyTemperature === "HOT" &&
      reply1.body.record.autoReadWhatsApp === false &&
      reply1.body.record.scrapeWhatsappMessages === false &&
      reply1.body.record.autoReplyToBuyer === false &&
      reply1.body.record.autoStartFollowUp === false &&
      reply1.body.record.autoMovePipelineStage === false &&
      reply1.body.record.inventoryUpdated === false &&
      reply1.body.record.autoCreateAccountingEntry === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Controlled Buyer-Gate Buyer Reply Tracking Dashboard") &&
      page.text.includes("Buyer Reply Tracking Safety Rule") &&
      page.text.includes("Reply Temperature Meaning") &&
      page.text.includes("Controlled Buyer-Gate Buyer Reply Tracking Records") &&
      page.text.includes("Buyer reply tracking gate only") &&
      page.text.includes("Buyer reply tracking record only") &&
      page.text.includes("Controlled buyer reply tracking only") &&
      page.text.includes("Manual send confirmation required first") &&
      page.text.includes("Admin observed outside system only") &&
      page.text.includes("System did not read WhatsApp") &&
      page.text.includes("No WhatsApp auto-read") &&
      page.text.includes("No buyer message scraping") &&
      page.text.includes("No private-data scraping") &&
      page.text.includes("No hidden data harvesting") &&
      page.text.includes("No auto-reply") &&
      page.text.includes("No auto-send WhatsApp") &&
      page.text.includes("No auto-follow-up") &&
      page.text.includes("No inventory update") &&
      page.text.includes("No stock reservation") &&
      page.text.includes("No stock reduction") &&
      page.text.includes("No accounting entry") &&
      page.text.includes("No receipt") &&
      page.text.includes("No invoice") &&
      page.text.includes("No sale closing") &&
      page.text.includes("No pipeline movement") &&
      page.text.includes("Follow-up decision gate required next") &&
      page.text.includes("replyRows");

    const aliasOk = aliasPage.status === 200 && aliasPage.text.includes("Demega Controlled Buyer-Gate Buyer Reply Tracking Dashboard");

    const listOk =
      list.status === 200 &&
      Array.isArray(list.body.buyerReplyTrackings) &&
      list.body.buyerReplyTrackings.length === 2 &&
      list.body.buyerReplyTrackings.every(item =>
        item.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
        item.buyerReplyObservedManuallyOutsideSystem === true &&
        item.systemDidNotReadBuyerReply === true &&
        item.autoReadWhatsApp === false &&
        item.scrapeWhatsappMessages === false &&
        item.autoReplyToBuyer === false &&
        item.autoStartFollowUp === false &&
        item.autoMovePipelineStage === false &&
        item.inventoryUpdated === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalBuyerReplyTrackings === 2 &&
      summary.body.summary.recordedBuyerReplyTrackingCount === 2 &&
      summary.body.summary.hotReplyCount === 1 &&
      summary.body.summary.warmReplyCount === 1 &&
      summary.body.summary.latestBuyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.latestObservationChannel === "admin_manual_observed_whatsapp_outside_system" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.buyerReplyTrackingGateOnly === true &&
      summary.body.summary.safety.buyerReplyTrackingRecordOnly === true &&
      summary.body.summary.safety.controlledBuyerReplyTrackingOnly === true &&
      summary.body.summary.safety.manualBuyerReplyObservationOnly === true &&
      summary.body.summary.safety.systemDidNotReadBuyerReply === true &&
      summary.body.summary.safety.noAutoReply === true &&
      summary.body.summary.safety.noAutoFollowUp === true &&
      summary.body.summary.safety.followUpDecisionGateRequiredNext === true &&
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
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("autoReplyToBuyer = true") &&
      !page.text.includes("autoStartFollowUp = true") &&
      !page.text.includes("autoScheduleFollowUp = true") &&
      !page.text.includes("autoMovePipelineStage = true") &&
      !page.text.includes("autoCloseSale = true") &&
      !page.text.includes("autoCreateAccountingEntry = true") &&
      !page.text.includes("inventoryUpdated = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/controlled-buyer-gate-buyer-reply-tracking/create"');

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
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 37B Controlled Buyer-Gate Buyer Reply Tracking Dashboard Smoke Test Report

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
- ${repliesOk ? "PASS" : "FAIL"}: buyer reply tracking records exist for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-buyer-reply-tracking returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-buyer-reply-trackings alias works
- ${listOk ? "PASS" : "FAIL"}: buyer reply tracking list API returns dashboard data safely
- ${summaryOk ? "PASS" : "FAIL"}: buyer reply tracking summary API confirms safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Buyer Reply Tracking dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays buyer reply tracking records only.
- Dashboard is read-only.
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
- Follow-up decision gate is required next.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, manual-quote-draft, manual-send-confirmation, and buyer-reply-tracking test data restored after smoke test.

## Next Phase After Approval
Version 37C — Admin Hub Link Controlled Buyer-Gate Buyer Reply Tracking

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

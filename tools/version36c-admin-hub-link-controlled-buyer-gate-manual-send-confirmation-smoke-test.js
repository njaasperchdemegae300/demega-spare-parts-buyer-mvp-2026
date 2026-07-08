const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3125;
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

const reportPath = path.join(ROOT, "reports", "version36c-admin-hub-link-controlled-buyer-gate-manual-send-confirmation-smoke-test-report.md");

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
    leadReference: `controlled-admin-hub-manual-send-confirmation-test-lead-${index}`,
    partNeeded: index === 2 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual send confirmation Admin Hub test.",
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
    reviewNote: "Manual lead review before manual send confirmation Admin Hub test. No auto contact. No system send.",
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
    stockNote: "Manual stock check before manual send confirmation Admin Hub test. No system send. No inventory mutation.",
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
    compatibilityNote: "Manual compatibility before manual send confirmation Admin Hub test. No system send. No price sent by system.",
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
    eligibilityNote: "Final quote eligibility before manual send confirmation Admin Hub test. No system send.",
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
    quoteNote: "Manual quote draft before manual send confirmation Admin Hub test. Do not send automatically.",
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
    manualSendNote: "Manual send confirmation Admin Hub test only. System did not send, read, scrape, mutate inventory, create accounting, close sale, or move pipeline.",
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
      const startupReport = `# Version 36C Admin Hub Link Controlled Buyer-Gate Manual Send Confirmation Smoke Test Report

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

    const confirmation2 = await request("/api/controlled-buyer-gate-manual-send-confirmation/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeManualSendConfirmationPayload(2))
    });

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const sendConfirmationPage = await request("/controlled-buyer-gate-manual-send-confirmation");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const sendConfirmationSummary = await request("/api/controlled-buyer-gate-manual-send-confirmation/summary");

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
      confirmation2.status === 201 &&
      confirmation1.body.record.manualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
      confirmation2.body.record.manualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
      confirmation1.body.record.manualSendChannel === "admin_manual_whatsapp_outside_system" &&
      confirmation1.body.record.adminManuallySentQuoteOutsideSystem === true &&
      confirmation1.body.record.systemQuoteSentToBuyer === false &&
      confirmation1.body.record.systemPriceSentToBuyer === false &&
      confirmation1.body.record.autoSendWhatsApp === false &&
      confirmation1.body.record.systemSendWhatsApp === false &&
      confirmation1.body.record.autoReadWhatsApp === false &&
      confirmation1.body.record.inventoryUpdated === false &&
      confirmation1.body.record.autoCreateAccountingEntry === false &&
      confirmation1.body.record.autoCloseSale === false &&
      confirmation1.body.record.autoMovePipelineStage === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Manual Send Confirmation") &&
      hub.text.includes("/controlled-buyer-gate-manual-send-confirmation") &&
      hub.text.includes("Manual Send Confirmation Records") &&
      hub.text.includes("Recorded Manual Send Confirmations") &&
      hub.text.includes("Outside-System Sends") &&
      hub.text.includes("Latest Send Confirmation Status") &&
      hub.text.includes("Latest Send Source") &&
      hub.text.includes("Latest Send Channel") &&
      hub.text.includes("Latest Send Currency") &&
      hub.text.includes("Latest Send Total Price") &&
      hub.text.includes("MANUAL SEND CONFIRMATION DASHBOARD ONLY") &&
      hub.text.includes("MANUAL SEND CONFIRMATION RECORD ONLY") &&
      hub.text.includes("ADMIN MANUAL SEND OUTSIDE SYSTEM ONLY") &&
      hub.text.includes("SYSTEM SEND BLOCKED") &&
      hub.text.includes("SYSTEM DID NOT SEND WHATSAPP") &&
      hub.text.includes("SYSTEM DID NOT SEND QUOTE") &&
      hub.text.includes("SYSTEM DID NOT SEND PRICE") &&
      hub.text.includes("BUYER REPLY TRACKING REQUIRED NEXT") &&
      hub.text.includes("NO AUTO FOLLOW-UP");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Manual Send Confirmation") &&
      alias.text.includes("/controlled-buyer-gate-manual-send-confirmation");

    const sendConfirmationLinkedOk =
      sendConfirmationPage.status === 200 &&
      sendConfirmationPage.text.includes("Demega Controlled Buyer-Gate Manual Send Confirmation Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Manual Send Confirmation" &&
        module.path === "/controlled-buyer-gate-manual-send-confirmation"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateManualSendConfirmationOnly === true &&
      summary.body.safety.manualSendConfirmationGateOnly === true &&
      summary.body.safety.manualSendConfirmationRecordOnly === true &&
      summary.body.safety.controlledManualSendConfirmationOnly === true &&
      summary.body.safety.adminManualSendOutsideSystemOnly === true &&
      summary.body.safety.systemSendBlocked === true &&
      summary.body.safety.systemDidNotSendQuote === true &&
      summary.body.safety.systemDidNotSendPrice === true &&
      summary.body.safety.manualSendRecordedOnly === true &&
      summary.body.safety.buyerReplyTrackingRequiredNext === true &&
      summary.body.safety.noAutoFollowUp === true &&
      summary.body.safety.noSystemSendWhatsApp === true &&
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
      metrics.body.metrics.controlledBuyerGateManualSendConfirmation &&
      metrics.body.metrics.controlledBuyerGateManualSendConfirmation.totalManualSendConfirmations === 2 &&
      metrics.body.metrics.controlledBuyerGateManualSendConfirmation.recordedManualSendConfirmationCount === 2 &&
      metrics.body.metrics.controlledBuyerGateManualSendConfirmation.manualOutsideSystemSendCount === 2 &&
      metrics.body.metrics.controlledBuyerGateManualSendConfirmation.latestManualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
      metrics.body.metrics.controlledBuyerGateManualSendConfirmation.latestSource === "whatsapp_click_to_chat_inbound" &&
      metrics.body.metrics.controlledBuyerGateManualSendConfirmation.latestManualSendChannel === "admin_manual_whatsapp_outside_system" &&
      metrics.body.metrics.controlledBuyerGateManualSendConfirmation.latestCurrency === "NGN" &&
      Number(metrics.body.metrics.controlledBuyerGateManualSendConfirmation.latestTotalPrice) > 0 &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateManualSendConfirmationOnly === true &&
      metrics.body.safety.manualSendConfirmationGateOnly === true &&
      metrics.body.safety.manualSendConfirmationRecordOnly === true &&
      metrics.body.safety.systemSendBlocked === true &&
      metrics.body.safety.systemDidNotSendQuote === true &&
      metrics.body.safety.systemDidNotSendPrice === true &&
      metrics.body.safety.buyerReplyTrackingRequiredNext === true &&
      metrics.body.safety.noAutoFollowUp === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.inventoryUpdated === false &&
      metrics.body.safety.stockReserved === false &&
      metrics.body.safety.stockReduced === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const sendConfirmationSummaryOk =
      sendConfirmationSummary.status === 200 &&
      sendConfirmationSummary.body &&
      sendConfirmationSummary.body.summary &&
      sendConfirmationSummary.body.summary.totalManualSendConfirmations === 2 &&
      sendConfirmationSummary.body.summary.recordedManualSendConfirmationCount === 2 &&
      sendConfirmationSummary.body.summary.manualOutsideSystemSendCount === 2 &&
      sendConfirmationSummary.body.summary.latestManualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
      sendConfirmationSummary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      sendConfirmationSummary.body.summary.latestManualSendChannel === "admin_manual_whatsapp_outside_system" &&
      sendConfirmationSummary.body.summary.latestCurrency === "NGN" &&
      sendConfirmationSummary.body.summary.safety &&
      sendConfirmationSummary.body.summary.safety.manualSendConfirmationGateOnly === true &&
      sendConfirmationSummary.body.summary.safety.manualSendConfirmationRecordOnly === true &&
      sendConfirmationSummary.body.summary.safety.controlledManualSendConfirmationOnly === true &&
      sendConfirmationSummary.body.summary.safety.adminManualSendOutsideSystemOnly === true &&
      sendConfirmationSummary.body.summary.safety.systemSendBlocked === true &&
      sendConfirmationSummary.body.summary.safety.systemDidNotSendQuote === true &&
      sendConfirmationSummary.body.summary.safety.systemDidNotSendPrice === true &&
      sendConfirmationSummary.body.summary.safety.manualSendRecordedOnly === true &&
      sendConfirmationSummary.body.summary.safety.buyerReplyTrackingRequiredNext === true &&
      sendConfirmationSummary.body.summary.safety.noAutoFollowUp === true &&
      sendConfirmationSummary.body.summary.safety.noAutoContactBuyer === true &&
      sendConfirmationSummary.body.summary.safety.noAutoSendWhatsApp === true &&
      sendConfirmationSummary.body.summary.safety.noSystemSendWhatsApp === true &&
      sendConfirmationSummary.body.summary.safety.noWhatsappAutoRead === true &&
      sendConfirmationSummary.body.summary.safety.noBuyerMessageReading === true &&
      sendConfirmationSummary.body.summary.safety.noWhatsappScraping === true &&
      sendConfirmationSummary.body.summary.safety.noPrivateDataScraping === true &&
      sendConfirmationSummary.body.summary.safety.noHiddenDataHarvesting === true &&
      sendConfirmationSummary.body.summary.safety.noSystemQuoteSentToBuyer === true &&
      sendConfirmationSummary.body.summary.safety.noSystemPriceSentToBuyer === true &&
      sendConfirmationSummary.body.summary.safety.noInventoryUpdate === true &&
      sendConfirmationSummary.body.summary.safety.noStockReservation === true &&
      sendConfirmationSummary.body.summary.safety.noStockReduction === true &&
      sendConfirmationSummary.body.summary.safety.noStockLedgerEntry === true &&
      sendConfirmationSummary.body.summary.safety.noAccountingEntryCreation === true &&
      sendConfirmationSummary.body.summary.safety.noReceiptCreation === true &&
      sendConfirmationSummary.body.summary.safety.noInvoiceCreation === true &&
      sendConfirmationSummary.body.summary.safety.noSaleClosing === true &&
      sendConfirmationSummary.body.summary.safety.noPipelineMovement === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoContactBuyer = true") &&
      !hub.text.includes("contactRealBuyerAutomatically = true") &&
      !hub.text.includes("startOutboundTraffic = true") &&
      !hub.text.includes("startPaidAdsAutomatically = true") &&
      !hub.text.includes("publishLeadFormAutomatically = true") &&
      !hub.text.includes("broadcastWhatsApp = true") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("systemSendWhatsApp = true") &&
      !hub.text.includes("sendWhatsApp = true") &&
      !hub.text.includes("autoReadWhatsApp = true") &&
      !hub.text.includes("scrapeWhatsappMessages = true") &&
      !hub.text.includes("privateMessageScraping = true") &&
      !hub.text.includes("hiddenDataHarvesting = true") &&
      !hub.text.includes("systemQuoteSentToBuyer = true") &&
      !hub.text.includes("systemPriceSentToBuyer = true") &&
      !hub.text.includes("quoteSentToBuyer = true") &&
      !hub.text.includes("priceSentToBuyer = true") &&
      !hub.text.includes("autoUpdateInventory = true") &&
      !hub.text.includes("reserveStockAutomatically = true") &&
      !hub.text.includes("reduceStockAutomatically = true") &&
      !hub.text.includes("autoCreateAccountingEntry = true") &&
      !hub.text.includes("autoCreateReceipt = true") &&
      !hub.text.includes("autoCreateInvoice = true") &&
      !hub.text.includes("autoCloseSale = true") &&
      !hub.text.includes("autoMovePipelineStage = true") &&
      !hub.text.includes("autoStartFollowUp = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api") &&
      !hub.text.includes('fetch("/api/controlled-buyer-gate-manual-send-confirmation/create"');

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
      hubOk &&
      aliasOk &&
      sendConfirmationLinkedOk &&
      summaryOk &&
      metricsOk &&
      sendConfirmationSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 36C Admin Hub Link Controlled Buyer-Gate Manual Send Confirmation Smoke Test Report

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
- ${stockChecksOk ? "PASS" : "FAIL"}: confirmed manual stock checks exist before Admin Hub metrics
- ${compatibilityChecksOk ? "PASS" : "FAIL"}: confirmed manual compatibility checks exist before Admin Hub metrics
- ${finalEligibilitiesOk ? "PASS" : "FAIL"}: final quote eligibility records exist before Admin Hub metrics
- ${draftsOk ? "PASS" : "FAIL"}: manual quote draft records exist before Admin Hub metrics
- ${confirmationsOk ? "PASS" : "FAIL"}: manual send confirmation records exist before Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Send Confirmation link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Send Confirmation
- ${sendConfirmationLinkedOk ? "PASS" : "FAIL"}: linked Manual Send Confirmation dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Send Confirmation module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Manual Send Confirmation metrics safely
- ${sendConfirmationSummaryOk ? "PASS" : "FAIL"}: Manual Send Confirmation summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Manual Send Confirmation link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Manual Send Confirmation Admin Hub link is read-only.
- Manual send confirmation gate only.
- Manual send confirmation record only.
- Controlled manual send confirmation only.
- Admin manual send outside system only.
- Manual quote draft required first.
- System send blocked.
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
- Metrics API remains read-only.
- Buyer reply tracking gate is required next.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, manual-quote-draft, and manual-send-confirmation test data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Manual Send Confirmation metrics.
- Admin Hub now links directly to Manual Send Confirmation dashboard.
- Controlled inbound leads now require buyer reply tracking after manual outside-system sending.
- Next required build is buyer reply tracking gate.

## Next Phase After Approval
Version 37A — Controlled Buyer-Gate Buyer Reply Tracking Gate Foundation

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

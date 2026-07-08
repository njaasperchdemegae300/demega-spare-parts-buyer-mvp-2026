const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3124;
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

const reportPath = path.join(ROOT, "reports", "version36b-controlled-buyer-gate-manual-send-confirmation-dashboard-smoke-test-report.md");

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
    leadReference: `controlled-dashboard-manual-send-confirmation-test-lead-${index}`,
    partNeeded: index === 2 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual send confirmation dashboard test.",
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
    reviewNote: "Manual lead review before manual send confirmation dashboard. No auto contact. No system send.",
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
    stockNote: "Manual stock check before manual send confirmation dashboard. No system send. No inventory mutation.",
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
    compatibilityNote: "Manual compatibility before manual send confirmation dashboard. No system send. No price sent by system.",
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
    eligibilityNote: "Final quote eligibility before manual send confirmation dashboard. No system send.",
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
    quoteNote: "Manual quote draft before manual send confirmation dashboard. Do not send automatically.",
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
    manualSendNote: "Manual send confirmation dashboard test only. System did not send, read, scrape, mutate inventory, create accounting, close sale, or move pipeline.",
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
      const startupReport = `# Version 36B Controlled Buyer-Gate Manual Send Confirmation Dashboard Smoke Test Report

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

    const page = await request("/controlled-buyer-gate-manual-send-confirmation");
    const aliasPage = await request("/controlled-buyer-gate-manual-send-confirmations");
    const list = await request("/api/controlled-buyer-gate-manual-send-confirmations");
    const summary = await request("/api/controlled-buyer-gate-manual-send-confirmation/summary");

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
      confirmation1.body.record.quoteSentToBuyer === false &&
      confirmation1.body.record.priceSentToBuyer === false &&
      confirmation1.body.record.autoSendWhatsApp === false &&
      confirmation1.body.record.systemSendWhatsApp === false &&
      confirmation1.body.record.autoReadWhatsApp === false &&
      confirmation1.body.record.inventoryUpdated === false &&
      confirmation1.body.record.autoCreateAccountingEntry === false &&
      confirmation1.body.record.autoCloseSale === false &&
      confirmation1.body.record.autoMovePipelineStage === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Controlled Buyer-Gate Manual Send Confirmation Dashboard") &&
      page.text.includes("Manual Send Confirmation Safety Rule") &&
      page.text.includes("Manual Send Confirmation Scope") &&
      page.text.includes("Controlled Buyer-Gate Manual Send Confirmation Records") &&
      page.text.includes("Manual send confirmation gate only") &&
      page.text.includes("Manual send confirmation record only") &&
      page.text.includes("Controlled manual send confirmation only") &&
      page.text.includes("Admin manual send outside system only") &&
      page.text.includes("Manual quote draft required first") &&
      page.text.includes("System send blocked") &&
      page.text.includes("System did not send WhatsApp") &&
      page.text.includes("System did not send quote") &&
      page.text.includes("System did not send price") &&
      page.text.includes("System did not read WhatsApp") &&
      page.text.includes("No buyer message scraping") &&
      page.text.includes("No private-data scraping") &&
      page.text.includes("No hidden data harvesting") &&
      page.text.includes("No inventory update") &&
      page.text.includes("No stock reservation") &&
      page.text.includes("No stock reduction") &&
      page.text.includes("No accounting entry") &&
      page.text.includes("No receipt") &&
      page.text.includes("No invoice") &&
      page.text.includes("No sale closing") &&
      page.text.includes("No pipeline movement") &&
      page.text.includes("No auto follow-up") &&
      page.text.includes("Buyer reply tracking required next") &&
      page.text.includes("MANUAL_SEND_CONFIRMATION_RECORDED") &&
      page.text.includes("ADMIN_MANUAL_WHATSAPP_OUTSIDE_SYSTEM") &&
      page.text.includes("SYSTEM_DID_NOT_SEND_QUOTE") &&
      page.text.includes("SYSTEM_DID_NOT_SEND_PRICE") &&
      page.text.includes("BUYER_REPLY_TRACKING_REQUIRED_NEXT") &&
      page.text.includes("confirmationRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Controlled Buyer-Gate Manual Send Confirmation Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.manualSendConfirmations) &&
      list.body.manualSendConfirmations.length === 2 &&
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
      summary.body.summary.totalManualSendConfirmations === 2 &&
      summary.body.summary.recordedManualSendConfirmationCount === 2 &&
      summary.body.summary.manualOutsideSystemSendCount === 2 &&
      summary.body.summary.latestManualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.latestManualSendChannel === "admin_manual_whatsapp_outside_system" &&
      summary.body.summary.latestCurrency === "NGN" &&
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

    const readOnlyOk =
      !page.text.includes("navigator.clipboard") &&
      !page.text.includes("writeText(") &&
      !page.text.includes("execCommand") &&
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoContactBuyer = true") &&
      !page.text.includes("contactRealBuyerAutomatically = true") &&
      !page.text.includes("startOutboundTraffic = true") &&
      !page.text.includes("startPaidAdsAutomatically = true") &&
      !page.text.includes("publishLeadFormAutomatically = true") &&
      !page.text.includes("broadcastWhatsApp = true") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("systemSendWhatsApp = true") &&
      !page.text.includes("sendWhatsApp = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("systemQuoteSentToBuyer = true") &&
      !page.text.includes("systemPriceSentToBuyer = true") &&
      !page.text.includes("quoteSentToBuyer = true") &&
      !page.text.includes("priceSentToBuyer = true") &&
      !page.text.includes("autoUpdateInventory = true") &&
      !page.text.includes("reserveStockAutomatically = true") &&
      !page.text.includes("reduceStockAutomatically = true") &&
      !page.text.includes("autoCreateAccountingEntry = true") &&
      !page.text.includes("autoCreateReceipt = true") &&
      !page.text.includes("autoCreateInvoice = true") &&
      !page.text.includes("autoCloseSale = true") &&
      !page.text.includes("autoMovePipelineStage = true") &&
      !page.text.includes("autoStartFollowUp = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/controlled-buyer-gate-manual-send-confirmation/create"');

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
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 36B Controlled Buyer-Gate Manual Send Confirmation Dashboard Smoke Test Report

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
- ${stockChecksOk ? "PASS" : "FAIL"}: confirmed manual stock checks exist before dashboard setup
- ${compatibilityChecksOk ? "PASS" : "FAIL"}: confirmed manual compatibility checks exist before dashboard setup
- ${finalEligibilitiesOk ? "PASS" : "FAIL"}: final quote eligibility records exist before dashboard setup
- ${draftsOk ? "PASS" : "FAIL"}: manual quote draft records exist before dashboard setup
- ${confirmationsOk ? "PASS" : "FAIL"}: manual send confirmation records exist for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-manual-send-confirmation returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-manual-send-confirmations alias works
- ${listOk ? "PASS" : "FAIL"}: manual send confirmation list API returns dashboard data safely
- ${summaryOk ? "PASS" : "FAIL"}: manual send confirmation summary API confirms safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Manual Send Confirmation dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays manual send confirmation records only.
- Dashboard is read-only.
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
- No inventory update.
- No stock reservation.
- No stock reduction.
- No stock ledger entry.
- No accounting entry creation.
- No receipt creation.
- No invoice creation.
- No sale closing.
- No pipeline movement.
- No auto follow-up.
- Buyer reply tracking required next.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, manual-quote-draft, and manual-send-confirmation test data restored after smoke test.

## Next Phase After Approval
Version 36C — Admin Hub Link Controlled Buyer-Gate Manual Send Confirmation

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

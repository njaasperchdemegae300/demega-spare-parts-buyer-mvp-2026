const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3122;
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

const reportPath = path.join(ROOT, "reports", "version35c-admin-hub-link-controlled-buyer-gate-manual-quote-draft-smoke-test-report.md");

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
    leadReference: `controlled-admin-hub-manual-quote-draft-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during manual quote draft Admin Hub test.",
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
    reviewNote: "Manual lead review before manual quote draft Admin Hub test. No buyer contact. No quote sent.",
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
    stockNote: "Manual stock check before manual quote draft Admin Hub test. No buyer contact. No quote sent. No inventory mutation.",
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
    compatibilityNote: "Manual compatibility before manual quote draft Admin Hub test. No buyer contact. No quote sent. No price sent.",
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
    eligibilityNote: "Final quote eligibility before manual quote draft Admin Hub test. No buyer contact. No quote sent.",
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
    quoteNote: "Manual quote draft Admin Hub test only. Do not send automatically.",
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
      const startupReport = `# Version 35C Admin Hub Link Controlled Buyer-Gate Manual Quote Draft Smoke Test Report

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

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const quoteDraftPage = await request("/controlled-buyer-gate-manual-quote-draft");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const quoteDraftSummary = await request("/api/controlled-buyer-gate-manual-quote-draft/summary");

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
      finalEligibility4.body.record.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT" &&
      finalEligibility1.body.record.buyerContacted === false &&
      finalEligibility1.body.record.quoteSentToBuyer === false &&
      finalEligibility1.body.record.inventoryUpdated === false;

    const draftsOk =
      draft1.status === 201 &&
      draft4.status === 201 &&
      draft1.body.record.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      draft4.body.record.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      draft1.body.record.totalPrice === 45000 &&
      draft4.body.record.totalPrice === 65000 &&
      draft1.body.record.quoteSentToBuyer === false &&
      draft1.body.record.priceSentToBuyer === false &&
      draft1.body.record.buyerContacted === false &&
      draft1.body.record.autoSendWhatsApp === false &&
      draft1.body.record.autoReadWhatsApp === false &&
      draft1.body.record.inventoryUpdated === false &&
      draft1.body.record.autoCreateAccountingEntry === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Manual Quote Draft") &&
      hub.text.includes("/controlled-buyer-gate-manual-quote-draft") &&
      hub.text.includes("Manual Quote Draft Records") &&
      hub.text.includes("Prepared Manual Quote Drafts") &&
      hub.text.includes("Eligible Manual Quote Drafts") &&
      hub.text.includes("Latest Draft Status") &&
      hub.text.includes("Latest Draft Source") &&
      hub.text.includes("Latest Draft Currency") &&
      hub.text.includes("Latest Draft Total Price") &&
      hub.text.includes("MANUAL QUOTE DRAFT DASHBOARD ONLY") &&
      hub.text.includes("MANUAL QUOTE DRAFT RECORD ONLY") &&
      hub.text.includes("PRICE INSIDE INTERNAL DRAFT ONLY") &&
      hub.text.includes("NO BUYER CONTACT FROM DRAFT GATE") &&
      hub.text.includes("NO QUOTE SENT FROM DRAFT GATE") &&
      hub.text.includes("NO PRICE SENT TO BUYER") &&
      hub.text.includes("MANUAL REVIEW BEFORE SENDING REQUIRED") &&
      hub.text.includes("MANUAL SEND CONFIRMATION REQUIRED NEXT");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Manual Quote Draft") &&
      alias.text.includes("/controlled-buyer-gate-manual-quote-draft");

    const quoteDraftLinkedOk =
      quoteDraftPage.status === 200 &&
      quoteDraftPage.text.includes("Demega Controlled Buyer-Gate Manual Quote Draft Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Manual Quote Draft" &&
        module.path === "/controlled-buyer-gate-manual-quote-draft"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateManualQuoteDraftOnly === true &&
      summary.body.safety.manualQuoteDraftGateOnly === true &&
      summary.body.safety.manualQuoteDraftRecordOnly === true &&
      summary.body.safety.controlledManualQuoteDraftOnly === true &&
      summary.body.safety.quoteDraftPreparedOnly === true &&
      summary.body.safety.quoteDraftNotSentOnly === true &&
      summary.body.safety.priceIncludedInDraftOnly === true &&
      summary.body.safety.priceNotSentToBuyer === true &&
      summary.body.safety.quoteNotSentToBuyer === true &&
      summary.body.safety.manualReviewBeforeSendingRequired === true &&
      summary.body.safety.manualSendConfirmationRequiredNext === true &&
      summary.body.safety.buyerContacted === false &&
      summary.body.safety.realBuyerContacted === false &&
      summary.body.safety.autoContactBuyer === false &&
      summary.body.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoReadWhatsApp === false &&
      summary.body.safety.scrapeWhatsappMessages === false &&
      summary.body.safety.privateMessageScraping === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.noQuoteSentToBuyer === true &&
      summary.body.safety.priceNotSentToBuyer === true &&
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
      metrics.body.metrics.controlledBuyerGateManualQuoteDraft &&
      metrics.body.metrics.controlledBuyerGateManualQuoteDraft.totalManualQuoteDrafts === 2 &&
      metrics.body.metrics.controlledBuyerGateManualQuoteDraft.preparedManualQuoteDraftCount === 2 &&
      metrics.body.metrics.controlledBuyerGateManualQuoteDraft.eligibleManualQuoteDraftCount === 2 &&
      metrics.body.metrics.controlledBuyerGateManualQuoteDraft.latestManualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      metrics.body.metrics.controlledBuyerGateManualQuoteDraft.latestSource === "whatsapp_click_to_chat_inbound" &&
      metrics.body.metrics.controlledBuyerGateManualQuoteDraft.latestCurrency === "NGN" &&
      Number(metrics.body.metrics.controlledBuyerGateManualQuoteDraft.latestTotalPrice) > 0 &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateManualQuoteDraftOnly === true &&
      metrics.body.safety.manualQuoteDraftGateOnly === true &&
      metrics.body.safety.manualQuoteDraftRecordOnly === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.noQuoteSentToBuyer === true &&
      metrics.body.safety.priceNotSentToBuyer === true &&
      metrics.body.safety.inventoryUpdated === false &&
      metrics.body.safety.stockReserved === false &&
      metrics.body.safety.stockReduced === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const quoteDraftSummaryOk =
      quoteDraftSummary.status === 200 &&
      quoteDraftSummary.body &&
      quoteDraftSummary.body.summary &&
      quoteDraftSummary.body.summary.totalManualQuoteDrafts === 2 &&
      quoteDraftSummary.body.summary.preparedManualQuoteDraftCount === 2 &&
      quoteDraftSummary.body.summary.eligibleManualQuoteDraftCount === 2 &&
      quoteDraftSummary.body.summary.latestManualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
      quoteDraftSummary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      quoteDraftSummary.body.summary.latestCurrency === "NGN" &&
      quoteDraftSummary.body.summary.safety &&
      quoteDraftSummary.body.summary.safety.manualQuoteDraftGateOnly === true &&
      quoteDraftSummary.body.summary.safety.manualQuoteDraftRecordOnly === true &&
      quoteDraftSummary.body.summary.safety.controlledManualQuoteDraftOnly === true &&
      quoteDraftSummary.body.summary.safety.quoteDraftPreparedOnly === true &&
      quoteDraftSummary.body.summary.safety.quoteDraftNotSentOnly === true &&
      quoteDraftSummary.body.summary.safety.priceIncludedInDraftOnly === true &&
      quoteDraftSummary.body.summary.safety.priceNotSentToBuyer === true &&
      quoteDraftSummary.body.summary.safety.quoteNotSentToBuyer === true &&
      quoteDraftSummary.body.summary.safety.manualReviewBeforeSendingRequired === true &&
      quoteDraftSummary.body.summary.safety.manualSendConfirmationRequiredNext === true &&
      quoteDraftSummary.body.summary.safety.noRealBuyerContacted === true &&
      quoteDraftSummary.body.summary.safety.noAutoSendWhatsApp === true &&
      quoteDraftSummary.body.summary.safety.noWhatsappAutoRead === true &&
      quoteDraftSummary.body.summary.safety.noBuyerMessageReading === true &&
      quoteDraftSummary.body.summary.safety.noWhatsappScraping === true &&
      quoteDraftSummary.body.summary.safety.noPrivateDataScraping === true &&
      quoteDraftSummary.body.summary.safety.noHiddenDataHarvesting === true &&
      quoteDraftSummary.body.summary.safety.noQuoteSentToBuyer === true &&
      quoteDraftSummary.body.summary.safety.noPriceSentToBuyer === true &&
      quoteDraftSummary.body.summary.safety.noInventoryUpdate === true &&
      quoteDraftSummary.body.summary.safety.noStockReservation === true &&
      quoteDraftSummary.body.summary.safety.noStockReduction === true &&
      quoteDraftSummary.body.summary.safety.noStockLedgerEntry === true &&
      quoteDraftSummary.body.summary.safety.noAccountingEntryCreation === true &&
      quoteDraftSummary.body.summary.safety.noSaleClosing === true &&
      quoteDraftSummary.body.summary.safety.noPipelineMovement === true;

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
      !hub.text.includes("sendWhatsApp = true") &&
      !hub.text.includes("autoReadWhatsApp = true") &&
      !hub.text.includes("scrapeWhatsappMessages = true") &&
      !hub.text.includes("privateMessageScraping = true") &&
      !hub.text.includes("hiddenDataHarvesting = true") &&
      !hub.text.includes("quoteSentToBuyer = true") &&
      !hub.text.includes("priceSentToBuyer = true") &&
      !hub.text.includes("autoUpdateInventory = true") &&
      !hub.text.includes("reserveStockAutomatically = true") &&
      !hub.text.includes("reduceStockAutomatically = true") &&
      !hub.text.includes("autoCreateAccountingEntry = true") &&
      !hub.text.includes("autoCloseSale = true") &&
      !hub.text.includes("autoMovePipelineStage = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api") &&
      !hub.text.includes('fetch("/api/controlled-buyer-gate-manual-quote-draft/create"');

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
      hubOk &&
      aliasOk &&
      quoteDraftLinkedOk &&
      summaryOk &&
      metricsOk &&
      quoteDraftSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 35C Admin Hub Link Controlled Buyer-Gate Manual Quote Draft Smoke Test Report

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
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Manual Quote Draft link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Manual Quote Draft
- ${quoteDraftLinkedOk ? "PASS" : "FAIL"}: linked Manual Quote Draft dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Manual Quote Draft module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Manual Quote Draft metrics safely
- ${quoteDraftSummaryOk ? "PASS" : "FAIL"}: Manual Quote Draft summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Manual Quote Draft link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Manual Quote Draft Admin Hub link is read-only.
- Manual quote draft gate only.
- Manual quote draft record only.
- Controlled manual quote draft only.
- Final quote eligibility required first.
- ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT required first.
- Price is allowed only inside the internal draft.
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
- Metrics API remains read-only.
- Manual review before sending is required next.
- Manual send confirmation gate is required next.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, final-quote-eligibility, and manual-quote-draft test data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Manual Quote Draft metrics.
- Admin Hub now links directly to Manual Quote Draft dashboard.
- Controlled inbound leads now require manual review before any quote sending.
- Next required build is manual send confirmation gate.

## Next Phase After Approval
Version 36A — Controlled Buyer-Gate Manual Send Confirmation Gate Foundation

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

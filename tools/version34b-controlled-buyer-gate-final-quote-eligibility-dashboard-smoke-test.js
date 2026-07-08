const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3118;
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
  "controlled-buyer-gate-final-quote-eligibilities.json"
];

const originalData = {};
for (const name of dataFiles) {
  const filePath = path.join(ROOT, "src", "data", name);
  originalData[filePath] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "[]";
}

const reportPath = path.join(ROOT, "reports", "version34b-controlled-buyer-gate-final-quote-eligibility-dashboard-smoke-test-report.md");

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
    leadReference: `controlled-dashboard-final-eligibility-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during final quote eligibility dashboard test.",
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
    reviewNote: "Manual lead review before final eligibility dashboard. No buyer contact. No quote prepared.",
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
    stockNote: "Manual stock check before final eligibility dashboard. No buyer contact. No quote prepared. No inventory mutation.",
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
    compatibilityNote: "Manual compatibility before final eligibility dashboard. No buyer contact. No quote prepared. No price included.",
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
    eligibilityNote: "Final quote eligibility dashboard test only. No buyer contact. No quote prepared. No price included. No quote sent.",
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
      const startupReport = `# Version 34B Controlled Buyer-Gate Final Quote Eligibility Dashboard Smoke Test Report

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

    const eligibility1 = await request("/api/controlled-buyer-gate-final-quote-eligibility/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeFinalEligibilityPayload(1, "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT"))
    });

    const eligibility4 = await request("/api/controlled-buyer-gate-final-quote-eligibility/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeFinalEligibilityPayload(4, "NEEDS_MANAGER_REVIEW"))
    });

    const page = await request("/controlled-buyer-gate-final-quote-eligibility");
    const aliasPage = await request("/controlled-buyer-gate-final-quote-eligibilities");
    const list = await request("/api/controlled-buyer-gate-final-quote-eligibilities");
    const summary = await request("/api/controlled-buyer-gate-final-quote-eligibility/summary");

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
      review4.status === 201 &&
      review1.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review4.body.review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK" &&
      review1.body.review.buyerContacted === false &&
      review1.body.review.quotePrepared === false;

    const stockChecksOk =
      stockCheck1.status === 201 &&
      stockCheck4.status === 201 &&
      stockCheck1.body.check.stockDecision === "STOCK_CONFIRMED_AVAILABLE" &&
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

    const eligibilitiesOk =
      eligibility1.status === 201 &&
      eligibility4.status === 201 &&
      eligibility1.body.record.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT" &&
      eligibility4.body.record.eligibilityDecision === "NEEDS_MANAGER_REVIEW" &&
      eligibility1.body.record.buyerContacted === false &&
      eligibility1.body.record.quotePrepared === false &&
      eligibility1.body.record.priceIncluded === false &&
      eligibility1.body.record.quoteSentToBuyer === false &&
      eligibility1.body.record.inventoryUpdated === false &&
      eligibility1.body.record.stockReserved === false &&
      eligibility1.body.record.stockReduced === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Controlled Buyer-Gate Final Quote Eligibility Dashboard") &&
      page.text.includes("Final Quote Eligibility Safety Rule") &&
      page.text.includes("Allowed Eligibility Decisions") &&
      page.text.includes("Controlled Buyer-Gate Final Quote Eligibility Records") &&
      page.text.includes("Final quote eligibility gate only") &&
      page.text.includes("Final quote eligibility record only") &&
      page.text.includes("Controlled final quote eligibility only") &&
      page.text.includes("Stock confirmation required first") &&
      page.text.includes("Compatibility confirmation required first") &&
      page.text.includes("No buyer contact from eligibility gate") &&
      page.text.includes("No quote prepared at eligibility gate") &&
      page.text.includes("No price included at eligibility gate") &&
      page.text.includes("No quote sent at eligibility gate") &&
      page.text.includes("Quote blocked until manual quote draft gate") &&
      page.text.includes("Manual quote draft required next") &&
      page.text.includes("No WhatsApp auto-send") &&
      page.text.includes("No WhatsApp auto-read") &&
      page.text.includes("No buyer message scraping") &&
      page.text.includes("No private-data scraping") &&
      page.text.includes("No hidden data harvesting") &&
      page.text.includes("No inventory update") &&
      page.text.includes("No stock reservation") &&
      page.text.includes("No stock reduction") &&
      page.text.includes("No stock ledger entry") &&
      page.text.includes("No accounting entry") &&
      page.text.includes("ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT") &&
      page.text.includes("NOT_ELIGIBLE_FOR_QUOTE") &&
      page.text.includes("NEEDS_MANAGER_REVIEW") &&
      page.text.includes("FINAL_QUOTE_ELIGIBILITY_RECORDED") &&
      page.text.includes("eligibilityRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Controlled Buyer-Gate Final Quote Eligibility Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.finalQuoteEligibilities) &&
      list.body.finalQuoteEligibilities.length === 2 &&
      list.body.finalQuoteEligibilities.every(item =>
        item.finalQuoteEligibilityStatus === "FINAL_QUOTE_ELIGIBILITY_RECORDED" &&
        item.buyerContacted === false &&
        item.autoSendWhatsApp === false &&
        item.autoReadWhatsApp === false &&
        item.quotePrepared === false &&
        item.priceIncluded === false &&
        item.quoteSentToBuyer === false &&
        item.inventoryUpdated === false &&
        item.stockReserved === false &&
        item.stockReduced === false &&
        item.autoCreateAccountingEntry === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalFinalQuoteEligibilities === 2 &&
      summary.body.summary.recordedFinalQuoteEligibilityCount === 2 &&
      summary.body.summary.eligibleForManualQuoteDraftCount === 1 &&
      summary.body.summary.needsManagerReviewCount === 1 &&
      summary.body.summary.latestFinalQuoteEligibilityStatus === "FINAL_QUOTE_ELIGIBILITY_RECORDED" &&
      summary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.safety &&
      summary.body.summary.safety.finalQuoteEligibilityGateOnly === true &&
      summary.body.summary.safety.finalQuoteEligibilityRecordOnly === true &&
      summary.body.summary.safety.controlledFinalQuoteEligibilityOnly === true &&
      summary.body.summary.safety.manualFinalQuoteEligibilityOnly === true &&
      summary.body.summary.safety.quoteEligibilityDecisionOnly === true &&
      summary.body.summary.safety.noRealBuyerContacted === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noWhatsappAutoRead === true &&
      summary.body.summary.safety.noBuyerMessageReading === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noQuotePrepared === true &&
      summary.body.summary.safety.noPriceIncluded === true &&
      summary.body.summary.safety.noQuoteSentToBuyer === true &&
      summary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      summary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      summary.body.summary.safety.quoteStillBlockedUntilDraftGate === true &&
      summary.body.summary.safety.manualQuoteDraftRequiredNext === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noStockReservation === true &&
      summary.body.summary.safety.noStockReduction === true &&
      summary.body.summary.safety.noStockLedgerEntry === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
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
      !page.text.includes("sendWhatsApp = true") &&
      !page.text.includes("autoReadWhatsApp = true") &&
      !page.text.includes("scrapeWhatsappMessages = true") &&
      !page.text.includes("privateMessageScraping = true") &&
      !page.text.includes("hiddenDataHarvesting = true") &&
      !page.text.includes("quotePrepared = true") &&
      !page.text.includes("autoCreateQuote = true") &&
      !page.text.includes("priceIncluded = true") &&
      !page.text.includes("quoteSentToBuyer = true") &&
      !page.text.includes("autoUpdateInventory = true") &&
      !page.text.includes("reserveStockAutomatically = true") &&
      !page.text.includes("reduceStockAutomatically = true") &&
      !page.text.includes("autoCreateAccountingEntry = true") &&
      !page.text.includes("autoCloseSale = true") &&
      !page.text.includes("autoMovePipelineStage = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/controlled-buyer-gate-final-quote-eligibility/create"');

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
      eligibilitiesOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 34B Controlled Buyer-Gate Final Quote Eligibility Dashboard Smoke Test Report

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
- ${eligibilitiesOk ? "PASS" : "FAIL"}: final quote eligibility records exist for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-final-quote-eligibility returns safe dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /controlled-buyer-gate-final-quote-eligibilities alias works
- ${listOk ? "PASS" : "FAIL"}: final quote eligibility list API returns dashboard data safely
- ${summaryOk ? "PASS" : "FAIL"}: final quote eligibility summary API confirms safe dashboard metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: Final Quote Eligibility dashboard remains read-only

## Safety Rules Confirmed
- Dashboard displays final quote eligibility records only.
- Dashboard is read-only.
- Final quote eligibility gate only.
- Final quote eligibility record only.
- Controlled final quote eligibility only.
- Stock confirmation required first.
- Compatibility confirmation required first.
- Final quote eligibility does not contact buyer.
- Final quote eligibility does not prepare quote.
- Final quote eligibility does not include price.
- Final quote eligibility does not send quote.
- Quote remains blocked until manual quote draft gate.
- Manual quote draft remains required next.
- No WhatsApp auto-send.
- No WhatsApp auto-read.
- No buyer message scraping.
- No private-data scraping.
- No hidden data harvesting.
- No inventory update.
- No stock reservation.
- No stock reduction.
- No stock ledger entry.
- No accounting entry creation.
- No sale closing.
- No pipeline movement.
- Assistant, guardian, plan, approval, execution, slot, review, stock-check, compatibility-check, and final-quote-eligibility test data restored after smoke test.

## Next Phase After Approval
Version 34C — Admin Hub Link Controlled Buyer-Gate Final Quote Eligibility

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

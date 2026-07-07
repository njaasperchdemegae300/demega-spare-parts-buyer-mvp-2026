const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const internalBuyerGateReadinessGuardianService = require("./internal-buyer-gate-readiness-guardian.service");

const plansPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-test-plans.json");

const approvedSources = [
  "owned_rfq_landing_page",
  "whatsapp_click_to_chat_inbound",
  "meta_lead_form",
  "google_buyer_intent_landing_page",
  "public_business_inquiry_form"
];

function ensureFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]", "utf8");
}

function readJsonArray(filePath) {
  ensureFile(filePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath, records) {
  ensureFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

function cleanText(value) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function unsafe(input) {
  return input.openLiveBuyerGate === true ||
    input.activateBuyerGate === true ||
    input.enableLiveTraffic === true ||
    input.contactRealBuyerAutomatically === true ||
    input.autoSendWhatsApp === true ||
    input.autoReadWhatsApp === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.autoUpdateInventory === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true;
}

function latestGuardianApproved() {
  const summary = internalBuyerGateReadinessGuardianService.getInternalBuyerGateReadinessSummary();
  return summary.latestVerdict === "APPROVED" &&
    summary.latestFailedCheckCount === 0 &&
    summary.liveGateCandidateOnlyAfterApproval === true;
}

function validatePlan(input) {
  const errors = [];
  const leadLimit = Number(input.leadLimit || 0);
  const source = cleanText(input.testSource);

  if (unsafe(input)) errors.push("Unsafe activation request blocked.");
  if (!latestGuardianApproved()) errors.push("Internal Buyer-Gate Readiness Guardian must be APPROVED first.");
  if (leadLimit !== 15) errors.push("leadLimit must be exactly 15 for first controlled test.");
  if (!approvedSources.includes(source)) errors.push(`testSource must be one of: ${approvedSources.join(", ")}.`);
  if (input.manualReviewRequired !== true) errors.push("manualReviewRequired must be true.");
  if (input.manualReplyOnly !== true) errors.push("manualReplyOnly must be true.");
  if (input.noAutoSend !== true) errors.push("noAutoSend must be true.");
  if (input.noSpam !== true) errors.push("noSpam must be true.");
  if (input.noPrivateDataScraping !== true) errors.push("noPrivateDataScraping must be true.");
  if (input.noQuoteBeforeStockConfirmation !== true) errors.push("noQuoteBeforeStockConfirmation must be true.");
  if (input.noQuoteBeforeCompatibilityConfirmation !== true) errors.push("noQuoteBeforeCompatibilityConfirmation must be true.");

  return errors;
}

function createControlledBuyerGateTestPlan(input = {}) {
  const errors = validatePlan(input);

  if (errors.length) {
    return { ok: false, statusCode: 400, errors };
  }

  const now = new Date().toISOString();

  const plan = {
    id: dataStore.createId("controlled_buyer_gate_test_plan"),
    planName: cleanText(input.planName || "Controlled 15-Lead Buyer-Gate Test Plan"),
    testSource: cleanText(input.testSource),
    leadLimit: 15,
    manualReviewRequired: true,
    manualReplyOnly: true,
    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    noPrivateDataScraping: true,
    noHiddenDataHarvesting: true,
    noQuoteBeforeStockConfirmation: true,
    noQuoteBeforeCompatibilityConfirmation: true,
    stockConfirmationRequired: true,
    compatibilityConfirmationRequired: true,
    assistantSalesAgentMustBeApproved: true,
    readinessGuardianMustBeApproved: true,
    controlledPlanOnly: true,
    buyerGateOpened: false,
    liveTrafficActivated: false,
    realBuyerContacted: false,
    autoSendWhatsApp: false,
    autoReadWhatsApp: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    autoUpdateInventory: false,
    autoCreateAccountingEntry: false,
    autoCloseSale: false,
    autoMovePipelineStage: false,
    manualApprovalRequiredBeforeActivation: true,
    createdBy: cleanText(input.createdBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const plans = readJsonArray(plansPath);
  plans.unshift(plan);
  writeJsonArray(plansPath, plans);

  return { ok: true, statusCode: 201, plan };
}

function listControlledBuyerGateTestPlans() {
  return readJsonArray(plansPath);
}

function getControlledBuyerGateTestPlanSummary() {
  const plans = listControlledBuyerGateTestPlans();
  const latest = plans[0] || null;

  return {
    totalPlans: plans.length,
    latestPlanStatus: latest ? "PLAN_READY_NOT_ACTIVATED" : "NO_PLAN",
    latestLeadLimit: latest ? latest.leadLimit : 0,
    latestTestSource: latest ? latest.testSource : "",
    activatedPlans: plans.filter(item => item.buyerGateOpened === true || item.liveTrafficActivated === true).length,
    safePlans: plans.filter(item => item.controlledPlanOnly === true && item.buyerGateOpened === false).length,
    safety: {
      controlledPlanOnly: true,
      buyerGateOpened: false,
      liveTrafficActivated: false,
      noRealBuyerContacted: true,
      noAutoSendWhatsApp: true,
      noWhatsappAutoRead: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      noInventoryUpdate: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true,
      manualApprovalRequiredBeforeActivation: true
    }
  };
}

function getControlledBuyerGateTestPlanPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Test Plan Foundation is active.",
    purpose: "Create a safe 15-lead controlled buyer-gate plan without opening live buyer traffic.",
    approvedSources,
    rules: [
      "15-lead limit only.",
      "Manual review required.",
      "Manual reply only.",
      "No auto-send.",
      "No spam.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "Buyer gate remains closed until later manual activation approval."
    ]
  };
}

module.exports = {
  createControlledBuyerGateTestPlan,
  listControlledBuyerGateTestPlans,
  getControlledBuyerGateTestPlanSummary,
  getControlledBuyerGateTestPlanPreview
};

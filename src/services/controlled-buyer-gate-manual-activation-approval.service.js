const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const controlledBuyerGateTestPlanService = require("./controlled-buyer-gate-test-plan.service");

const approvalsPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");

const requiredApprovalPhrase = "I_APPROVE_CONTROLLED_15_LEAD_MANUAL_TEST_PREPARATION_ONLY";

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
    input.startLiveBuyerTraffic === true ||
    input.liveTrafficActivated === true ||
    input.contactRealBuyerAutomatically === true ||
    input.contactBuyerAutomatically === true ||
    input.realBuyerContacted === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.harvestBuyerContacts === true ||
    input.autoUpdateInventory === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true;
}

function getLatestPlanSummary() {
  try {
    return controlledBuyerGateTestPlanService.getControlledBuyerGateTestPlanSummary();
  } catch (error) {
    return {
      totalPlans: 0,
      latestPlanStatus: "ERROR",
      latestLeadLimit: 0,
      latestTestSource: "",
      activatedPlans: 999,
      safePlans: 0,
      error: error.message,
      safety: {}
    };
  }
}

function validateApproval(input) {
  const errors = [];
  const planSummary = getLatestPlanSummary();

  if (unsafe(input)) {
    errors.push("Unsafe activation request blocked. This approval gate records manual approval only and must not open buyer gate, activate traffic, contact buyers, send/read WhatsApp, scrape, update inventory, create accounting entries, close sales, or move pipeline.");
  }

  if (planSummary.totalPlans < 1) errors.push("Controlled Buyer-Gate Test Plan must exist first.");
  if (planSummary.latestPlanStatus !== "PLAN_READY_NOT_ACTIVATED") errors.push("Latest controlled plan must be PLAN_READY_NOT_ACTIVATED.");
  if (Number(planSummary.latestLeadLimit || 0) !== 15) errors.push("Latest controlled plan must preserve 15-lead limit.");
  if (planSummary.latestTestSource !== "whatsapp_click_to_chat_inbound") errors.push("Latest controlled plan source must remain whatsapp_click_to_chat_inbound.");
  if (Number(planSummary.activatedPlans || 0) !== 0) errors.push("No controlled plan can already be activated before manual approval gate foundation.");

  if (input.adminReviewedPlan !== true) errors.push("adminReviewedPlan must be true.");
  if (input.adminReviewedSafety !== true) errors.push("adminReviewedSafety must be true.");
  if (input.adminConfirmedLeadLimit15 !== true) errors.push("adminConfirmedLeadLimit15 must be true.");
  if (input.adminConfirmedWhatsAppInboundOnly !== true) errors.push("adminConfirmedWhatsAppInboundOnly must be true.");
  if (input.adminConfirmedManualReviewRequired !== true) errors.push("adminConfirmedManualReviewRequired must be true.");
  if (input.adminConfirmedManualReplyOnly !== true) errors.push("adminConfirmedManualReplyOnly must be true.");
  if (input.adminConfirmedNoAutoSend !== true) errors.push("adminConfirmedNoAutoSend must be true.");
  if (input.adminConfirmedNoSpam !== true) errors.push("adminConfirmedNoSpam must be true.");
  if (input.adminConfirmedNoPrivateScraping !== true) errors.push("adminConfirmedNoPrivateScraping must be true.");
  if (input.adminConfirmedNoHiddenHarvesting !== true) errors.push("adminConfirmedNoHiddenHarvesting must be true.");
  if (input.adminConfirmedNoQuoteBeforeStock !== true) errors.push("adminConfirmedNoQuoteBeforeStock must be true.");
  if (input.adminConfirmedNoQuoteBeforeCompatibility !== true) errors.push("adminConfirmedNoQuoteBeforeCompatibility must be true.");
  if (cleanText(input.approvalPhrase) !== requiredApprovalPhrase) errors.push(`approvalPhrase must be exactly ${requiredApprovalPhrase}.`);

  return { errors, planSummary };
}

function createManualActivationApproval(input = {}) {
  const validation = validateApproval(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();

  const approval = {
    id: dataStore.createId("controlled_buyer_gate_manual_activation_approval"),
    approvalStatus: "APPROVED_NOT_ACTIVATED",
    approvalType: "CONTROLLED_15_LEAD_MANUAL_TEST_PREPARATION_ONLY",
    approvalPhrase: requiredApprovalPhrase,
    planSummary: validation.planSummary,

    manualActivationApprovalGateOnly: true,
    manualApprovalRecorded: true,
    approvedForControlledPreparationOnly: true,
    approvedForLiveActivationExecution: false,
    activationExecuted: false,

    controlledPlanOnly: true,
    controlled15LeadPlanOnly: true,
    leadLimit: 15,
    testSource: "whatsapp_click_to_chat_inbound",

    buyerGateOpened: false,
    openLiveBuyerGate: false,
    activateBuyerGate: false,
    enableLiveTraffic: false,
    startLiveBuyerTraffic: false,
    liveTrafficActivated: false,

    realBuyerContacted: false,
    contactRealBuyerAutomatically: false,
    contactBuyerAutomatically: false,

    autoSendWhatsApp: false,
    sendWhatsApp: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    harvestBuyerContacts: false,

    quoteBeforeStockConfirmation: false,
    quoteBeforeCompatibilityConfirmation: false,

    autoUpdateInventory: false,
    autoCreateAccountingEntry: false,
    autoCloseSale: false,
    autoMovePipelineStage: false,

    requiresSeparateActivationExecutionGateLater: true,
    requiresManualReviewBeforeAnyBuyerContact: true,
    requiresManualStockConfirmation: true,
    requiresManualCompatibilityConfirmation: true,
    requiresManualReplyOnly: true,

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
    adminConfirmedNoQuoteBeforeCompatibility: true,

    approvedBy: cleanText(input.approvedBy || "admin_manual"),
    approvalNote: cleanText(input.approvalNote || "Manual preparation approval recorded. Buyer gate remains closed."),
    createdAt: now,
    updatedAt: now
  };

  const approvals = readJsonArray(approvalsPath);
  approvals.unshift(approval);
  writeJsonArray(approvalsPath, approvals);

  return {
    ok: true,
    statusCode: 201,
    approval
  };
}

function listManualActivationApprovals() {
  return readJsonArray(approvalsPath);
}

function getManualActivationApprovalSummary() {
  const approvals = listManualActivationApprovals();
  const latest = approvals[0] || null;

  return {
    totalApprovals: approvals.length,
    latestApprovalStatus: latest ? latest.approvalStatus : "NO_APPROVAL",
    latestApprovalType: latest ? latest.approvalType : "",
    latestLeadLimit: latest ? latest.leadLimit : 0,
    latestTestSource: latest ? latest.testSource : "",
    approvedNotActivatedCount: approvals.filter(item => item.approvalStatus === "APPROVED_NOT_ACTIVATED").length,
    activatedCount: approvals.filter(item => item.activationExecuted === true || item.buyerGateOpened === true || item.liveTrafficActivated === true).length,
    safety: {
      manualActivationApprovalGateOnly: true,
      manualApprovalRecordedOnly: true,
      approvedForControlledPreparationOnly: true,
      approvedForLiveActivationExecution: false,
      activationExecuted: false,
      controlledPlanOnly: true,
      controlled15LeadPlanOnly: true,
      leadLimit: 15,
      testSource: "whatsapp_click_to_chat_inbound",
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
      separateActivationExecutionGateRequiredLater: true,
      manualReviewRequiredBeforeAnyBuyerContact: true
    }
  };
}

function getManualActivationApprovalPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Manual Activation Approval Gate Foundation is active.",
    purpose: "Record manual approval for controlled 15-lead test preparation only. This does not open buyer gate or activate live traffic.",
    requiredApprovalPhrase,
    rules: [
      "Manual approval record only.",
      "Buyer gate remains closed.",
      "Live traffic is not activated.",
      "No real buyer is contacted.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "No inventory update.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Separate activation execution gate is required later."
    ]
  };
}

module.exports = {
  createManualActivationApproval,
  listManualActivationApprovals,
  getManualActivationApprovalSummary,
  getManualActivationApprovalPreview
};

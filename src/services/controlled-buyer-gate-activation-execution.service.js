const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const manualActivationApprovalService = require("./controlled-buyer-gate-manual-activation-approval.service");

const executionsPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-activation-executions.json");

const requiredExecutionPhrase = "I_EXECUTE_CONTROLLED_15_LEAD_MANUAL_INBOUND_GATE_ONLY";

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
  return input.autoContactBuyer === true ||
    input.contactRealBuyerAutomatically === true ||
    input.contactBuyerAutomatically === true ||
    input.realBuyerContacted === true ||
    input.startOutboundTraffic === true ||
    input.startPaidAdsAutomatically === true ||
    input.publishLeadFormAutomatically === true ||
    input.broadcastWhatsApp === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.harvestBuyerContacts === true ||
    input.autoCreateQuoteAndSend === true ||
    input.quoteBeforeStockConfirmation === true ||
    input.quoteBeforeCompatibilityConfirmation === true ||
    input.autoUpdateInventory === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true;
}

function getLatestApprovalSummary() {
  try {
    return manualActivationApprovalService.getManualActivationApprovalSummary();
  } catch (error) {
    return {
      totalApprovals: 0,
      latestApprovalStatus: "ERROR",
      latestLeadLimit: 0,
      latestTestSource: "",
      activatedCount: 999,
      error: error.message,
      safety: {}
    };
  }
}

function listActivationExecutions() {
  return readJsonArray(executionsPath);
}

function validateExecution(input) {
  const errors = [];
  const approvalSummary = getLatestApprovalSummary();
  const existingExecutions = listActivationExecutions();

  if (unsafe(input)) {
    errors.push("Unsafe activation execution request blocked. Version 29A allows manual inbound 15-lead gate activation only. It must not contact buyers, start outbound traffic, send/read WhatsApp, scrape data, quote before stock/compatibility, update inventory, create accounting entries, close sales, or move pipeline.");
  }

  if (existingExecutions.some(item => item.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY" && item.controlledGateActive === true)) {
    errors.push("A controlled manual inbound activation execution already exists. Do not create duplicate active gate executions.");
  }

  if (approvalSummary.totalApprovals < 1) errors.push("Manual Activation Approval must exist first.");
  if (approvalSummary.latestApprovalStatus !== "APPROVED_NOT_ACTIVATED") errors.push("Latest manual approval must be APPROVED_NOT_ACTIVATED.");
  if (Number(approvalSummary.latestLeadLimit || 0) !== 15) errors.push("Latest manual approval must preserve 15-lead limit.");
  if (approvalSummary.latestTestSource !== "whatsapp_click_to_chat_inbound") errors.push("Latest manual approval source must remain whatsapp_click_to_chat_inbound.");
  if (Number(approvalSummary.activatedCount || 0) !== 0) errors.push("No prior activation execution can exist before Version 29A controlled execution.");

  if (input.adminReviewedApproval !== true) errors.push("adminReviewedApproval must be true.");
  if (input.adminConfirmedSeparateExecutionGate !== true) errors.push("adminConfirmedSeparateExecutionGate must be true.");
  if (input.adminConfirmed15LeadLimit !== true) errors.push("adminConfirmed15LeadLimit must be true.");
  if (input.adminConfirmedManualInboundOnly !== true) errors.push("adminConfirmedManualInboundOnly must be true.");
  if (input.adminConfirmedNoOutboundTraffic !== true) errors.push("adminConfirmedNoOutboundTraffic must be true.");
  if (input.adminConfirmedNoAutoContact !== true) errors.push("adminConfirmedNoAutoContact must be true.");
  if (input.adminConfirmedNoAutoSend !== true) errors.push("adminConfirmedNoAutoSend must be true.");
  if (input.adminConfirmedNoWhatsAppRead !== true) errors.push("adminConfirmedNoWhatsAppRead must be true.");
  if (input.adminConfirmedNoPrivateScraping !== true) errors.push("adminConfirmedNoPrivateScraping must be true.");
  if (input.adminConfirmedNoHiddenHarvesting !== true) errors.push("adminConfirmedNoHiddenHarvesting must be true.");
  if (input.adminConfirmedNoQuoteBeforeStock !== true) errors.push("adminConfirmedNoQuoteBeforeStock must be true.");
  if (input.adminConfirmedNoQuoteBeforeCompatibility !== true) errors.push("adminConfirmedNoQuoteBeforeCompatibility must be true.");
  if (input.adminConfirmedManualReviewBeforeBuyerContact !== true) errors.push("adminConfirmedManualReviewBeforeBuyerContact must be true.");
  if (cleanText(input.executionPhrase) !== requiredExecutionPhrase) errors.push(`executionPhrase must be exactly ${requiredExecutionPhrase}.`);

  return { errors, approvalSummary };
}

function createActivationExecution(input = {}) {
  const validation = validateExecution(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();

  const execution = {
    id: dataStore.createId("controlled_buyer_gate_activation_execution"),
    activationStatus: "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY",
    activationType: "CONTROLLED_15_LEAD_MANUAL_INBOUND_ONLY",
    executionPhrase: requiredExecutionPhrase,
    approvalSummary: validation.approvalSummary,

    activationExecutionGateOnly: true,
    controlledGateActive: true,
    controlledManualInboundOnly: true,
    controlled15LeadLimit: true,
    buyerGateOpenForManualInboundOnly: true,
    approvedForManualInboundLeadAcceptanceOnly: true,

    leadLimit: 15,
    acceptedLeadCount: 0,
    remainingLeadSlots: 15,
    testSource: "whatsapp_click_to_chat_inbound",

    buyerGateOpened: true,
    openLiveBuyerGate: false,
    activateBuyerGate: false,
    enableLiveTraffic: false,
    startLiveBuyerTraffic: false,
    liveTrafficActivated: false,
    liveTrafficPushStarted: false,
    outboundTrafficStarted: false,
    startOutboundTraffic: false,
    startPaidAdsAutomatically: false,
    publishLeadFormAutomatically: false,

    realBuyerContacted: false,
    autoContactBuyer: false,
    contactRealBuyerAutomatically: false,
    contactBuyerAutomatically: false,

    autoSendWhatsApp: false,
    sendWhatsApp: false,
    broadcastWhatsApp: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    harvestBuyerContacts: false,

    autoCreateQuoteAndSend: false,
    quoteBeforeStockConfirmation: false,
    quoteBeforeCompatibilityConfirmation: false,

    autoUpdateInventory: false,
    autoCreateAccountingEntry: false,
    autoCloseSale: false,
    autoMovePipelineStage: false,

    requiresLeadSlotEnforcementNext: true,
    requiresManualReviewBeforeAnyBuyerContact: true,
    requiresManualStockConfirmation: true,
    requiresManualCompatibilityConfirmation: true,
    requiresManualReplyOnly: true,
    requiresInboundBuyerInitiatedContact: true,
    noUnsolicitedWhatsApp: true,
    noSpam: true,

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
    adminConfirmedManualReviewBeforeBuyerContact: true,

    executedBy: cleanText(input.executedBy || "admin_manual"),
    executionNote: cleanText(input.executionNote || "Controlled 15-lead manual inbound gate activated. No outbound traffic or auto-contact."),
    createdAt: now,
    updatedAt: now
  };

  const executions = listActivationExecutions();
  executions.unshift(execution);
  writeJsonArray(executionsPath, executions);

  return {
    ok: true,
    statusCode: 201,
    execution
  };
}

function getActivationExecutionSummary() {
  const executions = listActivationExecutions();
  const latest = executions[0] || null;

  return {
    totalExecutions: executions.length,
    latestActivationStatus: latest ? latest.activationStatus : "NO_EXECUTION",
    latestActivationType: latest ? latest.activationType : "",
    latestLeadLimit: latest ? latest.leadLimit : 0,
    latestTestSource: latest ? latest.testSource : "",
    latestRemainingLeadSlots: latest ? latest.remainingLeadSlots : 0,
    activeManualInboundGateCount: executions.filter(item => item.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY" && item.controlledGateActive === true).length,
    outboundTrafficStartedCount: executions.filter(item => item.outboundTrafficStarted === true || item.liveTrafficPushStarted === true).length,
    autoContactCount: executions.filter(item => item.realBuyerContacted === true || item.autoContactBuyer === true || item.contactRealBuyerAutomatically === true).length,
    safety: {
      activationExecutionGateOnly: true,
      controlledGateActiveManualInboundOnly: latest ? latest.controlledGateActive === true : false,
      controlledManualInboundOnly: true,
      controlled15LeadLimit: true,
      buyerGateOpenForManualInboundOnly: latest ? latest.buyerGateOpenForManualInboundOnly === true : false,
      leadLimit: 15,
      remainingLeadSlots: latest ? latest.remainingLeadSlots : 0,
      testSource: "whatsapp_click_to_chat_inbound",

      liveTrafficPushStarted: false,
      outboundTrafficStarted: false,
      noPaidAdsStartedAutomatically: true,
      noLeadFormPublishedAutomatically: true,
      noRealBuyerContacted: true,
      noAutoContactBuyer: true,
      noAutoSendWhatsApp: true,
      noWhatsappAutoRead: true,
      noBuyerMessageReading: true,
      noWhatsappScraping: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      noInventoryUpdate: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true,
      leadSlotEnforcementRequiredNext: true,
      manualReviewRequiredBeforeAnyBuyerContact: true,
      inboundBuyerInitiatedContactRequired: true
    }
  };
}

function getActivationExecutionPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Activation Execution Gate Foundation is active.",
    purpose: "Execute controlled 15-lead manual inbound gate only. This does not contact buyers, push traffic, send/read WhatsApp, scrape, update inventory, create accounting entries, close sales, or move pipeline.",
    requiredExecutionPhrase,
    rules: [
      "Controlled 15-lead manual inbound gate only.",
      "Source remains WhatsApp click-to-chat inbound.",
      "No outbound traffic is started automatically.",
      "No real buyer is contacted automatically.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No buyer message scraping.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "No inventory update.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Lead-slot enforcement gate is required next."
    ]
  };
}

module.exports = {
  createActivationExecution,
  listActivationExecutions,
  getActivationExecutionSummary,
  getActivationExecutionPreview
};

const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const buyerReplyTrackingService = require("./controlled-buyer-gate-buyer-reply-tracking.service");

const followUpDecisionsPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-follow-up-decisions.json");

const requiredFollowUpDecisionPhrase = "I_CONFIRM_FOLLOW_UP_DECISION_ONLY_NO_AUTO_FOLLOW_UP_NO_SEND";
const requiredSource = "whatsapp_click_to_chat_inbound";
const requiredDecisionChannel = "admin_manual_follow_up_decision_only";

const allowedFollowUpDecisions = [
  "FOLLOW_UP_DECISION_CALL_BUYER_MANUALLY",
  "FOLLOW_UP_DECISION_SEND_PRODUCT_PROOF_MANUALLY",
  "FOLLOW_UP_DECISION_NEGOTIATE_MANUALLY",
  "FOLLOW_UP_DECISION_SEND_LOCATION_MANUALLY",
  "FOLLOW_UP_DECISION_WAIT_FOR_BUYER",
  "FOLLOW_UP_DECISION_CLOSE_AS_NOT_READY",
  "FOLLOW_UP_DECISION_COMPATIBILITY_CORRECTION_REQUIRED",
  "FOLLOW_UP_DECISION_NO_FOLLOW_UP_NOW"
];

const allowedFollowUpPriorities = [
  "URGENT",
  "HIGH",
  "NORMAL",
  "LOW",
  "NONE"
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

function listFollowUpDecisions() {
  return readJsonArray(followUpDecisionsPath);
}

function getBuyerReplyTrackingSummary() {
  try {
    return buyerReplyTrackingService.getBuyerReplyTrackingSummary();
  } catch (error) {
    return {
      totalBuyerReplyTrackings: 0,
      recordedBuyerReplyTrackingCount: 0,
      latestSource: "",
      error: error.message,
      safety: {}
    };
  }
}

function getBuyerReplyTrackings() {
  try {
    return buyerReplyTrackingService.listBuyerReplyTrackings();
  } catch {
    return [];
  }
}

function unsafe(input = {}) {
  return input.autoStartFollowUp === true ||
    input.autoScheduleFollowUp === true ||
    input.scheduleFollowUpAutomatically === true ||
    input.autoSendFollowUp === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.systemSendWhatsApp === true ||
    input.broadcastWhatsApp === true ||
    input.autoReplyToBuyer === true ||
    input.replyToBuyerAutomatically === true ||
    input.autoReadWhatsApp === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.autoContactBuyer === true ||
    input.contactRealBuyerAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.movePipelineAutomatically === true ||
    input.autoCloseSale === true ||
    input.closeSaleAutomatically === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCreateReceipt === true ||
    input.autoCreateInvoice === true ||
    input.autoUpdateInventory === true ||
    input.updateInventoryAutomatically === true ||
    input.reserveStockAutomatically === true ||
    input.reduceStockAutomatically === true ||
    input.autoCreateInventoryEvent === true ||
    input.autoCreateStockLedgerEntry === true ||
    input.startOutboundTraffic === true ||
    input.startPaidAdsAutomatically === true ||
    input.publishLeadFormAutomatically === true;
}

function validateFollowUpDecision(input = {}) {
  const errors = [];
  const buyerReplyTrackingSummary = getBuyerReplyTrackingSummary();
  const buyerReplyTrackings = getBuyerReplyTrackings();
  const existingDecisions = listFollowUpDecisions();

  if (unsafe(input)) {
    errors.push("Unsafe follow-up decision request blocked. This gate records admin manual follow-up decision only and must not auto-follow-up, auto-schedule, auto-send WhatsApp, auto-reply, auto-read WhatsApp, scrape messages, mutate inventory, create accounting records, close sale, or move pipeline.");
  }

  if (buyerReplyTrackingSummary.totalBuyerReplyTrackings < 1) {
    errors.push("At least one buyer reply tracking record must exist before follow-up decision.");
  }

  if (buyerReplyTrackingSummary.recordedBuyerReplyTrackingCount < 1) {
    errors.push("At least one BUYER_REPLY_TRACKING_RECORDED record is required before follow-up decision.");
  }

  const requestedSlotNumber = Number(input.slotNumber || 0);
  if (!Number.isInteger(requestedSlotNumber) || requestedSlotNumber < 1 || requestedSlotNumber > 15) {
    errors.push("slotNumber must be an integer from 1 to 15.");
  }

  const replyRecord = buyerReplyTrackings.find(item =>
    Number(item.slotNumber) === requestedSlotNumber &&
    item.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED"
  );

  if (!replyRecord) errors.push("Matching BUYER_REPLY_TRACKING_RECORDED record was not found for this slot.");
  if (replyRecord && replyRecord.source !== requiredSource) errors.push("Selected buyer reply tracking source must be whatsapp_click_to_chat_inbound.");
  if (replyRecord && replyRecord.autoReadWhatsApp === true) errors.push("Selected buyer reply tracking indicates WhatsApp auto-read, which is not allowed.");
  if (replyRecord && replyRecord.scrapeWhatsappMessages === true) errors.push("Selected buyer reply tracking indicates message scraping, which is not allowed.");
  if (replyRecord && replyRecord.autoReplyToBuyer === true) errors.push("Selected buyer reply tracking indicates auto-reply, which is not allowed.");
  if (replyRecord && replyRecord.autoStartFollowUp === true) errors.push("Selected buyer reply tracking indicates auto-follow-up, which is not allowed.");
  if (replyRecord && replyRecord.inventoryUpdated === true) errors.push("Selected buyer reply tracking indicates inventory mutation, which is not allowed.");
  if (replyRecord && replyRecord.autoCreateAccountingEntry === true) errors.push("Selected buyer reply tracking indicates accounting mutation, which is not allowed.");

  if (existingDecisions.some(item => item.slotNumber === requestedSlotNumber && item.followUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED")) {
    errors.push("This slot already has a completed follow-up decision record.");
  }

  const followUpDecision = cleanText(input.followUpDecision || "");
  const followUpPriority = cleanText(input.followUpPriority || "").toUpperCase();
  const decisionChannel = cleanText(input.decisionChannel || "");
  const decisionReason = cleanText(input.decisionReason || "");
  const decidedBy = cleanText(input.decidedBy || input.checkedBy || "admin_manual");
  const manualActionInstruction = cleanText(input.manualActionInstruction || "");

  if (!allowedFollowUpDecisions.includes(followUpDecision)) {
    errors.push(`followUpDecision must be one of: ${allowedFollowUpDecisions.join(", ")}.`);
  }

  if (!allowedFollowUpPriorities.includes(followUpPriority)) {
    errors.push(`followUpPriority must be one of: ${allowedFollowUpPriorities.join(", ")}.`);
  }

  if (decisionChannel !== requiredDecisionChannel) {
    errors.push(`decisionChannel must be exactly ${requiredDecisionChannel}.`);
  }

  if (!decisionReason) errors.push("decisionReason is required.");
  if (!decidedBy) errors.push("decidedBy is required.");
  if (followUpDecision !== "FOLLOW_UP_DECISION_NO_FOLLOW_UP_NOW" && !manualActionInstruction) {
    errors.push("manualActionInstruction is required unless followUpDecision is FOLLOW_UP_DECISION_NO_FOLLOW_UP_NOW.");
  }

  if (input.adminReviewedBuyerReplyTracking !== true) errors.push("adminReviewedBuyerReplyTracking must be true.");
  if (input.adminMadeFollowUpDecisionManually !== true) errors.push("adminMadeFollowUpDecisionManually must be true.");
  if (input.adminConfirmedNoAutoFollowUp !== true) errors.push("adminConfirmedNoAutoFollowUp must be true.");
  if (input.adminConfirmedNoAutoSchedule !== true) errors.push("adminConfirmedNoAutoSchedule must be true.");
  if (input.adminConfirmedNoAutoSend !== true) errors.push("adminConfirmedNoAutoSend must be true.");
  if (input.adminConfirmedNoAutoReply !== true) errors.push("adminConfirmedNoAutoReply must be true.");
  if (input.adminConfirmedNoWhatsAppRead !== true) errors.push("adminConfirmedNoWhatsAppRead must be true.");
  if (input.adminConfirmedNoMessageScraping !== true) errors.push("adminConfirmedNoMessageScraping must be true.");
  if (input.adminConfirmedNoPrivateScraping !== true) errors.push("adminConfirmedNoPrivateScraping must be true.");
  if (input.adminConfirmedNoHiddenHarvesting !== true) errors.push("adminConfirmedNoHiddenHarvesting must be true.");
  if (input.adminConfirmedNoInventoryMutation !== true) errors.push("adminConfirmedNoInventoryMutation must be true.");
  if (input.adminConfirmedNoStockReservation !== true) errors.push("adminConfirmedNoStockReservation must be true.");
  if (input.adminConfirmedNoStockReduction !== true) errors.push("adminConfirmedNoStockReduction must be true.");
  if (input.adminConfirmedNoAccountingEntry !== true) errors.push("adminConfirmedNoAccountingEntry must be true.");
  if (input.adminConfirmedNoReceipt !== true) errors.push("adminConfirmedNoReceipt must be true.");
  if (input.adminConfirmedNoInvoice !== true) errors.push("adminConfirmedNoInvoice must be true.");
  if (input.adminConfirmedNoSaleClosed !== true) errors.push("adminConfirmedNoSaleClosed must be true.");
  if (input.adminConfirmedNoPipelineMove !== true) errors.push("adminConfirmedNoPipelineMove must be true.");
  if (input.adminConfirmedManualActionRequiredOutsideSystem !== true) errors.push("adminConfirmedManualActionRequiredOutsideSystem must be true.");
  if (input.adminConfirmedNoSystemExecution !== true) errors.push("adminConfirmedNoSystemExecution must be true.");

  if (cleanText(input.followUpDecisionPhrase) !== requiredFollowUpDecisionPhrase) {
    errors.push(`followUpDecisionPhrase must be exactly ${requiredFollowUpDecisionPhrase}.`);
  }

  return {
    errors,
    buyerReplyTrackingSummary,
    replyRecord,
    followUpDecision,
    followUpPriority,
    decisionChannel,
    decisionReason,
    decidedBy,
    manualActionInstruction
  };
}

function createFollowUpDecision(input = {}) {
  const validation = validateFollowUpDecision(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();
  const replyRecord = validation.replyRecord || {};

  const record = {
    id: dataStore.createId("controlled_buyer_gate_follow_up_decision"),
    followUpDecisionStatus: "FOLLOW_UP_DECISION_RECORDED",
    followUpDecisionType: "CONTROLLED_FOLLOW_UP_DECISION_ONLY",
    followUpDecisionPhrase: requiredFollowUpDecisionPhrase,

    followUpDecisionGateOnly: true,
    followUpDecisionRecordOnly: true,
    controlledFollowUpDecisionOnly: true,
    adminManualDecisionOnly: true,
    systemExecutionBlocked: true,
    manualActionRequiredOutsideSystem: true,
    noAutoFollowUp: true,
    noAutoSchedule: true,
    noAutoSend: true,
    noAutoReply: true,
    noPipelineMovement: true,
    noSaleClosing: true,
    noInventoryMutation: true,
    noAccountingMutation: true,

    slotId: replyRecord.slotId || "",
    slotNumber: replyRecord.slotNumber,
    buyerReplyTrackingId: replyRecord.id || "",
    buyerReplyTrackingStatus: replyRecord.buyerReplyTrackingStatus || "",
    manualSendConfirmationId: replyRecord.manualSendConfirmationId || "",
    manualSendConfirmationStatus: replyRecord.manualSendConfirmationStatus || "",
    manualQuoteDraftId: replyRecord.manualQuoteDraftId || "",
    manualQuoteDraftStatus: replyRecord.manualQuoteDraftStatus || "",
    finalQuoteEligibilityId: replyRecord.finalQuoteEligibilityId || "",
    finalQuoteEligibilityStatus: replyRecord.finalQuoteEligibilityStatus || "",
    compatibilityCheckId: replyRecord.compatibilityCheckId || "",
    compatibilityDecision: replyRecord.compatibilityDecision || "",
    stockCheckId: replyRecord.stockCheckId || "",
    stockDecision: replyRecord.stockDecision || "",
    reviewId: replyRecord.reviewId || "",
    reviewDecision: replyRecord.reviewDecision || "",
    leadLimit: 15,
    source: requiredSource,

    leadReference: cleanText(replyRecord.leadReference || input.leadReference || ""),
    partNeeded: cleanText(replyRecord.partNeeded || input.partNeeded || ""),
    vehicleDetail: cleanText(replyRecord.vehicleDetail || input.vehicleDetail || ""),
    buyerLocation: cleanText(replyRecord.buyerLocation || input.buyerLocation || ""),
    buyerIntentProof: cleanText(replyRecord.buyerIntentProof || input.buyerIntentProof || ""),

    quotedPartName: cleanText(replyRecord.quotedPartName || ""),
    quotedCondition: cleanText(replyRecord.quotedCondition || ""),
    quantity: replyRecord.quantity || 0,
    unitPrice: replyRecord.unitPrice || 0,
    totalPrice: replyRecord.totalPrice || 0,
    currency: replyRecord.currency || "",

    buyerReplyStatus: cleanText(replyRecord.buyerReplyStatus || ""),
    buyerReplyTemperature: cleanText(replyRecord.buyerReplyTemperature || ""),
    buyerReplyText: cleanText(replyRecord.buyerReplyText || ""),

    followUpDecision: validation.followUpDecision,
    followUpPriority: validation.followUpPriority,
    decisionChannel: validation.decisionChannel,
    decisionReason: validation.decisionReason,
    manualActionInstruction: validation.manualActionInstruction,
    decidedBy: validation.decidedBy,

    buyerReplyTrackingSummary: validation.buyerReplyTrackingSummary,

    adminReviewedBuyerReplyTracking: true,
    adminMadeFollowUpDecisionManually: true,
    adminConfirmedManualActionRequiredOutsideSystem: true,
    adminConfirmedNoSystemExecution: true,

    autoStartFollowUp: false,
    autoScheduleFollowUp: false,
    scheduleFollowUpAutomatically: false,
    autoSendFollowUp: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
    systemSendWhatsApp: false,
    broadcastWhatsApp: false,
    autoReplyToBuyer: false,
    replyToBuyerAutomatically: false,
    autoReadWhatsApp: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    autoContactBuyer: false,
    contactRealBuyerAutomatically: false,
    autoMovePipelineStage: false,
    movePipelineAutomatically: false,
    autoCloseSale: false,
    closeSaleAutomatically: false,
    autoCreateAccountingEntry: false,
    autoCreateReceipt: false,
    autoCreateInvoice: false,
    inventoryUpdated: false,
    stockReserved: false,
    stockReduced: false,
    autoUpdateInventory: false,
    updateInventoryAutomatically: false,
    reserveStockAutomatically: false,
    reduceStockAutomatically: false,
    autoCreateInventoryEvent: false,
    autoCreateStockLedgerEntry: false,
    startOutboundTraffic: false,
    startPaidAdsAutomatically: false,
    publishLeadFormAutomatically: false,

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

    createdAt: now,
    updatedAt: now
  };

  const records = listFollowUpDecisions();
  records.unshift(record);
  writeJsonArray(followUpDecisionsPath, records);

  return {
    ok: true,
    statusCode: 201,
    record
  };
}

function getFollowUpDecisionSummary() {
  const records = listFollowUpDecisions();
  const recorded = records.filter(item => item.followUpDecisionStatus === "FOLLOW_UP_DECISION_RECORDED");
  const urgent = records.filter(item => item.followUpPriority === "URGENT");
  const high = records.filter(item => item.followUpPriority === "HIGH");
  const normal = records.filter(item => item.followUpPriority === "NORMAL");
  const manualActionRequired = records.filter(item => item.manualActionRequiredOutsideSystem === true);
  const latest = records[0] || null;

  return {
    totalFollowUpDecisions: records.length,
    recordedFollowUpDecisionCount: recorded.length,
    urgentFollowUpDecisionCount: urgent.length,
    highFollowUpDecisionCount: high.length,
    normalFollowUpDecisionCount: normal.length,
    manualActionRequiredCount: manualActionRequired.length,
    latestFollowUpDecisionStatus: latest ? latest.followUpDecisionStatus : "NO_FOLLOW_UP_DECISION",
    latestFollowUpDecision: latest ? latest.followUpDecision : "",
    latestFollowUpPriority: latest ? latest.followUpPriority : "",
    latestBuyerReplyStatus: latest ? latest.buyerReplyStatus : "",
    latestBuyerReplyTemperature: latest ? latest.buyerReplyTemperature : "",
    latestSlotNumber: latest ? latest.slotNumber : 0,
    latestSource: latest ? latest.source : "",
    latestDecisionChannel: latest ? latest.decisionChannel : "",
    safety: {
      followUpDecisionGateOnly: true,
      followUpDecisionRecordOnly: true,
      controlledFollowUpDecisionOnly: true,
      adminManualDecisionOnly: true,
      systemExecutionBlocked: true,
      manualActionRequiredOutsideSystem: true,
      noAutoFollowUp: true,
      noAutoSchedule: true,
      noAutoSend: true,
      noAutoReply: true,
      noPipelineMovement: true,
      noSaleClosing: true,
      noInventoryMutation: true,
      noAccountingMutation: true,
      leadLimit: 15,
      source: requiredSource,
      noAutoReadWhatsApp: true,
      noBuyerMessageReading: true,
      noWhatsappScraping: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noAutoContactBuyer: true,
      noAutoSendWhatsApp: true,
      noSystemSendWhatsApp: true,
      noInventoryUpdate: true,
      noStockReservation: true,
      noStockReduction: true,
      noStockLedgerEntry: true,
      noAccountingEntryCreation: true,
      noReceiptCreation: true,
      noInvoiceCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true
    }
  };
}

function getFollowUpDecisionPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Follow-Up Decision Gate Foundation is active.",
    purpose: "Record admin manual follow-up decisions after buyer reply tracking. This gate does not execute follow-up, does not send WhatsApp, does not auto-reply, does not auto-schedule, does not move pipeline, does not update inventory, does not create accounting records, and does not close sales.",
    requiredFollowUpDecisionPhrase,
    requiredDecisionChannel,
    allowedFollowUpDecisions,
    allowedFollowUpPriorities,
    rules: [
      "Follow-up decision record only.",
      "Buyer reply tracking must already be recorded.",
      "Admin must decide follow-up manually.",
      "The system must not auto-follow-up.",
      "The system must not auto-schedule follow-up.",
      "The system must not send WhatsApp.",
      "The system must not auto-reply.",
      "The system must not read WhatsApp.",
      "The system must not scrape buyer messages.",
      "No inventory update.",
      "No stock reservation.",
      "No stock reduction.",
      "No accounting entry creation.",
      "No receipt creation.",
      "No invoice creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Manual action happens outside the system after admin decision."
    ]
  };
}

module.exports = {
  createFollowUpDecision,
  listFollowUpDecisions,
  getFollowUpDecisionSummary,
  getFollowUpDecisionPreview
};

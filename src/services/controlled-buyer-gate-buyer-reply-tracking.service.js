const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const manualSendConfirmationService = require("./controlled-buyer-gate-manual-send-confirmation.service");

const buyerReplyTrackingsPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-buyer-reply-trackings.json");

const requiredBuyerReplyTrackingPhrase = "I_CONFIRM_BUYER_REPLY_TRACKING_ONLY_MANUALLY_OBSERVED_NO_AUTO_READ";
const requiredSource = "whatsapp_click_to_chat_inbound";
const requiredManualObservationChannel = "admin_manual_observed_whatsapp_outside_system";

const allowedReplyStatuses = [
  "BUYER_REPLIED_INTERESTED",
  "BUYER_REPLIED_PRICE_NEGOTIATION",
  "BUYER_REPLIED_NEEDS_MORE_INFO",
  "BUYER_REPLIED_NOT_READY",
  "BUYER_REPLIED_NO_LONGER_INTERESTED",
  "NO_REPLY_YET"
];

const allowedReplyTemperatures = [
  "HOT",
  "WARM",
  "COLD",
  "NO_REPLY"
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

function listBuyerReplyTrackings() {
  return readJsonArray(buyerReplyTrackingsPath);
}

function getManualSendConfirmationSummary() {
  try {
    return manualSendConfirmationService.getManualSendConfirmationSummary();
  } catch (error) {
    return {
      totalManualSendConfirmations: 0,
      recordedManualSendConfirmationCount: 0,
      latestSource: "",
      error: error.message,
      safety: {}
    };
  }
}

function getManualSendConfirmations() {
  try {
    return manualSendConfirmationService.listManualSendConfirmations();
  } catch {
    return [];
  }
}

function unsafe(input = {}) {
  return input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.harvestBuyerContacts === true ||
    input.autoContactBuyer === true ||
    input.contactRealBuyerAutomatically === true ||
    input.contactBuyerAutomatically === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.systemSendWhatsApp === true ||
    input.broadcastWhatsApp === true ||
    input.autoReplyToBuyer === true ||
    input.autoStartFollowUp === true ||
    input.autoScheduleFollowUp === true ||
    input.autoMovePipelineStage === true ||
    input.autoCloseSale === true ||
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

function validateBuyerReplyTracking(input = {}) {
  const errors = [];
  const manualSendConfirmationSummary = getManualSendConfirmationSummary();
  const manualSendConfirmations = getManualSendConfirmations();
  const existingTrackings = listBuyerReplyTrackings();

  if (unsafe(input)) {
    errors.push("Unsafe buyer reply tracking request blocked. This gate records manually observed buyer replies only and must not auto-read WhatsApp, scrape messages, auto-contact, auto-send, auto-reply, auto-follow-up, mutate inventory, create accounting records, close sales, or move pipeline.");
  }

  if (manualSendConfirmationSummary.totalManualSendConfirmations < 1) {
    errors.push("At least one manual send confirmation must exist before buyer reply tracking.");
  }

  if (manualSendConfirmationSummary.recordedManualSendConfirmationCount < 1) {
    errors.push("At least one MANUAL_SEND_CONFIRMATION_RECORDED record is required before buyer reply tracking.");
  }

  if (manualSendConfirmationSummary.latestSource !== requiredSource) {
    errors.push("Latest manual send confirmation source must remain whatsapp_click_to_chat_inbound.");
  }

  const requestedSlotNumber = Number(input.slotNumber || 0);
  if (!Number.isInteger(requestedSlotNumber) || requestedSlotNumber < 1 || requestedSlotNumber > 15) {
    errors.push("slotNumber must be an integer from 1 to 15.");
  }

  const sendRecord = manualSendConfirmations.find(item =>
    Number(item.slotNumber) === requestedSlotNumber &&
    item.manualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED" &&
    item.quoteManuallySentOutsideSystem === true
  );

  if (!sendRecord) errors.push("Matching MANUAL_SEND_CONFIRMATION_RECORDED record was not found for this slot.");
  if (sendRecord && sendRecord.source !== requiredSource) errors.push("Selected manual send confirmation source must be whatsapp_click_to_chat_inbound.");
  if (sendRecord && sendRecord.systemQuoteSentToBuyer === true) errors.push("Selected send confirmation indicates system quote sent, which is not allowed.");
  if (sendRecord && sendRecord.systemPriceSentToBuyer === true) errors.push("Selected send confirmation indicates system price sent, which is not allowed.");
  if (sendRecord && sendRecord.autoSendWhatsApp === true) errors.push("Selected send confirmation indicates WhatsApp automation, which is not allowed.");
  if (sendRecord && sendRecord.inventoryUpdated === true) errors.push("Selected send confirmation indicates inventory mutation, which is not allowed.");
  if (sendRecord && sendRecord.autoCreateAccountingEntry === true) errors.push("Selected send confirmation indicates accounting mutation, which is not allowed.");

  if (existingTrackings.some(item => item.slotNumber === requestedSlotNumber && item.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED")) {
    errors.push("This slot already has a completed buyer reply tracking record.");
  }

  const buyerReplyStatus = cleanText(input.buyerReplyStatus || "");
  const buyerReplyTemperature = cleanText(input.buyerReplyTemperature || "").toUpperCase();
  const manualObservationChannel = cleanText(input.manualObservationChannel || "");
  const buyerReplyText = cleanText(input.buyerReplyText || "");
  const observedBy = cleanText(input.observedBy || input.checkedBy || "admin_manual");
  const observationNote = cleanText(input.observationNote || "");

  if (!allowedReplyStatuses.includes(buyerReplyStatus)) {
    errors.push(`buyerReplyStatus must be one of: ${allowedReplyStatuses.join(", ")}.`);
  }

  if (!allowedReplyTemperatures.includes(buyerReplyTemperature)) {
    errors.push(`buyerReplyTemperature must be one of: ${allowedReplyTemperatures.join(", ")}.`);
  }

  if (manualObservationChannel !== requiredManualObservationChannel) {
    errors.push(`manualObservationChannel must be exactly ${requiredManualObservationChannel}.`);
  }

  if (buyerReplyStatus !== "NO_REPLY_YET" && !buyerReplyText) {
    errors.push("buyerReplyText is required unless buyerReplyStatus is NO_REPLY_YET.");
  }

  if (!observedBy) errors.push("observedBy is required.");

  if (input.adminReviewedManualSendConfirmation !== true) errors.push("adminReviewedManualSendConfirmation must be true.");
  if (input.adminObservedBuyerReplyManuallyOutsideSystem !== true) errors.push("adminObservedBuyerReplyManuallyOutsideSystem must be true.");
  if (input.adminConfirmedSystemDidNotReadWhatsApp !== true) errors.push("adminConfirmedSystemDidNotReadWhatsApp must be true.");
  if (input.adminConfirmedNoAutoRead !== true) errors.push("adminConfirmedNoAutoRead must be true.");
  if (input.adminConfirmedNoMessageScraping !== true) errors.push("adminConfirmedNoMessageScraping must be true.");
  if (input.adminConfirmedNoPrivateScraping !== true) errors.push("adminConfirmedNoPrivateScraping must be true.");
  if (input.adminConfirmedNoHiddenHarvesting !== true) errors.push("adminConfirmedNoHiddenHarvesting must be true.");
  if (input.adminConfirmedNoAutoReply !== true) errors.push("adminConfirmedNoAutoReply must be true.");
  if (input.adminConfirmedNoAutoSend !== true) errors.push("adminConfirmedNoAutoSend must be true.");
  if (input.adminConfirmedNoAutoFollowUp !== true) errors.push("adminConfirmedNoAutoFollowUp must be true.");
  if (input.adminConfirmedNoInventoryMutation !== true) errors.push("adminConfirmedNoInventoryMutation must be true.");
  if (input.adminConfirmedNoStockReservation !== true) errors.push("adminConfirmedNoStockReservation must be true.");
  if (input.adminConfirmedNoStockReduction !== true) errors.push("adminConfirmedNoStockReduction must be true.");
  if (input.adminConfirmedNoAccountingEntry !== true) errors.push("adminConfirmedNoAccountingEntry must be true.");
  if (input.adminConfirmedNoReceipt !== true) errors.push("adminConfirmedNoReceipt must be true.");
  if (input.adminConfirmedNoInvoice !== true) errors.push("adminConfirmedNoInvoice must be true.");
  if (input.adminConfirmedNoSaleClosed !== true) errors.push("adminConfirmedNoSaleClosed must be true.");
  if (input.adminConfirmedNoPipelineMove !== true) errors.push("adminConfirmedNoPipelineMove must be true.");
  if (input.adminConfirmedFollowUpDecisionGateRequiredNext !== true) errors.push("adminConfirmedFollowUpDecisionGateRequiredNext must be true.");
  if (cleanText(input.buyerReplyTrackingPhrase) !== requiredBuyerReplyTrackingPhrase) {
    errors.push(`buyerReplyTrackingPhrase must be exactly ${requiredBuyerReplyTrackingPhrase}.`);
  }

  return {
    errors,
    manualSendConfirmationSummary,
    sendRecord,
    buyerReplyStatus,
    buyerReplyTemperature,
    manualObservationChannel,
    buyerReplyText,
    observedBy,
    observationNote
  };
}

function createBuyerReplyTracking(input = {}) {
  const validation = validateBuyerReplyTracking(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();
  const sendRecord = validation.sendRecord || {};

  const record = {
    id: dataStore.createId("controlled_buyer_gate_buyer_reply_tracking"),
    buyerReplyTrackingStatus: "BUYER_REPLY_TRACKING_RECORDED",
    buyerReplyTrackingType: "CONTROLLED_BUYER_REPLY_TRACKING_ONLY",
    buyerReplyTrackingPhrase: requiredBuyerReplyTrackingPhrase,

    buyerReplyTrackingGateOnly: true,
    buyerReplyTrackingRecordOnly: true,
    controlledBuyerReplyTrackingOnly: true,
    manualBuyerReplyObservationOnly: true,
    adminObservedOutsideSystemOnly: true,
    systemDidNotReadBuyerReply: true,
    noAutoReply: true,
    noAutoFollowUp: true,
    followUpDecisionGateRequiredNext: true,

    slotId: sendRecord.slotId || "",
    slotNumber: sendRecord.slotNumber,
    manualSendConfirmationId: sendRecord.id || "",
    manualSendConfirmationStatus: sendRecord.manualSendConfirmationStatus || "",
    manualQuoteDraftId: sendRecord.manualQuoteDraftId || "",
    manualQuoteDraftStatus: sendRecord.manualQuoteDraftStatus || "",
    finalQuoteEligibilityId: sendRecord.finalQuoteEligibilityId || "",
    finalQuoteEligibilityStatus: sendRecord.finalQuoteEligibilityStatus || "",
    eligibilityDecision: sendRecord.eligibilityDecision || "",
    compatibilityCheckId: sendRecord.compatibilityCheckId || "",
    compatibilityDecision: sendRecord.compatibilityDecision || "",
    stockCheckId: sendRecord.stockCheckId || "",
    stockDecision: sendRecord.stockDecision || "",
    reviewId: sendRecord.reviewId || "",
    reviewDecision: sendRecord.reviewDecision || "",
    leadLimit: 15,
    source: requiredSource,

    leadReference: cleanText(sendRecord.leadReference || input.leadReference || ""),
    partNeeded: cleanText(sendRecord.partNeeded || input.partNeeded || ""),
    vehicleDetail: cleanText(sendRecord.vehicleDetail || input.vehicleDetail || ""),
    buyerLocation: cleanText(sendRecord.buyerLocation || input.buyerLocation || ""),
    buyerIntentProof: cleanText(sendRecord.buyerIntentProof || input.buyerIntentProof || ""),

    quotedPartName: cleanText(sendRecord.quotedPartName || ""),
    quotedCondition: cleanText(sendRecord.quotedCondition || ""),
    quantity: sendRecord.quantity || 0,
    unitPrice: sendRecord.unitPrice || 0,
    totalPrice: sendRecord.totalPrice || 0,
    currency: sendRecord.currency || "",

    buyerReplyStatus: validation.buyerReplyStatus,
    buyerReplyTemperature: validation.buyerReplyTemperature,
    buyerReplyText: validation.buyerReplyText,
    manualObservationChannel: validation.manualObservationChannel,
    observationNote: validation.observationNote,
    observedBy: validation.observedBy,

    manualSendConfirmationSummary: validation.manualSendConfirmationSummary,

    adminReviewedManualSendConfirmation: true,
    adminObservedBuyerReplyManuallyOutsideSystem: true,
    adminConfirmedSystemDidNotReadWhatsApp: true,

    buyerReplyObservedManuallyOutsideSystem: true,
    buyerReplyRecordedByAdmin: true,

    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    harvestBuyerContacts: false,

    autoContactBuyer: false,
    contactRealBuyerAutomatically: false,
    contactBuyerAutomatically: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
    systemSendWhatsApp: false,
    broadcastWhatsApp: false,
    autoReplyToBuyer: false,
    autoStartFollowUp: false,
    autoScheduleFollowUp: false,

    startOutboundTraffic: false,
    startPaidAdsAutomatically: false,
    publishLeadFormAutomatically: false,

    inventoryUpdated: false,
    stockReserved: false,
    stockReduced: false,
    stockReleased: false,
    autoUpdateInventory: false,
    updateInventoryAutomatically: false,
    reserveStockAutomatically: false,
    reduceStockAutomatically: false,
    autoCreateInventoryEvent: false,
    autoCreateStockLedgerEntry: false,

    autoCreateAccountingEntry: false,
    autoCreateReceipt: false,
    autoCreateInvoice: false,
    autoCloseSale: false,
    autoMovePipelineStage: false,

    noAutoRead: true,
    noMessageScraping: true,
    noAutoReply: true,
    noAutoSend: true,
    noAutoFollowUp: true,
    noPrivateDataScraping: true,
    noHiddenDataHarvesting: true,

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
    adminConfirmedFollowUpDecisionGateRequiredNext: true,

    createdAt: now,
    updatedAt: now
  };

  const records = listBuyerReplyTrackings();
  records.unshift(record);
  writeJsonArray(buyerReplyTrackingsPath, records);

  return {
    ok: true,
    statusCode: 201,
    record
  };
}

function getBuyerReplyTrackingSummary() {
  const records = listBuyerReplyTrackings();
  const recorded = records.filter(item => item.buyerReplyTrackingStatus === "BUYER_REPLY_TRACKING_RECORDED");
  const hot = records.filter(item => item.buyerReplyTemperature === "HOT");
  const warm = records.filter(item => item.buyerReplyTemperature === "WARM");
  const cold = records.filter(item => item.buyerReplyTemperature === "COLD");
  const noReply = records.filter(item => item.buyerReplyTemperature === "NO_REPLY" || item.buyerReplyStatus === "NO_REPLY_YET");
  const latest = records[0] || null;

  return {
    totalBuyerReplyTrackings: records.length,
    recordedBuyerReplyTrackingCount: recorded.length,
    hotReplyCount: hot.length,
    warmReplyCount: warm.length,
    coldReplyCount: cold.length,
    noReplyCount: noReply.length,
    latestBuyerReplyTrackingStatus: latest ? latest.buyerReplyTrackingStatus : "NO_BUYER_REPLY_TRACKING",
    latestBuyerReplyStatus: latest ? latest.buyerReplyStatus : "",
    latestBuyerReplyTemperature: latest ? latest.buyerReplyTemperature : "",
    latestSlotNumber: latest ? latest.slotNumber : 0,
    latestSource: latest ? latest.source : "",
    latestObservationChannel: latest ? latest.manualObservationChannel : "",
    safety: {
      buyerReplyTrackingGateOnly: true,
      buyerReplyTrackingRecordOnly: true,
      controlledBuyerReplyTrackingOnly: true,
      manualBuyerReplyObservationOnly: true,
      adminObservedOutsideSystemOnly: true,
      systemDidNotReadBuyerReply: true,
      noAutoReply: true,
      noAutoFollowUp: true,
      followUpDecisionGateRequiredNext: true,
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
      noAutoPipelineMovement: true,
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

function getBuyerReplyTrackingPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Buyer Reply Tracking Gate Foundation is active.",
    purpose: "Record buyer replies manually observed by admin outside the system after manual send confirmation. This gate does not read WhatsApp, scrape messages, auto-reply, auto-follow-up, update inventory, create accounting, close sale, or move pipeline.",
    requiredBuyerReplyTrackingPhrase,
    requiredManualObservationChannel,
    allowedReplyStatuses,
    allowedReplyTemperatures,
    rules: [
      "Buyer reply tracking record only.",
      "Manual send confirmation must already be recorded.",
      "Admin must observe buyer reply manually outside the system.",
      "The system must not read WhatsApp.",
      "The system must not scrape buyer messages.",
      "The system must not scrape private data.",
      "The system must not harvest hidden data.",
      "The system must not auto-reply.",
      "The system must not auto-follow-up.",
      "No inventory update.",
      "No stock reservation.",
      "No stock reduction.",
      "No accounting entry creation.",
      "No receipt creation.",
      "No invoice creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Follow-up decision gate is required next."
    ]
  };
}

module.exports = {
  createBuyerReplyTracking,
  listBuyerReplyTrackings,
  getBuyerReplyTrackingSummary,
  getBuyerReplyTrackingPreview
};

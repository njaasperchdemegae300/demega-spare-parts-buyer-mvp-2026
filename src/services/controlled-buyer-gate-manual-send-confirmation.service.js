const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const manualQuoteDraftService = require("./controlled-buyer-gate-manual-quote-draft.service");

const manualSendConfirmationsPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-manual-send-confirmations.json");

const requiredManualSendConfirmationPhrase = "I_CONFIRM_MANUAL_SEND_CONFIRMATION_ONLY_ALREADY_SENT_MANUALLY_NO_AUTO_SEND";
const requiredSource = "whatsapp_click_to_chat_inbound";
const allowedManualSendChannel = "admin_manual_whatsapp_outside_system";

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

function listManualSendConfirmations() {
  return readJsonArray(manualSendConfirmationsPath);
}

function getManualQuoteDraftSummary() {
  try {
    return manualQuoteDraftService.getManualQuoteDraftSummary();
  } catch (error) {
    return {
      totalManualQuoteDrafts: 0,
      preparedManualQuoteDraftCount: 0,
      latestSource: "",
      error: error.message,
      safety: {}
    };
  }
}

function getManualQuoteDrafts() {
  try {
    return manualQuoteDraftService.listManualQuoteDrafts();
  } catch {
    return [];
  }
}

function unsafe(input = {}) {
  return input.autoContactBuyer === true ||
    input.contactRealBuyerAutomatically === true ||
    input.contactBuyerAutomatically === true ||
    input.startOutboundTraffic === true ||
    input.startPaidAdsAutomatically === true ||
    input.publishLeadFormAutomatically === true ||
    input.broadcastWhatsApp === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.systemSendWhatsApp === true ||
    input.systemSentQuote === true ||
    input.systemSentPrice === true ||
    input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.harvestBuyerContacts === true ||
    input.autoUpdateInventory === true ||
    input.updateInventoryAutomatically === true ||
    input.reserveStockAutomatically === true ||
    input.reduceStockAutomatically === true ||
    input.autoCreateInventoryEvent === true ||
    input.autoCreateStockLedgerEntry === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCreateReceipt === true ||
    input.autoCreateInvoice === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true ||
    input.autoStartFollowUp === true;
}

function validateManualSendConfirmation(input = {}) {
  const errors = [];
  const manualQuoteDraftSummary = getManualQuoteDraftSummary();
  const manualQuoteDrafts = getManualQuoteDrafts();
  const existingConfirmations = listManualSendConfirmations();

  if (unsafe(input)) {
    errors.push("Unsafe manual send confirmation request blocked. This gate records admin manual sending only and must not auto-contact buyers, auto-send/read WhatsApp, scrape, update inventory, reserve/reduce stock, create accounting entries, close sales, move pipeline, or auto-start follow-up.");
  }

  if (manualQuoteDraftSummary.totalManualQuoteDrafts < 1) {
    errors.push("At least one manual quote draft must exist before manual send confirmation.");
  }

  if (manualQuoteDraftSummary.preparedManualQuoteDraftCount < 1) {
    errors.push("At least one MANUAL_QUOTE_DRAFT_PREPARED record is required before manual send confirmation.");
  }

  if (manualQuoteDraftSummary.latestSource !== requiredSource) {
    errors.push("Latest manual quote draft source must remain whatsapp_click_to_chat_inbound.");
  }

  const requestedSlotNumber = Number(input.slotNumber || 0);
  if (!Number.isInteger(requestedSlotNumber) || requestedSlotNumber < 1 || requestedSlotNumber > 15) {
    errors.push("slotNumber must be an integer from 1 to 15.");
  }

  const draftRecord = manualQuoteDrafts.find(item =>
    Number(item.slotNumber) === requestedSlotNumber &&
    item.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED" &&
    item.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT"
  );

  if (!draftRecord) errors.push("Matching MANUAL_QUOTE_DRAFT_PREPARED record was not found for this slot.");
  if (draftRecord && draftRecord.source !== requiredSource) errors.push("Selected manual quote draft source must be whatsapp_click_to_chat_inbound.");
  if (draftRecord && draftRecord.quoteSentToBuyer === true) errors.push("Selected manual quote draft indicates system quote was sent, which is not allowed.");
  if (draftRecord && draftRecord.priceSentToBuyer === true) errors.push("Selected manual quote draft indicates system price was sent, which is not allowed.");
  if (draftRecord && draftRecord.inventoryUpdated === true) errors.push("Selected manual quote draft indicates inventory mutation, which is not allowed.");
  if (draftRecord && draftRecord.autoCreateAccountingEntry === true) errors.push("Selected manual quote draft indicates accounting mutation, which is not allowed.");

  if (existingConfirmations.some(item => item.slotNumber === requestedSlotNumber && item.manualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED")) {
    errors.push("This slot already has a completed manual send confirmation record.");
  }

  const manualSendChannel = cleanText(input.manualSendChannel || "");
  const manualSendEvidence = cleanText(input.manualSendEvidence || "");
  const sentBy = cleanText(input.sentBy || input.checkedBy || "admin_manual");
  const manualSendNote = cleanText(input.manualSendNote || "");

  if (manualSendChannel !== allowedManualSendChannel) errors.push(`manualSendChannel must be exactly ${allowedManualSendChannel}.`);
  if (!manualSendEvidence) errors.push("manualSendEvidence is required.");
  if (!sentBy) errors.push("sentBy is required.");

  if (input.adminReviewedManualQuoteDraft !== true) errors.push("adminReviewedManualQuoteDraft must be true.");
  if (input.adminConfirmedManualReviewBeforeSendingCompleted !== true) errors.push("adminConfirmedManualReviewBeforeSendingCompleted must be true.");
  if (input.adminManuallySentQuoteOutsideSystem !== true) errors.push("adminManuallySentQuoteOutsideSystem must be true.");
  if (input.adminConfirmedSystemDidNotSendQuote !== true) errors.push("adminConfirmedSystemDidNotSendQuote must be true.");
  if (input.adminConfirmedSystemDidNotSendPrice !== true) errors.push("adminConfirmedSystemDidNotSendPrice must be true.");
  if (input.adminConfirmedNoAutoSend !== true) errors.push("adminConfirmedNoAutoSend must be true.");
  if (input.adminConfirmedNoWhatsAppRead !== true) errors.push("adminConfirmedNoWhatsAppRead must be true.");
  if (input.adminConfirmedNoPrivateScraping !== true) errors.push("adminConfirmedNoPrivateScraping must be true.");
  if (input.adminConfirmedNoHiddenHarvesting !== true) errors.push("adminConfirmedNoHiddenHarvesting must be true.");
  if (input.adminConfirmedNoInventoryMutation !== true) errors.push("adminConfirmedNoInventoryMutation must be true.");
  if (input.adminConfirmedNoStockReservation !== true) errors.push("adminConfirmedNoStockReservation must be true.");
  if (input.adminConfirmedNoStockReduction !== true) errors.push("adminConfirmedNoStockReduction must be true.");
  if (input.adminConfirmedNoAccountingEntry !== true) errors.push("adminConfirmedNoAccountingEntry must be true.");
  if (input.adminConfirmedNoSaleClosed !== true) errors.push("adminConfirmedNoSaleClosed must be true.");
  if (input.adminConfirmedNoPipelineMove !== true) errors.push("adminConfirmedNoPipelineMove must be true.");
  if (input.adminConfirmedBuyerReplyTrackingRequiredNext !== true) errors.push("adminConfirmedBuyerReplyTrackingRequiredNext must be true.");
  if (input.adminConfirmedNoAutoFollowUp !== true) errors.push("adminConfirmedNoAutoFollowUp must be true.");
  if (cleanText(input.manualSendConfirmationPhrase) !== requiredManualSendConfirmationPhrase) {
    errors.push(`manualSendConfirmationPhrase must be exactly ${requiredManualSendConfirmationPhrase}.`);
  }

  return {
    errors,
    manualQuoteDraftSummary,
    draftRecord,
    manualSendChannel,
    manualSendEvidence,
    sentBy,
    manualSendNote
  };
}

function createManualSendConfirmation(input = {}) {
  const validation = validateManualSendConfirmation(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();
  const draftRecord = validation.draftRecord || {};

  const record = {
    id: dataStore.createId("controlled_buyer_gate_manual_send_confirmation"),
    manualSendConfirmationStatus: "MANUAL_SEND_CONFIRMATION_RECORDED",
    manualSendConfirmationType: "CONTROLLED_MANUAL_SEND_CONFIRMATION_ONLY",
    manualSendConfirmationPhrase: requiredManualSendConfirmationPhrase,

    manualSendConfirmationGateOnly: true,
    manualSendConfirmationRecordOnly: true,
    controlledManualSendConfirmationOnly: true,
    adminManualSendOutsideSystemOnly: true,
    systemSendBlocked: true,
    systemDidNotSendQuote: true,
    systemDidNotSendPrice: true,
    manualSendRecordedOnly: true,
    buyerReplyTrackingRequiredNext: true,
    noAutoFollowUp: true,

    slotId: draftRecord.slotId || "",
    slotNumber: draftRecord.slotNumber,
    manualQuoteDraftId: draftRecord.id || "",
    manualQuoteDraftStatus: draftRecord.manualQuoteDraftStatus || "",
    finalQuoteEligibilityId: draftRecord.finalQuoteEligibilityId || "",
    finalQuoteEligibilityStatus: draftRecord.finalQuoteEligibilityStatus || "",
    eligibilityDecision: draftRecord.eligibilityDecision || "",
    compatibilityCheckId: draftRecord.compatibilityCheckId || "",
    compatibilityDecision: draftRecord.compatibilityDecision || "",
    stockCheckId: draftRecord.stockCheckId || "",
    stockDecision: draftRecord.stockDecision || "",
    reviewId: draftRecord.reviewId || "",
    reviewDecision: draftRecord.reviewDecision || "",
    leadLimit: 15,
    source: requiredSource,

    leadReference: cleanText(draftRecord.leadReference || input.leadReference || ""),
    partNeeded: cleanText(draftRecord.partNeeded || input.partNeeded || ""),
    vehicleDetail: cleanText(draftRecord.vehicleDetail || input.vehicleDetail || ""),
    buyerLocation: cleanText(draftRecord.buyerLocation || input.buyerLocation || ""),
    buyerIntentProof: cleanText(draftRecord.buyerIntentProof || input.buyerIntentProof || ""),

    quotedPartName: cleanText(draftRecord.quotedPartName || ""),
    quotedCondition: cleanText(draftRecord.quotedCondition || ""),
    quantity: draftRecord.quantity || 0,
    unitPrice: draftRecord.unitPrice || 0,
    totalPrice: draftRecord.totalPrice || 0,
    currency: draftRecord.currency || "",
    manualQuoteDraftMessage: draftRecord.manualQuoteDraftMessage || "",

    manualSendChannel: validation.manualSendChannel,
    manualSendEvidence: validation.manualSendEvidence,
    manualSendNote: validation.manualSendNote,
    sentBy: validation.sentBy,

    manualQuoteDraftSummary: validation.manualQuoteDraftSummary,

    adminReviewedManualQuoteDraft: true,
    adminConfirmedManualReviewBeforeSendingCompleted: true,
    adminManuallySentQuoteOutsideSystem: true,
    adminConfirmedSystemDidNotSendQuote: true,
    adminConfirmedSystemDidNotSendPrice: true,

    buyerContactedManuallyOutsideSystem: true,
    quoteManuallySentOutsideSystem: true,
    priceManuallySentOutsideSystem: true,

    systemQuoteSentToBuyer: false,
    systemPriceSentToBuyer: false,
    quoteSentToBuyer: false,
    priceSentToBuyer: false,
    quoteAmountSentToBuyer: false,

    autoContactBuyer: false,
    contactRealBuyerAutomatically: false,
    contactBuyerAutomatically: false,
    startOutboundTraffic: false,
    startPaidAdsAutomatically: false,
    publishLeadFormAutomatically: false,

    autoSendWhatsApp: false,
    sendWhatsApp: false,
    systemSendWhatsApp: false,
    broadcastWhatsApp: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    harvestBuyerContacts: false,

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
    autoStartFollowUp: false,

    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    noPrivateDataScraping: true,
    noHiddenDataHarvesting: true,

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
    adminConfirmedNoAutoFollowUp: true,

    createdAt: now,
    updatedAt: now
  };

  const records = listManualSendConfirmations();
  records.unshift(record);
  writeJsonArray(manualSendConfirmationsPath, records);

  return {
    ok: true,
    statusCode: 201,
    record
  };
}

function getManualSendConfirmationSummary() {
  const records = listManualSendConfirmations();
  const recorded = records.filter(item => item.manualSendConfirmationStatus === "MANUAL_SEND_CONFIRMATION_RECORDED");
  const latest = records[0] || null;

  return {
    totalManualSendConfirmations: records.length,
    recordedManualSendConfirmationCount: recorded.length,
    manualOutsideSystemSendCount: records.filter(item => item.quoteManuallySentOutsideSystem === true).length,
    latestManualSendConfirmationStatus: latest ? latest.manualSendConfirmationStatus : "NO_MANUAL_SEND_CONFIRMATION",
    latestSlotNumber: latest ? latest.slotNumber : 0,
    latestSource: latest ? latest.source : "",
    latestManualSendChannel: latest ? latest.manualSendChannel : "",
    latestCurrency: latest ? latest.currency : "",
    latestTotalPrice: latest ? latest.totalPrice : 0,
    safety: {
      manualSendConfirmationGateOnly: true,
      manualSendConfirmationRecordOnly: true,
      controlledManualSendConfirmationOnly: true,
      adminManualSendOutsideSystemOnly: true,
      systemSendBlocked: true,
      systemDidNotSendQuote: true,
      systemDidNotSendPrice: true,
      manualSendRecordedOnly: true,
      buyerReplyTrackingRequiredNext: true,
      noAutoFollowUp: true,
      leadLimit: 15,
      source: requiredSource,

      noOutboundTrafficStarted: true,
      noPaidAdsStartedAutomatically: true,
      noLeadFormPublishedAutomatically: true,
      noAutoContactBuyer: true,
      noAutoSendWhatsApp: true,
      noSystemSendWhatsApp: true,
      noWhatsappAutoRead: true,
      noBuyerMessageReading: true,
      noWhatsappScraping: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noSystemQuoteSentToBuyer: true,
      noSystemPriceSentToBuyer: true,
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

function getManualSendConfirmationPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Manual Send Confirmation Gate Foundation is active.",
    purpose: "Record that admin manually sent the quote outside the system after manual quote draft review. This gate does not send anything automatically.",
    requiredManualSendConfirmationPhrase,
    requiredManualSendChannel: allowedManualSendChannel,
    rules: [
      "Manual send confirmation record only.",
      "Manual quote draft must already be prepared.",
      "Admin must manually send outside the system.",
      "The system must not send WhatsApp.",
      "The system must not send quote.",
      "The system must not send price.",
      "The system must not read WhatsApp.",
      "The system must not scrape buyer messages.",
      "The system must not scrape private data.",
      "The system must not harvest hidden data.",
      "No inventory update.",
      "No stock reservation.",
      "No stock reduction.",
      "No accounting entry creation.",
      "No receipt creation.",
      "No invoice creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Buyer reply tracking gate is required next.",
      "No auto follow-up is started at this gate."
    ]
  };
}

module.exports = {
  createManualSendConfirmation,
  listManualSendConfirmations,
  getManualSendConfirmationSummary,
  getManualSendConfirmationPreview
};

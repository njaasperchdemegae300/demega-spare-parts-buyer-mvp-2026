const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const finalQuoteEligibilityService = require("./controlled-buyer-gate-final-quote-eligibility.service");

const manualQuoteDraftsPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-manual-quote-drafts.json");

const requiredManualQuoteDraftPhrase = "I_CONFIRM_MANUAL_QUOTE_DRAFT_ONLY_NO_SEND_NO_BUYER_CONTACT";
const requiredSource = "whatsapp_click_to_chat_inbound";
const allowedCurrency = "NGN";

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

function cleanMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
}

function listManualQuoteDrafts() {
  return readJsonArray(manualQuoteDraftsPath);
}

function getFinalQuoteEligibilitySummary() {
  try {
    return finalQuoteEligibilityService.getFinalQuoteEligibilitySummary();
  } catch (error) {
    return {
      totalFinalQuoteEligibilities: 0,
      eligibleForManualQuoteDraftCount: 0,
      latestSource: "",
      error: error.message,
      safety: {}
    };
  }
}

function getFinalQuoteEligibilities() {
  try {
    return finalQuoteEligibilityService.listFinalQuoteEligibilities();
  } catch {
    return [];
  }
}

function unsafe(input = {}) {
  return input.buyerContacted === true ||
    input.realBuyerContacted === true ||
    input.autoContactBuyer === true ||
    input.contactRealBuyerAutomatically === true ||
    input.contactBuyerAutomatically === true ||
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
    input.autoCreateQuote === true ||
    input.autoCreateQuoteAndSend === true ||
    input.quoteSentToBuyer === true ||
    input.priceSentToBuyer === true ||
    input.quoteBeforeStockConfirmation === true ||
    input.quoteBeforeCompatibilityConfirmation === true ||
    input.quoteBeforeFinalEligibility === true ||
    input.autoUpdateInventory === true ||
    input.updateInventoryAutomatically === true ||
    input.reserveStockAutomatically === true ||
    input.reduceStockAutomatically === true ||
    input.autoCreateInventoryEvent === true ||
    input.autoCreateStockLedgerEntry === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true;
}

function validateManualQuoteDraft(input = {}) {
  const errors = [];
  const finalQuoteEligibilitySummary = getFinalQuoteEligibilitySummary();
  const finalQuoteEligibilities = getFinalQuoteEligibilities();
  const existingDrafts = listManualQuoteDrafts();

  if (unsafe(input)) {
    errors.push("Unsafe manual quote draft request blocked. Manual quote draft must not contact buyers, auto-send/read WhatsApp, scrape, send quote, send price, update inventory, reserve/reduce stock, create accounting entries, close sales, or move pipeline.");
  }

  if (finalQuoteEligibilitySummary.totalFinalQuoteEligibilities < 1) {
    errors.push("At least one final quote eligibility record must exist before manual quote draft.");
  }

  if (finalQuoteEligibilitySummary.eligibleForManualQuoteDraftCount < 1) {
    errors.push("At least one ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT record is required before manual quote draft.");
  }

  if (finalQuoteEligibilitySummary.latestSource !== requiredSource) {
    errors.push("Latest final quote eligibility source must remain whatsapp_click_to_chat_inbound.");
  }

  const requestedSlotNumber = Number(input.slotNumber || 0);
  if (!Number.isInteger(requestedSlotNumber) || requestedSlotNumber < 1 || requestedSlotNumber > 15) {
    errors.push("slotNumber must be an integer from 1 to 15.");
  }

  const eligibleRecord = finalQuoteEligibilities.find(item =>
    Number(item.slotNumber) === requestedSlotNumber &&
    item.finalQuoteEligibilityStatus === "FINAL_QUOTE_ELIGIBILITY_RECORDED" &&
    item.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT"
  );

  if (!eligibleRecord) errors.push("Matching ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT record was not found for this slot.");
  if (eligibleRecord && eligibleRecord.source !== requiredSource) errors.push("Selected final quote eligibility source must be whatsapp_click_to_chat_inbound.");
  if (eligibleRecord && eligibleRecord.buyerContacted === true) errors.push("Selected final eligibility indicates buyer contact, which is not allowed before manual sending.");
  if (eligibleRecord && eligibleRecord.quoteSentToBuyer === true) errors.push("Selected final eligibility indicates quote was already sent, which is not allowed here.");
  if (eligibleRecord && eligibleRecord.inventoryUpdated === true) errors.push("Selected final eligibility indicates inventory mutation, which is not allowed at this gate.");

  if (existingDrafts.some(item => item.slotNumber === requestedSlotNumber && item.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED")) {
    errors.push("This slot already has a completed manual quote draft record.");
  }

  const quotedPartName = cleanText(input.quotedPartName);
  const quotedCondition = cleanText(input.quotedCondition);
  const quantity = Number(input.quantity || 0);
  const unitPrice = cleanMoney(input.unitPrice);
  const totalPrice = cleanMoney(input.totalPrice || unitPrice * quantity);
  const currency = cleanText(input.currency || allowedCurrency).toUpperCase();
  const pickupOrDeliveryInfo = cleanText(input.pickupOrDeliveryInfo);
  const paymentInstruction = cleanText(input.paymentInstruction);
  const warrantyOrReturnNote = cleanText(input.warrantyOrReturnNote);

  if (!quotedPartName) errors.push("quotedPartName is required.");
  if (!quotedCondition) errors.push("quotedCondition is required.");
  if (!Number.isInteger(quantity) || quantity < 1) errors.push("quantity must be an integer greater than 0.");
  if (unitPrice <= 0) errors.push("unitPrice must be greater than 0.");
  if (totalPrice <= 0) errors.push("totalPrice must be greater than 0.");
  if (currency !== allowedCurrency) errors.push("currency must be NGN.");
  if (!pickupOrDeliveryInfo) errors.push("pickupOrDeliveryInfo is required.");
  if (!paymentInstruction) errors.push("paymentInstruction is required.");
  if (!warrantyOrReturnNote) errors.push("warrantyOrReturnNote is required.");

  if (input.adminReviewedFinalQuoteEligibility !== true) errors.push("adminReviewedFinalQuoteEligibility must be true.");
  if (input.adminConfirmedEligibleForManualQuoteDraft !== true) errors.push("adminConfirmedEligibleForManualQuoteDraft must be true.");
  if (input.adminEnteredQuoteManually !== true) errors.push("adminEnteredQuoteManually must be true.");
  if (input.adminConfirmedPriceManually !== true) errors.push("adminConfirmedPriceManually must be true.");
  if (input.adminConfirmedNoBuyerContactYet !== true) errors.push("adminConfirmedNoBuyerContactYet must be true.");
  if (input.adminConfirmedQuoteNotSent !== true) errors.push("adminConfirmedQuoteNotSent must be true.");
  if (input.adminConfirmedPriceNotSent !== true) errors.push("adminConfirmedPriceNotSent must be true.");
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
  if (input.adminConfirmedManualReviewBeforeSendingRequired !== true) errors.push("adminConfirmedManualReviewBeforeSendingRequired must be true.");
  if (input.adminConfirmedManualSendConfirmationRequiredNext !== true) errors.push("adminConfirmedManualSendConfirmationRequiredNext must be true.");
  if (cleanText(input.manualQuoteDraftPhrase) !== requiredManualQuoteDraftPhrase) errors.push(`manualQuoteDraftPhrase must be exactly ${requiredManualQuoteDraftPhrase}.`);

  return {
    errors,
    finalQuoteEligibilitySummary,
    eligibleRecord,
    quotedPartName,
    quotedCondition,
    quantity,
    unitPrice,
    totalPrice,
    currency,
    pickupOrDeliveryInfo,
    paymentInstruction,
    warrantyOrReturnNote
  };
}

function buildManualDraftMessage(record) {
  return [
    `Hello, thanks for your request.`,
    `Part: ${record.quotedPartName}`,
    `Vehicle: ${record.vehicleDetail || "As confirmed"}`,
    `Condition: ${record.quotedCondition}`,
    `Quantity: ${record.quantity}`,
    `Price: ${record.currency} ${record.totalPrice}`,
    `Pickup/Delivery: ${record.pickupOrDeliveryInfo}`,
    `Payment: ${record.paymentInstruction}`,
    `Note: ${record.warrantyOrReturnNote}`,
    `Please confirm if you want us to proceed.`
  ].join("\n");
}

function createManualQuoteDraft(input = {}) {
  const validation = validateManualQuoteDraft(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();
  const eligibleRecord = validation.eligibleRecord || {};

  const record = {
    id: dataStore.createId("controlled_buyer_gate_manual_quote_draft"),
    manualQuoteDraftStatus: "MANUAL_QUOTE_DRAFT_PREPARED",
    manualQuoteDraftType: "CONTROLLED_MANUAL_QUOTE_DRAFT_ONLY",
    manualQuoteDraftPhrase: requiredManualQuoteDraftPhrase,

    manualQuoteDraftGateOnly: true,
    manualQuoteDraftRecordOnly: true,
    controlledManualQuoteDraftOnly: true,
    manualQuoteDraftOnly: true,
    quoteDraftPreparedOnly: true,
    quoteDraftNotSentOnly: true,
    priceIncludedInDraftOnly: true,
    priceNotSentToBuyer: true,
    quoteNotSentToBuyer: true,
    manualReviewBeforeSendingRequired: true,
    manualSendConfirmationRequiredNext: true,

    slotId: eligibleRecord.slotId || "",
    slotNumber: eligibleRecord.slotNumber,
    finalQuoteEligibilityId: eligibleRecord.id || "",
    finalQuoteEligibilityStatus: eligibleRecord.finalQuoteEligibilityStatus || "",
    eligibilityDecision: eligibleRecord.eligibilityDecision || "",
    compatibilityCheckId: eligibleRecord.compatibilityCheckId || "",
    compatibilityDecision: eligibleRecord.compatibilityDecision || "",
    stockCheckId: eligibleRecord.stockCheckId || "",
    stockDecision: eligibleRecord.stockDecision || "",
    reviewId: eligibleRecord.reviewId || "",
    reviewDecision: eligibleRecord.reviewDecision || "",
    leadLimit: 15,
    source: requiredSource,
    leadReference: cleanText(eligibleRecord.leadReference || input.leadReference || ""),
    partNeeded: cleanText(eligibleRecord.partNeeded || input.partNeeded || ""),
    vehicleDetail: cleanText(eligibleRecord.vehicleDetail || input.vehicleDetail || ""),
    buyerLocation: cleanText(eligibleRecord.buyerLocation || input.buyerLocation || ""),
    buyerIntentProof: cleanText(eligibleRecord.buyerIntentProof || input.buyerIntentProof || ""),

    quotedPartName: validation.quotedPartName,
    quotedCondition: validation.quotedCondition,
    quantity: validation.quantity,
    unitPrice: validation.unitPrice,
    totalPrice: validation.totalPrice,
    currency: validation.currency,
    pickupOrDeliveryInfo: validation.pickupOrDeliveryInfo,
    paymentInstruction: validation.paymentInstruction,
    warrantyOrReturnNote: validation.warrantyOrReturnNote,
    quoteNote: cleanText(input.quoteNote || ""),

    finalQuoteEligibilitySummary: validation.finalQuoteEligibilitySummary,

    adminReviewedFinalQuoteEligibility: true,
    adminConfirmedEligibleForManualQuoteDraft: true,
    adminEnteredQuoteManually: true,
    adminConfirmedPriceManually: true,

    quotePrepared: true,
    manualQuoteDraftPrepared: true,
    autoCreateQuote: false,
    autoCreateQuoteAndSend: false,
    quoteBeforeStockConfirmation: false,
    quoteBeforeCompatibilityConfirmation: false,
    quoteBeforeFinalEligibility: false,

    buyerContacted: false,
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

    startOutboundTraffic: false,
    startPaidAdsAutomatically: false,
    publishLeadFormAutomatically: false,

    priceIncluded: true,
    quoteAmountIncluded: true,
    priceSentToBuyer: false,
    quoteAmountSentToBuyer: false,
    quoteSentToBuyer: false,

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
    autoCloseSale: false,
    autoMovePipelineStage: false,

    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    noPrivateDataScraping: true,
    noHiddenDataHarvesting: true,

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
    adminConfirmedManualSendConfirmationRequiredNext: true,

    checkedBy: cleanText(input.checkedBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  record.manualQuoteDraftMessage = buildManualDraftMessage(record);

  const records = listManualQuoteDrafts();
  records.unshift(record);
  writeJsonArray(manualQuoteDraftsPath, records);

  return {
    ok: true,
    statusCode: 201,
    record
  };
}

function getManualQuoteDraftSummary() {
  const records = listManualQuoteDrafts();
  const prepared = records.filter(item => item.manualQuoteDraftStatus === "MANUAL_QUOTE_DRAFT_PREPARED");
  const eligibleDrafts = records.filter(item => item.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT");
  const latest = records[0] || null;

  return {
    totalManualQuoteDrafts: records.length,
    preparedManualQuoteDraftCount: prepared.length,
    eligibleManualQuoteDraftCount: eligibleDrafts.length,
    latestManualQuoteDraftStatus: latest ? latest.manualQuoteDraftStatus : "NO_MANUAL_QUOTE_DRAFT",
    latestSlotNumber: latest ? latest.slotNumber : 0,
    latestSource: latest ? latest.source : "",
    latestCurrency: latest ? latest.currency : "",
    latestTotalPrice: latest ? latest.totalPrice : 0,
    safety: {
      manualQuoteDraftGateOnly: true,
      manualQuoteDraftRecordOnly: true,
      controlledManualQuoteDraftOnly: true,
      manualQuoteDraftOnly: true,
      quoteDraftPreparedOnly: true,
      quoteDraftNotSentOnly: true,
      priceIncludedInDraftOnly: true,
      priceNotSentToBuyer: true,
      quoteNotSentToBuyer: true,
      manualReviewBeforeSendingRequired: true,
      manualSendConfirmationRequiredNext: true,
      leadLimit: 15,
      source: requiredSource,

      noOutboundTrafficStarted: true,
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
      noQuoteSentToBuyer: true,
      noPriceSentToBuyer: true,
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      noQuoteBeforeFinalEligibility: true,
      noInventoryUpdate: true,
      noStockReservation: true,
      noStockReduction: true,
      noStockLedgerEntry: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true
    }
  };
}

function getManualQuoteDraftPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Manual Quote Draft Gate Foundation is active.",
    purpose: "Prepare a manual quote draft after final quote eligibility. This gate creates a draft only; it does not contact buyer or send the quote.",
    requiredManualQuoteDraftPhrase,
    requiredCurrency: allowedCurrency,
    rules: [
      "Manual quote draft record only.",
      "Final quote eligibility must already be ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT.",
      "Price is allowed only inside the internal draft.",
      "No buyer contact from this gate.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No buyer message scraping.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote is sent to buyer at this gate.",
      "No price is sent to buyer at this gate.",
      "No inventory update.",
      "No stock reservation.",
      "No stock reduction.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Manual review before sending is required next.",
      "Manual send confirmation gate is required next."
    ]
  };
}

module.exports = {
  createManualQuoteDraft,
  listManualQuoteDrafts,
  getManualQuoteDraftSummary,
  getManualQuoteDraftPreview
};

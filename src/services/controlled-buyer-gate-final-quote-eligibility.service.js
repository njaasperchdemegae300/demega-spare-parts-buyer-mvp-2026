const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const compatibilityCheckService = require("./controlled-buyer-gate-manual-compatibility-check.service");

const finalQuoteEligibilityPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-final-quote-eligibilities.json");

const requiredFinalEligibilityPhrase = "I_CONFIRM_FINAL_QUOTE_ELIGIBILITY_ONLY_NO_QUOTE_NO_BUYER_CONTACT";
const requiredSource = "whatsapp_click_to_chat_inbound";

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

function listFinalQuoteEligibilities() {
  return readJsonArray(finalQuoteEligibilityPath);
}

function getCompatibilitySummary() {
  try {
    return compatibilityCheckService.getManualCompatibilityCheckSummary();
  } catch (error) {
    return {
      totalCompatibilityChecks: 0,
      compatibilityConfirmedCount: 0,
      latestSource: "",
      error: error.message,
      safety: {}
    };
  }
}

function getCompatibilityChecks() {
  try {
    return compatibilityCheckService.listManualCompatibilityChecks();
  } catch {
    return [];
  }
}

function unsafe(input) {
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
    input.quotePrepared === true ||
    input.autoCreateQuote === true ||
    input.autoCreateQuoteAndSend === true ||
    input.quoteBeforeStockConfirmation === true ||
    input.quoteBeforeCompatibilityConfirmation === true ||
    input.priceIncluded === true ||
    input.quoteAmountIncluded === true ||
    input.priceSentToBuyer === true ||
    input.quoteSentToBuyer === true ||
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

function normalizeEligibilityDecision(value) {
  const decision = cleanText(value).toUpperCase();
  if (decision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT") return decision;
  if (decision === "NOT_ELIGIBLE_FOR_QUOTE") return decision;
  if (decision === "NEEDS_MANAGER_REVIEW") return decision;
  return "";
}

function validateFinalQuoteEligibility(input = {}) {
  const errors = [];
  const compatibilitySummary = getCompatibilitySummary();
  const compatibilityChecks = getCompatibilityChecks();
  const existingEligibilities = listFinalQuoteEligibilities();

  if (unsafe(input)) {
    errors.push("Unsafe final quote eligibility request blocked. Final quote eligibility records readiness only and must not contact buyers, send/read WhatsApp, scrape, prepare quotes, include price, send quote, update inventory, reserve/reduce stock, create accounting entries, close sales, or move pipeline.");
  }

  if (compatibilitySummary.totalCompatibilityChecks < 1) errors.push("At least one manual compatibility check must exist before final quote eligibility.");
  if (compatibilitySummary.compatibilityConfirmedCount < 1) errors.push("At least one COMPATIBILITY_CONFIRMED check is required before final quote eligibility.");
  if (compatibilitySummary.latestSource !== requiredSource) errors.push("Latest manual compatibility source must remain whatsapp_click_to_chat_inbound.");

  const requestedSlotNumber = Number(input.slotNumber || 0);
  if (!Number.isInteger(requestedSlotNumber) || requestedSlotNumber < 1 || requestedSlotNumber > 15) {
    errors.push("slotNumber must be an integer from 1 to 15.");
  }

  const confirmedCompatibilityCheck = compatibilityChecks.find(check =>
    Number(check.slotNumber) === requestedSlotNumber &&
    check.compatibilityCheckStatus === "MANUAL_COMPATIBILITY_CHECK_COMPLETED" &&
    check.compatibilityDecision === "COMPATIBILITY_CONFIRMED"
  );

  if (!confirmedCompatibilityCheck) errors.push("Matching COMPATIBILITY_CONFIRMED check was not found for this slot.");
  if (confirmedCompatibilityCheck && confirmedCompatibilityCheck.source !== requiredSource) errors.push("Selected compatibility check source must be whatsapp_click_to_chat_inbound.");
  if (confirmedCompatibilityCheck && confirmedCompatibilityCheck.buyerContacted === true) errors.push("Selected compatibility check indicates buyer contact, which is not allowed before quote draft.");
  if (confirmedCompatibilityCheck && confirmedCompatibilityCheck.quotePrepared === true) errors.push("Selected compatibility check indicates quote preparation, which is not allowed before final eligibility.");
  if (confirmedCompatibilityCheck && confirmedCompatibilityCheck.priceIncluded === true) errors.push("Selected compatibility check indicates price inclusion, which is not allowed before quote draft.");
  if (confirmedCompatibilityCheck && confirmedCompatibilityCheck.inventoryUpdated === true) errors.push("Selected compatibility check indicates inventory mutation, which is not allowed at this gate.");

  if (existingEligibilities.some(item => item.slotNumber === requestedSlotNumber && item.finalQuoteEligibilityStatus === "FINAL_QUOTE_ELIGIBILITY_RECORDED")) {
    errors.push("This slot already has a completed final quote eligibility record.");
  }

  const eligibilityDecision = normalizeEligibilityDecision(input.eligibilityDecision);
  if (!eligibilityDecision) {
    errors.push("eligibilityDecision must be ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT, NOT_ELIGIBLE_FOR_QUOTE, or NEEDS_MANAGER_REVIEW.");
  }

  if (input.adminReviewedManualCompatibilityCheck !== true) errors.push("adminReviewedManualCompatibilityCheck must be true.");
  if (input.adminConfirmedStockWasConfirmed !== true) errors.push("adminConfirmedStockWasConfirmed must be true.");
  if (input.adminConfirmedCompatibilityWasConfirmed !== true) errors.push("adminConfirmedCompatibilityWasConfirmed must be true.");
  if (input.adminConfirmedFinalEligibilityCheckedManually !== true) errors.push("adminConfirmedFinalEligibilityCheckedManually must be true.");
  if (input.adminConfirmedNoBuyerContactYet !== true) errors.push("adminConfirmedNoBuyerContactYet must be true.");
  if (input.adminConfirmedNoQuotePrepared !== true) errors.push("adminConfirmedNoQuotePrepared must be true.");
  if (input.adminConfirmedNoPriceIncluded !== true) errors.push("adminConfirmedNoPriceIncluded must be true.");
  if (input.adminConfirmedQuoteNotSent !== true) errors.push("adminConfirmedQuoteNotSent must be true.");
  if (input.adminConfirmedNoAutoSend !== true) errors.push("adminConfirmedNoAutoSend must be true.");
  if (input.adminConfirmedNoWhatsAppRead !== true) errors.push("adminConfirmedNoWhatsAppRead must be true.");
  if (input.adminConfirmedNoPrivateScraping !== true) errors.push("adminConfirmedNoPrivateScraping must be true.");
  if (input.adminConfirmedNoHiddenHarvesting !== true) errors.push("adminConfirmedNoHiddenHarvesting must be true.");
  if (input.adminConfirmedNoInventoryMutation !== true) errors.push("adminConfirmedNoInventoryMutation must be true.");
  if (input.adminConfirmedNoStockReservation !== true) errors.push("adminConfirmedNoStockReservation must be true.");
  if (input.adminConfirmedNoStockReduction !== true) errors.push("adminConfirmedNoStockReduction must be true.");
  if (input.adminConfirmedNoAccountingEntry !== true) errors.push("adminConfirmedNoAccountingEntry must be true.");
  if (input.adminConfirmedManualQuoteDraftRequiredNext !== true) errors.push("adminConfirmedManualQuoteDraftRequiredNext must be true.");
  if (input.adminConfirmedQuoteStillBlockedUntilDraftGate !== true) errors.push("adminConfirmedQuoteStillBlockedUntilDraftGate must be true.");
  if (cleanText(input.finalQuoteEligibilityPhrase) !== requiredFinalEligibilityPhrase) errors.push(`finalQuoteEligibilityPhrase must be exactly ${requiredFinalEligibilityPhrase}.`);

  return { errors, compatibilitySummary, confirmedCompatibilityCheck, eligibilityDecision };
}

function createFinalQuoteEligibility(input = {}) {
  const validation = validateFinalQuoteEligibility(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();
  const compatibilityCheck = validation.confirmedCompatibilityCheck || {};
  const decision = validation.eligibilityDecision;

  const record = {
    id: dataStore.createId("controlled_buyer_gate_final_quote_eligibility"),
    finalQuoteEligibilityStatus: "FINAL_QUOTE_ELIGIBILITY_RECORDED",
    finalQuoteEligibilityType: "CONTROLLED_FINAL_QUOTE_ELIGIBILITY_ONLY",
    eligibilityDecision: decision,
    finalQuoteEligibilityPhrase: requiredFinalEligibilityPhrase,

    finalQuoteEligibilityGateOnly: true,
    finalQuoteEligibilityRecordOnly: true,
    controlledFinalQuoteEligibilityOnly: true,
    manualFinalQuoteEligibilityOnly: true,
    quoteEligibilityDecisionOnly: true,
    eligibleForManualQuoteDraftOnly: decision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT",
    notEligibleForQuoteOnly: decision === "NOT_ELIGIBLE_FOR_QUOTE",
    needsManagerReviewOnly: decision === "NEEDS_MANAGER_REVIEW",

    slotId: compatibilityCheck.slotId || "",
    slotNumber: compatibilityCheck.slotNumber,
    compatibilityCheckId: compatibilityCheck.id || "",
    compatibilityDecision: compatibilityCheck.compatibilityDecision || "",
    stockCheckId: compatibilityCheck.stockCheckId || "",
    stockDecision: compatibilityCheck.stockDecision || "",
    reviewId: compatibilityCheck.reviewId || "",
    reviewDecision: compatibilityCheck.reviewDecision || "",
    leadLimit: 15,
    source: requiredSource,
    leadReference: cleanText(compatibilityCheck.leadReference || input.leadReference || ""),
    partNeeded: cleanText(compatibilityCheck.partNeeded || input.partNeeded || ""),
    vehicleDetail: cleanText(compatibilityCheck.vehicleDetail || input.vehicleDetail || ""),
    buyerLocation: cleanText(compatibilityCheck.buyerLocation || input.buyerLocation || ""),
    buyerIntentProof: cleanText(compatibilityCheck.buyerIntentProof || input.buyerIntentProof || ""),

    eligibilityNote: cleanText(input.eligibilityNote || ""),
    quoteReadinessReason: cleanText(input.quoteReadinessReason || ""),
    managerReviewNote: cleanText(input.managerReviewNote || ""),

    compatibilitySummary: validation.compatibilitySummary,

    adminReviewedManualCompatibilityCheck: true,
    adminConfirmedStockWasConfirmed: true,
    adminConfirmedCompatibilityWasConfirmed: true,
    adminConfirmedFinalEligibilityCheckedManually: true,
    finalQuoteEligibilityRecorded: true,

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

    quotePrepared: false,
    autoCreateQuote: false,
    autoCreateQuoteAndSend: false,
    quoteBeforeStockConfirmation: false,
    quoteBeforeCompatibilityConfirmation: false,
    quoteStillBlockedUntilDraftGate: true,
    manualQuoteDraftRequiredNext: true,
    manualQuoteDraftAllowedNextOnlyIfEligible: decision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT",

    priceIncluded: false,
    quoteAmountIncluded: false,
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
    adminConfirmedQuoteStillBlockedUntilDraftGate: true,

    checkedBy: cleanText(input.checkedBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const records = listFinalQuoteEligibilities();
  records.unshift(record);
  writeJsonArray(finalQuoteEligibilityPath, records);

  return {
    ok: true,
    statusCode: 201,
    record
  };
}

function getFinalQuoteEligibilitySummary() {
  const records = listFinalQuoteEligibilities();
  const completed = records.filter(item => item.finalQuoteEligibilityStatus === "FINAL_QUOTE_ELIGIBILITY_RECORDED");
  const eligible = records.filter(item => item.eligibilityDecision === "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT");
  const notEligible = records.filter(item => item.eligibilityDecision === "NOT_ELIGIBLE_FOR_QUOTE");
  const managerReview = records.filter(item => item.eligibilityDecision === "NEEDS_MANAGER_REVIEW");
  const latest = records[0] || null;

  return {
    totalFinalQuoteEligibilities: records.length,
    recordedFinalQuoteEligibilityCount: completed.length,
    eligibleForManualQuoteDraftCount: eligible.length,
    notEligibleForQuoteCount: notEligible.length,
    needsManagerReviewCount: managerReview.length,
    latestFinalQuoteEligibilityStatus: latest ? latest.finalQuoteEligibilityStatus : "NO_FINAL_QUOTE_ELIGIBILITY",
    latestEligibilityDecision: latest ? latest.eligibilityDecision : "",
    latestSlotNumber: latest ? latest.slotNumber : 0,
    latestSource: latest ? latest.source : "",
    safety: {
      finalQuoteEligibilityGateOnly: true,
      finalQuoteEligibilityRecordOnly: true,
      controlledFinalQuoteEligibilityOnly: true,
      manualFinalQuoteEligibilityOnly: true,
      quoteEligibilityDecisionOnly: true,
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
      noQuotePrepared: true,
      noPriceIncluded: true,
      noQuoteSentToBuyer: true,
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      quoteStillBlockedUntilDraftGate: true,
      manualQuoteDraftRequiredNext: true,
      noInventoryUpdate: true,
      noStockReservation: true,
      noStockReduction: true,
      noStockLedgerEntry: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true,
      manualReviewRequiredBeforeAnyBuyerContact: true
    }
  };
}

function getFinalQuoteEligibilityPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Final Quote Eligibility Gate Foundation is active.",
    purpose: "Record final quote eligibility decisions after stock and compatibility confirmation, before any manual quote draft is prepared.",
    requiredFinalEligibilityPhrase,
    allowedDecisions: [
      "ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT",
      "NOT_ELIGIBLE_FOR_QUOTE",
      "NEEDS_MANAGER_REVIEW"
    ],
    rules: [
      "Final quote eligibility record only.",
      "Stock confirmation must already be completed.",
      "Compatibility confirmation must already be completed.",
      "No buyer contact from this gate.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No buyer message scraping.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote is prepared at this gate.",
      "No price is included at this gate.",
      "No quote is sent to buyer at this gate.",
      "No inventory update.",
      "No stock reservation.",
      "No stock reduction.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Manual quote draft gate is required next."
    ]
  };
}

module.exports = {
  createFinalQuoteEligibility,
  listFinalQuoteEligibilities,
  getFinalQuoteEligibilitySummary,
  getFinalQuoteEligibilityPreview
};

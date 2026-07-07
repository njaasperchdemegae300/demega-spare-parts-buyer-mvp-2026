const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const manualStockCheckService = require("./controlled-buyer-gate-manual-stock-check.service");

const compatibilityChecksPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-manual-compatibility-checks.json");

const requiredCompatibilityPhrase = "I_CONFIRM_MANUAL_COMPATIBILITY_CHECK_ONLY_NO_QUOTE_NO_BUYER_CONTACT";
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

function listManualCompatibilityChecks() {
  return readJsonArray(compatibilityChecksPath);
}

function getManualStockCheckSummary() {
  try {
    return manualStockCheckService.getManualStockCheckSummary();
  } catch (error) {
    return {
      totalStockChecks: 0,
      stockConfirmedAvailableCount: 0,
      latestSource: "",
      error: error.message,
      safety: {}
    };
  }
}

function getManualStockChecks() {
  try {
    return manualStockCheckService.listManualStockChecks();
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

function normalizeCompatibilityDecision(value) {
  const decision = cleanText(value).toUpperCase();
  if (decision === "COMPATIBILITY_CONFIRMED") return decision;
  if (decision === "COMPATIBILITY_NOT_CONFIRMED") return decision;
  if (decision === "COMPATIBILITY_NEEDS_MORE_INFO") return decision;
  return "";
}

function validateCompatibilityCheck(input = {}) {
  const errors = [];
  const stockSummary = getManualStockCheckSummary();
  const stockChecks = getManualStockChecks();
  const compatibilityChecks = listManualCompatibilityChecks();

  if (unsafe(input)) {
    errors.push("Unsafe manual compatibility check request blocked. Manual compatibility check records compatibility status only and must not contact buyers, send/read WhatsApp, scrape, prepare quotes, include price, update inventory, reserve/reduce stock, create accounting entries, close sales, or move pipeline.");
  }

  if (stockSummary.totalStockChecks < 1) errors.push("At least one manual stock check must exist before manual compatibility check.");
  if (stockSummary.stockConfirmedAvailableCount < 1) errors.push("At least one STOCK_CONFIRMED_AVAILABLE stock check is required.");
  if (stockSummary.latestSource !== requiredSource) errors.push("Latest manual stock check source must remain whatsapp_click_to_chat_inbound.");

  const requestedSlotNumber = Number(input.slotNumber || 0);
  if (!Number.isInteger(requestedSlotNumber) || requestedSlotNumber < 1 || requestedSlotNumber > 15) {
    errors.push("slotNumber must be an integer from 1 to 15.");
  }

  const availableStockCheck = stockChecks.find(check =>
    Number(check.slotNumber) === requestedSlotNumber &&
    check.stockCheckStatus === "MANUAL_STOCK_CHECK_COMPLETED" &&
    check.stockDecision === "STOCK_CONFIRMED_AVAILABLE"
  );

  if (!availableStockCheck) errors.push("Matching STOCK_CONFIRMED_AVAILABLE stock check was not found for this slot.");
  if (availableStockCheck && availableStockCheck.source !== requiredSource) errors.push("Selected stock check source must be whatsapp_click_to_chat_inbound.");
  if (availableStockCheck && availableStockCheck.buyerContacted === true) errors.push("Selected stock check indicates buyer contact, which is not allowed before compatibility check.");
  if (availableStockCheck && availableStockCheck.quotePrepared === true) errors.push("Selected stock check indicates quote preparation, which is not allowed before compatibility check.");
  if (availableStockCheck && availableStockCheck.inventoryUpdated === true) errors.push("Selected stock check indicates inventory mutation, which is not allowed at this gate.");

  if (compatibilityChecks.some(check => check.slotNumber === requestedSlotNumber && check.compatibilityCheckStatus === "MANUAL_COMPATIBILITY_CHECK_COMPLETED")) {
    errors.push("This slot already has a completed manual compatibility check.");
  }

  const compatibilityDecision = normalizeCompatibilityDecision(input.compatibilityDecision);
  if (!compatibilityDecision) {
    errors.push("compatibilityDecision must be COMPATIBILITY_CONFIRMED, COMPATIBILITY_NOT_CONFIRMED, or COMPATIBILITY_NEEDS_MORE_INFO.");
  }

  if (input.adminReviewedManualStockCheck !== true) errors.push("adminReviewedManualStockCheck must be true.");
  if (input.adminCheckedCompatibilityManually !== true) errors.push("adminCheckedCompatibilityManually must be true.");
  if (input.adminConfirmedCompatibilityStatusManually !== true) errors.push("adminConfirmedCompatibilityStatusManually must be true.");
  if (input.adminConfirmedNoBuyerContactYet !== true) errors.push("adminConfirmedNoBuyerContactYet must be true.");
  if (input.adminConfirmedNoQuotePrepared !== true) errors.push("adminConfirmedNoQuotePrepared must be true.");
  if (input.adminConfirmedNoPriceIncluded !== true) errors.push("adminConfirmedNoPriceIncluded must be true.");
  if (input.adminConfirmedNoAutoSend !== true) errors.push("adminConfirmedNoAutoSend must be true.");
  if (input.adminConfirmedNoWhatsAppRead !== true) errors.push("adminConfirmedNoWhatsAppRead must be true.");
  if (input.adminConfirmedNoPrivateScraping !== true) errors.push("adminConfirmedNoPrivateScraping must be true.");
  if (input.adminConfirmedNoHiddenHarvesting !== true) errors.push("adminConfirmedNoHiddenHarvesting must be true.");
  if (input.adminConfirmedNoInventoryMutation !== true) errors.push("adminConfirmedNoInventoryMutation must be true.");
  if (input.adminConfirmedNoStockReservation !== true) errors.push("adminConfirmedNoStockReservation must be true.");
  if (input.adminConfirmedNoStockReduction !== true) errors.push("adminConfirmedNoStockReduction must be true.");
  if (input.adminConfirmedNoAccountingEntry !== true) errors.push("adminConfirmedNoAccountingEntry must be true.");
  if (input.adminConfirmedFinalQuoteEligibilityRequiredNext !== true) errors.push("adminConfirmedFinalQuoteEligibilityRequiredNext must be true.");
  if (input.adminConfirmedQuoteBlockedUntilFinalEligibility !== true) errors.push("adminConfirmedQuoteBlockedUntilFinalEligibility must be true.");
  if (cleanText(input.compatibilityCheckPhrase) !== requiredCompatibilityPhrase) errors.push(`compatibilityCheckPhrase must be exactly ${requiredCompatibilityPhrase}.`);

  return { errors, stockSummary, availableStockCheck, compatibilityDecision };
}

function createManualCompatibilityCheck(input = {}) {
  const validation = validateCompatibilityCheck(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();
  const stockCheck = validation.availableStockCheck || {};
  const decision = validation.compatibilityDecision;

  const check = {
    id: dataStore.createId("controlled_buyer_gate_manual_compatibility_check"),
    compatibilityCheckStatus: "MANUAL_COMPATIBILITY_CHECK_COMPLETED",
    compatibilityCheckType: "CONTROLLED_MANUAL_COMPATIBILITY_CHECK_ONLY",
    compatibilityDecision: decision,
    compatibilityCheckPhrase: requiredCompatibilityPhrase,

    manualCompatibilityCheckGateOnly: true,
    compatibilityCheckRecordOnly: true,
    controlledCompatibilityCheckOnly: true,
    manualCompatibilityStatusOnly: true,
    compatibilityConfirmedOnly: decision === "COMPATIBILITY_CONFIRMED",
    compatibilityNotConfirmedOnly: decision === "COMPATIBILITY_NOT_CONFIRMED",
    compatibilityNeedsMoreInfoOnly: decision === "COMPATIBILITY_NEEDS_MORE_INFO",

    slotId: stockCheck.slotId || "",
    slotNumber: stockCheck.slotNumber,
    stockCheckId: stockCheck.id || "",
    stockDecision: stockCheck.stockDecision || "",
    reviewId: stockCheck.reviewId || "",
    reviewDecision: stockCheck.reviewDecision || "",
    leadLimit: 15,
    source: requiredSource,
    leadReference: cleanText(stockCheck.leadReference || input.leadReference || ""),
    partNeeded: cleanText(stockCheck.partNeeded || input.partNeeded || ""),
    vehicleDetail: cleanText(stockCheck.vehicleDetail || input.vehicleDetail || ""),
    buyerLocation: cleanText(stockCheck.buyerLocation || input.buyerLocation || ""),
    buyerIntentProof: cleanText(stockCheck.buyerIntentProof || input.buyerIntentProof || ""),

    compatibilityNote: cleanText(input.compatibilityNote || ""),
    matchedPartDetail: cleanText(input.matchedPartDetail || ""),
    vehicleRequirement: cleanText(input.vehicleRequirement || ""),

    stockSummary: validation.stockSummary,

    adminReviewedManualStockCheck: true,
    adminCheckedCompatibilityManually: true,
    adminConfirmedCompatibilityStatusManually: true,
    manualCompatibilityCheckCompleted: true,

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
    quoteBlockedUntilFinalEligibility: true,
    finalQuoteEligibilityRequiredNext: true,

    priceIncluded: false,
    quoteAmountIncluded: false,
    priceSentToBuyer: false,
    quoteAmountSentToBuyer: false,

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
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedFinalQuoteEligibilityRequiredNext: true,
    adminConfirmedQuoteBlockedUntilFinalEligibility: true,

    checkedBy: cleanText(input.checkedBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const compatibilityChecks = listManualCompatibilityChecks();
  compatibilityChecks.unshift(check);
  writeJsonArray(compatibilityChecksPath, compatibilityChecks);

  return {
    ok: true,
    statusCode: 201,
    check
  };
}

function getManualCompatibilityCheckSummary() {
  const checks = listManualCompatibilityChecks();
  const completed = checks.filter(check => check.compatibilityCheckStatus === "MANUAL_COMPATIBILITY_CHECK_COMPLETED");
  const confirmed = checks.filter(check => check.compatibilityDecision === "COMPATIBILITY_CONFIRMED");
  const notConfirmed = checks.filter(check => check.compatibilityDecision === "COMPATIBILITY_NOT_CONFIRMED");
  const needsMoreInfo = checks.filter(check => check.compatibilityDecision === "COMPATIBILITY_NEEDS_MORE_INFO");
  const latest = checks[0] || null;

  return {
    totalCompatibilityChecks: checks.length,
    completedCompatibilityCheckCount: completed.length,
    compatibilityConfirmedCount: confirmed.length,
    compatibilityNotConfirmedCount: notConfirmed.length,
    compatibilityNeedsMoreInfoCount: needsMoreInfo.length,
    latestCompatibilityCheckStatus: latest ? latest.compatibilityCheckStatus : "NO_COMPATIBILITY_CHECK",
    latestCompatibilityDecision: latest ? latest.compatibilityDecision : "",
    latestSlotNumber: latest ? latest.slotNumber : 0,
    latestSource: latest ? latest.source : "",
    safety: {
      manualCompatibilityCheckGateOnly: true,
      compatibilityCheckRecordOnly: true,
      controlledCompatibilityCheckOnly: true,
      manualCompatibilityStatusOnly: true,
      compatibilityCheckCompletedOnly: true,
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
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      quoteBlockedUntilFinalEligibility: true,
      finalQuoteEligibilityRequiredNext: true,
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

function getManualCompatibilityCheckPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Manual Compatibility Check Gate Foundation is active.",
    purpose: "Record manual compatibility decisions after available stock confirmation and before final quote eligibility or quote preparation.",
    requiredCompatibilityPhrase,
    allowedDecisions: [
      "COMPATIBILITY_CONFIRMED",
      "COMPATIBILITY_NOT_CONFIRMED",
      "COMPATIBILITY_NEEDS_MORE_INFO"
    ],
    rules: [
      "Manual compatibility check record only.",
      "Compatibility status is confirmed manually.",
      "No buyer contact from this gate.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No buyer message scraping.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote is prepared at this gate.",
      "No price is included at this gate.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "No inventory update.",
      "No stock reservation.",
      "No stock reduction.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Final quote eligibility is required next."
    ]
  };
}

module.exports = {
  createManualCompatibilityCheck,
  listManualCompatibilityChecks,
  getManualCompatibilityCheckSummary,
  getManualCompatibilityCheckPreview
};

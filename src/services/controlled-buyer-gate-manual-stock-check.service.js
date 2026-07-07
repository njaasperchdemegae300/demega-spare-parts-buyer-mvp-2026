const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const manualLeadReviewService = require("./controlled-buyer-gate-manual-lead-review.service");

const stockChecksPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-manual-stock-checks.json");

const requiredStockCheckPhrase = "I_CONFIRM_MANUAL_STOCK_CHECK_ONLY_NO_QUOTE_NO_BUYER_CONTACT";
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

function listManualStockChecks() {
  return readJsonArray(stockChecksPath);
}

function getManualLeadReviewSummary() {
  try {
    return manualLeadReviewService.getManualLeadReviewSummary();
  } catch (error) {
    return {
      totalReviews: 0,
      acceptedForManualStockCheckCount: 0,
      latestSource: "",
      error: error.message,
      safety: {}
    };
  }
}

function getManualLeadReviews() {
  try {
    return manualLeadReviewService.listManualLeadReviews();
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

function normalizeStockDecision(value) {
  const decision = cleanText(value).toUpperCase();
  if (decision === "STOCK_CONFIRMED_AVAILABLE") return decision;
  if (decision === "STOCK_NOT_AVAILABLE") return decision;
  if (decision === "STOCK_NEEDS_SUPPLIER_CONFIRMATION") return decision;
  return "";
}

function validateStockCheck(input = {}) {
  const errors = [];
  const reviewSummary = getManualLeadReviewSummary();
  const reviews = getManualLeadReviews();
  const stockChecks = listManualStockChecks();

  if (unsafe(input)) {
    errors.push("Unsafe manual stock check request blocked. Manual stock check records stock status only and must not contact buyers, send/read WhatsApp, scrape, prepare quotes, update inventory, reserve/reduce stock, create accounting entries, close sales, or move pipeline.");
  }

  if (reviewSummary.totalReviews < 1) errors.push("At least one manual lead review must exist before manual stock check.");
  if (reviewSummary.acceptedForManualStockCheckCount < 1) errors.push("At least one ACCEPT_FOR_MANUAL_STOCK_CHECK review is required.");
  if (reviewSummary.latestSource !== requiredSource) errors.push("Latest manual lead review source must remain whatsapp_click_to_chat_inbound.");

  const requestedSlotNumber = Number(input.slotNumber || 0);
  if (!Number.isInteger(requestedSlotNumber) || requestedSlotNumber < 1 || requestedSlotNumber > 15) {
    errors.push("slotNumber must be an integer from 1 to 15.");
  }

  const acceptedReview = reviews.find(review =>
    Number(review.slotNumber) === requestedSlotNumber &&
    review.reviewStatus === "MANUAL_LEAD_REVIEW_COMPLETED" &&
    review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK"
  );

  if (!acceptedReview) errors.push("Matching ACCEPT_FOR_MANUAL_STOCK_CHECK review was not found for this slot.");
  if (acceptedReview && acceptedReview.source !== requiredSource) errors.push("Selected review source must be whatsapp_click_to_chat_inbound.");
  if (acceptedReview && acceptedReview.buyerContacted === true) errors.push("Selected review indicates buyer contact, which is not allowed before stock check.");
  if (acceptedReview && acceptedReview.quotePrepared === true) errors.push("Selected review indicates quote preparation, which is not allowed before stock check.");

  if (stockChecks.some(check => check.slotNumber === requestedSlotNumber && check.stockCheckStatus === "MANUAL_STOCK_CHECK_COMPLETED")) {
    errors.push("This slot already has a completed manual stock check.");
  }

  const stockDecision = normalizeStockDecision(input.stockDecision);
  if (!stockDecision) {
    errors.push("stockDecision must be STOCK_CONFIRMED_AVAILABLE, STOCK_NOT_AVAILABLE, or STOCK_NEEDS_SUPPLIER_CONFIRMATION.");
  }

  if (input.adminReviewedManualLeadReview !== true) errors.push("adminReviewedManualLeadReview must be true.");
  if (input.adminPhysicallyCheckedStock !== true) errors.push("adminPhysicallyCheckedStock must be true.");
  if (input.adminConfirmedStockStatusManually !== true) errors.push("adminConfirmedStockStatusManually must be true.");
  if (input.adminConfirmedNoBuyerContactYet !== true) errors.push("adminConfirmedNoBuyerContactYet must be true.");
  if (input.adminConfirmedNoQuotePrepared !== true) errors.push("adminConfirmedNoQuotePrepared must be true.");
  if (input.adminConfirmedNoAutoSend !== true) errors.push("adminConfirmedNoAutoSend must be true.");
  if (input.adminConfirmedNoWhatsAppRead !== true) errors.push("adminConfirmedNoWhatsAppRead must be true.");
  if (input.adminConfirmedNoPrivateScraping !== true) errors.push("adminConfirmedNoPrivateScraping must be true.");
  if (input.adminConfirmedNoHiddenHarvesting !== true) errors.push("adminConfirmedNoHiddenHarvesting must be true.");
  if (input.adminConfirmedNoInventoryMutation !== true) errors.push("adminConfirmedNoInventoryMutation must be true.");
  if (input.adminConfirmedNoStockReservation !== true) errors.push("adminConfirmedNoStockReservation must be true.");
  if (input.adminConfirmedNoStockReduction !== true) errors.push("adminConfirmedNoStockReduction must be true.");
  if (input.adminConfirmedNoAccountingEntry !== true) errors.push("adminConfirmedNoAccountingEntry must be true.");
  if (input.adminConfirmedManualCompatibilityCheckRequiredNext !== true) errors.push("adminConfirmedManualCompatibilityCheckRequiredNext must be true.");
  if (input.adminConfirmedQuoteBlockedUntilCompatibility !== true) errors.push("adminConfirmedQuoteBlockedUntilCompatibility must be true.");
  if (cleanText(input.stockCheckPhrase) !== requiredStockCheckPhrase) errors.push(`stockCheckPhrase must be exactly ${requiredStockCheckPhrase}.`);

  return { errors, reviewSummary, acceptedReview, stockDecision };
}

function createManualStockCheck(input = {}) {
  const validation = validateStockCheck(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();
  const review = validation.acceptedReview || {};
  const decision = validation.stockDecision;

  const check = {
    id: dataStore.createId("controlled_buyer_gate_manual_stock_check"),
    stockCheckStatus: "MANUAL_STOCK_CHECK_COMPLETED",
    stockCheckType: "CONTROLLED_MANUAL_STOCK_CHECK_ONLY",
    stockDecision: decision,
    stockCheckPhrase: requiredStockCheckPhrase,

    manualStockCheckGateOnly: true,
    stockCheckRecordOnly: true,
    controlledStockCheckOnly: true,
    manualStockStatusOnly: true,
    stockConfirmedAvailableOnly: decision === "STOCK_CONFIRMED_AVAILABLE",
    stockNotAvailableOnly: decision === "STOCK_NOT_AVAILABLE",
    stockNeedsSupplierConfirmationOnly: decision === "STOCK_NEEDS_SUPPLIER_CONFIRMATION",

    slotId: review.slotId || "",
    slotNumber: review.slotNumber,
    reviewId: review.id || "",
    reviewDecision: review.reviewDecision || "",
    leadLimit: 15,
    source: requiredSource,
    leadReference: cleanText(review.leadReference || input.leadReference || ""),
    partNeeded: cleanText(review.partNeeded || input.partNeeded || ""),
    vehicleDetail: cleanText(review.vehicleDetail || input.vehicleDetail || ""),
    buyerLocation: cleanText(review.buyerLocation || input.buyerLocation || ""),
    buyerIntentProof: cleanText(review.buyerIntentProof || input.buyerIntentProof || ""),

    stockLocation: cleanText(input.stockLocation || ""),
    stockCondition: cleanText(input.stockCondition || ""),
    stockNote: cleanText(input.stockNote || ""),

    reviewSummary: validation.reviewSummary,

    adminReviewedManualLeadReview: true,
    adminPhysicallyCheckedStock: true,
    adminConfirmedStockStatusManually: true,
    manualStockCheckCompleted: true,

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
    quoteBlockedUntilCompatibility: true,

    manualCompatibilityCheckRequiredNext: true,
    compatibilityConfirmationRequiredBeforeQuote: true,

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
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoStockReservation: true,
    adminConfirmedNoStockReduction: true,
    adminConfirmedNoAccountingEntry: true,
    adminConfirmedManualCompatibilityCheckRequiredNext: true,
    adminConfirmedQuoteBlockedUntilCompatibility: true,

    checkedBy: cleanText(input.checkedBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const stockChecks = listManualStockChecks();
  stockChecks.unshift(check);
  writeJsonArray(stockChecksPath, stockChecks);

  return {
    ok: true,
    statusCode: 201,
    check
  };
}

function getManualStockCheckSummary() {
  const checks = listManualStockChecks();
  const completed = checks.filter(check => check.stockCheckStatus === "MANUAL_STOCK_CHECK_COMPLETED");
  const available = checks.filter(check => check.stockDecision === "STOCK_CONFIRMED_AVAILABLE");
  const notAvailable = checks.filter(check => check.stockDecision === "STOCK_NOT_AVAILABLE");
  const supplierConfirmation = checks.filter(check => check.stockDecision === "STOCK_NEEDS_SUPPLIER_CONFIRMATION");
  const latest = checks[0] || null;

  return {
    totalStockChecks: checks.length,
    completedStockCheckCount: completed.length,
    stockConfirmedAvailableCount: available.length,
    stockNotAvailableCount: notAvailable.length,
    stockNeedsSupplierConfirmationCount: supplierConfirmation.length,
    latestStockCheckStatus: latest ? latest.stockCheckStatus : "NO_STOCK_CHECK",
    latestStockDecision: latest ? latest.stockDecision : "",
    latestSlotNumber: latest ? latest.slotNumber : 0,
    latestSource: latest ? latest.source : "",
    safety: {
      manualStockCheckGateOnly: true,
      stockCheckRecordOnly: true,
      controlledStockCheckOnly: true,
      manualStockStatusOnly: true,
      stockCheckCompletedOnly: true,
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
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      quoteBlockedUntilCompatibility: true,
      noInventoryUpdate: true,
      noStockReservation: true,
      noStockReduction: true,
      noStockLedgerEntry: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true,
      manualCompatibilityCheckRequiredNext: true,
      compatibilityConfirmationRequiredBeforeQuote: true,
      manualReviewRequiredBeforeAnyBuyerContact: true
    }
  };
}

function getManualStockCheckPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Manual Stock Check Gate Foundation is active.",
    purpose: "Record manual stock check decisions after accepted manual lead review and before compatibility check or quote preparation.",
    requiredStockCheckPhrase,
    allowedDecisions: [
      "STOCK_CONFIRMED_AVAILABLE",
      "STOCK_NOT_AVAILABLE",
      "STOCK_NEEDS_SUPPLIER_CONFIRMATION"
    ],
    rules: [
      "Manual stock check record only.",
      "Stock status is confirmed manually.",
      "No buyer contact from this gate.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No buyer message scraping.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote is prepared at this gate.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "No inventory update.",
      "No stock reservation.",
      "No stock reduction.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Manual compatibility check is required next."
    ]
  };
}

module.exports = {
  createManualStockCheck,
  listManualStockChecks,
  getManualStockCheckSummary,
  getManualStockCheckPreview
};

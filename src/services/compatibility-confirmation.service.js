const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const compatibilityConfirmationsPath = path.join(process.cwd(), "src", "data", "compatibility-confirmations.json");
const stockConfirmationsPath = path.join(process.cwd(), "src", "data", "stock-confirmations.json");

const allowedCompatibilityStatus = [
  "confirmed_compatible",
  "not_compatible",
  "needs_more_details",
  "unknown"
];

const allowedConfirmationMethods = [
  "engine_code_match",
  "part_number_match",
  "photo_check",
  "mechanic_confirmation",
  "manual_admin_check"
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

function readCompatibilityConfirmations() {
  return readJsonArray(compatibilityConfirmationsPath);
}

function writeCompatibilityConfirmations(records) {
  writeJsonArray(compatibilityConfirmationsPath, records);
}

function readStockConfirmations() {
  return readJsonArray(stockConfirmationsPath);
}

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeReadCollection(name) {
  try {
    const value = dataStore.readCollection(name);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function findLead(leadId) {
  const leads = safeReadCollection("leads");
  return leads.find(lead => lead.id === leadId);
}

function getLatestStockConfirmation(leadId) {
  return readStockConfirmations()
    .filter(item => item.leadId === leadId)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
}

function isBlockedAutomationRequest(input) {
  return input.autoCreateQuote === true ||
    input.createQuoteNow === true ||
    input.generateQuoteNow === true ||
    input.autoSendWhatsApp === true ||
    input.sendBuyerMessage === true ||
    input.messageBuyerAutomatically === true ||
    input.movePipelineAutomatically === true ||
    input.autoMovePipelineStage === true;
}

function hasPriceOrQuoteRequest(input) {
  return Boolean(
    input.price ||
    input.quotePrice ||
    input.quoteAmount ||
    input.amount ||
    input.finalPrice ||
    input.sendQuoteNow ||
    input.quoteMessage ||
    input.quoteDraft
  );
}

function validateCompatibilityConfirmation(input) {
  const errors = [];
  const leadId = cleanText(input.leadId);
  const compatibilityStatus = cleanText(input.compatibilityStatus || "unknown");
  const confirmationMethod = cleanText(input.confirmationMethod || "manual_admin_check");

  if (!leadId) errors.push("leadId is required.");

  if (leadId && !findLead(leadId)) {
    errors.push("Lead not found.");
  }

  if (!allowedCompatibilityStatus.includes(compatibilityStatus)) {
    errors.push(`compatibilityStatus is not approved: ${compatibilityStatus}`);
  }

  if (!allowedConfirmationMethods.includes(confirmationMethod)) {
    errors.push(`confirmationMethod is not approved: ${confirmationMethod}`);
  }

  if (isBlockedAutomationRequest(input)) {
    errors.push("Automatic quote, WhatsApp sending, buyer messaging, or pipeline movement is blocked.");
  }

  if (hasPriceOrQuoteRequest(input)) {
    errors.push("Price/quote is blocked at compatibility confirmation stage. Manual quote draft only after both gates are confirmed.");
  }

  if (cleanText(input.note).length > 700) {
    errors.push("note is too long.");
  }

  return errors;
}

function createCompatibilityConfirmation(input) {
  const errors = validateCompatibilityConfirmation(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Lead not found.") ? 404 : 400,
      errors
    };
  }

  const lead = findLead(cleanText(input.leadId));
  const latestStock = getLatestStockConfirmation(lead.id);
  const stockConfirmed = Boolean(latestStock && latestStock.stockConfirmed === true);
  const compatibilityStatus = cleanText(input.compatibilityStatus || "unknown");
  const compatibilityConfirmed = compatibilityStatus === "confirmed_compatible";
  const quoteGateReady = stockConfirmed && compatibilityConfirmed;
  const now = new Date().toISOString();

  const record = {
    id: dataStore.createId("compat_gate"),
    leadId: lead.id,
    buyerName: cleanText(lead.buyerName),
    buyerPhone: cleanText(lead.phone),
    partNeeded: cleanText(lead.partNeeded),
    vehicleBrand: cleanText(lead.vehicleBrand),
    vehicleModel: cleanText(lead.vehicleModel),
    vehicleYear: cleanText(lead.vehicleYear),
    engineCode: cleanText(lead.engineCode),
    location: cleanText(lead.location),
    source: cleanText(lead.source),
    stockConfirmationId: latestStock ? latestStock.id : "",
    stockConfirmed,
    stockStatus: latestStock ? cleanText(latestStock.stockStatus) : "missing_stock_confirmation",
    compatibilityStatus,
    compatibilityConfirmed,
    confirmationMethod: cleanText(input.confirmationMethod || "manual_admin_check"),
    confirmedBy: cleanText(input.confirmedBy || "admin_manual"),
    matchedEngineCode: cleanText(input.matchedEngineCode || lead.engineCode || ""),
    matchedPartNumber: cleanText(input.matchedPartNumber || ""),
    buyerPhotoChecked: input.buyerPhotoChecked === true,
    socketOrPlugMatched: input.socketOrPlugMatched === true,
    note: cleanText(input.note || "Manual compatibility confirmation recorded."),
    stockConfirmationRequiredBeforeQuote: true,
    compatibilityConfirmationRequiredBeforeQuote: true,
    quoteGateReady,
    manualQuoteDraftAllowed: quoteGateReady,
    quoteAllowed: quoteGateReady,
    quoteBlockedReason: quoteGateReady
      ? ""
      : "Both stock confirmation and compatibility confirmation are required before manual quote draft.",
    manualReviewRequired: true,
    manualActionOnly: true,
    autoCreateQuote: false,
    quoteCreatedAutomatically: false,
    autoSendWhatsApp: false,
    automaticBuyerMessage: false,
    sentToBuyer: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    priceIncluded: false,
    createdAt: now,
    updatedAt: now
  };

  const records = readCompatibilityConfirmations();
  records.unshift(record);
  writeCompatibilityConfirmations(records);

  return {
    ok: true,
    statusCode: 201,
    confirmation: record
  };
}

function listCompatibilityConfirmations() {
  return readCompatibilityConfirmations();
}

function getCompatibilityConfirmationSummary() {
  const confirmations = listCompatibilityConfirmations();

  return {
    totalCompatibilityConfirmations: confirmations.length,
    compatibilityConfirmed: confirmations.filter(item => item.compatibilityConfirmed === true).length,
    notCompatible: confirmations.filter(item => item.compatibilityStatus === "not_compatible").length,
    needsMoreDetails: confirmations.filter(item => item.compatibilityStatus === "needs_more_details").length,
    stockConfirmedCount: confirmations.filter(item => item.stockConfirmed === true).length,
    quoteGateReadyCount: confirmations.filter(item => item.quoteGateReady === true).length,
    manualQuoteDraftAllowedCount: confirmations.filter(item => item.manualQuoteDraftAllowed === true).length,
    manualReviewRequired: confirmations.filter(item => item.manualReviewRequired === true).length,
    autoCreateQuoteCount: confirmations.filter(item => item.autoCreateQuote === true || item.quoteCreatedAutomatically === true).length,
    autoSendWhatsAppCount: confirmations.filter(item => item.autoSendWhatsApp === true).length,
    automaticBuyerMessageCount: confirmations.filter(item => item.automaticBuyerMessage === true).length,
    sentToBuyerCount: confirmations.filter(item => item.sentToBuyer === true).length,
    autoPipelineMoveCount: confirmations.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true).length,
    priceIncludedCount: confirmations.filter(item => item.priceIncluded === true).length,
    safety: {
      compatibilityGateManualOnly: true,
      stockAndCompatibilityRequiredBeforeQuote: true,
      manualQuoteDraftAllowedAfterBothConfirmed: true,
      autoCreateQuote: false,
      autoSendWhatsApp: false,
      automaticBuyerMessage: false,
      autoMovePipelineStage: false,
      sentToBuyer: false,
      priceIncluded: false,
      manualReviewRequired: true
    }
  };
}

module.exports = {
  allowedCompatibilityStatus,
  allowedConfirmationMethods,
  createCompatibilityConfirmation,
  listCompatibilityConfirmations,
  getCompatibilityConfirmationSummary
};

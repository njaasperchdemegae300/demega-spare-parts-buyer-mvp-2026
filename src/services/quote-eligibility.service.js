const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const quoteEligibilitiesPath = path.join(process.cwd(), "src", "data", "quote-eligibilities.json");
const stockConfirmationsPath = path.join(process.cwd(), "src", "data", "stock-confirmations.json");
const compatibilityConfirmationsPath = path.join(process.cwd(), "src", "data", "compatibility-confirmations.json");

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

function latestByLead(records, leadId) {
  return records
    .filter(item => item.leadId === leadId)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
}

function getLatestStockConfirmation(leadId) {
  return latestByLead(readJsonArray(stockConfirmationsPath), leadId);
}

function getLatestCompatibilityConfirmation(leadId) {
  return latestByLead(readJsonArray(compatibilityConfirmationsPath), leadId);
}

function readQuoteEligibilities() {
  return readJsonArray(quoteEligibilitiesPath);
}

function writeQuoteEligibilities(records) {
  writeJsonArray(quoteEligibilitiesPath, records);
}

function isBlockedAutomationRequest(input) {
  return input.autoCreateQuote === true ||
    input.createQuoteNow === true ||
    input.generateQuoteNow === true ||
    input.autoSendWhatsApp === true ||
    input.sendBuyerMessage === true ||
    input.messageBuyerAutomatically === true ||
    input.movePipelineAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.autoOpenBrowser === true;
}

function hasPriceOrQuotePayload(input) {
  return Boolean(
    input.price ||
    input.quotePrice ||
    input.quoteAmount ||
    input.amount ||
    input.finalPrice ||
    input.sendQuoteNow ||
    input.quoteMessage ||
    input.quoteDraft ||
    input.whatsappMessage
  );
}

function validateQuoteEligibilityRequest(input) {
  const errors = [];
  const leadId = cleanText(input.leadId);

  if (!leadId) errors.push("leadId is required.");

  if (leadId && !findLead(leadId)) {
    errors.push("Lead not found.");
  }

  if (isBlockedAutomationRequest(input)) {
    errors.push("Automatic quote creation, WhatsApp sending, buyer messaging, browser opening, or pipeline movement is blocked.");
  }

  if (hasPriceOrQuotePayload(input)) {
    errors.push("Price, quote amount, quote draft, or buyer message is blocked at eligibility gate. This gate only checks manual quote eligibility.");
  }

  if (cleanText(input.note).length > 700) {
    errors.push("note is too long.");
  }

  return errors;
}

function buildGateReasons(stockConfirmation, compatibilityConfirmation) {
  const reasons = [];

  if (!stockConfirmation) {
    reasons.push("Stock confirmation is missing.");
  } else if (stockConfirmation.stockConfirmed !== true) {
    reasons.push("Stock is not confirmed.");
  }

  if (!compatibilityConfirmation) {
    reasons.push("Compatibility confirmation is missing.");
  } else if (compatibilityConfirmation.compatibilityConfirmed !== true) {
    reasons.push("Compatibility is not confirmed.");
  }

  return reasons;
}

function createQuoteEligibilityCheck(input) {
  const errors = validateQuoteEligibilityRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Lead not found.") ? 404 : 400,
      errors
    };
  }

  const lead = findLead(cleanText(input.leadId));
  const stockConfirmation = getLatestStockConfirmation(lead.id);
  const compatibilityConfirmation = getLatestCompatibilityConfirmation(lead.id);
  const stockConfirmed = Boolean(stockConfirmation && stockConfirmation.stockConfirmed === true);
  const compatibilityConfirmed = Boolean(compatibilityConfirmation && compatibilityConfirmation.compatibilityConfirmed === true);
  const gateReasons = buildGateReasons(stockConfirmation, compatibilityConfirmation);
  const eligibleForManualQuoteDraft = stockConfirmed && compatibilityConfirmed && gateReasons.length === 0;
  const now = new Date().toISOString();

  const record = {
    id: dataStore.createId("quote_gate"),
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
    stockConfirmationId: stockConfirmation ? stockConfirmation.id : "",
    compatibilityConfirmationId: compatibilityConfirmation ? compatibilityConfirmation.id : "",
    stockConfirmed,
    compatibilityConfirmed,
    stockStatus: stockConfirmation ? cleanText(stockConfirmation.stockStatus) : "missing_stock_confirmation",
    compatibilityStatus: compatibilityConfirmation ? cleanText(compatibilityConfirmation.compatibilityStatus) : "missing_compatibility_confirmation",
    eligibleForManualQuoteDraft,
    manualQuoteDraftAllowed: eligibleForManualQuoteDraft,
    finalQuoteGatePassed: eligibleForManualQuoteDraft,
    quoteBlockedReason: eligibleForManualQuoteDraft
      ? ""
      : gateReasons.join(" "),
    gateReasons,
    manualReviewRequired: true,
    manualActionOnly: true,
    quoteEligibilityOnly: true,
    autoCreateQuote: false,
    quoteCreatedAutomatically: false,
    autoSendWhatsApp: false,
    automaticBuyerMessage: false,
    sentToBuyer: false,
    autoOpenBrowser: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    priceIncluded: false,
    quoteAmountIncluded: false,
    note: cleanText(input.note || "Safe final quote eligibility checked manually."),
    checkedBy: cleanText(input.checkedBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const records = readQuoteEligibilities();
  records.unshift(record);
  writeQuoteEligibilities(records);

  return {
    ok: true,
    statusCode: 201,
    eligibility: record
  };
}

function listQuoteEligibilities() {
  return readQuoteEligibilities();
}

function getQuoteEligibilitySummary() {
  const eligibilities = listQuoteEligibilities();

  return {
    totalQuoteEligibilityChecks: eligibilities.length,
    eligibleForManualQuoteDraft: eligibilities.filter(item => item.eligibleForManualQuoteDraft === true).length,
    finalQuoteGatePassed: eligibilities.filter(item => item.finalQuoteGatePassed === true).length,
    blockedQuoteGate: eligibilities.filter(item => item.finalQuoteGatePassed !== true).length,
    stockConfirmedCount: eligibilities.filter(item => item.stockConfirmed === true).length,
    compatibilityConfirmedCount: eligibilities.filter(item => item.compatibilityConfirmed === true).length,
    manualReviewRequired: eligibilities.filter(item => item.manualReviewRequired === true).length,
    autoCreateQuoteCount: eligibilities.filter(item => item.autoCreateQuote === true || item.quoteCreatedAutomatically === true).length,
    autoSendWhatsAppCount: eligibilities.filter(item => item.autoSendWhatsApp === true).length,
    automaticBuyerMessageCount: eligibilities.filter(item => item.automaticBuyerMessage === true).length,
    sentToBuyerCount: eligibilities.filter(item => item.sentToBuyer === true).length,
    autoOpenBrowserCount: eligibilities.filter(item => item.autoOpenBrowser === true).length,
    autoPipelineMoveCount: eligibilities.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true).length,
    priceIncludedCount: eligibilities.filter(item => item.priceIncluded === true || item.quoteAmountIncluded === true).length,
    safety: {
      quoteEligibilityOnly: true,
      manualQuoteDraftAllowedOnlyAfterBothGates: true,
      stockAndCompatibilityRequiredBeforeQuote: true,
      autoCreateQuote: false,
      autoSendWhatsApp: false,
      automaticBuyerMessage: false,
      autoOpenBrowser: false,
      autoMovePipelineStage: false,
      sentToBuyer: false,
      priceIncluded: false,
      manualReviewRequired: true
    }
  };
}

module.exports = {
  createQuoteEligibilityCheck,
  listQuoteEligibilities,
  getQuoteEligibilitySummary
};

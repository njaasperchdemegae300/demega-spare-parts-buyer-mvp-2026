const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const stockConfirmationsPath = path.join(process.cwd(), "src", "data", "stock-confirmations.json");

const allowedStockStatus = [
  "confirmed_in_stock",
  "not_in_stock",
  "needs_physical_check",
  "reserved",
  "unknown"
];

const allowedConfirmationMethods = [
  "physical_check",
  "supplier_call",
  "inventory_record",
  "photo_check",
  "manual_admin_check"
];

function ensureFile() {
  const dir = path.dirname(stockConfirmationsPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(stockConfirmationsPath)) fs.writeFileSync(stockConfirmationsPath, "[]", "utf8");
}

function readStockConfirmations() {
  ensureFile();

  try {
    const parsed = JSON.parse(fs.readFileSync(stockConfirmationsPath, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStockConfirmations(records) {
  ensureFile();
  fs.writeFileSync(stockConfirmationsPath, JSON.stringify(records, null, 2), "utf8");
}

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function isBlockedAutomationRequest(input) {
  return input.autoCreateQuote === true ||
    input.createQuoteNow === true ||
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
    input.quoteMessage
  );
}

function validateStockConfirmation(input) {
  const errors = [];
  const leadId = cleanText(input.leadId);
  const stockStatus = cleanText(input.stockStatus || "unknown");
  const confirmationMethod = cleanText(input.confirmationMethod || "manual_admin_check");

  if (!leadId) errors.push("leadId is required.");

  if (leadId && !findLead(leadId)) {
    errors.push("Lead not found.");
  }

  if (!allowedStockStatus.includes(stockStatus)) {
    errors.push(`stockStatus is not approved: ${stockStatus}`);
  }

  if (!allowedConfirmationMethods.includes(confirmationMethod)) {
    errors.push(`confirmationMethod is not approved: ${confirmationMethod}`);
  }

  if (isBlockedAutomationRequest(input)) {
    errors.push("Automatic quote, WhatsApp sending, buyer messaging, or pipeline movement is blocked.");
  }

  if (hasPriceOrQuoteRequest(input)) {
    errors.push("Price/quote is blocked at stock confirmation stage. Compatibility confirmation is still required.");
  }

  if (cleanText(input.note).length > 700) {
    errors.push("note is too long.");
  }

  return errors;
}

function createStockConfirmation(input) {
  const errors = validateStockConfirmation(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Lead not found.") ? 404 : 400,
      errors
    };
  }

  const lead = findLead(cleanText(input.leadId));
  const now = new Date().toISOString();
  const stockStatus = cleanText(input.stockStatus || "unknown");
  const stockConfirmed = stockStatus === "confirmed_in_stock" || stockStatus === "reserved";

  const record = {
    id: dataStore.createId("stock_gate"),
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
    stockStatus,
    stockConfirmed,
    stockQuantity: Math.max(0, numberValue(input.stockQuantity)),
    condition: cleanText(input.condition || "not_recorded"),
    supplierOrShelf: cleanText(input.supplierOrShelf || ""),
    confirmationMethod: cleanText(input.confirmationMethod || "manual_admin_check"),
    confirmedBy: cleanText(input.confirmedBy || "admin_manual"),
    note: cleanText(input.note || "Manual stock confirmation recorded."),
    compatibilityConfirmed: false,
    compatibilityConfirmationRequiredBeforeQuote: true,
    stockConfirmationRequiredBeforeQuote: true,
    quoteAllowed: false,
    quoteBlockedReason: "Compatibility confirmation is still required before any quote.",
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

  const records = readStockConfirmations();
  records.unshift(record);
  writeStockConfirmations(records);

  return {
    ok: true,
    statusCode: 201,
    confirmation: record
  };
}

function listStockConfirmations() {
  return readStockConfirmations();
}

function getStockConfirmationSummary() {
  const confirmations = listStockConfirmations();

  return {
    totalStockConfirmations: confirmations.length,
    confirmedInStock: confirmations.filter(item => item.stockStatus === "confirmed_in_stock").length,
    reserved: confirmations.filter(item => item.stockStatus === "reserved").length,
    notInStock: confirmations.filter(item => item.stockStatus === "not_in_stock").length,
    needsPhysicalCheck: confirmations.filter(item => item.stockStatus === "needs_physical_check").length,
    quoteAllowedCount: confirmations.filter(item => item.quoteAllowed === true).length,
    compatibilityConfirmedCount: confirmations.filter(item => item.compatibilityConfirmed === true).length,
    manualReviewRequired: confirmations.filter(item => item.manualReviewRequired === true).length,
    autoCreateQuoteCount: confirmations.filter(item => item.autoCreateQuote === true || item.quoteCreatedAutomatically === true).length,
    autoSendWhatsAppCount: confirmations.filter(item => item.autoSendWhatsApp === true).length,
    automaticBuyerMessageCount: confirmations.filter(item => item.automaticBuyerMessage === true).length,
    sentToBuyerCount: confirmations.filter(item => item.sentToBuyer === true).length,
    autoPipelineMoveCount: confirmations.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true).length,
    priceIncludedCount: confirmations.filter(item => item.priceIncluded === true).length,
    safety: {
      stockGateManualOnly: true,
      stockCanBeConfirmedManually: true,
      quoteAllowedAtStockGate: false,
      compatibilityRequiredBeforeQuote: true,
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
  allowedStockStatus,
  allowedConfirmationMethods,
  createStockConfirmation,
  listStockConfirmations,
  getStockConfirmationSummary
};

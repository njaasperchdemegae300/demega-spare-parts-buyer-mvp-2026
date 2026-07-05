const dataStore = require("./data-store");

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findLead(leadId) {
  const leads = dataStore.readCollection("leads");
  return leads.find(lead => lead.id === leadId);
}

function findInventoryItem(inventoryItemId) {
  const inventory = dataStore.readCollection("inventory");
  return inventory.find(item => item.id === inventoryItemId);
}

function getQuoteGateErrors(lead, item) {
  const errors = [];

  if (!lead) errors.push("Lead not found.");
  if (!item) errors.push("Inventory item not found.");

  if (!lead || !item) return errors;

  if (item.quoteReady !== true) {
    errors.push("Inventory item is not quote-ready.");
  }

  if (item.stockConfirmedForQuote !== true) {
    errors.push("No quote before stock confirmation.");
  }

  if (item.compatibilityConfirmed !== true) {
    errors.push("No quote before compatibility confirmation.");
  }

  if (item.stockStatus === "out_of_stock") {
    errors.push("Cannot quote an out-of-stock item.");
  }

  return errors;
}

function buildWhatsAppDraft(lead, item, input) {
  const priceText = cleanText(input.priceText || item.priceRange || "Price will be confirmed before final reply");
  const deliveryText = cleanText(input.deliveryText || "Pickup or delivery can be discussed after confirmation.");
  const trustText = cleanText(input.trustText || "Please confirm socket, pulley, engine code, and sample picture before payment.");

  return [
    `Hello ${lead.buyerName},`,
    `We found a possible match for your request: ${lead.partNeeded}.`,
    `Part: ${item.partName}`,
    `Vehicle: ${item.vehicleBrand} ${item.vehicleModel} ${item.vehicleYear || ""}`.trim(),
    `Engine code: ${item.engineCode || lead.engineCode || "confirm"}`,
    `Condition: ${item.condition || "confirm"}`,
    `Price: ${priceText}`,
    `Location: ${item.shopLocation || "confirm"}`,
    deliveryText,
    trustText,
    `This is a draft only. Final reply must be reviewed manually before sending.`
  ].join("\n");
}

function createQuoteDraft(input) {
  const leadId = cleanText(input.leadId);
  const inventoryItemId = cleanText(input.inventoryItemId);

  const lead = findLead(leadId);
  const item = findInventoryItem(inventoryItemId);
  const gateErrors = getQuoteGateErrors(lead, item);

  if (gateErrors.length) {
    return {
      ok: false,
      statusCode: 409,
      errors: gateErrors
    };
  }

  const draft = {
    id: dataStore.createId("quote"),
    leadId: lead.id,
    inventoryItemId: item.id,
    buyerName: lead.buyerName,
    buyerPhone: lead.phone,
    partNeeded: lead.partNeeded,
    matchedPartName: item.partName,
    vehicleBrand: item.vehicleBrand,
    vehicleModel: item.vehicleModel,
    vehicleYear: item.vehicleYear,
    engineCode: item.engineCode || lead.engineCode,
    condition: item.condition,
    stockStatus: item.stockStatus,
    priceText: cleanText(input.priceText || item.priceRange),
    deliveryText: cleanText(input.deliveryText),
    draftMessage: buildWhatsAppDraft(lead, item, input),
    quoteStatus: "draft_only",
    autoSendWhatsApp: false,
    sentToBuyer: false,
    manualReviewRequired: true,
    stockConfirmedForQuote: item.stockConfirmedForQuote === true,
    compatibilityConfirmed: item.compatibilityConfirmed === true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const quotes = dataStore.readCollection("quotes");
  quotes.unshift(draft);
  dataStore.writeCollection("quotes", quotes);

  return {
    ok: true,
    statusCode: 201,
    draft
  };
}

function listQuoteDrafts() {
  return dataStore.readCollection("quotes");
}

function getQuoteSummary() {
  const quotes = listQuoteDrafts();

  return {
    totalQuotes: quotes.length,
    draftOnly: quotes.filter(quote => quote.quoteStatus === "draft_only").length,
    sentToBuyer: quotes.filter(quote => quote.sentToBuyer === true).length,
    manualReviewRequired: quotes.filter(quote => quote.manualReviewRequired === true).length,
    autoSendWhatsAppCount: quotes.filter(quote => quote.autoSendWhatsApp === true).length
  };
}

module.exports = {
  createQuoteDraft,
  listQuoteDrafts,
  getQuoteSummary,
  getQuoteGateErrors
};

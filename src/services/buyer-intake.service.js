const dataStore = require("./data-store");

const allowedSources = [
  "owned_landing_page",
  "whatsapp_inbound",
  "google_search",
  "meta_lead_form",
  "manual_shop_visitor",
  "referral",
  "public_rfq",
  "approved_api",
  "approved_partnership"
];

function cleanText(value) {
  return String(value || "").trim();
}

function createBuyerLead(input) {
  const lead = {
    id: dataStore.createId("lead"),
    buyerName: cleanText(input.buyerName),
    phone: cleanText(input.phone),
    source: cleanText(input.source),
    partNeeded: cleanText(input.partNeeded),
    vehicleBrand: cleanText(input.vehicleBrand),
    vehicleModel: cleanText(input.vehicleModel),
    vehicleYear: cleanText(input.vehicleYear),
    engineCode: cleanText(input.engineCode),
    location: cleanText(input.location),
    urgency: cleanText(input.urgency || "normal"),
    message: cleanText(input.message),
    status: "new",
    quoteStatus: "not_ready",
    stockConfirmed: false,
    compatibilityConfirmed: false,
    manualReviewRequired: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const leads = dataStore.readCollection("leads");
  leads.unshift(lead);
  dataStore.writeCollection("leads", leads);

  return lead;
}

function validateBuyerLead(input) {
  const errors = [];

  if (!cleanText(input.buyerName)) errors.push("buyerName is required.");
  if (!cleanText(input.phone)) errors.push("phone is required.");
  if (!cleanText(input.partNeeded)) errors.push("partNeeded is required.");
  if (!cleanText(input.vehicleBrand)) errors.push("vehicleBrand is required.");
  if (!cleanText(input.vehicleModel)) errors.push("vehicleModel is required.");
  if (!cleanText(input.location)) errors.push("location is required.");

  const source = cleanText(input.source);

  if (!source) {
    errors.push("source is required.");
  } else if (!allowedSources.includes(source)) {
    errors.push(`source is not approved for buyer intake: ${source}`);
  }

  return errors;
}

function listLeads() {
  return dataStore.readCollection("leads");
}

module.exports = {
  allowedSources,
  createBuyerLead,
  validateBuyerLead,
  listLeads
};

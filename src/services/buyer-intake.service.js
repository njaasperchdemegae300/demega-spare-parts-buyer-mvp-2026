const dataStore = require("./data-store");
const buyerScoring = require("./buyer-scoring.service");

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

const allowedUrgency = [
  "normal",
  "urgent",
  "today",
  "this_week"
];

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(value) {
  return cleanText(value).replace(/[^\d+]/g, "");
}

function isReasonablePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function tooLong(value, max) {
  return cleanText(value).length > max;
}

function findPossibleDuplicate(input) {
  const leads = dataStore.readCollection("leads");
  const phone = normalizePhone(input.phone);
  const partNeeded = cleanText(input.partNeeded).toLowerCase();
  const vehicleModel = cleanText(input.vehicleModel).toLowerCase();

  return leads.find(lead =>
    normalizePhone(lead.phone) === phone &&
    cleanText(lead.partNeeded).toLowerCase() === partNeeded &&
    cleanText(lead.vehicleModel).toLowerCase() === vehicleModel
  );
}

function validateBuyerLead(input) {
  const errors = [];

  const buyerName = cleanText(input.buyerName);
  const phone = normalizePhone(input.phone);
  const source = cleanText(input.source);
  const partNeeded = cleanText(input.partNeeded);
  const vehicleBrand = cleanText(input.vehicleBrand);
  const vehicleModel = cleanText(input.vehicleModel);
  const vehicleYear = cleanText(input.vehicleYear);
  const location = cleanText(input.location);
  const urgency = cleanText(input.urgency || "normal");

  if (!buyerName) errors.push("buyerName is required.");
  if (!phone) errors.push("phone is required.");
  if (phone && !isReasonablePhone(phone)) errors.push("phone is not valid.");
  if (!partNeeded) errors.push("partNeeded is required.");
  if (partNeeded && partNeeded.length < 3) errors.push("partNeeded is too short.");
  if (!vehicleBrand) errors.push("vehicleBrand is required.");
  if (!vehicleModel) errors.push("vehicleModel is required.");
  if (!location) errors.push("location is required.");

  if (vehicleYear && !/^\d{4}$/.test(vehicleYear)) {
    errors.push("vehicleYear must be a 4-digit year when provided.");
  }

  if (!source) {
    errors.push("source is required.");
  } else if (!allowedSources.includes(source)) {
    errors.push(`source is not approved for buyer intake: ${source}`);
  }

  if (!allowedUrgency.includes(urgency)) {
    errors.push(`urgency is not approved: ${urgency}`);
  }

  if (tooLong(buyerName, 80)) errors.push("buyerName is too long.");
  if (tooLong(partNeeded, 120)) errors.push("partNeeded is too long.");
  if (tooLong(vehicleBrand, 60)) errors.push("vehicleBrand is too long.");
  if (tooLong(vehicleModel, 60)) errors.push("vehicleModel is too long.");
  if (tooLong(location, 100)) errors.push("location is too long.");
  if (tooLong(input.message, 500)) errors.push("message is too long.");

  return errors;
}

function createBuyerLead(input) {
  const duplicate = findPossibleDuplicate(input);
  const duplicateStatus = duplicate ? "possible_duplicate" : "unique";
  const scoring = buyerScoring.calculateBuyerScore({ ...input, duplicateStatus });

  const lead = {
    id: dataStore.createId("lead"),
    buyerName: cleanText(input.buyerName),
    phone: normalizePhone(input.phone),
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
    duplicateStatus,
    possibleDuplicateLeadId: duplicate ? duplicate.id : null,
    ...scoring,
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

function listLeads() {
  return dataStore.readCollection("leads");
}

module.exports = {
  allowedSources,
  allowedUrgency,
  createBuyerLead,
  validateBuyerLead,
  listLeads
};

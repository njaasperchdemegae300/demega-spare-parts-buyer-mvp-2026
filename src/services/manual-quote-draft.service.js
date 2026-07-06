const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const manualQuoteDraftsPath = path.join(process.cwd(), "src", "data", "manual-quote-drafts.json");
const quoteEligibilitiesPath = path.join(process.cwd(), "src", "data", "quote-eligibilities.json");

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

function getLatestQuoteEligibility(leadId) {
  return latestByLead(readJsonArray(quoteEligibilitiesPath), leadId);
}

function readManualQuoteDrafts() {
  return readJsonArray(manualQuoteDraftsPath);
}

function writeManualQuoteDrafts(records) {
  writeJsonArray(manualQuoteDraftsPath, records);
}

function isBlockedAutomationRequest(input) {
  return input.autoSendWhatsApp === true ||
    input.sendBuyerMessage === true ||
    input.messageBuyerAutomatically === true ||
    input.autoOpenBrowser === true ||
    input.openWhatsappAutomatically === true ||
    input.movePipelineAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.markAsSent === true ||
    input.sentToBuyer === true;
}

function parseQuoteAmount(value) {
  const parsed = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(amount, currency) {
  const safeCurrency = cleanText(currency || "NGN").toUpperCase();

  if (safeCurrency === "NGN") {
    return `₦${Number(amount).toLocaleString("en-NG")}`;
  }

  return `${safeCurrency} ${Number(amount).toLocaleString("en-US")}`;
}

function validateManualQuoteDraftRequest(input) {
  const errors = [];
  const leadId = cleanText(input.leadId);
  const quoteAmount = parseQuoteAmount(input.quoteAmount || input.price || input.finalPrice);

  if (!leadId) errors.push("leadId is required.");

  if (leadId && !findLead(leadId)) {
    errors.push("Lead not found.");
  }

  if (!quoteAmount || quoteAmount <= 0) {
    errors.push("quoteAmount is required and must be greater than zero.");
  }

  if (isBlockedAutomationRequest(input)) {
    errors.push("WhatsApp sending, buyer messaging, browser opening, sent status, or pipeline movement is blocked.");
  }

  if (cleanText(input.condition).length > 120) {
    errors.push("condition is too long.");
  }

  if (cleanText(input.deliveryNote).length > 300) {
    errors.push("deliveryNote is too long.");
  }

  if (cleanText(input.warrantyNote).length > 300) {
    errors.push("warrantyNote is too long.");
  }

  if (cleanText(input.note).length > 700) {
    errors.push("note is too long.");
  }

  return errors;
}

function buildDraftMessage({ lead, quoteAmount, currency, condition, deliveryNote, warrantyNote, trustNote }) {
  const vehicle = [lead.vehicleBrand, lead.vehicleModel, lead.vehicleYear, lead.engineCode]
    .map(cleanText)
    .filter(Boolean)
    .join(" ");

  const lines = [
    `Hello ${cleanText(lead.buyerName) || "Customer"},`,
    `We have checked your request for ${cleanText(lead.partNeeded)}${vehicle ? ` for ${vehicle}` : ""}.`,
    `Stock and compatibility have been confirmed manually.`,
    `Manual quote draft price: ${formatMoney(quoteAmount, currency)}.`,
    condition ? `Condition: ${condition}.` : "",
    deliveryNote ? `Pickup/Delivery: ${deliveryNote}.` : "",
    warrantyNote ? `Warranty/Testing note: ${warrantyNote}.` : "",
    trustNote ? trustNote : "Please confirm before we proceed.",
    "",
    "This is a draft only. Admin must review manually before sending."
  ];

  return lines.filter(Boolean).join("\n");
}

function createManualQuoteDraft(input) {
  const errors = validateManualQuoteDraftRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Lead not found.") ? 404 : 400,
      errors
    };
  }

  const lead = findLead(cleanText(input.leadId));
  const latestEligibility = getLatestQuoteEligibility(lead.id);

  if (!latestEligibility || latestEligibility.finalQuoteGatePassed !== true || latestEligibility.eligibleForManualQuoteDraft !== true) {
    return {
      ok: false,
      statusCode: 400,
      errors: [
        "Final quote eligibility gate has not passed. Stock and compatibility must both be confirmed before building a manual quote draft."
      ]
    };
  }

  const quoteAmount = parseQuoteAmount(input.quoteAmount || input.price || input.finalPrice);
  const currency = cleanText(input.currency || "NGN").toUpperCase();
  const condition = cleanText(input.condition || "");
  const deliveryNote = cleanText(input.deliveryNote || "");
  const warrantyNote = cleanText(input.warrantyNote || "");
  const trustNote = cleanText(input.trustNote || "");
  const now = new Date().toISOString();

  const messageDraft = buildDraftMessage({
    lead,
    quoteAmount,
    currency,
    condition,
    deliveryNote,
    warrantyNote,
    trustNote
  });

  const record = {
    id: dataStore.createId("manual_quote_draft"),
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
    quoteEligibilityId: latestEligibility.id,
    finalQuoteGatePassed: true,
    eligibleForManualQuoteDraft: true,
    quoteAmount,
    currency,
    formattedQuoteAmount: formatMoney(quoteAmount, currency),
    condition,
    deliveryNote,
    warrantyNote,
    trustNote,
    messageDraft,
    manualQuoteDraftCreated: true,
    draftOnly: true,
    manualReviewRequired: true,
    manualActionOnly: true,
    priceIncludedInDraft: true,
    quoteAmountIncludedInDraft: true,
    priceSentToBuyer: false,
    quoteAmountSentToBuyer: false,
    autoCreateQuote: false,
    quoteCreatedAutomatically: false,
    autoSendWhatsApp: false,
    automaticBuyerMessage: false,
    sentToBuyer: false,
    autoOpenBrowser: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    copiedByAdmin: false,
    sentByAdmin: false,
    note: cleanText(input.note || "Safe manual quote draft created after final eligibility gate."),
    createdBy: cleanText(input.createdBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const records = readManualQuoteDrafts();
  records.unshift(record);
  writeManualQuoteDrafts(records);

  return {
    ok: true,
    statusCode: 201,
    draft: record
  };
}

function listManualQuoteDrafts() {
  return readManualQuoteDrafts();
}

function getManualQuoteDraftSummary() {
  const drafts = listManualQuoteDrafts();

  return {
    totalManualQuoteDrafts: drafts.length,
    draftOnlyCount: drafts.filter(item => item.draftOnly === true).length,
    eligibleDrafts: drafts.filter(item => item.finalQuoteGatePassed === true && item.eligibleForManualQuoteDraft === true).length,
    manualReviewRequired: drafts.filter(item => item.manualReviewRequired === true).length,
    priceIncludedInDraftCount: drafts.filter(item => item.priceIncludedInDraft === true || item.quoteAmountIncludedInDraft === true).length,
    priceSentToBuyerCount: drafts.filter(item => item.priceSentToBuyer === true || item.quoteAmountSentToBuyer === true).length,
    autoCreateQuoteCount: drafts.filter(item => item.autoCreateQuote === true || item.quoteCreatedAutomatically === true).length,
    autoSendWhatsAppCount: drafts.filter(item => item.autoSendWhatsApp === true).length,
    automaticBuyerMessageCount: drafts.filter(item => item.automaticBuyerMessage === true).length,
    sentToBuyerCount: drafts.filter(item => item.sentToBuyer === true || item.sentByAdmin === true).length,
    autoOpenBrowserCount: drafts.filter(item => item.autoOpenBrowser === true).length,
    autoPipelineMoveCount: drafts.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true).length,
    safety: {
      manualQuoteDraftBuilderOnly: true,
      requiresFinalQuoteEligibility: true,
      draftOnly: true,
      priceAllowedInDraftAfterEligibility: true,
      priceSentToBuyer: false,
      autoCreateQuote: false,
      autoSendWhatsApp: false,
      automaticBuyerMessage: false,
      autoOpenBrowser: false,
      autoMovePipelineStage: false,
      sentToBuyer: false,
      manualReviewRequired: true
    }
  };
}

module.exports = {
  createManualQuoteDraft,
  listManualQuoteDrafts,
  getManualQuoteDraftSummary
};

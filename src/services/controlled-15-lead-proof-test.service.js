const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const leadsPath = path.join(process.cwd(), "src", "data", "controlled-15-lead-proof-test-leads.json");

const leadLimit = 15;

const allowedSources = [
  "whatsapp_click_to_chat_inbound",
  "owned_rfq_landing_page",
  "meta_lead_form",
  "google_buyer_intent_landing_page",
  "public_business_inquiry_form"
];

const allowedIntentProofs = [
  "buyer_sent_message_first",
  "buyer_filled_rfq_form",
  "buyer_submitted_meta_lead_form",
  "buyer_called_or_requested_quote",
  "public_business_inquiry_received"
];

const allowedReviewStatuses = [
  "NEW_INBOUND_NOT_REVIEWED",
  "ACCEPTED_FOR_MANUAL_REVIEW",
  "REJECTED_NOT_REAL_BUYER",
  "PENDING_MORE_DETAILS"
];

const allowedTemperature = ["HOT", "WARM", "COLD", "UNKNOWN"];

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

function listLeads() {
  return readJsonArray(leadsPath);
}

function unsafe(input = {}) {
  return input.openLiveGate === true ||
    input.activateRealBuyerTraffic === true ||
    input.startLiveTraffic === true ||
    input.startOutboundTraffic === true ||
    input.startPaidAdsAutomatically === true ||
    input.publishLeadFormAutomatically === true ||
    input.autoContactBuyer === true ||
    input.contactRealBuyerAutomatically === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.systemSendWhatsApp === true ||
    input.broadcastWhatsApp === true ||
    input.autoReplyToBuyer === true ||
    input.autoReadWhatsApp === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.autoStartFollowUp === true ||
    input.autoScheduleFollowUp === true ||
    input.autoSendFollowUp === true ||
    input.autoMovePipelineStage === true ||
    input.autoCloseSale === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCreateReceipt === true ||
    input.autoCreateInvoice === true ||
    input.autoUpdateInventory === true ||
    input.updateInventoryAutomatically === true ||
    input.reserveStockAutomatically === true ||
    input.reduceStockAutomatically === true ||
    input.quoteSentToBuyer === true ||
    input.priceSentToBuyer === true ||
    input.systemQuoteSentToBuyer === true;
}

function validateLead(input = {}) {
  const errors = [];
  const existing = listLeads();

  if (unsafe(input)) {
    errors.push("Unsafe controlled 15-lead proof-test request blocked. This tracker records manual inbound buyer requests only. It must not open live traffic, start ads, publish forms, contact buyers, send WhatsApp, auto-reply, auto-follow-up, scrape messages, mutate inventory, create accounting, quote buyer, close sale, or move pipeline.");
  }

  if (existing.length >= leadLimit) {
    errors.push("Controlled 15-lead proof-test cap reached. No more than 15 inbound buyer requests can be recorded in this stage.");
  }

  const buyerName = cleanText(input.buyerName || "");
  const buyerPhone = cleanText(input.buyerPhone || "");
  const partNeeded = cleanText(input.partNeeded || "");
  const vehicleDetails = cleanText(input.vehicleDetails || "");
  const buyerLocation = cleanText(input.buyerLocation || "");
  const source = cleanText(input.source || "");
  const intentProof = cleanText(input.intentProof || "");
  const permissionStatus = cleanText(input.permissionStatus || "");
  const manualReviewStatus = cleanText(input.manualReviewStatus || "NEW_INBOUND_NOT_REVIEWED");
  const temperature = cleanText(input.temperature || "UNKNOWN");
  const adminNote = cleanText(input.adminNote || "");

  if (!buyerName) errors.push("buyerName is required.");
  if (!buyerPhone) errors.push("buyerPhone is required.");
  if (!partNeeded) errors.push("partNeeded is required.");
  if (!vehicleDetails) errors.push("vehicleDetails is required.");
  if (!buyerLocation) errors.push("buyerLocation is required.");
  if (!allowedSources.includes(source)) errors.push(`source must be one of: ${allowedSources.join(", ")}.`);
  if (!allowedIntentProofs.includes(intentProof)) errors.push(`intentProof must be one of: ${allowedIntentProofs.join(", ")}.`);
  if (permissionStatus !== "inbound_or_opt_in") errors.push("permissionStatus must be inbound_or_opt_in.");
  if (!allowedReviewStatuses.includes(manualReviewStatus)) errors.push(`manualReviewStatus must be one of: ${allowedReviewStatuses.join(", ")}.`);
  if (!allowedTemperature.includes(temperature)) errors.push(`temperature must be one of: ${allowedTemperature.join(", ")}.`);

  const duplicate = existing.find(item =>
    cleanText(item.buyerPhone).toLowerCase() === buyerPhone.toLowerCase() &&
    cleanText(item.partNeeded).toLowerCase() === partNeeded.toLowerCase()
  );

  if (duplicate) {
    errors.push("Duplicate controlled proof-test buyer request blocked for same buyerPhone and partNeeded.");
  }

  return {
    errors,
    buyerName,
    buyerPhone,
    partNeeded,
    vehicleDetails,
    buyerLocation,
    source,
    intentProof,
    permissionStatus,
    manualReviewStatus,
    temperature,
    adminNote
  };
}

function createManualLead(input = {}) {
  const validation = validateLead(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const existing = listLeads();
  const now = new Date().toISOString();

  const record = {
    id: dataStore.createId("controlled_15_lead_proof_test_lead"),
    proofTestStatus: "CONTROLLED_15_LEAD_INBOUND_REQUEST_RECORDED",
    leadNumber: existing.length + 1,
    leadLimit,

    buyerName: validation.buyerName,
    buyerPhone: validation.buyerPhone,
    partNeeded: validation.partNeeded,
    vehicleDetails: validation.vehicleDetails,
    buyerLocation: validation.buyerLocation,
    source: validation.source,
    intentProof: validation.intentProof,
    permissionStatus: validation.permissionStatus,
    manualReviewStatus: validation.manualReviewStatus,
    temperature: validation.temperature,
    adminNote: validation.adminNote,

    manualInboundOnly: true,
    manualReviewOnly: true,
    manualReplyOnly: true,
    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    noPrivateDataScraping: true,
    noHiddenDataHarvesting: true,
    noQuoteBeforeStockConfirmation: true,
    noQuoteBeforeCompatibilityConfirmation: true,

    stockConfirmed: false,
    compatibilityConfirmed: false,
    quoteEligible: false,
    quotePrepared: false,
    quoteSentToBuyer: false,
    priceSentToBuyer: false,
    systemQuoteSentToBuyer: false,

    openLiveGate: false,
    activateRealBuyerTraffic: false,
    startLiveTraffic: false,
    startOutboundTraffic: false,
    startPaidAdsAutomatically: false,
    publishLeadFormAutomatically: false,
    autoContactBuyer: false,
    contactRealBuyerAutomatically: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
    systemSendWhatsApp: false,
    broadcastWhatsApp: false,
    autoReplyToBuyer: false,
    autoReadWhatsApp: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    autoStartFollowUp: false,
    autoScheduleFollowUp: false,
    autoSendFollowUp: false,
    autoMovePipelineStage: false,
    autoCloseSale: false,
    autoCreateAccountingEntry: false,
    autoCreateReceipt: false,
    autoCreateInvoice: false,
    inventoryUpdated: false,
    stockReserved: false,
    stockReduced: false,
    autoUpdateInventory: false,
    updateInventoryAutomatically: false,
    reserveStockAutomatically: false,
    reduceStockAutomatically: false,

    createdAt: now,
    updatedAt: now
  };

  existing.unshift(record);
  writeJsonArray(leadsPath, existing);

  return {
    ok: true,
    statusCode: 201,
    record
  };
}

function getSummary() {
  const records = listLeads();
  const realBuyerIntentCount = records.filter(item => allowedIntentProofs.includes(item.intentProof)).length;
  const hotWarmCount = records.filter(item => ["HOT", "WARM"].includes(item.temperature)).length;
  const remainingSlots = Math.max(leadLimit - records.length, 0);

  const bySource = {};
  for (const item of records) bySource[item.source] = (bySource[item.source] || 0) + 1;

  return {
    totalRecordedLeads: records.length,
    leadLimit,
    remainingSlots,
    capReached: records.length >= leadLimit,
    realBuyerIntentCount,
    realBuyerIntentRate: records.length ? Math.round((realBuyerIntentCount / records.length) * 100) : 0,
    hotWarmCount,
    hotWarmRate: records.length ? Math.round((hotWarmCount / records.length) * 100) : 0,
    bySource,
    safety: {
      manualInboundOnly: true,
      manualReviewOnly: true,
      manualReplyOnly: true,
      noAutoSend: true,
      noSpam: true,
      noUnsolicitedWhatsApp: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      noLiveTrafficOpenedBySystem: true,
      noAdsStartedBySystem: true,
      noLeadFormsPublishedBySystem: true,
      noBuyerContactedBySystem: true,
      noInventoryMutation: true,
      noAccountingMutation: true,
      noSaleClosing: true,
      noPipelineMovement: true
    },
    minimumScaleMetrics: {
      realBuyerIntentLeads: "60%+",
      replySpeed: "under_5_minutes",
      wrongQuoteRate: "0%",
      quoteBeforeStockCompatibility: "0_cases",
      hotWarmBuyerRate: "40%+",
      buyerRepliesAfterQuote: "40%+",
      spamPrivateDataViolations: 0,
      manualSystemConfusionCriticalCases: 0
    }
  };
}

function getPreview() {
  return {
    status: "ok",
    message: "Controlled 15-Lead Proof Test Manual Tracker is active.",
    purpose: "Record up to 15 real inbound buyer requests manually. This does not open traffic, send WhatsApp, auto-reply, auto-follow-up, scrape private data, quote before stock confirmation, quote before compatibility confirmation, mutate inventory, create accounting records, close sale, or move pipeline.",
    leadLimit,
    allowedSources,
    allowedIntentProofs,
    allowedReviewStatuses,
    allowedTemperature,
    rules: [
      "15 inbound buyer requests only.",
      "Manual inbound only.",
      "Manual review only.",
      "Manual reply only.",
      "No auto-send.",
      "No spam.",
      "No unsolicited WhatsApp.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "No scaling until metrics prove success."
    ]
  };
}

module.exports = {
  createManualLead,
  listLeads,
  getSummary,
  getPreview
};

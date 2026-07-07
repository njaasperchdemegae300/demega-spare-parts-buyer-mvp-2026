const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const leadSlotService = require("./controlled-buyer-gate-lead-slot-enforcement.service");

const reviewsPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-manual-lead-reviews.json");

const requiredReviewPhrase = "I_CONFIRM_MANUAL_LEAD_REVIEW_ONLY_NO_BUYER_CONTACT";
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

function listManualLeadReviews() {
  return readJsonArray(reviewsPath);
}

function getLeadSlotSummary() {
  try {
    return leadSlotService.getLeadSlotSummary();
  } catch (error) {
    return {
      totalSlots: 0,
      acceptedSlotCount: 0,
      leadLimit: 15,
      remainingLeadSlots: 15,
      latestSlotStatus: "ERROR",
      latestSource: "",
      error: error.message,
      safety: {}
    };
  }
}

function getLeadSlots() {
  try {
    return leadSlotService.listLeadSlots();
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
    input.autoCreateAccountingEntry === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true;
}

function normalizeDecision(value) {
  const decision = cleanText(value).toUpperCase();
  if (decision === "ACCEPT_FOR_MANUAL_STOCK_CHECK") return decision;
  if (decision === "REJECT_AS_NOT_READY") return decision;
  return "";
}

function validateReview(input = {}) {
  const errors = [];
  const slotSummary = getLeadSlotSummary();
  const slots = getLeadSlots();
  const reviews = listManualLeadReviews();

  if (unsafe(input)) {
    errors.push("Unsafe manual lead review request blocked. Manual lead review records review decisions only and must not contact buyers, start outbound traffic, send/read WhatsApp, scrape, prepare quotes, update inventory, create accounting entries, close sales, or move pipeline.");
  }

  if (slotSummary.totalSlots < 1) errors.push("At least one controlled inbound lead slot must exist before manual lead review.");
  if (slotSummary.acceptedSlotCount < 1) errors.push("At least one ACCEPTED_PENDING_MANUAL_REVIEW lead slot is required.");
  if (Number(slotSummary.leadLimit || 0) !== 15) errors.push("Lead-slot summary must preserve 15-lead limit.");
  if (slotSummary.latestSource !== requiredSource) errors.push("Latest lead-slot source must remain whatsapp_click_to_chat_inbound.");

  const requestedSlotNumber = Number(input.slotNumber || 0);
  if (!Number.isInteger(requestedSlotNumber) || requestedSlotNumber < 1 || requestedSlotNumber > 15) {
    errors.push("slotNumber must be an integer from 1 to 15.");
  }

  const slot = slots.find(item => Number(item.slotNumber) === requestedSlotNumber && item.slotStatus === "ACCEPTED_PENDING_MANUAL_REVIEW");
  if (!slot) errors.push("Matching ACCEPTED_PENDING_MANUAL_REVIEW slot was not found.");

  if (slot && slot.source !== requiredSource) errors.push("Selected slot source must be whatsapp_click_to_chat_inbound.");
  if (slot && slot.buyerContacted === true) errors.push("Selected slot already indicates buyer contact, which is not allowed at manual review gate.");
  if (slot && slot.quotePrepared === true) errors.push("Selected slot already indicates quote preparation, which is not allowed at manual review gate.");

  if (reviews.some(review => review.slotNumber === requestedSlotNumber && review.reviewStatus === "MANUAL_LEAD_REVIEW_COMPLETED")) {
    errors.push("This slot already has a completed manual lead review.");
  }

  const decision = normalizeDecision(input.reviewDecision);
  if (!decision) errors.push("reviewDecision must be ACCEPT_FOR_MANUAL_STOCK_CHECK or REJECT_AS_NOT_READY.");

  if (input.adminReviewedLeadSlot !== true) errors.push("adminReviewedLeadSlot must be true.");
  if (input.adminConfirmedBuyerInitiatedInbound !== true) errors.push("adminConfirmedBuyerInitiatedInbound must be true.");
  if (input.adminConfirmedSourceAllowed !== true) errors.push("adminConfirmedSourceAllowed must be true.");
  if (input.adminConfirmedNoBuyerContactYet !== true) errors.push("adminConfirmedNoBuyerContactYet must be true.");
  if (input.adminConfirmedNoAutoSend !== true) errors.push("adminConfirmedNoAutoSend must be true.");
  if (input.adminConfirmedNoWhatsAppRead !== true) errors.push("adminConfirmedNoWhatsAppRead must be true.");
  if (input.adminConfirmedNoPrivateScraping !== true) errors.push("adminConfirmedNoPrivateScraping must be true.");
  if (input.adminConfirmedNoHiddenHarvesting !== true) errors.push("adminConfirmedNoHiddenHarvesting must be true.");
  if (input.adminConfirmedNoQuotePrepared !== true) errors.push("adminConfirmedNoQuotePrepared must be true.");
  if (input.adminConfirmedNoQuoteBeforeStock !== true) errors.push("adminConfirmedNoQuoteBeforeStock must be true.");
  if (input.adminConfirmedNoQuoteBeforeCompatibility !== true) errors.push("adminConfirmedNoQuoteBeforeCompatibility must be true.");
  if (input.adminConfirmedManualStockCheckRequiredNext !== true) errors.push("adminConfirmedManualStockCheckRequiredNext must be true.");
  if (input.adminConfirmedManualCompatibilityCheckRequiredLater !== true) errors.push("adminConfirmedManualCompatibilityCheckRequiredLater must be true.");
  if (cleanText(input.reviewPhrase) !== requiredReviewPhrase) errors.push(`reviewPhrase must be exactly ${requiredReviewPhrase}.`);

  return { errors, slotSummary, slot, decision };
}

function createManualLeadReview(input = {}) {
  const validation = validateReview(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();
  const slot = validation.slot || {};

  const review = {
    id: dataStore.createId("controlled_buyer_gate_manual_lead_review"),
    reviewStatus: "MANUAL_LEAD_REVIEW_COMPLETED",
    reviewType: "CONTROLLED_INBOUND_LEAD_MANUAL_REVIEW_ONLY",
    reviewDecision: validation.decision,
    reviewPhrase: requiredReviewPhrase,

    manualLeadReviewGateOnly: true,
    leadReviewRecordOnly: true,
    controlledLeadReviewOnly: true,
    inboundLeadReviewOnly: true,
    acceptedForManualStockCheckOnly: validation.decision === "ACCEPT_FOR_MANUAL_STOCK_CHECK",
    rejectedAsNotReadyOnly: validation.decision === "REJECT_AS_NOT_READY",

    slotId: slot.id || "",
    slotNumber: slot.slotNumber,
    leadLimit: 15,
    source: requiredSource,
    leadReference: cleanText(slot.leadReference || input.leadReference || ""),
    partNeeded: cleanText(slot.partNeeded || input.partNeeded || ""),
    vehicleDetail: cleanText(slot.vehicleDetail || input.vehicleDetail || ""),
    buyerLocation: cleanText(slot.buyerLocation || input.buyerLocation || ""),
    buyerIntentProof: cleanText(slot.buyerIntentProof || input.buyerIntentProof || ""),

    slotSummary: validation.slotSummary,

    inboundBuyerInitiated: true,
    adminReviewedLeadSlot: true,
    adminConfirmedBuyerInitiatedInbound: true,
    adminConfirmedSourceAllowed: true,

    manualReviewCompleted: true,
    manualReviewRequiredBeforeAnyBuyerContact: true,
    manualReplyOnly: true,

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

    manualStockCheckRequiredNext: true,
    manualCompatibilityCheckRequiredLater: true,
    stockConfirmationRequiredBeforeQuote: true,
    compatibilityConfirmationRequiredBeforeQuote: true,

    autoUpdateInventory: false,
    autoCreateAccountingEntry: false,
    autoCloseSale: false,
    autoMovePipelineStage: false,

    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    noPrivateDataScraping: true,
    noHiddenDataHarvesting: true,

    adminConfirmedNoBuyerContactYet: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuotePrepared: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true,
    adminConfirmedManualStockCheckRequiredNext: true,
    adminConfirmedManualCompatibilityCheckRequiredLater: true,

    reviewedBy: cleanText(input.reviewedBy || "admin_manual"),
    reviewNote: cleanText(input.reviewNote || "Manual lead review completed. No buyer contact made."),
    createdAt: now,
    updatedAt: now
  };

  const reviews = listManualLeadReviews();
  reviews.unshift(review);
  writeJsonArray(reviewsPath, reviews);

  return {
    ok: true,
    statusCode: 201,
    review
  };
}

function getManualLeadReviewSummary() {
  const reviews = listManualLeadReviews();
  const completed = reviews.filter(review => review.reviewStatus === "MANUAL_LEAD_REVIEW_COMPLETED");
  const accepted = reviews.filter(review => review.reviewDecision === "ACCEPT_FOR_MANUAL_STOCK_CHECK");
  const rejected = reviews.filter(review => review.reviewDecision === "REJECT_AS_NOT_READY");
  const latest = reviews[0] || null;

  return {
    totalReviews: reviews.length,
    completedReviewCount: completed.length,
    acceptedForManualStockCheckCount: accepted.length,
    rejectedAsNotReadyCount: rejected.length,
    latestReviewStatus: latest ? latest.reviewStatus : "NO_REVIEW",
    latestReviewDecision: latest ? latest.reviewDecision : "",
    latestSlotNumber: latest ? latest.slotNumber : 0,
    latestSource: latest ? latest.source : "",
    safety: {
      manualLeadReviewGateOnly: true,
      leadReviewRecordOnly: true,
      controlledLeadReviewOnly: true,
      inboundLeadReviewOnly: true,
      manualReviewCompletedOnly: true,
      acceptedForManualStockCheckOnly: true,
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
      noInventoryUpdate: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true,
      manualStockCheckRequiredNext: true,
      manualCompatibilityCheckRequiredLater: true,
      manualReviewRequiredBeforeAnyBuyerContact: true
    }
  };
}

function getManualLeadReviewPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Manual Lead Review Gate Foundation is active.",
    purpose: "Record manual review decisions for accepted inbound lead slots before any buyer contact.",
    requiredReviewPhrase,
    allowedDecisions: [
      "ACCEPT_FOR_MANUAL_STOCK_CHECK",
      "REJECT_AS_NOT_READY"
    ],
    rules: [
      "Manual lead review record only.",
      "No buyer contact from this gate.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No buyer message scraping.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote is prepared at this gate.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "Manual stock check is required next.",
      "Manual compatibility check is required later.",
      "No inventory update.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement."
    ]
  };
}

module.exports = {
  createManualLeadReview,
  listManualLeadReviews,
  getManualLeadReviewSummary,
  getManualLeadReviewPreview
};

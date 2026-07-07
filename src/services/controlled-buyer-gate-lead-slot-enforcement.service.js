const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");
const activationExecutionService = require("./controlled-buyer-gate-activation-execution.service");

const slotsPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-lead-slots.json");

const requiredSlotPhrase = "I_CONFIRM_INBOUND_LEAD_SLOT_ONLY_NO_AUTO_CONTACT";
const leadLimit = 15;
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

function listLeadSlots() {
  return readJsonArray(slotsPath);
}

function getAcceptedSlots() {
  return listLeadSlots().filter(slot => slot.slotStatus === "ACCEPTED_PENDING_MANUAL_REVIEW");
}

function getActivationSummary() {
  try {
    return activationExecutionService.getActivationExecutionSummary();
  } catch (error) {
    return {
      totalExecutions: 0,
      latestActivationStatus: "ERROR",
      latestLeadLimit: 0,
      latestTestSource: "",
      activeManualInboundGateCount: 0,
      error: error.message,
      safety: {}
    };
  }
}

function unsafe(input) {
  return input.autoContactBuyer === true ||
    input.contactRealBuyerAutomatically === true ||
    input.contactBuyerAutomatically === true ||
    input.realBuyerContacted === true ||
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
    input.autoCreateQuoteAndSend === true ||
    input.quoteBeforeStockConfirmation === true ||
    input.quoteBeforeCompatibilityConfirmation === true ||
    input.autoUpdateInventory === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true;
}

function validateLeadSlot(input) {
  const errors = [];
  const activationSummary = getActivationSummary();
  const acceptedSlots = getAcceptedSlots();

  if (unsafe(input)) {
    errors.push("Unsafe lead-slot request blocked. Lead-slot enforcement accepts inbound buyer-initiated slot records only and must not contact buyers, start outbound traffic, send/read WhatsApp, scrape, quote before stock/compatibility, update inventory, create accounting entries, close sales, or move pipeline.");
  }

  if (activationSummary.totalExecutions < 1) errors.push("Controlled Buyer-Gate Activation Execution must exist first.");
  if (activationSummary.latestActivationStatus !== "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY") errors.push("Latest activation status must be CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY.");
  if (Number(activationSummary.latestLeadLimit || 0) !== leadLimit) errors.push("Latest activation must preserve the 15-lead limit.");
  if (activationSummary.latestTestSource !== requiredSource) errors.push("Latest activation source must remain whatsapp_click_to_chat_inbound.");
  if (Number(activationSummary.activeManualInboundGateCount || 0) !== 1) errors.push("Exactly one controlled manual inbound gate must be active.");
  if (acceptedSlots.length >= leadLimit) errors.push("15-lead slot limit reached. No additional controlled inbound lead slot can be accepted.");

  if (cleanText(input.source) !== requiredSource) errors.push("source must be whatsapp_click_to_chat_inbound.");
  if (input.inboundBuyerInitiated !== true) errors.push("inboundBuyerInitiated must be true.");
  if (input.adminReviewedInboundSource !== true) errors.push("adminReviewedInboundSource must be true.");
  if (input.manualReviewRequired !== true) errors.push("manualReviewRequired must be true.");
  if (input.manualReplyOnly !== true) errors.push("manualReplyOnly must be true.");
  if (input.noAutoSend !== true) errors.push("noAutoSend must be true.");
  if (input.noSpam !== true) errors.push("noSpam must be true.");
  if (input.noUnsolicitedWhatsApp !== true) errors.push("noUnsolicitedWhatsApp must be true.");
  if (input.noPrivateDataScraping !== true) errors.push("noPrivateDataScraping must be true.");
  if (input.noHiddenDataHarvesting !== true) errors.push("noHiddenDataHarvesting must be true.");
  if (input.noQuoteBeforeStockConfirmation !== true) errors.push("noQuoteBeforeStockConfirmation must be true.");
  if (input.noQuoteBeforeCompatibilityConfirmation !== true) errors.push("noQuoteBeforeCompatibilityConfirmation must be true.");
  if (input.stockConfirmationRequiredBeforeQuote !== true) errors.push("stockConfirmationRequiredBeforeQuote must be true.");
  if (input.compatibilityConfirmationRequiredBeforeQuote !== true) errors.push("compatibilityConfirmationRequiredBeforeQuote must be true.");
  if (cleanText(input.leadSlotPhrase) !== requiredSlotPhrase) errors.push(`leadSlotPhrase must be exactly ${requiredSlotPhrase}.`);

  return { errors, activationSummary, acceptedSlots };
}

function createLeadSlot(input = {}) {
  const validation = validateLeadSlot(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();
  const nextSlotNumber = validation.acceptedSlots.length + 1;
  const remainingAfter = leadLimit - nextSlotNumber;

  const slot = {
    id: dataStore.createId("controlled_buyer_gate_lead_slot"),
    slotStatus: "ACCEPTED_PENDING_MANUAL_REVIEW",
    slotType: "CONTROLLED_INBOUND_LEAD_SLOT_ONLY",
    leadSlotPhrase: requiredSlotPhrase,

    leadSlotEnforcementOnly: true,
    controlledLeadSlotOnly: true,
    inboundLeadSlotOnly: true,
    buyerInitiatedInboundOnly: true,
    acceptedForManualReviewOnly: true,

    slotNumber: nextSlotNumber,
    leadLimit,
    acceptedLeadCountAfter: nextSlotNumber,
    remainingLeadSlotsAfter: remainingAfter,
    source: requiredSource,

    leadReference: cleanText(input.leadReference || `controlled-inbound-lead-${nextSlotNumber}`),
    partNeeded: cleanText(input.partNeeded || ""),
    vehicleDetail: cleanText(input.vehicleDetail || ""),
    buyerLocation: cleanText(input.buyerLocation || ""),
    buyerIntentProof: cleanText(input.buyerIntentProof || "Buyer initiated WhatsApp click-to-chat inbound request."),

    inboundBuyerInitiated: true,
    adminReviewedInboundSource: true,
    manualReviewRequired: true,
    manualReviewCompleted: false,
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
    quoteBeforeStockConfirmation: false,
    quoteBeforeCompatibilityConfirmation: false,
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

    requiresManualReviewBeforeAnyBuyerContact: true,
    requiresManualStockConfirmation: true,
    requiresManualCompatibilityConfirmation: true,
    requiresManualReplyOnly: true,
    requiresNextPhaseDashboard: true,

    createdBy: cleanText(input.createdBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const slots = listLeadSlots();
  slots.unshift(slot);
  writeJsonArray(slotsPath, slots);

  return {
    ok: true,
    statusCode: 201,
    slot
  };
}

function getLeadSlotSummary() {
  const slots = listLeadSlots();
  const accepted = slots.filter(slot => slot.slotStatus === "ACCEPTED_PENDING_MANUAL_REVIEW");
  const rejectedOrBlocked = slots.filter(slot => slot.slotStatus === "REJECTED" || slot.slotStatus === "BLOCKED");
  const remaining = Math.max(leadLimit - accepted.length, 0);

  return {
    totalSlots: slots.length,
    acceptedSlotCount: accepted.length,
    rejectedOrBlockedCount: rejectedOrBlocked.length,
    leadLimit,
    remainingLeadSlots: remaining,
    limitReached: accepted.length >= leadLimit,
    latestSlotStatus: slots[0] ? slots[0].slotStatus : "NO_SLOT",
    latestSlotNumber: slots[0] ? slots[0].slotNumber : 0,
    latestSource: slots[0] ? slots[0].source : "",
    safety: {
      leadSlotEnforcementOnly: true,
      controlledLeadSlotOnly: true,
      inboundLeadSlotOnly: true,
      buyerInitiatedInboundOnly: true,
      acceptedForManualReviewOnly: true,
      leadLimit,
      acceptedSlotCount: accepted.length,
      remainingLeadSlots: remaining,
      limitReached: accepted.length >= leadLimit,
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
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      noInventoryUpdate: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true,
      manualReviewRequiredBeforeAnyBuyerContact: true,
      manualStockConfirmationRequiredBeforeQuote: true,
      manualCompatibilityConfirmationRequiredBeforeQuote: true
    }
  };
}

function getLeadSlotPreview() {
  return {
    status: "ok",
    message: "Controlled Buyer-Gate Lead-Slot Enforcement Foundation is active.",
    purpose: "Accept and count controlled buyer-initiated inbound lead slots up to the 15-lead limit without contacting buyers or starting outbound traffic.",
    requiredSlotPhrase,
    rules: [
      "Only WhatsApp click-to-chat inbound source is accepted.",
      "Only buyer-initiated inbound lead slots are accepted.",
      "15-lead limit is enforced.",
      "The 16th lead slot is blocked.",
      "Manual review is required before any buyer contact.",
      "Manual reply only.",
      "No outbound traffic is started automatically.",
      "No paid ads are started automatically.",
      "No lead form is published automatically.",
      "No real buyer is contacted automatically.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No buyer message scraping.",
      "No private-data scraping.",
      "No hidden data harvesting.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "No inventory update.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement."
    ]
  };
}

module.exports = {
  createLeadSlot,
  listLeadSlots,
  getLeadSlotSummary,
  getLeadSlotPreview
};

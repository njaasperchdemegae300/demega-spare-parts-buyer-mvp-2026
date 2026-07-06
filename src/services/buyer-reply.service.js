const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const sentConfirmationsPath = path.join(process.cwd(), "src", "data", "manual-quote-sent-confirmations.json");
const buyerRepliesPath = path.join(process.cwd(), "src", "data", "buyer-replies.json");

const allowedReplyChannels = [
  "whatsapp_manual_observed",
  "phone_call_manual_observed",
  "sms_manual_observed",
  "email_manual_observed",
  "in_person_manual_observed"
];

const allowedReplyTypes = [
  "interested",
  "negotiating",
  "accepted_price",
  "rejected_price",
  "requested_discount",
  "asked_question",
  "requested_delivery",
  "needs_more_photos",
  "not_ready",
  "wrong_part",
  "closed_lost",
  "closed_won"
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

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readSentConfirmations() {
  return readJsonArray(sentConfirmationsPath);
}

function readBuyerReplies() {
  return readJsonArray(buyerRepliesPath);
}

function writeBuyerReplies(records) {
  writeJsonArray(buyerRepliesPath, records);
}

function findSentConfirmation(sentConfirmationId) {
  return readSentConfirmations().find(item => item.id === sentConfirmationId);
}

function isUnsafeAutomationRequest(input) {
  return input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.sendBuyerMessage === true ||
    input.autoReplyToBuyer === true ||
    input.automaticBuyerMessage === true ||
    input.autoOpenBrowser === true ||
    input.openWhatsappAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.movePipelineAutomatically === true ||
    input.markSaleWonAutomatically === true ||
    input.markLeadClosedAutomatically === true;
}

function validateBuyerReplyRequest(input) {
  const errors = [];
  const sentConfirmationId = cleanText(input.sentConfirmationId);
  const replyChannel = cleanText(input.replyChannel || "").toLowerCase();
  const replyType = cleanText(input.replyType || "").toLowerCase();
  const replyText = cleanText(input.replyText || input.replySummary || "");

  if (!sentConfirmationId) errors.push("sentConfirmationId is required.");

  const sentConfirmation = sentConfirmationId ? findSentConfirmation(sentConfirmationId) : null;

  if (sentConfirmationId && !sentConfirmation) {
    errors.push("Manual quote sent confirmation not found.");
  }

  if (sentConfirmation && sentConfirmation.adminManualSentConfirmed !== true) {
    errors.push("Admin manual sent confirmation is required before buyer reply tracking.");
  }

  if (sentConfirmation && sentConfirmation.manualReviewCompleted !== true) {
    errors.push("Manual review completed is required before buyer reply tracking.");
  }

  if (sentConfirmation && (sentConfirmation.systemSentToBuyer === true || sentConfirmation.sentToBuyerBySystem === true)) {
    errors.push("System-sent records cannot be used for buyer reply tracking.");
  }

  if (!replyChannel) {
    errors.push("replyChannel is required.");
  } else if (!allowedReplyChannels.includes(replyChannel)) {
    errors.push(`replyChannel must be one of: ${allowedReplyChannels.join(", ")}.`);
  }

  if (!replyType) {
    errors.push("replyType is required.");
  } else if (!allowedReplyTypes.includes(replyType)) {
    errors.push(`replyType must be one of: ${allowedReplyTypes.join(", ")}.`);
  }

  if (!replyText) {
    errors.push("replyText or replySummary is required.");
  }

  if (replyText.length > 1000) {
    errors.push("replyText is too long.");
  }

  if (cleanText(input.nextAction).length > 300) {
    errors.push("nextAction is too long.");
  }

  if (input.adminObservedReply !== true && input.manualReplyObserved !== true) {
    errors.push("adminObservedReply must be true because this gate records only replies manually observed by admin.");
  }

  if (isUnsafeAutomationRequest(input)) {
    errors.push("Automatic reading, scraping, auto-reply, auto-send, browser opening, harvesting, or pipeline movement is blocked.");
  }

  return errors;
}

function determineBuyerTemperature(replyType) {
  if (["accepted_price", "closed_won", "requested_delivery"].includes(replyType)) return "hot";
  if (["interested", "negotiating", "requested_discount", "asked_question", "needs_more_photos"].includes(replyType)) return "warm";
  return "cold";
}

function recordBuyerReply(input) {
  const errors = validateBuyerReplyRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Manual quote sent confirmation not found.") ? 404 : 400,
      errors
    };
  }

  const sentConfirmation = findSentConfirmation(cleanText(input.sentConfirmationId));
  const replyChannel = cleanText(input.replyChannel).toLowerCase();
  const replyType = cleanText(input.replyType).toLowerCase();
  const replyText = cleanText(input.replyText || input.replySummary);
  const now = new Date().toISOString();

  const record = {
    id: dataStore.createId("buyer_reply"),
    sentConfirmationId: sentConfirmation.id,
    copyActionId: sentConfirmation.copyActionId,
    draftId: sentConfirmation.draftId,
    leadId: sentConfirmation.leadId,
    buyerName: cleanText(sentConfirmation.buyerName),
    buyerPhone: cleanText(sentConfirmation.buyerPhone),
    partNeeded: cleanText(sentConfirmation.partNeeded),
    vehicleBrand: cleanText(sentConfirmation.vehicleBrand),
    vehicleModel: cleanText(sentConfirmation.vehicleModel),
    vehicleYear: cleanText(sentConfirmation.vehicleYear),
    engineCode: cleanText(sentConfirmation.engineCode),
    quoteAmount: sentConfirmation.quoteAmount,
    currency: cleanText(sentConfirmation.currency),
    formattedQuoteAmount: cleanText(sentConfirmation.formattedQuoteAmount),
    replyChannel,
    replyType,
    replyText,
    buyerTemperatureAfterReply: determineBuyerTemperature(replyType),
    nextAction: cleanText(input.nextAction || "Manual admin review required before next action."),
    adminObservedReply: true,
    manualReplyObserved: true,
    manualEntryOnly: true,
    buyerReplyTrackingOnly: true,
    replyReadBySystem: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    autoReplyToBuyer: false,
    autoSendWhatsApp: false,
    automaticBuyerMessage: false,
    autoOpenBrowser: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    markSaleWonAutomatically: false,
    markLeadClosedAutomatically: false,
    manualReviewRequiredForNextStep: true,
    observedBy: cleanText(input.observedBy || "admin_manual"),
    observedAt: cleanText(input.observedAt) || now,
    createdAt: now,
    updatedAt: now
  };

  const replies = readBuyerReplies();
  replies.unshift(record);
  writeBuyerReplies(replies);

  return {
    ok: true,
    statusCode: 201,
    reply: record
  };
}

function listBuyerReplies() {
  return readBuyerReplies();
}

function getBuyerReplySummary() {
  const replies = listBuyerReplies();

  return {
    totalBuyerReplies: replies.length,
    manualEntryOnlyCount: replies.filter(item => item.manualEntryOnly === true).length,
    adminObservedReplyCount: replies.filter(item => item.adminObservedReply === true || item.manualReplyObserved === true).length,
    hotReplyCount: replies.filter(item => item.buyerTemperatureAfterReply === "hot").length,
    warmReplyCount: replies.filter(item => item.buyerTemperatureAfterReply === "warm").length,
    coldReplyCount: replies.filter(item => item.buyerTemperatureAfterReply === "cold").length,
    acceptedPriceCount: replies.filter(item => item.replyType === "accepted_price").length,
    negotiatingCount: replies.filter(item => item.replyType === "negotiating").length,
    requestedDiscountCount: replies.filter(item => item.replyType === "requested_discount").length,
    replyReadBySystemCount: replies.filter(item => item.replyReadBySystem === true || item.readBuyerMessagesAutomatically === true).length,
    autoReadWhatsAppCount: replies.filter(item => item.autoReadWhatsApp === true).length,
    scrapingCount: replies.filter(item => item.scrapeWhatsappMessages === true || item.privateMessageScraping === true || item.hiddenDataHarvesting === true).length,
    autoReplyToBuyerCount: replies.filter(item => item.autoReplyToBuyer === true || item.automaticBuyerMessage === true).length,
    autoSendWhatsAppCount: replies.filter(item => item.autoSendWhatsApp === true).length,
    autoOpenBrowserCount: replies.filter(item => item.autoOpenBrowser === true).length,
    autoPipelineMoveCount: replies.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true).length,
    safety: {
      buyerReplyTrackingOnly: true,
      manualEntryOnly: true,
      requiresManualSentConfirmation: true,
      adminObservedReplyRequired: true,
      systemDoesNotReadBuyerMessages: true,
      autoReadWhatsApp: false,
      scrapeWhatsappMessages: false,
      privateMessageScraping: false,
      hiddenDataHarvesting: false,
      autoReplyToBuyer: false,
      autoSendWhatsApp: false,
      automaticBuyerMessage: false,
      autoOpenBrowser: false,
      autoMovePipelineStage: false,
      manualReviewRequiredForNextStep: true
    }
  };
}

module.exports = {
  recordBuyerReply,
  listBuyerReplies,
  getBuyerReplySummary
};

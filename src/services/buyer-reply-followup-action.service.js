const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const buyerRepliesPath = path.join(process.cwd(), "src", "data", "buyer-replies.json");
const followupActionsPath = path.join(process.cwd(), "src", "data", "buyer-reply-followup-actions.json");

const allowedActionTypes = [
  "confirm_pickup_manual",
  "confirm_delivery_manual",
  "call_buyer_manual",
  "answer_question_manual",
  "send_more_photos_manual",
  "negotiate_price_manual",
  "request_payment_confirmation_manual",
  "reserve_stock_manual",
  "close_won_manual_review",
  "close_lost_manual_review",
  "schedule_followup_manual"
];

const allowedPriorities = ["low", "medium", "high", "urgent"];
const allowedDueWindows = ["now", "today", "tomorrow", "three_days", "seven_days", "custom_manual"];

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

function readBuyerReplies() {
  return readJsonArray(buyerRepliesPath);
}

function readFollowupActions() {
  return readJsonArray(followupActionsPath);
}

function writeFollowupActions(records) {
  writeJsonArray(followupActionsPath, records);
}

function findBuyerReply(buyerReplyId) {
  return readBuyerReplies().find(reply => reply.id === buyerReplyId);
}

function isUnsafeAutomationRequest(input) {
  return input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.sendBuyerMessage === true ||
    input.autoReplyToBuyer === true ||
    input.automaticBuyerMessage === true ||
    input.autoOpenBrowser === true ||
    input.openWhatsappAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.movePipelineAutomatically === true ||
    input.pipelineMovedAutomatically === true ||
    input.autoCreatePipelineEvent === true ||
    input.autoCompleteBuyerAction === true ||
    input.markSaleWonAutomatically === true ||
    input.markSaleLostAutomatically === true ||
    input.markLeadClosedAutomatically === true ||
    input.closeBuyerAutomatically === true ||
    input.collectPaymentAutomatically === true ||
    input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true;
}

function validateFollowupActionRequest(input) {
  const errors = [];
  const buyerReplyId = cleanText(input.buyerReplyId);
  const actionType = cleanText(input.actionType || "").toLowerCase();
  const priority = cleanText(input.priority || "medium").toLowerCase();
  const dueWindow = cleanText(input.dueWindow || "today").toLowerCase();
  const actionInstruction = cleanText(input.actionInstruction || input.nextManualAction || "");

  if (!buyerReplyId) errors.push("buyerReplyId is required.");

  const buyerReply = buyerReplyId ? findBuyerReply(buyerReplyId) : null;

  if (buyerReplyId && !buyerReply) {
    errors.push("Buyer reply not found.");
  }

  if (buyerReply && buyerReply.manualEntryOnly !== true) {
    errors.push("Buyer reply must be manual-entry only before follow-up action planning.");
  }

  if (buyerReply && buyerReply.adminObservedReply !== true) {
    errors.push("Admin observed reply is required before follow-up action planning.");
  }

  if (buyerReply && buyerReply.buyerReplyTrackingOnly !== true) {
    errors.push("Buyer reply tracking record must be safe before follow-up action planning.");
  }

  if (buyerReply && (
    buyerReply.replyReadBySystem === true ||
    buyerReply.autoReadWhatsApp === true ||
    buyerReply.scrapeWhatsappMessages === true ||
    buyerReply.privateMessageScraping === true ||
    buyerReply.hiddenDataHarvesting === true ||
    buyerReply.autoReplyToBuyer === true ||
    buyerReply.autoSendWhatsApp === true ||
    buyerReply.autoMovePipelineStage === true ||
    buyerReply.pipelineMovedAutomatically === true
  )) {
    errors.push("Unsafe buyer reply record cannot be used for follow-up action planning.");
  }

  if (!actionType) {
    errors.push("actionType is required.");
  } else if (!allowedActionTypes.includes(actionType)) {
    errors.push(`actionType must be one of: ${allowedActionTypes.join(", ")}.`);
  }

  if (!allowedPriorities.includes(priority)) {
    errors.push(`priority must be one of: ${allowedPriorities.join(", ")}.`);
  }

  if (!allowedDueWindows.includes(dueWindow)) {
    errors.push(`dueWindow must be one of: ${allowedDueWindows.join(", ")}.`);
  }

  if (!actionInstruction) {
    errors.push("actionInstruction or nextManualAction is required.");
  }

  if (actionInstruction.length > 700) {
    errors.push("actionInstruction is too long.");
  }

  if (input.adminReviewedBuyerReply !== true) {
    errors.push("adminReviewedBuyerReply must be true before planning follow-up action.");
  }

  if (input.manualActionApproved !== true) {
    errors.push("manualActionApproved must be true before planning follow-up action.");
  }

  if (isUnsafeAutomationRequest(input)) {
    errors.push("Automatic sending, auto-reply, browser opening, message reading, scraping, harvesting, pipeline movement, closing, or payment collection is blocked.");
  }

  return errors;
}

function planBuyerReplyFollowupAction(input) {
  const errors = validateFollowupActionRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Buyer reply not found.") ? 404 : 400,
      errors
    };
  }

  const buyerReply = findBuyerReply(cleanText(input.buyerReplyId));
  const now = new Date().toISOString();
  const actionType = cleanText(input.actionType).toLowerCase();
  const priority = cleanText(input.priority || "medium").toLowerCase();
  const dueWindow = cleanText(input.dueWindow || "today").toLowerCase();

  const record = {
    id: dataStore.createId("buyer_reply_followup_action"),
    buyerReplyId: buyerReply.id,
    sentConfirmationId: buyerReply.sentConfirmationId,
    copyActionId: buyerReply.copyActionId,
    draftId: buyerReply.draftId,
    leadId: buyerReply.leadId,
    buyerName: cleanText(buyerReply.buyerName),
    buyerPhone: cleanText(buyerReply.buyerPhone),
    partNeeded: cleanText(buyerReply.partNeeded),
    vehicleBrand: cleanText(buyerReply.vehicleBrand),
    vehicleModel: cleanText(buyerReply.vehicleModel),
    vehicleYear: cleanText(buyerReply.vehicleYear),
    engineCode: cleanText(buyerReply.engineCode),
    quoteAmount: buyerReply.quoteAmount,
    currency: cleanText(buyerReply.currency),
    formattedQuoteAmount: cleanText(buyerReply.formattedQuoteAmount),
    replyType: cleanText(buyerReply.replyType),
    replyChannel: cleanText(buyerReply.replyChannel),
    buyerTemperatureAfterReply: cleanText(buyerReply.buyerTemperatureAfterReply),
    replyTextSnapshot: cleanText(buyerReply.replyText),
    actionType,
    priority,
    dueWindow,
    dueAtManual: cleanText(input.dueAtManual || ""),
    actionInstruction: cleanText(input.actionInstruction || input.nextManualAction),
    assignedTo: cleanText(input.assignedTo || "admin_manual"),
    adminReviewedBuyerReply: true,
    manualActionApproved: true,
    manualActionOnly: true,
    followupActionGateOnly: true,
    actionPreparedOnly: true,
    actionExecutedBySystem: false,
    actionCompletedBySystem: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
    automaticBuyerMessage: false,
    autoReplyToBuyer: false,
    autoOpenBrowser: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    autoCreatePipelineEvent: false,
    autoCompleteBuyerAction: false,
    markSaleWonAutomatically: false,
    markSaleLostAutomatically: false,
    markLeadClosedAutomatically: false,
    closeBuyerAutomatically: false,
    collectPaymentAutomatically: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    manualReviewRequiredBeforeExecution: true,
    manualReviewRequiredForNextStep: true,
    createdBy: cleanText(input.createdBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const records = readFollowupActions();
  records.unshift(record);
  writeFollowupActions(records);

  return {
    ok: true,
    statusCode: 201,
    followupAction: record
  };
}

function listBuyerReplyFollowupActions() {
  return readFollowupActions();
}

function getBuyerReplyFollowupActionSummary() {
  const actions = listBuyerReplyFollowupActions();

  return {
    totalBuyerReplyFollowupActions: actions.length,
    manualActionOnlyCount: actions.filter(item => item.manualActionOnly === true).length,
    actionPreparedOnlyCount: actions.filter(item => item.actionPreparedOnly === true).length,
    urgentActionCount: actions.filter(item => item.priority === "urgent").length,
    highActionCount: actions.filter(item => item.priority === "high").length,
    hotBuyerActionCount: actions.filter(item => item.buyerTemperatureAfterReply === "hot").length,
    confirmPickupCount: actions.filter(item => item.actionType === "confirm_pickup_manual").length,
    confirmDeliveryCount: actions.filter(item => item.actionType === "confirm_delivery_manual").length,
    callBuyerCount: actions.filter(item => item.actionType === "call_buyer_manual").length,
    actionExecutedBySystemCount: actions.filter(item => item.actionExecutedBySystem === true || item.actionCompletedBySystem === true).length,
    autoSendWhatsAppCount: actions.filter(item => item.autoSendWhatsApp === true || item.sendWhatsApp === true).length,
    autoReplyToBuyerCount: actions.filter(item => item.autoReplyToBuyer === true || item.automaticBuyerMessage === true).length,
    autoOpenBrowserCount: actions.filter(item => item.autoOpenBrowser === true).length,
    autoPipelineMoveCount: actions.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true || item.autoCreatePipelineEvent === true).length,
    autoCloseCount: actions.filter(item => item.markSaleWonAutomatically === true || item.markSaleLostAutomatically === true || item.markLeadClosedAutomatically === true || item.closeBuyerAutomatically === true).length,
    scrapingCount: actions.filter(item => item.scrapeWhatsappMessages === true || item.privateMessageScraping === true || item.hiddenDataHarvesting === true).length,
    autoReadWhatsAppCount: actions.filter(item => item.autoReadWhatsApp === true || item.readBuyerMessagesAutomatically === true).length,
    safety: {
      buyerReplyFollowupActionGateOnly: true,
      manualActionOnly: true,
      actionPreparedOnly: true,
      requiresBuyerReply: true,
      requiresAdminReviewedBuyerReply: true,
      requiresManualActionApproval: true,
      systemDoesNotExecuteAction: true,
      systemDoesNotSendWhatsApp: true,
      systemDoesNotAutoReply: true,
      systemDoesNotOpenBrowser: true,
      systemDoesNotMovePipeline: true,
      systemDoesNotCloseSale: true,
      systemDoesNotReadBuyerMessages: true,
      scrapeWhatsappMessages: false,
      privateMessageScraping: false,
      hiddenDataHarvesting: false,
      autoSendWhatsApp: false,
      autoReplyToBuyer: false,
      autoOpenBrowser: false,
      autoMovePipelineStage: false,
      manualReviewRequiredBeforeExecution: true,
      manualReviewRequiredForNextStep: true
    }
  };
}

module.exports = {
  planBuyerReplyFollowupAction,
  listBuyerReplyFollowupActions,
  getBuyerReplyFollowupActionSummary
};

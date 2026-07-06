const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const followupActionsPath = path.join(process.cwd(), "src", "data", "buyer-reply-followup-actions.json");
const dealOutcomesPath = path.join(process.cwd(), "src", "data", "manual-deal-outcomes.json");

const allowedOutcomeTypes = [
  "deal_won_manual",
  "deal_lost_manual",
  "pickup_confirmed_manual",
  "delivery_arranged_manual",
  "stock_reserved_manual",
  "payment_pending_manual",
  "buyer_requested_later_manual",
  "no_response_manual",
  "wrong_part_manual",
  "price_rejected_manual",
  "needs_more_followup_manual"
];

const allowedPaymentStatus = [
  "not_applicable",
  "not_paid",
  "pending_manual_confirmation",
  "paid_cash_manual",
  "paid_transfer_manual",
  "deposit_paid_manual"
];

const allowedDeliveryStatus = [
  "not_applicable",
  "pickup_pending_manual",
  "pickup_completed_manual",
  "delivery_pending_manual",
  "delivery_completed_manual"
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

function readFollowupActions() {
  return readJsonArray(followupActionsPath);
}

function readManualDealOutcomes() {
  return readJsonArray(dealOutcomesPath);
}

function writeManualDealOutcomes(records) {
  writeJsonArray(dealOutcomesPath, records);
}

function findFollowupAction(followupActionId) {
  return readFollowupActions().find(action => action.id === followupActionId);
}

function isUnsafeAutomationRequest(input) {
  return input.autoCloseSale === true ||
    input.closeSaleAutomatically === true ||
    input.markSaleWonAutomatically === true ||
    input.markSaleLostAutomatically === true ||
    input.markLeadClosedAutomatically === true ||
    input.closeBuyerAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.movePipelineAutomatically === true ||
    input.pipelineMovedAutomatically === true ||
    input.autoCreatePipelineEvent === true ||
    input.autoCompleteBuyerAction === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.sendBuyerMessage === true ||
    input.autoReplyToBuyer === true ||
    input.automaticBuyerMessage === true ||
    input.autoOpenBrowser === true ||
    input.collectPaymentAutomatically === true ||
    input.verifyPaymentAutomatically === true ||
    input.autoReserveStock === true ||
    input.autoReduceStock === true ||
    input.autoGenerateReceipt === true ||
    input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true;
}

function validateManualDealOutcomeRequest(input) {
  const errors = [];
  const followupActionId = cleanText(input.followupActionId || input.buyerReplyFollowupActionId);
  const outcomeType = cleanText(input.outcomeType || "").toLowerCase();
  const paymentStatus = cleanText(input.paymentStatus || "not_applicable").toLowerCase();
  const deliveryStatus = cleanText(input.deliveryStatus || "not_applicable").toLowerCase();
  const outcomeNote = cleanText(input.outcomeNote || input.dealNote || "");

  if (!followupActionId) errors.push("followupActionId or buyerReplyFollowupActionId is required.");

  const followupAction = followupActionId ? findFollowupAction(followupActionId) : null;

  if (followupActionId && !followupAction) {
    errors.push("Buyer reply follow-up action not found.");
  }

  if (followupAction && followupAction.manualActionOnly !== true) {
    errors.push("Follow-up action must be manual-action-only before deal outcome recording.");
  }

  if (followupAction && followupAction.actionPreparedOnly !== true) {
    errors.push("Follow-up action must be prepared-only before deal outcome recording.");
  }

  if (followupAction && followupAction.adminReviewedBuyerReply !== true) {
    errors.push("Admin reviewed buyer reply is required before deal outcome recording.");
  }

  if (followupAction && followupAction.manualActionApproved !== true) {
    errors.push("Manual action approval is required before deal outcome recording.");
  }

  if (followupAction && (
    followupAction.actionExecutedBySystem === true ||
    followupAction.actionCompletedBySystem === true ||
    followupAction.autoSendWhatsApp === true ||
    followupAction.autoReplyToBuyer === true ||
    followupAction.autoOpenBrowser === true ||
    followupAction.autoMovePipelineStage === true ||
    followupAction.pipelineMovedAutomatically === true ||
    followupAction.markSaleWonAutomatically === true ||
    followupAction.markSaleLostAutomatically === true ||
    followupAction.markLeadClosedAutomatically === true ||
    followupAction.autoReadWhatsApp === true ||
    followupAction.scrapeWhatsappMessages === true ||
    followupAction.privateMessageScraping === true ||
    followupAction.hiddenDataHarvesting === true
  )) {
    errors.push("Unsafe follow-up action cannot be used for manual deal outcome recording.");
  }

  if (!outcomeType) {
    errors.push("outcomeType is required.");
  } else if (!allowedOutcomeTypes.includes(outcomeType)) {
    errors.push(`outcomeType must be one of: ${allowedOutcomeTypes.join(", ")}.`);
  }

  if (!allowedPaymentStatus.includes(paymentStatus)) {
    errors.push(`paymentStatus must be one of: ${allowedPaymentStatus.join(", ")}.`);
  }

  if (!allowedDeliveryStatus.includes(deliveryStatus)) {
    errors.push(`deliveryStatus must be one of: ${allowedDeliveryStatus.join(", ")}.`);
  }

  if (!outcomeNote) {
    errors.push("outcomeNote or dealNote is required.");
  }

  if (outcomeNote.length > 900) {
    errors.push("outcomeNote is too long.");
  }

  if (input.adminCompletedManualAction !== true) {
    errors.push("adminCompletedManualAction must be true because outcome is based on admin manual work outside the system.");
  }

  if (input.manualOutcomeApproved !== true) {
    errors.push("manualOutcomeApproved must be true before recording deal outcome.");
  }

  if (isUnsafeAutomationRequest(input)) {
    errors.push("Automatic closing, pipeline movement, WhatsApp sending, auto-reply, browser opening, payment handling, stock change, message reading, scraping, or hidden harvesting is blocked.");
  }

  return errors;
}

function getOutcomeTemperature(outcomeType) {
  if (["deal_won_manual", "pickup_confirmed_manual", "delivery_arranged_manual", "stock_reserved_manual"].includes(outcomeType)) return "won_or_hot";
  if (["payment_pending_manual", "buyer_requested_later_manual", "needs_more_followup_manual"].includes(outcomeType)) return "followup_needed";
  return "lost_or_cold";
}

function recordManualDealOutcome(input) {
  const errors = validateManualDealOutcomeRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Buyer reply follow-up action not found.") ? 404 : 400,
      errors
    };
  }

  const followupAction = findFollowupAction(cleanText(input.followupActionId || input.buyerReplyFollowupActionId));
  const now = new Date().toISOString();
  const outcomeType = cleanText(input.outcomeType).toLowerCase();
  const paymentStatus = cleanText(input.paymentStatus || "not_applicable").toLowerCase();
  const deliveryStatus = cleanText(input.deliveryStatus || "not_applicable").toLowerCase();

  const record = {
    id: dataStore.createId("manual_deal_outcome"),
    followupActionId: followupAction.id,
    buyerReplyId: followupAction.buyerReplyId,
    sentConfirmationId: followupAction.sentConfirmationId,
    copyActionId: followupAction.copyActionId,
    draftId: followupAction.draftId,
    leadId: followupAction.leadId,
    buyerName: cleanText(followupAction.buyerName),
    buyerPhone: cleanText(followupAction.buyerPhone),
    partNeeded: cleanText(followupAction.partNeeded),
    vehicleBrand: cleanText(followupAction.vehicleBrand),
    vehicleModel: cleanText(followupAction.vehicleModel),
    vehicleYear: cleanText(followupAction.vehicleYear),
    engineCode: cleanText(followupAction.engineCode),
    quoteAmount: followupAction.quoteAmount,
    currency: cleanText(followupAction.currency),
    formattedQuoteAmount: cleanText(followupAction.formattedQuoteAmount),
    previousActionType: cleanText(followupAction.actionType),
    previousActionPriority: cleanText(followupAction.priority),
    buyerTemperatureAfterReply: cleanText(followupAction.buyerTemperatureAfterReply),
    outcomeType,
    outcomeTemperature: getOutcomeTemperature(outcomeType),
    paymentStatus,
    deliveryStatus,
    amountActuallyReceived: Number(input.amountActuallyReceived || 0),
    outcomeNote: cleanText(input.outcomeNote || input.dealNote),
    adminCompletedManualAction: true,
    manualOutcomeApproved: true,
    manualDealOutcomeOnly: true,
    manualOutcomeRecordOnly: true,
    outcomeRecordedByAdmin: true,
    systemClosedSale: false,
    autoCloseSale: false,
    closeSaleAutomatically: false,
    markSaleWonAutomatically: false,
    markSaleLostAutomatically: false,
    markLeadClosedAutomatically: false,
    closeBuyerAutomatically: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    autoCreatePipelineEvent: false,
    autoCompleteBuyerAction: false,
    autoSendWhatsApp: false,
    automaticBuyerMessage: false,
    autoReplyToBuyer: false,
    autoOpenBrowser: false,
    collectPaymentAutomatically: false,
    verifyPaymentAutomatically: false,
    autoReserveStock: false,
    autoReduceStock: false,
    autoGenerateReceipt: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    manualReviewRequiredForAccounting: true,
    manualReviewRequiredForPipelineUpdate: true,
    manualReviewRequiredForStockUpdate: true,
    manualReviewRequiredForNextStep: true,
    recordedBy: cleanText(input.recordedBy || "admin_manual"),
    recordedAt: cleanText(input.recordedAt) || now,
    createdAt: now,
    updatedAt: now
  };

  const records = readManualDealOutcomes();
  records.unshift(record);
  writeManualDealOutcomes(records);

  return {
    ok: true,
    statusCode: 201,
    dealOutcome: record
  };
}

function listManualDealOutcomes() {
  return readManualDealOutcomes();
}

function getManualDealOutcomeSummary() {
  const outcomes = listManualDealOutcomes();

  return {
    totalManualDealOutcomes: outcomes.length,
    manualDealOutcomeOnlyCount: outcomes.filter(item => item.manualDealOutcomeOnly === true).length,
    manualOutcomeRecordOnlyCount: outcomes.filter(item => item.manualOutcomeRecordOnly === true).length,
    dealWonManualCount: outcomes.filter(item => item.outcomeType === "deal_won_manual").length,
    dealLostManualCount: outcomes.filter(item => item.outcomeType === "deal_lost_manual").length,
    pickupConfirmedManualCount: outcomes.filter(item => item.outcomeType === "pickup_confirmed_manual").length,
    paymentPendingManualCount: outcomes.filter(item => item.outcomeType === "payment_pending_manual").length,
    followupNeededCount: outcomes.filter(item => item.outcomeTemperature === "followup_needed").length,
    amountActuallyReceivedTotal: outcomes.reduce((sum, item) => sum + Number(item.amountActuallyReceived || 0), 0),
    systemClosedSaleCount: outcomes.filter(item => item.systemClosedSale === true || item.autoCloseSale === true || item.closeSaleAutomatically === true).length,
    autoPipelineMoveCount: outcomes.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true || item.autoCreatePipelineEvent === true).length,
    autoSendWhatsAppCount: outcomes.filter(item => item.autoSendWhatsApp === true).length,
    autoReplyToBuyerCount: outcomes.filter(item => item.autoReplyToBuyer === true || item.automaticBuyerMessage === true).length,
    autoOpenBrowserCount: outcomes.filter(item => item.autoOpenBrowser === true).length,
    autoPaymentCount: outcomes.filter(item => item.collectPaymentAutomatically === true || item.verifyPaymentAutomatically === true).length,
    autoStockChangeCount: outcomes.filter(item => item.autoReserveStock === true || item.autoReduceStock === true).length,
    scrapingCount: outcomes.filter(item => item.scrapeWhatsappMessages === true || item.privateMessageScraping === true || item.hiddenDataHarvesting === true).length,
    autoReadWhatsAppCount: outcomes.filter(item => item.autoReadWhatsApp === true || item.readBuyerMessagesAutomatically === true).length,
    safety: {
      manualDealOutcomeGateOnly: true,
      manualDealOutcomeOnly: true,
      manualOutcomeRecordOnly: true,
      requiresFollowupAction: true,
      requiresAdminCompletedManualAction: true,
      requiresManualOutcomeApproval: true,
      systemDoesNotCloseSale: true,
      systemDoesNotMovePipeline: true,
      systemDoesNotSendWhatsApp: true,
      systemDoesNotAutoReply: true,
      systemDoesNotOpenBrowser: true,
      systemDoesNotHandlePayment: true,
      systemDoesNotChangeStock: true,
      systemDoesNotReadBuyerMessages: true,
      scrapeWhatsappMessages: false,
      privateMessageScraping: false,
      hiddenDataHarvesting: false,
      autoCloseSale: false,
      autoMovePipelineStage: false,
      autoSendWhatsApp: false,
      autoReplyToBuyer: false,
      autoOpenBrowser: false,
      collectPaymentAutomatically: false,
      verifyPaymentAutomatically: false,
      autoReserveStock: false,
      autoReduceStock: false,
      manualReviewRequiredForAccounting: true,
      manualReviewRequiredForPipelineUpdate: true,
      manualReviewRequiredForStockUpdate: true,
      manualReviewRequiredForNextStep: true
    }
  };
}

module.exports = {
  recordManualDealOutcome,
  listManualDealOutcomes,
  getManualDealOutcomeSummary
};

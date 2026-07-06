const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const manualQuoteCopyActionsPath = path.join(process.cwd(), "src", "data", "manual-quote-copy-actions.json");
const sentConfirmationsPath = path.join(process.cwd(), "src", "data", "manual-quote-sent-confirmations.json");

const allowedManualChannels = [
  "whatsapp_manual",
  "phone_call_manual",
  "sms_manual",
  "email_manual",
  "in_person_manual"
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

function readCopyActions() {
  return readJsonArray(manualQuoteCopyActionsPath);
}

function readSentConfirmations() {
  return readJsonArray(sentConfirmationsPath);
}

function writeSentConfirmations(records) {
  writeJsonArray(sentConfirmationsPath, records);
}

function findCopyAction(copyActionId) {
  return readCopyActions().find(action => action.id === copyActionId);
}

function isBlockedAutomationRequest(input) {
  return input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.sendBuyerMessage === true ||
    input.messageBuyerAutomatically === true ||
    input.autoOpenBrowser === true ||
    input.openWhatsappAutomatically === true ||
    input.movePipelineAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.systemSentToBuyer === true ||
    input.sentToBuyerBySystem === true ||
    input.quoteMarkedSentBySystem === true ||
    input.priceSentBySystem === true ||
    input.serverClipboardAccess === true ||
    input.browserAutoCopy === true ||
    input.copiedToClipboardByBrowser === true;
}

function validateSentConfirmationRequest(input) {
  const errors = [];
  const copyActionId = cleanText(input.copyActionId);
  const sentChannel = cleanText(input.sentChannel || "").toLowerCase();

  if (!copyActionId) errors.push("copyActionId is required.");

  const copyAction = copyActionId ? findCopyAction(copyActionId) : null;

  if (copyActionId && !copyAction) {
    errors.push("Manual quote copy action not found.");
  }

  if (copyAction && copyAction.copyPrepared !== true) {
    errors.push("Copy action must be prepared before sent confirmation.");
  }

  if (copyAction && copyAction.copyTextPreparedOnly !== true) {
    errors.push("Only safe prepared copy text can be confirmed.");
  }

  if (copyAction && copyAction.manualCopyOnly !== true) {
    errors.push("Only manual-copy-only actions can be confirmed.");
  }

  if (copyAction && copyAction.sentToBuyer === true) {
    errors.push("Copy action already has sent-to-buyer risk.");
  }

  if (copyAction && (copyAction.priceSentToBuyer === true || copyAction.quoteAmountSentToBuyer === true)) {
    errors.push("Copy action already has price-sent risk.");
  }

  if (input.adminManualSentConfirmed !== true && input.manualSentConfirmed !== true) {
    errors.push("adminManualSentConfirmed must be true after the admin manually sends the copied quote outside the system.");
  }

  if (input.manualReviewCompleted !== true) {
    errors.push("manualReviewCompleted must be true before sent confirmation.");
  }

  if (!sentChannel) {
    errors.push("sentChannel is required.");
  } else if (!allowedManualChannels.includes(sentChannel)) {
    errors.push(`sentChannel must be one of: ${allowedManualChannels.join(", ")}.`);
  }

  if (isBlockedAutomationRequest(input)) {
    errors.push("System sending, WhatsApp auto-send, browser opening, clipboard automation, or pipeline movement is blocked.");
  }

  if (cleanText(input.note).length > 700) {
    errors.push("note is too long.");
  }

  return errors;
}

function confirmManualQuoteSent(input) {
  const errors = validateSentConfirmationRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Manual quote copy action not found.") ? 404 : 400,
      errors
    };
  }

  const copyAction = findCopyAction(cleanText(input.copyActionId));
  const now = new Date().toISOString();
  const sentChannel = cleanText(input.sentChannel).toLowerCase();

  const record = {
    id: dataStore.createId("manual_quote_sent"),
    copyActionId: copyAction.id,
    draftId: copyAction.draftId,
    leadId: copyAction.leadId,
    buyerName: cleanText(copyAction.buyerName),
    buyerPhone: cleanText(copyAction.buyerPhone),
    partNeeded: cleanText(copyAction.partNeeded),
    vehicleBrand: cleanText(copyAction.vehicleBrand),
    vehicleModel: cleanText(copyAction.vehicleModel),
    vehicleYear: cleanText(copyAction.vehicleYear),
    engineCode: cleanText(copyAction.engineCode),
    quoteAmount: copyAction.quoteAmount,
    currency: cleanText(copyAction.currency),
    formattedQuoteAmount: cleanText(copyAction.formattedQuoteAmount),
    sentChannel,
    sentAt: cleanText(input.sentAt) || now,
    manualQuoteSentConfirmationOnly: true,
    adminManualSentConfirmed: true,
    manualSentConfirmed: true,
    manualReviewCompleted: true,
    buyerMessageManuallySentByAdmin: true,
    quoteCopyWasPrepared: true,
    manualCopyOnly: true,
    copyTextSnapshot: String(copyAction.copyText || ""),
    priceIncludedInManualMessage: copyAction.priceIncludedInCopyText === true || copyAction.quoteAmountIncludedInCopyText === true,
    quoteAmountIncludedInManualMessage: copyAction.quoteAmountIncludedInCopyText === true,
    systemSentToBuyer: false,
    sentToBuyerBySystem: false,
    quoteMarkedSentBySystem: false,
    priceSentBySystem: false,
    quoteAmountSentBySystem: false,
    autoSendWhatsApp: false,
    automaticBuyerMessage: false,
    autoOpenBrowser: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    serverClipboardAccess: false,
    browserAutoCopy: false,
    copiedToClipboardByBrowser: false,
    manualReviewRequiredForNextStep: true,
    note: cleanText(input.note || "Admin manually confirmed quote was sent outside the system after review."),
    confirmedBy: cleanText(input.confirmedBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const records = readSentConfirmations();
  records.unshift(record);
  writeSentConfirmations(records);

  return {
    ok: true,
    statusCode: 201,
    confirmation: record
  };
}

function listManualQuoteSentConfirmations() {
  return readSentConfirmations();
}

function getManualQuoteSentConfirmationSummary() {
  const confirmations = listManualQuoteSentConfirmations();

  return {
    totalManualQuoteSentConfirmations: confirmations.length,
    adminManualSentConfirmedCount: confirmations.filter(item => item.adminManualSentConfirmed === true).length,
    manualReviewCompletedCount: confirmations.filter(item => item.manualReviewCompleted === true).length,
    whatsappManualCount: confirmations.filter(item => item.sentChannel === "whatsapp_manual").length,
    manualCopyOnlyCount: confirmations.filter(item => item.manualCopyOnly === true).length,
    systemSentToBuyerCount: confirmations.filter(item => item.systemSentToBuyer === true || item.sentToBuyerBySystem === true).length,
    quoteMarkedSentBySystemCount: confirmations.filter(item => item.quoteMarkedSentBySystem === true).length,
    priceSentBySystemCount: confirmations.filter(item => item.priceSentBySystem === true || item.quoteAmountSentBySystem === true).length,
    autoSendWhatsAppCount: confirmations.filter(item => item.autoSendWhatsApp === true).length,
    automaticBuyerMessageCount: confirmations.filter(item => item.automaticBuyerMessage === true).length,
    autoOpenBrowserCount: confirmations.filter(item => item.autoOpenBrowser === true).length,
    autoPipelineMoveCount: confirmations.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true).length,
    serverClipboardAccessCount: confirmations.filter(item => item.serverClipboardAccess === true).length,
    browserAutoCopyCount: confirmations.filter(item => item.browserAutoCopy === true || item.copiedToClipboardByBrowser === true).length,
    safety: {
      manualQuoteSentConfirmationOnly: true,
      requiresPreparedCopyAction: true,
      requiresManualAdminConfirmation: true,
      requiresManualReviewCompleted: true,
      systemDoesNotSendMessage: true,
      systemSentToBuyer: false,
      quoteMarkedSentBySystem: false,
      priceSentBySystem: false,
      autoSendWhatsApp: false,
      automaticBuyerMessage: false,
      autoOpenBrowser: false,
      autoMovePipelineStage: false,
      serverClipboardAccess: false,
      browserAutoCopy: false,
      manualReviewRequiredForNextStep: true
    }
  };
}

module.exports = {
  confirmManualQuoteSent,
  listManualQuoteSentConfirmations,
  getManualQuoteSentConfirmationSummary
};

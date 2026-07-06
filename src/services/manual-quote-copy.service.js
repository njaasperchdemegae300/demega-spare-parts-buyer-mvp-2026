const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const manualQuoteDraftsPath = path.join(process.cwd(), "src", "data", "manual-quote-drafts.json");
const manualQuoteCopyActionsPath = path.join(process.cwd(), "src", "data", "manual-quote-copy-actions.json");

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

function readManualQuoteDrafts() {
  return readJsonArray(manualQuoteDraftsPath);
}

function readManualQuoteCopyActions() {
  return readJsonArray(manualQuoteCopyActionsPath);
}

function writeManualQuoteCopyActions(records) {
  writeJsonArray(manualQuoteCopyActionsPath, records);
}

function findDraft(draftId) {
  const drafts = readManualQuoteDrafts();
  return drafts.find(draft => draft.id === draftId);
}

function isBlockedSendOrAutomationRequest(input) {
  return input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.sendBuyerMessage === true ||
    input.messageBuyerAutomatically === true ||
    input.autoOpenBrowser === true ||
    input.openWhatsappAutomatically === true ||
    input.movePipelineAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.markAsSent === true ||
    input.sentToBuyer === true ||
    input.sentByAdmin === true ||
    input.priceSentToBuyer === true ||
    input.quoteAmountSentToBuyer === true;
}

function validateManualQuoteCopyRequest(input) {
  const errors = [];
  const draftId = cleanText(input.draftId);

  if (!draftId) errors.push("draftId is required.");

  const draft = draftId ? findDraft(draftId) : null;

  if (draftId && !draft) {
    errors.push("Manual quote draft not found.");
  }

  if (draft && draft.draftOnly !== true) {
    errors.push("Only draft-only manual quote drafts can be prepared for copy.");
  }

  if (draft && draft.finalQuoteGatePassed !== true) {
    errors.push("Final quote gate must pass before quote text can be prepared for manual copy.");
  }

  if (draft && draft.eligibleForManualQuoteDraft !== true) {
    errors.push("Manual quote draft eligibility is required before copy preparation.");
  }

  if (draft && draft.sentToBuyer === true) {
    errors.push("This draft is already marked as sent and cannot be prepared by this safe copy gate.");
  }

  if (draft && (draft.priceSentToBuyer === true || draft.quoteAmountSentToBuyer === true)) {
    errors.push("This draft has sent-price risk and cannot be prepared by this safe copy gate.");
  }

  if (draft && !cleanText(draft.messageDraft)) {
    errors.push("Draft message is empty.");
  }

  if (isBlockedSendOrAutomationRequest(input)) {
    errors.push("Sending, auto-opening, sent marking, buyer messaging, or pipeline movement is blocked at manual copy gate.");
  }

  if (cleanText(input.note).length > 700) {
    errors.push("note is too long.");
  }

  return errors;
}

function prepareManualQuoteCopy(input) {
  const errors = validateManualQuoteCopyRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Manual quote draft not found.") ? 404 : 400,
      errors
    };
  }

  const draft = findDraft(cleanText(input.draftId));
  const now = new Date().toISOString();
  const copyText = cleanText(draft.messageDraft);

  const record = {
    id: dataStore.createId("manual_quote_copy"),
    draftId: draft.id,
    leadId: draft.leadId,
    buyerName: cleanText(draft.buyerName),
    buyerPhone: cleanText(draft.buyerPhone),
    partNeeded: cleanText(draft.partNeeded),
    vehicleBrand: cleanText(draft.vehicleBrand),
    vehicleModel: cleanText(draft.vehicleModel),
    vehicleYear: cleanText(draft.vehicleYear),
    engineCode: cleanText(draft.engineCode),
    quoteAmount: draft.quoteAmount,
    currency: cleanText(draft.currency),
    formattedQuoteAmount: cleanText(draft.formattedQuoteAmount),
    copyText,
    copyTextLength: copyText.length,
    copyPrepared: true,
    copyTextPreparedOnly: true,
    manualCopyOnly: true,
    draftOnly: true,
    finalQuoteGatePassed: true,
    eligibleForManualQuoteDraft: true,
    manualReviewRequired: true,
    manualActionOnly: true,
    priceIncludedInCopyText: draft.priceIncludedInDraft === true || draft.quoteAmountIncludedInDraft === true,
    quoteAmountIncludedInCopyText: draft.quoteAmountIncludedInDraft === true,
    priceSentToBuyer: false,
    quoteAmountSentToBuyer: false,
    copiedToClipboardByBrowser: false,
    serverClipboardAccess: false,
    browserAutoCopy: false,
    autoSendWhatsApp: false,
    automaticBuyerMessage: false,
    autoOpenBrowser: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    sentToBuyer: false,
    sentByAdmin: false,
    note: cleanText(input.note || "Manual quote copy text prepared safely. Admin must copy and send manually after review."),
    preparedBy: cleanText(input.preparedBy || input.copiedBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const records = readManualQuoteCopyActions();
  records.unshift(record);
  writeManualQuoteCopyActions(records);

  return {
    ok: true,
    statusCode: 201,
    copyAction: record
  };
}

function listManualQuoteCopyActions() {
  return readManualQuoteCopyActions();
}

function getManualQuoteCopySummary() {
  const actions = listManualQuoteCopyActions();

  return {
    totalManualQuoteCopyActions: actions.length,
    copyPreparedCount: actions.filter(item => item.copyPrepared === true).length,
    copyTextPreparedOnlyCount: actions.filter(item => item.copyTextPreparedOnly === true).length,
    manualCopyOnlyCount: actions.filter(item => item.manualCopyOnly === true).length,
    draftOnlyCount: actions.filter(item => item.draftOnly === true).length,
    priceIncludedInCopyTextCount: actions.filter(item => item.priceIncludedInCopyText === true || item.quoteAmountIncludedInCopyText === true).length,
    priceSentToBuyerCount: actions.filter(item => item.priceSentToBuyer === true || item.quoteAmountSentToBuyer === true).length,
    copiedToClipboardByBrowserCount: actions.filter(item => item.copiedToClipboardByBrowser === true || item.browserAutoCopy === true).length,
    serverClipboardAccessCount: actions.filter(item => item.serverClipboardAccess === true).length,
    autoSendWhatsAppCount: actions.filter(item => item.autoSendWhatsApp === true).length,
    automaticBuyerMessageCount: actions.filter(item => item.automaticBuyerMessage === true).length,
    autoOpenBrowserCount: actions.filter(item => item.autoOpenBrowser === true).length,
    autoPipelineMoveCount: actions.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true).length,
    sentToBuyerCount: actions.filter(item => item.sentToBuyer === true || item.sentByAdmin === true).length,
    safety: {
      manualQuoteCopyFoundationOnly: true,
      preparesCopyTextOnly: true,
      serverDoesNotAccessClipboard: true,
      browserAutoCopy: false,
      draftOnly: true,
      requiresFinalQuoteEligibility: true,
      priceMayAppearInCopyTextAfterEligibility: true,
      priceSentToBuyer: false,
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
  prepareManualQuoteCopy,
  listManualQuoteCopyActions,
  getManualQuoteCopySummary
};

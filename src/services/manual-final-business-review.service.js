const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const accountingReviewsPath = path.join(process.cwd(), "src", "data", "manual-accounting-reviews.json");
const finalBusinessReviewsPath = path.join(process.cwd(), "src", "data", "manual-final-business-reviews.json");

const allowedFinalReviewTypes = [
  "final_sale_completed_review",
  "final_sale_pending_review",
  "final_followup_needed_review",
  "final_cancelled_review",
  "final_refund_required_review",
  "final_accounting_pending_review",
  "final_stock_pending_review",
  "final_no_action_review"
];

const allowedFinalBusinessActions = [
  "mark_manual_sale_completed_for_records",
  "keep_manual_followup_open",
  "flag_manual_manager_review",
  "flag_manual_refund_review",
  "flag_manual_accounting_pending",
  "flag_manual_stock_pending",
  "no_final_business_action_required"
];

const allowedFinalReviewStatuses = [
  "approved_for_manual_business_records",
  "needs_manager_review",
  "blocked_incomplete_accounting",
  "blocked_incomplete_stock_review",
  "final_followup_required",
  "no_final_business_update_required"
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

function readAccountingReviews() {
  return readJsonArray(accountingReviewsPath);
}

function readManualFinalBusinessReviews() {
  return readJsonArray(finalBusinessReviewsPath);
}

function writeManualFinalBusinessReviews(records) {
  writeJsonArray(finalBusinessReviewsPath, records);
}

function findAccountingReview(accountingReviewId) {
  return readAccountingReviews().find(review => review.id === accountingReviewId);
}

function isUnsafeAutomationRequest(input) {
  return input.autoCreateFinalBusinessRecord === true ||
    input.finalBusinessRecordCreatedBySystem === true ||
    input.autoCloseSale === true ||
    input.closeSaleAutomatically === true ||
    input.saleClosedBySystem === true ||
    input.markSaleWonAutomatically === true ||
    input.markLeadClosedAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.pipelineMovedAutomatically === true ||
    input.autoCompleteBuyerAction === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCreateFinancialLedgerEntry === true ||
    input.autoVerifyPayment === true ||
    input.collectPaymentAutomatically === true ||
    input.autoGenerateReceipt === true ||
    input.autoSendReceipt === true ||
    input.autoCreateInvoice === true ||
    input.autoUpdateRevenue === true ||
    input.revenueRecordedBySystem === true ||
    input.autoUpdateInventory === true ||
    input.autoReduceStock === true ||
    input.autoCreateStockLedgerEntry === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.autoReplyToBuyer === true ||
    input.automaticBuyerMessage === true ||
    input.autoOpenBrowser === true ||
    input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true;
}

function validateManualFinalBusinessReviewRequest(input) {
  const errors = [];
  const accountingReviewId = cleanText(input.accountingReviewId || input.manualAccountingReviewId);
  const finalReviewType = cleanText(input.finalReviewType || "").toLowerCase();
  const finalBusinessAction = cleanText(input.finalBusinessAction || "").toLowerCase();
  const finalReviewStatus = cleanText(input.finalReviewStatus || "").toLowerCase();
  const finalReviewNote = cleanText(input.finalReviewNote || input.businessReviewNote || "");

  if (!accountingReviewId) errors.push("accountingReviewId or manualAccountingReviewId is required.");

  const accountingReview = accountingReviewId ? findAccountingReview(accountingReviewId) : null;

  if (accountingReviewId && !accountingReview) {
    errors.push("Manual accounting review not found.");
  }

  if (accountingReview && accountingReview.manualAccountingReviewOnly !== true) {
    errors.push("Accounting review must be manual-accounting-review-only before final business review.");
  }

  if (accountingReview && accountingReview.accountingEntryPreparedOnly !== true) {
    errors.push("Accounting review must be prepared-only before final business review.");
  }

  if (accountingReview && accountingReview.manualAccountingReviewApproved !== true) {
    errors.push("Manual accounting review approval is required before final business review.");
  }

  if (accountingReview && (
    accountingReview.accountingEntryCreatedBySystem === true ||
    accountingReview.autoCreateAccountingEntry === true ||
    accountingReview.financialLedgerEntryCreatedBySystem === true ||
    accountingReview.autoCreateFinancialLedgerEntry === true ||
    accountingReview.paymentVerifiedBySystem === true ||
    accountingReview.autoVerifyPayment === true ||
    accountingReview.collectPaymentAutomatically === true ||
    accountingReview.receiptGeneratedBySystem === true ||
    accountingReview.autoGenerateReceipt === true ||
    accountingReview.invoiceCreatedBySystem === true ||
    accountingReview.autoCreateInvoice === true ||
    accountingReview.revenueRecordedBySystem === true ||
    accountingReview.autoUpdateRevenue === true ||
    accountingReview.autoMovePipelineStage === true ||
    accountingReview.autoUpdateInventory === true ||
    accountingReview.autoSendWhatsApp === true ||
    accountingReview.autoReadWhatsApp === true ||
    accountingReview.scrapeWhatsappMessages === true ||
    accountingReview.privateMessageScraping === true ||
    accountingReview.hiddenDataHarvesting === true
  )) {
    errors.push("Unsafe accounting review cannot be used for manual final business review.");
  }

  if (!finalReviewType) {
    errors.push("finalReviewType is required.");
  } else if (!allowedFinalReviewTypes.includes(finalReviewType)) {
    errors.push(`finalReviewType must be one of: ${allowedFinalReviewTypes.join(", ")}.`);
  }

  if (!finalBusinessAction) {
    errors.push("finalBusinessAction is required.");
  } else if (!allowedFinalBusinessActions.includes(finalBusinessAction)) {
    errors.push(`finalBusinessAction must be one of: ${allowedFinalBusinessActions.join(", ")}.`);
  }

  if (!finalReviewStatus) {
    errors.push("finalReviewStatus is required.");
  } else if (!allowedFinalReviewStatuses.includes(finalReviewStatus)) {
    errors.push(`finalReviewStatus must be one of: ${allowedFinalReviewStatuses.join(", ")}.`);
  }

  if (!finalReviewNote) {
    errors.push("finalReviewNote or businessReviewNote is required.");
  }

  if (finalReviewNote.length > 900) {
    errors.push("finalReviewNote is too long.");
  }

  if (input.adminReviewedAccounting !== true) {
    errors.push("adminReviewedAccounting must be true before final business review.");
  }

  if (input.manualFinalBusinessReviewApproved !== true) {
    errors.push("manualFinalBusinessReviewApproved must be true before recording final business review.");
  }

  if (isUnsafeAutomationRequest(input)) {
    errors.push("Automatic final record creation, sale closing, pipeline movement, accounting entry, payment verification, receipt, invoice, revenue recording, inventory update, WhatsApp sending, message reading, scraping, or hidden harvesting is blocked.");
  }

  return errors;
}

function getFinalBusinessTemperature(finalReviewType) {
  if (finalReviewType === "final_sale_completed_review") return "completed_manual";
  if (["final_sale_pending_review", "final_followup_needed_review", "final_accounting_pending_review", "final_stock_pending_review"].includes(finalReviewType)) return "pending_manual";
  return "closed_or_no_action_manual";
}

function recordManualFinalBusinessReview(input) {
  const errors = validateManualFinalBusinessReviewRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Manual accounting review not found.") ? 404 : 400,
      errors
    };
  }

  const accountingReview = findAccountingReview(cleanText(input.accountingReviewId || input.manualAccountingReviewId));
  const now = new Date().toISOString();
  const finalReviewType = cleanText(input.finalReviewType).toLowerCase();
  const finalBusinessAction = cleanText(input.finalBusinessAction).toLowerCase();
  const finalReviewStatus = cleanText(input.finalReviewStatus).toLowerCase();

  const record = {
    id: dataStore.createId("manual_final_business_review"),
    accountingReviewId: accountingReview.id,
    stockMovementReviewId: accountingReview.stockMovementReviewId,
    dealOutcomeId: accountingReview.dealOutcomeId,
    followupActionId: accountingReview.followupActionId,
    buyerReplyId: accountingReview.buyerReplyId,
    sentConfirmationId: accountingReview.sentConfirmationId,
    copyActionId: accountingReview.copyActionId,
    draftId: accountingReview.draftId,
    leadId: accountingReview.leadId,
    buyerName: cleanText(accountingReview.buyerName),
    buyerPhone: cleanText(accountingReview.buyerPhone),
    partNeeded: cleanText(accountingReview.partNeeded),
    vehicleBrand: cleanText(accountingReview.vehicleBrand),
    vehicleModel: cleanText(accountingReview.vehicleModel),
    vehicleYear: cleanText(accountingReview.vehicleYear),
    engineCode: cleanText(accountingReview.engineCode),
    quoteAmount: accountingReview.quoteAmount,
    currency: cleanText(accountingReview.currency),
    formattedQuoteAmount: cleanText(accountingReview.formattedQuoteAmount),
    dealOutcomeType: cleanText(accountingReview.dealOutcomeType),
    paymentStatus: cleanText(accountingReview.paymentStatus),
    deliveryStatus: cleanText(accountingReview.deliveryStatus),
    stockMovementType: cleanText(accountingReview.stockMovementType),
    accountingReviewType: cleanText(accountingReview.reviewType),
    accountingAction: cleanText(accountingReview.accountingAction),
    accountingReviewStatus: cleanText(accountingReview.reviewStatus),
    amountExpected: Number(accountingReview.amountExpected || 0),
    amountConfirmedByAdmin: Number(accountingReview.amountConfirmedByAdmin || 0),
    paymentMethodReviewed: cleanText(accountingReview.paymentMethodReviewed),
    finalReviewType,
    finalBusinessAction,
    finalReviewStatus,
    finalBusinessTemperature: getFinalBusinessTemperature(finalReviewType),
    finalReviewNote: cleanText(input.finalReviewNote || input.businessReviewNote),
    adminReviewedAccounting: true,
    manualFinalBusinessReviewApproved: true,
    manualFinalBusinessReviewOnly: true,
    finalBusinessReviewGateOnly: true,
    finalBusinessRecordPreparedOnly: true,
    finalBusinessRecordCreatedBySystem: false,
    autoCreateFinalBusinessRecord: false,
    saleClosedBySystem: false,
    autoCloseSale: false,
    closeSaleAutomatically: false,
    markSaleWonAutomatically: false,
    markLeadClosedAutomatically: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    autoCompleteBuyerAction: false,
    accountingEntryCreatedBySystem: false,
    autoCreateAccountingEntry: false,
    financialLedgerEntryCreatedBySystem: false,
    autoCreateFinancialLedgerEntry: false,
    paymentVerifiedBySystem: false,
    autoVerifyPayment: false,
    collectPaymentAutomatically: false,
    receiptGeneratedBySystem: false,
    autoGenerateReceipt: false,
    receiptSentAutomatically: false,
    autoSendReceipt: false,
    invoiceCreatedBySystem: false,
    autoCreateInvoice: false,
    revenueRecordedBySystem: false,
    autoUpdateRevenue: false,
    inventoryChangedBySystem: false,
    autoUpdateInventory: false,
    stockReducedBySystem: false,
    autoReduceStock: false,
    autoCreateStockLedgerEntry: false,
    autoSendWhatsApp: false,
    automaticBuyerMessage: false,
    autoReplyToBuyer: false,
    autoOpenBrowser: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    manualFinalBusinessRecordRequired: true,
    manualManagerReviewRequired: true,
    manualPipelineUpdateRequired: true,
    manualAccountingVerificationRequired: true,
    manualInventoryVerificationRequired: true,
    manualReviewRequiredBeforeFinalClose: true,
    manualReviewRequiredForNextStep: true,
    reviewedBy: cleanText(input.reviewedBy || "admin_manual"),
    reviewedAt: cleanText(input.reviewedAt) || now,
    createdAt: now,
    updatedAt: now
  };

  const records = readManualFinalBusinessReviews();
  records.unshift(record);
  writeManualFinalBusinessReviews(records);

  return {
    ok: true,
    statusCode: 201,
    finalBusinessReview: record
  };
}

function listManualFinalBusinessReviews() {
  return readManualFinalBusinessReviews();
}

function getManualFinalBusinessReviewSummary() {
  const reviews = listManualFinalBusinessReviews();

  return {
    totalManualFinalBusinessReviews: reviews.length,
    manualFinalBusinessReviewOnlyCount: reviews.filter(item => item.manualFinalBusinessReviewOnly === true).length,
    finalBusinessRecordPreparedOnlyCount: reviews.filter(item => item.finalBusinessRecordPreparedOnly === true).length,
    finalSaleCompletedReviewCount: reviews.filter(item => item.finalReviewType === "final_sale_completed_review").length,
    finalSalePendingReviewCount: reviews.filter(item => item.finalReviewType === "final_sale_pending_review").length,
    finalFollowupNeededReviewCount: reviews.filter(item => item.finalReviewType === "final_followup_needed_review").length,
    approvedForManualBusinessRecordsCount: reviews.filter(item => item.finalReviewStatus === "approved_for_manual_business_records").length,
    amountConfirmedByAdminTotal: reviews.reduce((sum, item) => sum + Number(item.amountConfirmedByAdmin || 0), 0),
    finalBusinessRecordCreatedBySystemCount: reviews.filter(item => item.finalBusinessRecordCreatedBySystem === true || item.autoCreateFinalBusinessRecord === true).length,
    autoCloseSaleCount: reviews.filter(item => item.saleClosedBySystem === true || item.autoCloseSale === true || item.closeSaleAutomatically === true).length,
    autoPipelineMoveCount: reviews.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true).length,
    autoAccountingEntryCount: reviews.filter(item => item.autoCreateAccountingEntry === true || item.accountingEntryCreatedBySystem === true).length,
    autoFinancialLedgerCount: reviews.filter(item => item.autoCreateFinancialLedgerEntry === true || item.financialLedgerEntryCreatedBySystem === true).length,
    autoReceiptCount: reviews.filter(item => item.autoGenerateReceipt === true || item.receiptGeneratedBySystem === true || item.receiptSentAutomatically === true || item.autoSendReceipt === true).length,
    autoInvoiceCount: reviews.filter(item => item.autoCreateInvoice === true || item.invoiceCreatedBySystem === true).length,
    autoRevenueCount: reviews.filter(item => item.autoUpdateRevenue === true || item.revenueRecordedBySystem === true).length,
    autoInventoryUpdateCount: reviews.filter(item => item.autoUpdateInventory === true || item.inventoryChangedBySystem === true || item.autoCreateStockLedgerEntry === true).length,
    autoSendWhatsAppCount: reviews.filter(item => item.autoSendWhatsApp === true).length,
    scrapingCount: reviews.filter(item => item.scrapeWhatsappMessages === true || item.privateMessageScraping === true || item.hiddenDataHarvesting === true).length,
    autoReadWhatsAppCount: reviews.filter(item => item.autoReadWhatsApp === true || item.readBuyerMessagesAutomatically === true).length,
    safety: {
      manualFinalBusinessReviewGateOnly: true,
      manualFinalBusinessReviewOnly: true,
      finalBusinessRecordPreparedOnly: true,
      requiresManualAccountingReview: true,
      requiresAdminReviewedAccounting: true,
      requiresManualFinalBusinessReviewApproval: true,
      systemDoesNotCreateFinalBusinessRecord: true,
      systemDoesNotCloseSale: true,
      systemDoesNotMovePipeline: true,
      systemDoesNotCreateAccountingEntry: true,
      systemDoesNotCreateFinancialLedger: true,
      systemDoesNotVerifyPayment: true,
      systemDoesNotGenerateReceipt: true,
      systemDoesNotCreateInvoice: true,
      systemDoesNotRecordRevenue: true,
      systemDoesNotUpdateInventory: true,
      systemDoesNotSendWhatsApp: true,
      systemDoesNotReadBuyerMessages: true,
      scrapeWhatsappMessages: false,
      privateMessageScraping: false,
      hiddenDataHarvesting: false,
      autoCreateFinalBusinessRecord: false,
      autoCloseSale: false,
      autoMovePipelineStage: false,
      autoCreateAccountingEntry: false,
      autoCreateFinancialLedgerEntry: false,
      autoVerifyPayment: false,
      autoGenerateReceipt: false,
      autoCreateInvoice: false,
      autoUpdateRevenue: false,
      autoUpdateInventory: false,
      autoSendWhatsApp: false,
      autoReplyToBuyer: false,
      autoOpenBrowser: false,
      manualFinalBusinessRecordRequired: true,
      manualManagerReviewRequired: true,
      manualPipelineUpdateRequired: true,
      manualAccountingVerificationRequired: true,
      manualInventoryVerificationRequired: true,
      manualReviewRequiredBeforeFinalClose: true,
      manualReviewRequiredForNextStep: true
    }
  };
}

module.exports = {
  recordManualFinalBusinessReview,
  listManualFinalBusinessReviews,
  getManualFinalBusinessReviewSummary
};

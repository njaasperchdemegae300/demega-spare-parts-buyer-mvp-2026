const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const stockMovementReviewsPath = path.join(process.cwd(), "src", "data", "manual-stock-movement-reviews.json");
const accountingReviewsPath = path.join(process.cwd(), "src", "data", "manual-accounting-reviews.json");

const allowedReviewTypes = [
  "payment_received_review",
  "payment_pending_review",
  "deposit_received_review",
  "cash_payment_review",
  "transfer_payment_review",
  "no_payment_review",
  "refund_review",
  "accounting_note_review"
];

const allowedAccountingActions = [
  "record_manual_cash_sale",
  "record_manual_transfer_sale",
  "record_manual_deposit",
  "record_manual_payment_pending",
  "record_manual_no_payment",
  "manual_refund_review",
  "no_accounting_action_required"
];

const allowedReviewStatuses = [
  "approved_for_manual_accounting_entry",
  "manual_payment_confirmation_required",
  "needs_manager_review",
  "blocked_no_accounting_entry",
  "no_accounting_entry_required"
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

function readStockMovementReviews() {
  return readJsonArray(stockMovementReviewsPath);
}

function readManualAccountingReviews() {
  return readJsonArray(accountingReviewsPath);
}

function writeManualAccountingReviews(records) {
  writeJsonArray(accountingReviewsPath, records);
}

function findStockMovementReview(stockMovementReviewId) {
  return readStockMovementReviews().find(review => review.id === stockMovementReviewId);
}

function isUnsafeAutomationRequest(input) {
  return input.autoCreateAccountingEntry === true ||
    input.createAccountingEntryAutomatically === true ||
    input.accountingEntryCreatedBySystem === true ||
    input.autoVerifyPayment === true ||
    input.verifyPaymentAutomatically === true ||
    input.collectPaymentAutomatically === true ||
    input.autoGenerateReceipt === true ||
    input.generateReceiptAutomatically === true ||
    input.receiptSentAutomatically === true ||
    input.autoSendReceipt === true ||
    input.autoCreateInvoice === true ||
    input.invoiceCreatedBySystem === true ||
    input.autoUpdateRevenue === true ||
    input.revenueRecordedBySystem === true ||
    input.autoCreateFinancialLedgerEntry === true ||
    input.financialLedgerEntryCreatedBySystem === true ||
    input.autoCloseSale === true ||
    input.closeSaleAutomatically === true ||
    input.autoMovePipelineStage === true ||
    input.pipelineMovedAutomatically === true ||
    input.autoUpdateInventory === true ||
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

function validateManualAccountingReviewRequest(input) {
  const errors = [];
  const stockMovementReviewId = cleanText(input.stockMovementReviewId || input.manualStockMovementReviewId);
  const reviewType = cleanText(input.reviewType || "").toLowerCase();
  const accountingAction = cleanText(input.accountingAction || "").toLowerCase();
  const reviewStatus = cleanText(input.reviewStatus || "").toLowerCase();
  const accountingNote = cleanText(input.accountingNote || input.reviewNote || "");

  if (!stockMovementReviewId) errors.push("stockMovementReviewId or manualStockMovementReviewId is required.");

  const stockMovementReview = stockMovementReviewId ? findStockMovementReview(stockMovementReviewId) : null;

  if (stockMovementReviewId && !stockMovementReview) {
    errors.push("Manual stock movement review not found.");
  }

  if (stockMovementReview && stockMovementReview.manualStockMovementReviewOnly !== true) {
    errors.push("Stock movement review must be manual-review-only before accounting review.");
  }

  if (stockMovementReview && stockMovementReview.stockUpdatePreparedOnly !== true) {
    errors.push("Stock movement review must be prepared-only before accounting review.");
  }

  if (stockMovementReview && stockMovementReview.manualStockMovementReviewApproved !== true) {
    errors.push("Manual stock movement review approval is required before accounting review.");
  }

  if (stockMovementReview && (
    stockMovementReview.inventoryChangedBySystem === true ||
    stockMovementReview.stockReducedBySystem === true ||
    stockMovementReview.stockReservedBySystem === true ||
    stockMovementReview.stockReleasedBySystem === true ||
    stockMovementReview.autoUpdateInventory === true ||
    stockMovementReview.autoCreateInventoryEvent === true ||
    stockMovementReview.autoCreateStockLedgerEntry === true ||
    stockMovementReview.collectPaymentAutomatically === true ||
    stockMovementReview.verifyPaymentAutomatically === true ||
    stockMovementReview.autoSendWhatsApp === true ||
    stockMovementReview.autoReadWhatsApp === true ||
    stockMovementReview.scrapeWhatsappMessages === true ||
    stockMovementReview.privateMessageScraping === true ||
    stockMovementReview.hiddenDataHarvesting === true
  )) {
    errors.push("Unsafe stock movement review cannot be used for manual accounting review.");
  }

  if (!reviewType) {
    errors.push("reviewType is required.");
  } else if (!allowedReviewTypes.includes(reviewType)) {
    errors.push(`reviewType must be one of: ${allowedReviewTypes.join(", ")}.`);
  }

  if (!accountingAction) {
    errors.push("accountingAction is required.");
  } else if (!allowedAccountingActions.includes(accountingAction)) {
    errors.push(`accountingAction must be one of: ${allowedAccountingActions.join(", ")}.`);
  }

  if (!reviewStatus) {
    errors.push("reviewStatus is required.");
  } else if (!allowedReviewStatuses.includes(reviewStatus)) {
    errors.push(`reviewStatus must be one of: ${allowedReviewStatuses.join(", ")}.`);
  }

  if (!accountingNote) {
    errors.push("accountingNote or reviewNote is required.");
  }

  if (accountingNote.length > 900) {
    errors.push("accountingNote is too long.");
  }

  if (input.adminReviewedStockMovement !== true) {
    errors.push("adminReviewedStockMovement must be true before accounting review.");
  }

  if (input.manualAccountingReviewApproved !== true) {
    errors.push("manualAccountingReviewApproved must be true before recording accounting review.");
  }

  if (isUnsafeAutomationRequest(input)) {
    errors.push("Automatic accounting entry, payment verification, receipt, invoice, revenue, financial ledger, sale closing, pipeline movement, inventory update, WhatsApp sending, message reading, scraping, or hidden harvesting is blocked.");
  }

  return errors;
}

function recordManualAccountingReview(input) {
  const errors = validateManualAccountingReviewRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Manual stock movement review not found.") ? 404 : 400,
      errors
    };
  }

  const stockMovementReview = findStockMovementReview(cleanText(input.stockMovementReviewId || input.manualStockMovementReviewId));
  const now = new Date().toISOString();
  const reviewType = cleanText(input.reviewType).toLowerCase();
  const accountingAction = cleanText(input.accountingAction).toLowerCase();
  const reviewStatus = cleanText(input.reviewStatus).toLowerCase();

  const record = {
    id: dataStore.createId("manual_accounting_review"),
    stockMovementReviewId: stockMovementReview.id,
    dealOutcomeId: stockMovementReview.dealOutcomeId,
    followupActionId: stockMovementReview.followupActionId,
    buyerReplyId: stockMovementReview.buyerReplyId,
    sentConfirmationId: stockMovementReview.sentConfirmationId,
    copyActionId: stockMovementReview.copyActionId,
    draftId: stockMovementReview.draftId,
    leadId: stockMovementReview.leadId,
    buyerName: cleanText(stockMovementReview.buyerName),
    buyerPhone: cleanText(stockMovementReview.buyerPhone),
    partNeeded: cleanText(stockMovementReview.partNeeded),
    vehicleBrand: cleanText(stockMovementReview.vehicleBrand),
    vehicleModel: cleanText(stockMovementReview.vehicleModel),
    vehicleYear: cleanText(stockMovementReview.vehicleYear),
    engineCode: cleanText(stockMovementReview.engineCode),
    quoteAmount: stockMovementReview.quoteAmount,
    currency: cleanText(stockMovementReview.currency),
    formattedQuoteAmount: cleanText(stockMovementReview.formattedQuoteAmount),
    dealOutcomeType: cleanText(stockMovementReview.dealOutcomeType),
    paymentStatus: cleanText(stockMovementReview.paymentStatus),
    deliveryStatus: cleanText(stockMovementReview.deliveryStatus),
    stockMovementType: cleanText(stockMovementReview.movementType),
    stockMovementReviewStatus: cleanText(stockMovementReview.reviewStatus),
    amountExpected: Number(input.amountExpected || stockMovementReview.amountActuallyReceived || stockMovementReview.quoteAmount || 0),
    amountConfirmedByAdmin: Number(input.amountConfirmedByAdmin || 0),
    paymentMethodReviewed: cleanText(input.paymentMethodReviewed || stockMovementReview.paymentStatus || ""),
    transactionReferenceManual: cleanText(input.transactionReferenceManual || ""),
    receiptNumberManual: cleanText(input.receiptNumberManual || ""),
    reviewType,
    accountingAction,
    reviewStatus,
    accountingNote: cleanText(input.accountingNote || input.reviewNote),
    adminReviewedStockMovement: true,
    manualAccountingReviewApproved: true,
    manualAccountingReviewOnly: true,
    accountingReviewGateOnly: true,
    accountingEntryPreparedOnly: true,
    accountingEntryCreatedBySystem: false,
    autoCreateAccountingEntry: false,
    createAccountingEntryAutomatically: false,
    financialLedgerEntryCreatedBySystem: false,
    autoCreateFinancialLedgerEntry: false,
    paymentVerifiedBySystem: false,
    autoVerifyPayment: false,
    verifyPaymentAutomatically: false,
    collectPaymentAutomatically: false,
    receiptGeneratedBySystem: false,
    autoGenerateReceipt: false,
    generateReceiptAutomatically: false,
    receiptSentAutomatically: false,
    autoSendReceipt: false,
    invoiceCreatedBySystem: false,
    autoCreateInvoice: false,
    revenueRecordedBySystem: false,
    autoUpdateRevenue: false,
    autoCloseSale: false,
    closeSaleAutomatically: false,
    autoMovePipelineStage: false,
    pipelineMovedAutomatically: false,
    autoUpdateInventory: false,
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
    manualAccountingEntryRequired: true,
    manualPaymentVerificationRequired: true,
    manualReceiptRequired: true,
    manualInvoiceRequiredIfNeeded: true,
    manualFinancialLedgerEntryRequired: true,
    manualReviewRequiredBeforeAccountingEntry: true,
    manualReviewRequiredForNextStep: true,
    reviewedBy: cleanText(input.reviewedBy || "admin_manual"),
    reviewedAt: cleanText(input.reviewedAt) || now,
    createdAt: now,
    updatedAt: now
  };

  const records = readManualAccountingReviews();
  records.unshift(record);
  writeManualAccountingReviews(records);

  return {
    ok: true,
    statusCode: 201,
    accountingReview: record
  };
}

function listManualAccountingReviews() {
  return readManualAccountingReviews();
}

function getManualAccountingReviewSummary() {
  const reviews = listManualAccountingReviews();

  return {
    totalManualAccountingReviews: reviews.length,
    manualAccountingReviewOnlyCount: reviews.filter(item => item.manualAccountingReviewOnly === true).length,
    accountingEntryPreparedOnlyCount: reviews.filter(item => item.accountingEntryPreparedOnly === true).length,
    paymentReceivedReviewCount: reviews.filter(item => item.reviewType === "payment_received_review").length,
    paymentPendingReviewCount: reviews.filter(item => item.reviewType === "payment_pending_review").length,
    cashPaymentReviewCount: reviews.filter(item => item.reviewType === "cash_payment_review").length,
    transferPaymentReviewCount: reviews.filter(item => item.reviewType === "transfer_payment_review").length,
    approvedForManualAccountingEntryCount: reviews.filter(item => item.reviewStatus === "approved_for_manual_accounting_entry").length,
    amountConfirmedByAdminTotal: reviews.reduce((sum, item) => sum + Number(item.amountConfirmedByAdmin || 0), 0),
    autoAccountingEntryCount: reviews.filter(item => item.autoCreateAccountingEntry === true || item.createAccountingEntryAutomatically === true || item.accountingEntryCreatedBySystem === true).length,
    autoFinancialLedgerCount: reviews.filter(item => item.autoCreateFinancialLedgerEntry === true || item.financialLedgerEntryCreatedBySystem === true).length,
    autoPaymentVerificationCount: reviews.filter(item => item.autoVerifyPayment === true || item.verifyPaymentAutomatically === true || item.paymentVerifiedBySystem === true).length,
    autoReceiptCount: reviews.filter(item => item.autoGenerateReceipt === true || item.generateReceiptAutomatically === true || item.receiptGeneratedBySystem === true || item.receiptSentAutomatically === true || item.autoSendReceipt === true).length,
    autoInvoiceCount: reviews.filter(item => item.autoCreateInvoice === true || item.invoiceCreatedBySystem === true).length,
    autoRevenueCount: reviews.filter(item => item.autoUpdateRevenue === true || item.revenueRecordedBySystem === true).length,
    autoSendWhatsAppCount: reviews.filter(item => item.autoSendWhatsApp === true).length,
    autoPipelineMoveCount: reviews.filter(item => item.autoMovePipelineStage === true || item.pipelineMovedAutomatically === true).length,
    autoInventoryUpdateCount: reviews.filter(item => item.autoUpdateInventory === true || item.autoCreateStockLedgerEntry === true).length,
    scrapingCount: reviews.filter(item => item.scrapeWhatsappMessages === true || item.privateMessageScraping === true || item.hiddenDataHarvesting === true).length,
    autoReadWhatsAppCount: reviews.filter(item => item.autoReadWhatsApp === true || item.readBuyerMessagesAutomatically === true).length,
    safety: {
      manualAccountingReviewGateOnly: true,
      manualAccountingReviewOnly: true,
      accountingEntryPreparedOnly: true,
      requiresManualStockMovementReview: true,
      requiresAdminReviewedStockMovement: true,
      requiresManualAccountingReviewApproval: true,
      systemDoesNotCreateAccountingEntry: true,
      systemDoesNotCreateFinancialLedger: true,
      systemDoesNotVerifyPayment: true,
      systemDoesNotCollectPayment: true,
      systemDoesNotGenerateReceipt: true,
      systemDoesNotSendReceipt: true,
      systemDoesNotCreateInvoice: true,
      systemDoesNotRecordRevenue: true,
      systemDoesNotMovePipeline: true,
      systemDoesNotUpdateInventory: true,
      systemDoesNotSendWhatsApp: true,
      systemDoesNotReadBuyerMessages: true,
      scrapeWhatsappMessages: false,
      privateMessageScraping: false,
      hiddenDataHarvesting: false,
      autoCreateAccountingEntry: false,
      createAccountingEntryAutomatically: false,
      autoCreateFinancialLedgerEntry: false,
      autoVerifyPayment: false,
      verifyPaymentAutomatically: false,
      collectPaymentAutomatically: false,
      autoGenerateReceipt: false,
      autoSendReceipt: false,
      autoCreateInvoice: false,
      autoUpdateRevenue: false,
      autoMovePipelineStage: false,
      autoUpdateInventory: false,
      autoSendWhatsApp: false,
      autoReplyToBuyer: false,
      autoOpenBrowser: false,
      manualAccountingEntryRequired: true,
      manualPaymentVerificationRequired: true,
      manualReceiptRequired: true,
      manualFinancialLedgerEntryRequired: true,
      manualReviewRequiredBeforeAccountingEntry: true,
      manualReviewRequiredForNextStep: true
    }
  };
}

module.exports = {
  recordManualAccountingReview,
  listManualAccountingReviews,
  getManualAccountingReviewSummary
};

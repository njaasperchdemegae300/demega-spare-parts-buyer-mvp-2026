const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const dealOutcomesPath = path.join(process.cwd(), "src", "data", "manual-deal-outcomes.json");
const stockMovementReviewsPath = path.join(process.cwd(), "src", "data", "manual-stock-movement-reviews.json");

const allowedMovementTypes = [
  "stock_deduction_review",
  "stock_reservation_review",
  "stock_release_review",
  "stock_count_check_review",
  "no_stock_change_review",
  "stock_return_review",
  "damaged_stock_review"
];

const allowedMovementReasons = [
  "deal_won_manual",
  "pickup_completed_manual",
  "delivery_completed_manual",
  "payment_pending_manual",
  "stock_reserved_manual",
  "deal_lost_manual",
  "wrong_part_manual",
  "buyer_requested_later_manual",
  "manual_audit_check"
];

const allowedReviewStatuses = [
  "approved_for_manual_stock_update",
  "needs_manager_review",
  "blocked_no_stock_change",
  "no_stock_change_required",
  "manual_count_required"
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

function readDealOutcomes() {
  return readJsonArray(dealOutcomesPath);
}

function readStockMovementReviews() {
  return readJsonArray(stockMovementReviewsPath);
}

function writeStockMovementReviews(records) {
  writeJsonArray(stockMovementReviewsPath, records);
}

function findDealOutcome(dealOutcomeId) {
  return readDealOutcomes().find(outcome => outcome.id === dealOutcomeId);
}

function isUnsafeAutomationRequest(input) {
  return input.autoUpdateInventory === true ||
    input.updateInventoryAutomatically === true ||
    input.autoReduceStock === true ||
    input.reduceStockAutomatically === true ||
    input.autoReserveStock === true ||
    input.reserveStockAutomatically === true ||
    input.autoReleaseStock === true ||
    input.releaseStockAutomatically === true ||
    input.autoChangeStockQuantity === true ||
    input.changeStockAutomatically === true ||
    input.inventoryChangedBySystem === true ||
    input.stockReducedBySystem === true ||
    input.stockReservedBySystem === true ||
    input.stockReleasedBySystem === true ||
    input.autoCreateInventoryEvent === true ||
    input.autoCreateStockLedgerEntry === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.autoReplyToBuyer === true ||
    input.automaticBuyerMessage === true ||
    input.autoOpenBrowser === true ||
    input.collectPaymentAutomatically === true ||
    input.verifyPaymentAutomatically === true ||
    input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true;
}

function validateManualStockMovementReviewRequest(input) {
  const errors = [];
  const dealOutcomeId = cleanText(input.dealOutcomeId || input.manualDealOutcomeId);
  const movementType = cleanText(input.movementType || "").toLowerCase();
  const movementReason = cleanText(input.movementReason || "").toLowerCase();
  const reviewStatus = cleanText(input.reviewStatus || "").toLowerCase();
  const reviewNote = cleanText(input.reviewNote || input.stockMovementNote || "");

  if (!dealOutcomeId) errors.push("dealOutcomeId or manualDealOutcomeId is required.");

  const dealOutcome = dealOutcomeId ? findDealOutcome(dealOutcomeId) : null;

  if (dealOutcomeId && !dealOutcome) {
    errors.push("Manual deal outcome not found.");
  }

  if (dealOutcome && dealOutcome.manualDealOutcomeOnly !== true) {
    errors.push("Deal outcome must be manual-deal-outcome-only before stock movement review.");
  }

  if (dealOutcome && dealOutcome.manualOutcomeRecordOnly !== true) {
    errors.push("Deal outcome must be record-only before stock movement review.");
  }

  if (dealOutcome && dealOutcome.adminCompletedManualAction !== true) {
    errors.push("Admin completed manual action is required before stock movement review.");
  }

  if (dealOutcome && dealOutcome.manualOutcomeApproved !== true) {
    errors.push("Manual outcome approval is required before stock movement review.");
  }

  if (dealOutcome && (
    dealOutcome.systemClosedSale === true ||
    dealOutcome.autoCloseSale === true ||
    dealOutcome.autoMovePipelineStage === true ||
    dealOutcome.pipelineMovedAutomatically === true ||
    dealOutcome.autoSendWhatsApp === true ||
    dealOutcome.autoReplyToBuyer === true ||
    dealOutcome.collectPaymentAutomatically === true ||
    dealOutcome.verifyPaymentAutomatically === true ||
    dealOutcome.autoReserveStock === true ||
    dealOutcome.autoReduceStock === true ||
    dealOutcome.autoReadWhatsApp === true ||
    dealOutcome.scrapeWhatsappMessages === true ||
    dealOutcome.privateMessageScraping === true ||
    dealOutcome.hiddenDataHarvesting === true
  )) {
    errors.push("Unsafe deal outcome cannot be used for stock movement review.");
  }

  if (!movementType) {
    errors.push("movementType is required.");
  } else if (!allowedMovementTypes.includes(movementType)) {
    errors.push(`movementType must be one of: ${allowedMovementTypes.join(", ")}.`);
  }

  if (!movementReason) {
    errors.push("movementReason is required.");
  } else if (!allowedMovementReasons.includes(movementReason)) {
    errors.push(`movementReason must be one of: ${allowedMovementReasons.join(", ")}.`);
  }

  if (!reviewStatus) {
    errors.push("reviewStatus is required.");
  } else if (!allowedReviewStatuses.includes(reviewStatus)) {
    errors.push(`reviewStatus must be one of: ${allowedReviewStatuses.join(", ")}.`);
  }

  if (!reviewNote) {
    errors.push("reviewNote or stockMovementNote is required.");
  }

  if (reviewNote.length > 900) {
    errors.push("reviewNote is too long.");
  }

  if (input.adminReviewedDealOutcome !== true) {
    errors.push("adminReviewedDealOutcome must be true before stock movement review.");
  }

  if (input.manualStockMovementReviewApproved !== true) {
    errors.push("manualStockMovementReviewApproved must be true before recording stock movement review.");
  }

  if (isUnsafeAutomationRequest(input)) {
    errors.push("Automatic inventory update, stock reduction, stock reservation, stock release, ledger event, sale closing, pipeline movement, WhatsApp sending, payment handling, message reading, scraping, or hidden harvesting is blocked.");
  }

  return errors;
}

function recordManualStockMovementReview(input) {
  const errors = validateManualStockMovementReviewRequest(input);

  if (errors.length) {
    return {
      ok: false,
      statusCode: errors.includes("Manual deal outcome not found.") ? 404 : 400,
      errors
    };
  }

  const dealOutcome = findDealOutcome(cleanText(input.dealOutcomeId || input.manualDealOutcomeId));
  const now = new Date().toISOString();
  const movementType = cleanText(input.movementType).toLowerCase();
  const movementReason = cleanText(input.movementReason).toLowerCase();
  const reviewStatus = cleanText(input.reviewStatus).toLowerCase();

  const record = {
    id: dataStore.createId("manual_stock_movement_review"),
    dealOutcomeId: dealOutcome.id,
    followupActionId: dealOutcome.followupActionId,
    buyerReplyId: dealOutcome.buyerReplyId,
    sentConfirmationId: dealOutcome.sentConfirmationId,
    copyActionId: dealOutcome.copyActionId,
    draftId: dealOutcome.draftId,
    leadId: dealOutcome.leadId,
    buyerName: cleanText(dealOutcome.buyerName),
    buyerPhone: cleanText(dealOutcome.buyerPhone),
    partNeeded: cleanText(dealOutcome.partNeeded),
    vehicleBrand: cleanText(dealOutcome.vehicleBrand),
    vehicleModel: cleanText(dealOutcome.vehicleModel),
    vehicleYear: cleanText(dealOutcome.vehicleYear),
    engineCode: cleanText(dealOutcome.engineCode),
    quoteAmount: dealOutcome.quoteAmount,
    currency: cleanText(dealOutcome.currency),
    formattedQuoteAmount: cleanText(dealOutcome.formattedQuoteAmount),
    dealOutcomeType: cleanText(dealOutcome.outcomeType),
    paymentStatus: cleanText(dealOutcome.paymentStatus),
    deliveryStatus: cleanText(dealOutcome.deliveryStatus),
    amountActuallyReceived: Number(dealOutcome.amountActuallyReceived || 0),
    movementType,
    movementReason,
    reviewStatus,
    quantityToReview: Number(input.quantityToReview || 0),
    shelfOrSupplier: cleanText(input.shelfOrSupplier || ""),
    inventoryItemId: cleanText(input.inventoryItemId || ""),
    reviewNote: cleanText(input.reviewNote || input.stockMovementNote),
    adminReviewedDealOutcome: true,
    manualStockMovementReviewApproved: true,
    manualStockMovementReviewOnly: true,
    stockMovementReviewGateOnly: true,
    stockUpdatePreparedOnly: true,
    inventoryChangedBySystem: false,
    stockReducedBySystem: false,
    stockReservedBySystem: false,
    stockReleasedBySystem: false,
    stockQuantityChangedBySystem: false,
    autoUpdateInventory: false,
    updateInventoryAutomatically: false,
    autoReduceStock: false,
    reduceStockAutomatically: false,
    autoReserveStock: false,
    reserveStockAutomatically: false,
    autoReleaseStock: false,
    releaseStockAutomatically: false,
    autoChangeStockQuantity: false,
    changeStockAutomatically: false,
    autoCreateInventoryEvent: false,
    autoCreateStockLedgerEntry: false,
    autoCloseSale: false,
    autoMovePipelineStage: false,
    autoSendWhatsApp: false,
    automaticBuyerMessage: false,
    autoReplyToBuyer: false,
    autoOpenBrowser: false,
    collectPaymentAutomatically: false,
    verifyPaymentAutomatically: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    manualInventoryUpdateRequired: true,
    manualLedgerEntryRequired: true,
    manualReviewRequiredBeforeInventoryChange: true,
    manualReviewRequiredForNextStep: true,
    reviewedBy: cleanText(input.reviewedBy || "admin_manual"),
    reviewedAt: cleanText(input.reviewedAt) || now,
    createdAt: now,
    updatedAt: now
  };

  const records = readStockMovementReviews();
  records.unshift(record);
  writeStockMovementReviews(records);

  return {
    ok: true,
    statusCode: 201,
    stockMovementReview: record
  };
}

function listManualStockMovementReviews() {
  return readStockMovementReviews();
}

function getManualStockMovementReviewSummary() {
  const reviews = listManualStockMovementReviews();

  return {
    totalManualStockMovementReviews: reviews.length,
    manualStockMovementReviewOnlyCount: reviews.filter(item => item.manualStockMovementReviewOnly === true).length,
    stockUpdatePreparedOnlyCount: reviews.filter(item => item.stockUpdatePreparedOnly === true).length,
    stockDeductionReviewCount: reviews.filter(item => item.movementType === "stock_deduction_review").length,
    stockReservationReviewCount: reviews.filter(item => item.movementType === "stock_reservation_review").length,
    stockReleaseReviewCount: reviews.filter(item => item.movementType === "stock_release_review").length,
    manualCountRequiredCount: reviews.filter(item => item.reviewStatus === "manual_count_required").length,
    approvedForManualStockUpdateCount: reviews.filter(item => item.reviewStatus === "approved_for_manual_stock_update").length,
    inventoryChangedBySystemCount: reviews.filter(item => item.inventoryChangedBySystem === true || item.stockQuantityChangedBySystem === true).length,
    autoUpdateInventoryCount: reviews.filter(item => item.autoUpdateInventory === true || item.updateInventoryAutomatically === true).length,
    autoReduceStockCount: reviews.filter(item => item.autoReduceStock === true || item.reduceStockAutomatically === true || item.stockReducedBySystem === true).length,
    autoReserveStockCount: reviews.filter(item => item.autoReserveStock === true || item.reserveStockAutomatically === true || item.stockReservedBySystem === true).length,
    autoReleaseStockCount: reviews.filter(item => item.autoReleaseStock === true || item.releaseStockAutomatically === true || item.stockReleasedBySystem === true).length,
    autoLedgerCount: reviews.filter(item => item.autoCreateInventoryEvent === true || item.autoCreateStockLedgerEntry === true).length,
    autoSendWhatsAppCount: reviews.filter(item => item.autoSendWhatsApp === true).length,
    autoPaymentCount: reviews.filter(item => item.collectPaymentAutomatically === true || item.verifyPaymentAutomatically === true).length,
    scrapingCount: reviews.filter(item => item.scrapeWhatsappMessages === true || item.privateMessageScraping === true || item.hiddenDataHarvesting === true).length,
    autoReadWhatsAppCount: reviews.filter(item => item.autoReadWhatsApp === true || item.readBuyerMessagesAutomatically === true).length,
    safety: {
      manualStockMovementReviewGateOnly: true,
      manualStockMovementReviewOnly: true,
      stockUpdatePreparedOnly: true,
      requiresManualDealOutcome: true,
      requiresAdminReviewedDealOutcome: true,
      requiresManualStockMovementReviewApproval: true,
      systemDoesNotUpdateInventory: true,
      systemDoesNotReduceStock: true,
      systemDoesNotReserveStock: true,
      systemDoesNotReleaseStock: true,
      systemDoesNotCreateStockLedger: true,
      systemDoesNotHandlePayment: true,
      systemDoesNotSendWhatsApp: true,
      systemDoesNotReadBuyerMessages: true,
      scrapeWhatsappMessages: false,
      privateMessageScraping: false,
      hiddenDataHarvesting: false,
      autoUpdateInventory: false,
      autoReduceStock: false,
      autoReserveStock: false,
      autoReleaseStock: false,
      autoCreateInventoryEvent: false,
      autoCreateStockLedgerEntry: false,
      collectPaymentAutomatically: false,
      verifyPaymentAutomatically: false,
      autoSendWhatsApp: false,
      autoReplyToBuyer: false,
      autoOpenBrowser: false,
      manualInventoryUpdateRequired: true,
      manualLedgerEntryRequired: true,
      manualReviewRequiredBeforeInventoryChange: true,
      manualReviewRequiredForNextStep: true
    }
  };
}

module.exports = {
  recordManualStockMovementReview,
  listManualStockMovementReviews,
  getManualStockMovementReviewSummary
};

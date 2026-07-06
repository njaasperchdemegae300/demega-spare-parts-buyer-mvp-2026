const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const manualStockMovementReviewService = require("../services/manual-stock-movement-review.service");

function manualStockMovementReviewDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "manual-stock-movement-review-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Manual Stock Movement Review dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function manualStockMovementReviewPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Manual Stock Movement Review Gate Foundation is active.",
    allowedMovementTypes: [
      "stock_deduction_review",
      "stock_reservation_review",
      "stock_release_review",
      "stock_count_check_review",
      "no_stock_change_review",
      "stock_return_review",
      "damaged_stock_review"
    ],
    rules: [
      "Manual Stock Movement Review Gate records review only.",
      "Manual deal outcome is required first.",
      "Admin reviewed deal outcome is required.",
      "Manual stock movement review approval is required.",
      "System does not update inventory automatically.",
      "System does not reduce stock automatically.",
      "System does not reserve stock automatically.",
      "System does not release stock automatically.",
      "System does not create stock ledger automatically.",
      "System does not handle payment.",
      "System does not send WhatsApp.",
      "Manual inventory update is required after review."
    ]
  });
}

async function recordManualStockMovementReviewController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = manualStockMovementReviewService.recordManualStockMovementReview(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "recorded",
      message: "Manual stock movement review recorded safely. The system did not update inventory, reduce stock, reserve stock, or create stock ledger.",
      stockMovementReview: result.stockMovementReview
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listManualStockMovementReviewsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    stockMovementReviews: manualStockMovementReviewService.listManualStockMovementReviews()
  });
}

function manualStockMovementReviewSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: manualStockMovementReviewService.getManualStockMovementReviewSummary()
  });
}

module.exports = {
  manualStockMovementReviewDashboardController,
  manualStockMovementReviewPreviewController,
  recordManualStockMovementReviewController,
  listManualStockMovementReviewsController,
  manualStockMovementReviewSummaryController
};

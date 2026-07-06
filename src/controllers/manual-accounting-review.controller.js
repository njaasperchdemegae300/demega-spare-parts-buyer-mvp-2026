const readJsonBody = require("../utils/read-json-body");
const manualAccountingReviewService = require("../services/manual-accounting-review.service");

function manualAccountingReviewPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Manual Accounting Review Gate Foundation is active.",
    allowedReviewTypes: [
      "payment_received_review",
      "payment_pending_review",
      "deposit_received_review",
      "cash_payment_review",
      "transfer_payment_review",
      "no_payment_review",
      "refund_review",
      "accounting_note_review"
    ],
    rules: [
      "Manual Accounting Review Gate records accounting review only.",
      "Manual stock movement review is required first.",
      "Admin reviewed stock movement is required.",
      "Manual accounting review approval is required.",
      "System does not create accounting entry automatically.",
      "System does not verify payment automatically.",
      "System does not generate receipt automatically.",
      "System does not create invoice automatically.",
      "System does not record revenue automatically.",
      "System does not move pipeline automatically.",
      "System does not update inventory automatically.",
      "System does not send WhatsApp.",
      "Manual accounting entry is required after review."
    ]
  });
}

async function recordManualAccountingReviewController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = manualAccountingReviewService.recordManualAccountingReview(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "recorded",
      message: "Manual accounting review recorded safely. The system did not create accounting entry, verify payment, generate receipt, create invoice, or record revenue.",
      accountingReview: result.accountingReview
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listManualAccountingReviewsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    accountingReviews: manualAccountingReviewService.listManualAccountingReviews()
  });
}

function manualAccountingReviewSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: manualAccountingReviewService.getManualAccountingReviewSummary()
  });
}

module.exports = {
  manualAccountingReviewPreviewController,
  recordManualAccountingReviewController,
  listManualAccountingReviewsController,
  manualAccountingReviewSummaryController
};

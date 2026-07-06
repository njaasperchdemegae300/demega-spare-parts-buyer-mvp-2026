const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const manualFinalBusinessReviewService = require("../services/manual-final-business-review.service");

function manualFinalBusinessReviewDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "manual-final-business-review-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Manual Final Business Review dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function manualFinalBusinessReviewPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Manual Final Business Review Gate Foundation is active.",
    allowedFinalReviewTypes: [
      "final_sale_completed_review",
      "final_sale_pending_review",
      "final_followup_needed_review",
      "final_cancelled_review",
      "final_refund_required_review",
      "final_accounting_pending_review",
      "final_stock_pending_review",
      "final_no_action_review"
    ],
    rules: [
      "Manual Final Business Review Gate records final review only.",
      "Manual accounting review is required first.",
      "Admin reviewed accounting is required.",
      "Manual final business review approval is required.",
      "System does not close sale automatically.",
      "System does not move pipeline automatically.",
      "System does not create accounting entry automatically.",
      "System does not generate receipt automatically.",
      "System does not record revenue automatically.",
      "System does not update inventory automatically.",
      "System does not send WhatsApp.",
      "Manual final business record is required after review."
    ]
  });
}

async function recordManualFinalBusinessReviewController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = manualFinalBusinessReviewService.recordManualFinalBusinessReview(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "recorded",
      message: "Manual final business review recorded safely. The system did not close sale, move pipeline, create accounting entry, record revenue, or update inventory.",
      finalBusinessReview: result.finalBusinessReview
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listManualFinalBusinessReviewsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    finalBusinessReviews: manualFinalBusinessReviewService.listManualFinalBusinessReviews()
  });
}

function manualFinalBusinessReviewSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: manualFinalBusinessReviewService.getManualFinalBusinessReviewSummary()
  });
}

module.exports = {
  manualFinalBusinessReviewDashboardController,
  manualFinalBusinessReviewPreviewController,
  recordManualFinalBusinessReviewController,
  listManualFinalBusinessReviewsController,
  manualFinalBusinessReviewSummaryController
};

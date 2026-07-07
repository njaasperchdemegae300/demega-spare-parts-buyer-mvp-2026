const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-manual-lead-review.service");

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getManualLeadReviewPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createManualLeadReview(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Manual lead review recorded safely. No buyer was contacted and no quote was prepared.",
      review: result.review
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    reviews: service.listManualLeadReviews()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getManualLeadReviewSummary()
  });
}

module.exports = {
  previewController,
  createController,
  listController,
  summaryController
};

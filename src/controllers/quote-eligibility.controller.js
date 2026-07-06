const readJsonBody = require("../utils/read-json-body");
const quoteEligibilityService = require("../services/quote-eligibility.service");

function quoteEligibilityPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Safe Final Quote Eligibility Gate Foundation is active.",
    rules: [
      "Eligibility check only.",
      "Manual quote draft is allowed only after stock and compatibility are both confirmed.",
      "No automatic quote creation.",
      "No price or quote amount at eligibility gate.",
      "No WhatsApp auto-send.",
      "No automatic buyer message.",
      "No automatic pipeline movement."
    ]
  });
}

async function createQuoteEligibilityCheckController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = quoteEligibilityService.createQuoteEligibilityCheck(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Safe final quote eligibility checked. Manual quote draft is allowed only if stock and compatibility are both confirmed.",
      eligibility: result.eligibility
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listQuoteEligibilitiesController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    eligibilities: quoteEligibilityService.listQuoteEligibilities()
  });
}

function quoteEligibilitySummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: quoteEligibilityService.getQuoteEligibilitySummary()
  });
}

module.exports = {
  quoteEligibilityPreviewController,
  createQuoteEligibilityCheckController,
  listQuoteEligibilitiesController,
  quoteEligibilitySummaryController
};

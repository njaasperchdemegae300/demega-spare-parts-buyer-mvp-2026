const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-final-quote-eligibility.service");

function dashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "controlled-buyer-gate-final-quote-eligibility-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Controlled Buyer-Gate Final Quote Eligibility dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getFinalQuoteEligibilityPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createFinalQuoteEligibility(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Final quote eligibility recorded safely. No buyer was contacted, no quote was prepared, no price was included, no quote was sent, and no inventory was changed.",
      record: result.record
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
    finalQuoteEligibilities: service.listFinalQuoteEligibilities()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getFinalQuoteEligibilitySummary()
  });
}

module.exports = {
  dashboardController,
  previewController,
  createController,
  listController,
  summaryController
};

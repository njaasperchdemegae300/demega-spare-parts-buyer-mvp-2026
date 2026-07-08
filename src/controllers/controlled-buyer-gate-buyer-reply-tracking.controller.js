const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-buyer-reply-tracking.service");

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getBuyerReplyTrackingPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createBuyerReplyTracking(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Buyer reply tracking recorded safely. Admin manually observed the reply outside the system; the system did not read WhatsApp, scrape messages, auto-reply, auto-follow-up, update inventory, create accounting, close sale, or move pipeline.",
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
    buyerReplyTrackings: service.listBuyerReplyTrackings()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getBuyerReplyTrackingSummary()
  });
}

module.exports = {
  previewController,
  createController,
  listController,
  summaryController
};

const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-manual-quote-draft.service");

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getManualQuoteDraftPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createManualQuoteDraft(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Manual quote draft prepared safely. Buyer was not contacted, WhatsApp was not sent, price was not sent to buyer, and inventory was not changed.",
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
    manualQuoteDrafts: service.listManualQuoteDrafts()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getManualQuoteDraftSummary()
  });
}

module.exports = {
  previewController,
  createController,
  listController,
  summaryController
};

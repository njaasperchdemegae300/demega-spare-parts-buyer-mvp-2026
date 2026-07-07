const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-manual-stock-check.service");

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getManualStockCheckPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createManualStockCheck(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Manual stock check recorded safely. No buyer was contacted, no quote was prepared, and no inventory was changed.",
      check: result.check
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
    stockChecks: service.listManualStockChecks()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getManualStockCheckSummary()
  });
}

module.exports = {
  previewController,
  createController,
  listController,
  summaryController
};

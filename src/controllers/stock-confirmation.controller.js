const readJsonBody = require("../utils/read-json-body");
const stockConfirmationService = require("../services/stock-confirmation.service");

function stockConfirmationPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Stock Confirmation Gate Foundation is active.",
    allowedStockStatus: stockConfirmationService.allowedStockStatus,
    allowedConfirmationMethods: stockConfirmationService.allowedConfirmationMethods,
    rules: [
      "Manual stock confirmation only.",
      "No quote at stock confirmation stage.",
      "Compatibility confirmation is still required before quote.",
      "No WhatsApp auto-send.",
      "No automatic buyer message.",
      "No automatic pipeline movement."
    ]
  });
}

async function createStockConfirmationController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = stockConfirmationService.createStockConfirmation(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Stock confirmation recorded safely. Compatibility confirmation is still required before quote.",
      confirmation: result.confirmation
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listStockConfirmationsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    confirmations: stockConfirmationService.listStockConfirmations()
  });
}

function stockConfirmationSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: stockConfirmationService.getStockConfirmationSummary()
  });
}

module.exports = {
  stockConfirmationPreviewController,
  createStockConfirmationController,
  listStockConfirmationsController,
  stockConfirmationSummaryController
};

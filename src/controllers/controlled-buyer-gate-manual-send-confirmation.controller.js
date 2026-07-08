const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-manual-send-confirmation.service");

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getManualSendConfirmationPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createManualSendConfirmation(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Manual send confirmation recorded safely. Admin manually sent outside the system; the system did not send WhatsApp, did not send quote, did not send price, did not read buyer messages, and did not change inventory.",
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
    manualSendConfirmations: service.listManualSendConfirmations()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getManualSendConfirmationSummary()
  });
}

module.exports = {
  previewController,
  createController,
  listController,
  summaryController
};

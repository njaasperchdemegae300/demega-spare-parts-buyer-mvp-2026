const readJsonBody = require("../utils/read-json-body");
const actionQueueService = require("../services/action-queue.service");

function actionQueuePreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Buyer Action Queue Foundation is active.",
    allowedActionTypes: actionQueueService.allowedActionTypes,
    allowedPriority: actionQueueService.allowedPriority,
    rules: [
      "Manual buyer actions only.",
      "No WhatsApp auto-send.",
      "No automatic buyer message.",
      "No automatic quote creation.",
      "No automatic pipeline movement."
    ]
  });
}

async function createActionController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = actionQueueService.createAction(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Buyer action created safely. Manual action is required.",
      action: result.action
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listActionsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    actions: actionQueueService.listActions()
  });
}

function actionQueueSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: actionQueueService.getActionQueueSummary()
  });
}

module.exports = {
  actionQueuePreviewController,
  createActionController,
  listActionsController,
  actionQueueSummaryController
};

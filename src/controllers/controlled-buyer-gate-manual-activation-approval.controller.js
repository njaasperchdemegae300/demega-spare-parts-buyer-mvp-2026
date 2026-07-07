const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-manual-activation-approval.service");

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getManualActivationApprovalPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createManualActivationApproval(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Manual activation approval recorded safely. Buyer gate was not opened and live traffic was not activated.",
      approval: result.approval
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
    approvals: service.listManualActivationApprovals()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getManualActivationApprovalSummary()
  });
}

module.exports = {
  previewController,
  createController,
  listController,
  summaryController
};

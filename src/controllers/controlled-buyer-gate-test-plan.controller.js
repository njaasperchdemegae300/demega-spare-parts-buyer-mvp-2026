const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-test-plan.service");

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getControlledBuyerGateTestPlanPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createControlledBuyerGateTestPlan(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, { status: "failed", errors: result.errors });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Controlled buyer-gate test plan created safely. Buyer gate was not opened.",
      plan: result.plan
    });
  } catch (error) {
    return sendJson(res, 400, { status: "failed", error: error.message });
  }
}

function listController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    plans: service.listControlledBuyerGateTestPlans()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getControlledBuyerGateTestPlanSummary()
  });
}

module.exports = {
  previewController,
  createController,
  listController,
  summaryController
};

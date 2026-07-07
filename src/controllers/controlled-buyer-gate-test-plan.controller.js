const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-test-plan.service");

function dashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "controlled-buyer-gate-test-plan-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Controlled Buyer-Gate Test Plan dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

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
  dashboardController,
  previewController,
  createController,
  listController,
  summaryController
};

const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-follow-up-decision.service");

function dashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "controlled-buyer-gate-follow-up-decision-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Controlled Buyer-Gate Follow-Up Decision dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getFollowUpDecisionPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createFollowUpDecision(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Follow-up decision recorded safely. Admin made a manual decision only; the system did not execute follow-up, did not send WhatsApp, did not auto-reply, did not auto-schedule, did not move pipeline, did not mutate inventory, did not create accounting records, and did not close sale.",
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
    followUpDecisions: service.listFollowUpDecisions()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getFollowUpDecisionSummary()
  });
}

module.exports = {
  dashboardController,
  previewController,
  createController,
  listController,
  summaryController
};

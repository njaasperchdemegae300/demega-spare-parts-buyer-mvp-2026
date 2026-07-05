const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const followUpService = require("../services/followup.service");

function followUpDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "followup-reminder-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Follow-up reminder dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function followUpPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Follow-Up Reminder Foundation is active.",
    allowedFollowUpTypes: followUpService.allowedFollowUpTypes,
    rules: [
      "Manual follow-up only.",
      "No WhatsApp auto-send.",
      "No automatic buyer message.",
      "Manual review remains required."
    ]
  });
}

async function createFollowUpController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = followUpService.createFollowUp(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Follow-up reminder created safely. Manual action is required.",
      followUp: result.followUp
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listFollowUpsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    followUps: followUpService.listFollowUps()
  });
}

function followUpSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: followUpService.getFollowUpSummary()
  });
}

module.exports = {
  followUpDashboardController,
  followUpPreviewController,
  createFollowUpController,
  listFollowUpsController,
  followUpSummaryController
};

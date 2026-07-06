const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const compatibilityConfirmationService = require("../services/compatibility-confirmation.service");

function compatibilityConfirmationDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "compatibility-confirmation-gate-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Compatibility Confirmation Gate dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function compatibilityConfirmationPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Compatibility Confirmation Gate Foundation is active.",
    allowedCompatibilityStatus: compatibilityConfirmationService.allowedCompatibilityStatus,
    allowedConfirmationMethods: compatibilityConfirmationService.allowedConfirmationMethods,
    rules: [
      "Manual compatibility confirmation only.",
      "Manual quote draft is allowed only after stock and compatibility are both confirmed.",
      "No automatic quote creation.",
      "No WhatsApp auto-send.",
      "No automatic buyer message.",
      "No automatic pipeline movement."
    ]
  });
}

async function createCompatibilityConfirmationController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = compatibilityConfirmationService.createCompatibilityConfirmation(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Compatibility confirmation recorded safely. Manual quote draft is allowed only if stock and compatibility are both confirmed.",
      confirmation: result.confirmation
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listCompatibilityConfirmationsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    confirmations: compatibilityConfirmationService.listCompatibilityConfirmations()
  });
}

function compatibilityConfirmationSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: compatibilityConfirmationService.getCompatibilityConfirmationSummary()
  });
}

module.exports = {
  compatibilityConfirmationDashboardController,
  compatibilityConfirmationPreviewController,
  createCompatibilityConfirmationController,
  listCompatibilityConfirmationsController,
  compatibilityConfirmationSummaryController
};

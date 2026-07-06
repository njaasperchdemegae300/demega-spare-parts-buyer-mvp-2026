const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const manualQuoteCopyService = require("../services/manual-quote-copy.service");

function manualQuoteCopyDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "manual-quote-copy-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Manual Quote Copy dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function manualQuoteCopyPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Manual Quote Copy Button Foundation is active.",
    rules: [
      "Prepare copy text only.",
      "Server does not access clipboard.",
      "Browser auto-copy is not used in this foundation.",
      "Manual quote draft must be draft-only.",
      "Final quote eligibility must already be passed.",
      "No WhatsApp auto-send.",
      "No automatic buyer message.",
      "No automatic browser opening.",
      "No automatic pipeline movement.",
      "No sent-to-buyer marking."
    ]
  });
}

async function prepareManualQuoteCopyController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = manualQuoteCopyService.prepareManualQuoteCopy(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "prepared",
      message: "Manual quote copy text prepared safely. It has not been sent to buyer.",
      copyAction: result.copyAction,
      copyText: result.copyAction.copyText
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listManualQuoteCopyActionsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    copyActions: manualQuoteCopyService.listManualQuoteCopyActions()
  });
}

function manualQuoteCopySummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: manualQuoteCopyService.getManualQuoteCopySummary()
  });
}

module.exports = {
  manualQuoteCopyDashboardController,
  manualQuoteCopyPreviewController,
  prepareManualQuoteCopyController,
  listManualQuoteCopyActionsController,
  manualQuoteCopySummaryController
};

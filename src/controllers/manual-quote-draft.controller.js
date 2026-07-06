const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const manualQuoteDraftService = require("../services/manual-quote-draft.service");

function manualQuoteDraftDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "manual-quote-draft-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Safe Manual Quote Draft dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function manualQuoteDraftPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Safe Manual Quote Draft Builder Foundation is active.",
    rules: [
      "Manual quote draft builder only.",
      "Final quote eligibility gate must pass before draft creation.",
      "Price may appear inside the draft only after eligibility is confirmed.",
      "No WhatsApp auto-send.",
      "No automatic buyer message.",
      "No automatic browser opening.",
      "No automatic pipeline movement.",
      "Manual review is required before sending anything to buyer."
    ]
  });
}

async function createManualQuoteDraftController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = manualQuoteDraftService.createManualQuoteDraft(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Safe manual quote draft created. It has not been sent to buyer.",
      draft: result.draft
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listManualQuoteDraftsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    drafts: manualQuoteDraftService.listManualQuoteDrafts()
  });
}

function manualQuoteDraftSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: manualQuoteDraftService.getManualQuoteDraftSummary()
  });
}

module.exports = {
  manualQuoteDraftDashboardController,
  manualQuoteDraftPreviewController,
  createManualQuoteDraftController,
  listManualQuoteDraftsController,
  manualQuoteDraftSummaryController
};

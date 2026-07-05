const readJsonBody = require("../utils/read-json-body");
const quoteDraftService = require("../services/quote-draft.service");

async function createQuoteDraftController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);

    if (!body.leadId || !body.inventoryItemId) {
      return sendJson(res, 400, {
        status: "failed",
        errors: ["leadId and inventoryItemId are required."]
      });
    }

    const result = quoteDraftService.createQuoteDraft(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "blocked",
        message: "Quote draft blocked by safety gates.",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Quote draft created safely. Manual review is required before sending.",
      draft: result.draft
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listQuoteDraftsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    quotes: quoteDraftService.listQuoteDrafts()
  });
}

function quoteSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: quoteDraftService.getQuoteSummary(),
    safety: {
      autoSendWhatsApp: false,
      quoteBeforeStockConfirmation: false,
      quoteBeforeCompatibilityConfirmation: false,
      manualReviewBeforeSend: true
    }
  });
}

function quotePreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Safe Auto Quote Draft Foundation is active.",
    rules: [
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "No WhatsApp auto-send.",
      "Manual review before buyer reply."
    ]
  });
}

module.exports = {
  createQuoteDraftController,
  listQuoteDraftsController,
  quoteSummaryController,
  quotePreviewController
};

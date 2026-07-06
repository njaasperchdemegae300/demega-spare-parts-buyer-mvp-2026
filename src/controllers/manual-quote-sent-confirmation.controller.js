const readJsonBody = require("../utils/read-json-body");
const sentConfirmationService = require("../services/manual-quote-sent-confirmation.service");

function manualQuoteSentConfirmationPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Manual Quote Sent Confirmation Gate Foundation is active.",
    allowedManualChannels: [
      "whatsapp_manual",
      "phone_call_manual",
      "sms_manual",
      "email_manual",
      "in_person_manual"
    ],
    rules: [
      "Confirmation record only.",
      "System does not send WhatsApp.",
      "System does not message buyer automatically.",
      "System does not open browser automatically.",
      "System does not access clipboard.",
      "System does not auto-copy.",
      "Prepared copy action is required.",
      "Manual admin sent confirmation is required.",
      "Manual review completed is required."
    ]
  });
}

async function confirmManualQuoteSentController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = sentConfirmationService.confirmManualQuoteSent(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "confirmed",
      message: "Manual quote sent confirmation recorded. The system did not send the buyer message.",
      confirmation: result.confirmation
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listManualQuoteSentConfirmationsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    confirmations: sentConfirmationService.listManualQuoteSentConfirmations()
  });
}

function manualQuoteSentConfirmationSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: sentConfirmationService.getManualQuoteSentConfirmationSummary()
  });
}

module.exports = {
  manualQuoteSentConfirmationPreviewController,
  confirmManualQuoteSentController,
  listManualQuoteSentConfirmationsController,
  manualQuoteSentConfirmationSummaryController
};

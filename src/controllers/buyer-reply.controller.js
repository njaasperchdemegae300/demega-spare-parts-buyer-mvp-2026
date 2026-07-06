const readJsonBody = require("../utils/read-json-body");
const buyerReplyService = require("../services/buyer-reply.service");

function buyerReplyPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Buyer Reply Tracking Foundation is active.",
    allowedReplyChannels: [
      "whatsapp_manual_observed",
      "phone_call_manual_observed",
      "sms_manual_observed",
      "email_manual_observed",
      "in_person_manual_observed"
    ],
    allowedReplyTypes: [
      "interested",
      "negotiating",
      "accepted_price",
      "rejected_price",
      "requested_discount",
      "asked_question",
      "requested_delivery",
      "needs_more_photos",
      "not_ready",
      "wrong_part",
      "closed_lost",
      "closed_won"
    ],
    rules: [
      "Buyer reply tracking is manual-entry only.",
      "Manual quote sent confirmation is required first.",
      "Admin must manually observe the buyer reply outside the system.",
      "System does not read WhatsApp messages.",
      "System does not scrape private messages.",
      "System does not harvest hidden data.",
      "System does not auto-reply to buyer.",
      "System does not send WhatsApp.",
      "System does not move pipeline automatically.",
      "Manual review is required before next action."
    ]
  });
}

async function recordBuyerReplyController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = buyerReplyService.recordBuyerReply(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "recorded",
      message: "Buyer reply recorded manually. The system did not read messages, reply, send WhatsApp, or move pipeline.",
      reply: result.reply
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listBuyerRepliesController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    replies: buyerReplyService.listBuyerReplies()
  });
}

function buyerReplySummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: buyerReplyService.getBuyerReplySummary()
  });
}

module.exports = {
  buyerReplyPreviewController,
  recordBuyerReplyController,
  listBuyerRepliesController,
  buyerReplySummaryController
};

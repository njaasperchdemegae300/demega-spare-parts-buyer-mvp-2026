const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const followupActionService = require("../services/buyer-reply-followup-action.service");

function buyerReplyFollowupActionDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "buyer-reply-followup-action-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Buyer Reply Follow-Up Action dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function buyerReplyFollowupActionPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Buyer Reply Follow-Up Action Gate Foundation is active.",
    allowedActionTypes: [
      "confirm_pickup_manual",
      "confirm_delivery_manual",
      "call_buyer_manual",
      "answer_question_manual",
      "send_more_photos_manual",
      "negotiate_price_manual",
      "request_payment_confirmation_manual",
      "reserve_stock_manual",
      "close_won_manual_review",
      "close_lost_manual_review",
      "schedule_followup_manual"
    ],
    rules: [
      "Follow-up action gate prepares manual action only.",
      "Buyer reply record is required first.",
      "Admin reviewed buyer reply is required.",
      "Manual action approval is required.",
      "System does not execute the action.",
      "System does not send WhatsApp.",
      "System does not auto-reply to buyer.",
      "System does not read WhatsApp messages.",
      "System does not scrape private messages.",
      "System does not move pipeline automatically.",
      "Manual review is required before execution."
    ]
  });
}

async function planBuyerReplyFollowupActionController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = followupActionService.planBuyerReplyFollowupAction(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "planned",
      message: "Buyer reply follow-up action planned safely. The system did not execute the action.",
      followupAction: result.followupAction
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listBuyerReplyFollowupActionsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    followupActions: followupActionService.listBuyerReplyFollowupActions()
  });
}

function buyerReplyFollowupActionSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: followupActionService.getBuyerReplyFollowupActionSummary()
  });
}

module.exports = {
  buyerReplyFollowupActionDashboardController,
  buyerReplyFollowupActionPreviewController,
  planBuyerReplyFollowupActionController,
  listBuyerReplyFollowupActionsController,
  buyerReplyFollowupActionSummaryController
};

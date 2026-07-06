const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const manualDealOutcomeService = require("../services/manual-deal-outcome.service");

function manualDealOutcomeDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "manual-deal-outcome-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Manual Deal Outcome dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function manualDealOutcomePreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Manual Deal Outcome Gate Foundation is active.",
    allowedOutcomeTypes: [
      "deal_won_manual",
      "deal_lost_manual",
      "pickup_confirmed_manual",
      "delivery_arranged_manual",
      "stock_reserved_manual",
      "payment_pending_manual",
      "buyer_requested_later_manual",
      "no_response_manual",
      "wrong_part_manual",
      "price_rejected_manual",
      "needs_more_followup_manual"
    ],
    rules: [
      "Manual Deal Outcome Gate records outcome only.",
      "Follow-up action record is required first.",
      "Admin completed manual action is required.",
      "Manual outcome approval is required.",
      "System does not close sale automatically.",
      "System does not move pipeline automatically.",
      "System does not send WhatsApp.",
      "System does not auto-reply to buyer.",
      "System does not handle payment.",
      "System does not change stock.",
      "System does not read buyer messages.",
      "Manual review is required before accounting, pipeline, or stock update."
    ]
  });
}

async function recordManualDealOutcomeController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = manualDealOutcomeService.recordManualDealOutcome(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "recorded",
      message: "Manual deal outcome recorded safely. The system did not close sale, move pipeline, handle payment, or change stock.",
      dealOutcome: result.dealOutcome
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listManualDealOutcomesController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    dealOutcomes: manualDealOutcomeService.listManualDealOutcomes()
  });
}

function manualDealOutcomeSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: manualDealOutcomeService.getManualDealOutcomeSummary()
  });
}

module.exports = {
  manualDealOutcomeDashboardController,
  manualDealOutcomePreviewController,
  recordManualDealOutcomeController,
  listManualDealOutcomesController,
  manualDealOutcomeSummaryController
};

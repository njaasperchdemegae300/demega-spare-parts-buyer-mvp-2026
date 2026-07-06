const hotBuyerService = require("../services/hot-buyer.service");

function hotBuyerPreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Hot Buyer Command Center Foundation is active.",
    rules: [
      "Read-only hot buyer ranking.",
      "Manual action only.",
      "No WhatsApp auto-send.",
      "No automatic buyer message.",
      "No automatic quote creation.",
      "No automatic pipeline movement."
    ]
  });
}

function listHotBuyersController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    hotBuyers: hotBuyerService.listHotBuyers()
  });
}

function hotBuyerSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: hotBuyerService.getHotBuyerSummary()
  });
}

module.exports = {
  hotBuyerPreviewController,
  listHotBuyersController,
  hotBuyerSummaryController
};

const fs = require("fs");
const path = require("path");
const hotBuyerService = require("../services/hot-buyer.service");

function hotBuyerDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "hot-buyer-command-center.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Hot Buyer Command Center dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

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
  hotBuyerDashboardController,
  hotBuyerPreviewController,
  listHotBuyersController,
  hotBuyerSummaryController
};

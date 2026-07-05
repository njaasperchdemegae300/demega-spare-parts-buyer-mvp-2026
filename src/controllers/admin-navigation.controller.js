const fs = require("fs");
const path = require("path");

const modules = [
  {
    name: "Buyer Lead Dashboard",
    path: "/dashboard",
    purpose: "Captured buyer leads, scoring, and manual review."
  },
  {
    name: "Inventory Command Center",
    path: "/inventory",
    purpose: "Inventory list, stock status, and quote-blocking safety."
  },
  {
    name: "Quote Draft Dashboard",
    path: "/quotes",
    purpose: "Draft-only quote messages with manual review."
  },
  {
    name: "Buyer Pipeline Dashboard",
    path: "/pipeline",
    purpose: "Manual buyer-stage tracking and event history."
  },
  {
    name: "Follow-Up Reminder Dashboard",
    path: "/followups",
    purpose: "Manual follow-up reminder tracking."
  }
];

function adminNavigationHubController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "admin-navigation-hub.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Admin navigation hub file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function adminNavigationSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Admin Navigation Hub Foundation is active.",
    modules,
    safety: {
      navigationOnly: true,
      autoSendWhatsApp: false,
      autoCreateQuote: false,
      autoMovePipelineStage: false,
      manualReviewRequired: true,
      quoteBeforeStockConfirmation: false,
      quoteBeforeCompatibilityConfirmation: false
    }
  });
}

module.exports = {
  adminNavigationHubController,
  adminNavigationSummaryController
};

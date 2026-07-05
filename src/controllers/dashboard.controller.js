const fs = require("fs");
const path = require("path");
const dataStore = require("../services/data-store");

function adminDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "admin-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Admin dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function dashboardSummaryController(req, res, sendJson) {
  const leads = dataStore.readCollection("leads");

  const byStatus = {};
  const bySource = {};
  let manualReviewRequired = 0;
  let possibleDuplicates = 0;
  let hotLeads = 0;
  let warmLeads = 0;
  let coldLeads = 0;

  for (const lead of leads) {
    byStatus[lead.status || "unknown"] = (byStatus[lead.status || "unknown"] || 0) + 1;
    bySource[lead.source || "unknown"] = (bySource[lead.source || "unknown"] || 0) + 1;

    if (lead.manualReviewRequired === true) manualReviewRequired += 1;
    if (lead.duplicateStatus === "possible_duplicate") possibleDuplicates += 1;

    if (lead.temperature === "hot") hotLeads += 1;
    else if (lead.temperature === "warm") warmLeads += 1;
    else coldLeads += 1;
  }

  return sendJson(res, 200, {
    status: "ok",
    dashboard: "Admin Lead Dashboard",
    totalLeads: leads.length,
    manualReviewRequired,
    possibleDuplicates,
    hotLeads,
    warmLeads,
    coldLeads,
    byStatus,
    bySource,
    safety: {
      autoSendWhatsApp: false,
      quoteBeforeStockConfirmation: false,
      quoteBeforeCompatibilityConfirmation: false
    }
  });
}

module.exports = {
  adminDashboardController,
  dashboardSummaryController
};

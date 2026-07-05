const buyerScoring = require("../services/buyer-scoring.service");
const dataStore = require("../services/data-store");

function scoringPreviewController(req, res, sendJson) {
  const sample = {
    source: "whatsapp_inbound",
    partNeeded: "1ZZ alternator",
    location: "Lagos",
    urgency: "urgent",
    message: "Need 1ZZ alternator urgently today.",
    duplicateStatus: "unique",
    phone: "08000000000"
  };

  return sendJson(res, 200, {
    status: "ok",
    message: "Buyer scoring engine is working.",
    sampleScore: buyerScoring.calculateBuyerScore(sample)
  });
}

function scoringSummaryController(req, res, sendJson) {
  const leads = dataStore.readCollection("leads");

  const summary = {
    total: leads.length,
    hot: 0,
    warm: 0,
    cold: 0
  };

  for (const lead of leads) {
    if (lead.temperature === "hot") summary.hot += 1;
    else if (lead.temperature === "warm") summary.warm += 1;
    else summary.cold += 1;
  }

  return sendJson(res, 200, {
    status: "ok",
    summary
  });
}

module.exports = {
  scoringPreviewController,
  scoringSummaryController
};

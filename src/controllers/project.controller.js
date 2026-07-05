const config = require("../config/app-config");

function projectStatusController(req, res, sendJson) {
  sendJson(res, 200, {
    project: config.appName,
    currentVersion: "Version 1A",
    currentPhase: "Backend Server Foundation",
    verdict: "RUNNING",
    nextTarget: "Version 1B — Basic data storage foundation",
    safety: {
      autoSend: false,
      spam: false,
      privateDataScraping: false,
      quoteBeforeStockConfirmation: false,
      quoteBeforeCompatibilityConfirmation: false
    }
  });
}

module.exports = projectStatusController;

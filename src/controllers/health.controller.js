const config = require("../config/app-config");

function healthController(req, res, sendJson) {
  sendJson(res, 200, {
    status: "ok",
    app: config.appName,
    version: config.version,
    environment: config.environment,
    message: "Backend server foundation is working."
  });
}

module.exports = healthController;

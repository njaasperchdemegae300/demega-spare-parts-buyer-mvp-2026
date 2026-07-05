const healthController = require("../controllers/health.controller");
const projectStatusController = require("../controllers/project.controller");
const storageStatusController = require("../controllers/storage.controller");
const buyerIntakeController = require("../controllers/buyer-intake.controller");
const dashboardController = require("../controllers/dashboard.controller");
const sendHtml = require("../utils/send-html");

function routeRequest(req, res, sendJson) {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (method === "GET" && url.pathname === "/") {
    return sendJson(res, 200, {
      app: "Demega Spare Parts Buyer MVP 2026",
      status: "running",
      message: "Small Smart Backend Server Foundation is alive.",
      routes: [
        "/",
        "/dashboard",
        "/admin",
        "/api/health",
        "/api/project-status",
        "/api/storage/status",
        "/api/dashboard/summary",
        "POST /api/buyer-intake",
        "GET /api/leads"
      ]
    });
  }

  if (method === "GET" && (url.pathname === "/dashboard" || url.pathname === "/admin")) {
    return dashboardController.adminDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/dashboard/summary") {
    return dashboardController.dashboardSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/health") {
    return healthController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/project-status") {
    return projectStatusController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/storage/status") {
    return storageStatusController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/buyer-intake") {
    return buyerIntakeController.createBuyerLeadController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/leads") {
    return buyerIntakeController.listBuyerLeadsController(req, res, sendJson);
  }

  return sendJson(res, 404, {
    error: "Route not found",
    method,
    path: url.pathname
  });
}

module.exports = routeRequest;

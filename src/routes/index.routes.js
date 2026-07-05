const healthController = require("../controllers/health.controller");
const projectStatusController = require("../controllers/project.controller");
const storageStatusController = require("../controllers/storage.controller");
const buyerIntakeController = require("../controllers/buyer-intake.controller");
const dashboardController = require("../controllers/dashboard.controller");
const scoringController = require("../controllers/scoring.controller");
const inventoryController = require("../controllers/inventory.controller");
const inventoryMatchingController = require("../controllers/inventory-matching.controller");
const quoteDraftController = require("../controllers/quote-draft.controller");
const buyerPipelineController = require("../controllers/buyer-pipeline.controller");
const followUpController = require("../controllers/followup.controller");
const adminNavigationController = require("../controllers/admin-navigation.controller");
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
        "/admin-navigation-hub",
        "/admin-hub",
        "/dashboard",
        "/admin",
        "/inventory",
        "/quotes",
        "/quote-drafts",
        "/pipeline",
        "/buyer-pipeline",
        "/followups",
        "/follow-up-reminders",
        "/api/admin-navigation/summary",
        "/api/admin-navigation/dashboard-metrics",
        "/api/health",
        "/api/project-status",
        "/api/storage/status",
        "/api/dashboard/summary",
        "/api/scoring/preview",
        "/api/scoring/summary",
        "/api/inventory",
        "/api/inventory/summary",
        "/api/inventory/match-preview",
        "/api/quotes",
        "/api/quotes/summary",
        "/api/quotes/preview",
        "/api/pipeline/preview",
        "/api/pipeline/summary",
        "/api/pipeline/events",
        "/api/followups/preview",
        "/api/followups",
        "/api/followups/summary",
        "POST /api/buyer-intake",
        "POST /api/inventory",
        "POST /api/inventory/match",
        "POST /api/quotes/draft",
        "POST /api/pipeline/move",
        "POST /api/followups/create",
        "GET /api/leads"
      ]
    });
  }

  if (method === "GET" && (url.pathname === "/admin-navigation-hub" || url.pathname === "/admin-hub")) {
    return adminNavigationController.adminNavigationHubController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/admin-navigation/summary") {
    return adminNavigationController.adminNavigationSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/admin-navigation/dashboard-metrics") {
    return adminNavigationController.adminNavigationDashboardMetricsController(req, res, sendJson);
  }

  if (method === "GET" && (url.pathname === "/dashboard" || url.pathname === "/admin")) {
    return dashboardController.adminDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/inventory") {
    return inventoryController.inventoryPageController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/quotes" || url.pathname === "/quote-drafts")) {
    return quoteDraftController.quoteDraftDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/pipeline" || url.pathname === "/buyer-pipeline")) {
    return buyerPipelineController.buyerPipelineDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && (url.pathname === "/followups" || url.pathname === "/follow-up-reminders")) {
    return followUpController.followUpDashboardController(req, res, sendJson, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/dashboard/summary") {
    return dashboardController.dashboardSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/scoring/preview") {
    return scoringController.scoringPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/scoring/summary") {
    return scoringController.scoringSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/inventory") {
    return inventoryController.listInventoryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/inventory") {
    return inventoryController.createInventoryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/inventory/summary") {
    return inventoryController.inventorySummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/inventory/match-preview") {
    return inventoryMatchingController.matchingPreviewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/inventory/match") {
    return inventoryMatchingController.matchInventoryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/quotes/draft") {
    return quoteDraftController.createQuoteDraftController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quotes") {
    return quoteDraftController.listQuoteDraftsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quotes/summary") {
    return quoteDraftController.quoteSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quotes/preview") {
    return quoteDraftController.quotePreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/pipeline/preview") {
    return buyerPipelineController.pipelinePreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/pipeline/summary") {
    return buyerPipelineController.pipelineSummaryController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/pipeline/events") {
    return buyerPipelineController.pipelineEventsController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/pipeline/move") {
    return buyerPipelineController.moveLeadStageController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/followups/preview") {
    return followUpController.followUpPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/followups") {
    return followUpController.listFollowUpsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/followups/summary") {
    return followUpController.followUpSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/followups/create") {
    return followUpController.createFollowUpController(req, res, sendJson);
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

const healthController = require("../controllers/health.controller");
const projectStatusController = require("../controllers/project.controller");

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
        "/api/health",
        "/api/project-status"
      ]
    });
  }

  if (method === "GET" && url.pathname === "/api/health") {
    return healthController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/project-status") {
    return projectStatusController(req, res, sendJson);
  }

  return sendJson(res, 404, {
    error: "Route not found",
    method,
    path: url.pathname
  });
}

module.exports = routeRequest;

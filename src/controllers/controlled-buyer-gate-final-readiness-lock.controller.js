const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-final-readiness-lock.service");

function dashboardController(req, res) {
  const filePath = path.join(process.cwd(), "public", "controlled-buyer-gate-final-readiness-lock-dashboard.html");
  const html = fs.readFileSync(filePath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  return res.end(html);
}

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getFinalReadinessLockPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createFinalReadinessLock(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Final readiness lock recorded safely. This does not open live traffic, does not contact buyers, does not send WhatsApp, does not auto-reply, does not auto-follow-up, does not mutate inventory, does not create accounting records, does not close sale, and does not move pipeline.",
      record: result.record
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    finalReadinessLocks: service.listFinalReadinessLocks()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getFinalReadinessLockSummary()
  });
}

module.exports = {
  dashboardController,
  previewController,
  createController,
  listController,
  summaryController
};

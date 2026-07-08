const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-real-buyer-gate-opening-preparation.service");

function dashboardController(req, res) {
  const filePath = path.join(process.cwd(), "public", "controlled-real-buyer-gate-opening-preparation-dashboard.html");
  const html = fs.readFileSync(filePath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  return res.end(html);
}

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getOpeningPreparationPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createOpeningPreparation(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Controlled real-buyer gate opening preparation recorded safely. This does not open live traffic, does not contact buyers, does not send WhatsApp, does not start ads, does not publish lead forms, does not auto-reply, does not auto-follow-up, does not mutate inventory, does not create accounting records, does not close sale, and does not move pipeline.",
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
    openingPreparations: service.listOpeningPreparations()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getOpeningPreparationSummary()
  });
}

module.exports = {
  dashboardController,
  previewController,
  createController,
  listController,
  summaryController
};

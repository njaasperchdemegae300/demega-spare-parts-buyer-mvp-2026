const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-15-lead-proof-test.service");

function dashboardController(req, res) {
  const filePath = path.join(process.cwd(), "public", "controlled-15-lead-proof-test-dashboard.html");
  const html = fs.readFileSync(filePath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  return res.end(html);
}

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getPreview());
}

async function createManualLeadController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createManualLead(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Controlled 15-lead proof-test inbound buyer request recorded manually. This does not contact buyer, does not send WhatsApp, does not auto-reply, does not auto-follow-up, does not quote, does not mutate inventory, does not create accounting records, does not close sale, and does not move pipeline.",
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
    leads: service.listLeads()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getSummary()
  });
}

module.exports = {
  dashboardController,
  previewController,
  createManualLeadController,
  listController,
  summaryController
};

const readJsonBody = require("../utils/read-json-body");
const service = require("../services/controlled-buyer-gate-lead-slot-enforcement.service");

function previewController(req, res, sendJson) {
  return sendJson(res, 200, service.getLeadSlotPreview());
}

async function createController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = service.createLeadSlot(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "created",
      message: "Controlled inbound lead slot accepted for manual review only. No buyer was contacted and no outbound traffic was started.",
      slot: result.slot
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
    slots: service.listLeadSlots()
  });
}

function summaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: service.getLeadSlotSummary()
  });
}

module.exports = {
  previewController,
  createController,
  listController,
  summaryController
};

const fs = require("fs");
const path = require("path");
const readJsonBody = require("../utils/read-json-body");
const pipelineService = require("../services/buyer-pipeline.service");

function buyerPipelineDashboardController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "buyer-pipeline-dashboard.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Buyer pipeline dashboard file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function pipelinePreviewController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Buyer Pipeline Foundation is active.",
    allowedStages: pipelineService.allowedStages,
    rules: [
      "Manual stage movement only.",
      "No WhatsApp auto-send.",
      "No automatic quote creation.",
      "Manual review remains required."
    ]
  });
}

function pipelineSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: pipelineService.getPipelineSummary()
  });
}

function pipelineEventsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    events: pipelineService.listPipelineEvents()
  });
}

async function moveLeadStageController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = pipelineService.moveLeadStage(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 200, {
      status: "updated",
      message: "Lead moved safely in buyer pipeline. Manual action only.",
      lead: result.lead,
      event: result.event
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

module.exports = {
  buyerPipelineDashboardController,
  pipelinePreviewController,
  pipelineSummaryController,
  pipelineEventsController,
  moveLeadStageController
};

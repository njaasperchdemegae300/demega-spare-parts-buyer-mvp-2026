const readJsonBody = require("../utils/read-json-body");
const assistantSalesAgentTestLabService = require("../services/assistant-sales-agent-test-lab.service");

function assistantSalesAgentTestLabPreviewController(req, res, sendJson) {
  return sendJson(res, 200, assistantSalesAgentTestLabService.getAssistantSalesAgentTestLabPreview());
}

async function runAssistantSalesAgentTestLabController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = assistantSalesAgentTestLabService.runAssistantSalesAgentTestLab(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "completed",
      message: "Assistant Sales Agent readiness test completed safely. No live buyer was contacted and no WhatsApp message was sent.",
      run: result.run
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listAssistantSalesAgentTestRunsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    runs: assistantSalesAgentTestLabService.listAssistantSalesAgentTestRuns()
  });
}

function assistantSalesAgentTestLabSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: assistantSalesAgentTestLabService.getAssistantSalesAgentTestLabSummary()
  });
}

module.exports = {
  assistantSalesAgentTestLabPreviewController,
  runAssistantSalesAgentTestLabController,
  listAssistantSalesAgentTestRunsController,
  assistantSalesAgentTestLabSummaryController
};

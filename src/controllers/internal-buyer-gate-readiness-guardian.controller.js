const readJsonBody = require("../utils/read-json-body");
const internalBuyerGateReadinessGuardianService = require("../services/internal-buyer-gate-readiness-guardian.service");

function internalBuyerGateReadinessPreviewController(req, res, sendJson) {
  return sendJson(res, 200, internalBuyerGateReadinessGuardianService.getInternalBuyerGateReadinessPreview());
}

async function runInternalBuyerGateReadinessController(req, res, sendJson) {
  try {
    const body = await readJsonBody(req);
    const result = internalBuyerGateReadinessGuardianService.runInternalBuyerGateReadinessGuardian(body);

    if (!result.ok) {
      return sendJson(res, result.statusCode, {
        status: "failed",
        errors: result.errors
      });
    }

    return sendJson(res, 201, {
      status: "completed",
      message: "Internal buyer-gate readiness check completed safely. No live buyer gate was opened and no real buyer was contacted.",
      run: result.run
    });
  } catch (error) {
    return sendJson(res, 400, {
      status: "failed",
      error: error.message
    });
  }
}

function listInternalBuyerGateReadinessRunsController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    runs: internalBuyerGateReadinessGuardianService.listInternalBuyerGateReadinessRuns()
  });
}

function internalBuyerGateReadinessSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: internalBuyerGateReadinessGuardianService.getInternalBuyerGateReadinessSummary()
  });
}

module.exports = {
  internalBuyerGateReadinessPreviewController,
  runInternalBuyerGateReadinessController,
  listInternalBuyerGateReadinessRunsController,
  internalBuyerGateReadinessSummaryController
};

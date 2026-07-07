const projectSourceOfTruthService = require("../services/project-source-of-truth.service");

function projectSourceOfTruthPreviewController(req, res, sendJson) {
  return sendJson(res, 200, projectSourceOfTruthService.getProjectSourceOfTruthPreview());
}

function projectSourceOfTruthFilesController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    files: projectSourceOfTruthService.listProjectSourceOfTruthFiles()
  });
}

function projectSourceOfTruthSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    summary: projectSourceOfTruthService.getProjectSourceOfTruthSummary()
  });
}

module.exports = {
  projectSourceOfTruthPreviewController,
  projectSourceOfTruthFilesController,
  projectSourceOfTruthSummaryController
};

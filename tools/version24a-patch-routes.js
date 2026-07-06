const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('manual-final-business-review.controller')) {
  const requireLine = 'const manualFinalBusinessReviewController = require("../controllers/manual-final-business-review.controller");\n';

  if (src.includes('const manualAccountingReviewController = require("../controllers/manual-accounting-review.controller");')) {
    src = src.replace(
      'const manualAccountingReviewController = require("../controllers/manual-accounting-review.controller");',
      'const manualAccountingReviewController = require("../controllers/manual-accounting-review.controller");\n' + requireLine.trimEnd()
    );
  } else {
    const lastRequire = src.lastIndexOf('require("../controllers/');
    if (lastRequire !== -1) {
      const lineEnd = src.indexOf("\n", lastRequire);
      src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
    } else {
      src = requireLine + src;
    }
  }
}

if (!src.includes('"/api/manual-final-business-review/preview"') && src.includes('"/api/manual-accounting-review/summary",')) {
  src = src.replace(
    '"/api/manual-accounting-review/summary",',
    '"/api/manual-accounting-review/summary",\n        "/api/manual-final-business-review/preview",\n        "/api/manual-final-business-reviews",\n        "/api/manual-final-business-review/summary",'
  );
}

if (!src.includes('"POST /api/manual-final-business-review/record"') && src.includes('"POST /api/manual-accounting-review/record",')) {
  src = src.replace(
    '"POST /api/manual-accounting-review/record",',
    '"POST /api/manual-accounting-review/record",\n        "POST /api/manual-final-business-review/record",'
  );
}

const routeBlock = `  if (method === "GET" && url.pathname === "/api/manual-final-business-review/preview") {
    return manualFinalBusinessReviewController.manualFinalBusinessReviewPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-final-business-reviews") {
    return manualFinalBusinessReviewController.listManualFinalBusinessReviewsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-final-business-review/summary") {
    return manualFinalBusinessReviewController.manualFinalBusinessReviewSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-final-business-review/record") {
    return manualFinalBusinessReviewController.recordManualFinalBusinessReviewController(req, res, sendJson);
  }

`;

if (!src.includes("manualFinalBusinessReviewPreviewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/manual-accounting-review/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, routeBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for manual final business review routes.");
    }

    src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(routeFile, src, "utf8");

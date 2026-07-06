const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('manual-accounting-review.controller')) {
  const requireLine = 'const manualAccountingReviewController = require("../controllers/manual-accounting-review.controller");\n';

  if (src.includes('const manualStockMovementReviewController = require("../controllers/manual-stock-movement-review.controller");')) {
    src = src.replace(
      'const manualStockMovementReviewController = require("../controllers/manual-stock-movement-review.controller");',
      'const manualStockMovementReviewController = require("../controllers/manual-stock-movement-review.controller");\n' + requireLine.trimEnd()
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

if (!src.includes('"/api/manual-accounting-review/preview"') && src.includes('"/api/manual-stock-movement-review/summary",')) {
  src = src.replace(
    '"/api/manual-stock-movement-review/summary",',
    '"/api/manual-stock-movement-review/summary",\n        "/api/manual-accounting-review/preview",\n        "/api/manual-accounting-reviews",\n        "/api/manual-accounting-review/summary",'
  );
}

if (!src.includes('"POST /api/manual-accounting-review/record"') && src.includes('"POST /api/manual-stock-movement-review/record",')) {
  src = src.replace(
    '"POST /api/manual-stock-movement-review/record",',
    '"POST /api/manual-stock-movement-review/record",\n        "POST /api/manual-accounting-review/record",'
  );
}

const routeBlock = `  if (method === "GET" && url.pathname === "/api/manual-accounting-review/preview") {
    return manualAccountingReviewController.manualAccountingReviewPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-accounting-reviews") {
    return manualAccountingReviewController.listManualAccountingReviewsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-accounting-review/summary") {
    return manualAccountingReviewController.manualAccountingReviewSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-accounting-review/record") {
    return manualAccountingReviewController.recordManualAccountingReviewController(req, res, sendJson);
  }

`;

if (!src.includes("manualAccountingReviewPreviewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/manual-stock-movement-review/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, routeBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for manual accounting review routes.");
    }

    src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(routeFile, src, "utf8");

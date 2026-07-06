const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('manual-stock-movement-review.controller')) {
  const requireLine = 'const manualStockMovementReviewController = require("../controllers/manual-stock-movement-review.controller");\n';

  if (src.includes('const manualDealOutcomeController = require("../controllers/manual-deal-outcome.controller");')) {
    src = src.replace(
      'const manualDealOutcomeController = require("../controllers/manual-deal-outcome.controller");',
      'const manualDealOutcomeController = require("../controllers/manual-deal-outcome.controller");\n' + requireLine.trimEnd()
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

if (!src.includes('"/api/manual-stock-movement-review/preview"') && src.includes('"/api/manual-deal-outcome/summary",')) {
  src = src.replace(
    '"/api/manual-deal-outcome/summary",',
    '"/api/manual-deal-outcome/summary",\n        "/api/manual-stock-movement-review/preview",\n        "/api/manual-stock-movement-reviews",\n        "/api/manual-stock-movement-review/summary",'
  );
}

if (!src.includes('"POST /api/manual-stock-movement-review/record"') && src.includes('"POST /api/manual-deal-outcome/record",')) {
  src = src.replace(
    '"POST /api/manual-deal-outcome/record",',
    '"POST /api/manual-deal-outcome/record",\n        "POST /api/manual-stock-movement-review/record",'
  );
}

const routeBlock = `  if (method === "GET" && url.pathname === "/api/manual-stock-movement-review/preview") {
    return manualStockMovementReviewController.manualStockMovementReviewPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-stock-movement-reviews") {
    return manualStockMovementReviewController.listManualStockMovementReviewsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-stock-movement-review/summary") {
    return manualStockMovementReviewController.manualStockMovementReviewSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-stock-movement-review/record") {
    return manualStockMovementReviewController.recordManualStockMovementReviewController(req, res, sendJson);
  }

`;

if (!src.includes("manualStockMovementReviewPreviewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/manual-deal-outcome/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, routeBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for manual stock movement review routes.");
    }

    src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(routeFile, src, "utf8");

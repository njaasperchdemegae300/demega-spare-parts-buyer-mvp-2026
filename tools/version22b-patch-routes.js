const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/manual-stock-movement-review"')) {
  if (src.includes('"/manual-deal-outcomes",')) {
    src = src.replace(
      '"/manual-deal-outcomes",',
      '"/manual-deal-outcomes",\n        "/manual-stock-movement-review",\n        "/manual-stock-movement-reviews",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/manual-stock-movement-review/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/manual-stock-movement-review" || url.pathname === "/manual-stock-movement-reviews")) {
    return manualStockMovementReviewController.manualStockMovementReviewDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("manualStockMovementReviewDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find manual stock movement review preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

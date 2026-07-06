const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/manual-accounting-review"')) {
  if (src.includes('"/manual-stock-movement-reviews",')) {
    src = src.replace(
      '"/manual-stock-movement-reviews",',
      '"/manual-stock-movement-reviews",\n        "/manual-accounting-review",\n        "/manual-accounting-reviews",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/manual-accounting-review/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/manual-accounting-review" || url.pathname === "/manual-accounting-reviews")) {
    return manualAccountingReviewController.manualAccountingReviewDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("manualAccountingReviewDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find manual accounting review preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

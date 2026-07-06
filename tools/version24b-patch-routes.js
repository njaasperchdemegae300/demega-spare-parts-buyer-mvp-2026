const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/manual-final-business-review"')) {
  if (src.includes('"/manual-accounting-reviews",')) {
    src = src.replace(
      '"/manual-accounting-reviews",',
      '"/manual-accounting-reviews",\n        "/manual-final-business-review",\n        "/manual-final-business-reviews",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/manual-final-business-review/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/manual-final-business-review" || url.pathname === "/manual-final-business-reviews")) {
    return manualFinalBusinessReviewController.manualFinalBusinessReviewDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("manualFinalBusinessReviewDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find manual final business review preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

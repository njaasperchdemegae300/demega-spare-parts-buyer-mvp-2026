const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-manual-lead-review"')) {
  if (src.includes('"/controlled-buyer-gate-lead-slots",')) {
    src = src.replace(
      '"/controlled-buyer-gate-lead-slots",',
      '"/controlled-buyer-gate-lead-slots",\n        "/controlled-buyer-gate-manual-lead-review",\n        "/controlled-buyer-gate-manual-lead-reviews",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-lead-review/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-lead-review" || url.pathname === "/controlled-buyer-gate-manual-lead-reviews")) {
    return controlledBuyerGateManualLeadReviewController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateManualLeadReviewController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Manual Lead Review preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 31B Controlled Buyer-Gate Manual Lead Review dashboard routes patched.");

const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-buyer-reply-tracking"')) {
  if (src.includes('"/controlled-buyer-gate-manual-send-confirmations",')) {
    src = src.replace(
      '"/controlled-buyer-gate-manual-send-confirmations",',
      '"/controlled-buyer-gate-manual-send-confirmations",\n        "/controlled-buyer-gate-buyer-reply-tracking",\n        "/controlled-buyer-gate-buyer-reply-trackings",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-buyer-reply-tracking/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-buyer-reply-tracking" || url.pathname === "/controlled-buyer-gate-buyer-reply-trackings")) {
    return controlledBuyerGateBuyerReplyTrackingController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateBuyerReplyTrackingController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Buyer Reply Tracking preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 37B Controlled Buyer-Gate Buyer Reply Tracking dashboard routes patched.");

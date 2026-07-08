const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-manual-send-confirmation"')) {
  if (src.includes('"/controlled-buyer-gate-manual-quote-drafts",')) {
    src = src.replace(
      '"/controlled-buyer-gate-manual-quote-drafts",',
      '"/controlled-buyer-gate-manual-quote-drafts",\n        "/controlled-buyer-gate-manual-send-confirmation",\n        "/controlled-buyer-gate-manual-send-confirmations",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-send-confirmation/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-send-confirmation" || url.pathname === "/controlled-buyer-gate-manual-send-confirmations")) {
    return controlledBuyerGateManualSendConfirmationController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateManualSendConfirmationController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Manual Send Confirmation preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 36B Controlled Buyer-Gate Manual Send Confirmation dashboard routes patched.");

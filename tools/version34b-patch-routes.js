const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-final-quote-eligibility"')) {
  if (src.includes('"/controlled-buyer-gate-manual-compatibility-checks",')) {
    src = src.replace(
      '"/controlled-buyer-gate-manual-compatibility-checks",',
      '"/controlled-buyer-gate-manual-compatibility-checks",\n        "/controlled-buyer-gate-final-quote-eligibility",\n        "/controlled-buyer-gate-final-quote-eligibilities",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-final-quote-eligibility/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-final-quote-eligibility" || url.pathname === "/controlled-buyer-gate-final-quote-eligibilities")) {
    return controlledBuyerGateFinalQuoteEligibilityController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateFinalQuoteEligibilityController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Final Quote Eligibility preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 34B Controlled Buyer-Gate Final Quote Eligibility dashboard routes patched.");

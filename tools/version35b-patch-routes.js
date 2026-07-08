const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-manual-quote-draft"')) {
  if (src.includes('"/controlled-buyer-gate-final-quote-eligibilities",')) {
    src = src.replace(
      '"/controlled-buyer-gate-final-quote-eligibilities",',
      '"/controlled-buyer-gate-final-quote-eligibilities",\n        "/controlled-buyer-gate-manual-quote-draft",\n        "/controlled-buyer-gate-manual-quote-drafts",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-quote-draft/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-quote-draft" || url.pathname === "/controlled-buyer-gate-manual-quote-drafts")) {
    return controlledBuyerGateManualQuoteDraftController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateManualQuoteDraftController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Manual Quote Draft preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 35B Controlled Buyer-Gate Manual Quote Draft dashboard routes patched.");

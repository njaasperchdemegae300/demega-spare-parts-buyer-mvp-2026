const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-manual-stock-check"')) {
  if (src.includes('"/controlled-buyer-gate-manual-lead-reviews",')) {
    src = src.replace(
      '"/controlled-buyer-gate-manual-lead-reviews",',
      '"/controlled-buyer-gate-manual-lead-reviews",\n        "/controlled-buyer-gate-manual-stock-check",\n        "/controlled-buyer-gate-manual-stock-checks",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-stock-check/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-stock-check" || url.pathname === "/controlled-buyer-gate-manual-stock-checks")) {
    return controlledBuyerGateManualStockCheckController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateManualStockCheckController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Manual Stock Check preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 32B Controlled Buyer-Gate Manual Stock Check dashboard routes patched.");

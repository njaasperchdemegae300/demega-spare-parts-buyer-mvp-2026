const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-manual-compatibility-check"')) {
  if (src.includes('"/controlled-buyer-gate-manual-stock-checks",')) {
    src = src.replace(
      '"/controlled-buyer-gate-manual-stock-checks",',
      '"/controlled-buyer-gate-manual-stock-checks",\n        "/controlled-buyer-gate-manual-compatibility-check",\n        "/controlled-buyer-gate-manual-compatibility-checks",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-compatibility-check/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-compatibility-check" || url.pathname === "/controlled-buyer-gate-manual-compatibility-checks")) {
    return controlledBuyerGateManualCompatibilityCheckController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateManualCompatibilityCheckController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Manual Compatibility Check preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 33B Controlled Buyer-Gate Manual Compatibility Check dashboard routes patched.");

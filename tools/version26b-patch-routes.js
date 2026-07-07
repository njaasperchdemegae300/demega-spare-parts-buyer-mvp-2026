const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/internal-buyer-gate-readiness"')) {
  if (src.includes('"/assistant-sales-agent-test-runs",')) {
    src = src.replace(
      '"/assistant-sales-agent-test-runs",',
      '"/assistant-sales-agent-test-runs",\n        "/internal-buyer-gate-readiness",\n        "/internal-buyer-gate-readiness-runs",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/internal-buyer-gate-readiness/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/internal-buyer-gate-readiness" || url.pathname === "/internal-buyer-gate-readiness-runs")) {
    return internalBuyerGateReadinessGuardianController.internalBuyerGateReadinessDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("internalBuyerGateReadinessDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Internal Buyer-Gate Readiness preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");
console.log("Version 26B Internal Buyer-Gate Readiness dashboard routes patched.");

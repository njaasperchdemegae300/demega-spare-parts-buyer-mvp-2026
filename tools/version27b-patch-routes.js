const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-test-plan"')) {
  if (src.includes('"/internal-buyer-gate-readiness-runs",')) {
    src = src.replace(
      '"/internal-buyer-gate-readiness-runs",',
      '"/internal-buyer-gate-readiness-runs",\n        "/controlled-buyer-gate-test-plan",\n        "/controlled-buyer-gate-test-plans",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-test-plan/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-test-plan" || url.pathname === "/controlled-buyer-gate-test-plans")) {
    return controlledBuyerGateTestPlanController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateTestPlanController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Test Plan preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 27B Controlled Buyer-Gate Test Plan dashboard routes patched.");

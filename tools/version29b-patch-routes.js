const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-activation-execution"')) {
  if (src.includes('"/controlled-buyer-gate-manual-activation-approvals",')) {
    src = src.replace(
      '"/controlled-buyer-gate-manual-activation-approvals",',
      '"/controlled-buyer-gate-manual-activation-approvals",\n        "/controlled-buyer-gate-activation-execution",\n        "/controlled-buyer-gate-activation-executions",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-activation-execution/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-activation-execution" || url.pathname === "/controlled-buyer-gate-activation-executions")) {
    return controlledBuyerGateActivationExecutionController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateActivationExecutionController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Activation Execution preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 29B Controlled Buyer-Gate Activation Execution dashboard routes patched.");

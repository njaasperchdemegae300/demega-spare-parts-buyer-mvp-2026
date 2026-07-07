const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-manual-activation-approval"')) {
  if (src.includes('"/controlled-buyer-gate-test-plans",')) {
    src = src.replace(
      '"/controlled-buyer-gate-test-plans",',
      '"/controlled-buyer-gate-test-plans",\n        "/controlled-buyer-gate-manual-activation-approval",\n        "/controlled-buyer-gate-manual-activation-approvals",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-activation-approval/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-manual-activation-approval" || url.pathname === "/controlled-buyer-gate-manual-activation-approvals")) {
    return controlledBuyerGateManualActivationApprovalController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateManualActivationApprovalController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Manual Activation Approval preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 28B Controlled Buyer-Gate Manual Activation Approval dashboard routes patched.");

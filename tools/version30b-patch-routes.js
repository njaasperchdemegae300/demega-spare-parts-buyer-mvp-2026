const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-lead-slot-enforcement"')) {
  if (src.includes('"/controlled-buyer-gate-activation-executions",')) {
    src = src.replace(
      '"/controlled-buyer-gate-activation-executions",',
      '"/controlled-buyer-gate-activation-executions",\n        "/controlled-buyer-gate-lead-slot-enforcement",\n        "/controlled-buyer-gate-lead-slots",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-lead-slot-enforcement/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-lead-slot-enforcement" || url.pathname === "/controlled-buyer-gate-lead-slots")) {
    return controlledBuyerGateLeadSlotEnforcementController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateLeadSlotEnforcementController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Lead-Slot Enforcement preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 30B Controlled Buyer-Gate Lead-Slot Enforcement dashboard routes patched.");

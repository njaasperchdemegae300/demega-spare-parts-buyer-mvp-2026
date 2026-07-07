const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('controlled-buyer-gate-lead-slot-enforcement.controller')) {
  const requireLine = 'const controlledBuyerGateLeadSlotEnforcementController = require("../controllers/controlled-buyer-gate-lead-slot-enforcement.controller");\n';
  const lastRequire = src.lastIndexOf('require("../controllers/');
  const lineEnd = src.indexOf("\n", lastRequire);

  if (lastRequire === -1 || lineEnd === -1) {
    throw new Error("Could not find controller require insertion point.");
  }

  src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
}

const block = `  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-lead-slot-enforcement/preview") {
    return controlledBuyerGateLeadSlotEnforcementController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-lead-slot/create") {
    return controlledBuyerGateLeadSlotEnforcementController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-lead-slots") {
    return controlledBuyerGateLeadSlotEnforcementController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-lead-slot-enforcement/summary") {
    return controlledBuyerGateLeadSlotEnforcementController.summaryController(req, res, sendJson);
  }

`;

if (!src.includes("controlledBuyerGateLeadSlotEnforcementController.previewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-activation-execution/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, block + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);
    if (fallbackIndex === -1) throw new Error("Could not find safe route insertion point.");
    src = src.slice(0, fallbackIndex) + block + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 30A controlled buyer-gate lead-slot enforcement routes patched.");

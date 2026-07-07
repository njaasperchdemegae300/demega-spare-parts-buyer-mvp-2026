const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('controlled-buyer-gate-activation-execution.controller')) {
  const requireLine = 'const controlledBuyerGateActivationExecutionController = require("../controllers/controlled-buyer-gate-activation-execution.controller");\n';
  const lastRequire = src.lastIndexOf('require("../controllers/');
  const lineEnd = src.indexOf("\n", lastRequire);

  if (lastRequire === -1 || lineEnd === -1) {
    throw new Error("Could not find controller require insertion point.");
  }

  src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
}

const block = `  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-activation-execution/preview") {
    return controlledBuyerGateActivationExecutionController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-activation-execution/create") {
    return controlledBuyerGateActivationExecutionController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-activation-executions") {
    return controlledBuyerGateActivationExecutionController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-activation-execution/summary") {
    return controlledBuyerGateActivationExecutionController.summaryController(req, res, sendJson);
  }

`;

if (!src.includes("controlledBuyerGateActivationExecutionController.previewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-activation-approval/preview") {';

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
console.log("Version 29A controlled buyer-gate activation execution routes patched.");

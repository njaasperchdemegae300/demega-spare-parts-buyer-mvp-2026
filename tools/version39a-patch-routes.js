const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('controlled-buyer-gate-final-readiness-lock.controller')) {
  const requireLine = 'const controlledBuyerGateFinalReadinessLockController = require("../controllers/controlled-buyer-gate-final-readiness-lock.controller");\n';
  const lastRequire = src.lastIndexOf('require("../controllers/');
  const lineEnd = src.indexOf("\n", lastRequire);

  if (lastRequire === -1 || lineEnd === -1) {
    throw new Error("Could not find controller require insertion point.");
  }

  src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
}

const block = `  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-final-readiness-lock/preview") {
    return controlledBuyerGateFinalReadinessLockController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-final-readiness-lock/create") {
    return controlledBuyerGateFinalReadinessLockController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-final-readiness-locks") {
    return controlledBuyerGateFinalReadinessLockController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-final-readiness-lock/summary") {
    return controlledBuyerGateFinalReadinessLockController.summaryController(req, res, sendJson);
  }

`;

if (!src.includes("controlledBuyerGateFinalReadinessLockController.previewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-follow-up-decision/preview") {';

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
console.log("Version 39A controlled buyer-gate final readiness lock routes patched.");

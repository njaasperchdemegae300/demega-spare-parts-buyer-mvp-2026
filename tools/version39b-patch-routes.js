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

const pageBlock = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-final-readiness-lock" || url.pathname === "/controlled-buyer-gate-final-readiness-lock-dashboard")) {
    return controlledBuyerGateFinalReadinessLockController.dashboardController(req, res, sendHtml);
  }

`;

if (!src.includes('url.pathname === "/controlled-buyer-gate-final-readiness-lock"')) {
  const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-final-readiness-lock/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, pageBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for Version 39B.");
    }

    src = src.slice(0, fallbackIndex) + pageBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 39B final readiness lock dashboard routes patched.");

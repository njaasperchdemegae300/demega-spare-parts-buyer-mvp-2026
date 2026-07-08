const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

const requireLine = 'const controlledRealBuyerGateOpeningPreparationController = require("../controllers/controlled-real-buyer-gate-opening-preparation.controller");\n';

if (!src.includes('controlled-real-buyer-gate-opening-preparation.controller')) {
  const lastRequire = src.lastIndexOf('require("../controllers/');
  const lineEnd = src.indexOf("\n", lastRequire);

  if (lastRequire === -1 || lineEnd === -1) {
    throw new Error("Could not find controller require insertion point for Version 40A.");
  }

  src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
}

const routeBlock = `  if (method === "GET" && (url.pathname === "/controlled-real-buyer-gate-opening-preparation" || url.pathname === "/controlled-real-buyer-gate-opening-preparation-dashboard")) {
    return controlledRealBuyerGateOpeningPreparationController.dashboardController(req, res, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/controlled-real-buyer-gate-opening-preparation/preview") {
    return controlledRealBuyerGateOpeningPreparationController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-real-buyer-gate-opening-preparation/create") {
    return controlledRealBuyerGateOpeningPreparationController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-real-buyer-gate-opening-preparations") {
    return controlledRealBuyerGateOpeningPreparationController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-real-buyer-gate-opening-preparation/summary") {
    return controlledRealBuyerGateOpeningPreparationController.summaryController(req, res, sendJson);
  }

`;

if (!src.includes('url.pathname === "/api/controlled-real-buyer-gate-opening-preparation/preview"')) {
  const fallback = '  return sendJson(res, 404';
  const fallbackIndex = src.indexOf(fallback);

  if (fallbackIndex === -1) {
    throw new Error("Could not find 404 insertion point for Version 40A routes.");
  }

  src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 40A controlled real-buyer gate opening preparation routes patched.");

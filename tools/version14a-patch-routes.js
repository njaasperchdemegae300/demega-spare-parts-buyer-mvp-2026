const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('compatibility-confirmation.controller')) {
  src = src.replace(
    'const stockConfirmationController = require("../controllers/stock-confirmation.controller");',
    'const stockConfirmationController = require("../controllers/stock-confirmation.controller");\nconst compatibilityConfirmationController = require("../controllers/compatibility-confirmation.controller");'
  );
}

if (!src.includes('"/api/compatibility-confirmation/preview"')) {
  src = src.replace(
    '"/api/stock-confirmation/summary",',
    '"/api/stock-confirmation/summary",\n        "/api/compatibility-confirmation/preview",\n        "/api/compatibility-confirmations",\n        "/api/compatibility-confirmation/summary",'
  );
}

if (!src.includes('"POST /api/compatibility-confirmation/confirm"')) {
  src = src.replace(
    '"POST /api/stock-confirmation/confirm",',
    '"POST /api/stock-confirmation/confirm",\n        "POST /api/compatibility-confirmation/confirm",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/stock-confirmation/preview") {';
const block = `  if (method === "GET" && url.pathname === "/api/compatibility-confirmation/preview") {
    return compatibilityConfirmationController.compatibilityConfirmationPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/compatibility-confirmations") {
    return compatibilityConfirmationController.listCompatibilityConfirmationsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/compatibility-confirmation/summary") {
    return compatibilityConfirmationController.compatibilityConfirmationSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/compatibility-confirmation/confirm") {
    return compatibilityConfirmationController.createCompatibilityConfirmationController(req, res, sendJson);
  }

`;

if (!src.includes("compatibilityConfirmationPreviewController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find stock confirmation preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

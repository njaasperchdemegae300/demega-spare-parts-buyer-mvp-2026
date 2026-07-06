const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('stock-confirmation.controller')) {
  src = src.replace(
    'const whatsappManualController = require("../controllers/whatsapp-manual.controller");',
    'const whatsappManualController = require("../controllers/whatsapp-manual.controller");\nconst stockConfirmationController = require("../controllers/stock-confirmation.controller");'
  );
}

if (!src.includes('"/api/stock-confirmation/preview"')) {
  src = src.replace(
    '"/api/whatsapp-manual/summary",',
    '"/api/whatsapp-manual/summary",\n        "/api/stock-confirmation/preview",\n        "/api/stock-confirmations",\n        "/api/stock-confirmation/summary",'
  );
}

if (!src.includes('"POST /api/stock-confirmation/confirm"')) {
  src = src.replace(
    '"POST /api/whatsapp-manual/open-link",',
    '"POST /api/whatsapp-manual/open-link",\n        "POST /api/stock-confirmation/confirm",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/whatsapp-manual/preview") {';
const block = `  if (method === "GET" && url.pathname === "/api/stock-confirmation/preview") {
    return stockConfirmationController.stockConfirmationPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/stock-confirmations") {
    return stockConfirmationController.listStockConfirmationsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/stock-confirmation/summary") {
    return stockConfirmationController.stockConfirmationSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/stock-confirmation/confirm") {
    return stockConfirmationController.createStockConfirmationController(req, res, sendJson);
  }

`;

if (!src.includes("stockConfirmationPreviewController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find WhatsApp manual preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

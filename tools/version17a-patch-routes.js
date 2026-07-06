const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('manual-quote-copy.controller')) {
  src = src.replace(
    'const manualQuoteDraftController = require("../controllers/manual-quote-draft.controller");',
    'const manualQuoteDraftController = require("../controllers/manual-quote-draft.controller");\nconst manualQuoteCopyController = require("../controllers/manual-quote-copy.controller");'
  );
}

if (!src.includes('"/api/manual-quote-copy/preview"')) {
  src = src.replace(
    '"/api/manual-quote-draft/summary",',
    '"/api/manual-quote-draft/summary",\n        "/api/manual-quote-copy/preview",\n        "/api/manual-quote-copies",\n        "/api/manual-quote-copy/summary",'
  );
}

if (!src.includes('"POST /api/manual-quote-copy/prepare"')) {
  src = src.replace(
    '"POST /api/manual-quote-draft/build",',
    '"POST /api/manual-quote-draft/build",\n        "POST /api/manual-quote-copy/prepare",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/manual-quote-draft/preview") {';
const block = `  if (method === "GET" && url.pathname === "/api/manual-quote-copy/preview") {
    return manualQuoteCopyController.manualQuoteCopyPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-copies") {
    return manualQuoteCopyController.listManualQuoteCopyActionsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-copy/summary") {
    return manualQuoteCopyController.manualQuoteCopySummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-quote-copy/prepare") {
    return manualQuoteCopyController.prepareManualQuoteCopyController(req, res, sendJson);
  }

`;

if (!src.includes("manualQuoteCopyPreviewController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find manual quote draft preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

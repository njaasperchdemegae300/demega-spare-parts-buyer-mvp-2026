const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('manual-quote-draft.controller')) {
  src = src.replace(
    'const quoteEligibilityController = require("../controllers/quote-eligibility.controller");',
    'const quoteEligibilityController = require("../controllers/quote-eligibility.controller");\nconst manualQuoteDraftController = require("../controllers/manual-quote-draft.controller");'
  );
}

if (!src.includes('"/api/manual-quote-draft/preview"')) {
  src = src.replace(
    '"/api/quote-eligibility/summary",',
    '"/api/quote-eligibility/summary",\n        "/api/manual-quote-draft/preview",\n        "/api/manual-quote-drafts",\n        "/api/manual-quote-draft/summary",'
  );
}

if (!src.includes('"POST /api/manual-quote-draft/build"')) {
  src = src.replace(
    '"POST /api/quote-eligibility/check",',
    '"POST /api/quote-eligibility/check",\n        "POST /api/manual-quote-draft/build",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/quote-eligibility/preview") {';
const block = `  if (method === "GET" && url.pathname === "/api/manual-quote-draft/preview") {
    return manualQuoteDraftController.manualQuoteDraftPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-drafts") {
    return manualQuoteDraftController.listManualQuoteDraftsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-draft/summary") {
    return manualQuoteDraftController.manualQuoteDraftSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-quote-draft/build") {
    return manualQuoteDraftController.createManualQuoteDraftController(req, res, sendJson);
  }

`;

if (!src.includes("manualQuoteDraftPreviewController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find quote eligibility preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

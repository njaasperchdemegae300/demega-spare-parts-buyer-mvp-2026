const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('quote-eligibility.controller')) {
  src = src.replace(
    'const compatibilityConfirmationController = require("../controllers/compatibility-confirmation.controller");',
    'const compatibilityConfirmationController = require("../controllers/compatibility-confirmation.controller");\nconst quoteEligibilityController = require("../controllers/quote-eligibility.controller");'
  );
}

if (!src.includes('"/api/quote-eligibility/preview"')) {
  src = src.replace(
    '"/api/compatibility-confirmation/summary",',
    '"/api/compatibility-confirmation/summary",\n        "/api/quote-eligibility/preview",\n        "/api/quote-eligibilities",\n        "/api/quote-eligibility/summary",'
  );
}

if (!src.includes('"POST /api/quote-eligibility/check"')) {
  src = src.replace(
    '"POST /api/compatibility-confirmation/confirm",',
    '"POST /api/compatibility-confirmation/confirm",\n        "POST /api/quote-eligibility/check",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/compatibility-confirmation/preview") {';
const block = `  if (method === "GET" && url.pathname === "/api/quote-eligibility/preview") {
    return quoteEligibilityController.quoteEligibilityPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quote-eligibilities") {
    return quoteEligibilityController.listQuoteEligibilitiesController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/quote-eligibility/summary") {
    return quoteEligibilityController.quoteEligibilitySummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/quote-eligibility/check") {
    return quoteEligibilityController.createQuoteEligibilityCheckController(req, res, sendJson);
  }

`;

if (!src.includes("quoteEligibilityPreviewController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find compatibility confirmation preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

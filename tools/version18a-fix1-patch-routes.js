const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('manual-quote-sent-confirmation.controller')) {
  const requireLine = 'const manualQuoteSentConfirmationController = require("../controllers/manual-quote-sent-confirmation.controller");\n';

  if (src.includes('const manualQuoteCopyController = require("../controllers/manual-quote-copy.controller");')) {
    src = src.replace(
      'const manualQuoteCopyController = require("../controllers/manual-quote-copy.controller");',
      'const manualQuoteCopyController = require("../controllers/manual-quote-copy.controller");\n' + requireLine.trimEnd()
    );
  } else {
    const lastRequire = src.lastIndexOf('require("../controllers/');
    if (lastRequire !== -1) {
      const lineEnd = src.indexOf("\n", lastRequire);
      src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
    } else {
      src = requireLine + src;
    }
  }
}

if (!src.includes('"/api/manual-quote-sent-confirmation/preview"') && src.includes('"/api/manual-quote-copy/summary",')) {
  src = src.replace(
    '"/api/manual-quote-copy/summary",',
    '"/api/manual-quote-copy/summary",\n        "/api/manual-quote-sent-confirmation/preview",\n        "/api/manual-quote-sent-confirmations",\n        "/api/manual-quote-sent-confirmation/summary",'
  );
}

if (!src.includes('"POST /api/manual-quote-sent-confirmation/confirm"') && src.includes('"POST /api/manual-quote-copy/prepare",')) {
  src = src.replace(
    '"POST /api/manual-quote-copy/prepare",',
    '"POST /api/manual-quote-copy/prepare",\n        "POST /api/manual-quote-sent-confirmation/confirm",'
  );
}

const routeBlock = `  if (method === "GET" && url.pathname === "/api/manual-quote-sent-confirmation/preview") {
    return manualQuoteSentConfirmationController.manualQuoteSentConfirmationPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-sent-confirmations") {
    return manualQuoteSentConfirmationController.listManualQuoteSentConfirmationsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-quote-sent-confirmation/summary") {
    return manualQuoteSentConfirmationController.manualQuoteSentConfirmationSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-quote-sent-confirmation/confirm") {
    return manualQuoteSentConfirmationController.confirmManualQuoteSentController(req, res, sendJson);
  }

`;

if (!src.includes("manualQuoteSentConfirmationPreviewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/manual-quote-copy/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, routeBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for manual quote sent confirmation routes.");
    }

    src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(routeFile, src, "utf8");

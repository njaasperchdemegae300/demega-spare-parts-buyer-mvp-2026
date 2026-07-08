const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('controlled-buyer-gate-manual-quote-draft.controller')) {
  const requireLine = 'const controlledBuyerGateManualQuoteDraftController = require("../controllers/controlled-buyer-gate-manual-quote-draft.controller");\n';
  const lastRequire = src.lastIndexOf('require("../controllers/');
  const lineEnd = src.indexOf("\n", lastRequire);

  if (lastRequire === -1 || lineEnd === -1) {
    throw new Error("Could not find controller require insertion point.");
  }

  src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
}

const block = `  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-quote-draft/preview") {
    return controlledBuyerGateManualQuoteDraftController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-manual-quote-draft/create") {
    return controlledBuyerGateManualQuoteDraftController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-quote-drafts") {
    return controlledBuyerGateManualQuoteDraftController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-quote-draft/summary") {
    return controlledBuyerGateManualQuoteDraftController.summaryController(req, res, sendJson);
  }

`;

if (!src.includes("controlledBuyerGateManualQuoteDraftController.previewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-final-quote-eligibility/preview") {';

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
console.log("Version 35A controlled buyer-gate manual quote draft routes patched.");

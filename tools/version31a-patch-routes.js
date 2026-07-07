const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('controlled-buyer-gate-manual-lead-review.controller')) {
  const requireLine = 'const controlledBuyerGateManualLeadReviewController = require("../controllers/controlled-buyer-gate-manual-lead-review.controller");\n';
  const lastRequire = src.lastIndexOf('require("../controllers/');
  const lineEnd = src.indexOf("\n", lastRequire);

  if (lastRequire === -1 || lineEnd === -1) {
    throw new Error("Could not find controller require insertion point.");
  }

  src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
}

const block = `  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-lead-review/preview") {
    return controlledBuyerGateManualLeadReviewController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-manual-lead-review/create") {
    return controlledBuyerGateManualLeadReviewController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-lead-reviews") {
    return controlledBuyerGateManualLeadReviewController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-lead-review/summary") {
    return controlledBuyerGateManualLeadReviewController.summaryController(req, res, sendJson);
  }

`;

if (!src.includes("controlledBuyerGateManualLeadReviewController.previewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-lead-slot-enforcement/preview") {';

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
console.log("Version 31A controlled buyer-gate manual lead review routes patched.");

const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

const requireLine = 'const controlled15LeadProofTestController = require("../controllers/controlled-15-lead-proof-test.controller");\n';

if (!src.includes('controlled-15-lead-proof-test.controller')) {
  const lastRequire = src.lastIndexOf('require("../controllers/');
  const lineEnd = src.indexOf("\n", lastRequire);

  if (lastRequire === -1 || lineEnd === -1) {
    throw new Error("Could not find controller require insertion point for Business Stage 1A.");
  }

  src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
}

const routeBlock = `  if (method === "GET" && (url.pathname === "/controlled-15-lead-proof-test" || url.pathname === "/controlled-15-lead-proof-test-dashboard")) {
    return controlled15LeadProofTestController.dashboardController(req, res, sendHtml);
  }

  if (method === "GET" && url.pathname === "/api/controlled-15-lead-proof-test/preview") {
    return controlled15LeadProofTestController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-15-lead-proof-test/manual-lead/create") {
    return controlled15LeadProofTestController.createManualLeadController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-15-lead-proof-test/leads") {
    return controlled15LeadProofTestController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-15-lead-proof-test/summary") {
    return controlled15LeadProofTestController.summaryController(req, res, sendJson);
  }

`;

if (!src.includes('url.pathname === "/api/controlled-15-lead-proof-test/preview"')) {
  const fallback = '  return sendJson(res, 404';
  const fallbackIndex = src.indexOf(fallback);

  if (fallbackIndex === -1) {
    throw new Error("Could not find 404 insertion point for Business Stage 1A routes.");
  }

  src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
}

fs.writeFileSync(file, src, "utf8");
console.log("Business Stage 1A controlled 15-lead proof-test routes patched.");

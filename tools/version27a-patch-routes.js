const fs = require("fs");
const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('controlled-buyer-gate-test-plan.controller')) {
  const requireLine = 'const controlledBuyerGateTestPlanController = require("../controllers/controlled-buyer-gate-test-plan.controller");\n';
  const lastRequire = src.lastIndexOf('require("../controllers/');
  const lineEnd = src.indexOf("\n", lastRequire);
  src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
}

if (!src.includes('controlledBuyerGateTestPlanController.previewController')) {
  const block = `  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-test-plan/preview") {
    return controlledBuyerGateTestPlanController.previewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-test-plans") {
    return controlledBuyerGateTestPlanController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-test-plan/summary") {
    return controlledBuyerGateTestPlanController.summaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-test-plan/create") {
    return controlledBuyerGateTestPlanController.createController(req, res, sendJson);
  }

`;

  const marker = '  if (method === "GET" && url.pathname === "/api/internal-buyer-gate-readiness/preview") {';
  if (src.includes(marker)) {
    src = src.replace(marker, block + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    src = src.slice(0, src.indexOf(fallback)) + block + src.slice(src.indexOf(fallback));
  }
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 27A controlled buyer-gate test plan routes patched.");

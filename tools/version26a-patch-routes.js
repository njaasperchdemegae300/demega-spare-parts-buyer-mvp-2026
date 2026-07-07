const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('internal-buyer-gate-readiness-guardian.controller')) {
  const requireLine = 'const internalBuyerGateReadinessGuardianController = require("../controllers/internal-buyer-gate-readiness-guardian.controller");\n';

  if (src.includes('const assistantSalesAgentTestLabController = require("../controllers/assistant-sales-agent-test-lab.controller");')) {
    src = src.replace(
      'const assistantSalesAgentTestLabController = require("../controllers/assistant-sales-agent-test-lab.controller");',
      'const assistantSalesAgentTestLabController = require("../controllers/assistant-sales-agent-test-lab.controller");\n' + requireLine.trimEnd()
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

if (!src.includes('"/api/internal-buyer-gate-readiness/preview"')) {
  if (src.includes('"/api/assistant-sales-agent-test-lab/summary",')) {
    src = src.replace(
      '"/api/assistant-sales-agent-test-lab/summary",',
      '"/api/assistant-sales-agent-test-lab/summary",\n        "/api/internal-buyer-gate-readiness/preview",\n        "/api/internal-buyer-gate-readiness/runs",\n        "/api/internal-buyer-gate-readiness/summary",'
    );
  }
}

if (!src.includes('"POST /api/internal-buyer-gate-readiness/run"')) {
  const postMarker = '"POST /api/assistant-sales-agent-test-lab/run",';
  if (src.includes(postMarker)) {
    src = src.replace(
      postMarker,
      postMarker + '\n        "POST /api/internal-buyer-gate-readiness/run",'
    );
  }
}

const routeBlock = `  if (method === "GET" && url.pathname === "/api/internal-buyer-gate-readiness/preview") {
    return internalBuyerGateReadinessGuardianController.internalBuyerGateReadinessPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/internal-buyer-gate-readiness/runs") {
    return internalBuyerGateReadinessGuardianController.listInternalBuyerGateReadinessRunsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/internal-buyer-gate-readiness/summary") {
    return internalBuyerGateReadinessGuardianController.internalBuyerGateReadinessSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/internal-buyer-gate-readiness/run") {
    return internalBuyerGateReadinessGuardianController.runInternalBuyerGateReadinessController(req, res, sendJson);
  }

`;

if (!src.includes("internalBuyerGateReadinessPreviewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/assistant-sales-agent-test-lab/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, routeBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for internal buyer-gate readiness routes.");
    }

    src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(routeFile, src, "utf8");
console.log("Version 26A internal buyer-gate readiness routes patched.");

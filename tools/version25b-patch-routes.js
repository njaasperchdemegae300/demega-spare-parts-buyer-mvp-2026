const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('assistant-sales-agent-test-lab.controller')) {
  const requireLine = 'const assistantSalesAgentTestLabController = require("../controllers/assistant-sales-agent-test-lab.controller");\n';

  if (src.includes('const projectSourceOfTruthController = require("../controllers/project-source-of-truth.controller");')) {
    src = src.replace(
      'const projectSourceOfTruthController = require("../controllers/project-source-of-truth.controller");',
      'const projectSourceOfTruthController = require("../controllers/project-source-of-truth.controller");\n' + requireLine.trimEnd()
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

if (!src.includes('"/api/assistant-sales-agent-test-lab/preview"')) {
  if (src.includes('"/api/project-source-of-truth/summary",')) {
    src = src.replace(
      '"/api/project-source-of-truth/summary",',
      '"/api/project-source-of-truth/summary",\n        "/api/assistant-sales-agent-test-lab/preview",\n        "/api/assistant-sales-agent-test-lab/runs",\n        "/api/assistant-sales-agent-test-lab/summary",'
    );
  }
}

if (!src.includes('"POST /api/assistant-sales-agent-test-lab/run"')) {
  const postMarker = '"POST /api/manual-final-business-review/record",';
  if (src.includes(postMarker)) {
    src = src.replace(
      postMarker,
      postMarker + '\n        "POST /api/assistant-sales-agent-test-lab/run",'
    );
  }
}

const routeBlock = `  if (method === "GET" && url.pathname === "/api/assistant-sales-agent-test-lab/preview") {
    return assistantSalesAgentTestLabController.assistantSalesAgentTestLabPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/assistant-sales-agent-test-lab/runs") {
    return assistantSalesAgentTestLabController.listAssistantSalesAgentTestRunsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/assistant-sales-agent-test-lab/summary") {
    return assistantSalesAgentTestLabController.assistantSalesAgentTestLabSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/assistant-sales-agent-test-lab/run") {
    return assistantSalesAgentTestLabController.runAssistantSalesAgentTestLabController(req, res, sendJson);
  }

`;

if (!src.includes("assistantSalesAgentTestLabPreviewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/project-source-of-truth/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, routeBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for assistant sales agent test lab routes.");
    }

    src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(routeFile, src, "utf8");
console.log("Version 25B assistant sales agent test lab routes patched.");

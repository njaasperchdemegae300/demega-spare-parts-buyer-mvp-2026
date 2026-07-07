const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/assistant-sales-agent-test-lab"')) {
  if (src.includes('"/manual-final-business-reviews",')) {
    src = src.replace(
      '"/manual-final-business-reviews",',
      '"/manual-final-business-reviews",\n        "/assistant-sales-agent-test-lab",\n        "/assistant-sales-agent-test-runs",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/assistant-sales-agent-test-lab/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/assistant-sales-agent-test-lab" || url.pathname === "/assistant-sales-agent-test-runs")) {
    return assistantSalesAgentTestLabController.assistantSalesAgentTestLabDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("assistantSalesAgentTestLabDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Assistant Sales Agent Test Lab preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");
console.log("Version 25C Assistant Sales Agent Test Lab dashboard routes patched.");

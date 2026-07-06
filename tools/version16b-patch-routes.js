const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/manual-quote-draft"')) {
  src = src.replace(
    '"/quote-eligibility-gate",',
    '"/quote-eligibility-gate",\n        "/manual-quote-draft",\n        "/manual-quote-drafts",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/manual-quote-draft/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/manual-quote-draft" || url.pathname === "/manual-quote-drafts")) {
    return manualQuoteDraftController.manualQuoteDraftDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("manualQuoteDraftDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find manual quote draft preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

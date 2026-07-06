const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/quote-eligibility"')) {
  src = src.replace(
    '"/compatibility-confirmation-gate",',
    '"/compatibility-confirmation-gate",\n        "/quote-eligibility",\n        "/quote-eligibility-gate",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/quote-eligibility/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/quote-eligibility" || url.pathname === "/quote-eligibility-gate")) {
    return quoteEligibilityController.quoteEligibilityDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("quoteEligibilityDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find quote eligibility preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

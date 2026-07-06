const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/manual-quote-copy"')) {
  src = src.replace(
    '"/manual-quote-drafts",',
    '"/manual-quote-drafts",\n        "/manual-quote-copy",\n        "/manual-quote-copies",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/manual-quote-copy/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/manual-quote-copy" || url.pathname === "/manual-quote-copies")) {
    return manualQuoteCopyController.manualQuoteCopyDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("manualQuoteCopyDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find manual quote copy preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

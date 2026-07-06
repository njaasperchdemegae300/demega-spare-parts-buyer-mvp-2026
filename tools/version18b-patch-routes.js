const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/manual-quote-sent-confirmation"')) {
  if (src.includes('"/manual-quote-copies",')) {
    src = src.replace(
      '"/manual-quote-copies",',
      '"/manual-quote-copies",\n        "/manual-quote-sent-confirmation",\n        "/manual-quote-sent-confirmations",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/manual-quote-sent-confirmation/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/manual-quote-sent-confirmation" || url.pathname === "/manual-quote-sent-confirmations")) {
    return manualQuoteSentConfirmationController.manualQuoteSentConfirmationDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("manualQuoteSentConfirmationDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find manual quote sent confirmation preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

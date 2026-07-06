const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/stock-confirmation"')) {
  src = src.replace(
    '"/whatsapp-manual-links",',
    '"/whatsapp-manual-links",\n        "/stock-confirmation",\n        "/stock-confirmation-gate",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/stock-confirmation/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/stock-confirmation" || url.pathname === "/stock-confirmation-gate")) {
    return stockConfirmationController.stockConfirmationDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("stockConfirmationDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find stock confirmation preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

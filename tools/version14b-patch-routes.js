const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/compatibility-confirmation"')) {
  src = src.replace(
    '"/stock-confirmation-gate",',
    '"/stock-confirmation-gate",\n        "/compatibility-confirmation",\n        "/compatibility-confirmation-gate",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/compatibility-confirmation/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/compatibility-confirmation" || url.pathname === "/compatibility-confirmation-gate")) {
    return compatibilityConfirmationController.compatibilityConfirmationDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("compatibilityConfirmationDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find compatibility confirmation preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

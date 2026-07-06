const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/whatsapp-manual"')) {
  src = src.replace(
    '"/hot-buyer-command-center",',
    '"/hot-buyer-command-center",\n        "/whatsapp-manual",\n        "/whatsapp-manual-links",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/whatsapp-manual/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/whatsapp-manual" || url.pathname === "/whatsapp-manual-links")) {
    return whatsappManualController.whatsappManualDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("whatsappManualDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find WhatsApp manual preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

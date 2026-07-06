const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/manual-deal-outcome"')) {
  if (src.includes('"/buyer-reply-followups",')) {
    src = src.replace(
      '"/buyer-reply-followups",',
      '"/buyer-reply-followups",\n        "/manual-deal-outcome",\n        "/manual-deal-outcomes",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/manual-deal-outcome/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/manual-deal-outcome" || url.pathname === "/manual-deal-outcomes")) {
    return manualDealOutcomeController.manualDealOutcomeDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("manualDealOutcomeDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find manual deal outcome preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

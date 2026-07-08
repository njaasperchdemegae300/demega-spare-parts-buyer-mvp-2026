const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('"/controlled-buyer-gate-follow-up-decision"')) {
  if (src.includes('"/controlled-buyer-gate-buyer-reply-trackings",')) {
    src = src.replace(
      '"/controlled-buyer-gate-buyer-reply-trackings",',
      '"/controlled-buyer-gate-buyer-reply-trackings",\n        "/controlled-buyer-gate-follow-up-decision",\n        "/controlled-buyer-gate-follow-up-decisions",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-follow-up-decision/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/controlled-buyer-gate-follow-up-decision" || url.pathname === "/controlled-buyer-gate-follow-up-decisions")) {
    return controlledBuyerGateFollowUpDecisionController.dashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("controlledBuyerGateFollowUpDecisionController.dashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find Controlled Buyer-Gate Follow-Up Decision preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 38B Controlled Buyer-Gate Follow-Up Decision dashboard routes patched.");

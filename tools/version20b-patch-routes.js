const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/buyer-reply-followup"')) {
  if (src.includes('"/buyer-replies",')) {
    src = src.replace(
      '"/buyer-replies",',
      '"/buyer-replies",\n        "/buyer-reply-followup",\n        "/buyer-reply-followups",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/buyer-reply-followup/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/buyer-reply-followup" || url.pathname === "/buyer-reply-followups")) {
    return buyerReplyFollowupActionController.buyerReplyFollowupActionDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("buyerReplyFollowupActionDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find buyer reply follow-up preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

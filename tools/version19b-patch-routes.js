const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('"/buyer-reply"')) {
  if (src.includes('"/manual-quote-sent-confirmations",')) {
    src = src.replace(
      '"/manual-quote-sent-confirmations",',
      '"/manual-quote-sent-confirmations",\n        "/buyer-reply",\n        "/buyer-replies",'
    );
  }
}

const marker = '  if (method === "GET" && url.pathname === "/api/buyer-reply/preview") {';
const block = `  if (method === "GET" && (url.pathname === "/buyer-reply" || url.pathname === "/buyer-replies")) {
    return buyerReplyController.buyerReplyDashboardController(req, res, sendJson, sendHtml);
  }

`;

if (!src.includes("buyerReplyDashboardController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find buyer reply preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

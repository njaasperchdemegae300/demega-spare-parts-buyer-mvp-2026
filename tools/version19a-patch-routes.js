const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('buyer-reply.controller')) {
  src = src.replace(
    'const manualQuoteSentConfirmationController = require("../controllers/manual-quote-sent-confirmation.controller");',
    'const manualQuoteSentConfirmationController = require("../controllers/manual-quote-sent-confirmation.controller");\nconst buyerReplyController = require("../controllers/buyer-reply.controller");'
  );
}

if (!src.includes('"/api/buyer-reply/preview"') && src.includes('"/api/manual-quote-sent-confirmation/summary",')) {
  src = src.replace(
    '"/api/manual-quote-sent-confirmation/summary",',
    '"/api/manual-quote-sent-confirmation/summary",\n        "/api/buyer-reply/preview",\n        "/api/buyer-replies",\n        "/api/buyer-reply/summary",'
  );
}

if (!src.includes('"POST /api/buyer-reply/record"') && src.includes('"POST /api/manual-quote-sent-confirmation/confirm",')) {
  src = src.replace(
    '"POST /api/manual-quote-sent-confirmation/confirm",',
    '"POST /api/manual-quote-sent-confirmation/confirm",\n        "POST /api/buyer-reply/record",'
  );
}

const marker = '  if (method === "GET" && url.pathname === "/api/manual-quote-sent-confirmation/preview") {';
const block = `  if (method === "GET" && url.pathname === "/api/buyer-reply/preview") {
    return buyerReplyController.buyerReplyPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-replies") {
    return buyerReplyController.listBuyerRepliesController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-reply/summary") {
    return buyerReplyController.buyerReplySummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/buyer-reply/record") {
    return buyerReplyController.recordBuyerReplyController(req, res, sendJson);
  }

`;

if (!src.includes("buyerReplyPreviewController")) {
  if (!src.includes(marker)) {
    throw new Error("Could not find manual quote sent confirmation preview route marker.");
  }

  src = src.replace(marker, block + marker);
}

fs.writeFileSync(routeFile, src, "utf8");

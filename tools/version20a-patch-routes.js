const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('buyer-reply-followup-action.controller')) {
  const requireLine = 'const buyerReplyFollowupActionController = require("../controllers/buyer-reply-followup-action.controller");\n';

  if (src.includes('const buyerReplyController = require("../controllers/buyer-reply.controller");')) {
    src = src.replace(
      'const buyerReplyController = require("../controllers/buyer-reply.controller");',
      'const buyerReplyController = require("../controllers/buyer-reply.controller");\n' + requireLine.trimEnd()
    );
  } else {
    const lastRequire = src.lastIndexOf('require("../controllers/');
    if (lastRequire !== -1) {
      const lineEnd = src.indexOf("\n", lastRequire);
      src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
    } else {
      src = requireLine + src;
    }
  }
}

if (!src.includes('"/api/buyer-reply-followup/preview"') && src.includes('"/api/buyer-reply/summary",')) {
  src = src.replace(
    '"/api/buyer-reply/summary",',
    '"/api/buyer-reply/summary",\n        "/api/buyer-reply-followup/preview",\n        "/api/buyer-reply-followups",\n        "/api/buyer-reply-followup/summary",'
  );
}

if (!src.includes('"POST /api/buyer-reply-followup/plan"') && src.includes('"POST /api/buyer-reply/record",')) {
  src = src.replace(
    '"POST /api/buyer-reply/record",',
    '"POST /api/buyer-reply/record",\n        "POST /api/buyer-reply-followup/plan",'
  );
}

const routeBlock = `  if (method === "GET" && url.pathname === "/api/buyer-reply-followup/preview") {
    return buyerReplyFollowupActionController.buyerReplyFollowupActionPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-reply-followups") {
    return buyerReplyFollowupActionController.listBuyerReplyFollowupActionsController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/buyer-reply-followup/summary") {
    return buyerReplyFollowupActionController.buyerReplyFollowupActionSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/buyer-reply-followup/plan") {
    return buyerReplyFollowupActionController.planBuyerReplyFollowupActionController(req, res, sendJson);
  }

`;

if (!src.includes("buyerReplyFollowupActionPreviewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/buyer-reply/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, routeBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for buyer reply follow-up action routes.");
    }

    src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(routeFile, src, "utf8");

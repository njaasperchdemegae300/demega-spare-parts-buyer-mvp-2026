const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

if (!src.includes('controlled-buyer-gate-buyer-reply-tracking.controller')) {
  const requireLine = 'const controlledBuyerGateBuyerReplyTrackingController = require("../controllers/controlled-buyer-gate-buyer-reply-tracking.controller");\n';
  const lastRequire = src.lastIndexOf('require("../controllers/');
  const lineEnd = src.indexOf("\n", lastRequire);

  if (lastRequire === -1 || lineEnd === -1) {
    throw new Error("Could not find controller require insertion point.");
  }

  src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
}

const block = `  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-buyer-reply-tracking/preview") {
    return controlledBuyerGateBuyerReplyTrackingController.previewController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/controlled-buyer-gate-buyer-reply-tracking/create") {
    return controlledBuyerGateBuyerReplyTrackingController.createController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-buyer-reply-trackings") {
    return controlledBuyerGateBuyerReplyTrackingController.listController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-buyer-reply-tracking/summary") {
    return controlledBuyerGateBuyerReplyTrackingController.summaryController(req, res, sendJson);
  }

`;

if (!src.includes("controlledBuyerGateBuyerReplyTrackingController.previewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/controlled-buyer-gate-manual-send-confirmation/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, block + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);
    if (fallbackIndex === -1) throw new Error("Could not find safe route insertion point.");
    src = src.slice(0, fallbackIndex) + block + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(file, src, "utf8");
console.log("Version 37A controlled buyer-gate buyer reply tracking routes patched.");

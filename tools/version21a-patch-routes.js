const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('manual-deal-outcome.controller')) {
  const requireLine = 'const manualDealOutcomeController = require("../controllers/manual-deal-outcome.controller");\n';

  if (src.includes('const buyerReplyFollowupActionController = require("../controllers/buyer-reply-followup-action.controller");')) {
    src = src.replace(
      'const buyerReplyFollowupActionController = require("../controllers/buyer-reply-followup-action.controller");',
      'const buyerReplyFollowupActionController = require("../controllers/buyer-reply-followup-action.controller");\n' + requireLine.trimEnd()
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

if (!src.includes('"/api/manual-deal-outcome/preview"') && src.includes('"/api/buyer-reply-followup/summary",')) {
  src = src.replace(
    '"/api/buyer-reply-followup/summary",',
    '"/api/buyer-reply-followup/summary",\n        "/api/manual-deal-outcome/preview",\n        "/api/manual-deal-outcomes",\n        "/api/manual-deal-outcome/summary",'
  );
}

if (!src.includes('"POST /api/manual-deal-outcome/record"') && src.includes('"POST /api/buyer-reply-followup/plan",')) {
  src = src.replace(
    '"POST /api/buyer-reply-followup/plan",',
    '"POST /api/buyer-reply-followup/plan",\n        "POST /api/manual-deal-outcome/record",'
  );
}

const routeBlock = `  if (method === "GET" && url.pathname === "/api/manual-deal-outcome/preview") {
    return manualDealOutcomeController.manualDealOutcomePreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-deal-outcomes") {
    return manualDealOutcomeController.listManualDealOutcomesController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/manual-deal-outcome/summary") {
    return manualDealOutcomeController.manualDealOutcomeSummaryController(req, res, sendJson);
  }

  if (method === "POST" && url.pathname === "/api/manual-deal-outcome/record") {
    return manualDealOutcomeController.recordManualDealOutcomeController(req, res, sendJson);
  }

`;

if (!src.includes("manualDealOutcomePreviewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/buyer-reply-followup/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, routeBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for manual deal outcome routes.");
    }

    src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(routeFile, src, "utf8");

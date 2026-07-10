const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

const helperMarker = "// BUSINESS_STAGE_1F_HELPERS";
const helperBlock = `
${helperMarker}
function businessStage1FCollectJsonBody(req, callback) {
  let body = "";
  req.on("data", chunk => {
    body += chunk.toString();
    if (body.length > 1024 * 1024) req.destroy();
  });
  req.on("end", () => {
    try { callback(body ? JSON.parse(body) : {}); }
    catch (_) { callback({}); }
  });
}

function businessStage1FSendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function businessStage1FSendHtml(res, html) {
  const output = typeof injectDemegaProfessionalUi === "function" ? injectDemegaProfessionalUi(html) : html;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(output);
}
`;

if (!src.includes(helperMarker)) {
  const insertAt = src.indexOf("function ");
  src = insertAt >= 0 ? src.slice(0, insertAt) + helperBlock + "\n" + src.slice(insertAt) : helperBlock + "\n" + src;
}

const startMarker = "  // BUSINESS_STAGE_1F_FITMENT_INTELLIGENCE_START\n";
const endMarker = "  // BUSINESS_STAGE_1F_FITMENT_INTELLIGENCE_END\n";

const oldStart = src.indexOf(startMarker);
const oldEnd = src.indexOf(endMarker);
if (oldStart !== -1 && oldEnd !== -1 && oldEnd > oldStart) {
  src = src.slice(0, oldStart) + src.slice(oldEnd + endMarker.length);
}

const routeBlock = `${startMarker}  if (method === "GET" && (
    url.pathname === "/fitment" ||
    url.pathname === "/fitment-search" ||
    url.pathname === "/vin-search" ||
    url.pathname === "/ymm-search" ||
    url.pathname === "/part-number-search" ||
    url.pathname === "/cross-reference" ||
    url.pathname === "/alternative-compatible-parts"
  )) {
    const fs = require("fs");
    const path = require("path");
    return businessStage1FSendHtml(res, fs.readFileSync(path.join(process.cwd(), "public", "fitment-professional.html"), "utf8"));
  }

  if (method === "POST" && url.pathname === "/api/fitment/decode") {
    return businessStage1FCollectJsonBody(req, body => {
      const service = require("../services/fitment-intelligence.service");
      businessStage1FSendJson(res, 200, service.decodeFitmentRequest(body));
    });
  }

  if (method === "POST" && url.pathname === "/api/fitment/search") {
    return businessStage1FCollectJsonBody(req, body => {
      const service = require("../services/fitment-intelligence.service");
      businessStage1FSendJson(res, 200, service.searchFitment(body));
    });
  }

  if (method === "POST" && url.pathname === "/api/fitment/manual-record") {
    return businessStage1FCollectJsonBody(req, body => {
      const service = require("../services/fitment-intelligence.service");
      businessStage1FSendJson(res, 200, service.manualUpsertFitmentRecord(body));
    });
  }

  if (method === "POST" && url.pathname === "/api/part-number/search") {
    return businessStage1FCollectJsonBody(req, body => {
      const service = require("../services/fitment-intelligence.service");
      businessStage1FSendJson(res, 200, service.searchPartNumber(body));
    });
  }

  if (method === "POST" && url.pathname === "/api/cross-reference/search") {
    return businessStage1FCollectJsonBody(req, body => {
      const service = require("../services/fitment-intelligence.service");
      businessStage1FSendJson(res, 200, service.searchCrossReference(body));
    });
  }

  if (method === "POST" && url.pathname === "/api/compatible-alternatives/search") {
    return businessStage1FCollectJsonBody(req, body => {
      const service = require("../services/fitment-intelligence.service");
      businessStage1FSendJson(res, 200, service.searchCompatibleAlternatives(body));
    });
  }

${endMarker}`;

const firstRouteIndex = src.indexOf('  if (method === "GET"');
if (firstRouteIndex === -1) throw new Error("Could not find first GET route insertion point.");
src = src.slice(0, firstRouteIndex) + routeBlock + src.slice(firstRouteIndex);

fs.writeFileSync(file, src, "utf8");
console.log("Business Stage 1F fitment routes patched.");

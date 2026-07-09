const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

const helperMarker = "// BUSINESS_STAGE_1E_HELPERS";
const helperBlock = `
${helperMarker}
function businessStage1ECollectJsonBody(req, callback) {
  let body = "";
  req.on("data", chunk => {
    body += chunk.toString();
    if (body.length > 1024 * 1024) {
      req.destroy();
    }
  });
  req.on("end", () => {
    try {
      callback(body ? JSON.parse(body) : {});
    } catch (_) {
      callback({});
    }
  });
}

function businessStage1ESendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function businessStage1ESendProfessionalHtml(res, html) {
  const output = typeof injectDemegaProfessionalUi === "function" ? injectDemegaProfessionalUi(html) : html;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(output);
}
`;

if (!src.includes(helperMarker)) {
  const insertAt = src.indexOf("function ");
  src = insertAt >= 0 ? src.slice(0, insertAt) + helperBlock + "\n" + src.slice(insertAt) : helperBlock + "\n" + src;
}

const startMarker = "  // BUSINESS_STAGE_1E_SPARE_PARTS_INTELLIGENCE_START\n";
const endMarker = "  // BUSINESS_STAGE_1E_SPARE_PARTS_INTELLIGENCE_END\n";

const oldStart = src.indexOf(startMarker);
const oldEnd = src.indexOf(endMarker);
if (oldStart !== -1 && oldEnd !== -1 && oldEnd > oldStart) {
  src = src.slice(0, oldStart) + src.slice(oldEnd + endMarker.length);
}

const routeBlock = `${startMarker}  if (method === "GET" && (url.pathname === "/part-decoder" || url.pathname === "/part-decode/decode")) {
    const fs = require("fs");
    const path = require("path");
    return businessStage1ESendProfessionalHtml(res, fs.readFileSync(path.join(process.cwd(), "public", "part-decoder-professional.html"), "utf8"));
  }

  if (method === "GET" && (url.pathname === "/inventory" || url.pathname === "/inventory-command-center")) {
    const fs = require("fs");
    const path = require("path");
    return businessStage1ESendProfessionalHtml(res, fs.readFileSync(path.join(process.cwd(), "public", "inventory-professional.html"), "utf8"));
  }

  if (method === "GET" && (url.pathname === "/smart-match" || url.pathname === "/smart-match-command-center")) {
    const fs = require("fs");
    const path = require("path");
    return businessStage1ESendProfessionalHtml(res, fs.readFileSync(path.join(process.cwd(), "public", "smart-match-professional.html"), "utf8"));
  }

  if (method === "GET" && (url.pathname === "/auto-quote" || url.pathname === "/auto-quote/smart-build")) {
    const fs = require("fs");
    const path = require("path");
    return businessStage1ESendProfessionalHtml(res, fs.readFileSync(path.join(process.cwd(), "public", "auto-quote-professional.html"), "utf8"));
  }

  if (method === "GET" && (url.pathname === "/quote-history" || url.pathname === "/quote-drafts")) {
    const fs = require("fs");
    const path = require("path");
    return businessStage1ESendProfessionalHtml(res, fs.readFileSync(path.join(process.cwd(), "public", "quote-history-professional.html"), "utf8"));
  }

  if (method === "POST" && url.pathname === "/api/part-decode/decode") {
    return businessStage1ECollectJsonBody(req, body => {
      const service = require("../services/spare-parts-intelligence.service");
      businessStage1ESendJson(res, 200, service.decodePart(body));
    });
  }

  if (method === "GET" && url.pathname === "/api/professional-inventory/items") {
    const service = require("../services/spare-parts-intelligence.service");
    return businessStage1ESendJson(res, 200, { ok: true, items: service.getInventoryItems() });
  }

  if (method === "POST" && url.pathname === "/api/professional-inventory/manual-upsert") {
    return businessStage1ECollectJsonBody(req, body => {
      const service = require("../services/spare-parts-intelligence.service");
      businessStage1ESendJson(res, 200, service.manualUpsertInventory(body));
    });
  }

  if (method === "POST" && url.pathname === "/api/smart-match/check") {
    return businessStage1ECollectJsonBody(req, body => {
      const service = require("../services/spare-parts-intelligence.service");
      businessStage1ESendJson(res, 200, service.smartMatch(body));
    });
  }

  if (method === "POST" && url.pathname === "/api/auto-quote/smart-build") {
    return businessStage1ECollectJsonBody(req, body => {
      const service = require("../services/spare-parts-intelligence.service");
      businessStage1ESendJson(res, 200, service.buildSmartQuote(body));
    });
  }

  if (method === "GET" && url.pathname === "/api/quote-history") {
    const service = require("../services/spare-parts-intelligence.service");
    return businessStage1ESendJson(res, 200, { ok: true, items: service.getQuoteHistory() });
  }

${endMarker}`;

const firstRouteIndex = src.indexOf('  if (method === "GET"');
if (firstRouteIndex === -1) throw new Error("Could not find first GET route insertion point.");
src = src.slice(0, firstRouteIndex) + routeBlock + src.slice(firstRouteIndex);

fs.writeFileSync(file, src, "utf8");
console.log("Business Stage 1E intelligence routes patched.");

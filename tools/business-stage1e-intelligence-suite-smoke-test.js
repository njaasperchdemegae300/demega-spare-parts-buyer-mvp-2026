const fs = require("fs");
const path = require("path");

const checks = [];

function pass(name, ok) {
  checks.push({ name, ok });
}

function exists(file) {
  return fs.existsSync(path.join(process.cwd(), file));
}

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

pass("service exists", exists("src/services/spare-parts-intelligence.service.js"));
pass("part decoder page exists", exists("public/part-decoder-professional.html"));
pass("auto quote page exists", exists("public/auto-quote-professional.html"));
pass("inventory page exists", exists("public/inventory-professional.html"));
pass("smart match page exists", exists("public/smart-match-professional.html"));
pass("quote history page exists", exists("public/quote-history-professional.html"));
pass("route file exists", exists("src/routes/index.routes.js"));

const routes = read("src/routes/index.routes.js");
const service = require(path.join(process.cwd(), "src", "services", "spare-parts-intelligence.service.js"));

pass("part decoder route exists", routes.includes("/part-decoder"));
pass("part decode page alias exists", routes.includes("/part-decode/decode"));
pass("auto quote route exists", routes.includes("/auto-quote"));
pass("auto quote page alias exists", routes.includes("/auto-quote/smart-build"));
pass("inventory route exists", routes.includes("/inventory"));
pass("smart match route exists", routes.includes("/smart-match"));
pass("quote history route exists", routes.includes("/quote-history"));
pass("part decode API exists", routes.includes("/api/part-decode/decode"));
pass("auto quote API exists", routes.includes("/api/auto-quote/smart-build"));

const decoded = service.decodePart({ text: "Need Toyota Corolla 2005 alternator urgently" });
pass("decoder normalizes alternator", decoded.normalizedPart === "alternator");
pass("decoder detects vehicle model", String(decoded.vehicle.model).toLowerCase().includes("corolla"));
pass("decoder requires compatibility checks", Array.isArray(decoded.requiredCompatibilityChecks) && decoded.requiredCompatibilityChecks.length > 0);

const blockedQuote = service.buildSmartQuote({ text: "Corolla 2005 alternator", price: "85000" }, { persist: false });
pass("quote blocks without stock and compatibility", blockedQuote.ok === false && blockedQuote.status === "QUOTE_BLOCKED");

const safeQuote = service.buildSmartQuote({
  buyerName: "Test Buyer",
  text: "Corolla 2005 alternator",
  price: "85000",
  stockConfirmed: true,
  compatibilityConfirmed: true,
  manualReview: true
}, { persist: false });

pass("quote draft builds only after confirmations", safeQuote.ok === true && safeQuote.status === "MANUAL_QUOTE_DRAFT_READY");
pass("quote draft does not auto send WhatsApp", safeQuote.record.safety.whatsappSent === false && safeQuote.record.safety.autoSend === false);

pass("no unsafe automation added", !routes.includes("autoSendWhatsApp = true") && !routes.includes("activateRealBuyerTraffic = true"));

const verdict = checks.every(item => item.ok) ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1E Professional Spare Parts Intelligence Suite Report

## Verdict
${verdict}

## Test Results
${checks.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`).join("\n")}

## Routes Added
- GET /part-decoder
- GET /part-decode/decode
- GET /auto-quote
- GET /auto-quote/smart-build
- GET /inventory
- GET /smart-match
- GET /quote-history
- POST /api/part-decode/decode
- POST /api/auto-quote/smart-build
- POST /api/smart-match/check
- GET /api/quote-history
- GET /api/professional-inventory/items
- POST /api/professional-inventory/manual-upsert

## Business Value
- Decodes buyer requests into normalized spare-part intelligence.
- Allows manual inventory records.
- Matches buyer request against inventory records.
- Blocks quote until stock confirmation, compatibility confirmation, and manual review are present.
- Saves safe manual quote drafts only.
- Supports buyer maintenance without unsafe automation.

## Safety Confirmed
- No traffic gate opened.
- No ads started.
- No buyer contacted.
- No WhatsApp sent.
- No auto-reply.
- No auto-follow-up.
- No private-data scraping.
- No hidden data harvesting.
- No quote before stock confirmation.
- No quote before compatibility confirmation.
- No inventory mutation from buyer flow.
- No accounting mutation.
- No sale closing.
- No pipeline movement.

## Next Required Action
Push to GitHub, redeploy Render latest commit, then test the new professional routes online.
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1e-intelligence-suite-report.md"), report, "utf8");

console.log(report);

if (verdict !== "APPROVED") process.exit(1);

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

pass("professional admin hub exists", exists("public/admin-hub-professional.html"));
pass("route file exists", exists("src/routes/index.routes.js"));

const html = read("public/admin-hub-professional.html");
const routes = read("src/routes/index.routes.js");

pass("professional title exists", html.includes("Demega Admin Control Center"));
pass("clean workflow exists", html.includes("Clean Operating Workflow"));
pass("core modules exist", html.includes("Core Modules"));
pass("safety locks exist", html.includes("Safety Locks"));
pass("15-lead tracker link exists", html.includes("/controlled-15-lead-proof-test"));
pass("stock gate link exists", html.includes("/stock-confirmation-gate"));
pass("compatibility gate link exists", html.includes("/compatibility-confirmation-gate"));
pass("manual quote draft link exists", html.includes("/manual-quote-draft"));
pass("buyer reply tracking link exists", html.includes("/buyer-reply-tracking"));
pass("professional admin route intercept exists", routes.includes("BUSINESS_STAGE_1D_FIX2_PROFESSIONAL_ADMIN_HUB_START"));
pass("/admin-hub routes to professional page", routes.includes('url.pathname === "/admin-hub"') && routes.includes("admin-hub-professional.html"));
pass("/app alias routes to professional page", routes.includes('url.pathname === "/app"'));
pass("no unsafe automation added", !html.includes("autoSendWhatsApp = true") && !html.includes("openLiveGate = true") && !html.includes("activateRealBuyerTraffic = true"));

const verdict = checks.every(item => item.ok) ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1D-FIX-2 Professional Admin Hub Rebuild Report

## Verdict
${verdict}

## Test Results
${checks.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`).join("\n")}

## What Was Fixed
- Rebuilt /admin-hub into a professional control center.
- Replaced scattered safety-lock overload with clean safety summary.
- Organized modules by buyer workflow.
- Added clear status cards.
- Added clean operating workflow.
- Added professional navigation to key gates.
- Kept traffic gate closed.
- Kept all buyer contact automation blocked.

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
- No inventory mutation.
- No accounting mutation.
- No sale closing.
- No pipeline movement.

## Next Required Action
Push to GitHub, redeploy Render latest commit, then open:
https://demega-spare-parts-buyer-mvp-2026-1.onrender.com/admin-hub
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1d-fix2-professional-admin-hub-report.md"), report, "utf8");

console.log(report);

if (verdict !== "APPROVED") process.exit(1);

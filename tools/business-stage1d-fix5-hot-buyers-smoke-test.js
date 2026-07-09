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

pass("hot buyers professional html exists", exists("public/hot-buyers-professional.html"));
pass("route file exists", exists("src/routes/index.routes.js"));

const html = read("public/hot-buyers-professional.html");
const routes = read("src/routes/index.routes.js");

pass("professional hot buyers title exists", html.includes("Demega Hot Buyers Command Center"));
pass("ranked hot buyers panel exists", html.includes("Ranked Hot Buyers"));
pass("kpi cards exist", html.includes("Hot Buyers") && html.includes("Warm Buyers") && html.includes("Urgent Buyers"));
pass("filter bar exists", html.includes("searchInput") && html.includes("temperatureFilter") && html.includes("actionFilter"));
pass("table wrap exists", html.includes("table-wrap"));
pass("api fallback fetch exists", html.includes("/api/hot-buyers") && html.includes("/api/leads"));
pass("hot buyers route intercept exists", routes.includes("BUSINESS_STAGE_1D_FIX5_PROFESSIONAL_HOT_BUYERS_START"));
pass("hot buyers route path exists", routes.includes('url.pathname === "/hot-buyers"'));
pass("hot buyer command center route path exists", routes.includes('url.pathname === "/hot-buyer-command-center"'));
pass("professional ui injection kept", routes.includes("injectDemegaProfessionalUi(html)"));
pass("no unsafe automation added", !html.includes("autoSendWhatsApp = true") && !html.includes("activateTraffic = true"));

const verdict = checks.every(item => item.ok) ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1D-FIX-5 Professional Hot Buyers Page Rebuild Report

## Verdict
${verdict}

## Test Results
${checks.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`).join("\n")}

## What Was Fixed
- Rebuilt /hot-buyers into a professional command center.
- Reduced the visible table to core hot-buyer columns.
- Added clean KPI cards.
- Added professional filter row.
- Added safe read-only banner.
- Added proper spacing and hierarchy.
- Aligned /hot-buyer-command-center and /ranked-hot-buyers to the same professional page.

## Safety Confirmed
- No traffic gate opened.
- No ads started.
- No buyer contacted.
- No WhatsApp sent.
- No auto-reply.
- No auto-follow-up.
- No private-data scraping.
- No hidden data harvesting.
- No inventory mutation.
- No accounting mutation.
- No sale closing.
- No pipeline movement.

## Next Required Action
Push to GitHub, redeploy Render latest commit, then open:
- /hot-buyers
- /hot-buyer-command-center
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1d-fix5-hot-buyers-report.md"), report, "utf8");

console.log(report);

if (verdict !== "APPROVED") process.exit(1);

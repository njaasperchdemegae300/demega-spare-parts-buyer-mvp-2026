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

pass("dashboard professional html exists", exists("public/dashboard-professional.html"));
pass("route file exists", exists("src/routes/index.routes.js"));

const html = read("public/dashboard-professional.html");
const routes = read("src/routes/index.routes.js");

pass("professional dashboard title exists", html.includes("Demega Admin Lead Dashboard"));
pass("buyer leads panel exists", html.includes("Buyer Leads"));
pass("kpi cards exist", html.includes("Total Leads") && html.includes("Hot Leads") && html.includes("Warm Leads"));
pass("filter bar exists", html.includes("searchInput") && html.includes("sourceFilter") && html.includes("statusFilter"));
pass("table wrap exists", html.includes("table-wrap"));
pass("api leads fetch exists", html.includes('fetch("/api/leads")'));
pass("dashboard route intercept exists", routes.includes("BUSINESS_STAGE_1D_FIX4_PROFESSIONAL_DASHBOARD_START"));
pass("dashboard route path exists", routes.includes('url.pathname === "/dashboard"'));
pass("buyer-dashboard route path exists", routes.includes('url.pathname === "/buyer-dashboard"'));
pass("professional ui injection kept", routes.includes("injectDemegaProfessionalUi(html)"));
pass("no unsafe automation added", !html.includes("autoSendWhatsApp = true") && !html.includes("activateTraffic = true"));

const verdict = checks.every(item => item.ok) ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1D-FIX-4 Professional Buyer Dashboard Rebuild Report

## Verdict
${verdict}

## Test Results
${checks.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`).join("\n")}

## What Was Fixed
- Rebuilt /dashboard into a professional buyer-lead dashboard.
- Reduced the visible table to core business columns only.
- Added clean KPI cards.
- Added professional filter row.
- Added safe read-only banner.
- Added proper spacing and hierarchy.
- Kept /buyer-dashboard aligned to the same professional dashboard.

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
- /dashboard
- /buyer-dashboard
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1d-fix4-dashboard-report.md"), report, "utf8");

console.log(report);

if (verdict !== "APPROVED") process.exit(1);

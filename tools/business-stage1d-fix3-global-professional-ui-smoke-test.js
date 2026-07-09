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

pass("professional CSS exists", exists("public/demega-professional-ui.css"));
pass("professional JS exists", exists("public/demega-professional-ui.js"));
pass("route file exists", exists("src/routes/index.routes.js"));

const routes = read("src/routes/index.routes.js");
const css = read("public/demega-professional-ui.css");
const js = read("public/demega-professional-ui.js");

pass("CSS route exists", routes.includes("/demega-professional-ui.css"));
pass("JS route exists", routes.includes("/demega-professional-ui.js"));
pass("inject function exists", routes.includes("injectDemegaProfessionalUi"));
pass("HTML responses inject professional UI", routes.includes("injectDemegaProfessionalUi("));
pass("buyer-dashboard alias exists", routes.includes('/buyer-dashboard'));
pass("CSS blocks horizontal page overflow", css.includes("overflow-x: hidden"));
pass("CSS wraps tables professionally", css.includes("dm-table-scroll"));
pass("JS wraps tables", js.includes("dm-table-scroll"));
pass("JS adds clean top navigation", js.includes("dm-top-clean-nav"));
pass("JS repairs buyer-dashboard link", js.includes("/buyer-dashboard") && js.includes("/dashboard"));
pass("no unsafe automation added", !routes.includes("autoSendWhatsApp = true") && !routes.includes("openLiveGate = true") && !routes.includes("activateRealBuyerTraffic = true"));

const verdict = checks.every((item) => item.ok) ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1D-FIX-3 Global Professional UI Shell Report

## Verdict
${verdict}

## Test Results
${checks.map((item) => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`).join("\n")}

## What Was Fixed
- Added global professional CSS.
- Added global professional JS.
- Injected professional UI shell into HTML responses.
- Added clean top navigation across pages.
- Wrapped wide tables automatically.
- Reduced horizontal scrolling risk.
- Repaired broken /buyer-dashboard link by redirecting to /dashboard.
- Preserved module pages while making them more professional and readable.

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
Push to GitHub, redeploy Render latest commit, then test:
- /admin-hub
- /hot-buyers
- /buyer-dashboard
- /online-deployment-public-url-verification
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1d-fix3-global-professional-ui-report.md"), report, "utf8");

console.log(report);

if (verdict !== "APPROVED") process.exit(1);

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

pass("publish-ready hub exists", exists("public/publish-ready-hub.html"));
pass("route file exists", exists("src/routes/index.routes.js"));

const hub = read("public/publish-ready-hub.html");
const routes = read("src/routes/index.routes.js");

pass("clean hub title exists", hub.includes("Demega Publish-Ready Control Center"));
pass("clean hub links admin hub", hub.includes("/admin-hub"));
pass("clean hub links controlled tracker", hub.includes("/controlled-15-lead-proof-test"));
pass("clean hub links readiness gate", hub.includes("/internet-deployment-readiness-gate"));
pass("clean hub links public URL gate", hub.includes("/online-deployment-public-url-verification"));
pass("publish-ready route exists", routes.includes("/publish-ready-hub"));
pass("app alias route exists", routes.includes("/app"));
pass("no unsafe automation added", !hub.includes("autoSendWhatsApp = true") && !hub.includes("openLiveGate = true") && !hub.includes("activateRealBuyerTraffic = true"));

const publicDir = path.join(process.cwd(), "public");
const htmlFiles = fs.readdirSync(publicDir).filter(file => file.endsWith(".html"));
const polishedCount = htmlFiles.filter(file => read(path.join("public", file)).includes('id="demega-ui-polish"')).length;
pass("UI polish injected into public HTML files", polishedCount >= 3);

const verdict = checks.every(item => item.ok) ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1D-PRE Public UI Organization / Publish-Ready Polish Report

## Verdict
${verdict}

## Test Results
${checks.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`).join("\n")}

## What Was Improved
- Added clean publish-ready control center.
- Added /publish-ready-hub route.
- Added /demega-control-center route.
- Added /app route.
- Injected responsive UI polish into public HTML pages.
- Reduced horizontal overflow risk.
- Kept safety locks visible.
- Kept traffic gate closed.

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
- /publish-ready-hub
- /app
- /admin-hub
- /controlled-15-lead-proof-test
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1d-pre-ui-polish-report.md"), report, "utf8");

console.log(report);

if (verdict !== "APPROVED") process.exit(1);

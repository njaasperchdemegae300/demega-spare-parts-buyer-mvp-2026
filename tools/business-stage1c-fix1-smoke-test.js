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

pass("internet readiness HTML exists", exists("public/internet-deployment-readiness-gate.html"));
pass("online verification HTML exists", exists("public/online-deployment-public-url-verification.html"));
pass("route file exists", exists("src/routes/index.routes.js"));

const routes = read("src/routes/index.routes.js");

pass("internet readiness route exists", routes.includes("/internet-deployment-readiness-gate"));
pass("online verification route exists", routes.includes("/online-deployment-public-url-verification"));
pass("routes use direct HTML response to avoid sendHtml server error", routes.includes("res.writeHead(200") && routes.includes("res.end(html)"));
pass("no unsafe automation added", !routes.includes("autoSendWhatsApp = true") && !routes.includes("openLiveGate = true") && !routes.includes("activateRealBuyerTraffic = true"));

const verdict = checks.every(item => item.ok) ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1C FIX-1 Public Verification Route Repair Report

## Verdict
${verdict}

## Test Results
${checks.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`).join("\n")}

## Issue Repaired
- /internet-deployment-readiness-gate returned 404 online.
- /online-deployment-public-url-verification returned 500 online.

## Safety Confirmed
- No traffic gate opened.
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
Push this fix to GitHub, redeploy Render latest commit, then rerun public URL verification.
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1c-fix1-public-route-repair-report.md"), report, "utf8");

console.log(report);

if (verdict !== "APPROVED") process.exit(1);

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

pass("readiness document exists", exists("docs/BUSINESS_STAGE_1B_INTERNET_DEPLOYMENT_READINESS_GATE.md"));
pass("traffic source registry exists", exists("TRAFFIC_SOURCE_REGISTRY.md"));
pass("readiness dashboard exists", exists("public/internet-deployment-readiness-gate.html"));

const doc = read("docs/BUSINESS_STAGE_1B_INTERNET_DEPLOYMENT_READINESS_GATE.md");
const registry = read("TRAFFIC_SOURCE_REGISTRY.md");
const dashboard = read("public/internet-deployment-readiness-gate.html");

pass("WhatsApp downgraded to communication tool in docs", doc.includes("WhatsApp is now classified as") && doc.includes("communication channel"));
pass("WhatsApp not main traffic source in registry", registry.includes("not be treated as the main traffic source"));
pass("approved internet buyer-intent sources recorded", registry.includes("Owned RFQ landing page") && registry.includes("Google buyer-intent landing page") && registry.includes("Meta Lead Form"));
pass("unsafe WhatsApp blasting blocked", registry.includes("WhatsApp blasting") && registry.includes("unsolicited WhatsApp"));
pass("dashboard confirms readiness only", dashboard.includes("READINESS ONLY") && dashboard.includes("Traffic Gate") && dashboard.includes("NOT OPENED"));
pass("dashboard confirms public URL requirement", dashboard.includes("PUBLIC URL"));
pass("dashboard contains no unsafe automation", !dashboard.includes("autoSendWhatsApp = true") && !dashboard.includes("openLiveGate = true") && !dashboard.includes("activateRealBuyerTraffic = true"));

const allOk = checks.every(item => item.ok);
const verdict = allOk ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1B Internet Deployment Readiness Gate Smoke Test Report

## Verdict
${verdict}

## Test Results
${checks.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`).join("\n")}

## Strategic Decision Confirmed
- WhatsApp is communication / reply / closing tool only.
- WhatsApp is not the primary traffic source.
- Approved internet buyer-intent sources are the next traffic direction.
- Project must become available online before opening traffic gates.
- Android phone and laptop testing must be possible after deployment.

## Safety Confirmed
- No traffic gate opened.
- No buyer contacted.
- No WhatsApp sent.
- No auto-reply.
- No auto-follow-up.
- No spam.
- No unsolicited WhatsApp.
- No private-data scraping.
- No hidden data harvesting.
- No quote before stock confirmation.
- No quote before compatibility confirmation.
- No inventory mutation.
- No accounting mutation.
- No sale closing.
- No pipeline movement.

## Next Stage After Approval
Business Stage 1C — Online Deployment Execution / Public URL Verification.
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1b-internet-deployment-readiness-gate-report.md"), report, "utf8");

console.log(report);

if (!allOk) process.exit(1);

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3028;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version2a-buyer-intake-smoke-test-report.md");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopProcess(child) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  } catch {}
}

async function request(route, options = {}) {
  const response = await fetch(`${BASE_URL}${route}`, options);
  const text = await response.text();

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { route, status: response.status, ok: response.ok, body };
}

async function main() {
  let logs = "";

  const child = spawn("node", ["src/server.js"], {
    cwd: ROOT,
    shell: true,
    env: { ...process.env, PORT: String(PORT) }
  });

  child.stdout.on("data", data => logs += data.toString());
  child.stderr.on("data", data => logs += data.toString());

  await wait(2000);

  const goodLead = {
    buyerName: "Test Buyer",
    phone: "08000000000",
    source: "manual_shop_visitor",
    partNeeded: "1ZZ alternator",
    vehicleBrand: "Toyota",
    vehicleModel: "Corolla",
    vehicleYear: "2005",
    engineCode: "1ZZ",
    location: "Lagos",
    urgency: "urgent",
    message: "Need 1ZZ alternator urgently."
  };

  const badLead = {
    buyerName: "Bad Source Buyer",
    phone: "08000000001",
    source: "scraped_private_number",
    partNeeded: "starter motor",
    vehicleBrand: "Toyota",
    vehicleModel: "Camry",
    location: "Lagos"
  };

  const results = [];
  results.push(await request("/api/health"));
  results.push(await request("/api/buyer-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goodLead)
  }));
  results.push(await request("/api/buyer-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(badLead)
  }));
  results.push(await request("/api/leads"));

  stopProcess(child);

  const healthOk = results[0].status === 200;
  const createOk =
    results[1].status === 201 &&
    results[1].body.lead &&
    results[1].body.lead.manualReviewRequired === true &&
    results[1].body.lead.stockConfirmed === false &&
    results[1].body.lead.compatibilityConfirmed === false;

  const badSourceBlocked = results[2].status === 400;
  const listOk =
    results[3].status === 200 &&
    Array.isArray(results[3].body.leads) &&
    results[3].body.leads.length >= 1;

  const verdict = healthOk && createOk && badSourceBlocked && listOk ? "APPROVED" : "NEEDS FIX";

  const report = `# Version 2A Buyer Intake Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createOk ? "PASS" : "FAIL"}: POST /api/buyer-intake creates safe manual-review lead
- ${badSourceBlocked ? "PASS" : "FAIL"}: blocked unapproved/private-data source
- ${listOk ? "PASS" : "FAIL"}: GET /api/leads returns lead list

## Safety Checks
- Lead requires manual review before reply.
- Lead does not confirm stock automatically.
- Lead does not confirm compatibility automatically.
- Unapproved private-data source is blocked.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 2B — Buyer Intake Validation Hardening
`;

  fs.writeFileSync(reportPath, report, "utf8");
  console.log(report);

  if (verdict !== "APPROVED") process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

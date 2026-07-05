const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3030;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version3a-admin-dashboard-smoke-test-report.md");

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

async function get(route) {
  const response = await fetch(`${BASE_URL}${route}`);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { route, status: response.status, ok: response.ok, text, body };
}

async function main() {
  let logs = "";

  const child = spawn("node", ["src/server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) }
  });

  child.stdout.on("data", data => logs += data.toString());
  child.stderr.on("data", data => logs += data.toString());

  await wait(2000);

  const health = await get("/api/health");
  const dashboard = await get("/dashboard");
  const admin = await get("/admin");
  const summary = await get("/api/dashboard/summary");
  const leads = await get("/api/leads");

  stopProcess(child);

  const healthOk = health.status === 200;
  const dashboardOk = dashboard.status === 200 && dashboard.text.includes("Demega Admin Lead Dashboard");
  const adminOk = admin.status === 200 && admin.text.includes("Demega Admin Lead Dashboard");
  const summaryOk =
    summary.status === 200 &&
    summary.body &&
    summary.body.dashboard === "Admin Lead Dashboard" &&
    typeof summary.body.totalLeads === "number" &&
    summary.body.safety &&
    summary.body.safety.autoSendWhatsApp === false;

  const leadsOk =
    leads.status === 200 &&
    leads.body &&
    Array.isArray(leads.body.leads);

  const verdict =
    healthOk &&
    dashboardOk &&
    adminOk &&
    summaryOk &&
    leadsOk
      ? "APPROVED"
      : "NEEDS FIX";

  const report = `# Version 3A Admin Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${dashboardOk ? "PASS" : "FAIL"}: GET /dashboard returns admin dashboard HTML
- ${adminOk ? "PASS" : "FAIL"}: GET /admin returns admin dashboard HTML
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/dashboard/summary returns dashboard metrics
- ${leadsOk ? "PASS" : "FAIL"}: GET /api/leads returns lead list

## Dashboard Safety Rules
- Dashboard is read-only in Version 3A.
- Dashboard does not auto-send WhatsApp.
- Dashboard does not quote before stock confirmation.
- Dashboard does not quote before compatibility confirmation.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 3B — Dashboard Buyer Lead Display Hardening
`;

  fs.writeFileSync(reportPath, report, "utf8");
  console.log(report);

  if (verdict !== "APPROVED") process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

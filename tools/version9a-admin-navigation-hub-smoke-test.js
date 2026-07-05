const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3042;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version9a-admin-navigation-hub-smoke-test-report.md");

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

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { route, status: response.status, ok: response.ok, text, body };
}

async function main() {
  let logs = "";
  let child;

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logs += data.toString());
    child.stderr.on("data", data => logs += data.toString());

    await wait(2000);

    const health = await request("/api/health");
    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const summary = await request("/api/admin-navigation/summary");

    const dashboard = await request("/dashboard");
    const inventory = await request("/inventory");
    const quotes = await request("/quotes");
    const pipeline = await request("/pipeline");
    const followups = await request("/followups");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("/dashboard") &&
      hub.text.includes("/inventory") &&
      hub.text.includes("/quotes") &&
      hub.text.includes("/pipeline") &&
      hub.text.includes("/followups") &&
      hub.text.includes("NO AUTO SEND") &&
      hub.text.includes("MANUAL REVIEW REQUIRED");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Demega Admin Navigation Hub");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.message === "Admin Navigation Hub Foundation is active." &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.length >= 5 &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoCreateQuote === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.manualReviewRequired === true;

    const linkedPagesOk =
      dashboard.status === 200 &&
      inventory.status === 200 &&
      quotes.status === 200 &&
      pipeline.status === 200 &&
      followups.status === 200;

    const readOnlyOk =
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("quoteCreatedAutomatically = true") &&
      !hub.text.includes('fetch("/api/') &&
      !hub.text.includes("POST");

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      summaryOk &&
      linkedPagesOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 9A Admin Navigation Hub Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: GET /admin-navigation-hub returns navigation hub
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub alias works
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/admin-navigation/summary returns safe module summary
- ${linkedPagesOk ? "PASS" : "FAIL"}: navigation-linked dashboard pages are reachable
- ${readOnlyOk ? "PASS" : "FAIL"}: admin navigation hub remains navigation-only

## Safety Rules Confirmed
- Admin hub is navigation-only.
- Admin hub does not send WhatsApp.
- Admin hub does not create quote automatically.
- Admin hub does not move pipeline stage automatically.
- Manual review remains required.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 9B — Admin Navigation Hub Dashboard Polish
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);

    if (verdict !== "APPROVED") process.exitCode = 1;
  } finally {
    if (child) stopProcess(child);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

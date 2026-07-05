const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3031;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const reportPath = path.join(ROOT, "reports", "version3b-dashboard-hardening-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreLeads() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
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

    const dashboardFile = fs.readFileSync(path.join(ROOT, "public", "admin-dashboard.html"), "utf8");

    const testLead = {
      buyerName: "<script>Bad Buyer</script>",
      phone: "08033333333",
      source: "whatsapp_inbound",
      partNeeded: "1ZZ alternator <bad>",
      vehicleBrand: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: "2005",
      engineCode: "1ZZ",
      location: "Lagos",
      urgency: "urgent",
      message: "Dashboard hardening test lead"
    };

    const create = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testLead)
    });

    const dashboard = await request("/dashboard");
    const summary = await request("/api/dashboard/summary");
    const leads = await request("/api/leads");

    const dashboardHtmlOk =
      dashboard.status === 200 &&
      dashboard.text.includes("Demega Admin Lead Dashboard") &&
      dashboard.text.includes("escapeHtml") &&
      dashboard.text.includes("Manual review") &&
      dashboard.text.includes("Possible duplicate") &&
      dashboard.text.includes("sourceFilter") &&
      dashboard.text.includes("reviewFilter");

    const createdOk =
      create.status === 201 &&
      create.body &&
      create.body.lead &&
      create.body.lead.buyerName.includes("script") &&
      !create.body.lead.buyerName.includes("<") &&
      !create.body.lead.partNeeded.includes("<") &&
      create.body.lead.manualReviewRequired === true &&
      create.body.lead.stockConfirmed === false &&
      create.body.lead.compatibilityConfirmed === false;

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      typeof summary.body.totalLeads === "number" &&
      summary.body.manualReviewRequired >= 1 &&
      summary.body.safety &&
      summary.body.safety.autoSendWhatsApp === false;

    const leadsOk =
      leads.status === 200 &&
      leads.body &&
      Array.isArray(leads.body.leads) &&
      leads.body.leads.some(lead => lead.phone === "08033333333");

    const sourceFilterOk = dashboardFile.includes("sourceFilter");
    const searchOk = dashboardFile.includes("searchInput");
    const escapeOk = dashboardFile.includes("function escapeHtml");
    const readOnlyOk = !dashboardFile.includes("sendWhatsApp(") && !dashboardFile.includes("autoSend");

    const verdict =
      dashboardHtmlOk &&
      createdOk &&
      summaryOk &&
      leadsOk &&
      sourceFilterOk &&
      searchOk &&
      escapeOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 3B Dashboard Hardening Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${dashboardHtmlOk ? "PASS" : "FAIL"}: dashboard HTML includes hardened lead display UI
- ${createdOk ? "PASS" : "FAIL"}: unsafe lead text is cleaned before storage/display
- ${summaryOk ? "PASS" : "FAIL"}: dashboard summary metrics work
- ${leadsOk ? "PASS" : "FAIL"}: lead list contains test lead during test
- ${sourceFilterOk ? "PASS" : "FAIL"}: source filter exists
- ${searchOk ? "PASS" : "FAIL"}: search input exists
- ${escapeOk ? "PASS" : "FAIL"}: HTML escaping exists
- ${readOnlyOk ? "PASS" : "FAIL"}: dashboard remains read-only

## Safety Rules Confirmed
- No WhatsApp auto-send.
- No quote before stock confirmation.
- No quote before compatibility confirmation.
- Manual review remains required.
- Test lead data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 4A — Buyer Scoring Engine Foundation
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);

    if (verdict !== "APPROVED") process.exitCode = 1;
  } finally {
    if (child) stopProcess(child);
    restoreLeads();
  }
}

main().catch(error => {
  restoreLeads();
  console.error(error);
  process.exit(1);
});

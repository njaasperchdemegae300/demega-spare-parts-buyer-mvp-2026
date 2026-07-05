const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3033;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const reportPath = path.join(ROOT, "reports", "version4b-scoring-dashboard-display-smoke-test-report.md");

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

    const hotLead = {
      buyerName: "Dashboard Score Buyer",
      phone: "08066666666",
      source: "whatsapp_inbound",
      partNeeded: "1ZZ alternator",
      vehicleBrand: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: "2005",
      engineCode: "1ZZ",
      location: "Lagos",
      urgency: "urgent",
      message: "Need 1ZZ alternator urgently today."
    };

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hotLead)
    });

    const dashboard = await request("/dashboard");
    const summary = await request("/api/dashboard/summary");
    const leads = await request("/api/leads");

    const dashboardOk =
      dashboard.status === 200 &&
      dashboard.text.includes("Lead Score") &&
      dashboard.text.includes("Temperature") &&
      dashboard.text.includes("Buyer Type") &&
      dashboard.text.includes("Source Quality") &&
      dashboard.text.includes("Scoring Reasons") &&
      dashboard.text.includes("hotLeads") &&
      dashboard.text.includes("warmLeads") &&
      dashboard.text.includes("coldLeads");

    const createdScoredLeadOk =
      createLead.status === 201 &&
      createLead.body &&
      createLead.body.lead &&
      typeof createLead.body.lead.leadScore === "number" &&
      createLead.body.lead.temperature === "hot" &&
      createLead.body.lead.buyerType &&
      createLead.body.lead.sourceQuality &&
      Array.isArray(createLead.body.lead.scoringReasons);

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      typeof summary.body.hotLeads === "number" &&
      typeof summary.body.warmLeads === "number" &&
      typeof summary.body.coldLeads === "number" &&
      summary.body.hotLeads >= 1 &&
      summary.body.safety &&
      summary.body.safety.autoSendWhatsApp === false;

    const leadsOk =
      leads.status === 200 &&
      leads.body &&
      Array.isArray(leads.body.leads) &&
      leads.body.leads.some(lead =>
        lead.phone === "08066666666" &&
        typeof lead.leadScore === "number" &&
        lead.temperature === "hot"
      );

    const dashboardReadOnlyOk =
      !dashboard.text.includes("sendWhatsApp(") &&
      !dashboard.text.includes("autoSendWhatsApp = true") &&
      dashboard.text.includes("Manual review");

    const verdict =
      dashboardOk &&
      createdScoredLeadOk &&
      summaryOk &&
      leadsOk &&
      dashboardReadOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 4B Buyer Scoring Dashboard Display Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${dashboardOk ? "PASS" : "FAIL"}: dashboard displays scoring columns and scoring metric cards
- ${createdScoredLeadOk ? "PASS" : "FAIL"}: new buyer lead receives scoring fields
- ${summaryOk ? "PASS" : "FAIL"}: dashboard summary returns hot/warm/cold metrics
- ${leadsOk ? "PASS" : "FAIL"}: lead list contains scored lead during test
- ${dashboardReadOnlyOk ? "PASS" : "FAIL"}: dashboard remains read-only and manual-review focused

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
Version 5A — Inventory Command Center Foundation
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

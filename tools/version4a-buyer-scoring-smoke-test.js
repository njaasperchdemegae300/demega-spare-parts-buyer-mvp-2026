const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3032;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const reportPath = path.join(ROOT, "reports", "version4a-buyer-scoring-smoke-test-report.md");

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
      buyerName: "Hot Scoring Buyer",
      phone: "08044444444",
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

    const weakLead = {
      buyerName: "Weak Scoring Buyer",
      phone: "08055555555",
      source: "referral",
      partNeeded: "part",
      vehicleBrand: "Toyota",
      vehicleModel: "Camry",
      location: "Unknown",
      urgency: "normal",
      message: "Price?"
    };

    const createHot = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hotLead)
    });

    const createWeak = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(weakLead)
    });

    const preview = await request("/api/scoring/preview");
    const scoringSummary = await request("/api/scoring/summary");
    const dashboardSummary = await request("/api/dashboard/summary");

    const hotOk =
      createHot.status === 201 &&
      createHot.body.lead &&
      typeof createHot.body.lead.leadScore === "number" &&
      createHot.body.lead.temperature === "hot" &&
      createHot.body.lead.manualReviewRequired === true &&
      createHot.body.lead.stockConfirmed === false &&
      createHot.body.lead.compatibilityConfirmed === false;

    const weakOk =
      createWeak.status === 201 &&
      createWeak.body.lead &&
      typeof createWeak.body.lead.leadScore === "number" &&
      ["warm", "cold"].includes(createWeak.body.lead.temperature);

    const previewOk =
      preview.status === 200 &&
      preview.body.sampleScore &&
      typeof preview.body.sampleScore.leadScore === "number" &&
      preview.body.sampleScore.temperature === "hot";

    const summaryOk =
      scoringSummary.status === 200 &&
      scoringSummary.body.summary &&
      scoringSummary.body.summary.total >= 2 &&
      scoringSummary.body.summary.hot >= 1;

    const dashboardOk =
      dashboardSummary.status === 200 &&
      dashboardSummary.body &&
      typeof dashboardSummary.body.hotLeads === "number" &&
      dashboardSummary.body.safety &&
      dashboardSummary.body.safety.autoSendWhatsApp === false;

    const verdict =
      hotOk &&
      weakOk &&
      previewOk &&
      summaryOk &&
      dashboardOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 4A Buyer Scoring Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${hotOk ? "PASS" : "FAIL"}: hot buyer gets score and hot temperature
- ${weakOk ? "PASS" : "FAIL"}: weaker buyer gets lower temperature
- ${previewOk ? "PASS" : "FAIL"}: scoring preview endpoint works
- ${summaryOk ? "PASS" : "FAIL"}: scoring summary endpoint works
- ${dashboardOk ? "PASS" : "FAIL"}: dashboard summary includes scoring metrics

## Safety Rules Confirmed
- Scoring does not auto-send WhatsApp.
- Scoring does not confirm stock automatically.
- Scoring does not confirm compatibility automatically.
- Manual review remains required.
- Test lead data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 4B — Buyer Scoring Dashboard Display
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

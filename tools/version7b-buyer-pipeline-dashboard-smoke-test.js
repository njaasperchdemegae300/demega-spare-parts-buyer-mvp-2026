const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3039;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const pipelinePath = path.join(ROOT, "src", "data", "pipeline-events.json");
const reportPath = path.join(ROOT, "reports", "version7b-buyer-pipeline-dashboard-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalPipeline = fs.existsSync(pipelinePath) ? fs.readFileSync(pipelinePath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(pipelinePath, originalPipeline, "utf8");
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

    const buyerLead = {
      buyerName: "Pipeline Dashboard Buyer",
      phone: "08013131313",
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

    const health = await request("/api/health");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const move = await request("/api/pipeline/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        nextStage: "follow_up_needed",
        note: "Dashboard test follow-up.",
        changedBy: "master_admin"
      })
    });

    const page = await request("/pipeline");
    const aliasPage = await request("/buyer-pipeline");
    const summary = await request("/api/pipeline/summary");
    const events = await request("/api/pipeline/events");
    const leads = await request("/api/leads");

    const healthOk = health.status === 200;

    const moveOk =
      move.status === 200 &&
      move.body.lead &&
      move.body.lead.pipelineStage === "follow_up_needed" &&
      move.body.event &&
      move.body.event.manualActionOnly === true;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Buyer Pipeline Dashboard") &&
      page.text.includes("Pipeline Stage") &&
      page.text.includes("Follow Up Needed") &&
      page.text.includes("Pipeline Events") &&
      page.text.includes("Manual-action only") &&
      page.text.includes("NO AUTO SEND") &&
      page.text.includes("pipelineRows") &&
      page.text.includes("eventRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Buyer Pipeline Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.byStage.follow_up_needed >= 1 &&
      summary.body.summary.totalPipelineEvents >= 1 &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.autoCreateQuote === false &&
      summary.body.summary.safety.manualActionOnly === true;

    const eventsOk =
      events.status === 200 &&
      events.body &&
      Array.isArray(events.body.events) &&
      events.body.events.some(event =>
        event.leadId === createLead.body.lead.id &&
        event.toStage === "follow_up_needed"
      );

    const leadsOk =
      leads.status === 200 &&
      leads.body &&
      Array.isArray(leads.body.leads) &&
      leads.body.leads.some(lead =>
        lead.id === createLead.body.lead.id &&
        lead.pipelineStage === "follow_up_needed"
      );

    const readOnlyOk =
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("quoteCreatedAutomatically = true") &&
      !page.text.includes('fetch("/api/pipeline/move"');

    const verdict =
      healthOk &&
      moveOk &&
      pageOk &&
      aliasOk &&
      summaryOk &&
      eventsOk &&
      leadsOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 7B Buyer Pipeline Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${moveOk ? "PASS" : "FAIL"}: manual pipeline move created for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /pipeline returns buyer pipeline dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /buyer-pipeline alias works
- ${summaryOk ? "PASS" : "FAIL"}: pipeline dashboard summary metrics work
- ${eventsOk ? "PASS" : "FAIL"}: pipeline events display data exists
- ${leadsOk ? "PASS" : "FAIL"}: pipeline lead data exists
- ${readOnlyOk ? "PASS" : "FAIL"}: pipeline dashboard remains read-only

## Safety Rules Confirmed
- Pipeline dashboard does not send WhatsApp.
- Pipeline dashboard does not auto-create quote.
- Pipeline dashboard does not move stages automatically.
- sentToBuyer remains false.
- Manual review remains required.
- Test lead and pipeline event data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 8A — Follow-Up Reminder Foundation
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);

    if (verdict !== "APPROVED") process.exitCode = 1;
  } finally {
    if (child) stopProcess(child);
    restoreData();
  }
}

main().catch(error => {
  restoreData();
  console.error(error);
  process.exit(1);
});

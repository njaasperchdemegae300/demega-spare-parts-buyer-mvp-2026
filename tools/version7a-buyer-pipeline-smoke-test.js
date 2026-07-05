const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3038;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const pipelinePath = path.join(ROOT, "src", "data", "pipeline-events.json");
const reportPath = path.join(ROOT, "reports", "version7a-buyer-pipeline-smoke-test-report.md");

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
      buyerName: "Pipeline Test Buyer",
      phone: "08012121212",
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
    const preview = await request("/api/pipeline/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const invalidMove = await request("/api/pipeline/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        nextStage: "auto_whatsapp_send"
      })
    });

    const validMove = await request("/api/pipeline/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        nextStage: "follow_up_needed",
        note: "Buyer asked to confirm availability manually.",
        changedBy: "master_admin"
      })
    });

    const summary = await request("/api/pipeline/summary");
    const events = await request("/api/pipeline/events");
    const leads = await request("/api/leads");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Buyer Pipeline Foundation is active." &&
      Array.isArray(preview.body.allowedStages) &&
      preview.body.allowedStages.includes("follow_up_needed");

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const invalidMoveOk =
      invalidMove.status === 400 &&
      invalidMove.body &&
      Array.isArray(invalidMove.body.errors);

    const validMoveOk =
      validMove.status === 200 &&
      validMove.body.lead &&
      validMove.body.lead.pipelineStage === "follow_up_needed" &&
      validMove.body.lead.manualReviewRequired === true &&
      validMove.body.lead.autoSendWhatsApp === false &&
      validMove.body.lead.sentToBuyer === false &&
      validMove.body.event &&
      validMove.body.event.manualActionOnly === true &&
      validMove.body.event.autoSendWhatsApp === false &&
      validMove.body.event.quoteCreatedAutomatically === false;

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalLeads >= 1 &&
      summary.body.summary.byStage.follow_up_needed >= 1 &&
      summary.body.summary.safety &&
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

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      invalidMoveOk &&
      validMoveOk &&
      summaryOk &&
      eventsOk &&
      leadsOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 7A Buyer Pipeline Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/pipeline/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for pipeline
- ${invalidMoveOk ? "PASS" : "FAIL"}: invalid/unsafe stage blocked
- ${validMoveOk ? "PASS" : "FAIL"}: valid manual pipeline move works
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/pipeline/summary returns safe metrics
- ${eventsOk ? "PASS" : "FAIL"}: GET /api/pipeline/events records movement
- ${leadsOk ? "PASS" : "FAIL"}: lead record stores pipeline stage

## Safety Rules Confirmed
- Pipeline movement is manual-action only.
- Pipeline does not auto-send WhatsApp.
- Pipeline does not create quote automatically.
- sentToBuyer remains false.
- Manual review remains required.
- Test lead and pipeline event data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 7B — Buyer Pipeline Dashboard Display
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

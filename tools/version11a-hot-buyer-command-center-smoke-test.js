const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3047;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const actionQueuePath = path.join(ROOT, "src", "data", "action-queue.json");
const followUpsPath = path.join(ROOT, "src", "data", "followups.json");
const pipelineEventsPath = path.join(ROOT, "src", "data", "pipeline-events.json");
const reportPath = path.join(ROOT, "reports", "version11a-hot-buyer-command-center-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalActions = fs.existsSync(actionQueuePath) ? fs.readFileSync(actionQueuePath, "utf8") : "[]";
const originalFollowUps = fs.existsSync(followUpsPath) ? fs.readFileSync(followUpsPath, "utf8") : "[]";
const originalPipelineEvents = fs.existsSync(pipelineEventsPath) ? fs.readFileSync(pipelineEventsPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(actionQueuePath, originalActions, "utf8");
  fs.writeFileSync(followUpsPath, originalFollowUps, "utf8");
  fs.writeFileSync(pipelineEventsPath, originalPipelineEvents, "utf8");
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
      buyerName: "Hot Buyer Test",
      phone: "08018181818",
      source: "whatsapp_inbound",
      partNeeded: "1ZZ alternator",
      vehicleBrand: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: "2005",
      engineCode: "1ZZ",
      location: "Lagos",
      urgency: "urgent",
      message: "Need 1ZZ alternator urgently today. I want to buy now."
    };

    const health = await request("/api/health");
    const preview = await request("/api/hot-buyers/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const createAction = await request("/api/action-queue/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        actionType: "call_buyer",
        priority: "urgent",
        note: "Hot buyer test: call buyer manually.",
        assignedTo: "master_admin"
      })
    });

    const list = await request("/api/hot-buyers");
    const summary = await request("/api/hot-buyers/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Hot Buyer Command Center Foundation is active." &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Read-only"));

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const createActionOk =
      createAction.status === 201 &&
      createAction.body.action &&
      createAction.body.action.manualActionOnly === true &&
      createAction.body.action.autoSendWhatsApp === false;

    const hotBuyerRecord = list.body &&
      Array.isArray(list.body.hotBuyers) &&
      list.body.hotBuyers.find(item => item.leadId === createLead.body.lead.id);

    const listOk =
      list.status === 200 &&
      hotBuyerRecord &&
      hotBuyerRecord.hotBuyerScore >= 70 &&
      hotBuyerRecord.hotBuyerTemperature === "hot" &&
      hotBuyerRecord.urgentActionCount >= 1 &&
      hotBuyerRecord.manualActionOnly === true &&
      hotBuyerRecord.autoSendWhatsApp === false &&
      hotBuyerRecord.automaticBuyerMessage === false &&
      hotBuyerRecord.quoteCreatedAutomatically === false &&
      hotBuyerRecord.pipelineMovedAutomatically === false &&
      hotBuyerRecord.sentToBuyer === false &&
      Array.isArray(hotBuyerRecord.recommendedManualActions) &&
      hotBuyerRecord.recommendedManualActions.length >= 1;

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalHotBuyerCandidates >= 1 &&
      summary.body.summary.hotBuyers >= 1 &&
      summary.body.summary.urgentHotBuyers >= 1 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.automaticBuyerMessageCount === 0 &&
      summary.body.summary.autoQuoteCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.safety.readOnlyRanking === true &&
      summary.body.summary.safety.manualActionOnly === true &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.automaticBuyerMessage === false &&
      summary.body.summary.safety.autoCreateQuote === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.sentToBuyer === false;

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      createActionOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 11A Hot Buyer Command Center Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/hot-buyers/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: hot buyer lead created
- ${createActionOk ? "PASS" : "FAIL"}: urgent manual action created for hot buyer signal
- ${listOk ? "PASS" : "FAIL"}: GET /api/hot-buyers returns ranked hot buyer
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/hot-buyers/summary returns safe hot buyer metrics

## Safety Rules Confirmed
- Hot Buyer Command Center ranking is read-only.
- Hot Buyer Command Center does not send WhatsApp.
- Hot Buyer Command Center does not message buyer automatically.
- Hot Buyer Command Center does not create quote automatically.
- Hot Buyer Command Center does not move pipeline stage automatically.
- sentToBuyer remains false.
- Manual review remains required.
- Test lead, action queue, follow-up, and pipeline event data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 11B — Hot Buyer Command Center Dashboard Display
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

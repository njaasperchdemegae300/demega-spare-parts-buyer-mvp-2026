const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3044;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const actionQueuePath = path.join(ROOT, "src", "data", "action-queue.json");
const reportPath = path.join(ROOT, "reports", "version10a-buyer-action-queue-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalActions = fs.existsSync(actionQueuePath) ? fs.readFileSync(actionQueuePath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(actionQueuePath, originalActions, "utf8");
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
      buyerName: "Action Queue Buyer",
      phone: "08016161616",
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
    const preview = await request("/api/action-queue/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const invalidAction = await request("/api/action-queue/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        actionType: "auto_whatsapp_send",
        priority: "urgent",
        note: "Unsafe action must be blocked."
      })
    });

    const createAction = await request("/api/action-queue/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        actionType: "call_buyer",
        priority: "urgent",
        note: "Call buyer manually and confirm exact alternator request.",
        assignedTo: "master_admin"
      })
    });

    const list = await request("/api/action-queue");
    const summary = await request("/api/action-queue/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Buyer Action Queue Foundation is active." &&
      Array.isArray(preview.body.allowedActionTypes) &&
      preview.body.allowedActionTypes.includes("call_buyer");

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const invalidActionOk =
      invalidAction.status === 400 &&
      invalidAction.body &&
      Array.isArray(invalidAction.body.errors);

    const createActionOk =
      createAction.status === 201 &&
      createAction.body.action &&
      createAction.body.action.leadId === createLead.body.lead.id &&
      createAction.body.action.actionType === "call_buyer" &&
      createAction.body.action.priority === "urgent" &&
      createAction.body.action.status === "pending" &&
      createAction.body.action.manualActionOnly === true &&
      createAction.body.action.autoSendWhatsApp === false &&
      createAction.body.action.sentToBuyer === false &&
      createAction.body.action.quoteCreatedAutomatically === false &&
      createAction.body.action.pipelineMovedAutomatically === false;

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.actions) &&
      list.body.actions.some(action =>
        action.leadId === createLead.body.lead.id &&
        action.actionType === "call_buyer"
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalActions >= 1 &&
      summary.body.summary.pending >= 1 &&
      summary.body.summary.urgent >= 1 &&
      summary.body.summary.manualActionOnly >= 1 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.autoQuoteCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.automaticBuyerMessage === false &&
      summary.body.summary.safety.autoCreateQuote === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.manualActionOnly === true;

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      invalidActionOk &&
      createActionOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 10A Buyer Action Queue Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/action-queue/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for action queue
- ${invalidActionOk ? "PASS" : "FAIL"}: unsafe auto-send action type blocked
- ${createActionOk ? "PASS" : "FAIL"}: manual buyer action created
- ${listOk ? "PASS" : "FAIL"}: GET /api/action-queue returns action list
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/action-queue/summary returns safe action metrics

## Safety Rules Confirmed
- Buyer action queue does not send WhatsApp.
- Buyer action queue does not message buyer automatically.
- Buyer action queue does not create quote automatically.
- Buyer action queue does not move pipeline stage automatically.
- sentToBuyer remains false.
- Manual action remains required.
- Test lead and action queue data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 10B — Buyer Action Queue Dashboard Display
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

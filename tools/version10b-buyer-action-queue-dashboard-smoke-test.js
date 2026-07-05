const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3045;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const actionQueuePath = path.join(ROOT, "src", "data", "action-queue.json");
const reportPath = path.join(ROOT, "reports", "version10b-buyer-action-queue-dashboard-smoke-test-report.md");

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
      buyerName: "Action Dashboard Buyer",
      phone: "08017171717",
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

    const createAction = await request("/api/action-queue/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        actionType: "call_buyer",
        priority: "urgent",
        note: "Dashboard test: call buyer manually.",
        assignedTo: "master_admin"
      })
    });

    const page = await request("/action-queue");
    const aliasPage = await request("/buyer-action-queue");
    const list = await request("/api/action-queue");
    const summary = await request("/api/action-queue/summary");

    const healthOk = health.status === 200;

    const createActionOk =
      createAction.status === 201 &&
      createAction.body.action &&
      createAction.body.action.manualActionOnly === true &&
      createAction.body.action.autoSendWhatsApp === false &&
      createAction.body.action.sentToBuyer === false &&
      createAction.body.action.quoteCreatedAutomatically === false &&
      createAction.body.action.pipelineMovedAutomatically === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Buyer Action Queue Dashboard") &&
      page.text.includes("Action Type") &&
      page.text.includes("Priority") &&
      page.text.includes("Manual buyer action display only") &&
      page.text.includes("MANUAL ONLY") &&
      page.text.includes("No auto-send") &&
      page.text.includes("No auto-quote") &&
      page.text.includes("No auto-pipeline") &&
      page.text.includes("actionRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Buyer Action Queue Dashboard");

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
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.autoQuoteCount === 0 &&
      summary.body.summary.autoPipelineMoveCount === 0 &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.automaticBuyerMessage === false &&
      summary.body.summary.safety.autoCreateQuote === false &&
      summary.body.summary.safety.autoMovePipelineStage === false &&
      summary.body.summary.safety.manualActionOnly === true;

    const readOnlyOk =
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("sentToBuyer = true") &&
      !page.text.includes("quoteCreatedAutomatically = true") &&
      !page.text.includes("pipelineMovedAutomatically = true") &&
      !page.text.includes("method: \"POST\"") &&
      !page.text.includes("method: 'POST'") &&
      !page.text.includes('fetch("/api/action-queue/create"');

    const verdict =
      healthOk &&
      createActionOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 10B Buyer Action Queue Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createActionOk ? "PASS" : "FAIL"}: manual buyer action created for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /action-queue returns buyer action queue dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /buyer-action-queue alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/action-queue returns action data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/action-queue/summary returns safe metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: action queue dashboard remains read-only

## Safety Rules Confirmed
- Action queue dashboard does not send WhatsApp.
- Action queue dashboard does not message buyer automatically.
- Action queue dashboard does not create quote automatically.
- Action queue dashboard does not move pipeline stage automatically.
- sentToBuyer remains false.
- Manual action remains required.
- Test lead and action queue data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 10C — Admin Hub Link Action Queue
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

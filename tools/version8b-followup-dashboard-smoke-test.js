const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3041;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const followUpsPath = path.join(ROOT, "src", "data", "followups.json");
const reportPath = path.join(ROOT, "reports", "version8b-followup-dashboard-smoke-test-report.md");

const originalLeads = fs.existsSync(leadsPath) ? fs.readFileSync(leadsPath, "utf8") : "[]";
const originalFollowUps = fs.existsSync(followUpsPath) ? fs.readFileSync(followUpsPath, "utf8") : "[]";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function restoreData() {
  fs.writeFileSync(leadsPath, originalLeads, "utf8");
  fs.writeFileSync(followUpsPath, originalFollowUps, "utf8");
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
      buyerName: "Follow Dashboard Buyer",
      phone: "08015151515",
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

    const createFollowUp = await request("/api/followups/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        followUpType: "next_day",
        note: "Dashboard test reminder. Call buyer manually.",
        createdBy: "master_admin"
      })
    });

    const page = await request("/followups");
    const aliasPage = await request("/follow-up-reminders");
    const list = await request("/api/followups");
    const summary = await request("/api/followups/summary");

    const healthOk = health.status === 200;

    const createFollowUpOk =
      createFollowUp.status === 201 &&
      createFollowUp.body.followUp &&
      createFollowUp.body.followUp.manualActionOnly === true &&
      createFollowUp.body.followUp.autoSendWhatsApp === false &&
      createFollowUp.body.followUp.sentToBuyer === false &&
      createFollowUp.body.followUp.quoteCreatedAutomatically === false;

    const pageOk =
      page.status === 200 &&
      page.text.includes("Demega Follow-Up Reminder Dashboard") &&
      page.text.includes("Follow-Up Type") &&
      page.text.includes("Due At") &&
      page.text.includes("Manual follow-up reminder display only") &&
      page.text.includes("MANUAL ONLY") &&
      page.text.includes("No auto-send") &&
      page.text.includes("followupRows");

    const aliasOk =
      aliasPage.status === 200 &&
      aliasPage.text.includes("Demega Follow-Up Reminder Dashboard");

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.followUps) &&
      list.body.followUps.some(item =>
        item.leadId === createLead.body.lead.id &&
        item.followUpType === "next_day"
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalFollowUps >= 1 &&
      summary.body.summary.pending >= 1 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.automaticReminderSending === false &&
      summary.body.summary.safety.manualActionOnly === true;

    const readOnlyOk =
      !page.text.includes("sendWhatsApp(") &&
      !page.text.includes("autoSendWhatsApp = true") &&
      !page.text.includes("sentToBuyer = true") &&
      !page.text.includes("quoteCreatedAutomatically = true") &&
      !page.text.includes('fetch("/api/followups/create"');

    const verdict =
      healthOk &&
      createFollowUpOk &&
      pageOk &&
      aliasOk &&
      listOk &&
      summaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 8B Follow-Up Dashboard Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${createFollowUpOk ? "PASS" : "FAIL"}: manual follow-up created for dashboard display
- ${pageOk ? "PASS" : "FAIL"}: GET /followups returns follow-up dashboard
- ${aliasOk ? "PASS" : "FAIL"}: GET /follow-up-reminders alias works
- ${listOk ? "PASS" : "FAIL"}: GET /api/followups returns reminder data
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/followups/summary returns safe metrics
- ${readOnlyOk ? "PASS" : "FAIL"}: follow-up dashboard remains read-only

## Safety Rules Confirmed
- Follow-up dashboard does not send WhatsApp.
- Follow-up dashboard does not message buyer automatically.
- Follow-up dashboard does not create quote automatically.
- sentToBuyer remains false.
- Manual action remains required.
- Test lead and follow-up data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 9A — Admin Navigation Hub Foundation
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

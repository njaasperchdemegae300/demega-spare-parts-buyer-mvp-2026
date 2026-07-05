const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3040;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const followUpsPath = path.join(ROOT, "src", "data", "followups.json");
const reportPath = path.join(ROOT, "reports", "version8a-followup-reminder-smoke-test-report.md");

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
      buyerName: "Follow Up Test Buyer",
      phone: "08014141414",
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
    const preview = await request("/api/followups/preview");

    const createLead = await request("/api/buyer-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buyerLead)
    });

    const invalidFollowUp = await request("/api/followups/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        followUpType: "auto_whatsapp_blast",
        note: "Unsafe follow-up type."
      })
    });

    const createFollowUp = await request("/api/followups/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: createLead.body.lead.id,
        followUpType: "next_day",
        note: "Call buyer manually to confirm if he still needs the alternator.",
        createdBy: "master_admin"
      })
    });

    const list = await request("/api/followups");
    const summary = await request("/api/followups/summary");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Follow-Up Reminder Foundation is active." &&
      Array.isArray(preview.body.allowedFollowUpTypes) &&
      preview.body.allowedFollowUpTypes.includes("next_day");

    const createLeadOk =
      createLead.status === 201 &&
      createLead.body.lead &&
      createLead.body.lead.manualReviewRequired === true;

    const invalidFollowUpOk =
      invalidFollowUp.status === 400 &&
      invalidFollowUp.body &&
      Array.isArray(invalidFollowUp.body.errors);

    const createFollowUpOk =
      createFollowUp.status === 201 &&
      createFollowUp.body.followUp &&
      createFollowUp.body.followUp.leadId === createLead.body.lead.id &&
      createFollowUp.body.followUp.status === "pending" &&
      createFollowUp.body.followUp.manualActionOnly === true &&
      createFollowUp.body.followUp.autoSendWhatsApp === false &&
      createFollowUp.body.followUp.sentToBuyer === false &&
      createFollowUp.body.followUp.quoteCreatedAutomatically === false;

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
      summary.body.summary.manualActionOnly >= 1 &&
      summary.body.summary.autoSendWhatsAppCount === 0 &&
      summary.body.summary.sentToBuyerCount === 0 &&
      summary.body.summary.safety.autoSendWhatsApp === false &&
      summary.body.summary.safety.automaticReminderSending === false &&
      summary.body.summary.safety.manualActionOnly === true;

    const verdict =
      healthOk &&
      previewOk &&
      createLeadOk &&
      invalidFollowUpOk &&
      createFollowUpOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 8A Follow-Up Reminder Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/followups/preview works
- ${createLeadOk ? "PASS" : "FAIL"}: buyer lead created for follow-up
- ${invalidFollowUpOk ? "PASS" : "FAIL"}: unsafe follow-up type blocked
- ${createFollowUpOk ? "PASS" : "FAIL"}: manual follow-up reminder created
- ${listOk ? "PASS" : "FAIL"}: GET /api/followups returns reminder list
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/followups/summary returns safe reminder metrics

## Safety Rules Confirmed
- Follow-up reminder does not send WhatsApp.
- Follow-up reminder does not message buyer automatically.
- Follow-up reminder does not create quote automatically.
- sentToBuyer remains false.
- Manual action remains required.
- Test lead and follow-up data restored after smoke test.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 8B — Follow-Up Reminder Dashboard Display
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

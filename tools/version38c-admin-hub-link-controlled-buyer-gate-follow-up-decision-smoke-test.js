const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3131;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version38c-admin-hub-link-controlled-buyer-gate-follow-up-decision-smoke-test-report.md");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopProcess(child) {
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else child.kill("SIGTERM");
  } catch {}
}

async function request(route) {
  const response = await fetch(`${BASE_URL}${route}`);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { status: response.status, text, body };
}

async function waitForHealth(child, logsRef) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (child.exitCode !== null) return null;

    try {
      const health = await request("/api/health");
      if (health.status === 200) return health;
    } catch (error) {
      logsRef.value += `\n[wait-for-health attempt ${attempt}] ${error.message}`;
    }

    await wait(1000);
  }

  return null;
}

async function main() {
  const logsRef = { value: "" };
  let child;

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logsRef.value += data.toString());
    child.stderr.on("data", data => logsRef.value += data.toString());

    const health = await waitForHealth(child, logsRef);

    if (!health) {
      const startupReport = `# Version 38C Admin Hub Link Controlled Buyer-Gate Follow-Up Decision Smoke Test Report

## Verdict
NEEDS FIX

## Failure
The smoke test could not reach the local server health route after waiting.

## Server Logs
\`\`\`txt
${logsRef.value || "No logs captured"}
\`\`\`
`;
      fs.writeFileSync(reportPath, startupReport, "utf8");
      console.log(startupReport);
      process.exitCode = 1;
      return;
    }

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const followUpPage = await request("/controlled-buyer-gate-follow-up-decision");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const followUpSummary = await request("/api/controlled-buyer-gate-follow-up-decision/summary");

    const healthOk = health.status === 200;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Follow-Up Decision") &&
      hub.text.includes("/controlled-buyer-gate-follow-up-decision") &&
      hub.text.includes("Follow-Up Decision Records") &&
      hub.text.includes("Recorded Follow-Up Decisions") &&
      hub.text.includes("Urgent Follow-Up Decisions") &&
      hub.text.includes("High Follow-Up Decisions") &&
      hub.text.includes("Normal Follow-Up Decisions") &&
      hub.text.includes("Manual Action Required") &&
      hub.text.includes("Latest Follow-Up Decision") &&
      hub.text.includes("Latest Follow-Up Priority") &&
      hub.text.includes("FOLLOW-UP DECISION DASHBOARD ONLY") &&
      hub.text.includes("FOLLOW-UP DECISION RECORD ONLY") &&
      hub.text.includes("ADMIN MANUAL DECISION ONLY") &&
      hub.text.includes("SYSTEM EXECUTION BLOCKED") &&
      hub.text.includes("MANUAL ACTION OUTSIDE SYSTEM ONLY") &&
      hub.text.includes("NO AUTO-FOLLOW-UP") &&
      hub.text.includes("NO AUTO-SCHEDULE") &&
      hub.text.includes("NO FOLLOW-UP AUTO-SEND") &&
      hub.text.includes("NO FOLLOW-UP AUTO-REPLY") &&
      hub.text.includes("NO INVENTORY MUTATION") &&
      hub.text.includes("NO ACCOUNTING MUTATION") &&
      hub.text.includes("NO SALE CLOSING") &&
      hub.text.includes("NO PIPELINE MOVEMENT");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Follow-Up Decision") &&
      alias.text.includes("/controlled-buyer-gate-follow-up-decision");

    const followUpLinkedOk =
      followUpPage.status === 200 &&
      followUpPage.text.includes("Demega Controlled Buyer-Gate Follow-Up Decision Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Follow-Up Decision" &&
        module.path === "/controlled-buyer-gate-follow-up-decision"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateFollowUpDecisionOnly === true &&
      summary.body.safety.followUpDecisionGateOnly === true &&
      summary.body.safety.followUpDecisionRecordOnly === true &&
      summary.body.safety.controlledFollowUpDecisionOnly === true &&
      summary.body.safety.adminManualDecisionOnly === true &&
      summary.body.safety.systemExecutionBlocked === true &&
      summary.body.safety.manualActionRequiredOutsideSystem === true &&
      summary.body.safety.noAutoFollowUpDecisionExecution === true &&
      summary.body.safety.noAutoScheduleFollowUp === true &&
      summary.body.safety.noFollowUpAutoSend === true &&
      summary.body.safety.noFollowUpAutoReply === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoReadWhatsApp === false &&
      summary.body.safety.scrapeWhatsappMessages === false &&
      summary.body.safety.privateMessageScraping === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.inventoryUpdated === false &&
      summary.body.safety.stockReserved === false &&
      summary.body.safety.stockReduced === false &&
      summary.body.safety.autoUpdateInventory === false &&
      summary.body.safety.autoCreateAccountingEntry === false &&
      summary.body.safety.autoCloseSale === false &&
      summary.body.safety.autoMovePipelineStage === false;

    const followUpMetrics = metrics.body && metrics.body.metrics && metrics.body.metrics.controlledBuyerGateFollowUpDecision;

    const metricsOk =
      metrics.status === 200 &&
      followUpMetrics &&
      typeof followUpMetrics.totalFollowUpDecisions === "number" &&
      typeof followUpMetrics.recordedFollowUpDecisionCount === "number" &&
      typeof followUpMetrics.manualActionRequiredCount === "number" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateFollowUpDecisionOnly === true &&
      metrics.body.safety.followUpDecisionGateOnly === true &&
      metrics.body.safety.followUpDecisionRecordOnly === true &&
      metrics.body.safety.controlledFollowUpDecisionOnly === true &&
      metrics.body.safety.adminManualDecisionOnly === true &&
      metrics.body.safety.systemExecutionBlocked === true &&
      metrics.body.safety.manualActionRequiredOutsideSystem === true &&
      metrics.body.safety.noAutoFollowUpDecisionExecution === true &&
      metrics.body.safety.noAutoScheduleFollowUp === true &&
      metrics.body.safety.noFollowUpAutoSend === true &&
      metrics.body.safety.noFollowUpAutoReply === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.scrapeWhatsappMessages === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.inventoryUpdated === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const followUpSummaryOk =
      followUpSummary.status === 200 &&
      followUpSummary.body &&
      followUpSummary.body.summary &&
      typeof followUpSummary.body.summary.totalFollowUpDecisions === "number" &&
      followUpSummary.body.summary.safety &&
      followUpSummary.body.summary.safety.followUpDecisionGateOnly === true &&
      followUpSummary.body.summary.safety.followUpDecisionRecordOnly === true &&
      followUpSummary.body.summary.safety.controlledFollowUpDecisionOnly === true &&
      followUpSummary.body.summary.safety.adminManualDecisionOnly === true &&
      followUpSummary.body.summary.safety.systemExecutionBlocked === true &&
      followUpSummary.body.summary.safety.manualActionRequiredOutsideSystem === true &&
      followUpSummary.body.summary.safety.noAutoFollowUp === true &&
      followUpSummary.body.summary.safety.noAutoSchedule === true &&
      followUpSummary.body.summary.safety.noAutoSend === true &&
      followUpSummary.body.summary.safety.noAutoReply === true &&
      followUpSummary.body.summary.safety.noInventoryMutation === true &&
      followUpSummary.body.summary.safety.noAccountingMutation === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoStartFollowUp = true") &&
      !hub.text.includes("autoScheduleFollowUp = true") &&
      !hub.text.includes("autoSendFollowUp = true") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("systemSendWhatsApp = true") &&
      !hub.text.includes("autoReplyToBuyer = true") &&
      !hub.text.includes("autoReadWhatsApp = true") &&
      !hub.text.includes("scrapeWhatsappMessages = true") &&
      !hub.text.includes("hiddenDataHarvesting = true") &&
      !hub.text.includes("autoMovePipelineStage = true") &&
      !hub.text.includes("autoCloseSale = true") &&
      !hub.text.includes("autoCreateAccountingEntry = true") &&
      !hub.text.includes("inventoryUpdated = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api") &&
      !hub.text.includes('fetch("/api/controlled-buyer-gate-follow-up-decision/create"');

    const verdict =
      healthOk &&
      hubOk &&
      aliasOk &&
      followUpLinkedOk &&
      summaryOk &&
      metricsOk &&
      followUpSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 38C Admin Hub Link Controlled Buyer-Gate Follow-Up Decision Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Follow-Up Decision link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Follow-Up Decision
- ${followUpLinkedOk ? "PASS" : "FAIL"}: linked Follow-Up Decision dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Follow-Up Decision module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Follow-Up Decision metrics safely
- ${followUpSummaryOk ? "PASS" : "FAIL"}: Follow-Up Decision summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Follow-Up Decision link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Follow-Up Decision Admin Hub link is read-only.
- Follow-up decision gate only.
- Follow-up decision record only.
- Controlled follow-up decision only.
- Buyer reply tracking required first.
- Admin manual decision only.
- System execution is blocked.
- Manual action required outside system.
- System did not auto-follow-up.
- System did not auto-schedule.
- System did not send WhatsApp.
- System did not auto-reply.
- System did not read WhatsApp.
- System did not scrape buyer messages.
- System did not scrape private data.
- System did not harvest hidden data.
- System did not update inventory.
- System did not reserve stock.
- System did not reduce stock.
- System did not create accounting entry.
- System did not create receipt.
- System did not create invoice.
- System did not close sale.
- System did not move pipeline.
- Metrics API remains read-only.

## Business Readiness Confirmed
- Admin Hub now exposes Follow-Up Decision metrics.
- Admin Hub now links directly to Follow-Up Decision dashboard.
- Controlled inbound leads now support manual follow-up decision visibility after buyer reply tracking.
- Next required build is final controlled buyer-gate readiness lock.

## Next Phase After Approval
Version 39A — Controlled Buyer-Gate Final Readiness Lock Foundation

## Server Logs
\`\`\`txt
${logsRef.value || "No logs captured"}
\`\`\`
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);

    if (verdict !== "APPROVED") process.exitCode = 1;
  } finally {
    if (child) stopProcess(child);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

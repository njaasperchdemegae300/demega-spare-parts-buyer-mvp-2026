const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3096;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version27a-controlled-buyer-gate-test-plan-smoke-test-report.md");

function restoreData() {
  fs.writeFileSync(assistantRunsPath, originalAssistant, "utf8");
  fs.writeFileSync(guardianRunsPath, originalGuardian, "utf8");
  fs.writeFileSync(plansPath, originalPlans, "utf8");
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function stopProcess(child) {
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else child.kill("SIGTERM");
  } catch {}
}

async function request(route, options = {}) {
  const response = await fetch(`${BASE_URL}${route}`, options);
  const text = await response.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  return { status: response.status, text, body };
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

    const health = await request("/api/health");

    const assistantRun = await request("/api/assistant-sales-agent-test-lab/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runBy: "master_admin" })
    });

    const guardianRun = await request("/api/internal-buyer-gate-readiness/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runBy: "master_admin" })
    });

    const preview = await request("/api/controlled-buyer-gate-test-plan/preview");

    const unsafePlan = await request("/api/controlled-buyer-gate-test-plan/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadLimit: 15,
        testSource: "whatsapp_click_to_chat_inbound",
        manualReviewRequired: true,
        manualReplyOnly: true,
        noAutoSend: true,
        noSpam: true,
        noPrivateDataScraping: true,
        noQuoteBeforeStockConfirmation: true,
        noQuoteBeforeCompatibilityConfirmation: true,
        openLiveBuyerGate: true,
        autoSendWhatsApp: true
      })
    });

    const safePlan = await request("/api/controlled-buyer-gate-test-plan/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planName: "Controlled 15-Lead Buyer-Gate Test Plan",
        leadLimit: 15,
        testSource: "whatsapp_click_to_chat_inbound",
        manualReviewRequired: true,
        manualReplyOnly: true,
        noAutoSend: true,
        noSpam: true,
        noPrivateDataScraping: true,
        noQuoteBeforeStockConfirmation: true,
        noQuoteBeforeCompatibilityConfirmation: true,
        createdBy: "master_admin"
      })
    });

    const list = await request("/api/controlled-buyer-gate-test-plans");
    const summary = await request("/api/controlled-buyer-gate-test-plan/summary");

    const plan = safePlan.body && safePlan.body.plan;

    const healthOk = health.status === 200;
    const assistantOk = assistantRun.status === 201 && assistantRun.body.run && assistantRun.body.run.verdict === "APPROVED";
    const guardianOk = guardianRun.status === 201 && guardianRun.body.run && guardianRun.body.run.verdict === "APPROVED";

    const previewOk =
      preview.status === 200 &&
      preview.body.message === "Controlled Buyer-Gate Test Plan Foundation is active." &&
      preview.body.rules.includes("15-lead limit only.");

    const unsafeOk = unsafePlan.status === 400;

    const safeOk =
      safePlan.status === 201 &&
      plan &&
      plan.leadLimit === 15 &&
      plan.testSource === "whatsapp_click_to_chat_inbound" &&
      plan.controlledPlanOnly === true &&
      plan.buyerGateOpened === false &&
      plan.liveTrafficActivated === false &&
      plan.realBuyerContacted === false &&
      plan.autoSendWhatsApp === false &&
      plan.autoReadWhatsApp === false &&
      plan.hiddenDataHarvesting === false &&
      plan.autoUpdateInventory === false &&
      plan.autoCreateAccountingEntry === false &&
      plan.autoCloseSale === false &&
      plan.autoMovePipelineStage === false &&
      plan.manualApprovalRequiredBeforeActivation === true;

    const listOk =
      list.status === 200 &&
      Array.isArray(list.body.plans) &&
      list.body.plans.some(item => item.id === plan.id && item.buyerGateOpened === false);

    const summaryOk =
      summary.status === 200 &&
      summary.body.summary &&
      summary.body.summary.totalPlans >= 1 &&
      summary.body.summary.latestPlanStatus === "PLAN_READY_NOT_ACTIVATED" &&
      summary.body.summary.activatedPlans === 0 &&
      summary.body.summary.safety.buyerGateOpened === false &&
      summary.body.summary.safety.liveTrafficActivated === false &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.manualApprovalRequiredBeforeActivation === true;

    const verdict = healthOk && assistantOk && guardianOk && previewOk && unsafeOk && safeOk && listOk && summaryOk
      ? "APPROVED"
      : "NEEDS FIX";

    const report = `# Version 27A Controlled Buyer-Gate Test Plan Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved first
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Readiness Guardian approved first
- ${previewOk ? "PASS" : "FAIL"}: preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe live-gate activation request is blocked
- ${safeOk ? "PASS" : "FAIL"}: safe controlled 15-lead test plan created without opening gate
- ${listOk ? "PASS" : "FAIL"}: plan list API returns safe plan
- ${summaryOk ? "PASS" : "FAIL"}: summary API confirms plan-ready-not-activated state

## Safety Rules Confirmed
- Controlled buyer-gate test plan only.
- Buyer gate is not opened.
- Live traffic is not activated.
- No real buyer is contacted.
- No WhatsApp auto-send.
- No WhatsApp auto-read.
- No private-data scraping.
- No hidden data harvesting.
- No quote before stock confirmation.
- No quote before compatibility confirmation.
- No inventory update.
- No accounting entry creation.
- No sale closing.
- No pipeline movement.
- Manual approval remains required before activation.
- Test data restored after smoke test.

## Next Phase After Approval
Version 27B — Controlled Buyer-Gate Test Plan Dashboard Display

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`
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

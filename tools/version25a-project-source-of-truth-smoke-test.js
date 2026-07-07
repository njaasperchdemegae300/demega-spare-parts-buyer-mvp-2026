const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3089;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version25a-project-source-of-truth-smoke-test-report.md");

const requiredFiles = [
  "PROJECT_MASTER_PLAN_2026.md",
  "START_HERE_EVERY_CHAT.md",
  "PROJECT_MAP_2026.md",
  "PHASE_LOG.md",
  "DECISION_REGISTER.md",
  "TRAFFIC_SOURCE_REGISTRY.md",
  "SAFETY_RULES.md",
  "VERSION_GATE_RULES.md",
  "LATEST_STATUS.md",
  "docs/PROJECT_HANDOVER_2026.md"
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

async function request(route) {
  const response = await fetch(`${BASE_URL}${route}`);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { route, status: response.status, ok: response.ok, text, body };
}

function fileContains(file, phrases) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  return phrases.every(phrase => content.includes(phrase));
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
    const preview = await request("/api/project-source-of-truth/preview");
    const files = await request("/api/project-source-of-truth/files");
    const summary = await request("/api/project-source-of-truth/summary");

    const filesExistOk = requiredFiles.every(file => fs.existsSync(path.join(ROOT, file)));

    const startHereOk = fileContains("START_HERE_EVERY_CHAT.md", [
      "START HERE EVERY CHAT",
      "Current Safe Version",
      "Hard Rule",
      "Version 25B"
    ]);

    const masterPlanOk = fileContains("PROJECT_MASTER_PLAN_2026.md", [
      "PROJECT MASTER PLAN 2026",
      "Core Business Flow",
      "Version 25A",
      "Version 25B"
    ]);

    const phaseLogOk = fileContains("PHASE_LOG.md", [
      "Version 24C",
      "Version 25A",
      "Version 25B"
    ]);

    const decisionRegisterOk = fileContains("DECISION_REGISTER.md", [
      "No Auto-Send",
      "No Private Scraping",
      "Version Gate Required"
    ]);

    const trafficRegistryOk = fileContains("TRAFFIC_SOURCE_REGISTRY.md", [
      "Approved Buyer-Intent Sources",
      "Market Intelligence Only",
      "Blocked Traffic Methods",
      "Owned RFQ landing page",
      "WhatsApp click-to-chat inbound"
    ]);

    const safetyRulesOk = fileContains("SAFETY_RULES.md", [
      "No auto-send",
      "No private-data scraping",
      "Manual accounting review only",
      "Manual final business review only",
      "Do not close sales automatically"
    ]);

    const versionGateOk = fileContains("VERSION_GATE_RULES.md", [
      "Approval Rule",
      "Block Rule",
      "Smoke Test Rule",
      "Commit Rule"
    ]);

    const handoverOk = fileContains("docs/PROJECT_HANDOVER_2026.md", [
      "PROJECT HANDOVER 2026",
      "How To Continue",
      "Must Not Do",
      "Version 25B"
    ]);

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Project Source-of-Truth Handover System Foundation is active." &&
      Array.isArray(preview.body.requiredFiles) &&
      preview.body.requiredFiles.includes("START_HERE_EVERY_CHAT.md") &&
      preview.body.requiredFiles.includes("PROJECT_MASTER_PLAN_2026.md") &&
      preview.body.nextPhase === "Version 25B — Source-of-Truth Dashboard / Handover Display" &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.some(rule => rule.includes("Do not continue from chat memory alone")) &&
      preview.body.rules.some(rule => rule.includes("Do not auto-send WhatsApp"));

    const filesOk =
      files.status === 200 &&
      files.body &&
      Array.isArray(files.body.files) &&
      files.body.files.length >= requiredFiles.length &&
      files.body.files.every(item => item.exists === true && item.valid === true);

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.projectName === "Spare-parts-bulk-buyer_Engine_2026 Ai Morden" &&
      summary.body.summary.currentPhase === "Version 25A — Project Source-of-Truth Handover System Foundation" &&
      summary.body.summary.nextPhase === "Version 25B — Source-of-Truth Dashboard / Handover Display" &&
      summary.body.summary.sourceOfTruthReady === true &&
      summary.body.summary.missingFiles.length === 0 &&
      summary.body.summary.invalidFiles.length === 0 &&
      Array.isArray(summary.body.summary.readOrder) &&
      summary.body.summary.readOrder.includes("START_HERE_EVERY_CHAT.md") &&
      summary.body.summary.readOrder.includes("LATEST_STATUS.md") &&
      summary.body.summary.safety &&
      summary.body.summary.safety.sourceOfTruthOnly === true &&
      summary.body.summary.safety.handoverSystemOnly === true &&
      summary.body.summary.safety.readOnlySummary === true &&
      summary.body.summary.safety.noAutoSend === true &&
      summary.body.summary.safety.noSpam === true &&
      summary.body.summary.safety.noUnsolicitedWhatsApp === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noBuyerMessageReading === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true &&
      summary.body.summary.safety.manualReviewRequired === true;

    const routeReadOnlyOk =
      preview.status === 200 &&
      files.status === 200 &&
      summary.status === 200 &&
      preview.text.includes("Project Source-of-Truth Handover System Foundation") &&
      summary.text.includes("readOnlySummary") &&
      !preview.text.includes("autoSendWhatsApp\":true") &&
      !summary.text.includes("noAutoSend\":false") &&
      !summary.text.includes("noPrivateDataScraping\":false") &&
      !summary.text.includes("noHiddenDataHarvesting\":false") &&
      !summary.text.includes("noInventoryUpdate\":false") &&
      !summary.text.includes("noAccountingEntryCreation\":false") &&
      !summary.text.includes("noSaleClosing\":false") &&
      !summary.text.includes("noPipelineMovement\":false");

    const verdict =
      filesExistOk &&
      startHereOk &&
      masterPlanOk &&
      phaseLogOk &&
      decisionRegisterOk &&
      trafficRegistryOk &&
      safetyRulesOk &&
      versionGateOk &&
      handoverOk &&
      healthOk &&
      previewOk &&
      filesOk &&
      summaryOk &&
      routeReadOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 25A Project Source-of-Truth Handover System Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${filesExistOk ? "PASS" : "FAIL"}: all required source-of-truth files exist
- ${startHereOk ? "PASS" : "FAIL"}: START_HERE_EVERY_CHAT.md contains required handover instructions
- ${masterPlanOk ? "PASS" : "FAIL"}: PROJECT_MASTER_PLAN_2026.md contains required master plan
- ${phaseLogOk ? "PASS" : "FAIL"}: PHASE_LOG.md contains recent locked phases and next phase
- ${decisionRegisterOk ? "PASS" : "FAIL"}: DECISION_REGISTER.md contains required project decisions
- ${trafficRegistryOk ? "PASS" : "FAIL"}: TRAFFIC_SOURCE_REGISTRY.md contains buyer-intent and market-intelligence classification
- ${safetyRulesOk ? "PASS" : "FAIL"}: SAFETY_RULES.md contains required safety locks
- ${versionGateOk ? "PASS" : "FAIL"}: VERSION_GATE_RULES.md contains approval, block, smoke test, and commit rules
- ${handoverOk ? "PASS" : "FAIL"}: docs/PROJECT_HANDOVER_2026.md contains handover instructions
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: GET /api/project-source-of-truth/preview works
- ${filesOk ? "PASS" : "FAIL"}: GET /api/project-source-of-truth/files validates source files
- ${summaryOk ? "PASS" : "FAIL"}: GET /api/project-source-of-truth/summary returns safe handover summary
- ${routeReadOnlyOk ? "PASS" : "FAIL"}: Source-of-Truth Handover API remains read-only and safe

## Safety Rules Confirmed
- Source-of-truth system is read-only.
- Handover system does not send WhatsApp.
- Handover system does not scrape private data.
- Handover system does not read buyer messages.
- Handover system does not update inventory.
- Handover system does not create accounting entries.
- Handover system does not close sales.
- Handover system does not move pipeline.
- Handover system requires manual review.
- Future chats must start from source-of-truth files before coding.
- Version approval requires smoke test APPROVED and latest commit.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 25B — Source-of-Truth Dashboard / Handover Display
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

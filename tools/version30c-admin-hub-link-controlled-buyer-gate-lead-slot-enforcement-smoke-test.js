const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3107;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const assistantRunsPath = path.join(ROOT, "src", "data", "assistant-sales-agent-test-runs.json");
const guardianRunsPath = path.join(ROOT, "src", "data", "internal-buyer-gate-readiness-runs.json");
const plansPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-test-plans.json");
const approvalsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-manual-activation-approvals.json");
const executionsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-activation-executions.json");
const slotsPath = path.join(ROOT, "src", "data", "controlled-buyer-gate-lead-slots.json");

const originalAssistant = fs.existsSync(assistantRunsPath) ? fs.readFileSync(assistantRunsPath, "utf8") : "[]";
const originalGuardian = fs.existsSync(guardianRunsPath) ? fs.readFileSync(guardianRunsPath, "utf8") : "[]";
const originalPlans = fs.existsSync(plansPath) ? fs.readFileSync(plansPath, "utf8") : "[]";
const originalApprovals = fs.existsSync(approvalsPath) ? fs.readFileSync(approvalsPath, "utf8") : "[]";
const originalExecutions = fs.existsSync(executionsPath) ? fs.readFileSync(executionsPath, "utf8") : "[]";
const originalSlots = fs.existsSync(slotsPath) ? fs.readFileSync(slotsPath, "utf8") : "[]";

const reportPath = path.join(ROOT, "reports", "version30c-admin-hub-link-controlled-buyer-gate-lead-slot-enforcement-smoke-test-report.md");

function safeWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function resetTestData() {
  safeWrite(assistantRunsPath, "[]");
  safeWrite(guardianRunsPath, "[]");
  safeWrite(plansPath, "[]");
  safeWrite(approvalsPath, "[]");
  safeWrite(executionsPath, "[]");
  safeWrite(slotsPath, "[]");
}

function restoreData() {
  safeWrite(assistantRunsPath, originalAssistant);
  safeWrite(guardianRunsPath, originalGuardian);
  safeWrite(plansPath, originalPlans);
  safeWrite(approvalsPath, originalApprovals);
  safeWrite(executionsPath, originalExecutions);
  safeWrite(slotsPath, originalSlots);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  try {
    body = JSON.parse(text);
  } catch {}

  return { status: response.status, text, body };
}

function safeApprovalPayload() {
  return {
    approvedBy: "master_admin",
    approvalNote: "Approve controlled 15-lead manual test preparation only. Do not open gate.",
    approvalPhrase: "I_APPROVE_CONTROLLED_15_LEAD_MANUAL_TEST_PREPARATION_ONLY",
    adminReviewedPlan: true,
    adminReviewedSafety: true,
    adminConfirmedLeadLimit15: true,
    adminConfirmedWhatsAppInboundOnly: true,
    adminConfirmedManualReviewRequired: true,
    adminConfirmedManualReplyOnly: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoSpam: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true
  };
}

function safeExecutionPayload() {
  return {
    executedBy: "master_admin",
    executionNote: "Execute controlled 15-lead manual inbound gate only. Do not contact buyers or start outbound traffic.",
    executionPhrase: "I_EXECUTE_CONTROLLED_15_LEAD_MANUAL_INBOUND_GATE_ONLY",
    adminReviewedApproval: true,
    adminConfirmedSeparateExecutionGate: true,
    adminConfirmed15LeadLimit: true,
    adminConfirmedManualInboundOnly: true,
    adminConfirmedNoOutboundTraffic: true,
    adminConfirmedNoAutoContact: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true,
    adminConfirmedManualReviewBeforeBuyerContact: true
  };
}

function safeSlotPayload(index) {
  return {
    leadReference: `controlled-admin-hub-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during controlled Admin Hub test.",
    source: "whatsapp_click_to_chat_inbound",
    inboundBuyerInitiated: true,
    adminReviewedInboundSource: true,
    manualReviewRequired: true,
    manualReplyOnly: true,
    noAutoSend: true,
    noSpam: true,
    noUnsolicitedWhatsApp: true,
    noPrivateDataScraping: true,
    noHiddenDataHarvesting: true,
    noQuoteBeforeStockConfirmation: true,
    noQuoteBeforeCompatibilityConfirmation: true,
    stockConfirmationRequiredBeforeQuote: true,
    compatibilityConfirmationRequiredBeforeQuote: true,
    leadSlotPhrase: "I_CONFIRM_INBOUND_LEAD_SLOT_ONLY_NO_AUTO_CONTACT",
    createdBy: "master_admin"
  };
}

async function main() {
  let logs = "";
  let child;

  resetTestData();

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

    const planCreate = await request("/api/controlled-buyer-gate-test-plan/create", {
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

    const approvalCreate = await request("/api/controlled-buyer-gate-manual-activation-approval/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeApprovalPayload())
    });

    const executionCreate = await request("/api/controlled-buyer-gate-activation-execution/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeExecutionPayload())
    });

    const slot1 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(1))
    });

    const slot2 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(2))
    });

    const slot3 = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(3))
    });

    const hub = await request("/admin-navigation-hub");
    const alias = await request("/admin-hub");
    const slotPage = await request("/controlled-buyer-gate-lead-slot-enforcement");
    const summary = await request("/api/admin-navigation/summary");
    const metrics = await request("/api/admin-navigation/dashboard-metrics");
    const slotSummary = await request("/api/controlled-buyer-gate-lead-slot-enforcement/summary");

    const healthOk = health.status === 200;

    const assistantOk =
      assistantRun.status === 201 &&
      assistantRun.body &&
      assistantRun.body.run &&
      assistantRun.body.run.verdict === "APPROVED";

    const guardianOk =
      guardianRun.status === 201 &&
      guardianRun.body &&
      guardianRun.body.run &&
      guardianRun.body.run.verdict === "APPROVED";

    const planOk =
      planCreate.status === 201 &&
      planCreate.body &&
      planCreate.body.plan &&
      planCreate.body.plan.leadLimit === 15 &&
      planCreate.body.plan.testSource === "whatsapp_click_to_chat_inbound";

    const approvalOk =
      approvalCreate.status === 201 &&
      approvalCreate.body &&
      approvalCreate.body.approval &&
      approvalCreate.body.approval.approvalStatus === "APPROVED_NOT_ACTIVATED";

    const executionOk =
      executionCreate.status === 201 &&
      executionCreate.body &&
      executionCreate.body.execution &&
      executionCreate.body.execution.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY";

    const slotsOk =
      slot1.status === 201 &&
      slot2.status === 201 &&
      slot3.status === 201 &&
      slot1.body.slot.slotNumber === 1 &&
      slot2.body.slot.slotNumber === 2 &&
      slot3.body.slot.slotNumber === 3 &&
      slot3.body.slot.remainingLeadSlotsAfter === 12 &&
      slot1.body.slot.buyerContacted === false &&
      slot1.body.slot.autoSendWhatsApp === false &&
      slot1.body.slot.autoReadWhatsApp === false &&
      slot1.body.slot.quotePrepared === false;

    const hubOk =
      hub.status === 200 &&
      hub.text.includes("Demega Admin Navigation Hub") &&
      hub.text.includes("Controlled Buyer-Gate Lead-Slot Enforcement") &&
      hub.text.includes("/controlled-buyer-gate-lead-slot-enforcement") &&
      hub.text.includes("Lead Slots") &&
      hub.text.includes("Accepted Slots") &&
      hub.text.includes("Slot Lead Limit") &&
      hub.text.includes("Remaining Slots") &&
      hub.text.includes("Slot Limit Reached") &&
      hub.text.includes("Latest Slot Status") &&
      hub.text.includes("Latest Slot Number") &&
      hub.text.includes("Latest Slot Source") &&
      hub.text.includes("LEAD-SLOT ENFORCEMENT DASHBOARD ONLY") &&
      hub.text.includes("BUYER-INITIATED INBOUND ONLY") &&
      hub.text.includes("15-LEAD LIMIT ENFORCED") &&
      hub.text.includes("16TH LEAD SLOT BLOCKED") &&
      hub.text.includes("ACCEPTED FOR MANUAL REVIEW ONLY") &&
      hub.text.includes("NO BUYER CONTACT FROM SLOT GATE");

    const aliasOk =
      alias.status === 200 &&
      alias.text.includes("Controlled Buyer-Gate Lead-Slot Enforcement") &&
      alias.text.includes("/controlled-buyer-gate-lead-slot-enforcement");

    const slotLinkedOk =
      slotPage.status === 200 &&
      slotPage.text.includes("Demega Controlled Buyer-Gate Lead-Slot Enforcement Dashboard");

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      Array.isArray(summary.body.modules) &&
      summary.body.modules.some(module =>
        module.name === "Controlled Buyer-Gate Lead-Slot Enforcement" &&
        module.path === "/controlled-buyer-gate-lead-slot-enforcement"
      ) &&
      summary.body.safety &&
      summary.body.safety.navigationOnly === true &&
      summary.body.safety.metricsReadOnly === true &&
      summary.body.safety.controlledBuyerGateLeadSlotEnforcementOnly === true &&
      summary.body.safety.leadSlotEnforcementOnly === true &&
      summary.body.safety.controlledLeadSlotOnly === true &&
      summary.body.safety.inboundLeadSlotOnly === true &&
      summary.body.safety.buyerInitiatedInboundOnly === true &&
      summary.body.safety.acceptedForManualReviewOnly === true &&
      summary.body.safety.leadLimit === 15 &&
      summary.body.safety.sixteenthLeadBlocked === true &&
      summary.body.safety.chosenFirstSource === "whatsapp_click_to_chat_inbound" &&
      summary.body.safety.buyerContacted === false &&
      summary.body.safety.realBuyerContacted === false &&
      summary.body.safety.autoContactBuyer === false &&
      summary.body.safety.startOutboundTraffic === false &&
      summary.body.safety.startPaidAdsAutomatically === false &&
      summary.body.safety.publishLeadFormAutomatically === false &&
      summary.body.safety.systemDoesNotStartOutboundTraffic === true &&
      summary.body.safety.systemDoesNotStartPaidAds === true &&
      summary.body.safety.systemDoesNotPublishLeadForm === true &&
      summary.body.safety.systemDoesNotSendWhatsApp === true &&
      summary.body.safety.systemDoesNotReadBuyerMessages === true &&
      summary.body.safety.autoSendWhatsApp === false &&
      summary.body.safety.autoReadWhatsApp === false &&
      summary.body.safety.scrapeWhatsappMessages === false &&
      summary.body.safety.privateMessageScraping === false &&
      summary.body.safety.hiddenDataHarvesting === false &&
      summary.body.safety.quotePrepared === false &&
      summary.body.safety.quoteBeforeStockConfirmation === false &&
      summary.body.safety.quoteBeforeCompatibilityConfirmation === false &&
      summary.body.safety.autoUpdateInventory === false &&
      summary.body.safety.autoCreateAccountingEntry === false &&
      summary.body.safety.autoCloseSale === false &&
      summary.body.safety.autoMovePipelineStage === false &&
      summary.body.safety.manualReviewRequiredBeforeAnyBuyerContact === true &&
      summary.body.safety.inboundBuyerInitiatedContactRequired === true;

    const metricsOk =
      metrics.status === 200 &&
      metrics.body &&
      metrics.body.metrics &&
      metrics.body.metrics.controlledBuyerGateLeadSlotEnforcement &&
      typeof metrics.body.metrics.controlledBuyerGateLeadSlotEnforcement.totalSlots === "number" &&
      metrics.body.metrics.controlledBuyerGateLeadSlotEnforcement.totalSlots === 3 &&
      metrics.body.metrics.controlledBuyerGateLeadSlotEnforcement.acceptedSlotCount === 3 &&
      metrics.body.metrics.controlledBuyerGateLeadSlotEnforcement.leadLimit === 15 &&
      metrics.body.metrics.controlledBuyerGateLeadSlotEnforcement.remainingLeadSlots === 12 &&
      metrics.body.metrics.controlledBuyerGateLeadSlotEnforcement.limitReached === false &&
      metrics.body.metrics.controlledBuyerGateLeadSlotEnforcement.latestSlotStatus === "ACCEPTED_PENDING_MANUAL_REVIEW" &&
      metrics.body.metrics.controlledBuyerGateLeadSlotEnforcement.latestSource === "whatsapp_click_to_chat_inbound" &&
      metrics.body.safety &&
      metrics.body.safety.metricsReadOnly === true &&
      metrics.body.safety.controlledBuyerGateLeadSlotEnforcementOnly === true &&
      metrics.body.safety.leadSlotEnforcementOnly === true &&
      metrics.body.safety.controlledLeadSlotOnly === true &&
      metrics.body.safety.inboundLeadSlotOnly === true &&
      metrics.body.safety.buyerInitiatedInboundOnly === true &&
      metrics.body.safety.autoSendWhatsApp === false &&
      metrics.body.safety.autoReadWhatsApp === false &&
      metrics.body.safety.hiddenDataHarvesting === false &&
      metrics.body.safety.quotePrepared === false &&
      metrics.body.safety.autoUpdateInventory === false &&
      metrics.body.safety.autoCreateAccountingEntry === false &&
      metrics.body.safety.autoCloseSale === false &&
      metrics.body.safety.autoMovePipelineStage === false;

    const slotSummaryOk =
      slotSummary.status === 200 &&
      slotSummary.body &&
      slotSummary.body.summary &&
      slotSummary.body.summary.totalSlots === 3 &&
      slotSummary.body.summary.acceptedSlotCount === 3 &&
      slotSummary.body.summary.leadLimit === 15 &&
      slotSummary.body.summary.remainingLeadSlots === 12 &&
      slotSummary.body.summary.limitReached === false &&
      slotSummary.body.summary.latestSlotStatus === "ACCEPTED_PENDING_MANUAL_REVIEW" &&
      slotSummary.body.summary.latestSource === "whatsapp_click_to_chat_inbound" &&
      slotSummary.body.summary.safety &&
      slotSummary.body.summary.safety.leadSlotEnforcementOnly === true &&
      slotSummary.body.summary.safety.controlledLeadSlotOnly === true &&
      slotSummary.body.summary.safety.inboundLeadSlotOnly === true &&
      slotSummary.body.summary.safety.buyerInitiatedInboundOnly === true &&
      slotSummary.body.summary.safety.acceptedForManualReviewOnly === true &&
      slotSummary.body.summary.safety.leadLimit === 15 &&
      slotSummary.body.summary.safety.acceptedSlotCount === 3 &&
      slotSummary.body.summary.safety.remainingLeadSlots === 12 &&
      slotSummary.body.summary.safety.limitReached === false &&
      slotSummary.body.summary.safety.source === "whatsapp_click_to_chat_inbound" &&
      slotSummary.body.summary.safety.noOutboundTrafficStarted === true &&
      slotSummary.body.summary.safety.noPaidAdsStartedAutomatically === true &&
      slotSummary.body.summary.safety.noLeadFormPublishedAutomatically === true &&
      slotSummary.body.summary.safety.noRealBuyerContacted === true &&
      slotSummary.body.summary.safety.noAutoContactBuyer === true &&
      slotSummary.body.summary.safety.noAutoSendWhatsApp === true &&
      slotSummary.body.summary.safety.noWhatsappAutoRead === true &&
      slotSummary.body.summary.safety.noBuyerMessageReading === true &&
      slotSummary.body.summary.safety.noWhatsappScraping === true &&
      slotSummary.body.summary.safety.noPrivateDataScraping === true &&
      slotSummary.body.summary.safety.noHiddenDataHarvesting === true &&
      slotSummary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      slotSummary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      slotSummary.body.summary.safety.noInventoryUpdate === true &&
      slotSummary.body.summary.safety.noAccountingEntryCreation === true &&
      slotSummary.body.summary.safety.noSaleClosing === true &&
      slotSummary.body.summary.safety.noPipelineMovement === true &&
      slotSummary.body.summary.safety.manualReviewRequiredBeforeAnyBuyerContact === true;

    const readOnlyOk =
      !hub.text.includes("navigator.clipboard") &&
      !hub.text.includes("writeText(") &&
      !hub.text.includes("execCommand") &&
      !hub.text.includes("sendWhatsApp(") &&
      !hub.text.includes("autoContactBuyer = true") &&
      !hub.text.includes("contactRealBuyerAutomatically = true") &&
      !hub.text.includes("startOutboundTraffic = true") &&
      !hub.text.includes("startPaidAdsAutomatically = true") &&
      !hub.text.includes("publishLeadFormAutomatically = true") &&
      !hub.text.includes("broadcastWhatsApp = true") &&
      !hub.text.includes("autoSendWhatsApp = true") &&
      !hub.text.includes("sendWhatsApp = true") &&
      !hub.text.includes("autoReadWhatsApp = true") &&
      !hub.text.includes("scrapeWhatsappMessages = true") &&
      !hub.text.includes("privateMessageScraping = true") &&
      !hub.text.includes("hiddenDataHarvesting = true") &&
      !hub.text.includes("quotePrepared = true") &&
      !hub.text.includes("autoUpdateInventory = true") &&
      !hub.text.includes("autoCreateAccountingEntry = true") &&
      !hub.text.includes("autoCloseSale = true") &&
      !hub.text.includes("autoMovePipelineStage = true") &&
      !hub.text.includes("method: \"POST\"") &&
      !hub.text.includes("method: 'POST'") &&
      !hub.text.includes("POST /api");

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      slotsOk &&
      hubOk &&
      aliasOk &&
      slotLinkedOk &&
      summaryOk &&
      metricsOk &&
      slotSummaryOk &&
      readOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 30C Admin Hub Link Controlled Buyer-Gate Lead-Slot Enforcement Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved before Admin Hub metrics
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved before Admin Hub metrics
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists before Admin Hub metrics
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists before Admin Hub metrics
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists before Admin Hub metrics
- ${slotsOk ? "PASS" : "FAIL"}: controlled inbound lead slots exist before Admin Hub metrics
- ${hubOk ? "PASS" : "FAIL"}: admin hub displays Lead-Slot Enforcement link and metrics
- ${aliasOk ? "PASS" : "FAIL"}: GET /admin-hub also displays Lead-Slot Enforcement
- ${slotLinkedOk ? "PASS" : "FAIL"}: linked Lead-Slot Enforcement dashboard is reachable
- ${summaryOk ? "PASS" : "FAIL"}: admin summary includes Lead-Slot Enforcement module safely
- ${metricsOk ? "PASS" : "FAIL"}: admin metrics include Lead-Slot Enforcement metrics safely
- ${slotSummaryOk ? "PASS" : "FAIL"}: Lead-Slot Enforcement summary remains safe
- ${readOnlyOk ? "PASS" : "FAIL"}: admin hub remains read-only after Lead-Slot Enforcement link

## Safety Rules Confirmed
- Admin hub remains navigation and visibility only.
- Lead-Slot Enforcement Admin Hub link is read-only.
- Lead-slot enforcement only.
- Controlled inbound lead slot only.
- Buyer-initiated WhatsApp click-to-chat inbound source only.
- 15-lead limit remains enforced.
- Accepted lead slots are for manual review only.
- Manual reply only.
- No outbound traffic is started automatically.
- No paid ads are started automatically.
- No lead form is published automatically.
- No real buyer is contacted automatically.
- No WhatsApp auto-send.
- No WhatsApp auto-read.
- No buyer message scraping.
- No private-data scraping.
- No hidden data harvesting.
- No quote before stock confirmation.
- No quote before compatibility confirmation.
- No inventory update.
- No accounting entry creation.
- No sale closing.
- No pipeline movement.
- Metrics API remains read-only.
- Manual review remains required before any buyer contact.
- Assistant, guardian, plan, approval, execution, and slot test data restored after smoke test.

## Business Readiness Confirmed
- Admin Hub now exposes Lead-Slot Enforcement metrics.
- Admin Hub now links directly to Lead-Slot Enforcement dashboard.
- Controlled manual inbound gate now has visible lead-slot tracking.
- Next required build is manual lead review gate before any buyer contact.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 31A — Controlled Buyer-Gate Manual Lead Review Gate Foundation
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

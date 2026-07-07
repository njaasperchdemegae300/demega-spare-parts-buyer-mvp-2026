const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3105;
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

const reportPath = path.join(ROOT, "reports", "version30a-controlled-buyer-gate-lead-slot-enforcement-smoke-test-report.md");

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

function safeSlotPayload(index, extra = {}) {
  return {
    leadReference: `controlled-inbound-test-lead-${index}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla alternator" : "Toyota Corolla kick starter",
    vehicleDetail: "Toyota Corolla 2005",
    buyerLocation: "Lagos",
    buyerIntentProof: "Buyer initiated WhatsApp click-to-chat inbound request during controlled test.",
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
    createdBy: "master_admin",
    ...extra
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

    const preview = await request("/api/controlled-buyer-gate-lead-slot-enforcement/preview");

    const unsafeSlot = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(999, {
        autoContactBuyer: true,
        startOutboundTraffic: true,
        startPaidAdsAutomatically: true,
        publishLeadFormAutomatically: true,
        broadcastWhatsApp: true,
        autoSendWhatsApp: true,
        autoReadWhatsApp: true,
        scrapeWhatsappMessages: true,
        hiddenDataHarvesting: true,
        quoteBeforeStockConfirmation: true,
        quoteBeforeCompatibilityConfirmation: true,
        autoUpdateInventory: true,
        autoCreateAccountingEntry: true,
        autoCloseSale: true,
        autoMovePipelineStage: true
      }))
    });

    const firstSlot = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(1))
    });

    const extraSlots = [];
    for (let index = 2; index <= 15; index += 1) {
      extraSlots.push(await request("/api/controlled-buyer-gate-lead-slot/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safeSlotPayload(index))
      }));
    }

    const sixteenthSlot = await request("/api/controlled-buyer-gate-lead-slot/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeSlotPayload(16))
    });

    const list = await request("/api/controlled-buyer-gate-lead-slots");
    const summary = await request("/api/controlled-buyer-gate-lead-slot-enforcement/summary");

    const slot = firstSlot.body && firstSlot.body.slot;

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
      executionCreate.body.execution.activationStatus === "CONTROLLED_GATE_ACTIVE_MANUAL_INBOUND_ONLY" &&
      executionCreate.body.execution.remainingLeadSlots === 15;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.message === "Controlled Buyer-Gate Lead-Slot Enforcement Foundation is active." &&
      preview.body.requiredSlotPhrase === "I_CONFIRM_INBOUND_LEAD_SLOT_ONLY_NO_AUTO_CONTACT" &&
      Array.isArray(preview.body.rules) &&
      preview.body.rules.includes("15-lead limit is enforced.") &&
      preview.body.rules.includes("The 16th lead slot is blocked.");

    const unsafeOk =
      unsafeSlot.status === 400 &&
      unsafeSlot.body &&
      Array.isArray(unsafeSlot.body.errors) &&
      unsafeSlot.body.errors.some(error => error.includes("Unsafe lead-slot request blocked"));

    const firstSlotOk =
      firstSlot.status === 201 &&
      slot &&
      slot.slotStatus === "ACCEPTED_PENDING_MANUAL_REVIEW" &&
      slot.leadSlotEnforcementOnly === true &&
      slot.controlledLeadSlotOnly === true &&
      slot.inboundLeadSlotOnly === true &&
      slot.buyerInitiatedInboundOnly === true &&
      slot.acceptedForManualReviewOnly === true &&
      slot.slotNumber === 1 &&
      slot.leadLimit === 15 &&
      slot.acceptedLeadCountAfter === 1 &&
      slot.remainingLeadSlotsAfter === 14 &&
      slot.source === "whatsapp_click_to_chat_inbound" &&
      slot.inboundBuyerInitiated === true &&
      slot.adminReviewedInboundSource === true &&
      slot.manualReviewRequired === true &&
      slot.manualReviewCompleted === false &&
      slot.manualReplyOnly === true &&
      slot.buyerContacted === false &&
      slot.realBuyerContacted === false &&
      slot.autoContactBuyer === false &&
      slot.autoSendWhatsApp === false &&
      slot.autoReadWhatsApp === false &&
      slot.scrapeWhatsappMessages === false &&
      slot.privateMessageScraping === false &&
      slot.hiddenDataHarvesting === false &&
      slot.startOutboundTraffic === false &&
      slot.startPaidAdsAutomatically === false &&
      slot.publishLeadFormAutomatically === false &&
      slot.quotePrepared === false &&
      slot.quoteBeforeStockConfirmation === false &&
      slot.quoteBeforeCompatibilityConfirmation === false &&
      slot.autoUpdateInventory === false &&
      slot.autoCreateAccountingEntry === false &&
      slot.autoCloseSale === false &&
      slot.autoMovePipelineStage === false &&
      slot.requiresManualReviewBeforeAnyBuyerContact === true;

    const fillOk =
      extraSlots.length === 14 &&
      extraSlots.every((response, index) =>
        response.status === 201 &&
        response.body &&
        response.body.slot &&
        response.body.slot.slotNumber === index + 2 &&
        response.body.slot.remainingLeadSlotsAfter === 15 - (index + 2) &&
        response.body.slot.buyerContacted === false &&
        response.body.slot.autoSendWhatsApp === false &&
        response.body.slot.autoReadWhatsApp === false
      );

    const limitOk =
      sixteenthSlot.status === 400 &&
      sixteenthSlot.body &&
      Array.isArray(sixteenthSlot.body.errors) &&
      sixteenthSlot.body.errors.some(error => error.includes("15-lead slot limit reached"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.slots) &&
      list.body.slots.filter(item => item.slotStatus === "ACCEPTED_PENDING_MANUAL_REVIEW").length === 15;

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalSlots === 15 &&
      summary.body.summary.acceptedSlotCount === 15 &&
      summary.body.summary.leadLimit === 15 &&
      summary.body.summary.remainingLeadSlots === 0 &&
      summary.body.summary.limitReached === true &&
      summary.body.summary.safety &&
      summary.body.summary.safety.leadSlotEnforcementOnly === true &&
      summary.body.summary.safety.controlledLeadSlotOnly === true &&
      summary.body.summary.safety.inboundLeadSlotOnly === true &&
      summary.body.summary.safety.buyerInitiatedInboundOnly === true &&
      summary.body.summary.safety.acceptedForManualReviewOnly === true &&
      summary.body.summary.safety.leadLimit === 15 &&
      summary.body.summary.safety.acceptedSlotCount === 15 &&
      summary.body.summary.safety.remainingLeadSlots === 0 &&
      summary.body.summary.safety.limitReached === true &&
      summary.body.summary.safety.source === "whatsapp_click_to_chat_inbound" &&
      summary.body.summary.safety.noOutboundTrafficStarted === true &&
      summary.body.summary.safety.noPaidAdsStartedAutomatically === true &&
      summary.body.summary.safety.noLeadFormPublishedAutomatically === true &&
      summary.body.summary.safety.noRealBuyerContacted === true &&
      summary.body.summary.safety.noAutoContactBuyer === true &&
      summary.body.summary.safety.noAutoSendWhatsApp === true &&
      summary.body.summary.safety.noWhatsappAutoRead === true &&
      summary.body.summary.safety.noBuyerMessageReading === true &&
      summary.body.summary.safety.noWhatsappScraping === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noHiddenDataHarvesting === true &&
      summary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      summary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true &&
      summary.body.summary.safety.noInventoryUpdate === true &&
      summary.body.summary.safety.noAccountingEntryCreation === true &&
      summary.body.summary.safety.noSaleClosing === true &&
      summary.body.summary.safety.noPipelineMovement === true &&
      summary.body.summary.safety.manualReviewRequiredBeforeAnyBuyerContact === true;

    const verdict =
      healthOk &&
      assistantOk &&
      guardianOk &&
      planOk &&
      approvalOk &&
      executionOk &&
      previewOk &&
      unsafeOk &&
      firstSlotOk &&
      fillOk &&
      limitOk &&
      listOk &&
      summaryOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Version 30A Controlled Buyer-Gate Lead-Slot Enforcement Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${assistantOk ? "PASS" : "FAIL"}: Assistant Sales Agent readiness approved first
- ${guardianOk ? "PASS" : "FAIL"}: Internal Buyer-Gate Guardian approved first
- ${planOk ? "PASS" : "FAIL"}: controlled 15-lead plan exists first
- ${approvalOk ? "PASS" : "FAIL"}: manual activation approval exists first
- ${executionOk ? "PASS" : "FAIL"}: controlled manual inbound activation execution exists first
- ${previewOk ? "PASS" : "FAIL"}: lead-slot enforcement preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe outbound/contact/send/read/scrape lead-slot request is blocked
- ${firstSlotOk ? "PASS" : "FAIL"}: first inbound lead slot is accepted safely for manual review only
- ${fillOk ? "PASS" : "FAIL"}: slots 2 through 15 are accepted safely
- ${limitOk ? "PASS" : "FAIL"}: 16th lead slot is blocked
- ${listOk ? "PASS" : "FAIL"}: lead slots list API returns 15 accepted slots
- ${summaryOk ? "PASS" : "FAIL"}: lead-slot summary API confirms limit reached safely

## Safety Rules Confirmed
- Lead-slot enforcement only.
- Controlled inbound lead slot only.
- Buyer-initiated WhatsApp click-to-chat inbound source only.
- 15-lead limit is enforced.
- 16th lead slot is blocked.
- Accepted lead slots require manual review.
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
- Assistant, guardian, plan, approval, execution, and slot test data restored after smoke test.

## Next Phase After Approval
Version 30B — Controlled Buyer-Gate Lead-Slot Enforcement Dashboard Display

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

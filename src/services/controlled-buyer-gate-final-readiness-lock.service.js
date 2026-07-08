const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const locksPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-final-readiness-locks.json");

const requiredFinalReadinessLockPhrase = "I_CONFIRM_FINAL_READINESS_LOCK_ONLY_NO_LIVE_TRAFFIC_NO_AUTO_SEND";
const requiredLockChannel = "admin_manual_final_readiness_lock_only";

const dataFiles = {
  assistantRuns: "assistant-sales-agent-test-runs.json",
  guardianRuns: "internal-buyer-gate-readiness-runs.json",
  plans: "controlled-buyer-gate-test-plans.json",
  approvals: "controlled-buyer-gate-manual-activation-approvals.json",
  executions: "controlled-buyer-gate-activation-executions.json",
  slots: "controlled-buyer-gate-lead-slots.json",
  reviews: "controlled-buyer-gate-manual-lead-reviews.json",
  stockChecks: "controlled-buyer-gate-manual-stock-checks.json",
  compatibilityChecks: "controlled-buyer-gate-manual-compatibility-checks.json",
  eligibilities: "controlled-buyer-gate-final-quote-eligibilities.json",
  quoteDrafts: "controlled-buyer-gate-manual-quote-drafts.json",
  sendConfirmations: "controlled-buyer-gate-manual-send-confirmations.json",
  replyTrackings: "controlled-buyer-gate-buyer-reply-trackings.json",
  followUpDecisions: "controlled-buyer-gate-follow-up-decisions.json"
};

function ensureFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]", "utf8");
}

function readJsonArrayByPath(filePath) {
  ensureFile(filePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readDataFile(name) {
  return readJsonArrayByPath(path.join(process.cwd(), "src", "data", name));
}

function writeJsonArray(filePath, records) {
  ensureFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

function cleanText(value) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function latest(records) {
  return Array.isArray(records) && records.length ? records[0] : null;
}

function firstText(record, fields) {
  if (!record) return "";
  for (const field of fields) {
    if (record[field] !== undefined && record[field] !== null && String(record[field]).trim() !== "") {
      return String(record[field]);
    }
  }
  return "";
}

function firstBool(record, fields) {
  if (!record) return false;
  for (const field of fields) {
    if (record[field] === true) return true;
  }
  return false;
}

function listFinalReadinessLocks() {
  return readJsonArrayByPath(locksPath);
}

function getDependencySnapshot() {
  const snapshot = {};
  for (const [key, fileName] of Object.entries(dataFiles)) {
    snapshot[key] = readDataFile(fileName);
  }

  snapshot.summaries = {
    assistantRuns: { total: snapshot.assistantRuns.length, latestVerdict: firstText(latest(snapshot.assistantRuns), ["verdict", "status"]) },
    guardianRuns: { total: snapshot.guardianRuns.length, latestVerdict: firstText(latest(snapshot.guardianRuns), ["verdict", "status"]) },
    plans: { total: snapshot.plans.length, latestLeadLimit: Number(firstText(latest(snapshot.plans), ["leadLimit", "controlledLeadLimit", "maxLeads"]) || 0) },
    approvals: { total: snapshot.approvals.length, latestApprovalStatus: firstText(latest(snapshot.approvals), ["approvalStatus", "status"]) },
    executions: { total: snapshot.executions.length, latestActivationStatus: firstText(latest(snapshot.executions), ["activationStatus", "executionStatus", "status"]) },
    slots: { total: snapshot.slots.length, latestSource: firstText(latest(snapshot.slots), ["source", "testSource", "trafficSource"]) },
    reviews: { total: snapshot.reviews.length },
    stockChecks: { total: snapshot.stockChecks.length },
    compatibilityChecks: { total: snapshot.compatibilityChecks.length },
    eligibilities: { total: snapshot.eligibilities.length },
    quoteDrafts: { total: snapshot.quoteDrafts.length },
    sendConfirmations: { total: snapshot.sendConfirmations.length },
    replyTrackings: { total: snapshot.replyTrackings.length },
    followUpDecisions: { total: snapshot.followUpDecisions.length }
  };

  return snapshot;
}

function isApproved(record) {
  return ["APPROVED", "approved"].includes(firstText(record, ["verdict", "status"]));
}

function isPlanOk(record) {
  if (!record) return false;
  const leadLimit = Number(firstText(record, ["leadLimit", "controlledLeadLimit", "maxLeads"]) || 0);
  const source = firstText(record, ["testSource", "source", "trafficSource"]);
  return leadLimit === 15 && source === "whatsapp_click_to_chat_inbound";
}

function unsafe(input = {}) {
  return input.openLiveGate === true ||
    input.activateRealBuyerTraffic === true ||
    input.startLiveTraffic === true ||
    input.startOutboundTraffic === true ||
    input.startPaidAdsAutomatically === true ||
    input.publishLeadFormAutomatically === true ||
    input.autoContactBuyer === true ||
    input.contactRealBuyerAutomatically === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.systemSendWhatsApp === true ||
    input.broadcastWhatsApp === true ||
    input.autoReplyToBuyer === true ||
    input.autoReadWhatsApp === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.autoStartFollowUp === true ||
    input.autoScheduleFollowUp === true ||
    input.autoSendFollowUp === true ||
    input.autoMovePipelineStage === true ||
    input.autoCloseSale === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCreateReceipt === true ||
    input.autoCreateInvoice === true ||
    input.autoUpdateInventory === true ||
    input.updateInventoryAutomatically === true ||
    input.reserveStockAutomatically === true ||
    input.reduceStockAutomatically === true;
}

function validateFinalReadinessLock(input = {}) {
  const errors = [];
  const snapshot = getDependencySnapshot();
  const existing = listFinalReadinessLocks();

  if (unsafe(input)) {
    errors.push("Unsafe final readiness lock request blocked. This gate only records readiness. It must not open live traffic, start ads, publish lead forms, contact buyers, send WhatsApp, auto-reply, auto-follow-up, move pipeline, mutate inventory, create accounting, or close sale.");
  }

  if (existing.some(item => item.finalReadinessLockStatus === "FINAL_READINESS_LOCK_RECORDED")) {
    errors.push("A final readiness lock has already been recorded. Duplicate readiness lock is blocked.");
  }

  const assistantLatest = latest(snapshot.assistantRuns);
  const guardianLatest = latest(snapshot.guardianRuns);
  const planLatest = latest(snapshot.plans);
  const approvalLatest = latest(snapshot.approvals);
  const executionLatest = latest(snapshot.executions);
  const slotLatest = latest(snapshot.slots);
  const reviewLatest = latest(snapshot.reviews);
  const stockLatest = latest(snapshot.stockChecks);
  const compatibilityLatest = latest(snapshot.compatibilityChecks);
  const eligibilityLatest = latest(snapshot.eligibilities);
  const quoteDraftLatest = latest(snapshot.quoteDrafts);
  const sendLatest = latest(snapshot.sendConfirmations);
  const replyLatest = latest(snapshot.replyTrackings);
  const followUpLatest = latest(snapshot.followUpDecisions);

  if (!isApproved(assistantLatest)) errors.push("Assistant Sales Agent latest run must be APPROVED.");
  if (!isApproved(guardianLatest)) errors.push("Internal Buyer-Gate Guardian latest run must be APPROVED.");
  if (!isPlanOk(planLatest)) errors.push("Controlled 15-lead plan must exist with leadLimit 15 and source whatsapp_click_to_chat_inbound.");
  if (!approvalLatest) errors.push("Manual activation approval must exist.");
  if (!executionLatest) errors.push("Controlled manual inbound activation execution must exist.");
  if (!slotLatest) errors.push("At least one controlled inbound lead slot must exist.");
  if (!reviewLatest) errors.push("At least one manual lead review must exist.");
  if (!stockLatest) errors.push("At least one manual stock check must exist.");
  if (!compatibilityLatest) errors.push("At least one manual compatibility check must exist.");
  if (!eligibilityLatest) errors.push("At least one final quote eligibility record must exist.");
  if (!quoteDraftLatest) errors.push("At least one manual quote draft must exist.");
  if (!sendLatest) errors.push("At least one manual send confirmation must exist.");
  if (!replyLatest) errors.push("At least one buyer reply tracking record must exist.");
  if (!followUpLatest) errors.push("At least one follow-up decision record must exist.");

  if (firstBool(quoteDraftLatest, ["quoteSentToBuyer", "systemQuoteSentToBuyer", "priceSentToBuyer"])) errors.push("Manual quote draft must not show system quote sent.");
  if (firstBool(sendLatest, ["systemQuoteSentToBuyer", "systemSentQuote", "systemSendWhatsApp"])) errors.push("Manual send confirmation must not show system quote sent.");
  if (firstBool(replyLatest, ["autoReadWhatsApp", "scrapeWhatsappMessages", "autoReplyToBuyer"])) errors.push("Buyer reply tracking must not auto-read, scrape, or auto-reply.");
  if (firstBool(followUpLatest, ["autoStartFollowUp", "autoScheduleFollowUp", "autoSendWhatsApp", "autoMovePipelineStage", "inventoryUpdated", "autoCreateAccountingEntry"])) errors.push("Follow-up decision must not execute automation or mutate business records.");

  const lockChannel = cleanText(input.lockChannel || "");
  const lockReason = cleanText(input.lockReason || "");
  const lockedBy = cleanText(input.lockedBy || input.checkedBy || "admin_manual");
  const nextGateInstruction = cleanText(input.nextGateInstruction || "");

  if (lockChannel !== requiredLockChannel) errors.push(`lockChannel must be exactly ${requiredLockChannel}.`);
  if (!lockReason) errors.push("lockReason is required.");
  if (!lockedBy) errors.push("lockedBy is required.");
  if (!nextGateInstruction) errors.push("nextGateInstruction is required.");

  if (cleanText(input.finalReadinessLockPhrase) !== requiredFinalReadinessLockPhrase) {
    errors.push(`finalReadinessLockPhrase must be exactly ${requiredFinalReadinessLockPhrase}.`);
  }

  const requiredBooleans = [
    "adminReviewedAllPreviousGates",
    "adminConfirmedAssistantAgentApproved",
    "adminConfirmedGuardianApproved",
    "adminConfirmedControlled15LeadLimit",
    "adminConfirmedInboundOnly",
    "adminConfirmedManualReviewOnly",
    "adminConfirmedManualReplyOnly",
    "adminConfirmedStockBeforeQuote",
    "adminConfirmedCompatibilityBeforeQuote",
    "adminConfirmedManualSendOnly",
    "adminConfirmedBuyerReplyTrackingExists",
    "adminConfirmedFollowUpDecisionExists",
    "adminConfirmedNoLiveTrafficOpened",
    "adminConfirmedNoAutoSend",
    "adminConfirmedNoAutoReply",
    "adminConfirmedNoAutoFollowUp",
    "adminConfirmedNoWhatsAppRead",
    "adminConfirmedNoMessageScraping",
    "adminConfirmedNoPrivateScraping",
    "adminConfirmedNoHiddenHarvesting",
    "adminConfirmedNoInventoryMutation",
    "adminConfirmedNoAccountingMutation",
    "adminConfirmedNoSaleClosed",
    "adminConfirmedNoPipelineMove",
    "adminConfirmedNextGateRequiresManualLiveGateApproval"
  ];

  for (const field of requiredBooleans) {
    if (input[field] !== true) errors.push(`${field} must be true.`);
  }

  return {
    errors,
    snapshot,
    latest: {
      assistantLatest,
      guardianLatest,
      planLatest,
      approvalLatest,
      executionLatest,
      slotLatest,
      reviewLatest,
      stockLatest,
      compatibilityLatest,
      eligibilityLatest,
      quoteDraftLatest,
      sendLatest,
      replyLatest,
      followUpLatest
    },
    lockChannel,
    lockReason,
    lockedBy,
    nextGateInstruction
  };
}

function createFinalReadinessLock(input = {}) {
  const validation = validateFinalReadinessLock(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();

  const record = {
    id: dataStore.createId("controlled_buyer_gate_final_readiness_lock"),
    finalReadinessLockStatus: "FINAL_READINESS_LOCK_RECORDED",
    finalReadinessLockType: "CONTROLLED_BUYER_GATE_FINAL_READINESS_ONLY",
    finalReadinessLockPhrase: requiredFinalReadinessLockPhrase,

    finalReadinessLockOnly: true,
    finalReadinessRecordOnly: true,
    controlledBuyerGateFinalReadinessOnly: true,
    noLiveTrafficOpened: true,
    noRealBuyerGateOpened: true,
    noOutboundTrafficStarted: true,
    nextGateRequiresManualLiveGateApproval: true,
    systemExecutionBlocked: true,

    lockChannel: validation.lockChannel,
    lockReason: validation.lockReason,
    lockedBy: validation.lockedBy,
    nextGateInstruction: validation.nextGateInstruction,

    readinessChain: {
      assistantAgentApproved: true,
      guardianApproved: true,
      controlled15LeadPlanExists: true,
      manualActivationApprovalExists: true,
      controlledManualInboundExecutionExists: true,
      leadSlotExists: true,
      manualLeadReviewExists: true,
      manualStockCheckExists: true,
      manualCompatibilityCheckExists: true,
      finalQuoteEligibilityExists: true,
      manualQuoteDraftExists: true,
      manualSendConfirmationExists: true,
      buyerReplyTrackingExists: true,
      followUpDecisionExists: true
    },

    latestIds: {
      assistantRunId: validation.latest.assistantLatest.id || "",
      guardianRunId: validation.latest.guardianLatest.id || "",
      planId: validation.latest.planLatest.id || "",
      approvalId: validation.latest.approvalLatest.id || "",
      executionId: validation.latest.executionLatest.id || "",
      leadSlotId: validation.latest.slotLatest.id || "",
      leadReviewId: validation.latest.reviewLatest.id || "",
      stockCheckId: validation.latest.stockLatest.id || "",
      compatibilityCheckId: validation.latest.compatibilityLatest.id || "",
      finalQuoteEligibilityId: validation.latest.eligibilityLatest.id || "",
      manualQuoteDraftId: validation.latest.quoteDraftLatest.id || "",
      manualSendConfirmationId: validation.latest.sendLatest.id || "",
      buyerReplyTrackingId: validation.latest.replyLatest.id || "",
      followUpDecisionId: validation.latest.followUpLatest.id || ""
    },

    leadLimit: 15,
    approvedSource: "whatsapp_click_to_chat_inbound",

    autoOpenLiveTraffic: false,
    openLiveGate: false,
    activateRealBuyerTraffic: false,
    startLiveTraffic: false,
    startOutboundTraffic: false,
    startPaidAdsAutomatically: false,
    publishLeadFormAutomatically: false,
    autoContactBuyer: false,
    contactRealBuyerAutomatically: false,
    autoSendWhatsApp: false,
    sendWhatsApp: false,
    systemSendWhatsApp: false,
    broadcastWhatsApp: false,
    autoReplyToBuyer: false,
    autoReadWhatsApp: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    autoStartFollowUp: false,
    autoScheduleFollowUp: false,
    autoSendFollowUp: false,
    autoMovePipelineStage: false,
    autoCloseSale: false,
    autoCreateAccountingEntry: false,
    autoCreateReceipt: false,
    autoCreateInvoice: false,
    inventoryUpdated: false,
    stockReserved: false,
    stockReduced: false,
    autoUpdateInventory: false,
    updateInventoryAutomatically: false,
    reserveStockAutomatically: false,
    reduceStockAutomatically: false,

    adminReviewedAllPreviousGates: true,
    adminConfirmedAssistantAgentApproved: true,
    adminConfirmedGuardianApproved: true,
    adminConfirmedControlled15LeadLimit: true,
    adminConfirmedInboundOnly: true,
    adminConfirmedManualReviewOnly: true,
    adminConfirmedManualReplyOnly: true,
    adminConfirmedStockBeforeQuote: true,
    adminConfirmedCompatibilityBeforeQuote: true,
    adminConfirmedManualSendOnly: true,
    adminConfirmedBuyerReplyTrackingExists: true,
    adminConfirmedFollowUpDecisionExists: true,
    adminConfirmedNoLiveTrafficOpened: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoAutoReply: true,
    adminConfirmedNoAutoFollowUp: true,
    adminConfirmedNoWhatsAppRead: true,
    adminConfirmedNoMessageScraping: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoInventoryMutation: true,
    adminConfirmedNoAccountingMutation: true,
    adminConfirmedNoSaleClosed: true,
    adminConfirmedNoPipelineMove: true,
    adminConfirmedNextGateRequiresManualLiveGateApproval: true,

    dependencySummaries: validation.snapshot.summaries,

    createdAt: now,
    updatedAt: now
  };

  const records = listFinalReadinessLocks();
  records.unshift(record);
  writeJsonArray(locksPath, records);

  return {
    ok: true,
    statusCode: 201,
    record
  };
}

function getFinalReadinessLockSummary() {
  const records = listFinalReadinessLocks();
  const recorded = records.filter(item => item.finalReadinessLockStatus === "FINAL_READINESS_LOCK_RECORDED");
  const latestRecord = records[0] || null;

  return {
    totalFinalReadinessLocks: records.length,
    recordedFinalReadinessLockCount: recorded.length,
    latestFinalReadinessLockStatus: latestRecord ? latestRecord.finalReadinessLockStatus : "NO_FINAL_READINESS_LOCK",
    latestLockChannel: latestRecord ? latestRecord.lockChannel : "",
    latestLockedBy: latestRecord ? latestRecord.lockedBy : "",
    latestLeadLimit: latestRecord ? latestRecord.leadLimit : 0,
    latestApprovedSource: latestRecord ? latestRecord.approvedSource : "",
    nextGateRequiresManualLiveGateApproval: latestRecord ? latestRecord.nextGateRequiresManualLiveGateApproval : true,
    safety: {
      finalReadinessLockOnly: true,
      finalReadinessRecordOnly: true,
      controlledBuyerGateFinalReadinessOnly: true,
      noLiveTrafficOpened: true,
      noRealBuyerGateOpened: true,
      noOutboundTrafficStarted: true,
      nextGateRequiresManualLiveGateApproval: true,
      systemExecutionBlocked: true,
      noAutoOpenLiveTraffic: true,
      noAutoContactBuyer: true,
      noAutoSendWhatsApp: true,
      noSystemSendWhatsApp: true,
      noAutoReply: true,
      noAutoReadWhatsApp: true,
      noWhatsappScraping: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noAutoFollowUp: true,
      noAutoSchedule: true,
      noPipelineMovement: true,
      noSaleClosing: true,
      noInventoryMutation: true,
      noAccountingMutation: true,
      noReceiptCreation: true,
      noInvoiceCreation: true,
      leadLimit: 15,
      approvedSource: "whatsapp_click_to_chat_inbound"
    }
  };
}

function getFinalReadinessLockPreview() {
  const snapshot = getDependencySnapshot();

  return {
    status: "ok",
    message: "Controlled Buyer-Gate Final Readiness Lock Foundation is active.",
    purpose: "Record final technical readiness after all controlled buyer-gate safety gates. This does not open live traffic, does not contact buyers, does not send WhatsApp, does not auto-reply, does not auto-follow-up, does not mutate inventory, does not create accounting records, does not close sale, and does not move pipeline.",
    requiredFinalReadinessLockPhrase,
    requiredLockChannel,
    latestCounts: {
      assistantRuns: snapshot.assistantRuns.length,
      guardianRuns: snapshot.guardianRuns.length,
      plans: snapshot.plans.length,
      approvals: snapshot.approvals.length,
      executions: snapshot.executions.length,
      slots: snapshot.slots.length,
      reviews: snapshot.reviews.length,
      stockChecks: snapshot.stockChecks.length,
      compatibilityChecks: snapshot.compatibilityChecks.length,
      eligibilities: snapshot.eligibilities.length,
      quoteDrafts: snapshot.quoteDrafts.length,
      sendConfirmations: snapshot.sendConfirmations.length,
      replyTrackings: snapshot.replyTrackings.length,
      followUpDecisions: snapshot.followUpDecisions.length
    },
    rules: [
      "Final readiness lock record only.",
      "Does not open live buyer traffic.",
      "Does not activate real buyer gate.",
      "Does not start ads.",
      "Does not publish lead forms.",
      "Does not contact buyers.",
      "Does not send WhatsApp.",
      "Does not auto-reply.",
      "Does not auto-follow-up.",
      "Does not read WhatsApp.",
      "Does not scrape buyer messages.",
      "Does not update inventory.",
      "Does not create accounting records.",
      "Does not close sales.",
      "Does not move pipeline.",
      "Next gate requires separate manual live-gate approval."
    ]
  };
}

module.exports = {
  createFinalReadinessLock,
  listFinalReadinessLocks,
  getFinalReadinessLockSummary,
  getFinalReadinessLockPreview
};

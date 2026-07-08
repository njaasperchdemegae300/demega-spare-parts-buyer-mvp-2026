const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const preparationsPath = path.join(process.cwd(), "src", "data", "controlled-real-buyer-gate-opening-preparations.json");
const finalReadinessPath = path.join(process.cwd(), "src", "data", "controlled-buyer-gate-final-readiness-locks.json");

const requiredPreparationPhrase = "I_CONFIRM_40A_PREPARATION_ONLY_NO_TRAFFIC_OPENED";
const requiredPreparationChannel = "admin_manual_controlled_real_buyer_gate_preparation_only";

const allowedSources = [
  "whatsapp_click_to_chat_inbound",
  "owned_rfq_landing_page",
  "meta_lead_form",
  "google_buyer_intent_landing_page",
  "public_business_inquiry_form"
];

const allowedGoNoGoDecisions = [
  "GO_READY_FOR_CONTROLLED_15_LEAD_TEST_NOT_OPENED",
  "NO_GO_FIX_REQUIRED"
];

function ensureFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]", "utf8");
}

function readJsonArray(filePath) {
  ensureFile(filePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

function listOpeningPreparations() {
  return readJsonArray(preparationsPath);
}

function listFinalReadinessLocks() {
  return readJsonArray(finalReadinessPath);
}

function getLatestApprovedFinalReadinessLock() {
  return listFinalReadinessLocks().find(record =>
    record &&
    record.finalReadinessLockStatus === "FINAL_READINESS_LOCK_RECORDED" &&
    record.noLiveTrafficOpened === true &&
    record.noRealBuyerGateOpened === true &&
    record.noOutboundTrafficStarted === true &&
    record.nextGateRequiresManualLiveGateApproval === true &&
    record.autoSendWhatsApp === false &&
    record.autoReplyToBuyer === false &&
    record.autoStartFollowUp === false &&
    record.inventoryUpdated === false &&
    record.autoCreateAccountingEntry === false &&
    record.autoCloseSale === false
  ) || null;
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

function validatePreparation(input = {}) {
  const errors = [];
  const existing = listOpeningPreparations();
  const finalReadinessLock = getLatestApprovedFinalReadinessLock();

  if (unsafe(input)) {
    errors.push("Unsafe controlled real-buyer gate opening preparation request blocked. Version 40A records go/no-go preparation only. It must not open live traffic, start ads, publish lead forms, contact buyers, send WhatsApp, auto-reply, auto-follow-up, move pipeline, mutate inventory, create accounting, or close sale.");
  }

  if (existing.some(item => item.preparationStatus === "CONTROLLED_REAL_BUYER_GATE_PREPARATION_RECORDED")) {
    errors.push("A controlled real-buyer gate opening preparation record already exists. Duplicate preparation is blocked.");
  }

  if (!finalReadinessLock) {
    errors.push("Approved final readiness lock is required before Version 40A preparation.");
  }

  const preparationChannel = cleanText(input.preparationChannel || "");
  const preparationPhrase = cleanText(input.preparationPhrase || "");
  const goNoGoDecision = cleanText(input.goNoGoDecision || "");
  const approvedOpeningSource = cleanText(input.approvedOpeningSource || "");
  const preparedBy = cleanText(input.preparedBy || input.checkedBy || "admin_manual");
  const preparationReason = cleanText(input.preparationReason || "");
  const nextManualAction = cleanText(input.nextManualAction || "");

  if (preparationChannel !== requiredPreparationChannel) errors.push(`preparationChannel must be exactly ${requiredPreparationChannel}.`);
  if (preparationPhrase !== requiredPreparationPhrase) errors.push(`preparationPhrase must be exactly ${requiredPreparationPhrase}.`);
  if (!allowedGoNoGoDecisions.includes(goNoGoDecision)) errors.push(`goNoGoDecision must be one of: ${allowedGoNoGoDecisions.join(", ")}.`);
  if (!allowedSources.includes(approvedOpeningSource)) errors.push(`approvedOpeningSource must be one of: ${allowedSources.join(", ")}.`);
  if (!preparedBy) errors.push("preparedBy is required.");
  if (!preparationReason) errors.push("preparationReason is required.");
  if (!nextManualAction) errors.push("nextManualAction is required.");

  if (Number(input.controlledLeadLimit) !== 15) errors.push("controlledLeadLimit must be exactly 15.");

  const requiredBooleans = [
    "adminConfirmedFinalReadinessLockApproved",
    "adminConfirmedControlled15LeadLimit",
    "adminConfirmedInboundOnlySources",
    "adminConfirmedManualReviewOnly",
    "adminConfirmedManualReplyOnly",
    "adminConfirmedNoAutoSend",
    "adminConfirmedNoSpam",
    "adminConfirmedNoUnsolicitedWhatsApp",
    "adminConfirmedNoPrivateScraping",
    "adminConfirmedNoHiddenHarvesting",
    "adminConfirmedNoQuoteBeforeStock",
    "adminConfirmedNoQuoteBeforeCompatibility",
    "adminConfirmedNoLiveTrafficOpened",
    "adminConfirmedNoAdsStarted",
    "adminConfirmedNoLeadFormsPublished",
    "adminConfirmedNoBuyerContactedBySystem",
    "adminConfirmedSeparateManualLaunchRequired",
    "adminConfirmedMetricsWillBeMeasuredBeforeScaling"
  ];

  for (const field of requiredBooleans) {
    if (input[field] !== true) errors.push(`${field} must be true.`);
  }

  return {
    errors,
    finalReadinessLock,
    preparationChannel,
    preparationPhrase,
    goNoGoDecision,
    approvedOpeningSource,
    preparedBy,
    preparationReason,
    nextManualAction
  };
}

function createOpeningPreparation(input = {}) {
  const validation = validatePreparation(input);

  if (validation.errors.length) {
    return {
      ok: false,
      statusCode: 400,
      errors: validation.errors
    };
  }

  const now = new Date().toISOString();

  const record = {
    id: dataStore.createId("controlled_real_buyer_gate_opening_preparation"),
    preparationStatus: "CONTROLLED_REAL_BUYER_GATE_PREPARATION_RECORDED",
    preparationType: "VERSION_40A_FINAL_GO_NO_GO_PREPARATION_ONLY",
    preparationPhrase: requiredPreparationPhrase,
    preparationChannel: validation.preparationChannel,
    goNoGoDecision: validation.goNoGoDecision,
    approvedOpeningSource: validation.approvedOpeningSource,
    controlledLeadLimit: 15,
    preparedBy: validation.preparedBy,
    preparationReason: validation.preparationReason,
    nextManualAction: validation.nextManualAction,

    finalReadinessLockId: validation.finalReadinessLock.id || "",

    preparationOnly: true,
    finalGoNoGoOnly: true,
    controlled15LeadProofTestOnly: true,
    separateManualLaunchRequired: true,
    noLiveTrafficOpened: true,
    noRealBuyerGateOpened: true,
    noOutboundTrafficStarted: true,
    noAdsStarted: true,
    noLeadFormsPublished: true,
    noBuyerContactedBySystem: true,
    systemExecutionBlocked: true,

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

    approvedSourcesForFutureControlledTest: allowedSources,
    blockedSourcesForControlledTest: [
      "random_whatsapp_blasting",
      "unsolicited_whatsapp",
      "private_data_scraping",
      "hidden_data_harvesting",
      "jiji_like_scraping_as_buyer_source",
      "quote_before_stock_confirmation",
      "quote_before_compatibility_confirmation",
      "auto_whatsapp_sending"
    ],

    requiredMetricsBeforeScaling: {
      realBuyerIntentLeadsMinimum: "60%",
      replySpeedTarget: "under_5_minutes",
      wrongQuoteRate: "0%",
      quoteBeforeStockCompatibility: "0_cases",
      hotWarmBuyerRateMinimum: "40%",
      buyerRepliesAfterQuoteMinimum: "40%",
      grossProfitMarginProtected: true,
      spamPrivateDataViolations: 0,
      manualSystemConfusionCriticalCases: 0
    },

    adminConfirmedFinalReadinessLockApproved: true,
    adminConfirmedControlled15LeadLimit: true,
    adminConfirmedInboundOnlySources: true,
    adminConfirmedManualReviewOnly: true,
    adminConfirmedManualReplyOnly: true,
    adminConfirmedNoAutoSend: true,
    adminConfirmedNoSpam: true,
    adminConfirmedNoUnsolicitedWhatsApp: true,
    adminConfirmedNoPrivateScraping: true,
    adminConfirmedNoHiddenHarvesting: true,
    adminConfirmedNoQuoteBeforeStock: true,
    adminConfirmedNoQuoteBeforeCompatibility: true,
    adminConfirmedNoLiveTrafficOpened: true,
    adminConfirmedNoAdsStarted: true,
    adminConfirmedNoLeadFormsPublished: true,
    adminConfirmedNoBuyerContactedBySystem: true,
    adminConfirmedSeparateManualLaunchRequired: true,
    adminConfirmedMetricsWillBeMeasuredBeforeScaling: true,

    createdAt: now,
    updatedAt: now
  };

  const records = listOpeningPreparations();
  records.unshift(record);
  writeJsonArray(preparationsPath, records);

  return {
    ok: true,
    statusCode: 201,
    record
  };
}

function getOpeningPreparationSummary() {
  const records = listOpeningPreparations();
  const latestRecord = latest(records);

  return {
    totalOpeningPreparations: records.length,
    recordedOpeningPreparationCount: records.filter(item => item.preparationStatus === "CONTROLLED_REAL_BUYER_GATE_PREPARATION_RECORDED").length,
    latestPreparationStatus: latestRecord ? latestRecord.preparationStatus : "NO_OPENING_PREPARATION",
    latestGoNoGoDecision: latestRecord ? latestRecord.goNoGoDecision : "",
    latestApprovedOpeningSource: latestRecord ? latestRecord.approvedOpeningSource : "",
    latestControlledLeadLimit: latestRecord ? latestRecord.controlledLeadLimit : 15,
    approvedFinalReadinessLockExists: getLatestApprovedFinalReadinessLock() ? true : false,
    safety: {
      preparationOnly: true,
      finalGoNoGoOnly: true,
      controlled15LeadProofTestOnly: true,
      separateManualLaunchRequired: true,
      noLiveTrafficOpened: true,
      noRealBuyerGateOpened: true,
      noOutboundTrafficStarted: true,
      noAdsStarted: true,
      noLeadFormsPublished: true,
      noBuyerContactedBySystem: true,
      noAutoSendWhatsApp: true,
      noAutoReply: true,
      noAutoFollowUp: true,
      noWhatsAppRead: true,
      noMessageScraping: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noInventoryMutation: true,
      noAccountingMutation: true,
      noSaleClosing: true,
      noPipelineMovement: true
    }
  };
}

function getOpeningPreparationPreview() {
  return {
    status: "ok",
    message: "Version 40A Controlled Real-Buyer Gate Opening Preparation / Final Go-No-Go is active.",
    purpose: "Record final go/no-go preparation for the controlled 15-lead proof test. This does not open live traffic, does not start ads, does not publish lead forms, does not contact buyers, does not send WhatsApp, does not auto-reply, does not auto-follow-up, does not mutate inventory, does not create accounting records, does not close sale, and does not move pipeline.",
    requiredPreparationPhrase,
    requiredPreparationChannel,
    allowedGoNoGoDecisions,
    allowedSources,
    controlledLeadLimit: 15,
    approvedFinalReadinessLockExists: getLatestApprovedFinalReadinessLock() ? true : false,
    rules: [
      "Version 40A is preparation and final go/no-go only.",
      "No live buyer traffic is opened by this version.",
      "No buyer is contacted by the system.",
      "No WhatsApp is sent by the system.",
      "No ads are started by the system.",
      "No lead forms are published by the system.",
      "No auto-reply or auto-follow-up is allowed.",
      "No private-data scraping or hidden data harvesting is allowed.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "Controlled proof test remains capped at 15 inbound buyer requests.",
      "Scaling is blocked until proof metrics pass."
    ]
  };
}

module.exports = {
  createOpeningPreparation,
  listOpeningPreparations,
  getOpeningPreparationSummary,
  getOpeningPreparationPreview
};

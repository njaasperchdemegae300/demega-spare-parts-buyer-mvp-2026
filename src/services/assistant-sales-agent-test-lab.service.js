const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

const runsPath = path.join(process.cwd(), "src", "data", "assistant-sales-agent-test-runs.json");

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
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnsafeAutomationRequest(input) {
  return input.openLiveBuyerGate === true ||
    input.contactRealBuyerAutomatically === true ||
    input.autoSendWhatsApp === true ||
    input.sendWhatsApp === true ||
    input.autoReplyToBuyer === true ||
    input.automaticBuyerMessage === true ||
    input.autoOpenBrowser === true ||
    input.autoReadWhatsApp === true ||
    input.readBuyerMessagesAutomatically === true ||
    input.scrapeWhatsappMessages === true ||
    input.privateMessageScraping === true ||
    input.hiddenDataHarvesting === true ||
    input.buyPrivateContactList === true ||
    input.harvestBuyerContacts === true ||
    input.autoCreateQuoteAndSend === true ||
    input.quoteBeforeStockConfirmation === true ||
    input.quoteBeforeCompatibilityConfirmation === true ||
    input.autoUpdateInventory === true ||
    input.autoCreateAccountingEntry === true ||
    input.autoCloseSale === true ||
    input.autoMovePipelineStage === true;
}

const defaultTestCases = [
  {
    id: "urgent_confirmed_alternator_buyer",
    title: "Urgent confirmed alternator buyer",
    buyerName: "Test Buyer A",
    buyerPhone: "08000000001",
    source: "whatsapp_click_to_chat_inbound",
    message: "I need Corolla 2005 1ZZ alternator urgently today. How much?",
    partNeeded: "Corolla 2005 1ZZ alternator",
    location: "Lagos",
    urgency: "urgent",
    stockConfirmed: true,
    compatibilityConfirmed: true,
    finalQuoteEligibilityPassed: true,
    quoteAmount: 135000,
    currency: "NGN",
    expectedBuyerType: "serious_buyer",
    expectedNextAction: "prepare_safe_quote_draft"
  },
  {
    id: "compatibility_unknown_buyer",
    title: "Buyer asking without enough vehicle detail",
    buyerName: "Test Buyer B",
    buyerPhone: "08000000002",
    source: "owned_rfq_landing_page",
    message: "I need starter for Toyota. Send price now.",
    partNeeded: "Toyota starter",
    location: "Ikeja",
    urgency: "normal",
    stockConfirmed: true,
    compatibilityConfirmed: false,
    finalQuoteEligibilityPassed: false,
    quoteAmount: 90000,
    currency: "NGN",
    expectedBuyerType: "needs_compatibility_check",
    expectedNextAction: "request_vehicle_details"
  },
  {
    id: "stock_unknown_buyer",
    title: "Buyer asks for part before stock confirmation",
    buyerName: "Test Buyer C",
    buyerPhone: "08000000003",
    source: "google_buyer_intent_landing_page",
    message: "Do you have Camry alternator? I want to buy now.",
    partNeeded: "Camry alternator",
    location: "Surulere",
    urgency: "urgent",
    stockConfirmed: false,
    compatibilityConfirmed: true,
    finalQuoteEligibilityPassed: false,
    quoteAmount: 150000,
    currency: "NGN",
    expectedBuyerType: "stock_check_required",
    expectedNextAction: "confirm_stock_first"
  },
  {
    id: "bulk_buyer_request",
    title: "Bulk buyer asking for multiple parts",
    buyerName: "Test Buyer D",
    buyerPhone: "08000000004",
    source: "public_business_inquiry_form",
    message: "We need 10 alternators and 8 starter motors monthly. Can you supply bulk?",
    partNeeded: "Bulk alternators and starter motors",
    location: "Lagos",
    urgency: "business",
    stockConfirmed: false,
    compatibilityConfirmed: false,
    finalQuoteEligibilityPassed: false,
    quoteAmount: 0,
    currency: "NGN",
    expectedBuyerType: "bulk_buyer",
    expectedNextAction: "qualify_bulk_buyer"
  },
  {
    id: "lowball_price_checker",
    title: "Buyer pricing below cost",
    buyerName: "Test Buyer E",
    buyerPhone: "08000000005",
    source: "whatsapp_click_to_chat_inbound",
    message: "I can pay 20k for Corolla alternator. Last price?",
    partNeeded: "Corolla alternator",
    location: "Lagos",
    urgency: "normal",
    stockConfirmed: true,
    compatibilityConfirmed: true,
    finalQuoteEligibilityPassed: true,
    quoteAmount: 130000,
    currency: "NGN",
    expectedBuyerType: "price_checker_lowball",
    expectedNextAction: "protect_margin_and_qualify"
  },
  {
    id: "wrong_part_risk",
    title: "Buyer mentions starter bendix but may be quoted full starter wrongly",
    buyerName: "Test Buyer F",
    buyerPhone: "08000000006",
    source: "meta_lead_form",
    message: "I need starter bendix only for Corolla 2005. Not complete starter.",
    partNeeded: "starter bendix only",
    location: "Mushin",
    urgency: "normal",
    stockConfirmed: false,
    compatibilityConfirmed: false,
    finalQuoteEligibilityPassed: false,
    quoteAmount: 0,
    currency: "NGN",
    expectedBuyerType: "specific_subpart_buyer",
    expectedNextAction: "confirm_exact_subpart"
  }
];

function classifyBuyer(testCase) {
  const text = `${testCase.message} ${testCase.partNeeded}`.toLowerCase();

  if (text.includes("monthly") || text.includes("bulk") || text.includes("10 ") || text.includes("supply")) {
    return "bulk_buyer";
  }

  if (text.includes("20k") || text.includes("last price") || text.includes("cheap")) {
    return "price_checker_lowball";
  }

  if (text.includes("bendix") || text.includes("only")) {
    return "specific_subpart_buyer";
  }

  if (testCase.stockConfirmed !== true) {
    return "stock_check_required";
  }

  if (testCase.compatibilityConfirmed !== true) {
    return "needs_compatibility_check";
  }

  if (testCase.finalQuoteEligibilityPassed === true) {
    return "serious_buyer";
  }

  return "needs_manual_review";
}

function decideNextAction(testCase, buyerType) {
  if (buyerType === "bulk_buyer") return "qualify_bulk_buyer";
  if (buyerType === "price_checker_lowball") return "protect_margin_and_qualify";
  if (buyerType === "specific_subpart_buyer") return "confirm_exact_subpart";
  if (testCase.stockConfirmed !== true) return "confirm_stock_first";
  if (testCase.compatibilityConfirmed !== true) return "request_vehicle_details";
  if (testCase.finalQuoteEligibilityPassed === true) return "prepare_safe_quote_draft";
  return "manual_review_required";
}

function buildSafeAssistantReplyDraft(testCase, buyerType, nextAction) {
  const buyerName = cleanText(testCase.buyerName || "Buyer");
  const partNeeded = cleanText(testCase.partNeeded || "the part");
  const location = cleanText(testCase.location || "your location");

  const canMentionPrice =
    testCase.stockConfirmed === true &&
    testCase.compatibilityConfirmed === true &&
    testCase.finalQuoteEligibilityPassed === true &&
    Number(testCase.quoteAmount || 0) > 0;

  if (buyerType === "bulk_buyer") {
    return `Hello ${buyerName}, thank you. We can handle bulk spare-parts supply inquiry for ${partNeeded}. Please confirm the exact models, years, engine codes, quantity per part, delivery location, and monthly demand. After manual stock and compatibility review, we will prepare a safe supply quote.`;
  }

  if (buyerType === "price_checker_lowball") {
    return `Hello ${buyerName}, thank you. We have noted your request for ${partNeeded}. We do not quote below safe cost. Let us confirm the exact condition, stock, and compatibility first, then we can give the best realistic price with testing and pickup or delivery details.`;
  }

  if (buyerType === "specific_subpart_buyer") {
    return `Hello ${buyerName}, thank you. You requested ${partNeeded}. We will not treat this as a complete starter request. Please confirm photo/sample, vehicle year, engine code, and the exact bendix type so we can check the correct subpart before any quote.`;
  }

  if (nextAction === "confirm_stock_first") {
    return `Hello ${buyerName}, thank you. We received your request for ${partNeeded}. Let us confirm physical stock first before giving price so we do not quote wrongly.`;
  }

  if (nextAction === "request_vehicle_details") {
    return `Hello ${buyerName}, thank you. We have to confirm compatibility before price. Please send vehicle model, year, engine code, socket/plug photo, and old part photo if available.`;
  }

  if (canMentionPrice) {
    return `Hello ${buyerName}, thank you. We have reviewed stock and compatibility for ${partNeeded}. Safe quote draft: ${testCase.currency || "NGN"} ${Number(testCase.quoteAmount).toLocaleString()}. Location: ${location}. Please confirm pickup or delivery preference.`;
  }

  return `Hello ${buyerName}, thank you. Your request for ${partNeeded} requires manual review before quote. We will confirm stock and compatibility first.`;
}

function evaluateAgentResult(testCase, result) {
  const failures = [];
  const replyLower = result.replyDraft.toLowerCase();

  const priceMentioned = /\bngn\b|₦|[0-9]{2,},[0-9]{3}/i.test(result.replyDraft);
  const priceAllowed =
    testCase.stockConfirmed === true &&
    testCase.compatibilityConfirmed === true &&
    testCase.finalQuoteEligibilityPassed === true &&
    Number(testCase.quoteAmount || 0) > 0;

  if (result.buyerType !== testCase.expectedBuyerType) {
    failures.push(`Buyer type mismatch. Expected ${testCase.expectedBuyerType}, got ${result.buyerType}.`);
  }

  if (result.nextAction !== testCase.expectedNextAction) {
    failures.push(`Next action mismatch. Expected ${testCase.expectedNextAction}, got ${result.nextAction}.`);
  }

  if (priceMentioned && !priceAllowed) {
    failures.push("Price was mentioned before stock, compatibility, and final quote eligibility gates.");
  }

  if (result.autoSendWhatsApp !== false) failures.push("autoSendWhatsApp must remain false.");
  if (result.sentToBuyer !== false) failures.push("sentToBuyer must remain false.");
  if (result.autoOpenBrowser !== false) failures.push("autoOpenBrowser must remain false.");
  if (result.autoReadWhatsApp !== false) failures.push("autoReadWhatsApp must remain false.");
  if (result.scrapeWhatsappMessages !== false) failures.push("scrapeWhatsappMessages must remain false.");
  if (result.privateMessageScraping !== false) failures.push("privateMessageScraping must remain false.");
  if (result.hiddenDataHarvesting !== false) failures.push("hiddenDataHarvesting must remain false.");
  if (result.autoUpdateInventory !== false) failures.push("autoUpdateInventory must remain false.");
  if (result.autoCreateAccountingEntry !== false) failures.push("autoCreateAccountingEntry must remain false.");
  if (result.autoCloseSale !== false) failures.push("autoCloseSale must remain false.");
  if (result.autoMovePipelineStage !== false) failures.push("autoMovePipelineStage must remain false.");

  if (replyLower.includes("send payment now") || replyLower.includes("i have sent you whatsapp")) {
    failures.push("Reply contains unsafe payment/send language.");
  }

  return {
    passed: failures.length === 0,
    failures
  };
}

function runOneTestCase(testCase) {
  const buyerType = classifyBuyer(testCase);
  const nextAction = decideNextAction(testCase, buyerType);
  const replyDraft = buildSafeAssistantReplyDraft(testCase, buyerType, nextAction);

  const result = {
    testCaseId: testCase.id,
    title: cleanText(testCase.title),
    buyerType,
    nextAction,
    urgencyDetected: cleanText(testCase.urgency || "normal"),
    replyDraft,
    stockConfirmed: testCase.stockConfirmed === true,
    compatibilityConfirmed: testCase.compatibilityConfirmed === true,
    finalQuoteEligibilityPassed: testCase.finalQuoteEligibilityPassed === true,
    priceMentionAllowed:
      testCase.stockConfirmed === true &&
      testCase.compatibilityConfirmed === true &&
      testCase.finalQuoteEligibilityPassed === true,
    assistantSalesAgentOnly: true,
    simulationOnly: true,
    noLiveBuyerContact: true,
    manualReviewRequired: true,
    autoSendWhatsApp: false,
    sentToBuyer: false,
    autoOpenBrowser: false,
    autoReadWhatsApp: false,
    readBuyerMessagesAutomatically: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    autoUpdateInventory: false,
    autoCreateAccountingEntry: false,
    autoCloseSale: false,
    autoMovePipelineStage: false
  };

  const evaluation = evaluateAgentResult(testCase, result);

  return {
    ...result,
    passed: evaluation.passed,
    failures: evaluation.failures
  };
}

function runAssistantSalesAgentTestLab(input = {}) {
  if (isUnsafeAutomationRequest(input)) {
    return {
      ok: false,
      statusCode: 400,
      errors: [
        "Unsafe request blocked. Assistant Sales Agent Test Lab is simulation-only and must not open live buyer gate, auto-send WhatsApp, scrape messages, harvest data, update inventory, create accounting entries, close sales, or move pipeline."
      ]
    };
  }

  const testCases = Array.isArray(input.testCases) && input.testCases.length
    ? input.testCases
    : defaultTestCases;

  const results = testCases.map(runOneTestCase);
  const passedCount = results.filter(item => item.passed).length;
  const failedCount = results.length - passedCount;
  const verdict = failedCount === 0 ? "APPROVED" : "NEEDS FIX";
  const now = new Date().toISOString();

  const run = {
    id: dataStore.createId("assistant_sales_agent_test_run"),
    verdict,
    totalTests: results.length,
    passedCount,
    failedCount,
    results,
    simulationOnly: true,
    assistantSalesAgentReadinessTestOnly: true,
    noLiveBuyerGateOpened: true,
    noRealBuyerContacted: true,
    autoSendWhatsApp: false,
    sentToBuyer: false,
    autoOpenBrowser: false,
    autoReadWhatsApp: false,
    scrapeWhatsappMessages: false,
    privateMessageScraping: false,
    hiddenDataHarvesting: false,
    autoUpdateInventory: false,
    autoCreateAccountingEntry: false,
    autoCloseSale: false,
    autoMovePipelineStage: false,
    manualReviewRequiredBeforeLiveBuyerGate: true,
    runBy: cleanText(input.runBy || "admin_manual"),
    createdAt: now,
    updatedAt: now
  };

  const runs = readJsonArray(runsPath);
  runs.unshift(run);
  writeJsonArray(runsPath, runs);

  return {
    ok: true,
    statusCode: 201,
    run
  };
}

function listAssistantSalesAgentTestRuns() {
  return readJsonArray(runsPath);
}

function getAssistantSalesAgentTestLabSummary() {
  const runs = listAssistantSalesAgentTestRuns();
  const latestRun = runs[0] || null;

  return {
    totalRuns: runs.length,
    latestVerdict: latestRun ? latestRun.verdict : "NOT_RUN",
    latestTotalTests: latestRun ? latestRun.totalTests : 0,
    latestPassedCount: latestRun ? latestRun.passedCount : 0,
    latestFailedCount: latestRun ? latestRun.failedCount : 0,
    approvedRuns: runs.filter(item => item.verdict === "APPROVED").length,
    blockedRuns: runs.filter(item => item.verdict !== "APPROVED").length,
    defaultTestCaseCount: defaultTestCases.length,
    safety: {
      assistantSalesAgentReadinessTestOnly: true,
      simulationOnly: true,
      noLiveBuyerGateOpened: true,
      noRealBuyerContacted: true,
      noAutoSendWhatsApp: true,
      noUnsolicitedWhatsApp: true,
      noBuyerMessageReading: true,
      noWhatsappScraping: true,
      noPrivateDataScraping: true,
      noHiddenDataHarvesting: true,
      noQuoteBeforeStockConfirmation: true,
      noQuoteBeforeCompatibilityConfirmation: true,
      noInventoryUpdate: true,
      noAccountingEntryCreation: true,
      noSaleClosing: true,
      noPipelineMovement: true,
      manualReviewRequiredBeforeLiveBuyerGate: true
    }
  };
}

function getAssistantSalesAgentTestLabPreview() {
  return {
    status: "ok",
    message: "Assistant Sales Agent Readiness Test Lab Foundation is active.",
    purpose: "Test assistant sales behavior internally before opening any real buyer gate.",
    defaultTestCaseCount: defaultTestCases.length,
    defaultTestCases: defaultTestCases.map(item => ({
      id: item.id,
      title: item.title,
      expectedBuyerType: item.expectedBuyerType,
      expectedNextAction: item.expectedNextAction
    })),
    rules: [
      "Simulation only.",
      "No live buyer gate opened.",
      "No real buyer contacted.",
      "No WhatsApp auto-send.",
      "No WhatsApp auto-read.",
      "No private message scraping.",
      "No hidden data harvesting.",
      "No quote before stock confirmation.",
      "No quote before compatibility confirmation.",
      "No inventory update.",
      "No accounting entry creation.",
      "No sale closing.",
      "No pipeline movement.",
      "Manual review required before real buyer traffic."
    ]
  };
}

module.exports = {
  runAssistantSalesAgentTestLab,
  listAssistantSalesAgentTestRuns,
  getAssistantSalesAgentTestLabSummary,
  getAssistantSalesAgentTestLabPreview
};

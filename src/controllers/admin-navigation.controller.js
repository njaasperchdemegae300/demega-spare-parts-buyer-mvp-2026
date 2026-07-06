const fs = require("fs");
const path = require("path");
const dataStore = require("../services/data-store");
const inventoryService = require("../services/inventory.service");
const quoteDraftService = require("../services/quote-draft.service");
const buyerPipelineService = require("../services/buyer-pipeline.service");
const followUpService = require("../services/followup.service");
const actionQueueService = require("../services/action-queue.service");
const hotBuyerService = require("../services/hot-buyer.service");
const whatsappManualService = require("../services/whatsapp-manual.service");
const stockConfirmationService = require("../services/stock-confirmation.service");
const compatibilityConfirmationService = require("../services/compatibility-confirmation.service");
const quoteEligibilityService = require("../services/quote-eligibility.service");
const manualQuoteDraftService = require("../services/manual-quote-draft.service");

const modules = [
  {
    name: "Buyer Lead Dashboard",
    path: "/dashboard",
    purpose: "Captured buyer leads, scoring, and manual review."
  },
  {
    name: "Inventory Command Center",
    path: "/inventory",
    purpose: "Inventory list, stock status, and quote-blocking safety."
  },
  {
    name: "Quote Draft Dashboard",
    path: "/quotes",
    purpose: "Legacy draft-only quote messages with manual review."
  },
  {
    name: "Buyer Pipeline Dashboard",
    path: "/pipeline",
    purpose: "Manual buyer-stage tracking and event history."
  },
  {
    name: "Follow-Up Reminder Dashboard",
    path: "/followups",
    purpose: "Manual follow-up reminder tracking."
  },
  {
    name: "Buyer Action Queue",
    path: "/action-queue",
    purpose: "Manual buyer action tracking for calls, verification, quote preparation, delivery, closing, and blocking."
  },
  {
    name: "Hot Buyer Command Center",
    path: "/hot-buyers",
    purpose: "Read-only serious-buyer ranking using lead, action, follow-up, and pipeline signals."
  },
  {
    name: "WhatsApp Manual Open Dashboard",
    path: "/whatsapp-manual",
    purpose: "Manual WhatsApp open-link visibility with no auto-send, no auto-open, no price, and no auto-quote."
  },
  {
    name: "Stock Confirmation Gate",
    path: "/stock-confirmation",
    purpose: "Manual stock confirmation visibility while quote remains blocked until compatibility confirmation."
  },
  {
    name: "Compatibility Confirmation Gate",
    path: "/compatibility-confirmation",
    purpose: "Manual compatibility confirmation visibility while manual quote draft is allowed only after stock and compatibility are both confirmed."
  },
  {
    name: "Safe Final Quote Eligibility Gate",
    path: "/quote-eligibility",
    purpose: "Final quote eligibility visibility. Eligibility-check only; no automatic quote, no price, no WhatsApp sending."
  },
  {
    name: "Safe Manual Quote Draft Builder",
    path: "/manual-quote-draft",
    purpose: "Safe manual quote draft visibility. Draft-only; price may appear inside draft after eligibility but is not sent to buyer."
  }
];

function safeRead(factory, fallback) {
  try {
    return factory();
  } catch {
    return fallback;
  }
}

function adminNavigationHubController(req, res, sendJson, sendHtml) {
  const filePath = path.join(process.cwd(), "public", "admin-navigation-hub.html");

  if (!fs.existsSync(filePath)) {
    return sendJson(res, 500, {
      status: "failed",
      error: "Admin navigation hub file is missing."
    });
  }

  const html = fs.readFileSync(filePath, "utf8");
  return sendHtml(res, 200, html);
}

function getSafety() {
  return {
    navigationOnly: true,
    visibilityOnly: true,
    metricsReadOnly: true,
    hotBuyerRankingReadOnly: true,
    whatsappManualOpenOnly: true,
    stockConfirmationManualOnly: true,
    compatibilityConfirmationManualOnly: true,
    quoteEligibilityOnly: true,
    manualQuoteDraftBuilderOnly: true,
    draftOnly: true,
    quoteAllowedAtStockGate: false,
    stockAndCompatibilityRequiredBeforeQuote: true,
    manualQuoteDraftAllowedOnlyAfterBothGates: true,
    manualQuoteDraftAllowedAfterBothConfirmed: true,
    requiresFinalQuoteEligibility: true,
    priceAllowedInDraftAfterEligibility: true,
    priceSentToBuyer: false,
    quoteAmountSentToBuyer: false,
    autoSendWhatsApp: false,
    autoOpenBrowser: false,
    automaticBuyerMessage: false,
    autoCreateQuote: false,
    autoMovePipelineStage: false,
    autoCompleteBuyerAction: false,
    autoContactHotBuyer: false,
    sentToBuyer: false,
    priceIncluded: false,
    quoteAmountIncluded: false,
    manualReviewRequired: true,
    quoteBeforeStockConfirmation: false,
    quoteBeforeCompatibilityConfirmation: false
  };
}

function adminNavigationSummaryController(req, res, sendJson) {
  return sendJson(res, 200, {
    status: "ok",
    message: "Admin Navigation Hub Foundation is active.",
    modules,
    safety: getSafety()
  });
}

function adminNavigationDashboardMetricsController(req, res, sendJson) {
  const leads = safeRead(() => dataStore.readCollection("leads"), []);
  const inventory = safeRead(() => inventoryService.getInventorySummary(), {});
  const quotes = safeRead(() => quoteDraftService.getQuoteSummary(), {});
  const pipeline = safeRead(() => buyerPipelineService.getPipelineSummary(), {});
  const followUps = safeRead(() => followUpService.getFollowUpSummary(), {});
  const actionQueue = safeRead(() => actionQueueService.getActionQueueSummary(), {});
  const hotBuyers = safeRead(() => hotBuyerService.getHotBuyerSummary(), {});
  const whatsappManual = safeRead(() => whatsappManualService.getManualWhatsAppSummary(), {});
  const stockConfirmation = safeRead(() => stockConfirmationService.getStockConfirmationSummary(), {});
  const compatibilityConfirmation = safeRead(() => compatibilityConfirmationService.getCompatibilityConfirmationSummary(), {});
  const quoteEligibility = safeRead(() => quoteEligibilityService.getQuoteEligibilitySummary(), {});
  const manualQuoteDraft = safeRead(() => manualQuoteDraftService.getManualQuoteDraftSummary(), {});

  return sendJson(res, 200, {
    status: "ok",
    message: "Admin Navigation Hub dashboard metrics are active.",
    metrics: {
      buyerLeads: {
        total: leads.length,
        hot: leads.filter(lead => lead.temperature === "hot").length,
        manualReviewRequired: leads.filter(lead => lead.manualReviewRequired === true).length
      },
      inventory,
      quotes,
      pipeline,
      followUps,
      actionQueue,
      hotBuyers,
      whatsappManual,
      stockConfirmation,
      compatibilityConfirmation,
      quoteEligibility,
      manualQuoteDraft
    },
    safety: getSafety()
  });
}

module.exports = {
  adminNavigationHubController,
  adminNavigationSummaryController,
  adminNavigationDashboardMetricsController
};

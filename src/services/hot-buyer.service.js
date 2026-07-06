const fs = require("fs");
const path = require("path");
const dataStore = require("./data-store");

function readJsonArrayFile(fileName) {
  const filePath = path.join(process.cwd(), "src", "data", fileName);

  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeReadCollection(name, fileName) {
  try {
    const value = dataStore.readCollection(name);
    if (Array.isArray(value)) return value;
  } catch {}

  return readJsonArrayFile(fileName || `${name}.json`);
}

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function lower(value) {
  return cleanText(value).toLowerCase();
}

function normalizeId(value) {
  return cleanText(value);
}

function sameLeadId(item, leadId) {
  return normalizeId(item.leadId) === normalizeId(leadId);
}

function isPending(value) {
  const status = lower(value || "pending");
  return status === "pending" || status === "in_progress";
}

function getLeadScore(lead) {
  return Math.max(
    numberValue(lead.leadScore),
    numberValue(lead.score),
    numberValue(lead.buyerScore),
    numberValue(lead.intentScore)
  );
}

function getRelatedItems(items, leadId) {
  return items.filter(item => sameLeadId(item, leadId));
}

function getRecommendedActions(relatedActions, relatedFollowUps) {
  const existingTypes = new Set(relatedActions.map(action => cleanText(action.actionType)));

  const recommendations = [];

  if (!existingTypes.has("verify_stock")) {
    recommendations.push("verify_stock");
  }

  if (!existingTypes.has("verify_compatibility")) {
    recommendations.push("verify_compatibility");
  }

  if (!existingTypes.has("call_buyer")) {
    recommendations.push("call_buyer");
  }

  if (!existingTypes.has("prepare_quote_draft")) {
    recommendations.push("prepare_quote_draft");
  }

  if (relatedFollowUps.length === 0 && !existingTypes.has("manual_follow_up")) {
    recommendations.push("manual_follow_up");
  }

  return recommendations.slice(0, 5);
}

function computeHotBuyerScore(lead, relatedActions, relatedFollowUps, relatedPipelineEvents) {
  let score = getLeadScore(lead);

  const urgency = lower(lead.urgency);
  const temperature = lower(lead.temperature);
  const source = lower(lead.source);
  const location = lower(lead.location);
  const message = lower(lead.message);
  const partNeeded = lower(lead.partNeeded);
  const pipelineStage = lower(lead.pipelineStage || lead.status);

  if (temperature === "hot") score += 45;
  if (temperature === "warm") score += 25;

  if (urgency.includes("urgent")) score += 40;
  if (urgency.includes("today")) score += 35;
  if (urgency.includes("high")) score += 25;

  if (message.includes("urgent") || message.includes("today") || message.includes("now")) score += 30;
  if (message.includes("need") || message.includes("buy") || message.includes("available")) score += 20;
  if (message.includes("want to buy")) score += 20;

  if (source.includes("whatsapp")) score += 20;
  if (source.includes("inbound")) score += 20;
  if (source.includes("rfq") || source.includes("lead_form") || source.includes("owned")) score += 15;

  if (location.includes("lagos") || location.includes("ladipo") || location.includes("mushin")) score += 15;

  if (partNeeded.includes("alternator") || partNeeded.includes("starter") || partNeeded.includes("kick")) score += 15;

  if (pipelineStage === "quote_draft_ready") score += 15;
  if (pipelineStage === "follow_up_needed") score += 15;
  if (pipelineStage === "manual_contacted") score += 10;

  const pendingActions = relatedActions.filter(action => isPending(action.status));
  const urgentActions = pendingActions.filter(action => lower(action.priority) === "urgent");
  const highActions = pendingActions.filter(action => lower(action.priority) === "high");

  score += urgentActions.length * 25;
  score += highActions.length * 15;
  score += pendingActions.length * 5;

  const pendingFollowUps = relatedFollowUps.filter(item => isPending(item.status));
  score += pendingFollowUps.length * 10;

  if (relatedPipelineEvents.length > 0) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyTemperature(score) {
  if (score >= 75) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

function buildHotBuyerRecords() {
  const leads = safeReadCollection("leads", "leads.json");
  const actions = safeReadCollection("action-queue", "action-queue.json");
  const followUps = safeReadCollection("followups", "followups.json");
  const pipelineEvents = safeReadCollection("pipeline-events", "pipeline-events.json");

  return leads.map(lead => {
    const relatedActions = getRelatedItems(actions, lead.id);
    const relatedFollowUps = getRelatedItems(followUps, lead.id);
    const relatedPipelineEvents = getRelatedItems(pipelineEvents, lead.id);

    const pendingActions = relatedActions.filter(action => isPending(action.status));
    const urgentActions = pendingActions.filter(action => lower(action.priority) === "urgent");
    const pendingFollowUps = relatedFollowUps.filter(item => isPending(item.status));

    const hotBuyerScore = computeHotBuyerScore(
      lead,
      relatedActions,
      relatedFollowUps,
      relatedPipelineEvents
    );

    return {
      leadId: cleanText(lead.id),
      buyerName: cleanText(lead.buyerName),
      buyerPhone: cleanText(lead.phone),
      partNeeded: cleanText(lead.partNeeded),
      vehicleBrand: cleanText(lead.vehicleBrand),
      vehicleModel: cleanText(lead.vehicleModel),
      vehicleYear: cleanText(lead.vehicleYear),
      engineCode: cleanText(lead.engineCode),
      location: cleanText(lead.location),
      source: cleanText(lead.source),
      urgency: cleanText(lead.urgency),
      message: cleanText(lead.message),
      originalLeadScore: getLeadScore(lead),
      originalTemperature: cleanText(lead.temperature || "unknown"),
      hotBuyerScore,
      hotBuyerTemperature: classifyTemperature(hotBuyerScore),
      pipelineStage: cleanText(lead.pipelineStage || lead.status || "new"),
      pendingActionCount: pendingActions.length,
      urgentActionCount: urgentActions.length,
      pendingFollowUpCount: pendingFollowUps.length,
      pipelineEventCount: relatedPipelineEvents.length,
      recommendedManualActions: getRecommendedActions(relatedActions, relatedFollowUps),
      manualReviewRequired: true,
      manualActionOnly: true,
      autoSendWhatsApp: false,
      automaticBuyerMessage: false,
      quoteCreatedAutomatically: false,
      pipelineMovedAutomatically: false,
      sentToBuyer: false,
      createdAt: lead.createdAt || "",
      updatedAt: lead.updatedAt || lead.pipelineUpdatedAt || ""
    };
  })
    .filter(record => record.hotBuyerScore >= 50 || record.originalTemperature === "hot")
    .sort((a, b) => {
      if (b.hotBuyerScore !== a.hotBuyerScore) return b.hotBuyerScore - a.hotBuyerScore;
      return b.urgentActionCount - a.urgentActionCount;
    });
}

function listHotBuyers() {
  return buildHotBuyerRecords();
}

function getHotBuyerSummary() {
  const hotBuyers = listHotBuyers();

  const summary = {
    totalHotBuyerCandidates: hotBuyers.length,
    hotBuyers: hotBuyers.filter(item => item.hotBuyerTemperature === "hot").length,
    warmBuyers: hotBuyers.filter(item => item.hotBuyerTemperature === "warm").length,
    coldIncluded: hotBuyers.filter(item => item.hotBuyerTemperature === "cold").length,
    urgentHotBuyers: hotBuyers.filter(item =>
      item.hotBuyerTemperature === "hot" &&
      lower(item.urgency).includes("urgent")
    ).length,
    pendingActionTotal: hotBuyers.reduce((sum, item) => sum + item.pendingActionCount, 0),
    pendingFollowUpTotal: hotBuyers.reduce((sum, item) => sum + item.pendingFollowUpCount, 0),
    autoSendWhatsAppCount: hotBuyers.filter(item => item.autoSendWhatsApp === true).length,
    automaticBuyerMessageCount: hotBuyers.filter(item => item.automaticBuyerMessage === true).length,
    autoQuoteCount: hotBuyers.filter(item => item.quoteCreatedAutomatically === true).length,
    autoPipelineMoveCount: hotBuyers.filter(item => item.pipelineMovedAutomatically === true).length,
    sentToBuyerCount: hotBuyers.filter(item => item.sentToBuyer === true).length
  };

  return {
    ...summary,
    safety: {
      readOnlyRanking: true,
      manualActionOnly: true,
      autoSendWhatsApp: false,
      automaticBuyerMessage: false,
      autoCreateQuote: false,
      autoMovePipelineStage: false,
      sentToBuyer: false
    }
  };
}

module.exports = {
  listHotBuyers,
  getHotBuyerSummary
};

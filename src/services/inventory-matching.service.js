const dataStore = require("./data-store");

function text(value) {
  return String(value || "").trim().toLowerCase();
}

function includesAny(haystack, needles) {
  const h = text(haystack);
  return needles.some(needle => needle && h.includes(text(needle)));
}

function calculateMatchScore(lead, item) {
  let score = 0;
  const reasons = [];

  if (text(item.partName).includes(text(lead.partNeeded)) || text(lead.partNeeded).includes(text(item.partName))) {
    score += 30;
    reasons.push("part name match");
  }

  if (text(item.partCategory) && includesAny(lead.partNeeded, [item.partCategory])) {
    score += 20;
    reasons.push("part category match");
  }

  if (text(lead.vehicleBrand) && text(lead.vehicleBrand) === text(item.vehicleBrand)) {
    score += 15;
    reasons.push("vehicle brand match");
  }

  if (text(lead.vehicleModel) && text(lead.vehicleModel) === text(item.vehicleModel)) {
    score += 15;
    reasons.push("vehicle model match");
  }

  if (text(lead.vehicleYear) && text(item.vehicleYear) && text(lead.vehicleYear) === text(item.vehicleYear)) {
    score += 10;
    reasons.push("vehicle year match");
  }

  if (text(lead.engineCode) && text(item.engineCode) && text(lead.engineCode) === text(item.engineCode)) {
    score += 20;
    reasons.push("engine code match");
  }

  if (item.stockStatus === "in_stock") {
    score += 10;
    reasons.push("inventory marked in stock");
  } else if (item.stockStatus === "low_stock") {
    score += 5;
    reasons.push("inventory marked low stock");
  } else if (item.stockStatus === "out_of_stock") {
    score -= 20;
    reasons.push("inventory marked out of stock");
  } else {
    reasons.push("stock must be confirmed before quote");
  }

  score = Math.max(0, Math.min(100, score));

  return { score, reasons };
}

function getQuoteBlockReasons(item) {
  const reasons = [];

  if (item.quoteReady !== true) {
    reasons.push("inventory item is not quote-ready");
  }

  if (item.stockConfirmedForQuote !== true) {
    reasons.push("stock confirmation is required before quote");
  }

  if (item.compatibilityConfirmed !== true) {
    reasons.push("compatibility confirmation is required before quote");
  }

  if (item.manualReviewRequired !== false) {
    reasons.push("manual review is required before buyer reply");
  }

  return reasons;
}

function matchInventoryForLead(lead) {
  const inventory = dataStore.readCollection("inventory");

  const matches = inventory
    .map(item => {
      const match = calculateMatchScore(lead, item);
      const quoteBlockReasons = getQuoteBlockReasons(item);

      return {
        inventoryItemId: item.id,
        partName: item.partName,
        partCategory: item.partCategory,
        vehicleBrand: item.vehicleBrand,
        vehicleModel: item.vehicleModel,
        vehicleYear: item.vehicleYear,
        engineCode: item.engineCode,
        condition: item.condition,
        stockStatus: item.stockStatus,
        quantity: item.quantity,
        priceRange: item.priceRange,
        shopLocation: item.shopLocation,
        matchScore: match.score,
        matchReasons: match.reasons,
        eligibleForQuote: quoteBlockReasons.length === 0,
        quoteBlocked: quoteBlockReasons.length > 0,
        quoteBlockReasons
      };
    })
    .filter(match => match.matchScore >= 25)
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    leadId: lead.id || null,
    buyerName: lead.buyerName || "",
    partNeeded: lead.partNeeded || "",
    vehicleBrand: lead.vehicleBrand || "",
    vehicleModel: lead.vehicleModel || "",
    vehicleYear: lead.vehicleYear || "",
    engineCode: lead.engineCode || "",
    totalMatches: matches.length,
    safeToQuoteNow: matches.some(match => match.eligibleForQuote === true),
    matches
  };
}

function matchInventoryByLeadId(leadId) {
  const leads = dataStore.readCollection("leads");
  const lead = leads.find(item => item.id === leadId);

  if (!lead) {
    return null;
  }

  return matchInventoryForLead(lead);
}

module.exports = {
  matchInventoryForLead,
  matchInventoryByLeadId
};

function text(value) {
  return String(value || "").trim().toLowerCase();
}

function scoreUrgency(urgency, message) {
  const u = text(urgency);
  const m = text(message);

  if (u === "urgent" || m.includes("urgent") || m.includes("today") || m.includes("now")) {
    return { points: 25, reason: "urgent buyer signal" };
  }

  if (u === "today") return { points: 22, reason: "same-day need" };
  if (u === "this_week") return { points: 14, reason: "this-week need" };

  return { points: 8, reason: "normal urgency" };
}

function scoreSource(source) {
  const s = text(source);

  const map = {
    whatsapp_inbound: [25, "buyer initiated WhatsApp/inbound"],
    public_rfq: [25, "public RFQ buyer intent"],
    owned_landing_page: [22, "owned landing page inquiry"],
    google_search: [20, "search intent source"],
    meta_lead_form: [18, "opt-in lead form"],
    manual_shop_visitor: [18, "manual real buyer intake"],
    referral: [16, "referral source"],
    approved_api: [15, "approved API source"],
    approved_partnership: [15, "approved partnership source"]
  };

  const found = map[s] || [5, "weak or unknown source"];
  return { points: found[0], reason: found[1] };
}

function scorePartDemand(partNeeded) {
  const p = text(partNeeded);
  const fastParts = [
    "alternator",
    "starter",
    "kick starter",
    "starter motor",
    "engine",
    "gearbox",
    "radiator",
    "fuel pump",
    "compressor",
    "injector",
    "coil"
  ];

  if (fastParts.some(part => p.includes(part))) {
    return { points: 20, reason: "fast-moving spare part" };
  }

  if (p.length >= 5) {
    return { points: 10, reason: "specific part request" };
  }

  return { points: 3, reason: "weak part detail" };
}

function scoreLocation(location) {
  const l = text(location);

  if (l.includes("lagos") || l.includes("mushin") || l.includes("ladipo")) {
    return { points: 15, reason: "close to primary delivery/sales zone" };
  }

  if (l.includes("abuja") || l.includes("ibadan") || l.includes("port harcourt")) {
    return { points: 10, reason: "major Nigerian market location" };
  }

  return { points: 5, reason: "general location" };
}

function detectBuyerType(input) {
  const message = text(input.message);
  const part = text(input.partNeeded);

  if (message.includes("bulk") || message.includes("dealer") || message.includes("resell")) {
    return "dealer_reseller";
  }

  if (message.includes("mechanic") || message.includes("customer car")) {
    return "mechanic";
  }

  if (message.includes("price") && !message.includes("urgent")) {
    return "price_checker";
  }

  if (part && (message.includes("need") || message.includes("urgent") || message.includes("today"))) {
    return "serious_buyer";
  }

  return "end_user";
}

function calculateBuyerScore(input) {
  const reasons = [];

  const urgency = scoreUrgency(input.urgency, input.message);
  const source = scoreSource(input.source);
  const demand = scorePartDemand(input.partNeeded);
  const location = scoreLocation(input.location);

  let score = urgency.points + source.points + demand.points + location.points;

  reasons.push(urgency.reason);
  reasons.push(source.reason);
  reasons.push(demand.reason);
  reasons.push(location.reason);

  if (input.duplicateStatus === "possible_duplicate") {
    score -= 15;
    reasons.push("possible duplicate reduced score");
  }

  if (!input.phone) {
    score -= 10;
    reasons.push("missing phone reduced score");
  }

  score = Math.max(0, Math.min(100, score));

  let temperature = "cold";
  if (score >= 70) temperature = "hot";
  else if (score >= 45) temperature = "warm";

  return {
    leadScore: score,
    urgencyLevel: input.urgency || "normal",
    buyerType: detectBuyerType(input),
    sourceQuality: source.points >= 20 ? "high" : source.points >= 15 ? "medium" : "low",
    partDemandScore: demand.points,
    temperature,
    scoringReasons: reasons
  };
}

module.exports = {
  calculateBuyerScore
};

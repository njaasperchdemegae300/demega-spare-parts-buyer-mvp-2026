const fs = require("fs");
const path = require("path");

const dataDir = path.join(process.cwd(), "src", "data");
const inventoryFile = path.join(dataDir, "professional-inventory-items.json");
const quoteHistoryFile = path.join(dataDir, "professional-quote-history.json");

function ensureData() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(inventoryFile)) fs.writeFileSync(inventoryFile, "[]", "utf8");
  if (!fs.existsSync(quoteHistoryFile)) fs.writeFileSync(quoteHistoryFile, "[]", "utf8");
}

function readJson(file, fallback) {
  ensureData();
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw || "null");
    return parsed || fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureData();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function cleanText(value) {
  return String(value || "").trim();
}

function norm(value) {
  return cleanText(value).toLowerCase();
}

const partRules = [
  { key: "alternator", aliases: ["alternator", "altenator", "charger", "charging dynamo"], category: "Electrical Charging", checks: ["plug/socket type", "amp rating", "pulley type", "engine type", "mounting position"] },
  { key: "starter motor", aliases: ["starter", "starter motor", "kick starter", "self starter", "starting motor"], category: "Starting System", checks: ["teeth count", "engine type", "mounting holes", "bendix type", "voltage"] },
  { key: "starter bendix", aliases: ["bendix", "starter bendix", "kick bendix"], category: "Starter Sub-Part", checks: ["teeth count", "shaft size", "starter model", "engine type"] },
  { key: "fuel pump", aliases: ["fuel pump", "pump", "petrol pump"], category: "Fuel System", checks: ["in-tank/external type", "socket type", "pressure rating", "vehicle model"] },
  { key: "gearbox", aliases: ["gearbox", "transmission"], category: "Transmission", checks: ["automatic/manual", "engine type", "sensor/socket type", "mounting compatibility"] },
  { key: "engine", aliases: ["engine", "complete engine", "half engine"], category: "Engine", checks: ["engine code", "year range", "sensor type", "mounting", "condition"] },
  { key: "radiator", aliases: ["radiator"], category: "Cooling System", checks: ["manual/automatic", "hose position", "fan/shroud type", "vehicle year"] },
  { key: "battery", aliases: ["battery"], category: "Electrical Storage", checks: ["amp hour", "terminal position", "size", "warranty"] }
];

const makeRules = [
  "toyota", "lexus", "honda", "nissan", "hyundai", "kia", "mercedes", "benz",
  "bmw", "ford", "mazda", "volkswagen", "vw", "peugeot", "mitsubishi"
];

const modelRules = [
  "corolla", "camry", "rav4", "highlander", "sienna", "matrix", "avensis",
  "accord", "civic", "crv", "pilot", "elantra", "sonata", "tucson",
  "sportage", "rio", "cerato", "sentra", "altima", "pathfinder",
  "rx330", "rx350", "es350", "gx470", "ml350", "c300", "e350"
];

function detectPart(text) {
  const lower = norm(text);
  for (const rule of partRules) {
    if (rule.aliases.some(alias => lower.includes(alias))) return rule;
  }
  return {
    key: "unknown part",
    aliases: [],
    category: "Needs Manual Part Identification",
    checks: ["confirm exact part name", "request photo", "request part number", "confirm vehicle model/year"]
  };
}

function detectYear(text) {
  const match = String(text || "").match(/\b(19[8-9]\d|20[0-3]\d)\b/);
  return match ? Number(match[1]) : null;
}

function detectMake(text) {
  const lower = norm(text);
  return makeRules.find(make => lower.includes(make)) || "";
}

function detectModel(text) {
  const lower = norm(text);
  return modelRules.find(model => lower.includes(model)) || "";
}

function detectUrgency(text) {
  const lower = norm(text);
  if (/urgent|asap|today|now|immediately|serious|ready/i.test(lower)) return "High";
  if (/tomorrow|this week|soon/i.test(lower)) return "Medium";
  return "Normal";
}

function decodePart(input) {
  const text = cleanText(input.text || input.request || input.partNeeded || "");
  const vehicleText = cleanText(input.vehicle || input.vehicleDetails || "");
  const joined = `${text} ${vehicleText}`;

  const part = detectPart(joined);
  const year = input.year ? Number(input.year) : detectYear(joined);
  const make = cleanText(input.make || detectMake(joined));
  const model = cleanText(input.model || detectModel(joined));
  const urgency = detectUrgency(joined);

  const missing = [];
  if (part.key === "unknown part") missing.push("exact part name");
  if (!make) missing.push("vehicle make");
  if (!model) missing.push("vehicle model");
  if (!year) missing.push("vehicle year");

  const confidence = Math.max(35, 100 - missing.length * 15 - (part.key === "unknown part" ? 20 : 0));

  return {
    ok: true,
    normalizedPart: part.key,
    category: part.category,
    vehicle: {
      make: make || "UNKNOWN",
      model: model || "UNKNOWN",
      year: year || "UNKNOWN"
    },
    urgency,
    confidence,
    missing,
    requiredCompatibilityChecks: part.checks,
    recommendation: missing.length
      ? "Ask buyer/admin to provide missing details before stock check or quote."
      : "Proceed to manual stock check and compatibility confirmation before quote.",
    safety: {
      autoSend: false,
      autoQuote: false,
      quoteRequiresStockConfirmation: true,
      quoteRequiresCompatibilityConfirmation: true
    }
  };
}

function getInventoryItems() {
  return readJson(inventoryFile, []);
}

function manualUpsertInventory(input) {
  const items = getInventoryItems();
  const now = new Date().toISOString();

  const item = {
    id: cleanText(input.id) || `INV-${Date.now()}`,
    partName: cleanText(input.partName || input.part),
    vehicleMake: cleanText(input.vehicleMake || input.make),
    vehicleModel: cleanText(input.vehicleModel || input.model),
    yearFrom: input.yearFrom ? Number(input.yearFrom) : null,
    yearTo: input.yearTo ? Number(input.yearTo) : null,
    condition: cleanText(input.condition || "Unknown"),
    quantityStatus: cleanText(input.quantityStatus || "Needs manual confirmation"),
    priceFloor: input.priceFloor ? Number(input.priceFloor) : null,
    sellingPrice: input.sellingPrice ? Number(input.sellingPrice) : null,
    supplier: cleanText(input.supplier || ""),
    compatibilityNotes: cleanText(input.compatibilityNotes || ""),
    stockProof: cleanText(input.stockProof || "manual record only"),
    updatedAt: now,
    createdAt: cleanText(input.createdAt) || now,
    safety: {
      manualInventoryRecordOnly: true,
      notAutoMutatedFromBuyerFlow: true
    }
  };

  const index = items.findIndex(existing => existing.id === item.id);
  if (index >= 0) items[index] = { ...items[index], ...item };
  else items.push(item);

  writeJson(inventoryFile, items);

  return { ok: true, item, count: items.length };
}

function yearFits(item, year) {
  if (!year) return false;
  const from = item.yearFrom ? Number(item.yearFrom) : null;
  const to = item.yearTo ? Number(item.yearTo) : null;
  if (from && year < from) return false;
  if (to && year > to) return false;
  return true;
}

function smartMatch(input) {
  const decoded = decodePart(input);
  const items = getInventoryItems();
  const wantedPart = norm(decoded.normalizedPart);
  const make = norm(decoded.vehicle.make);
  const model = norm(decoded.vehicle.model);
  const year = Number(decoded.vehicle.year);

  const matches = items.map(item => {
    let score = 0;
    const reasons = [];

    if (norm(item.partName).includes(wantedPart) || wantedPart.includes(norm(item.partName))) {
      score += 35;
      reasons.push("part name match");
    }

    if (make && norm(item.vehicleMake).includes(make)) {
      score += 20;
      reasons.push("vehicle make match");
    }

    if (model && norm(item.vehicleModel).includes(model)) {
      score += 20;
      reasons.push("vehicle model match");
    }

    if (yearFits(item, year)) {
      score += 15;
      reasons.push("year range match");
    }

    if (/available|in stock|yes/i.test(item.quantityStatus || "")) {
      score += 10;
      reasons.push("stock marked available");
    }

    return {
      ...item,
      matchScore: score,
      matchReasons: reasons,
      stockConfirmed: /available|in stock|yes/i.test(item.quantityStatus || ""),
      compatibilityConfirmed: score >= 70
    };
  }).filter(item => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  const best = matches[0] || null;

  return {
    ok: true,
    decoded,
    matches,
    bestMatch: best,
    decision: best && best.matchScore >= 70 && best.stockConfirmed
      ? "POSSIBLE_MATCH_REQUIRES_ADMIN_CONFIRMATION"
      : "NEEDS_MANUAL_STOCK_AND_COMPATIBILITY_CHECK",
    safety: {
      noAutoQuote: true,
      noAutoSend: true,
      adminMustConfirmStock: true,
      adminMustConfirmCompatibility: true
    }
  };
}

function buildSmartQuote(input, options = {}) {
  const decoded = decodePart(input);
  const stockConfirmed = input.stockConfirmed === true || input.stockConfirmed === "true";
  const compatibilityConfirmed = input.compatibilityConfirmed === true || input.compatibilityConfirmed === "true";
  const manualReview = input.manualReview === true || input.manualReview === "true";
  const price = cleanText(input.price || input.sellingPrice || "");
  const pickup = cleanText(input.pickup || input.pickupLocation || "Ladipo, Lagos");
  const delivery = cleanText(input.delivery || "Pickup / dispatch can be discussed manually");
  const buyerName = cleanText(input.buyerName || input.name || "Boss");

  const blockers = [];
  if (!stockConfirmed) blockers.push("Stock confirmation is required before quote.");
  if (!compatibilityConfirmed) blockers.push("Compatibility confirmation is required before quote.");
  if (!manualReview) blockers.push("Manual admin review is required before quote draft.");
  if (!price) blockers.push("Price is required for quote draft.");

  if (blockers.length) {
    return {
      ok: false,
      status: "QUOTE_BLOCKED",
      blockers,
      decoded,
      safety: {
        quotePrepared: false,
        whatsappSent: false,
        autoSend: false
      }
    };
  }

  const quoteText = [
    `Good day ${buyerName}.`,
    `The ${decoded.normalizedPart} for ${decoded.vehicle.make} ${decoded.vehicle.model} ${decoded.vehicle.year} has been checked.`,
    `Stock: confirmed manually.`,
    `Compatibility: confirmed manually.`,
    `Price: ${price}.`,
    `Pickup/Delivery: ${pickup}. ${delivery}.`,
    `Please confirm if you want pickup or dispatch.`
  ].join("\n");

  const record = {
    id: `QUOTE-${Date.now()}`,
    createdAt: new Date().toISOString(),
    buyerName,
    buyerPhone: cleanText(input.buyerPhone || input.phone || input.whatsapp || ""),
    decoded,
    price,
    pickup,
    delivery,
    quoteText,
    safety: {
      manualDraftOnly: true,
      whatsappSent: false,
      autoSend: false
    }
  };

  if (options.persist !== false) {
    const history = readJson(quoteHistoryFile, []);
    history.unshift(record);
    writeJson(quoteHistoryFile, history.slice(0, 500));
  }

  return {
    ok: true,
    status: "MANUAL_QUOTE_DRAFT_READY",
    record
  };
}

function getQuoteHistory() {
  return readJson(quoteHistoryFile, []);
}

module.exports = {
  decodePart,
  getInventoryItems,
  manualUpsertInventory,
  smartMatch,
  buildSmartQuote,
  getQuoteHistory
};

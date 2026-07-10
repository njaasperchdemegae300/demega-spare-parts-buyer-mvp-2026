const fs = require("fs");
const path = require("path");

const dataDir = path.join(process.cwd(), "src", "data");
const fitmentFile = path.join(dataDir, "fitment-records.json");

function ensureData() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(fitmentFile)) fs.writeFileSync(fitmentFile, "[]", "utf8");
}

function readJson(file, fallback) {
  ensureData();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || "null") || fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureData();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function clean(value) {
  return String(value || "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function normalizePartNumber(value) {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function list(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value)
    .split(/[,\n|]+/)
    .map(clean)
    .filter(Boolean);
}

const makes = [
  "toyota", "lexus", "honda", "nissan", "hyundai", "kia", "mercedes", "benz",
  "bmw", "ford", "mazda", "volkswagen", "vw", "peugeot", "mitsubishi"
];

const models = [
  "corolla", "camry", "rav4", "highlander", "sienna", "matrix", "avensis",
  "accord", "civic", "crv", "pilot", "elantra", "sonata", "tucson",
  "sportage", "rio", "cerato", "sentra", "altima", "pathfinder",
  "rx330", "rx350", "es350", "gx470", "ml350", "c300", "e350"
];

const partAliases = [
  { partName: "alternator", aliases: ["alternator", "altenator", "charger", "charging dynamo"] },
  { partName: "starter motor", aliases: ["starter", "starter motor", "kick starter", "self starter", "starting motor"] },
  { partName: "starter bendix", aliases: ["bendix", "starter bendix", "kick bendix"] },
  { partName: "fuel pump", aliases: ["fuel pump", "petrol pump"] },
  { partName: "gearbox", aliases: ["gearbox", "transmission"] },
  { partName: "engine", aliases: ["engine", "complete engine", "half engine"] },
  { partName: "radiator", aliases: ["radiator"] }
];

const vinYearMap = {
  A: [1980, 2010], B: [1981, 2011], C: [1982, 2012], D: [1983, 2013],
  E: [1984, 2014], F: [1985, 2015], G: [1986, 2016], H: [1987, 2017],
  J: [1988, 2018], K: [1989, 2019], L: [1990, 2020], M: [1991, 2021],
  N: [1992, 2022], P: [1993, 2023], R: [1994, 2024], S: [1995, 2025],
  T: [1996, 2026], V: [1997, 2027], W: [1998, 2028], X: [1999, 2029],
  Y: [2000, 2030], 1: [2001, 2031], 2: [2002, 2032], 3: [2003, 2033],
  4: [2004, 2034], 5: [2005, 2035], 6: [2006, 2036], 7: [2007, 2037],
  8: [2008, 2038], 9: [2009, 2039]
};

function detectYear(text) {
  const m = clean(text).match(/\b(19[8-9]\d|20[0-3]\d)\b/);
  return m ? Number(m[1]) : null;
}

function detectMake(text) {
  const value = lower(text);
  return makes.find(make => value.includes(make)) || "";
}

function detectModel(text) {
  const value = lower(text);
  return models.find(model => value.includes(model)) || "";
}

function detectPartName(text) {
  const value = lower(text);
  for (const rule of partAliases) {
    if (rule.aliases.some(alias => value.includes(alias))) return rule.partName;
  }
  return "";
}

function decodeVin(vinInput) {
  const vin = clean(vinInput).toUpperCase();

  if (!vin) {
    return { provided: false, valid: false, status: "NO_VIN_PROVIDED" };
  }

  const valid = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);

  if (!valid) {
    return {
      provided: true,
      valid: false,
      vin,
      status: "INVALID_VIN_FORMAT",
      message: "VIN must be 17 characters and cannot contain I, O, or Q."
    };
  }

  const yearCode = vin[9];

  return {
    provided: true,
    valid: true,
    vin,
    wmi: vin.slice(0, 3),
    vds: vin.slice(3, 8),
    checkDigit: vin[8],
    modelYearCode: yearCode,
    possibleModelYears: vinYearMap[yearCode] || [],
    plantCode: vin[10],
    serialNumber: vin.slice(11),
    status: "VIN_STRUCTURE_DECODED_REQUIRES_OEM_OR_MANUAL_FITMENT_CONFIRMATION"
  };
}

function decodeYmm(input) {
  const joined = [
    input.text,
    input.request,
    input.vehicle,
    input.vehicleDetails,
    input.make,
    input.model,
    input.year
  ].map(clean).join(" ");

  return {
    year: input.year ? Number(input.year) : detectYear(joined),
    make: clean(input.make) || detectMake(joined),
    model: clean(input.model) || detectModel(joined),
    engineCode: clean(input.engineCode || input.engine || ""),
    trim: clean(input.trim || ""),
    transmission: clean(input.transmission || "")
  };
}

function decodeFitmentRequest(input) {
  const text = clean(input.text || input.request || input.partNeeded || "");
  const vin = decodeVin(input.vin || "");
  const ymm = decodeYmm(input);
  const partName = clean(input.partName || input.part || detectPartName(text));
  const partNumber = normalizePartNumber(input.partNumber || input.oemNumber || input.number || "");

  const missing = [];
  if (!partName && !partNumber) missing.push("part name or part number");
  if (!vin.provided && (!ymm.year || !ymm.make || !ymm.model)) missing.push("YMM or VIN");
  if (vin.provided && !vin.valid) missing.push("valid VIN");

  return {
    ok: missing.length === 0,
    text,
    vin,
    ymm,
    partName: partName || "UNKNOWN",
    partNumber: partNumber || "",
    missing,
    status: missing.length ? "NEEDS_MORE_INFO" : "READY_FOR_FITMENT_SEARCH",
    safety: {
      noAutoQuote: true,
      noAutoSend: true,
      fitmentRequiresManualConfirmation: true
    }
  };
}

function getFitmentRecords() {
  return readJson(fitmentFile, []);
}

function manualUpsertFitmentRecord(input, options = {}) {
  const records = getFitmentRecords();
  const now = new Date().toISOString();

  const primary = normalizePartNumber(input.primaryPartNumber || input.partNumber || "");
  const crossRefs = list(input.crossReferenceNumbers).map(normalizePartNumber).filter(Boolean);
  const alternatives = list(input.alternativePartNumbers || input.alternativeCompatibleParts).map(normalizePartNumber).filter(Boolean);

  const record = {
    id: clean(input.id) || `FIT-${Date.now()}`,
    partName: clean(input.partName || input.part || "UNKNOWN"),
    primaryPartNumber: primary,
    crossReferenceNumbers: crossRefs,
    alternativePartNumbers: alternatives,
    vehicleMake: clean(input.vehicleMake || input.make),
    vehicleModel: clean(input.vehicleModel || input.model),
    yearFrom: input.yearFrom ? Number(input.yearFrom) : null,
    yearTo: input.yearTo ? Number(input.yearTo) : null,
    engineCode: clean(input.engineCode || input.engine || ""),
    trim: clean(input.trim || ""),
    transmission: clean(input.transmission || ""),
    fitmentGroup: clean(input.fitmentGroup || ""),
    compatibilityNotes: clean(input.compatibilityNotes || ""),
    restrictions: clean(input.restrictions || ""),
    source: clean(input.source || "admin manual fitment record"),
    status: input.manualConfirmed === true || input.status === "MANUALLY_CONFIRMED_FITMENT"
      ? "MANUALLY_CONFIRMED_FITMENT"
      : "POSSIBLE_MATCH_REQUIRES_CONFIRMATION",
    updatedAt: now,
    createdAt: clean(input.createdAt) || now,
    safety: {
      manualRecordOnly: true,
      notAutoConfirmedFromBuyerFlow: true,
      quoteStillRequiresStockConfirmation: true
    }
  };

  if (options.persist === false) {
    return { ok: true, item: record, count: records.length, persisted: false };
  }

  const index = records.findIndex(item => item.id === record.id);
  if (index >= 0) records[index] = { ...records[index], ...record };
  else records.push(record);

  writeJson(fitmentFile, records);

  return { ok: true, item: record, count: records.length, persisted: true };
}

function yearFits(record, year) {
  if (!year) return false;
  if (record.yearFrom && Number(year) < Number(record.yearFrom)) return false;
  if (record.yearTo && Number(year) > Number(record.yearTo)) return false;
  return true;
}

function scoreRecord(decoded, record) {
  let score = 0;
  const reasons = [];

  const wantedPart = lower(decoded.partName);
  const recordPart = lower(record.partName);

  if (decoded.partNumber && record.primaryPartNumber === decoded.partNumber) {
    score += 45;
    reasons.push("exact primary part number match");
  }

  if (decoded.partNumber && (record.crossReferenceNumbers || []).includes(decoded.partNumber)) {
    score += 40;
    reasons.push("cross-reference number match");
  }

  if (decoded.partNumber && (record.alternativePartNumbers || []).includes(decoded.partNumber)) {
    score += 32;
    reasons.push("alternative compatible part number match");
  }

  if (wantedPart && recordPart && (recordPart.includes(wantedPart) || wantedPart.includes(recordPart))) {
    score += 24;
    reasons.push("part name match");
  }

  if (decoded.ymm.make && lower(record.vehicleMake).includes(lower(decoded.ymm.make))) {
    score += 15;
    reasons.push("vehicle make match");
  }

  if (decoded.ymm.model && lower(record.vehicleModel).includes(lower(decoded.ymm.model))) {
    score += 15;
    reasons.push("vehicle model match");
  }

  if (yearFits(record, decoded.ymm.year)) {
    score += 15;
    reasons.push("year range match");
  }

  if (decoded.ymm.engineCode && lower(record.engineCode) === lower(decoded.ymm.engineCode)) {
    score += 10;
    reasons.push("engine code match");
  }

  if (record.status === "MANUALLY_CONFIRMED_FITMENT") {
    score += 10;
    reasons.push("manual fitment record confirmed");
  }

  return { score, reasons };
}

function searchFitment(input, options = {}) {
  const decoded = decodeFitmentRequest(input);
  const records = options.records || getFitmentRecords();

  if (!decoded.ok) {
    return {
      ok: false,
      decoded,
      matches: [],
      decision: "BLOCKED_NOT_ENOUGH_DATA",
      safety: { noQuote: true, noAutoSend: true }
    };
  }

  const matches = records.map(record => {
    const result = scoreRecord(decoded, record);
    return {
      ...record,
      fitmentScore: result.score,
      fitmentReasons: result.reasons,
      requiresManualFinalConfirmation: true
    };
  }).filter(item => item.fitmentScore > 0)
    .sort((a, b) => b.fitmentScore - a.fitmentScore);

  const best = matches[0] || null;

  let decision = "NEEDS_MANUAL_FITMENT_REVIEW";
  if (best && best.fitmentScore >= 80) decision = "STRONG_MATCH_REQUIRES_MANUAL_CONFIRMATION";
  else if (best && best.fitmentScore >= 55) decision = "POSSIBLE_MATCH_REQUIRES_CONFIRMATION";

  return {
    ok: true,
    decoded,
    matches,
    bestMatch: best,
    decision,
    safety: {
      noAutoQuote: true,
      noAutoSend: true,
      quoteRequiresManualFitmentConfirmation: true,
      quoteRequiresStockConfirmation: true
    }
  };
}

function searchPartNumber(input, options = {}) {
  const partNumber = normalizePartNumber(input.partNumber || input.number || input.text || "");
  const records = options.records || getFitmentRecords();

  const matches = records.filter(record => {
    return record.primaryPartNumber === partNumber ||
      (record.crossReferenceNumbers || []).includes(partNumber) ||
      (record.alternativePartNumbers || []).includes(partNumber);
  });

  return {
    ok: Boolean(partNumber),
    partNumber,
    matches,
    decision: matches.length
      ? "PART_NUMBER_FOUND_REQUIRES_YMM_OR_VIN_FITMENT_CONFIRMATION"
      : "PART_NUMBER_NOT_FOUND_IN_MANUAL_RECORDS",
    safety: { noAutoQuote: true, noAutoSend: true }
  };
}

function searchCrossReference(input, options = {}) {
  const result = searchPartNumber(input, options);
  const crossReferences = [];

  for (const record of result.matches) {
    crossReferences.push(...(record.crossReferenceNumbers || []));
    crossReferences.push(record.primaryPartNumber);
  }

  return {
    ...result,
    crossReferenceNumbers: [...new Set(crossReferences.filter(Boolean))],
    decision: result.matches.length
      ? "CROSS_REFERENCE_FOUND_REQUIRES_CONFIRMATION"
      : "NO_CROSS_REFERENCE_FOUND"
  };
}

function searchCompatibleAlternatives(input, options = {}) {
  const fitment = searchFitment(input, options);
  const alternatives = [];

  for (const record of fitment.matches) {
    alternatives.push(...(record.alternativePartNumbers || []));
    alternatives.push(...(record.crossReferenceNumbers || []));
  }

  return {
    ok: fitment.ok,
    decoded: fitment.decoded,
    alternatives: [...new Set(alternatives.filter(Boolean))],
    sourceMatches: fitment.matches,
    decision: alternatives.length
      ? "ALTERNATIVE_COMPATIBLE_PARTS_FOUND_REQUIRES_CONFIRMATION"
      : "NO_ALTERNATIVE_COMPATIBLE_PARTS_FOUND",
    safety: {
      alternativesAreSuggestionsOnly: true,
      adminMustConfirmFitment: true,
      noAutoQuote: true,
      noAutoSend: true
    }
  };
}

function quoteFitmentGate(input, options = {}) {
  const fitment = searchFitment(input, options);
  const manualFitmentConfirmed = input.fitmentConfirmed === true || input.fitmentConfirmed === "true";
  const stockConfirmed = input.stockConfirmed === true || input.stockConfirmed === "true";

  const blockers = [];
  if (!fitment.ok) blockers.push("Fitment search is blocked until required data is present.");
  if (!manualFitmentConfirmed) blockers.push("Manual fitment confirmation is required.");
  if (!stockConfirmed) blockers.push("Stock confirmation is required.");

  return {
    ok: blockers.length === 0,
    status: blockers.length ? "QUOTE_BLOCKED_BY_FITMENT_GATE" : "FITMENT_AND_STOCK_READY_FOR_MANUAL_QUOTE_DRAFT",
    blockers,
    fitment,
    safety: {
      noAutoQuote: true,
      noAutoSend: true,
      manualQuoteOnly: true
    }
  };
}

module.exports = {
  decodeVin,
  decodeYmm,
  decodeFitmentRequest,
  getFitmentRecords,
  manualUpsertFitmentRecord,
  searchFitment,
  searchPartNumber,
  searchCrossReference,
  searchCompatibleAlternatives,
  quoteFitmentGate,
  normalizePartNumber
};

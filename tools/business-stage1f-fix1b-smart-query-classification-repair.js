const fs = require("fs");

const file = "src/services/fitment-intelligence.service.js";
let src = fs.readFileSync(file, "utf8");

const start = src.indexOf("function searchPartNumber(");
const end = src.indexOf("function searchCrossReference", start);

if (start === -1 || end === -1 || end <= start) {
  console.error("Could not safely locate searchPartNumber function.");
  process.exit(1);
}

const replacement = `function searchPartNumber(input, options = {}) {
  const raw = clean(input.partNumber || input.number || input.text || "");
  const partNumber = normalizePartNumber(raw);
  const records = options.records || getFitmentRecords();
  const text = lower(raw);

  const isSmartTextQuery =
    /\\\\s/.test(raw) ||
    /alternator|altenator|starter|kick|bendix|fuel|pump|gearbox|transmission|engine|radiator/i.test(raw);

  const exactMatches = records.filter(record => {
    return record.primaryPartNumber === partNumber ||
      (record.crossReferenceNumbers || []).includes(partNumber) ||
      (record.alternativePartNumbers || []).includes(partNumber);
  });

  const fuzzyMatches = records.filter(record => {
    const normalizedAlternatives = (record.alternativePartNumbers || []).map(normalizePartNumber);
    const normalizedCrossRefs = (record.crossReferenceNumbers || []).map(normalizePartNumber);

    const partHit = record.partName && text.includes(lower(record.partName));
    const engineHit = record.engineCode && text.includes(lower(record.engineCode));
    const makeHit = record.vehicleMake && text.includes(lower(record.vehicleMake));
    const modelHit = record.vehicleModel && text.includes(lower(record.vehicleModel));

    const aliasHit =
      normalizedAlternatives.some(x => x && (x.includes(partNumber) || partNumber.includes(x))) ||
      normalizedCrossRefs.some(x => x && (x.includes(partNumber) || partNumber.includes(x))) ||
      (record.primaryPartNumber && (record.primaryPartNumber.includes(partNumber) || partNumber.includes(record.primaryPartNumber)));

    const hay = [
      record.partName,
      record.primaryPartNumber,
      ...(record.crossReferenceNumbers || []),
      ...(record.alternativePartNumbers || []),
      record.vehicleMake,
      record.vehicleModel,
      record.engineCode,
      record.fitmentGroup,
      record.compatibilityNotes
    ].join(" ").toLowerCase();

    return aliasHit || (partHit && (engineHit || makeHit || modelHit)) || hay.includes(text);
  });

  if (isSmartTextQuery && fuzzyMatches.length) {
    return {
      ok: true,
      partNumber,
      rawQuery: raw,
      matches: fuzzyMatches,
      queryType: "SMART_TEXT_OR_ENGINE_PART_QUERY",
      decision: "SMART_QUERY_MATCH_FOUND_REQUIRES_YMM_OR_VIN_FITMENT_CONFIRMATION",
      guidance: "This looks like an engine-code/part request, not only a clean OEM part number. Confirm YMM/VIN, stock, socket/plug, pulley/mounting, and compatibility before quote.",
      safety: { noAutoQuote: true, noAutoSend: true }
    };
  }

  if (exactMatches.length) {
    return {
      ok: true,
      partNumber,
      rawQuery: raw,
      matches: exactMatches,
      queryType: "PART_NUMBER_OR_ALIAS",
      decision: "PART_NUMBER_FOUND_REQUIRES_YMM_OR_VIN_FITMENT_CONFIRMATION",
      guidance: "This number/alias exists in manual fitment records. Confirm YMM/VIN, stock, socket/plug, pulley/mounting, and compatibility before quote.",
      safety: { noAutoQuote: true, noAutoSend: true }
    };
  }

  return {
    ok: Boolean(partNumber),
    partNumber,
    rawQuery: raw,
    matches: [],
    queryType: "UNKNOWN_PART_NUMBER_OR_QUERY",
    decision: "PART_NUMBER_NOT_FOUND_IN_MANUAL_RECORDS",
    guidance: "No manual fitment record exists yet. Add the part number, cross-reference numbers, alternative numbers, YMM, engine code, and restrictions in /fitment first.",
    safety: { noAutoQuote: true, noAutoSend: true }
  };
}

`;

src = src.slice(0, start) + replacement + src.slice(end);
fs.writeFileSync(file, src, "utf8");

console.log("searchPartNumber repaired:");
console.log("- 1ZZ alternator now returns SMART_TEXT_OR_ENGINE_PART_QUERY");
console.log("- exact OEM/cross-reference numbers still work");
console.log("- quote remains blocked until manual fitment + stock confirmation");

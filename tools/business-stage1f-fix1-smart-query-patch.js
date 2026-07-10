const fs = require("fs");

const file = "src/services/fitment-intelligence.service.js";
let src = fs.readFileSync(file, "utf8");

const oldBlock = `function searchPartNumber(input, options = {}) {
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
}`;

const newBlock = `function searchPartNumber(input, options = {}) {
  const raw = clean(input.partNumber || input.number || input.text || "");
  const partNumber = normalizePartNumber(raw);
  const records = options.records || getFitmentRecords();

  const exactMatches = records.filter(record => {
    return record.primaryPartNumber === partNumber ||
      (record.crossReferenceNumbers || []).includes(partNumber) ||
      (record.alternativePartNumbers || []).includes(partNumber);
  });

  if (exactMatches.length) {
    return {
      ok: true,
      partNumber,
      matches: exactMatches,
      queryType: "PART_NUMBER_OR_ALIAS",
      decision: "PART_NUMBER_FOUND_REQUIRES_YMM_OR_VIN_FITMENT_CONFIRMATION",
      guidance: "This number/alias exists in manual fitment records. Confirm YMM/VIN, stock, socket/plug, pulley/mounting, and compatibility before quote.",
      safety: { noAutoQuote: true, noAutoSend: true }
    };
  }

  const text = lower(raw);
  const fuzzyMatches = records.filter(record => {
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

    const partHit = record.partName && text.includes(lower(record.partName));
    const engineHit = record.engineCode && text.includes(lower(record.engineCode));
    const modelHit = record.vehicleModel && text.includes(lower(record.vehicleModel));
    const aliasHit = (record.alternativePartNumbers || []).some(x => partNumber.includes(normalizePartNumber(x)) || normalizePartNumber(x).includes(partNumber));

    return partHit || engineHit || modelHit || aliasHit || hay.includes(text);
  });

  if (fuzzyMatches.length) {
    return {
      ok: true,
      partNumber,
      rawQuery: raw,
      matches: fuzzyMatches,
      queryType: "SMART_TEXT_OR_ENGINE_PART_QUERY",
      decision: "SMART_QUERY_MATCH_FOUND_REQUIRES_YMM_OR_VIN_FITMENT_CONFIRMATION",
      guidance: "This looks like an engine-code/part request, not a clean OEM part number. Use /fitment with year, make, model, engine code, and part name to confirm compatibility.",
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
}`;

if (!src.includes(oldBlock)) {
  console.error("Could not find original searchPartNumber block. Aborting to avoid unsafe patch.");
  process.exit(1);
}

src = src.replace(oldBlock, newBlock);
fs.writeFileSync(file, src, "utf8");

console.log("searchPartNumber upgraded with smart query fallback.");

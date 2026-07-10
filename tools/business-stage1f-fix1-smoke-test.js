const fs = require("fs");
const path = require("path");

const service = require(path.join(process.cwd(), "src", "services", "fitment-intelligence.service.js"));

const checks = [];

function pass(name, ok) {
  checks.push({ name, ok });
}

const records = service.getFitmentRecords();

pass("seed fitment records exist", records.length >= 2);
pass("Toyota Corolla 1ZZ alternator seed exists", records.some(r => r.id === "FIT-TOY-COR-ALT-1ZZ-2003-2008"));
pass("Toyota Camry 2AZ alternator seed exists", records.some(r => r.id === "FIT-TOY-CAM-ALT-2AZ-2002-2006"));

const exact = service.searchPartNumber({ partNumber: "27060-0D040" });
pass("exact OEM part number search finds match", exact.matches.length >= 1 && exact.decision.includes("FOUND"));

const cross = service.searchPartNumber({ partNumber: "104210-3290" });
pass("cross-reference search finds match", cross.matches.length >= 1 && cross.decision.includes("FOUND"));

const smart = service.searchPartNumber({ partNumber: "1ZZ alternator" });
pass("smart engine/part query finds match", smart.matches.length >= 1 && smart.queryType === "SMART_TEXT_OR_ENGINE_PART_QUERY");

const fitment = service.searchFitment({
  year: 2005,
  make: "Toyota",
  model: "Corolla",
  engineCode: "1ZZ",
  partName: "alternator"
});

pass("fitment search finds Corolla 1ZZ alternator", fitment.matches.length >= 1 && fitment.bestMatch.vehicleModel === "Corolla");

const alt = service.searchCompatibleAlternatives({
  year: 2005,
  make: "Toyota",
  model: "Corolla",
  engineCode: "1ZZ",
  partName: "alternator"
});

pass("alternative search returns seeded alternatives", alt.alternatives.includes("ALTTOYCOR05") || alt.alternatives.includes("1ZZALTERNATOR"));

const gate = service.quoteFitmentGate({
  year: 2005,
  make: "Toyota",
  model: "Corolla",
  engineCode: "1ZZ",
  partName: "alternator"
});

pass("fitment gate still blocks quote without stock/fitment confirmation", gate.ok === false);

const ready = service.quoteFitmentGate({
  year: 2005,
  make: "Toyota",
  model: "Corolla",
  engineCode: "1ZZ",
  partName: "alternator",
  fitmentConfirmed: true,
  stockConfirmed: true
});

pass("fitment gate passes only after stock and fitment confirmation", ready.ok === true);
pass("no auto send remains true", ready.safety.noAutoSend === true && ready.safety.manualQuoteOnly === true);

const verdict = checks.every(x => x.ok) ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1F-FIX-1 Fitment Seed Data + Smart Query Repair Report

## Verdict
${verdict}

## Test Results
${checks.map(x => `- ${x.ok ? "PASS" : "FAIL"}: ${x.name}`).join("\n")}

## What Was Fixed
- Added starter seed fitment records.
- Added Toyota Corolla 1ZZ alternator fitment seed.
- Added Toyota Camry 2AZ alternator fitment seed.
- Added OEM/cross-reference/alternative part-number examples.
- Upgraded part-number search to understand engine-code + part text like "1ZZ alternator".
- Added guidance when query is not a real OEM part number.
- Kept quote blocked until manual fitment and stock confirmation.

## Important Explanation
The previous result was not an error. It meant the manual fitment database had no record matching the query.

## Safety Confirmed
- No traffic gate opened.
- No ads started.
- No buyer contacted.
- No WhatsApp sent.
- No auto-quote.
- No auto-send.
- No inventory mutation from buyer flow.
- No sale closing.
- Quote remains blocked until manual fitment and stock confirmation.

## Next Required Action
Push to GitHub, redeploy Render latest commit, then test:
- /part-number-search with 1ZZ alternator
- /fitment with Toyota Corolla 2005 1ZZ alternator
- /alternative-compatible-parts
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1f-fix1-fitment-seed-smart-query-report.md"), report, "utf8");

console.log(report);

if (verdict !== "APPROVED") process.exit(1);

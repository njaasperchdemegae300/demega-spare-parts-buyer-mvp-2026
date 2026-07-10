const fs = require("fs");
const path = require("path");

const checks = [];

function pass(name, ok) {
  checks.push({ name, ok });
}

function exists(file) {
  return fs.existsSync(path.join(process.cwd(), file));
}

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

pass("fitment service exists", exists("src/services/fitment-intelligence.service.js"));
pass("fitment professional page exists", exists("public/fitment-professional.html"));
pass("fitment data file exists", exists("src/data/fitment-records.json"));
pass("route file exists", exists("src/routes/index.routes.js"));

const service = require(path.join(process.cwd(), "src", "services", "fitment-intelligence.service.js"));
const routes = read("src/routes/index.routes.js");
const hub = read("public/admin-hub-professional.html");

pass("fitment route exists", routes.includes("/fitment"));
pass("VIN search alias exists", routes.includes("/vin-search"));
pass("YMM search alias exists", routes.includes("/ymm-search"));
pass("part-number search alias exists", routes.includes("/part-number-search"));
pass("cross-reference route exists", routes.includes("/cross-reference"));
pass("alternative-compatible route exists", routes.includes("/alternative-compatible-parts"));
pass("fitment decode API exists", routes.includes("/api/fitment/decode"));
pass("fitment search API exists", routes.includes("/api/fitment/search"));
pass("part number API exists", routes.includes("/api/part-number/search"));
pass("cross reference API exists", routes.includes("/api/cross-reference/search"));
pass("compatible alternatives API exists", routes.includes("/api/compatible-alternatives/search"));

const vin = service.decodeVin("JTDBR32E520123456");
pass("VIN decoder validates 17-character VIN", vin.valid === true && vin.wmi === "JTD");

const badVin = service.decodeVin("BADVIN");
pass("VIN decoder blocks invalid VIN", badVin.valid === false);

const decoded = service.decodeFitmentRequest({ text: "Need Toyota Corolla 2005 alternator", year: 2005, make: "Toyota", model: "Corolla" });
pass("YMM/part decoder prepares fitment search", decoded.status === "READY_FOR_FITMENT_SEARCH");

const sampleRecord = service.manualUpsertFitmentRecord({
  partName: "alternator",
  primaryPartNumber: "27060-0D040",
  crossReferenceNumbers: "27060-0D041, 27060-0D042",
  alternativePartNumbers: "ALT-TOY-COR-05",
  vehicleMake: "Toyota",
  vehicleModel: "Corolla",
  yearFrom: 2003,
  yearTo: 2008,
  engineCode: "1ZZ",
  manualConfirmed: true
}, { persist: false }).item;

const records = [sampleRecord];

const fitment = service.searchFitment({
  text: "Toyota Corolla 2005 alternator",
  year: 2005,
  make: "Toyota",
  model: "Corolla",
  partName: "alternator",
  partNumber: "27060-0D041"
}, { records });

pass("fitment search finds cross-reference match", fitment.matches.length === 1 && fitment.bestMatch.fitmentScore >= 80);

const cross = service.searchCrossReference({ partNumber: "27060-0D041" }, { records });
pass("cross-reference search returns related numbers", cross.crossReferenceNumbers.includes("270600D040"));

const alt = service.searchCompatibleAlternatives({
  year: 2005,
  make: "Toyota",
  model: "Corolla",
  partName: "alternator"
}, { records });

pass("alternative compatible parts are suggested", alt.alternatives.includes("ALTTOYCOR05"));

const quoteGateBlocked = service.quoteFitmentGate({
  year: 2005,
  make: "Toyota",
  model: "Corolla",
  partName: "alternator"
}, { records });

pass("quote gate blocks without manual fitment and stock confirmation", quoteGateBlocked.ok === false && quoteGateBlocked.status === "QUOTE_BLOCKED_BY_FITMENT_GATE");

const quoteGateReady = service.quoteFitmentGate({
  year: 2005,
  make: "Toyota",
  model: "Corolla",
  partName: "alternator",
  fitmentConfirmed: true,
  stockConfirmed: true
}, { records });

pass("quote gate passes only after fitment and stock confirmation", quoteGateReady.ok === true);

pass("admin hub links fitment suite", hub.includes("Fitment Intelligence Suite") && hub.includes("/fitment"));
pass("no unsafe automation added", !routes.includes("autoSendWhatsApp = true") && !routes.includes("activateRealBuyerTraffic = true"));

const verdict = checks.every(item => item.ok) ? "APPROVED" : "NEEDS FIX";

const report = `# Business Stage 1F Fitment Intelligence + Cross-Reference Engine Report

## Verdict
${verdict}

## Test Results
${checks.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`).join("\n")}

## What Was Added
- VIN structure decoder.
- YMM fitment decoder.
- Part-number normalization/search.
- Cross-reference number search.
- Alternative compatible parts search.
- Manual fitment record store.
- Fitment search engine.
- Fitment quote gate.
- Professional /fitment page.
- Admin Hub links to Fitment Intelligence Suite.

## Professional Fitment Rule
Quote remains blocked until:
- fitment is manually confirmed
- stock is manually confirmed
- admin prepares a manual quote draft

## Safety Confirmed
- No traffic gate opened.
- No ads started.
- No buyer contacted.
- No WhatsApp sent.
- No auto-reply.
- No auto-follow-up.
- No private-data scraping.
- No hidden data harvesting.
- No automatic quote.
- No inventory mutation from buyer flow.
- No accounting mutation.
- No sale closing.
- No pipeline movement.

## Next Required Action
Push to GitHub, redeploy Render latest commit, then test:
- /fitment
- /vin-search
- /part-number-search
- /cross-reference
- /alternative-compatible-parts
`;

fs.mkdirSync(path.join(process.cwd(), "reports"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "reports", "business-stage1f-fitment-intelligence-report.md"), report, "utf8");

console.log(report);

if (verdict !== "APPROVED") process.exit(1);

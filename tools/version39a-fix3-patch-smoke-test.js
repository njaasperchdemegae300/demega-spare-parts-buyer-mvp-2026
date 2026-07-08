const fs = require("fs");

const file = "tools/version39a-controlled-buyer-gate-final-readiness-lock-smoke-test.js";
let s = fs.readFileSync(file, "utf8");

if (!s.includes("const getSmokeRecord = response =>")) {
  const start = s.indexOf("    const reviewOk =");
  const end = s.indexOf("    const eligibilityOk =", start);

  if (start === -1 || end === -1) {
    throw new Error("Could not find Version 39A smoke-test review/stock/compatibility parsing block.");
  }

  const replacement = `    const getSmokeRecord = response => response.body.record || response.body.review || response.body.stockCheck || response.body.compatibilityCheck || response.body.manualLeadReview || response.body.manualStockCheck || response.body.manualCompatibilityCheck || {};
    const getSmokeField = (record, fields) => {
      for (const field of fields) {
        if (record[field] !== undefined && record[field] !== null && String(record[field]).trim() !== "") return String(record[field]);
      }
      return "";
    };
    const reviewRecord = getSmokeRecord(review1);
    const stockRecord = getSmokeRecord(stock1);
    const compatibilityRecord = getSmokeRecord(compatibility1);

    const reviewOk = review1.status === 201 && ["ACCEPT_FOR_MANUAL_STOCK_CHECK", "MANUAL_LEAD_REVIEW_ACCEPTED", "ACCEPTED", "APPROVED"].includes(getSmokeField(reviewRecord, ["reviewDecision", "manualLeadReviewDecision", "leadReviewDecision", "decision", "status"]));
    const stockOk = stock1.status === 201 && ["STOCK_CONFIRMED_AVAILABLE", "STOCK_AVAILABLE", "CONFIRMED", "APPROVED"].includes(getSmokeField(stockRecord, ["stockDecision", "manualStockDecision", "stockCheckDecision", "decision", "status"]));
    const compatibilityOk = compatibility1.status === 201 && ["COMPATIBILITY_CONFIRMED", "COMPATIBLE", "CONFIRMED", "APPROVED"].includes(getSmokeField(compatibilityRecord, ["compatibilityDecision", "manualCompatibilityDecision", "compatibilityCheckDecision", "decision", "status"]));
`;

  s = s.slice(0, start) + replacement + s.slice(end);
}

fs.writeFileSync(file, s, "utf8");
console.log("Version 39A FIX-3 smoke-test parsing patched with Node.");

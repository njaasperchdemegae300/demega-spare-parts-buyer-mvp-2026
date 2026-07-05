const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const leadsPath = path.join(ROOT, "src", "data", "leads.json");
const reportPath = path.join(ROOT, "reports", "version2c-data-integrity-gate-report.md");

const approvedSources = new Set([
  "owned_landing_page",
  "whatsapp_inbound",
  "google_search",
  "meta_lead_form",
  "manual_shop_visitor",
  "referral",
  "public_rfq",
  "approved_api",
  "approved_partnership"
]);

const allowedUrgency = new Set(["normal", "urgent", "today", "this_week"]);
const allowedStatus = new Set(["new", "contacted", "qualified", "negotiating", "won", "lost", "follow_up"]);
const allowedQuoteStatus = new Set(["not_ready", "draft_ready", "approved", "sent"]);

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8").trim() || "[]";
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON array.`);
  }
  return parsed;
}

function isTestLead(lead) {
  const name = String(lead.buyerName || "").toLowerCase();
  const message = String(lead.message || "").toLowerCase();

  return (
    name.includes("test buyer") ||
    name.includes("validation test") ||
    message.includes("test") ||
    String(lead.phone || "") === "08000000000"
  );
}

function validateLead(lead, index) {
  const errors = [];

  const requiredStringFields = [
    "id",
    "buyerName",
    "phone",
    "source",
    "partNeeded",
    "vehicleBrand",
    "vehicleModel",
    "location",
    "status",
    "quoteStatus",
    "createdAt",
    "updatedAt"
  ];

  for (const field of requiredStringFields) {
    if (!String(lead[field] || "").trim()) {
      errors.push(`lead[${index}] missing ${field}`);
    }
  }

  if (lead.source && !approvedSources.has(lead.source)) {
    errors.push(`lead[${index}] has unapproved source: ${lead.source}`);
  }

  if (lead.urgency && !allowedUrgency.has(lead.urgency)) {
    errors.push(`lead[${index}] has invalid urgency: ${lead.urgency}`);
  }

  if (lead.status && !allowedStatus.has(lead.status)) {
    errors.push(`lead[${index}] has invalid status: ${lead.status}`);
  }

  if (lead.quoteStatus && !allowedQuoteStatus.has(lead.quoteStatus)) {
    errors.push(`lead[${index}] has invalid quoteStatus: ${lead.quoteStatus}`);
  }

  if (lead.stockConfirmed !== false) {
    errors.push(`lead[${index}] stockConfirmed must remain false at intake stage`);
  }

  if (lead.compatibilityConfirmed !== false) {
    errors.push(`lead[${index}] compatibilityConfirmed must remain false at intake stage`);
  }

  if (lead.manualReviewRequired !== true) {
    errors.push(`lead[${index}] manualReviewRequired must remain true`);
  }

  if (String(lead.source || "").includes("scraped")) {
    errors.push(`lead[${index}] contains blocked scraped source`);
  }

  return errors;
}

function main() {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const before = readJsonArray(leadsPath);
  const testLeads = before.filter(isTestLead);
  const cleaned = before.filter(lead => !isTestLead(lead));

  fs.writeFileSync(leadsPath, JSON.stringify(cleaned, null, 2), "utf8");

  const validationErrors = [];
  cleaned.forEach((lead, index) => {
    validationErrors.push(...validateLead(lead, index));
  });

  const verdict = validationErrors.length === 0 ? "APPROVED" : "NEEDS FIX";

  const report = `# Version 2C Buyer Intake Data Integrity Gate Report

## Verdict
${verdict}

## Data Cleanup
- Leads before cleanup: ${before.length}
- Test leads removed: ${testLeads.length}
- Leads after cleanup: ${cleaned.length}

## Integrity Checks
- JSON array storage: PASS
- Test lead cleanup: PASS
- Approved source validation: ${validationErrors.some(x => x.includes("source")) ? "FAIL" : "PASS"}
- Intake stock confirmation rule: ${validationErrors.some(x => x.includes("stockConfirmed")) ? "FAIL" : "PASS"}
- Intake compatibility confirmation rule: ${validationErrors.some(x => x.includes("compatibilityConfirmed")) ? "FAIL" : "PASS"}
- Manual review rule: ${validationErrors.some(x => x.includes("manualReviewRequired")) ? "FAIL" : "PASS"}
- Blocked scraped source check: ${validationErrors.some(x => x.includes("scraped")) ? "FAIL" : "PASS"}

## Validation Errors
${validationErrors.length ? validationErrors.map(x => `- ${x}`).join("\n") : "- NONE"}

## Next Phase After Approval
Version 3A — Admin Lead Dashboard Foundation
`;

  fs.writeFileSync(reportPath, report, "utf8");
  console.log(report);

  if (verdict !== "APPROVED") {
    process.exitCode = 1;
  }
}

main();

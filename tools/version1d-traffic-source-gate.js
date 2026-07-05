const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const reportPath = path.join(ROOT, "reports", "version1d-traffic-source-gate-report.md");

function read(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    return "";
  }
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

const requiredFiles = [
  "docs/TRAFFIC_SOURCE_REGISTRY.md",
  "PROJECT_MAP_2026.md",
  "SAFETY_RULES.md",
  "docs/EXACT_PRODUCT_PICTURE_AGENT_PLAN.md"
];

const requiredRegistryKeywords = [
  "RFQ",
  "opt-in form",
  "inbound WhatsApp click-to-chat",
  "approved API",
  "No quote before stock confirmation",
  "Alibaba RFQ",
  "Global Sources RFQ",
  "eBay Motors",
  "OEC Marketplace / RepairLink",
  "PartsTech",
  "RockAuto",
  "AutoZone",
  "RevolutionParts",
  "Car-Part.com",
  "Marketparts",
  "MARKET INTELLIGENCE ONLY",
  "private-data scraping",
  "unsolicited WhatsApp blasting"
];

const registry = read("docs/TRAFFIC_SOURCE_REGISTRY.md");
const projectMap = read("PROJECT_MAP_2026.md");

const fileResults = requiredFiles.map(file => ({ file, ok: exists(file) }));

const keywordResults = requiredRegistryKeywords.map(keyword => ({
  keyword,
  ok: registry.includes(keyword)
}));

const mapOk =
  projectMap.includes("Version 1D") &&
  projectMap.includes("Traffic Source Registry") &&
  projectMap.includes("Only buyer-intent sources are approved");

const needsFix = [
  ...fileResults.filter(x => !x.ok).map(x => `Missing file: ${x.file}`),
  ...keywordResults.filter(x => !x.ok).map(x => `Registry missing keyword: ${x.keyword}`),
  ...(mapOk ? [] : ["PROJECT_MAP_2026.md missing Version 1D traffic source alignment block"])
];

const verdict = needsFix.length === 0 ? "APPROVED" : "NEEDS FIX";

const report = `# Version 1D Traffic Source Gate Report

## Verdict
${verdict}

## Required Files
${fileResults.map(x => `- ${x.ok ? "PASS" : "FAIL"}: ${x.file}`).join("\n")}

## Registry Keyword Checks
${keywordResults.map(x => `- ${x.ok ? "PASS" : "FAIL"}: ${x.keyword}`).join("\n")}

## Project Map Check
${mapOk ? "PASS" : "FAIL"}

## Approved Source Categories
- RFQ
- opt-in form
- inbound WhatsApp click-to-chat
- public business inquiry
- approved API
- approved partnership
- manual buyer intake after real buyer conversation

## Market Intelligence Only Sources
- eBay Motors
- OEC Marketplace / RepairLink
- PartsTech
- RockAuto
- AutoZone
- RevolutionParts
- Car-Part.com
- Marketparts
- Jiji-like seller-heavy marketplaces

## Needs Fix
${needsFix.length ? needsFix.map(x => `- ${x}`).join("\n") : "- NONE"}

## Next Phase After Approval
Version 2A — Buyer Intake API Foundation
`;

fs.writeFileSync(reportPath, report, "utf8");
console.log(report);

if (verdict !== "APPROVED") {
  process.exitCode = 1;
}

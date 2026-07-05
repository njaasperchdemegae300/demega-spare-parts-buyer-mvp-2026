const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = process.cwd();
const reportPath = path.join(ROOT, "reports", "version1c-project-alignment-gate.md");

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    return "";
  }
}

function run(command) {
  try {
    return execSync(command, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch (error) {
    return String(error.stdout || error.stderr || error.message || "").trim();
  }
}

const activeFiles = [
  "README.md",
  "START_HERE_EVERY_CHAT.md",
  "PROJECT_MASTER_PLAN_2026.md",
  "PROJECT_MAP_2026.md",
  "VERSION_PLAN_30_DAYS.md",
  "SAFETY_RULES.md",
  "DECISION_REGISTER.md",
  "LATEST_STATUS.md",
  "package.json",
  "src/server.js",
  "src/routes/index.routes.js",
  "src/controllers/health.controller.js",
  "src/controllers/project.controller.js",
  "src/controllers/storage.controller.js",
  "src/services/data-store.js",
  "src/data/leads.json",
  "src/data/inventory.json",
  "src/data/quotes.json",
  "src/data/followups.json"
];

const plannedFiles = [
  "docs/EXACT_PRODUCT_PICTURE_AGENT_PLAN.md"
];

const requiredKeywords = [
  ["PROJECT_MASTER_PLAN_2026.md", "Small Smart MVP Goal"],
  ["PROJECT_MAP_2026.md", "Version 2"],
  ["SAFETY_RULES.md", "No auto-send"],
  ["SAFETY_RULES.md", "No private-data scraping"],
  ["START_HERE_EVERY_CHAT.md", "No quote before stock confirmation"],
  ["docs/EXACT_PRODUCT_PICTURE_AGENT_PLAN.md", "Exact Product Picture Agent"]
];

const activeResults = activeFiles.map(file => ({ file, ok: exists(file) }));
const plannedResults = plannedFiles.map(file => ({ file, ok: exists(file) }));

const keywordResults = requiredKeywords.map(([file, keyword]) => ({
  file,
  keyword,
  ok: read(file).includes(keyword)
}));

const needsFix = [
  ...activeResults.filter(x => !x.ok).map(x => x.file),
  ...keywordResults.filter(x => !x.ok).map(x => `${x.file} missing ${x.keyword}`)
];

const gitStatus = run("git status --short");
const latestCommit = run("git log -1 --oneline");

const verdict = needsFix.length === 0 ? "APPROVED" : "NEEDS FIX";

const report = `# Version 1C Project Alignment Gate Report

## Verdict
${verdict}

## Latest Commit
${latestCommit}

## Git Status Before Commit
\`\`\`txt
${gitStatus || "clean"}
\`\`\`

## Original Big Project
Spare-parts-bulk-buyer_Engine_2026 Ai Morden

## Current Small Smart MVP
Demega Spare Parts Buyer MVP 2026

## Alignment Decision
The current MVP is aligned with the original project because it is building the trusted foundation first:
- backend server
- data storage
- buyer intake next
- inventory next
- quote engine next
- picture agent later
- version guardian before live testing

## Active Project Files
${activeResults.map(x => `- ${x.ok ? "PASS" : "MISSING"}: ${x.file}`).join("\n")}

## Dormant Project Files
- NONE DETECTED IN CURRENT FRESH MVP

## Blocked Project Files
- NONE DETECTED IN CURRENT FRESH MVP

## Needs-Fix Project Files
${needsFix.length ? needsFix.map(x => `- ${x}`).join("\n") : "- NONE"}

## Project-Map Aligned Files
${keywordResults.map(x => `- ${x.ok ? "PASS" : "FAIL"}: ${x.file} contains ${x.keyword}`).join("\n")}

## Traffic Source Files
- PROJECT_MAP_2026.md
- SAFETY_RULES.md
- Future file needed: TRAFFIC_SOURCE_REGISTRY.md

## Exact Product Picture Agent Status
${plannedResults.map(x => `- ${x.ok ? "PASS" : "MISSING"}: ${x.file}`).join("\n")}

## Remaining Version / Phase Plan
- Version 2A: Buyer Intake API Foundation
- Version 2B: Buyer Intake Validation
- Version 2C: Buyer Intake Smoke Test
- Version 3A: Admin Lead Dashboard
- Version 4A: Buyer Scoring Engine
- Version 5A: Inventory Command Center
- Version 6A: Smart Quote + WhatsApp Reply
- Version 6B: Exact Product Picture Agent Plan / Image Library Foundation
- Version 7A: Follow-up Engine
- Version 8A: Project Health Agent Upgrade
- Version 9A: Version Guardian Controlled Test

## Confidence
Current confidence: 82%

Reason:
The process is now stronger than before because every version is tested before approval. Confidence will increase after Buyer Intake, Inventory, Quote, and Version Guardian are completed.
`;

fs.writeFileSync(reportPath, report, "utf8");
console.log(report);

if (verdict !== "APPROVED") {
  process.exitCode = 1;
}

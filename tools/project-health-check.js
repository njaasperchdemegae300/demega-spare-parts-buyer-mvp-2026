const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = process.cwd();
const reportDir = path.join(ROOT, "reports");
const reportPath = path.join(reportDir, "phase0b-fix1-project-health-check-report.md");

fs.mkdirSync(reportDir, { recursive: true });

const requiredFiles = [
  "README.md",
  "START_HERE_EVERY_CHAT.md",
  "PROJECT_MASTER_PLAN_2026.md",
  "PROJECT_MAP_2026.md",
  "VERSION_PLAN_30_DAYS.md",
  "SAFETY_RULES.md",
  "DECISION_REGISTER.md",
  "LATEST_STATUS.md",
  "package.json"
];

const requiredFolders = [
  "docs",
  "reports",
  "logs",
  "screenshots",
  "backups",
  "agents",
  "agents/tasks",
  "tools",
  "src",
  "src/config",
  "src/controllers",
  "src/routes",
  "src/services",
  "src/utils",
  "src/data",
  "public"
];

function exists(item) {
  return fs.existsSync(path.join(ROOT, item));
}

function run(command) {
  try {
    return execSync(command, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    return String(error.stdout || error.stderr || error.message || "").trim();
  }
}

const fileResults = requiredFiles.map(file => ({ file, ok: exists(file) }));
const folderResults = requiredFolders.map(folder => ({ folder, ok: exists(folder) }));

const failedFiles = fileResults.filter(x => !x.ok);
const failedFolders = folderResults.filter(x => !x.ok);

const verdict = failedFiles.length === 0 && failedFolders.length === 0
  ? "APPROVED"
  : "NEEDS FIX";

const report = `# Phase 0B-FIX1 Project Health Check Report

## Verdict
${verdict}

## Node Version
${run("node -v")}

## NPM Version
${run("npm -v")}

## Latest Commit
${run("git log -1 --oneline")}

## Required Files
${fileResults.map(x => `- ${x.ok ? "PASS" : "FAIL"}: ${x.file}`).join("\n")}

## Required Folders
${folderResults.map(x => `- ${x.ok ? "PASS" : "FAIL"}: ${x.folder}`).join("\n")}

## Git Status Before Commit
\`\`\`txt
${run("git status --short") || "clean"}
\`\`\`

## Rule
APPROVED means the fresh project structure is ready for Version 1A backend server foundation.
NEEDS FIX means missing files or folders must be repaired before coding backend.
`;

fs.writeFileSync(reportPath, report, "utf8");
console.log(report);
console.log("");
console.log("Report saved:", reportPath);

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3027;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version1b-storage-smoke-test-report.md");
const logPath = path.join(ROOT, "logs", "version1b-storage-smoke-test.log");

fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "logs"), { recursive: true });

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopProcess(child) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  } catch (error) {}
}

async function checkUrl(route) {
  const url = `${BASE_URL}${route}`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    return {
      route,
      status: response.status,
      ok: response.ok,
      text
    };
  } catch (error) {
    return {
      route,
      status: "FAILED",
      ok: false,
      text: error.message
    };
  }
}

async function main() {
  let logs = "";

  const child = spawn("node", ["src/server.js"], {
    cwd: ROOT,
    shell: true,
    env: {
      ...process.env,
      PORT: String(PORT)
    }
  });

  child.stdout.on("data", data => logs += data.toString());
  child.stderr.on("data", data => logs += data.toString());

  await wait(2000);

  const requiredFiles = [
    "src/data/leads.json",
    "src/data/inventory.json",
    "src/data/quotes.json",
    "src/data/followups.json",
    "src/services/data-store.js",
    "src/controllers/storage.controller.js"
  ];

  const fileResults = requiredFiles.map(file => ({
    file,
    ok: fs.existsSync(path.join(ROOT, file))
  }));

  const routeResults = [];
  routeResults.push(await checkUrl("/api/health"));
  routeResults.push(await checkUrl("/api/storage/status"));

  stopProcess(child);
  fs.writeFileSync(logPath, logs, "utf8");

  const filesOk = fileResults.every(item => item.ok);
  const routesOk = routeResults.every(item => item.status === 200 && item.ok);

  let storageBodyOk = false;

  try {
    const storageResult = routeResults.find(item => item.route === "/api/storage/status");
    const parsed = JSON.parse(storageResult.text);

    storageBodyOk =
      parsed.status === "ok" &&
      parsed.counts &&
      typeof parsed.counts.leads === "number" &&
      typeof parsed.counts.inventory === "number" &&
      typeof parsed.counts.quotes === "number" &&
      typeof parsed.counts.followups === "number";
  } catch (error) {
    storageBodyOk = false;
  }

  const verdict = filesOk && routesOk && storageBodyOk ? "APPROVED" : "NEEDS FIX";

  const report = `# Version 1B Storage Smoke Test Report

## Verdict
${verdict}

## Required Files
${fileResults.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.file}`).join("\n")}

## Route Results
${routeResults.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.route} => ${item.status}`).join("\n")}

## Storage Body Check
${storageBodyOk ? "PASS" : "FAIL"}

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Rule
APPROVED means basic JSON data storage is ready for Version 2 Buyer Intake.
NEEDS FIX means storage foundation must be repaired before moving forward.
`;

  fs.writeFileSync(reportPath, report, "utf8");
  console.log(report);
  console.log("Report saved:", reportPath);

  if (verdict !== "APPROVED") {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

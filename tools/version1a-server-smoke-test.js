const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3026;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version1a-fix1-server-smoke-test-report.md");
const logPath = path.join(ROOT, "logs", "version1a-fix1-server.log");

fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "logs"), { recursive: true });

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      preview: text.slice(0, 200)
    };
  } catch (error) {
    return {
      route,
      status: "FAILED",
      ok: false,
      preview: error.message
    };
  }
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

async function main() {
  let logs = "";

  const child = spawn("node", ["src/server.js"], {
    cwd: ROOT,
    shell: true,
    env: { ...process.env, PORT: String(PORT) }
  });

  child.stdout.on("data", data => logs += data.toString());
  child.stderr.on("data", data => logs += data.toString());

  await wait(2000);

  const routes = ["/", "/api/health", "/api/project-status", "/not-found-test"];
  const results = [];

  for (const route of routes) {
    results.push(await checkUrl(route));
  }

  stopProcess(child);
  fs.writeFileSync(logPath, logs, "utf8");

  const criticalOk = results
    .filter(item => item.route !== "/not-found-test")
    .every(item => item.status === 200 && item.ok);

  const notFoundOk = results.some(item => item.route === "/not-found-test" && item.status === 404);

  const verdict = criticalOk && notFoundOk ? "APPROVED" : "NEEDS FIX";

  const report = `# Version 1A-FIX1 Server Smoke Test Report

## Verdict
${verdict}

## Base URL
${BASE_URL}

## Route Results
${results.map(item => `- ${item.status === 200 || (item.route === "/not-found-test" && item.status === 404) ? "PASS" : "FAIL"}: ${item.route} => ${item.status}`).join("\n")}

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Rule
APPROVED means Version 1A backend server foundation is working.
NEEDS FIX means server routes or scripts must be repaired before Version 1B.
`;

  fs.writeFileSync(reportPath, report, "utf8");
  console.log(report);
  console.log("Report saved:", reportPath);

  if (verdict !== "APPROVED") process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

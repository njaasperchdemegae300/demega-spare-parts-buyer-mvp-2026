const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = process.cwd();
const PORT = 3026;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version1a-server-smoke-test-report.md");
const logPath = path.join(ROOT, "logs", "version1a-server.log");

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
      url,
      status: response.status,
      ok: response.ok,
      bodyPreview: text.slice(0, 300)
    };
  } catch (error) {
    return {
      route,
      url,
      status: "FAILED",
      ok: false,
      bodyPreview: error.message
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

  child.stdout.on("data", data => {
    logs += data.toString();
  });

  child.stderr.on("data", data => {
    logs += data.toString();
  });

  await wait(1500);

  const routes = ["/", "/api/health", "/api/project-status", "/not-found-test"];
  const results = [];

  for (const route of routes) {
    results.push(await checkUrl(route));
  }

  child.kill();

  fs.writeFileSync(logPath, logs, "utf8");

  const criticalRoutes = results.filter(item => item.route !== "/not-found-test");
  const notFoundRoute = results.find(item => item.route === "/not-found-test");

  const approved =
    criticalRoutes.every(item => item.ok && item.status === 200) &&
    notFoundRoute &&
    notFoundRoute.status === 404;

  const verdict = approved ? "APPROVED" : "NEEDS FIX";

  const report = `# Version 1A Server Smoke Test Report

## Verdict
${verdict}

## Base URL
${BASE_URL}

## Route Results
${results.map(item => `- ${item.ok ? "PASS" : item.status === 404 && item.route === "/not-found-test" ? "PASS" : "FAIL"}: ${item.route} => ${item.status}`).join("\n")}

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Rule
APPROVED means the backend server foundation is working.
NEEDS FIX means server routes must be repaired before Version 1B.
`;

  fs.writeFileSync(reportPath, report, "utf8");

  console.log(report);
  console.log("Report saved:", reportPath);

  if (!approved) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

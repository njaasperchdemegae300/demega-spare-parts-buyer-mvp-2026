const fs = require("fs");

const file = "tools/version32a-controlled-buyer-gate-manual-stock-check-smoke-test.js";

if (!fs.existsSync(file)) {
  throw new Error("VERSION 32A-FIX1 BLOCKED: Version 32A smoke test file is missing.");
}

let src = fs.readFileSync(file, "utf8");

const oldBlock = `    await wait(2000);

    const health = await request("/api/health");`;

const newBlock = `    let health = null;
    let serverReady = false;

    for (let attempt = 1; attempt <= 30; attempt += 1) {
      if (child.exitCode !== null) {
        logs += "\\n[server-startup] server process exited before health check. exitCode=" + child.exitCode;
        break;
      }

      try {
        health = await request("/api/health");
        if (health.status === 200) {
          serverReady = true;
          break;
        }
      } catch (error) {
        logs += "\\n[wait-for-health attempt " + attempt + "] " + error.message;
      }

      await wait(1000);
    }

    if (!serverReady) {
      const startupReport = \`# Version 32A-FIX1 Manual Stock Check Server Startup Diagnostic Report

## Verdict
NEEDS FIX

## Failure
The smoke test could not reach the local test server after waiting up to 30 seconds.

## Meaning
This means the server either did not start, exited before health check, or the configured test port was unavailable.

## Safety
- No buyer was contacted.
- No WhatsApp was sent.
- No WhatsApp was read.
- No scraping was performed.
- No quote was prepared.
- No inventory was changed.
- No accounting entry was created.
- No sale was closed.
- No pipeline was moved.

## Captured Server Logs
\\\`\\\`\\\`txt
\${logs || "No logs captured"}
\\\`\\\`\\\`
\`;

      fs.writeFileSync(reportPath, startupReport, "utf8");
      console.log(startupReport);
      process.exitCode = 1;
      return;
    }`;

if (src.includes("let serverReady = false;")) {
  console.log("Version 32A-FIX1 smoke test already has server wait repair.");
} else if (src.includes(oldBlock)) {
  src = src.replace(oldBlock, newBlock);
  fs.writeFileSync(file, src, "utf8");
  console.log("Version 32A-FIX1 smoke test server wait repair applied.");
} else {
  throw new Error("VERSION 32A-FIX1 BLOCKED: Could not find the original wait/health block to patch.");
}

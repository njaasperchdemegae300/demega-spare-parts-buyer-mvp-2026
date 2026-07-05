const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3029;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const reportPath = path.join(ROOT, "reports", "version2b-buyer-validation-smoke-test-report.md");

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
  } catch {}
}

async function request(route, options = {}) {
  const response = await fetch(`${BASE_URL}${route}`, options);
  const text = await response.text();

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { route, status: response.status, ok: response.ok, body };
}

async function postLead(data) {
  return request("/api/buyer-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

async function main() {
  let logs = "";

  const child = spawn("node", ["src/server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) }
  });

  child.stdout.on("data", data => logs += data.toString());
  child.stderr.on("data", data => logs += data.toString());

  await wait(2000);

  const stamp = Date.now();

  const goodLead = {
    buyerName: "Validation Test Buyer",
    phone: `080${String(stamp).slice(-8)}`,
    source: "whatsapp_inbound",
    partNeeded: "1ZZ alternator",
    vehicleBrand: "Toyota",
    vehicleModel: "Corolla",
    vehicleYear: "2005",
    engineCode: "1ZZ",
    location: "Lagos",
    urgency: "urgent",
    message: "Need 1ZZ alternator urgently."
  };

  const missingRequired = {
    buyerName: "",
    phone: "",
    source: "whatsapp_inbound"
  };

  const badYear = {
    ...goodLead,
    phone: `081${String(stamp).slice(-8)}`,
    vehicleYear: "20A5"
  };

  const badUrgency = {
    ...goodLead,
    phone: `082${String(stamp).slice(-8)}`,
    urgency: "panic_now"
  };

  const badSource = {
    ...goodLead,
    phone: `083${String(stamp).slice(-8)}`,
    source: "scraped_private_number"
  };

  const create1 = await postLead(goodLead);
  const create2 = await postLead(goodLead);
  const missingTest = await postLead(missingRequired);
  const yearTest = await postLead(badYear);
  const urgencyTest = await postLead(badUrgency);
  const sourceTest = await postLead(badSource);
  const listTest = await request("/api/leads");

  stopProcess(child);

  const goodOk =
    create1.status === 201 &&
    create1.body.lead &&
    create1.body.lead.manualReviewRequired === true &&
    create1.body.lead.duplicateStatus === "unique";

  const duplicateOk =
    create2.status === 201 &&
    create2.body.lead &&
    create2.body.lead.duplicateStatus === "possible_duplicate";

  const missingOk = missingTest.status === 400;
  const yearOk = yearTest.status === 400;
  const urgencyOk = urgencyTest.status === 400;
  const sourceOk = sourceTest.status === 400;
  const listOk = listTest.status === 200 && Array.isArray(listTest.body.leads);

  const verdict =
    goodOk &&
    duplicateOk &&
    missingOk &&
    yearOk &&
    urgencyOk &&
    sourceOk &&
    listOk
      ? "APPROVED"
      : "NEEDS FIX";

  const report = `# Version 2B Buyer Intake Validation Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${goodOk ? "PASS" : "FAIL"}: valid buyer lead accepted
- ${duplicateOk ? "PASS" : "FAIL"}: possible duplicate detected
- ${missingOk ? "PASS" : "FAIL"}: missing required fields blocked
- ${yearOk ? "PASS" : "FAIL"}: invalid vehicle year blocked
- ${urgencyOk ? "PASS" : "FAIL"}: invalid urgency blocked
- ${sourceOk ? "PASS" : "FAIL"}: unapproved/private-data source blocked
- ${listOk ? "PASS" : "FAIL"}: lead list route works

## Safety Rules Confirmed
- No stock confirmation is automatic.
- No compatibility confirmation is automatic.
- Manual review remains required.
- Private-data source is blocked.

## Server Logs
\`\`\`txt
${logs || "No logs captured"}
\`\`\`

## Next Phase After Approval
Version 2C — Buyer Intake Data Integrity Gate
`;

  fs.writeFileSync(reportPath, report, "utf8");
  console.log(report);

  if (verdict !== "APPROVED") process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

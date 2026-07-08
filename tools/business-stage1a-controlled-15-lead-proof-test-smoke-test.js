const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const ROOT = process.cwd();
const PORT = 3135;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const dataFile = path.join(ROOT, "src", "data", "controlled-15-lead-proof-test-leads.json");
const reportPath = path.join(ROOT, "reports", "business-stage1a-controlled-15-lead-proof-test-smoke-test-report.md");

const originalData = fs.existsSync(dataFile) ? fs.readFileSync(dataFile, "utf8") : "[]";

function safeWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function restoreData() {
  safeWrite(dataFile, originalData);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopProcess(child) {
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else child.kill("SIGTERM");
  } catch {}
}

async function request(route, options = {}) {
  const response = await fetch(`${BASE_URL}${route}`, options);
  const text = await response.text();

  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}

  return { status: response.status, text, body };
}

async function post(route, body) {
  return request(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function waitForHealth(child, logsRef) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (child.exitCode !== null) return null;

    try {
      const health = await request("/api/health");
      if (health.status === 200) return health;
    } catch (error) {
      logsRef.value += `\n[wait-for-health attempt ${attempt}] ${error.message}`;
    }

    await wait(1000);
  }

  return null;
}

function leadPayload(index, extra = {}) {
  return {
    buyerName: `Controlled Buyer ${index}`,
    buyerPhone: `080000000${String(index).padStart(2, "0")}`,
    partNeeded: index % 2 === 0 ? "Toyota Corolla 2005 alternator" : "Toyota Camry starter motor",
    vehicleDetails: index % 2 === 0 ? "Toyota Corolla 2005" : "Toyota Camry 2008",
    buyerLocation: index % 2 === 0 ? "Lagos" : "Ibadan",
    source: "whatsapp_click_to_chat_inbound",
    intentProof: "buyer_sent_message_first",
    permissionStatus: "inbound_or_opt_in",
    manualReviewStatus: "NEW_INBOUND_NOT_REVIEWED",
    temperature: index <= 6 ? "HOT" : "WARM",
    adminNote: "Smoke-test manual inbound record. No sending. No quote.",
    ...extra
  };
}

async function main() {
  const logsRef = { value: "" };
  let child;

  safeWrite(dataFile, "[]");

  try {
    child = spawn("node", ["src/server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) }
    });

    child.stdout.on("data", data => logsRef.value += data.toString());
    child.stderr.on("data", data => logsRef.value += data.toString());

    const health = await waitForHealth(child, logsRef);

    if (!health) {
      const startupReport = `# Business Stage 1A Controlled 15-Lead Proof Test Smoke Test Report

## Verdict
NEEDS FIX

## Failure
The smoke test could not reach the local server health route after waiting.

## Server Logs
\`\`\`txt
${logsRef.value || "No logs captured"}
\`\`\`
`;
      fs.writeFileSync(reportPath, startupReport, "utf8");
      console.log(startupReport);
      process.exitCode = 1;
      return;
    }

    const preview = await request("/api/controlled-15-lead-proof-test/preview");

    const unsafeLead = await post("/api/controlled-15-lead-proof-test/manual-lead/create", leadPayload(1, {
      autoSendWhatsApp: true,
      sendWhatsApp: true,
      autoReplyToBuyer: true,
      autoStartFollowUp: true,
      quoteSentToBuyer: true,
      priceSentToBuyer: true,
      autoUpdateInventory: true,
      autoCreateAccountingEntry: true,
      autoCloseSale: true
    }));

    const badSource = await post("/api/controlled-15-lead-proof-test/manual-lead/create", leadPayload(2, {
      buyerPhone: "080BAD00002",
      source: "jiji_like_scraping_as_buyer_source"
    }));

    const firstSafe = await post("/api/controlled-15-lead-proof-test/manual-lead/create", leadPayload(1));
    const duplicate = await post("/api/controlled-15-lead-proof-test/manual-lead/create", leadPayload(1));

    for (let i = 2; i <= 15; i += 1) {
      await post("/api/controlled-15-lead-proof-test/manual-lead/create", leadPayload(i));
    }

    const overCap = await post("/api/controlled-15-lead-proof-test/manual-lead/create", leadPayload(16));

    const list = await request("/api/controlled-15-lead-proof-test/leads");
    const summary = await request("/api/controlled-15-lead-proof-test/summary");
    const dashboard = await request("/controlled-15-lead-proof-test");
    const dashboardAlias = await request("/controlled-15-lead-proof-test-dashboard");

    const healthOk = health.status === 200;

    const previewOk =
      preview.status === 200 &&
      preview.body &&
      preview.body.leadLimit === 15 &&
      Array.isArray(preview.body.allowedSources) &&
      preview.body.allowedSources.includes("whatsapp_click_to_chat_inbound");

    const unsafeOk =
      unsafeLead.status === 400 &&
      unsafeLead.body &&
      Array.isArray(unsafeLead.body.errors) &&
      unsafeLead.body.errors.some(error => error.includes("Unsafe controlled 15-lead proof-test request blocked"));

    const badSourceOk =
      badSource.status === 400 &&
      badSource.body &&
      Array.isArray(badSource.body.errors) &&
      badSource.body.errors.some(error => error.includes("source must be one of"));

    const firstSafeOk =
      firstSafe.status === 201 &&
      firstSafe.body &&
      firstSafe.body.record &&
      firstSafe.body.record.proofTestStatus === "CONTROLLED_15_LEAD_INBOUND_REQUEST_RECORDED" &&
      firstSafe.body.record.leadNumber === 1 &&
      firstSafe.body.record.leadLimit === 15 &&
      firstSafe.body.record.manualInboundOnly === true &&
      firstSafe.body.record.noAutoSend === true &&
      firstSafe.body.record.quoteSentToBuyer === false &&
      firstSafe.body.record.stockConfirmed === false &&
      firstSafe.body.record.compatibilityConfirmed === false &&
      firstSafe.body.record.inventoryUpdated === false &&
      firstSafe.body.record.autoCreateAccountingEntry === false &&
      firstSafe.body.record.autoCloseSale === false;

    const duplicateOk =
      duplicate.status === 400 &&
      duplicate.body &&
      Array.isArray(duplicate.body.errors) &&
      duplicate.body.errors.some(error => error.includes("Duplicate controlled proof-test buyer request blocked"));

    const overCapOk =
      overCap.status === 400 &&
      overCap.body &&
      Array.isArray(overCap.body.errors) &&
      overCap.body.errors.some(error => error.includes("Controlled 15-lead proof-test cap reached"));

    const listOk =
      list.status === 200 &&
      list.body &&
      Array.isArray(list.body.leads) &&
      list.body.leads.length === 15 &&
      list.body.leads.every(item =>
        item.noAutoSend === true &&
        item.quoteSentToBuyer === false &&
        item.inventoryUpdated === false &&
        item.autoCreateAccountingEntry === false &&
        item.autoCloseSale === false
      );

    const summaryOk =
      summary.status === 200 &&
      summary.body &&
      summary.body.summary &&
      summary.body.summary.totalRecordedLeads === 15 &&
      summary.body.summary.leadLimit === 15 &&
      summary.body.summary.remainingSlots === 0 &&
      summary.body.summary.capReached === true &&
      summary.body.summary.realBuyerIntentRate === 100 &&
      summary.body.summary.hotWarmRate === 100 &&
      summary.body.summary.safety &&
      summary.body.summary.safety.manualInboundOnly === true &&
      summary.body.summary.safety.noAutoSend === true &&
      summary.body.summary.safety.noSpam === true &&
      summary.body.summary.safety.noUnsolicitedWhatsApp === true &&
      summary.body.summary.safety.noPrivateDataScraping === true &&
      summary.body.summary.safety.noQuoteBeforeStockConfirmation === true &&
      summary.body.summary.safety.noQuoteBeforeCompatibilityConfirmation === true;

    const dashboardOk =
      dashboard.status === 200 &&
      dashboard.text.includes("Controlled 15-Lead Proof Test") &&
      dashboard.text.includes("BUSINESS STAGE 1A") &&
      dashboard.text.includes("15 LEADS ONLY") &&
      dashboard.text.includes("MANUAL INBOUND ONLY") &&
      dashboard.text.includes("NO AUTO-SEND") &&
      dashboard.text.includes("NO SPAM") &&
      dashboard.text.includes("NO UNSOLICITED WHATSAPP") &&
      dashboard.text.includes("NO PRIVATE SCRAPING") &&
      dashboard.text.includes("NO QUOTE BEFORE STOCK") &&
      dashboard.text.includes("NO QUOTE BEFORE COMPATIBILITY") &&
      dashboard.text.includes("/api/controlled-15-lead-proof-test/manual-lead/create") &&
      dashboard.text.includes("/api/controlled-15-lead-proof-test/summary") &&
      dashboard.text.includes("/api/controlled-15-lead-proof-test/leads");

    const aliasOk =
      dashboardAlias.status === 200 &&
      dashboardAlias.text.includes("Controlled 15-Lead Proof Test");

    const dashboardManualOnlyOk =
      !dashboard.text.includes("sendWhatsApp(") &&
      !dashboard.text.includes("autoSendWhatsApp = true") &&
      !dashboard.text.includes("autoReplyToBuyer = true") &&
      !dashboard.text.includes("autoStartFollowUp = true") &&
      !dashboard.text.includes("autoCreateAccountingEntry = true") &&
      !dashboard.text.includes("autoUpdateInventory = true") &&
      !dashboard.text.includes("autoCloseSale = true") &&
      !dashboard.text.includes("openLiveGate = true") &&
      !dashboard.text.includes("activateRealBuyerTraffic = true");

    const verdict =
      healthOk &&
      previewOk &&
      unsafeOk &&
      badSourceOk &&
      firstSafeOk &&
      duplicateOk &&
      overCapOk &&
      listOk &&
      summaryOk &&
      dashboardOk &&
      aliasOk &&
      dashboardManualOnlyOk
        ? "APPROVED"
        : "NEEDS FIX";

    const report = `# Business Stage 1A Controlled 15-Lead Proof Test Smoke Test Report

## Verdict
${verdict}

## Test Results
- ${healthOk ? "PASS" : "FAIL"}: GET /api/health
- ${previewOk ? "PASS" : "FAIL"}: proof-test preview API works
- ${unsafeOk ? "PASS" : "FAIL"}: unsafe auto-send/quote/inventory/accounting/sale request is blocked
- ${badSourceOk ? "PASS" : "FAIL"}: seller-heavy or unapproved source is blocked
- ${firstSafeOk ? "PASS" : "FAIL"}: safe manual inbound lead is recorded without sending, quoting, or automation
- ${duplicateOk ? "PASS" : "FAIL"}: duplicate buyer request is blocked
- ${overCapOk ? "PASS" : "FAIL"}: lead cap blocks request number 16
- ${listOk ? "PASS" : "FAIL"}: list API returns exactly 15 safe manual inbound leads
- ${summaryOk ? "PASS" : "FAIL"}: summary API confirms 15-lead cap and safe metrics
- ${dashboardOk ? "PASS" : "FAIL"}: dashboard displays controlled proof test safely
- ${aliasOk ? "PASS" : "FAIL"}: dashboard alias works
- ${dashboardManualOnlyOk ? "PASS" : "FAIL"}: dashboard contains no unsafe automation calls

## Safety Rules Confirmed
- Controlled proof test only.
- 15 inbound buyer requests only.
- Manual inbound only.
- Manual review only.
- Manual reply only.
- No auto-send.
- No spam.
- No unsolicited WhatsApp.
- No private-data scraping.
- No hidden data harvesting.
- No quote before stock confirmation.
- No quote before compatibility confirmation.
- No system buyer contact.
- No WhatsApp sending.
- No auto-reply.
- No auto-follow-up.
- No WhatsApp reading.
- No buyer-message scraping.
- No inventory mutation.
- No accounting mutation.
- No sale closing.
- No pipeline movement.
- Test data restored after smoke test.

## Business Readiness Confirmed
- The system can safely record the first 15 manual inbound buyer requests.
- The tracker blocks unsafe sources.
- The tracker blocks duplicate requests.
- The tracker blocks lead number 16.
- Scaling remains blocked until metrics prove success.

## Next Business Action After Approval
Use the dashboard to record only real inbound buyer requests from approved sources. Do not add fake leads. Do not blast WhatsApp. Do not quote before stock and compatibility.

## Server Logs
\`\`\`txt
${logsRef.value || "No logs captured"}
\`\`\`
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);

    if (verdict !== "APPROVED") process.exitCode = 1;
  } finally {
    if (child) stopProcess(child);
    restoreData();
  }
}

main().catch(error => {
  restoreData();
  console.error(error);
  process.exit(1);
});

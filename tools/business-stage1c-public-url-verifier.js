const fs = require("fs");
const path = require("path");

const publicUrl = String(process.env.PUBLIC_URL || "").trim().replace(/\/+$/, "");
const reportPath = path.join(process.cwd(), "reports", "business-stage1c-public-url-verification-report.md");

if (!publicUrl || !publicUrl.startsWith("http")) {
  console.log("PUBLIC_URL is required. Example:");
  console.log("PUBLIC_URL=https://your-app.onrender.com npm run business:stage1c:verify");
  process.exit(1);
}

async function check(route, expected) {
  const url = publicUrl + route;
  try {
    const response = await fetch(url);
    const text = await response.text();
    return {
      route,
      url,
      status: response.status,
      ok: response.status >= 200 && response.status < 400 && (!expected || text.includes(expected))
    };
  } catch (error) {
    return { route, url, status: "ERROR", ok: false, error: error.message };
  }
}

(async () => {
  const results = [];
  results.push(await check("/api/health", ""));
  results.push(await check("/admin-hub", "Admin"));
  results.push(await check("/controlled-15-lead-proof-test", "Controlled 15-Lead Proof Test"));
  results.push(await check("/internet-deployment-readiness-gate", "Internet Deployment Readiness Gate"));
  results.push(await check("/online-deployment-public-url-verification", "Online Deployment"));

  const verdict = results.every(item => item.ok) ? "APPROVED" : "NEEDS FIX";

  const report = `# Business Stage 1C Public URL Verification Report

## Verdict
${verdict}

## Public URL
${publicUrl}

## Route Results
${results.map(item => `- ${item.ok ? "PASS" : "FAIL"}: ${item.route} | status=${item.status} | ${item.url}`).join("\n")}

## Safety Confirmed
- Public URL verification only.
- No traffic gate opened.
- No buyer contacted.
- No WhatsApp sent.
- No auto-reply.
- No auto-follow-up.
- No inventory/accounting/sale/pipeline mutation.

## Next Stage After Public URL Approval
Business Stage 1D — Android + Laptop Agent Tool Verification.
`;

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, "utf8");
  console.log(report);

  if (verdict !== "APPROVED") process.exit(1);
})();

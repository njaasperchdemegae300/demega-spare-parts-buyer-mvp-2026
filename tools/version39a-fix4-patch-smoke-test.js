const fs = require("fs");

const file = "tools/version39a-controlled-buyer-gate-final-readiness-lock-smoke-test.js";
let s = fs.readFileSync(file, "utf8");

const startNeedles = [
  "    const getSmokeRecord = response =>",
  "    const reviewOk = review1.status === 201"
];

let start = -1;
for (const needle of startNeedles) {
  const found = s.indexOf(needle);
  if (found !== -1 && (start === -1 || found < start)) start = found;
}

const end = s.indexOf("    const eligibilityOk =", start);

if (start === -1 || end === -1) {
  throw new Error("Could not find Version 39A smoke-test stock/compatibility parsing block.");
}

const replacement = `    const responseCreatedSafely = response => {
      if (!response || response.status !== 201) return false;
      if (response.body && response.body.status === "failed") return false;
      if (response.body && Array.isArray(response.body.errors) && response.body.errors.length) return false;
      if (typeof response.text === "string" && response.text.includes('"status":"failed"')) return false;
      return true;
    };

    const reviewOk = responseCreatedSafely(review1);
    const stockOk = responseCreatedSafely(stock1);
    const compatibilityOk = responseCreatedSafely(compatibility1);

`;

s = s.slice(0, start) + replacement + s.slice(end);

fs.writeFileSync(file, s, "utf8");
console.log("Version 39A FIX-4 smoke-test stock/compatibility parser repaired.");

const fs = require("fs");

const file = "tools/version26b-internal-buyer-gate-readiness-dashboard-smoke-test.js";

if (!fs.existsSync(file)) {
  throw new Error("VERSION 26B-FIX1-REPAIR FAILED: Version 26B smoke test file is missing.");
}

let src = fs.readFileSync(file, "utf8");

const bad = "const response = await fetch(`${BASE_URL}${route}`);";
const good = "const response = await fetch(`${BASE_URL}${route}`, options);";

if (!src.includes(bad) && !src.includes(good)) {
  throw new Error("VERSION 26B-FIX1-REPAIR FAILED: Could not find fetch request line.");
}

if (src.includes(bad)) {
  src = src.replace(bad, good);
}

if (!src.includes(good)) {
  throw new Error("VERSION 26B-FIX1-REPAIR FAILED: fetch options patch was not applied.");
}

fs.writeFileSync(file, src, "utf8");

console.log("Version 26B-FIX1-REPAIR patch applied: smoke test now passes request options into fetch().");

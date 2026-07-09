const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

src = src.replace(
/  if \(method === "GET" && \(url\.pathname === "\/online-deployment-public-url-verification"[\s\S]*?\n  }\n\n/g,
""
);

src = src.replace(
/  if \(method === "GET" && \(url\.pathname === "\/public-url-verification"[\s\S]*?\n  }\n\n/g,
""
);

src = src.replace(
/  if \(method === "GET" && \(url\.pathname === "\/internet-deployment-readiness-gate"[\s\S]*?\n  }\n\n/g,
""
);

const routeBlock = `  if (method === "GET" && (url.pathname === "/internet-deployment-readiness-gate" || url.pathname === "/deployment-readiness")) {
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "public", "internet-deployment-readiness-gate.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (method === "GET" && (url.pathname === "/online-deployment-public-url-verification" || url.pathname === "/public-url-verification")) {
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "public", "online-deployment-public-url-verification.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

`;

const marker = "  return sendJson(res, 404";
const index = src.indexOf(marker);

if (index === -1) {
  throw new Error("Could not find 404 insertion point in src/routes/index.routes.js");
}

src = src.slice(0, index) + routeBlock + src.slice(index);

fs.writeFileSync(file, src, "utf8");

console.log("Business Stage 1C FIX-1 routes repaired:");
console.log("- /internet-deployment-readiness-gate");
console.log("- /deployment-readiness");
console.log("- /online-deployment-public-url-verification");
console.log("- /public-url-verification");

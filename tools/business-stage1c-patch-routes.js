const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

const routeBlock = `  if (method === "GET" && (url.pathname === "/online-deployment-public-url-verification" || url.pathname === "/public-url-verification")) {
    const fs = require("fs");
    const path = require("path");
    return sendHtml(res, fs.readFileSync(path.join(process.cwd(), "public", "online-deployment-public-url-verification.html"), "utf8"));
  }

`;

if (!src.includes('url.pathname === "/online-deployment-public-url-verification"')) {
  const marker = "  return sendJson(res, 404";
  const index = src.indexOf(marker);
  if (index === -1) throw new Error("Could not find 404 route insertion point.");
  src = src.slice(0, index) + routeBlock + src.slice(index);
}

fs.writeFileSync(file, src, "utf8");
console.log("Business Stage 1C public URL verification route patched.");

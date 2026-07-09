const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

const startMarker = "  // BUSINESS_STAGE_1D_FIX2_PROFESSIONAL_ADMIN_HUB_START\n";
const endMarker = "  // BUSINESS_STAGE_1D_FIX2_PROFESSIONAL_ADMIN_HUB_END\n";

const oldStart = src.indexOf(startMarker);
const oldEnd = src.indexOf(endMarker);

if (oldStart !== -1 && oldEnd !== -1 && oldEnd > oldStart) {
  src = src.slice(0, oldStart) + src.slice(oldEnd + endMarker.length);
}

const routeBlock = `${startMarker}  if (method === "GET" && (
    url.pathname === "/admin-hub" ||
    url.pathname === "/admin-navigation-hub" ||
    url.pathname === "/admin" ||
    url.pathname === "/publish-ready-hub" ||
    url.pathname === "/demega-control-center" ||
    url.pathname === "/app"
  )) {
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "public", "admin-hub-professional.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
${endMarker}
`;

const firstRouteIndex = src.indexOf('  if (method === "GET"');

if (firstRouteIndex === -1) {
  throw new Error("Could not find first GET route insertion point.");
}

src = src.slice(0, firstRouteIndex) + routeBlock + src.slice(firstRouteIndex);

fs.writeFileSync(file, src, "utf8");

console.log("Professional Admin Hub is now the front door for:");
console.log("- /admin-hub");
console.log("- /admin-navigation-hub");
console.log("- /admin");
console.log("- /publish-ready-hub");
console.log("- /demega-control-center");
console.log("- /app");

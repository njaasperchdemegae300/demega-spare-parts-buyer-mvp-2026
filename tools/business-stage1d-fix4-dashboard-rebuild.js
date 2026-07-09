const fs = require("fs");

const file = "src/routes/index.routes.js";
let src = fs.readFileSync(file, "utf8");

const startMarker = "  // BUSINESS_STAGE_1D_FIX4_PROFESSIONAL_DASHBOARD_START\n";
const endMarker = "  // BUSINESS_STAGE_1D_FIX4_PROFESSIONAL_DASHBOARD_END\n";

const oldStart = src.indexOf(startMarker);
const oldEnd = src.indexOf(endMarker);

if (oldStart !== -1 && oldEnd !== -1 && oldEnd > oldStart) {
  src = src.slice(0, oldStart) + src.slice(oldEnd + endMarker.length);
}

const block = `${startMarker}  if (method === "GET" && (
    url.pathname === "/dashboard" ||
    url.pathname === "/buyer-dashboard"
  )) {
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "public", "dashboard-professional.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(injectDemegaProfessionalUi(html));
    return;
  }
${endMarker}
`;

const firstRouteIndex = src.indexOf('  if (method === "GET"');
if (firstRouteIndex === -1) {
  throw new Error("Could not find route insertion point.");
}

src = src.slice(0, firstRouteIndex) + block + src.slice(firstRouteIndex);

fs.writeFileSync(file, src, "utf8");

console.log("Professional dashboard route installed for:");
console.log("- /dashboard");
console.log("- /buyer-dashboard");

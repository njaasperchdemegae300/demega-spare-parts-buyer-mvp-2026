const fs = require("fs");
const path = require("path");

const polishStyle = `
<style id="demega-ui-polish">
  * { box-sizing: border-box; }
  html, body { max-width: 100%; overflow-x: hidden; }
  body { line-height: 1.45; }
  main, section, header, .container, .panel, .card { max-width: 100%; overflow-wrap: anywhere; }
  .grid, .cards, [class*="grid"], [class*="cards"] { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important; }
  table { display: block; width: 100%; overflow-x: auto; }
  button, a { max-width: 100%; white-space: normal; }
  .badge, .pill, span[class*="badge"], span[class*="pill"] { white-space: normal !important; line-height: 1.25; }
  input, select, textarea { max-width: 100%; }
</style>
`;

const publicDir = path.join(process.cwd(), "public");
const htmlFiles = fs.readdirSync(publicDir).filter(file => file.endsWith(".html"));

let patched = 0;

for (const file of htmlFiles) {
  const fullPath = path.join(publicDir, file);
  let html = fs.readFileSync(fullPath, "utf8");

  if (!html.includes('id="demega-ui-polish"')) {
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${polishStyle}\n</head>`);
    } else {
      html = `${polishStyle}\n${html}`;
    }

    fs.writeFileSync(fullPath, html, "utf8");
    patched++;
  }
}

const routeFile = "src/routes/index.routes.js";
let routes = fs.readFileSync(routeFile, "utf8");

const routeBlock = `  if (method === "GET" && (url.pathname === "/publish-ready-hub" || url.pathname === "/demega-control-center" || url.pathname === "/app")) {
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "public", "publish-ready-hub.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

`;

if (!routes.includes('url.pathname === "/publish-ready-hub"')) {
  const marker = "  return sendJson(res, 404";
  const index = routes.indexOf(marker);
  if (index === -1) throw new Error("Could not find 404 route insertion point.");
  routes = routes.slice(0, index) + routeBlock + routes.slice(index);
  fs.writeFileSync(routeFile, routes, "utf8");
}

console.log(`Business Stage 1D-PRE UI polish complete. HTML files patched: ${patched}`);
console.log("New clean hub routes:");
console.log("- /publish-ready-hub");
console.log("- /demega-control-center");
console.log("- /app");

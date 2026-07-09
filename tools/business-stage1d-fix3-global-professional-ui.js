const fs = require("fs");
const path = require("path");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

const injectionFunction = `
function injectDemegaProfessionalUi(html) {
  const css = '<link rel="stylesheet" href="/demega-professional-ui.css">';
  const js = '<script defer src="/demega-professional-ui.js"></' + 'script>';

  let output = String(html || "");

  if (!output.includes("/demega-professional-ui.css")) {
    if (output.includes("</head>")) {
      output = output.replace("</head>", css + "\\n</head>");
    } else {
      output = css + "\\n" + output;
    }
  }

  if (!output.includes("/demega-professional-ui.js")) {
    if (output.includes("</body>")) {
      output = output.replace("</body>", js + "\\n</body>");
    } else {
      output = output + "\\n" + js;
    }
  }

  return output;
}

`;

if (!src.includes("function injectDemegaProfessionalUi")) {
  const insertAt = src.indexOf("function ");
  if (insertAt !== -1) {
    src = src.slice(0, insertAt) + injectionFunction + src.slice(insertAt);
  } else {
    src = injectionFunction + src;
  }
}

const assetBlock = `  if (method === "GET" && url.pathname === "/demega-professional-ui.css") {
    const fs = require("fs");
    const path = require("path");
    const css = fs.readFileSync(path.join(process.cwd(), "public", "demega-professional-ui.css"), "utf8");
    res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
    res.end(css);
    return;
  }

  if (method === "GET" && url.pathname === "/demega-professional-ui.js") {
    const fs = require("fs");
    const path = require("path");
    const js = fs.readFileSync(path.join(process.cwd(), "public", "demega-professional-ui.js"), "utf8");
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
    res.end(js);
    return;
  }

  if (method === "GET" && url.pathname === "/buyer-dashboard") {
    res.writeHead(302, { Location: "/dashboard" });
    res.end();
    return;
  }

`;

if (!src.includes('url.pathname === "/demega-professional-ui.css"')) {
  const firstRouteIndex = src.indexOf('  if (method === "GET"');
  if (firstRouteIndex === -1) throw new Error("Could not find first GET route insertion point.");
  src = src.slice(0, firstRouteIndex) + assetBlock + src.slice(firstRouteIndex);
}

src = src.replace(
  /return sendHtml\(res,\s*([^;\n]+)\);/g,
  "return sendHtml(res, injectDemegaProfessionalUi($1));"
);

src = src.replace(
  /res\.end\(html\);/g,
  "res.end(injectDemegaProfessionalUi(html));"
);

src = src.replace(
  /res\.end\(fs\.readFileSync\(([^;]+?)\)\);/g,
  "res.end(injectDemegaProfessionalUi(fs.readFileSync($1)));"
);

fs.writeFileSync(routeFile, src, "utf8");

const publicDir = path.join(process.cwd(), "public");
const htmlFiles = fs.readdirSync(publicDir).filter((file) => file.endsWith(".html"));

let patchedHtmlFiles = 0;

for (const file of htmlFiles) {
  const fullPath = path.join(publicDir, file);
  let html = fs.readFileSync(fullPath, "utf8");
  let changed = false;

  if (!html.includes("/demega-professional-ui.css")) {
    html = html.includes("</head>")
      ? html.replace("</head>", '<link rel="stylesheet" href="/demega-professional-ui.css">\\n</head>')
      : '<link rel="stylesheet" href="/demega-professional-ui.css">\\n' + html;
    changed = true;
  }

  if (!html.includes("/demega-professional-ui.js")) {
    html = html.includes("</body>")
      ? html.replace("</body>", '<script defer src="/demega-professional-ui.js"></script>\\n</body>')
      : html + '\\n<script defer src="/demega-professional-ui.js"></script>';
    changed = true;
  }

  html = html.replaceAll('href="/buyer-dashboard"', 'href="/dashboard"');
  html = html.replaceAll('href="/manual-quote-drafts"', 'href="/manual-quote-draft"');

  if (changed) patchedHtmlFiles++;

  fs.writeFileSync(fullPath, html, "utf8");
}

console.log("Business Stage 1D-FIX-3 global UI shell installed.");
console.log(`Public HTML files patched: ${patchedHtmlFiles}`);
console.log("Added assets:");
console.log("- /demega-professional-ui.css");
console.log("- /demega-professional-ui.js");
console.log("Added alias repair:");
console.log("- /buyer-dashboard redirects to /dashboard");

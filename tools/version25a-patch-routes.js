const fs = require("fs");

const routeFile = "src/routes/index.routes.js";
let src = fs.readFileSync(routeFile, "utf8");

if (!src.includes('project-source-of-truth.controller')) {
  const requireLine = 'const projectSourceOfTruthController = require("../controllers/project-source-of-truth.controller");\n';

  const lastRequire = src.lastIndexOf('require("../controllers/');
  if (lastRequire !== -1) {
    const lineEnd = src.indexOf("\n", lastRequire);
    src = src.slice(0, lineEnd + 1) + requireLine + src.slice(lineEnd + 1);
  } else {
    src = requireLine + src;
  }
}

if (!src.includes('"/api/project-source-of-truth/preview"')) {
  if (src.includes('"/api/manual-final-business-review/summary",')) {
    src = src.replace(
      '"/api/manual-final-business-review/summary",',
      '"/api/manual-final-business-review/summary",\n        "/api/project-source-of-truth/preview",\n        "/api/project-source-of-truth/files",\n        "/api/project-source-of-truth/summary",'
    );
  }
}

const routeBlock = `  if (method === "GET" && url.pathname === "/api/project-source-of-truth/preview") {
    return projectSourceOfTruthController.projectSourceOfTruthPreviewController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/project-source-of-truth/files") {
    return projectSourceOfTruthController.projectSourceOfTruthFilesController(req, res, sendJson);
  }

  if (method === "GET" && url.pathname === "/api/project-source-of-truth/summary") {
    return projectSourceOfTruthController.projectSourceOfTruthSummaryController(req, res, sendJson);
  }

`;

if (!src.includes("projectSourceOfTruthPreviewController")) {
  const marker = '  if (method === "GET" && url.pathname === "/api/manual-final-business-review/preview") {';

  if (src.includes(marker)) {
    src = src.replace(marker, routeBlock + marker);
  } else {
    const fallback = '  return sendJson(res, 404';
    const fallbackIndex = src.indexOf(fallback);

    if (fallbackIndex === -1) {
      throw new Error("Could not find safe route insertion point for project source-of-truth routes.");
    }

    src = src.slice(0, fallbackIndex) + routeBlock + src.slice(fallbackIndex);
  }
}

fs.writeFileSync(routeFile, src, "utf8");
console.log("Version 25A source-of-truth routes patched.");

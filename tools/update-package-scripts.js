const fs = require("fs");
const path = require("path");

const packagePath = path.join(process.cwd(), "package.json");

if (!fs.existsSync(packagePath)) {
  console.error("package.json not found.");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

pkg.scripts = pkg.scripts || {};
pkg.scripts["project:status"] = "node -e \"console.log('Demega Spare Parts Buyer MVP 2026 - Ready')\"";
pkg.scripts["project:list"] = "node -e \"const fs=require('fs'); console.log(fs.readdirSync('.').sort().join('\\\\n'))\"";
pkg.scripts["project:health"] = "node tools/project-health-check.js";
pkg.scripts["phase:0b"] = "node tools/project-health-check.js";

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
console.log("package.json scripts repaired.");

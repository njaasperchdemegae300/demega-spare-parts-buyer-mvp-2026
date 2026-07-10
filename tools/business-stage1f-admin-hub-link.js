const fs = require("fs");

const file = "public/admin-hub-professional.html";
let html = fs.readFileSync(file, "utf8");

if (!html.includes("Fitment Intelligence Suite")) {
  const panel = `
    <section class="panel">
      <h2>Fitment Intelligence Suite</h2>
      <div class="module-grid">
        <div class="module-card">
          <div>
            <h3>VIN / YMM / Part Number Fitment</h3>
            <p>Search VIN, year/make/model, part number, cross-reference numbers, and alternative compatible parts before any quote.</p>
          </div>
          <div class="module-links">
            <a class="mini-link" href="/fitment">Fitment Engine</a>
            <a class="mini-link" href="/vin-search">VIN Search</a>
            <a class="mini-link" href="/part-number-search">Part Number Search</a>
            <a class="mini-link" href="/cross-reference">Cross Reference</a>
            <a class="mini-link" href="/alternative-compatible-parts">Alternative Parts</a>
          </div>
        </div>
      </div>
    </section>
`;

  html = html.replace('<p class="footer-note"', panel + '\n    <p class="footer-note"');
  fs.writeFileSync(file, html, "utf8");
}

console.log("Admin hub linked to Fitment Intelligence Suite.");

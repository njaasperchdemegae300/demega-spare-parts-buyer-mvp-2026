(function () {
  document.body.classList.add("dm-professional-ui");

  if (!document.querySelector(".dm-top-clean-nav")) {
    const nav = document.createElement("nav");
    nav.className = "dm-top-clean-nav";
    nav.innerHTML = `
      <strong>Demega</strong>
      <a href="/admin-hub">Admin Hub</a>
      <a href="/controlled-15-lead-proof-test">15-Lead Tracker</a>
      <a href="/hot-buyers">Hot Buyers</a>
      <a href="/inventory">Inventory</a>
      <a href="/manual-quote-draft">Quote Draft</a>
      <a href="/buyer-reply-tracking">Reply Tracking</a>
      <a href="/online-deployment-public-url-verification">Public URL Gate</a>
    `;
    document.body.prepend(nav);
  }

  document.querySelectorAll("table").forEach(function (table) {
    if (table.parentElement && table.parentElement.classList.contains("dm-table-scroll")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "dm-table-scroll";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  document.querySelectorAll("a[href='/buyer-dashboard']").forEach(function (a) {
    a.setAttribute("href", "/dashboard");
  });

  document.querySelectorAll("a[href='/manual-quote-drafts']").forEach(function (a) {
    a.setAttribute("href", "/manual-quote-draft");
  });
})();

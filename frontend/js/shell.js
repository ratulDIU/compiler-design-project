function shellIcon(name) {
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="5" rx="1.5"></rect><rect x="14" y="12" width="7" height="9" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>',
    analyzer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 4-1.3 2.6L10.6 8l2.6 1.3L14.5 12l1.3-2.7L18.4 8l-2.6-1.4L14.5 4Z"></path><path d="m6 14 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"></path><path d="m18 14 .7 1.3L20 16l-1.3.7L18 18l-.7-1.3L16 16l1.3-.7L18 14Z"></path></svg>',
    result: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"></path><path d="M14 3v6h6"></path><path d="M9 17h6"></path><path d="M9 13h3"></path></svg>',
    analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2.6-7 4.8 14 2.6-7H21"></path></svg>'
  };

  return icons[name] || "";
}

function renderShell(activePage) {
  const username = localStorage.getItem("loggedInUsername");
  const pages = [
    {id: "dashboard", href: "dashboard.html", label: "Dashboard"},
    {id: "analyzer", href: "analyzer.html", label: "Analyzer"},
    {id: "result", href: "result.html", label: "Result"},
    {id: "analytics", href: "analytics.html", label: "Analytics"}
  ];

  const nav = pages.map((page) => `
    <a href="${page.href}" class="nav-link ${activePage === page.id ? "active" : ""}">
      ${shellIcon(page.id)}
      <span>${page.label}</span>
    </a>
  `).join("");

  const account = localStorage.getItem("loggedInAccount");
  const userMarkup = username ? `
    <a href="profile.html" class="user-pill">
      <span class="user-avatar">${username.charAt(0).toUpperCase()}</span>
      <span class="user-meta">
        <strong>${username}</strong>
        <span>${account ? `Account ${account}` : "Tier 2"}</span>
      </span>
    </a>
    <button class="btn btn-ghost" type="button" id="shellLogoutBtn">Logout</button>
  ` : `
    <a href="login.html" class="btn btn-outline">Login</a>
    <a href="register.html" class="btn btn-primary">Register</a>
  `;

  const shell = `
    <header class="app-header">
      <div class="app-header-inner">
        <a href="index.html" class="brand">
          <span class="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path></svg>
          </span>
          <span>
            <span class="brand-name">ATM Shield</span>
            <span class="brand-tag">Fraud Intelligence</span>
          </span>
        </a>
        <nav class="nav-links">${nav}</nav>
        <div class="header-side">
          <button class="header-icon has-dot" type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a2 2 0 0 0 3.4 0"></path></svg>
          </button>
          ${userMarkup}
        </div>
      </div>
    </header>
  `;

  document.body.insertAdjacentHTML("afterbegin", shell);

  const logoutBtn = document.getElementById("shellLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
      localStorage.removeItem("loggedInUsername");
      localStorage.removeItem("loggedInAccount");
      localStorage.removeItem("loggedInEmail");
      localStorage.removeItem("fraudResult");
      window.location.href = "login.html";
    });
  }
}

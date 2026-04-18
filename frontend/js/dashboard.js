const latestResult = JSON.parse(localStorage.getItem("fraudResult") || "null");

function requireDashboardUser() {
  const username = localStorage.getItem("loggedInUsername");
  if (!username) {
    window.location.href = "login.html";
    return null;
  }
  return {
    username,
    account: localStorage.getItem("loggedInAccount")
  };
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function riskScoreToHealth(score) {
  if (score >= 11) return {score: 38, label: "Critical"};
  if (score >= 5) return {score: 68, label: "Watch"};
  return {score: 86, label: "Healthy"};
}

function setGauge(elementId, score) {
  const gauge = document.getElementById(elementId);
  if (!gauge) return;
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(score, 100));
  gauge.style.strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;
}

function buildStats(result) {
  const transactions = (result && result.transactions) || [];
  const total = safeNumber(result && result.total_amount, transactions.reduce((sum, item) => sum + safeNumber(item.amount), 0));
  const risk = safeNumber(result && result.risk_score);
  const safeRate = Math.max(0, 100 - risk);

  return [
    {
      icon: "emerald",
      change: "up",
      delta: "↑ 8.2%",
      label: "Transactions",
      value: String(transactions.length || 0),
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l2.6-7 4.8 14 2.6-7H21"></path></svg>'
    },
    {
      icon: "danger",
      change: result && result.status === "ACTIVE" ? "up" : "down",
      delta: result && result.status === "ACTIVE" ? "↑ Stable" : "↓ High risk",
      label: "Flagged",
      value: risk >= 11 ? "High" : risk >= 5 ? "Medium" : "Low",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>'
    },
    {
      icon: "gold",
      change: "up",
      delta: "↑ 12.1%",
      label: "Blocked Amount",
      value: `${total.toLocaleString()}`,
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="6.5" width="19" height="11" rx="2"></rect><path d="M7 12h.01"></path><path d="M11 12h6"></path></svg>'
    },
    {
      icon: "info",
      change: "up",
      delta: `↑ ${safeRate.toFixed(1)}%`,
      label: "Safe Rate",
      value: `${safeRate.toFixed(1)}%`,
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>'
    }
  ];
}

function renderStats(result) {
  const statsEl = document.getElementById("dashboardStats");
  statsEl.innerHTML = buildStats(result).map((stat) => `
    <article class="stat-card">
      <div class="stat-icon ${stat.icon}">${stat.svg}</div>
      <span class="stat-change ${stat.change}">${stat.delta}</span>
      <div class="stat-label">${stat.label}</div>
      <div class="stat-value">${stat.value}</div>
    </article>
  `).join("");
}

function buildTrendSeries(transactions, riskScore) {
  const hours = Array.from({length: 8}, (_, index) => `${index * 3}:00`);
  const base = transactions.length ? transactions.map((item) => safeNumber(item.amount)) : [80, 95, 110, 125];
  const volume = hours.map((_, index) => {
    const source = base[index % base.length] || 0;
    return Math.max(40, Math.round(source / 80 + 70 + index * 8));
  });
  const flagged = hours.map((_, index) => Math.max(4, Math.round((riskScore / 2) + (index % 3) * 2)));
  return {hours, volume, flagged};
}

function renderTrendChart(result) {
  const transactions = (result && result.transactions) || [];
  const riskScore = safeNumber(result && result.risk_score);
  const {hours, volume, flagged} = buildTrendSeries(transactions, riskScore);

  new ApexCharts(document.querySelector("#dashboardTrend"), {
    chart: {type: "line", height: 400, toolbar: {show: false}, fontFamily: "Inter"},
    series: [
      {name: "Txn", data: volume},
      {name: "Flagged", data: flagged}
    ],
    colors: ["#067b45", "#ef3f33"],
    stroke: {curve: "smooth", width: [4, 3]},
    grid: {borderColor: "#d9e7dc", strokeDashArray: 5},
    dataLabels: {enabled: false},
    markers: {size: 5, strokeColors: "#ffffff", strokeWidth: 3},
    fill: {
      type: "gradient",
      gradient: {shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0.04, stops: [0, 95, 100]}
    },
    xaxis: {categories: hours, labels: {style: {colors: "#62756c"}}},
    yaxis: {labels: {style: {colors: "#62756c"}}},
    legend: {position: "top", horizontalAlign: "right"}
  }).render();
}

function renderMixChart(result) {
  const riskScore = safeNumber(result && result.risk_score);
  const pass = Math.max(42, 88 - riskScore * 3);
  const review = Math.max(8, Math.min(28, riskScore * 2));
  const block = Math.max(4, 100 - pass - review);

  new ApexCharts(document.querySelector("#dashboardMix"), {
    chart: {type: "donut", height: 320, fontFamily: "Inter"},
    series: [pass, review, block],
    labels: ["Pass", "Review", "Block"],
    colors: ["#0ea655", "#e0af29", "#ef3f33"],
    legend: {position: "bottom"},
    dataLabels: {enabled: true, style: {fontWeight: 700}},
    plotOptions: {
      pie: {
        donut: {
          size: "64%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Signals",
              formatter: () => `${riskScore}`
            }
          }
        }
      }
    }
  }).render();
}

function statusBadge(status) {
  if (status === "BLOCKED") return "badge badge-danger";
  if (status === "TEMP_BLOCK") return "badge badge-warning";
  return "badge badge-success";
}

function riskBadge(score) {
  if (score >= 11) return "badge badge-danger";
  if (score >= 5) return "badge badge-warning";
  return "badge badge-success";
}

function renderTransactions(result, user) {
  const tbody = document.getElementById("dashboardTransactions");
  const transactions = (result && result.transactions) || [];

  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No analysis has been saved yet. Open the analyzer to submit a case.</td></tr>`;
    return;
  }

  const score = safeNumber(result && result.risk_score);
  const barClass = score >= 11 ? "" : score >= 5 ? "review" : "safe";

  tbody.innerHTML = transactions.map((transaction, index) => `
    <tr>
      <td class="mono">#${safeNumber(result && result.account, user.account || 0)}</td>
      <td>${transaction.location || "Unknown location"}</td>
      <td class="mono">${safeNumber(transaction.amount).toLocaleString()}</td>
      <td>
        <span class="risk-meter">
          <span class="risk-bar ${barClass}"><span style="width:${Math.min(100, score * 7)}%"></span></span>
          <strong>${score}</strong>
        </span>
      </td>
      <td><span class="${statusBadge(result && result.status)}">${result && result.status ? result.status.replace("_", " ") : "ACTIVE"}</span></td>
      <td>${transaction.timestamp || (index === transactions.length - 1 ? "Now" : `${transactions.length - index} min ago`)}</td>
    </tr>
  `).join("");
}

function initDashboard() {
  const user = requireDashboardUser();
  if (!user) return;

  const title = document.getElementById("dashboardTitle");
  title.textContent = `Welcome back, ${user.username}.`;

  const riskScore = safeNumber(latestResult && latestResult.risk_score);
  const health = riskScoreToHealth(riskScore);
  document.getElementById("portfolioScore").textContent = health.score;
  document.getElementById("portfolioLabel").textContent = health.label;
  document.getElementById("dashboardSubtitle").textContent = latestResult
    ? `${latestResult.message} ${latestResult.withdraw_count || ((latestResult.transactions || []).length)} transactions are included in the latest review.`
    : "No case has been analyzed yet. Start from the analyzer to generate fraud decisions and charts.";
  document.getElementById("passRate").textContent = `${Math.max(40, 100 - riskScore * 3)}%`;
  document.getElementById("reviewRate").textContent = `${Math.max(2.5, riskScore)}%`;
  document.getElementById("blockRate").textContent = `${Math.max(0.4, riskScore / 8).toFixed(1)}%`;
  setGauge("dashboardGauge", health.score);

  renderStats(latestResult || {});
  renderTrendChart(latestResult || {});
  renderMixChart(latestResult || {});
  renderTransactions(latestResult || {}, user);
}

initDashboard();

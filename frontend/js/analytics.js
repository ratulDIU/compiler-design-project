const analyticsData = JSON.parse(localStorage.getItem("fraudResult") || "null");

function safeValue(value, fallback = "N/A") {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requireAnalytics() {
  if (!localStorage.getItem("loggedInUsername")) {
    window.location.href = "login.html";
    return null;
  }

  if (!analyticsData) {
    document.getElementById("analyticsSummary").textContent = "No result is stored yet. Run an analysis first.";
    return null;
  }

  return analyticsData;
}

function setGauge(elementId, score) {
  const gauge = document.getElementById(elementId);
  if (!gauge) return;
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(100, safeNumber(score) * 8));
  gauge.style.strokeDasharray = `${(normalized / 100) * circumference} ${circumference}`;
}

function totalAmount(transactions) {
  return (transactions || []).reduce((sum, item) => sum + safeNumber(item.amount), 0);
}

function uniqueLocations(transactions) {
  return new Set((transactions || []).map((item) => item.location).filter(Boolean)).size;
}

function kpiCards(data) {
  const txns = data.transactions || [];
  const total = safeNumber(data.total_amount, totalAmount(txns));
  const average = txns.length ? Math.round(total / txns.length) : 0;
  const max = txns.length ? Math.max(...txns.map((item) => safeNumber(item.amount))) : 0;

  return [
    {label: "Total Amount", value: total.toLocaleString(), note: total > 40000 ? "+12% vs avg" : "Within normal band"},
    {label: "Average Withdrawal", value: average.toLocaleString(), note: average > 10000 ? "Above norm" : "Steady"},
    {label: "Highest Withdrawal", value: max.toLocaleString(), note: max > 10000 ? "Large single step" : "Normal"},
    {label: "Unique Locations", value: String(uniqueLocations(txns)), note: uniqueLocations(txns) > 1 ? "Geo-velocity" : "Single region"}
  ];
}

function renderKpis(data) {
  const kpis = document.getElementById("analyticsKpis");
  kpis.innerHTML = kpiCards(data).map((card) => `
    <article class="metric-card">
      <div class="metric-label">${card.label}</div>
      <div class="metric-value">${card.value}</div>
      <div class="metric-note">${card.note}</div>
    </article>
  `).join("");
}

function renderBarChart(data) {
  const txns = data.transactions || [];
  new ApexCharts(document.querySelector("#analyticsBarChart"), {
    chart: {type: "bar", height: 420, toolbar: {show: false}, fontFamily: "Inter"},
    series: [{name: "Amount", data: txns.map((item) => safeNumber(item.amount))}],
    colors: ["#087a45"],
    fill: {
      type: "gradient",
      gradient: {shade: "light", type: "vertical", gradientToColors: ["#f2bc43"], opacityFrom: 1, opacityTo: 1}
    },
    plotOptions: {bar: {borderRadius: 12, columnWidth: "72%"}},
    dataLabels: {enabled: false},
    xaxis: {categories: txns.map((item) => safeValue(item.location, "Txn")), labels: {style: {colors: "#62756c"}}},
    yaxis: {labels: {style: {colors: "#62756c"}}},
    grid: {borderColor: "#d9e7dc", strokeDashArray: 5}
  }).render();
}

function renderPieChart(data) {
  const txns = data.transactions || [];
  new ApexCharts(document.querySelector("#analyticsPieChart"), {
    chart: {type: "donut", height: 360, fontFamily: "Inter"},
    series: txns.map((item) => safeNumber(item.amount)),
    labels: txns.map((item) => safeValue(item.location, "Txn")),
    colors: ["#109958", "#1691cb", "#d99e08", "#ea4f45", "#83c36b"],
    legend: {position: "bottom"},
    dataLabels: {enabled: true},
    plotOptions: {
      pie: {
        donut: {
          size: "64%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              formatter: () => `${safeNumber(data.total_amount).toLocaleString()}`
            }
          }
        }
      }
    }
  }).render();
}

function renderTrendChart(data) {
  const txns = data.transactions || [];
  const total = safeNumber(data.total_amount);
  const base = txns.length ? txns.map((item) => safeNumber(item.amount)) : [120, 140, 130, 170];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const riskSeries = days.map((_, index) => Math.max(12, Math.round(safeNumber(data.risk_score) * 3 + index * 8 - (index === 2 ? 10 : 0))));
  const volumeSeries = days.map((_, index) => Math.max(80, Math.round((base[index % base.length] / Math.max(1, txns.length || 1)) + 90 + index * 20 + total / 2000)));

  new ApexCharts(document.querySelector("#analyticsTrendChart"), {
    chart: {type: "line", height: 360, toolbar: {show: false}, fontFamily: "Inter"},
    series: [
      {name: "Risk Score", data: riskSeries},
      {name: "Volume", data: volumeSeries}
    ],
    colors: ["#ef3f33", "#067b45"],
    stroke: {curve: "smooth", width: 4},
    markers: {size: 6, strokeColors: "#ffffff", strokeWidth: 3},
    dataLabels: {enabled: false},
    grid: {borderColor: "#d9e7dc", strokeDashArray: 5},
    legend: {position: "bottom"},
    xaxis: {categories: days, labels: {style: {colors: "#62756c"}}},
    yaxis: {labels: {style: {colors: "#62756c"}}}
  }).render();
}

function renderNarrative(data) {
  const txns = data.transactions || [];
  const total = safeNumber(data.total_amount);
  document.getElementById("analyticsSummary").textContent = `Account #${safeValue(data.account)} generated ${txns.length} transactions totaling ${total.toLocaleString()} across ${uniqueLocations(txns)} unique locations.`;
  document.getElementById("riskScoreValue").textContent = safeNumber(data.risk_score);
  document.getElementById("riskLevelValue").textContent = safeValue(data.risk_level, "LOW");
  document.getElementById("decisionAction").textContent = safeValue(data.action, "SAFE");
  document.getElementById("decisionSummary").textContent = safeValue(data.message, "The system returned a fraud decision for this account.");
  document.getElementById("patternTitle").textContent = `${txns.length} withdrawals · ${uniqueLocations(txns)} cities · ${data.time_diff_min ? `${safeNumber(data.time_diff_min).toFixed(0)}m` : "current window"}`;
  document.getElementById("patternSummary").textContent = `Total analyzed amount ${total.toLocaleString()}, latest status ${safeValue(data.status, "ACTIVE").replace("_", " ")}.`;

  const decisionCard = document.getElementById("decisionCard");
  if (data.status === "TEMP_BLOCK" || data.risk_level === "MEDIUM") {
    decisionCard.className = "verdict-banner warning";
  } else if (data.status === "ACTIVE" && data.risk_level === "LOW") {
    decisionCard.className = "verdict-banner success";
  }
}

function renderAnalytics() {
  const data = requireAnalytics();
  if (!data) return;
  setGauge("analyticsGauge", safeNumber(data.risk_score));
  renderNarrative(data);
  renderKpis(data);
  renderBarChart(data);
  renderPieChart(data);
  renderTrendChart(data);
}

document.getElementById("downloadPdfBtn").addEventListener("click", function() {
  window.print();
});

renderAnalytics();

const resultData = JSON.parse(localStorage.getItem("fraudResult") || "null");
let countdownTimer = null;

function safeValue(value, fallback = "N/A") {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function formatBlockUntil(value) {
  const date = parseDate(value);
  if (!date) return safeValue(value, "a later review");

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function blockCountdownText(value) {
  const date = parseDate(value);
  if (!date) {
    return {
      label: "Temporary block is active.",
      countdown: null
    };
  }

  const remaining = date.getTime() - Date.now();

  if (remaining <= 0) {
    return {
      label: "Temporary block window has ended. Refresh to re-check account status.",
      countdown: "00h 00m 00s"
    };
  }

  return {
    label: `Temporary block lifts on ${formatBlockUntil(value)}.`,
    countdown: formatRemaining(remaining)
  };
}

function requireResult() {
  if (!localStorage.getItem("loggedInUsername")) {
    window.location.href = "login.html";
    return null;
  }

  if (!resultData) {
    document.getElementById("resultTitle").textContent = "No analysis found";
    document.getElementById("resultSummary").textContent = "Run an analysis from the analyzer page to view a result.";
    document.getElementById("resultMetrics").innerHTML = "";
    document.getElementById("resultEvidence").innerHTML = '<div class="evidence-item"><div class="evidence-marker warn">!</div><div><div class="evidence-title">No fraud result saved</div><div class="evidence-desc">Open the analyzer, submit transactions, and return here.</div></div></div>';
    return null;
  }

  return resultData;
}

function actionTone(data) {
  if (data.status === "BLOCKED" || data.risk_level === "HIGH") return "danger";
  if (data.status === "TEMP_BLOCK" || data.risk_level === "MEDIUM") return "warning";
  return "success";
}

function formatAction(action) {
  return safeValue(action, "SAFE").replaceAll("_", " ");
}

function transactions(data) {
  return data.transactions || [];
}

function setGauge(elementId, score) {
  const gauge = document.getElementById(elementId);
  if (!gauge) return;
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(100, safeNumber(score) * 8));
  gauge.style.strokeDasharray = `${(normalized / 100) * circumference} ${circumference}`;
}

function evidenceItems(data) {
  const items = [];
  const txns = transactions(data);
  const totalAmount = safeNumber(data.total_amount);

  if ((data.distance_km || 0) > 100 && (data.time_diff_min || 0) < 10) {
    items.push({
      title: "Geo-velocity violation",
      desc: `${safeNumber(data.distance_km).toFixed(2)} km jump in ${safeNumber(data.time_diff_min).toFixed(2)} minutes.`,
      tone: "danger"
    });
  }

  if (new Set(txns.map((item) => item.location)).size > 1) {
    items.push({
      title: "Multiple locations detected",
      desc: `${new Set(txns.map((item) => item.location)).size} unique withdrawal locations were used in one case.`,
      tone: "danger"
    });
  }

  if (txns.length >= 3) {
    items.push({
      title: "Velocity spike",
      desc: `${txns.length} transactions were recorded inside the same review window.`,
      tone: "danger"
    });
  }

  if (totalAmount > 40000) {
    items.push({
      title: "Amount escalation",
      desc: `Total withdrawal amount reached ${totalAmount.toLocaleString()}, above the normal review threshold.`,
      tone: "warn"
    });
  }

  if (data.status === "TEMP_BLOCK") {
    const countdown = blockCountdownText(data.block_until);
    items.push({
      title: "Temporary protective action",
      desc: countdown.countdown
        ? `${countdown.label} Time remaining: ${countdown.countdown}.`
        : countdown.label,
      tone: "warn"
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Low-risk pattern",
      desc: safeValue(data.message, "The latest case did not trigger a blocking rule."),
      tone: "warn"
    });
  }

  return items;
}

function renderMetrics(data) {
  const txns = transactions(data);
  const metrics = [
    {label: "Account", value: `#${safeValue(data.account)}`},
    {label: "Total Amount", value: safeNumber(data.total_amount).toLocaleString()},
    {label: "Transactions", value: String(data.withdraw_count || txns.length)},
    {
      label: data.status === "TEMP_BLOCK" ? "Block Timer" : "Window",
      value: data.status === "TEMP_BLOCK"
        ? `<span id="blockCountdown">${blockCountdownText(data.block_until).countdown || "Pending"}</span>`
        : (data.time_diff_min ? `${safeNumber(data.time_diff_min).toFixed(0)}m` : (txns.length > 1 ? "Multi-step" : "Single"))
    }
  ];

  document.getElementById("resultMetrics").innerHTML = metrics.map((metric) => `
    <article class="metric-card">
      <div class="metric-label">${metric.label}</div>
      <div class="metric-value">${metric.value}</div>
    </article>
  `).join("");
}

function startBlockCountdown(data) {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  if (data.status !== "TEMP_BLOCK" || !data.block_until) return;

  const countdownEl = document.getElementById("blockCountdown");
  const summaryEl = document.getElementById("resultSummary");
  const evidenceDescEl = document.querySelector("[data-temp-block-desc='true']");

  function updateCountdown() {
    const countdown = blockCountdownText(data.block_until);

    if (countdownEl && countdown.countdown) {
      countdownEl.textContent = countdown.countdown;
    }

    if (summaryEl) {
      summaryEl.textContent = countdown.countdown
        ? `${safeValue(data.message, "Temporary block applied.")} Time remaining: ${countdown.countdown}.`
        : countdown.label;
    }

    if (evidenceDescEl) {
      evidenceDescEl.textContent = countdown.countdown
        ? `${countdown.label} Time remaining: ${countdown.countdown}.`
        : countdown.label;
    }

    if (countdown.countdown === "00h 00m 00s") {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

function renderEvidence(data) {
  const container = document.getElementById("resultEvidence");
  container.innerHTML = evidenceItems(data).map((item) => `
    <div class="evidence-item">
      <div class="evidence-marker ${item.tone === "warn" ? "warn" : ""}">${item.tone === "warn" ? "!" : "!"}</div>
      <div>
        <div class="evidence-title">${item.title}</div>
        <div class="evidence-desc" ${item.title === "Temporary protective action" ? 'data-temp-block-desc="true"' : ""}>${item.desc}</div>
      </div>
    </div>
  `).join("");
}

function renderTransactions(data) {
  const tbody = document.getElementById("resultTransactions");
  const txns = transactions(data);
  const score = safeNumber(data.risk_score);

  if (txns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No transactions stored for this case.</td></tr>';
    return;
  }

  tbody.innerHTML = txns.map((item, index) => {
    const risk = Math.min(96, Math.max(18, score * 8 - index * 4));
    const riskClass = risk >= 70 ? "" : risk >= 35 ? "review" : "safe";

    return `
      <tr>
        <td class="mono">T-${index + 1}</td>
        <td>${safeValue(item.location, "Unknown location")}</td>
        <td class="mono">${safeValue(item.timestamp, "Recent")}</td>
        <td class="mono">${safeNumber(item.amount).toLocaleString()}</td>
        <td>
          <span class="risk-meter">
            <span class="risk-bar ${riskClass}"><span style="width:${risk}%"></span></span>
            <strong>${risk}</strong>
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function renderChart(data) {
  const txns = transactions(data);

  new ApexCharts(document.querySelector("#resultBarChart"), {
    chart: {type: "bar", height: 420, toolbar: {show: false}, fontFamily: "Inter"},
    series: [{name: "Withdrawal", data: txns.map((item) => safeNumber(item.amount))}],
    colors: ["#ef3f33"],
    fill: {
      type: "gradient",
      gradient: {shade: "light", type: "vertical", shadeIntensity: 0.6, gradientToColors: ["#f9b236"], opacityFrom: 1, opacityTo: 1}
    },
    plotOptions: {bar: {borderRadius: 12, columnWidth: "56%"}},
    dataLabels: {enabled: false},
    xaxis: {categories: txns.map((item) => safeValue(item.location, "Txn")), labels: {style: {colors: "#62756c"}}},
    yaxis: {labels: {style: {colors: "#62756c"}}},
    grid: {borderColor: "#d9e7dc", strokeDashArray: 5}
  }).render();
}

function renderResult() {
  const data = requireResult();
  if (!data) return;

  const tone = actionTone(data);
  const banner = document.getElementById("resultBanner");
  banner.className = `verdict-banner ${tone}`;

  const title = data.status === "BLOCKED"
    ? `High-risk pattern detected on account #${safeValue(data.account)}`
    : data.status === "TEMP_BLOCK"
      ? `Suspicious activity detected on account #${safeValue(data.account)}`
      : `Low-risk pattern confirmed for account #${safeValue(data.account)}`;

  document.getElementById("resultTitle").textContent = title;
  document.getElementById("resultSummary").textContent = safeValue(data.message, "Latest analysis completed.");
  document.getElementById("riskValue").textContent = safeNumber(data.risk_score);
  document.getElementById("riskLevel").textContent = safeValue(data.risk_level, "LOW");
  document.getElementById("verdictAction").textContent = formatAction(data.action);

  const promo = document.getElementById("verdictPromo");
  promo.style.borderColor = tone === "danger" ? "rgba(236,63,51,0.18)" : tone === "warning" ? "rgba(224,175,41,0.22)" : "rgba(5,129,75,0.18)";
  promo.style.background = tone === "danger" ? "rgba(255,234,232,0.76)" : tone === "warning" ? "rgba(255,244,214,0.88)" : "rgba(223,244,231,0.9)";

  setGauge("resultGauge", safeNumber(data.risk_score));
  renderMetrics(data);
  renderEvidence(data);
  renderTransactions(data);
  renderChart(data);
  startBlockCountdown(data);
}

document.getElementById("downloadResultBtn").addEventListener("click", function() {
  window.print();
});

renderResult();

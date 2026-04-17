const data = JSON.parse(localStorage.getItem("fraudResult"))
const contentEl = document.getElementById("analyticsContent")
const summaryEl = document.getElementById("analyticsSummary")
const riskScoreEl = document.getElementById("riskScoreValue")
const riskLevelEl = document.getElementById("riskLevelValue")
const logoutBtn = document.getElementById("logoutBtn")

function logout(){
    localStorage.removeItem("loggedInUsername")
    localStorage.removeItem("loggedInAccount")
    localStorage.removeItem("fraudResult")
    window.location.href = "login.html"
}

function safeValue(value, fallback = "N/A"){
    return value === undefined || value === null || value === "" ? fallback : value
}

function totalAmount(transactions){
    return (transactions || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

function uniqueLocations(transactions){
    return new Set((transactions || []).map(item => item.location)).size
}

function drawBarChart(canvas, transactions){
    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height
    const padding = 44
    const items = transactions || []
    const maxAmount = Math.max(...items.map(item => Number(item.amount || 0)), 1)
    const gap = 16
    const barWidth = (width - padding * 2 - gap * Math.max(items.length - 1, 0)) / Math.max(items.length, 1)

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#fbfdfc"
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = "#dce5df"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    items.forEach((item, index) => {
        const amount = Number(item.amount || 0)
        const barHeight = (amount / maxAmount) * (height - padding * 2)
        const x = padding + index * (barWidth + gap)
        const y = height - padding - barHeight

        ctx.fillStyle = amount > 40000 ? "#c2413b" : "#117a4f"
        ctx.fillRect(x, y, barWidth, barHeight)

        ctx.fillStyle = "#17211c"
        ctx.font = "800 14px Arial"
        ctx.textAlign = "center"
        ctx.fillText(amount, x + barWidth / 2, y - 10)

        ctx.fillStyle = "#64716a"
        ctx.font = "700 12px Arial"
        ctx.fillText(`T${index + 1}`, x + barWidth / 2, height - 16)
    })
}

function drawPieChart(canvas, transactions){
    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) / 2 - 34
    const items = transactions || []
    const total = totalAmount(items) || 1
    const colors = ["#117a4f", "#0f766e", "#b7791f", "#c2413b", "#375a48"]
    let angle = -Math.PI / 2

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#fbfdfc"
    ctx.fillRect(0, 0, width, height)

    items.forEach((item, index) => {
        const amount = Number(item.amount || 0)
        const slice = (amount / total) * Math.PI * 2

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, radius, angle, angle + slice)
        ctx.closePath()
        ctx.fillStyle = colors[index % colors.length]
        ctx.fill()
        angle += slice
    })

    ctx.fillStyle = "#17211c"
    ctx.font = "800 20px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Share", cx, cy - 4)

    ctx.fillStyle = "#64716a"
    ctx.font = "700 13px Arial"
    ctx.fillText(`Total ${total}`, cx, cy + 20)
}

function drawRiskGauge(canvas, score){
    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height - 34
    const radius = Math.min(width, height * 2) / 2 - 42
    const numericScore = Number(score || 0)
    const maxScore = 11
    const end = Math.PI + (Math.min(numericScore, maxScore) / maxScore) * Math.PI

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#fbfdfc"
    ctx.fillRect(0, 0, width, height)

    ctx.lineWidth = 24
    ctx.lineCap = "round"

    ctx.strokeStyle = "#dce5df"
    ctx.beginPath()
    ctx.arc(cx, cy, radius, Math.PI, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = numericScore > 6 ? "#c2413b" : numericScore > 3 ? "#b7791f" : "#117a4f"
    ctx.beginPath()
    ctx.arc(cx, cy, radius, Math.PI, end)
    ctx.stroke()

    ctx.fillStyle = "#17211c"
    ctx.font = "800 42px Arial"
    ctx.textAlign = "center"
    ctx.fillText(numericScore, cx, cy - 34)

    ctx.fillStyle = "#64716a"
    ctx.font = "700 14px Arial"
    ctx.fillText("Risk Score", cx, cy - 4)
}

function renderEmpty(){
    contentEl.innerHTML = `
        <article class="result-card">
            <h2>No analytics data</h2>
            <p>Run a fraud analysis first, then open analytics.</p>
            <a class="btn btn-primary" href="dashboard.html">Go to Dashboard</a>
        </article>
    `
}

function renderAnalytics(){
    if(!data){
        renderEmpty()
        return
    }

    const transactions = data.transactions || []
    const total = totalAmount(transactions)
    const average = transactions.length ? Math.round(total / transactions.length) : 0
    const maxWithdrawal = Math.max(...transactions.map(item => Number(item.amount || 0)), 0)
    const locationCount = uniqueLocations(transactions)

    riskScoreEl.textContent = safeValue(data.risk_score, "0")
    riskLevelEl.textContent = safeValue(data.risk_level, "LOW")
    summaryEl.textContent = `Account ${safeValue(data.account)} generated ${transactions.length} transaction record${transactions.length === 1 ? "" : "s"} with total withdrawal amount ${total}.`

    contentEl.innerHTML = `
        <section class="analytics-kpis">
            <article><span>Total Amount</span><strong>${total}</strong></article>
            <article><span>Average Withdrawal</span><strong>${average}</strong></article>
            <article><span>Highest Withdrawal</span><strong>${maxWithdrawal}</strong></article>
            <article><span>Unique Locations</span><strong>${locationCount}</strong></article>
        </section>

        <section class="analytics-board">
            <article class="chart-card chart-large">
                <div class="chart-heading">
                    <p class="eyebrow">Bar Chart</p>
                    <h2>Withdrawal Amounts</h2>
                </div>
                <canvas id="analyticsBarChart" width="820" height="360"></canvas>
            </article>

            <article class="chart-card">
                <div class="chart-heading">
                    <p class="eyebrow">Gauge</p>
                    <h2>Risk Score</h2>
                </div>
                <canvas id="analyticsRiskGauge" width="460" height="300"></canvas>
            </article>

            <article class="chart-card">
                <div class="chart-heading">
                    <p class="eyebrow">Pie Chart</p>
                    <h2>Amount Share</h2>
                </div>
                <canvas id="analyticsPieChart" width="460" height="340"></canvas>
            </article>
        </section>

        <section class="analytics-insights">
            <article>
                <p class="eyebrow">Decision</p>
                <h3>${safeValue(data.action, "WARNING")}</h3>
                <p>The system returned ${safeValue(data.risk_level, "LOW")} risk for this transaction pattern.</p>
            </article>
            <article>
                <p class="eyebrow">Pattern</p>
                <h3>${transactions.length} withdrawal${transactions.length === 1 ? "" : "s"}</h3>
                <p>Location and amount behavior are compared with the rule-based fraud signals.</p>
            </article>
        </section>
    `

    drawBarChart(document.getElementById("analyticsBarChart"), transactions)
    drawRiskGauge(document.getElementById("analyticsRiskGauge"), data.risk_score)
    drawPieChart(document.getElementById("analyticsPieChart"), transactions)
}

logoutBtn.addEventListener("click", logout)
renderAnalytics()

const data = JSON.parse(localStorage.getItem("fraudResult"))
const resultEl = document.getElementById("result")
const titleEl = document.getElementById("resultTitle")
const summaryEl = document.getElementById("resultSummary")
const logoutBtn = document.getElementById("logoutBtn")
const locationCache = new Map()

function logout(){
    localStorage.removeItem("loggedInUsername")
    localStorage.removeItem("loggedInAccount")
    localStorage.removeItem("loggedInEmail")
    localStorage.removeItem("fraudResult")
    window.location.href = "login.html"
}

function riskClass(status, level){
    if(status === "BLOCKED" || level === "HIGH") return "danger"
    if(status === "TEMP_BLOCK" || level === "MEDIUM") return "warning"
    return "success"
}

function safeValue(value, fallback = "N/A"){
    return value === undefined || value === null || value === "" ? fallback : value
}

function parseCoordinates(location){
    if(!location || !location.includes(",")) return null

    const parts = location.split(",").map(part => parseFloat(part.trim()))
    const lat = parts[0]
    const lon = parts[1]

    if(Number.isNaN(lat) || Number.isNaN(lon)) return null
    return {lat, lon}
}

async function getLocationName(location){
    const coordinates = parseCoordinates(location)
    if(!coordinates) return location

    const cacheKey = `${coordinates.lat},${coordinates.lon}`
    if(locationCache.has(cacheKey)) return locationCache.get(cacheKey)

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordinates.lat}&lon=${coordinates.lon}`
    const res = await fetch(url)

    if(!res.ok) throw new Error("Location lookup failed")

    const place = await res.json()
    const name = place.display_name || location
    locationCache.set(cacheKey, name)
    return name
}

async function hydrateLocationNames(transactions){
    if(!transactions) return

    for(let i = 0; i < transactions.length; i++){
        const locationEl = document.getElementById(`locationName${i}`)
        if(!locationEl) continue

        try{
            locationEl.textContent = await getLocationName(transactions[i].location)
        }catch(err){
            locationEl.textContent = transactions[i].location
        }
    }
}

function renderEmpty(){
    titleEl.textContent = "No Result Found"
    summaryEl.textContent = "Run a transaction analysis to generate a result."
    resultEl.innerHTML = `
        <article class="result-card">
            <h2>No analysis data</h2>
            <p>Start a new analysis from the dashboard.</p>
            <a class="btn btn-primary" href="dashboard.html">Go to Dashboard</a>
        </article>
    `
}

function renderTransactions(transactions){
    if(!transactions || transactions.length === 0){
        return `<p class="muted">No transaction details were saved.</p>`
    }

    return `
        <div class="transaction-table">
            ${transactions.map((item, index) => `
                <div class="table-row">
                    <span>${index + 1}</span>
                    <strong>${safeValue(item.amount)}</strong>
                    <em id="locationName${index}">${parseCoordinates(item.location) ? "Finding location name..." : safeValue(item.location)}</em>
                    ${item.label ? `<small>${item.label}</small>` : ""}
                </div>
            `).join("")}
        </div>
    `
}

function renderMap(transactions){
    const mapEl = document.getElementById("resultMap")
    const mapNotice = document.getElementById("mapNotice")
    if(!mapEl || !mapNotice) return

    const points = (transactions || [])
        .map(item => {
            const coordinates = parseCoordinates(item.location)
            if(!coordinates) return null

            return {
                ...coordinates,
                amount: item.amount,
                label: item.label
            }
        })
        .filter(point => point && Number.isFinite(point.lat) && Number.isFinite(point.lon))

    if(points.length === 0){
        mapNotice.textContent = "No coordinate-based locations were submitted."
        return
    }

    if(typeof L === "undefined"){
        mapNotice.textContent = "Map library could not load. Location names are still shown above."
        return
    }

    const map = L.map("resultMap").setView([points[0].lat, points[0].lon], 12)

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "OpenStreetMap, CARTO"
    }).addTo(map)

    const bounds = []

    points.forEach((point, index) => {
        const latLng = [point.lat, point.lon]
        bounds.push(latLng)

        L.marker(latLng)
            .addTo(map)
            .bindPopup(`${safeValue(point.label, `Transaction ${index + 1}`)}<br>Amount: ${safeValue(point.amount)}`)
    })

    if(bounds.length > 1){
        map.fitBounds(bounds, {padding: [30, 30]})
    }

    mapNotice.textContent = "Map shows submitted transaction locations."
}

function renderBlockedGuidance(){
    if(data.status !== "BLOCKED") return ""

    return `
        <article class="result-card wide-card blocked-guidance">
            <div>
                <p class="eyebrow">Permanent Block Notice</p>
                <h2>Why this account is blocked</h2>
                <p>This account is permanently blocked because the fraud engine detected a high-risk ATM pattern. This can happen after repeated withdrawals, high total withdrawal amount, location changes, or very short time between transactions.</p>
            </div>
            <div class="contact-steps">
                <h3>What to do now</h3>
                <ul>
                    <li>Do not retry ATM withdrawals with this account.</li>
                    <li>Contact your nearest bank branch or card support desk.</li>
                    <li>Bring your account number, valid ID, and recent transaction details.</li>
                </ul>
                <a class="btn btn-primary" href="analytics.html">View Previous Record</a>
            </div>
        </article>
    `
}

function totalTransactionAmount(transactions){
    return (transactions || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

function drawBarChart(canvas, transactions){
    if(!canvas || !transactions || transactions.length === 0) return

    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height
    const padding = 36
    const maxAmount = Math.max(...transactions.map(item => Number(item.amount || 0)), 1)
    const barGap = 14
    const barWidth = (width - padding * 2 - barGap * (transactions.length - 1)) / transactions.length

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#fbfdfc"
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = "#dce5df"
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    transactions.forEach((item, index) => {
        const amount = Number(item.amount || 0)
        const barHeight = (amount / maxAmount) * (height - padding * 2)
        const x = padding + index * (barWidth + barGap)
        const y = height - padding - barHeight

        ctx.fillStyle = "#117a4f"
        ctx.fillRect(x, y, barWidth, barHeight)

        ctx.fillStyle = "#17211c"
        ctx.font = "700 13px Arial"
        ctx.textAlign = "center"
        ctx.fillText(amount, x + barWidth / 2, y - 8)

        ctx.fillStyle = "#64716a"
        ctx.font = "700 12px Arial"
        ctx.fillText(`T${index + 1}`, x + barWidth / 2, height - 12)
    })
}

function drawPieChart(canvas, transactions){
    if(!canvas || !transactions || transactions.length === 0) return

    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 30
    const total = totalTransactionAmount(transactions) || 1
    const colors = ["#117a4f", "#0f766e", "#b7791f", "#c2413b", "#375a48"]
    let startAngle = -Math.PI / 2

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#fbfdfc"
    ctx.fillRect(0, 0, width, height)

    transactions.forEach((item, index) => {
        const amount = Number(item.amount || 0)
        const slice = (amount / total) * Math.PI * 2

        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + slice)
        ctx.closePath()
        ctx.fillStyle = colors[index % colors.length]
        ctx.fill()

        startAngle += slice
    })

    ctx.fillStyle = "#17211c"
    ctx.font = "800 18px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Amount Share", centerX, centerY - 4)

    ctx.fillStyle = "#64716a"
    ctx.font = "700 13px Arial"
    ctx.fillText(`Total ${total}`, centerX, centerY + 18)
}

function drawRiskGauge(canvas, score){
    if(!canvas) return

    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height - 28
    const radius = Math.min(width, height * 2) / 2 - 32
    const numericScore = Number(score || 0)
    const maxScore = 11
    const endAngle = Math.PI + (Math.min(numericScore, maxScore) / maxScore) * Math.PI

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#fbfdfc"
    ctx.fillRect(0, 0, width, height)

    ctx.lineWidth = 18
    ctx.lineCap = "round"

    ctx.strokeStyle = "#dce5df"
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = numericScore > 6 ? "#c2413b" : numericScore > 3 ? "#b7791f" : "#117a4f"
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle)
    ctx.stroke()

    ctx.fillStyle = "#17211c"
    ctx.font = "800 34px Arial"
    ctx.textAlign = "center"
    ctx.fillText(numericScore, centerX, centerY - 28)

    ctx.fillStyle = "#64716a"
    ctx.font = "700 13px Arial"
    ctx.fillText("Risk Score", centerX, centerY - 4)
}

function renderAnalytics(){
    const analyticsPanel = document.getElementById("analyticsPanel")
    const analyticsToggle = document.getElementById("analyticsToggle")
    if(!analyticsPanel || !analyticsToggle) return

    let hasDrawn = false

    analyticsToggle.addEventListener("click", () => {
        const isHidden = analyticsPanel.classList.toggle("hidden")
        analyticsToggle.textContent = isHidden ? "Show Analytics" : "Hide Analytics"

        if(!isHidden && !hasDrawn){
            drawBarChart(document.getElementById("amountBarChart"), data.transactions)
            drawPieChart(document.getElementById("amountPieChart"), data.transactions)
            drawRiskGauge(document.getElementById("riskGaugeChart"), data.risk_score)
            hasDrawn = true
        }
    })
}

function startBlockTimer(){
    const timer = document.getElementById("blockTimer")
    if(!timer || !data.block_until) return

    const endTime = new Date(data.block_until)

    function update(){
        const diff = endTime - new Date()

        if(diff <= 0){
            timer.textContent = "Block expired. Try a new analysis."
            return
        }

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        timer.textContent = `${hours}h ${minutes}m ${seconds}s remaining`
    }

    update()
    setInterval(update, 1000)
}

function renderResult(){
    if(!data){
        renderEmpty()
        return
    }

    const level = data.risk_level || data.status || "ACTIVE"
    const statusClass = riskClass(data.status, data.risk_level)

    if(data.status === "BLOCKED"){
        titleEl.textContent = "Account Permanently Blocked"
        summaryEl.textContent = "Suspicious activity crossed the highest risk threshold."
    }else if(data.status === "TEMP_BLOCK"){
        titleEl.textContent = "Temporary Block Applied"
        summaryEl.textContent = "The account is restricted while suspicious activity cools down."
    }else{
        titleEl.textContent = `${level} Risk Detected`
        summaryEl.textContent = "The transaction pattern is cleared with the action below."
    }

    resultEl.innerHTML = `
        <article class="result-card status-card ${statusClass}">
            <p class="eyebrow">Status</p>
            <h2>${safeValue(data.status, "ACTIVE")}</h2>
            <p>${safeValue(data.message, "Analysis completed.")}</p>
            ${data.block_until ? `<p id="blockTimer" class="timer-text"></p>` : ""}
        </article>

        <article class="result-card">
            <p class="eyebrow">Account</p>
            <h2>${safeValue(data.account)}</h2>
            <dl class="metric-list">
                <div>
                    <dt>Risk Level</dt>
                    <dd>${safeValue(data.risk_level, level)}</dd>
                </div>
                <div>
                    <dt>Risk Score</dt>
                    <dd>${safeValue(data.risk_score, "0")}</dd>
                </div>
                <div>
                    <dt>Action</dt>
                    <dd>${safeValue(data.action, "WARNING")}</dd>
                </div>
                <div>
                    <dt>Total Amount</dt>
                    <dd>${safeValue(data.total_amount, "0")}</dd>
                </div>
            </dl>
        </article>

        ${renderBlockedGuidance()}

        <article id="previousRecordSection" class="result-card wide-card">
            <div class="transaction-header">
                <div>
                    <p class="eyebrow">${data.status === "BLOCKED" ? "Previous Record" : "Transactions"}</p>
                    <h2>${data.status === "BLOCKED" ? "Last Known Transaction" : "Submitted Withdrawals"}</h2>
                </div>
            </div>
            ${renderTransactions(data.transactions)}
        </article>

        <article class="result-card wide-card">
            <div class="transaction-header">
                <div>
                    <p class="eyebrow">Map Visualization</p>
                    <h2>Transaction Locations</h2>
                </div>
            </div>
            <div id="resultMap" class="result-map"></div>
            <p id="mapNotice" class="muted map-notice"></p>
        </article>

        <article class="result-card wide-card analytics-cta">
            <div class="transaction-header">
                <div>
                    <p class="eyebrow">Analytics</p>
                    <h2>Want deeper visual analysis?</h2>
                    <p>Open a dedicated analytics report with charts for amount patterns, risk score, and transaction distribution.</p>
                </div>
                <a class="btn btn-primary" href="analytics.html">Open Analytics</a>
            </div>
        </article>
    `

    startBlockTimer()
    hydrateLocationNames(data.transactions)
    renderMap(data.transactions)

}

logoutBtn.addEventListener("click", logout)
renderResult()

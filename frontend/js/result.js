const data = JSON.parse(localStorage.getItem("fraudResult"))
const resultEl = document.getElementById("result")
const titleEl = document.getElementById("resultTitle")
const summaryEl = document.getElementById("resultSummary")
const logoutBtn = document.getElementById("logoutBtn")

function logout(){
    localStorage.removeItem("loggedInUsername")
    localStorage.removeItem("loggedInAccount")
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
                    <em>${safeValue(item.location)}</em>
                </div>
            `).join("")}
        </div>
    `
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

        <article class="result-card wide-card">
            <div class="transaction-header">
                <div>
                    <p class="eyebrow">Transactions</p>
                    <h2>Submitted Withdrawals</h2>
                </div>
            </div>
            ${renderTransactions(data.transactions)}
        </article>
    `

    startBlockTimer()
}

logoutBtn.addEventListener("click", logout)
renderResult()

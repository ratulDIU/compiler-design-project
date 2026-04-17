const API_BASE = "http://127.0.0.1:8000"

const form = document.getElementById("form")
const transactionsEl = document.getElementById("transactions")
const timeWrapper = document.getElementById("timeWrapper")
const notice = document.getElementById("notice")
const accountInput = document.getElementById("account")
const sessionLabel = document.getElementById("sessionLabel")
const accountHint = document.getElementById("accountHint")
const logoutBtn = document.getElementById("logoutBtn")
const addTransactionBtn = document.getElementById("addTransactionBtn")

let transactionCount = 0

function currentUser(){
    return {
        username: localStorage.getItem("loggedInUsername"),
        account: localStorage.getItem("loggedInAccount")
    }
}

function setNotice(message, type = "error"){
    notice.textContent = message || ""
    notice.className = `notice ${type}`
}

function requireLogin(){
    const user = currentUser()

    if(!user.username || !user.account){
        window.location.href = "login.html"
        return null
    }

    sessionLabel.textContent = `${user.username} | Account ${user.account}`
    accountHint.textContent = `Signed in account: ${user.account}`
    return user
}

function updateTimeField(){
    const activeRows = transactionsEl.querySelectorAll(".transaction-row").length
    timeWrapper.classList.toggle("hidden", activeRows <= 1)
}

function addTransaction(){
    transactionCount += 1

    const row = document.createElement("div")
    row.className = "transaction-row"
    row.dataset.id = transactionCount

    row.innerHTML = `
        <label>
            <span>Amount</span>
            <input id="amount${transactionCount}" type="number" min="1" placeholder="Withdraw amount">
        </label>
        <label>
            <span>Location</span>
            <input id="loc${transactionCount}" type="text" placeholder="Detect or type location">
        </label>
        <div class="row-actions">
            <button class="btn btn-secondary" type="button" data-detect="${transactionCount}">Detect</button>
            <button class="btn btn-danger" type="button" data-remove>Remove</button>
        </div>
    `

    transactionsEl.appendChild(row)
    updateTimeField()
}

function collectTransactions(){
    const rows = transactionsEl.querySelectorAll(".transaction-row")
    const transactions = []

    rows.forEach(row => {
        const id = row.dataset.id
        const amount = document.getElementById(`amount${id}`).value
        const location = document.getElementById(`loc${id}`).value.trim()

        if(amount && location){
            transactions.push({
                amount: parseInt(amount),
                location: location
            })
        }
    })

    return transactions
}

function detectLocation(id){
    if(!navigator.geolocation){
        setNotice("Location detection is not supported in this browser.")
        return
    }

    setNotice("Requesting location permission...", "success")

    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude.toFixed(6)
        const lon = position.coords.longitude.toFixed(6)
        document.getElementById(`loc${id}`).value = `${lat},${lon}`
        setNotice("Location added.", "success")
    }, () => {
        setNotice("Location permission denied. You can type the location manually.")
    })
}

async function analyzeFraud(payload){
    const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    })

    if(!res.ok){
        const message = await res.text()
        throw new Error(message || "Backend server error")
    }

    return await res.json()
}

function logout(){
    localStorage.removeItem("loggedInUsername")
    localStorage.removeItem("loggedInAccount")
    localStorage.removeItem("fraudResult")
    window.location.href = "login.html"
}

const user = requireLogin()
if(user){
    accountInput.value = user.account
    addTransaction()
}

addTransactionBtn.addEventListener("click", addTransaction)
logoutBtn.addEventListener("click", logout)

transactionsEl.addEventListener("click", function(e){
    const detectId = e.target.dataset.detect

    if(detectId){
        detectLocation(detectId)
        return
    }

    if(e.target.dataset.remove !== undefined){
        e.target.closest(".transaction-row").remove()
        updateTimeField()
    }
})

form.addEventListener("submit", async function(e){
    e.preventDefault()
    setNotice("")

    const loggedInUser = currentUser()
    const accountNumber = accountInput.value.trim()

    if(!loggedInUser.username || !loggedInUser.account){
        window.location.href = "login.html"
        return
    }

    if(!accountNumber){
        setNotice("Enter account number.")
        return
    }

    if(accountNumber !== loggedInUser.account){
        setNotice("Account number does not match logged in user.")
        return
    }

    const transactions = collectTransactions()

    if(transactions.length === 0){
        setNotice("Add at least one complete transaction.")
        return
    }

    const intervalInput = document.getElementById("interval")
    const interval = transactions.length > 1 ? parseInt(intervalInput.value) : 999

    if(transactions.length > 1 && (!interval || interval < 1)){
        setNotice("Enter the time interval in minutes.")
        return
    }

    const payload = {
        username: loggedInUser.username,
        account: parseInt(accountNumber),
        transactions: transactions,
        time_interval: interval
    }

    try{
        const result = await analyzeFraud(payload)

        if(result.error){
            setNotice(result.error)
            return
        }

        localStorage.setItem("fraudResult", JSON.stringify({
            ...result,
            transactions: transactions,
            checked_at: new Date().toISOString()
        }))
        window.location.href = "result.html"
    }catch(err){
        console.error(err)
        setNotice(`Backend error: ${err.message}`)
    }
})

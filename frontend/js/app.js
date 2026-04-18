const API_BASE = "http://127.0.0.1:8001";

const form = document.getElementById("form");
const transactionsEl = document.getElementById("transactions");
const timeWrapper = document.getElementById("timeWrapper");
const notice = document.getElementById("notice");
const accountInput = document.getElementById("account");
const accountHint = document.getElementById("accountHint");
const addTransactionBtn = document.getElementById("addTransactionBtn");

let transactionCount = 0;

function currentUser() {
  return {
    username: localStorage.getItem("loggedInUsername"),
    account: localStorage.getItem("loggedInAccount")
  };
}

function setNotice(message, type = "error") {
  notice.textContent = message || "";
  notice.className = `notice${type === "success" ? " success" : ""}`;
}

function requireLogin() {
  const user = currentUser();

  if (!user.username || !user.account) {
    window.location.href = "login.html";
    return null;
  }

  accountHint.textContent = `Signed in account: ${user.account}`;
  accountInput.value = user.account;
  return user;
}

function updateTimeField() {
  const rows = transactionsEl.querySelectorAll(".transaction-row").length;
  timeWrapper.classList.toggle("hidden", rows <= 1);
}

function addTransaction() {
  transactionCount += 1;

  const row = document.createElement("div");
  row.className = "transaction-row";
  row.dataset.id = transactionCount;
  row.innerHTML = `
    <div class="transaction-row-head">
      <strong>Amount #${transactionCount}</strong>
      <button class="btn btn-soft-danger" type="button" data-remove>Remove</button>
    </div>
    <div class="transaction-grid">
      <div>
        <label class="label" for="amount${transactionCount}">Withdraw amount</label>
        <input class="input mono" id="amount${transactionCount}" type="number" min="1" placeholder="Enter amount" />
      </div>
      <div>
        <label class="label" for="loc${transactionCount}">Location</label>
        <input class="input" id="loc${transactionCount}" type="text" placeholder="Detect or type location" />
      </div>
      <button class="btn btn-outline" type="button" data-detect="${transactionCount}">Detect</button>
      <button class="btn btn-danger" type="button" data-remove>Remove</button>
    </div>
  `;

  transactionsEl.appendChild(row);
  updateTimeField();
}

function collectTransactions() {
  const rows = transactionsEl.querySelectorAll(".transaction-row");
  const transactions = [];

  rows.forEach((row) => {
    const id = row.dataset.id;
    const amount = Number(document.getElementById(`amount${id}`).value);
    const location = document.getElementById(`loc${id}`).value.trim();

    if (amount && location) {
      transactions.push({amount, location});
    }
  });

  return transactions;
}

function detectLocation(id) {
  if (!navigator.geolocation) {
    setNotice("Location detection is not supported in this browser.");
    return;
  }

  setNotice("Requesting location permission...", "success");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lon = position.coords.longitude.toFixed(6);
      document.getElementById(`loc${id}`).value = `${lat},${lon}`;
      setNotice("Location added.", "success");
    },
    () => {
      setNotice("Location permission denied. You can type the location manually.");
    }
  );
}

async function analyzeFraud(payload) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Backend server error");
  }

  return await res.json();
}

transactionsEl.addEventListener("click", function(event) {
  const detectId = event.target.dataset.detect;
  if (detectId) {
    detectLocation(detectId);
    return;
  }

  if (event.target.dataset.remove !== undefined) {
    const row = event.target.closest(".transaction-row");
    if (row) row.remove();
    updateTimeField();
  }
});

addTransactionBtn.addEventListener("click", addTransaction);

form.addEventListener("submit", async function(event) {
  event.preventDefault();
  setNotice("");

  const loggedInUser = currentUser();
  const accountNumber = accountInput.value.trim();

  if (!loggedInUser.username || !loggedInUser.account) {
    window.location.href = "login.html";
    return;
  }

  if (!accountNumber) {
    setNotice("Enter account number.");
    return;
  }

  if (accountNumber !== loggedInUser.account) {
    setNotice("Account number does not match logged in user.");
    return;
  }

  const transactions = collectTransactions();
  if (transactions.length === 0) {
    setNotice("Add at least one complete transaction.");
    return;
  }

  const intervalInput = document.getElementById("interval");
  const interval = transactions.length > 1 ? parseInt(intervalInput.value, 10) : 999;

  if (transactions.length > 1 && (!interval || interval < 1)) {
    setNotice("Enter the time interval in minutes.");
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Analyzing...";

  try {
    const result = await analyzeFraud({
      username: loggedInUser.username,
      account: parseInt(accountNumber, 10),
      transactions,
      time_interval: interval
    });

    if (result.error) {
      setNotice(result.error);
      return;
    }

    localStorage.setItem("fraudResult", JSON.stringify({
      ...result,
      transactions: result.transactions || transactions,
      checked_at: new Date().toISOString()
    }));

    window.location.href = "result.html";
  } catch (error) {
    console.error(error);
    setNotice(`Backend error: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Analyze Fraud Risk";
  }
});

if (requireLogin()) {
  addTransaction();
}

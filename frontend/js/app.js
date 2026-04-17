document.getElementById("form").addEventListener("submit", function(e){

    e.preventDefault()

    const username = localStorage.getItem("loggedInUsername")
    const loggedInAccount = localStorage.getItem("loggedInAccount")
    const accountNumber = document.getElementById("account").value.trim()
    const interval = parseInt(document.getElementById("interval").value)

    // 🔐 Login check
    if(!username || !loggedInAccount){
        alert("Please login first")
        window.location.href = "login.html"
        return
    }

    // 🔐 Account match
    if(accountNumber !== loggedInAccount){
        alert("Account number does not match logged in user")
        return
    }

    const transactions = []

    // 🔄 collect data
    for(let i = 1; i <= count; i++){

        const amountEl = document.getElementById("amount"+i)
        const locEl = document.getElementById("loc"+i)

        if(!amountEl || !amountEl.value){
            alert("Enter amount for all transactions")
            return
        }

        if(!locEl || !locEl.value){
            alert("Click 📍 to detect location for all transactions")
            return
        }

        const amount = parseInt(amountEl.value)

        if(isNaN(amount)){
            alert("Invalid amount")
            return
        }

        transactions.push({
            amount: amount,
            location: locEl.value
        })
    }

    // ❌ no transaction
    if(transactions.length === 0){
        alert("Add at least one transaction")
        return
    }

    // 🔥 time validation ONLY when >1
    if(transactions.length > 1 && isNaN(interval)){
        alert("Time interval required for multiple transactions ⏱")
        return
    }

    const data = {
        username: username,
        account: parseInt(accountNumber),
        transactions: transactions,
        time_interval: transactions.length > 1 ? interval : 0
    }

    console.log("Sending:", data)

    sendData(data)

})


// ===============================
async function sendData(data){

    try{

        const res = await fetch("http://127.0.0.1:8000/analyze",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify(data)
        })

        if(!res.ok){
            throw new Error("Server error")
        }

        const result = await res.json()

        console.log("Result:", result)

        if(result.error){
            alert(result.error)
            return
        }

        localStorage.setItem("fraudResult", JSON.stringify(result))
        window.location.href = "result.html"

    }catch(err){
        console.error(err)
        alert("Backend connection failed ❌")
    }

}
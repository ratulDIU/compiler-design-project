document.getElementById("form").addEventListener("submit", async function(e){

    e.preventDefault()

    const account = parseInt(document.getElementById("account").value)
    const interval = parseInt(document.getElementById("interval").value)

    const transactions = []

    for(let i = 1; i <= count; i++){

        const amountEl = document.getElementById("amount"+i)
        const locEl = document.getElementById("loc"+i)

        if(amountEl && locEl && amountEl.value && locEl.value){
            transactions.push({
                amount: parseInt(amountEl.value),
                location: locEl.value
            })
        }
    }

    if(transactions.length === 0){
        alert("Please add at least one transaction")
        return
    }

    const data = {
        account: account,
        transactions: transactions,
        time_interval: interval
    }

    console.log(data)

    try{

        const res = await fetch("http://127.0.0.1:8000/analyze",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify(data)
        })

        const result = await res.json()

        localStorage.setItem("fraudResult", JSON.stringify(result))
        window.location.href = "result.html"

    }catch(err){
        console.error(err)
        alert("Backend connection error!")
    }

})
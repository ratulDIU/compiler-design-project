const API_BASE = "http://127.0.0.1:8000"

function setNotice(message, type = "error"){
    const notice = document.getElementById("notice")
    if(!notice) return

    notice.textContent = message || ""
    notice.className = `notice ${type}`
}

function setLoading(form, isLoading){
    const button = form.querySelector("button[type='submit']")
    if(!button) return

    button.disabled = isLoading
    button.textContent = isLoading ? "Please wait..." : button.dataset.label
}

async function postJson(path, payload){
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    })

    return await res.json()
}

function setupRegister(){
    const form = document.getElementById("registerForm")
    if(!form) return

    const button = form.querySelector("button[type='submit']")
    button.dataset.label = button.textContent

    form.addEventListener("submit", async function(e){
        e.preventDefault()
        setNotice("")

        const username = document.getElementById("username").value.trim()
        const accountNumber = document.getElementById("account_number").value.trim()
        const email = document.getElementById("email").value.trim()
        const password = document.getElementById("pass").value
        const confirmPassword = document.getElementById("confirm_pass").value

        if(!username || !accountNumber || !email || !password || !confirmPassword){
            setNotice("All fields are required.")
            return
        }

        if(!/^[0-9]+$/.test(accountNumber)){
            setNotice("Account number must contain digits only.")
            return
        }

        if(password !== confirmPassword){
            setNotice("Passwords do not match.")
            return
        }

        try{
            setLoading(form, true)
            const data = await postJson("/register", {
                username: username,
                account_number: accountNumber,
                email: email,
                password: password,
                confirm_password: confirmPassword
            })

            if(data.error){
                setNotice(data.error)
                return
            }

            setNotice(data.message || "OTP sent to email.", "success")
            setTimeout(() => {
                window.location.href = "verify.html"
            }, 700)
        }catch(err){
            console.error(err)
            setNotice("Backend connection failed.")
        }finally{
            setLoading(form, false)
        }
    })
}

function setupVerify(){
    const form = document.getElementById("verifyForm")
    if(!form) return

    const button = form.querySelector("button[type='submit']")
    button.dataset.label = button.textContent

    form.addEventListener("submit", async function(e){
        e.preventDefault()
        setNotice("")

        const otp = document.getElementById("otp").value.trim()

        if(!/^[0-9]{6}$/.test(otp)){
            setNotice("Enter the 6 digit OTP.")
            return
        }

        try{
            setLoading(form, true)
            const data = await postJson("/verify", {otp: otp})

            if(data.error){
                setNotice(data.error)
                return
            }

            setNotice("Account verified. Redirecting to login.", "success")
            setTimeout(() => {
                window.location.href = "login.html"
            }, 700)
        }catch(err){
            console.error(err)
            setNotice("Backend connection failed.")
        }finally{
            setLoading(form, false)
        }
    })
}

function setupLogin(){
    const form = document.getElementById("loginForm")
    if(!form) return

    const button = form.querySelector("button[type='submit']")
    button.dataset.label = button.textContent

    form.addEventListener("submit", async function(e){
        e.preventDefault()
        setNotice("")

        const username = document.getElementById("username").value.trim()
        const password = document.getElementById("pass").value

        if(!username || !password){
            setNotice("Enter user name and password.")
            return
        }

        try{
            setLoading(form, true)
            const data = await postJson("/login", {
                username: username,
                password: password
            })

            if(data.error){
                setNotice(data.error)
                return
            }

            localStorage.setItem("loggedInUsername", data.username)
            localStorage.setItem("loggedInAccount", data.account_number)
            setNotice("Login successful. Opening dashboard.", "success")

            setTimeout(() => {
                window.location.href = "dashboard.html"
            }, 500)
        }catch(err){
            console.error(err)
            setNotice("Backend connection failed.")
        }finally{
            setLoading(form, false)
        }
    })
}

setupRegister()
setupVerify()
setupLogin()

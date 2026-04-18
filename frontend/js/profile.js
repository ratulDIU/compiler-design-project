const API_BASE = "http://127.0.0.1:8001"

const usernameEl = document.getElementById("profileUsername")
const accountEl = document.getElementById("profileAccount")
const emailEl = document.getElementById("profileEmail")
const avatarEl = document.getElementById("profileAvatar")
const noticeEl = document.getElementById("profileNotice")
function setProfile(profile){
    usernameEl.textContent = profile.username || "N/A"
    accountEl.textContent = profile.account_number || "N/A"
    emailEl.textContent = profile.email || "N/A"
    avatarEl.textContent = (profile.username || "U").charAt(0).toUpperCase()
}

async function loadProfile(){
    const username = localStorage.getItem("loggedInUsername")

    if(!username){
        window.location.href = "login.html"
        return
    }

    setProfile({
        username: username,
        account_number: localStorage.getItem("loggedInAccount"),
        email: localStorage.getItem("loggedInEmail")
    })

    try{
        const res = await fetch(`${API_BASE}/profile`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username: username})
        })
        const data = await res.json()

        if(data.error){
            noticeEl.textContent = data.error
            return
        }

        localStorage.setItem("loggedInAccount", data.account_number)
        localStorage.setItem("loggedInEmail", data.email)
        setProfile(data)
        noticeEl.textContent = ""
    }catch(err){
        console.error(err)
        noticeEl.textContent = "Could not refresh profile from backend."
    }
}

loadProfile()

from fastapi import APIRouter
from fraud_service import analyze_transaction
import random
from database.db import get_connection
import sqlite3
import smtplib
from email.mime.text import MIMEText
import bcrypt

router = APIRouter()

# ===============================
# ANALYZE
# ===============================
@router.post("/analyze")
def analyze(data: dict):
    username = data.get("username")
    account = data.get("account")

    if not username:
        return {"error": "Please login first"}

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT card_number, is_verified FROM users WHERE username=?",
        (username,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"error": "User not found"}

    user_account, verified = row

    if not verified:
        return {"error": "Verify first"}

    if str(user_account) != str(account):
        return {"error": "Account number mismatch"}

    return analyze_transaction(data)


# ===============================
# EMAIL FUNCTION
# ===============================
def send_email(to_email, otp):
    sender = "diucse66@gmail.com"
    password = "yivk ayao yuqf mflx"

    msg = MIMEText(f"Your OTP is: {otp}")
    msg["Subject"] = "ATM Fraud System OTP"
    msg["From"] = sender
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)


# ===============================
# REGISTER
# ===============================
@router.post("/register")
def register(data: dict):

    username = data.get("username")
    card = data.get("account_number")
    email = data.get("email")
    password = data.get("password")
    confirm_password = data.get("confirm_password")

    # 🔐 validation
    if not username or not card or not email or not password or not confirm_password:
        return {"error": "All fields required"}

    if password != confirm_password:
        return {"error": "Passwords do not match"}

    # 🔥 HASH PASSWORD
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    password = hashed.decode()

    otp = str(random.randint(100000, 999999))

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # duplicate check
        cursor.execute("SELECT 1 FROM users WHERE username=?", (username,))
        if cursor.fetchone():
            return {"error": "Username already exists"}

        cursor.execute("SELECT 1 FROM users WHERE card_number=?", (card,))
        if cursor.fetchone():
            return {"error": "Account already exists"}

        # send OTP
        send_email(email, otp)

        cursor.execute(
            """
            INSERT INTO users(username, card_number, email, password, otp)
            VALUES (?, ?, ?, ?, ?)
            """,
            (username, card, email, password, otp),
        )
        conn.commit()

    except Exception as e:
        return {"error": f"Registration failed: {str(e)}"}

    finally:
        conn.close()

    return {"message": "OTP sent to email"}


# ===============================
# VERIFY
# ===============================
@router.post("/verify")
def verify(data: dict):

    otp = data.get("otp")

    if not otp:
        return {"error": "OTP required"}

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE otp=?", (otp,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return {"error": "Invalid OTP"}

    user_id = row[0]

    cursor.execute("UPDATE users SET is_verified=1 WHERE id=?", (user_id,))
    conn.commit()
    conn.close()

    return {"message": "Verified successfully"}


# ===============================
# LOGIN
# ===============================
@router.post("/login")
def login(data: dict):

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return {"error": "Username & password required"}

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT password, is_verified, card_number FROM users WHERE username=?",
        (username,),
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        return {"error": "User not found"}

    db_pass, verified, account_number = row

    if not verified:
        conn.close()
        return {"error": "Verify your account first"}

    # 🔥 CHECK HASH PASSWORD
    if not bcrypt.checkpw(password.encode(), db_pass.encode()):
        conn.close()
        return {"error": "Wrong password"}

    conn.close()

    return {
        "message": "Login success",
        "username": username,
        "account_number": account_number
    }
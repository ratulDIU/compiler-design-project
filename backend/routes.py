from fastapi import APIRouter
from fraud_service import analyze_transaction
import random
from database.db import get_connection
import sqlite3
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "ATM Shield Verification Code"
    msg["From"] = sender
    msg["To"] = to_email

    html = f"""
    <html>
        <body style="margin:0;padding:0;background:#eef3ef;font-family:Arial,Helvetica,sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3ef;padding:28px 12px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #dce5df;">
                            <tr>
                                <td style="padding:28px 32px;background:linear-gradient(135deg,#157347,#177d72);color:#ffffff;">
                                    <div style="font-size:13px;font-weight:800;letter-spacing:0;text-transform:uppercase;opacity:0.86;margin-bottom:10px;">ATM Shield</div>
                                    <div style="font-size:30px;font-weight:800;line-height:1.15;">Verify your account</div>
                                    <p style="margin:12px 0 0;color:rgba(255,255,255,0.82);font-size:15px;line-height:1.6;">Use the verification code below to activate your access and continue to secure fraud analysis.</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:32px;">
                                    <p style="margin:0 0 16px;color:#5f6d64;font-size:15px;line-height:1.7;">Enter this one-time code on the verification page:</p>
                                    <div style="display:inline-block;padding:16px 24px;border-radius:8px;background:#f6faf7;border:1px solid #dce5df;color:#16201a;font-size:34px;font-weight:800;letter-spacing:4px;">{otp}</div>
                                    <p style="margin:18px 0 0;color:#5f6d64;font-size:14px;line-height:1.7;">If you did not request this account, you can ignore this email.</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:18px 32px;border-top:1px solid #edf2ee;color:#7a887f;font-size:13px;line-height:1.6;">
                                    ATM Shield fraud monitoring workflow
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """

    text = f"ATM Shield verification code: {otp}"

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

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
        "SELECT password, is_verified, card_number, email FROM users WHERE username=?",
        (username,),
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        return {"error": "User not found"}

    db_pass, verified, account_number, email = row

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
        "account_number": account_number,
        "email": email
    }


# ===============================
# PROFILE
# ===============================
@router.post("/profile")
def profile(data: dict):

    username = data.get("username")

    if not username:
        return {"error": "Please login first"}

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT username, card_number, email FROM users WHERE username=?",
        (username,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"error": "User not found"}

    username, account_number, email = row

    return {
        "username": username,
        "account_number": account_number,
        "email": email
    }

from database.db import get_connection
from datetime import datetime, timedelta


# ---------------------------
# ENSURE ACCOUNT EXISTS
# ---------------------------
def ensure_account(account):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT OR IGNORE INTO accounts(account_number, status)
    VALUES (?, 'ACTIVE')
    """, (account,))

    conn.commit()
    conn.close()


# ---------------------------
# CHECK CARD STATUS
# ---------------------------
def check_card_status(account):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT status, block_until FROM accounts WHERE account_number=?", (account,))
    row = cursor.fetchone()

    conn.close()

    if not row:
        return {"status": "ACTIVE"}

    status, block_until = row

    # 🔴 Permanent Block
    if status == "BLOCKED":
        return {"status": "BLOCKED"}

    # 🟡 Temporary Block
    if status == "TEMP_BLOCK" and block_until:
        now = datetime.now()
        block_time = datetime.fromisoformat(block_until)

        if now < block_time:
            return {
                "status": "TEMP_BLOCK",
                "block_until": block_until
            }
        else:
            unblock_card(account)
            return {"status": "ACTIVE"}

    return {"status": "ACTIVE"}


# ---------------------------
# TEMP BLOCK (24 HOURS)
# ---------------------------
def temp_block_card(account):

    conn = get_connection()
    cursor = conn.cursor()

    block_time = datetime.now() + timedelta(hours=24)

    cursor.execute("""
    UPDATE accounts 
    SET status='TEMP_BLOCK', block_until=? 
    WHERE account_number=?
    """, (block_time.isoformat(), account))

    conn.commit()
    conn.close()

    return block_time


# ---------------------------
# PERMANENT BLOCK
# ---------------------------
def permanent_block(account):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE accounts 
    SET status='BLOCKED', block_until=NULL
    WHERE account_number=?
    """, (account,))

    conn.commit()
    conn.close()


# ---------------------------
# UNBLOCK
# ---------------------------
def unblock_card(account):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE accounts 
    SET status='ACTIVE', block_until=NULL
    WHERE account_number=?
    """, (account,))

    conn.commit()
    conn.close()


# ---------------------------
# MAIN FUNCTION
# ---------------------------
def analyze_transaction(data):

    account = data["account"]
    transactions = data["transactions"]
    time_interval = data["time_interval"]

    # ✅ Ensure account exists
    ensure_account(account)

    # 🔴 Check status FIRST
    status_data = check_card_status(account)

    if status_data["status"] == "BLOCKED":
        return {
            "account": account,
            "message": "🚨 Your account is permanently blocked.",
            "status": "BLOCKED"
        }

    if status_data["status"] == "TEMP_BLOCK":
        return {
            "account": account,
            "message": "⏳ Your account is temporarily blocked.",
            "status": "TEMP_BLOCK",
            "block_until": status_data["block_until"]
        }

    # ---------------------------
    # RISK CALCULATION
    # ---------------------------
    withdraw_count = len(transactions)
    total_amount = sum(t["amount"] for t in transactions)

    locations = [t["location"] for t in transactions]
    location_change = len(set(locations)) > 1

    risk_score = 0

    if withdraw_count >= 3:
        risk_score += 3

    if total_amount > 40000:
        risk_score += 3

    if location_change:
        risk_score += 3

    if time_interval <= 5:
        risk_score += 2

    # ---------------------------
    # DECISION ENGINE
    # ---------------------------
    if risk_score <= 3:
        level = "LOW"
        action = "WARNING"

        return {
            "account": account,
            "withdraw_count": withdraw_count,
            "total_amount": total_amount,
            "risk_score": risk_score,
            "risk_level": level,
            "action": action,
            "status": "ACTIVE"
        }

    elif risk_score <= 6:
        level = "MEDIUM"
        action = "TEMPORARY BLOCK"

        block_time = temp_block_card(account)

        return {
            "account": account,
            "withdraw_count": withdraw_count,
            "total_amount": total_amount,
            "risk_score": risk_score,
            "risk_level": level,
            "action": action,
            "status": "TEMP_BLOCK",
            "block_until": block_time.isoformat()
        }

    else:
        level = "HIGH"
        action = "PERMANENT BLOCK"

        permanent_block(account)

        return {
            "account": account,
            "withdraw_count": withdraw_count,
            "total_amount": total_amount,
            "risk_score": risk_score,
            "risk_level": level,
            "action": action,
            "status": "BLOCKED"
        }
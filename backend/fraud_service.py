from database.db import get_connection
from datetime import datetime, timedelta
import math


# ---------------------------
# DISTANCE CALCULATION
# ---------------------------
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(dlon/2)**2

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# ---------------------------
# SAVE FRAUD REPORT
# ---------------------------
def save_fraud_report(account, score, level, action):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO fraud_reports(account, risk_score, risk_level, action, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    """, (account, score, level, action))

    conn.commit()
    conn.close()

# ---------------------------
# DB HELPERS
# ---------------------------
def get_last_transaction(account):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT location, timestamp 
    FROM transactions 
    WHERE account=? 
    ORDER BY id DESC LIMIT 1
    """)

    row = cursor.fetchone()
    conn.close()
    return row


def save_transaction(account, amount, location):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO transactions(account, amount, location, timestamp)
    VALUES (?, ?, ?, datetime('now'))
    """, (account, amount, location))

    conn.commit()
    conn.close()


# ---------------------------
# ACCOUNT MANAGEMENT
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


def check_card_status(account):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT status, block_until FROM accounts WHERE account_number=?", (account,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"status": "ACTIVE"}

    status, block_until = row

    if status == "BLOCKED":
        return {"status": "BLOCKED"}

    if status == "TEMP_BLOCK" and block_until:
        now = datetime.now()
        block_time = datetime.fromisoformat(block_until)

        if now < block_time:
            return {"status": "TEMP_BLOCK", "block_until": block_until}
        else:
            unblock_card(account)
            return {"status": "ACTIVE"}

    return {"status": "ACTIVE"}


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

    ensure_account(account)

    # 🔴 Check block status
    status_data = check_card_status(account)

    if status_data["status"] == "BLOCKED":
        return {
            "account": account,
            "message": "🚨 Account permanently blocked",
            "status": "BLOCKED"
        }

    if status_data["status"] == "TEMP_BLOCK":
        return {
            "account": account,
            "message": "⏳ Account temporarily blocked",
            "status": "TEMP_BLOCK",
            "block_until": status_data["block_until"]
        }

    # ---------------------------
    # BASIC RISK
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
    # 🔥 DISTANCE FRAUD LOGIC
    # ---------------------------
    last_tx = get_last_transaction(account)

    distance = 0
    time_diff = 0

    if last_tx:
        last_location, last_time = last_tx

        try:
            last_lat, last_lon = map(float, last_location.split(","))
            current_lat, current_lon = map(float, transactions[-1]["location"].split(","))

            distance = calculate_distance(last_lat, last_lon, current_lat, current_lon)

            last_time = datetime.fromisoformat(last_time)
            now = datetime.now()

            time_diff = (now - last_time).total_seconds() / 60

            print("Distance:", distance, "Time:", time_diff)

            # 🚨 RULE
            if distance > 100 and time_diff < 10:
                risk_score += 5

        except:
            pass  # avoid crash if bad data

    # ---------------------------
    # SAVE TRANSACTIONS
    # ---------------------------
    for t in transactions:
        save_transaction(account, t["amount"], t["location"])

    # ---------------------------
    # DECISION ENGINE
    # ---------------------------
    if risk_score <= 3:
        level = "LOW"
        action = "WARNING"
        status = "ACTIVE"

    elif risk_score <= 6:
        level = "MEDIUM"
        action = "TEMPORARY BLOCK"
        block_time = temp_block_card(account)
        status = "TEMP_BLOCK"

    else:
        level = "HIGH"
        action = "PERMANENT BLOCK"
        permanent_block(account)
        status = "BLOCKED"
    save_fraud_report(account, risk_score, level, action)
    return {
    "account": account,
    "withdraw_count": withdraw_count,
    "total_amount": total_amount,
    "risk_score": risk_score,
    "risk_level": level,
    "action": action,
    "status": status,
    "distance_km": round(distance, 2),
    "time_diff_min": round(time_diff, 2),
    "transactions": transactions   # 🔥 ADD THIS LINE
}
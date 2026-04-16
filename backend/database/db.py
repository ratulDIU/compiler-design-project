import sqlite3
import os

def get_connection():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(BASE_DIR, "atm.db")

    conn = sqlite3.connect(db_path)
    return conn
"""Donation ledger in SQLite. Kept for up to 10 years because of tax retention duties (§ 147 AO)."""
import sqlite3
from os import makedirs, path

from settings.config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS donations (
    telegram_payment_charge_id TEXT PRIMARY KEY,
    telegram_user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""


def connect(db_path: str = DB_PATH) -> sqlite3.Connection:
    if db_path != ":memory:":
        makedirs(path.dirname(db_path) or ".", exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.execute(SCHEMA)
    return connection


def record_donation(connection: sqlite3.Connection, charge_id: str, user_id: int, amount: int) -> bool:
    """Stores a donation once; returns False when Telegram delivered the same payment twice."""
    with connection:
        cursor = connection.execute(
            "INSERT OR IGNORE INTO donations (telegram_payment_charge_id, telegram_user_id, amount) VALUES (?, ?, ?)",
            (charge_id, user_id, amount),
        )
    return cursor.rowcount == 1


def total_for(connection: sqlite3.Connection, user_id: int) -> int:
    row = connection.execute("SELECT COALESCE(SUM(amount), 0) FROM donations WHERE telegram_user_id = ?", (user_id,)).fetchone()
    return int(row[0])

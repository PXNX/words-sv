"""
Donation ledger in PostgreSQL. Kept for up to 10 years because of tax retention duties (§ 147 AO).
A donation is keyed by Telegram's unique charge id, so a payment delivered twice is stored once.
"""
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from games import SCHEMA as GAMES_SCHEMA
from scribble import SCHEMA as SCRIBBLE_SCHEMA

SCHEMA = """
CREATE TABLE IF NOT EXISTS donations (
    telegram_payment_charge_id text PRIMARY KEY,
    telegram_user_id bigint NOT NULL,
    amount integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
)
"""


async def connect(database_url: str) -> AsyncConnectionPool:
    """Opens a connection pool and creates the table if it is missing."""
    pool = AsyncConnectionPool(database_url, min_size=1, max_size=3, open=False, kwargs={"autocommit": True, "row_factory": dict_row})
    await pool.open(wait=True)
    async with pool.connection() as connection:
        await connection.execute(SCHEMA)
        await connection.execute(GAMES_SCHEMA)
        for statement in SCRIBBLE_SCHEMA.split(";"):
            if statement.strip():
                await connection.execute(statement)
    return pool


async def record_donation(pool: AsyncConnectionPool, charge_id: str, user_id: int, amount: int) -> bool:
    """Stores a donation once; returns False when Telegram delivered the same payment twice."""
    async with pool.connection() as connection:
        cursor = await connection.execute(
            "INSERT INTO donations (telegram_payment_charge_id, telegram_user_id, amount) VALUES (%s, %s, %s) "
            "ON CONFLICT (telegram_payment_charge_id) DO NOTHING",
            (charge_id, user_id, amount),
        )
    return cursor.rowcount == 1


async def total_for(pool: AsyncConnectionPool, user_id: int) -> int:
    async with pool.connection() as connection:
        row = await (
            await connection.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM donations WHERE telegram_user_id = %s", (user_id,))
        ).fetchone()
    return int(row["total"])

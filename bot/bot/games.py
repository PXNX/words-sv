"""
Group competition through Telegram's gaming platform (https://core.telegram.org/bots/games). Each game
is a WordCircle mode registered with @BotFather under its id. /games in a group posts one (sendGame);
pressing Play asks WordCircle's server for a session and opens the mode with it in Telegram's browser,
and every finished round puts its score on that chat's scoreboard (the server calls setGameScore).
Telegram keeps the scoreboard and posts a message for every new personal best; /top shows it.
"""
from typing import Final

from psycopg_pool import AsyncConnectionPool

# The ids are both the game short names at @BotFather and the server's GROUP_GAMES (api/_lib/games.ts).
GAMES: Final[list[dict[str, str]]] = [
    {"id": "wordle", "de": "Wordle", "en": "Wordle"},
    {"id": "hangman", "de": "Galgenmännchen", "en": "Hangman"},
    {"id": "vocab", "de": "Wortquiz", "en": "Word quiz"},
]

SCHEMA: Final[str] = """
CREATE TABLE IF NOT EXISTS group_games (
    chat_id bigint NOT NULL,
    game text NOT NULL,
    message_id bigint NOT NULL,
    posted_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (chat_id, game)
)
"""

TOP_LIMIT: Final[int] = 10


def find_game(game_id: str | None) -> dict | None:
    return next((entry for entry in GAMES if entry["id"] == (game_id or "").lower()), None)


def game_name(game_id: str, lang: str) -> str:
    entry = find_game(game_id)
    return (entry.get(lang) or entry["en"]) if entry else game_id


async def remember_game(pool: AsyncConnectionPool, chat_id: int, game: str, message_id: int) -> None:
    """The latest game message per chat and game, whose scoreboard /top reads."""
    async with pool.connection() as connection:
        await connection.execute(
            "INSERT INTO group_games (chat_id, game, message_id) VALUES (%s, %s, %s) "
            "ON CONFLICT (chat_id, game) DO UPDATE SET message_id = EXCLUDED.message_id, posted_at = now()",
            (chat_id, game, message_id),
        )


async def posted_games(pool: AsyncConnectionPool, chat_id: int) -> list[dict]:
    async with pool.connection() as connection:
        rows = await (await connection.execute("SELECT game, message_id FROM group_games WHERE chat_id = %s ORDER BY posted_at DESC", (chat_id,))).fetchall()
    return [dict(row) for row in rows]


def format_top(name: str, scores: list, limit: int = TOP_LIMIT) -> str:
    """One scoreboard as lines: `🥇 Anna – 600`; medals for the first three places."""
    medals = {1: "🥇", 2: "🥈", 3: "🥉"}
    lines = [f"<b>{name}</b>"]
    for entry in scores[:limit]:
        position = getattr(entry, "position", None) or entry["position"]
        user = getattr(entry, "user", None) or entry["user"]
        first_name = getattr(user, "first_name", None) if not isinstance(user, dict) else user.get("first_name")
        score = getattr(entry, "score", None) if not isinstance(entry, dict) else entry["score"]
        lines.append(f"{medals.get(position, f'{position}.')} {escape(first_name or '–')} – {score}")
    return "\n".join(lines)


def escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

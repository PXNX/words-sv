"""Scribble in a Telegram group: players take turns drawing a word, the others guess it.

The game message (sendGame "scribble") is the table. Pressing Play joins the game; the player whose
turn it is gets WordCircle's drawing page (with a session, like the other group games), picks one of
three words and draws it. WordCircle's server posts the drawing as a photo and opens the round
(server/games/scribble.ts). Everybody else guesses by replying to the photo - the bot sees replies to
its messages even with privacy mode on. The first right guess scores, so does the drawer; points go
on the game's scoreboard (setGameScore). After a right guess or ROUND_SECONDS the turn passes to the
next player in the order they joined; a drawer who does not draw within TURN_SECONDS is skipped.

The tables (wordcircle_scribble_*) live in the same database as WordCircle's server, which creates
them (database-schema.sql); the bot creates them too, so either may start first.
"""
import json
import logging
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from html import escape
from typing import Final

from psycopg_pool import AsyncConnectionPool

logger = logging.getLogger(__name__)

ROUND_SECONDS: Final[int] = 120
TURN_SECONDS: Final[int] = 180
GUESS_POINTS: Final[int] = 100
DRAWER_POINTS: Final[int] = 50

SCHEMA: Final[str] = """
CREATE TABLE IF NOT EXISTS wordcircle_scribble_players (
  chat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  first_name VARCHAR(64) NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);
CREATE TABLE IF NOT EXISTS wordcircle_scribble_state (
  chat_id BIGINT NOT NULL PRIMARY KEY,
  game_message_id BIGINT NOT NULL,
  drawer_id BIGINT NULL,
  turn_started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wordcircle_scribble_rounds (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  game_message_id BIGINT NOT NULL,
  photo_message_id BIGINT NOT NULL,
  drawer_id BIGINT NOT NULL,
  drawer_name VARCHAR(64) NOT NULL DEFAULT '',
  word VARCHAR(64) NOT NULL,
  answers TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  solved_at TIMESTAMPTZ NULL,
  solved_by BIGINT NULL
);
CREATE INDEX IF NOT EXISTS wordcircle_scribble_rounds_photo_idx ON wordcircle_scribble_rounds (chat_id, photo_message_id);
"""

# --- Guesses (the same rules as the app's src/lib/scribble/scribble.ts) ---------------------------

ARTICLES: Final[set[str]] = {"der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "the", "a", "an", "to"}


def fold_guess(value: str) -> str:
    """Lowercase, without accents, punctuation or a leading article: "Die Äpfel!" -> "apfel"."""
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(char for char in text if not unicodedata.combining(char)).lower().replace("ß", "ss")
    text = re.sub(r"[^\w\s-]", " ", text)
    words = [word for word in text.split() if word]
    if len(words) > 1 and words[0] in ARTICLES:
        words.pop(0)
    return " ".join(words)


def edit_distance(left: str, right: str, limit: int = 3) -> int:
    if abs(len(left) - len(right)) > limit:
        return limit + 1
    previous = list(range(len(right) + 1))
    for i in range(1, len(left) + 1):
        current = [i]
        for j in range(1, len(right) + 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (left[i - 1] != right[j - 1])))
        if min(current) > limit:
            return limit + 1
        previous = current
    return previous[-1]


def check_guess(guess: str, answers: list[str]) -> str:
    """"right" for a match (one typo allowed from 6 letters), "close" when one or two letters off, else "wrong"."""
    folded = fold_guess(guess)
    if not folded:
        return "wrong"
    close = False
    for answer in answers:
        target = fold_guess(answer)
        if not target:
            continue
        if folded == target:
            return "right"
        distance = edit_distance(folded, target, 2)
        if distance == 1 and len(target) >= 6:
            return "right"
        if distance <= 2 and len(target) >= 4:
            close = True
    return "close" if close else "wrong"


def guess_points(seconds: float) -> int:
    """100 for a right guess, plus up to 100 for guessing fast."""
    left = max(0.0, min(1.0, 1 - seconds / ROUND_SECONDS))
    return GUESS_POINTS + round(100 * left)


def mention(user_id: int, name: str) -> str:
    return f'<a href="tg://user?id={int(user_id)}">{escape(name or "?")}</a>'


# --- Storage --------------------------------------------------------------------------------------

async def ensure_tables(pool: AsyncConnectionPool) -> None:
    async with pool.connection() as connection:
        for statement in SCHEMA.split(";"):
            if statement.strip():
                await connection.execute(statement)


async def join(pool: AsyncConnectionPool, chat_id: int, user_id: int, first_name: str) -> None:
    async with pool.connection() as connection:
        await connection.execute(
            "INSERT INTO wordcircle_scribble_players (chat_id, user_id, first_name) VALUES (%s, %s, %s) "
            "ON CONFLICT (chat_id, user_id) DO UPDATE SET first_name = EXCLUDED.first_name",
            (chat_id, user_id, (first_name or "")[:64]),
        )


async def get_state(pool: AsyncConnectionPool, chat_id: int) -> dict | None:
    async with pool.connection() as connection:
        row = await (await connection.execute("SELECT * FROM wordcircle_scribble_state WHERE chat_id = %s", (chat_id,))).fetchone()
    return dict(row) if row else None


async def set_table(pool: AsyncConnectionPool, chat_id: int, game_message_id: int) -> None:
    """A new Scribble game message in the chat: the table moves there, and the next Play press draws."""
    async with pool.connection() as connection:
        await connection.execute(
            "INSERT INTO wordcircle_scribble_state (chat_id, game_message_id, drawer_id) VALUES (%s, %s, NULL) "
            "ON CONFLICT (chat_id) DO UPDATE SET game_message_id = EXCLUDED.game_message_id, drawer_id = NULL, turn_started_at = now()",
            (chat_id, game_message_id),
        )


async def set_drawer(pool: AsyncConnectionPool, chat_id: int, drawer_id: int | None, game_message_id: int | None = None) -> None:
    async with pool.connection() as connection:
        if game_message_id is None:
            await connection.execute("UPDATE wordcircle_scribble_state SET drawer_id = %s, turn_started_at = now() WHERE chat_id = %s", (drawer_id, chat_id))
        else:
            await connection.execute(
                "INSERT INTO wordcircle_scribble_state (chat_id, game_message_id, drawer_id) VALUES (%s, %s, %s) "
                "ON CONFLICT (chat_id) DO UPDATE SET drawer_id = EXCLUDED.drawer_id, turn_started_at = now()",
                (chat_id, game_message_id, drawer_id),
            )


async def player_name(pool: AsyncConnectionPool, chat_id: int, user_id: int) -> str:
    async with pool.connection() as connection:
        row = await (await connection.execute("SELECT first_name FROM wordcircle_scribble_players WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))).fetchone()
    return row["first_name"] if row else ""


async def next_player(pool: AsyncConnectionPool, chat_id: int, after_user: int | None) -> dict | None:
    """The player after `after_user` in the order they joined, wrapping around."""
    async with pool.connection() as connection:
        rows = await (await connection.execute("SELECT user_id, first_name FROM wordcircle_scribble_players WHERE chat_id = %s ORDER BY joined_at, user_id", (chat_id,))).fetchall()
    players = [dict(row) for row in rows]
    if not players:
        return None
    ids = [player["user_id"] for player in players]
    if after_user not in ids:
        return players[0]
    return players[(ids.index(after_user) + 1) % len(players)]


async def running_round(pool: AsyncConnectionPool, chat_id: int) -> dict | None:
    async with pool.connection() as connection:
        row = await (await connection.execute(
            "SELECT * FROM wordcircle_scribble_rounds WHERE chat_id = %s AND solved_by IS NULL AND created_at > now() - make_interval(secs => %s) ORDER BY id DESC LIMIT 1",
            (chat_id, ROUND_SECONDS),
        )).fetchone()
    return dict(row) if row else None


async def round_for_photo(pool: AsyncConnectionPool, chat_id: int, photo_message_id: int) -> dict | None:
    async with pool.connection() as connection:
        row = await (await connection.execute(
            "SELECT * FROM wordcircle_scribble_rounds WHERE chat_id = %s AND photo_message_id = %s AND solved_by IS NULL", (chat_id, photo_message_id)
        )).fetchone()
    return dict(row) if row else None


async def close_round(pool: AsyncConnectionPool, round_id: int, solved_by: int) -> bool:
    """Closes a round once (compare-and-set): False when someone else was faster or time ran out."""
    async with pool.connection() as connection:
        cursor = await connection.execute("UPDATE wordcircle_scribble_rounds SET solved_by = %s, solved_at = now() WHERE id = %s AND solved_by IS NULL", (solved_by, round_id))
    return cursor.rowcount == 1


async def add_points(pool: AsyncConnectionPool, chat_id: int, user_id: int, first_name: str, points: int) -> int:
    async with pool.connection() as connection:
        row = await (await connection.execute(
            "INSERT INTO wordcircle_scribble_players (chat_id, user_id, first_name, points) VALUES (%s, %s, %s, %s) "
            "ON CONFLICT (chat_id, user_id) DO UPDATE SET points = wordcircle_scribble_players.points + EXCLUDED.points RETURNING points",
            (chat_id, user_id, (first_name or "")[:64], points),
        )).fetchone()
    return int(row["points"])


async def expired_rounds(pool: AsyncConnectionPool) -> list[dict]:
    async with pool.connection() as connection:
        rows = await (await connection.execute(
            "SELECT * FROM wordcircle_scribble_rounds WHERE solved_by IS NULL AND created_at <= now() - make_interval(secs => %s)", (ROUND_SECONDS,)
        )).fetchall()
    return [dict(row) for row in rows]


async def idle_turns(pool: AsyncConnectionPool) -> list[dict]:
    """Turns whose drawer has not sent a drawing within TURN_SECONDS."""
    async with pool.connection() as connection:
        rows = await (await connection.execute(
            "SELECT s.* FROM wordcircle_scribble_state s WHERE s.drawer_id IS NOT NULL AND s.turn_started_at <= now() - make_interval(secs => %s) "
            "AND NOT EXISTS (SELECT 1 FROM wordcircle_scribble_rounds r WHERE r.chat_id = s.chat_id AND r.created_at >= s.turn_started_at)",
            (TURN_SECONDS,),
        )).fetchall()
    return [dict(row) for row in rows]


def round_answers(round_row: dict) -> list[str]:
    try:
        answers = json.loads(round_row.get("answers") or "[]")
    except ValueError:
        answers = []
    return [answer for answer in answers if isinstance(answer, str)] or [round_row.get("word", "")]


def seconds_since(moment: datetime) -> float:
    return (datetime.now(timezone.utc) - moment).total_seconds() if moment else float(ROUND_SECONDS)


def turn_is_stale(state: dict) -> bool:
    started = state.get("turn_started_at")
    return bool(started) and datetime.now(timezone.utc) - started > timedelta(seconds=TURN_SECONDS)

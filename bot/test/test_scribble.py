import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bot"))

from scribble import ROUND_SECONDS, check_guess, edit_distance, fold_guess, guess_points, mention, round_answers


def test_fold_like_the_app():
    assert fold_guess("Die Äpfel!") == "apfel"
    assert fold_guess("  the  Dog ") == "dog"
    assert fold_guess("Straße") == "strasse"


def test_guesses_like_the_app():
    assert check_guess("der apfel", ["Apfel", "apple"]) == "right"
    assert check_guess("APPLE", ["Apfel", "apple"]) == "right"
    assert check_guess("Kartofel", ["Kartoffel"]) == "right"
    assert check_guess("Hunt", ["Hund"]) == "close"
    assert check_guess("Katze", ["Hund"]) == "wrong"
    assert check_guess("", ["Hund"]) == "wrong"


def test_edit_distance():
    assert edit_distance("kitten", "sitting") == 3
    assert edit_distance("a", "abcdefgh", 2) == 3


def test_points_and_mentions():
    assert guess_points(0) == 200
    assert guess_points(ROUND_SECONDS) == 100
    assert mention(5, "<Ana>") == '<a href="tg://user?id=5">&lt;Ana&gt;</a>'


def test_round_answers_fall_back_to_the_word():
    assert round_answers({"answers": '["Apfel", "apple"]', "word": "der Apfel"}) == ["Apfel", "apple"]
    assert round_answers({"answers": "broken", "word": "der Apfel"}) == ["der Apfel"]


import os

import pytest


@pytest.mark.asyncio
async def test_turns_rounds_and_points_in_the_database():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is not set")
    import scribble
    from store import connect

    pool = await connect(url)
    chat = -4242
    try:
        async with pool.connection() as connection:
            for table in ("wordcircle_scribble_players", "wordcircle_scribble_state", "wordcircle_scribble_rounds"):
                await connection.execute(f"DELETE FROM {table} WHERE chat_id = %s", (chat,))
        await scribble.set_table(pool, chat, 10)
        for user, name in ((1, "Ana"), (2, "Ben"), (3, "Cem")):
            await scribble.join(pool, chat, user, name)
        await scribble.set_drawer(pool, chat, 1)
        assert (await scribble.get_state(pool, chat))["drawer_id"] == 1
        assert (await scribble.next_player(pool, chat, 1))["user_id"] == 2
        assert (await scribble.next_player(pool, chat, 3))["user_id"] == 1
        assert await scribble.running_round(pool, chat) is None

        async with pool.connection() as connection:
            await connection.execute(
                "INSERT INTO wordcircle_scribble_rounds (chat_id, game_message_id, photo_message_id, drawer_id, drawer_name, word, answers) VALUES (%s, 10, 20, 1, 'Ana', 'der Apfel', %s)",
                (chat, '["Apfel", "apple"]'),
            )
        found = await scribble.round_for_photo(pool, chat, 20)
        assert found and scribble.round_answers(found) == ["Apfel", "apple"]
        assert (await scribble.running_round(pool, chat))["id"] == found["id"]
        assert await scribble.close_round(pool, found["id"], 2) is True
        assert await scribble.close_round(pool, found["id"], 3) is False
        assert await scribble.add_points(pool, chat, 2, "Ben", 150) == 150
        assert await scribble.add_points(pool, chat, 2, "Ben", 100) == 250
        assert await scribble.idle_turns(pool) == [] or all(row["chat_id"] != chat for row in await scribble.idle_turns(pool))

        async with pool.connection() as connection:
            await connection.execute(
                "INSERT INTO wordcircle_scribble_rounds (chat_id, game_message_id, photo_message_id, drawer_id, word, answers, created_at) VALUES (%s, 10, 21, 2, 'Hund', '[]', now() - interval '10 minutes')",
                (chat,),
            )
        assert any(row["chat_id"] == chat and row["photo_message_id"] == 21 for row in await scribble.expired_rounds(pool))
    finally:
        await pool.close()

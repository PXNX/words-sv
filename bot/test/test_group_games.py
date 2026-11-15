import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bot"))

from games import GAMES, find_game, format_top, game_name
from texts import TEXTS


def test_games_match_the_server():
    server = (Path(__file__).resolve().parents[2] / "server" / "_lib" / "games.ts").read_text(encoding="utf-8")
    assert "export const GROUP_GAMES = ['wordle', 'hangman', 'vocab', 'scribble'] as const;" in server
    assert [game["id"] for game in GAMES] == ["wordle", "hangman", "vocab", "scribble"]


def test_find_and_name():
    assert find_game("WORDLE")["id"] == "wordle"
    assert find_game("chess") is None
    assert game_name("hangman", "de") == "Galgenmännchen"


def test_format_top_with_medals_and_escaping():
    scores = [SimpleNamespace(position=1, score=600, user=SimpleNamespace(first_name="Anna")), SimpleNamespace(position=4, score=100, user=SimpleNamespace(first_name="<b>"))]
    assert format_top("Wordle", scores) == "<b>Wordle</b>\n🥇 Anna – 600\n4. &lt;b&gt; – 100"


def test_texts_in_both_languages():
    for key in ("games_only_groups", "games_unavailable", "games_pick_group", "games_no_scores"):
        assert key in TEXTS["de"] and key in TEXTS["en"]


def test_matching_games():
    from games import matching_games
    assert [g["id"] for g in matching_games("", "en")] == ["wordle", "hangman", "vocab", "scribble"]
    assert [g["id"] for g in matching_games("games", "de")] == ["wordle", "hangman", "vocab", "scribble"]
    assert [g["id"] for g in matching_games("galgen", "de")] == ["hangman"]
    assert [g["id"] for g in matching_games("quiz", "en")] == ["vocab"]
    assert matching_games("chess", "en") == []


class FakeInlineQuery:
    """Refuses any answer that contains a game Telegram does not know, like answerInlineQuery does."""

    def __init__(self, registered):
        self.registered = set(registered)
        self.query = ""
        self.from_user = SimpleNamespace(language_code="en")
        self.answered = None
        self.tries = 0

    async def answer(self, results, cache_time=0):
        from telegram.error import BadRequest
        self.tries += 1
        if any(result.game_short_name not in self.registered for result in results):
            raise BadRequest("Game_invalid")
        self.answered = [result.game_short_name for result in results]


@pytest.mark.asyncio
async def test_inline_offers_only_real_games_and_remembers_missing_ones():
    from group_games import inline_games
    context = SimpleNamespace(bot_data={})
    query = FakeInlineQuery(["wordle", "hangman", "scribble"])
    await inline_games(SimpleNamespace(inline_query=query), context)
    assert query.answered == ["wordle", "hangman", "scribble"]
    assert set(context.bot_data["missing_games"]) == {"vocab"}
    # The next query goes through at once, without the missing game.
    again = FakeInlineQuery(["wordle", "hangman", "scribble"])
    await inline_games(SimpleNamespace(inline_query=again), context)
    assert again.answered == ["wordle", "hangman", "scribble"] and again.tries == 1


@pytest.mark.asyncio
async def test_inline_with_no_registered_game_answers_empty():
    from group_games import inline_games
    query = FakeInlineQuery([])
    await inline_games(SimpleNamespace(inline_query=query), SimpleNamespace(bot_data={}))
    assert query.answered == []

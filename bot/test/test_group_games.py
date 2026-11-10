import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bot"))

from games import GAMES, find_game, format_top, game_name
from texts import TEXTS


def test_games_match_the_server():
    server = (Path(__file__).resolve().parents[2] / "api" / "_lib" / "games.ts").read_text(encoding="utf-8")
    assert "export const GROUP_GAMES = ['wordle', 'hangman', 'vocab'] as const;" in server
    assert [game["id"] for game in GAMES] == ["wordle", "hangman", "vocab"]


def test_find_and_name():
    assert find_game("WORDLE")["id"] == "wordle"
    assert find_game("chess") is None
    assert game_name("hangman", "de") == "Galgenmännchen"


def test_format_top_with_medals_and_escaping():
    scores = [SimpleNamespace(position=1, score=600, user=SimpleNamespace(first_name="Anna")), SimpleNamespace(position=4, score=100, user=SimpleNamespace(first_name="<b>"))]
    assert format_top("Wordle", scores) == "<b>Wordle</b>\n🥇 Anna – 600\n4. &lt;b&gt; – 100"


def test_texts_in_both_languages():
    for key in ("games_menu", "games_only_groups", "games_unavailable", "games_no_scores", "games_welcome"):
        assert key in TEXTS["de"] and key in TEXTS["en"]

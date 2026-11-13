import sys
from pathlib import Path
from types import SimpleNamespace

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
    for key in ("games_menu", "games_only_groups", "games_unavailable", "games_not_registered", "games_show", "games_pick_group", "games_play", "games_scribble_button", "games_no_scores", "games_welcome"):
        assert key in TEXTS["de"] and key in TEXTS["en"]


def test_matching_games():
    from games import matching_games
    assert [g["id"] for g in matching_games("", "en")] == ["wordle", "hangman", "vocab"]
    assert [g["id"] for g in matching_games("games", "de")] == ["wordle", "hangman", "vocab"]
    assert [g["id"] for g in matching_games("galgen", "de")] == ["hangman"]
    assert [g["id"] for g in matching_games("quiz", "en")] == ["vocab"]
    assert matching_games("chess", "en") == []


def test_article_results_carry_logo_name_and_play_link():
    from group_games import article_results
    from games import GAMES
    results = article_results([game for game in GAMES if game["id"] != "scribble"], "de")
    assert [r.title for r in results] == ["Wordle", "Galgenmännchen", "Wortquiz"]
    assert results[0].thumbnail_url.endswith("/telegram/game-wordle.png")
    assert results[1].reply_markup.inline_keyboard[0][0].url.endswith("/hangman")
    assert all(r.description for r in results)

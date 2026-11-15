"""The group side of the bot. It only ever posts Telegram game messages (photo, Play button and the
group's scoreboard), nothing else: /games posts the games, /games <id> or /scribble one of them, and
typing @word_circle_bot in any chat offers them as inline game results. Play opens the mode with a
session; /top shows the scoreboards. See games.py for how the scores get there. Scribble's guesses
are typed on its page, never in the chat."""
import logging
from itertools import combinations
from time import monotonic

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, InlineQueryResultGame, Update
from telegram.constants import ChatType
from telegram.error import BadRequest, TelegramError
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, ContextTypes, InlineQueryHandler

from bridge import open_game
from games import GAMES, find_game, format_top, game_name, matching_games, posted_games, remember_game
from texts import lang_of, t

logger = logging.getLogger(__name__)

# A game Telegram did not know (not created with @BotFather yet) is tried again after this long.
MISSING_RETRY_SECONDS = 600


def _lang(update: Update) -> str:
    return lang_of(update.effective_user.language_code if update.effective_user else None)


def _is_group(update: Update) -> bool:
    return bool(update.effective_chat and update.effective_chat.type in (ChatType.GROUP, ChatType.SUPERGROUP))


def _not_registered(error: BadRequest) -> bool:
    text = str(error).lower()
    return "game_invalid" in text or "game short name" in text or "game_shortname" in text


def _missing(context: ContextTypes.DEFAULT_TYPE) -> dict[str, float]:
    """Games Telegram rejected, with when; forgotten after MISSING_RETRY_SECONDS so registering one is picked up."""
    missing = context.bot_data.setdefault("missing_games", {})
    now = monotonic()
    for game_id in [game_id for game_id, at in missing.items() if now - at >= MISSING_RETRY_SECONDS]:
        del missing[game_id]
    return missing


async def post_game(update: Update, context: ContextTypes.DEFAULT_TYPE, game_id: str) -> bool:
    """Posts one game message; a game not created with @BotFather yet is only logged, never announced."""
    chat = update.effective_chat
    try:
        message = await context.bot.send_game(chat.id, game_id)
    except BadRequest as error:
        if not _not_registered(error):
            raise
        logger.error("Game %r is not registered with @BotFather (/newgame)", game_id)
        _missing(context)[game_id] = monotonic()
        return False
    await remember_game(context.bot_data["db"], chat.id, game_id, message.message_id)
    return True


async def games_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/games in a group posts every game, /games <id> (or /game <id>) just that one. In a private
    chat a button picks a group and offers the games there inline."""
    if not _is_group(update):
        button = InlineKeyboardButton(t(_lang(update), "games_pick_group"), switch_inline_query="")
        await update.message.reply_text(t(_lang(update), "games_only_groups"), reply_markup=InlineKeyboardMarkup([[button]]))
        return
    game = find_game(context.args[0]) if context.args else None
    for entry in [game] if game else GAMES:
        await post_game(update, context, entry["id"])


async def scribble_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/scribble: posts the Scribble game; Play joins, and players take turns drawing."""
    if not _is_group(update):
        await update.message.reply_text(t(_lang(update), "games_only_groups"))
        return
    await post_game(update, context, "scribble")


async def inline_games(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inline results for @word_circle_bot: every matching game as a real Telegram game (photo, title
    and description from @BotFather, Play button and leaderboard). One unregistered game makes
    Telegram refuse the whole answer, so smaller sets are tried until one goes through; a refused
    answer does not use up the query."""
    query = update.inline_query
    lang = lang_of(query.from_user.language_code)
    missing = _missing(context)
    games = [entry["id"] for entry in matching_games(query.query, lang) if entry["id"] not in missing]
    for size in range(len(games), 0, -1):
        for subset in combinations(games, size):
            try:
                await query.answer([InlineQueryResultGame(id=game_id, game_short_name=game_id) for game_id in subset], cache_time=300)
            except BadRequest as error:
                if not _not_registered(error):
                    raise
                continue
            for game_id in set(games) - set(subset):
                logger.error("Game %r is not registered with @BotFather (/newgame)", game_id)
                missing[game_id] = monotonic()
            return
    await query.answer([], cache_time=60)


async def play(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """The Play button of a game message: answered with the mode's link and a fresh session."""
    query = update.callback_query
    lang = lang_of(query.from_user.language_code)
    message = query.message
    url = await open_game(
        query.game_short_name,
        query.from_user.id,
        query.from_user.first_name,
        message.chat.id if message else None,
        message.message_id if message else None,
        query.inline_message_id,
    )
    if url:
        await query.answer(url=url)
    else:
        await query.answer(t(lang, "games_unavailable"), show_alert=True)


async def top(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/top: the scoreboard of every game posted in this group (or just /top <id>)."""
    lang = _lang(update)
    if not _is_group(update):
        await update.message.reply_text(t(lang, "games_only_groups"))
        return
    wanted = find_game(context.args[0]) if context.args else None
    boards = []
    for posted in await posted_games(context.bot_data["db"], update.effective_chat.id):
        if wanted and posted["game"] != wanted["id"]:
            continue
        try:
            scores = await context.bot.get_game_high_scores(update.effective_user.id, chat_id=update.effective_chat.id, message_id=posted["message_id"])
        except TelegramError as error:
            logger.info("No scoreboard for %s in %s: %s", posted["game"], update.effective_chat.id, error)
            continue
        if scores:
            boards.append(format_top(game_name(posted["game"], lang), list(scores)))
    await update.message.reply_text("\n\n".join(boards) if boards else t(lang, "games_no_scores"))


def register_group_games(app: Application):
    app.add_handler(CommandHandler(["games", "game", "spiele", "spiel"], games_command))
    app.add_handler(CommandHandler(["top", "leaderboard", "bestenliste"], top))
    app.add_handler(InlineQueryHandler(inline_games))
    app.add_handler(CommandHandler(["scribble", "zeichnen", "draw"], scribble_command))

    # Play presses carry the game's short name instead of callback data.
    app.add_handler(CallbackQueryHandler(play, game_pattern="^(" + "|".join(entry["id"] for entry in GAMES) + ")$"))

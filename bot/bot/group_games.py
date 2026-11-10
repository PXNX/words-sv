"""The group side of the bot: /games posts a WordCircle game, Play opens it with a session, /top shows
the scoreboards, and joining a group explains both. See games.py for how the scores get there."""
import logging

from telegram import ChatMemberUpdated, InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ChatMemberStatus, ChatType
from telegram.error import TelegramError
from telegram.ext import Application, CallbackQueryHandler, ChatMemberHandler, CommandHandler, ContextTypes

from bridge import open_game
from games import GAMES, find_game, format_top, game_name, posted_games, remember_game
from texts import lang_of, t

logger = logging.getLogger(__name__)


def _lang(update: Update) -> str:
    return lang_of(update.effective_user.language_code if update.effective_user else None)


def _is_group(update: Update) -> bool:
    return bool(update.effective_chat and update.effective_chat.type in (ChatType.GROUP, ChatType.SUPERGROUP))


async def post_game(update: Update, context: ContextTypes.DEFAULT_TYPE, game_id: str) -> None:
    chat = update.effective_chat
    message = await context.bot.send_game(chat.id, game_id)
    await remember_game(context.bot_data["db"], chat.id, game_id, message.message_id)


async def games_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/games: a button per game; /games <id> or /game <id> posts that one directly."""
    lang = _lang(update)
    if not _is_group(update):
        await update.message.reply_text(t(lang, "games_only_groups"))
        return
    game = find_game(context.args[0]) if context.args else None
    if game:
        await post_game(update, context, game["id"])
        return
    buttons = [[InlineKeyboardButton(f"🎮 {game_name(entry['id'], lang)}", callback_data=f"game:{entry['id']}")] for entry in GAMES]
    await update.message.reply_text(t(lang, "games_menu"), reply_markup=InlineKeyboardMarkup(buttons))


async def game_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    game = find_game(query.data.split(":", 1)[1])
    await query.answer()
    if game and _is_group(update):
        await post_game(update, context, game["id"])


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


async def joined(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """The bot was added to a group: say what it does there."""
    change: ChatMemberUpdated = update.my_chat_member
    if change.chat.type not in (ChatType.GROUP, ChatType.SUPERGROUP):
        return
    if change.new_chat_member.status in (ChatMemberStatus.MEMBER, ChatMemberStatus.ADMINISTRATOR) and change.old_chat_member.status in (ChatMemberStatus.LEFT, ChatMemberStatus.BANNED):
        try:
            await context.bot.send_message(change.chat.id, t(lang_of(change.from_user.language_code if change.from_user else None), "games_welcome"))
        except TelegramError as error:
            logger.info("Could not greet group %s: %s", change.chat.id, error)


def register_group_games(app: Application):
    app.add_handler(CommandHandler(["games", "game", "spiele", "spiel"], games_command))
    app.add_handler(CommandHandler(["top", "leaderboard", "bestenliste"], top))
    app.add_handler(CallbackQueryHandler(game_button, pattern=r"^game:[a-z]+$"))
    # Play presses carry the game's short name instead of callback data.
    app.add_handler(CallbackQueryHandler(play, game_pattern="^(" + "|".join(entry["id"] for entry in GAMES) + ")$"))
    app.add_handler(ChatMemberHandler(joined, ChatMemberHandler.MY_CHAT_MEMBER))

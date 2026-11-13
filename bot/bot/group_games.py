"""The group side of the bot: /games opens the list of WordCircle games as inline results (logo, name,
description, like search results), picking one posts it, Play opens it with a session, /top shows the
scoreboards, and joining a group explains all that. See games.py for how the scores get there."""
import logging
from html import escape
from time import monotonic

from telegram import (
    ChatMemberUpdated,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InlineQueryResultArticle,
    InlineQueryResultGame,
    InputTextMessageContent,
    ReplyParameters,
    Update,
)
from telegram.constants import ChatMemberStatus, ChatType
from telegram.error import BadRequest, TelegramError
from telegram.ext import Application, CallbackQueryHandler, ChatMemberHandler, CommandHandler, ContextTypes, InlineQueryHandler, MessageHandler, filters

import scribble

from bridge import open_game
from games import GAMES, find_game, format_top, game_about, game_name, matching_games, posted_games, remember_game
from settings.config import WORDS_URL
from texts import lang_of, t

logger = logging.getLogger(__name__)

GAMES_RETRY_SECONDS = 600


def _lang(update: Update) -> str:
    return lang_of(update.effective_user.language_code if update.effective_user else None)


def _is_group(update: Update) -> bool:
    return bool(update.effective_chat and update.effective_chat.type in (ChatType.GROUP, ChatType.SUPERGROUP))


async def post_game(update: Update, context: ContextTypes.DEFAULT_TYPE, game_id: str) -> None:
    chat = update.effective_chat
    try:
        message = await context.bot.send_game(chat.id, game_id)
        if game_id == "scribble":
            await scribble.set_table(context.bot_data["db"], chat.id, message.message_id)
    except BadRequest as error:
        # Every game has to be created once with @BotFather (/newgame) under its id.
        if "game short name" not in str(error).lower():
            raise
        logger.error("Game %r is not registered with @BotFather (/newgame)", game_id)
        await context.bot.send_message(chat.id, t(_lang(update), "games_not_registered"))
        return
    await remember_game(context.bot_data["db"], chat.id, game_id, message.message_id)


async def games_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/games: a button that lists the games as inline results right in the chat's input field;
    /games <id> or /game <id> posts that one directly. In a private chat the button picks a group."""
    lang = _lang(update)
    if not _is_group(update):
        button = InlineKeyboardButton(t(lang, "games_pick_group"), switch_inline_query="games")
        await update.message.reply_text(t(lang, "games_only_groups"), reply_markup=InlineKeyboardMarkup([[button]]))
        return
    game = find_game(context.args[0]) if context.args else None
    if game:
        await post_game(update, context, game["id"])
        return
    button = InlineKeyboardButton(t(lang, "games_show"), switch_inline_query_current_chat="games")
    together = InlineKeyboardButton(t(lang, "games_scribble_button"), callback_data="game:scribble")
    await update.message.reply_text(t(lang, "games_menu"), reply_markup=InlineKeyboardMarkup([[button], [together]]))


async def scribble_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/scribble: posts the Scribble game; Play joins, and players take turns drawing."""
    if not _is_group(update):
        await update.message.reply_text(t(_lang(update), "games_only_groups"))
        return
    await post_game(update, context, "scribble")


def thumbnail_url(game_id: str) -> str:
    return f"{WORDS_URL.rstrip('/')}/telegram/game-{game_id}.png"


def article_results(games: list[dict], lang: str) -> list[InlineQueryResultArticle]:
    """The games as plain results: logo, name and description; picking one posts a card that opens the
    game in WordCircle. Used until the games are registered with @BotFather (then they are real games)."""
    results = []
    for entry in games:
        name, about = game_name(entry["id"], lang), game_about(entry["id"], lang)
        play = InlineKeyboardButton(t(lang, "games_play", name=name), url=f"{WORDS_URL.rstrip('/')}/{entry['id']}")
        results.append(InlineQueryResultArticle(
            id=entry["id"],
            title=name,
            description=about,
            thumbnail_url=thumbnail_url(entry["id"]),
            thumbnail_width=256,
            thumbnail_height=256,
            input_message_content=InputTextMessageContent(f"🎮 <b>{name}</b>\n{about}"),
            reply_markup=InlineKeyboardMarkup([[play]]),
        ))
    return results


async def inline_games(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inline results for @word_circle_bot (or the /games button): every game that matches the query.
    Registered games come as Telegram games (photo, title and description from @BotFather, Play button
    and the group's leaderboard); if Telegram does not know them yet, as articles with the same look."""
    query = update.inline_query
    lang = lang_of(query.from_user.language_code)
    games = matching_games(query.query, lang)
    # After a failure, try the real games again every few minutes, so registering them is picked up without a restart.
    if monotonic() - context.bot_data.get("games_failed_at", -GAMES_RETRY_SECONDS) >= GAMES_RETRY_SECONDS:
        try:
            await query.answer([InlineQueryResultGame(id=entry["id"], game_short_name=entry["id"]) for entry in games], cache_time=300)
            return
        except BadRequest as error:
            logger.error("Inline games failed (%s); register them with @BotFather (/newgame). Showing plain results.", error)
            context.bot_data["games_failed_at"] = monotonic()
    await query.answer(article_results(games, lang), cache_time=60)


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
    if query.game_short_name == "scribble" and not await scribble_play(query, context, lang):
        return
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


async def scribble_play(query, context: ContextTypes.DEFAULT_TYPE, lang: str) -> bool:
    """A Play press on Scribble: joins the game and says whether this player may draw now."""
    message = query.message
    if not message:
        await query.answer(t(lang, "scribble_groups_only"), show_alert=True)
        return False
    pool = context.bot_data["db"]
    chat_id, user = message.chat.id, query.from_user
    context.bot_data.setdefault("scribble_lang", {})[chat_id] = lang
    await scribble.join(pool, chat_id, user.id, user.first_name)
    state = await scribble.get_state(pool, chat_id)
    if not state or state["drawer_id"] is None:
        await scribble.set_drawer(pool, chat_id, user.id, message.message_id)
        return True
    running = await scribble.running_round(pool, chat_id)
    if state["drawer_id"] == user.id:
        if running:
            await query.answer(t(lang, "scribble_wait_guesses"), show_alert=True)
            return False
        return True
    # A drawer who went quiet loses the turn to whoever wants to draw.
    if scribble.turn_is_stale(state) and not running:
        await scribble.set_drawer(pool, chat_id, user.id)
        return True
    name = await scribble.player_name(pool, chat_id, state["drawer_id"])
    await query.answer(t(lang, "scribble_not_your_turn", name=name or "?"), show_alert=True)
    return False


async def scribble_next_turn(context: ContextTypes.DEFAULT_TYPE, chat_id: int, after_user: int, lang: str) -> None:
    """Passes the turn to the next player and calls them up under the game message."""
    pool = context.bot_data["db"]
    state = await scribble.get_state(pool, chat_id)
    nxt = await scribble.next_player(pool, chat_id, after_user)
    if not state or not nxt:
        return
    await scribble.set_drawer(pool, chat_id, nxt["user_id"])
    try:
        await context.bot.send_message(
            chat_id,
            t(lang, "scribble_next", who=scribble.mention(nxt["user_id"], nxt["first_name"])),
            reply_parameters=ReplyParameters(state["game_message_id"], allow_sending_without_reply=True),
        )
    except TelegramError as error:
        logger.info("Could not call up the next Scribble drawer in %s: %s", chat_id, error)


async def scribble_guess(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """A reply to a Scribble drawing: the first right guess wins the round."""
    message = update.message
    reply = message.reply_to_message if message else None
    if not reply or not reply.from_user or reply.from_user.id != context.bot.id or not message.text:
        return
    pool = context.bot_data["db"]
    chat_id, user = message.chat.id, message.from_user
    found = await scribble.round_for_photo(pool, chat_id, reply.message_id)
    if not found or user.id == found["drawer_id"]:
        return
    lang = lang_of(user.language_code)
    context.bot_data.setdefault("scribble_lang", {})[chat_id] = lang
    result = scribble.check_guess(message.text, scribble.round_answers(found))
    if result == "close":
        try:
            await message.set_reaction("🔥")
        except TelegramError:
            pass
        return
    if result != "right" or not await scribble.close_round(pool, found["id"], user.id):
        return
    context.bot_data.setdefault("scribble_skips", {})[chat_id] = 0
    points = scribble.guess_points(scribble.seconds_since(found["created_at"]))
    await scribble.join(pool, chat_id, user.id, user.first_name)
    totals = {
        user.id: await scribble.add_points(pool, chat_id, user.id, user.first_name, points),
        found["drawer_id"]: await scribble.add_points(pool, chat_id, found["drawer_id"], found["drawer_name"], scribble.DRAWER_POINTS),
    }
    for player, total in totals.items():
        try:
            await context.bot.set_game_score(player, total, chat_id=chat_id, message_id=found["game_message_id"], force=True)
        except TelegramError as error:
            logger.info("Scribble score for %s in %s not set: %s", player, chat_id, error)
    await message.reply_text(t(lang, "scribble_right", who=scribble.mention(user.id, user.first_name), word=escape(found["word"]), points=points, drawer=escape(found["drawer_name"] or "?"), drawer_points=scribble.DRAWER_POINTS))
    await scribble_next_turn(context, chat_id, found["drawer_id"], lang)


async def scribble_tick(context: ContextTypes.DEFAULT_TYPE):
    """Every few seconds: ends rounds nobody guessed and skips drawers who did not draw."""
    pool = context.bot_data.get("db")
    if pool is None:
        return
    langs = context.bot_data.setdefault("scribble_lang", {})
    skips = context.bot_data.setdefault("scribble_skips", {})
    try:
        for found in await scribble.expired_rounds(pool):
            if not await scribble.close_round(pool, found["id"], 0):
                continue
            lang = langs.get(found["chat_id"], "de")
            skips[found["chat_id"]] = 0
            try:
                await context.bot.send_message(found["chat_id"], t(lang, "scribble_timeout", word=escape(found["word"])), reply_parameters=ReplyParameters(found["photo_message_id"], allow_sending_without_reply=True))
            except TelegramError as error:
                logger.info("Could not end Scribble round in %s: %s", found["chat_id"], error)
            await scribble_next_turn(context, found["chat_id"], found["drawer_id"], lang)
        for state in await scribble.idle_turns(pool):
            chat_id = state["chat_id"]
            lang = langs.get(chat_id, "de")
            name = await scribble.player_name(pool, chat_id, state["drawer_id"])
            skips[chat_id] = skips.get(chat_id, 0) + 1
            nxt = await scribble.next_player(pool, chat_id, state["drawer_id"])
            # Everyone skipped once in a row (or nobody else is there): pause until someone presses Play.
            async with pool.connection() as connection:
                count = (await (await connection.execute("SELECT COUNT(*) AS n FROM wordcircle_scribble_players WHERE chat_id = %s", (chat_id,))).fetchone())["n"]
            if not nxt or nxt["user_id"] == state["drawer_id"] or skips[chat_id] >= count:
                skips[chat_id] = 0
                await scribble.set_drawer(pool, chat_id, None)
                text = t(lang, "scribble_paused")
            else:
                text = t(lang, "scribble_skipped", name=escape(name or "?"))
            try:
                await context.bot.send_message(chat_id, text, reply_parameters=ReplyParameters(state["game_message_id"], allow_sending_without_reply=True))
            except TelegramError as error:
                logger.info("Could not skip Scribble turn in %s: %s", chat_id, error)
            if text != t(lang, "scribble_paused"):
                await scribble_next_turn(context, chat_id, state["drawer_id"], lang)
    except Exception as error:
        logger.warning("Scribble tick failed: %s", error)


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
    app.add_handler(InlineQueryHandler(inline_games))
    app.add_handler(CommandHandler(["scribble", "zeichnen", "draw"], scribble_command))
    app.add_handler(MessageHandler(filters.ChatType.GROUPS & filters.REPLY & filters.TEXT & ~filters.COMMAND, scribble_guess))
    if app.job_queue:
        app.job_queue.run_repeating(scribble_tick, interval=15, first=15, name="scribble")
    # Play presses carry the game's short name instead of callback data.
    app.add_handler(CallbackQueryHandler(play, game_pattern="^(" + "|".join(entry["id"] for entry in GAMES) + ")$"))
    app.add_handler(ChatMemberHandler(joined, ChatMemberHandler.MY_CHAT_MEMBER))

"""
PTB-WORDS: Telegram bot for the WordCircle language app.

Opens WordCircle as a Mini App and takes voluntary Telegram Stars donations (no refunds).
The donation Mini App front-end and its endpoints run on Telegram Serverless, see ../miniapp.
"""
import logging
from datetime import datetime
from os import makedirs, path
from typing import Final

from telegram import BotCommand, BotCommandScopeAllGroupChats, BotCommandScopeChat, BotCommandScopeDefault, MenuButtonWebApp, Update, WebAppInfo
from telegram.ext import Application, ApplicationBuilder, Defaults
from telegram.constants import ParseMode

from handlers import register_handlers
from settings.config import ADMINS, CONTAINER, DATABASE_URL, TOKEN, WORDS_URL
from store import connect


def add_logging():
    """Configure logging based on environment (container or local)."""
    if CONTAINER:
        logging.basicConfig(
            format="%(asctime)s %(levelname)-5s %(funcName)-20s [%(filename)s:%(lineno)d]: %(message)s",
            encoding="utf-8",
            level=logging.INFO,
            datefmt='%Y-%m-%d %H:%M:%S',
            handlers=[logging.StreamHandler()]
        )
    else:
        log_filename: Final[str] = rf"../logs/{datetime.now().strftime('%Y-%m-%d/%H-%M-%S')}.log"
        makedirs(path.dirname(log_filename), exist_ok=True)
        logging.basicConfig(
            format="%(asctime)s %(levelname)-5s %(funcName)-20s [%(filename)s:%(lineno)d]: %(message)s",
            encoding="utf-8",
            filename=log_filename,
            level=logging.INFO,
            datefmt='%Y-%m-%d %H:%M:%S',
        )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)


COMMANDS: Final[dict[str, list[BotCommand]]] = {
    "de": [
        BotCommand("start", "WordCircle öffnen"),
        BotCommand("spenden", "Freiwillig mit Stars unterstützen"),
        BotCommand("paysupport", "Hilfe zu Zahlungen"),
        BotCommand("bedingungen", "Nutzungs- und Spendenbedingungen"),
        BotCommand("datenschutz", "Datenschutzerklärung"),
        BotCommand("impressum", "Impressum"),
        BotCommand("version", "App-Version und Neuigkeiten"),
    ],
    "en": [
        BotCommand("start", "Open WordCircle"),
        BotCommand("donate", "Support us with Stars"),
        BotCommand("paysupport", "Payment support"),
        BotCommand("terms", "Terms of use and donation"),
        BotCommand("privacy", "Privacy policy"),
        BotCommand("impressum", "Legal notice"),
        BotCommand("version", "App version and what's new"),
    ],
}


GROUP_COMMANDS: Final[dict[str, list[BotCommand]]] = {
    "de": [BotCommand("games", "WordCircle-Spiel in die Gruppe posten"), BotCommand("top", "Bestenliste der Gruppe")],
    "en": [BotCommand("games", "Post a WordCircle game to the group"), BotCommand("top", "The group's leaderboard")],
}


async def post_init(application: Application) -> None:
    application.bot_data["db"] = await connect(DATABASE_URL)
    bot = application.bot
    # Telegram Serverless manages a webhook once it is enabled for the bot; polling needs it gone.
    await bot.delete_webhook(drop_pending_updates=False)
    await bot.set_my_commands(COMMANDS["en"], scope=BotCommandScopeDefault())
    await bot.set_my_commands(COMMANDS["de"], scope=BotCommandScopeDefault(), language_code="de")
    # In groups the bot only plays: posting games and showing their scoreboards.
    await bot.set_my_commands(GROUP_COMMANDS["en"], scope=BotCommandScopeAllGroupChats())
    await bot.set_my_commands(GROUP_COMMANDS["de"], scope=BotCommandScopeAllGroupChats(), language_code="de")
    # Admins additionally see /set_cmd in their own chat's menu; it is never advertised publicly.
    admin_commands = COMMANDS["de"] + [BotCommand("set_cmd", "Profilbild, Name und Beschreibung setzen")]
    for admin_id in ADMINS:
        try:
            await bot.set_my_commands(admin_commands, scope=BotCommandScopeChat(admin_id))
        except Exception as e:
            logging.warning(f"[main] Could not set command menu for admin {admin_id}: {e}")
    await bot.set_chat_menu_button(menu_button=MenuButtonWebApp("WordCircle", WebAppInfo(WORDS_URL)))
    logging.info("[main] Commands and menu button set")


async def post_shutdown(application: Application) -> None:
    pool = application.bot_data.get("db")
    if pool is not None:
        await pool.close()


def main():
    add_logging()
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL is not set")
    app = (
        ApplicationBuilder()
        .token(TOKEN)
        .defaults(Defaults(parse_mode=ParseMode.HTML))
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )
    register_handlers(app)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()

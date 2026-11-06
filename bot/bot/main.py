"""
PTB-WORDS: Telegram bot for the WordCircle language app.

Opens WordCircle as a Mini App and takes voluntary Telegram Stars donations (no refunds).
The donation Mini App front-end and its endpoints run on Telegram Serverless, see ../miniapp.
"""
import logging
from datetime import datetime
from os import makedirs, path
from typing import Final

from telegram import BotCommand, BotCommandScopeChat, BotCommandScopeDefault, MenuButtonWebApp, Update, WebAppInfo
from telegram.ext import Application, ApplicationBuilder, Defaults
from telegram.constants import ParseMode

from handlers import register_handlers
from settings.config import ADMINS, CONTAINER, TOKEN, WORDS_URL


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


COMMANDS: Final[dict[str, list[BotCommand]]] = {
    "de": [
        BotCommand("start", "WordCircle öffnen"),
        BotCommand("spenden", "Freiwillig mit Stars unterstützen"),
        BotCommand("paysupport", "Hilfe zu Zahlungen"),
        BotCommand("bedingungen", "Nutzungs- und Spendenbedingungen"),
        BotCommand("datenschutz", "Datenschutzerklärung"),
        BotCommand("impressum", "Impressum"),
    ],
    "en": [
        BotCommand("start", "Open WordCircle"),
        BotCommand("donate", "Support us with Stars"),
        BotCommand("paysupport", "Payment support"),
        BotCommand("terms", "Terms of use and donation"),
        BotCommand("privacy", "Privacy policy"),
        BotCommand("impressum", "Legal notice"),
    ],
}


async def post_init(application: Application) -> None:
    bot = application.bot
    # Telegram Serverless manages a webhook once it is enabled for the bot; polling needs it gone.
    await bot.delete_webhook(drop_pending_updates=False)
    await bot.set_my_commands(COMMANDS["en"], scope=BotCommandScopeDefault())
    await bot.set_my_commands(COMMANDS["de"], scope=BotCommandScopeDefault(), language_code="de")
    # Admins additionally see /set_cmd in their own chat's menu; it is never advertised publicly.
    admin_commands = COMMANDS["de"] + [BotCommand("set_cmd", "Profilbild, Name und Beschreibung setzen")]
    for admin_id in ADMINS:
        try:
            await bot.set_my_commands(admin_commands, scope=BotCommandScopeChat(admin_id))
        except Exception as e:
            logging.warning(f"[main] Could not set command menu for admin {admin_id}: {e}")
    await bot.set_chat_menu_button(menu_button=MenuButtonWebApp("WordCircle", WebAppInfo(WORDS_URL)))
    logging.info("[main] Commands and menu button set")


def main():
    add_logging()
    app = (
        ApplicationBuilder()
        .token(TOKEN)
        .defaults(Defaults(parse_mode=ParseMode.HTML))
        .post_init(post_init)
        .build()
    )
    register_handlers(app)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()

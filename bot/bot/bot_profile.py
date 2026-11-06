"""
Bot appearance for PTB-WORDS, following ptb-suggest's private/setup.py.

Commands are refreshed on every start (main.py's post_init). Name, description, short description
and profile photo practically never change, so they are only set on demand with /set_cmd.
"""
import logging
from typing import Final

from telegram import Bot, InputProfilePhotoStatic, Update
from telegram.error import BadRequest
from telegram.ext import ContextTypes

from settings.config import RES_PATH

logger = logging.getLogger(__name__)

BOT_DISPLAY_NAME: Final[str] = "WordCircle"

# Shown in an empty chat before the user presses Start (max. 512 characters).
DESCRIPTION: Final[dict[str, str]] = {
    "de": (
        "WordCircle ist dein spielerisches Worttraining 🎯\n\n"
        "Wortkreis, Wordle, Hangman, Geschichten, Lesen, Hören, Aussprache und Grammatik – "
        "mit einer täglichen Aufgabe, deiner Serie und Glut für Serienschutz.\n\n"
        "Tippe auf Start und öffne die App. Kostenlos und ohne Werbung; "
        "freiwillig unterstützen kannst du mit Telegram Stars über /spenden."
    ),
    "en": (
        "WordCircle is your playful word training 🎯\n\n"
        "Word circle, Wordle, hangman, stories, reading, listening, pronunciation and grammar – "
        "with a daily challenge, your streak and embers that forge streak freezes.\n\n"
        "Press Start and open the app. Free and ad-free; "
        "you can support it voluntarily with Telegram Stars via /donate."
    ),
}

# The "info" line on the bot's profile and in link previews (max. 120 characters).
SHORT_DESCRIPTION: Final[dict[str, str]] = {
    "de": "Spielerisch Wörter lernen: Wortkreis, Wordle, Geschichten und eine tägliche Aufgabe. Kostenlos, ohne Werbung.",
    "en": "Learn words through play: word circle, Wordle, stories and a daily challenge. Free and ad-free.",
}


async def apply_profile(bot: Bot) -> list[str]:
    """Sets photo, name and descriptions; returns one error line per step that failed."""
    errors = []
    try:
        with open(f"{RES_PATH}/img/profile.jpg", "rb") as photo:
            await bot.set_my_profile_photo(InputProfilePhotoStatic(photo))
    except (FileNotFoundError, BadRequest) as e:
        errors.append(f"Profilbild: {e}")

    for language, code in (("en", None), ("de", "de")):
        try:
            await bot.set_my_name(BOT_DISPLAY_NAME, language_code=code)
            await bot.set_my_description(DESCRIPTION[language], language_code=code)
            await bot.set_my_short_description(SHORT_DESCRIPTION[language], language_code=code)
        except BadRequest as e:
            errors.append(f"Texte ({language}): {e}")

    for error in errors:
        logger.warning(f"[setup] {error}")
    return errors


async def set_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Restricted to admins via filters.Chat(ADMINS) in handlers.py, since it changes the bot's public profile."""
    errors = await apply_profile(context.bot)
    if errors:
        await update.message.reply_text("⚠️ Nicht alles konnte gesetzt werden:\n" + "\n".join(errors))
        return
    await update.message.reply_text(f"✅ Profilbild, Name („{BOT_DISPLAY_NAME}“), Beschreibung und Info aktualisiert!")
    logger.info("[setup] Bot profile updated")

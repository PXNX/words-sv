"""Commands, Stars invoices and payment confirmation."""
import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, LabeledPrice, Update, WebAppInfo
from telegram.constants import ParseMode
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, ContextTypes, MessageHandler, PreCheckoutQueryHandler, filters

from donations import CURRENCY, TIERS, build_payload, check_checkout, parse_payload
from settings.config import ADMINS, MINIAPP_URL, WORDS_URL
from bot_profile import set_cmd
from bridge import forward_start, is_bridge_payload
from store import record_donation
from texts import lang_of, t
from version import APP_VERSION

logger = logging.getLogger(__name__)

BRIDGE_RESULTS = {"reminders_on", "signed_in", "expired", "invited", "known", "own_invite", "unknown"}


def _lang(update: Update) -> str:
    return lang_of(update.effective_user.language_code if update.effective_user else None)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # t.me/word_circle_bot?start=donate jumps straight to the tiers, e.g. from the WordCircle app.
    if context.args and context.args[0] == "donate":
        await donate(update, context)
        return
    lang = _lang(update)
    # One-time links from the app: sign-in, reminders, invites.
    if context.args and is_bridge_payload(context.args[0]) and update.effective_user and update.effective_chat:
        result = await forward_start(context.args[0], update.effective_user.id, update.effective_chat.id)
        button = InlineKeyboardMarkup([[InlineKeyboardButton(t(lang, "open_app"), web_app=WebAppInfo(WORDS_URL))]])
        await update.message.reply_text(t(lang, f"bridge_{result}" if result in BRIDGE_RESULTS else "bridge_failed"), reply_markup=button)
        return
    rows = [[InlineKeyboardButton(t(lang, "open_app"), web_app=WebAppInfo(WORDS_URL))]]
    if MINIAPP_URL:
        rows.append([InlineKeyboardButton(t(lang, "open_donate_app"), web_app=WebAppInfo(MINIAPP_URL))])
    await update.message.reply_text(t(lang, "start"), parse_mode=ParseMode.HTML, reply_markup=InlineKeyboardMarkup(rows), disable_web_page_preview=True)


async def donate(update: Update, context: ContextTypes.DEFAULT_TYPE):
    lang = _lang(update)
    buttons = [InlineKeyboardButton(t(lang, "tier", amount=amount), callback_data=f"donate:{amount}") for amount in TIERS]
    keyboard = [buttons[:3], buttons[3:]]
    await update.message.reply_text(t(lang, "donate"), parse_mode=ParseMode.HTML, reply_markup=InlineKeyboardMarkup(keyboard), disable_web_page_preview=True)


async def send_invoice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    amount = int(query.data.split(":")[1])
    if amount not in TIERS:
        return
    lang = _lang(update)
    await context.bot.send_invoice(
        chat_id=query.message.chat_id,
        title=t(lang, "invoice_title"),
        description=t(lang, "invoice_description", amount=amount),
        payload=build_payload(amount, query.from_user.id),
        provider_token="",
        currency=CURRENCY,
        prices=[LabeledPrice(t(lang, "invoice_label"), amount)],
    )


async def pre_checkout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.pre_checkout_query
    reason = check_checkout(query.invoice_payload, query.currency, query.total_amount, query.from_user.id)
    if reason:
        logger.warning("Rejected checkout from %s: %s (%s)", query.from_user.id, reason, query.invoice_payload)
        await query.answer(ok=False, error_message=t(lang_of(query.from_user.language_code), "checkout_error"))
        return
    await query.answer(ok=True)


async def successful_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    payment = update.message.successful_payment
    donation = parse_payload(payment.invoice_payload)
    user = update.effective_user
    amount = payment.total_amount if donation is None else donation.amount
    stored = await record_donation(context.bot_data["db"], payment.telegram_payment_charge_id, user.id, amount)
    if not stored:
        return
    await update.message.reply_text(t(_lang(update), "thanks", amount=amount))
    for admin in ADMINS:
        try:
            await context.bot.send_message(admin, f"💛 Spende: {amount} ⭐ von {user.mention_html()} (ID {user.id})", parse_mode=ParseMode.HTML)
        except Exception as error:
            logger.warning("Could not notify admin %s: %s", admin, error)


async def paysupport(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(t(_lang(update), "paysupport"), parse_mode=ParseMode.HTML, disable_web_page_preview=True)


async def version(update: Update, context: ContextTypes.DEFAULT_TYPE):
    lang = _lang(update)
    if APP_VERSION is None:
        await update.message.reply_text(t(lang, "version_unknown"))
        return
    changelog = f"{WORDS_URL.rstrip('/')}/changelog#v{APP_VERSION}"
    await update.message.reply_text(t(lang, "version", version=APP_VERSION, changelog=changelog), parse_mode=ParseMode.HTML, disable_web_page_preview=True)


def _legal(key: str):
    async def reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text(t(_lang(update), key))
    return reply


def register_handlers(app: Application):
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler(["spenden", "donate"], donate))
    app.add_handler(CallbackQueryHandler(send_invoice, pattern=r"^donate:\d+$"))
    app.add_handler(PreCheckoutQueryHandler(pre_checkout))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment))
    app.add_handler(CommandHandler("paysupport", paysupport))
    app.add_handler(CommandHandler(["bedingungen", "terms"], _legal("legal_terms")))
    app.add_handler(CommandHandler(["datenschutz", "privacy"], _legal("legal_privacy")))
    app.add_handler(CommandHandler("impressum", _legal("legal_imprint")))
    app.add_handler(CommandHandler("version", version))
    app.add_handler(CommandHandler("set_cmd", set_cmd, filters.Chat(ADMINS)))

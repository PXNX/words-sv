"""User-facing bot texts: German first, English for everyone whose Telegram language is not German."""
from settings.config import LEGAL_BASE_URL, SUPPORT_CONTACT

LEGAL = {
    "terms": f"{LEGAL_BASE_URL}/bedingungen",
    "privacy": f"{LEGAL_BASE_URL}/datenschutz",
    "imprint": f"{LEGAL_BASE_URL}/impressum",
}

TEXTS = {
    "de": {
        "start": (
            "👋 <b>Willkommen bei WordCircle!</b>\n\n"
            "Lerne Wörter mit Spielen, Geschichten und einer täglichen Aufgabe – direkt hier in Telegram.\n\n"
            "💛 Mit /spenden kannst du die Entwicklung freiwillig mit Telegram Stars unterstützen.\n\n"
            "<a href=\"{terms}\">Bedingungen</a> · <a href=\"{privacy}\">Datenschutz</a> · <a href=\"{imprint}\">Impressum</a>"
        ),
        "open_app": "📚 WordCircle öffnen",
        "open_donate_app": "💛 Spenden-App öffnen",
        "donate": (
            "💛 <b>WordCircle unterstützen</b>\n\n"
            "Wähle einen Betrag in Telegram Stars. Eine Spende ist freiwillig, du erhältst dafür keine Gegenleistung, "
            "und sie wird <b>nicht erstattet</b>. Es gelten die <a href=\"{terms}\">Spendenbedingungen</a>."
        ),
        "tier": "⭐ {amount}",
        "invoice_title": "Spende an WordCircle",
        "invoice_description": "Freiwillige Spende über {amount} Stars ohne Gegenleistung. Keine Rückerstattung. Bedingungen: {terms}",
        "invoice_label": "Spende",
        "checkout_error": "Diese Spende konnte nicht geprüft werden. Bitte starte sie mit /spenden neu.",
        "thanks": "💛 Danke für deine Spende über {amount} ⭐! Du unterstützt damit die Weiterentwicklung von WordCircle.",
        "paysupport": (
            "🧾 <b>Hilfe zu Zahlungen</b>\n\n"
            "Spenden sind freiwillig und werden grundsätzlich <b>nicht erstattet</b> (<a href=\"{terms}\">Bedingungen</a>). "
            "Wurde wegen eines technischen Fehlers doppelt oder versehentlich gezahlt, schreib uns mit Datum und Betrag: {contact}"
        ),
        "legal_terms": "📄 Nutzungs- und Spendenbedingungen:\n{terms}",
        "legal_privacy": "🔒 Datenschutzerklärung:\n{privacy}",
        "legal_imprint": "ℹ️ Impressum:\n{imprint}",
    },
    "en": {
        "start": (
            "👋 <b>Welcome to WordCircle!</b>\n\n"
            "Learn words with games, stories and a daily challenge – right here in Telegram.\n\n"
            "💛 With /donate you can voluntarily support development with Telegram Stars.\n\n"
            "<a href=\"{terms}\">Terms</a> · <a href=\"{privacy}\">Privacy</a> · <a href=\"{imprint}\">Legal notice</a> (German)"
        ),
        "open_app": "📚 Open WordCircle",
        "open_donate_app": "💛 Open donation app",
        "donate": (
            "💛 <b>Support WordCircle</b>\n\n"
            "Pick an amount in Telegram Stars. A donation is voluntary, gives you nothing in return "
            "and is <b>not refunded</b>. The <a href=\"{terms}\">donation terms</a> (German) apply."
        ),
        "tier": "⭐ {amount}",
        "invoice_title": "Donation to WordCircle",
        "invoice_description": "Voluntary donation of {amount} Stars with nothing in return. No refunds. Terms: {terms}",
        "invoice_label": "Donation",
        "checkout_error": "This donation could not be verified. Please start it again with /donate.",
        "thanks": "💛 Thank you for your donation of {amount} ⭐! You are helping WordCircle grow.",
        "paysupport": (
            "🧾 <b>Payment support</b>\n\n"
            "Donations are voluntary and are <b>not refunded</b> (<a href=\"{terms}\">terms</a>). "
            "If a technical error charged you twice or by accident, contact us with the date and amount: {contact}"
        ),
        "legal_terms": "📄 Terms of use and donation:\n{terms}",
        "legal_privacy": "🔒 Privacy policy:\n{privacy}",
        "legal_imprint": "ℹ️ Legal notice:\n{imprint}",
    },
}


def lang_of(language_code: str | None) -> str:
    return "de" if (language_code or "").lower().startswith("de") else "en"


def t(lang: str, key: str, **values) -> str:
    return TEXTS[lang][key].format(**LEGAL, contact=SUPPORT_CONTACT, **values)

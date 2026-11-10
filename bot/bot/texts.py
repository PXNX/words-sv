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
        "games_menu": "🎮 Welches WordCircle-Spiel wollt ihr spielen? Jede Runde zählt für die Bestenliste dieser Gruppe.",
        "games_only_groups": "Spiele mit Bestenliste gibt es in Gruppen: Füge mich einer Gruppe hinzu und schreib dort /games.",
        "games_unavailable": "Das Spiel lässt sich gerade nicht öffnen. Bitte gleich noch einmal versuchen.",
        "games_no_scores": "Noch keine Punkte. Startet mit /games ein Spiel und tippt auf „Spielen“!",
        "games_welcome": "👋 Hallo! Mit /games postet ihr ein WordCircle-Spiel (Wordle, Galgenmännchen, Wortquiz). Wer auf „Spielen“ tippt, landet auf der Bestenliste der Gruppe – /top zeigt sie.",
        "bridge_signed_in": "✅ Angemeldet! Dein Lernfortschritt wird jetzt in deinem Telegram-Konto gespeichert. Geh zurück zu WordCircle.",
        "bridge_reminders_on": "🔔 Erinnerungen sind an. Ich schreibe dir, bevor deine Serie reißt.",
        "bridge_expired": "⌛ Dieser Link ist abgelaufen. Tippe in WordCircle noch einmal auf den Knopf.",
        "bridge_invited": "🎉 Willkommen! Deine Einladung wurde gutgeschrieben.",
        "bridge_known": "👋 Schön, dass du wieder da bist!",
        "bridge_own_invite": "😄 Das ist dein eigener Einladungslink – teile ihn mit Freunden.",
        "bridge_unknown": "🤔 Diesen Link kenne ich nicht.",
        "bridge_failed": "⚠️ WordCircle ist gerade nicht erreichbar. Bitte versuch es gleich noch einmal.",
        "version": "🏷️ WordCircle <b>v{version}</b>\n<a href=\"{changelog}\">Was ist neu?</a>",
        "version_unknown": "🏷️ Die Version ist auf diesem Server nicht bekannt.",
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
        "games_menu": "🎮 Which WordCircle game do you want to play? Every round counts for this group's leaderboard.",
        "games_only_groups": "Games with a leaderboard are for groups: add me to a group and send /games there.",
        "games_unavailable": "The game can't be opened right now. Please try again in a moment.",
        "games_no_scores": "No scores yet. Post a game with /games and tap “Play”!",
        "games_welcome": "👋 Hi! Post a WordCircle game with /games (Wordle, Hangman, Word quiz). Everyone who taps “Play” lands on the group's leaderboard – /top shows it.",
        "bridge_signed_in": "✅ Signed in! Your learning progress is now saved to your Telegram account. Head back to WordCircle.",
        "bridge_reminders_on": "🔔 Reminders are on. I'll message you before your streak breaks.",
        "bridge_expired": "⌛ This link has expired. Tap the button in WordCircle again.",
        "bridge_invited": "🎉 Welcome! Your invite has been counted.",
        "bridge_known": "👋 Good to see you again!",
        "bridge_own_invite": "😄 That's your own invite link – share it with friends.",
        "bridge_unknown": "🤔 I don't know this link.",
        "bridge_failed": "⚠️ WordCircle can't be reached right now. Please try again in a moment.",
        "version": "🏷️ WordCircle <b>v{version}</b>\n<a href=\"{changelog}\">What's new?</a>",
        "version_unknown": "🏷️ The version is not known on this server.",
    },
}


def lang_of(language_code: str | None) -> str:
    return "de" if (language_code or "").lower().startswith("de") else "en"


def t(lang: str, key: str, **values) -> str:
    return TEXTS[lang][key].format(**LEGAL, contact=SUPPORT_CONTACT, **values)

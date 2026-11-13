from json import loads
from os import getenv
from typing import Final, List

from dotenv import load_dotenv

load_dotenv()

TOKEN: Final[str] = getenv("TELEGRAM")
CONTAINER: Final[bool] = str(getenv("CONTAINER", "False")).lower() == "true"
ADMINS: Final[List[int]] = loads(getenv("ADMINS", "[]"))
RES_PATH: Final[str] = getenv("RES_PATH", "./res")

# PostgreSQL for the donation ledger, e.g. postgresql://user:password@host:5432/words
DATABASE_URL: Final[str] = getenv("DATABASE_URL", "")

# The WordCircle PWA, opened as the bot's Mini App from the menu button and /start.
WORDS_URL: Final[str] = getenv("WORDS_URL", "https://words-sv.vercel.app")
# The app's API server; the bot can reach it directly (e.g. http://words-api:3791) instead of going through the web app.
WORDS_API_URL: Final[str] = getenv("WORDS_API_URL", "") or WORDS_URL
# Shared with the app's server (its TELEGRAM_BRIDGE_SECRET), so it accepts the /start links the bot forwards.
BRIDGE_SECRET: Final[str] = getenv("TELEGRAM_BRIDGE_SECRET", "")
# The donation Mini App hosted on Telegram Serverless (https://app<id>.tgcloud.ai/); optional.
MINIAPP_URL: Final[str] = getenv("MINIAPP_URL", "")
# Impressum, Datenschutz and Bedingungen live in the WordCircle app.
LEGAL_BASE_URL: Final[str] = getenv("LEGAL_BASE_URL", WORDS_URL).rstrip("/")
SUPPORT_CONTACT: Final[str] = getenv("SUPPORT_CONTACT", f"{LEGAL_BASE_URL}/impressum")

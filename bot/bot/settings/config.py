from json import loads
from os import getenv
from typing import Final, List

from dotenv import load_dotenv

load_dotenv()

TOKEN: Final[str] = getenv("TELEGRAM")
CONTAINER: Final[bool] = str(getenv("CONTAINER", "False")).lower() == "true"
ADMINS: Final[List[int]] = loads(getenv("ADMINS", "[]"))
RES_PATH: Final[str] = getenv("RES_PATH", "./res")

# SQLite file for the donation ledger; inside the container it lives in the bind-mounted bot/ folder.
DB_PATH: Final[str] = getenv("DB_PATH", "data/donations.db")

# The WordCircle PWA, opened as the bot's Mini App from the menu button and /start.
WORDS_URL: Final[str] = getenv("WORDS_URL", "https://words-sv.vercel.app")
# The donation Mini App hosted on Telegram Serverless (https://app<id>.tgcloud.ai/); optional.
MINIAPP_URL: Final[str] = getenv("MINIAPP_URL", "")
# Impressum, Datenschutz and Bedingungen live in the WordCircle app.
LEGAL_BASE_URL: Final[str] = getenv("LEGAL_BASE_URL", WORDS_URL).rstrip("/")
SUPPORT_CONTACT: Final[str] = getenv("SUPPORT_CONTACT", f"{LEGAL_BASE_URL}/impressum")

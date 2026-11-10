"""Forwards the app's one-time /start links to WordCircle's server, which owns the device links.

`r_<code>` turns on streak reminders, `l_<code>` signs the device that made the code in (its progress
is saved to this Telegram account) and `i_<code>` credits a player's invite. The server answers what
happened (reminders_on, signed_in, expired, invited, known, own_invite, unknown) and the bot replies.
"""
import logging
import re

import httpx

from settings.config import BRIDGE_SECRET, WORDS_URL

logger = logging.getLogger(__name__)

PAYLOAD = re.compile(r"^[ril]_[A-Za-z0-9_-]{8,40}$")


def is_bridge_payload(payload: str) -> bool:
    return bool(PAYLOAD.match(payload))


async def forward_start(payload: str, user_id: int, chat_id: int, client: httpx.AsyncClient | None = None) -> str | None:
    """The server's result for a /start payload, or None when it could not be reached."""
    if not BRIDGE_SECRET:
        logger.warning("TELEGRAM_BRIDGE_SECRET is not set; cannot forward /start %s", payload[:2])
        return None
    own = client is None
    client = client or httpx.AsyncClient(timeout=10)
    try:
        response = await client.post(
            f"{WORDS_URL.rstrip('/')}/api/telegram/start",
            json={"payload": payload, "userId": user_id, "chatId": chat_id},
            headers={"Authorization": f"Bearer {BRIDGE_SECRET}"},
        )
        body = response.json()
        return body.get("result") if response.is_success and isinstance(body, dict) else None
    except (httpx.HTTPError, ValueError) as error:
        logger.warning("Forwarding /start failed: %s", error)
        return None
    finally:
        if own:
            await client.aclose()

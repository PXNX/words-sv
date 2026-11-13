"""Forwards the app's one-time /start links to WordCircle's server, which owns the device links.

`r_<code>` turns on streak reminders, `l_<code>` signs the device that made the code in (its progress
is saved to this Telegram account) and `i_<code>` credits a player's invite. The server answers what
happened (reminders_on, signed_in, expired, invited, known, own_invite, unknown) and the bot replies.
"""
import logging
import re

import httpx

from settings.config import BRIDGE_SECRET, WORDS_API_URL

logger = logging.getLogger(__name__)

PAYLOAD = re.compile(r"^[ril]_[A-Za-z0-9_-]{8,40}$")


def is_bridge_payload(payload: str) -> bool:
    return bool(PAYLOAD.match(payload))


async def post(path: str, data: dict, client: httpx.AsyncClient | None = None) -> dict | None:
    """POSTs to the app's server with the bridge secret; the JSON answer, or None on any failure."""
    if not BRIDGE_SECRET:
        logger.warning("TELEGRAM_BRIDGE_SECRET is not set; cannot call %s", path)
        return None
    own = client is None
    client = client or httpx.AsyncClient(timeout=10)
    try:
        response = await client.post(f"{WORDS_API_URL.rstrip('/')}{path}", json=data, headers={"Authorization": f"Bearer {BRIDGE_SECRET}"})
        body = response.json()
        return body if response.is_success and isinstance(body, dict) else None
    except (httpx.HTTPError, ValueError) as error:
        logger.warning("Calling %s failed: %s", path, error)
        return None
    finally:
        if own:
            await client.aclose()


async def forward_start(payload: str, user_id: int, chat_id: int, client: httpx.AsyncClient | None = None) -> str | None:
    """The server's result for a /start payload, or None when it could not be reached."""
    body = await post("/api/telegram/start", {"payload": payload, "userId": user_id, "chatId": chat_id}, client)
    return body.get("result") if body else None


async def open_game(game: str, user_id: int, first_name: str, chat_id: int | None, message_id: int | None, inline_message_id: str | None, client: httpx.AsyncClient | None = None) -> str | None:
    """The page a Play press opens (with its game session), or None when the server is not reachable."""
    data = {"game": game, "userId": user_id, "firstName": (first_name or "")[:64]}
    if inline_message_id:
        data["inlineMessageId"] = inline_message_id
    else:
        data.update({"chatId": chat_id, "messageId": message_id})
    body = await post("/api/telegram/game", data, client)
    url = body.get("url") if body else None
    return url if isinstance(url, str) else None


async def check_purchase(payload: str, currency: str, amount: int, user_id: int, client: httpx.AsyncClient | None = None) -> str | None:
    """Why the server refuses a store checkout, None when it is fine; "unreachable" without an answer."""
    body = await post("/api/telegram/purchase", {"action": "check", "payload": payload, "currency": currency, "amount": amount, "userId": user_id}, client)
    return body.get("problem") if body else "unreachable"


async def record_purchase(payload: str, currency: str, amount: int, user_id: int, charge_id: str, subscription_expiration: int | None, client: httpx.AsyncClient | None = None) -> bool:
    """Stores a paid store product on the server; False when it could not be reached (logged for a retry by hand)."""
    body = await post(
        "/api/telegram/purchase",
        {"action": "paid", "payload": payload, "currency": currency, "amount": amount, "userId": user_id, "chargeId": charge_id, "subscriptionExpiration": subscription_expiration},
        client,
    )
    return bool(body and body.get("problem") is None)

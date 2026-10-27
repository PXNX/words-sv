"""Pure donation rules shared by the bot handlers and the tests.

A donation is a voluntary gift in Telegram Stars (currency "XTR"): nothing is unlocked by it and
it is never refunded, see /bedingungen in the WordCircle app.
"""
from typing import Final, NamedTuple, Optional

CURRENCY: Final[str] = "XTR"
TIERS: Final[tuple[int, ...]] = (25, 50, 100, 250, 500)
PREFIX: Final[str] = "donation"


class Donation(NamedTuple):
    amount: int
    user_id: int


def build_payload(amount: int, user_id: int) -> str:
    if amount not in TIERS:
        raise ValueError(f"unsupported tier: {amount}")
    return f"{PREFIX}:{amount}:{user_id}"


def parse_payload(payload: str) -> Optional[Donation]:
    """Returns the donation encoded in an invoice payload, or None when it is not one of ours."""
    parts = payload.split(":") if isinstance(payload, str) else []
    if len(parts) != 3 or parts[0] != PREFIX or not parts[1].isdigit() or not parts[2].isdigit():
        return None
    amount, user_id = int(parts[1]), int(parts[2])
    return Donation(amount, user_id) if amount in TIERS else None


def check_checkout(payload: str, currency: str, total_amount: int, from_user_id: int) -> Optional[str]:
    """Validates a pre-checkout query; returns an error reason, or None when the payment may go ahead."""
    donation = parse_payload(payload)
    if donation is None:
        return "unknown_payload"
    if currency != CURRENCY:
        return "wrong_currency"
    if total_amount != donation.amount:
        return "wrong_amount"
    if from_user_id != donation.user_id:
        return "wrong_user"
    return None

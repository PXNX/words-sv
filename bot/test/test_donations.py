import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bot"))

import os

import pytest

from donations import TIERS, build_payload, check_checkout, parse_payload
from store import connect, record_donation, total_for


def test_payload_round_trip():
    payload = build_payload(50, 42)
    assert payload == "donation:50:42"
    assert parse_payload(payload) == (50, 42)


def test_unknown_tier_is_rejected():
    with pytest.raises(ValueError):
        build_payload(7, 42)
    assert parse_payload("donation:7:42") is None


@pytest.mark.parametrize("payload", ["", "donation", "donation:50", "gift:50:42", "donation:x:42", "donation:50:-1", None])
def test_foreign_payloads_are_ignored(payload):
    assert parse_payload(payload) is None


def test_checkout_accepts_matching_payment():
    assert check_checkout("donation:100:42", "XTR", 100, 42) is None


@pytest.mark.parametrize(
    "args, reason",
    [
        (("donation:100:42", "EUR", 100, 42), "wrong_currency"),
        (("donation:100:42", "XTR", 50, 42), "wrong_amount"),
        (("donation:100:42", "XTR", 100, 7), "wrong_user"),
        (("other", "XTR", 100, 42), "unknown_payload"),
    ],
)
def test_checkout_rejects_mismatches(args, reason):
    assert check_checkout(*args) == reason


def test_tiers_are_sorted_and_positive():
    assert list(TIERS) == sorted(TIERS) and all(amount > 0 for amount in TIERS)


@pytest.mark.asyncio
async def test_ledger_ignores_duplicate_deliveries():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is not set")
    pool = await connect(url)
    try:
        async with pool.connection() as connection:
            await connection.execute("DELETE FROM donations")
        assert await record_donation(pool, "charge-1", 42, 50) is True
        assert await record_donation(pool, "charge-1", 42, 50) is False
        await record_donation(pool, "charge-2", 42, 25)
        assert await total_for(pool, 42) == 75
    finally:
        await pool.close()

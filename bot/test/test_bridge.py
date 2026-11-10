import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bot"))

from bridge import is_bridge_payload
from texts import TEXTS


def test_bridge_payloads():
    assert is_bridge_payload("l_abcdefgh1234")
    assert is_bridge_payload("r_abcdefgh1234")
    assert is_bridge_payload("i_abcdefgh1234")
    assert not is_bridge_payload("donate")
    assert not is_bridge_payload("l_short")


def test_every_result_has_a_text():
    from handlers import BRIDGE_RESULTS
    for lang in TEXTS:
        for result in BRIDGE_RESULTS | {"failed"}:
            assert f"bridge_{result}" in TEXTS[lang]


def test_store_texts():
    for lang in TEXTS:
        for key in ("checkout_error_store", "store_thanks", "store_pending"):
            assert key in TEXTS[lang]

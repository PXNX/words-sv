import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bot"))

from version import APP_VERSION, find_version


def test_repository_version_matches_package_json():
    package = Path(__file__).resolve().parents[2] / "package.json"
    assert APP_VERSION == json.loads(package.read_text(encoding="utf-8"))["version"]


def test_env_wins_and_drops_the_v(tmp_path):
    assert find_version(tmp_path, env="v2.1.0") == "2.1.0"


def test_nearest_package_json(tmp_path):
    (tmp_path / "package.json").write_text('{"version": "9.8.7"}', encoding="utf-8")
    nested = tmp_path / "bot" / "bot"
    nested.mkdir(parents=True)
    assert find_version(nested, env="") == "9.8.7"


def test_broken_package_json_gives_none(tmp_path):
    (tmp_path / "package.json").write_text("{", encoding="utf-8")
    assert find_version(tmp_path, env="") is None

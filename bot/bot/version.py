"""The WordCircle version the bot belongs to, for /version.

The bot lives inside the app's repository, so the version comes from the repository's
`package.json`. A deployment that only ships the `bot/` folder can set `APP_VERSION` instead.
"""
import json
from os import getenv
from pathlib import Path


def find_version(start: Path | None = None, env: str | None = None) -> str | None:
    """`APP_VERSION` wins; otherwise the `version` of the nearest `package.json` above `start`."""
    if env := (env if env is not None else getenv("APP_VERSION", "")).strip():
        return env.removeprefix("v")
    here = (start or Path(__file__)).resolve()
    for folder in [here, *here.parents]:
        package = folder / "package.json"
        if package.is_file():
            try:
                version = json.loads(package.read_text(encoding="utf-8")).get("version")
            except (OSError, ValueError):
                return None
            return version if isinstance(version, str) and version else None
    return None


APP_VERSION: str | None = find_version()

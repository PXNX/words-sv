"""Shared setup for the TTS lab: the test cast, the test sentences and where audio goes.

Every engine script renders the same sentences into <LAB>/out/<engine>/<lang>/<voice>_<n>.wav,
where a voice is a cast member (voice-design engines) or a preset/reference (the others),, so evaluate.py can compare them side by side.
"""
import json
import os
from pathlib import Path

LAB = Path(os.environ.get("TTS_LAB", r"C:\dev\tts-lab"))
OUT = LAB / "out"

LANGUAGES = ["de", "en", "fr", "it", "es", "pt", "uk"]

# A small cast that covers the range the stories need: the narrator, old and young, high and deep.
# `gender`, `age` and `pitch` use OmniVoice's voice-design vocabulary; `describe` is the free-form
# description VoxCPM2 takes.
CAST = {
    "narrator": {"gender": "male", "age": "middle-aged", "pitch": "low pitch", "describe": "a calm middle-aged male narrator with a warm, clear voice"},
    "oma": {"gender": "female", "age": "elderly", "pitch": "low pitch", "describe": "a kind elderly grandmother speaking slowly and warmly"},
    "mia": {"gender": "female", "age": "young adult", "pitch": "moderate pitch", "describe": "a friendly young woman with a bright, clear voice"},
    "kim": {"gender": "female", "age": "teenager", "pitch": "high pitch", "describe": "an energetic teenage girl with a high, lively voice"},
    "sabine": {"gender": "female", "age": "middle-aged", "pitch": "moderate pitch", "describe": "a confident middle-aged woman with a firm, even voice"},
    "tom": {"gender": "male", "age": "young adult", "pitch": "moderate pitch", "describe": "a cheerful young man with a relaxed voice"},
    "paul": {"gender": "male", "age": "middle-aged", "pitch": "very low pitch", "describe": "a big middle-aged man with a deep, slow voice"},
    "leo": {"gender": "male", "age": "teenager", "pitch": "high pitch", "describe": "a quick, excited teenage boy"},
}

SENTENCES = json.loads((Path(__file__).with_name("sentences.json")).read_text(encoding="utf-8"))


def clip_path(engine: str, lang: str, voice: str, index: int) -> Path:
    path = OUT / engine / lang / f"{voice}_{index}.wav"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def todo(engine: str, languages=LANGUAGES, voices=CAST):
    """Yields (lang, voice, index, text, path) for every clip that does not exist yet."""
    for lang in languages:
        for voice in voices:
            for index, text in enumerate(SENTENCES[lang]):
                path = clip_path(engine, lang, voice, index)
                if not path.exists():
                    yield lang, voice, index, text, path

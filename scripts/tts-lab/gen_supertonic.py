"""Supertonic 3: ten preset voices (M1-M5, F1-F5), all seven app languages, ONNX on the CPU."""
import soundfile as sf
from supertonic import TTS
from common import todo

PRESETS = [f"{g}{n}" for g in "MF" for n in range(1, 6)]

tts = TTS(auto_download=True)
styles = {name: tts.get_voice_style(voice_name=name) for name in PRESETS}
for lang, voice, index, text, path in todo("supertonic", voices=PRESETS):
    wav, _ = tts.synthesize(text, voice_style=styles[voice], lang=lang, total_steps=10, speed=1.0)
    sf.write(path, wav.squeeze(), tts.sample_rate if hasattr(tts, "sample_rate") else 44100)
    print("supertonic", lang, voice, index, flush=True)

"""Baseline: the Piper voices the app already uses for natural voices (see naturalVoices.svelte.ts)."""
import wave

from huggingface_hub import hf_hub_download
from piper import PiperVoice, SynthesisConfig
from common import todo

# voice name -> (model path in rhasspy/piper-voices, speaker id)
VOICES = {
    "de": {"thorsten": ("de/de_DE/thorsten/high/de_DE-thorsten-high.onnx", None), **{f"mls{n}": ("de/de_DE/mls/medium/de_DE-mls-medium.onnx", n) for n in range(8)}},
    "en": {"cori": ("en/en_GB/cori/high/en_GB-cori-high.onnx", None), **{f"semaine{n}": ("en/en_GB/semaine/medium/en_GB-semaine-medium.onnx", n) for n in range(4)}},
    "fr": {f"upmc{n}": ("fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx", n) for n in range(2)},
    "it": {"serena": ("it/it_IT/serena/high/it_IT-serena-high.onnx", None), "paola": ("it/it_IT/paola/medium/it_IT-paola-medium.onnx", None), "riccardo": ("it/it_IT/riccardo/x_low/it_IT-riccardo-x_low.onnx", None)},
    "es": {f"sharvard{n}": ("es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx", n) for n in range(2)},
    "pt": {"faber": ("pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx", None)},
    "uk": {"tetiana": ("uk/uk_UA/tetiana/high/uk_UA-tetiana-high.onnx", None), **{f"ukrainian{n}": ("uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx", n) for n in range(3)}},
}

loaded = {}
for lang, voices in VOICES.items():
    for _, voice, index, text, path in todo("piper", languages=[lang], voices=list(voices)):
        model, speaker = voices[voice]
        if model not in loaded:
            onnx = hf_hub_download("rhasspy/piper-voices", model)
            hf_hub_download("rhasspy/piper-voices", model + ".json")
            loaded[model] = PiperVoice.load(onnx)
        with wave.open(str(path), "wb") as out:
            loaded[model].synthesize_wav(text, out, syn_config=SynthesisConfig(speaker_id=speaker))
        print("piper", lang, voice, index, flush=True)

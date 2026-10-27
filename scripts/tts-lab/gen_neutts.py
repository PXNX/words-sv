"""NeuTTS: Air for English, Nano for German, French and Spanish. Voices are cloned from a
reference clip plus its transcript: the samples Neuphonic ships for that language, and the
Supertonic presets of the same language (run gen_supertonic.py first) to get a wider cast.

All Neuphonic repos are gated: accept the terms on Hugging Face and run `hf auth login` first."""
import torch
import soundfile as sf
from neutts import NeuTTS
from common import LAB, OUT, SENTENCES, todo

BACKBONES = {"en": "neuphonic/neutts-air", "de": "neuphonic/neutts-nano-german", "fr": "neuphonic/neutts-nano-french", "es": "neuphonic/neutts-nano-spanish"}
SAMPLES = {"en": ["dave", "jo", "emily", "paul", "sophie", "steven"], "de": ["greta"], "fr": ["juliette"], "es": ["mateo"]}
PRESETS = [f"{g}{n}" for g in "MF" for n in range(1, 6)]
REPO = LAB / "neutts-repo" / "samples"
device = "cuda" if torch.cuda.is_available() else "cpu"

for lang, backbone in BACKBONES.items():
    try:
        tts = NeuTTS(backbone_repo=backbone, backbone_device=device, codec_repo="neuphonic/neucodec", codec_device=device)
    except OSError as error:
        print("neutts skip", lang, error.__class__.__name__, str(error).splitlines()[0], flush=True)
        continue
    refs = {name: (REPO / f"{name}.wav", (REPO / f"{name}.txt").read_text(encoding="utf-8").strip()) for name in SAMPLES[lang]}
    # The last test sentence is the reference, so the clone never just repeats its own prompt.
    for preset in PRESETS:
        clip = OUT / "supertonic" / lang / f"{preset}_2.wav"
        if clip.exists():
            refs[f"st-{preset}"] = (clip, SENTENCES[lang][2])
    codes = {}
    for lang_, voice, index, text, path in todo("neutts", languages=[lang], voices=list(refs)):
        if voice not in codes:
            codes[voice] = tts.encode_reference(str(refs[voice][0]))
        wav = tts.infer(text, codes[voice], refs[voice][1])
        sf.write(path, wav, 24000)
        print("neutts", lang, voice, index, flush=True)
    del tts
    torch.cuda.empty_cache()

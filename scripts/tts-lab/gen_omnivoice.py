"""OmniVoice (k2-fsa): voice design from attributes. Voice design is trained on Chinese and
English only, so other languages are the interesting test here."""
import soundfile as sf
import torch
from omnivoice import OmniVoice
from common import CAST, LANGUAGES, todo

model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cuda:0", dtype=torch.float16)
for lang, voice, index, text, path in todo("omnivoice", languages=LANGUAGES):
    spec = CAST[voice]
    audio = model.generate(text=text, instruct=f"{spec['gender']}, {spec['age']}, {spec['pitch']}")
    sf.write(path, audio[0], 24000)
    print("omnivoice", lang, voice, index, flush=True)

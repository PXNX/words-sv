"""VoxCPM2 (OpenBMB): voice design from a description; no Ukrainian."""
import soundfile as sf
from voxcpm import VoxCPM
from common import CAST, todo

model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
rate = model.tts_model.sample_rate
for lang, voice, index, text, path in todo("voxcpm2", languages=["de", "en", "fr", "it", "es", "pt"]):
    wav = model.generate(text=f"({CAST[voice]['describe']}){text}", cfg_value=2.0, inference_timesteps=10)
    sf.write(path, wav, rate)
    print("voxcpm2", lang, voice, index, flush=True)

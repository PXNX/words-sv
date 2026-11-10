# Voice engines

All speech goes through `src/lib/story/naturalVoices.svelte.ts` (`synthesizeNatural`, `playNatural`).
The settings' "Story voices" choice (`settings.voiceQuality`) picks an engine from
`src/lib/voice/engines.ts`; `engineFor()` falls back to Piper where the chosen engine cannot speak
the language or the device lacks WebGPU. Every heavy engine runs in its own worker, behind a
foreground-first queue (`src/lib/audio/priorityQueue.ts`), so a line the open mode needs is never
stuck behind background rendering (word bank, listening stories).

| Engine | Where it runs | Languages | Download (WebGPU / WASM) | Voices |
|---|---|---|---|---|
| `standard` | browser `speechSynthesis` | all | none | the device's |
| `natural` | Piper, `static/voices/piper-worker.js` | all | ~30–120 MB per language | several per language |
| `recorded` | MP3s in `static/voices/` + Piper | all | small | cast reference lines only |
| `supertonic` | Supertonic 2, `voice/supertonic.worker.ts` | en, es, pt, fr | ~260 MB | 5 female, 5 male |
| `supertonic3` | Supertonic 3, the same worker | all (31 languages) | ~205 / ~210 MB | 5 female, 5 male |
| `kokoro` | Kokoro-82M, `voice/styleTts.worker.ts` | en | ~330 / ~95 MB | 15 female, 13 male (American and British) |
| `kitten` | Kitten TTS nano 0.1, the same worker | en | ~25 MB (WASM only) | 4 female, 4 male |
| `edge` | Microsoft Edge TTS (network) | all | none | the service's |

The model engines all run on the transformers.js already in the app (4.3.2), on WebGPU where the
browser hands out an adapter and on WebAssembly otherwise; none of them needs WebGPU, so none falls
back for lack of it. Each was checked end to end with that transformers.js and the same calls as its
worker (on the CPU backend), with Whisper transcribing the output:

- **Supertonic 3** (`open-world-group/Supertonic-3-ONNX`, OpenRAIL-M like Supertonic 2): a
  repackaging of Supertone's archived release into the three-graph layout transformers.js expects,
  weights unchanged. float16 on WebGPU, a q8 denoiser with float32 encoder and vocoder on WASM (the
  card's recommendation; a q8 vocoder is unintelligible). German, Italian, Ukrainian and English
  lines came out right, about 1 s per line on a CPU.
- **Kokoro-82M** (`onnx-community/Kokoro-82M-v1.0-ONNX`, Apache 2.0): the model behind the official
  kokoro-js and the Kokoro WebGPU demo. float32 on WebGPU (as the demo), q8 on WASM. English only:
  its Spanish, French, Italian and Portuguese voices need a phonemizer for those languages, and the
  browser build of eSpeak (`phonemizer`) has only English.
- **Kitten TTS nano 0.1** (`onnx-community/kitten-tts-nano-0.1-ONNX`, Apache 2.0): the model of the
  official KittenTTS-web demo. Its int8 ops have no WebGPU kernels, so it always runs on WASM.

Kokoro and Kitten read phonemes: `voice/phonemes.ts` turns English into them with eSpeak NG
(`phonemizer`, 2.6 MB in the worker; eSpeak NG itself is GPL-3.0, as in Piper's phonemizer) and
keeps the punctuation that eSpeak drops. British voices use eSpeak's `en` voice, since
phonemizer's `en-gb` reads American English.

## The registry

`voiceEngines` in `engines.ts` is the single source of truth for the settings' model list. Each
entry has:

| Field | Meaning |
|---|---|
| `id`, `name` | the setting's value; the product name, shown as is |
| `runtime` | `browser` (speaks live), `piper` (downloads per language), `model` (one model, own worker), `network` |
| `onDevice`, `clips` | generated locally; rendered into audio clips |
| `languages`, `fallback` | what it speaks (`'all'` or a list); the engine that speaks the rest |
| `tier` | download size class like the conversation models': `small` < 100 MB, `medium` < 500 MB, `large` above |
| `megabytes`, `memoryMB` | download and rough memory with WebGPU where the engine uses it |
| `wasm` | `{ megabytes, memoryMB }` on WebAssembly, where they differ; `engineFootprint(id)` picks for this device |
| `webgpu` | needs WebGPU (no engine does at the moment); without it the fallback speaks |
| `model`, `licence` | the Hugging Face repository and its licence |
| `voices` | named voices `{ id, name, gender, accent? }`, best first; `castEngineVoices` gives the narrator and main characters the front ones, one each, before any is shared |

`storedVoiceEngine()` reads the stored setting: removed engines map to a replacement through
`retiredVoiceEngines` (`voxcpm` → `natural`), and `offline/storage.ts` frees what they left in the
cache (`deleteRetiredStorage`, run from the layout once the app is idle).

## Removed: VoxCPM2

`danyalmalik/VoxCPM2-ONNX-WebGPU` still exists and our generation loop was correct: run with ONNX
Runtime's native CPU backend, it produced clean English and German that Whisper transcribed word
for word. It does not run in a stock browser runtime, though. The graphs were made for Quick
Inference, which ships its own patched ONNX Runtime Web build and rewrites every model at load time
so ONNX Runtime never holds a whole file in its 32-bit WebAssembly memory. Stock ONNX Runtime Web
copies each inline model into that memory and parses it into further copies (Quick Inference's own
notes: a 1.1 GB model needed 4+ GB to load). Here that is seven inline graphs, 1.55 GB in all, the
largest 860 MB in one file: creating its session in stock onnxruntime-web did not finish in five
minutes, where the native backend took two seconds. Quick Inference's loader is under a
non-commercial licence, so it cannot be reused. Stored `voxcpm` settings now use Piper.

## Not wired in

- **Audio8-TTS-Realistic-Air** (`Edge0/Audio8-TTS-Realistic-Air`, Apache 2.0, 0.6B, 23 languages):
  PyTorch only (1.2 GB safetensors + 1.35 GB codec, custom Transformers code, CUDA recommended). The
  ONNX builds of its siblings (`Edge0/Audio8-TTS-Preview-0.6B-ONNX-INT4`, `…-0.1B-ONNX-INT8`) target
  ONNX Runtime on the CPU with a Python runtime, have no browser example, and are voice cloning with
  one packaged reference voice, so no named voices.
- **Breeze-TTS-2** (`BreezeBlue/Breeze-TTS-2`): a research and non-commercial licence, English and
  Chinese only, 7.7 GB of PyTorch weights for CUDA; its community builds are GGUF and MLX, none for
  the browser.
- **Chatterbox** (`onnx-community/chatterbox-ONNX`, MIT): transformers.js supports it, but there is
  no official browser demo, it needs about 1.4 GB, and voices are cloned from reference audio, of
  which it ships one; the multilingual build has no transformers.js config.
- **Qwen3-TTS, Orpheus, CosyVoice and other large models** with WebGPU builds under
  `danyalmalik/*-ONNX-WebGPU`: made for Quick Inference's patched runtime, as VoxCPM was.
- **OmniVoice** (`Gigsu/vocoloco-onnx`): the browser weights are licensed CC-BY-NC (non-commercial),
  and running them needs VocoLoco's own WebGPU engine (`github.com/Magkino/vocoloco_tts`).
- **NeuTTS Air** (`neuphonic/neutts-air`): published as GGUF/safetensors only, with no browser
  runtime for the backbone or a browser build of the NeuCodec decoder.

## Adding an engine

1. Add its id and every registry field (above) to `voiceEngines` in `engines.ts`, with its voices.
2. Put the model in a worker (`voice/<name>.worker.ts`) and a small client (`voice/<name>.ts`) with
   `prepare…(onProgress)` and `speak…(text, …, priority)` that returns mono PCM, using
   `createPriorityQueue()` for requests and the typed protocol in `workers/protocol.ts`. Check for a
   WebGPU adapter in the worker (`requestAdapter`), not just `navigator.gpu`.
3. Add it to `modelEngines` in `naturalVoices.svelte.ts` (casting, speed and pitch are shared), its
   storage group to `offline/storage.ts`, and its worker to the `ON_DEMAND` list in
   `src/service-worker.ts`.
4. Only add a model with good evidence it runs in a stock browser runtime (an official
   transformers.js / onnx-community example or demo), and check its output before wiring it in.
5. Large files: download them with `offline/resumableDownload.ts` so bad connections resume.

# Voice engines

All speech goes through `src/lib/story/naturalVoices.svelte.ts` (`synthesizeNatural`, `playNatural`).
The settings' "Story voices" choice (`settings.voiceQuality`) picks an engine from
`src/lib/voice/engines.ts`; `engineFor()` falls back to Piper where the chosen engine cannot speak
the language or the device lacks WebGPU. Every heavy engine runs in its own worker, behind a
foreground-first queue (`src/lib/audio/priorityQueue.ts`), so a line the open mode needs is never
stuck behind background rendering (word bank, listening stories).

| Engine | Where it runs | Languages | Download | Notes |
|---|---|---|---|---|
| `standard` | browser `speechSynthesis` | all | none | instant, robotic |
| `natural` | Piper, `static/voices/piper-worker.js` | all | ~30–120 MB per language | default for clips |
| `recorded` | MP3s in `static/voices/` + Piper | all | small | cast reference lines only |
| `supertonic` | Supertonic 2, `voice/supertonic.worker.ts` (transformers.js) | en, es, pt, fr | ~260 MB | 5 female + 5 male voices |
| `voxcpm` | VoxCPM2, `voice/voxcpm.worker.ts` (ONNX Runtime Web) | all | ~1.6 GB, resumable | experimental, WebGPU only, voice seeded per character |
| `edge` | Microsoft Edge TTS (network) | all | none | the only engine that is not on the device |

## Not wired in

- **OmniVoice** (`Gigsu/vocoloco-onnx`): the browser weights are licensed CC-BY-NC (non-commercial),
  and running them needs VocoLoco's own WebGPU engine (`github.com/Magkino/vocoloco_tts`). Clear the
  licence before adding it.
- **NeuTTS Air** (`neuphonic/neutts-air`): published as GGUF/safetensors only, with no browser
  runtime for the backbone or a browser build of the NeuCodec decoder.

## Adding an engine

1. Add its id and capabilities to `voiceEngines` in `engines.ts`.
2. Put the model in a worker (`voice/<name>.worker.ts`) and a small client (`voice/<name>.ts`) with
   `prepare…(onProgress)` and `speak…(text, …, priority)` that returns mono PCM, using
   `createPriorityQueue()` for requests.
3. Dispatch to it in `naturalVoices.svelte.ts` (`loadNatural`, `synthesizeChunk`) and add it to the
   settings panel and the `ON_DEMAND` list in `src/service-worker.ts`.
4. Large files: download them with `offline/resumableDownload.ts` so bad connections resume.

# TTS options for character voices

The story cast needs natural German speech for 16 characters. The app already has a working
on-device Piper TTS (Thorsten-high + MLS audiobook model, both modern Piper 1.0.0 phoneme set),
so the goal is to produce **pre-recorded MP3s** — one per character — that ship with the app and
play back instantly, instead of synthesizing on the fly.

## Environment constraints

- No ffmpeg, no Python, no working cloud TTS endpoint (Edge TTS / Microsoft free endpoint is
  currently returning HTTP 400 "Our services aren't available right now").
- npm is blocked by the PowerShell execution policy; Node is not on PATH (nvm4w at
  `C:\Users\fhuber\AppData\Roaming\nvm4w\nodejs\node.exe`).
- The browser **can** run the app's own Piper worker (`static/voices/piper-worker.js`) — it
  downloads models from Hugging Face, caches them in `story-voices-v1`, and synthesizes audio
  via onnxruntime-web + espeak-ng WASM. This is the only path that is known to work.

## Idea 1 — Generate in the browser with the app's own Piper worker (chosen)

A one-page HTML app (`gen.html`, served from `localhost:8766`) loads `lamejs` from jsDelivr,
spawns `Worker('/voices/piper-worker.js')`, downloads the two models once, then synthesizes
each character's reference sentence and encodes it to MP3. The MP3s are POSTed to a small Node
receiver (`gen-server.js`) that writes them into `static/voices/<id>.mp3` plus
`static/voices/voices-meta.json`.

- Models: `de_DE-thorsten-high.onnx` (narrator), `de_DE-mls-medium.onnx` (the rest).
- MLS speaker cast by measured pitch: speaker 0 (167 Hz), 2 (178 Hz), 4 (192 Hz), 5 (193 Hz)
  female; speaker 1 (119 Hz), 3 (148 Hz) male.
- Per-character `lengthScale` (rate) from the voice profile: e.g. Paul 0.85, Kim 1.1, Oma 0.85.
- Pros: no external service, no API key, works offline after the first model download, reuses
  code already in the repo.
- Cons: requires a user gesture to start the AudioContext, models are ~200 MB total, first run
  takes a few minutes.

Runtime playback is wired into `src/lib/voice/recordedVoices.ts` (lazy-loads each MP3, decodes to
an `AudioBuffer`, caches it) and `src/lib/story/naturalVoices.svelte.ts` (`renderNatural` checks
for a recorded clip before falling back to on-device synthesis). `StoryMode.svelte` treats
`useRecordedVoices()` as equivalent to `naturalReady()` so the loading screen is skipped.

## Idea 2 — Browser `speechSynthesis` (free, no download)

Record each character with `window.speechSynthesis` + `MediaRecorder` (as in `record.html`).
- Voices: `de-DE-KatjaNeural`, `de-DE-ConradNeural`, plus any other installed German voices.
- Pros: zero model download, works immediately.
- Cons: depends on the browser having German neural voices installed (Chrome/Edge do, but the
  page reported **0 German voices** in this environment — the voices hadn't loaded yet, needed a
  refresh / `voiceschanged` event). Lower quality than Piper MLS.

## Idea 3 — Cloud TTS APIs (blocked / not attempted)

- **Edge TTS** (`wss://speech.platform.bing.com/speech/synthesize/context`) — `src/lib/voice/edgeTts.ts`
  exists, but the endpoint returned HTTP 400 "Our services aren't available right now".
- **MiniMax** — needs an API key (`MINIMAX_KEY` in settings); `src/lib/voice/minimax.ts` was deleted.
- **ElevenLabs / Google Cloud TTS** — would need keys and an account.

## Idea 4 — Local llama.cpp / Ollama TTS

Ollama 0.40.10 is installed and running with `qwen3:8b` (verified working via `/api/chat`).
Two German test messages were generated with it and saved to
`static/voices/test-messages.json`.

TTS models tried through Ollama:

- **Phonon** (`phonon:40m-de`) — Ollama's native Speech API, but requires Apple Silicon MLX;
  the pull failed with "MLX runtime is not available" on this Windows machine. Windows/Linux
  support is not yet shipped (announced for a future version).
- **Orpheus** (`sematre/orpheus:de`, `legraphista/Orpheus:3b-ft-q4_k_m`) — pulled successfully,
  but the `/v1/audio/speech` endpoint returns "does not support speech". Orpheus needs the
  external Orpheus-FastAPI frontend; the chat API returns conversational text, not audio.
- **NeuTTS Air GGUF** — `ollama pull neuphonic/neutts-air-q8-gguf` failed ("file does not
  exist"); no Ollama library tag exists for it.

So Ollama can generate the *text* locally but cannot yet produce *audio* on Windows. It remains
a good fallback for the text side of the pipeline.

## Idea 5 — Ship smaller on-device models at runtime (no pre-recording)

Keep the existing `naturalVoices.svelte.ts` pipeline as-is: the Piper worker downloads models on
first use and synthesizes every sentence. Already works; just slower and needs network on first
play. The recorded-clip path is an optimization on top of this, not a replacement — the worker
is the fallback.

## MLS speaker pitch analysis

The MLS model ships 236 speaker samples at
`huggingface.co/rhasspy/piper-voices/.../de/de_DE/mls/medium/samples/speaker_N.mp3`.
`analyze-full.js` downloads every one and measures its fundamental frequency with an
autocorrelation pitch tracker, writing `analysis.json`. The first 8 results:

| Speaker | Pitch (Hz) | RMS |
| --- | --- | --- |
| 5 | 193 | 0.155 |
| 4 | 192 | 0.135 |
| 2 | 178 | 0.160 |
| 0 | 167 | 0.119 |
| 3 | 148 | 0.171 |
| 1 | 119 | 0.180 |
| 7 | 105 | 0.120 |
| 6 | 93 | 0.169 |

The cast in `naturalVoices.svelte.ts` was chosen from this banding: speakers 0/2/4/5 are female
(167–193 Hz), speakers 1/3/6/7 are male (93–148 Hz). The full run is still in progress; once it
finishes the table can be refined and the character-to-speaker mapping re-validated.

## Files

| File | Purpose |
| --- | --- |
| `static/voices/piper-worker.js` | Existing Piper worker (unchanged) |
| `static/voices/<id>.mp3` | Generated character clips (16 files) |
| `static/voices/test-messages.json` | Two German messages generated by local `qwen3:8b` |
| `static/voices/voices-meta.json` | `{ id: { model, speaker, rate, text, bytes } }` |
| `src/lib/voice/recordedVoices.ts` | Runtime playback of the pre-recorded clips |
| `src/lib/story/naturalVoices.svelte.ts` | Prefers recorded clips, falls back to synthesis |
| `src/lib/story/StoryMode.svelte` | Treats recorded voices as ready instantly |
| `scripts/build-character-voices.ts` | Edge TTS build script (endpoint broken) |
| `scripts/build-neutts-voices.ts` | NeuTTS Air build script (needs Python/llama-cpp) |
## Engine comparison (2026-10-27, `scripts/tts-lab/`)

The lab renders the same three sentences per language with every engine into `C:\dev\tts-lab\out`
(outside the repo), then `evaluate.py` scores each clip:

- **Intelligible**: Whisper large-v3-turbo transcribes the clip with the language forced; mean
  character error rate (CER) ≤ 10 %.
- **Distinct**: ECAPA speaker embedding per voice; two voices with cosine similarity ≥ 0.55 count
  as the same person. The engine's score is the largest set of intelligible, mutually distinct voices.

Setup: `uv venv --python 3.12` in `C:\dev\tts-lab`, torch cu128, `voxcpm`, `neutts[onnx]`,
`supertonic`, `omnivoice`, `piper-tts`, `faster-whisper`, `speechbrain`; `torchao<0.14` (newer
versions break torchtune, which neucodec imports). Run `gen_*.py`, then `evaluate.py`, which writes
`report.html` (with audio players) and `report.json`.

Distinct intelligible voices per language:

| Language | Supertonic 3 | OmniVoice | Piper (current app) | VoxCPM2 |
| --- | --- | --- | --- | --- |
| de | **7** | 3 | 1 | 3 of 3 rendered |
| en | **9** | 4 | 5 | – |
| fr | **6** | 3 | 1 | – |
| it | **6** | 4 | 3 | – |
| es | **7** | 4 | 2 | – |
| pt | **8** | 4 | 0 | – |
| uk | **5** | 2 | 3 | not supported |

Findings:

- **Supertonic 3 wins every language**: near-zero CER and 5–9 distinct presets (M1–M5, F1–F5). It is
  also the lightest (99M parameters, ONNX on the CPU, runs in the browser via onnxruntime-web).
- **Piper MLS garbles the first sentence of a two-sentence line** ("Guten Morgen!" becomes about
  3 s of unintelligible sound), so all eight MLS speakers sit around 19 % CER. Thorsten is fine.
- **OmniVoice** is intelligible but its designed voices are not distinct outside English (the German
  women are 0.72–0.78 similar); its voice design is trained on Chinese and English only.
- **VoxCPM2** is clean and its voices are very distinct, but the "middle-aged male" narrator came out
  at 190 Hz, so it does not follow the description reliably. On the CPU it took about 13 minutes per
  clip (the 2B model does not fit next to other GPU users on the 6 GB RTX 3060), so only 9 German clips
  exist; rerun `gen_voxcpm.py` on a free GPU to finish (it resumes).
- **NeuTTS** (Air, Nano German/French/Spanish, and the neucodec codec) is gated on Hugging Face:
  accept the terms and run `hf auth login`, then rerun `gen_neutts.py`.

Recommendation: pre-generate story clips with Supertonic 3, matching presets to characters by
measured pitch, and serve them through the "Recorded" voice option.
